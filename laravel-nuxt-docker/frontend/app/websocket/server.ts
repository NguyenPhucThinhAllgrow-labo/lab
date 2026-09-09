import { WebSocketServer } from 'ws'
import { createServer } from 'node:http'

const server = createServer()
const wss = new WebSocketServer({ server })

wss.on('connection', (socket) => {
  socket.on('message', (message) => {
    console.log(message.toString())
  })
})

server.listen(8787, () => {
  console.log('WebSocket running on :8787')
})