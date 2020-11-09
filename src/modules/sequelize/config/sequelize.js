'use strict';

require(require('app-root-path') + '/bootstrap');

const seederStorage = process.env.SEEDER_STORAGE || 'sequelize';
const parsed = require('url').parse(config.get('modules.sequelize.url'));

exports.development = exports.production = {
  database: parsed.pathname.slice(1),
  username: parsed.auth.split(':')[0] || '',
  password: parsed.auth.split(':')[1] || '',
  dialect: parsed.protocol.slice(0, -1),
  host: parsed.host.split(':')[0],
  port: parsed.port || 3306,
  seederStorage,
  operatorsAliases: {}
};
