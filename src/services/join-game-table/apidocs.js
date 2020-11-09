'use strict';

module.exports = function() {
  const apidocs = reqlib('_/modules/apidocs', true);
  if (!apidocs) {
    return;
  }

  apidocs.spec.update({
    paths: {
      '/join-game-table': {
        'post': {
          tags: ['Game Tables'],
          summary: `
Deposit the stake amount in the game pot and join the game table.
Returns a record of the player game state.`,
          parameters: [ ],
          requestBody: {
            content: { 'application/json': { schema: {
              type: 'object',
              properties: {
                gameTableId: {
                  type: 'number',
                },
                tablePassword: {
                  type: 'string',
                },
                stakeAmount: {
                  type: 'number',
                },
              },
              example: {
                gameTableId: 1230,
                stakeAmount: 450,
                tablePassword: 'only-elite-players',
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
                  stakeAmount: {
                    type: 'number'
                  },
                },
                example: {
                  stakeAmount: 450,
                  state: 'JOINED | DISCONNECTED | ENDED',
                }
              }}}
            }
          }
        }
      }
    },
  });
};
