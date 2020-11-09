'use strict';

const debug = require('debug')('app:module:feathers');

module.exports = function(app) {
  debug('loading application hooks');

  app.hooks(reqlib('_/hooks'));
};
