pragma solidity ^0.4.25;


contract HDCBridge {

    address internal owner;
    mapping(uint=>bool) internal legdge;

    event onRecive(
        address indexed sender,
        uint value,
        uint timestamp
    );
    
    event onSend(
        uint indexed txid,
        address reciver,
        uint value,
        uint timestamp
    );
    
    modifier isOwner() {
        require(msg.sender == owner);
        _;
    }
    
    modifier enoughAsset(uint value) {
        require( address(this).balance >= value );
        _;
    }
    
    modifier unPay(uint txid) {
        require(isPay(txid) == false);
        _;
    }


    constructor () public {
        owner = msg.sender;
    }
    
    function()
        public 
        payable
    {
        emit onRecive(msg.sender , msg.value , now);
    }
    
    function send(address reciver, uint value ,uint txid)
        isOwner()
        unPay(txid)
        enoughAsset(value)
        public
    {
        legdge[txid] = true;
        reciver.transfer(value);
        emit onSend(txid , reciver , value , now); 
    }

    function isPay(uint txid)
        public
        view
        returns (bool)
    {
        return legdge[txid];
    }

}
