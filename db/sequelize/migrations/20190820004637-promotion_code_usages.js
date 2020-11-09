'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
    return Promise
      .resolve()
      .then(function() {
        return queryInterface.addColumn('promotion_codes', 'availableUsages', {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 1
        });
      });
  },

  down: function (queryInterface, Sequelize) {
    return Promise
      .resolve()
      .then(function() {
        return queryInterface.removeColumn('promotion_codes', 'availableUsages');
      });
  }
};
