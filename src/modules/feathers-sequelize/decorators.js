'use strict';
  
const { decorateClass } = reqlib('_/modules/utils/decorators');
const { Model } = reqlib('_/modules/sequelize/decorators');
const { mergeAttributes, mergeOptions } = require('./utils');

/**
 * Extend a model.
 *
 * @param {Object} sequelize
 * @param {String} name
 * @param {Object} attributes
 * @param {Object} options
 * @return {Function}
 */

exports.ExtendModel = function(sequelize, name, attributes, options) {
  return decorateClass(function(target) {
    const mergedAttributes = mergeAttributes(target._attributes, attributes);
    const mergedOptions = mergeOptions(target._options, options);

    Model(sequelize, name, mergedAttributes, mergedOptions)(target);
  });
};
