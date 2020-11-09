'use strict';

const defaults = require('./defaults');
const _ = require('lodash');

const cfg = module.exports = _.merge({}, defaults, _.get(config, 'modules.sequelize'));
config.util.attachProtoDeep(cfg);
