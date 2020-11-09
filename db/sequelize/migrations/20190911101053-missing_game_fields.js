"use strict";

module.exports = {
  up: function(queryInterface, Sequelize) {
    return Promise
      .resolve()
      .then(function() {
        return queryInterface.createTable('player_game_state', {
          id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
          },
          state: {
            type: Sequelize.STRING,
            allowNull: false,
            defaultValue: "DISCONNECTED"
          },
          winningAmount: { type: Sequelize.FLOAT, allowNull: false, defaultValue: 0 },
          stakeAmount: { type: Sequelize.FLOAT, allowNull: false, defaultValue: 0 },
          createdAt: { type: Sequelize.DATE, allowNull: false },
          updatedAt: { type: Sequelize.DATE, allowNull: false },
          gameTableId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: "game_tables", key: "id" },
            onDelete: "SET NULL",
            onUpdate: "CASCADE"
          },
          playerDetailId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: "player_details", key: "id" },
            onDelete: "SET NULL",
            onUpdate: "CASCADE"
          }
        });
      })
      .then(function() {
        return Promise.all([
          queryInterface.addColumn('game_tables', 'gameType', {
            type: Sequelize.STRING,
            allowNull: false,
            defaultValue: "PUBLIC"
          }),
          queryInterface.addColumn('game_tables', 'featured', {
            type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false
          }),
          queryInterface.addColumn('game_tables', 'maxPlayerCount', {
            type: Sequelize.INTEGER, allowNull: true, defaultValue: 0
          }),
          queryInterface.addColumn('game_tables', 'minStakeAmount', {
            type: Sequelize.FLOAT, allowNull: false, defaultValue: 0
          }),
          queryInterface.addColumn('game_tables', 'stakeAmount', {
            type: Sequelize.FLOAT, allowNull: false, defaultValue: 0
          }),
          queryInterface.addColumn('game_tables', 'profitAmount', {
            type: Sequelize.FLOAT, allowNull: false, defaultValue: 0
          }),
          queryInterface.addColumn('game_tables', 'startingAt', {
            type: Sequelize.DATE, allowNull: true 
          }),
          queryInterface.dropTable('player_game_outcome'),
        ]);
      })
    ;
  },

  down: function(queryInterface, Sequelize) {
    return Promise
      .resolve()
      .then(function() {
        return Promise.all([
          queryInterface.dropTable('player_game_state'),
          queryInterface.removeColumn('game_tables', 'gameType'),
          queryInterface.removeColumn('game_tables', 'featured'),
          queryInterface.removeColumn('game_tables', 'maxPlayerCount'),
          queryInterface.removeColumn('game_tables', 'minStakeAmount'),
          queryInterface.removeColumn('game_tables', 'stakeAmount'),
          queryInterface.removeColumn('game_tables', 'profitAmount'),
          queryInterface.removeColumn('game_tables', 'startingAt'),
          queryInterface.createTable('player_game_outcome', {
            id: {
              type: Sequelize.INTEGER,
              allowNull: false,
              primaryKey: true,
              autoIncrement: true
            },
            outcome: {
              type: Sequelize.STRING,
              allowNull: false,
              defaultValue: "DISCONNECTED"
            },
            winningAmount: { type: Sequelize.FLOAT, allowNull: false, defaultValue: 0 },
            stakeAmount: { type: Sequelize.FLOAT, allowNull: false, defaultValue: 0 },
            createdAt: { type: Sequelize.DATE, allowNull: false },
            updatedAt: { type: Sequelize.DATE, allowNull: false },
            gameTableId: {
              type: Sequelize.INTEGER,
              allowNull: true,
              references: { model: "game_tables", key: "id" },
              onDelete: "SET NULL",
              onUpdate: "CASCADE"
            },
            playerDetailId: {
              type: Sequelize.INTEGER,
              allowNull: true,
              references: { model: "player_details", key: "id" },
              onDelete: "SET NULL",
              onUpdate: "CASCADE"
            }
          }),
        ]);
      })
    ;
  },

  schema: {
    models: {
      audit_log: {
        tableName: "audit_logs",
        attributes: {
          id: {
            type: "INTEGER",
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
          },
          entityTable: { type: "TEXT", allowNull: false },
          entityId: { type: "TEXT", allowNull: false },
          action: { type: "TEXT", allowNull: true },
          changes: { type: "JSON", allowNull: true },
          changeReason: { type: "TEXT", allowNull: true },
          changeTimestamp: {
            type: "TIMESTAMP WITH TIME ZONE",
            allowNull: true
          },
          userSignature: { type: "TEXT", allowNull: true },
          searchKeywords: { type: "TEXT", allowNull: true },
          createdAt: { type: "TIMESTAMP WITH TIME ZONE", allowNull: false },
          updatedAt: { type: "TIMESTAMP WITH TIME ZONE", allowNull: false },
          userId: {
            type: "INTEGER",
            allowNull: true,
            references: { model: "users", key: "id" },
            onDelete: "SET NULL",
            onUpdate: "CASCADE"
          }
        },
        options: {
          charset: "utf8mb4",
          indexes: [
            { fields: ["entityTable"] },
            { fields: ["changeTimestamp"] },
            { fields: ["userSignature"] },
            { fields: ["searchKeywords"] }
          ]
        }
      },
      chat_message: {
        tableName: "chat_messages",
        attributes: {
          id: {
            type: "INTEGER",
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
          },
          type: { type: "VARCHAR(255)", allowNull: false },
          senderName: { type: "VARCHAR(255)", allowNull: false },
          text: { type: "VARCHAR(255)", allowNull: false },
          contentUrl: { type: "VARCHAR(255)", allowNull: false },
          contentType: { type: "VARCHAR(255)", allowNull: false },
          createdAt: { type: "TIMESTAMP WITH TIME ZONE", allowNull: false },
          updatedAt: { type: "TIMESTAMP WITH TIME ZONE", allowNull: false },
          senderId: {
            type: "INTEGER",
            allowNull: true,
            references: { model: "users", key: "id" },
            onDelete: "SET NULL",
            onUpdate: "CASCADE"
          },
          chatRoomId: {
            type: "INTEGER",
            allowNull: true,
            references: { model: "chat_rooms", key: "id" },
            onDelete: "SET NULL",
            onUpdate: "CASCADE"
          },
          recepientId: {
            type: "INTEGER",
            allowNull: true,
            references: { model: "users", key: "id" },
            onDelete: "SET NULL",
            onUpdate: "CASCADE"
          },
          ancestorId: {
            type: "INTEGER",
            allowNull: true,
            references: { model: "chat_messages", key: "id" },
            onDelete: "SET NULL",
            onUpdate: "CASCADE"
          }
        },
        options: {
          charset: "utf8mb4",
          indexes: [{ fields: ["text"] }, { fields: ["type"] }]
        }
      },
      chat_room_event: {
        tableName: "chat_room_events",
        attributes: {
          id: {
            type: "INTEGER",
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
          },
          type: { type: "VARCHAR(255)", allowNull: false },
          text: { type: "VARCHAR(255)", allowNull: false },
          createdAt: { type: "TIMESTAMP WITH TIME ZONE", allowNull: false },
          updatedAt: { type: "TIMESTAMP WITH TIME ZONE", allowNull: false },
          chatRoomId: {
            type: "INTEGER",
            allowNull: true,
            references: { model: "chat_rooms", key: "id" },
            onDelete: "SET NULL",
            onUpdate: "CASCADE"
          }
        },
        options: { charset: "utf8mb4", indexes: [] }
      },
      chat_room_user: {
        tableName: "chat_room_users",
        attributes: {
          id: {
            type: "INTEGER",
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
          },
          name: { type: "VARCHAR(255)", allowNull: false },
          createdAt: { type: "TIMESTAMP WITH TIME ZONE", allowNull: false },
          updatedAt: { type: "TIMESTAMP WITH TIME ZONE", allowNull: false },
          userId: {
            type: "INTEGER",
            allowNull: true,
            references: { model: "users", key: "id" },
            onDelete: "SET NULL",
            onUpdate: "CASCADE"
          },
          roleId: {
            type: "VARCHAR(255)",
            allowNull: true,
            references: { model: "roles", key: "id" },
            onDelete: "SET NULL",
            onUpdate: "CASCADE"
          },
          chatRoomId: {
            type: "INTEGER",
            allowNull: true,
            references: { model: "chat_rooms", key: "id" },
            onDelete: "SET NULL",
            onUpdate: "CASCADE"
          }
        },
        options: { charset: "utf8mb4", indexes: [] }
      },
      chat_room: {
        tableName: "chat_rooms",
        attributes: {
          id: {
            type: "INTEGER",
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
          },
          type: { type: "VARCHAR(255)", allowNull: false },
          name: { type: "VARCHAR(255)", allowNull: false },
          location: { type: "VARCHAR(255)", allowNull: true },
          avatarImageUrl: { type: "VARCHAR(255)", allowNull: true },
          createdAt: { type: "TIMESTAMP WITH TIME ZONE", allowNull: false },
          updatedAt: { type: "TIMESTAMP WITH TIME ZONE", allowNull: false }
        },
        options: {
          charset: "utf8mb4",
          indexes: [
            { fields: ["type"] },
            { fields: ["name"] },
            { fields: ["location"] }
          ]
        }
      },
      game_table: {
        tableName: "game_tables",
        attributes: {
          id: {
            type: "INTEGER",
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
          },
          tableTitle: { type: "VARCHAR(255)", allowNull: false },
          tablePassword: { type: "VARCHAR(255)", allowNull: true },
          logo: { type: "VARCHAR(255)", allowNull: true },
          gameStatus: {
            type: "VARCHAR(255)",
            allowNull: true,
            defaultValue: "NEW"
          },
          gameType: {
            type: "VARCHAR(255)",
            allowNull: false,
            defaultValue: "PUBLIC"
          },
          featured: { type: "BOOLEAN", allowNull: false, defaultValue: false },
          maxPlayerCount: { type: "INTEGER", allowNull: true, defaultValue: 0 },
          playerCount: { type: "INTEGER", allowNull: true, defaultValue: 0 },
          minStakeAmount: { type: "FLOAT", allowNull: false, defaultValue: 0 },
          stakeAmount: { type: "FLOAT", allowNull: false, defaultValue: 0 },
          profitAmount: { type: "FLOAT", allowNull: false, defaultValue: 0 },
          startingAt: { type: "TIMESTAMP WITH TIME ZONE", allowNull: true },
          createdAt: { type: "TIMESTAMP WITH TIME ZONE", allowNull: false },
          updatedAt: { type: "TIMESTAMP WITH TIME ZONE", allowNull: false },
          playerDetailId: {
            type: "INTEGER",
            allowNull: true,
            references: { model: "player_details", key: "id" },
            onDelete: "SET NULL",
            onUpdate: "CASCADE"
          }
        },
        options: {
          charset: "utf8mb4",
          indexes: [
            { fields: ["tableTitle"] },
            { fields: ["gameStatus"] },
            { fields: ["playerCount"] },
            { fields: ["gameType"] },
            { fields: ["featured"] },
            { fields: ["minStakeAmount"] },
            { fields: ["startDate"] }
          ]
        }
      },
      player_deposit: {
        tableName: "player_deposits",
        attributes: {
          id: {
            type: "INTEGER",
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
          },
          amount: { type: "FLOAT", allowNull: false, defaultValue: 0 },
          origin: { type: "VARCHAR(255)", allowNull: false, defaultValue: "" },
          originDetail: {
            type: "VARCHAR(255)",
            allowNull: true,
            defaultValue: ""
          },
          createdAt: { type: "TIMESTAMP WITH TIME ZONE", allowNull: false },
          updatedAt: { type: "TIMESTAMP WITH TIME ZONE", allowNull: false },
          playerDetailId: {
            type: "INTEGER",
            allowNull: true,
            references: { model: "player_details", key: "id" },
            onDelete: "SET NULL",
            onUpdate: "CASCADE"
          }
        },
        options: {
          charset: "utf8mb4",
          indexes: [{ fields: ["origin"] }, { fields: ["amount"] }]
        }
      },
      player_detail: {
        tableName: "player_details",
        attributes: {
          id: {
            type: "INTEGER",
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
          },
          name: { type: "VARCHAR(255)", allowNull: false },
          mobile: { type: "VARCHAR(255)", allowNull: true, unique: false },
          mobileVerificationTimestamp: {
            type: "TIMESTAMP WITH TIME ZONE",
            allowNull: true
          },
          avatarImage: { type: "VARCHAR(255)", allowNull: true },
          depositBalance: { type: "FLOAT", allowNull: false, defaultValue: 0 },
          withdrawlBalance: {
            type: "FLOAT",
            allowNull: false,
            defaultValue: 0
          },
          playerStatus: {
            type: "VARCHAR(255)",
            allowNull: true,
            defaultValue: "OFFLINE"
          },
          termsAgreed: {
            type: "BOOLEAN",
            allowNull: false,
            defaultValue: false
          },
          termsAgreedTimestamp: {
            type: "TIMESTAMP WITH TIME ZONE",
            allowNull: false
          },
          createdAt: { type: "TIMESTAMP WITH TIME ZONE", allowNull: false },
          updatedAt: { type: "TIMESTAMP WITH TIME ZONE", allowNull: false },
          userId: {
            type: "INTEGER",
            allowNull: true,
            references: { model: "users", key: "id" },
            onDelete: "SET NULL",
            onUpdate: "CASCADE"
          }
        },
        options: {
          charset: "utf8mb4",
          indexes: [{ fields: ["name"] }, { fields: ["playerStatus"] }]
        }
      },
      player_game_state: {
        tableName: "player_game_states",
        attributes: {
          id: {
            type: "INTEGER",
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
          },
          state: {
            type: "VARCHAR(255)",
            allowNull: false,
            defaultValue: "DISCONNECTED"
          },
          winningAmount: { type: "FLOAT", allowNull: false, defaultValue: 0 },
          stakeAmount: { type: "FLOAT", allowNull: false, defaultValue: 0 },
          createdAt: { type: "TIMESTAMP WITH TIME ZONE", allowNull: false },
          updatedAt: { type: "TIMESTAMP WITH TIME ZONE", allowNull: false },
          gameTableId: {
            type: "INTEGER",
            allowNull: true,
            references: { model: "game_tables", key: "id" },
            onDelete: "SET NULL",
            onUpdate: "CASCADE"
          },
          playerDetailId: {
            type: "INTEGER",
            allowNull: true,
            references: { model: "player_details", key: "id" },
            onDelete: "SET NULL",
            onUpdate: "CASCADE"
          }
        },
        options: { charset: "utf8mb4", indexes: [{ fields: ["state"] }] }
      },
      promotion_code: {
        tableName: "promotion_codes",
        attributes: {
          id: {
            type: "INTEGER",
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
          },
          status: {
            type: "VARCHAR(255)",
            allowNull: false,
            defaultValue: "unused"
          },
          availableUsages: {
            type: "INTEGER",
            allowNull: false,
            defaultValue: 1
          },
          serial: { type: "VARCHAR(255)", allowNull: false },
          value: { type: "FLOAT", allowNull: false, defaultValue: 0 },
          createdAt: { type: "TIMESTAMP WITH TIME ZONE", allowNull: false },
          updatedAt: { type: "TIMESTAMP WITH TIME ZONE", allowNull: false },
          promotionId: {
            type: "INTEGER",
            allowNull: true,
            references: { model: "promotions", key: "id" },
            onDelete: "SET NULL",
            onUpdate: "CASCADE"
          }
        },
        options: {
          charset: "utf8mb4",
          indexes: [{ fields: ["status"] }, { fields: ["serial"] }]
        }
      },
      promotion: {
        tableName: "promotions",
        attributes: {
          id: {
            type: "INTEGER",
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
          },
          batchName: { type: "VARCHAR(255)", allowNull: false },
          denomination: { type: "FLOAT", allowNull: false, defaultValue: 0 },
          numberOfCodes: { type: "INTEGER", allowNull: false, defaultValue: 0 },
          status: {
            type: "VARCHAR(255)",
            allowNull: true,
            defaultValue: "pending"
          },
          expiresAt: { type: "TIMESTAMP WITH TIME ZONE", allowNull: false },
          searchKeywords: { type: "TEXT", allowNull: true },
          createdAt: { type: "TIMESTAMP WITH TIME ZONE", allowNull: false },
          updatedAt: { type: "TIMESTAMP WITH TIME ZONE", allowNull: false }
        },
        options: {
          charset: "utf8mb4",
          indexes: [
            { fields: ["status"] },
            { fields: ["batchName"], indicesType: "UNIQUE" },
            { fields: ["denomination"] },
            { fields: ["searchKeywords"] }
          ]
        }
      },
      permission: {
        tableName: "permissions",
        attributes: {
          id: { type: "VARCHAR(255)", allowNull: false, primaryKey: true },
          name: { type: "VARCHAR(255)", allowNull: true, unique: true },
          description: { type: "TEXT", allowNull: true },
          createdAt: { type: "TIMESTAMP WITH TIME ZONE", allowNull: false },
          updatedAt: { type: "TIMESTAMP WITH TIME ZONE", allowNull: false }
        },
        options: { charset: "utf8mb4", indexes: [] }
      },
      role_permission: {
        tableName: "role_permissions",
        attributes: {
          roleId: {
            type: "VARCHAR(255)",
            allowNull: true,
            primaryKey: true,
            unique: "role_permissions_roleId_permissionId_unique",
            references: { model: "roles", key: "id" },
            onDelete: "CASCADE",
            onUpdate: "CASCADE"
          },
          permissionId: {
            type: "VARCHAR(255)",
            allowNull: true,
            primaryKey: true,
            unique: "role_permissions_roleId_permissionId_unique",
            references: { model: "permissions", key: "id" },
            onDelete: "CASCADE",
            onUpdate: "CASCADE"
          },
          createdAt: { type: "TIMESTAMP WITH TIME ZONE", allowNull: false },
          updatedAt: { type: "TIMESTAMP WITH TIME ZONE", allowNull: false }
        },
        options: {
          charset: "utf8mb4",
          indexes: [
            { fields: ["roleId", "permissionId"], indicesType: "UNIQUE" }
          ]
        }
      },
      role: {
        tableName: "roles",
        attributes: {
          id: { type: "VARCHAR(255)", allowNull: false, primaryKey: true },
          name: { type: "VARCHAR(255)", allowNull: true },
          description: { type: "TEXT", allowNull: true },
          editable: { type: "BOOLEAN", allowNull: false, defaultValue: true },
          createdAt: { type: "TIMESTAMP WITH TIME ZONE", allowNull: false },
          updatedAt: { type: "TIMESTAMP WITH TIME ZONE", allowNull: false }
        },
        options: {
          charset: "utf8mb4",
          indexes: [{ fields: ["name"], indicesType: "UNIQUE" }]
        }
      },
      token: {
        tableName: "tokens",
        attributes: {
          id: { type: "UUID", allowNull: false, primaryKey: true },
          userId: {
            type: "INTEGER",
            allowNull: false,
            references: { model: "users", key: "id" },
            onDelete: "CASCADE",
            onUpdate: "CASCADE"
          },
          scope: { type: "VARCHAR(255)", allowNull: false },
          data: { type: "JSON", allowNull: true },
          createdAt: { type: "TIMESTAMP WITH TIME ZONE", allowNull: false },
          updatedAt: { type: "TIMESTAMP WITH TIME ZONE", allowNull: false }
        },
        options: { charset: "utf8mb4", indexes: [] }
      },
      user_role: {
        tableName: "user_roles",
        attributes: {
          userId: {
            type: "INTEGER",
            allowNull: true,
            primaryKey: true,
            unique: "user_roles_userId_roleId_unique",
            references: { model: "users", key: "id" },
            onDelete: "CASCADE",
            onUpdate: "CASCADE"
          },
          roleId: {
            type: "VARCHAR(255)",
            allowNull: true,
            primaryKey: true,
            unique: "user_roles_userId_roleId_unique",
            references: { model: "roles", key: "id" },
            onDelete: "CASCADE",
            onUpdate: "CASCADE"
          },
          createdAt: { type: "TIMESTAMP WITH TIME ZONE", allowNull: false },
          updatedAt: { type: "TIMESTAMP WITH TIME ZONE", allowNull: false }
        },
        options: {
          charset: "utf8mb4",
          indexes: [{ fields: ["userId", "roleId"], indicesType: "UNIQUE" }]
        }
      },
      user: {
        tableName: "users",
        attributes: {
          id: {
            type: "INTEGER",
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
          },
          password: { type: "VARCHAR(255)", allowNull: true },
          email: { type: "VARCHAR(255)", allowNull: false, unique: true },
          emailVerified: {
            type: "BOOLEAN",
            allowNull: false,
            defaultValue: false
          },
          firstName: {
            type: "VARCHAR(255)",
            allowNull: false,
            defaultValue: ""
          },
          lastName: {
            type: "VARCHAR(255)",
            allowNull: false,
            defaultValue: ""
          },
          status: {
            type: "VARCHAR(255)",
            allowNull: false,
            defaultValue: "active"
          },
          createdAt: { type: "TIMESTAMP WITH TIME ZONE", allowNull: false },
          updatedAt: { type: "TIMESTAMP WITH TIME ZONE", allowNull: false }
        },
        options: { charset: "utf8mb4", indexes: [] }
      }
    },
    createOrder: [
      "user",
      "chat_room",
      "promotion",
      "permission",
      "role",
      "user_role",
      "token",
      "player_detail",
      "chat_message",
      "promotion_code",
      "chat_room_event",
      "chat_room_user",
      "role_permission",
      "audit_log",
      "player_deposit",
      "game_table",
      "player_game_state"
    ]
  }
};
