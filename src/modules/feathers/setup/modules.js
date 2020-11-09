'use strict';

const debug = require('debug')('app:module:feathers');

// phase is either 'bootstrap' or 'init':
module.exports = function(phase) {
  return function() {
    if (!config.modules) {
      return;
    }

    debug(`${phase == 'init' ? 'initialising' : 'bootstrapping'} modules`);

    for (let moduleName in config.modules) {
      const module = reqlib(`_/modules/${moduleName}`);

      if (typeof(module[phase]) == 'function') {
        debug(`- ${moduleName}`);
        module[phase]();
      }
    }
  };
};
