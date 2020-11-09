'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
    return Promise.resolve()
      .then(function() {
        return queryInterface.bulkInsert('table', [
          {
          }
        ].map(function(r) {
          r.createdAt = r.updatedAt = new Date();
          return r;
        }));
      });
  },

  down: function (queryInterface, Sequelize) {
    return Promise.resolve()
      .then(function() {
        return queryInterface.bulkDelete('table', {
        });
      });
  }
};
