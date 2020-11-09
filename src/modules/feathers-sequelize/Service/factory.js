'use strict';

const Service = require('./');
const _ = require('lodash');

module.exports = function(options) {
  return class extends Service {
    constructor(opt) {
      super(_.merge({}, options, opt));
    }
  };
};
