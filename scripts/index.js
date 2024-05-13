var objectStore;
const dbName = "bookDatabase";
const storeName = "books";
var db;

document.addEventListener('DOMContentLoaded', function () {
  var elems = document.querySelectorAll('.fixed-action-btn');
  var instances = M.FloatingActionButton.init(elems);

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

  if (!("Notification" in window))
    console.log("Notifications not supported in this browser.");
  else {
    if (Notification.permission == "granted") {
      console.log("Permission granted before.");
    }
    else {
      if (Notification.permission != "denied") {
        Notification.requestPermission().then(permission => {
          if (permission == "granted") {
            console.log("Permission granted.");
          }
        });
      }
      else
        console.log("Permission denied before...");
    }
  }

  const request = indexedDB.open(dbName, 2);

  request.onerror = (event) => {
    console.error("Fout bij het openen van de database", event.target.error);
  };

  request.onsuccess = function (event) {
    db = event.target.result;
    console.log("Database geopend.");
    loadBooks(); // Na het openen van de database, laad de boeken
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
});

function loadBooks() {
  const transaction = db.transaction([storeName], "readonly");
  const objectStore = transaction.objectStore(storeName);
  const request = objectStore.openCursor();
  request.onsuccess = function (event) {
    const cursor = event.target.result;
    if (cursor) {
      const bookInfo = cursor.value;
      const bookListDiv = document.getElementById('bookList');
      const isnt = document.getElementById('instructies');
      isnt.setAttribute("style", "display: none;")
      const cardDiv = document.createElement('div');
      cardDiv.className = 'col s12 m7';
      cardDiv.innerHTML = `
          <!-- Modal Structure -->
          <div id="modal${bookInfo.isbn}" class="modal">
            <div class="modal-content">
              <h4>Commentaar</h4>
              <form id="form${bookInfo.isbn}">
                <div class="input-field">
                  <input id="modal-text-input${bookInfo.isbn}" type="text" class="validate">
                  <label for="modal-text-input${bookInfo.isbn}">Enter Text</label>
                </div>
              </form>
            </div>
            <div class="modal-footer">
            <button id="modal-submit-btn${bookInfo.isbn}" class="modal-close waves-effect waves-light red btn" onclick="addComment(${bookInfo.isbn});">Plaats commentaar</button>
            </div>
          </div>
          
          <div class="card horizontal">
              <div class="card-image">
                  <img id="bookThumbnail" alt="bookThumbnail" src="${bookInfo.thumbnail.replace("-S", "-M")}">
              </div>
              <div class="card-stacked">
                  <div class="card-content">
                      <h5>${bookInfo.title}</h5>
                      <ul>
                          <li>${bookInfo.author}</li>
                          <li>${bookInfo.publishDate}</li>
                      </ul>
                      <p>${bookInfo.comment}</p>
                  </div>
                  <div class="card-action">
                    <button data-target="modal${bookInfo.isbn}" class="btn waves-effect waves-light red modal-trigger" name="action">Comment
                      <i class="material-icons right">edit</i>
                    </button>
                  </div>
              </div>
          </div>`;
      bookListDiv.appendChild(cardDiv);
      cursor.continue();
    } else {
      console.log("Geen meer items.");
      var elems = document.querySelectorAll('.modal');
      var instances = M.Modal.init(elems);
    }
  };
}

function addComment(isbn) {
  var textin = document.getElementById('modal-text-input' + isbn.toString()).value;

  const transaction = db.transaction([storeName], "readwrite");
  const objectStore = transaction.objectStore(storeName);

  const getRequest = objectStore.get(isbn.toString());

  getRequest.onsuccess = function (event) {
    const book = event.target.result;
    console.log(book);
    book.comment = textin;
    const updateRequest = objectStore.put(book);

    updateRequest.onsuccess = function (event) {
      console.log("Opmerking toegevoegd aan het boek met ISBN", isbn);
      window.location.reload();
    };

    updateRequest.onerror = function (event) {
      console.error("Fout bij het toevoegen van de opmerking aan het boek met ISBN", isbn);
    };
  };

  getRequest.onerror = function (event) {
    console.error("Fout bij het ophalen van het boek met ISBN", isbn);
  };

  transaction.oncomplete = function (event) {
    console.log("Transactie voltooid.");
  };

  transaction.onerror = function (event) {
    console.error("Fout bij het uitvoeren van de transactie.");
  };
}
