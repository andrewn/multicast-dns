var packets = require('./packets')
var dgram = require('dgram')
var thunky = require('thunky')
var events = require('events')

var noop = function () {}

module.exports = function (opts) {
  if (!opts) opts = {}

  var that = new events.EventEmitter()
  var ip = opts.ip || opts.host || '224.0.0.251'
  var port = opts.port || 5353
  var isChromeAppPlatform = false

  if (opts.platform === module.exports.platform.chromeApp) {
    dgram = require('./chrome-dgram')
    isChromeAppPlatform = true
  }

  var bind = thunky(function (cb) {
    var socket = dgram.createSocket({
      type: 'udp4',
      reuseAddr: opts.reuseAddr !== false,
      toString: function () {
        return 'udp4'
      }
    })

    socket.on('error', cb)
    socket.on('message', function (message, rinfo) {
      console.log('internals -- message', message, rinfo);
      try {
        message = packets.decode(message)
      } catch (err) {
        that.emit('warning', err)
        return
      }

      that.emit('packet', message, rinfo)

      if (message.type === 'query') that.emit('query', message, rinfo)
      if (message.type === 'response') that.emit('response', message, rinfo)
    })

    /* On Chrome, these must be called before binding the socket */
    if (opts.multicast !== false && isChromeAppPlatform) {
      socket.setMulticastTTL(opts.ttl || 255)
      socket.setMulticastLoopback(opts.loopback !== false)
    }

    socket.bind(port, function () {
      if (opts.multicast !== false) {
        socket.addMembership(ip, opts.interface)
      }

      /* On node, these must be called after binding the socket */
      if (opts.multicast !== false && !isChromeAppPlatform) {
        socket.setMulticastTTL(opts.ttl || 255)
        socket.setMulticastLoopback(opts.loopback !== false)
      }

      socket.removeListener('error', cb)
      socket.on('error', function (err) {
        that.emit('warning', err)
      })

      that.emit('ready')

      cb(null, socket)
    })
  })

  bind()

  that.send = function (packet, cb) {
    bind(function (err, socket) {
      if (err) return cb(err)
      var message = packets.encode(packet)
      socket.send(message, 0, message.length, port, ip, cb)
    })
  }

  that.response =
  that.respond = function (res, cb) {
    if (!cb) cb = noop
    if (Array.isArray(res)) res = {answers: res}

    res.type = 'response'
    that.send(res, cb)
  }

  that.query = function (q, type, cb) {
    if (typeof type === 'function') return that.query(q, null, type)
    if (!cb) cb = noop

    if (typeof q === 'string') q = [{name: q, type: type || 'A'}]
    if (Array.isArray(q)) q = {type: 'query', questions: q}

    q.type = 'query'
    that.send(q, cb)
  }

  that.destroy = function (cb) {
    if (!cb) cb = noop
    bind(function (err, socket) {
      if (err) return cb()
      socket.once('close', cb)
      socket.close()
    })
  }

  return that
}

module.exports.platform = {
  chromeApp: 'chromeApp',
  node: 'node'
};
