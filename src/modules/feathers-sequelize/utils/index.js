'use strict';

const _ = require('lodash');

/**
 * Merge model attributes (used for extending models).
 */
exports.mergeAttributes = function(oldAttrs, newAttrs) {
  return _.merge({}, oldAttrs, newAttrs);
};

/**
 * Merge model options (used for extending models).
 */
exports.mergeOptions = function(oldOpts, newOpts) {
  return _.merge({}, oldOpts, newOpts);
};

/**
 * Get all IDs specified in the data structure used to update the associations
 * of a model.
 */
exports.extractAssociationIds = function(data, id = 'id') {
  const result = {};

  _.each(['add', 'set', 'remove'], function(op) {
    if (data[op] && data[op].length) {
      result[op] = _.filter(data[op].map(function(d) {
        if (typeof(d) == 'object') {
          return _.get(d, `payload[${id}]`, d[id]);
        }
        else {
          return d;
        }
      }));
    }
    else {
      result[op] = [];
    }
  });

  return result;
};

exports.getCaseInsensitiveEqualsOp = function(sequelize) {
  const dialectLocations = [`${sequelize.options.dialect}`, `${sequelize.dialect}`];
  const isPostgres = (dialectLocations.indexOf('postgres') >= 0) || (dialectLocations.indexOf('postgresql') >= 0);
  return isPostgres ? '$iLike' : '$like';
};
