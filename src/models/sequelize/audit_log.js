'use strict';

const { Model } = reqlib('_/modules/sequelize/decorators');
const BaseModel = reqlib('_/modules/feathers-sequelize/BaseModel');

module.exports = function(sequelize, DataTypes) {
  @Model(sequelize, 'audit_log', {
    entityTable: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    entityId: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    action: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    changes: {
      type: DataTypes.JSON,
      allowNull: true
    },
    changeReason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    changeTimestamp: {
      type: DataTypes.DATE,
      allowNull: true
    },
    userSignature: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    searchKeywords: {
      type: DataTypes.TEXT,
      allowNull: true
    },    
  }, {
    indexes: [
      {
        fields: ['entityTable'],
        unique: false
      },
      {
        fields: ['changeTimestamp'],
        unique: false
      },
      {
        fields: ['userSignature'],
        unique: false
      },
      {
        fields: ['searchKeywords'],
        unique: false
      },
    ],
    _config: {
      service: {
        auth: {
          'find, get': ['audit:read', 'audit:write'],
          'create, patch, remove': ['audit:read'],
        }
      }
    }
  })
  class AuditLog extends BaseModel {
    /**
     * Associations
     */
    static associate(models) {
      // assciated user
      AuditLog.belongsTo(models.user);
    }
  }

  return AuditLog;
};
