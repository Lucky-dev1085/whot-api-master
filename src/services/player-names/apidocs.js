'use strict';

module.exports = function() {
  const apidocs = reqlib('_/modules/apidocs', true);
  if (!apidocs) {
    return;
  }

  apidocs.spec.update({
    paths: {
      '/player-names': {
        'get': {
          tags: ['Game Tables'],
          summary: 'Search player names and return a few suggestions of players to invite',
          parameters: [
            {
              name: 'nameSearch',
              in: 'query',
              description: 'Player username / nickname',
              required: true,
              schema: {
                type: 'string',
              },
              example: 'Jon S'
            }
          ],
          responses: {
            200: {
              description: 'OK',
              content: { 'application/json': { schema: {
                type: 'object',
                properties: {
                  count: {
                    type: 'number'
                  },
                },
                example: {
                  count: 0,
                  player_details: [
                    {
                      id: 123,
                      name: 'Jon Snow'
                    }
                  ]
                }
              }}}
            }
          }
        }
      }
    },
  });
};
