'use strict'
const lodash = require('lodash');
const moment = require('moment');
const { Card, makeNewDeck, shuffleTwice } = require("./cards");
const { Robot } = require('./whot-agent.js');

const getAgentName = function getAgentName(playerId) {
  return `${playerId}`;
}

class Whot {
  constructor(state) {
    this.startCardCount = 4;

    this.deck = [];
    this.playedDeck = [];
    this.gamePlaySequence = 0;
    this.advancingPlayerCount = 1;

    this.playerTurnStartedAt = moment().toISOString();
    if (state) {
      this.hydrate(state);
    }
  }

  hydrateCardList(dehydrated) {
    let deck = [];
    for (let card of dehydrated) {
      deck.push(new Card(card.suit, card.rank));
    }
    return deck;
  }

  hydrateAgent(dehydrated) {
    return new Robot(dehydrated.name, this.hydrateCardList(dehydrated.deck));
  }

  hydrate(state) {
    this.deck = this.hydrateCardList(state.deck);
    this.playedDeck = this.hydrateCardList(state.playedDeck);
    this.gamePlaySequence = state.gamePlaySequence;
    this.playerTurnStartedAt = state.playerTurnStartedAt;
    this.disconnected = state.disconnected;
    this.advancingPlayerCount = state.advancingPlayerCount;

    this.players = state.players;
    this.currentPlayerIndex = state.currentPlayerIndex;

    this.agents = state.agents.map((agentState) => this.hydrateAgent(agentState));
    this.upCard = new Card(state.upCard.suit, state.upCard.rank);

    this._setNextPlayer();
    return this;
  }

  startNewGame(humanPlayers, playerCount, advancingPlayerCount) {
    console.log(`Starting new ${playerCount} player game (${humanPlayers.length} humans).`);
    this.deck = makeNewDeck();
    this.playedDeck = [];
    this.gamePlaySequence = 0;
    this.disconnected = false;
    this.advancingPlayerCount = advancingPlayerCount || 1;

    if (humanPlayers.length > playerCount) {
      playerCount = humanPlayers.length;
    }
    this.players = this.makePlayers(humanPlayers, playerCount);
    this.currentPlayerIndex = 0;

    this.agents = this.players.map((player) => new Robot(getAgentName(player.id)));
    this.dealAgentStartCards(this.startCardCount);

    this.upCard = this.dealUpCard();
    this._setNextPlayer();
  }

  _setNextPlayer(advanceCurrentPlayer) {
    const direction = -1; // anti-clockwise
    const advance = advanceCurrentPlayer ? direction : 0;

    this.currentPlayerIndex = this._advancePlayerIndex(this.currentPlayerIndex, advance);
    this.currentPlayerId = this.players[this.currentPlayerIndex].id;

    this.nextPlayerIndex = this._advancePlayerIndex(this.currentPlayerIndex, direction);
    this.nextAgent = this.agents[this.nextPlayerIndex];
    console.log(`It's ${this.agents[this.currentPlayerIndex].name} turn, next is: ${this.nextAgent.name}'`);
  }

  _advancePlayerIndex(index, advance) {
    let advancedIndex = index + advance;
    while (advancedIndex < 0) {
      advancedIndex = advancedIndex + this.agents.length;
    }
    return advancedIndex % this.agents.length;
  }

  makePlayers(humanPlayers, playerCount) {
    const players = [];
    for (let i=0; i<playerCount; i++) {
      if ( i < humanPlayers.length) {
        players.push({
          id: `${humanPlayers[i].id}`,
          name: humanPlayers[i].player_detail.name,
          userId: humanPlayers[i].player_detail.userId,
          index: i,
          isRobot: false
        });
      } else {
        players.push({
          id: `Player-${i+1}: WhotAI`,
          name: 'Whot AI',
          index: i,
          isRobot: true
        });
      }
    }
    return players;
  }

  getPlayerPublicInfo(includePlayerDeck, playerList) {
    let players = playerList || this.players;
    return players.map((p) => Object.assign({
      name: p.name,
      deck: null,
      isRobot: p.isRobot,
      cardCount: this.agents[p.index].deck.length,
    }, includePlayerDeck && {
      deck: this.agents[p.index].deck
    }));
  }

  getCurrentPlayerName() {
    return this.players[this.currentPlayerIndex].name;
  }

  isCurrentPlayerARobot() {
    return this.players[this.currentPlayerIndex].isRobot;
  }

  isForecdToMarket() {
    const agent = this.agents[this.currentPlayerIndex];
    return agent.remainingGotoMarket > 0;
  }

  hasCurrentPlayerTimedOut(timeoutSeconds) {
    const timeoutTime = moment(this.playerTurnStartedAt).add(timeoutSeconds, 'seconds');
    return timeoutTime < moment();
  }

  dealUpCard() {
    let upCard = this.deck.shift();
    this.playedDeck.push(upCard);
    return upCard;
  }
  
  dealAgentStartCards(startCardCount) {
    for (let i = 0; i < startCardCount; i++) {
      for (let agent of this.agents) {
        agent.addCardsToPlayersDeck(this.deck.shift());
      }
    }
  }

  getPlayerAgent(playerId) {
    const agentName = getAgentName(playerId);
    for (let agent of this.agents) {
      if (agent.name === agentName) {
        return agent;
      }
    }
    return null;
  }

  getPlayerDeck(playerId) {
    const agent = this.getPlayerAgent(playerId);
    return agent && agent.deck;
  }

  ensureDeck(availableCount) {
    if (this.deck.length >= availableCount) {
      return;
    }
    this.deck.push(...shuffleTwice(this.playedDeck));
  }

  gotoMarket(agent) {
    this.ensureDeck(1);
    let marketCard = this.deck.shift();
    console.log(`${agent.name} goes to market, collects ${marketCard}`);
    agent.addCardsToPlayersDeck(marketCard);
  }

  pickTwo(agent) {
    console.log(`${agent.name} must pick two.`);
    agent.remainingGotoMarket = 2;
  }

  forceGotoMarket(agent) {
    this.ensureDeck(1);
    let marketCard = this.deck.shift();
    console.log(`${agent.name} forcced to goto market (${3-agent.remainingGotoMarket}/2), collects ${marketCard}`);
    agent.addCardsToPlayersDeck(marketCard);
    agent.remainingGotoMarket = agent.remainingGotoMarket - 1;
    if (agent.remainingGotoMarket <= 0) {
      this._setNextPlayer(true);
    }
  }

  suspend(agent) {
    console.log(`${agent.name} is suspended`);
    this._setNextPlayer(true);
  }

  validatePlayCard(playCard) {
    if (this.upCard.rank != playCard.rank && this.upCard.suit != playCard.suit) {
      return false
    }
    return true;
  }

  playCard(agent, playCardIndex, playContinue, whotFollowUpSuit) {
    if (playCardIndex < 0 || playCardIndex >= agent.deck.length) {
      return false;
    }
    const playCard = agent.deck[playCardIndex];
    console.log(`${agent.name} plays ${playCard} over ${this.upCard}`);

    if (!this.validatePlayCard(playCard)) {
      return false;
    }
    agent.deck.splice(playCardIndex, 1);
    this.playedDeck.push(playCard);
    this.upCard = playCard;

    if (playCard.rank === 2) {
      this.pickTwo(this.nextAgent);
    }
    if (playCard.rank === 8) {
      this.suspend(this.nextAgent);
    } else
    if (playContinue && playContinue.length > 0) {
      for (let playCard of continues) {
        this.playCard(agent, playCard);
      }
    }
    return true;
  }

  applyPlay(playerId, play) {
    const agent = this.getPlayerAgent(playerId);
    if (!agent) {
      console.log(`Player agent not found: ${playerId}`);
      return false;
    }
    let validPlay = true;
    let gameEnded = false;

    if (agent.remainingGotoMarket > 0) {
      this.forceGotoMarket(agent);
    }
    else if (play['gotoMarket']) {
      this.gotoMarket(agent);
    }
    else if (play['playCard'] || play['playCard'] === 0) {
      validPlay = this.playCard(agent, play['playCard'], play['continue'], play['whotFollowUpSuit']);
      if (validPlay) {
        gameEnded = gameEnded || agent.deck.length <= 0;
      }
    }
    else {
      validPlay = false;
    }

    gameEnded = gameEnded || this.deck.length <= 0;
    if (validPlay) {
      this.gamePlaySequence = this.gamePlaySequence + 1;
      if (!gameEnded) {
        this._setNextPlayer(true);
        this.playerTurnStartedAt = moment().toISOString();
      }
    }
    if (gameEnded) {
      const { winners, runnerUps } = this.getWinners();
      const winnerNames = winners.map((player) => player.name);
      const runnerUpNames = runnerUps.map((player) => player.name);
      console.log(`Game ended, winner(s): ${winnerNames}, runner-up(s): ${runnerUpNames}`);
    }
    return { validPlay, gameEnded };
  }

  getAutoPlay() {
    const agent = this.agents[this.currentPlayerIndex];
    const nextAgent = this.agents[this.nextPlayerIndex];
    const nextPlayer = this.players[this.nextPlayerIndex];

    return Object.assign({
      player: this.getCurrentPlayerName(),
    }, agent.getAutoPlay(this.upCard, nextAgent, !nextPlayer.isRobot));
  }

  setDisconnected() {
    this.disconnected = true;
  }

  isGameOver() {
    if (this.disconnected || this.deck.length <= 0) {
      return true;
    }
    for (let agent of this.agents) {
      if (agent.deck.length <= 0) {
        return true;
      }
    }
    return false;
  }

  getWinners(options) {
    let scoreList = this.agents.map((agent) => agent.getScore());
    let sortedScores = [...(new Set(scoreList))];
    sortedScores.sort();

    let playerRanking = sortedScores.map((score) => ({ score, players: [] }));
    const onlyHumans = options && options.onlyHumans;

    if (sortedScores.length === 1) {
      playerRanking[0].players = this.players.filter((p) => !onlyHumans || !p.isRobot);
      return {
        winners: playerRanking[0].players,
        runnerUps: [],
        playerRanking
      };
    }

    for (let i = 0; i < scoreList.length; i++) {
      const player = this.players[i];
      if (onlyHumans && player.isRobot) {
        continue;
      }

      for (let rankIndex = 0; rankIndex < playerRanking.length; rankIndex++) {
        const rankLevel = playerRanking[rankIndex];
        if (scoreList[i] == rankLevel.score) {
          rankLevel.players.push(player);
          break;
        }
      }
    }

    let topPlayers = [];
    for (let ranking of playerRanking) {
      for (let player of ranking.players) {
        topPlayers.push(Object.assign({ score: ranking.score }, player));
      }
    }

    if (this.advancingPlayerCount === -1) {
      return {runnerUps: [], topPlayers, playerRanking, winners: topPlayers.slice(0, this.advancingPlayerCount)}
    }
    else if (this.advancingPlayerCount === 2) {
      return {runnerUps: [], topPlayers, playerRanking, winners: topPlayers.slice(0, this.advancingPlayerCount)}
    }
    else if (this.advancingPlayerCount === 3) {
      return {runnerUps: [], topPlayers, playerRanking, winners: topPlayers.slice(0, this.advancingPlayerCount)}
    }

    return { winners: playerRanking[0].players, runnerUps: playerRanking[1].players, topPlayers, playerRanking };
  }

  getGameStatus() {
    const isGameOver = this.isGameOver();

    const { winners, runnerUps, playerRanking } = isGameOver ? this.getWinners(): {};
    let players = [];
    if (isGameOver) {
      for (let rankIndex = 0; rankIndex < playerRanking.length; rankIndex++) {
        let rankedPlayers = this.getPlayerPublicInfo(true, playerRanking[rankIndex].players);
        rankedPlayers = rankedPlayers.map((p) => Object.assign(p, { rank: rankIndex }));
        players = [...players, ...rankedPlayers];
      }
    } else {
      players = this.getPlayerPublicInfo()
    }

    return Object.assign({
      eventType: 'gamePlayEvent',
      status: 'live',
      players: players,
      nextPlayer: this.getCurrentPlayerName(),
      upCard: this.upCard,
      tableDeckCount: this.deck.length,
      playedDeck: this.playedDeck,
      gamePlaySequence: this.gamePlaySequence,
      playerTurnStartedAt: this.playerTurnStartedAt,
      isForecdToMarket: this.isForecdToMarket()
    }, isGameOver && {
      status: 'ended',
      winners: winners.map((player) => player.name),
      runnerUps: runnerUps.map((player) => player.name),
    });
  }
}

module.exports = { Whot };
