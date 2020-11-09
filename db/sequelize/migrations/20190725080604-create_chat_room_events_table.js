'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
    return Promise
      .resolve()
      .then(function() {
        return queryInterface.createTable('chat_room_events', {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
          },
          type: {
            // room events: create-room, delete-room, hide-room, update-name, update-location, update-avatar
            // user events: join-room, leave-room, update-user-role, kick-user, block-user
            type: Sequelize.STRING,
            allowNull: false,
          },
          text: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          chatRoomId: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: "chat_rooms", key: "id" },
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
      });
  },

  down: function (queryInterface, Sequelize) {
    return Promise.resolve()
      .then(function() {
        return queryInterface.dropTable('chat_room_events');
      });
  }
};
