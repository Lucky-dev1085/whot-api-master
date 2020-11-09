'use strict';

const defaults = require('./defaults');
const _ = require('lodash');

const cfg = module.exports = _.merge({}, defaults, _.get(config, 'modules.email'));
config.util.attachProtoDeep(cfg);
