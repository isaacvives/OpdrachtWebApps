var _mediaStream = null;
var info = {};
var objectStore;
const dbName = "bookDatabase";
const storeName = "books";
var code;
var fetched = false;
var lastDetectionTime = 0;
var detectionInterval = 500; // Tijd in milliseconden tussen detecties

// Indien pagina geladen...
window.addEventListener('load', function () {
    console.log("Loaded.");

    var elems = document.querySelectorAll('select');
    var instances = M.FormSelect.init(elems);

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

    // IndexedDB

    const request = indexedDB.open(dbName, 2);

    request.onerror = (event) => {
        console.error("Fout bij het openen van de database", event.target.error);
    };

    request.onsuccess = function (event) {
        db = event.target.result;
        console.log("Database geopend.");
    };

    request.onupgradeneeded = function (event) {
        db = event.target.result;
        objectStore = db.createObjectStore(storeName, { keyPath: "isbn" });
        objectStore.createIndex("title", "title", { unique: false });
        objectStore.createIndex("author", "author", { unique: false });
        objectStore.createIndex("publishDate", "publishDate", { unique: false });
        objectStore.createIndex("publisher", "publisher", { unique: false });
        objectStore.createIndex("thumbnail", "thumbnail", { unique: false });
        objectStore.createIndex("comment", "comment", { unique: false });
    };

    // Zoek naar media devices.
    if ('mediaDevices' in navigator) {
        var selector = document.querySelector("#selectMediaDevice");

        // Enumereren over de devices en beschikbaar maken in select.
        navigator.mediaDevices.enumerateDevices()
            .then(devices => {
                console.log(devices);

                // Alle devices in de selection tonen.    
                for (var i = 0; i < devices.length; i++) {
                    if (devices[i].kind == "videoinput") {
                        option = document.createElement('option');
                        option.textContent = devices[i].label + " (" + devices[i].kind + ")";
                        option.setAttribute('value', (i).toString())
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

                            // Barcode detectie
                            Quagga.onDetected(function (result) {
                                var currentTime = new Date().getTime();
                                if (currentTime - lastDetectionTime > detectionInterval) {
                                    code = result.codeResult.code;
                                    var codeText = "Detected barcode: " + code;
                                    document.getElementById("barcodeResult").textContent = codeText;
                                    console.log("Barcode detected: ", code);
                            
                                    // API van openlibrary
                                    var isbn = "ISBN:" + code;
                                    var apiUrl = "https://openlibrary.org/api/books?bibkeys=" + isbn + "&jscmd=details&format=json";
                                    if (!fetched) {
                                        fetch(apiUrl)
                                        .then(response => response.json())
                                        .then(data => {
                                            var bookInfo = data[isbn];
                                            if (bookInfo) {
                                                showAndParseBookInfo(bookInfo)
                                                console.log("Bookinfo successfully fetched")
                                                fetched = true;
                                                document.getElementById("saveButton").classList.remove("disabled");
                            
                                            } else {
                                                document.getElementById("saveButton").classList.add("disabled");
                                            }
                                        })
                                        .catch(error => console.error("Error fetching book info:", error));
                                    }
                            
                                    lastDetectionTime = currentTime; // Bijwerken van de laatste detectietijd
                                }
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

function showAndParseBookInfo(bookInfo) {
    console.log(bookInfo);
    // Titel
    var title = bookInfo.details.title || "Unknown Title";
    
    // Auteur
    var author = "Unknown Author";
    if (bookInfo.details.authors && bookInfo.details.authors.length > 0) {
        author = bookInfo.details.authors[0].name || "Unknown Author";
    }
    
    // Publicatiedatum
    var publishDate = bookInfo.details.publish_date || "Unknown Publish Date";
    
    // Uitgever
    var publisher = "Unknown Publisher";
    if (bookInfo.details.publishers && bookInfo.details.publishers.length > 0) {
        publisher = bookInfo.details.publishers[0] || "Unknown Publisher";
    }
    
    // Thumbnail
    var thumbnail = bookInfo.thumbnail_url || "images/noimage.jpg";

    info["isbn"] = code; // Gedetecteerde barcode gebruiken
    info["title"] = title;
    info["author"] = author;
    info["publishDate"] = publishDate;
    info["publisher"] = publisher;
    info["thumbnail"] = thumbnail;
    info["comment"] = "";
    console.log("info:");
    console.log(info);
    img = document.createElement('img');

    // Voeg de attribute toe maar vraag de "medium" afbeelding op ipv de "small"
    img.setAttribute('id', "preview_img");
    img.setAttribute('src', thumbnail.replace("-S", "-M"));

    document.getElementById("title").textContent = title;
    document.getElementById("author").textContent = author;
    document.getElementById("date").textContent = publishDate;
    document.getElementById("publisher").textContent = publisher;
    var resultImg = document.getElementById("resultImg");
    while (resultImg.firstChild) {
        resultImg.removeChild(resultImg.lastChild);
    }
    resultImg.appendChild(img);
}


document.getElementById("saveButton").onclick = function () {
    var transaction = db.transaction([storeName], "readwrite");
    objectStore = transaction.objectStore(storeName);
    var request = objectStore.add(info);
    request.onsuccess = function (event) {
        console.log("Nieuwe info toegevoegd:", info);
    };
    request.onerror = function (event) {
        console.error("Fout bij het toevoegen van de info:", event.target.error);
    };
    window.location.href = "../index.html"
};