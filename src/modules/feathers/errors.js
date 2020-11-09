'use strict';

const feathersErrors = require('@feathersjs/errors');
const _ = require('lodash');

const errors = module.exports = {
  feathersErrors
};

_.each(feathersErrors, (fn, key) => {
  if (!(/\d+/.test(key))) {
    return;
  }

  errors[key] = errors[fn.name] = function createError(errorCode, defaultMessage, data) {
    if (!_.isPlainObject(data)) {
      data = {
        ...data && {data}
      };
    }

    let message = defaultMessage;

    if (errorCode) {
      errorCode = errorCode.toUpperCase();
      data.errorCode = errorCode;
      message = _.get(config, `errorMessages[${errorCode}]`, defaultMessage);
    }

    return new fn(message, data);
  };
});
