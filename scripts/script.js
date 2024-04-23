var _mediaStream = null;

// Indien pagina geladen...
window.addEventListener('load', function () {
    console.log("Loaded.");

    // Service worker registeren.
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./service-worker.js')
            .then((registration) => {
                console.log('Registered: ');
                console.log(registration);
            })
            .catch((err) => console.log(err));
    }
    else {
        alert('No service worker support in this browser.');
    }

    // Zoek naar media devices.
    if ('mediaDevices' in navigator) {
        var selector = document.querySelector("#selectMediaDevice");

        // Enumereren over de devices en beschikbaar maken in select.
        navigator.mediaDevices.enumerateDevices()
            .then(devices => {
                console.log(devices);

                // Alle devices in de selection tonen.    
                var option = document.createElement('option');
                option.textContent = "None";
                option.setAttribute('data-id', "None");
                selector.appendChild(option);
                for (var i = 0; i < devices.length; i++) {
                    if (devices[i].kind == "videoinput") {
                        option = document.createElement('option');
                        option.textContent = devices[i].label + " (" + devices[i].kind + ")";
                        option.setAttribute('data-id', devices[i].deviceId);
                        selector.appendChild(option);
                        console.log("Single option: ", option);
                    }
                }
            })
            .catch(error => console.log(error));


        // Indien media device geselecteerd wordt...
        selector.addEventListener('change', function () {
            var deviceId = selector.options[selector.selectedIndex].getAttribute("data-id");
            console.log("Selected device id: ", deviceId);

            // Eventuele oude streams afsluiten (camera vrijgeven).
            if (_mediaStream != null) {
                _mediaStream.getTracks().forEach(track => {
                    track.stop();
                });
            }

            // Als beeld gevraagd wordt...
            if (deviceId != "None") {
                // Verzoeken tot toelating en koppelen met camera.
                navigator.mediaDevices.getUserMedia({
                    video: { deviceId: deviceId }
                })
                    .then(mediaStream => {
                        _mediaStream = mediaStream;
                        console.log("mediaStream available");

                        // Koppelen aan video element.
                        var video = document.getElementById("videoStream");
                        video.srcObject = mediaStream;

                        // Indien geladen, start beeld.
                        video.onloadedmetadata = function (e) {
                            video.play();

                            // Configureer QuaggaJS voor het scannen van barcodes
                            Quagga.init({
                                inputStream: {
                                    name: "Live",
                                    type: "LiveStream",
                                    target: document.querySelector('#videoStream')
                                },
                                decoder: {
                                    readers: ["ean_reader"]
                                }
                            }, function (err) {
                                if (err) {
                                    console.error("Quagga init error: ", err);
                                    return;
                                }
                                console.log("Initialization finished. Ready to start");
                                Quagga.start();
                            });

                            // Bar-code detectie
                            Quagga.onDetected(function (result) {
                                var code = result.codeResult.code;
                                document.getElementById("barcodeResult").value = code;
                                console.log("Barcode detected: ", code);
                            
                                // API van openlibrary
                                var isbn = "ISBN:" + code;
                                var apiUrl = "https://openlibrary.org/api/books?bibkeys=" + isbn + "&jscmd=details&format=json";
                            
                                fetch(apiUrl)
                                    .then(response => response.json())
                                    .then(data => {
                                        var bookInfo = data[isbn];
                                        if (bookInfo) {
                                            var title = bookInfo.details.title;
                                            var author = bookInfo.details.authors[0].name;
                                            var publishDate = bookInfo.details.publish_date;
                                            var publisher = bookInfo.details.publishers[0];
                            
                                            var infoText = "Title: " + title + "\n";
                                            infoText += "Author: " + author + "\n";
                                            infoText += "Publish Date: " + publishDate + "\n";
                                            infoText += "Publisher: " + publisher;
                            
                                            document.getElementById("bookInfo").textContent = infoText;
                                        } else {
                                            document.getElementById("bookInfo").textContent = "Book information not found.";
                                        }
                                    })
                                    .catch(error => console.error("Error fetching book info:", error));
                            });
                            
                        };
                    })
                    .catch(error => console.log(error));
            }
        });
    }
    else {
        alert('No media devices support in this browser.');
    }
});
