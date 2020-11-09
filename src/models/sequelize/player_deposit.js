'use strict';

const { Model } = reqlib('_/modules/sequelize/decorators');
const BaseModel = reqlib('_/modules/feathers-sequelize/BaseModel');
const { enforcePlayer } = reqlib('_/src/utils/access-control');

module.exports = function(sequelize, DataTypes) {
  @Model(sequelize, 'player_deposit', {
    amount: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0.0,
    },
    origin: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "",
    },
    originDetail: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "",
    },
  }, {
    indexes: [
      {
        fields: ['origin'],
        unique: false
      },
      {
        fields: ['amount'],
        unique: false
      },
    ],
    _config: {
      service: {
        auth: {
          'find, get': [
            enforcePlayer({playerField: 'id', field: 'playerDetailId'}),
            'players:read', 'players:write'
          ],
          'create, patch, remove': [
            'players:write'
          ],
        }
      }
    }
  })
  class PlayerDeposit extends BaseModel {
    /**
     * Associations
     */
    static associate(models) {
      // assciated player detail
      PlayerDeposit.belongsTo(models.player_detail);
    }
  }

  return PlayerDeposit;
};
