export default class microphone {
    constructor(callback) {

        this.stream = null;
        self = this;

        navigator.mediaDevices.enumerateDevices().then(self.gotDevices.bind(self)).catch(this.handleError);
    
        const audioInputSelect = document.querySelector('select#audioSource');

        audioInputSelect.onchange = () => {
            this.getAudioStream.bind(this)((microphoneStream) => {
                self.stream = microphoneStream;
                self.initializeRecorder.bind(self)(microphoneStream, callback);
                navigator.mediaDevices.enumerateDevices().then(self.gotDevices.bind(self)).catch(this.handleError);
            })
        };

        this.getAudioStream.bind(this)((microphoneStream) => {
            self.stream = microphoneStream;
            self.initializeRecorder.bind(self)(microphoneStream, callback);
            navigator.mediaDevices.enumerateDevices().then(self.gotDevices.bind(self)).catch(this.handleError);
        })
    }

    getAudioStream(callback) {
        const audioInputSelect = document.querySelector('select#audioSource');
        
        if (this.stream) {
            this.stream.getTracks().forEach(track => {
                track.stop();
            });
        }
        
        const audioSource = audioInputSelect.value;
        const constraints = {
            audio: {deviceId: audioSource ? {exact: audioSource} : undefined},
    
        };
    
        navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
            callback(stream);
        }).catch(this.handleError);
    }

    handleError(error) {
        console.log('navigator.MediaDevices.getUserMedia error: ', error.message, error.name);
    }

    initializeRecorder(stream, callback) {

        window.audioInput = null
        window.recorder = null
    
        // https://stackoverflow.com/a/42360902/466693
    
        var audio_context = new AudioContext({ sampleRate: 16000 });
    
        window.audioInput = audio_context.createMediaStreamSource(stream);
    
        console.log("Created media stream.");
    
        var bufferSize = 8192;
        // record only 1 channel
        window.recorder = audio_context.createScriptProcessor(bufferSize, 1, 1);
        // specify the processing function
        window.recorder.onaudioprocess = callback;
        // connect stream to our recorder
        window.audioInput.connect(window.recorder);
        // connect our recorder to the previous destination
        window.recorder.connect(audio_context.destination);
    }


    gotDevices(deviceInfos) {
        console.log('deviceInfos: ', deviceInfos)
    
        const audioInputSelect = document.querySelector('select#audioSource');
        
    
        const selectors = [audioInputSelect];
        // Handles being called several times to update labels. Preserve values.
        const values = selectors.map(select => select.value);
        selectors.forEach(select => {
          while (select.firstChild) {
            select.removeChild(select.firstChild);
          }
        });
        for (let i = 0; i !== deviceInfos.length; ++i) {
          const deviceInfo = deviceInfos[i];
          const option = document.createElement('option');
          option.value = deviceInfo.deviceId;
          if (deviceInfo.kind === 'audioinput') {
            option.text = deviceInfo.label || `microphone ${audioInputSelect.length + 1}`;
            audioInputSelect.appendChild(option);
          }
        }
        selectors.forEach((select, selectorIndex) => {
          if (Array.prototype.slice.call(select.childNodes).some(n => n.value === values[selectorIndex])) {
            select.value = values[selectorIndex];
          }
        });
    }
}