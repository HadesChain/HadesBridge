const { EventWatcher } = require('watch-eth')
const { DefaultEthProvider } = require('watch-eth/build/src/eth-provider/default-eth-provider.js')
const { EventFilter } = require('watch-eth/build/src/models/event-filter.js')
const Tx = require('ethereumjs-tx');
const request = require('request');
const fs = require('fs').promises;


var config = {};
try {
  config = require(appRoot+'/config.json');
} catch(e) {
  if (e.code == 'MODULE_NOT_FOUND') {
    console.log('No config file found. Using default configuration... (config.example.json)');
    config = require(appRoot+'/config.example.json');
  } else {
    throw e;
    process.exit(1);
  }
}

var calc = {
   b : 1,
   i : 1e-6,
   supply : 0,

   hdctocny : function(n) {
      return (n*this.i*this.supply + n*this.b + n*n*this.i/2);
   },

   cnytohdc : function(cny) {
      return ( (Math.sqrt(this.supply*this.supply+2*this.supply*this.b/this.i+2*cny/this.i+this.b*this.b/this.i/this.i)-this.b/this.i) - this.supply);
   },
};

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
      for(let ev of evs) {
        try {
          config[project].fromBlock = ev.data.blockNumber;
          await fs.writeFile(appRoot+'/config.json',JSON.stringify(config,null,2));
          await this.observer.pay(ev.data); 
        } catch(err) {console.log(err);
          var mailgun = require('mailgun-js')(config.api.mailgun);
          var data = config.api.mailbody;
          data.text = err;
          mailgun.messages().send(data, ()=>{});
        }
      } 

       
    })(evs);
  };


  this.pay = function (e) {
    //console.log(e);
    if(e.removed!==false || e.returnValues.value=='0') {
      return Promise.resolve('pass');
    }
    
    let ins =  this.provider.web3.eth.Contract(config.abi,c.contract);
    let rawTx = {
                 from : c.owner,
                 nonce: '',
                 gasPrice: '0x77359400',
                 to: c.contract,
                 value: '0x0',
                 data: ''};

    return ins.methods.isPay(e.transactionHash).call().then((isPay)=>{
      console.log(isPay);
      if(isPay) {
        return Promise.reject('don\'t pay duplicate for tx '+e.transactionHash);
      } else {
        return Promise.resolve(isPay);
      } 
    }).then(()=>{
      console.log('geted balance');
      return this.provider.web3.eth.getBalance(c.contract);  
    }).then((balance)=>{
      balance = this.provider.web3.utils.fromWei(balance,'ether'); 
      calc.supply = 20000000-balance;console.log(calc.supply);
      return this.provider.web3.eth.getTransactionCount(c.owner,'pending')

    }).then((nonce)=>{
      rawTx.nonce = this.provider.web3.utils.toHex(nonce);
      console.log(nonce)
      return Promise.resolve(nonce);
    }).then(()=>{
      return this.getPrice();
    }).then((price)=>{
      console.log('geted balance');
      var value = 0;

      if(this.project=='hdc') {
        value = this.provider.web3.utils.fromWei(e.returnValues.value,'ether');
        value *=price;
        value = calc.cnytohdc(value);
        value = this.provider.web3.utils.toWei(value.toString());
        
        return Promise.resolve(value);

      } else if(this.project=='eth'){

        value = this.provider.web3.utils.fromWei(e.returnValues.value,'ether');
        value = calc.hdctocny(value);
        value /=price;
        value = this.provider.web3.utils.toWei(value.toString());

        return Promise.resolve(value);

      } else {
        return Promise.reject('unkown coin');
      }

    }).then((value)=>{console.log(value);
       value = this.provider.web3.utils.toHex(value);
       rawTx.data = ins.methods.send(e.returnValues.sender,value,e.transactionHash).encodeABI();
       return this.provider.web3.eth.estimateGas(rawTx);
    }).then((gasLimit)=>{
       rawTx.gasLimit = this.provider.web3.utils.toHex(gasLimit);
       return Promise.resolve(rawTx);
    }).then((rawTx)=>{

       const privateKey = Buffer.from(c.pk, 'hex')
       const tx = new Tx(rawTx);
       tx.sign(privateKey);

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
        if (!error && response.statusCode === 200 && body.success===true && body.data.length>0) {
          rate.price = body.data[0].price; 
          rate.update = parseInt( (new Date()).getTime()/1000 );

          resolve(rate.price);
        } else {
          reject('get price error '+error); 
        } 
      })
    })

  };

}

module.exports=dash;
