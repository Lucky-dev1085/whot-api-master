'use strict';
const errors = reqlib('_/modules/feathers/errors');
const authUtils = reqlib('_/modules/feathers-auth/utils', true);
const authCfg = reqlib('_/modules/feathers-auth/cfg', true);
const models = reqlib('_/models');

const userModel = models[authCfg.userModel];

/**
 * Bootstrap this module (called on app startup, before everything else).
 */
exports.bootstrap = function() {

  // Add any new real-time connection to the `anonymous-events` channel
  app.on('connection', connection => {
    return app.channel('anonymous-events').join(connection);
  });

  app.use('ws-auth', {
    _config: { auth: true },
    async create(data, params, callback) {
      if(params.provider !== 'socketio') {
        throw new Error('You can only authenticate with ws-auth via Socket.io');
      }
      const connection = params.connection;
      if (!connection) {
        // connection can be undefined when logging in via REST
        return;
      }

      const jwt = authUtils.decodeJwtString(data.jwt);
      if (!jwt || (jwt.scope && jwt.scope !== 'auth')) {
        throw errors.Forbidden(null, "Authorization required");
      }

      const user = await userModel.findByPk(jwt.userId);
      if (user && user.status === 'active') {
        // On login, move the connection from anonymous to authenticated
        app.channel('anonymous-events').leave(connection);
        app.channel('authenticated-events').join(connection);
        app.channel(`users-${user.id}`).join(connection);
      } else {
        throw errors.Forbidden(null, "Valid authorization required");
      }
      return true;
    },
  });

  // Publish all events to the `authenticated-events` channel
  app.publish((data, hook) => {
    console.log(`*** Publishing data: ${data} ${data && Object.keys(data)} ${hook} ${hook && Object.keys(hook)}`);
    console.log(`***            data: t: ${hook.type} s: ${hook.service} m: ${hook.method} p: ${hook.path}`);
    return app.channel('authenticated-events');
  });
};

/**
 * Initialize this module (called on app startup, after all modules have been
 * bootstrapped, application hooks added and local services loaded).
 */
exports.init = function() {
};
