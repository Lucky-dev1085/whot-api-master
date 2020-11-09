'use strict';

module.exports = function() {
  const apidocs = reqlib('_/modules/apidocs', true);
  if (!apidocs) {
    return;
  }

  apidocs.spec.update({
    paths: {
      '/player-available': {
        'get': {
          tags: ['Authentication'],
          summary: 'Check uniqueness of usernames, emails or promotion code validity',
          parameters: [
            {
              name: 'name',
              in: 'query',
              description: 'Player username / nickname',
              required: false,
              schema: {
                type: 'string',
              },
              example: 'Jon Snow'
            },
            {
              name: 'email',
              in: 'query',
              description: 'Player email',
              required: true,
              schema: {
                type: 'string',
              },
              example: 'jon.snow@example.com'
            },
            {
              name: 'serial',
              in: 'query',
              description: 'Promo code serial number',
              required: true,
              schema: {
                type: 'string',
              },
              example: '12345678'
            }
          ],
          responses: {
            200: {
              description: 'OK',
              content: { 'application/json': { schema: {
                type: 'object',
                properties: {
                  available: {
                    type: 'boolean'
                  },
                },
                example: {
                  available: true,
                }
              }}}
            }
          }
        }
      }
    },
  });
};
