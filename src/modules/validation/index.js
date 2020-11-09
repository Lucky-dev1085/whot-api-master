'use strict';

const Ajv = require('ajv');

/**
 * Validate some data against a schema.
 */
exports.validate = function(schema, data, options = {}) {
  const validator = new Ajv(Object.assign({
    allErrors: true,
    removeAdditional: false,
    coerceTypes: true
  }, options));

  const isValid = validator.validate(schema, data);

  if (!isValid) {
    return validator.errors;
  }
};
