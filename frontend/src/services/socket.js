export class ChatSocket {
  constructor(chatId, onMessage, onTyping, onClose, onOpen) {
    this.chatId = chatId
    this.onMessage = onMessage
    this.onTyping = onTyping
    this.onClose = onClose
    this.onOpen = onOpen
    this.ws = null
    this._connect()
  }

  _connect() {
    const token = localStorage.getItem('access')
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const host = window.location.host
    this.ws = new WebSocket(`${protocol}://${host}/ws/chats/${this.chatId}/?token=${token}`)

    this.ws.onopen = () => {
      this.onOpen && this.onOpen()
    }

    this.ws.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.type === 'message') this.onMessage(data.message)
      if (data.type === 'typing') this.onTyping(data)
    }

    this.ws.onclose = (e) => {
      if (e.code >= 4001 && e.code <= 4003) {
        this.onClose && this.onClose(e.code)
      }
    }
  }

  send(content) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'message', content }))
    }
  }

  sendTyping() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'typing' }))
    }
  }

  close() {
    this.ws?.close()
  }
}