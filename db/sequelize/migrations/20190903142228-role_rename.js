'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
    return Promise
      .resolve()
      .then(function() {
        return queryInterface.bulkInsert('roles', [
          {id: 'usersadmin', editable: false},
          {id: 'gamesadmin', editable: false},
        ].map(function(r) {
          r.createdAt = r.updatedAt = new Date();
          return r;
        }));
      })
      .then(function() {
        return queryInterface.bulkUpdate('user_roles', {roleId: 'usersadmin'}, {roleId: 'admin'});
      })
      .then(function() {
        return queryInterface.bulkInsert('role_permissions', [
          {roleId: 'usersadmin', permissionId: 'admin-app:read'},
          {roleId: 'usersadmin', permissionId: 'admin-app:write'},

          {roleId: 'gamesadmin', permissionId: 'admin-app:read'},
          {roleId: 'gamesadmin', permissionId: 'admin-app:write'},

          {roleId: 'gamesadmin', permissionId: 'game:read'},
          {roleId: 'gamesadmin', permissionId: 'game:write'},
          {roleId: 'gamesadmin', permissionId: 'chat-rooms:read'},
          {roleId: 'gamesadmin', permissionId: 'chat-rooms:write'},
          {roleId: 'gamesadmin', permissionId: 'chat-messages:read'},
          {roleId: 'gamesadmin', permissionId: 'chat-messages:write'},

          {roleId: 'usersadmin', permissionId: 'players:read'},
          {roleId: 'usersadmin', permissionId: 'players:write'},
          {roleId: 'usersadmin', permissionId: 'audit:read'},
          {roleId: 'usersadmin', permissionId: 'audit:write'},
          {roleId: 'usersadmin', permissionId: 'promotions:read'},
          {roleId: 'usersadmin', permissionId: 'promotions:write'},
        ].map(function(r) {
          r.createdAt = r.updatedAt = new Date();
          return r;
        }));
      })
    ;
  },

  down: function (queryInterface, Sequelize) {
    return Promise
      .resolve()
      .then(function() {
        return queryInterface.bulkUpdate('user_roles', {roleId: 'admin'}, {roleId: 'usersadmin'});
      })
      .then(function() {
        return queryInterface.bulkDelete('roles', {
          id: ['usersadmin', 'gamesadmin']
        });
      });
  }
};
