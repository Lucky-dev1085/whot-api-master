'use strict';

const _ = require('lodash');
const { validate } = reqlib('_/modules/validation');
const { evalTruthArray } = reqlib('_/modules/utils');
const errors = require('@feathersjs/errors');

module.exports = function(defaultSchema) {
  return async function(context) {
    let schema = _.cloneDeep(defaultSchema);

    const {user} = context.params;
    const permissions = user ? (await user.getPermissions()) : [];

    if (schema.type == 'object') {
      // exclude any fields that don't pass auth requirements:
      const excluded = [];

      let fnThis = null;
      if (context.method == 'patch' && _.some(_.map(schema.properties, 'editIff'))) {
        fnThis = await context.service.get(context.id, {
          provider: context.params.provider,
          jwt: context.params.jwt,
          user: context.params.user
        });
      }

      await Promise.all(Object.keys(schema.properties).map(async function(key) {
        const prop = schema.properties[key];
        if (prop.editIff) {
          const pass = await evalTruthArray(prop.editIff, permissions, 'any', fnThis, [context]);

          if (pass !== true) {
            if (pass !== false) {
              throw pass;
            }

            delete schema.properties[key];
            excluded.push(key);
          }

          delete prop.editIff;
        }
      }));

      // no fields are required for patch:
      if (context.method == 'patch') {
        delete schema.required;
      }
      else {
        schema.required = _.difference(schema.required || [], excluded);
      }
    }

    // if the data we want to validate is an array, but the schema we get is
    // not for an array, assume the schema represents the items in the array
    if (_.isArray(context.data) && schema.type != 'array') {
      schema = {
        type: 'array',
        items: schema
      };
    }

    const validationErrors = validate(schema, context.data);
    if (validationErrors) {
      throw new errors.BadRequest('Invalid Parameters', {
        errors: validationErrors
      });
    }

    return context;
  };
};
