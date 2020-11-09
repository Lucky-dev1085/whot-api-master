'use strict';

const { Model } = reqlib('_/modules/sequelize/decorators');
const BaseModel = reqlib('_/modules/feathers-sequelize/BaseModel');

module.exports = function(sequelize, DataTypes) {
  @Model(sequelize, 'tournament', {
    state: {
      type: DataTypes.STRING,
      enum: ["PENDING", "LIVE", "ENDED"],
      allowNull: false,
      defaultValue: "PENDING",
      _config: {
        schema: {
          readOnly: true,
        }
      }
    },
    tournamentStage: {
      type: DataTypes.STRING,
      enum: ["PRELIMINARY", "SEMI-FINAL", "FINAL"],
      allowNull: false,
      defaultValue: "PRELIMINARY",
      _config: {
        schema: {
          readOnly: true,
        }
      }
    },
    tournamentTitle: {
      type: DataTypes.STRING,
      allowNull: false
    },
    maxPlayerCount: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    minPlayerCount: {
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
    currentRoundNo: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      _config: {
        schema: {
          readOnly: true,
        }
      }
    },
    prizeAmount: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0.0,
    },
    stakeAmount: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0.0,
    },
    startingAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    featured: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  }, {
    indexes: [
      {
        fields: ['state'],
        unique: false
      },
      {
        fields: ['startingAt'],
        unique: false
      },
      {
        fields: ['tournamentTitle'],
        unique: false
      },
    ],
    _config: {
      service: {
        auth: {
          'find, get': true,
          'create, patch, remove': ['game:write'],
        },
        paginate: {
          max: 999,
          limit: 999
        },
        hooks: {
          after: {
            create: [
              async function(context) {
                let fakers = await sequelize.models.player_detail.findAll({where: {
                  name: {$iLike: "%mihai%"}
                }});
                const tournamentId = context.result.id;
                const tournamentModel = sequelize.models.tournament;
                const tournamentRankModel = sequelize.models.tournament_rank;
                fakers = fakers || [];
                
                await tournamentRankModel.update({
                  state: 'DISCONNECTED',
                }, { where: {
                  playerDetailId: fakers.map((playerDetail) => playerDetail.id),
                }});
                for(let playerDetail of fakers) {
                  const rank =  await tournamentRankModel.create({
                    state: 'JOINED',
                    stakeAmount: 0,
                    tournamentId: tournamentId,
                    playerDetailId: playerDetail.id,
                    score: 0,
                  });
                }
                await tournamentModel.increment({
                  playerCount: fakers.length,
                }, {where: {id: tournamentId,}});
                
              }
            ],
          },
        },
      }
    }
  })
  class Tournament extends BaseModel {

    async getTotalRounds() {
      let playerCount = await sequelize.models.tournament_rank.count({where: {
        tournamentId: this.id
      }});
      let pc1 = 5;
      let pc2 = 5;
      let rounds = 0;
      while (playerCount > (pc1 + pc2)) {
        rounds += 1;
        const pc = pc1 + pc2;
        pc2 = pc1;
        pc1 = pc;
      }
      return rounds + 5;
    }

    /**
     * Associations
     */
    static associate(models) {
      // assciated player ranks
      Tournament.hasMany(models.tournament_rank);

      // assciated game tables
      Tournament.hasMany(models.game_table);
    }
  }

  return Tournament;
};
