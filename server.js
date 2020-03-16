'use strict';

const express = require('express');
const { Server } = require('ws');

const PORT = process.env.PORT || 30000;

const server = express()
  .use((req, res) => {
    res.json({status: 'Connected'});
  })
  .listen(PORT, () => console.log(`Listening on ${PORT}`));

const wss = new Server({ server });

var GameManager = require('./GameManager')
var gm = new GameManager(2, 2);

wss.on('connection', (ws, req) => {
  ws.on('message', (message) => {
    gm.handleMessage(ws, JSON.parse(message))
  });
  ws.on('close', () => gm.onDisconnect(ws));
});
