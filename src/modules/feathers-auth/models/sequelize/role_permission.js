'use strict';

const { Model } = reqlib('_/modules/sequelize/decorators');
const BaseModel = reqlib('_/modules/feathers-sequelize/BaseModel');
const cfg = require('../../cfg');

module.exports = function(sequelize, DataTypes) {
  if (!cfg.get('features.rolesAndPermissions.enabled')) {
    return;
  }

  @Model(sequelize, 'role_permission', {
    roleId: {
      type: DataTypes.STRING
    },
    permissionId: {
      type: DataTypes.STRING
    }
  }, {
    indexes: [
      {
        fields: ['roleId', 'permissionId'],
        unique: true
      }
    ],
    _config: {
      service: {
        auth: {
          all: false
        },
        apidocs: {
          operations: ''
        }
      }
    }
  })
  class RolePermission extends BaseModel {
    /**
     * Associations
     */
    static associate(models) {
      this.belongsTo(models.role);
      this.belongsTo(models.permission);
    }
  }

  return RolePermission;
};
