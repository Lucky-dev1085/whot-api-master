'use strict';

module.exports = function() {
  const apidocs = reqlib('_/modules/apidocs', true);
  if (!apidocs) {
    return;
  }

  apidocs.spec.update({
    paths: {
      '/game-table-invitations': {
        'get': {
          tags: ['Game Tables'],
          summary: `
Fetch game invitation data from the given token
          `,
          parameters: [
            {
              name: 'token',
              in: 'query',
              description: 'Game invitation token',
              required: true,
              schema: {
                type: 'string',
              },
              example: '1B9CC94A-2B13-45D4-A625-0B34D45B940A'
            },
            {
              name: 'action',
              in: 'query',
              description: 'Game invitation decision',
              required: false,
              schema: {
                type: 'string',
                enum: ['decline', 'postpone'],
                default: 'postpone'
              },
              example: '1B9CC94A-2B13-45D4-A625-0B34D45B940A'
            }
          ],
          responses: {
            201: {
              description: 'OK',
              content: { 'application/json': { schema: {
                type: 'object',
                properties: {
                  hostUserId: {
                    type: 'number',
                  },
                  guestUserName: {
                    type: 'string',
                  },
                  gameTableId: {
                    type: 'number',
                  },
                  tableTitle: {
                    type: 'string',
                  },
                  minStakeAmount: {
                    type: 'number',
                  },
                  maxPlayerCount: {
                    type: 'number',
                  },
                },
                example: {
                  hostUserId: 123,
                  guestUserName: 'Jackie2048',
                  gameTableId: 456,
                  tableTitle: 'After hours',
                  minStakeAmount: 500,
                  maxPlayerCount: 5,
                }
              }}}
            }
          }
        },
        'post': {
          tags: ['Game Tables'],
          summary: `
Send invitations to join a table to other players
          `,
          parameters: [ ],
          requestBody: {
            content: { 'application/json': { schema: {
              type: 'object',
              properties: {
                gameTableId: {
                  type: 'number',
                },
                playerDetailIds: {
                  type: 'array',
                  items: { type: 'number' },
                },
              },
              example: {
                gameTableId: 1230,
                playerDetailIds: [12, 450, 333],
              }
            }}}
          },
          responses: {
            201: {
              description: 'OK',
              content: { 'application/json': { schema: {
                type: 'object',
                properties: {
                  state: {
                    type: 'string'
                  },
                },
                example: {
                  state: 'ok',
                }
              }}}
            }
          }
        },
      }
    },
  });
};
