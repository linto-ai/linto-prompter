
window.addEventListener('load', (event) => {

    var websocket;
    var isWebsocketOpen = false;
    let watermarkInterval = null
    let fakeTextInterval = null


    const recordButton = document.getElementById("record-button");
    recordButton.addEventListener("click", startRecording);

    const stopButton = document.getElementById("stop-button");
    stopButton.addEventListener("click", stopRecording);

    // const resetButton = document.getElementById("reset-button");
    // resetButton.addEventListener("click", resetPlaceHolder);
    
    
    const resetButton = document.getElementById("reset-button");
    resetButton.addEventListener("click", resetText)

    const darkModeButton = document.getElementById("dark-mode-button");
    darkModeButton.addEventListener("click", toggleDarkMode);

    const testButton = document.getElementById("test-button");
    testButton.addEventListener("click", fakeText);

    const watermarkFrequenceInput = document.getElementById("watermark-frequence");
    watermarkFrequenceInput.addEventListener("change", (event) => {
        const frequence = event.target.value;
        setWatermarkFrequence(frequence);
    })

    const watermarkButton = document.getElementById("watermark-button");
    watermarkButton.addEventListener("click",() => {
        setWatermarkFrequence(watermarkFrequenceInput.value)
        displayWatermark()
    });
    
    setWatermarkFrequence(watermarkFrequenceInput.value)

    const cleanTextInterval = setInterval(() => {
        cleanText()
    }, 1000)

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
        console.log("handleWebsocketData: ", data)
        switch (true) {
            case typeof data === 'string':
                console.log("got string, retry: ", retry, "data: ", data)
                if (retry < 3)
                    handleWebsocketData(JSON.parse(data), retry++)
                break;
            case 'partial' in data:
                console.log("got partial: ", data.partial);
                document.getElementById("transcription-partial").innerHTML = data.partial.replaceAll("<unk>", "").replaceAll("' ", "'");
                break;
            case 'text' in data:
                document.getElementById("transcription-partial").innerHTML = '';
                document.getElementById("transcription-text").textContent += ' ' + data.text.replaceAll("<unk>", "").replaceAll("' ", "'");
                break;
            case 'eof' in data:
                websocket.close();
                break;
            default:
                console.error("Unknown data received from websocket: ", data)
                break;
        }
    }

    function fakeText() {
        if(fakeTextInterval) {
            clearInterval(fakeTextInterval)
            fakeTextInterval = null
            testButton.innerText = "Lancer un test"
            testButton.classList.remove("red")
            return
        }
        testButton.innerText = "Arreter les tests"
        testButton.classList.add("red")
        fakeTextInterval = setInterval(() => {
            document.getElementById("transcription-text").textContent += '.' + " This is a test";
        }, 1000)
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

    function displayWatermark() {
        const watermark = document.getElementById("watermark")
        const scroll = document.getElementById("scroller")
        const animationDurationInput = document.getElementById("animation-duration");

        watermark.classList.remove('hidden')
        watermark.classList.add('displayed')
        scroll.classList.remove('normal')
        scroll.classList.add('smaller')
        
        setTimeout(() => {
            hideWatermark()
          }, animationDurationInput.value * 1000) 
          
        forceScroll(1100)
    }

    function hideWatermark() {
        const watermark = document.getElementById("watermark")
        const scroll = document.getElementById("scroller")
        
        watermark.classList.remove('displayed')
        watermark.classList.add('hidden')
        scroll.classList.remove('smaller')
        scroll.classList.add('normal')
        forceScroll(1100)
        
    }

    function forceScroll(time) {
        setTimeout(() => {
            document.getElementById('scroller').scroll(0, document.getElementById('scroller').scrollHeight);
        }, time)
    }

    function setWatermarkFrequence(frequenceInMinutes) {
        if(watermarkInterval) {
            clearInterval(watermarkInterval)
        }
        watermarkInterval = setInterval(displayWatermark, frequenceInMinutes * 60000)
    }

    function cleanText() {
        const text = document.getElementById("transcription-text").textContent
        const count = text.length;
        if (count > 1500) {
            //return text.substring(count - 500, count);
            document.getElementById("transcription-text").textContent = text.substring(count - 300, count);
            forceScroll(20)
        }
        //return text;
    }

    function resetText() {
        document.getElementById("transcription-text").innerHTML = '';
        document.getElementById("transcription-partial").innerHTML = '';
    }

    initMicrophone(recorderProcess)
});













