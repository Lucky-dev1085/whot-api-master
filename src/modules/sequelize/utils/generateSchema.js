'use strict';

const _ = require('lodash');
const { getAttrSchema, getAssociations } = require('./');

module.exports = function(model, overrides) {
  const schema = {
    type: 'object',
    required: [],
    additionalProperties: false
  };

  schema.properties = _.pickBy(_.mapValues(model.rawAttributes, function(attr, key) {
    // exclude auto incremented fields:
    if (attr.autoIncrement) {
      return;
    }

    // exclude auto generated timestamps:
    if (model.options.timestamps && (key == 'createdAt' || key == 'updatedAt')) {
      return;
    }

    const prop = getAttrSchema(model, key);
    const _config = attr._config || {};

    if (_.get(_config, 'schema.readOnly', _config.readOnly)) {
      return;
    }

    if (!attr.allowNull && attr.defaultValue === undefined) {
      schema.required.push(key);
    }

    _.merge(prop,
      _.pick(_config, ['editIff']),
      typeof(_config.type) == 'string' ? {type: _config.type} : _config.type,
      _config.schema
    );

    if (attr.allowNull) {
      prop.type = [prop.type, 'null'];
    }

    return prop;
  }));

  _.each(getAssociations(model), function(assoc) {
    const options = model.associations[assoc].options;

    if (options.readOnly) {
      return;
    }

    schema.properties[assoc] = {
      type: 'object',
      ...options.editIff && {editIff: options.editIff}
    };
  });

  // apply any overrides:
  if (overrides) {
    _.merge(schema, overrides);
  }

  return schema;
};
