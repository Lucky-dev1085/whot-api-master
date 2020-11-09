'use strict';

const _ = require('lodash');

global.rootdir = require('app-root-path').toString();

global.config = require('./setup/config');

global.basedir = _.get(config, 'paths.basedir', rootdir);

global.reqlib = require('./setup/reqlib');
