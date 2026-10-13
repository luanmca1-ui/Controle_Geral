"use client";

import SecaoComoLer from "@/components/SecaoComoLer";
import SecaoPeriodo from "@/components/SecaoPeriodo";
import SecaoDecisoes from "@/components/SecaoDecisoes";
import { SecaoEvolucao, SecaoSemanas } from "@/components/SecoesTempo";
import { SecaoServicos, SecaoBarbeiros } from "@/components/SecoesEquipe";
import { Glossario, SecaoResumo, SecaoUnidades, montarResumo } from "@/components/SecoesFinais";
import { projetar } from "@/lib/projecao";
import { montarDecisoes } from "@/lib/decisoes";
import { ajustarBarbeirosPeloMix, resumirServicos } from "@/lib/agregacoes";
import { formatarDataCompleta, formatarMoeda, somarDias } from "@/lib/parse";
import type { AppConfig, Conta, DiaFaturamento, SaldoUnidade } from "@/lib/types";
import type { LancamentoComissao } from "@/lib/comissoes";
import type { Profissional } from "@/lib/profissionais";
import type { DocumentoUnidade } from "@/lib/documentos";

/**
 * Prévia de design.
 *
 * Os dados são sintéticos, mas passam pelo mesmo motor da aplicação: projetar,
 * montarDecisoes e as agregações são as funções de produção. Assim o que
 * aparece aqui é o que vai aparecer com a planilha ligada.
 */

const CONFIG: AppConfig = {
  taxaCredito: 0.019,
  taxaDebito: 0.011,
  taxaPix: 0,
  janelaSemanas: 8,
  reservaMinima: 2000,
  diasSaldoDesatualizado: 7,
  percentualComissao: 0.4,
  percentualComissaoAVista: 0.2,
  diaComissao: 1,
  diaInsumos: 2,
};

const UNIDADES = ["Metrópole", "Marabá", "Castanheira"] as const;
const HOJE = "2026-09-30";

function gerarFaturamento(): DiaFaturamento[] {
  const dias: DiaFaturamento[] = [];
  const porUnidade: Record<string, number> = {
    Metrópole: 1.0,
    Marabá: 0.72,
    Castanheira: 0.55,
  };

  // 5 meses de histórico até 28/09, com sazonalidade por dia da semana
  for (let recuo = 150; recuo >= 2; recuo--) {
    const data = somarDias(HOJE, -recuo);
    const d = new Date(`${data}T12:00:00Z`).getUTCDay();
    if (d === 1) continue; // segunda fechada

    const peso = [1.25, 0, 0.62, 0.7, 0.85, 1.05, 1.3][d];
    // leve alta nos últimos 30 dias
    const tendencia = recuo < 30 ? 1.09 : 1;

    for (const unidade of UNIDADES) {
      const base = 1450 * peso * porUnidade[unidade] * tendencia;
      const ruido = 0.86 + ((recuo * 7 + unidade.length * 13) % 29) / 100;
      const total = Math.round(base * ruido);

      const atendimentos = Math.max(8, Math.round(total / (41 + (recuo % 6))));
      const dinheiro = Math.round(total * 0.27);
      const pix = Math.round(total * 0.24);
      const credito = Math.round(total * 0.27);
      const debito = total - dinheiro - pix - credito;

      dias.push({
        unidade,
        data,
        diaSemana: d,
        total,
        clientes: Math.round(atendimentos * 0.88),
        atendimentos,
        credito,
        debito,
        dinheiro,
        pix,
        consistente: true,
      });
    }
  }

  return dias.sort((a, b) => (a.data < b.data ? 1 : -1));
}

function gerarContas(): Conta[] {
  const modelos: [string, string, number, number, string][] = [
    ["Shopping Metrópole", "Aluguel", 9850, 3, "Agendado (Aguard. Alan)"],
    ["Energisa", "Energia", 2140, 5, "Agendado (Confirmado Alan)"],
    ["Distribuidora Barba Forte", "Insumos", 1680, 6, ""],
    ["Contabilidade Prisma", "Serviços", 890, 8, "Aprovado"],
    ["Shopping Pátio Marabá", "Aluguel", 7300, 4, "Agendado (Aguard. Alan)"],
    ["Cosan Água", "Água", 430, 9, ""],
    ["Vivo Fibra", "Internet", 260, 10, "Agendado (Confirmado Alan)"],
  ];

  const contas: Conta[] = modelos.map((modelo, indice) => {
    const [favorecido, categoria, valor, dia, controle] = modelo;
    return {
      id: `${indice}`,
      categoria,
      favorecido,
      valor,
      vencimento: somarDias(HOJE, dia),
      pagamento: null,
      boletoDisponibilizado: indice % 3 !== 0,
      controle,
      statusPagamento: "Aberto",
      unidade: UNIDADES[indice % UNIDADES.length],
      item: categoria,
    };
  });

  // duas vencidas, para a seção de pendências
  contas.push({
    id: "v1",
    categoria: "Aluguel",
    favorecido: "Shopping Tacaruna",
    valor: 9846.37,
    vencimento: somarDias(HOJE, -25),
    pagamento: null,
    boletoDisponibilizado: true,
    controle: "",
    statusPagamento: "Aberto em Atraso",
    unidade: "Castanheira",
    item: "Aluguel",
  });

  return contas;
}

function gerarComissoes(): LancamentoComissao[] {
  const lancamentos: LancamentoComissao[] = [];
  const catalogo: [string, number, number][] = [
    ["Corte", 29.9, 0.5],
    ["Corte e Barba", 59.8, 0.4],
    ["Barba", 29.9, 0.5],
    ["Cabelo, barba e sobrancelha", 69.8, 0.4],
    ["Pigmentação", 89.9, 0.35],
    ["Produtos", 45.0, 0.15],
  ];
  const equipe: [string, string, number][] = [
    ["Diego", "Metrópole", 1.12],
    ["Fernanda", "Metrópole", 0.94],
    ["Andrei", "Castanheira", 1.02],
    ["Anderson", "Castanheira", 0.88],
    ["Thiago", "Marabá", 1.05],
    ["Bruno", "Marabá", 0.7],
  ];

  for (let recuo = 27; recuo >= 2; recuo--) {
    const data = somarDias(HOJE, -recuo);
    const d = new Date(`${data}T12:00:00Z`).getUTCDay();
    if (d === 1) continue;

    equipe.forEach(([profissional, unidade, fator], indiceEquipe) => {
      const quantidade = 6 + ((recuo + indiceEquipe * 3) % 5);
      for (let i = 0; i < quantidade; i++) {
        const [servico, preco, percentual] =
          catalogo[(recuo + i + indiceEquipe) % catalogo.length];
        const valor = Math.round(preco * fator * 100) / 100;
        lancamentos.push({
          unidade,
          data,
          profissional,
          servico,
          valor,
          comissao: Math.round(valor * percentual * 100) / 100,
          volume: 1,
          percentual,
        });
      }
    });
  }

  // profissional novo, com amostra pequena
  lancamentos.push({
    unidade: "Marabá",
    data: somarDias(HOJE, -3),
    profissional: "Caio",
    servico: "Corte",
    valor: 29.9,
    comissao: 14.95,
    volume: 9,
    percentual: 0.5,
  });

  return lancamentos;
}

const SALDOS: SaldoUnidade[] = [
  {
    unidade: "Metrópole",
    saldo: 18400,
    insumoSemanal: 820,
    atualizadoEm: "2026-09-29",
    atualizadoPor: "Camila",
    diasDesatualizado: 1,
    linha: 2,
  },
  {
    unidade: "Marabá",
    saldo: 4100,
    insumoSemanal: 610,
    atualizadoEm: "2026-09-29",
    atualizadoPor: "Camila",
    diasDesatualizado: 1,
    linha: 3,
  },
  {
    unidade: "Castanheira",
    saldo: 2600,
    insumoSemanal: 540,
    atualizadoEm: "2026-09-18",
    atualizadoPor: "Camila",
    diasDesatualizado: 12,
    linha: 4,
  },
];

const PROFISSIONAIS: Profissional[] = [
  {
    linha: 2,
    unidade: "Castanheira",
    nome: "Anderson Gonçalves Aires",
    apelido: "Anderson",
    funcao: "Barbeiro",
    relacao: "Parceria",
    status: "Ativo",
    dataInicio: "2026-05-20",
    contrato: false,
    dataContrato: null,
    pastaParceiro: "",
    obs: "Contrato enviado em 12/08, sem retorno até agora",
    atualizacao: "2026-09-22",
    notas: [true, true, true, true, true, true, true, true, false, false, false, false],
  },
  {
    linha: 3,
    unidade: "Metrópole",
    nome: "Fernanda Alves Rocha",
    apelido: "Fernanda",
    funcao: "Barbeira",
    relacao: "Parceria",
    status: "Ativo",
    dataInicio: "2026-01-19",
    contrato: true,
    dataContrato: "2026-01-19",
    pastaParceiro: "https://drive.google.com/exemplo",
    obs: "",
    atualizacao: "2026-09-10",
    notas: [true, true, true, true, true, true, true, true, false, false, false, false],
  },
  {
    linha: 4,
    unidade: "Marabá",
    nome: "Bruno Carvalho Dias",
    apelido: "Bruno",
    funcao: "Barbeiro",
    relacao: "Parceria",
    status: "Ativo",
    dataInicio: "2026-03-07",
    contrato: false,
    dataContrato: null,
    pastaParceiro: "",
    obs: "Solicitado duas vezes, aguardando devolução",
    atualizacao: null,
    notas: [true, true, true, true, true, true, true, false, false, false, false, false],
  },
];

const DOCUMENTOS: DocumentoUnidade[] = [
  {
    unidade: "Castanheira",
    documento: "AVCB",
    orgao: "Corpo de Bombeiros",
    numero: "123.456",
    emissao: "2025-08-15",
    vencimento: "2026-08-15",
    alertaDias: 60,
    protocolo: "5465654",
    custo: 3200,
    responsavel: "Letícia Viana",
    arquivo: "",
    obs: "Renovação depende de vistoria",
    situacao: "vencido",
    diasRestantes: -46,
  },
  {
    unidade: "Metrópole",
    documento: "Licença sanitária",
    orgao: "Vigilância Sanitária",
    numero: "789.012",
    emissao: "2025-11-05",
    vencimento: "2026-11-05",
    alertaDias: 60,
    protocolo: "5465655",
    custo: 950,
    responsavel: "Jurídico",
    arquivo: "",
    obs: "",
    situacao: "alerta",
    diasRestantes: 36,
  },
];

function Painel() {
  const faturamento = gerarFaturamento();
  const comissoes = gerarComissoes();
  const inicio = HOJE;
  const fim = somarDias(HOJE, 13);

  const projecao = projetar({
    faturamento,
    contas: gerarContas(),
    saldos: SALDOS,
    config: CONFIG,
    inicio,
    fim,
    hoje: HOJE,
  });

  const decisoes = montarDecisoes({
    projecao,
    profissionais: PROFISSIONAIS,
    documentos: DOCUMENTOS,
    mes: 8,
  });

  const resumo = montarResumo(projecao, decisoes.map((d) => d.titulo));
  const emRisco = projecao.unidades.filter((u) => u.status === "risco");
  const faltaTotal = emRisco.reduce((t, u) => t + u.faltaNoPior, 0);
  const primeiroFuro = emRisco
    .map((u) => u.primeiroDiaNegativo)
    .filter((d): d is string => Boolean(d))
    .sort()[0];

  return (
    <div className="mx-auto max-w-painel">
      <section className="mb-7">
        <p className="text-[13px] text-muted">
          {formatarDataCompleta(projecao.inicio)} a {formatarDataCompleta(projecao.fim)}
        </p>
        <h1
          className={`mt-1 text-[28px] font-bold leading-9 tracking-tight ${
            emRisco.length > 0 ? "text-crit" : ""
          }`}
        >
          {emRisco.length === 0
            ? "O caixa cobre tudo no período."
            : emRisco.length === 1
              ? `${emRisco[0].unidade} não fecha o período.`
              : `${emRisco.length} unidades não fecham o período.`}
        </h1>
        <p className="mt-1.5 text-[15px] leading-relaxed text-ink2">
          {emRisco.length === 0 ? (
            <>Sobram {formatarMoeda(projecao.resumo.saldoFinal)} depois de pagar o que vence.</>
          ) : (
            <>
              Faltam {formatarMoeda(faltaTotal)} no total, e a primeira falha é em{" "}
              <span className="font-medium text-ink">
                {primeiroFuro && formatarDataCompleta(primeiroFuro)}
              </span>
              .
            </>
          )}
        </p>
      </section>

      <SecaoComoLer />
      {projecao.comparativoRede && <SecaoPeriodo dados={projecao.comparativoRede} parcial />}
      <SecaoDecisoes decisoes={decisoes} />
      <SecaoEvolucao meses={projecao.evolucaoMensal} />
      <SecaoSemanas semanas={projecao.semanas} />
      <SecaoServicos servicos={resumirServicos(comissoes)} />
      <SecaoBarbeiros barbeiros={ajustarBarbeirosPeloMix(comissoes)} />
      <SecaoUnidades dados={projecao} periodo="quinze" de={HOJE} />
      <SecaoResumo dados={projecao} linhas={resumo} />
      <Glossario />
    </div>
  );
}

export default function PaginaPrevia() {
  return (
    <div>
      <div data-theme="light" className="bg-bg px-4 py-6 text-ink">
        <p className="mx-auto mb-4 max-w-painel text-[11px] font-semibold uppercase tracking-wide text-muted">
          Tema claro
        </p>
        <Painel />
      </div>

      <div data-theme="dark" className="bg-bg px-4 py-6 text-ink">
        <p className="mx-auto mb-4 max-w-painel text-[11px] font-semibold uppercase tracking-wide text-muted">
          Tema escuro
        </p>
        <Painel />
      </div>
    </div>
  );
}
