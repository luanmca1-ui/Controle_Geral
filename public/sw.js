// Service worker minimo: existe para tornar o painel instalavel no celular.
// A estrategia e sempre rede primeiro, porque saldo e conta a pagar
// desatualizados sao piores do que uma tela de erro.
const CACHE = "caixa-v1";

self.addEventListener("install", (evento) => {
  self.skipWaiting();
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches.keys().then((chaves) =>
      Promise.all(chaves.filter((chave) => chave !== CACHE).map((chave) => caches.delete(chave)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (evento) => {
  const requisicao = evento.request;
  if (requisicao.method !== "GET") return;
  if (new URL(requisicao.url).pathname.startsWith("/api/")) return;

  evento.respondWith(
    fetch(requisicao)
      .then((resposta) => {
        const copia = resposta.clone();
        caches.open(CACHE).then((cache) => cache.put(requisicao, copia));
        return resposta;
      })
      .catch(() => caches.match(requisicao))
  );
});
