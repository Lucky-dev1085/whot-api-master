'use strict';

const moment = require('moment');
const errors = reqlib('_/modules/feathers/errors');
const { Model } = reqlib('_/modules/sequelize/decorators');
const BaseModel = reqlib('_/modules/feathers-sequelize/BaseModel');

module.exports = function(sequelize, DataTypes) {
  const codeGen = new CodeGenerator();

  @Model(sequelize, 'promotion', {
    batchName: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    createdBy: {
      type: DataTypes.STRING,
      allowNull: false,
      _config: {
        schema: {
          readOnly: true,
        }
      }
    },
    denomination: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 100,
      minimum: 0,
      exclusiveMinimum: 0,
    },
    numberOfCodes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      minimum: 1,
    },
    usageCountPerCode: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      minimum: 1,
    },
    status: {
      type: DataTypes.STRING,
      enum: ['pending', 'created', 'downloaded', 'in-use', 'exhaused', 'expired'],
      message: 'must be one of: pending, created, downloaded, in-use, exhaused or expired',
      allowNull: true,
      defaultValue: 'pending',
      _config: {
        schema: {
          readOnly: true,
        }
      }
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
  }, {
    indexes: [
      {
        fields: ['status'],
        unique: false
      },
      {
        fields: ['batchName'],
        unique: true
      },
      {
        fields: ['denomination'],
        unique: false
      },
      {
        fields: ['createdBy'],
        unique: false
      },
    ],
    _config: {
      service: {
        auth: {
          'create': true,
          'find, get': ['promotions:read', 'promotions:write'],
          'patch, remove': ['promotions:write'],
        },
        hooks: {
          before: {
            create: [
              async function(context) {
                if (!context.params.user) {
                  throw errors.NotAuthenticated(null, `Must be logged-in to create promotions`);
                }
                context.data.userId = context.params.user.id;
                context.data.createdBy = context.params.user.name;
                if (!context.data.numberOfCodes) {
                  context.data.numberOfCodes = 1;
                }
                if (!context.data.usageCountPerCode) {
                  context.data.usageCountPerCode = 1;
                }
                if (!context.data.expiresAt) {
                  const expiresAt = moment();
                  expiresAt.add(6, 'months');
                  context.data.expiresAt = expiresAt;
                }
                if (context.data.denomination <= 0) {
                  throw errors.BadRequest(null, `Promotion denomination must be positive`);
                }
                if (context.data.batchName && context.data.batchName !== null) {
                  const batchNameCount = await sequelize.models.promotion.count({
                    where: {
                      batchName: context.data.batchName,
                    }
                  });
                  if (batchNameCount > 0) {
                    throw errors.BadRequest(null, `Promotion batch name must be unique`);
                  }
                }
                if (moment(context.data.expiresAt).isBefore()) {
                  throw errors.BadRequest(null, `Promotion expiration must not be in the past`);
                }

                const isAdmin = await context.params.user.hasPermissions(['promotions:write']);
                if(isAdmin) {
                  return;
                }

                const playerDetail = await sequelize.models.player_detail.findOne({
                  where: { userId: context.params.user.id }
                });
                if (!playerDetail) {
                  throw errors.Forbidden(null, `Only game players can create promotions`);
                }
                context.data.createdBy = playerDetail.name;
                context.data.playerDetailId = playerDetail.id;

                const promotionFunds = context.data.denomination * context.data.numberOfCodes * context.data.usageCountPerCode;
                const [upCount, upRows] = await sequelize.models.player_detail.update({
                  depositBalance: playerDetail.depositBalance - promotionFunds,
                }, { where: {
                  id: playerDetail.id,
                  depositBalance: { $gte: promotionFunds || 0.0 }
                }});

                if(!upCount) {
                  throw errors.BadRequest(null, `Insufficient funds`);
                }
              }
            ],
          },
          after: {
            create: [
              async function(context) {
                const promotion = context.result;
                const codeTemplate = {
                  status: 'unused',
                  promotionId: promotion.id,
                  value: promotion.denomination,
                  availableUsages: promotion.usageCountPerCode,
                };
                let totalCodes = await sequelize.models.promotion_code.count();

                let codes = [];
                for (let i=0; i<promotion.numberOfCodes; i++) {
                  const code = Object.assign({}, codeTemplate, {
                    serial: codeGen.getNextSerial(totalCodes + i),
                  });
                  codes.push(code);
                }
                await sequelize.models.promotion_code.bulkCreate(codes);

                const resultValues = context.result.toJSON();
                resultValues.serials = codes.map((c) => c.serial);
                context.result = resultValues;
              }
            ],
            find: [
              async function(context) {
                for(let promotion of context.result.data) {
                  promotion.totalValue = promotion.denomination * promotion.numberOfCodes;
                  promotion.usedValue = 0; // TODO
                  promotion.usedCountNewPlayers = 0; // TODO
                  promotion.usedCountExistingPlayers = 0; // TODO
                }
              }
            ],
          },
        }
      }
    }
  })
  class Promotion extends BaseModel {
    /**
     * Associations
     */
    static associate(models) {
      Promotion.hasMany(models.promotion_code);

      // Promotion creator (if player)
      Promotion.belongsTo(models.player_detail);

      // Promotion creator (if non-player admin)
      Promotion.belongsTo(models.user);
    }
  }

  return Promotion;
};


class CodeGenerator {
  constructor(k1, k2, k3) {
    this.perm10ka = CodeGenerator.permutation(k1 || 1001, 9000).map((n) => 1000 + n);
    this.perm10kb = CodeGenerator.permutation(k2 || 5234, 1000);
    this.perm10kc = CodeGenerator.permutation(k3 || 2002, 10000);
  }

  getNextSerial(leafNumber) {
    const moduloNum = Math.floor(leafNumber % 100000000);
    let plain = `00000000${moduloNum}`.slice(-8);

    plain = CodeGenerator.scramble(plain, this.perm10kb, this.perm10kc);
    plain = CodeGenerator.spread(plain);
    plain = CodeGenerator.scramble(plain, this.perm10kb, this.perm10kc);
    plain = CodeGenerator.spread(plain);
    plain = CodeGenerator.scramble(plain, this.perm10kb, this.perm10kc);

    return CodeGenerator.scrambleHead(plain, this.perm10ka);
  };
  static permutation(seed, n) {
    let result = new Array(n);
    result[0] = 0;

    for(var i=1; i<n; ++i) {
      const x = Math.sin(seed++) * 10000;
      const rand = x - Math.floor(x);

      const idx = (rand * (i+1)) | 0;
      if(idx < i) {
        result[i] = result[idx];
      }
      result[idx] = i;
    }
    return result;
  }

  static scramble(text, codeB, codeC) {
    let a = parseInt(text.slice(0, 1));

    let b = codeB[parseInt(text.slice(1, 4))];
    let c = codeC[parseInt(text.slice(4, 8))];

    a = `0${a}`.slice(-1);
    b = `000${b}`.slice(-3);
    c = `0000${c}`.slice(-4);

    return `${a}${b}${c}`;
  }

  static scrambleHead(text, code) {
    let a = code[parseInt(text.slice(0, 4)) % code.length];
    a = `0000${a}`.slice(-4);

    let b = text.slice(4, 8);
    return `${a}${b}`;
  }

  static spread(plain) {
    return `${plain[0]}${plain[4]}${plain[1]}${plain[5]}${plain[2]}${plain[6]}${plain[3]}${plain[7]}`;
  }
}
