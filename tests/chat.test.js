/* eslint arrow-body-style: ["off"] */
/* eslint global-require: ["off"] */

'use strict';
const { assert } = require('chai');
const models = reqlib('_/src/models');

module.exports = function suite() {

  beforeEach(async function() {
    let response = await this.testState.api.postUsers({ json: {
      email: "user@example.com",
      name: 'BigJack500',
      termsAgreed: true,
      password: "password",
    }});
    assert.equal(response.status, 201);

    response = await this.testState.api.postAuthLogin({ json: {
      "email": "user@example.com",
      "password": "password"
    }});
    assert.equal(response.status, 200);
    this.testState.api.authorizationBearer(response.data.jwt);
    const user = response.data.user;

    const pdResponse = await this.testState.api.getPlayerDetails({userId: user.id});
    assert.equal(pdResponse.status, 200);

    assert.equal(pdResponse.data.data.length, 1);
    this.testState.playerDetail = pdResponse.data.data[0];
    assert.isOk(this.testState.playerDetail.id);
  });

  afterEach(async function() {
    const response = await this.testState.api.postAuthLogin({ json: {
      "email": "admin@example.com",
      "password": "password"
    }});
    assert.equal(response.status, 200);
    this.testState.api.authorizationBearer(response.data.jwt);
  });

  it('should be denied chat when not-authenticated', async function () {
    this.testState.api.authorizationBearer('Not-Authenticated');
    try {
      await this.testState.api.getChatMessages({});
      assert.fail('Should fail with 401');
    } catch(e) {
      if (`${e}`.startsWith('AssertionError')) {
        throw e;
      }
      assert.equal(e.response.status, 401);
      assert.equal(e.response.data.message, 'Must be logged-in to get messages');
    }
  });

  it('should be denied chat without a game table', async function () {
    try {
      await this.testState.api.getChatMessages({});
      assert.fail('Should fail with 400');
    } catch(e) {
      if (`${e}`.startsWith('AssertionError')) {
        throw e;
      }
      assert.equal(e.response.status, 400);
      assert.equal(e.response.data.message, 'User chat is only enabled during game play');
    }
  });

  it('should be able to chat on game table', async function () {
    const gameTablesResponse = await this.testState.api.postGameTables({json: {
      playerDetailId: this.testState.playerDetail.id,
      tableTitle: "Big Jacck's monster table",
    }});
    assert.equal(gameTablesResponse.status, 201);
    assert.isOk(gameTablesResponse.data.chatRoomId);

    let messagesResponse = await this.testState.api.getChatMessages();
    assert.equal(messagesResponse.status, 200);
    assert.equal(messagesResponse.data.data.length, 0);

    messagesResponse = await this.testState.api.postChatMessages({ json: {
      text: "Hello there"
    }});
    assert.equal(messagesResponse.status, 201);
    assert.equal(messagesResponse.data.chatRoomId, gameTablesResponse.data.chatRoomId);

    messagesResponse = await this.testState.api.getChatMessages();
    assert.equal(messagesResponse.status, 200);
    assert.equal(messagesResponse.data.data.length, 1);

    let message = messagesResponse.data.data[0];
    assert.equal(message.senderId, this.testState.playerDetail.userId);
    assert.equal(message.chatRoomId, gameTablesResponse.data.chatRoomId);
  });

  it('should not mix chats from different tables', async function () {
    await this.testState.api.postGameTables({json: {
      playerDetailId: this.testState.playerDetail.id,
      tableTitle: "Big Jacck's monster table",
    }});
    let msg1Response = await this.testState.api.postChatMessages({ json: {
      text: "Hello there",
      senderName: '',
      contentUrl: '',
      contentType: '',
    }});
    assert.equal(msg1Response.status, 201);
    assert.equal(msg1Response.data.senderName, 'BigJack500');


    // New user, new table
    let response = await this.testState.api.postUsers({ json: {
      email: "teacher@example.com",
      name: 'Teachers1977',
      termsAgreed: true,
      password: "password",
    }});
    assert.equal(response.status, 201);

    response = await this.testState.api.postAuthLogin({ json: {
      "email": "teacher@example.com",
      "password": "password"
    }});
    assert.equal(response.status, 200);
    this.testState.api.authorizationBearer(response.data.jwt);
    let user2 = response.data.user;

    await this.testState.api.postGameTables({json: {
      playerDetailId: user2.playerDetail.id,
      tableTitle: "Teacher's table",
    }});

    let messagesResponse = await this.testState.api.getChatMessages();
    assert.equal(messagesResponse.status, 200);
    assert.equal(messagesResponse.data.data.length, 0);

    await this.testState.api.postChatMessages({ json: { text: "Welcome" }});
    await this.testState.api.postChatMessages({ json: { text: "Please join" }});

    messagesResponse = await this.testState.api.getChatMessages();
    assert.equal(messagesResponse.status, 200);
    assert.equal(messagesResponse.data.data.length, 2);
  });
}
