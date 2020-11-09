'use strict';

const { Model } = reqlib('_/modules/sequelize/decorators');
const BaseModel = reqlib('_/modules/feathers-sequelize/BaseModel');

module.exports = function(sequelize, DataTypes) {
  @Model(sequelize, 'chat_room', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true,
    },
    type: {
      // private, public, lobby
      type: DataTypes.STRING,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    location: {
      // location name
      type: DataTypes.STRING,
      allowNull: true,
    },
    avatarImageUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  }, {
    indexes: [
      {
        fields: ['type'],
        unique: false
      },
      {
        fields: ['name'],
        unique: false
      },
      {
        fields: ['location'],
        unique: false
      },
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
  class ChatRoom extends BaseModel {
    /**
     * Associations
     */
    static associate(models) {
      // Chat room users
      ChatRoom.hasMany(models.chat_room_user);

      // Chat room messages
      ChatRoom.hasMany(models.chat_message);

      // Chat room events
      ChatRoom.hasMany(models.chat_room_event);
    }
  }

  return ChatRoom;
};
