'use strict';

const { tableExists } = require('../../../../src/modules/sequelize/utils');
const _ = require('lodash');

// the default "password" password for all users:
const password = '$2b$04$bpEtkbFue6GwDKW5PKzpK.CQfzQTFKZMvhCobOxSct9cgvot5RAJS';

module.exports = {
  up: function (queryInterface, Sequelize) {
    return Promise
      .resolve()
      .then(async function() {
        if (!(await tableExists(queryInterface, 'accounts'))) {
          return;
        }

        return queryInterface.bulkInsert('accounts', [
          {name: 'Super Admin'},
          {name: 'Example Account'}
        ].map(function(r, i) {
          r.id = i + 1;
          r.createdAt = r.updatedAt = new Date();
          return r;
        }));
      })
      .then(async function() {
        const hasAccounts = await tableExists(queryInterface, 'accounts');

        return queryInterface.bulkInsert('users', [
          {
            accountId: 1,
            password,
            email: 'superadmin@example.com',
            emailVerified: true,
            firstName: 'Example',
            lastName: 'SuperAdmin',
            status: 'active'
          },
          {
            accountId: 2,
            password,
            email: 'admin@example.com',
            emailVerified: true,
            firstName: 'Example',
            lastName: 'Admin',
            status: 'active'
          },
          {
            accountId: 2,
            password,
            email: 'user@example.com',
            emailVerified: true,
            firstName: 'Example',
            lastName: 'User',
            status: 'active'
          }
        ].map(function(r, i) {
          if (!hasAccounts) {
            delete r.accountId;
          }

          r.id = i + 1;
          r.createdAt = r.updatedAt = new Date();

          return r;
        }));
      })
      .then(function() {
        // Sequelize does not bump the Postgresql sequence on bulk inserts
        // So we bump it manually to a 'safe' value
        return queryInterface.sequelize.query(
          `select setval('users_id_seq'::regclass, 20);`
        );
      })
      .then(function() {
        return queryInterface.bulkInsert('user_roles', [
          {userId: 1, roleId: 'superadmin'},
          {userId: 2, roleId: 'admin'},
          {userId: 3, roleId: 'user'}
        ].map(function(r) {
          r.createdAt = r.updatedAt = new Date();
          return r;
        }));
      });
  },

  down: function (queryInterface, Sequelize) {
    return Promise.resolve()
      .then(async function() {
        const hasAccounts = await tableExists(queryInterface, 'accounts');

        if (hasAccounts) {
          return queryInterface.bulkDelete('accounts', {
            id: [1, 2]
          });
        }
        else {
          return queryInterface.bulkDelete('users', {
            id: [1, 2, 3]
          });
        }
      });
  }
};
