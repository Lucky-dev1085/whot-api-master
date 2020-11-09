'use strict';

const _ = require('lodash');
const { getAttrSchema, getAssociations } = require('./');

/**
 * Build Swagger definitions for a CRUD endpoint.
 */
exports.crud = function(options1) {
  return function(options2) {
    let opt = _.merge({}, options1, options2);

    const modelName = opt.modelName || _.upperFirst(_.camelCase(opt.model.name));
    const tag = opt.tag || _.kebabCase(opt.model.tableName).split('-').map(s => {
      return _.upperFirst(s);
    }).join(' ');

    const props = getPropertiesFromModel(opt.model);

    opt = _.merge({
      name: modelName,
      idField: 'id',
      idFieldType: (props[opt.idField || 'id'] && props[opt.idField || 'id'].type) || 'integer',
      tags: [tag],
      operations: 'fcDrpd'
    }, opt);

    const spec = {};

    // generate schema, requestBody and response definitions:
    _.merge(spec, {
      components: {
        schemas: {
          [modelName]: {
            type: 'object',
            properties: props
          }
        },
        requestBodies: {
          [modelName]: {
            description: `Payload with ${modelName} data`,
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: `#/components/schemas/${modelName}`
                }
              },
              ...opt.upload && {
                'multipart/form-data': {
                  schema: {
                    type: 'object',
                    properties: {
                      payload: {
                        $ref: `#/components/schemas/${modelName}`
                      },
                      file: {
                        type: 'string',
                        format: 'binary'
                      }
                    }
                  }
                }
              }
            }
          },
          [`${modelName}Patch`]: {
            description: `Payload with ${modelName} data`,
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: getPropertiesFromModel(opt.model, true)
                }
              },
              ...opt.upload && {
                'multipart/form-data': {
                  schema: {
                    type: 'object',
                    properties: {
                      payload: {
                        type: 'object',
                        properties: getPropertiesFromModel(opt.model, true)
                      },
                      file: {
                        type: 'string',
                        format: 'binary'
                      }
                    }
                  }
                }
              }
            }
          }
        },
        responses: {
          [modelName]: {
            description: `Response with ${modelName} data`,
            content: {
              'application/json': {
                schema: {
                  $ref: `#/components/schemas/${modelName}`
                }
              }
            }
          }
        }
      }
    });

    // generate path definitions:
    _.merge(spec, {
      paths: Object.assign(
        {},
        /f|c|P|D/.test(opt.operations) && {
          [opt.path]: Object.assign(
            {},
            /f/.test(opt.operations) && {
              get: _.merge({
                tags: opt.tags,
                summary: `Find ${opt.name} records`,
                parameters: [
                  {
                    name: '$offset',
                    in: 'query',
                    description: 'Skip over the specified number of records',
                    schema: {
                      type: 'integer'
                    }
                  },
                  {
                    name: '$limit',
                    in: 'query',
                    description: 'Limit the number of returned records',
                    schema: {
                      type: 'integer'
                    }
                  },
                  {
                    name: '$order',
                    in: 'query',
                    description: 'Sort records (ex: field1,-field2,association.field)',
                    schema: {
                      type: 'string'
                    }
                  },
                  {
                    name: '$include',
                    in: 'query',
                    description: `Include associations (ex: associationA,associationB.subAssociationC) - current direct associations are: ${getAssociations(opt.model).join(', ') || 'none'}`,
                    schema: {
                      type: 'string'
                    }
                  },
                  {
                    name: '$q',
                    in: 'query',
                    description: 'Perform a simple text search over searchable fields',
                    schema: {
                      type: 'string'
                    }
                  },
                  {
                    name: '$searchFields',
                    in: 'query',
                    description: 'Custom list of fields to search (ex: field1,field2,$association.field$)',
                    schema: {
                      type: 'string'
                    }
                  }
                ],
                responses: {
                  200: {
                    description: 'Success',
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            offset: {
                              type: 'integer'
                            },
                            limit: {
                              type: 'integer'
                            },
                            total: {
                              type: 'integer'
                            },
                            data: {
                              type: 'array',
                              items: {
                                $ref: `#/components/schemas/${modelName}`
                              }
                            }
                          }
                        }
                      }
                    }
                  },
                  '4XX': {$ref: '#/components/responses/Error'},
                  '5XX': {$ref: '#/components/responses/Error'}
                }
              }, _.get(opt, 'overrides.f'))
            },
            /c/.test(opt.operations) && {
              post: _.merge({
                tags: opt.tags,
                summary: `Create one or more ${opt.name} records`,
                description: [
                  workingWithAssociations(opt.model)
                ].join('\n'),
                parameters: [
                  {
                    name: '$include',
                    in: 'query',
                    description: `Include associations (ex: associationA,associationB.subAssociationC) - current direct associations are: ${getAssociations(opt.model).join(', ') || 'none'}`,
                    schema: {
                      type: 'string'
                    }
                  }
                ],
                requestBody: {$ref: `#/components/requestBodies/${modelName}`},
                responses: {
                  201: {$ref: `#/components/responses/${modelName}`},
                  '4XX': {$ref: '#/components/responses/Error'},
                  '5XX': {$ref: '#/components/responses/Error'}
                }
              }, _.get(opt, 'overrides.c'))
            },
            /P/.test(opt.operations) && {
              patch: _.merge({
                tags: opt.tags,
                summary: `Patch multiple ${opt.name} records`,
                description: [
                  workingWithAssociations(opt.model)
                ].join('\n'),
                parameters: [
                  {
                    name: '$include',
                    in: 'query',
                    description: `Include associations (ex: associationA,associationB.subAssociationC) - current direct associations are: ${getAssociations(opt.model).join(', ') || 'none'}`,
                    schema: {
                      type: 'string'
                    }
                  }
                ],
                requestBody: {$ref: `#/components/requestBodies/${modelName}Patch`},
                responses: {
                  200: {
                    description: `Response with patched ${opt.name} records`,
                    content: {
                      'application/json': {
                        schema: {
                          type: 'array',
                          items: {
                            $ref: `#/components/schemas/${modelName}`
                          }
                        }
                      }
                    }
                  },
                  '4XX': {$ref: '#/components/responses/Error'},
                  '5XX': {$ref: '#/components/responses/Error'}
                }
              }, _.get(opt, 'overrides.P'))
            },
            /D/.test(opt.operations) && {
              delete: _.merge({
                tags: opt.tags,
                summary: `Delete multiple ${opt.name} records`,
                parameters: [
                  {
                    name: '$include',
                    in: 'query',
                    description: `Include associations (ex: associationA,associationB.subAssociationC) - current direct associations are: ${getAssociations(opt.model).join(', ') || 'none'}`,
                    schema: {
                      type: 'string'
                    }
                  },
                  {
                    name: '$all',
                    in: 'query',
                    description: 'Set this to true to confirm deleting all records (otherwise filters are required)',
                    schema: {
                      type: 'boolean'
                    }
                  }
                ],
                responses: {
                  200: {
                    description: `Response with deleted ${opt.name} records`,
                    content: {
                      'application/json': {
                        schema: {
                          type: 'array',
                          items: {
                            $ref: `#/components/schemas/${modelName}`
                          }
                        }
                      }
                    }
                  },
                  '4XX': {$ref: '#/components/responses/Error'},
                  '5XX': {$ref: '#/components/responses/Error'}
                }
              }, _.get(opt, 'overrides.D'))
            }
          )
        },
        /r|u|p|d/.test(opt.operations) && {
          [`${opt.path}/{${opt.idField}}`]: Object.assign(
            {
              parameters: [{
                name: opt.idField,
                in: 'path',
                description: `${modelName} record ID`,
                required: true,
                schema: {
                  type: opt.idFieldType
                }
              }]
            },
            /r/.test(opt.operations) && {
              get: _.merge({
                tags: opt.tags,
                summary: `Read ${opt.name} record`,
                parameters: [
                  {
                    name: '$include',
                    in: 'query',
                    description: `Include associations (ex: associationA,associationB.subAssociationC) - current direct associations are: ${getAssociations(opt.model).join(', ') || 'none'}`,
                    schema: {
                      type: 'string'
                    }
                  }
                ],
                responses: {
                  200: {$ref: `#/components/responses/${modelName}`},
                  '4XX': {$ref: '#/components/responses/Error'},
                  '5XX': {$ref: '#/components/responses/Error'}
                }
              }, _.get(opt, 'overrides.r'))
            },
            /u/.test(opt.operations) && {
              put: _.merge({
                tags: opt.tags,
                summary: `Update ${opt.name} record`,
                description: [
                  workingWithAssociations(opt.model)
                ].join('\n'),
                parameters: [
                  {
                    name: '$include',
                    in: 'query',
                    description: `Include associations (ex: associationA,associationB.subAssociationC) - current direct associations are: ${getAssociations(opt.model).join(', ') || 'none'}`,
                    schema: {
                      type: 'string'
                    }
                  }
                ],
                requestBody: {$ref: `#/components/requestBodies/${modelName}`},
                responses: {
                  200: {$ref: `#/components/responses/${modelName}`},
                  '4XX': {$ref: '#/components/responses/Error'},
                  '5XX': {$ref: '#/components/responses/Error'}
                }
              }, _.get(opt, 'overrides.u'))
            },
            /p/.test(opt.operations) && {
              patch: _.merge({
                tags: opt.tags,
                summary: `Patch ${opt.name} record`,
                description: [
                  workingWithAssociations(opt.model)
                ].join('\n'),
                parameters: [
                  {
                    name: '$include',
                    in: 'query',
                    description: `Include associations (ex: associationA,associationB.subAssociationC) - current direct associations are: ${getAssociations(opt.model).join(', ') || 'none'}`,
                    schema: {
                      type: 'string'
                    }
                  }
                ],
                requestBody: {$ref: `#/components/requestBodies/${modelName}Patch`},
                responses: {
                  200: {$ref: `#/components/responses/${modelName}`},
                  '4XX': {$ref: '#/components/responses/Error'},
                  '5XX': {$ref: '#/components/responses/Error'}
                }
              }, _.get(opt, 'overrides.p'))
            },
            /d/.test(opt.operations) && {
              delete: _.merge({
                tags: opt.tags,
                summary: `Delete ${opt.name} record`,
                parameters: [
                  {
                    name: '$include',
                    in: 'query',
                    description: `Include associations (ex: associationA,associationB.subAssociationC) - current direct associations are: ${getAssociations(opt.model).join(', ') || 'none'}`,
                    schema: {
                      type: 'string'
                    }
                  }
                ],
                responses: {
                  200: {
                    description: `Response with deleted ${modelName} data`,
                    content: {
                      'application/json': {
                        schema: {
                          $ref: `#/components/schemas/${modelName}`
                        }
                      }
                    }
                  },
                  '4XX': {$ref: '#/components/responses/Error'},
                  '5XX': {$ref: '#/components/responses/Error'}
                }
              }, _.get(opt, 'overrides.d'))
            }
          )
        }
      )
    });

    return spec;
  };
};

function getPropertiesFromModel(model, noPrimary = false) {
  const props = _.mapValues(model.rawAttributes, function(attr, key) {
    const prop = getAttrSchema(model, key);
    const _config = attr._config || {};
    
    if (attr.defaultValue !== undefined && typeof(attr.defaultValue) != 'object') {
      prop.default = attr.defaultValue;
    }

    if (noPrimary && attr.primaryKey) {
      prop.readOnly = true;
    }

    if (attr.autoIncrement || key == 'createdAt' || key == 'updatedAt') {
      prop.readOnly = true;
    }

    _.merge(prop,
      _.pick(_config, ['readOnly', 'writeOnly']),
      typeof(_config.type) == 'string' ? {type: _config.type} : _config.type,
      _config.apidocs
    );

    return prop;
  });

  return props;
}

function workingWithAssociations(model) {
  const associationNames = getAssociations(model, ['HasMany', 'BelongsToMany', 'BelongsTo']);
  if (!associationNames.length) {
    return;
  }

  const md = `
  # Working With Associations

  Include the following structure in your payload to affect associations of this model. Replace *association* with one of the available associations for this model (see below).

  &nbsp;

  \`\`\`
  {
    association: {
      set: [1, 2, { id: 3, through: {} }, { payload }, ...]
      add: [1, 2, { payload: {}, through: {} }, ...]
      remove: [1, 2, {id: 3}, { someField: 'matchingSomeValue' }...]
    }
  }
  \`\`\`

  &nbsp;

  Use *set* to **only** associate specified records.

  Use *add* to associate additional records to the ones already associated.

  Use *remove* to unassociate records matching the primary key or the given filter criteria.

  &nbsp;

  **Available associations:**

  ${associationNames.map(s => `* ${s}`).join('\n')}
  `;

  return md;
}
