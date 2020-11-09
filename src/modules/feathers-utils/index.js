'use strict';

const _ = require('lodash');

/**
 * Check if target is a Feathers service.
 *
 * @param {Mixed} target
 * @return {Boolean}
 */

exports.isService = function(target) {
  if (typeof(target) != 'function' && typeof(target) != 'object') {
    return false;
  }

  const proto = target.prototype || target;

  const keys = ['find', 'get', 'create', 'update', 'patch', 'remove'];
  for (let i = 0; i < keys.length; i++) {
    if (typeof(proto[keys[i]]) == 'function') {
      return true;
    }
  }

  return false;
};

/**
 * Parse a hooks object into a proper Feathers hooks object.
 */

const parseHooks = exports.parseHooks = function(hk) {
  const hooks = {
    before: {
      all: [],
      find: [],
      get: [],
      create: [],
      update: [],
      patch: [],
      remove: []
    },
    after: {
      all: [],
      find: [],
      get: [],
      create: [],
      update: [],
      patch: [],
      remove: []
    },
    error: {
      all: [],
      find: [],
      get: [],
      create: [],
      update: [],
      patch: [],
      remove: []
    }
  };

  if (_.isPlainObject(hk)) {
    _.each(['before', 'after', 'error'], function(type) {
      if (_.isPlainObject(hk[type])) {
        _.each(Object.keys(hk[type]), function(key) {
          let value = hk[type][key];
          if (!_.isArray(value)) {
            value = [value];
          }
          _.each(key.split(/\s*,\s*/), function(method) {
            if (hooks[type][method]) {
              hooks[type][method].push.apply(hooks[type][method], value);
            }
          });
        });
      }
      else if (_.isArray(hk[type])) {
        hooks[type].all.push.apply(hooks[type].all, hk[type]);
      }
    });
  }
  else if (_.isArray(hk)) {
    hooks.before.all.push.apply(hooks.before.all, hk);
    hooks.after.all.push.apply(hooks.after.all, hk);
    hooks.error.all.push.apply(hooks.error.all, hk);
  }

  return hooks;
};

/**
 * Merge hooks.
 */

exports.mergeHooks = function(...hooks) {
  return _.mergeWith.apply(_, [{}, ...hooks.map(h => parseHooks(h)), (dst, src) => {
    if (_.isArray(dst)) {
      return dst.concat(src);
    }
  }]);
};

/**
 * Process a middleware chain, that is, an array where each element is either
 * a function or a string/object describing how to create the function. This
 * function parses such an array and tries to convert all string/object items
 * into the final middlware function.
 */

exports.processMiddlewareChain = function(middleware) {
  return middleware.map(function(mw) {
    const fn = getFunctionFromFactory(mw);

    if (typeof(fn) != 'function') {
      throw new Error(`Unable to process middleware: ${JSON.stringify(mw)}`);
    }

    return fn;
  });
};

/**
 * Process a hooks object, similar to processMiddlewareChain above.
 */

exports.processHooksObject = function(hooks) {
  const hk = {};

  _.each(['before', 'after', 'error'], function(type) {
    if (hooks[type]) {
      hk[type] = _.mapValues(hooks[type], function(arr) {
        return arr.map(function(hook) {
          const fn = getFunctionFromFactory(hook, `${config.get('paths.basedir')}/hooks`);

          if (typeof(fn) != 'function') {
            throw new Error(`Unable to process hooks: ${JSON.stringify(hook)}`);
          }

          return fn;
        });
      });
    }
  });

  /*
  // make sure after.all hooks execute AFTER individual after hooks:
  if (hk.after && hk.after.all) {
    _.each(['find', 'get', 'create', 'update', 'patch', 'remove'], function(method) {
      if (!hk.after[method]) {
        hk.after[method] = [];
      }

      hk.after[method].push.apply(hk.after[method], hk.after.all);
    });

    delete hk.after.all;
  }
  */

  return hk;
};

/**
 * This function is being used by processMiddlewareChain and processHooksObject
 * above to transform an element from a middleware/hooks array into the
 * appropriate function that can be executed by the middleware/hooks mechanism.
 */
function getFunctionFromFactory(item, ...dirs) {
  if (typeof(item) == 'function') {
    return item;
  }
  else {
    if (typeof(item) == 'string') {
      item = {module: item};
    }

    const name = item.module.name || item.module;
    let factory;

    for (let i = 0; i < dirs.length; i++) {
      factory = reqlib({name: `${dirs[i]}/${name}`, key: item.module.key}, true);
      if (factory) {
        break;
      }
    }

    if (!factory) {
      factory = reqlib(item.module, true);
    }

    if (typeof(factory) == 'function') {
      return factory(item.options);
    }
  }
}
