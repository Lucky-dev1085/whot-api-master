'use strict';

const _ = require('lodash');

/**
 * Get schema type and format for a model attribute.
 */
exports.getAttrSchema = function(model, attrName) {
  if (!model.rawAttributes[attrName]) {
    return;
  }

  const DT = model.sequelize.Sequelize.DataTypes;
  let type = model.rawAttributes[attrName].type;

  if (type instanceof DT.VIRTUAL) {
    if (type.returnType) {
      type = type.returnType;
    }
    else {
      return {type: 'string'};
    }
  }

  if (type instanceof DT.STRING || type instanceof DT.TEXT) {
    return {type: 'string'};
  }

  if (type instanceof DT.INTEGER || type instanceof DT.BIGINT) {
    return {type: 'integer'};
  }

  if (type instanceof DT.BOOLEAN) {
    return {type: 'boolean'};
  }

  if (type instanceof DT.FLOAT || type instanceof DT.DOUBLE) {
    return {type: 'number'};
  }

  if (type instanceof DT.DATE) {
    return {type: 'string', format: 'date-time'};
  }

  if (type instanceof DT.DATEONLY) {
    return {type: 'string', format: 'date'};
  }

  if (type instanceof DT.ENUM) {
    return {type: 'string', enum: type.values};
  }

  if (type instanceof DT.JSON) {
    const defaultValue = model.rawAttributes[attrName].defaultValue;
    if (defaultValue) {
      const typeofType = typeof(defaultValue);

      switch (typeofType) {
        case 'boolean':
        case 'number':
        case 'string':
          return {type: typeofType};

        case 'object':
          if (_.isArray(defaultValue)) {
            return {type: 'array'};
          }
          if (_.isPlainObject(defaultValue)) {
            return {type: 'object'};
          }
          break;
      }
    }
  }

  return {type: 'string'};
};

// get associations of type HasMany and BelongsToMany:
exports.getAssociations = function(model, types) {
  if (!types) {
    types = ['BelongsTo', 'HasMany', 'BelongsToMany'];
  }

  const associationNames = [];

  _.each(model.associations, (assoc, name) => {
    const type = assoc.associationType;
    if (types.indexOf(type) >= 0) {
      associationNames.push(name);
    }
  });

  return associationNames;
};

// check if a table is defined (used by dynamic migration files):
exports.tableExists = async function tableExists(queryInterface, tableName) {
  const tables = _.map(await queryInterface.showAllSchemas(), o => _.values(o)[0]);
  return tables.indexOf(tableName) >= 0;
}
