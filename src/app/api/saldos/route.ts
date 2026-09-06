import { NextResponse } from "next/server";
import { gravarSaldo, lerSaldos } from "@/lib/sheets";
import { sessaoAtual } from "@/lib/autorizar";
import { podeEditar, unidadePermitida } from "@/lib/sessao";

export const dynamic = "force-dynamic";

export async function GET() {
  const sessao = await sessaoAtual();
  if (!sessao) {
    return NextResponse.json({ erro: "Sessão expirada. Entre de novo." }, { status: 401 });
  }

  try {
    const todos = await lerSaldos();
    const saldos = todos.filter((saldo) => unidadePermitida(sessao, saldo.unidade));
    return NextResponse.json({
      saldos,
      podeEditar: podeEditar(sessao),
      sessao: { nome: sessao.nome, perfil: sessao.perfil },
    });
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Falha ao ler os saldos.";
    return NextResponse.json({ erro: mensagem }, { status: 500 });
  }
}

export async function PUT(requisicao: Request) {
  const sessao = await sessaoAtual();
  if (!sessao) {
    return NextResponse.json({ erro: "Sessão expirada. Entre de novo." }, { status: 401 });
  }
  if (!podeEditar(sessao)) {
    return NextResponse.json(
      { erro: "Seu acesso é somente de leitura." },
      { status: 403 }
    );
  }

  try {
    const corpo = await requisicao.json();
    const unidade = String(corpo?.unidade ?? "").trim();
    const saldo = Number(corpo?.saldo);

    if (!unidade) {
      return NextResponse.json({ erro: "Informe a unidade." }, { status: 400 });
    }
    if (!Number.isFinite(saldo)) {
      return NextResponse.json({ erro: "Saldo inválido." }, { status: 400 });
    }
    if (!unidadePermitida(sessao, unidade)) {
      return NextResponse.json({ erro: "Unidade fora do seu acesso." }, { status: 403 });
    }

    // O autor vem de quem está logado, não de um campo digitado.
    const atualizado = await gravarSaldo(unidade, saldo, sessao.nome);
    return NextResponse.json({ saldo: atualizado });
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Falha ao gravar o saldo.";
    return NextResponse.json({ erro: mensagem }, { status: 500 });
  }
}
