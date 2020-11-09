/**
 * Created by Aristotle on 18/09/2019.
 */

'use strict'

const lodash = require('lodash');

class Card {
  constructor(suit, rank) {
    this.suit = suit;
    this.rank = rank;
  }

  toString() {
    return '{"suit":"'+this.suit+'", "rank": "'+this.rank+'"}';
  }
}

const shuffleTwice = function shuffleTwice(deck) {
  deck = lodash.shuffle(deck);
  deck = lodash.shuffle(deck);

  return deck;
};

const makeNewDeck = function makeNewDeck() {
  let deck = [];
  let whotCards = {
    'star':     [1, 2, 3, 4, 5, 7, 8],
    'circle':   [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14],
    'triangle': [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14],
    'cross':    [1, 2, 3, 5, 7, 10, 11, 13, 14],
    'square':   [1, 2, 3, 5, 7, 10, 11, 13, 14],

    // Whot card is disabled
    // 'whot':	[20, 20, 20, 20, 20],
  };

  for (let suit in whotCards){
    let ranks = whotCards[suit];
    for (let rank of ranks) {
      let card = new Card(suit, rank);

      // append to deck
      deck.push(card);
    }
  }

  // shuffle cards twice
  deck = shuffleTwice(deck);
  return deck;
};

module.exports = { Card, makeNewDeck, shuffleTwice };
