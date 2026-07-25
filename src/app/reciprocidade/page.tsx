"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  FaCalendarAlt,
  FaCheckCircle,
  FaClipboardList,
  FaDownload,
  FaMapMarkerAlt,
  FaPaperPlane,
  FaPlus,
  FaSpinner,
  FaTrash,
  FaUser,
} from "react-icons/fa";

declare global {
  interface Window {
    mosiaSDK?: {
      postMessage: (mensagem: string) => void;
    };
  }
}

function registrarDebugDownload(titulo: string, dados: unknown) {
  window.dispatchEvent(
    new CustomEvent("reciprocidade:debug", { detail: { titulo, dados } })
  );
}

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
  filiadaDestinoNome: string;
  dataIda: string;
  dataVolta: string;
  pessoas: number;
}

interface SolicitacaoApi {
  id: number;
  codigo: string;
  filiadaDestinoNome?: string;
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

interface SessaoReciprocidadeApi {
  beneficiario: {
    cpf: string;
    nome: string;
    matricula: string;
    codigoBeneficiario: string;
  };
  modoLocal: boolean;
}

interface BuscaRapida {
  termo: string;
}

const solicitacaoInicial: SolicitacaoReciprocidade = {
  nome: "",
  cpf: "",
  dependentes: [],
  estadoSolicitante: "",
  destinos: [{ id: 1, estado: "" }],
  dataIda: "",
  dataVolta: "",
};

const buscaInicial: BuscaRapida = {
  termo: "",
};

const passos = ["Pessoas", "Estados", "Período"];
const itensPorPagina = 5;
const mensagemTitularNaoEncontrado =
  "Funcionalidade exclusiva para TITULARES DO PLANO AFRAFEP SAUDE PLUS NACIONAL.";

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
    filiadaDestinoNome: item.filiadaDestinoNome || "",
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
  const [carregandoSolicitacoes, setCarregandoSolicitacoes] = useState(true);
  const [carregandoDependentes, setCarregandoDependentes] = useState(true);
  const [dependentesDisponiveis, setDependentesDisponiveis] = useState<
    DependenteApi[]
  >([]);
  const [filiadasDestino, setFiliadasDestino] = useState<FiliadaApi[]>([]);
  const [carregandoFiliadas, setCarregandoFiliadas] = useState(true);
  const [, setMensagemBeneficiario] = useState("");
  const [mensagemAcesso, setMensagemAcesso] = useState("");
  const [dependenteSelecionadoCpf, setDependenteSelecionadoCpf] = useState("");
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [cardsVisiveis, setCardsVisiveis] = useState<Set<number>>(new Set());
  const [codigoBaixandoTermo, setCodigoBaixandoTermo] = useState<string | null>(
    null
  );
  const [erroDownloadTermo, setErroDownloadTermo] = useState("");
  const [codigoErroDownloadTermo, setCodigoErroDownloadTermo] = useState<
    string | null
  >(null);
  const feedRef = useRef<HTMLDivElement>(null);

  const podeAvancar =
    passoAtual === 0 ||
    (passoAtual === 1 && solicitacao.destinos[0]?.estado.trim()) ||
    (passoAtual === 2 && solicitacao.dataIda && solicitacao.dataVolta);
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
  const totalPaginas = Math.max(
    1,
    Math.ceil(solicitacoesVisiveis.length / itensPorPagina)
  );
  const inicioPagina = (paginaAtual - 1) * itensPorPagina;
  const solicitacoesPaginadas = solicitacoesVisiveis.slice(
    inicioPagina,
    inicioPagina + itensPorPagina
  );
  const pessoasDisponiveis = [
    ...(solicitacao.nome && solicitacao.cpf
      ? [{ nome: solicitacao.nome, cpf: solicitacao.cpf }]
      : []),
    ...dependentesDisponiveis,
  ].filter(
    (pessoa, index, lista) =>
      lista.findIndex(
        (item) =>
          item.cpf.replace(/\D/g, "") === pessoa.cpf.replace(/\D/g, "")
      ) === index
  );
  const pessoasParaSelecionar = pessoasDisponiveis.filter(
    (pessoa) =>
      !solicitacao.dependentes.some(
        (selecionado) =>
          selecionado.cpf.replace(/\D/g, "") ===
          pessoa.cpf.replace(/\D/g, "")
      )
  );
  const idsVisiveis = solicitacoesPaginadas.map((item) => item.id).join(",");

  const abrirSessaoBeneficiario = useCallback(async () => {
    const params = new URLSearchParams(window.location.search);
    const chavePasse =
      params.get("chavePasse") || params.get("chavepasse") || "";
    setMensagemBeneficiario("Consultando autorização do beneficiário.");

    const response = await fetch("/api/reciprocidade/sessao", {
      method: "POST",
      cache: "no-store",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chavePasse }),
    });

    if (!response.ok) {
      setMensagemBeneficiario("Não foi possível autorizar o beneficiário.");
      return null;
    }

    const sessao = (await response.json()) as SessaoReciprocidadeApi;
    if (!sessao.beneficiario?.cpf) {
      setMensagemBeneficiario(
        "A autorização não retornou os dados do beneficiário."
      );
      return null;
    }

    setMensagemBeneficiario("Beneficiário autorizado.");
    return sessao;
  }, []);

  const carregarDadosDoTitular = useCallback(async () => {
    setCarregandoSolicitacoes(true);
    setCarregandoDependentes(true);
    setCarregandoFiliadas(true);
    setMensagemAcesso("");

    try {
      const sessao = await abrirSessaoBeneficiario();
      const resFiliadasPromise = fetch("/api/reciprocidade/filiadas/ativas", {
        credentials: "include",
      });

      if (!sessao) {
        const resFiliadas = await resFiliadasPromise;

        if (resFiliadas.ok) {
          const filiadas = (await resFiliadas.json()) as FiliadaApi[];
          setFiliadasDestino(filiadas);
        }

        setSolicitacoes([]);
        setDependentesDisponiveis([]);
        setSolicitacao(solicitacaoInicial);
        setMensagemAcesso(mensagemTitularNaoEncontrado);
        return;
      }

      const [resBeneficiario, resSolicitacoes, resFiliadas] = await Promise.all([
        fetch("/api/reciprocidade/beneficiario", {
          cache: "no-store",
          credentials: "include",
        }),
        fetch("/api/reciprocidade/solicitacoes", {
          cache: "no-store",
          credentials: "include",
        }),
        resFiliadasPromise,
      ]);

      let ufTitular = "";
      let titularEncontrado = false;

      if (resBeneficiario.ok) {
        const familia = (await resBeneficiario.json()) as BeneficiarioFamiliaApi;
        setDependentesDisponiveis(familia.dependentes ?? []);

        if (familia.titular) {
          titularEncontrado = true;
          ufTitular = familia.titular.uf || "PB";
          setSolicitacao((dados) => ({
            ...dados,
            nome: familia.titular?.nome || dados.nome,
            cpf: familia.titular?.cpf || dados.cpf,
            estadoSolicitante:
              familia.titular?.uf || dados.estadoSolicitante || "PB",
          }));
        } else {
          setMensagemAcesso(mensagemTitularNaoEncontrado);
          setSolicitacao(solicitacaoInicial);
          setDependentesDisponiveis([]);
        }
      } else {
        setMensagemAcesso(mensagemTitularNaoEncontrado);
        setSolicitacao(solicitacaoInicial);
        setDependentesDisponiveis([]);
      }

      if (resFiliadas.ok) {
        const filiadas = (await resFiliadas.json()) as FiliadaApi[];
        setFiliadasDestino(filiadas);
      }

      if (titularEncontrado && resSolicitacoes.ok) {
        const data = (await resSolicitacoes.json()) as SolicitacaoApi[];
        const lista = Array.isArray(data) ? data : [];

        setSolicitacoes(
          lista.map((item) => normalizarSolicitacaoApi(item, ufTitular))
        );
      } else {
        setSolicitacoes([]);
      }
    } catch (err) {
      console.error(err);
      setSolicitacoes([]);
    } finally {
      setCarregandoSolicitacoes(false);
      setCarregandoDependentes(false);
      setCarregandoFiliadas(false);
    }
  }, [abrirSessaoBeneficiario]);

  useEffect(() => {
    carregarDadosDoTitular();
  }, [carregarDadosDoTitular]);

  useEffect(() => {
    if (paginaAtual > totalPaginas) {
      setPaginaAtual(totalPaginas);
    }
  }, [paginaAtual, totalPaginas]);

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
              observer.unobserve(entry.target);
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
    setPaginaAtual(1);
  }

  async function baixarTermo(codigo: string) {
    setCodigoBaixandoTermo(codigo);
    setErroDownloadTermo("");
    setCodigoErroDownloadTermo(null);
    registrarDebugDownload("Download do termo iniciado", {
      codigo,
      mosiaSDKDisponivel: Boolean(window.mosiaSDK),
      postMessageDisponivel:
        typeof window.mosiaSDK?.postMessage === "function",
    });

    try {
      const response = await fetch(
        `/api/reciprocidade/solicitacoes/${encodeURIComponent(codigo)}/termo`,
        { cache: "no-store", credentials: "include" }
      );
      registrarDebugDownload("Resposta do PDF recebida", {
        codigo,
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        contentType: response.headers.get("content-type"),
        contentLength: response.headers.get("content-length"),
        contentDisposition: response.headers.get("content-disposition"),
      });

      if (!response.ok) {
        const erro = (await response.json().catch(() => null)) as
          | { error?: string; mensagem?: string }
          | null;
        throw new Error(
          erro?.mensagem ||
            erro?.error ||
            "Não foi possível baixar o termo da solicitação."
        );
      }

      const arquivo = await response.blob();
      const nomeArquivo = `termo_ciencia_reciprocidade_fisco_${codigo}.pdf`;
      registrarDebugDownload("PDF carregado na WebView", {
        codigo,
        nomeArquivo,
        tamanhoBytes: arquivo.size,
        mimeType: arquivo.type || "não informado",
      });

      if (window.mosiaSDK?.postMessage) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const leitor = new FileReader();
          leitor.onloadend = () =>
            typeof leitor.result === "string"
              ? resolve(leitor.result)
              : reject(new Error("Não foi possível preparar o arquivo."));
          leitor.onerror = () =>
            reject(new Error("Não foi possível preparar o arquivo."));
          leitor.readAsDataURL(arquivo);
        });
        const base64Content = dataUrl.split(",", 2)[1];
        registrarDebugDownload("PDF convertido para Base64", {
          codigo,
          tamanhoBase64: base64Content?.length || 0,
          prefixoDataUrlValido: dataUrl.startsWith("data:"),
        });

        window.mosiaSDK.postMessage(
          JSON.stringify({
            type: "download-file",
            fileName: nomeArquivo,
            base64Content,
            mimeType: arquivo.type || "application/pdf",
          })
        );
        registrarDebugDownload("Comando enviado ao Mosia", {
          codigo,
          type: "download-file",
          fileName: nomeArquivo,
          mimeType: arquivo.type || "application/pdf",
          conteudoBase64Enviado: Boolean(base64Content),
        });
        return;
      }

      registrarDebugDownload("Fallback de navegador acionado", {
        codigo,
        motivo: "mosiaSDK.postMessage não está disponível",
      });
      const url = URL.createObjectURL(arquivo);
      const link = document.createElement("a");
      link.href = url;
      link.download = nomeArquivo;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      registrarDebugDownload("Falha no download do termo", {
        codigo,
        nome: error instanceof Error ? error.name : "Erro desconhecido",
        mensagem:
          error instanceof Error ? error.message : "Erro desconhecido",
        stack: error instanceof Error ? error.stack : undefined,
      });
      setCodigoErroDownloadTermo(codigo);
      setErroDownloadTermo(
        error instanceof Error
          ? error.message
          : "Não foi possível baixar o termo da solicitação."
      );
    } finally {
      setCodigoBaixandoTermo(null);
    }
  }

  function abrirNovaSolicitacao() {
    if (mensagemAcesso) return;

    setMostraFormulario(true);
    setPassoAtual(0);
    setEnviado(false);
    carregarDadosDoTitular();
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
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ufDestino: solicitacao.destinos[0]?.estado,
        dataInicio: solicitacao.dataIda,
        dataFim: solicitacao.dataVolta,
        dependentesCpf: solicitacao.dependentes
          .map((dependente) => dependente.cpf.replace(/\D/g, ""))
          .filter((cpf) => cpf !== solicitacao.cpf.replace(/\D/g, "")),
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
    setSolicitacao((dados) => ({
      ...solicitacaoInicial,
      nome: dados.nome,
      cpf: dados.cpf,
      estadoSolicitante: dados.estadoSolicitante,
    }));
    setDependenteSelecionadoCpf("");
    setPassoAtual(0);
    setPaginaAtual(1);
    setMostraFormulario(false);
    setEnviado(true);
  }

  function selecionarPessoaSolicitacao(cpfSelecionado: string) {
    const pessoa = pessoasDisponiveis.find(
      (item) =>
        item.cpf.replace(/\D/g, "") ===
        cpfSelecionado.replace(/\D/g, "")
    );

    if (!pessoa) return;

    setSolicitacao((dados) => ({
      ...dados,
      dependentes: dados.dependentes.some(
        (dependente) =>
          dependente.cpf.replace(/\D/g, "") ===
          pessoa.cpf.replace(/\D/g, "")
      )
        ? dados.dependentes
        : [
            ...dados.dependentes,
            {
              id: Date.now(),
              nome: pessoa.nome,
              cpf: pessoa.cpf,
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
    if (carregandoSolicitacoes) {
      return (
        <main className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6 py-8">
          <section className="animate-soft-pop flex flex-col items-center rounded-lg border border-slate-200 bg-slate-50 p-6 text-center">
            <FaSpinner className="mb-4 animate-spin text-3xl text-brand" />
            <h2 className="mb-2 font-extrabold text-slate-900">
              Consultando autorização
            </h2>
            <p className="text-sm leading-6 text-slate-600">
              Aguarde enquanto verificamos o CPF do beneficiário.
            </p>
          </section>
        </main>
      );
    }

    if (mensagemAcesso) {
      return (
        <main className="mx-auto min-h-screen max-w-3xl px-6 py-8">
          <section className="animate-soft-pop rounded-lg border border-amber-200 bg-amber-50 p-5">
            <h2 className="mb-2 font-extrabold text-amber-900">
              Não autorizado
            </h2>
            <p className="text-sm font-bold uppercase leading-6 text-amber-950">
              {mensagemAcesso}
            </p>
          </section>
        </main>
      );
    }

    return (
      <main className="mx-auto min-h-screen max-w-3xl px-6 py-8">
        <section
          className="animate-fade-slide-up mb-5"
          style={{ animationDelay: "80ms" }}
        >
          <button
            type="button"
            onClick={abrirNovaSolicitacao}
            disabled={Boolean(mensagemAcesso)}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand px-5 text-sm font-bold text-white shadow-lg shadow-brand/20 transition duration-300 hover:-translate-y-1 hover:bg-brand-hover hover:shadow-xl hover:shadow-brand/30 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none disabled:hover:translate-y-0 sm:w-auto"
          >
            <FaPlus />
            Nova solicitação
          </button>
        </section>

        {enviado && (
          <section className="animate-soft-pop mb-5 rounded-lg border border-emerald-200 bg-emerald-50 p-5">
            <h2 className="mb-2 flex items-center gap-2 font-extrabold text-emerald-800">
              <FaCheckCircle />
              Solicitação registrada
            </h2>
            <p className="text-sm leading-6 text-emerald-900">
              A solicitação foi enviada com sucesso.
            </p>
          </section>
        )}

        <section
          className="animate-fade-slide-up space-y-4"
          style={{ animationDelay: "140ms" }}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="flex items-center gap-2 text-base font-extrabold text-slate-900">
              <FaClipboardList className="text-brand" />
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
                className="h-11 w-full rounded-lg border border-slate-300 px-4 text-sm text-slate-950 outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft"
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
                  Buscando os dados vinculados ao beneficiário.
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
              solicitacoesPaginadas.map((item) => (
                <section
                  key={item.id}
                  data-scroll-card={item.id}
                  className={`rounded-lg border border-slate-200 bg-slate-50 p-5 shadow-sm transition-all duration-700 ease-out will-change-transform hover:-translate-y-1 hover:border-brand/30 hover:bg-white hover:shadow-xl hover:shadow-brand/15 motion-reduce:transform-none motion-reduce:opacity-100 ${
                    cardsVisiveis.has(item.id)
                      ? "translate-y-0 scale-100 opacity-100 blur-0"
                      : "translate-y-8 scale-[0.97] opacity-0 blur-sm"
                  }`}
                >
                  <div className="flex w-full items-center justify-between gap-4 text-left">
                    <span>
                      <strong className="block text-base font-extrabold text-slate-900">
                        Código {item.codigo || `#${String(item.id).padStart(4, "0")}`}
                      </strong>
                      <span className="mt-2 flex flex-wrap gap-2">
                        <span className="inline-flex rounded-full bg-brand-soft px-3 py-1 text-xs font-bold text-brand">
                          Destino: {item.destinos[0]}
                          {item.filiadaDestinoNome
                            ? ` - ${item.filiadaDestinoNome}`
                            : ""}
                        </span>
                      </span>
                      <span className="mt-2 flex flex-wrap gap-2">
                        <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                          Ida: {formatarData(item.dataIda)}
                        </span>
                        <span className="inline-flex rounded-full bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-700">
                          Volta: {formatarData(item.dataVolta)}
                        </span>
                      </span>
                    </span>
                  </div>

                  <div className="mt-4 border-t border-slate-200 pt-4">
                    <button
                      type="button"
                      onClick={() => baixarTermo(item.codigo)}
                      disabled={codigoBaixandoTermo === item.codigo}
                      className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {codigoBaixandoTermo === item.codigo ? (
                        <FaSpinner className="animate-spin" />
                      ) : (
                        <FaDownload />
                      )}
                      {codigoBaixandoTermo === item.codigo
                        ? "Preparando termo..."
                        : "Baixar termo da solicitação"}
                    </button>

                    {codigoErroDownloadTermo === item.codigo &&
                      erroDownloadTermo && (
                        <p className="mt-3 text-sm font-semibold text-red-600">
                          {erroDownloadTermo}
                        </p>
                      )}
                  </div>
                </section>
              ))
            )}
          </div>

          {solicitacoesVisiveis.length > itensPorPagina && (
            <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-slate-600">
                Página {paginaAtual} de {totalPaginas}
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setPaginaAtual((pagina) => Math.max(1, pagina - 1))
                  }
                  disabled={paginaAtual === 1}
                  className="inline-flex h-10 flex-1 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent sm:flex-none"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPaginaAtual((pagina) =>
                      Math.min(totalPaginas, pagina + 1)
                    )
                  }
                  disabled={paginaAtual === totalPaginas}
                  className="inline-flex h-10 flex-1 items-center justify-center rounded-lg bg-brand px-4 text-sm font-bold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-slate-300 sm:flex-none"
                >
                  Próxima
                </button>
              </div>
            </div>
          )}

          <p className="text-sm text-slate-500">
            Mostrando {solicitacoesPaginadas.length} de{" "}
            {solicitacoesVisiveis.length} solicitações
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
          className="mb-5 text-sm font-bold text-brand transition hover:text-brand-hover"
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

      <div className="mb-8 grid grid-cols-3 gap-2">
        {passos.map((passo, index) => (
          <div
            key={passo}
            className={`h-2 rounded-full ${
              index <= passoAtual ? "bg-brand" : "bg-slate-200"
            }`}
            title={passo}
          />
        ))}
      </div>

      <form className="space-y-8" onSubmit={enviarSolicitacao}>
        {passoAtual === 0 && (
          <section className="page-turn space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-base font-extrabold text-slate-900">
              <FaUser className="text-brand" />
              Pessoas da solicitação
            </h2>

            <div className="grid gap-3">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">
                  Selecionar pessoa
                </span>
                <select
                  value={dependenteSelecionadoCpf}
                  onChange={(event) =>
                    selecionarPessoaSolicitacao(event.target.value)
                  }
                  disabled={carregandoDependentes}
                  className="h-12 w-full rounded-lg border border-slate-300 bg-white px-4 text-base text-slate-950 outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="">
                    {carregandoDependentes
                      ? "Carregando pessoas"
                      : "Selecione"}
                  </option>
                  {pessoasParaSelecionar.map((pessoa) => (
                    <option key={pessoa.cpf} value={pessoa.cpf}>
                      {pessoa.nome}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {!carregandoDependentes && pessoasDisponiveis.length === 0 && (
              <p className="text-sm text-slate-500">
                Nenhuma pessoa encontrada para este titular.
              </p>
            )}

            {solicitacao.dependentes.length === 0 && (
              <p className="text-sm text-slate-500">
                Nenhuma pessoa selecionada.
              </p>
            )}

            {solicitacao.dependentes.map((dependente, index) => (
              <div
                key={dependente.id}
                className="animate-soft-pop space-y-4 rounded-lg border border-slate-200 p-4 transition hover:border-brand/30 hover:shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-extrabold text-slate-800">
                    Pessoa {index + 1}
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

                <div className="text-sm text-slate-700">
                  <p>
                    Nome: <strong>{dependente.nome}</strong>
                  </p>
                </div>
              </div>
            ))}
          </section>
        )}

        {passoAtual === 1 && (
          <section className="page-turn space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-base font-extrabold text-slate-900">
              <FaMapMarkerAlt className="text-brand" />
              Destino da solicitação
            </h2>

            <div className="space-y-3">
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-slate-700">
                  UF - Filiada de destino
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
                  className="h-12 w-full rounded-lg border border-slate-300 bg-white px-4 text-base text-slate-950 outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                  required
                >
                  <option value="">
                    {carregandoFiliadas
                      ? "Carregando filiadas"
                      : "Selecione a filiada"}
                  </option>
                  {filiadasDestino.map((filiada) => (
                    <option key={filiada.id} value={filiada.uf}>
                      {filiada.uf} - {filiada.nome}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>
        )}

        {passoAtual === 2 && (
          <section className="page-turn space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-base font-extrabold text-slate-900">
              <FaCalendarAlt className="text-brand" />
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
                  className="h-12 w-full rounded-lg border border-slate-300 px-4 text-base text-slate-950 outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft"
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
                  className="h-12 w-full rounded-lg border border-slate-300 px-4 text-base text-slate-950 outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft"
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
              className="inline-flex h-12 items-center justify-center rounded-lg bg-brand px-5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-brand-hover hover:shadow-md disabled:cursor-not-allowed disabled:bg-slate-300 disabled:hover:translate-y-0 disabled:hover:shadow-none"
            >
              Avançar
            </button>
          ) : (
            <button
              type="submit"
              disabled={!podeAvancar}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-brand px-5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-brand-hover hover:shadow-md disabled:cursor-not-allowed disabled:bg-slate-300 disabled:hover:translate-y-0 disabled:hover:shadow-none"
            >
              <FaPaperPlane />
              Enviar solicitação
            </button>
          )}
        </div>
      </form>
    </main>
  );
}
