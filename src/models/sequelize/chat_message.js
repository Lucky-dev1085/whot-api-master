'use strict';

const uuid = require('uuid/v4');
const errors = reqlib('_/modules/feathers/errors');
const { Model } = reqlib('_/modules/sequelize/decorators');
const BaseModel = reqlib('_/modules/feathers-sequelize/BaseModel');
const { ensureKey } = reqlib('_/modules/utils');

module.exports = function(sequelize, DataTypes) {
  @Model(sequelize, 'chat_message', {    
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true,
      _config: { readOnly: true },
    },
    type: {
      // direct-message, room-messages
      type: DataTypes.STRING,
      allowNull: true,
    },
    senderName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    text: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    contentUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    contentType: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  }, {
    indexes: [
      {
        fields: ['text'],
        unique: false
      },
      {
        fields: ['type'],
        unique: false
      },
    ],
    _config: {
      service: {
        hooks: {
          before: {
            create: [
              async function populateFromSession(context) {
                if (!context.params.user) {
                  throw errors.NotAuthenticated(null, `Must be logged-in to post messages`);
                }
                context.data.type = context.data.type || 'room-messages';
                context.data.senderId = context.params.user.id;
                context.data.senderName = context.params.user.name;

                const isAdmin = await context.params.user.hasPermissions(['chat-rooms:write']);
                if(isAdmin) {
                  return;
                }
                const latestRoom = await getLatestChatRoom(sequelize.models, context.params.user);
                context.data.chatRoomId = latestRoom.chatRoomId;
              },
            ],
            'find, get': [
              async function filterMessages(context) {
                if (!context.params.user) {
                  throw errors.NotAuthenticated(null, `Must be logged-in to get messages`);
                }
                const isAdmin = await context.params.user.hasPermissions(['chat-rooms:read']);
                if(isAdmin) {
                  return;
                }
                const latestRoom = await getLatestChatRoom(sequelize.models, context.params.user);
                const $and = ensureKey(context.params, 'sequelize.where.$and', []);
                $and.push({ chatRoomId: latestRoom.chatRoomId });
              }
            ],
          },
        },
        auth: {
          'create, find, get': true,
          'patch, remove': ['chat-messages:write'],
        },
        publish: { all: async function (data, params) {
          const chatRoomUserModel = sequelize.models.chat_room_user;
          const roomUsers = await chatRoomUserModel.findAll({ where: {
            chatRoomId: data.chatRoomId
          }});
          return roomUsers.map( (roomUser) => app.channel(`users-${roomUser.userId}`));
        }},
      }
    }
  })
  class ChatMessage extends BaseModel {
    /**
     * Associations
     */
    static associate(models) {
      // assciated sending user
      ChatMessage.belongsTo(models.user, {
        as: 'sender',
        allowNull: true,
        foreignKey: {
          allowNull: true
        }
      });

      // assciated receiving room (for chat room messages)
      ChatMessage.belongsTo(models.chat_room);

      // assciated receiving user (for direct messages)
      ChatMessage.belongsTo(models.user, {
        as: 'recepient',
      });

      // assciated parrent message (for messages threads)
      ChatMessage.belongsTo(models.chat_message, {as: 'ancestor'});

      // assciated message replies (for messages threads)
      ChatMessage.hasMany(models.chat_message, {
        as: 'replies',
        foreignKey: 'ancestorId'
      });
    }
  }

  return ChatMessage;
};

async function getLatestChatRoom(models, user) {
  const chatRoomUserModel = models.chat_room_user;
  const userRooms = await chatRoomUserModel.findOne({
    where: { userId: user.id },
    order: [ ['createdAt', 'DESC'] ],
  });
  if (!userRooms) {
    throw errors.BadRequest(null, 'User chat is only enabled during game play');
  }
  return userRooms;
}
