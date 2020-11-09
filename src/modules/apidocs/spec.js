'use strict';

const yaml = require('js-yaml');
const fs = require('fs');
const _ = require('lodash');
const packageJSON = reqlib('_/package.json');
const cfg = require('./cfg');

// load API spec defined in configuration:
let cfgSpec = {};
if (cfg.spec) {
  const cfgSpecPath = reqlib.resolveVirtualPath(cfg.spec);
  if (fs.existsSync(cfgSpecPath)) {
    cfgSpec = yaml.load(fs.readFileSync(cfgSpecPath));
  }
}

// this is where we store the API spec:
const spec = {
  openapi: '3.0.0',
  info: {
    title: 'API Documentation',
    description: 'These are the endpoints supported by this API.',
    version: packageJSON.version
  },
  components: {
    responses: {
      Error: {
        description: 'Error',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                message: {
                  type: 'string'
                },
                errors: {
                  type: 'object'
                }
              }
            }
          }
        }
      }
    }
  }
};

// provide a way for other modules to update the spec:
exports.update = function(newSpec) {
  _.merge(spec, newSpec);
};

// spec getter:
exports.get = function() {
  // 'cfgSpec' has the highest priority:
  return _.mergeWith({}, spec, cfgSpec, function(dst, src, key) {
    if (key == 'parameters' && _.isArray(dst)) {
      return dst.concat(src);
    }
  });
};
