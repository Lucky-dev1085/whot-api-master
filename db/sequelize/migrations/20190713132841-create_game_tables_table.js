'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
    return Promise
      .resolve()
      .then(function() {
        return queryInterface.createTable('game_tables', {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
          },
          tableTitle: {
            type: Sequelize.STRING,
            allowNull: false
          },
          tablePassword: {
            type: Sequelize.STRING,
            allowNull: false
          },
          logo: {
            type: Sequelize.STRING,
            allowNull: true
          },
          gameStatus: {
            type: Sequelize.STRING,
            allowNull: true,
            defaultValue: "NEW"
          },
          playerCount: {
            type: Sequelize.INTEGER,
            allowNull: true,
            defaultValue: 0
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
        return queryInterface.dropTable('game_tables');
      });
  }
};
