'use strict';

const _ = require('lodash');
const { mapValuesDeep } = reqlib('_/modules/utils');
const { getCaseInsensitiveEqualsOp } = reqlib('_/modules/feathers-sequelize/utils');

const filters = [
  '$offset', '$limit', '$order', '$include', '$q', '$searchFields', '$all'
];

exports.parseQuery = function(query = {}, paginate = {}) {
  query = mapValuesDeep(query, function(value) {
    if (value === 'undefined') {
      return undefined;
    }

    if (value === 'null') {
      return null;
    }

    // cast booleans:
    if (value === 'true' || value === 'false') {
      return value === 'true';
    }

    // cast numbers:
    if (typeof(value) == 'string' && value !== '' && Number(value) == value) {
      return Number(value);
    }

    return value;
  });

  const parsed = {
    filters: _.pick(query, filters),
    where: _.omit(query, filters)
  };

  if (parsed.filters.$offset !== undefined) {
    parsed.filters.$offset = parseInt(parsed.filters.$offset);
  }

  if (parsed.filters.$limit !== undefined) {
    parsed.filters.$limit = Math.min(parsed.filters.$limit, paginate.max || Number.MAX_SAFE_INTEGER);
  }
  else if (paginate.limit) {
    parsed.filters.$limit = paginate.limit;
  }

  if (parsed.filters.$include) {
    // further filter @... properties from where, which are used as filters for
    // included associations:
    const includeWhere = {};
    parsed.where = _.omitBy(parsed.where, function(value, key) {
      if (/^@/.test(key)) {
        _.set(includeWhere, key.substr(1), value);
        return true;
      }
    });

    parsed.filters.$include = parseInclude(parsed.filters.$include, includeWhere);
  }
  
  return parsed;
};

exports.mergeQueryOptions = function(...args) {
  return _.mergeWith.apply(null, [...args, function(dst, src, key) {
    if ((key == '$and' || key == '$or') && _.isArray(dst)) {
      return dst.concat(src);
    }
  }]);
};

function parseInclude($include, includeWhere) {
  const paths = {};
  _.each($include.split(/\s*,\s*/), path => _.set(paths, path, {}));

  const parsed = {};

  (function parse(paths, parsed, path = []) {
    const associations = _.keys(paths);

    if (path.length) {
      const where = _.omit(_.get(includeWhere, path.join('.')), associations);
      if (Object.keys(where).length) {
        parsed.required = false;
        parsed.where = where;
      }
    }

    if (associations.length) {
      parsed.include = [];
      for (let i = 0; i < associations.length; i++) {
        const association = parsed.include[parsed.include.length] = {
          association: associations[i]
        };
        parse(paths[associations[i]], association, path.concat(associations[i]));
      }
    }
  })(paths, parsed);

  return parsed.include.length ? parsed.include : null;
}

exports.parseSearchFilter = function (searchFields, searchQuery, model) {
  searchQuery = `${searchQuery}`;
  const terms = searchQuery.split(/\s+/);
  const fields = searchFields.split(/\s*,\s*/);

  const op = getCaseInsensitiveEqualsOp(model.sequelize);
  const $or = [];

  for (let i = 0; i < fields.length; i++) {
    const fieldOr = [];
    for (let j = 0; j < terms.length; j++) {
      const term = { [fields[i]]: {[op]: `%${terms[j]}%`} };
      $or.push(term);
      fieldOr.push(term);
    }
    
  }

  return {
    where: {$and: [{$or}]},
    
  };
}
