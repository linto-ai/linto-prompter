
window.addEventListener('load', (event) => {

    const constraints = {
        audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: true
        }
    }

    navigator.mediaDevices.getUserMedia(constraints).then(function (microphoneStream) {
        var websocket;
        var isWebsocketOpen = false;
        //Chrome only
        //console.log(microphoneStream.getAudioTracks()[0].getCapabilities());
        //var sampleRate = microphoneStream.getAudioTracks()[0].getSettings().sampleRate;
        //console.log("sampleRate: ", sampleRate);

        initializeRecorder(microphoneStream);
        resetPlaceHolder();

        const recordButton = document.getElementById("record-button");
        recordButton.addEventListener("click", startRecording);

        const stopButton = document.getElementById("stop-button");
        stopButton.addEventListener("click", stopRecording);

        const resetButton = document.getElementById("reset-button");
        resetButton.addEventListener("click", resetPlaceHolder);

        const darkModeButton = document.getElementById("dark-mode-button");
        darkModeButton.addEventListener("click", toggleDarkMode);

        document.getElementById('scroller').scroll(0, 1000);

        function startRecording(event) {
            websocket = new WebSocket(WS_URL);
            websocket.onmessage = function (event) {
                data = JSON.parse(event.data);
                handleWebsocketData(data);
            };
            websocket.onopen = function (event) {
                isWebsocketOpen = true;
                websocket.send(`{"config": {"sample_rate":16000}}`);

                recordButton.disabled = true;
                stopButton.disabled = false;
                document.getElementById("transcription-text").textContent = '';
            }
        }

        function stopRecording(event) {
            websocket.send('{"eof" : 1}');
            websocket.close();
            isWebsocketOpen = false;
            recordButton.disabled = false;
            stopButton.disabled = true;
        }

        // audio functions
        function initializeRecorder(stream) {
            // https://stackoverflow.com/a/42360902/466693
            mediaStream = stream;

            audio_context = new AudioContext({ sampleRate: 16000 });

            var audioInput = audio_context.createMediaStreamSource(stream);

            console.log("Created media stream.");

            var bufferSize = 8192;
            // record only 1 channel
            var recorder = audio_context.createScriptProcessor(bufferSize, 1, 1);
            // specify the processing function
            recorder.onaudioprocess = recorderProcess;
            // connect stream to our recorder
            audioInput.connect(recorder);
            // connect our recorder to the previous destination
            recorder.connect(audio_context.destination);
        }

        function recorderProcess(e) {
            var left = e.inputBuffer.getChannelData(0);
            if (isWebsocketOpen)
                websocket.send(convertFloat32ToInt16(left));
        }

        function convertFloat32ToInt16(buffer) {
            l = buffer.length;
            buf = new Int16Array(l);
            while (l--) {
                buf[l] = Math.min(1, buffer[l]) * 0x7FFF;
            }
            return buf.buffer;
        }

        function handleWebsocketData(data, retry = 0) {
            switch (true) {
                case typeof data === 'string':
                    console.log("got string, retry: ", retry, "data: ", data)
                    if (retry < 3)
                        handleWebsocketData(JSON.parse(data), retry++)
                    break;
                case 'partial' in data:
                    console.log("got partial: ", data.partial);
                    document.getElementById("transcription-partial").innerHTML = data.partial.replace("<unk>", "").replace("' ", "'");
                    break;
                case 'text' in data:
                    document.getElementById("transcription-partial").innerHTML = '';
                    document.getElementById("transcription-text").textContent += ' ' + data.text.replace("<unk>", "").replace("' ", "'");
                    break;
                case 'eof' in data:
                    websocket.close();
                    break;
                default:
                    console.error("Unknown data received from websocket: ", data)
                    break;
            }
        }

        function toggleDarkMode(event) {
            document.getElementById('transcription').classList.toggle("dark-mode");
        }

        function resetPlaceHolder() {
            const clone = document.getElementById("placeholder").content.cloneNode(true);
            document.getElementById("transcription-text").innerHTML = '';
            document.getElementById("transcription-text").appendChild(clone);
            document.getElementById("transcription-partial").innerHTML = '';
        }
    }).catch(function (err) {

        console.error('microphone error', err);
    });
});













