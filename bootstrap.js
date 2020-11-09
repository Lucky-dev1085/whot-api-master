'use strict';

require('./src/modules/bootstrap');

if (process.env.NODE_ENV != 'production') {
  require('babel-register');
}
