# Hades Bridge
The Hades Bridge allows users to transfer assets between two chains in the Ethereum ecosystem. 
<b>Live Version: [https://www.hadeschain.org/bridge.html](https://www.hadeschain.org/bridge.html)</b>
## Bridge Overview

The bridge oracle is deployed on specified validator nodes (only nodes whose private keys correspond to addresses specified in the smart contracts) in the network. The oracle connects to two chains via a Remote Procedure Call (RPC). It is responsible for:
- listening to events related to bridge contracts
- sending transactions to authorize asset transfers

## Interoperability

Interoperability is the ability to share resources between networks. The Hades Bridge is an interoperability protocol where users can transfer coins between chains in the Ethereum ecosystem.  This creates opportunities to use different chains for different purposes. For example, smart contracts can allocate resource intensive operations to a sidechain where transactions are fast and inexpensive.

## Architecture

### Watcher
A watcher listens for a certain event and creates proper jobs in the queue. These jobs contain the transaction data (without the nonce) and the transaction hash for the related event. The watcher runs on a given frequency, keeping track of the last processed block.

If the watcher observes that the transaction data cannot be prepared, which generally means that the corresponding method of the bridge contract cannot be invoked, it inspects the contract state to identify the potential reason for failure and records this in the logs. 

### Sender
A sender subscribes to the queue and keeps track of the nonce. It takes jobs from the queue, extracts transaction data, adds the proper nonce, and sends it to the network.


# How to Use

## Installation and Deployment

### Deploy the Bridge Contracts

compile contracts[HadesBridge.sol] and deploy in two chains.
eg: Ethereum and HadesChain
 
### Configuration

1. Create a `config.json` file: `cp config.json.example config.json`

2. Fill in the required information using the output data from `bridgeDeploymentResults.json`. 
```
{
  "eth": {
    "provider": "...rpcServer.",
    "contract": "...contract address",
    "fromBlock": <integer>, // watching start point
    "owner": "...address which created contract",
    "pk": "....Private key"
  },
  "hdc": {
    "provider": "...rpcServer.",
    "contract": "...contract address",
    "fromBlock": <integer>, // watching start point
    "owner": "...address which created contract",
    "pk": "....Private key"
  },
  "abi": // abi of contract, 
  "api": {
    "ethPrice": "https://api.to.get.eth.or.other.coin.price",
    "mailgun": {
      "apiKey": "...",
      "domain": "..."
    },
    "mailbody": {
      "from": "Alarm <alarm@xx.org>",
      "to": "xx@yy.com",
      "subject": "error happend",
      "text": ""
    }
  }
}
```

### Run the Processes
`node bridge.js`

## License

[![License: LGPL v3.0](https://img.shields.io/badge/License-LGPL%20v3-blue.svg)](https://www.gnu.org/licenses/lgpl-3.0)

This project is licensed under the GNU Lesser General Public License v3.0. See the [LICENSE](LICENSE) file for details.

