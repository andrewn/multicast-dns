/*
  Implementation of node.js dgram API for
  Chrome Apps.
  Skeleton from: https://github.com/alexstrat/simudp/blob/master/lib/simudp.js
*/

var util   = require('util');
var events = require('events');
var Buffer = require('buffer').Buffer;

function Socket(type, listener, host, io_options) {
  console.log('Create new Socket', type, host);

  events.EventEmitter.call(this);

  //init state variables
  this._listening = false;
  this._binding   = false;

  //type of socket 'udp4', 'udp6', 'unix_socket'
  this.type = type || 'udp4';

  //listener
  if (typeof listener === 'function')
    this.on('message', listener);

  //args swap
  if(typeof listener === 'string') {
    host = listener;
    io_options = host;
  }
}
util.inherits(Socket, events.EventEmitter);

exports.Socket = Socket;
exports.createSocket = function(type, listener) {
  return new Socket(type, listener);
};

Socket.prototype.bind = function(/* options[, callback] or port[, address][, callback]*/) {
  var self = this,
      port, address, callback

  if (typeof arguments[0] === 'number') {
    port     = arguments[0]
    address  = typeof arguments[1] === 'function' ? '0.0.0.0' : arguments[1]
    callback = typeof arguments[1] === 'function' ? arguments[1] : arguments[2]
  } else if (typeof arguments[0] === 'object') {
    port     = arguments[0].port
    address  = arguments[0].address
    callback = arguments[1]
  }

  console.log('bind: ', port, address, typeof callback)

  if (typeof callback === 'function')
    self.once('listening', callback);

  if(this._listening)
    throw new Error('already listening');

  if(this._binding)
    throw new Error('already binding');

  this._binding = true;

  this._bindingPromise = new Promise(function (resolve, reject) {
    chrome.sockets.udp.create(
      {
        // persistent: Flag indicating if the socket is left open when the event page of the application is unloaded
        // name: An application-defined string associated with the socket.
        // bufferSize: The size of the buffer used to receive data. The default value is 4096.
      },
      function (createInfo) {
        console.log('Chrome: socket created', createInfo.socketId);
        self._socketId = createInfo.socketId;
        self.emit('_created');
        chrome.sockets.udp.bind(
          self._socketId,
          address || '0.0.0.0',
          port,
          function (result) {
            console.log('Chrome: socket bound', result);

            // Add listener for incoming UDP messages
            self._attachIncomingListeners();

            resolve();
          }
        );
      }
    );
  });
};

Socket.prototype.send = function(buffer, offset, length, port, address, callback) {
  var self = this,
      args = arguments;
  if (!this._bindingPromise) {
    console.log('no binding promise, calling bind')
    // will create the bindingPromise
    this.bind();
  }
  this._bindingPromise
    .then(function () {
      console.log('call private send');
      self._send.apply(self, args);
    });
};

Socket.prototype._send = function(buffer, offset, length, port, address, callback) {
  var self = this;

  //accept buffer as string
  buffer = (typeof buffer === 'string') ? new Buffer(buffer) : buffer;

  //emit directly exception if any
  if (offset >= buffer.length)
    throw new Error('Offset into buffer too large');
  if (offset + length > buffer.length)
    throw new Error('Offset + length beyond buffer length');

  chrome.sockets.udp.send(
    this._socketId,
    /* ArrayBuffer */ buffer.toArrayBuffer(),
    address,
    port,
    function (sendInfo) {
      console.log('Chrome.send() result:', sendInfo.result, ', bytesSent: ', sendInfo.bytesSent);
      if (typeof callback === 'function') {
        callback();
      }
    }
  );
};


Socket.prototype.close = function() {
  chrome.sockets.udp.close(this._socketId/*, function callback*/);
  this.removeAllListeners();
  this.emit('close');
};


Socket.prototype.address = function() {
  if(! this._address)
    throw new Error('not bound');

  return this._address;
};


// not implemented methods

Socket.prototype.setBroadcast = function(arg) {
  console.log('setBroadcast', arg);
  chrome.sockets.udp.setBroadcast(
    this._socketId,
    arg,
    function (result) {
      console.log('Chrome.setBroadcast()', arg, ' result: ', result);
    }
  );
  // throw new Error('not implemented');
};

Socket.prototype.setTTL = function(arg) {
  console.log('setTTL', arg);
  throw new Error('not implemented');
};

Socket.prototype.setMulticastTTL = function(arg) {
  if (!this._socketId) {
    // defer until socket connected
    this.once('_created', function () {
      this.setMulticastTTL(arg);
    });
  } else {
    console.log('setMulticastTTL', arg);
    chrome.sockets.udp.setMulticastTimeToLive(
      this._socketId,
      arg,
      function (result) {
        console.log('Chrome.setMulticastTimeToLive()', arg, ' result: ', result);
      }
    );
    // throw new Error('not implemented');
  }
};

Socket.prototype.setMulticastLoopback = function(arg) {
if (!this._socketId) {
    // defer until socket connected
    this.once('_created', function () {
      this.setMulticastLoopback(arg);
    });
  } else {
    console.log('setMulticastLoopback', arg);
    chrome.sockets.udp.setMulticastLoopbackMode(
      this._socketId,
      arg,
      function (result) {
        console.log('Chrome.setMulticastLoopbackMode()', arg, ' result: ', result);
      }
    );
    // throw new Error('not implemented');
  }
};

Socket.prototype.addMembership = function(multicastAddress, interfaceAddress) {
  console.log('addMembership', multicastAddress, interfaceAddress);
  chrome.sockets.udp.joinGroup(
    this._socketId,
    multicastAddress,
    function (result) {
      console.log('Chrome.joinGroup()', multicastAddress, ' result: ', result);
    }
  );
  // throw new Error('not implemented');
};

Socket.prototype.dropMembership = function(multicastAddress, interfaceAddress) {
  console.log('dropMembership', multicastAddress, interfaceAddress);
  chrome.sockets.udp.leaveGroup(
    this._socketId,
    multicastAddress,
    function (result) {
      console.log('Chrome.leaveGroup()', multicastAddress, ' result: ', result);
    }
  );
  // throw new Error('not implemented');
};

Socket.prototype._attachIncomingListeners = function() {
  chrome.sockets.udp.onReceive.addListener(this._handleIncomingData.bind(this));
  chrome.sockets.udp.onReceiveError.addListener(this._handleIncomingErrorData.bind(this));
  console.log('emit listeners');
  this.emit('listening');
};

Socket.prototype._handleIncomingData = function(socketId, data, remoteAddress, remotePort) {
  if (this._socketId == null) {
    throw new Error('can\'t filter incoming data since no socketid');
  }
  if (this._socketId !== socketId) { return; }
  this.emit('message', data, { address: remoteAddress, port: remotePort });
};

Socket.prototype._handleIncomingErrorData = function(socketId, resultCode) {
  if (this._socketId == null) {
    throw new Error('can\'t filter incoming error data since no socketid');
  }
  if (this._socketId !== socketId) { return; }
  var error = new Error('incoming data error');
  error.resultCode = resultCode;
  this.emit('error', error);
};
