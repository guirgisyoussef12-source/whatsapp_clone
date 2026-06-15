export class ChatSocket {
  constructor(chatId, onMessage, onTyping, onClose, onOpen) {
    this.chatId = chatId
    this.onMessage = onMessage
    this.onTyping = onTyping
    this.onClose = onClose
    this.onOpen = onOpen
    this.ws = null
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectDelay = 1000 // Start with 1 second
    this._connect()
  }

  _connect() {
    const token = localStorage.getItem('access')
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const wsHost = 'localhost:8001'

    this.ws = new WebSocket(
      `${protocol}://${wsHost}/ws/chats/${this.chatId}/?token=${token}`
    )

    this.ws.onopen = () => {
      console.log('WS OPEN')
      this.reconnectAttempts = 0 // Reset on successful connection
      this.reconnectDelay = 1000
      this.onOpen && this.onOpen()
    }

    this.ws.onmessage = (e) => {
      console.log('WS MESSAGE', e.data)

      const data = JSON.parse(e.data)

      if (data.type === 'message') {
        this.onMessage(data.message)
      }

      if (data.type === 'typing') {
        this.onTyping(data)
      }
    }

    this.ws.onclose = (e) => {
      console.log('WS CLOSED', e.code, e.reason)

      if (e.code >= 4001 && e.code <= 4003) {
        this.onClose && this.onClose(e.code)
      } else {
        // Try to reconnect for unexpected closes
        this._attemptReconnect()
      }
    }

    this.ws.onerror = (e) => {
      console.log('WS ERROR', e)
    }
  }

  _attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      console.log(
        `Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
      )
      setTimeout(() => this._connect(), this.reconnectDelay)
      // Exponential backoff: 1s, 2s, 4s, 8s, 16s
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000)
    }
  }

  send(content) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'message', content }))
    } else {
      console.warn('WebSocket not ready, message not sent')
    }
  }

  sendTyping() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'typing' }))
    }
  }

  close() {
    this.reconnectAttempts = this.maxReconnectAttempts // Prevent reconnection
    this.ws?.close()
  }
}