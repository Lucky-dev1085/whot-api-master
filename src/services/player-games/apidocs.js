'use strict';

module.exports = function() {
  const apidocs = reqlib('_/modules/apidocs', true);
  if (!apidocs) {
    return;
  }

  apidocs.spec.update({
    paths: {
      '/player-games': {
        'get': {
          tags: ['Game Tables'],
          summary: `Get the list of tables scheduled to start in the near future.`,
          parameters: [ ],
          responses: {
            200: {
              description: 'OK',
              content: { 'application/json': { schema: {
                type: 'object',
                properties: {
                  userId: {
                    type: 'number'
                  },
                  gameTable: {
                    $ref: "#/components/schemas/GameTable"
                  },
                  tournament: {
                    $ref: "#/components/schemas/Tournament"
                  },
                }
              }}}
            }
          }
        }
      }
    },
  });
};
