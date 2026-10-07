/* Service worker — Gestão de Atividades
   Guarda a "casca" do app (HTML, biblioteca, ícones) para abrir rápido e
   permitir a instalação. Os DADOS nunca passam pelo cache: chamadas ao
   Supabase vão sempre direto para a rede.
   Ao alterar este arquivo ou os ícones, incremente a VERSAO. */
const VERSAO = "v1";
const CACHE = "atividades-" + VERSAO;
const CASCA = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/dist/umd/supabase.js"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CASCA)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(chaves => Promise.all(chaves.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if(req.method !== "GET") return;                         // gravações: sempre rede
  const url = new URL(req.url);
  if(url.hostname.endsWith("supabase.co")) return;         // dados: sempre rede

  // Página: rede primeiro (pega a versão nova publicada), cache se offline
  if(req.mode === "navigate"){
    e.respondWith(
      fetch(req)
        .then(resp => { const copia = resp.clone(); caches.open(CACHE).then(c => c.put("./index.html", copia)); return resp; })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Demais arquivos (biblioteca, ícones, fontes): cache primeiro
  e.respondWith(
    caches.match(req).then(emCache => emCache || fetch(req).then(resp => {
      if(resp.ok && (url.origin === location.origin || url.hostname.endsWith("jsdelivr.net") || url.hostname.endsWith("gstatic.com"))){
        const copia = resp.clone(); caches.open(CACHE).then(c => c.put(req, copia));
      }
      return resp;
    }))
  );
});
