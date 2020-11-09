'use strict';

const defaults = config.util.hydrate(require('./defaults'));
const _ = require('lodash');

const cfg = module.exports = _.merge({}, defaults, _.get(config, 'modules.bulksms'));
config.util.attachProtoDeep(cfg);
