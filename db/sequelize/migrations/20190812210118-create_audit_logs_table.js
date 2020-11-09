'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
    return Promise
      .resolve()
      .then(function() {
        return queryInterface.createTable('audit_logs', {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
          },
          userId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: 'users',
              key: 'id'
            },
            onDelete: 'SET NULL',
            onUpdate: 'CASCADE',
          },
          entityTable: {
            type: Sequelize.TEXT,
            allowNull: false
          },
          entityId: {
            type: Sequelize.TEXT,
            allowNull: false
          },
          action: {
            type: Sequelize.TEXT,
            allowNull: true
          },
          changes: {
            type: Sequelize.JSON,
            allowNull: true
          },
          changeReason: {
            type: Sequelize.TEXT,
            allowNull: true
          },
          changeTimestamp: {
            type: Sequelize.DATE,
            allowNull: true
          },
          userSignature: {
            type: Sequelize.TEXT,
            allowNull: true
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
          queryInterface.addIndex('audit_logs', ['entityTable']),
          queryInterface.addIndex('audit_logs', ['changeTimestamp']),
          queryInterface.addIndex('audit_logs', ['userSignature']),
          queryInterface.addIndex('audit_logs', ['searchKeywords']),
        ]);
      })
    ;
  },

  down: function (queryInterface, Sequelize) {
    return Promise
      .resolve()
      .then(function() {
        return queryInterface.dropTable('audit_logs');
      });
  }
};
