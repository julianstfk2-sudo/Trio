// Trio Service Worker: App-Hülle offline verfügbar. Bei Änderungen die Version V erhöhen.
const V = "trio-v1";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];
self.addEventListener("install", e => e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener("activate", e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const u = new URL(e.request.url);
  if (u.hostname.endsWith("openfoodfacts.org")) return;            // Produktabfragen nie zwischenspeichern
  if (u.origin === location.origin || u.hostname === "unpkg.com") {  // App-Dateien und Scan-Bibliothek
    e.respondWith(caches.match(e.request).then(hit => {
      const net = fetch(e.request).then(r => {
        if (r && (r.ok || r.type === "opaque")) { const cp = r.clone(); caches.open(V).then(c => c.put(e.request, cp)); }
        return r;
      }).catch(() => hit);
      return hit || net;                                            // sofort aus dem Cache, im Hintergrund aktualisieren
    }));
  }
});
