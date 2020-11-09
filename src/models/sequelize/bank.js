'use strict';

const { Model } = reqlib('_/modules/sequelize/decorators');
const BaseModel = reqlib('_/modules/feathers-sequelize/BaseModel');

module.exports = function(sequelize, DataTypes) {
  @Model(sequelize, 'bank', {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    logoUrl: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    accountUrl: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  }, {
    indexes: [
      {
        fields: ['name'],
        unique: false
      },
    ],
    _config: {
      service: {
        auth: {
          'find, get': true,
          'create, patch, remove': ['players:write'],
        }
      }
    }
  })
  class Bank extends BaseModel {
    /**
     * Associations
     */
    static associate(models) {
      // assciated accounts
      Bank.hasMany(models.player_bank_account);
    }
  }

  return Bank;
};
