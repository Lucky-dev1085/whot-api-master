'use strict';

const jsonwebtoken = require('jsonwebtoken');
const errors = reqlib('_/modules/feathers/errors');
const enforceRealm = reqlib('_/modules/feathers-sequelize/utils/enforceRealm');
const _ = require('lodash');
const cfg = require('./cfg');

const accountsEnabled = cfg.get('features.accounts.enabled');

/**
 * Decode a JWT.
 */

exports.decodeJWT = function(req) {
  try {
    return jsonwebtoken.verify(getJWT(req), config.secret);
  }
  catch (e) {
  }
};

exports.decodeJwtString = function(jwtString) {
  try {
    return jsonwebtoken.verify(jwtString, config.secret);
  }
  catch (e) {
  }
};

/**
 * Get the JWT, by looking for it in headers, query string or cookies.
 */

const getJWT = exports.getJWT = function(req) {
  if (req.headers && req.headers.authorization) {
    const parts = req.headers.authorization.split(/\s+/);
    if (parts[0] && parts[0].toLowerCase() == 'bearer' && parts[1]) {
      return parts[1];
    }
  }

  if (req.query && req.query.jwt) {
    return req.query.jwt;
  }

  if (req.cookies.jwt) {
    return req.cookies.jwt;
  }

  return null;
};

/**
 * Parse auth rules.
 */

exports.parseAuth = function(auth) {
  if (auth === false || auth === true || auth === null || _.isArray(auth)) {
    return {all: auth};
  }

  const result = {};
  _.each(auth, function(value, key) {
    _.each(key.split(/\s*,\s*/), function(k) {
      _.mergeWith(result, {[k]: value}, function(dst, src) {
        if (_.isArray(dst)) {
          return dst.concat(src);
        }
      });
    });
  });

  return result;
};

/**
 * Check if some auth requirements are met. These are specified as an array of
 * the form [test1, test2, [test3, test4], ...] which is equivalent to the
 * logical expression test1 OR test2 OR (test3 AND test4) OR ...
 */

exports.checkAuth = async function(auth, context) {
  if (auth === true || auth === false) {
    return auth;
  }

  const jwt = context.params.jwt;
  if (!jwt) {
    throw errors.NotAuthenticated();
  }

  const user = context.params.user;
  if (!user) {
    throw errors.Forbidden(null, 'Invalid token');
  }

  if (auth === null) {
    return true;
  }

  auth = _.isArray(auth) ? auth : [auth];

  let err;
  for (let i = 0; i < auth.length; i++) {
    let perms = _.isArray(auth[i]) ? auth[i] : [auth[i]];
    let pass = true;
    let j = -1;

    while (pass && ++j < perms.length) {
      if (typeof(perms[j]) == 'function') {
        try {
          pass = pass && await perms[j].call(null, context);
        }
        catch (e) {
          pass = false;
          err = e;
        }
      }
      else {
        pass = pass && await user.hasPermissions([perms[j]]);
      }
    }

    if (pass) {
      return true;
    }
  }

  if (err) {
    throw err;
  }
};

/**
 * Normalize OAuth user data.
 */
exports.normalizeOAuthData = function(data) {
  const {token, profile} = data;

  const result = {
    passport: {
      provider: profile.provider,
      identifier: profile.id,
      token
    },
    user: {
      firstName: profile.name.givenName,
      middleName: profile.name.middleName,
      lastName: profile.name.familyName,
      email: _.get(profile, 'emails[0].value')
    }
  };

  const _json = profile._json;

  switch (profile.provider) {
    case 'facebook':
      if (_json.picture && !_json.picture.data.is_silhouette) {
        result.user.photo = `https://graph.facebook.com/${profile.id}/picture?type=square`;
      }
      break;

    case 'google':
      if (_json.image && !_json.image.isDefault) {
        result.user.photo = _json.image.url;
      }
      break;
  }

  return result;
};

/**
 * Normalize SAML user data.
 */
exports.normalizeSAMLData = function(profile) {
  const result = {
    passport: {
      identifier: profile.nameID,
      token: profile.sessionIndex
    },
    user: {
      firstName: profile.firstname,
      lastName: profile.lastname,
      email: profile.email
    }
  };

  return result;
};

/**
 * Build an auth response for a user.
 */
exports.buildAuthResponse = async function(user, isNew = false) {
  const jwtResponse = await builJwtResponse(user, cfg.jwt.expiresIn, { scope: 'auth' })

  return Object.assign(jwtResponse, { isNew });
};

/**
 * Build an refresh token response for a user.
 */
exports.buildRefreshTokenResponse = async function(user) {
  return await builJwtResponse(user, cfg.jwt.refreshTokenExpiresIn, { scope: 'refresh' })
};

const builJwtResponse = async function builJwtResponse(user, expiresIn, jwtExtraPayload) {
  const jwtPayload = Object.assign({}, jwtExtraPayload, {
    userId: user.id
  });
  const jwt = jsonwebtoken.sign(jwtPayload, config.secret, { expiresIn });

  const userPayload = user.authPayload
                    ? await user.authPayload()
                    : user.toJSON();

  return {jwt, user: userPayload};
};

/**
 * Enforce account realm.
 */
exports.enforceAccount = function(options, returnValue = false) {
  const enforceAccountRealm = enforceRealm(Object.assign({
    field: 'accountId',
    userField: 'accountId',
    name: 'account'
  }, options));

  return async function enforceAccount(context) {
    if (accountsEnabled) {
      await enforceAccountRealm(context);
    }
    return returnValue;
  };
};

/**
 * Enforce user realm.
 */
exports.enforceUser = function(options, returnValue = true) {
  const enforceUserRealm = enforceRealm(Object.assign({
    field: 'userId',
    userField: 'id',
    name: 'user'
  }, options));

  return async function enforceUser(context) {
    await enforceUserRealm(context);
    return returnValue;
  };
};

/**
 * Feather Hooks
 */

exports.preventSelfRemove = function(options) {
  if (!options.userField) {
    throw new Error('Required option "userField" not defined');
  }

  const preventSelfRemove = async function preventSelfRemove(context) {
    const user = context.params.user;
    if (user && context.id == user[options.userField]) {
      throw errors.BadRequest(options.errorCode, options.errorMessage);
    }
  };

  const disableOnSelfRemove = async function disableSelfRemove(context) {
    const user = context.params.user;
    if (user && context.id == user[options.userField]) {
      await context.service.model.update({ status: 'disabled' }, {where: {[options.userField]: context.id}});

      // Throw success to skip actual user deletion
      const e = errors.BadRequest(null, "User disabled");
      e.code = 200;
      e.name = 'Success';
      e.className = 'success';
      throw e;
    }
  };

  return options.generateError ? preventSelfRemove : disableOnSelfRemove;
};
