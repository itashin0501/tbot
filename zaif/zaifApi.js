const fs = require('fs');
const zaif = require('zaif.jp');
const path = require('path');
console.log('read config');
const config = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, 'zaif_config.json'))
);
console.log('read config end');

class ZaifApi {
  constructor() {
    console.log('zaifApi constructor start');
    this.api = zaif.createPrivateApi(
      config.apikey,
      config.secretkey,
      'user agent is node-zaif'
    );
    console.log('zaifApi constructor end');
  }

  async getDeposit() {
    const userInfo = await this.getUserInfo();
    return { jpy: userInfo.deposit.jpy, btc: userInfo.deposit.btc };
  }

  async getUserInfo() {
    const userInfo = await this.api.getInfo();
    return userInfo;
  }

  async getActiveOrders() {
    const activeOrders = await this.api.activeOrders();
    return activeOrders;
  }

  async buyBtc({ amount, price }) {
    console.log(`zaifApi buyBtc ${amount} start`);
    const buyResult = await this.api.trade(
      'btc_jpy',
      'bid',
      price,
      amount
    );
    console.log(`zaifApi buyBtc ${amount} end`);
    return buyResult;
  }

  async sellBtc({ amount, price }) {
    console.log(`zaifApi sellBtc ${amount} start`);
    const buyResult = await this.api.trade(
      'btc_jpy',
      'ask',
      price,
      amount
    );
    console.log(`zaifApi sellBtc ${amount} end`);
    return buyResult;
  }

  async cancelOrder({orderId}) {
    const cancelResult = await this.api.cancelOrder(orderId);
    return cancelResult;
  }

  async getBtcTicker() {
    const btcTicker = await zaif.PublicApi.ticker('btc_jpy');
    return btcTicker;
  }
}

module.exports = ZaifApi;
