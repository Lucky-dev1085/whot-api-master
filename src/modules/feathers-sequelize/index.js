'use strict';

const models = reqlib('_/models');
const _ = require('lodash');
const Service = require('./Service');

exports.init = function() {
  // create and mount a generic CRUD service for all defined models:
  _.each(Object.keys(models).sort(), modelName => {
    const model = models[modelName];

    const _config = _.get(model, 'options._config.service', {});
    if (!_config) {
      return;
    }

    const path = _config.path || ('/' + _.kebabCase(model.tableName));

    // don't mount if we already have a service at the same path:
    if (app.service(path)) {
      return;
    }

    _config.model = model;

    app.mountService(path, new Service(_config));
  });
};
