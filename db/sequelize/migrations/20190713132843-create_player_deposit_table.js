'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
    return Promise
      .resolve()
      .then(function() {
        return queryInterface.createTable('player_deposits', {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
          },
          amount: {
            type: Sequelize.FLOAT,
            allowNull: false,
          },
          origin: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          originDetail: {
            type: Sequelize.STRING,
            allowNull: true,
          },
          playerDetailId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: 'player_details',
              key: 'id'
            },
            onUpdate: 'cascade',
            onDelete: 'set null'
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
      });
  },

  down: function (queryInterface, Sequelize) {
    return Promise
      .resolve()
      .then(function() {
        return queryInterface.dropTable('player_deposits');
      });
  }
};
