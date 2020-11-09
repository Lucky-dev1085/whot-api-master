'use strict';

const { Model } = reqlib('_/modules/sequelize/decorators');
const BaseModel = reqlib('_/modules/feathers-sequelize/BaseModel');
const cfg = require('../../cfg');

module.exports = function(sequelize, DataTypes) {
  if (!cfg.get('features.passport.enabled')) {
    return;
  }

  @Model(sequelize, 'passport', {
    userId: {
      type: DataTypes.INTEGER,
      onDelete: 'CASCADE'
    },
    provider: {
      type: DataTypes.STRING,
      allowNull: false
    },
    identifier: {
      type: DataTypes.STRING,
      allowNull: false
    },
    token: {
      type: DataTypes.TEXT,
      allowNull: false
    }
  }, {
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
  class Passport extends BaseModel {
    /**
     * Associations
     */
    static associate(models) {
      this.belongsTo(models.user);
    }
  }

  return Passport;
};
