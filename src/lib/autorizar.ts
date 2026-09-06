import { cookies } from "next/headers";
import { NOME_COOKIE, lerSessao, type Sessao } from "./sessao";
import { buscarAcesso } from "./sheets";

/**
 * Sessao do cookie, revalidada contra a aba Acessos.
 *
 * A dupla checagem existe para que apagar uma linha da planilha tire a pessoa
 * do ar de verdade. So a assinatura do cookie nao bastaria: ele continuaria
 * valido ate expirar, mesmo depois de o acesso ser revogado.
 */
export async function sessaoAtual(): Promise<Sessao | null> {
  const cookieStore = await cookies();
  const sessao = await lerSessao(cookieStore.get(NOME_COOKIE)?.value);
  if (!sessao) return null;

  try {
    const acesso = await buscarAcesso(sessao.codigo);
    if (!acesso) return null;

    // O perfil vale o que estiver na planilha agora, nao o que foi gravado
    // no cookie no dia do login.
    return {
      ...sessao,
      nome: acesso.nome || sessao.nome,
      perfil: acesso.perfil,
      unidade: acesso.unidade,
    };
  } catch {
    // Se a planilha estiver fora do ar, o cookie assinado ainda vale.
    return sessao;
  }
}
