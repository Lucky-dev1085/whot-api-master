'use strict';

const { Model } = reqlib('_/modules/sequelize/decorators');
const BaseModel = reqlib('_/modules/feathers-sequelize/BaseModel');
const { extractAssociationIds, getCaseInsensitiveEqualsOp } = reqlib('_/modules/feathers-sequelize/utils');
const bcrypt = require('bcrypt');
const { enforceAccount, enforceUser, preventSelfRemove } = require('../../utils');
const emailModule = reqlib('_/modules/email', true);
const errors = reqlib('_/modules/feathers/errors');
const _ = require('lodash');
const cfg = require('../../cfg');

const accountsEnabled = cfg.get('features.accounts.enabled');
const passportEnabled = cfg.get('features.passport.enabled');
const rolesAndPermissionsEnabled = cfg.get('features.rolesAndPermissions.enabled');
const welcomeEmailEnabled = cfg.get('features.welcomeEmail.enabled');

module.exports = function(sequelize, DataTypes) {
  @Model(sequelize, 'user', {
    ...accountsEnabled && {
      accountId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        onDelete: 'CASCADE',
        editIff: [
          'realm:account'
        ]
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: true,
      set: function(value) {
        if (value) {
          this.setDataValue('password', bcrypt.hashSync(value, 1));
        }
      },
      _config: {
        writeOnly: true
      }
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      _config: {
        schema: {
          format: 'email'
        }
      }
    },
    emailVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      _config: {
        editIff: [
          'users:write'
        ]
      }
    },
    name: {
      type: DataTypes.VIRTUAL(DataTypes.STRING, ['firstName', 'lastName']),
      get: function() {
        return _.trim(`${this.firstName} ${this.lastName}`);
      },
      set: function(value) {
        const words = (value || '').split(/\s+/);
        this.setDataValue('firstName', words[0] || '');
        this.setDataValue('lastName', words.slice(1).join(' ') || '');
      }
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: ''
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: ''
    },
    status: {
      type: DataTypes.ENUM('active', 'disabled'),
      allowNull: false,
      defaultValue: 'active',
      _config: {
        editIff: [
          'users:write'
        ]
      }
    }
  }, {
    _config: {
      service: {
        schema: {
          additionalProperties: true,
        },
        auth: {
          create: true,
          'find, get': [
            enforceAccount(),
            'users:write',
            'users:read',
            enforceUser({field: 'id'})
          ],
          'patch, remove': [
            enforceAccount(),
            'users:write',
            enforceUser({field: 'id'})
          ]
        },
        hooks: {
          before: {
            'get, patch, remove': [
              function(context) {
                // ID 0 means 'current user':
                if (context.id === '0') {
                  context.id = context.params.user.id;
                  context.params.requestForCurrentUser = true;
                }
              }
            ],
            'create, update, patch': [
              function (context) {
                if (context.data.email) {
                  context.data.email = context.data.email.toLowerCase();
                }
              }
            ],
            remove: [
              preventSelfRemove({
                userField: 'id',
                errorMessage: 'Unable to delete own user'
              })
            ]
          },
          after: {
            'get, patch, remove': [
              async function(context) {
                // send permissions when 'current user' is requested:
                if (context.params.requestForCurrentUser) {
                  const user = context.params.user;
                  context.result = context.result.toJSON();
                  context.result.permissions = Object.keys(await user.getPermissions());
                }
              }
            ],
            create: [
              async function sendWelcomeEmail(context) {
                if (!welcomeEmailEnabled || !emailModule) {
                  return;
                }

                const user = context.result;
                const isAdmin = await user.hasAdminAppPermissions();
                const cfgs = cfg.get(isAdmin ? 'features.welcomeEmailAdmin' : 'features.welcomeEmail');

                // create a token, if needed:
                let token = {id: ''};
                if (cfgs.token) {
                  token = await user.createToken({
                    scope: cfgs.token
                  });
                }

                await emailModule.sendEmail({
                  to: user.email,
                  subject: cfgs.subject,
                  html: {
                    name: cfgs.htmlTemplate,
                    data: _.merge({}, cfgs, {
                      firstName: user.firstName,
                      depositAmount: context.data.promoValue || 0,
                      withdrawalAmount: 0,
                      link: cfgs.link.replace('$token', token.id)
                    })
                  }
                });
              }
            ]
          }
        }
      }
    }
  })
  class User extends BaseModel {
    /**
     * Associations
     */
    static associate(models) {
      this.hasMany(models.token);

      if (accountsEnabled) {
        this.belongsTo(models.account, {
          editIff: [
            'realm:account'
          ]
        });
      }

      if (passportEnabled) {
        this.hasMany(models.passport, {
          readOnly: true
        });
      }

      if (rolesAndPermissionsEnabled) {
        this.belongsToMany(models.role, {
          through: models.user_role,
          editIff: [
            [
              'roles:grant',
              async function(context) {
                const user = context.params.user;
                const currentRoleIds = _.map(await user.getRoles(), 'id');

                const ids = context.data.roles
                          ? extractAssociationIds(context.data.roles)
                          : { add: [], remove: [], set: [] };

                const affectedRoleIds = [
                  ...ids.add,
                  ...ids.remove,
                  ...ids.set,
                  ..._.difference(currentRoleIds, ids.set)
                ];

                const permissionIds = _.map(
                  await sequelize.models.role_permission.findAll({
                    where: {
                      roleId: affectedRoleIds
                    }
                  }),
                  'permissionId'
                );

                return context.params.user.hasPermissions(permissionIds, true);
              }
            ]
          ]
        });
      }
    }

    /**
     * Login a user.
     */
    static async login(email, password) {
      const op = getCaseInsensitiveEqualsOp(sequelize);

      const user = await User.findOne({
        where: {
          status: {$notIn: ['disabled']},
          password: {$ne: null},
          email: {[op]: email}
        }
      });

      if (!user) {
        throw errors.Forbidden('AUTH01', 'User not found');
      }

      if (!user.verifyPassword(password)) {
        throw errors.Forbidden('AUTH02', 'Wrong password');
      }

      return user;
    }

    /**
     * Create the auth payload for this user.
     */
    async authPayload() {
      const permissions = await this.getPermissions();
      await this.compileAttrBlacklist(permissions);

      const payload = this.toJSON();
      payload.permissions = Object.keys(permissions);

      if (sequelize.models.player_detail) {
        const detail = await sequelize.models.player_detail.findOne({ where: { userId: this.id }});
        if (detail) {
          payload.playerDetail = detail.toJSON();
        }
      }

      return payload;
    }

    /**
     * Verify a user's password.
     */
    verifyPassword(password) {
      return this.password && bcrypt.compareSync(password, this.password);
    }

    async hasAdminAppPermissions() {
      return this.hasPermissions(["admin-app:read", "admin-app:write"], false);
    }

    async getPasswordResetLink(token) {
      const isAdmin = await this.hasAdminAppPermissions();

      const resetUrl = isAdmin ? cfg.passwordResetUrlAdmin : cfg.passwordResetUrl;
      return resetUrl.replace('$token', token.id).replace('$firstName', this.firstName);
    }

    /**
     * Get this user's permissions.
     */
    async getPermissions(refresh) {
      if (!this._perms || refresh) {
        this._perms = {};

        if (rolesAndPermissionsEnabled) {
          const roles = await this.getRoles({
            include: [
              'permissions'
            ]
          });

          for (let i = 0; i < roles.length; i++) {
            for (let j = 0; j < roles[i].permissions.length; j++) {
              this._perms[roles[i].permissions[j].id] = true;
            }
          }
        }
      }
      
      return this._perms;
    }

    /**
     * Check if this user has some (or all) of the given set of permissions.
     */
    async hasPermissions(perms = [], all = false) {
      await this.getPermissions();

      if (this._perms['*']) {
        return true;
      }

      return perms[all ? 'every' : 'some'](p => !!this._perms[p]);
    }
  }

  return User;
};
