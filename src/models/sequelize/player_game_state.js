'use strict';

const { Model } = reqlib('_/modules/sequelize/decorators');
const BaseModel = reqlib('_/modules/feathers-sequelize/BaseModel');

module.exports = function(sequelize, DataTypes) {
  @Model(sequelize, 'player_game_state', {
    state: {
      type: DataTypes.STRING,
      enum: ["JOINED", "DISCONNECTED", "ENDED"],
      allowNull: false,
      defaultValue: "DISCONNECTED",
    },
    winningAmount: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0.0,
    },
    stakeAmount: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0.0,
    },
  }, {
    indexes: [
      {
        fields: ['state'],
        unique: false
      },
    ],
    _config: {
      service: {
        auth: {
          'find, get': ['game:read', 'game:write'],
          'create, patch, remove': ['game:write'],
        }
      }
    }
  })
  class PlayerGameState extends BaseModel {
    /**
     * Associations
     */
    static associate(models) {
      // assciated player detail
      PlayerGameState.belongsTo(models.player_detail);

      // assciated game table
      PlayerGameState.belongsTo(models.game_table);
    }

    async joinChatRoom() {
      const state = await sequelize.models.player_game_state.findOne({
        where: { id: this.id },
        include: [{ all: true }]
      });

      if (!state.game_table.chatRoomId) {
        return;
      }

      const chatRoomUserModel = sequelize.models.chat_room_user;
      await chatRoomUserModel.create({
        name: state.player_detail.name,
        userId: state.player_detail.userId,
        chatRoomId: state.game_table.chatRoomId,
      });
    }
  }

  return PlayerGameState;
};
