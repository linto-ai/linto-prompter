export default class WebsocketHandler {
  constructor (onOpenCallback, onCloseCallback, onErrorCallback, onMessageCallback) {
    this._ws = null
    this.connectionOpened = false
    this.onOpenCallback = onOpenCallback
    this.onCloseCallback = onCloseCallback
    this.onErrorCallback = onErrorCallback
    this.onMessageCallback = onMessageCallback
  }

  sendData (data) {
    const left = data.inputBuffer.getChannelData(0)
    if (this.connectionOpened) { this._ws.send(convertFloat32ToInt16(left)) }
  }

  close () {
    this._ws.close()
  }

  connect () {
    this._ws = new WebSocket(WS_URL)
    this._ws.onopen = this.onOpen.bind(this)
    this._ws.onclose = this.onClose.bind(this)
    this._ws.onmessage = this.onMessage.bind(this)
    this._ws.onerror = this.onError.bind(this)
  }

  onOpen (event) {
    this._ws.send('{"config": {"sample_rate":16000}}')
    this.connectionOpened = true
    if (this.onOpenCallback) { this.onOpenCallback(event) }
  }

  onClose (event) {
    this.connectionOpened = false
    if (this.onCloseCallback) { this.onCloseCallback(event) }
  }

  onMessage (event) {
    const data = JSON.parse(event.data)
    this.onMessageCallback(data)
  }

  onError (event) {
    if (this.onErrorCallback) { this.onErrorCallback(event) }

    console.error('Websocket error: ', event)
  }
}

function convertFloat32ToInt16 (buffer) {
  let l = buffer.length
  const buf = new Int16Array(l)
  while (l--) {
    buf[l] = Math.min(1, buffer[l]) * 0x7FFF
  }
  return buf.buffer
}
