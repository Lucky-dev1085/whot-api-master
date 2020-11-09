'use strict';

const { Model } = reqlib('_/modules/sequelize/decorators');
const BaseModel = reqlib('_/modules/feathers-sequelize/BaseModel');

module.exports = function(sequelize, DataTypes) {
  @Model(sequelize, 'promotion_code', {
    status: {
      type: DataTypes.STRING,
      enum: ['unused', 'used', 'expired'],
      message: 'must be one of: unused, used or expired',
      allowNull: false,
      defaultValue: 'unused',
      _config: {
        schema: {
          readOnly: true,
        }
      }
    },
    availableUsages: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    serial: {
      type: DataTypes.STRING,
      allowNull: false,
      _config: {
        schema: {
          readOnly: true,
        }
      }
    },
    value: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
  }, {
    indexes: [
      {
        fields: ['status'],
        unique: false
      },
      {
        fields: ['serial'],
        unique: false
      },
    ],
    _config: {
      service: {
        auth: {
          'find, get': ['promotions:read', 'promotions:write'],
          'create, patch, remove': ['promotions:write'],
        }
      }
    }
  })
  class PromotionCode extends BaseModel {
    /**
     * Associations
     */
    static associate(models) {
      // assciated promotion
      PromotionCode.belongsTo(models.promotion);
    }
  }

  return PromotionCode;
};
