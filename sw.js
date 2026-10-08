// Trio Service Worker: Netzwerk zuerst. Beim Öffnen holt die App immer die neueste Version.
// Der Zwischenspeicher dient nur als Notfall, wenn du offline bist oder das Netz länger als 3 Sekunden braucht.
// Du musst diese Datei bei Updates NICHT ändern. Einfach index.html (und was sich sonst geändert hat) ersetzen.
const V = "trio-v5";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];
const INDEX = new URL("./index.html", self.registration.scope).href;

self.addEventListener("install", e => e.waitUntil(
  caches.open(V).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting())));

self.addEventListener("activate", e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())));

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const u = new URL(req.url);
  if (u.hostname.endsWith("openfoodfacts.org")) return;              // Produktabfragen und Bilder nie zwischenspeichern
  const same = u.origin === location.origin;
  if (!same && u.hostname !== "unpkg.com") return;

  if (!same) {                                                        // Scan-Bibliothek (feste Version): Cache zuerst
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
      if (r && (r.ok || r.type === "opaque")) { const cp = r.clone(); caches.open(V).then(c => c.put(req, cp)); }
      return r;
    })));
    return;
  }

  const key = req.mode === "navigate" ? INDEX : req;                  // Startseite immer unter demselben Schlüssel
  const net = fetch(req.mode === "navigate" ? INDEX : req, { cache: "no-store" }).then(r => {
    if (r.ok) { const cp = r.clone(); caches.open(V).then(c => c.put(key, cp)); }
    return r;
  });
  const slow = new Promise(res => setTimeout(() => res(null), 3000));
  e.respondWith(Promise.race([net.catch(() => null), slow]).then(r => r || caches.match(key).then(hit => hit || net)));
});
