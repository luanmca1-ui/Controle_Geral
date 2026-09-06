/**
 * Sessao assinada em cookie.
 *
 * O middleware roda no edge e nao consegue falar com a planilha, entao ele
 * so confere assinatura e validade. A checagem de o codigo ainda existir na
 * aba Acessos acontece nas rotas de API, que rodam no Node.
 */

export const NOME_COOKIE = "caixa_sessao";

export type Perfil = "dono" | "gestora" | "gerente";

export interface Sessao {
  /** o codigo usado no login, revalidado a cada requisicao */
  codigo: string;
  nome: string;
  perfil: Perfil;
  /** vazio significa todas as unidades */
  unidade: string;
  /** validade em segundos desde a epoca */
  exp: number;
}

const DURACAO_DIAS = 30;

function segredo(): string {
  return process.env.APP_SECRET ?? "";
}

export function sessaoConfigurada(): boolean {
  return Boolean(segredo());
}

function paraBase64Url(bytes: Uint8Array): string {
  let binario = "";
  bytes.forEach((byte) => {
    binario += String.fromCharCode(byte);
  });
  return btoa(binario).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function deBase64Url(texto: string): Uint8Array {
  const normalizado = texto.replace(/-/g, "+").replace(/_/g, "/");
  const preenchido = normalizado + "=".repeat((4 - (normalizado.length % 4)) % 4);
  const binario = atob(preenchido);
  return Uint8Array.from(binario, (caractere) => caractere.charCodeAt(0));
}

async function assinar(dados: string): Promise<string> {
  const chave = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(segredo()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const assinatura = await crypto.subtle.sign("HMAC", chave, new TextEncoder().encode(dados));
  return paraBase64Url(new Uint8Array(assinatura));
}

export async function criarToken(
  dados: Omit<Sessao, "exp">
): Promise<string> {
  const sessao: Sessao = {
    ...dados,
    exp: Math.floor(Date.now() / 1000) + DURACAO_DIAS * 24 * 60 * 60,
  };
  const corpo = paraBase64Url(new TextEncoder().encode(JSON.stringify(sessao)));
  return `${corpo}.${await assinar(corpo)}`;
}

export async function lerSessao(token: string | undefined): Promise<Sessao | null> {
  if (!token || !segredo()) return null;

  const partes = token.split(".");
  if (partes.length !== 2) return null;

  const [corpo, assinatura] = partes;
  const esperada = await assinar(corpo);

  if (assinatura.length !== esperada.length) return null;
  let diferenca = 0;
  for (let i = 0; i < assinatura.length; i++) {
    diferenca |= assinatura.charCodeAt(i) ^ esperada.charCodeAt(i);
  }
  if (diferenca !== 0) return null;

  try {
    const sessao = JSON.parse(new TextDecoder().decode(deBase64Url(corpo))) as Sessao;
    if (!sessao.exp || sessao.exp < Math.floor(Date.now() / 1000)) return null;
    return sessao;
  } catch {
    return null;
  }
}

export function podeEditar(sessao: Sessao | null): boolean {
  return sessao?.perfil === "dono" || sessao?.perfil === "gestora";
}

/** Gerente enxerga uma unidade so. Os demais enxergam a rede inteira. */
export function unidadePermitida(sessao: Sessao | null, unidade: string): boolean {
  if (!sessao) return false;
  if (sessao.perfil !== "gerente") return true;
  return sessao.unidade === unidade;
}
