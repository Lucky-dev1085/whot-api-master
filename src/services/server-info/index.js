'use strict';

const packageJSON = require('../../../package');

module.exports = class ServerInfoService {
  async find() {
    const info = {
      version: packageJSON.version,
      uptime: process.uptime()
    };

    return info;
  }
};
