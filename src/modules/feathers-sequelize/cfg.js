'use strict';

const defaults = require('./defaults');
const _ = require('lodash');

module.exports = _.merge({}, defaults, _.get(config, 'modules.feathers-sequelize'));
