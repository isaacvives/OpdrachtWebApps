// Vang het 'install' event op en laat iets weten.
self.addEventListener("install", (event) => {
    console.log("Service worker installed: ", event);
});

// Vang het 'activate' event op.
self.addEventListener("activate", (event) => {
    console.log("Service worker activated: ", event);
});

// Vang het 'fetch' event op en doe er (eventueel) iets mee.
self.addEventListener("fetch", (event) => {
    console.log("Item fetched...");

    // Voorlopig het 'fetch verzoek' niet aanpassen, maar
    // gewoon doorsturen naar het internet...
    event.respondWith(fetch(event.request));

    // Zie: https://developer.mozilla.org/en-US/docs/Web/API/FetchEvent.
});