console.log('Init');

var multicastDNS = require('./')

var mdns = multicastDNS({ port: 5406, platform: multicastDNS.platform.chromeApp });

mdns.on('warning', function (err) {
  console.log(err.stack)
})

mdns.on('response', function (response) {
  console.log('got a response packet:', response)
})

mdns.on('query', function (query) {
  console.log('got a query packet:', query)
})

// lets query for an A record for 'brunhilde.local'
mdns.query({
  questions: [{
    name: 'brunhilde.local',
    type: 'A'
  }]
})