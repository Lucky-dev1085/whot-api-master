'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
    return Promise
      .resolve()
      .then(function() {
        return queryInterface.createTable('chat_messages', {
          id: {
            type: Sequelize.UUID,
            allowNull: false,
            primaryKey: true
          },

          type: {
            // direct-message, rooms-messages
            type: Sequelize.STRING,
            allowNull: false,
          },
          senderName: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          text: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          contentUrl: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          contentType: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          senderId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: "users", key: "id" },
            onDelete: "SET NULL",
            onUpdate: "CASCADE"
          },
          chatRoomId: {
            type: Sequelize.UUID,
            allowNull: true,
            references: { model: "chat_rooms", key: "id" },
            onDelete: "CASCADE",
            onUpdate: "CASCADE"
          },
          recepientId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: "users", key: "id" },
            onDelete: "SET NULL",
            onUpdate: "CASCADE"
          },
          ancestorId: {
            type: Sequelize.UUID,
            allowNull: true,
            references: { model: "chat_messages", key: "id" },
            onDelete: "CASCADE",
            onUpdate: "CASCADE"
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
          queryInterface.addIndex("chat_messages", {
            fields: ["text"],
          }),
          queryInterface.addIndex("chat_messages", {
            fields: ["type"],
          }),
        ]);
      });
  },

  down: function (queryInterface, Sequelize) {
    return Promise
      .resolve()
      .then(function() {
        return queryInterface.dropTable('chat_messages');
      });
  }
};
