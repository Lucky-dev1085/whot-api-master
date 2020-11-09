'use strict';
  
const sequelize = require('./instance');
const glob = require('glob');
const path = require('path');
const _ = require('lodash');

let files;

// import models from the application:
files = glob.sync(`${reqlib.resolveVirtualPath('_/models')}/sequelize/*.js`);
files.forEach(f => {
  sequelize.import(f);
});

// import models from modules, but only if they are not already defined in the
// application:
files = glob.sync(`${reqlib.resolveVirtualPath('_/modules')}/*/models/sequelize/*.js`);
files.forEach(f => {
  const modelName = path.basename(f, '.js');
  if (!sequelize.models[modelName]) {
    sequelize.import(f);
  }
});

// setup associations:
_.each(sequelize.models, model => {
  if ('associate' in model) {
    model.associate(sequelize.models);
  }
});

module.exports = sequelize.models;
