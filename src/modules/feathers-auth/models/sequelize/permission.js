'use strict';

const { Model } = reqlib('_/modules/sequelize/decorators');
const BaseModel = reqlib('_/modules/feathers-sequelize/BaseModel');
const cfg = require('../../cfg');

module.exports = function(sequelize, DataTypes) {
  if (!cfg.get('features.rolesAndPermissions.enabled')) {
    return;
  }

  @Model(sequelize, 'permission', {
    id: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
      get: function() {
        return this.dataValues.name || this.dataValues.id;
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    _config: {
      service: {
        auth: {
          all: false,
          'find, get': null
        },
        apidocs: {
          operations: 'fr'
        }
      }
    }
  })
  class Permission extends BaseModel {
    /**
     * Associations
     */
    static associate(models) {
      this.belongsToMany(models.role, {through: models.role_permission});
    }
  }

  return Permission;
};
