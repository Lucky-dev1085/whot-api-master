'use strict';

const { Model } = reqlib('_/modules/sequelize/decorators');
const BaseModel = reqlib('_/modules/feathers-sequelize/BaseModel');

module.exports = function(sequelize, DataTypes) {
  @Model(sequelize, 'tournament_rank', {
    state: {
      type: DataTypes.STRING,
      enum: ["JOINED", "LIVE", "DISCONNECTED", "ENDED"],
      allowNull: false,
      defaultValue: "DISCONNECTED",
    },
    score: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0.0,
    },
    currentRoundNo: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      _config: {
        schema: {
          readOnly: true,
        }
      }
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
      {
        fields: ['score'],
        unique: false
      },
    ],
    _config: {
      service: {
        auth: {
          'find, get': true,
          'create, patch, remove': ['game:write'],
        }
      }
    }
  })
  class TournamentRank extends BaseModel {
    /**
     * Associations
     */
    static associate(models) {
      // assciated player detail
      TournamentRank.belongsTo(models.player_detail);

      // assciated tournament
      TournamentRank.belongsTo(models.tournament);
    }
  }

  return TournamentRank;
};
