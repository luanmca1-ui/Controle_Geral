import { NextResponse } from "next/server";
import { lerConfig, lerContas, lerFaturamento, lerSaldos } from "@/lib/sheets";
import { projetar } from "@/lib/projecao";
import { fimDoMes, hojeEmSaoPaulo, somarDias } from "@/lib/parse";
import { sessaoAtual } from "@/lib/autorizar";

export const dynamic = "force-dynamic";

const DATA_VALIDA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A data de partida pode ser hoje ou qualquer outra escolhida pelo usuario.
 * Os periodos de 7, 15 dias e fim do mes passam a contar a partir dela.
 */
function resolverPeriodo(
  periodo: string | null,
  deParam: string | null,
  inicioParam: string | null,
  fimParam: string | null,
  hoje: string
): { inicio: string; fim: string } {
  if (inicioParam && fimParam && DATA_VALIDA.test(inicioParam) && DATA_VALIDA.test(fimParam)) {
    return { inicio: inicioParam, fim: fimParam < inicioParam ? inicioParam : fimParam };
  }

  const de = deParam && DATA_VALIDA.test(deParam) ? deParam : hoje;

  switch (periodo) {
    case "mes":
      return { inicio: de, fim: fimDoMes(de) < de ? de : fimDoMes(de) };
    case "quinze":
      return { inicio: de, fim: somarDias(de, 14) };
    case "sete":
    default:
      return { inicio: de, fim: somarDias(de, 6) };
  }
}

export async function GET(requisicao: Request) {
  const sessao = await sessaoAtual();
  if (!sessao) {
    return NextResponse.json({ erro: "Sessão expirada. Entre de novo." }, { status: 401 });
  }

  try {
    const url = new URL(requisicao.url);
    const hoje = hojeEmSaoPaulo();
    const { inicio, fim } = resolverPeriodo(
      url.searchParams.get("periodo"),
      url.searchParams.get("de"),
      url.searchParams.get("inicio"),
      url.searchParams.get("fim"),
      hoje
    );

    const [faturamentoTodo, contasTodas, saldosTodos, config] = await Promise.all([
      lerFaturamento(),
      lerContas(),
      lerSaldos(),
      lerConfig(),
    ]);

    // O corte acontece antes do calculo, para que os totais da tela batam
    // com o que a pessoa pode ver. Lista vazia libera a rede inteira.
    const permitidas = new Set(sessao.unidades);
    const filtrar = <T extends { unidade: string }>(itens: T[]): T[] =>
      permitidas.size > 0 ? itens.filter((item) => permitidas.has(item.unidade)) : itens;

    const resultado = projetar({
      faturamento: filtrar(faturamentoTodo),
      contas: filtrar(contasTodas),
      saldos: filtrar(saldosTodos),
      config,
      inicio,
      fim,
      hoje,
    });

    return NextResponse.json({
      ...resultado,
      sessao: { nome: sessao.nome, perfil: sessao.perfil, unidades: sessao.unidades },
    });
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Falha ao ler a planilha.";
    return NextResponse.json({ erro: mensagem }, { status: 500 });
  }
}
