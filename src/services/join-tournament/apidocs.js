'use strict';

module.exports = function() {
  const apidocs = reqlib('_/modules/apidocs', true);
  if (!apidocs) {
    return;
  }

  apidocs.spec.update({
    paths: {
      '/join-tournament': {
        'post': {
          tags: ['Tournaments'],
          summary: `
Deposit the stake amount and join the tournament.`,
          parameters: [ ],
          requestBody: {
            content: { 'application/json': { schema: {
              type: 'object',
              properties: {
                tournamentId: {
                  type: 'number',
                },
                stakeAmount: {
                  type: 'number',
                },
              },
              example: {
                tournamentId: 1230,
                stakeAmount: 450,
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
