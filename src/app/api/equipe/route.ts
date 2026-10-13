import { NextResponse } from "next/server";
import { lerComissoes } from "@/lib/sheets";
import { apurarDesempenho } from "@/lib/comissoes";
import { ajustarBarbeirosPeloMix, resumirServicos } from "@/lib/agregacoes";
import { sessaoAtual } from "@/lib/autorizar";
import { unidadePermitida } from "@/lib/sessao";
import { diferencaEmDias, hojeEmSaoPaulo, somarDias } from "@/lib/parse";

export const dynamic = "force-dynamic";

const DATA_VALIDA = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(requisicao: Request) {
  const sessao = await sessaoAtual();
  if (!sessao) {
    return NextResponse.json({ erro: "Sessão expirada. Entre de novo." }, { status: 401 });
  }

  try {
    const url = new URL(requisicao.url);
    const hoje = hojeEmSaoPaulo();

    const fimParam = url.searchParams.get("fim");
    const inicioParam = url.searchParams.get("inicio");
    const fim = fimParam && DATA_VALIDA.test(fimParam) ? fimParam : hoje;
    const inicio =
      inicioParam && DATA_VALIDA.test(inicioParam) ? inicioParam : somarDias(fim, -6);

    // periodo anterior do mesmo tamanho, para a comparacao
    const dias = diferencaEmDias(inicio, fim);
    const fimAnterior = somarDias(inicio, -1);
    const inicioAnterior = somarDias(fimAnterior, -dias);

    const todos = await lerComissoes();
    const lancamentos = todos.filter((item) => unidadePermitida(sessao, item.unidade));

    return NextResponse.json({
      inicio,
      fim,
      inicioAnterior,
      fimAnterior,
      atual: apurarDesempenho(lancamentos, inicio, fim),
      servicos: resumirServicos(
        lancamentos.filter((i) => i.data >= inicio && i.data <= fim)
      ),
      barbeiros: ajustarBarbeirosPeloMix(
        lancamentos.filter((i) => i.data >= inicio && i.data <= fim)
      ),
      anterior: apurarDesempenho(lancamentos, inicioAnterior, fimAnterior),
      temDados: todos.length > 0,
    });
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Falha ao ler as comissões.";
    return NextResponse.json({ erro: mensagem }, { status: 500 });
  }
}
