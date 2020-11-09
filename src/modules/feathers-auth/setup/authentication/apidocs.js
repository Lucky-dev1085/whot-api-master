'use strict';

const cfg = require('../../cfg');

module.exports = function(path) {
  const apidocs = reqlib('_/modules/apidocs', true);
  if (!apidocs) {
    return;
  }

  apidocs.spec.update({
    security: [
      {JWT: []}
    ],
    paths: {
      ...cfg.providers.local && {
        [`${path}/login`]: {
          post: {
            tags: ['Authentication'],
            summary: 'Authenticate using a email and password',
            requestBody: {
              $ref: '#/components/requestBodies/LocalAuth'
            },
            responses: {
              200: {
                $ref: '#/components/responses/Authentication'
              },
              403: {
                $ref: '#/components/responses/Error'
              }
            }
          }
        },
        [`${path}/password-reset`]: {
          get: {
            tags: ['Authentication'],
            summary: 'Initiate a password reset',
            parameters: [
              {
                name: 'email',
                in: 'query',
                description: 'User email address',
                required: true,
                schema: {
                  type: 'string',
                  format: 'email'
                },
                example: 'user@example.com'
              }
            ],
            responses: {
              204: {
                description: 'OK'
              },
              404: {
                $ref: '#/components/responses/Error'
              }
            }
          },
          post: {
            tags: ['Authentication'],
            summary: 'Complete a password reset',
            requestBody: {
              description: 'Payload with token and new password',
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      token: {
                        type: 'string'
                      },
                      name: {
                        type: 'string'
                      },
                      password: {
                        type: 'string'
                      }
                    },
                    example: {
                      token: '...',
                      password: '...'
                    }
                  }
                }
              }
            },
            responses: {
              200: {
                $ref: '#/components/responses/Authentication'
              },
              403: {
                $ref: '#/components/responses/Error'
              }
            }
          }
        }
      },
      [`${path}/refresh-token`]: {
        post: {
          tags: ['Authentication'],
          summary: 'Create a new JWT with extended validity',
          requestBody: {
            description: `
Creates a JWT with refresh scope when receiving a valid auth JWT. The refresh token is
valid for a longer amount of time but can't be used for authentication. Alternatively,
creates a fresh JWT with auth scope when receiving a valid refresh JWT.`,
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    authJwt: {
                      type: 'string'
                    },
                    refreshJwt: {
                      type: 'string'
                    },
                  },
                  example: {
                    authJwt: '...',
                    refreshJwt: '...',
                  }
                }
              }
            }
          },
          responses: {
            200: {
              $ref: '#/components/responses/Authentication'
            },
            403: {
              $ref: '#/components/responses/Error'
            }
          }
        }
      },
      [`${path}/login/token`]: {
        post: {
          tags: ['Authentication'],
          summary: 'Authenticate using a local token',
          requestBody: {
            $ref: '#/components/requestBodies/LocalTokenAuth'
          },
          responses: {
            200: {
              $ref: '#/components/responses/Authentication'
            },
            403: {
              $ref: '#/components/responses/Error'
            }
          }
        }
      },
      ...cfg.get('features.passport.enabled') && {
        [`${path}/{provider}`]: {
          get: {
            tags: ['Authentication'],
            summary: 'Initiate 3rd party authentication',
            parameters: [
              {
                name: 'provider',
                in: 'path',
                description: 'Authentication provider name',
                required: true,
                schema: {
                  type: 'string'
                }
              }
            ],
            responses: {
              302: {
                description: 'Redirect to configured URL'
              }
            }
          }
        },
        [`${path}/{provider}/token`]: {
          post: {
            tags: ['Authentication'],
            summary: 'Authenticate using a token from a 3rd party authentication provider',
            parameters: [
              {
                name: 'provider',
                in: 'path',
                description: 'Authentication provider name',
                required: true,
                schema: {
                  type: 'string'
                }
              }
            ],
            requestBody: {
              $ref: '#/components/requestBodies/TokenAuth'
            },
            responses: {
              200: {
                $ref: '#/components/responses/Authentication'
              },
              403: {
                $ref: '#/components/responses/Error'
              }
            }
          }
        }
      }
    },
    components: {
      securitySchemes: {
        JWT: {
          type: 'http',
          in: 'header',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      requestBodies: {
        LocalAuth: {
          description: 'Payload with email and password',
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: {
                    type: 'string'
                  },
                  password: {
                    type: 'string'
                  }
                },
                example: {
                  email: 'user@example.com',
                  password: 'password'
                }
              }
            }
          }
        },
        LocalTokenAuth: {
          description: 'Payload with local token',
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  token: {
                    type: 'string'
                  }
                },
                example: {
                  token: '...'
                }
              }
            }
          }
        },
        TokenAuth: {
          description: 'Payload with 3rd party access token',
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  access_token: {
                    type: 'string'
                  }
                }
              }
            }
          }
        }
      },
      responses: {
        Authentication: {
          description: 'Authentication response containing a JWT and info about the user',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  jwt: {
                    type: 'string'
                  },
                  user: {
                    type: 'object'
                  },
                  isNew: {
                    type: 'boolean'
                  }
                }
              }
            }
          }
        }
      }
    }
  });
};
