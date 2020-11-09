'use strict';

const { Model } = reqlib('_/modules/sequelize/decorators');
const BaseModel = reqlib('_/modules/feathers-sequelize/BaseModel');

module.exports = function(sequelize, DataTypes) {
  @Model(sequelize, 'chat_room_event', {
    type: {
      // room events: create-room, delete-room, hide-room, update-name, update-location, update-avatar
      // user events: join-room, leave-room, update-user-role, kick-user, block-user
      type: DataTypes.STRING,
      allowNull: false,
    },
    text: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  }, {
    indexes: [
    ],
    _config: {
      service: {
        auth: {
          'find, get': ['chat-rooms:read', 'chat-rooms:write'],
          'create, patch, remove': ['chat-rooms:write'],
        }
      }
    }
  })
  class ChatRoomEvent extends BaseModel {
    /**
     * Associations
     */
    static associate(models) {
      // assciated room
      ChatRoomEvent.belongsTo(models.chat_room);
    }
  }

  return ChatRoomEvent;
};
