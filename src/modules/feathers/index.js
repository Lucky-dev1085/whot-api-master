'use strict';

const _ = require('lodash');

const compression = require('compression');
const cors = require('cors');
const helmet = require('helmet');
const responseTime = require('response-time');
const cookieParser = require('cookie-parser');

const feathers = require('@feathersjs/feathers');
const express = require('@feathersjs/express');
const socketio = require('@feathersjs/socketio');

const setupApp = require('./setup/app');
const hooks = require('./setup/hooks');
const modules = require('./setup/modules');
const services = require('./setup/services');

const createNamespace = require('cls-hooked').createNamespace;

const app = global.app = module.exports = express(feathers());
app.express = express;

setupApp();

app.use(responseTime());
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(helmet());
app.use(compression());

app.use('/', express.static(
  config.get('public.root'), _.get(config, 'public.options', {})
));

app.use(cookieParser(config.secret));
app.use(express.json());
app.use(express.urlencoded({extended: true}));

// create a CLS namespace to set/get data throughout a request's life:
app.cls = createNamespace('request-context');
app.use(function(req, res, next) {
  app.cls.run(function() {
    next();
  });
});

app.configure(express.rest());

// Configure Socket.io real-time APIs
app.configure(socketio());

// provide access to req and res to services and hooks:
app.use(function(req, res, next) {
  req.feathers.req = req;
  req.feathers.res = res;
  next();
});

app.configure(modules('bootstrap'));
app.configure(hooks);
app.configure(services);
app.configure(modules('init'));

app.use(express.notFound());
app.use(express.errorHandler());
