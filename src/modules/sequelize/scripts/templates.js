'use strict';

const _ = require('lodash');

module.exports = {
  createTable: _.template(
    `
    .then(function() {
      return queryInterface.createTable("<%= table %>", <%= attributes %>, <%= options %>);
    })
    `
  ),

  dropTable: _.template(
    `
    .then(function() {
      return queryInterface.dropTable("<%= table %>");
    })
    `
  ),

  addIndex: _.template(
    `
    .then(function() {
      return queryInterface.addIndex("<%= table %>", <%= options %>);
    })
    `
  ),

  removeIndex: _.template(
    `
    .then(function() {
      return queryInterface.removeIndex("<%= table %>", <%= index %>);
    })
    `
  ),

  addColumn: _.template(
    `
    .then(function() {
      return queryInterface.addColumn("<%= table %>", <%= name %>, <%= options %>);
    })
    `
  ),

  changeColumn: _.template(
    `
    .then(function() {
      return queryInterface.changeColumn("<%= table %>", <%= name %>, <%= options %>);
    })
    `
  ),

  removeColumn: _.template(
    `
    .then(function() {
      return queryInterface.removeColumn("<%= table %>", <%= name %>);
    })
    `
  ),

  migration: _.template(
    `
    "use strict";

    module.exports = {
      up: function(queryInterface, Sequelize) {
        return Promise.resolve()<%= up %>;
      },

      down: function(queryInterface, Sequelize) {
        return Promise.resolve()<%= down %>;
      },

      schema: <%= schema %>
    };
    `
  )
};
