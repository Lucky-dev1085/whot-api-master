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
          nickName: {
            type: Sequelize.STRING,
            allowNull: false
          },
          avatarImage: {
            type: Sequelize.STRING,
            allowNull: true
          },
          depositBalance: {
            type: Sequelize.FLOAT,
            allowNull: false,
          },
          withdrawlBalance: {
            type: Sequelize.FLOAT,
            allowNull: false,
          },
          playerStatus: {
            type: Sequelize.STRING,
            allowNull: true,
          },
          termsAgreed: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
          },
          termsAgreedTimestamp: {
            type: Sequelize.DATE,
            allowNull: false,
          },
          userId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: 'users',
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
        return queryInterface.dropTable('player_details');
      });
  }
};
