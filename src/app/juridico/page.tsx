"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import EsbocoAviso from "@/components/EsbocoAviso";
import type { DocumentoUnidade } from "@/lib/documentos";
import { PESO_SITUACAO } from "@/lib/documentos";
import { Carregando, Erro, Vazio } from "@/components/Estado";
import { formatarDataCompleta } from "@/lib/parse";
import {
  MESES_NF,
  situacaoContrato,
  type Profissional,
  type SituacaoContrato,
} from "@/lib/profissionais";

const COR_SITUACAO: Record<SituacaoContrato, string> = {
  assinado: "border-folga",
  semData: "border-atencao",
  solicitado: "border-risco",
  ausente: "border-risco",
};

const ROTULO_SITUACAO: Record<SituacaoContrato, string> = {
  assinado: "Contrato assinado",
  semData: "Assinado, sem data",
  solicitado: "Solicitado, sem retorno",
  ausente: "Sem contrato",
};

const ROTULO_MES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default function PaginaJuridico() {
  const [lista, setLista] = useState<Profissional[]>([]);
  const [podeEditar, setPodeEditar] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [unidade, setUnidade] = useState("");
  const [mes, setMes] = useState(new Date().getMonth());
  const [somentePendentes, setSomentePendentes] = useState(false);
  const [salvando, setSalvando] = useState<number | null>(null);
  const [editando, setEditando] = useState<number | null>(null);
  const [rascunhoContrato, setRascunhoContrato] = useState(false);
  const [rascunhoPasta, setRascunhoPasta] = useState("");
  const [temAtualizacao, setTemAtualizacao] = useState(true);
  const [documentos, setDocumentos] = useState<DocumentoUnidade[]>([]);

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

  const unidades = useMemo(
    () => [...new Set(lista.map((p) => p.unidade))].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [lista]
  );

  const ativos = useMemo(
    () =>
      lista.filter(
        (p) =>
          (!unidade || p.unidade === unidade) &&
          p.status.toLowerCase() !== "inativo"
      ),
    [lista, unidade]
  );

  const comContrato = ativos.filter((p) => p.contrato).length;
  const percentual = ativos.length > 0 ? Math.round((comContrato / ativos.length) * 100) : 0;
  const comNota = ativos.filter((p) => p.notas[mes]).length;
  const percentualNota = ativos.length > 0 ? Math.round((comNota / ativos.length) * 100) : 0;

  // quem esta sem contrato sobe para o topo, e quem ja foi cobrado vem antes
  const PESO: Record<string, number> = { solicitado: 0, ausente: 1, semData: 2, assinado: 3 };
  const visiveis = (
    somentePendentes ? ativos.filter((p) => !p.contrato || !p.notas[mes]) : ativos
  )
    .slice()
    .sort((a, b) => PESO[situacaoContrato(a)] - PESO[situacaoContrato(b)]);

  const docsVisiveis = documentos
    .filter((doc) => !unidade || doc.unidade === unidade)
    .slice()
    .sort((a, b) => PESO_SITUACAO[a.situacao] - PESO_SITUACAO[b.situacao]);

  const custoRenovacao = docsVisiveis
    .filter((doc) => doc.situacao === "vencido" || doc.situacao === "alerta")
    .reduce((soma, doc) => soma + doc.custo, 0);

  const docsCriticos = docsVisiveis.filter((doc) => doc.situacao === "vencido");

  const semRetorno = ativos.filter((p) => situacaoContrato(p) === "solicitado");
  const semContrato = ativos.filter((p) => situacaoContrato(p) === "ausente");

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

  /**
   * Nada e gravado ao clicar: o clique so monta o rascunho. A gravacao
   * acontece no Salvar, e marcar contrato exige a pasta preenchida.
   */
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

  return (
    <main className="py-5">
      <header className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Jurídico</h1>
        <p className="mt-0.5 text-sm text-grafite">
          Contratos dos profissionais e nota fiscal mês a mês.
        </p>
      </header>

      {carregando && <Carregando texto="Lendo a aba Profissionais" />}
      {erro && (
        <div className="mb-4">
          <Erro mensagem={erro} />
        </div>
      )}

      {!carregando && lista.length > 0 && (
        <>
          <div className="mb-3 space-y-2">
            <select
              value={unidade}
              onChange={(evento) => setUnidade(evento.target.value)}
              className="w-full border border-linha bg-superficie px-3 py-2 text-sm"
              aria-label="Filtrar por unidade"
            >
              <option value="">
                Todas as unidades ({unidades.length})
              </option>
              {unidades.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <div className="flex gap-2">
              <select
                value={mes}
                onChange={(evento) => setMes(Number(evento.target.value))}
                className="min-w-0 flex-1 border border-linha bg-superficie px-3 py-2 text-sm"
                aria-label="Mês da nota fiscal"
              >
                {ROTULO_MES.map((nome, indice) => (
                  <option key={nome} value={indice}>
                    NF de {nome}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setSomentePendentes(!somentePendentes)}
                aria-pressed={somentePendentes}
                className={`shrink-0 border px-3 py-2 text-sm ${
                  somentePendentes
                    ? "border-pinho bg-pinho text-papel"
                    : "border-linha bg-superficie text-grafite"
                }`}
              >
                Só pendentes
              </button>
            </div>
          </div>

          {!temAtualizacao && (
            <p className="mb-3 border-l-2 border-atencao bg-superficie px-3 py-2 text-sm text-grafite">
              Crie uma coluna chamada <strong className="text-tinta">Atualização</strong> na
              aba Profissionais. Sem ela não fica registrado quando cada status foi mexido.
            </p>
          )}

          {(semRetorno.length > 0 || semContrato.length > 0 || docsCriticos.length > 0) && (
            <ul className="mb-4 space-y-2">
              {docsCriticos.length > 0 && (
                <li className="border-l-4 border-risco bg-superficie px-3 py-2.5">
                  <p className="font-semibold text-risco">
                    {docsCriticos.length} documento(s) vencido(s)
                  </p>
                  <p className="text-sm text-grafite">
                    {docsCriticos.map((d) => d.documento).join(", ")}
                  </p>
                </li>
              )}
              {semRetorno.length > 0 && (
                <li className="border-l-4 border-risco bg-superficie px-3 py-2.5">
                  <p className="font-semibold text-risco">
                    {semRetorno.length} solicitado(s) sem retorno
                  </p>
                  <p className="text-sm text-grafite">
                    {semRetorno.map((p) => p.apelido || p.nome.split(" ")[0]).join(", ")}
                  </p>
                </li>
              )}
              {semContrato.length > 0 && (
                <li className="border-l-4 border-risco bg-superficie px-3 py-2.5">
                  <p className="font-semibold text-risco">
                    {semContrato.length} sem contrato e sem solicitação registrada
                  </p>
                  <p className="text-sm text-grafite">
                    {semContrato.map((p) => p.apelido || p.nome.split(" ")[0]).join(", ")}
                  </p>
                </li>
              )}
            </ul>
          )}

          <section className="mb-5 grid grid-cols-2 gap-3">
            <div className="border border-linha bg-superficie p-3">
              <p className="text-3xl font-bold tracking-tight">{percentual}%</p>
              <p className="text-sm text-grafite">
                contratos assinados
                <span className="block font-mono text-xs">
                  {comContrato} de {ativos.length} ativos
                </span>
              </p>
              <div className="mt-2 h-1.5 w-full bg-papel">
                <div
                  className={`h-full ${percentual === 100 ? "bg-folga" : "bg-atencao"}`}
                  style={{ width: `${percentual}%` }}
                />
              </div>
            </div>

            <div className="border border-linha bg-superficie p-3">
              <p className="text-3xl font-bold tracking-tight">{percentualNota}%</p>
              <p className="text-sm text-grafite">
                NF de {ROTULO_MES[mes].toLowerCase()}
                <span className="block font-mono text-xs">
                  {comNota} de {ativos.length} ativos
                </span>
              </p>
              <div className="mt-2 h-1.5 w-full bg-papel">
                <div
                  className={`h-full ${percentualNota === 100 ? "bg-folga" : "bg-atencao"}`}
                  style={{ width: `${percentualNota}%` }}
                />
              </div>
            </div>
          </section>

          <section className="mb-6">
            <h2 className="mb-2 text-lg font-semibold">
              Profissionais
              <span className="ml-2 text-sm font-normal text-grafite">
                {visiveis.length}
              </span>
            </h2>

            {visiveis.length === 0 ? (
              <Vazio texto="Nada pendente com esses filtros." />
            ) : (
              <ul className="divide-y divide-linha border border-linha bg-superficie">
                {visiveis.map((pessoa) => {
                  const situacao = situacaoContrato(pessoa);
                  const emEdicao = editando === pessoa.linha;
                  const pendente = situacao === "solicitado" || situacao === "ausente";

                  return (
                    <li
                      key={pessoa.linha}
                      className={`border-l-4 px-3 py-3 ${COR_SITUACAO[situacao]} ${
                        pendente ? "bg-risco/[0.04]" : ""
                      }`}
                    >
                      <div className="flex items-baseline gap-3">
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium">{pessoa.nome}</span>
                          <span className="block text-sm text-grafite">
                            {pessoa.unidade} · {pessoa.funcao || "sem função"}
                            {pessoa.relacao && ` · ${pessoa.relacao}`}
                            {pessoa.dataInicio &&
                              ` · desde ${formatarDataCompleta(pessoa.dataInicio)}`}
                          </span>
                        </span>
                        {pessoa.pastaParceiro && /^https?:/i.test(pessoa.pastaParceiro) && (
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

                      <p
                        className={`mt-1.5 text-sm font-semibold ${
                          situacao === "solicitado"
                            ? "text-risco"
                            : situacao === "ausente"
                              ? "text-risco"
                              : situacao === "semData"
                                ? "text-atencao"
                                : "text-folga"
                        }`}
                      >
                        {ROTULO_SITUACAO[situacao]}
                        {situacao === "assinado" && pessoa.dataContrato && (
                          <span className="font-normal text-grafite">
                            {" · "}
                            {formatarDataCompleta(pessoa.dataContrato)}
                          </span>
                        )}
                      </p>

                      {situacao === "solicitado" && (
                        <p className="mt-1 border-l-2 border-risco bg-superficie px-2 py-1 text-sm text-risco">
                          Já foi cobrado e não voltou. Precisa de retorno.
                        </p>
                      )}

                      {pessoa.obs && (
                        <p className="mt-1.5 border-l-2 border-linha pl-2 text-sm text-grafite">
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
                          {emEdicao ? "Fechar" : "Editar contrato e pasta"}
                        </button>

                        <button
                          type="button"
                          disabled={!podeEditar || salvando === pessoa.linha}
                          onClick={() =>
                            void enviar(pessoa, { campo: "nota", valor: !pessoa.notas[mes] })
                          }
                          className={`border px-3 py-1.5 text-xs ${
                            pessoa.notas[mes]
                              ? "border-folga text-folga"
                              : "border-atencao text-atencao"
                          } disabled:opacity-60`}
                        >
                          NF {MESES_NF[mes]}: {pessoa.notas[mes] ? "entregue" : "pendente"}
                        </button>

                        {pessoa.atualizacao && (
                          <span className="text-xs text-grafite">
                            atualizado em {formatarDataCompleta(pessoa.atualizacao)}
                          </span>
                        )}
                      </div>

                      {emEdicao && (
                        <div className="mt-2 border border-linha bg-papel p-3">
                          <label className="flex items-start gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={rascunhoContrato}
                              onChange={(evento) => setRascunhoContrato(evento.target.checked)}
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
                              {salvando === pessoa.linha ? "Salvando…" : "Salvar"}
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
                  );
                })}
              </ul>
            )}

            {!podeEditar && (
              <p className="mt-2 text-xs text-grafite">
                Seu acesso é somente de leitura. Alterações de contrato e nota fiscal são
                feitas pela gestão.
              </p>
            )}
          </section>
        </>
      )}

      <section>
        <h2 className="mb-2 text-lg font-semibold">
          Documentos da unidade
          {docsVisiveis.length > 0 && (
            <span className="ml-2 text-sm font-normal text-grafite">
              {docsVisiveis.length}
            </span>
          )}
        </h2>

        {documentos.length === 0 ? (
          <EsbocoAviso>
            A aba DocumentosUnidade ainda não retornou nada. Confira se o nome da aba está
            escrito assim e se a coluna de unidade usa o mesmo nome padronizado das outras
            abas.
          </EsbocoAviso>
        ) : docsVisiveis.length === 0 ? (
          <Vazio texto="Nenhum documento cadastrado para esta unidade." />
        ) : (
          <>
            {custoRenovacao > 0 && (
              <p className="mb-2 text-sm text-grafite">
                Renovações vencidas ou dentro do prazo de alerta somam{" "}
                <span className="font-mono text-tinta">
                  {custoRenovacao.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </span>{" "}
                em custo previsto.
              </p>
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
                          : "border-grafite"
                  }`}
                >
                  <div className="flex items-baseline gap-3">
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{doc.documento}</span>
                      <span className="block text-sm text-grafite">
                        {doc.unidade}
                        {doc.orgao && ` · ${doc.orgao}`}
                        {doc.responsavel && ` · ${doc.responsavel}`}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-mono text-sm">
                        {doc.vencimento ? formatarDataCompleta(doc.vencimento) : "sem data"}
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

                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-grafite">
                    {doc.custo > 0 && (
                      <span>
                        renovação{" "}
                        {doc.custo.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </span>
                    )}
                    {doc.protocolo && <span>protocolo {doc.protocolo}</span>}
                    <span>alerta {doc.alertaDias} dias</span>
                    {doc.arquivo && /^https?:/i.test(doc.arquivo) && (
                      <a
                        href={doc.arquivo}
                        target="_blank"
                        rel="noreferrer"
                        className="text-pinho underline underline-offset-2"
                      >
                        Arquivo
                      </a>
                    )}
                  </div>

                  {doc.obs && (
                    <p className="mt-1.5 border-l-2 border-linha pl-2 text-sm text-grafite">
                      {doc.obs}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

    </main>
  );
}
