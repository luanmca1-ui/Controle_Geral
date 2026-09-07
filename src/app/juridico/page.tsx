"use client";

import { useState } from "react";
import EsbocoAviso from "@/components/EsbocoAviso";
import { formatarDataCurta } from "@/lib/parse";

type StatusDoc = "vigente" | "vence" | "vencido" | "ausente";

const CORES: Record<StatusDoc, string> = {
  vigente: "border-folga",
  vence: "border-atencao",
  vencido: "border-risco",
  ausente: "border-grafite",
};

const ROTULOS: Record<StatusDoc, string> = {
  vigente: "Vigente",
  vence: "Vence em breve",
  vencido: "Vencido",
  ausente: "Não localizado",
};

const UNIDADES = ["Castanheira", "Metrópole", "Marabá"];

const DOCUMENTOS: Record<
  string,
  { nome: string; orgao: string; validade: string | null; status: StatusDoc }[]
> = {
  Castanheira: [
    { nome: "Alvará de funcionamento", orgao: "Prefeitura", validade: "2027-03-31", status: "vigente" },
    { nome: "Contrato de locação", orgao: "Shopping Castanheira", validade: "2026-11-30", status: "vence" },
    { nome: "AVCB", orgao: "Corpo de Bombeiros", validade: "2026-08-15", status: "vencido" },
    { nome: "Licença sanitária", orgao: "Vigilância Sanitária", validade: "2027-01-20", status: "vigente" },
    { nome: "Laudo elétrico", orgao: "Engenheiro responsável", validade: null, status: "ausente" },
  ],
  Metrópole: [
    { nome: "Alvará de funcionamento", orgao: "Prefeitura", validade: "2026-12-10", status: "vence" },
    { nome: "Contrato de locação", orgao: "Shopping Metrópole", validade: "2028-06-30", status: "vigente" },
    { nome: "AVCB", orgao: "Corpo de Bombeiros", validade: "2027-02-28", status: "vigente" },
    { nome: "Licença sanitária", orgao: "Vigilância Sanitária", validade: "2026-10-05", status: "vence" },
    { nome: "Laudo elétrico", orgao: "Engenheiro responsável", validade: "2027-05-12", status: "vigente" },
  ],
  Marabá: [
    { nome: "Alvará de funcionamento", orgao: "Prefeitura", validade: "2027-07-22", status: "vigente" },
    { nome: "Contrato de locação", orgao: "Shopping Pátio Marabá", validade: "2026-09-30", status: "vence" },
    { nome: "AVCB", orgao: "Corpo de Bombeiros", validade: null, status: "ausente" },
    { nome: "Licença sanitária", orgao: "Vigilância Sanitária", validade: "2026-07-01", status: "vencido" },
    { nome: "Laudo elétrico", orgao: "Engenheiro responsável", validade: "2027-04-18", status: "vigente" },
  ],
};

const PROFISSIONAIS: Record<
  string,
  {
    nome: string;
    funcao: string;
    relacao: string;
    inicio: string;
    contrato: boolean;
    dataContrato: string | null;
    nfMes: boolean;
    pasta: boolean;
  }[]
> = {
  Castanheira: [
    { nome: "Anderson Gonçalves Aires", funcao: "Barbeiro", relacao: "Parceria", inicio: "2026-05-20", contrato: true, dataContrato: null, nfMes: false, pasta: true },
    { nome: "Andrei Teixeira Maia", funcao: "Barbeiro", relacao: "Parceria", inicio: "2026-02-03", contrato: true, dataContrato: "2026-02-03", nfMes: false, pasta: true },
    { nome: "Andreia Monteiro", funcao: "Gerente", relacao: "Parceria", inicio: "2025-11-24", contrato: true, dataContrato: null, nfMes: true, pasta: false },
    { nome: "Caio Ribeiro Souza", funcao: "Barbeiro", relacao: "CLT", inicio: "2026-06-15", contrato: false, dataContrato: null, nfMes: false, pasta: false },
  ],
  Metrópole: [
    { nome: "Diego Martins Lopes", funcao: "Barbeiro", relacao: "Parceria", inicio: "2025-08-11", contrato: true, dataContrato: "2025-08-11", nfMes: true, pasta: true },
    { nome: "Fernanda Alves Rocha", funcao: "Barbeira", relacao: "Parceria", inicio: "2026-01-19", contrato: true, dataContrato: "2026-01-19", nfMes: false, pasta: true },
    { nome: "Rafael Nunes Pinto", funcao: "Gerente", relacao: "CLT", inicio: "2024-09-02", contrato: true, dataContrato: "2024-09-02", nfMes: true, pasta: true },
  ],
  Marabá: [
    { nome: "Bruno Carvalho Dias", funcao: "Barbeiro", relacao: "Parceria", inicio: "2026-03-07", contrato: false, dataContrato: null, nfMes: false, pasta: false },
    { nome: "Thiago Moreira Castro", funcao: "Barbeiro", relacao: "Parceria", inicio: "2025-12-01", contrato: true, dataContrato: "2025-12-01", nfMes: true, pasta: true },
  ],
};

export default function PaginaJuridico() {
  const [unidade, setUnidade] = useState(UNIDADES[0]);
  const documentos = DOCUMENTOS[unidade];
  const profissionais = PROFISSIONAIS[unidade];

  const criticos = documentos.filter((d) => d.status === "vencido" || d.status === "ausente");
  const semContrato = profissionais.filter((p) => !p.contrato);
  const contratoSemData = profissionais.filter((p) => p.contrato && !p.dataContrato);
  const semNf = profissionais.filter((p) => !p.nfMes);

  return (
    <main className="py-5">
      <header className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Jurídico</h1>
        <p className="mt-0.5 text-sm text-grafite">
          Documentos da unidade e contratos dos profissionais, com prazo à vista.
        </p>
      </header>

      <EsbocoAviso>
        Esta tela vai ler duas abas novas da planilha: uma com os documentos de cada
        unidade e outra com os profissionais, no mesmo formato da sua planilha de
        parceiros.
      </EsbocoAviso>

      <div
        className="mb-4 flex gap-1 overflow-x-auto border-b border-linha pb-px"
        role="tablist"
      >
        {UNIDADES.map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={item === unidade}
            onClick={() => setUnidade(item)}
            className={`shrink-0 border-b-2 px-3 py-1.5 text-sm ${
              item === unidade
                ? "border-pinho font-semibold text-pinho"
                : "border-transparent text-grafite"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      {(criticos.length > 0 || semContrato.length > 0) && (
        <ul className="mb-5 space-y-2">
          {criticos.length > 0 && (
            <li className="border-l-2 border-risco bg-superficie px-3 py-2 text-sm">
              {criticos.length} documento(s) vencido(s) ou não localizado(s):{" "}
              {criticos.map((d) => d.nome).join(", ")}
            </li>
          )}
          {semContrato.length > 0 && (
            <li className="border-l-2 border-risco bg-superficie px-3 py-2 text-sm">
              {semContrato.length} profissional(is) sem contrato assinado:{" "}
              {semContrato.map((p) => p.nome.split(" ")[0]).join(", ")}
            </li>
          )}
          {contratoSemData.length > 0 && (
            <li className="border-l-2 border-atencao bg-superficie px-3 py-2 text-sm text-grafite">
              {contratoSemData.length} contrato(s) marcado(s) como assinado mas sem data
              preenchida. Sem a data não dá para saber quando renova.
            </li>
          )}
          {semNf.length > 0 && (
            <li className="border-l-2 border-atencao bg-superficie px-3 py-2 text-sm text-grafite">
              Nota fiscal do mês pendente para {semNf.length} de {profissionais.length}{" "}
              parceiros.
            </li>
          )}
        </ul>
      )}

      <section className="mb-6">
        <h2 className="mb-2 text-lg font-semibold">Documentos da unidade</h2>
        <ul className="divide-y divide-linha border border-linha bg-superficie">
          {documentos.map((doc) => (
            <li
              key={doc.nome}
              className={`flex items-baseline gap-3 border-l-4 px-3 py-2.5 ${CORES[doc.status]}`}
            >
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{doc.nome}</span>
                <span className="block text-sm text-grafite">{doc.orgao}</span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block font-mono text-sm">
                  {doc.validade ? formatarDataCurta(doc.validade) : "—"}
                </span>
                <span className="block text-xs text-grafite">{ROTULOS[doc.status]}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-lg font-semibold">Contratos dos profissionais</h2>
        <ul className="divide-y divide-linha border border-linha bg-superficie">
          {profissionais.map((pessoa) => (
            <li
              key={pessoa.nome}
              className={`border-l-4 px-3 py-2.5 ${
                pessoa.contrato ? (pessoa.dataContrato ? "border-folga" : "border-atencao") : "border-risco"
              }`}
            >
              <div className="flex items-baseline gap-3">
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{pessoa.nome}</span>
                  <span className="block text-sm text-grafite">
                    {pessoa.funcao} · {pessoa.relacao} · desde{" "}
                    {formatarDataCurta(pessoa.inicio)}
                  </span>
                </span>
                <span className="shrink-0 text-right text-xs">
                  <span
                    className={`block font-medium ${
                      pessoa.contrato ? "text-folga" : "text-risco"
                    }`}
                  >
                    {pessoa.contrato ? "Contrato assinado" : "Sem contrato"}
                  </span>
                  <span className="block text-grafite">
                    {pessoa.dataContrato
                      ? formatarDataCurta(pessoa.dataContrato)
                      : pessoa.contrato
                        ? "sem data"
                        : "—"}
                  </span>
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-grafite">
                <span className={pessoa.pasta ? "" : "text-atencao"}>
                  {pessoa.pasta ? "Pasta no Drive" : "Sem pasta no Drive"}
                </span>
                <span className={pessoa.nfMes ? "" : "text-atencao"}>
                  {pessoa.nfMes ? "NF do mês entregue" : "NF do mês pendente"}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="border border-linha bg-superficie p-4 text-sm text-grafite">
        <h2 className="mb-2 text-base font-semibold text-tinta">
          O que falta para sair do esboço
        </h2>
        <ol className="list-decimal space-y-1.5 pl-4">
          <li>
            Criar a aba <strong className="text-tinta">Profissionais</strong> na planilha,
            colando o que você já mantém no Excel. As colunas de NF por mês viram o
            controle mensal de nota fiscal.
          </li>
          <li>
            Criar a aba <strong className="text-tinta">DocumentosUnidade</strong>: unidade,
            documento, órgão, número, emissão, validade, link do arquivo e observação.
          </li>
          <li>
            Definir com quantos dias de antecedência um documento entra em alerta. O
            alvará costuma pedir 60 dias, o contrato de shopping bem mais.
          </li>
          <li>
            Decidir quem vê esta aba. Ela tem CPF, telefone e data de nascimento, e hoje
            qualquer código de acesso abriria tudo.
          </li>
        </ol>
      </section>
    </main>
  );
}
