'use strict';

const errors = reqlib('_/modules/feathers/errors');
const { Model } = reqlib('_/modules/sequelize/decorators');
const BaseModel = reqlib('_/modules/feathers-sequelize/BaseModel');
const { sendSMS } = reqlib('_/modules/bulksmsnigeria');
const { enforcePlayer } = reqlib('_/src/utils/access-control');
const { generateCode } = reqlib('_/src/utils/coding');

module.exports = function(sequelize, DataTypes) {
  @Model(sequelize, 'player_bank_account', {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    accountNumber: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    accountBvn: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    verifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      _config: {
        schema: {
          readOnly: true,
        }
      }
    },
  }, {
    indexes: [
      {
        fields: ['verifiedAt'],
        unique: false
      },
    ],
    _config: {
      service: {
        auth: {
          'create': true,
          'find, get': [
            enforcePlayer({playerField: 'id', field: 'playerDetailId'}),
            'players:read', 'players:write'
          ],
          'patch, remove, update': [
            enforcePlayer({playerField: 'id', field: 'playerDetailId'}),
            'players:write'],
        },
        paginate: {
          max: 999,
          limit: 999
        },
        hooks: {
          before: {
            'create': [
              async function(context) {
                if (!context.params.user) {
                  throw errors.BadRequest(null, `Must be logged-in to update bank accounts`);
                }
                const playerDetail = await sequelize.models.player_detail.findOne({
                  where: {userId: context.params.user.id}
                });
                if (!playerDetail) {
                  throw errors.BadRequest(null, `Only game players can update bank accounts`);
                }
                if (!playerDetail.mobile || !playerDetail.mobileVerificationTimestamp) {
                  throw errors.BadRequest(
                    null, `Bank accounts can only be associated to accounts with verified phone numbers`);
                }
                const playerBankAccountCount = await sequelize.models.player_bank_account.count({
                  where: {
                    name: context.data.name,
                    accountNumber: context.data.accountNumber,
                    playerDetailId: playerDetail.id,
                  }
                });
                if (playerBankAccountCount > 0) {
                  throw errors.BadRequest(null, `This bank account is already associated with the user`);
                }
                context.data.verifiedAt = null;
                context.data.playerDetailId = playerDetail.id;
              }
            ],
            'patch, update': [
              async function(context) {
                const isAdmin = await user.hasPermissions(['players:write']);
                if (isAdmin) {
                  return;
                }

                const playerDetail = await sequelize.models.player_detail.findOne({
                  where: {userId: context.params.user.id}
                });
                context.data.verifiedAt = null;
              }
            ]
          },
          after: {
            'create, patch, update': [
              async function(context) {
                const isAdmin = await context.params.user.hasPermissions(['players:write']);
                if (isAdmin) {
                  return;
                }

                const playerDetail = await sequelize.models.player_detail.findByPk(
                  context.result.playerDetailId);

                const code = generateCode()
                const user = await playerDetail.getUser();
                const token = await user.createToken({
                  scope: 'bankAccountVerification',
                  data: {
                    code: code,
                    playerBankAccountId: context.result.id || context.id || 0,
                  }
                });
                context.result = context.result.toJSON();
                context.result.token = token.id;
                await sendSMS(playerDetail.mobile, `WHOT.ng - ${code} is your verification code.`);
              }
            ]
          },
        },
      }
    }
  })
  class PlayerBankAccount extends BaseModel {
    /**
     * Associations
     */
    static associate(models) {
      // assciated player detail
      PlayerBankAccount.belongsTo(models.player_detail);

      // assciated bank record
      PlayerBankAccount.belongsTo(models.bank);
    }
  }

  return PlayerBankAccount;
};
