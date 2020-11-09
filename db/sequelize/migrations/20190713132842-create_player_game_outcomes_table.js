'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
    return Promise
      .resolve()
      .then(function() {
        return queryInterface.createTable('player_details', {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
          },
          outcome: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          winningAmount: {
            type: Sequelize.FLOAT,
            allowNull: false,
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
          gameTableId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: 'game_tables',
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
      });
  },

  down: function (queryInterface, Sequelize) {
    return Promise
      .resolve()
      .then(function() {
        return queryInterface.dropTable('player_details');
      });
  }
};
