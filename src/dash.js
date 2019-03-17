const { EventWatcher } = require('watch-eth')
const { DefaultEthProvider } = require('watch-eth/build/src/eth-provider/default-eth-provider.js')
const { EventFilter } = require('watch-eth/build/src/models/event-filter.js')
const Tx = require('ethereumjs-tx');
const request = require('request');
const fs = require('fs').promises;


var config = {};
try {
  config = require('../config.json');
} catch(e) {
  if (e.code == 'MODULE_NOT_FOUND') {
    console.log('No config file found. Using default configuration... (config.example.json)');
    config = require('../config.example.json');
  } else {
    throw e;
    process.exit(1);
  }
}


function dash(project) {
  var c = config[project];
  this.project = project;
  this.provider = new DefaultEthProvider({endpoint: c.provider});

  var watcher = new EventWatcher({
    eth : this.provider,
    address: c.contract,
    abi: config.abi,
  });

  var rate = {price:0.00 , update:0};

  this.on = function(options) {
    options.fromBlock = options.fromBlock || c.fromBlock;

    var filter = new EventFilter(options);
    watcher.db.setLastLoggedBlock(filter.hash , options.fromBlock);
    watcher.subscribe(options, this.listener);
  };

  this.observe = function(observer) {
    this.observer = observer;
  };

  this.listener = (evs)=> {
    (async (evs)=>{
      try {
        for(let ev of evs) {
          await this.observer.pay(ev.data); 
          config[project].fromBlock = ev.data.blockNumber;
          await fs.writeFile(__dirname+'/config.json',JSON.stringify(config,null,2));
        } 
      } catch(err) {
        var mailgun = require('mailgun-js')(config.api.mailgun);
        var data = config.api.mailbody;
        data.text = err;
        mailgun.messages().send(data, ()=>{});
      }
       
    })(evs);
  };


  this.pay = function (e) {
    console.log(e);
    if(e.removed!==false || e.returnValues.value=='0') {
      return Promise.resolve('pass');
    }
    var rawTx = {
                 from : c.owner,
                 nonce: '',
                 gasPrice: '0x77359400',
                 to: c.contract,
                 value: '0x0',
                 data: ''};

    return this.provider.web3.eth.getTransactionCount(c.owner,'pending')
    .then((nonce)=>{
      rawTx.nonce = this.provider.web3.utils.toHex(nonce);
      console.log(nonce)
      return Promise.resolve(nonce);
    }).then(()=>{
      return this.getPrice();
    }).then((price)=>{ 
      console.log('geted price');
      if(this.project=='hdc') {
        var value = this.provider.web3.utils.toHex(e.returnValues.value*price);
        return Promise.resolve(value);
      } else if(this.project=='eth'){
        var value = this.provider.web3.utils.toHex(e.returnValues.value/price);
        return Promise.resolve(value);
      } else {
        return Promise.reject('unkown coin');
      }
    }).then((value)=>{
       value = this.provider.web3.utils.toHex(parseInt(value));
       var ins =  this.provider.web3.eth.Contract(config.abi,c.contract);
       rawTx.data = ins.methods.send(e.returnValues.sender,value,e.transactionHash).encodeABI();
       return this.provider.web3.eth.estimateGas(rawTx);
    }).then((gasLimit)=>{
       rawTx.gasLimit = this.provider.web3.utils.toHex(gasLimit);
       return Promise.resolve(rawTx);
    }).then((rawTx)=>{
       console.log(rawTx);
       const privateKey = Buffer.from(c.pk, 'hex')
       const tx = new Tx(rawTx);
       tx.sign(privateKey);

       const serializedTx = tx.serialize();
       return this.provider.web3.eth.sendSignedTransaction('0x' + tx.serialize().toString('hex'));
    });
    
  };

  this.getPrice = function() {

    return new Promise((resolve,reject)=>{
      if(rate.price>0 && ( rate.update+300 > (new Date()).getTime()/1000) ) {
        console.log('cache');
        resolve(rate.price);
        return;
      }

      request({
        url: config.api.ethPrice,
        json: true
      }, 
     
      function (error, response, body) {
        if (!error && response.statusCode === 200 && body.status===true) {
          rate.price = body.docs[0].price; 
          rate.update = parseInt( (new Date()).getTime()/1000 );

          resolve(body.docs[0].price);
        } else {
          reject('get price error '+error); 
        } 
      })
    })

  };

}

module.exports=dash;
