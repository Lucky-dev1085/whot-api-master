'use strict';

const moment = require('moment');
const errors = reqlib('_/modules/feathers/errors');
const { Model } = reqlib('_/modules/sequelize/decorators');
const BaseModel = reqlib('_/modules/feathers-sequelize/BaseModel');
const { enforceUser } = reqlib('_/modules/feathers-auth/utils');
const { requireNotPlaying } = reqlib('_/src/utils/access-control');

module.exports = function(sequelize, DataTypes) {
  @Model(sequelize, 'game_table', {
    tableTitle: {
      type: DataTypes.STRING,
      allowNull: false
    },
    tablePassword: {
      type: DataTypes.STRING,
      allowNull: true,
      _config: {
        writeOnly: true
      }
    },
    logo: {
      type: DataTypes.STRING,
      allowNull: true
    },
    gameStatus: {
      type: DataTypes.STRING,
      enum: ['notStarted', 'live', 'cancelled', 'ended'],
      allowNull: true,
      defaultValue: "notStarted",
      _config: {
        schema: {
          readOnly: true,
        }
      }
    },
    gameType: {
      type: DataTypes.STRING,
      enum: ['PUBLIC', 'TOURNAMENT', 'PRIVATE'],
      allowNull: false,
      defaultValue: 'PUBLIC', // PUBLIC, TOURNAMENT, PRIVATE
    },
    featured: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    maxPlayerCount: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    playerCount: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      _config: {
        schema: {
          readOnly: true,
        }
      }
    },
    minStakeAmount: {
      // prize or total amount staked
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0.0,
      _config: {
        schema: {
          min: 0,
        }
      }
    },
    stakeAmount: {
      // prize or total amount staked
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0.0,
    },
    profitAmount: {
      // prize or total amount staked
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0.0,
      _config: {
        schema: {
          readOnly: true,
        }
      }
    },
    startingAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
  }, {
    indexes: [
      {
        fields: ['tableTitle'],
        unique: false
      },
      {
        fields: ['gameStatus'],
        unique: false
      },
      {
        fields: ['playerCount'],
        unique: false
      },
      {
        fields: ['gameType'],
        unique: false
      },
      {
        fields: ['featured'],
        unique: false
      },
      {
        fields: ['minStakeAmount'],
        unique: false
      },
      {
        fields: ['startDate'],
        unique: false
      },
    ],
    _config: {
      service: {
        auth: {
          'create, update, patch': true,
          'find, get': ['game:read', 'game:write'],
          'remove': ['game:write'],
        },
        paginate: {
          max: 999,
          limit: 999
        },
        hooks: {
          before: {
            "update, patch": [
              async function(context) {
                if (!context.params.user) {
                  throw errors.NotAuthenticated(null, `Must be logged-in to update games`);
                }
                const isAdmin = await context.params.user.hasPermissions(['game:write']);
                if(isAdmin) {
                  return;
                }
                const playerDetail = await sequelize.models.player_detail.findOne({
                  where: {userId: context.params.user.id}
                });
                if (!playerDetail) {
                  throw errors.Forbidden(null, `Only game players can update game tables`);
                }

                const gameTable = await sequelize.models.game_table.findOne({
                  where: {
                    id: context.id,
                  }
                });
                if (!gameTable) {
                  throw errors.NotFound(null, `Game table not found`);
                }
                const playerGameState = await sequelize.models.player_game_state.findOne({
                  where: {
                    playerDetailId: playerDetail.id,
                    gameTableId: gameTable.id,
                  }
                });
                if(!playerGameState || gameTable.playerDetailId != playerDetail.id) {
                  throw errors.Forbidden(null, `Game players can only update game tables they have joined`);
                }
                if (gameTable.playerDetailId != playerDetail.id) {
                  // Non-table owners
                  if (context.data.tablePassword || context.data.tableTitle || context.data.logo) {
                    throw errors.Forbidden(null, `Some game table data can only be updated by the owner`);
                  }
                }
                if (context.data.minStakeAmount || context.data.stakeAmount) {
                  throw errors.BadRequest(null, `Stake amounts can't be updated`);
                }
                if (context.data.startingAt) {
                  throw errors.BadRequest(null, `Start time can't be updated`);
                }
              }
            ],

            "create, update, patch": [
              async function(context) {
                if (context.data.startingAt) {
                  const startingAt = moment(context.data.startingAt);
                  if (startingAt.isBefore()) {
                    throw errors.BadRequest(null, `Start date can't be in the past`);
                  }
                }
                if (context.data.maxPlayerCount <= 1) {
                  throw errors.BadRequest(null, `At least two players are required`);
                }
                if (context.data.maxPlayerCount > 5) {
                  throw errors.BadRequest(null, `A maximum of five players are supported`);
                }
                if (context.data.tableTitle) {
                  const gameTable = await sequelize.models.game_table.findOne({
                    where: {
                      tableTitle: context.data.tableTitle,
                      gameStatus: ['notStarted', 'live'],
                    }
                  });
                  if (gameTable) {
                    throw errors.BadRequest(null, `A game table with that tittle/name already exists`);
                  }
                }

                if (context.data.featured || context.data.gameType === 'TOURNAMENT') {
                  const isAdmin = await context.params.user.hasPermissions(['game:write']);
                  if (!isAdmin) {
                    throw errors.Forbidden(null, `Only admins can feature games`);
                  }
                }
              }
            ],

            create: [
              async function(context) {
                if (!context.params.user) {
                  throw errors.NotAuthenticated(null, `Must be logged-in to start games`);
                }
                
                if (!context.data.playerDetailId) {
                  const playerDetail = await sequelize.models.player_detail.findOne({
                    where: {userId: context.params.user.id}
                  });
                  context.data.playerDetailId = playerDetail && playerDetail.id;
                }
                
                let stakeAmount = context.data.stakeAmount || context.data.minStakeAmount || 0;
                if (stakeAmount < context.data.minStakeAmount) {
                  throw errors.BadRequest(null, `The stake amount should at least match the minimum stake`);
                }

                const isAdmin = await context.params.user.hasPermissions(['game:write']);
                if (context.data.playerDetailId && !isAdmin) {
                  // Must have minStakeAmount in depositBalance
                  const eligibleCount = await sequelize.models.player_detail.count({
                    where: {
                      id: context.data.playerDetailId,
                      depositBalance: { $gte: stakeAmount || 0 }
                    }
                  });
                  if(eligibleCount <= 0) {
                    throw errors.BadRequest(null, `Insufficient funds`);
                  }
                }

                if (!context.data.startingAt) {
                  const countdown = parseInt(config.gameDispatcherCountdown || '20');

                  context.data.startingAt = moment();
                  context.data.startingAt.add(countdown, 'seconds');
                  context.data.startingAt = context.data.startingAt.toISOString();
                }

                let startingAt = moment(context.data.startingAt);
                try {
                  await requireNotPlaying(context.data.playerDetailId, startingAt, sequelize.models);
                } catch(e) {
                  throw errors.BadRequest(null, e.message);
                }

                const chatRoom = await GameTable.createChatRoom(context.data.tableTitle);
                context.data.chatRoomId = chatRoom.id;
              }
            ],
          },
          after: {
            create: [
              async function(context) {
                if (!context.result.playerDetailId) {
                  return;
                }

                const playerDetail = await sequelize.models.player_detail.findOne({
                  where: {id: context.result.playerDetailId}
                });
                if (!playerDetail) {
                  return;
                }
                const stakeAmount = context.result.stakeAmount || context.result.minStakeAmount || 0;

                const isAdmin = await context.params.user.hasPermissions(['game:write']);
                if (!isAdmin) {
                  // Deduct stake amount from player deposit balance
                  await sequelize.models.player_detail.update({
                    depositBalance: playerDetail.depositBalance - stakeAmount,
                  }, { where: {
                    id: playerDetail.id,
                  }});
                }

                const state =  await sequelize.models.player_game_state.create({
                  state: 'JOINED',
                  stakeAmount: stakeAmount,
                  gameTableId: context.result.id,
                  playerDetailId: context.result.playerDetailId,
                });
                await state.joinChatRoom();
              }
            ],
          },
          error: {
            all: [
              async function(context) {
                context.result = {message: `${context.error}`};
                context.statusCode = 400;
              }
            ]
          }
        }
      }
    }
  })
  class GameTable extends BaseModel {
    /**
     * Associations
     */
    static associate(models) {
      // Owner
      GameTable.belongsTo(models.player_detail);

      // Game state for players on this table
      GameTable.hasMany(models.player_game_state);

      // Can be part of a whot tournament
      GameTable.belongsTo(models.tournament);

      // Every game table has an associated chat room
      GameTable.belongsTo(models.chat_room);
    }

    static async createChatRoom(tableTitle) {
      const chatRoomModel = sequelize.models.chat_room;
      return await chatRoomModel.create({
        type: 'private',
        name: tableTitle,
        location: 'game-table',
      });
    }
  }

  return GameTable;
};
