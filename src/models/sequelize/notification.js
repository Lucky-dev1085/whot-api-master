'use strict';

const { Model } = reqlib('_/modules/sequelize/decorators');
const BaseModel = reqlib('_/modules/feathers-sequelize/BaseModel');
const { enforcePlayer } = reqlib('_/src/utils/access-control');

module.exports = function(sequelize, DataTypes) {
  @Model(sequelize, 'notification', {
    status: {
      type: DataTypes.STRING,
      enum: ['unread', 'opened', 'deleted'],
      message: 'must be one of: unread, opened or deleted',
      allowNull: true,
      defaultValue: 'unread'
    },
    type: {
      type: DataTypes.STRING,
      enum: ['invitation', 'declined-invitation'],
    },
    from: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    reference: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    message: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  }, {
    indexes: [
      {
        fields: ['status'],
        unique: false
      },
      {
        fields: ['type'],
        unique: false
      },
    ],
    _config: {
      service: {
        auth: {
          'find, get': [
            enforcePlayer({playerField: 'id', field: 'playerDetailId'}),
            'game:read', 'game:write'
          ],
          'create, patch, remove': [
            enforcePlayer({playerField: 'id', field: 'playerDetailId'}),
            'game:write'
          ],
        }
      }
    }
  })
  class Notification extends BaseModel {
    /**
     * Associations
     */
    static associate(models) {
      // assciated player detail
      Notification.belongsTo(models.player_detail);
    }
  }

  return Notification;
};
