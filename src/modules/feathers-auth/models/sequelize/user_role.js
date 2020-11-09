'use strict';

const { Model } = reqlib('_/modules/sequelize/decorators');
const BaseModel = reqlib('_/modules/feathers-sequelize/BaseModel');
const cfg = require('../../cfg');

module.exports = function(sequelize, DataTypes) {
  if (!cfg.get('features.rolesAndPermissions.enabled')) {
    return;
  }

  @Model(sequelize, 'user_role', {
    userId: {
      type: DataTypes.INTEGER
    },
    roleId: {
      type: DataTypes.STRING
    }
  }, {
    indexes: [
      {
        fields: ['userId', 'roleId'],
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
  class UserRole extends BaseModel {
    /**
     * Associations
     */
    static associate(models) {
      this.belongsTo(models.user);
      this.belongsTo(models.role);
    }
  }

  return UserRole;
};
