'use strict';

const randomstring = require('randomstring');
const uuidv1 = require('uuid/v1');
const uuidv4 = require('uuid/v4');
const _ = require('lodash');

// expose randomstring:
exports.randomstring = randomstring;

/**
 * Get the public application URL, as per configuration.
 *
 * @return {String}
 */

exports.getPublicUrl = function() {
  if (config.has('publicUrl') && config.publicUrl) {
    return config.publicUrl;
  }

  const proto = config.proto || 'http://';
  const host = config.get('host').replace(/^HOST$/, '127.0.0.1');
  const port = String(config.get('port')).replace(/^PORT$/, 3000);

  return `${proto}${host}${port != 80 && port != 443 ? ':' + port : ''}`;
};

/**
 * Ensure object has a path, otherwise create path with given default value and
 * return it.
 *
 * @return {Mixed}
 */

exports.ensureKey = function(obj, path, value = null) {
  if (!_.has(obj, path)) {
    _.set(obj, path, value);
  }

  return _.get(obj, path);
};

/**
 * Replace tokens in a string. Provides default values for the following tokens:
 * - $random[{ ... JSON-encoded options ...} = {}] (uses randomstring package)
 * - $uuid[version = 4] (uses uuid package)
 * - $timestamp (uses (new Date()).getTime())
 *
 * Custom tokens:
 * - $keyNameInSourcePointingToAString
 * - $keyNameInSourcePointingToAnObject[path.in.object]
 *
 * @param {String} s
 * @param {Object} source Source of values for tokens found in the string
 * @return {String}
 */

exports.replaceTokens = function(s, source) {
  return s.replace(/\$([a-z0-9_]+)(\[([^\[\]]+)\])?/gi, function(fullMatch, name, _$2, params) {
    switch (name) {
      case 'random':
        return randomstring.generate(params && JSON.parse(params));
      case 'uuid':
        return params === '1' ? uuidv1() : uuidv4();
      case 'timestamp':
        return (new Date()).getTime();
      default:
        return _.get(params ? source[name] : source, params || name, fullMatch);
    }
  });
};

/**
 * Evaluate a "truth" array. This is an array where each item is a string,
 * a boolean (value or function) or another array with the same type of
 * items except for yet another array.
 *
 * Example: ['s1', 's2', fn1, [fn2, 's3']]
 *
 * The method of evaluation can either be "all" or "any". The above example will
 * be evaluated as below:
 *
 * For "all": s1 && s2 && fn1 && (fn2 || s3)
 * For "any": s1 || s2 || fn1 || (fn2 && s3)
 *
 * A string is evaluated to true if it can be found in the given list of strings.
 * A function is called with the provided "fnThis" and "fnArgs" parameters.
 *
 * @param {Array} arr The truth array
 * @param {Array|Object} strs The list of available strings
 * @param {String} method Either "all" or "any"
 * @param {Object} fnThis
 * @param {Array} fnArgs
 * @return {Boolean} Returns a boolean or throws an error
 */

exports.evalTruthArray = async function(arr, strs, method = 'any', fnThis = null, fnArgs = []) {
  const a = _.isArray(arr) ? arr : [arr];
  const s = _.isArray(strs) ? _.zipObject(strs, strs) : strs;
  let result = method == 'any' ? false : true;
  let err;

  for (let i = 0; i < a.length; i++) {
    let sw;

    if (_.isArray(a[i])) {
      sw = await exports.evalTruthArray(a[i], s, method == 'any' ? 'all' : 'any', fnThis, fnArgs);
      if (typeof(sw) !== 'boolean') {
        err = sw;
        sw = false;
      }
    }
    else {
      switch (typeof(a[i])) {
        case 'function':
          try {
            sw = await a[i].apply(fnThis, fnArgs);
          }
          catch (e) {
            sw = false;
            err = e;
          }
          break;

        case 'boolean':
          sw = a[i];
          break;

        case 'string':
          sw = s[a[i]] !== undefined;
          break;

        default:
          throw new Error('Unknown truth array item');
      }
    }

    if (method == 'any') {
      result = result || sw;
    }
    else {
      result = result && sw;
    }

    if ((method == 'any' && result) || (method == 'all' && !result)) {
      break;
    }
  }

  return (result || err || false);
};

/**
 * Implement _.mapKeysDeep() and _.mapValuesDeep().
 * https://github.com/lodash/lodash/issues/1244#issuecomment-338139221
 * https://github.com/lodash/lodash/issues/1244#issuecomment-378314930
 */

exports.mapKeysDeep = function mapKeysDeep(object, iteratee) {
  if (_.isArray(object)) {
    return object.map(function(value) {
      return mapKeysDeep(value, iteratee);
    });
  }
  else if (_.isObject(object)) {
    return _.mapValues(_.mapKeys(object, iteratee), function(value) {
      return mapKeysDeep(value, iteratee);
    });
  }
  else {
    return object;
  }
};

exports.mapValuesDeep = function mapValuesDeep(object, iteratee) {
  if (_.isArray(object)) {
    return object.map(function(value) {
      return mapValuesDeep(value, iteratee);
    });
  }
  else if (_.isObject(object)) {
    return _.mapValues(object, function(value, key) {
      return _.isObject(value) ? mapValuesDeep(value, iteratee) : iteratee(value, key, object);
    });
  }
  else {
    return iteratee(object);
  }
};
