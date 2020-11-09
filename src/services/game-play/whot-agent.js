/**
 * Created by Aristotle on 19/09/2019.
 */
const { Card } = require('./cards');
const lodash = require('lodash');

class Robot{

  constructor(name, deck) {
    this.name = name;
    this.deck = deck || [];
    this.remainingGotoMarket = 0
  }

  addCardsToPlayersDeck(cards) {
    if(Array.isArray(cards)) {
      for (let card_ of cards) {
        this.deck.push(new Card(card_['suit'], parseInt(card_['rank'])));
      }
    }
    else if (!cards) {
      throw new Exception("Received undefined card");
    }
    else {
      this.deck.push(new Card(cards['suit'], parseInt(cards['rank'])));
    }
  }

  getScore() {
    return lodash.sumBy(this.deck, 'rank');
  }

  getAutoPlay(upCard, nextAgent, protectNext) {
    const playPickTwo = config.robotPlaysPickTwo || '0';
    const protectFromPickTwo = protectNext && parseInt(playPickTwo) === 0;

    if (this.remainingGotoMarket > 0) {
      return { gotoMarket: true };
    }

    let playCardIndex = -1;

    for (let index in this.deck) {
      const card = this.deck[index];

      if (card.suit !== upCard.suit && card.rank !== upCard.rank) {
        // Only pick cards that are eligible for play
        continue;
      }
      if (protectFromPickTwo && card.rank === 2) {
        // Don't hurt the next player
        continue;
      }
      if (playCardIndex < 0) {
        // Try and play first maching card
        playCardIndex = index;
        continue;
      }
      if(this.deck[playCardIndex].rank > card.rank) {
        // Try to lose by keeping the large ranks in hand
        playCardIndex = index;
      }
    }

    if (playCardIndex < 0) {
      return { gotoMarket: true };
    }
    else {
      return { playCard: playCardIndex };
    }
  }
}

module.exports = { Robot };
