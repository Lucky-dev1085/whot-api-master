'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
    return Promise
      .resolve()
      .then(function() {
        return Promise.all([
          queryInterface.renameColumn('player_details', 'nickName', 'name'),
          queryInterface.addColumn('player_details', 'mobile', {
            type: Sequelize.STRING,
            allowNull: true,
            unique: false,
          }),
          queryInterface.addColumn('player_details', 'mobileVerificationTimestamp', {
            type: Sequelize.DATE,
            allowNull: true,
          }),
        ]);
      });
  },

  down: function (queryInterface, Sequelize) {
    return Promise
      .resolve()
      .then(function() {
        return Promise.all([
          queryInterface.renameColumn('player_details', 'name', 'nickName'),
          queryInterface.removeColumn('player_details', 'mobile'),
          queryInterface.removeColumn('player_details', 'mobileVerificationTimestamp'),
        ]);
      });
  }
};
