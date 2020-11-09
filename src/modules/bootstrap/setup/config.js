'use strict';

/**
 * Setup Configuration
 */

const pkg = require(rootdir + '/package.json');
const path = require('path');
const fs = require('fs');
const _ = require('lodash');

// load .env:
require('dotenv').config({path: rootdir + '/.env'});

// load config:
process.env.NODE_CONFIG_DIR = path.resolve(rootdir, _.get(pkg, 'settings.configDir', 'config'));
const config = require('config');

// attach a function that will "hydrate" the config with values from the
// environment or other sources:
const hydrate = config.util.hydrate = function(obj) {
  Object.keys(obj).forEach(key => {
    let value = obj[key];

    if (typeof(value) == 'object' && value !== null) {
      value = hydrate(value);
    }
    else if (typeof(value) == 'string') {
      // escaped, use as literal string:
      if (value.match(/^\\/)) {
        value = value.replace(/^\\/, '');
      }
      else if (process.env[value] !== undefined) {
        value = process.env[value];
      }

      // replace environment variables (new format ${VAR}):
      value = value.replace(/\${(\w+)}/g, function(_match, $1) {
        return process.env[$1] || '';
      });

      // convert relative paths into absolute ones:
      const matches = value.match(/^\s*(<)?\s*(\.\.?\/.*)/);
      if (matches) {
        const file = path.resolve(config.util.getEnv('NODE_CONFIG_DIR'), matches[2]);
        if (matches[1]) {
          if (/\.js(on)?$/.test(file)) {
            value = require(file);
          }
          else {
            value = fs.readFileSync(file, {encoding: 'utf8'});
          }
        }
        else {
          value = file;
        }
      }
    }

    // cast undefined:
    if (value === 'undefined') {
      value == undefined;
    }

    // cast null:
    if (value === 'null') {
      value = null;
    }

    // cast booleans:
    if (value === 'true' || value === 'false') {
      value = value === 'true';
    }

    // cast numbers:
    if (typeof(value) == 'string' && value !== '' && Number(value) == value) {
      value = Number(value);
    }

    obj[key] = value;
  });

  return obj;
};

module.exports = hydrate(config);
