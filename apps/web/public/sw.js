// v1 installed a service worker here for offline use; v2 has none. A returning visitor's browser would keep serving the
// old site from it, so this replaces it, clears what it cached, and removes itself.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await Promise.all((await caches.keys()).map((key) => caches.delete(key)));
      await self.registration.unregister();
      const pages = await self.clients.matchAll({ type: 'window' });
      for (const page of pages) page.navigate(page.url);
    })(),
  );
});
