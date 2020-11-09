const { random } = require('lodash');

function generateCode() {
  return `000000${random(1000000)}`.slice(-6);
}

module.exports = {
  generateCode,
};
