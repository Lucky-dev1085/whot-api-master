'use strict';

const { Model } = reqlib('_/modules/sequelize/decorators');
const errors = reqlib('_/modules/feathers/errors');
const BaseModel = reqlib('_/modules/feathers-sequelize/BaseModel');
const { enforcePlayer } = reqlib('_/src/utils/access-control');

module.exports = function(sequelize, DataTypes) {
  @Model(sequelize, 'player_withdrawal', {
    amount: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0.0,
    },
    status: {
      type: DataTypes.STRING,
      enum: ['PENDING', 'PROCESSING', 'SUCCESS', 'FAILED'],
      allowNull: true,
      defaultValue: "PENDING",
      _config: { schema: { readOnly: true, } },
    },
    statusMessage: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "Transfer pending",
      _config: { schema: { readOnly: true, } },
    },
    backendDetail: {
      type: DataTypes.JSON,
      allowNull: true,
      _config: { schema: { readOnly: true, } },
    },
    // Recipient: name, metadata, account_number, bank_code, currency, description
    // -> recipient_code, active, id
    recepientName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    accountNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      _config: { schema: { readOnly: true, } },
    },
    bankCode: {
      type: DataTypes.STRING,
      allowNull: true,
      _config: { schema: { readOnly: true, } },
    },
    recepientCode: {
      type: DataTypes.STRING,
      allowNull: true,
      _config: { schema: { readOnly: true, } },
    },
    // Transfer: source='balance', amount, currency='NGN', reason, recipient, reference
    // -> transfer_code, id, integration, 
    reference: {
      // the transfer_code
      type: DataTypes.STRING,
      allowNull: true,
      _config: { schema: { readOnly: true, } },
    },
    amountValue: {
      // Amount in NGN x 100
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    reason: {
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
        fields: ['reference'],
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
          'patch, remove': [
            'players:write'
          ],
        },
        hooks: {
          before: {
            'create': [
              async function(context) {
                if (!context.params.user) {
                  throw errors.BadRequest(null, `Must be logged-in to withdraw funds`);
                }
                const playerDetail = await sequelize.models.player_detail.findOne({
                  where: {userId: context.params.user.id}
                });
                if (!playerDetail) {
                  throw errors.BadRequest(null, `Only game players can withdraw funds`);
                }
                if (playerDetail.withdrawalBalance < context.data.amount) {
                  throw errors.BadRequest(null, `Insufficient funds`);
                }
                const playerBankAccount = await sequelize.models.player_bank_account.findOne({
                  where: {
                    id: context.data.playerBankAccountId,
                    playerDetailId: playerDetail.id,
                  }
                });
                context.data.playerDetailId = playerDetail.id;
                context.data.recepientName = context.data.recepientName || playerDetail.name;
                context.data.accountNumber = playerBankAccount.accountNumber;
                context.data.bankCode = playerBankAccount.name; // TODO: map to bank code
                context.data.recepientCode = null;

                context.data.amountValue = parseInt(context.data.amount * 100);
                context.data.reference = null;
                context.data.reason = 'Funds withdrawal request';
              }
            ]
          },
          after: {
            'create': [
              async function(context) {
                await sequelize.models.player_detail.increment(
                  { withdrawalBalance: 0 - context.result.amount },
                  { where: {
                    userId: context.params.user.id,
                  }}
                );
              }
            ],
          }
        },
      }
    }
  })
  class PlayerWithdrawal extends BaseModel {
    /**
     * Associations
     */
    static associate(models) {
      // assciated player detail
      PlayerWithdrawal.belongsTo(models.player_detail);

      // assciated player bank account
      PlayerWithdrawal.belongsTo(models.player_bank_account);
    }
  }

  return PlayerWithdrawal;
};
