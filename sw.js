/* Finance Pro — service worker
   Regra de ouro: NADA do Supabase passa por aqui. Dados e login vão sempre
   direto para a rede, para ninguém ver saldo velho nem sessão antiga.
   Ao mudar a lista abaixo, suba a versão (finance-v2, v3...). */
const VERSAO = 'finance-v1';
const GUARDAR = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icone-192.png',
  './icone-512.png',
  './icone-512-maskable.png',
  './icone-180.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSAO)
      .then((c) => c.addAll(GUARDAR))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ns) => Promise.all(ns.filter((n) => n !== VERSAO).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Supabase (banco, login) e qualquer outra origem: direto na rede, sem cache
  if (url.origin !== self.location.origin) return;
  if (url.pathname.includes('/auth/') || url.pathname.includes('/rest/')) return;

  // Rede primeiro; sem internet, entrega a última versão guardada
  e.respondWith(
    fetch(req)
      .then((resp) => {
        if (resp && resp.ok && resp.type === 'basic') {
          const copia = resp.clone();
          caches.open(VERSAO).then((c) => c.put(req, copia)).catch(() => {});
        }
        return resp;
      })
      .catch(() => caches.match(req).then((c) => c || caches.match('./index.html')))
  );
});
