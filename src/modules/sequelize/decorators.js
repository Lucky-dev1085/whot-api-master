'use strict';
  
const { decorateClass } = reqlib('_/modules/utils/decorators');
const _ = require('lodash');

/**
 * Define a model, to be used in place of sequelize.define().
 *
 * @param {Object} sequelize
 * @param {String} name
 * @param {Object} attributes
 * @param {Object} options
 * @return {Function}
 */

exports.Model = function(sequelize, name, attributes, options = {}) {
  return decorateClass(function(target) {
    const attrs = _.pickBy(attributes);
    const opts = _.pickBy(options);

    target._attributes = _.cloneDeep(attrs);
    target._options = _.cloneDeep(opts);

    opts.modelName = name;
    opts.sequelize = sequelize;

    target.init(attrs, opts);
  });
};
