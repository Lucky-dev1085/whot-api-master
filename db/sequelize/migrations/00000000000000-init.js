"use strict";

module.exports = {
  up: function(queryInterface, Sequelize) {
    return Promise.resolve()
      .then(function() {
        return queryInterface.createTable(
          "permissions",
          {
            id: { type: "VARCHAR(255)", allowNull: false, primaryKey: true },
            name: { type: "VARCHAR(255)", allowNull: true, unique: true },
            description: { type: "TEXT", allowNull: true },
            createdAt: { type: "TIMESTAMP", allowNull: false },
            updatedAt: { type: "TIMESTAMP", allowNull: false }
          },
          { charset: "utf8mb4" }
        );
      })

      .then(function() {
        return queryInterface.createTable(
          "roles",
          {
            id: { type: "VARCHAR(255)", allowNull: false, primaryKey: true },
            name: { type: "VARCHAR(255)", allowNull: true },
            description: { type: "TEXT", allowNull: true },
            editable: {
              type: "BOOLEAN",
              allowNull: false,
              defaultValue: true
            },
            createdAt: { type: "TIMESTAMP", allowNull: false },
            updatedAt: { type: "TIMESTAMP", allowNull: false }
          },
          { charset: "utf8mb4" }
        );
      })

      .then(function() {
        return queryInterface.addIndex("roles", {
          fields: ["name"],
          indicesType: "UNIQUE"
        });
      })

      .then(function() {
        return queryInterface.createTable(
          "users",
          {
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
            createdAt: { type: "TIMESTAMP", allowNull: false },
            updatedAt: { type: "TIMESTAMP", allowNull: false }
          },
          { charset: "utf8mb4" }
        );
      })

      .then(function() {
        return queryInterface.createTable(
          "role_permissions",
          {
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
            createdAt: { type: "TIMESTAMP", allowNull: false },
            updatedAt: { type: "TIMESTAMP", allowNull: false }
          },
          { charset: "utf8mb4" }
        );
      })

      .then(function() {
        return queryInterface.addIndex("role_permissions", {
          fields: ["roleId", "permissionId"],
          indicesType: "UNIQUE"
        });
      })

      .then(function() {
        return queryInterface.createTable(
          "tokens",
          {
            id: { type: "VARCHAR(40)", allowNull: false, primaryKey: true },
            userId: {
              type: "INTEGER",
              allowNull: false,
              references: { model: "users", key: "id" },
              onDelete: "CASCADE",
              onUpdate: "CASCADE"
            },
            scope: { type: "VARCHAR(255)", allowNull: false },
            data: { type: "JSON", allowNull: true },
            createdAt: { type: "TIMESTAMP", allowNull: false },
            updatedAt: { type: "TIMESTAMP", allowNull: false }
          },
          { charset: "utf8mb4" }
        );
      })

      .then(function() {
        return queryInterface.createTable(
          "user_roles",
          {
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
            createdAt: { type: "TIMESTAMP", allowNull: false },
            updatedAt: { type: "TIMESTAMP", allowNull: false }
          },
          { charset: "utf8mb4" }
        );
      })

      .then(function() {
        return queryInterface.addIndex("user_roles", {
          fields: ["userId", "roleId"],
          indicesType: "UNIQUE"
        });
      });
  },

  down: function(queryInterface, Sequelize) {
    return Promise.resolve()
      .then(function() {
        return queryInterface.dropTable("user_roles");
      })

      .then(function() {
        return queryInterface.dropTable("tokens");
      })

      .then(function() {
        return queryInterface.dropTable("role_permissions");
      })

      .then(function() {
        return queryInterface.dropTable("users");
      })

      .then(function() {
        return queryInterface.dropTable("roles");
      })

      .then(function() {
        return queryInterface.dropTable("permissions");
      });
  },

  schema: {
    models: {
      permission: {
        tableName: "permissions",
        attributes: {
          id: { type: "VARCHAR(255)", allowNull: false, primaryKey: true },
          name: { type: "VARCHAR(255)", allowNull: true, unique: true },
          description: { type: "TEXT", allowNull: true },
          createdAt: { type: "TIMESTAMP", allowNull: false },
          updatedAt: { type: "TIMESTAMP", allowNull: false }
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
          createdAt: { type: "TIMESTAMP", allowNull: false },
          updatedAt: { type: "TIMESTAMP", allowNull: false }
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
          editable: {
            type: "BOOLEAN",
            allowNull: false,
            defaultValue: true
          },
          createdAt: { type: "TIMESTAMP", allowNull: false },
          updatedAt: { type: "TIMESTAMP", allowNull: false }
        },
        options: {
          charset: "utf8mb4",
          indexes: [{ fields: ["name"], indicesType: "UNIQUE" }]
        }
      },
      token: {
        tableName: "tokens",
        attributes: {
          id: { type: "CHAR(36) BINARY", allowNull: false, primaryKey: true },
          userId: {
            type: "INTEGER",
            allowNull: false,
            references: { model: "users", key: "id" },
            onDelete: "CASCADE",
            onUpdate: "CASCADE"
          },
          scope: { type: "VARCHAR(255)", allowNull: false },
          data: { type: "JSON", allowNull: true },
          createdAt: { type: "TIMESTAMP", allowNull: false },
          updatedAt: { type: "TIMESTAMP", allowNull: false }
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
          createdAt: { type: "TIMESTAMP", allowNull: false },
          updatedAt: { type: "TIMESTAMP", allowNull: false }
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
          createdAt: { type: "TIMESTAMP", allowNull: false },
          updatedAt: { type: "TIMESTAMP", allowNull: false }
        },
        options: { charset: "utf8mb4", indexes: [] }
      }
    },
    createOrder: [
      "permission",
      "role",
      "user",
      "role_permission",
      "token",
      "user_role"
    ]
  }
};
