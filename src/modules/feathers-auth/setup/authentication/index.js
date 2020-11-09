'use strict';

const Passport = require('passport');
const moment = require('moment');
const _ = require('lodash');
const utils = reqlib('_/modules/utils');
const { getCaseInsensitiveEqualsOp } = reqlib('_/modules/feathers-sequelize/utils');
const cfg = require('../../cfg');
const models = reqlib('_/models');
const {
  decodeJWT,
  decodeJwtString,
  normalizeOAuthData,
  normalizeSAMLData,
  buildAuthResponse,
  buildRefreshTokenResponse,
} = require('../../utils');
const emailModule = reqlib('_/modules/email', true);

const passportModel = models[cfg.passportModel];
const userModel = models[cfg.userModel];
const tokenModel = models[cfg.tokenModel];

module.exports = function() {
  // implement local authentication:
  if (cfg.providers.local) {
    // login with email/pass:
    app.post(`${cfg.path}/login`, async (req, res) => {
      const email = req.body.email;
      const password = req.body.password;
      
      try {
        const user = await userModel.login(email, password);
        sendAuthResponse(res, user);
      }
      catch (e) {
        sendAuthError(res, e);
      }
    });

    // initiate password reset:
    app.get(`${cfg.path}/password-reset`, async (req, res) => {
      const email = req.query.email;
      let response;

      if (userModel.initiatePasswordReset) {
        response = await userModel.initiatePasswordReset(email);
      }
      else {
        const op = getCaseInsensitiveEqualsOp(userModel.sequelize);

        const user = await userModel.findOne({
          where: {
            email: {[op]: email}
          }
        });

        if (!user) {
          return sendAuthError(res, {code: 404, message: "Invalid / Unknown user email address"});
        }

        const token = await user.createToken({
          scope: 'password-reset'
        });

        if (emailModule) {
          await emailModule.sendEmail({
            to: user.email,
            subject: 'Password Reset',
            html: {
              name: 'password-reset',
              data: {
                firstName: user.firstName,
                link: user.getPasswordResetLink
                  ? await user.getPasswordResetLink(token)
                  : cfg.passwordResetUrl.replace('$token', token.id).replace('$firstName', user.firstName)
              }
            }
          });
        }
      }

      res.status(response ? 200 : 204);
      response && res.json(response);
      res.end();
    });

    // complete password reset:
    app.post(`${cfg.path}/password-reset`, async (req, res) => {
      let user;

      if (userModel.completePasswordReset) {
        user = await userModel.completePasswordReset(req.body);
      }
      else {
        const token = await tokenModel.findOne({
          where: {
            id: {$eq: req.body.token},
            scope: 'password-reset'
          }
        });

        if (!token) {
          return sendAuthError(res, {code: 404, message: "Invalid password reset link"});
        } else {
          const tokenMaxAge = cfg.passwordResetExpiresIn || 24*3600;
          const tokenExpiration = moment(token.createdAt).add(tokenMaxAge, 'seconds');

          if (tokenExpiration.isBefore(moment())) {
            return sendAuthError(res, {code: 403, message: "Password reset link has expired"});
          }
        }

        user = await token.getUser();
        if (!user) {
          return sendAuthError(res, {code: 500, message: "Invalid user"});
        }

        await user.update(_.merge(
          { password: req.body.password },
          req.body.name && { name: req.body.name }
        ));

        if (emailModule) {
          await emailModule.sendEmail({
            to: user.email,
            subject: 'Password Changed',
            html: {
              name: 'password-changed',
              data: {
                firstName: user.firstName,
                link: cfg.successRedirectUrl
              }
            }
          });
        }

        await token.destroy();
      }

      sendAuthResponse(res, user);
    });
  }

  // login with a token:
  app.post(`${cfg.path}/login/token`, async (req, res) => {
    const token = await tokenModel.findOne({
      where: {
        id: {$eq: req.body.token},
        scope: 'auth'
      },
      include: [
        userModel
      ]
    });

    if (!token) {
      return sendAuthError(res, {code: 404, message: "Invalid login token"});
    }

    await token.destroy();

    sendAuthResponse(res, token.user);
  });

  // obtain a fresh token:
  app.post(`${cfg.path}/refresh-token`, async (req, res) => {
    let jwt = null;
    if (req.body.authJwt) {
      jwt = decodeJwtString(req.body.authJwt);
      if (jwt && jwt.scope && jwt.scope !== 'auth') {
        return sendAuthError(res, new Error(
          `Invalid token scope, expected: 'auth', received '${jwt.scope}'`));
      }
    }
    else if (req.body.refreshJwt) {
      jwt = decodeJwtString(req.body.refreshJwt);
      if (jwt && jwt.scope && jwt.scope !== 'refresh') {
        return sendAuthError(res, new Error(
          `Invalid token scope, expected: 'refresh', received '${jwt.scope}'`));
      }
    }
    else {
      jwt = decodeJWT(req);
    }
    if (!jwt) {
      return sendAuthError(res, new Error('Missing / Invalid token.'));
    }

    const user = await userModel.findById(jwt.userId);
    if (!user || user.status !== 'active') {
      return sendAuthError(res, new Error('Invalid user'));
    }

    let response;
    if (jwt.scope === 'refresh') {
      response = await buildAuthResponse(user);
      if (cfg.cookie) {
        res.cookie('jwt', response.jwt, { httpOnly: true });
      }
    } else {
      response = await buildRefreshTokenResponse(user);
    }

    res.json(response);
  });

  // configure Passport with all enabled strategies:
  if (cfg.get('features.passport.enabled')) {
    _.each(cfg.providers, function(options, name) {
      if (name == 'local') {
        return;
      }

      const opt = _.merge(
        {
          callbackURL: `${utils.getPublicUrl()}${cfg.path}/${name}/callback`,
          // this is used by SAML:
          callbackUrl: `${utils.getPublicUrl()}${cfg.path}/${name}/callback`,
          protocol: name
        },
        options.inheritFrom ? cfg.providers[options.inheritFrom] : null,
        options
      );

      const Strategy = reqlib(opt.strategy);
      Passport.use(new Strategy(opt, verifyCallbacks[opt.protocol]));
    });

    // initiate 3rd party authentication process:
    app.get(`${cfg.path}/:provider`, Passport.initialize(), (req, res, next) => {
      Passport.authenticate(req.params.provider)(req, res, next);
    });

    // complete 3rd party authentication process:
    app.all(`${cfg.path}/:provider/:method`, Passport.initialize(), (req, res, next) => {
      const provider = req.params.provider;
      const method = req.params.method;
      const strategy = provider + (method == 'token' ? '-token' : '');

      // in case we need to redirect the user:
      let successUrl;
      let failureUrl;
      if (method == 'callback') {
        successUrl = cfg.successRedirectUrl;
        failureUrl = cfg.failureRedirectUrl;
      }

      const options = {
        session: false
      };

      Passport.authenticate(strategy, options, async (err, data) => {
        try {
          if (err) {
            throw err;
          }

          if (!data.passport.provider) {
            data.passport.provider = provider;
          }

          let passport = await passportModel.findOne({
            where: {
              provider,
              identifier: data.passport.identifier
            },
            include: [
              userModel
            ]
          });

          let isNew = false;

          if (passport) {
            // this is a user login, just update passport data

            if (passport.user.status === 'disabled') {
              throw new Error('Authentication error');
            }

            await passport.update(data.passport);
          }
          else {
            const jwtPayload = decodeJWT(req);

            if (jwtPayload && jwtPayload.userId) {
              // this is an existing user adding a new passport

              const user = await userModel.findByPk(jwtPayload.userId);
              if (user) {
                passport = await user.createPassport(data.passport);
                passport.user = user;
              }
            }
            else {
              // this is a new user registration

              isNew = true;

              const payload = Object.assign({}, data.passport, {
                user: data.user
              });

              // if we have an e-mail address, we assume it's already verified as
              // it's coming from a trusted 3rd party provider:
              if (payload.user.email) {
                payload.user.emailVerified = true;
              }

              passport = await passportModel.create(payload, {
                include: [
                  userModel
                ]
              });
            }
          }

          if (!passport) {
            throw new Error('Authentication error');
          }

          sendAuthResponse(res, passport.user, isNew, successUrl);
        }
        catch (e) {
          sendAuthError(res, e, failureUrl);
        }
      })(req, res, next);
    });
  }

  // generate API docs for authentication endpoints:
  require('./apidocs')(cfg.path);
};

/**
 * Verify callbacks.
 */
const verifyCallbacks = {
  oauth2: function(accessToken, _refreshToken, profile, done) {
    let data;
    let err;
    try {
      const normalize = userModel.normalizeOAuthData || normalizeOAuthData;
      data = normalize({
        token: accessToken,
        profile
      });
    }
    catch (e) {
      err = e;
    }

    done(err, data);
  },
  saml: function(profile, done) {
    let data;
    let err;
    try {
      const normalize = userModel.normalizeSAMLData || normalizeSAMLData;
      data = normalize(profile);
    }
    catch (e) {
      err = e;
    }

    done(err, data);
  }
};

/**
 * Send an authentication response to the client.
 */
async function sendAuthResponse(res, user, isNew = false, redirectUrl = null) {
  if (redirectUrl) {
    // when we redirect, we only send a token which can be exchanged for a JWT:
    const token = await user.createToken({scope: 'auth'});
    return res.redirect(redirectUrl.replace('$token', token.id).replace('$firstName', user.firstName));
  }

  const response = await buildAuthResponse(user, isNew);

  if (cfg.cookie) {
    res.cookie('jwt', response.jwt, {httpOnly: true});
  }

  res.json(response);
}

/**
 * Send an authentication error to the client.
 */
function sendAuthError(res, err, redirectUrl = null) {
  if (redirectUrl) {
    res.redirect(redirectUrl.replace('$message', encodeURIComponent(err.message)));
  }
  else {
    const json = err.toJSON ? err.toJSON() : {message: err.message};
    const code = err.code || 500;
    res.status(code).json(json).end();
  }
  return res;
}
