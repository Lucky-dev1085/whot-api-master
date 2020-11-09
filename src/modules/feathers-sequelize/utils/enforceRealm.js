'use strict';

/**
 * Make sure a user can only access data from some "realm" (for example, from
 * a particular account).
 *
 */

const errors = require('@feathersjs/errors');
const _ = require('lodash');
const { ensureKey } = reqlib('_/modules/utils');

module.exports = function(options) {
  if (!options.field) {
    throw new Error('Required option "field" not defined');
  }

  // NOTE: although it has the same signature, this is not a Feathers hook
  return async function enforceRealm(context) {
    const user = context.params.user;

    if (options.name && (await user.hasPermissions([`realm:${options.name}`]))) {
      // user is allowed outside this realm:
      return true;
    }

    const userValue = _.get(user, options.userField || options.field);

    if (!userValue) {
      return false;
    }

    // for write operations, make sure the data is within the realm:
    if (context.data) {
      checkData(
        _.isArray(context.data) ? context.data : [context.data],
        options.field,
        userValue
      );
    }

    // for any reads, apply a filter:
    const $and = ensureKey(context.params, 'sequelize.where.$and', []);
    $and.push({
      [options.field]: {
        $or: [
          {$eq: userValue},
          {$eq: null}
        ]
      }
    });

    return true;
  };
};

function checkData(arr, field, userValue) {
  for (let i = 0; i < arr.length; i++) {
    arr[i][field] = userValue;
  }
}
