"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Carregando, Erro, Vazio } from "@/components/Estado";
import { Barra, Cartao, Pilula, Secao } from "@/components/ui";
import { formatarDataCompleta, formatarMoeda } from "@/lib/parse";
import {
  MESES_NF,
  situacaoContrato,
  type Profissional,
  type SituacaoContrato,
} from "@/lib/profissionais";
import { PESO_SITUACAO, type DocumentoUnidade } from "@/lib/documentos";

type Painel = "contratos" | "notas" | "documentos";

const PAINEIS: { chave: Painel; rotulo: string }[] = [
  { chave: "contratos", rotulo: "Contratos" },
  { chave: "notas", rotulo: "Notas fiscais" },
  { chave: "documentos", rotulo: "Documentos" },
];

const ROTULO_MES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

/** Os quatro estados possíveis de um contrato, do pior para o melhor. */
const GRUPOS: {
  chave: SituacaoContrato;
  titulo: string;
  explicacao: string;
  tom: "risco" | "atencao" | "folga";
}[] = [
  {
    chave: "solicitado",
    titulo: "Cobrados, sem retorno",
    explicacao: "Já foram atrás e não voltou. É aqui que se perde tempo.",
    tom: "risco",
  },
  {
    chave: "ausente",
    titulo: "Sem contrato",
    explicacao: "Nenhuma solicitação registrada na observação.",
    tom: "risco",
  },
  {
    chave: "semData",
    titulo: "Assinados, sem data",
    explicacao: "O contrato existe, mas sem a data não dá para saber quando renova.",
    tom: "atencao",
  },
  {
    chave: "assinado",
    titulo: "Em dia",
    explicacao: "Assinado e com data registrada.",
    tom: "folga",
  },
];

export default function PaginaJuridico() {
  const [painel, setPainel] = useState<Painel>("contratos");

  const [lista, setLista] = useState<Profissional[]>([]);
  const [documentos, setDocumentos] = useState<DocumentoUnidade[]>([]);
  const [podeEditar, setPodeEditar] = useState(false);
  const [temAtualizacao, setTemAtualizacao] = useState(true);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [unidade, setUnidade] = useState("");
  const [mes, setMes] = useState(new Date().getMonth());
  const [salvando, setSalvando] = useState<number | null>(null);
  const [editando, setEditando] = useState<number | null>(null);
  const [rascunhoContrato, setRascunhoContrato] = useState(false);
  const [rascunhoPasta, setRascunhoPasta] = useState("");
  const [gruposAbertos, setGruposAbertos] = useState<SituacaoContrato[]>([
    "solicitado",
    "ausente",
    "semData",
  ]);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const resposta = await fetch("/api/profissionais", { cache: "no-store" });
      const corpo = await resposta.json();
      if (!resposta.ok) throw new Error(corpo?.erro ?? "Falha ao carregar.");
      setLista(corpo.profissionais as Profissional[]);
      setPodeEditar(Boolean(corpo.podeEditar));
      setTemAtualizacao(corpo.temColunaAtualizacao !== false);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Falha ao carregar.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
    fetch("/api/juridico", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((corpo) => setDocumentos((corpo?.documentos as DocumentoUnidade[]) ?? []))
      .catch(() => setDocumentos([]));
  }, [carregar]);

  const unidades = useMemo(() => {
    const nomes = new Set<string>();
    lista.forEach((p) => nomes.add(p.unidade));
    documentos.forEach((d) => nomes.add(d.unidade));
    return [...nomes].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [lista, documentos]);

  const ativos = useMemo(
    () =>
      lista.filter(
        (p) => (!unidade || p.unidade === unidade) && p.status.toLowerCase() !== "inativo"
      ),
    [lista, unidade]
  );

  const porSituacao = useMemo(() => {
    const mapa = new Map<SituacaoContrato, Profissional[]>();
    for (const pessoa of ativos) {
      const chave = situacaoContrato(pessoa);
      const grupo = mapa.get(chave);
      if (grupo) grupo.push(pessoa);
      else mapa.set(chave, [pessoa]);
    }
    return mapa;
  }, [ativos]);

  const comContrato = ativos.filter((p) => p.contrato).length;
  const percentual = ativos.length > 0 ? Math.round((comContrato / ativos.length) * 100) : 0;
  const comNota = ativos.filter((p) => p.notas[mes]).length;
  const percentualNota =
    ativos.length > 0 ? Math.round((comNota / ativos.length) * 100) : 0;

  const docsVisiveis = useMemo(
    () =>
      documentos
        .filter((doc) => !unidade || doc.unidade === unidade)
        .slice()
        .sort((a, b) => PESO_SITUACAO[a.situacao] - PESO_SITUACAO[b.situacao]),
    [documentos, unidade]
  );

  const custoRenovacao = docsVisiveis
    .filter((doc) => doc.situacao === "vencido" || doc.situacao === "alerta")
    .reduce((soma, doc) => soma + doc.custo, 0);

  async function enviar(
    pessoa: Profissional,
    corpo: Record<string, unknown>
  ): Promise<boolean> {
    setSalvando(pessoa.linha);
    setErro(null);
    try {
      const resposta = await fetch("/api/profissionais", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linha: pessoa.linha, mes, ...corpo }),
      });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados?.erro ?? "Falha ao gravar.");

      const atualizado = dados.profissional as Profissional;
      setLista((atual) =>
        atual.map((item) => (item.linha === atualizado.linha ? atualizado : item))
      );
      return true;
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Falha ao gravar.");
      return false;
    } finally {
      setSalvando(null);
    }
  }

  function abrirEdicao(pessoa: Profissional) {
    if (!podeEditar) return;
    setEditando(editando === pessoa.linha ? null : pessoa.linha);
    setRascunhoContrato(pessoa.contrato);
    setRascunhoPasta(pessoa.pastaParceiro);
    setErro(null);
  }

  /** Nada é gravado ao clicar: o clique monta o rascunho, o Salvar escreve. */
  async function salvarEdicao(pessoa: Profissional) {
    const pastaMudou = rascunhoPasta.trim() !== pessoa.pastaParceiro;
    const contratoMudou = rascunhoContrato !== pessoa.contrato;

    if (rascunhoContrato && !rascunhoPasta.trim()) {
      setErro("Informe o link da pasta no Drive antes de marcar o contrato como assinado.");
      return;
    }
    if (!contratoMudou && !pastaMudou) {
      setEditando(null);
      return;
    }

    const ok = contratoMudou
      ? await enviar(pessoa, {
          campo: "contrato",
          valor: rascunhoContrato,
          pasta: pastaMudou ? rascunhoPasta.trim() : undefined,
        })
      : await enviar(pessoa, { campo: "pasta", pasta: rascunhoPasta.trim() });

    if (ok) setEditando(null);
  }

  function alternarGrupo(chave: SituacaoContrato) {
    setGruposAbertos((atual) =>
      atual.includes(chave) ? atual.filter((item) => item !== chave) : [...atual, chave]
    );
  }

  return (
    <main className="py-4">
      <header className="mb-3">
        <h1 className="text-2xl font-bold tracking-tight">Jurídico</h1>
      </header>

      <nav className="mb-4 flex gap-1 border-b border-linha" role="tablist">
        {PAINEIS.map((item) => (
          <button
            key={item.chave}
            type="button"
            role="tab"
            aria-selected={painel === item.chave}
            onClick={() => setPainel(item.chave)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${
              painel === item.chave
                ? "border-pinho font-semibold text-pinho"
                : "border-transparent text-grafite"
            }`}
          >
            {item.rotulo}
          </button>
        ))}
      </nav>

      {unidades.length > 1 && (
        <select
          value={unidade}
          onChange={(evento) => setUnidade(evento.target.value)}
          className="mb-4 w-full border border-linha bg-superficie px-3 py-2 text-sm"
          aria-label="Filtrar por unidade"
        >
          <option value="">Todas as unidades ({unidades.length})</option>
          {unidades.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      )}

      {carregando && <Carregando texto="Lendo a aba Profissionais" />}
      {erro && (
        <div className="mb-4">
          <Erro mensagem={erro} />
        </div>
      )}

      {!temAtualizacao && painel !== "documentos" && (
        <p className="mb-4 border-l-4 border-atencao bg-superficie px-3 py-2 text-sm text-grafite">
          Crie uma coluna <strong className="text-tinta">Atualização</strong> na aba
          Profissionais. Sem ela não fica registrado quando cada status foi mexido.
        </p>
      )}

      {/* ---------------------------------------------------- contratos */}
      {painel === "contratos" && !carregando && (
        <>
          <section className="mb-6 border border-linha bg-superficie p-4">
            <p className="text-[32px] font-bold leading-10 tracking-tight">{percentual}%</p>
            <p className="mb-3 text-sm text-grafite">
              dos {ativos.length} profissionais ativos têm contrato assinado
            </p>
            <Barra
              fracao={percentual / 100}
              tom={percentual === 100 ? "folga" : percentual >= 70 ? "atencao" : "risco"}
            />
          </section>

          {ativos.length === 0 ? (
            <Vazio texto="Nenhum profissional ativo nesta unidade." />
          ) : (
            GRUPOS.map((grupo) => {
              const pessoas = porSituacao.get(grupo.chave) ?? [];
              if (pessoas.length === 0) return null;
              const aberto = gruposAbertos.includes(grupo.chave);

              return (
                <section key={grupo.chave} className="mb-5">
                  <button
                    type="button"
                    onClick={() => alternarGrupo(grupo.chave)}
                    aria-expanded={aberto}
                    className={`flex w-full items-center gap-3 border-l-4 border-b border-linha bg-superficie px-3 py-2.5 text-left ${
                      grupo.tom === "risco"
                        ? "border-l-risco"
                        : grupo.tom === "atencao"
                          ? "border-l-atencao"
                          : "border-l-folga"
                    }`}
                  >
                    <span className="w-8 shrink-0 text-center font-mono text-xl font-bold">
                      {pessoas.length}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{grupo.titulo}</span>
                      <span className="block text-xs leading-snug text-grafite">
                        {grupo.explicacao}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-grafite">
                      {aberto ? "ocultar" : "ver"}
                    </span>
                  </button>

                  {aberto && (
                    <ul className="divide-y divide-linha border border-t-0 border-linha bg-superficie">
                      {pessoas.map((pessoa) => (
                        <li key={pessoa.linha} className="px-3 py-3">
                          <div className="flex items-baseline gap-3">
                            <span className="min-w-0 flex-1">
                              <span className="block font-medium">{pessoa.nome}</span>
                              <span className="block text-xs text-grafite">
                                {pessoa.funcao || "sem função"}
                                {pessoa.relacao ? `, ${pessoa.relacao.toLowerCase()}` : ""}
                                {!unidade && pessoa.unidade ? ` em ${pessoa.unidade}` : ""}
                              </span>
                              {pessoa.dataInicio && (
                                <span className="block text-xs text-grafite">
                                  desde {formatarDataCompleta(pessoa.dataInicio)}
                                </span>
                              )}
                            </span>
                            {pessoa.pastaParceiro &&
                              /^https?:/i.test(pessoa.pastaParceiro) && (
                                <a
                                  href={pessoa.pastaParceiro}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="shrink-0 text-xs text-pinho underline underline-offset-2"
                                >
                                  Pasta
                                </a>
                              )}
                          </div>

                          {pessoa.contrato && pessoa.dataContrato && (
                            <p className="mt-1 text-xs text-grafite">
                              assinado em {formatarDataCompleta(pessoa.dataContrato)}
                            </p>
                          )}

                          {pessoa.obs && (
                            <p className="mt-1.5 border-l-2 border-linha pl-2 text-sm leading-relaxed text-grafite">
                              {pessoa.obs}
                            </p>
                          )}

                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              disabled={!podeEditar}
                              onClick={() => abrirEdicao(pessoa)}
                              className="border border-linha px-3 py-1.5 text-xs text-grafite disabled:opacity-60"
                            >
                              {editando === pessoa.linha ? "Fechar" : "Editar"}
                            </button>
                            {pessoa.atualizacao && (
                              <span className="text-xs text-grafite">
                                mexido em {formatarDataCompleta(pessoa.atualizacao)}
                              </span>
                            )}
                          </div>

                          {editando === pessoa.linha && (
                            <div className="mt-2 border border-linha bg-papel p-3">
                              <label className="flex items-start gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={rascunhoContrato}
                                  onChange={(evento) =>
                                    setRascunhoContrato(evento.target.checked)
                                  }
                                  className="mt-0.5"
                                />
                                <span>
                                  Contrato assinado
                                  <span className="block text-xs text-grafite">
                                    marcar exige o link da pasta preenchido
                                  </span>
                                </span>
                              </label>

                              <label className="mt-2 block">
                                <span className="mb-1 block text-xs text-grafite">
                                  Pasta no Drive
                                </span>
                                <input
                                  value={rascunhoPasta}
                                  onChange={(evento) => setRascunhoPasta(evento.target.value)}
                                  placeholder="https://drive.google.com/…"
                                  className="w-full border border-linha px-2 py-1.5 text-xs"
                                />
                              </label>

                              <div className="mt-2 flex gap-2">
                                <button
                                  type="button"
                                  disabled={salvando === pessoa.linha}
                                  onClick={() => void salvarEdicao(pessoa)}
                                  className="bg-pinho px-4 py-1.5 text-xs font-medium text-papel disabled:bg-linha disabled:text-grafite"
                                >
                                  {salvando === pessoa.linha ? "Salvando" : "Salvar"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditando(null)}
                                  className="px-2 text-xs text-grafite"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })
          )}

          {!podeEditar && ativos.length > 0 && (
            <p className="text-xs text-grafite">
              Seu acesso é somente de leitura. Alterações são feitas pela gestão.
            </p>
          )}
        </>
      )}

      {/* -------------------------------------------------------- notas */}
      {painel === "notas" && !carregando && (
        <>
          <select
            value={mes}
            onChange={(evento) => setMes(Number(evento.target.value))}
            className="mb-4 w-full border border-linha bg-superficie px-3 py-2 text-sm"
            aria-label="Mês da nota fiscal"
          >
            {ROTULO_MES.map((nome, indice) => (
              <option key={nome} value={indice}>
                Nota fiscal de {nome}
              </option>
            ))}
          </select>

          <section className="mb-6 border border-linha bg-superficie p-4">
            <p className="text-[32px] font-bold leading-10 tracking-tight">
              {percentualNota}%
            </p>
            <p className="mb-3 text-sm text-grafite">
              entregaram a NF de {ROTULO_MES[mes].toLowerCase()}, {comNota} de{" "}
              {ativos.length}
            </p>
            <Barra
              fracao={percentualNota / 100}
              tom={percentualNota === 100 ? "folga" : "atencao"}
            />
          </section>

          <Secao
            titulo="Pendentes"
            apoio="Clique para marcar como entregue. A alteração vai direto para a planilha."
          >
            {ativos.filter((p) => !p.notas[mes]).length === 0 ? (
              <Vazio texto={`Todos entregaram a NF de ${ROTULO_MES[mes].toLowerCase()}.`} />
            ) : (
              <ul className="divide-y divide-linha border border-linha bg-superficie">
                {ativos
                  .filter((p) => !p.notas[mes])
                  .map((pessoa) => (
                    <li
                      key={pessoa.linha}
                      className="flex items-center gap-3 border-l-4 border-atencao px-3 py-2.5"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">{pessoa.nome}</span>
                        <span className="block text-xs text-grafite">{pessoa.unidade}</span>
                      </span>
                      <button
                        type="button"
                        disabled={!podeEditar || salvando === pessoa.linha}
                        onClick={() => void enviar(pessoa, { campo: "nota", valor: true })}
                        className="shrink-0 border border-folga px-3 py-1.5 text-xs text-folga disabled:opacity-60"
                      >
                        {salvando === pessoa.linha ? "Salvando" : "Marcar entregue"}
                      </button>
                    </li>
                  ))}
              </ul>
            )}
          </Secao>

          {comNota > 0 && (
            <Secao titulo="Entregues">
              <ul className="divide-y divide-linha border border-linha bg-superficie">
                {ativos
                  .filter((p) => p.notas[mes])
                  .map((pessoa) => (
                    <li
                      key={pessoa.linha}
                      className="flex items-center gap-3 border-l-4 border-folga px-3 py-2.5"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm">{pessoa.nome}</span>
                        <span className="block text-xs text-grafite">{pessoa.unidade}</span>
                      </span>
                      <button
                        type="button"
                        disabled={!podeEditar || salvando === pessoa.linha}
                        onClick={() => void enviar(pessoa, { campo: "nota", valor: false })}
                        className="shrink-0 text-xs text-grafite underline underline-offset-2 disabled:opacity-60"
                      >
                        desfazer
                      </button>
                    </li>
                  ))}
              </ul>
            </Secao>
          )}

          <p className="text-xs text-grafite">
            Cada mês é uma coluna própria na planilha, de {MESES_NF[0]} a{" "}
            {MESES_NF[11]}.
          </p>
        </>
      )}

      {/* --------------------------------------------------- documentos */}
      {painel === "documentos" && (
        <>
          {documentos.length === 0 ? (
            <Cartao tom="atencao">
              <div className="px-3 py-3">
                <p className="font-medium">Nenhum documento carregado</p>
                <p className="mt-1 text-sm leading-relaxed text-grafite">
                  Confira se a aba se chama DocumentosUnidade e se a coluna de unidade usa o
                  mesmo nome padronizado das outras abas.
                </p>
              </div>
            </Cartao>
          ) : docsVisiveis.length === 0 ? (
            <Vazio texto="Nenhum documento cadastrado para esta unidade." />
          ) : (
            <>
              {custoRenovacao > 0 && (
                <section className="mb-5 border border-linha bg-superficie p-4">
                  <p className="text-[28px] font-bold leading-9 tracking-tight">
                    {formatarMoeda(custoRenovacao)}
                  </p>
                  <p className="text-sm leading-relaxed text-grafite">
                    custo de renovação do que está vencido ou perto de vencer
                  </p>
                </section>
              )}

              <ul className="divide-y divide-linha border border-linha bg-superficie">
                {docsVisiveis.map((doc, indice) => (
                  <li
                    key={`${doc.unidade}-${doc.documento}-${indice}`}
                    className={`border-l-4 px-3 py-3 ${
                      doc.situacao === "vencido"
                        ? "border-risco"
                        : doc.situacao === "alerta"
                          ? "border-atencao"
                          : doc.situacao === "vigente"
                            ? "border-folga"
                            : "border-aco"
                    }`}
                  >
                    <div className="flex items-baseline gap-3">
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{doc.documento}</span>
                        <span className="block text-xs text-grafite">
                          {doc.unidade}
                          {doc.orgao ? `, ${doc.orgao}` : ""}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block font-mono text-sm">
                          {doc.vencimento ? formatarDataCompleta(doc.vencimento) : "—"}
                        </span>
                        <span
                          className={`block text-xs font-medium ${
                            doc.situacao === "vencido"
                              ? "text-risco"
                              : doc.situacao === "alerta"
                                ? "text-atencao"
                                : "text-grafite"
                          }`}
                        >
                          {doc.situacao === "vencido"
                            ? `vencido há ${Math.abs(doc.diasRestantes ?? 0)} dias`
                            : doc.situacao === "alerta"
                              ? `vence em ${doc.diasRestantes} dias`
                              : doc.situacao === "vigente"
                                ? `faltam ${doc.diasRestantes} dias`
                                : "sem vencimento"}
                        </span>
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-grafite">
                      {doc.responsavel && <Pilula>{doc.responsavel}</Pilula>}
                      {doc.custo > 0 && <span>renovar custa {formatarMoeda(doc.custo)}</span>}
                      {doc.protocolo && <span>protocolo {doc.protocolo}</span>}
                      {doc.arquivo && /^https?:/i.test(doc.arquivo) && (
                        <a
                          href={doc.arquivo}
                          target="_blank"
                          rel="noreferrer"
                          className="text-pinho underline underline-offset-2"
                        >
                          Abrir arquivo
                        </a>
                      )}
                    </div>

                    {doc.obs && (
                      <p className="mt-1.5 border-l-2 border-linha pl-2 text-sm leading-relaxed text-grafite">
                        {doc.obs}
                      </p>
                    )}
                  </li>
                ))}
              </ul>

              <p className="mt-2 text-xs leading-relaxed text-grafite">
                O prazo de alerta é o da coluna Alerta (dias) de cada documento, então 60
                dias do sanitário e 180 da licença ambiental convivem sem conflito.
              </p>
            </>
          )}
        </>
      )}
    </main>
  );
}
