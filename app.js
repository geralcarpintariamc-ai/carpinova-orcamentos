// ---------- Catálogo de referência (atalhos de preço, opcionais) ----------

const CATALOGO = [
  { id: "agl-std-18", nome: "AGL STD EZ 18mm (Finsa/B&F)", preco: 5.09, unidade: "m²", tipo: "Material" },
  { id: "agl-hid-18", nome: "AGL HID EZ 18mm (Finsa/B&F)", preco: 7.14, unidade: "m²", tipo: "Material" },
  { id: "mdf-std-18", nome: "MDF STD EZ 18mm (Finsa/B&F)", preco: 7.50, unidade: "m²", tipo: "Material" },
  { id: "mdf-hid-18", nome: "MDF HID EZ 18mm (Finsa/B&F)", preco: 9.57, unidade: "m²", tipo: "Material" },
  { id: "mdf-hid-19", nome: "MDF HID EZ 19mm (Finsa/B&F)", preco: 10.10, unidade: "m²", tipo: "Material" },
  { id: "superpan-std-18", nome: "Superpan STD EZ 18mm (Finsa/B&F)", preco: 6.39, unidade: "m²", tipo: "Material" },
  { id: "duo-gr1-18", nome: "DUO Gr1 AGL STD 18mm decorativo", preco: 9.70, unidade: "m²", tipo: "Material" },
  { id: "duo-gr2-18", nome: "DUO Gr2 AGL STD 18mm decorativo", preco: 12.04, unidade: "m²", tipo: "Material" },
  { id: "innovus-mdf-std-18", nome: "MDF STD 18mm (Innovus)", preco: 8.87, unidade: "m²", tipo: "Material" },
  { id: "innovus-mdf-hid-19", nome: "MDF HID 19mm (Innovus)", preco: 12.17, unidade: "m²", tipo: "Material" },
  { id: "innovus-pb-hid-19", nome: "PB HID 19mm L166 promo (Innovus)", preco: 10.93, unidade: "m²", tipo: "Material" },
  { id: "bloma-13", nome: "Fenólico BLOMA 13mm (Covema)", preco: 53.02, unidade: "m²", tipo: "Material" },
  { id: "lac-interno", nome: "Lacado interno", preco: 20, unidade: "m²", tipo: "Acabamento" },
  { id: "lac-serlaca-mate", nome: "Lacado Serlaca 2F mate", preco: 47, unidade: "m²", tipo: "Acabamento" },
  { id: "lac-serlaca-brilho", nome: "Lacado Serlaca 2F alto brilho", preco: 58, unidade: "m²", tipo: "Acabamento" },
  { id: "verniz-interno", nome: "Verniz interno mate natural", preco: 13, unidade: "m²", tipo: "Acabamento" },
  { id: "ripado-lacado", nome: "Ripado lacado (Serlaca)", preco: 65, unidade: "m²", tipo: "Acabamento" },
];

const MARGENS = [
  { id: "residencial", nome: "Residencial direto", valor: 0.30 },
  { id: "arquiteto", nome: "Indicação de arquiteto", valor: 0.28 },
  { id: "empreiteiro", nome: "Empreiteiro / obra grande", valor: 0.25 },
  { id: "premium", nome: "Projeto especial / direto premium", valor: 0.35 },
  { id: "industrial", nome: "Industrial / série", valor: 0.15 },
  { id: "preferencial", nome: "Parceiro preferencial (ANGroup)", valor: 0.15 },
];

const MO_FABRICO_HORA = 24.07;
const REND_FABRICO = 1.6243;
const MO_MONTAGEM_HORA = 22.87;
const REND_MONTAGEM = 2.274;
const DESPERDICIO = 0.10;
const IVA = 0.23;
const UNIDADES = ["m²", "ml", "un", "h", "m³", "kg", "vg"];

const eur = (n) => (Number.isFinite(n) ? n : 0).toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
const hoje = () => new Date().toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" });
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const num = (v) => parseFloat((v ?? "").toString().replace(",", ".")) || 0;

// ---------- Estado ----------

let state = {
  referencia: "CARP-ORÇ-2026-",
  cliente: "",
  validadeDias: "8",
  autoliquidacao: false,
  margemId: "residencial",
  descricaoGeral: "",
  linhas: [],
};

const LS_ATUAL = "carpinova-orcamento-atual";
const LS_API_URL = "carpinova-sheets-api-url";

function getApiUrl() { return localStorage.getItem(LS_API_URL) || ""; }
function temLigacao() { return !!getApiUrl(); }

function guardarRascunhoAuto() {
  try { localStorage.setItem(LS_ATUAL, JSON.stringify(state)); } catch (e) { /* best-effort */ }
}
function carregarRascunhoAuto() {
  try {
    const raw = localStorage.getItem(LS_ATUAL);
    if (raw) state = { ...state, ...JSON.parse(raw) };
  } catch (e) { /* sem rascunho anterior */ }
}

// ---------- Cálculo ----------

function linhaTotal(l) { return num(l.qtd) * num(l.custoUnit); }

function calcularTotais() {
  const linhas = state.linhas.map((l) => ({ ...l, total: linhaTotal(l) }));
  const porTipo = (tipo) => linhas.filter((l) => l.tipo === tipo).reduce((s, l) => s + l.total, 0);

  const subtotalMaterial = porTipo("Material");
  const desperdicio = subtotalMaterial * DESPERDICIO;
  const subtotalFerragens = porTipo("Ferragens");
  const subtotalAcabamento = porTipo("Acabamento");
  const moFabricacao = porTipo("MO Fabricação");
  const moMontagem = porTipo("MO Montagem");
  const subtotalOutro = porTipo("Outro");

  const custoTotalProducao = subtotalMaterial + desperdicio + subtotalFerragens + subtotalAcabamento + moFabricacao + moMontagem + subtotalOutro;
  const margem = MARGENS.find((m) => m.id === state.margemId) || MARGENS[0];
  const pvpExIva = margem.valor < 1 ? custoTotalProducao / (1 - margem.valor) : custoTotalProducao;
  const ivaValor = state.autoliquidacao ? 0 : pvpExIva * IVA;
  const totalComIva = pvpExIva + ivaValor;

  return {
    linhas, subtotalMaterial, desperdicio, subtotalFerragens, subtotalAcabamento,
    moFabricacao, moMontagem, subtotalOutro, custoTotalProducao, margem, pvpExIva, ivaValor, totalComIva,
  };
}

// ---------- Geração de texto (formato Carpinova) ----------

function gerarFichaCusto() {
  const t = calcularTotais();
  const sep = "─".repeat(70), dsep = "═".repeat(70);
  let out = `FICHA DE CUSTO INTERNO — ${state.referencia} — ${state.cliente || "[cliente]"} — ${hoje()}\n${dsep}\n`;
  out += `ARTIGO | DESCRIÇÃO                     | QTD    | UNID | CUSTO UNIT | TOTAL\n${sep}\n`;
  t.linhas.forEach((l, i) => {
    const desc = (l.descricao || "").padEnd(29).slice(0, 29);
    out += `${String(i + 1).padStart(2, "0")}     | ${desc} | ${num(l.qtd).toFixed(2).padStart(6)} | ${(l.unidade || "").padEnd(4)} | ${eur(num(l.custoUnit)).padStart(10)} | ${eur(l.total).padStart(10)}\n`;
  });
  out += `${sep}\n`;
  out += `SUBTOTAL MATERIAL                                          ${eur(t.subtotalMaterial).padStart(12)}\n`;
  out += `DESPERDÍCIO 10%                                             ${eur(t.desperdicio).padStart(12)}\n`;
  if (t.subtotalFerragens > 0) out += `FERRAGENS                                                   ${eur(t.subtotalFerragens).padStart(12)}\n`;
  if (t.subtotalAcabamento > 0) out += `ACABAMENTO                                                  ${eur(t.subtotalAcabamento).padStart(12)}\n`;
  out += `MÃO DE OBRA FABRICAÇÃO                                     ${eur(t.moFabricacao).padStart(12)}\n`;
  out += `MÃO DE OBRA MONTAGEM                                       ${eur(t.moMontagem).padStart(12)}\n`;
  if (t.subtotalOutro > 0) out += `OUTROS                                                      ${eur(t.subtotalOutro).padStart(12)}\n`;
  out += `${"─".repeat(50)}\n`;
  out += `CUSTO TOTAL PRODUÇÃO                                       ${eur(t.custoTotalProducao).padStart(12)}\n`;
  out += `MARGEM APLICADA                                            ${((t.margem.valor * 100).toFixed(0) + "%").padStart(12)}\n`;
  out += `PVP ex-IVA                                                 ${eur(t.pvpExIva).padStart(12)}\n`;
  out += `${dsep}\n`;
  return out;
}

function gerarProposta() {
  const t = calcularTotais();
  const sep = "─".repeat(60), dsep = "═".repeat(60);
  const desc = state.descricaoGeral || `Fornecimento e montagem de carpintaria — ${state.cliente || ""}`;
  let out = `PROPOSTA COMERCIAL — ${state.referencia} — ${hoje()}\nCliente: ${state.cliente || "[cliente]"}\nValidade: ${state.validadeDias || "8"} dias\n${dsep}\n`;
  out += `ARTIGO | DESCRIÇÃO                          | VALOR ex-IVA\n${sep}\n`;
  out += `01     | ${desc.padEnd(36).slice(0, 36)} | ${eur(t.pvpExIva).padStart(10)}\n${sep}\n`;
  out += `TOTAL ex-IVA                                    ${eur(t.pvpExIva).padStart(10)}\n`;
  if (state.autoliquidacao) {
    out += `IVA – Autoliquidação Art.º 2.º n.º 1 al. j) CIVA\nTOTAL                                           ${eur(t.pvpExIva).padStart(10)}\n`;
  } else {
    out += `IVA 23%                                         ${eur(t.ivaValor).padStart(10)}\nTOTAL c/IVA                                     ${eur(t.totalComIva).padStart(10)}\n`;
  }
  out += `${dsep}\nCondições: 40% adjudicação / 40% início / 20% conclusão\n`;
  return out;
}

// ---------- Render ----------

function popularSelects() {
  const selMargem = document.getElementById("margemGeral");
  selMargem.innerHTML = MARGENS.map((m) => `<option value="${m.id}">${m.nome} — ${(m.valor * 100).toFixed(0)}%</option>`).join("");

  const selCatalogo = document.getElementById("l-catalogo");
  selCatalogo.innerHTML += CATALOGO.map((c) => `<option value="${c.id}">${c.nome} — ${eur(c.preco)}/${c.unidade}</option>`).join("");
  selCatalogo.addEventListener("change", () => {
    const c = CATALOGO.find((x) => x.id === selCatalogo.value);
    if (c) {
      document.getElementById("l-descricao").value = c.nome;
      document.getElementById("l-tipo").value = c.tipo;
      document.getElementById("l-unidade").value = c.unidade;
      document.getElementById("l-custo").value = c.preco;
    }
  });

  ["l-unidade", "bulkUnidade"].forEach((id) => {
    document.getElementById(id).innerHTML = UNIDADES.map((u) => `<option>${u}</option>`).join("");
  });
}

function renderGeral() {
  document.getElementById("referencia").value = state.referencia;
  document.getElementById("cliente").value = state.cliente;
  document.getElementById("validade").value = state.validadeDias;
  document.getElementById("autoliq").checked = state.autoliquidacao;
  document.getElementById("margemGeral").value = state.margemId;
  document.getElementById("descricaoGeral").value = state.descricaoGeral;
}

function renderTabela() {
  const t = calcularTotais();
  const vazio = document.getElementById("listaVazia");
  const wrap = document.getElementById("tabelaWrap");
  const corpo = document.getElementById("tabelaCorpo");
  const totaisBox = document.getElementById("totaisBox");

  const semLinhas = state.linhas.length === 0;
  vazio.hidden = !semLinhas;
  wrap.hidden = semLinhas;

  corpo.innerHTML = state.linhas.map((l, i) => {
    const total = linhaTotal(l);
    const semPreco = num(l.custoUnit) === 0;
    return `
      <tr data-id="${l.id}" class="${semPreco ? "sem-preco" : ""}">
        <td>${i + 1}</td>
        <td class="col-desc"><input data-f="descricao" value="${(l.descricao || "").replace(/"/g, "&quot;")}" /></td>
        <td>
          <select data-f="tipo">
            ${["Material", "Ferragens", "Acabamento", "MO Fabricação", "MO Montagem", "Outro"].map((op) => `<option ${op === l.tipo ? "selected" : ""}>${op}</option>`).join("")}
          </select>
        </td>
        <td class="col-num"><input data-f="qtd" class="mono" value="${l.qtd ?? ""}" /></td>
        <td>
          <select data-f="unidade">${UNIDADES.map((u) => `<option ${u === l.unidade ? "selected" : ""}>${u}</option>`).join("")}</select>
        </td>
        <td class="col-num"><input data-f="custoUnit" class="mono" value="${l.custoUnit ?? ""}" /></td>
        <td class="col-total">${eur(total)}</td>
        <td class="col-remove"><button data-remove="${l.id}">✕</button></td>
      </tr>`;
  }).join("");

  corpo.querySelectorAll("input, select").forEach((el) => {
    el.addEventListener("input", (e) => {
      const tr = e.target.closest("tr");
      const linha = state.linhas.find((l) => l.id === tr.dataset.id);
      if (linha) { linha[e.target.dataset.f] = e.target.value; atualizar(); }
    });
  });
  corpo.querySelectorAll("[data-remove]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.linhas = state.linhas.filter((l) => l.id !== btn.dataset.remove);
      atualizar();
    });
  });

  if (!semLinhas) {
    totaisBox.hidden = false;
    totaisBox.innerHTML = `
      <div class="linha"><span>Custo total produção</span><span>${eur(t.custoTotalProducao)}</span></div>
      <div class="linha"><span>Total ex-IVA</span><span>${eur(t.pvpExIva)}</span></div>
      <div class="linha"><span>${state.autoliquidacao ? "IVA (autoliquidação)" : "IVA 23%"}</span><span>${state.autoliquidacao ? "—" : eur(t.ivaValor)}</span></div>
      <div class="linha destaque"><span>Total c/IVA</span><span>${eur(t.totalComIva)}</span></div>
    `;
  } else {
    totaisBox.hidden = true;
  }

  ["btnCopiarFicha", "btnCopiarProposta", "btnExcel", "btnPdf"].forEach((id) => {
    document.getElementById(id).disabled = semLinhas;
  });
}

async function renderGuardados() {
  const box = document.getElementById("guardadosBox");
  const lista = document.getElementById("guardadosLista");
  if (!temLigacao()) { box.hidden = true; return; }
  lista.innerHTML = `<span class="chip" style="cursor:default;opacity:.6">A carregar…</span>`;
  box.hidden = false;
  try {
    const itens = await apiChamar("list");
    if (!itens || !itens.length) {
      lista.innerHTML = `<span class="chip" style="cursor:default;opacity:.6">Sem orçamentos guardados ainda</span>`;
      return;
    }
    lista.innerHTML = itens.map((it) => `<button class="chip" data-ref="${it.referencia}">${it.referencia}${it.cliente ? " · " + it.cliente : ""}</button>`).join("");
    lista.querySelectorAll(".chip[data-ref]").forEach((chip) => chip.addEventListener("click", () => abrirOrcamento(chip.dataset.ref)));
  } catch (e) {
    lista.innerHTML = `<span class="chip" style="cursor:default;opacity:.6">Não foi possível ligar à folha</span>`;
  }
}

function mostrarAviso(msg) {
  const el = document.getElementById("aviso");
  el.textContent = msg; el.hidden = false;
  setTimeout(() => { el.hidden = true; }, 3800);
}
function mostrarFeedback(msg) {
  const el = document.getElementById("feedback");
  el.textContent = "✓ " + msg;
  setTimeout(() => { el.textContent = ""; }, 2200);
}
function mostrarImportStatus(msg) {
  document.getElementById("importStatus").textContent = msg;
}

function atualizar() { renderTabela(); guardarRascunhoAuto(); }

// ---------- Ligação à Google Sheet ----------

async function apiChamar(action, params) {
  const url = getApiUrl();
  if (!url) throw new Error("sem ligação configurada");
  if (action === "list" || action === "get") {
    const qs = new URLSearchParams({ action, ...(params || {}) });
    const res = await fetch(`${url}?${qs.toString()}`);
    return res.json();
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, ...(params || {}) }),
  });
  return res.json();
}

function atualizarEstadoLigacao() {
  const el = document.getElementById("apiStatus");
  if (temLigacao()) {
    el.textContent = "✓ Ligado à Google Sheet";
    el.className = "api-status ok";
  } else {
    el.textContent = "Sem ligação — os orçamentos não vão ser guardados até colares o link acima (ver COMO_PUBLICAR.md).";
    el.className = "api-status warn";
  }
}

// ---------- Ações: linhas ----------

function adicionarLinhaManual() {
  const descricao = document.getElementById("l-descricao").value.trim();
  const qtd = document.getElementById("l-qtd").value;
  if (!descricao || !(num(qtd) > 0)) {
    mostrarAviso("Indica pelo menos a descrição e a quantidade da linha.");
    return;
  }
  state.linhas.push({
    id: uid(),
    descricao,
    tipo: document.getElementById("l-tipo").value,
    qtd,
    unidade: document.getElementById("l-unidade").value,
    custoUnit: document.getElementById("l-custo").value,
  });
  document.getElementById("l-descricao").value = "";
  document.getElementById("l-qtd").value = "";
  document.getElementById("l-custo").value = "";
  document.getElementById("l-catalogo").value = "";
  atualizar();
}

function adicionarLinhaMO(tipo, horaCusto, rendimento) {
  const area = num(document.getElementById("moArea").value);
  if (!(area > 0)) { mostrarAviso("Indica a área (m²) para calcular a mão de obra."); return; }
  const horas = area / rendimento;
  state.linhas.push({
    id: uid(),
    descricao: tipo === "MO Fabricação" ? "Mão de obra — fabricação" : "Mão de obra — montagem",
    tipo, qtd: horas.toFixed(2), unidade: "h", custoUnit: horaCusto,
  });
  atualizar();
}

function aplicarPrecoEmMassa() {
  const unidade = document.getElementById("bulkUnidade").value;
  const preco = document.getElementById("bulkPreco").value;
  if (!(num(preco) > 0)) { mostrarAviso("Indica um preço válido para aplicar."); return; }
  let aplicadas = 0;
  state.linhas.forEach((l) => {
    if (l.unidade === unidade && !(num(l.custoUnit) > 0)) { l.custoUnit = preco; aplicadas++; }
  });
  if (aplicadas === 0) { mostrarAviso(`Não há linhas em "${unidade}" sem preço para atualizar.`); return; }
  mostrarFeedback(`Preço aplicado a ${aplicadas} linha(s)`);
  atualizar();
}

// ---------- Importação de Excel (mapa de quantidades) ----------

let importState = null; // { workbook, sheetName, linhas, headerIdx, lastIdx, colDesc, colQtd, colUnid }

const PADROES_DESC = [/descri/, /artigo/, /designa/, /^item$/];
const PADROES_QTD = [/qtd/, /quant/];
const PADROES_UNID = [/unid/, /^un\.?$/];

function pontuarLinhaCabecalho(linha) {
  let pontos = 0;
  linha.forEach((v) => {
    const s = (v || "").toString().toLowerCase().trim();
    if (!s) return;
    if (PADROES_DESC.some((p) => p.test(s))) pontos += 2;
    if (PADROES_QTD.some((p) => p.test(s))) pontos += 2;
    if (PADROES_UNID.some((p) => p.test(s))) pontos += 2;
    if (/preç|custo|valor/.test(s)) pontos += 1;
  });
  return pontos;
}

function detectarCabecalho(linhas) {
  let melhorIdx = 0, melhorPontos = -1;
  const limite = Math.min(linhas.length, 60);
  for (let i = 0; i < limite; i++) {
    const p = pontuarLinhaCabecalho(linhas[i]);
    if (p > melhorPontos) { melhorPontos = p; melhorIdx = i; }
  }
  return melhorIdx;
}

// deteta a última linha "de dados": segue enquanto encontra descrição + quantidade válida;
// para depois de 3 linhas seguidas que pareçam nota/subtotal/rodapé (sem quantidade válida)
function detectarFimDados(linhas, headerIdx, colDesc, colQtd) {
  let vazias = 0;
  let ultimaValida = headerIdx;
  for (let i = headerIdx + 1; i < linhas.length; i++) {
    const desc = (linhas[i][colDesc] || "").toString().trim();
    const qtdVal = colQtd >= 0 ? num(linhas[i][colQtd]) : 1;
    const valido = desc && qtdVal > 0;
    if (valido) { ultimaValida = i; vazias = 0; }
    else { vazias++; if (vazias >= 3) break; }
  }
  return ultimaValida;
}

function detectarColuna(cabecalho, padroes) {
  for (const p of padroes) {
    for (let i = 0; i < cabecalho.length; i++) {
      const v = (cabecalho[i] || "").toString().toLowerCase().trim();
      if (p.test(v)) return i;
    }
  }
  return -1;
}

function importarExcel(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const workbook = XLSX.read(e.target.result, { type: "array" });
      if (!workbook.SheetNames.length) { mostrarImportStatus("Ficheiro vazio ou ilegível."); return; }
      importState = { workbook, sheetName: workbook.SheetNames[0] };
      carregarFolhaImportacao();
      preencherSelectSheet();
      mostrarImportStatus("");
      document.getElementById("importMapWrap").hidden = false;
    } catch (err) {
      mostrarImportStatus("Não foi possível ler este ficheiro.");
    }
  };
  reader.readAsArrayBuffer(file);
}

function carregarFolhaImportacao() {
  const ws = importState.workbook.Sheets[importState.sheetName];
  const linhas = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  const headerIdx = detectarCabecalho(linhas);
  const cabecalho = linhas[headerIdx] || [];
  let colDesc = detectarColuna(cabecalho, PADROES_DESC);
  let colQtd = detectarColuna(cabecalho, PADROES_QTD);
  let colUnid = detectarColuna(cabecalho, PADROES_UNID);
  if (colDesc === -1) colDesc = cabecalho.length > 1 ? 1 : 0;
  if (colQtd === -1) colQtd = Math.min(colDesc + 1, cabecalho.length - 1);
  const lastIdx = detectarFimDados(linhas, headerIdx, colDesc, colQtd);

  importState.linhas = linhas;
  importState.headerIdx = headerIdx;
  importState.lastIdx = lastIdx;
  importState.colDesc = colDesc;
  importState.colQtd = colQtd;
  importState.colUnid = colUnid;
  preencherSelectsMapeamento();
}

function preencherSelectSheet() {
  const sel = document.getElementById("mapSheet");
  sel.innerHTML = importState.workbook.SheetNames.map((n) =>
    `<option value="${n}" ${n === importState.sheetName ? "selected" : ""}>${n}</option>`
  ).join("");
}

function larguraMaxima() {
  return importState.linhas.reduce((max, l) => Math.max(max, l.length), 1);
}

function lerMapeamentoAtual() {
  return {
    headerIdx: parseInt(document.getElementById("mapHeaderRow").value, 10),
    lastIdx: parseInt(document.getElementById("mapLastRow").value, 10),
    colDesc: parseInt(document.getElementById("mapColDesc").value, 10),
    colQtd: parseInt(document.getElementById("mapColQtd").value, 10),
    colUnid: parseInt(document.getElementById("mapColUnid").value, 10),
  };
}

// reconstrói a lista de linhas candidatas (dentro do intervalo cabeçalho→fim, com descrição não vazia)
// e reinicia a seleção para "todas marcadas"
function atualizarPreviewImportacao() {
  const { headerIdx, lastIdx, colDesc, colQtd, colUnid } = lerMapeamentoAtual();
  importState.mapeamento = { colDesc, colQtd, colUnid };
  importState.candidatas = [];
  for (let i = headerIdx + 1; i <= lastIdx && i < importState.linhas.length; i++) {
    const desc = (importState.linhas[i][colDesc] || "").toString().trim();
    if (desc) importState.candidatas.push(i);
  }
  importState.selecionadas = new Set(importState.candidatas);
  document.getElementById("mapFiltro").value = "";
  renderChecklistImportacao();
}

function renderChecklistImportacao() {
  const { colDesc, colQtd, colUnid } = importState.mapeamento;
  const filtro = (document.getElementById("mapFiltro").value || "").toLowerCase().trim();
  const box = document.getElementById("importPreview");

  const linhasHtml = importState.candidatas.map((i) => {
    const row = importState.linhas[i];
    const desc = (row[colDesc] || "").toString();
    const qtd = colQtd >= 0 ? (row[colQtd] ?? "") : "";
    const unid = colUnid >= 0 ? (row[colUnid] ?? "") : "";
    const marcada = importState.selecionadas.has(i);
    const oculta = filtro && !desc.toLowerCase().includes(filtro);
    return `<tr data-idx="${i}" class="${marcada ? "" : "linha-excluida"} ${oculta ? "linha-oculta" : ""}">
      <td class="col-check"><input type="checkbox" data-row="${i}" ${marcada ? "checked" : ""} /></td>
      <td>${desc.slice(0, 60)}</td><td>${qtd}</td><td>${unid}</td>
    </tr>`;
  }).join("");

  box.innerHTML = `
    <div class="import-checklist">
      <table>
        <thead><tr><th></th><th>Descrição</th><th>Qtd</th><th>Unid</th></tr></thead>
        <tbody>${linhasHtml || `<tr><td colspan="4" style="text-align:center;color:#8A7F6E;padding:14px">Nenhuma linha encontrada neste intervalo.</td></tr>`}</tbody>
      </table>
    </div>`;

  box.querySelectorAll("input[type=checkbox]").forEach((cb) => {
    cb.addEventListener("change", (e) => {
      const idx = parseInt(e.target.dataset.row, 10);
      if (e.target.checked) importState.selecionadas.add(idx);
      else importState.selecionadas.delete(idx);
      e.target.closest("tr").classList.toggle("linha-excluida", !e.target.checked);
      atualizarContagemImportacao();
    });
  });

  atualizarContagemImportacao();
}

function atualizarContagemImportacao() {
  document.getElementById("importContagem").innerHTML =
    `<b>${importState.selecionadas.size}</b> de ${importState.candidatas.length} linha(s) selecionada(s) para importar.`;
}

function marcarDesmarcarVisiveis(marcar) {
  const box = document.getElementById("importPreview");
  box.querySelectorAll("tr[data-idx]:not(.linha-oculta)").forEach((tr) => {
    const idx = parseInt(tr.dataset.idx, 10);
    const cb = tr.querySelector("input[type=checkbox]");
    if (marcar) { importState.selecionadas.add(idx); cb.checked = true; }
    else { importState.selecionadas.delete(idx); cb.checked = false; }
    tr.classList.toggle("linha-excluida", !marcar);
  });
  atualizarContagemImportacao();
}

function preencherSelectsMapeamento() {
  const total = importState.linhas.length;
  const numLinhasMostrar = Math.min(total, 60);
  const selHeader = document.getElementById("mapHeaderRow");
  selHeader.innerHTML = importState.linhas.slice(0, numLinhasMostrar).map((l, i) => {
    const amostra = l.filter((v) => v !== "").slice(0, 3).join(" | ");
    return `<option value="${i}" ${i === importState.headerIdx ? "selected" : ""}>Linha ${i + 1}: ${amostra.slice(0, 40) || "(vazia)"}</option>`;
  }).join("");

  const selLast = document.getElementById("mapLastRow");
  selLast.innerHTML = importState.linhas.map((l, i) => {
    const amostra = l.filter((v) => v !== "").slice(0, 3).join(" | ");
    return `<option value="${i}" ${i === importState.lastIdx ? "selected" : ""}>Linha ${i + 1}: ${amostra.slice(0, 40) || "(vazia)"}</option>`;
  }).join("");

  const numCols = larguraMaxima();
  const opcoesColuna = (selecionada, permiteVazio) => {
    let html = permiteVazio ? `<option value="-1">— nenhuma —</option>` : "";
    const cab = importState.linhas[importState.headerIdx] || [];
    for (let c = 0; c < numCols; c++) {
      const rotulo = (cab[c] || "").toString().trim();
      html += `<option value="${c}" ${c === selecionada ? "selected" : ""}>${colLetter(c + 1)}${rotulo ? " — " + rotulo.slice(0, 24) : ""}</option>`;
    }
    return html;
  };
  document.getElementById("mapColDesc").innerHTML = opcoesColuna(importState.colDesc, false);
  document.getElementById("mapColQtd").innerHTML = opcoesColuna(importState.colQtd, false);
  document.getElementById("mapColUnid").innerHTML = opcoesColuna(importState.colUnid, true);

  atualizarPreviewImportacao();
}

function confirmarImportacao() {
  const { colDesc, colQtd, colUnid } = importState.mapeamento;
  let importadas = 0;
  importState.candidatas.forEach((i) => {
    if (!importState.selecionadas.has(i)) return;
    const row = importState.linhas[i];
    const descricao = (row[colDesc] || "").toString().trim();
    const qtd = colQtd >= 0 ? num(row[colQtd]) : 1;
    const unidade = colUnid >= 0 ? (row[colUnid] || "un").toString().trim() : "un";
    state.linhas.push({
      id: uid(), descricao, tipo: "Material",
      qtd: qtd > 0 ? qtd : 1,
      unidade: UNIDADES.includes(unidade) ? unidade : "un",
      custoUnit: "",
    });
    importadas++;
  });
  atualizar();
  document.getElementById("importMapWrap").hidden = true;
  document.getElementById("fileExcel").value = "";
  importState = null;
  mostrarImportStatus(importadas ? `✓ ${importadas} linha(s) importada(s) — falta preencher os preços.` : "Nenhuma linha selecionada.");
}

function cancelarImportacao() {
  document.getElementById("importMapWrap").hidden = true;
  document.getElementById("fileExcel").value = "";
  importState = null;
  mostrarImportStatus("");
}


// ---------- Guardar / abrir / novo ----------

async function guardarOrcamento() {
  if (!state.referencia.trim()) { mostrarAviso("Indica uma referência antes de guardar."); return; }
  if (!temLigacao()) { mostrarAviso("Cola primeiro o link da Google Sheet no campo do topo."); return; }
  try {
    await apiChamar("save", { data: { ...state, referencia: state.referencia.trim(), guardadoEm: hoje() } });
    await renderGuardados();
    mostrarFeedback(`Guardado na Sheet: ${state.referencia}`);
  } catch (e) {
    mostrarAviso("Falha ao guardar na Google Sheet. Confirma o link da ligação.");
  }
}

async function abrirOrcamento(referencia) {
  try {
    const data = await apiChamar("get", { ref: referencia });
    if (data) {
      state = {
        referencia: data.referencia || "", cliente: data.cliente || "",
        validadeDias: data.validadeDias || "8", autoliquidacao: !!data.autoliquidacao,
        margemId: data.margemId || "residencial", descricaoGeral: data.descricaoGeral || "",
        linhas: Array.isArray(data.linhas) ? data.linhas : [],
      };
      renderGeral();
      atualizar();
    }
  } catch (e) {
    mostrarAviso("Não foi possível abrir este orçamento.");
  }
}

function novoOrcamento() {
  state = { referencia: "CARP-ORÇ-2026-", cliente: "", validadeDias: "8", autoliquidacao: false, margemId: "residencial", descricaoGeral: "", linhas: [] };
  renderGeral();
  atualizar();
}

async function copiarTexto(texto, etiqueta) {
  try { await navigator.clipboard.writeText(texto); mostrarFeedback(`Copiado: ${etiqueta}`); }
  catch (e) { mostrarAviso("Não foi possível copiar automaticamente — seleciona e copia manualmente."); }
}

// ---------- Exportações ----------

// ---------- Identidade visual Carpinova (Excel + PDF) ----------

const COR_NAVY = "1F3864";
const COR_AZUL = "2E5395";
const COR_DESTAQUE = "D9E1F2";
const COR_CINZA_TXT = "666666";

function colLetter(n) {
  let s = "";
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}
function cellAddr(row, col) { return colLetter(col) + row; }

function setCell(ws, addr, value, opts = {}) {
  const cell = ws.getCell(addr);
  cell.value = value;
  cell.font = { name: "Arial", size: opts.size || 10, bold: !!opts.bold, color: { argb: "FF" + (opts.color || "000000") } };
  if (opts.fill) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + opts.fill } };
  if (opts.align) cell.alignment = { horizontal: opts.align, vertical: "middle" };
  if (opts.money) cell.numFmt = '#,##0.00 "€"';
}

async function exportarExcel() {
  const t = calcularTotais();
  const desc = state.descricaoGeral || `Fornecimento e montagem de carpintaria — ${state.cliente || ""}`;
  const wb = new ExcelJS.Workbook();

  // ---- Folha CUSTO INTERNO ----
  const wsF = wb.addWorksheet("CUSTO INTERNO");
  wsF.mergeCells("A1:G1");
  setCell(wsF, "A1", `FICHA DE CUSTO INTERNO — ${state.referencia} — ${hoje()}`, { fill: COR_NAVY, color: "FFFFFF", bold: true, size: 13, align: "center" });
  setCell(wsF, "A3", "Cliente", { bold: true });
  setCell(wsF, "B3", state.cliente || "");
  setCell(wsF, "A4", "Âmbito", { bold: true });
  setCell(wsF, "B4", state.descricaoGeral || "");
  wsF.mergeCells("A6:G6");
  setCell(wsF, "A6", "LINHAS DE CUSTO", { fill: COR_AZUL, color: "FFFFFF", bold: true });

  const headerRow = 7;
  ["ARTIGO", "DESCRIÇÃO", "TIPO", "QTD", "UNID", "CUSTO UNIT.", "TOTAL"].forEach((h, i) => {
    setCell(wsF, cellAddr(headerRow, i + 1), h, { fill: COR_DESTAQUE, color: COR_NAVY, bold: true });
  });

  let r = headerRow + 1;
  t.linhas.forEach((l, i) => {
    setCell(wsF, cellAddr(r, 1), i + 1);
    setCell(wsF, cellAddr(r, 2), l.descricao);
    setCell(wsF, cellAddr(r, 3), l.tipo);
    setCell(wsF, cellAddr(r, 4), num(l.qtd));
    setCell(wsF, cellAddr(r, 5), l.unidade);
    setCell(wsF, cellAddr(r, 6), num(l.custoUnit), { money: true });
    setCell(wsF, cellAddr(r, 7), l.total, { money: true });
    r++;
  });
  r++;

  const subtotalRows = [["SUBTOTAL MATERIAL", t.subtotalMaterial], ["DESPERDÍCIO 10%", t.desperdicio]];
  if (t.subtotalFerragens) subtotalRows.push(["FERRAGENS", t.subtotalFerragens]);
  if (t.subtotalAcabamento) subtotalRows.push(["ACABAMENTO", t.subtotalAcabamento]);
  subtotalRows.push(["MO FABRICAÇÃO", t.moFabricacao]);
  subtotalRows.push(["MO MONTAGEM", t.moMontagem]);
  if (t.subtotalOutro) subtotalRows.push(["OUTROS", t.subtotalOutro]);
  subtotalRows.forEach(([label, val]) => {
    setCell(wsF, cellAddr(r, 6), label, { fill: COR_DESTAQUE, bold: true });
    setCell(wsF, cellAddr(r, 7), val, { fill: COR_DESTAQUE, bold: true, money: true });
    r++;
  });
  r++;
  wsF.mergeCells(`A${r}:G${r}`);
  setCell(wsF, cellAddr(r, 1), "RESUMO", { fill: COR_AZUL, color: "FFFFFF", bold: true });
  r++;
  setCell(wsF, cellAddr(r, 6), "CUSTO TOTAL PRODUÇÃO", { fill: COR_DESTAQUE, bold: true });
  setCell(wsF, cellAddr(r, 7), t.custoTotalProducao, { fill: COR_DESTAQUE, bold: true, money: true });
  r++;
  setCell(wsF, cellAddr(r, 6), "MARGEM APLICADA", { bold: true });
  setCell(wsF, cellAddr(r, 7), `${(t.margem.valor * 100).toFixed(0)}%`, { bold: true });
  r++;
  setCell(wsF, cellAddr(r, 6), "PVP ex-IVA", { fill: COR_NAVY, color: "FFFFFF", bold: true, size: 11 });
  setCell(wsF, cellAddr(r, 7), t.pvpExIva, { fill: COR_NAVY, color: "FFFFFF", bold: true, size: 11, money: true });

  wsF.getColumn(1).width = 6; wsF.getColumn(2).width = 30; wsF.getColumn(3).width = 16;
  wsF.getColumn(4).width = 8; wsF.getColumn(5).width = 7; wsF.getColumn(6).width = 22; wsF.getColumn(7).width = 14;

  // ---- Folha PROPOSTA CLIENTE ----
  const wsP = wb.addWorksheet("PROPOSTA CLIENTE");
  wsP.mergeCells("A1:C1");
  setCell(wsP, "A1", `PROPOSTA COMERCIAL — ${state.referencia}`, { fill: COR_NAVY, color: "FFFFFF", bold: true, size: 13, align: "center" });
  setCell(wsP, "A3", "Cliente", { bold: true }); setCell(wsP, "B3", state.cliente || "");
  setCell(wsP, "A4", "Data", { bold: true }); setCell(wsP, "B4", hoje());
  setCell(wsP, "A5", "Validade", { bold: true }); setCell(wsP, "B5", `${state.validadeDias || "8"} dias`);
  wsP.mergeCells("A7:C7");
  setCell(wsP, "A7", "ÂMBITO E VALOR", { fill: COR_AZUL, color: "FFFFFF", bold: true });
  ["ARTIGO", "DESCRIÇÃO", "VALOR ex-IVA"].forEach((h, i) => setCell(wsP, cellAddr(8, i + 1), h, { fill: COR_DESTAQUE, color: COR_NAVY, bold: true }));
  setCell(wsP, "A9", "01"); setCell(wsP, "B9", desc); setCell(wsP, "C9", t.pvpExIva, { money: true });

  setCell(wsP, "B11", "TOTAL ex-IVA", { fill: COR_DESTAQUE, bold: true });
  setCell(wsP, "C11", t.pvpExIva, { fill: COR_DESTAQUE, bold: true, money: true });
  setCell(wsP, "B12", state.autoliquidacao ? "IVA – Autoliquidação Art.º 2.º n.º 1 al. j) CIVA" : "IVA 23%");
  setCell(wsP, "C12", state.autoliquidacao ? 0 : t.ivaValor, { money: true });
  setCell(wsP, "B13", "TOTAL c/IVA", { fill: COR_NAVY, color: "FFFFFF", bold: true, size: 11 });
  setCell(wsP, "C13", state.autoliquidacao ? t.pvpExIva : t.totalComIva, { fill: COR_NAVY, color: "FFFFFF", bold: true, size: 11, money: true });

  setCell(wsP, "A15", "Condições de pagamento", { bold: true });
  setCell(wsP, "B15", "40% adjudicação / 40% início / 20% conclusão");

  wsP.mergeCells("A17:C17");
  setCell(wsP, "A17", "CARPINOVA — Pátio Exímio, Lda", { fill: COR_AZUL, color: "FFFFFF", bold: true });
  setCell(wsP, "A18", "NIF 518 637 026 | Lugar de Regadias 1, 4705-671 Tadim, Braga", { color: COR_CINZA_TXT, size: 9 });
  setCell(wsP, "A19", "mariocarvalho@carpinova.pt | +351 911 573 616 | www.carpinova.pt", { color: COR_CINZA_TXT, size: 9 });

  wsP.getColumn(1).width = 22; wsP.getColumn(2).width = 46; wsP.getColumn(3).width = 14;

  try {
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${state.referencia || "orcamento"}.xlsx`; a.click();
    URL.revokeObjectURL(url);
    mostrarFeedback("Excel exportado");
  } catch (e) {
    mostrarAviso("Não foi possível gerar o Excel.");
  }
}

// ---------- HTML estilizado (para o PDF) ----------

function linhaHtmlTabela(cols) {
  return `<tr>${cols.map((c) => `<td>${c}</td>`).join("")}</tr>`;
}

function gerarFichaHtml() {
  const t = calcularTotais();
  const linhasHtml = t.linhas.map((l, i) => linhaHtmlTabela([i + 1, l.descricao, l.tipo, num(l.qtd).toFixed(2), l.unidade, eur(num(l.custoUnit)), eur(l.total)])).join("");
  const extra = [];
  if (t.subtotalFerragens) extra.push(["FERRAGENS", t.subtotalFerragens]);
  if (t.subtotalAcabamento) extra.push(["ACABAMENTO", t.subtotalAcabamento]);
  if (t.subtotalOutro) extra.push(["OUTROS", t.subtotalOutro]);
  return `
    <div class="doc-title">FICHA DE CUSTO INTERNO — ${state.referencia} — ${hoje()}</div>
    <table class="doc-info"><tr><th>Cliente</th><td>${state.cliente || ""}</td></tr><tr><th>Âmbito</th><td>${state.descricaoGeral || ""}</td></tr></table>
    <div class="doc-section">LINHAS DE CUSTO</div>
    <table class="doc-table">
      <thead><tr><th>Artigo</th><th>Descrição</th><th>Tipo</th><th>Qtd</th><th>Unid</th><th>Custo Unit.</th><th>Total</th></tr></thead>
      <tbody>${linhasHtml}</tbody>
    </table>
    <table class="doc-table doc-resumo">
      <tr class="destaque"><td colspan="6">SUBTOTAL MATERIAL</td><td>${eur(t.subtotalMaterial)}</td></tr>
      <tr class="destaque"><td colspan="6">DESPERDÍCIO 10%</td><td>${eur(t.desperdicio)}</td></tr>
      ${extra.map(([label, val]) => `<tr class="destaque"><td colspan="6">${label}</td><td>${eur(val)}</td></tr>`).join("")}
      <tr class="destaque"><td colspan="6">MÃO DE OBRA FABRICAÇÃO</td><td>${eur(t.moFabricacao)}</td></tr>
      <tr class="destaque"><td colspan="6">MÃO DE OBRA MONTAGEM</td><td>${eur(t.moMontagem)}</td></tr>
    </table>
    <div class="doc-section">RESUMO</div>
    <table class="doc-table doc-resumo">
      <tr class="destaque"><td colspan="6">CUSTO TOTAL PRODUÇÃO</td><td>${eur(t.custoTotalProducao)}</td></tr>
      <tr><td colspan="6">MARGEM APLICADA</td><td>${(t.margem.valor * 100).toFixed(0)}%</td></tr>
      <tr class="total-final"><td colspan="6">PVP ex-IVA</td><td>${eur(t.pvpExIva)}</td></tr>
    </table>`;
}

function gerarPropostaHtml() {
  const t = calcularTotais();
  const desc = state.descricaoGeral || `Fornecimento e montagem de carpintaria — ${state.cliente || ""}`;
  return `
    <div class="doc-title">PROPOSTA COMERCIAL — ${state.referencia}</div>
    <table class="doc-info">
      <tr><th>Cliente</th><td>${state.cliente || ""}</td></tr>
      <tr><th>Data</th><td>${hoje()}</td></tr>
      <tr><th>Validade</th><td>${state.validadeDias || "8"} dias</td></tr>
    </table>
    <div class="doc-section">ÂMBITO E VALOR</div>
    <table class="doc-table">
      <thead><tr><th>Artigo</th><th>Descrição</th><th>Valor ex-IVA</th></tr></thead>
      <tbody><tr><td>01</td><td>${desc}</td><td>${eur(t.pvpExIva)}</td></tr></tbody>
    </table>
    <table class="doc-table doc-resumo">
      <tr class="destaque"><td colspan="2">TOTAL ex-IVA</td><td>${eur(t.pvpExIva)}</td></tr>
      <tr><td colspan="2">${state.autoliquidacao ? "IVA – Autoliquidação Art.º 2.º n.º 1 al. j) CIVA" : "IVA 23%"}</td><td>${state.autoliquidacao ? "—" : eur(t.ivaValor)}</td></tr>
      <tr class="total-final"><td colspan="2">TOTAL c/IVA</td><td>${eur(state.autoliquidacao ? t.pvpExIva : t.totalComIva)}</td></tr>
    </table>
    <p class="doc-cond"><b>Condições de pagamento:</b> 40% adjudicação / 40% início / 20% conclusão</p>
    <div class="doc-footer">
      <div class="doc-footer-bar">CARPINOVA — Pátio Exímio, Lda</div>
      <div class="doc-footer-txt">NIF 518 637 026 | Lugar de Regadias 1, 4705-671 Tadim, Braga</div>
      <div class="doc-footer-txt">mariocarvalho@carpinova.pt | +351 911 573 616 | www.carpinova.pt</div>
    </div>`;
}

function exportarPdf() {
  document.getElementById("printArea").innerHTML = gerarFichaHtml() + '<div class="doc-pagebreak"></div>' + gerarPropostaHtml();
  window.print();
}


// ---------- Backup ----------

async function exportarBackup() {
  if (!temLigacao()) { mostrarAviso("Sem ligação à Google Sheet — nada para exportar ainda."); return; }
  try {
    const itens = await apiChamar("list");
    const dados = [];
    for (const it of itens) { const d = await apiChamar("get", { ref: it.referencia }); if (d) dados.push(d); }
    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `carpinova-orcamentos-backup-${hoje().replace(/\//g, "-")}.json`; a.click();
    URL.revokeObjectURL(url);
    mostrarFeedback("Backup exportado");
  } catch (e) { mostrarAviso("Falha ao exportar backup da Sheet."); }
}

async function importarBackupJson(file) {
  if (!temLigacao()) { mostrarAviso("Cola primeiro o link da Google Sheet antes de importares um backup."); return; }
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const dados = JSON.parse(reader.result);
      const lista = Array.isArray(dados) ? dados : Object.values(dados);
      for (const item of lista) await apiChamar("save", { data: item });
      await renderGuardados();
      mostrarFeedback("Backup importado para a Sheet");
    } catch (e) { mostrarAviso("Ficheiro de backup inválido."); }
  };
  reader.readAsText(file);
}

// ---------- Eventos ----------

function ligarEventos() {
  document.getElementById("btnGuardarLigacao").addEventListener("click", () => {
    const val = document.getElementById("apiUrl").value.trim();
    if (!val) { mostrarAviso("Cola o link do Apps Script primeiro."); return; }
    localStorage.setItem(LS_API_URL, val);
    atualizarEstadoLigacao();
    mostrarFeedback("Ligação guardada");
    renderGuardados();
  });

  document.getElementById("referencia").addEventListener("input", (e) => { state.referencia = e.target.value; guardarRascunhoAuto(); });
  document.getElementById("cliente").addEventListener("input", (e) => { state.cliente = e.target.value; guardarRascunhoAuto(); });
  document.getElementById("validade").addEventListener("input", (e) => { state.validadeDias = e.target.value.replace(/[^0-9]/g, ""); guardarRascunhoAuto(); });
  document.getElementById("autoliq").addEventListener("change", (e) => { state.autoliquidacao = e.target.checked; atualizar(); });
  document.getElementById("margemGeral").addEventListener("change", (e) => { state.margemId = e.target.value; atualizar(); });
  document.getElementById("descricaoGeral").addEventListener("input", (e) => { state.descricaoGeral = e.target.value; guardarRascunhoAuto(); });

  document.getElementById("fileExcel").addEventListener("change", (e) => { if (e.target.files[0]) importarExcel(e.target.files[0]); });
  document.getElementById("mapSheet").addEventListener("change", (e) => {
    importState.sheetName = e.target.value;
    carregarFolhaImportacao();
  });
  document.getElementById("mapHeaderRow").addEventListener("change", (e) => {
    importState.headerIdx = parseInt(e.target.value, 10);
    const cab = importState.linhas[importState.headerIdx] || [];
    importState.colDesc = detectarColuna(cab, PADROES_DESC);
    importState.colQtd = detectarColuna(cab, PADROES_QTD);
    importState.colUnid = detectarColuna(cab, PADROES_UNID);
    if (importState.colDesc === -1) importState.colDesc = cab.length > 1 ? 1 : 0;
    if (importState.colQtd === -1) importState.colQtd = Math.min(importState.colDesc + 1, cab.length - 1);
    importState.lastIdx = detectarFimDados(importState.linhas, importState.headerIdx, importState.colDesc, importState.colQtd);
    preencherSelectsMapeamento();
  });
  ["mapLastRow", "mapColDesc", "mapColQtd", "mapColUnid"].forEach((id) => {
    document.getElementById(id).addEventListener("change", atualizarPreviewImportacao);
  });
  document.getElementById("mapFiltro").addEventListener("input", renderChecklistImportacao);
  document.getElementById("btnMarcarVisiveis").addEventListener("click", () => marcarDesmarcarVisiveis(true));
  document.getElementById("btnDesmarcarVisiveis").addEventListener("click", () => marcarDesmarcarVisiveis(false));
  document.getElementById("btnConfirmarImport").addEventListener("click", confirmarImportacao);
  document.getElementById("btnCancelarImport").addEventListener("click", cancelarImportacao);
  document.getElementById("btnMoFabrico").addEventListener("click", () => adicionarLinhaMO("MO Fabricação", MO_FABRICO_HORA, REND_FABRICO));
  document.getElementById("btnMoMontagem").addEventListener("click", () => adicionarLinhaMO("MO Montagem", MO_MONTAGEM_HORA, REND_MONTAGEM));
  document.getElementById("btnAdicionarLinha").addEventListener("click", adicionarLinhaManual);
  document.getElementById("btnBulkAplicar").addEventListener("click", aplicarPrecoEmMassa);

  document.getElementById("btnNovo").addEventListener("click", novoOrcamento);
  document.getElementById("btnGuardar").addEventListener("click", guardarOrcamento);
  document.getElementById("btnCopiarFicha").addEventListener("click", () => copiarTexto(gerarFichaCusto(), "Ficha de Custo Interno"));
  document.getElementById("btnCopiarProposta").addEventListener("click", () => copiarTexto(gerarProposta(), "Proposta Comercial"));
  document.getElementById("btnExcel").addEventListener("click", exportarExcel);
  document.getElementById("btnPdf").addEventListener("click", exportarPdf);
  document.getElementById("btnBackupExport").addEventListener("click", exportarBackup);
  document.getElementById("btnBackupImport").addEventListener("change", (e) => { if (e.target.files[0]) importarBackupJson(e.target.files[0]); });
}

// ---------- Arranque ----------

function iniciar() {
  popularSelects();
  carregarRascunhoAuto();
  renderGeral();
  document.getElementById("apiUrl").value = getApiUrl();
  atualizarEstadoLigacao();
  ligarEventos();
  atualizar();
  renderGuardados();
}

document.addEventListener("DOMContentLoaded", iniciar);
