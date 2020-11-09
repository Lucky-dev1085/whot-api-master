'use strict';

module.exports = function() {
  const apidocs = reqlib('_/modules/apidocs', true);
  if (!apidocs) {
    return;
  }

  apidocs.spec.update({
    paths: {
      '/player-bank-accounts-verification': {
        'post': {
          tags: ['Player Bank Accounts'],
          summary: 'Set verification status and timestamp for a player bank account',
          parameters: [],
          requestBody: {
            content: { 'application/json': { schema: {
              type: 'object',
              properties: {
                token: {
                  type: 'string'
                },
                code: {
                  type: 'string'
                },
              },
              example: {
                token: 'C0E809B5-FEC5-4BE1-843D-EFC22DA5C0E0',
                code: '023456',
              }
              
            }}}
          },
          responses: {
            200: {
              description: 'OK',
              content: { 'application/json': { schema: {
                type: 'object',
                properties: {
                  verifiedAt: {
                    type: 'string',
                    format: 'date',
                  },
                },
                example: {
                  mobileVerificationTimestamp: '2019-09-01 12:00:00.00Z',
                }
              }}}
            }
          }
        }
      }
    },
  });
};
