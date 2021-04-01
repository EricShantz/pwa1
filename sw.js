//service worker for suggest-a-movie app

let staticCache = 'static-v5';
let dynamicCache = 'dynamic-v5';
// let dbVersion = 1;
let maxLength = 65;
let staticList = [
  '/',
  '/index.html',
  '/manifest.json',
  '/404.html',
  '/css/main.css',
  '/css/materialize.min.css',
  '/js/app.js',
  '/js/materialize.min.js',
  '/img/offline.png',
  'img/icon-512x512.png',
  'img/TMdb.svg',
  'https://fonts.googleapis.com/icon?family=Material+Icons',
  'https://fonts.gstatic.com/s/materialicons/v78/flUhRq6tzZclQEJ-Vdg-IuiaDsNcIhQ8tQ.woff2',
];

//https://www.google.com/search?q=how+to+limit+dynamic+cache+size+in+pwa&rlz=1C5CHFA_enCA913CA913&oq=how+to&aqs=chrome.0.69i59l3j69i57j69i65l2j69i61l2.2063j0j7&sourceid=chrome&ie=UTF-8#kpvalbx=_PJBkYMezLJuo5NoP-pSn8AU12
const cacheLimit = (cacheName, maxLength) => {
  caches.open(cacheName)
  .then(cache => { cache.keys()
    .then(keys => {
      if (keys.length > maxLength) {
        cache.delete(keys[0])
        .then(cacheLimit(cacheName, maxLength))
      }
    })
  })
}

//open and fill static cache
self.addEventListener('install', ev => {
  ev.waitUntil(
    (async () => {
      const cache = await caches.open(staticCache)
      console.log('Caching static assets')
      await cache.addAll(staticList) 
    })()
  )
  console.log('Service worker has been installed', ev)
  self.skipWaiting()
});

self.addEventListener('activate', ev => {
  ev.waitUntil(
    (async() => {
      const keys = await caches.keys()
      return Promise.all(keys
        .filter(key => (key !== staticCache && key !== dynamicCache)) 
            .map(key => caches.delete(key))
          )
    })()
  )
  self.clients.claim(); // but should put in checks before doing this, old service worker may be caching some sort of info for example that you may need
  console.log('Service worker has been activated')
})

//open and add items to dynamic cache
self.addEventListener('fetch', ev => {
  if (
    ev.request.method === 'GET'
  ) {
  ev.respondWith(
    (async () => {
      const cachedResponse = await caches.match(ev.request)
      const dyncache = await caches.open(dynamicCache)
      
      if (cachedResponse){
        return cachedResponse
      }
    
      try{
        const networkResponse = await fetch(ev.request)
        dyncache.put(ev.request, networkResponse.clone())
        // TO DO: control which assets go into dynamic cache here - suggest and movie results html as well as their images
        // right now it is storing everything that is not already in static cache
        cacheLimit(dynamicCache, maxLength)
        return networkResponse
      } catch(error) {
        const requestedPage = ev.request.url.indexOf('.html')
        if(requestedPage > -1) {
          return caches.match('/404.html')
        } 
      }
    })()
  )
}})

//offline loading
self.addEventListener('fetch', (ev) => {
  if (ev.request.mode === 'navigate') {
    ev.respondWith(
      (async () => {
        try {
          const preloadResponse = await ev.preloadResponse
          if (preloadResponse) {
            return preloadResponse
          }

          const networkResponse = await fetch(ev.request)
          return networkResponse
        } catch (error) {
          
          console.log('Fetch failed; returning offline page instead.', error)

          const cache = await caches.open(staticCache)
          const cachedResponse = await cache.match('/404.html')
          return cachedResponse
        }
      })()
  )} 
});

self.addEventListener('message', ({ data }) => {
  //message received from a web page that uses this sw
  console.log(data)
});

const sendMessage = async (msg) => {
  //send a message from the service worker to the webpage(s)
  let allClients = await clients.matchAll({ includeUncontrolled: true });
  return Promise.all(
    allClients.map((client) => {
      let channel = new MessageChannel();
      channel.port1.onmessage = onMessage;
      //port1 for send port2 for receive
      return client.postMessage(msg, [channel.port2]);
    })
  );
};
