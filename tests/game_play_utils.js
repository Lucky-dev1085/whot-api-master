/* eslint arrow-body-style: ["off"] */

async function sleep(delay) {
  await new Promise(resolve => setTimeout(resolve, delay));
}

module.exports.playGame = async function playGame(api, gameTableId, playerDetail, playerAuth) {
  let headers = Object.assign({}, playerAuth && { Authorization: `Bearer ${playerAuth}`});
  let response = await api.getGamePlay(gameTableId, { headers });

  while (!response || response.data.status !== 'ended') {
    if (response.data.nextPlayer === playerDetail.name) {
      const deck = response.data.deck;
      const upCard = response.data.upCard;
      let playCardIndex = -1;

      for (let index in deck) {
        const card = deck[index];
        if (card.suit === upCard.suit || card.rank === upCard.rank) {
          playCardIndex = index;
          break;
        }
      }

      if (playCardIndex < 0) {
        response = await api.postGamePlay({ headers, json: {
          gameTableId: gameTableId,
          gotoMarket: true,
        }});
      } else {
        response = await api.postGamePlay({ headers, json: {
          gameTableId: gameTableId,
          playCard: playCardIndex,
        }});
      }
    } else {
      response = await api.getGamePlay(gameTableId, { headers });

      const ackResponse = await api.deleteGamePlay(gameTableId, {
        headers,
        gamePlaySequence: response.data.gamePlaySequence
      });
    }
    await sleep(200);
  }
  return response;
};

module.exports.sleep = sleep;
