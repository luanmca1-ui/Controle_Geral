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
  /** lista vazia significa acesso a todas as unidades */
  unidades: string[];
  /** abas liberadas; vazio usa o padrao do perfil */
  abas: string[];
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
    const bruto = JSON.parse(new TextDecoder().decode(deBase64Url(corpo))) as Partial<Sessao>;
    if (!bruto.exp || bruto.exp < Math.floor(Date.now() / 1000)) return null;

    // Cookies emitidos por versoes anteriores nao tem todos os campos.
    // Eles continuam validos por 30 dias, entao a leitura preenche o que
    // faltar em vez de quebrar.
    return {
      codigo: typeof bruto.codigo === "string" ? bruto.codigo : "",
      nome: typeof bruto.nome === "string" ? bruto.nome : "",
      perfil: bruto.perfil === "dono" || bruto.perfil === "gerente" ? bruto.perfil : "gestora",
      unidades: Array.isArray(bruto.unidades) ? bruto.unidades : [],
      abas: Array.isArray(bruto.abas) ? bruto.abas : [],
      exp: bruto.exp,
    };
  } catch {
    return null;
  }
}

export type Aba = "hoje" | "caixa" | "contas" | "saldos" | "juridico" | "equipe" | "ajustes";

export const TODAS_ABAS: Aba[] = [
  "hoje", "caixa", "contas", "saldos", "juridico", "equipe", "ajustes",
];

/** Quando a coluna Abas esta vazia, vale o padrao do perfil. */
const PADRAO_PERFIL: Record<Perfil, Aba[]> = {
  dono: TODAS_ABAS,
  gestora: TODAS_ABAS,
  gerente: ["caixa", "contas", "saldos", "juridico", "equipe"],
};

export function abasPermitidas(sessao: Sessao | null): Aba[] {
  if (!sessao) return [];

  const padrao = PADRAO_PERFIL[sessao.perfil] ?? PADRAO_PERFIL.gerente;
  const escolhidas = Array.isArray(sessao.abas) ? sessao.abas : [];
  if (escolhidas.length === 0) return padrao;

  // a coluna nunca amplia alem do que o perfil permite
  const doPerfil = new Set(padrao);
  const filtradas = escolhidas.filter((aba): aba is Aba => doPerfil.has(aba as Aba));

  // valor escrito errado na planilha nao pode trancar a pessoa fora de tudo
  return filtradas.length > 0 ? filtradas : padrao;
}

export function abaDoCaminho(caminho: string): Aba | null {
  if (caminho === "/" || caminho.startsWith("/unidade")) return "caixa";
  if (caminho.startsWith("/hoje")) return "hoje";
  if (caminho.startsWith("/contas")) return "contas";
  if (caminho.startsWith("/saldos")) return "saldos";
  if (caminho.startsWith("/juridico")) return "juridico";
  if (caminho.startsWith("/equipe")) return "equipe";
  if (caminho.startsWith("/config")) return "ajustes";
  return null;
}

export function podeVerAba(sessao: Sessao | null, aba: Aba): boolean {
  return abasPermitidas(sessao).includes(aba);
}

export function podeEditar(sessao: Sessao | null): boolean {
  return sessao?.perfil === "dono" || sessao?.perfil === "gestora";
}

/**
 * O escopo vem da coluna Unidades da aba Acessos, e nao do perfil.
 * Lista vazia libera a rede inteira; com nomes, so aqueles.
 */
export function unidadePermitida(sessao: Sessao | null, unidade: string): boolean {
  if (!sessao) return false;
  if (!Array.isArray(sessao.unidades) || sessao.unidades.length === 0) return true;
  return sessao.unidades.includes(unidade);
}
