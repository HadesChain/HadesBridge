const path = require('path');
global.appRoot = path.resolve(__dirname);

const dash = require(appRoot+'/src/dash.js');
const hdcBank = new dash('hdc');
const ethBank = new dash('eth');

ethBank.observe(hdcBank);

ethBank.on({event:'onRecive'});
//exports.hdcBank= hdcBank
