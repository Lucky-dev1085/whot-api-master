'use strict';

const { Model } = reqlib('_/modules/sequelize/decorators');
const BaseModel = reqlib('_/modules/feathers-sequelize/BaseModel');
const { extractAssociationIds } = reqlib('_/modules/feathers-sequelize/utils');
const { enforceAccount } = require('../../utils');
const { randomstring } = reqlib('_/modules/utils');
const errors = reqlib('_/modules/feathers/errors');
const cfg = require('../../cfg');
const _ = require('lodash');

const accountsEnabled = cfg.get('features.accounts.enabled');

module.exports = function(sequelize, DataTypes) {
  if (!cfg.get('features.rolesAndPermissions.enabled')) {
    return;
  }

  @Model(sequelize, 'role', {
    id: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true,
      defaultValue: function() {
        return randomstring.generate(8);
      },
      _config: {
        readOnly: true
      }
    },
    ...accountsEnabled && {
      accountId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        onDelete: 'CASCADE',
        _config: {
          editIff: [
            [
              'realm:account',
              isEditable()
            ]
          ]
        }
      }
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
      get: function() {
        return this.dataValues.name || this.dataValues.id;
      },
      _config: {
        editIff: [
          isEditable()
        ]
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      _config: {
        editIff: [
          isEditable()
        ]
      }
    },
    editable: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      _config: {
        readOnly: true
      }
    }
  }, {
    indexes: [
      {
        fields: accountsEnabled ? ['accountId', 'name'] : ['name'],
        unique: true
      }
    ],
    _config: {
      service: {
        auth: {
          'find, get': [
            enforceAccount(),
            'roles:write',
            'roles:read'
          ],
          'create, patch, remove': [
            enforceAccount(),
            'roles:write'
          ]
        },
        hooks: {
          before: {
            remove: [
              async function preventNonEditableRemove(context) {
                if (context.id) {
                  const role = await sequelize.models.role.findByPk(context.id);
                  if (!role.editable) {
                    throw errors.BadRequest(null, 'Unable to delete non-editable role');
                  }
                }
              }
            ]
          }
        }
      }
    }
  })
  class Role extends BaseModel {
    /**
     * Associations
     */
    static associate(models) {
      this.belongsToMany(models.permission, {
        through: models.role_permission,
        editIff: [
          userAlreadyHasPermissions()
        ]
      });
      this.belongsToMany(models.user, {
        through: models.user_role,
        editIff: [
          [
            'roles:grant',
            userAlreadyHasPermissions()
          ]
        ]
      });

      if (accountsEnabled) {
        this.belongsTo(models.account, {
          editIff: [
            'realm:account'
          ]
        });
      }
    }
  }

  return Role;
};

/**
 * Make sure users can only edit/grant roles composed entirely of permissions
 * that they themselves have.
 */
function userAlreadyHasPermissions() {
  return async function(context) {
    let permissionIds;

    if (this) {
      permissionIds = _.map(await this.getPermissions(), 'id');
    }
    else if (context.data && context.data.permissions) {
      const ids = extractAssociationIds(context.data.permissions);
      permissionIds = [...ids.remove, ...ids.set, ...ids.add];
    }

    return context.params.user.hasPermissions(permissionIds, true);
  };
}

/**
 * Check if role is editable.
 */
function isEditable() {
  return function(context) {
    return !!(this && this.editable);
  };
}
