/* eslint arrow-body-style: ["off"] */
/* eslint global-require: ["off"] */

'use strict';
const { assert } = require('chai');

module.exports = function suite() {
  it('should return 200 OK on root endpoint', async function () {
    const response = await this.testState.api.get();

    assert.exists(response);
    assert.equal(response.status, 200);
    assert.isOk(response.data.indexOf('API Serve') >= 0);
    assert.isOk(response.data.indexOf('Hello') >= 0);
    assert.isOk(response.data.indexOf('API docs') >= 0);
  });
};
