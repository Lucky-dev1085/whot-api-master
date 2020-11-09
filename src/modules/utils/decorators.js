'use strict';

/**
 * Decorate a class.
 *
 * @param {Function} fn
 * @return {Function}
 */

exports.decorateClass = function(fn) {
  return function(target, key, descriptor) {
    return fn(target, key, descriptor);
  };
};

/**
 * Decorate a class prototype.
 *
 * @param {Function} fn
 * @return {Function}
 */

exports.decorateInstance = function(fn) {
  return function(target, key, descriptor) {
    return fn(target.prototype || target, key, descriptor);
  };
};
