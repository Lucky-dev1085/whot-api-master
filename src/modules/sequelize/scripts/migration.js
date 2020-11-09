'use strict';

require(require('app-root-path') + '/bootstrap');

const sequelize = reqlib('_/modules/sequelize/instance');
const models = reqlib('_/models');
const _ = require('lodash');
const tpls = require('./templates');
const prettier = require('prettier');

const fromSchema = process.argv[2] ? require(process.argv[2]).schema : null;

generateMigration(fromSchema);

process.exit(0);

/**
 * Functions
 */

// generate a Sequelize migration file starting from an initial schema:
function generateMigration(fromSchema) {
  const toSchema = getSchema();

  let up = '', down = '';

  function addUp(s) {
    up += s;
  }

  function addDown(s) {
    down = s + down;
  }

  if (fromSchema !== undefined) {
    const diff = computeSchemaDiff(fromSchema, toSchema);

    if (!diff) {
      return;
    }

    // Note: the order in which this IFs are placed matters.

    if (diff.createTable) {
      _.each(toSchema.createOrder, modelName => {
        if (_.indexOf(diff.createTable, modelName) === -1) {
          return;
        }

        const schema = toSchema.models[modelName];

        addUp(createTable(schema));
        addDown(dropTable(schema.tableName));
      });
    }

    if (diff.removeIndex) {
      _.each(diff.removeIndex, ({modelName, index}) => {
        const table = fromSchema.models[modelName].tableName;

        addUp(removeIndex(table, index.indexName || index.fields));
        addDown(addIndex(table, index));
      });
    }

    if (diff.removeColumn) {
      _.each(diff.removeColumn, ({modelName, name}) => {
        const schema = fromSchema.models[modelName];

        addUp(removeColumn(schema.tableName, name));
        addDown(addColumn(schema, name));
      });
    }

    if (diff.dropTable) {
      _.eachRight(fromSchema.createOrder, modelName => {
        if (_.indexOf(diff.dropTable, modelName) === -1) {
          return;
        }

        const schema = fromSchema.models[modelName];

        addUp(dropTable(schema.tableName));
        addDown(createTable(schema));
      });
    }

    if (diff.changeColumn) {
      _.each(diff.changeColumn, ({modelName, name}) => {
        const from = fromSchema.models[modelName];
        const to = toSchema.models[modelName];

        addUp(changeColumn(to.tableName, name, to.attributes[name]));
        addDown(changeColumn(from.tableName, name, from.attributes[name]));
      });
    }

    if (diff.addColumn) {
      _.each(diff.addColumn, ({modelName, name}) => {
        const schema = toSchema.models[modelName];

        addUp(addColumn(schema, name));
        addDown(removeColumn(schema.tableName, name));
      });
    }

    if (diff.addIndex) {
      _.each(diff.addIndex, ({modelName, index}) => {
        const table = toSchema.models[modelName].tableName;

        addUp(addIndex(table, index));
        addDown(removeIndex(table, index.indexName || index.fields));
      });
    }
  }

  console.log(prettier.format(tpls.migration({
    up, down, schema: JSON.stringify(toSchema)
  }), {parser: 'babel'}));
}

// generate the code for creating a table:
function createTable(schema) {
  return [tpls.createTable({
    table: schema.tableName,
    attributes: JSON.stringify(schema.attributes),
    options: JSON.stringify(_.omit(schema.options, ['indexes']))
  })].concat(_.map(schema.options.indexes, index => addIndex(
    schema.tableName, index
  ))).join('');
}

// generate the code for dropping a table:
function dropTable(table) {
  return tpls.dropTable({table});
}

// generate the code for adding a column:
function addColumn(schema, name) {
  const names = _.keys(schema.attributes);
  const options = {};
  
  const index = _.indexOf(names, name);
  if (index === 0) {
    options.first = true;
  }
  else {
    options.after = names[index - 1];
  }

  return tpls.addColumn({
    table: schema.tableName,
    name,
    options: JSON.stringify(Object.assign(
      options,
      schema.attributes[name]
    ))
  });
}

// generate the code for removing a column:
function removeColumn(table, name) {
  return tpls.removeColumn({table, name});
}

// generate the code for changing a column:
function changeColumn(table, name, options) {
  return tpls.changeColumn({table, name, options: JSON.stringify(options)});
}

// generate the code for adding an index:
function addIndex(table, options) {
  return tpls.addIndex({table, options: JSON.stringify(options)});
}

// generate the code for removing an index:
function removeIndex(table, index) {
  return tpls.removeIndex({table, index: JSON.stringify(index)});
}

// compute the differences between two schemas:
function computeSchemaDiff(from, to) {
  const diff = {};
  const fromModelNames = _.keys(_.get(from, 'models'));
  const toModelNames = _.keys(to.models);

  // models which only exist in 'to' need to be created:
  const createTable = _.difference(toModelNames, fromModelNames);
  if (createTable.length) {
    diff.createTable = createTable;
  }

  // models which only exist in 'from' need to be dropped:
  const dropTable = _.difference(fromModelNames, toModelNames);
  if (dropTable.length) {
    diff.dropTable = dropTable;
  }

  // check models that appear in both 'to' and 'from' for changes in fields or
  // indexes:
  let addColumn = [], changeColumn = [], removeColumn = [];
  let addIndex = [], removeIndex = [];
  _.each(_.intersection(fromModelNames, toModelNames), modelName => {
    const fromAttrs = from.models[modelName].attributes;
    const toAttrs = to.models[modelName].attributes;
    const fromAttrNames = _.keys(fromAttrs);
    const toAttrNames = _.keys(toAttrs);

    // attributes which only exist in 'to' need to be added:
    const addAttrs = _.difference(toAttrNames, fromAttrNames);
    if (addAttrs.length) {
      addColumn.push.apply(addColumn, addAttrs.map(name => ({
        modelName,
        name
      })));
    }

    // attributes which only exist in 'from' need to be removed:
    const removeAttrs = _.difference(fromAttrNames, toAttrNames);
    if (removeAttrs.length) {
      removeColumn.push.apply(removeColumn, removeAttrs.map(name => ({
        modelName,
        name
      })));
    }

    // check attributes that appear in both 'to' and 'from' and in case they
    // differ, they need to be updated:
    _.each(_.intersection(fromAttrNames, toAttrNames), name => {
      if (!_.isEqual(fromAttrs[name], toAttrs[name])) {
        changeColumn.push({
          modelName,
          name
        });
      }
    });

    // check indexes:
    const fromIndexes = _.clone(from.models[modelName].options.indexes);
    const toIndexes = _.clone(to.models[modelName].options.indexes);
    for (let i = toIndexes.length - 1; i >= 0; i--) {
      const j = _.findIndex(fromIndexes, toIndexes[i]);
      if (j > -1 && _.isEqual(fromIndexes[j], toIndexes[i])) {
        fromIndexes.splice(j, 1);
        toIndexes.splice(i, 1);
      }
    }

    if (fromIndexes.length) {
      removeIndex.push.apply(removeIndex, fromIndexes.map(index => ({
        modelName,
        index
      })));
    }

    if (toIndexes.length) {
      addIndex.push.apply(addIndex, toIndexes.map(index => ({
        modelName,
        index
      })));
    }
  });

  if (addColumn.length) {
    diff.addColumn = addColumn;
  }

  if (changeColumn.length) {
    diff.changeColumn = changeColumn;
  }

  if (removeColumn.length) {
    diff.removeColumn = removeColumn;
  }

  if (addIndex.length) {
    diff.addIndex = addIndex;
  }

  if (removeIndex.length) {
    diff.removeIndex = removeIndex;
  }

  if (Object.keys(diff).length) {
    return diff;
  }
}

// get the schema of all defined models:
function getSchema() {
  return {
    models: _.mapValues(models, model => getModelSchema(model)),
    createOrder: sortModels()
  };
}

// get the schema for a model:
function getModelSchema(model) {
  const schema = {
    tableName: model.tableName,
    attributes: _.pickBy(_.mapValues(model.rawAttributes, (attr, name) => {
      let type = attr.type;

      // ignore VIRTUAL fields:
      if (type instanceof sequelize.Sequelize.VIRTUAL) {
        return;
      }

      // use STRING for ENUM fields:
      if (type instanceof sequelize.Sequelize.ENUM) {
        type = sequelize.Sequelize.STRING();
      }

      const attrSchema = Object.assign(
        {
          type: type.toString(sequelize)
        },
        _.pick(attr, [
          'allowNull',
          'primaryKey', 'autoIncrement', 'unique',
          'references', 'onDelete', 'onUpdate',
          'defaultValue'
        ])
      );

      if (attrSchema.defaultValue instanceof sequelize.Sequelize.UUIDV4) {
        delete attrSchema.defaultValue;
      }

      if (typeof(attrSchema.defaultValue) === 'function') {
        delete attrSchema.defaultValue;
      }

      return attrSchema;
    })),
    options: Object.assign(
      _.pick(model.options, ['charset']),
      {
        indexes: _.map(model.options.indexes, index => Object.assign(
          {fields: index.fields},
          index.name ? {indexName: index.name} : {},
          index.unique ? {indicesType: 'UNIQUE'} : {},
          index.method ? {indexType: index.method} : {}
        ))
      }
    )
  };

  return schema;
}

// sort models based on their foreign key constraints so that we create them in
// the right order:
function sortModels() {
  const modelTables2Names = {};
  _.each(models, model => modelTables2Names[model.tableName] = model.name);

  const modelRanks = _.mapValues(models, _.constant(0));
  _.each(modelRanks, (rank, name) => modelRanks[name] = getRank(name));
  
  return _.keys(modelRanks).sort((a, b) => {
    return modelRanks[a] - modelRanks[b];
  });

  function getRank(name) {
    if (modelRanks[name]) {
      return modelRanks[name];
    }

    const model = models[name];
    const ranks = [0];
    _.each(model.attributes, attribute => {
      if (attribute.references && modelTables2Names[attribute.references.model] != name) {
        ranks.push(getRank(modelTables2Names[attribute.references.model]));
      }
    });

    modelRanks[name] = Math.max(...ranks) + 1;
    return modelRanks[name];
  }
}
