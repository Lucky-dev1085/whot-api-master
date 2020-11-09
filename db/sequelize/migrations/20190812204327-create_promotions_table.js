'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
    return Promise
      .resolve()
      .then(function() {
        return queryInterface.createTable('promotions', {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
          },
          batchName: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          denomination: {
            type: Sequelize.FLOAT,
            allowNull: false,
            defaultValue: 0
          },
          numberOfCodes: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0
          },
          status: {
            type: Sequelize.STRING, // pending, created, downloaded, in-use, exhaused, expired
            allowNull: true,
            defaultValue: 'pending'
          },
          expiresAt: {
            type: Sequelize.DATE,
            allowNull: false
          },
          searchKeywords: {
            type: Sequelize.TEXT,
            allowNull: true
          },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false
          }
        });
      })
      .then(function() {
        return Promise.all([
          queryInterface.addIndex('promotions', ['status']),
          queryInterface.addIndex('promotions', ['batchName']),
          queryInterface.addIndex('promotions', ['denomination']),
          queryInterface.addIndex('promotions', ['searchKeywords'])
        ]);
      })
    ;
  },

  down: function (queryInterface, Sequelize) {
    return Promise
      .resolve()
      .then(function() {
        return queryInterface.dropTable('promotions');
      });
  }
};
