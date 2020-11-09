'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
    return Promise.resolve()
      .then(function() {
        return queryInterface.createTable('TABLE', {
          id: {
            type: Sequelize.INTEGER.UNSIGNED,
            primaryKey: true,
            autoIncrement: true
          },

          createdAt: {
            type: Sequelize.DATE,
            allowNull: false
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false
          }
        });
      });
  },

  down: function (queryInterface, Sequelize) {
    return Promise.resolve()
      .then(function() {
        return queryInterface.dropTable('TABLE');
      });
  }
};
