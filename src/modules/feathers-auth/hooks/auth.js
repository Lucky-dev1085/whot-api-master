'use strict';

const errors = reqlib('_/modules/feathers/errors');
const _ = require('lodash');
const { decodeJWT, checkAuth } = require('../utils');
const models = reqlib('_/models');
const cfg = require('../cfg');

const userModel = models[cfg.userModel];

// JWT authentication hook:

module.exports = function(allowByDefault = null) {
  return async function(context) {
    // if a valid JWT is passed, populate params.user and params.jwt:
    if (!context.params.jwt) {
      const jwt = decodeJWT(context.params.req);
      if (jwt && jwt.scope !== 'refresh') {
        context.params.jwt = jwt;

        const user = await userModel.findByPk(jwt.userId);
        if (user && user.status === 'active') {
          context.params.user = user;
        }
      }
      else if (jwt) {
        throw errors.Forbidden(null, `Invalid token scope, expected: 'auth', received '${jwt.scope}'`);
      }
    }

    if (!context.params.provider) {
      return context;
    }

    // determine auth requirements for the current service method:
    let auth = _.get(context.service, '_config.auth', allowByDefault);
    if (auth !== null && typeof(auth) == 'object') {
      auth = _.get(auth, context.method, auth.all);
      if (auth === undefined) {
        auth = allowByDefault;
      }
    }

    // don't allow access if auth requirements are not met:
    try {
      if (!(await checkAuth(auth, context))) {
        throw errors.Forbidden();
      }
    }
    catch (e) {
      throw e;
    }

    return context;
  };
};
