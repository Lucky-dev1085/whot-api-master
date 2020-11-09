'use strict';

const { Model } = reqlib('_/modules/sequelize/decorators');
const BaseModel = reqlib('_/modules/feathers-sequelize/BaseModel');

module.exports = function(sequelize, DataTypes) {
  @Model(sequelize, 'chat_room_user', {    
    name: {
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
  class ChatRoomUser extends BaseModel {
    /**
     * Associations
     */
    static associate(models) {
      // assciated user
      ChatRoomUser.belongsTo(models.user);

      // user role in this room
      ChatRoomUser.belongsTo(models.role);
      
      // assciated room
      ChatRoomUser.belongsTo(models.chat_room);
    }
  }

  return ChatRoomUser;
};
