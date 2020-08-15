'use strict';

const axios = require('axios');
const ZaifApi = require('./zaif/zaifApi');
const zaifApi = new ZaifApi();

let botIntervalId = 0;

let tradeAmount = 0.02;
let buyPriceDeff = 500;
let sellPriceDeff = 500;
let orderLimitMinuits = 120;

const restify = require('restify');

const { BadRequestError, NotFoundError, InternalError } = require('restify-errors');
const server = restify.createServer();

server.use(restify.plugins.acceptParser(server.acceptable));
server.use(restify.plugins.queryParser());
server.use(restify.plugins.bodyParser());

const allowCors = (res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Authorization, Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
};

server.post('/bottrade/start', async (req, res, next) => {
  if (botIntervalId != 0) {
    // already started
  } else {
    botTradeFunc();
    botIntervalId = setInterval(botTradeFunc, 5 * 60 * 1000);
  }

  res.send(200, {
    result: 'bottrade start!',
  });
});

server.post('/bottrade/stop', async (req, res, next) => {
  if (botIntervalId != 0) {
    clearInterval(botIntervalId);
    botIntervalId = 0;
  } else {
    // not running
  }

  res.send(200, {
    result: 'bottrade stop',
  });
});

server.get('/bottrade/setting', async (req, res, next) => {
  res.send(200, {
    botIntervalId: botIntervalId,
    tradeAmount: tradeAmount,
    buyPriceDeff: buyPriceDeff,
    sellPriceDeff: sellPriceDeff,
    orderLimitMinuits: orderLimitMinuits,
  });
});

server.patch('/bottrade/setting', async (req, res, next) => {
  console.log(req.body);
  botIntervalId = Number(req.body.interval);
  tradeAmount = Number(req.body.amount);
  buyPriceDeff = Number(req.body.buydeff);
  sellPriceDeff = Number(req.body.selldeff);
  orderLimitMinuits = Number(req.body.limitminuits);
  res.send(200, {
    botIntervalId: botIntervalId,
    tradeAmount: tradeAmount,
    buyPriceDeff: buyPriceDeff,
    sellPriceDeff: sellPriceDeff,
    orderLimitMinuits: orderLimitMinuits,
  });
});

server.listen(3001, () => {
  const port = server.address().port;
  console.log(`App listening on port 3001`);
});

const botTradeFunc = async () => {
  console.log('botTradeStart!!');
  // const activeOrders = await zaifApi.getActiveOrders();
  const ticker = await zaifApi.getBtcTicker();
  let resultMsg = '';
  let resultDetail = '';

  // let bidOrder = null;
  // let askOrder = null;
  // for (let i = 0; i < Object.keys(activeOrders).length; i++) {
  //   const orderData = activeOrders[Object.keys(activeOrders)[i]];
  //   // console.log(Object.keys(activeOrders)[i]);
  //   if (orderData.action == 'ask') {
  //     askOrder = orderData;
  //   } else if (orderData.action == 'bid') {
  //     bidOrder = orderData;
  //   }
  // }
  let sellPrice = ticker.last + sellPriceDeff;
  let buyPrice = ticker.last - buyPriceDeff;
  const lastTradeData = await zaifApi.getLastTrade();
  await zaifApi.sellBtc({ amount: tradeAmount, price: sellPrice, options: { limit: sellPrice - sellPriceDeff * 2 } });

  console.log('botTradeFinished!!');
  return { message: resultMsg, detail: resultDetail };
};
// botTradeFunc();
module.exports = server;
