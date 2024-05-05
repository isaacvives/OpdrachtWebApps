var objectStore;
const dbName = "bookDatabase";
const storeName = "books";
var db;

document.addEventListener('DOMContentLoaded', function () {
  var elems = document.querySelectorAll('.fixed-action-btn');
  var instances = M.FloatingActionButton.init(elems);

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
      const cardDiv = document.createElement('div');
      cardDiv.className = 'col s12 m7';
      cardDiv.innerHTML = `
          <!-- Modal Structure -->
          <div id="modal${bookInfo.isbn}" class="modal">
            <div class="modal-content">
              <h4>Commentaar</h4>
              <form>
                <div class="input-field">
                  <input id="modal-text-input" type="text" class="validate">
                  <label for="modal-text-input">Enter Text</label>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button id="modal-submit-btn" class="modal-close waves-effect waves-green btn" onclick="addComment">Submit</button>
            </div>
          </div>
          
          <div class="card horizontal">
              <div class="card-image">
                  <img id="bookThumbnail" src="${bookInfo.thumbnail.replace("-S", "-M")}">
              </div>
              <div class="card-stacked">
                  <div class="card-content">
                      <h5>${bookInfo.title}</h5>
                      <ul>
                          <li>${bookInfo.author}</li>
                          <li>${bookInfo.publishDate}</li>
                      </ul>
                  </div>
                  <div class="card-action">
                    <button data-target="modal${bookInfo.isbn}" class="btn waves-effect waves-light modal-trigger" name="action">Comment
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
