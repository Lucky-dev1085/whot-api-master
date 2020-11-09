'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
    return Promise
      .resolve()
      .then(function() {
        return queryInterface.createTable('promotion_codes', {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
          },
          status: {
            type: Sequelize.STRING, // 'unused', 'used'
            allowNull: false,
            defaultValue: 'unused'
          },
          serial: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          value: {
            type: Sequelize.FLOAT,
            allowNull: false,
            defaultValue: 0
          },
          promotionId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: 'promotions',
              key: 'id'
            },
            onUpdate: 'cascade',
            onDelete: 'cascade'
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
          queryInterface.addIndex('promotion_codes', ['status']),
          queryInterface.addIndex('promotion_codes', ['serial']),
        ]);
      })
    ;
  },

  down: function (queryInterface, Sequelize) {
    return Promise
      .resolve()
      .then(function() {
        return queryInterface.dropTable('promotion_codes');
      });
  }
};
