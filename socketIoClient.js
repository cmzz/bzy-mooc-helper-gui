var io = require('socket.io-client')
var socket = io('ws://127.0.0.1:37108')

socket.on('news', function (data) {
    console.log(data)
    socket.emit('my other event', { my: 'data' })
});