'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
    return Promise.resolve()
      .then(function() {
        return queryInterface.bulkInsert('permissions', [
          {id: '*', description: 'Super admin permission, equivalent to having all permissions'},
          {id: 'accounts:read', description: 'View access to all accounts'},
          {id: 'accounts:write', description: 'Edit access to all accounts'},
          {id: 'realm:account', description: "Extend user's permissions across all accounts"},
          {id: 'roles:read', description: 'View access to all roles'},
          {id: 'roles:write', description: 'Edit access to all roles'},
          {id: 'roles:grant', description: 'Grant roles to other users'},
          {id: 'users:read', description: 'View access to all users'},
          {id: 'users:write', description: 'Edit access to all users'}
        ].map(function(r) {
          r.createdAt = r.updatedAt = new Date();
          return r;
        }));
      })
      .then(function() {
        return queryInterface.bulkInsert('roles', [
          {id: 'superadmin', editable: false},
          {id: 'admin', editable: false},
          {id: 'user', editable: false}
        ].map(function(r) {
          r.createdAt = r.updatedAt = new Date();
          return r;
        }));
      })
      .then(function() {
        return queryInterface.bulkInsert('role_permissions', [
          {roleId: 'superadmin', permissionId: '*'},
          {roleId: 'admin', permissionId: 'accounts:read'},
          {roleId: 'admin', permissionId: 'accounts:write'},
          {roleId: 'admin', permissionId: 'roles:read'},
          {roleId: 'admin', permissionId: 'roles:write'},
          {roleId: 'admin', permissionId: 'roles:grant'},
          {roleId: 'admin', permissionId: 'users:read'},
          {roleId: 'admin', permissionId: 'users:write'}
        ].map(function(r) {
          r.createdAt = r.updatedAt = new Date();
          return r;
        }));
      });
  },

  down: function (queryInterface, Sequelize) {
    return Promise.resolve()
      .then(function() {
        return queryInterface.bulkDelete('roles', {
          id: ['superadmin', 'admin', 'user']
        });
      })
      .then(function() {
        return queryInterface.bulkDelete('permissions', {
        });
      });
  }
};
