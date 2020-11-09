'use strict';

module.exports = function() {
  const apidocs = reqlib('_/modules/apidocs', true);
  if (!apidocs) {
    return;
  }

  apidocs.spec.update({
    paths: {
      '/player-account-funding': {
        'post': {
          tags: ['Player Deposits'],
          summary: 'Deposit funds using promotion codes or paystack',
          parameters: [],
          requestBody: {
            content: { 'application/json': { schema: {
              type: 'object',
              properties: {
                serial: {
                  type: 'string'
                },
              },
              example: {
                serial: '11441133',
              }
            }}}
          },
          responses: {
            201: {
              description: 'OK',
              content: { 'application/json': { schema: {
                type: 'object',
                properties: {
                  amount: {
                    type: 'number'
                  },
                  origin: {
                    type: 'string'
                  },
                  originDetail: {
                    type: 'string'
                  },
                  message: {
                    type: 'string'
                  },
                },
                example: {
                  amount: 450,
                  origin: 'paystack | promotion_code',
                  originDetail: 'paystack refid | serial',
                  message: 'Deposit registered'
                }
              }}}
            }
          }
        }
      }
    },
  });
};
