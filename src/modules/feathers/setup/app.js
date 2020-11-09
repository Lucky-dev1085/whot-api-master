'use strict';

const futils = reqlib('_/modules/feathers-utils');
const _ = require('lodash');
const debugMount = require('debug')('app:module:feathers:service');
const apidocs = reqlib('_/modules/apidocs', true);
const authUtils = reqlib('_/modules/feathers-auth/utils', true);
const validationHook = reqlib('_/modules/feathers-validation/hook', true);

module.exports = function() {
  /**
   * Mount a service.
   */
  app.mountService = function(path, service) {
    let _config = {};
    let fromPath;

    if (typeof(service) == 'string') {
      fromPath = service;
      service = reqlib(service);

      // load service configuration:
      _config = reqlib(`${fromPath}/config`, true) || {};

      // load API docs:
      const docs = reqlib(`${fromPath}/apidocs`, true);
      if (docs !== undefined) {
        _config.apidocs = docs;
      }

      // load schema:
      const schema = reqlib(`${fromPath}/schema`, true);
      if (schema) {
        _config.schema = schema;
      }
    }

    if (typeof(service) == 'function') {
      service = new service({_config});
    }
    else {
      service._config = _.merge(_config, service._config);
    }

    if (!service._config) {
      service._config = _config;
    }

    // let the service know where it is mounted:
    _.set(service, '_config.path', path);

    // create the middleware chain for this service:
    const mw = futils.processMiddlewareChain([
      ...fromPath && reqlib(`${fromPath}/middleware`, true) || [],
      ..._.get(service, '_config.middleware', [])
    ]);

    // Sometimes, services need access to the request & response objects
    let customMiddleware = [];
    if (service._config.customServiceMiddleware) {
      // if simply passing undefined, feathers complains:
      // "Error: Invalid options passed to app.use"
      customMiddleware = [service._config.customServiceMiddleware];
    }

    app.use.apply(app, [path, ...mw, service, ...customMiddleware]);
    debugMount(path);

    // hooks:
    app.service(path).hooks(futils.processHooksObject(futils.mergeHooks(
      validationHook && service._config.schema && (() => {
        const validate = validationHook(service._config.schema);
        return {
          before: {
            create: [validate],
            update: [validate],
            patch: [validate]
          }
        };
      })(),
      fromPath && reqlib(`${fromPath}/hooks`, true),
      service._config.hooks
    )));

    if (_.has(service, '_config.publish.all')) {
      app.service(path).publish(service._config.publish.all);
    }

    // integrate with apidocs module:
    if (apidocs && _.has(service, '_config.apidocs')) {
      if (typeof(service._config.apidocs) == 'function') {
        apidocs.spec.update(service._config.apidocs({path}));
      }
      else {
        apidocs.spec.update(service._config.apidocs);
      }
    }

    // integrate with feathers-auth module:
    if (authUtils && _.has(service, '_config.auth')) {
      service._config.auth = authUtils.parseAuth(service._config.auth);
    }
  };
};
