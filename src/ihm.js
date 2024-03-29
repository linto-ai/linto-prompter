//import Microphone from './microphone.js'
import WebSocketHandler from './webSocketHandler.js'

const constraints = {
  audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: true
  }
}
export default class Ihm {
  constructor ( ) {
    var self = this
    navigator.mediaDevices.getUserMedia(constraints).then(function (microphoneStream) {
      initializeRecorder(microphoneStream);
      function initializeRecorder(stream) {
        // https://stackoverflow.com/a/42360902/466693
        var mediaStream = stream;

        var audio_context = new AudioContext({ sampleRate: 16000 });

        var audioInput = audio_context.createMediaStreamSource(stream);

        console.log("Created media stream.");

        var bufferSize = 8192;
        // record only 1 channel
        var recorder = audio_context.createScriptProcessor(bufferSize, 1, 1);
        // specify the processing function
        recorder.onaudioprocess = self.handleRecordingData.bind(self);
        // connect stream to our recorder
        audioInput.connect(recorder);
        // connect our recorder to the previous destination
        recorder.connect(audio_context.destination);
      }
    }).catch(function (err) {

        console.error('microphone error', err);
    });
    this.recordButton = document.getElementById('record-button')
    this.stopButton = document.getElementById('stop-button')
    this.darkModeButton = document.getElementById('dark-mode-button')
    this.testButton = document.getElementById('test-button')
    this.watermarkButton = document.getElementById('watermark-button')
    this.resetButton = document.getElementById('reset-button')

    this.isRecording = false
    this.watermarkInterval = null

    // this._microphone = new Microphone((e) => {
    //   console.log('microphone data: ', e, Date.now())
    //   this.handleRecordingData(e)
    // })



    this._webSocketHandler = new WebSocketHandler(null, this.handleWebsocketClose.bind(this), this.handleWebsocketError.bind(this), this.handleWebsocketData.bind(this))
    this.setWatermarkFrequence(WATERMARK_FREQUENCY)

    this.recordButton.addEventListener('click', this.startRecording.bind(this))
    this.stopButton.addEventListener('click', this.stopRecording.bind(this))
    this.testButton.addEventListener('click', this.fakeText.bind(this))
    this.darkModeButton.addEventListener('click', this.toggleDarkMode.bind(this))
    this.watermarkButton.addEventListener('click', this.displayWatermark.bind(this))
    this.resetButton.addEventListener('click', this.resetText.bind(this))

    document.getElementById('scroller').scroll(0, 1000)

  }

  handleRecordingData (data) {
    if (this.isRecording) {
      this._webSocketHandler.sendData(data)
    }
  }

  handleWebsocketError (event) {
    this.stopRecording()
    console.log('retrying in 1s')
    setTimeout(this.startRecording.bind(this), 1000)
  }

  handleWebsocketClose (event) {
    console.log('handleWebsocketClose: ', event)
    this.stopRecording()
  }

  handleWebsocketData (data, retry = 0) {
    switch (true) {
      case typeof data === 'string':
        console.log('got string, retry: ', retry, 'data: ', data)
        if (retry < 3) { this.handleWebsocketData(JSON.parse(data), retry++) }
        break
      case 'partial' in data:
        console.log('got partial: ', data.partial, Date.now() / 1000)
        document.getElementById('transcription-partial').innerHTML = data.partial.replaceAll('<unk>', '').replaceAll("' ", "'")
        break
      case 'text' in data:
        console.log('got text: ', data.partial, Date.now() / 1000)
        document.getElementById('transcription-partial').innerHTML = ''
        this.appendText(' ' + data.text.replaceAll('<unk>', '').replaceAll("' ", "'"))
        break
      case 'eof' in data:
        this.stopRecording()
        break
      default:
        console.error('Unknown data received from websocket: ', data)
        break
    }
  }

  startRecording () {
    this.isRecording = true
    this._webSocketHandler.connect()
    this.recordButton.setAttribute('disabled', 'disabled')
    this.stopButton.removeAttribute('disabled')
  }

  stopRecording () {
    this.isRecording = false
    this._webSocketHandler.close()
    this.recordButton.removeAttribute('disabled')
    this.stopButton.setAttribute('disabled', 'disabled')
  }

  fakeText () {
    if (this.fakeTextInterval) {
      clearInterval(this.fakeTextInterval)
      this.fakeTextInterval = null
      this.testButton.innerText = 'Lancer un test'
      this.testButton.classList.remove('red')
      return
    }
    this.testButton.innerText = 'Arreter les tests'
    this.testButton.classList.add('red')
    this.fakeTextInterval = setInterval(() => {
      this.appendText('This is a test. ')
    }, 1000)
  }

  toggleDarkMode (event) {
    document.getElementById('transcription').classList.toggle('dark-mode')
  }

  appendText (text) {
    const currentText = document.getElementById('transcription-text').textContent
    const newText = currentText + text
    if (newText.length > 1500) {
      document.getElementById('transcription-text').textContent = newText.substring(newText.length - 300)
    } else {
      document.getElementById('transcription-text').textContent = newText
    }
    this.forceScroll(0)
  }

  displayWatermark () {
    const watermark = document.getElementById('watermark')
    const scroll = document.getElementById('scroller')

    watermark.classList.remove('hidden')
    watermark.classList.add('displayed')
    scroll.classList.remove('normal')
    scroll.classList.add('smaller')

    setTimeout(() => {
      this.hideWatermark()
    }, WATERMARK_DURATION * 1000)

    this.setWatermarkFrequence(WATERMARK_FREQUENCY)
    this.forceScroll(1100)
  }

  hideWatermark () {
    const watermark = document.getElementById('watermark')
    const scroll = document.getElementById('scroller')

    watermark.classList.remove('displayed')
    watermark.classList.add('hidden')
    scroll.classList.remove('smaller')
    scroll.classList.add('normal')
    this.forceScroll(1100)
  }

  setWatermarkFrequence (frequenceInMinutes) {
    if (this.watermarkInterval) {
      clearInterval(this.watermarkInterval)
    }
    this.watermarkInterval = setInterval(this.displayWatermark.bind(this), frequenceInMinutes * 60000)
  }

  forceScroll (time) {
    setTimeout(() => {
      document.getElementById('scroller').scroll(0, document.getElementById('scroller').scrollHeight)
    }, time)
  }

  resetText () {
    document.getElementById('transcription-text').innerHTML = ''
    document.getElementById('transcription-partial').innerHTML = ''
  }
}
