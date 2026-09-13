import { NextResponse } from "next/server";
import {
  gravarContrato,
  gravarNotaFiscal,
  gravarPasta,
  lerProfissionais,
  temColunaAtualizacao,
} from "@/lib/sheets";
import { sessaoAtual } from "@/lib/autorizar";
import { podeEditar, unidadePermitida } from "@/lib/sessao";

export const dynamic = "force-dynamic";

export async function GET() {
  const sessao = await sessaoAtual();
  if (!sessao) {
    return NextResponse.json({ erro: "Sessão expirada. Entre de novo." }, { status: 401 });
  }

  try {
    const { lista, mapa } = await lerProfissionais();

    // O corte por unidade vale para qualquer perfil: quem tem escopo
    // limitado nao recebe as outras unidades nem no JSON.
    const visiveis = lista.filter((pessoa) => unidadePermitida(sessao, pessoa.unidade));

    return NextResponse.json({
      profissionais: visiveis,
      podeEditar: podeEditar(sessao),
      escopo: sessao.unidades,
      temColunaAtualizacao: temColunaAtualizacao(mapa),
    });
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Falha ao ler a aba Profissionais.";
    return NextResponse.json({ erro: mensagem }, { status: 500 });
  }
}

export async function PATCH(requisicao: Request) {
  const sessao = await sessaoAtual();
  if (!sessao) {
    return NextResponse.json({ erro: "Sessão expirada. Entre de novo." }, { status: 401 });
  }
  if (!podeEditar(sessao)) {
    return NextResponse.json({ erro: "Seu acesso é somente de leitura." }, { status: 403 });
  }

  try {
    const corpo = await requisicao.json();
    const linha = Number(corpo?.linha);
    if (!Number.isInteger(linha) || linha < 2) {
      return NextResponse.json({ erro: "Linha inválida." }, { status: 400 });
    }

    // confere o escopo antes de gravar, e nao so na leitura
    const { lista } = await lerProfissionais();
    const pessoa = lista.find((item) => item.linha === linha);
    if (!pessoa) {
      return NextResponse.json({ erro: "Profissional não encontrado." }, { status: 404 });
    }
    if (!unidadePermitida(sessao, pessoa.unidade)) {
      return NextResponse.json({ erro: "Unidade fora do seu acesso." }, { status: 403 });
    }

    if (corpo?.campo === "contrato") {
      const pasta = corpo?.pasta ? String(corpo.pasta).trim() : null;
      if (pasta && !/^https?:\/\//i.test(pasta)) {
        return NextResponse.json(
          { erro: "O link da pasta precisa começar com https://" },
          { status: 400 }
        );
      }
      await gravarContrato(linha, Boolean(corpo?.valor), pasta);
    } else if (corpo?.campo === "pasta") {
      const pasta = String(corpo?.pasta ?? "").trim();
      if (!/^https?:\/\//i.test(pasta)) {
        return NextResponse.json(
          { erro: "O link da pasta precisa começar com https://" },
          { status: 400 }
        );
      }
      await gravarPasta(linha, pasta);
    } else if (corpo?.campo === "nota") {
      const mes = Number(corpo?.mes);
      if (!Number.isInteger(mes) || mes < 0 || mes > 11) {
        return NextResponse.json({ erro: "Mês inválido." }, { status: 400 });
      }
      await gravarNotaFiscal(linha, mes, Boolean(corpo?.valor));
    } else {
      return NextResponse.json({ erro: "Campo desconhecido." }, { status: 400 });
    }

    const atualizados = await lerProfissionais();
    const atualizado = atualizados.lista.find((item) => item.linha === linha);
    return NextResponse.json({ profissional: atualizado });
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Falha ao gravar.";
    return NextResponse.json({ erro: mensagem }, { status: 400 });
  }
}
