'use strict';

const axios = require('axios');
const ZaifApi = require('./zaif/zaifApi');
const zaifApi = new ZaifApi();

let botIntervalId = 0;

let tradeAmount = 0.04;
let buyPriceDeff = 2000;
let sellPriceDeff = 2500;
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
    botIntervalId = setInterval(botTradeFunc, 60000);
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

server.listen(process.env.PORT, () => {
  const port = server.address().port;
  console.log(`App listening on port ${port}`);
});

const botTradeFunc = async () => {
  console.log('botTradeStart!!');
  const activeOrders = await zaifApi.getActiveOrders();
  const ticker = await zaifApi.getBtcTicker();
  let resultMsg = '';
  let resultDetail = '';
  if (Object.keys(activeOrders).length > 0) {
    const orderData = Object.values(activeOrders)[0];
    // 注文が有るときは指値の調整をするか判定
    const currentTime = new Date().getTime() / 1000;
    const orderLimitTime = Number(orderData.timestamp) + orderLimitMinuits * 60; // 注文の有効期限
    console.log(`currentTime:${currentTime}, orderLimitTime:${orderLimitTime}`);
    if (currentTime > orderLimitTime) {
      //注文取り消し
      const cancelResult = zaifApi.cancelOrder({ orderId: Object.keys(activeOrders)[0] });
      resultMsg = '注文取り消し';
      resultDetail = cancelResult;
    } else {
      const remainSec = Math.round(orderLimitTime - currentTime);
      const remainMinuits = Math.floor(remainSec / 60);
      if (orderData.action == 'bit') {
        resultMsg = '買い注文あり';
        resultDetail = { order: orderData, remainMinuits: remainMinuits };
      } else {
        resultMsg = '売り注文あり';
        resultDetail = { order: orderData, remainMinuits: remainMinuits };
      }
    }
  } else {
    // 注文が無ければ売買を行う
    const deposit = await zaifApi.getDeposit();
    if (deposit.btc > tradeAmount) {
      // BTC保持の場合は売り設定
      resultMsg = '売り注文';

      const sellPrice = ticker.last + sellPriceDeff;
      const sellResult = await zaifApi.sellBtc({ amount: tradeAmount, price: sellPrice });
      resultDetail = sellResult;
    } else {
      // BTC保持していない場合は買い設定
      resultMsg = '買い注文';
      const buyPrice = ticker.last - buyPriceDeff;
      const buyResult = await zaifApi.buyBtc({ amount: tradeAmount, price: buyPrice });
      resultDetail = buyResult;
    }
  }
  console.log('botTradeFinished!!');
  return { message: resultMsg, detail: resultDetail };
};

module.exports = server;
