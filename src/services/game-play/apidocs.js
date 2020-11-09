'use strict';

module.exports = function() {
  const apidocs = reqlib('_/modules/apidocs', true);
  if (!apidocs) {
    return;
  }

  apidocs.spec.update({
    paths: {
      '/game-play/{id}': {
        'get': {
          tags: ['Game Tables'],
          summary: 'Get the game play status for the current player',
          parameters: [
            {
              name: 'id',
              in: 'path',
              description: 'Game table id',
              required: true,
              schema: {
                type: 'number',
              },
              example: '12354'
            },
            {
              name: 'gamePlaySequence',
              in: 'query',
              description: 'Sequence number of the game play notification that should be retrieved (or latest status if missing)',
              required: false,
              schema: {
                type: 'number',
              },
              example: '12'
            }
          ],
          responses: {
            200: {
              description: 'OK',
              content: { 'application/json': { schema: {
                type: 'object',
                properties: {
                  eventType: {
                    type: 'string',
                    enum: ['gamePlayEvent', 'playerEvent']
                  },
                  status: {
                    type: 'string',
                    enum: ['notStarted', 'live', 'ended']
                  },
                  gameType: {
                    type: 'string',
                    enum: ['TOURNAMENT', 'PUBLIC', 'PRIVATE']
                  },
                  tournament: {
                    type: 'object',
                    properties: {
                      id: {
                        type: 'number'
                      },
                      tournamentTitle: {
                        type: 'string',
                      },
                      tournamentStage: {
                        type: 'string',
                      },
                      totalRounds: {
                        type: 'number'
                      },
                      currentRoundNo: {
                        type: 'number'
                      },
                      currentRoundLiveTableCount: {
                        type: 'number'
                      },
                    }
                  },
                  gamePlaySequence: {
                    type: 'number'
                  },
                  players: {
                    type: 'array',
                    items: { type: 'string' }
                  },
                  nextPlayer: {
                    type: 'string'
                  },
                  playerTurnStartedAt: {
                    type: 'string',
                    format: 'date'
                  },
                  upCard: {
                    type: 'object',
                    properties: {
                      suit: {
                        type: 'string',
                        enum: ['star', 'circle', 'triangle', 'cross', 'square'],
                      },
                      rank: {
                        type: 'number'
                      },
                    }
                  },
                  tableDeckCount: {
                    type: 'number'
                  },
                  winners: {
                    type: 'array',
                    items: { type: 'string' }
                  },
                  runnerUps: {
                    type: 'array',
                    items: { type: 'string' }
                  },
                  deck: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        suit: {
                          type: 'string',
                          enum: ['star', 'circle', 'triangle', 'cross', 'square'],
                        },
                        rank: {
                          type: 'number'
                        },
                      }
                    }
                  }
                },
                example: {
                  eventType: 'gamePlayEvent',
                  status: 'live',
                  gamePlaySequence: 5,
                  nextPlayer: 'Big Jack 500',
                  players: ['Big Jack 500', 'James', 'Joe', 'PowerRanger', 'Whot AI'],
                  upCard: { suit: 'star', rank: 2 },
                  deck: [{ suit: 'star', rank: 8 }, { suit: 'cross', rank: 2 }],
                  tableDeckCount: 15,
                  winners: null,
                  runnerUps: null,
                }
              }}}
            }
          }
        },
        'delete': {
          tags: ['Game Tables'],
          summary: 'Remove a game play notification from the players notifications',
          parameters: [
            {
              name: 'id',
              in: 'path',
              description: 'Game table id',
              required: true,
              schema: {
                type: 'number',
              },
              example: '12354'
            },
            {
              name: 'gamePlaySequence',
              in: 'query',
              description: 'Sequence number of the game play notification that should be removed',
              required: true,
              schema: {
                type: 'number',
              },
              example: '12'
            }
          ],
          responses: {
            200: {
              description: 'OK',
            }
          },
        }
      },
      '/game-play': {
        'post': {
          tags: ['Game Tables'],
          summary: 'Submit a new move to the game engine',
          parameters: [
          ],
          requestBody: {
            content: { 'application/json': { schema: {
              type: 'object',
              properties: {
                gameTableId: {
                  type: 'number'
                },
                playCard: {
                  type: 'number'
                },
                gotoMarket: {
                  type: 'boolean'
                },
              },
              example: {
                gameTableId: 1254,
                playCard: "3 - (number) index of card from player deck",
                gotoMarket: true,
              }
            }}}
          },
          responses: {
            200: {
              description: 'OK',
              content: { 'application/json': { schema: {
                type: 'object',
                properties: {
                  eventType: {
                    type: 'string',
                    enum: ['gamePlayEvent', 'playerEvent']
                  },
                  status: {
                    type: 'string',
                    enum: ['notStarted', 'live', 'ended']
                  },
                  gamePlaySequence: {
                    type: 'number'
                  },
                  players: {
                    type: 'array',
                    items: { type: 'string' }
                  },
                  nextPlayer: {
                    type: 'string'
                  },
                  upCard: {
                    type: 'object',
                    properties: {
                      suit: {
                        type: 'string',
                        enum: ['star', 'circle', 'triangle', 'cross', 'square'],
                      },
                      rank: {
                        type: 'number'
                      },
                    }
                  },
                  tableDeckCount: {
                    type: 'number'
                  },
                  winners: {
                    type: 'array',
                    items: { type: 'string' }
                  },
                  runnerUps: {
                    type: 'array',
                    items: { type: 'string' }
                  },
                  deck: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        suit: {
                          type: 'string',
                          enum: ['star', 'circle', 'triangle', 'cross', 'square'],
                        },
                        rank: {
                          type: 'number'
                        },
                      }
                    }
                  },
                  play: {
                    type: 'object',
                    properties: {
                      playCard: {
                        type: 'number'
                      },
                      gotoMarket: {
                        type: 'boolean'
                      },
                      player: {
                        type: 'string'
                      },
                    }
                  }
                },
                example: {
                  nextPlayer: 'Big Jack 500',
                  players: ['Big Jack 500', 'James', 'Joe', 'PowerRanger', 'Whot AI'],
                  upCard: { suit: 'star', rank: 2 },
                  deck: [{ suit: 'star', rank: 8 }, { suit: 'cross', rank: 2 }],
                  play: {
                    player: 'PowerRanger',
                    playCard: "3 - (number) index of card from player deck",
                    gotoMarket: true,
                  },
                  tableDeckCount: 0,
                  winners: ['PowerRanger', 'James'],
                }
              }}}
            }
          }
        },
      }
    },
  });
};
