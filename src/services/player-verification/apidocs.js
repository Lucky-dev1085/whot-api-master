'use strict';

module.exports = function() {
  const apidocs = reqlib('_/modules/apidocs', true);
  if (!apidocs) {
    return;
  }

  apidocs.spec.update({
    paths: {
      '/player-verification': {
        'post': {
          tags: ['Authentication'],
          summary: 'Set verification status and timestamp for player mobile number',
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
                  mobileVerificationTimestamp: {
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
