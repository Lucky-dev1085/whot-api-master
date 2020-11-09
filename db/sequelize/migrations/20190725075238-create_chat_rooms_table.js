'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
    return Promise
      .resolve()
      .then(function() {
        return queryInterface.createTable('chat_rooms', {
          id: {
            type: Sequelize.UUID,
            allowNull: false,
            primaryKey: true
          },
          type: {
            // private, public, lobby
            type: Sequelize.STRING,
            allowNull: false,
          },

          name: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          location: {
            // location name
            type: Sequelize.STRING,
            allowNull: true,
          },
          avatarImageUrl: {
            type: Sequelize.STRING,
            allowNull: true,
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
          queryInterface.addIndex("chat_rooms", {
            fields: ["type"],
          }),
          queryInterface.addIndex("chat_rooms", {
            fields: ["name"],
          }),
          queryInterface.addIndex("chat_rooms", {
            fields: ["location"],
          }),
        ]);
      })
    ;
  },

  down: function (queryInterface, Sequelize) {
    return Promise.resolve()
      .then(function() {
        return queryInterface.dropTable('chat_rooms');
      });
  }
};
