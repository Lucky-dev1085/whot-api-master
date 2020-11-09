'use strict';

const { Model } = reqlib('_/modules/sequelize/decorators');
const BaseModel = reqlib('_/modules/feathers-sequelize/BaseModel');
const { enforceAccount, preventSelfRemove } = require('../../utils');
const cfg = require('../../cfg');

module.exports = function(sequelize, DataTypes) {
  if (!cfg.get('features.accounts.enabled')) {
    return;
  }

  @Model(sequelize, 'account', {
    name: {
      type: DataTypes.STRING,
      allowNull: false
    }
  }, {
    _config: {
      service: {
        auth: {
          create: true,
          'find, get': [
            enforceAccount({field: 'id'}),
            'accounts:write',
            'accounts:read'
          ],
          'patch, remove': [
            enforceAccount({field: 'id'}),
            'accounts:write'
          ]
        },
        hooks: {
          before: {
            remove: [
              preventSelfRemove({
                userField: 'accountId',
                errorMessage: 'Unable to delete own account'
              })
            ]
          }
        }
      }
    }
  })
  class Account extends BaseModel {
    /**
     * Associations
     */
    static associate(models) {
      this.hasMany(models.user, {
        editIff: [
          'users:write'
        ]
      });
    }
  }

  return Account;
};
