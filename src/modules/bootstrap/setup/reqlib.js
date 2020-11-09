'use strict';

const pkg = require(rootdir + '/package.json');
const path = require('path');
const _ = require('lodash');

const reqlib = module.exports = function(module, silent) {
  const name = module.name || module;

  if (name == '_/config') {
    return config;
  }

  try {
    const mod = require(reqlib.resolveVirtualPath(name));
    return module.key ? _.get(mod, module.key) : mod;
  }
  catch (e) {
    if (!silent) {
      throw e;
    }
  }
};

reqlib.resolve = function(module) {
  return require.resolve(reqlib.resolveVirtualPath(module.name || module));
};

reqlib.resolveVirtualPath = function(vpath) {
  const map = _.get(pkg, 'settings.reqlib.paths', {});

  for (let key in map) {
    if (vpath.indexOf(key) == 0) {
      return vpath.replace(key, path.resolve(basedir, map[key]));
    }
  }

  if (vpath.indexOf('_/') == 0) {
    return vpath.replace('_/', rootdir + '/');
  }

  return vpath;
};
