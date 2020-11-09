'use strict';

const moment = require('moment');
const { Model } = reqlib('_/modules/sequelize/decorators');
const errors = reqlib('_/modules/feathers/errors');
const BaseModel = reqlib('_/modules/feathers-sequelize/BaseModel');
const { enforceUser } = reqlib('_/modules/feathers-auth/utils');
const { sendSMS } = reqlib('_/modules/bulksmsnigeria');
const { generateCode } = reqlib('_/src/utils/coding');
const { consumePromoCode } = reqlib('_/src/utils/promotions');

module.exports = function(sequelize, DataTypes) {
  @Model(sequelize, 'player_detail', {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    mobile: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false
    },
    mobileVerificationTimestamp: {
      type: DataTypes.DATE,
      allowNull: true,
      _config: {
        readOnly: true
      }
    },
    avatarImage: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    depositBalance: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0.0,
    },
    withdrawalBalance: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0.0,
    },
    playerStatus: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "OFFLINE",
    },
    termsAgreed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    termsAgreedTimestamp: {
      type: DataTypes.DATE,
      allowNull: false,
    },    
  }, {
    indexes: [
      {
        fields: ['name'],
        unique: false
      },
      {
        fields: ['playerStatus'],
        unique: false
      },
    ],
    _config: {
      service: {
        auth: {
          'create': true,
          'find, get': [enforceUser(), 'players:read', 'players:write'],
          'patch, remove, update': [enforceUser(), 'players:write'],
        },
        hooks: {
          before: {
            "patch, update": async function patch(context) {
              const playerDetails = context.service.model;
              const detail = await playerDetails.findByPk(context.id);

              if (context.data.name) {
                const nameCount = await playerDetails.count({
                  where: { name: { $iLike: context.data.name }, id: {$ne: context.id} }
                });
                if (nameCount > 0) {
                  throw errors.BadRequest(null, 'Username already exists');
                }

                await sequelize.models.user.update({
                  firstName: context.data.name
                }, { where: { id: detail.userId } });
              }

              if(context.data.mobile) {
                const user = context.params.user;
                const isAdmin = await user.hasPermissions(['players:write']);
                if (isAdmin) {
                  context.data.mobileVerificationTimestamp = moment();
                }
                else if (detail.mobile && detail.mobileVerificationTimestamp) {
                  throw errors.BadRequest(null, 'Mobile phone number cannot be updated, please contact support');
                }
              }
            },
          },
          after: {
            "patch, update": async function patch(context) {
              const playerDetails = context.service.model;
              const detail = await playerDetails.findByPk(context.id);

              const isAdmin = await context.params.user.hasPermissions(['players:write']);
              if(!context.data.mobile || (detail.mobile && detail.mobileVerificationTimestamp) || isAdmin) {
                return;
              }
              const code = generateCode();

              // send mobile phone verification
              const user = await detail.getUser();
              const token = await user.createToken({
                scope: 'mobileVerification',
                data: {
                  code: code,
                  mobile: context.data.mobile,
                }
              });
              context.result = context.result.toJSON();
              context.result.token = token.id;
              await sendSMS(context.data.mobile, `WHOT.ng - ${code} is your verification code.`);
            }
          }
        },
      }
    }
  })
  class PlayerDetail extends BaseModel {
    /**
     * Associations
     */
    static associate(models) {
      // assciated user
      PlayerDetail.belongsTo(models.user);

      // Deposits
      PlayerDetail.hasMany(models.player_deposit);

      // Games tables played by this player
      PlayerDetail.hasMany(models.game_table);

      // Game states
      PlayerDetail.hasMany(models.player_game_state);

      // Bank accounts
      PlayerDetail.hasMany(models.player_bank_account);
    }

    static middleware(app) {
      addPlayerCreationHooks(app, sequelize);
    }
  }

  return PlayerDetail;
};

function addPlayerCreationHooks(app, sequelize) {
  const usersService = app.service('users');

  usersService.hooks({
    before: {
      async create(context) {
        const players = app.service('player-details').model;
        const nameCount = await players.count({
          include: ['user'],
          where: {
            name: { $iLike: context.data.name },
            '$user.status$': { $ne: 'disabled' }
          }
        });
        if (nameCount > 0) {
          throw errors.BadRequest(null, 'Username already exists');
        }

        context.data.promoValue = 0;
        if (context.data.promoCode) {
          const code = await sequelize.models.promotion_code.findOne({
            where: {
              serial: context.data.promoCode,
            }
          });
          if (!code) {
            throw errors.BadRequest(null, 'Incorrect promotion code serial number');
          }
          if (code.status != 'unused' || code.availableUsages <= 0) {
            throw errors.BadRequest(null, 'Promotion code has expired');
          }

          const promotion = await code.getPromotion();
          if (promotion && moment(promotion.expiresAt).isBefore()) {
            throw errors.BadRequest(null, 'Promotion has expired');
          }
          context.data.promoValue = code.value;
        }
      },
    },
    after: {
      async create(context) {
        const userId = context.result.id;
        const user = await usersService.model.findByPk(userId);

        const isAdmin = await user.hasAdminAppPermissions();
        if (isAdmin) {
          return;
        }
        let playerDetail = {
          userId: context.result.id,
          name: context.data.name,
          termsAgreed: true,
          termsAgreedTimestamp: moment().toISOString(),
        };
        const players = app.service('player-details');
        playerDetail = await players.create(playerDetail);

        if (context.data.promoCode) {
          const deposit = await consumePromoCode(
            context.data.promoCode, playerDetail, sequelize.models, true);
          if (deposit) {
            await sequelize.models.player_detail.update({
              depositBalance: deposit.amount,
            }, { where: { id: deposit.playerDetailId } });
          }
        }

        if (!context.data.roles) {
          const userRoles = await app.service('user-roles');
          await userRoles.create({
            userId: context.result.id,
            roleId: 'user'
          });
        }
      }
    }
  });
}
