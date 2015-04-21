console.log('Init');

var multicastDNS = require('./')

var mdns = multicastDNS({ port: 5406, platform: multicastDNS.platform.chromeApp });

mdns.on('warning', function (err) {
  console.log(err.stack)
})

mdns.on('response', function (response) {
  console.log('got a response packet:', response)
});

mdns.on('query', function (query) {
  console.log('got a query packet:', query)
});

// lets query for an A record for 'brunhilde.local'
// mdns.query({
//   questions: [{
//     name: 'brunhilde.local',
//     type: 'A'
//   }]
// })


  // Advertising:
  ptr = {
    "name": "_ws._tcp.local",
    "type": "PTR",
    "data": "{channelName}[{peerId}]._ws._tcp.local"
  };

  srv = {
    "name": "{channelName}[{peerId}]._ws._tcp.local",
    "type": "SRV",
    "data": {
      "port": "{proxyPort}",
      "target": "{generatedHostname}.local."
    }
  };

  txt = {
    "name": "{channelName}[{peerId}]._ws._tcp.local",
    "type": "TXT",
    "data": "path={peer.url}"
  };

  a = {
    name: '{generatedHostname}.local.',
    type: 'A',
    data: '{SocketInfo.localAddress}'
  };

  mdns.respond({
    answers: [ptr, srv, txt, a]
  }, function () { console.log('response sent'); })

/*

  Search and connect:

  1. A queries: _ws._tcp.local
  mdns.query({
    questions: [{
      name: '_ws._tcp.local',
      type: 'PTR'
    }]
  });

  2. B Responds with PTR record

  3. A receives PTRS

  service name = 

*/
