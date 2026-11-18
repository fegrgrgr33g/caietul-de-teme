/* Caietul de teme: service worker minimal, ca site-ul să se poată instala pe telefon.
   Păstrează în cache doar fișierele site-ului; datele (Supabase) vin mereu de pe internet. */
const CACHE = "caiet-v4";
const FISIERE = ["./", "index.html", "style.css", "atelier.css", "viu.css", "config.js", "continut.js", "liceu.js", "extra.js", "nav.js", "plus.js", "elevi.js", "bac.js", "viu.js", "app.js", "manifest.json", "icon.svg"];
// bibliotecile și fonturile de pe alte site-uri: păstrate în cache, ca Opere/Limbă/Jocuri să meargă și fără internet
const STRAINE = ["https://cdn.jsdelivr.net/", "https://fonts.googleapis.com/", "https://fonts.gstatic.com/"];

self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FISIERE)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  if (STRAINE.some(s => e.request.url.startsWith(s))) {
    e.respondWith(caches.match(e.request).then(c => c || fetch(e.request).then(r => { const copie = r.clone(); caches.open(CACHE).then(x => x.put(e.request, copie)); return r; })));
    return;
  }
  if (u.origin !== location.origin) return;
  // întâi rețeaua (ca să fie mereu ultima versiune), cache-ul doar fără internet
  e.respondWith(fetch(e.request).then(r => { const copie = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copie)); return r; })
    .catch(() => caches.match(e.request)));
});
