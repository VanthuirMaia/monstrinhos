// Service worker da Arena dos Monstrinhos.
// Ao publicar uma versão nova, troque o número abaixo para os celulares baixarem tudo de novo.
const VERSAO = "monstrinhos-v2";
const BASE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(VERSAO)
      .then((c) => c.addAll(BASE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((ks) =>
        Promise.all(
          ks.filter((k) => k !== VERSAO).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // página do jogo: busca a versão mais nova primeiro, usa a guardada se estiver sem internet
  if (
    req.mode === "navigate" ||
    (url.origin === location.origin && url.pathname.endsWith("/index.html"))
  ) {
    e.respondWith(
      fetch(req)
        .then((r) => {
          const cp = r.clone();
          caches.open(VERSAO).then((c) => c.put("./index.html", cp));
          return r;
        })
        .catch(() => caches.match("./index.html")),
    );
    return;
  }

  // biblioteca de conexão e fontes: usa a guardada e atualiza por trás
  const cdn =
    url.hostname === "cdn.jsdelivr.net" ||
    url.hostname.endsWith("googleapis.com") ||
    url.hostname.endsWith("gstatic.com");
  if (url.origin === location.origin || cdn) {
    e.respondWith(
      caches.open(VERSAO).then((c) =>
        c.match(req).then((hit) => {
          const net = fetch(req)
            .then((r) => {
              if (r.ok || r.type === "opaque") c.put(req, r.clone());
              return r;
            })
            .catch(() => hit);
          return hit || net;
        }),
      ),
    );
  }
  // o resto (servidor de conexão da partida) passa direto, sem cache
});
