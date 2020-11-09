'use strict';

const BaseModel = require('../../BaseModel');
const _ = require('lodash');

module.exports = async function(context) {
  const result = context.method == 'find' ? _.get(context, 'result.data') : context.result;

  const {user} = context.params;
  const permissions = user ? (await user.getPermissions()) : {};

  await Promise.all((_.isArray(result) ? result : [result]).map(async r => {
    if (r instanceof BaseModel) {
      return r.compileAttrBlacklist(permissions, [context]);
    }
  }));
};
