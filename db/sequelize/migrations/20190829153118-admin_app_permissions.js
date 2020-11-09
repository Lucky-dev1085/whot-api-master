'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
    return Promise
      .resolve()
      .then(function() {
        return queryInterface.bulkInsert('permissions', [
          {id: 'admin-app:read', description: 'View access to the admin web app'},
          {id: 'admin-app:write', description: 'Edit access to the admin web app'},

          {id: 'audit:read', description: 'View access to the transactions audit trail'},
          {id: 'audit:write', description: 'Edit access to the transactions audit trail'},
          {id: 'game:read', description: 'View access to game'},
          {id: 'game:write', description: 'Edit access to game'},

          {id: 'chat-rooms:read', description: 'View access to chat rooms'},
          {id: 'chat-rooms:write', description: 'Edit access to chat rooms'},
          {id: 'chat-messages:read', description: 'View access to chat messages'},
          {id: 'chat-messages:write', description: 'Edit access to chat messages'},

          {id: 'players:read', description: 'View access to player details'},
          {id: 'players:write', description: 'Edit access to player details'},
          {id: 'promotions:read', description: 'View access to promotions'},
          {id: 'promotions:write', description: 'Edit access to promotions'},
        ].map(function(r) {
          r.createdAt = r.updatedAt = new Date();
          return r;
        }));
      })
      .then(function() {
        return queryInterface.bulkInsert('role_permissions', [
          {roleId: 'admin', permissionId: 'admin-app:read'},
          {roleId: 'admin', permissionId: 'admin-app:write'},

          {roleId: 'admin', permissionId: 'audit:read'},
          {roleId: 'admin', permissionId: 'audit:write'},
          {roleId: 'admin', permissionId: 'game:read'},
          {roleId: 'admin', permissionId: 'game:write'},

          {roleId: 'admin', permissionId: 'chat-rooms:read'},
          {roleId: 'admin', permissionId: 'chat-rooms:write'},
          {roleId: 'admin', permissionId: 'chat-messages:read'},
          {roleId: 'admin', permissionId: 'chat-messages:write'},

          {roleId: 'admin', permissionId: 'players:read'},
          {roleId: 'admin', permissionId: 'players:write'},
          {roleId: 'admin', permissionId: 'promotions:read'},
          {roleId: 'admin', permissionId: 'promotions:write'},
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
        return queryInterface.bulkDelete('permissions', {
          id: [
            'admin-app:read', 'admin-app:write',
            'audit:read', 'audit:write',
            'game:read', 'game:write',
            'chat-rooms:read', 'chat-rooms:write',
            'chat-messages:read', 'chat-messages:write',
            'players:read', 'players:write',
            'promotions:read', 'promotions:write',
          ]
        });
      });
  }
};
