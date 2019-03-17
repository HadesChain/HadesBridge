const dash = require('./src/dash.js');
const hdcBank = new dash('hdc');
const ethBank = new dash('eth');
ethBank.observe(hdcBank);

ethBank.on({event:'onRecive'});
//exports.hdcBank= hdcBank
