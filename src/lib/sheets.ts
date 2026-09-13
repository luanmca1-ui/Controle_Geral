import { google, sheets_v4 } from "googleapis";
import {
  diferencaEmDias,
  hojeEmSaoPaulo,
  parseData,
  parseDiaSemana,
  parseMoeda,
  diaSemanaDaData,
} from "./parse";
import type { AppConfig, Conta, DiaFaturamento, SaldoUnidade } from "./types";
import type { Perfil } from "./sessao";
import { lerDocumentosDasLinhas, type DocumentoUnidade } from "./documentos";
import { lerComissoesDasLinhas, type LancamentoComissao } from "./comissoes";
import {
  letraDaColuna,
  mapearColunas,
  montarProfissional,
  type MapaColunas,
  type Profissional,
} from "./profissionais";

const ESCOPO = ["https://www.googleapis.com/auth/spreadsheets"];

/**
 * Posicao das colunas na planilha BUnificada.
 * Se a planilha mudar de formato, este e o unico lugar a ajustar.
 */
export const COLUNAS = {
  faturamento: {
    aba: "Faturamento",
    primeiraLinha: 2, // cabecalho na linha 1
    intervalo: "Faturamento!A2:AE",
    unidadeOriginal: 1, // B
    total: 19, // T
    credito: 20, // U
    debito: 21, // V
    dinheiro: 22, // W
    pix: 23, // X
    unidade: 27, // AB - Unidade Corrigida
    data: 28, // AC
    diaSemana: 30, // AE
  },
  contas: {
    aba: "BContasFixas",
    primeiraLinha: 4, // cabecalho na linha 3
    intervalo: "BContasFixas!A4:P",
    categoria: 1, // B
    favorecido: 2, // C
    valor: 3, // D
    vencimento: 4, // E
    pagamento: 5, // F
    boleto: 7, // H
    controle: 8, // I
    statusPagamento: 12, // M
    item: 13, // N
    unidade: 15, // P - Unidade Corrigida
  },
  saldos: {
    aba: "ContaStone",
    primeiraLinha: 2, // cabecalho na linha 1
    intervalo: "ContaStone!A2:E",
    unidade: 0, // A
    saldo: 1, // B
    atualizadoEm: 2, // C
    atualizadoPor: 3, // D
    insumoSemanal: 4, // E
  },
  config: {
    aba: "AppConfig",
    intervalo: "AppConfig!A2:B",
  },
  acessos: {
    aba: "Acessos",
    primeiraLinha: 2, // cabecalho na linha 1
    intervalo: "Acessos!A2:F",
    nome: 0, // A
    codigo: 1, // B
    perfil: 2, // C
    unidades: 3, // D
    ativo: 4, // E
    abas: 5, // F
  },
} as const;

export const CONFIG_PADRAO: AppConfig = {
  taxaCredito: 0,
  taxaDebito: 0,
  taxaPix: 0,
  janelaSemanas: 8,
  reservaMinima: 0,
  diasSaldoDesatualizado: 7,
  percentualComissao: 0.4,
  percentualComissaoAVista: 0,
  diaComissao: 1, // segunda
  diaInsumos: 2, // terca
};

let clienteSheets: sheets_v4.Sheets | null = null;

function idDaPlanilha(): string {
  const id = process.env.SPREADSHEET_ID;
  if (!id) {
    throw new Error(
      "SPREADSHEET_ID nao configurado. Copie .env.example para .env.local e preencha."
    );
  }
  return id;
}

function conectar(): sheets_v4.Sheets {
  if (clienteSheets) return clienteSheets;

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const chave = process.env.GOOGLE_PRIVATE_KEY;

  if (!email || !chave) {
    throw new Error(
      "Credenciais da conta de servico ausentes. Preencha GOOGLE_SERVICE_ACCOUNT_EMAIL e GOOGLE_PRIVATE_KEY."
    );
  }

  const auth = new google.auth.JWT({
    email,
    key: chave.replace(/\\n/g, "\n"),
    scopes: ESCOPO,
  });

  clienteSheets = google.sheets({ version: "v4", auth });
  return clienteSheets;
}

/* ---------------------------------------------------------------- cache */

interface EntradaCache<T> {
  valor: T;
  expiraEm: number;
}

const cache = new Map<string, EntradaCache<unknown>>();

async function comCache<T>(
  chave: string,
  segundos: number,
  carregar: () => Promise<T>
): Promise<T> {
  const agora = Date.now();
  const existente = cache.get(chave) as EntradaCache<T> | undefined;
  if (existente && existente.expiraEm > agora) return existente.valor;

  const valor = await carregar();
  cache.set(chave, { valor, expiraEm: agora + segundos * 1000 });
  return valor;
}

export function limparCache(chave?: string): void {
  if (chave) cache.delete(chave);
  else cache.clear();
}

async function lerIntervalo(intervalo: string): Promise<string[][]> {
  const sheets = conectar();
  const resposta = await sheets.spreadsheets.values.get({
    spreadsheetId: idDaPlanilha(),
    range: intervalo,
    valueRenderOption: "FORMATTED_VALUE",
  });
  return (resposta.data.values ?? []) as string[][];
}

/* ----------------------------------------------------------- faturamento */

export async function lerFaturamento(): Promise<DiaFaturamento[]> {
  return comCache("faturamento", 600, async () => {
    const linhas = await lerIntervalo(COLUNAS.faturamento.intervalo);
    const col = COLUNAS.faturamento;
    const dias: DiaFaturamento[] = [];

    for (const linha of linhas) {
      const unidade = String(linha[col.unidade] ?? "").trim();
      const data = parseData(linha[col.data]);
      if (!unidade || !data) continue;

      const credito = parseMoeda(linha[col.credito]);
      const debito = parseMoeda(linha[col.debito]);
      const dinheiro = parseMoeda(linha[col.dinheiro]);
      const pix = parseMoeda(linha[col.pix]);
      const total = parseMoeda(linha[col.total]);

      const soma = credito + debito + dinheiro + pix;
      // tolerancia de um centavo por causa de arredondamento da planilha
      const consistente = Math.abs(soma - total) <= 0.01;

      dias.push({
        unidade,
        data,
        diaSemana: parseDiaSemana(linha[col.diaSemana]) ?? diaSemanaDaData(data),
        total,
        credito,
        debito,
        dinheiro,
        pix,
        consistente,
      });
    }

    dias.sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0));
    return dias;
  });
}

/* ---------------------------------------------------------------- contas */

export async function lerContas(): Promise<Conta[]> {
  return comCache("contas", 120, async () => {
    const linhas = await lerIntervalo(COLUNAS.contas.intervalo);
    const col = COLUNAS.contas;

    return linhas
      .map((linha, indice): Conta => {
        const boleto = String(linha[col.boleto] ?? "").trim().toLowerCase();
        return {
          id: `${col.primeiraLinha + indice}`,
          categoria: String(linha[col.categoria] ?? "").trim(),
          favorecido: String(linha[col.favorecido] ?? "").trim(),
          valor: parseMoeda(linha[col.valor]),
          vencimento: parseData(linha[col.vencimento]),
          pagamento: parseData(linha[col.pagamento]),
          boletoDisponibilizado: boleto === "sim",
          controle: String(linha[col.controle] ?? "").trim(),
          statusPagamento: String(linha[col.statusPagamento] ?? "").trim(),
          unidade: String(linha[col.unidade] ?? "").trim(),
          item: String(linha[col.item] ?? "").trim(),
        };
      })
      .filter((conta) => conta.unidade && conta.valor > 0);
  });
}

/* ---------------------------------------------------------------- saldos */

export async function lerSaldos(): Promise<SaldoUnidade[]> {
  return comCache("saldos", 30, async () => {
    const linhas = await lerIntervalo(COLUNAS.saldos.intervalo);
    const col = COLUNAS.saldos;
    const hoje = hojeEmSaoPaulo();

    return linhas
      .map((linha, indice): SaldoUnidade => {
        const atualizadoEm = parseData(linha[col.atualizadoEm]);
        return {
          unidade: String(linha[col.unidade] ?? "").trim(),
          saldo: parseMoeda(linha[col.saldo]),
          insumoSemanal: parseMoeda(linha[col.insumoSemanal]),
          atualizadoEm,
          atualizadoPor: String(linha[col.atualizadoPor] ?? "").trim() || null,
          diasDesatualizado: atualizadoEm ? diferencaEmDias(atualizadoEm, hoje) : null,
          linha: col.primeiraLinha + indice,
        };
      })
      .filter((saldo) => saldo.unidade);
  });
}

/** Grava o saldo de uma unidade em ContaStone, com data e autor. */
export async function gravarSaldo(
  unidade: string,
  saldo: number,
  autor: string
): Promise<SaldoUnidade> {
  const saldos = await lerSaldos();
  const alvo = saldos.find((item) => item.unidade === unidade);
  if (!alvo) {
    throw new Error(`Unidade "${unidade}" nao existe na aba ContaStone.`);
  }

  const hoje = hojeEmSaoPaulo();
  const [ano, mes, dia] = hoje.split("-");
  const sheets = conectar();

  await sheets.spreadsheets.values.update({
    spreadsheetId: idDaPlanilha(),
    range: `${COLUNAS.saldos.aba}!B${alvo.linha}:D${alvo.linha}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[saldo, `${dia}/${mes}/${ano}`, autor]],
    },
  });

  limparCache("saldos");

  return {
    ...alvo,
    saldo,
    atualizadoEm: hoje,
    atualizadoPor: autor,
    diasDesatualizado: 0,
  };
}

/* --------------------------------------------------------------- acessos */

export interface Acesso {
  nome: string;
  codigo: string;
  perfil: Perfil;
  /** vazio = todas as unidades */
  unidades: string[];
  /** vazio = padrao do perfil */
  abas: string[];
  ativo: boolean;
}

/** Aceita "Metrópole, Marabá" e "Metrópole; Marabá", em uma celula so. */
function separarUnidades(valor: string): string[] {
  return valor
    .split(/[;,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizarPerfil(valor: string): Perfil {
  const limpo = valor.trim().toLowerCase();
  if (limpo.startsWith("dono")) return "dono";
  if (limpo.startsWith("gerente")) return "gerente";
  return "gestora";
}

/**
 * Codigos de acesso, lidos da aba Acessos.
 * Cache curto de propósito: remover uma linha da planilha precisa tirar a
 * pessoa do ar em menos de um minuto.
 */
export async function lerAcessos(): Promise<Acesso[]> {
  return comCache("acessos", 60, async () => {
    const linhas = await lerIntervalo(COLUNAS.acessos.intervalo);
    const col = COLUNAS.acessos;

    return linhas
      .map((linha): Acesso => {
        const ativo = String(linha[col.ativo] ?? "").trim().toLowerCase();
        return {
          nome: String(linha[col.nome] ?? "").trim(),
          codigo: String(linha[col.codigo] ?? "").trim(),
          perfil: normalizarPerfil(String(linha[col.perfil] ?? "")),
          unidades: separarUnidades(String(linha[col.unidades] ?? "")),
          abas: separarUnidades(String(linha[col.abas] ?? "")).map((item) =>
            item
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .toLowerCase()
          ),
          // vazio conta como ativo, para nao trancar ninguem por celula em branco
          ativo: ativo === "" || ativo === "sim" || ativo === "true",
        };
      })
      .filter((acesso) => acesso.codigo);
  });
}

/** Confere se um codigo continua valido na planilha. */
export async function buscarAcesso(codigo: string): Promise<Acesso | null> {
  const alvo = codigo.trim().toLowerCase();
  if (!alvo) return null;
  const acessos = await lerAcessos();
  return (
    acessos.find((acesso) => acesso.ativo && acesso.codigo.toLowerCase() === alvo) ?? null
  );
}

/* --------------------------------------------------------- profissionais */

export const ABA_PROFISSIONAIS = "Profissionais";
const INTERVALO_PROFISSIONAIS = "Profissionais!A1:BZ";

export interface DadosProfissionais {
  mapa: MapaColunas;
  lista: Profissional[];
}

/** A tela avisa quando a coluna Atualizacao ainda nao existe na planilha. */
export function temColunaAtualizacao(mapa: MapaColunas): boolean {
  return mapa.atualizacao >= 0;
}

export async function lerProfissionais(): Promise<DadosProfissionais> {
  return comCache("profissionais", 60, async () => {
    const linhas = await lerIntervalo(INTERVALO_PROFISSIONAIS);
    if (linhas.length === 0) {
      throw new Error(
        'Aba "Profissionais" vazia ou inexistente. Confira o nome da aba na planilha.'
      );
    }

    const mapa = mapearColunas(linhas[0]);
    if (mapa.unidade < 0 || mapa.nome < 0) {
      throw new Error(
        'A aba "Profissionais" precisa das colunas "Unidade Corrigida" e "Nome completo".'
      );
    }

    const lista = linhas
      .slice(1)
      // a linha real na planilha e o indice mais dois: uma pelo cabecalho,
      // outra porque a planilha comeca em 1
      .map((linha, indice) => montarProfissional(linha, mapa, indice + 2))
      .filter((pessoa) => pessoa.nome && pessoa.unidade);

    return { mapa, lista };
  });
}

async function gravarCelula(coluna: number, linha: number, valor: boolean | string) {
  const sheets = conectar();
  await sheets.spreadsheets.values.update({
    spreadsheetId: idDaPlanilha(),
    range: `${ABA_PROFISSIONAIS}!${letraDaColuna(coluna)}${linha}`,
    valueInputOption: "RAW",
    requestBody: { values: [[valor]] },
  });
}

/** Carimba a coluna Atualizacao. Ausente, o resto continua funcionando. */
async function carimbarAtualizacao(mapa: MapaColunas, linha: number): Promise<boolean> {
  if (mapa.atualizacao < 0) return false;
  const hoje = hojeEmSaoPaulo();
  const [ano, mes, dia] = hoje.split("-");
  await gravarCelula(mapa.atualizacao, linha, `${dia}/${mes}/${ano}`);
  return true;
}

/**
 * Marca ou desmarca o contrato de um profissional.
 * A pasta no Drive e obrigatoria ao marcar como assinado: contrato sem
 * arquivo guardado nao serve de comprovacao depois.
 */
export async function gravarContrato(
  linha: number,
  assinado: boolean,
  pasta: string | null
): Promise<void> {
  const { mapa, lista } = await lerProfissionais();
  const pessoa = lista.find((item) => item.linha === linha);
  if (!pessoa) throw new Error("Profissional nao encontrado na planilha.");

  if (assinado && !pessoa.pastaParceiro && !pasta) {
    throw new Error("Informe o link da pasta no Drive antes de marcar o contrato como assinado.");
  }

  if (mapa.contrato < 0) throw new Error('Coluna "Contrato" nao encontrada.');
  await gravarCelula(mapa.contrato, linha, assinado);

  if (pasta && mapa.pastaParceiro >= 0) {
    await gravarCelula(mapa.pastaParceiro, linha, pasta);
  }

  await carimbarAtualizacao(mapa, linha);
  limparCache("profissionais");
}

/** Atualiza so o link da pasta, sem mexer no contrato. */
export async function gravarPasta(linha: number, pasta: string): Promise<void> {
  const { mapa } = await lerProfissionais();
  if (mapa.pastaParceiro < 0) throw new Error('Coluna "Pasta Parceiro" nao encontrada.');
  await gravarCelula(mapa.pastaParceiro, linha, pasta);
  await carimbarAtualizacao(mapa, linha);
  limparCache("profissionais");
}

/** Marca a nota fiscal de um mes (0 = janeiro). */
export async function gravarNotaFiscal(
  linha: number,
  mes: number,
  entregue: boolean
): Promise<void> {
  const { mapa } = await lerProfissionais();
  const coluna = mapa.notas[mes];
  if (coluna === undefined || coluna < 0) {
    throw new Error("Coluna de nota fiscal desse mes nao encontrada na planilha.");
  }

  await gravarCelula(coluna, linha, entregue);
  await carimbarAtualizacao(mapa, linha);
  limparCache("profissionais");
}

/* ------------------------------------------------------------ documentos */

export async function lerDocumentos(): Promise<DocumentoUnidade[]> {
  return comCache("documentos", 300, async () => {
    try {
      const linhas = await lerIntervalo("DocumentosUnidade!A1:Z");
      return lerDocumentosDasLinhas(linhas);
    } catch {
      // a aba pode ainda nao existir
      return [];
    }
  });
}

/* -------------------------------------------------------------- comissoes */

export async function lerComissoes(): Promise<LancamentoComissao[]> {
  return comCache("comissoes", 300, async () => {
    for (const aba of ["Comissões", "Comissoes"]) {
      try {
        const linhas = await lerIntervalo(`${aba}!A1:Z`);
        const lancamentos = lerComissoesDasLinhas(linhas);
        if (lancamentos.length > 0) return lancamentos;
      } catch {
        // tenta a proxima grafia do nome da aba
      }
    }
    return [];
  });
}

/* ---------------------------------------------------------------- config */

export async function lerConfig(): Promise<AppConfig> {
  return comCache("config", 60, async () => {
    try {
      const linhas = await lerIntervalo(COLUNAS.config.intervalo);
      const bruto: Record<string, string> = {};
      for (const [chave, valor] of linhas) {
        if (chave) bruto[String(chave).trim()] = String(valor ?? "").trim();
      }

      const numero = (chave: keyof AppConfig): number => {
        const valor = bruto[chave];
        if (valor === undefined || valor === "") return CONFIG_PADRAO[chave];
        const convertido = parseMoeda(valor);
        return Number.isFinite(convertido) ? convertido : CONFIG_PADRAO[chave];
      };

      return {
        taxaCredito: numero("taxaCredito"),
        taxaDebito: numero("taxaDebito"),
        taxaPix: numero("taxaPix"),
        janelaSemanas: Math.max(1, Math.round(numero("janelaSemanas"))),
        reservaMinima: numero("reservaMinima"),
        diasSaldoDesatualizado: Math.max(1, Math.round(numero("diasSaldoDesatualizado"))),
        percentualComissao: numero("percentualComissao"),
        percentualComissaoAVista: numero("percentualComissaoAVista"),
        diaComissao: Math.min(6, Math.max(0, Math.round(numero("diaComissao")))),
        diaInsumos: Math.min(6, Math.max(0, Math.round(numero("diaInsumos")))),
      };
    } catch {
      // A aba AppConfig ainda nao existe. O painel funciona com os padroes.
      return { ...CONFIG_PADRAO };
    }
  });
}

async function criarAbaConfigSeNecessario(): Promise<void> {
  const sheets = conectar();
  const planilha = await sheets.spreadsheets.get({ spreadsheetId: idDaPlanilha() });
  const existe = planilha.data.sheets?.some(
    (aba) => aba.properties?.title === COLUNAS.config.aba
  );
  if (existe) return;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: idDaPlanilha(),
    requestBody: {
      requests: [{ addSheet: { properties: { title: COLUNAS.config.aba } } }],
    },
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: idDaPlanilha(),
    range: `${COLUNAS.config.aba}!A1:B1`,
    valueInputOption: "RAW",
    requestBody: { values: [["chave", "valor"]] },
  });
}

export async function gravarConfig(config: AppConfig): Promise<AppConfig> {
  await criarAbaConfigSeNecessario();
  const sheets = conectar();

  await sheets.spreadsheets.values.update({
    spreadsheetId: idDaPlanilha(),
    range: `${COLUNAS.config.aba}!A2:B11`,
    valueInputOption: "RAW",
    requestBody: {
      values: [
        ["taxaCredito", config.taxaCredito],
        ["taxaDebito", config.taxaDebito],
        ["taxaPix", config.taxaPix],
        ["janelaSemanas", config.janelaSemanas],
        ["reservaMinima", config.reservaMinima],
        ["diasSaldoDesatualizado", config.diasSaldoDesatualizado],
        ["percentualComissao", config.percentualComissao],
        ["percentualComissaoAVista", config.percentualComissaoAVista],
        ["diaComissao", config.diaComissao],
        ["diaInsumos", config.diaInsumos],
      ],
    },
  });

  limparCache("config");
  return config;
}
