"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
  FaCalendarAlt,
  FaCheckCircle,
  FaChevronDown,
  FaClipboardList,
  FaIdCard,
  FaMapMarkerAlt,
  FaPaperPlane,
  FaPlus,
  FaTrash,
  FaUser,
} from "react-icons/fa";

interface Dependente {
  id: number;
  nome: string;
  cpf: string;
}

interface Destino {
  id: number;
  estado: string;
}

interface SolicitacaoReciprocidade {
  nome: string;
  cpf: string;
  dependentes: Dependente[];
  estadoSolicitante: string;
  destinos: Destino[];
  dataIda: string;
  dataVolta: string;
}

interface SolicitacaoCadastrada {
  id: number;
  codigo: string;
  pessoa: string;
  cpf: string;
  ufSolicitante: string;
  destinos: string[];
  dataIda: string;
  dataVolta: string;
  pessoas: number;
}

interface SolicitacaoApi {
  id: number;
  codigo: string;
  ufDestino: string;
  titularCpf: string;
  titularNome: string;
  dataInicio: string;
  dataFim: string;
  dependentes?: DependenteApi[];
}

interface DependenteApi {
  cpf: string;
  nome: string;
}

interface BeneficiarioFamiliaApi {
  titular?: {
    cpf: string;
    nome: string;
    uf?: string;
  };
  dependentes?: DependenteApi[];
}

interface FiliadaApi {
  id: number;
  nome: string;
  uf: string;
}

interface BuscaRapida {
  termo: string;
}

const estados = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
];

const solicitacaoInicial: SolicitacaoReciprocidade = {
  nome: "VALESKA MACIEL CRUZ",
  cpf: "053.639.964-64",
  dependentes: [],
  estadoSolicitante: "PB",
  destinos: [{ id: 1, estado: "" }],
  dataIda: "",
  dataVolta: "",
};

const buscaInicial: BuscaRapida = {
  termo: "",
};

const passos = [
  "Beneficiário",
  "Dependentes",
  "Estados",
  "Período",
];

function mascararCpf(cpf: string) {
  const numeros = cpf.replace(/\D/g, "");

  if (numeros.length !== 11) {
    return cpf;
  }

  return `${numeros.slice(0, 3)}.***.***-${numeros.slice(-2)}`;
}

function formatarData(data: string) {
  if (!data) return "";

  const [ano, mes, dia] = data.split("-");

  if (!ano || !mes || !dia) {
    return data;
  }

  return `${dia}/${mes}/${ano}`;
}

function ordenarSolicitacoes(lista: SolicitacaoCadastrada[]) {
  const hoje = "2026-06-03";

  return [...lista].sort((a, b) => {
    if (a.dataIda === hoje && b.dataIda !== hoje) return -1;
    if (b.dataIda === hoje && a.dataIda !== hoje) return 1;

    return b.dataIda.localeCompare(a.dataIda);
  });
}

function normalizarSolicitacaoApi(
  item: SolicitacaoApi,
  ufSolicitante = ""
): SolicitacaoCadastrada {
  return {
    id: item.id,
    codigo: item.codigo,
    pessoa: item.titularNome,
    cpf: item.titularCpf,
    ufSolicitante,
    destinos: [item.ufDestino],
    dataIda: item.dataInicio,
    dataVolta: item.dataFim,
    pessoas: 1 + (item.dependentes?.length ?? 0),
  };
}

export default function Reciprocidade() {
  const [mostraFormulario, setMostraFormulario] = useState(false);
  const [passoAtual, setPassoAtual] = useState(0);
  const [solicitacao, setSolicitacao] =
    useState<SolicitacaoReciprocidade>(solicitacaoInicial);
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoCadastrada[]>([]);
  const [busca, setBusca] = useState<BuscaRapida>(buscaInicial);
  const [enviado, setEnviado] = useState(false);
  const [cpfTitular, setCpfTitular] = useState("");
  const [carregandoSolicitacoes, setCarregandoSolicitacoes] = useState(true);
  const [carregandoDependentes, setCarregandoDependentes] = useState(true);
  const [dependentesDisponiveis, setDependentesDisponiveis] = useState<
    DependenteApi[]
  >([]);
  const [filiadasDestino, setFiliadasDestino] = useState<FiliadaApi[]>([]);
  const [carregandoFiliadas, setCarregandoFiliadas] = useState(true);
  const [dependenteSelecionadoCpf, setDependenteSelecionadoCpf] = useState("");
  const [cardsVisiveis, setCardsVisiveis] = useState<Set<number>>(new Set());
  const [codigoAberto, setCodigoAberto] = useState<number | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  const podeAvancar =
    passoAtual === 0 ||
    passoAtual === 1 ||
    (passoAtual === 2 && solicitacao.destinos[0]?.estado.trim()) ||
    (passoAtual === 3 && solicitacao.dataIda && solicitacao.dataVolta);
  const solicitacoesVisiveis = ordenarSolicitacoes(
    solicitacoes.filter((item) => {
      const termo = busca.termo.trim().toLowerCase();

      if (!termo) return true;

      const dataIda = formatarData(item.dataIda);
      const dataVolta = formatarData(item.dataVolta);
      const locais = item.destinos.join(" ").toLowerCase();
      const codigo = item.codigo || String(item.id).padStart(4, "0");
      const codigoBusca = `codigo #${codigo}`;
      const codigoBuscaComAcento = `código #${codigo}`;

      return (
        codigo.includes(termo) ||
        codigoBusca.includes(termo) ||
        codigoBuscaComAcento.includes(termo) ||
        String(item.id).includes(termo) ||
        locais.includes(termo) ||
        item.dataIda.includes(termo) ||
        item.dataVolta.includes(termo) ||
        dataIda.includes(termo) ||
        dataVolta.includes(termo)
      );
    })
  );
  const idsVisiveis = solicitacoesVisiveis.map((item) => item.id).join(",");

  useEffect(() => {
    async function carregarDadosDoTitular() {
      try {
        const params = new URLSearchParams(window.location.search);
        const chavePasse =
          params.get("chavePasse") ||
          params.get("cpf") ||
          process.env.NEXT_PUBLIC_CHAVE_UNICA ||
          "";

        if (!chavePasse) {
          setSolicitacoes([]);
          return;
        }

        setCpfTitular(chavePasse.replace(/\D/g, ""));

        const [resBeneficiario, resSolicitacoes, resFiliadas] = await Promise.all([
          fetch(
            `/api/reciprocidade/beneficiario?chavePasse=${encodeURIComponent(
              chavePasse
            )}`
          ),
          fetch(
            `/api/reciprocidade/solicitacoes/titular?chavePasse=${encodeURIComponent(
              chavePasse
            )}`
          ),
          fetch("/api/reciprocidade/filiadas"),
        ]);

        let ufTitular = "";

        if (resBeneficiario.ok) {
          const familia = (await resBeneficiario.json()) as BeneficiarioFamiliaApi;
          setDependentesDisponiveis(familia.dependentes ?? []);

          if (familia.titular) {
            ufTitular = familia.titular.uf || "PB";
            setSolicitacao((dados) => ({
              ...dados,
              nome: familia.titular?.nome || dados.nome,
              cpf: familia.titular?.cpf || dados.cpf,
              estadoSolicitante:
                familia.titular?.uf || dados.estadoSolicitante || "PB",
            }));
            setCpfTitular(familia.titular.cpf.replace(/\D/g, ""));
          }
        }

        if (resFiliadas.ok) {
          const filiadas = (await resFiliadas.json()) as FiliadaApi[];
          setFiliadasDestino(filiadas);
        }

        if (!resSolicitacoes.ok) {
          setSolicitacoes([]);
          return;
        }

        const data = (await resSolicitacoes.json()) as SolicitacaoApi[];
        setSolicitacoes(
          data.map((item) => normalizarSolicitacaoApi(item, ufTitular))
        );

        if (data[0]) {
          setSolicitacao((dados) => ({
            ...dados,
            nome: data[0].titularNome || dados.nome,
            cpf: data[0].titularCpf || dados.cpf,
          }));
          setCpfTitular(data[0].titularCpf.replace(/\D/g, ""));
        }
      } catch (err) {
        console.error(err);
        setSolicitacoes([]);
      } finally {
        setCarregandoSolicitacoes(false);
        setCarregandoDependentes(false);
        setCarregandoFiliadas(false);
      }
    }

    carregarDadosDoTitular();
  }, []);

  useEffect(() => {
    if (mostraFormulario) return;

    const feed = feedRef.current;
    const cards = feed?.querySelectorAll<HTMLElement>("[data-scroll-card]");

    if (!feed || !cards) return;

    if (!("IntersectionObserver" in window)) {
      setCardsVisiveis(
        new Set(
          idsVisiveis
            .split(",")
            .filter(Boolean)
            .map((id) => Number(id))
        )
      );
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        setCardsVisiveis((visiveis) => {
          const proximos = new Set(visiveis);

          entries.forEach((entry) => {
            const id = Number(
              (entry.target as HTMLElement).dataset.scrollCard
            );

            if (entry.isIntersecting) {
              proximos.add(id);
            } else {
              proximos.delete(id);
            }
          });

          return proximos;
        });
      },
      {
        root: feed,
        rootMargin: "-8% 0px -8% 0px",
        threshold: 0.2,
      }
    );

    cards.forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, [mostraFormulario, busca.termo, idsVisiveis]);

  function atualizarCampo(
    campo: keyof SolicitacaoReciprocidade,
    valor: string
  ) {
    setSolicitacao((dados) => ({
      ...dados,
      [campo]: valor,
    }));
    setEnviado(false);
  }

  function atualizarBusca(valor: string) {
    setBusca({ termo: valor });
  }

  function alternarCodigo(id: number) {
    setCodigoAberto((codigoAtual) => (codigoAtual === id ? null : id));
  }

  function abrirNovaSolicitacao() {
    setMostraFormulario(true);
    setPassoAtual(0);
    setEnviado(false);
  }

  function voltarParaAcompanhamento() {
    setSolicitacao((dados) => ({
      ...solicitacaoInicial,
      nome: dados.nome,
      cpf: dados.cpf,
    }));
    setDependenteSelecionadoCpf("");
    setPassoAtual(0);
    setEnviado(false);
    setMostraFormulario(false);
  }

  function avancarPasso() {
    setPassoAtual((passo) => Math.min(passo + 1, passos.length - 1));
  }

  function voltarPasso() {
    setPassoAtual((passo) => Math.max(passo - 1, 0));
  }

  async function enviarSolicitacao(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const res = await fetch("/api/reciprocidade/solicitacoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titularCpf: cpfTitular || solicitacao.cpf.replace(/\D/g, ""),
        ufDestino: solicitacao.destinos[0]?.estado,
        dataInicio: solicitacao.dataIda,
        dataFim: solicitacao.dataVolta,
        dependentesCpf: solicitacao.dependentes.map((dependente) =>
          dependente.cpf.replace(/\D/g, "")
        ),
      }),
    });

    if (!res.ok) {
      return;
    }

    const data = (await res.json()) as SolicitacaoApi;
    setSolicitacoes((lista) => [
      normalizarSolicitacaoApi(data, solicitacao.estadoSolicitante),
      ...lista,
    ]);
    setEnviado(true);
  }

  function adicionarDependenteSelecionado() {
    const dependente = dependentesDisponiveis.find(
      (item) =>
        item.cpf.replace(/\D/g, "") ===
        dependenteSelecionadoCpf.replace(/\D/g, "")
    );

    if (!dependente) return;

    setSolicitacao((dados) => ({
      ...dados,
      dependentes: [
        ...dados.dependentes,
        {
          id: Date.now(),
          nome: dependente.nome,
          cpf: dependente.cpf,
        },
      ],
    }));
    setDependenteSelecionadoCpf("");
    setEnviado(false);
  }

  function removerDependente(id: number) {
    setSolicitacao((dados) => ({
      ...dados,
      dependentes: dados.dependentes.filter((dependente) => dependente.id !== id),
    }));
    setEnviado(false);
  }

  function atualizarDestino(id: number, estado: string) {
    setSolicitacao((dados) => ({
      ...dados,
      destinos: dados.destinos.map((destino, index) =>
        destino.id === id || index === 0 ? { ...destino, estado } : destino
      ).slice(0, 1),
    }));
    setEnviado(false);
  }

  if (!mostraFormulario) {
    return (
      <main className="mx-auto min-h-screen max-w-3xl px-6 py-8">
        <section className="animate-fade-slide-up mb-6">
          <h1 className="text-2xl font-extrabold text-slate-950">
            Formulário de Solicitação
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Informe a filiada de destino e o período de ida e volta para
            registrar a solicitação.
          </p>
        </section>

        <section
          className="animate-fade-slide-up mb-5"
          style={{ animationDelay: "80ms" }}
        >
          <button
            type="button"
            onClick={abrirNovaSolicitacao}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-bold text-white shadow-lg shadow-blue-200/70 transition duration-300 hover:-translate-y-1 hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-300/70 sm:w-auto"
          >
            <FaPlus />
            Nova solicitação
          </button>
        </section>

        <section
          className="animate-fade-slide-up space-y-4"
          style={{ animationDelay: "140ms" }}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="flex items-center gap-2 text-base font-extrabold text-slate-900">
              <FaClipboardList className="text-blue-600" />
              Acompanhe a solicitação
            </h2>

            <label className="w-full space-y-2 sm:max-w-xs">
              <span className="text-sm font-semibold text-slate-700">
                Busca rápida
              </span>
              <input
                value={busca.termo}
                onChange={(event) => atualizarBusca(event.target.value)}
                placeholder="Código, data ou UF"
                className="h-11 w-full rounded-lg border border-slate-300 px-4 text-sm text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
          </div>

          <div
            ref={feedRef}
            className="feed-scroll grid max-h-[470px] gap-3 overflow-y-auto pr-2 scroll-smooth md:grid-cols-2"
          >
            {carregandoSolicitacoes ? (
              <section className="animate-soft-pop rounded-lg border border-slate-200 bg-slate-50 p-5 md:col-span-2">
                <h3 className="mb-2 font-extrabold text-slate-900">
                  Carregando solicitações
                </h3>
                <p className="text-sm leading-6 text-slate-600">
                  Buscando os códigos vinculados ao CPF desta chave passe.
                </p>
              </section>
            ) : solicitacoesVisiveis.length === 0 ? (
              <section className="animate-soft-pop rounded-lg border border-slate-200 bg-slate-50 p-5 md:col-span-2">
                <h3 className="mb-2 font-extrabold text-slate-900">
                  Você ainda não tem solicitações
                </h3>
                <p className="text-sm leading-6 text-slate-600">
                  Quando uma solicitação for cadastrada, ela aparecerá nesta
                  listagem para acompanhamento.
                </p>
              </section>
            ) : (
              solicitacoesVisiveis.map((item) => (
                <section
                  key={item.id}
                  data-scroll-card={item.id}
                  className={`rounded-lg border border-slate-200 bg-slate-50 p-5 shadow-sm transition-all duration-700 ease-out will-change-transform hover:-translate-y-1 hover:border-blue-200 hover:bg-white hover:shadow-xl hover:shadow-blue-100/70 motion-reduce:transform-none motion-reduce:opacity-100 ${
                    cardsVisiveis.has(item.id)
                      ? "translate-y-0 scale-100 opacity-100 blur-0"
                      : "translate-y-8 scale-[0.97] opacity-0 blur-sm"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => alternarCodigo(item.id)}
                    aria-expanded={codigoAberto === item.id}
                    className="flex w-full items-center justify-between gap-4 text-left"
                  >
                    <span>
                      <strong className="block text-base font-extrabold text-slate-900">
                        Código {item.codigo || `#${String(item.id).padStart(4, "0")}`}
                      </strong>
                      <span className="mt-2 flex flex-wrap gap-2">
                        <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                          Destino: {item.destinos[0]}
                        </span>
                        <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                          Ida: {formatarData(item.dataIda)}
                        </span>
                        <span className="inline-flex rounded-full bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-700">
                          Volta: {formatarData(item.dataVolta)}
                        </span>
                      </span>
                    </span>

                    <FaChevronDown
                      className={`shrink-0 text-blue-600 transition duration-300 ${
                        codigoAberto === item.id ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  <div
                    className={`grid overflow-hidden transition-all duration-500 ease-out ${
                      codigoAberto === item.id
                        ? "mt-4 max-h-64 opacity-100"
                        : "max-h-0 opacity-0"
                    }`}
                  >
                    <div className="grid gap-x-4 gap-y-2 border-t border-slate-200 pt-4 text-sm leading-6 text-slate-700 sm:grid-cols-2">
                      <p className="sm:col-span-2">
                        Pessoa: <strong>{item.pessoa}</strong>
                      </p>
                      <p>
                        UF solicitante: <strong>{item.ufSolicitante || "-"}</strong>
                      </p>
                      <p className="sm:col-span-2">
                        Pessoas: <strong>{item.pessoas}</strong>
                      </p>
                    </div>
                  </div>
                </section>
              ))
            )}
          </div>

          <p className="text-sm text-slate-500">
            Mostrando {solicitacoesVisiveis.length} solicitações no feed
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-10">
      <section className="animate-fade-slide-up mb-8">
        <button
          type="button"
          onClick={voltarParaAcompanhamento}
          className="mb-5 text-sm font-bold text-blue-700 transition hover:text-blue-800"
        >
          Voltar para acompanhamento
        </button>

        <h1 className="text-2xl font-extrabold text-slate-950">
          Formulário de Solicitação
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Preencha uma etapa por vez para cadastrar a solicitação.
        </p>
      </section>

      <div className="mb-8 grid grid-cols-4 gap-2">
        {passos.map((passo, index) => (
          <div
            key={passo}
            className={`h-2 rounded-full ${
              index <= passoAtual ? "bg-blue-600" : "bg-slate-200"
            }`}
            title={passo}
          />
        ))}
      </div>

      <form className="space-y-8" onSubmit={enviarSolicitacao}>
        {passoAtual === 0 && (
          <section className="page-turn space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-base font-extrabold text-slate-900">
              <FaUser className="text-blue-600" />
              Dados do beneficiário
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Nome</span>
                <input
                  value={solicitacao.nome}
                  readOnly
                  className="h-12 w-full rounded-lg border border-slate-300 bg-slate-50 px-4 text-base text-slate-950 outline-none"
                  required
                />
              </label>

              <label className="space-y-2">
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <FaIdCard className="text-slate-500" />
                  CPF
                </span>
                <input
                  value={mascararCpf(solicitacao.cpf)}
                  readOnly
                  className="h-12 w-full rounded-lg border border-slate-300 bg-slate-50 px-4 text-base text-slate-950 outline-none"
                  required
                />
              </label>
            </div>
          </section>
        )}

        {passoAtual === 1 && (
          <section className="page-turn space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-base font-extrabold text-slate-900">
              <FaUser className="text-blue-600" />
              Dependentes
            </h2>

            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">
                  Selecionar dependente
                </span>
                <select
                  value={dependenteSelecionadoCpf}
                  onChange={(event) =>
                    setDependenteSelecionadoCpf(event.target.value)
                  }
                  disabled={carregandoDependentes}
                  className="h-12 w-full rounded-lg border border-slate-300 bg-white px-4 text-base text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="">
                    {carregandoDependentes
                      ? "Carregando dependentes"
                      : "Selecione"}
                  </option>
                  {dependentesDisponiveis
                    .filter(
                      (dependente) =>
                        !solicitacao.dependentes.some(
                          (selecionado) =>
                            selecionado.cpf.replace(/\D/g, "") ===
                            dependente.cpf.replace(/\D/g, "")
                        )
                    )
                    .map((dependente) => (
                      <option key={dependente.cpf} value={dependente.cpf}>
                        {dependente.nome} - CPF {mascararCpf(dependente.cpf)}
                      </option>
                    ))}
                </select>
              </label>

              <button
                type="button"
                onClick={adicionarDependenteSelecionado}
                disabled={!dependenteSelecionadoCpf}
                className="inline-flex h-12 items-center justify-center gap-2 self-end rounded-lg border border-blue-200 px-4 text-sm font-bold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 disabled:hover:bg-transparent"
              >
                <FaPlus />
                Adicionar
              </button>
            </div>

            {!carregandoDependentes &&
              dependentesDisponiveis.length === 0 && (
                <p className="text-sm text-slate-500">
                  Nenhum dependente encontrado para este titular.
                </p>
              )}

            {solicitacao.dependentes.length === 0 && (
              <p className="text-sm text-slate-500">
                Nenhum dependente selecionado.
              </p>
            )}

            {solicitacao.dependentes.map((dependente, index) => (
              <div
                key={dependente.id}
                className="animate-soft-pop space-y-4 rounded-lg border border-slate-200 p-4 transition hover:border-blue-200 hover:shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-extrabold text-slate-800">
                    Dependente {index + 1}
                  </h3>

                  <button
                    type="button"
                    onClick={() => removerDependente(dependente.id)}
                    className="inline-flex items-center gap-2 text-sm font-bold text-red-600 transition hover:text-red-700"
                  >
                    <FaTrash />
                    Remover
                  </button>
                </div>

                <div className="grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
                  <p>
                    Nome: <strong>{dependente.nome}</strong>
                  </p>
                  <p>
                    CPF: <strong>{mascararCpf(dependente.cpf)}</strong>
                  </p>
                </div>
              </div>
            ))}
          </section>
        )}

        {passoAtual === 2 && (
          <section className="page-turn space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-base font-extrabold text-slate-900">
              <FaMapMarkerAlt className="text-blue-600" />
              Destino da solicitação
            </h2>

            <div className="space-y-3">
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-slate-700">
                  UF solicitante
                </span>
                <select
                  value={solicitacao.estadoSolicitante || ""}
                  onChange={(event) =>
                    atualizarCampo("estadoSolicitante", event.target.value)
                  }
                  className="h-12 w-full rounded-lg border border-slate-300 bg-white px-4 text-base text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Selecione</option>
                  {estados.map((estado) => (
                    <option key={estado} value={estado}>
                      {estado}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-slate-700">
                  Filiada de destino
                </span>
                <select
                  value={solicitacao.destinos[0]?.estado ?? ""}
                  onChange={(event) =>
                    atualizarDestino(
                      solicitacao.destinos[0]?.id ?? 1,
                      event.target.value
                    )
                  }
                  disabled={carregandoFiliadas}
                  className="h-12 w-full rounded-lg border border-slate-300 bg-white px-4 text-base text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                  required
                >
                  <option value="">
                    {carregandoFiliadas
                      ? "Carregando filiadas"
                      : "Selecione a filiada"}
                  </option>
                  {filiadasDestino.map((filiada) => (
                    <option key={filiada.id} value={filiada.uf}>
                      {filiada.nome} - {filiada.uf}
                    </option>
                  ))}
                </select>
              </label>

              {!carregandoFiliadas && filiadasDestino.length === 0 && (
                <p className="text-sm text-slate-500">
                  Nenhuma filiada de destino encontrada.
                </p>
              )}
            </div>
          </section>
        )}

        {passoAtual === 3 && (
          <section className="page-turn space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-base font-extrabold text-slate-900">
              <FaCalendarAlt className="text-blue-600" />
              Período da viagem
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">
                  Data de ida
                </span>
                <input
                  type="date"
                  value={solicitacao.dataIda}
                  onChange={(event) =>
                    atualizarCampo("dataIda", event.target.value)
                  }
                  className="h-12 w-full rounded-lg border border-slate-300 px-4 text-base text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  required
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">
                  Data de volta
                </span>
                <input
                  type="date"
                  value={solicitacao.dataVolta}
                  min={solicitacao.dataIda || undefined}
                  onChange={(event) =>
                    atualizarCampo("dataVolta", event.target.value)
                  }
                  className="h-12 w-full rounded-lg border border-slate-300 px-4 text-base text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  required
                />
              </label>
            </div>
          </section>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={voltarPasso}
            disabled={passoAtual === 0}
            className="inline-flex h-12 items-center justify-center rounded-lg border border-slate-200 px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
          >
            Voltar
          </button>

          {passoAtual < passos.length - 1 ? (
            <button
              type="button"
              onClick={avancarPasso}
              disabled={!podeAvancar}
              className="inline-flex h-12 items-center justify-center rounded-lg bg-blue-600 px-5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md disabled:cursor-not-allowed disabled:bg-slate-300 disabled:hover:translate-y-0 disabled:hover:shadow-none"
            >
              Avançar
            </button>
          ) : (
            <button
              type="submit"
              disabled={!podeAvancar}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md disabled:cursor-not-allowed disabled:bg-slate-300 disabled:hover:translate-y-0 disabled:hover:shadow-none"
            >
              <FaPaperPlane />
              Enviar solicitação
            </button>
          )}
        </div>
      </form>

      {enviado && (
        <section className="animate-soft-pop mt-8 rounded-lg border border-emerald-200 bg-emerald-50 p-5">
          <h2 className="mb-3 flex items-center gap-2 font-extrabold text-emerald-800">
            <FaCheckCircle />
            Solicitação registrada
          </h2>
          <p className="text-sm leading-6 text-emerald-900">
            {solicitacao.nome} solicitou reciprocidade da UF{" "}
            <strong>{solicitacao.estadoSolicitante || "-"}</strong> para a
            filiada de destino <strong>{solicitacao.destinos[0]?.estado}</strong>
            , no período de{" "}
            <strong>{formatarData(solicitacao.dataIda)}</strong> até{" "}
            <strong>{formatarData(solicitacao.dataVolta)}</strong>.
            {solicitacao.dependentes.length > 0 &&
              ` Dependentes: ${solicitacao.dependentes
                .map((dependente) => `${dependente.nome} - CPF ${dependente.cpf}`)
                .join("; ")}.`}
          </p>
        </section>
      )}
    </main>
  );
}
