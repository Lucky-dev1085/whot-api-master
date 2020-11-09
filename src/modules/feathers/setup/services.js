'use strict';

const debug = require('debug')('app:module:feathers');
const futils = reqlib('_/modules/feathers-utils');
const _ = require('lodash');

module.exports = function(app) {
  debug('loading services');

  (function parseTree(node, prefix = '') {
    _.each(node, (value, key) => {
      if (key.match(/^_/)) {
        return;
      }

      const newPrefix = `${prefix}/${key}`;

      if (futils.isService(value)) {
        const path = newPrefix.split('/').filter(p => p != 'index').join('/') || '/';
        app.mountService(path, `${config.get('paths.basedir')}/services/${prefix}`);
      }
      else {
        parseTree(value, newPrefix);
      }
    });
  })(require('require-all')({
    dirname: `${config.get('paths.basedir')}/services`,
    filter: /(index)\.js$/,
    resolve: module => module.default || module
  }));
};
