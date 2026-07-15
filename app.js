// ---------- Dados de referência (Carpinova, 2026) ----------

const PAINEIS = [
  { id: "agl-std-18", nome: "AGL STD EZ 18mm (Finsa/B&F)", preco: 5.09 },
  { id: "agl-hid-18", nome: "AGL HID EZ 18mm (Finsa/B&F)", preco: 7.14 },
  { id: "mdf-std-18", nome: "MDF STD EZ 18mm (Finsa/B&F)", preco: 7.50 },
  { id: "mdf-hid-18", nome: "MDF HID EZ 18mm (Finsa/B&F)", preco: 9.57 },
  { id: "mdf-hid-19", nome: "MDF HID EZ 19mm (Finsa/B&F)", preco: 10.10 },
  { id: "superpan-std-18", nome: "Superpan STD EZ 18mm (Finsa/B&F)", preco: 6.39 },
  { id: "duo-gr1-18", nome: "DUO Gr1 AGL STD 18mm decorativo (Finsa/B&F)", preco: 9.70 },
  { id: "duo-gr2-18", nome: "DUO Gr2 AGL STD 18mm decorativo (Finsa/B&F)", preco: 12.04 },
  { id: "innovus-mdf-std-18", nome: "MDF STD 18mm (Innovus)", preco: 8.87 },
  { id: "innovus-mdf-hid-19", nome: "MDF HID 19mm (Innovus)", preco: 12.17 },
  { id: "innovus-pb-hid-19", nome: "PB HID 19mm L166 promo (Innovus)", preco: 10.93 },
  { id: "bloma-13", nome: "Fenólico BLOMA 13mm (Covema)", preco: 53.02 },
  { id: "outro", nome: "Outro / preço manual", preco: 0 },
];

const ACABAMENTOS = [
  { id: "nenhum", nome: "Nenhum", preco: 0 },
  { id: "lac-interno", nome: "Lacado interno", preco: 20 },
  { id: "lac-serlaca-mate", nome: "Lacado Serlaca 2F mate", preco: 47 },
  { id: "lac-serlaca-brilho", nome: "Lacado Serlaca 2F alto brilho", preco: 58 },
  { id: "verniz-interno", nome: "Verniz interno mate natural", preco: 13 },
  { id: "ripado-lacado", nome: "Ripado lacado (Serlaca)", preco: 65 },
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
const CONSUMIVEIS = 0.04;
const IVA = 0.23;

const eur = (n) =>
  (Number.isFinite(n) ? n : 0).toLocaleString("pt-PT", { style: "currency", currency: "EUR" });

const hoje = () =>
  new Date().toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" });

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

// ---------- Estado ----------

let state = {
  referencia: "CARP-ORÇ-2026-",
  cliente: "",
  validadeDias: "8",
  autoliquidacao: false,
  artigos: [],
};

const LS_ATUAL = "carpinova-orcamento-atual";
const LS_API_URL = "carpinova-sheets-api-url";

function getApiUrl() {
  return localStorage.getItem(LS_API_URL) || "";
}

function temLigacao() {
  return !!getApiUrl();
}

function guardarRascunhoAuto() {
  try {
    localStorage.setItem(LS_ATUAL, JSON.stringify(state));
  } catch (e) { /* best-effort */ }
}

function carregarRascunhoAuto() {
  try {
    const raw = localStorage.getItem(LS_ATUAL);
    if (raw) {
      const data = JSON.parse(raw);
      state = { ...state, ...data };
    }
  } catch (e) { /* sem rascunho anterior — normal na primeira utilização */ }
}

// ---------- Cálculo ----------

function calcularArtigo(a) {
  const area = parseFloat((a.areaM2 || "0").toString().replace(",", ".")) || 0;
  const qtd = parseFloat((a.quantidade || "1").toString().replace(",", ".")) || 0;
  const ferragens = parseFloat((a.ferragens || "0").toString().replace(",", ".")) || 0;
  const areaTotal = area * qtd;

  const painel = PAINEIS.find((p) => p.id === a.painelId) || PAINEIS[0];
  const precoPainel = a.painelId === "outro"
    ? (parseFloat((a.precoManual || "0").toString().replace(",", ".")) || 0)
    : painel.preco;
  const acabamento = ACABAMENTOS.find((f) => f.id === a.acabamentoId) || ACABAMENTOS[0];
  const margem = MARGENS.find((m) => m.id === a.margemId) || MARGENS[0];

  const areaCompra = areaTotal * (1 + DESPERDICIO);
  const custoMaterial = areaCompra * precoPainel;
  const custoConsumiveis = custoMaterial * CONSUMIVEIS;
  const custoAcabamento = areaTotal * acabamento.preco;

  const horasFabrico = areaTotal / REND_FABRICO;
  const custoFabrico = horasFabrico * MO_FABRICO_HORA;
  const horasMontagem = areaTotal / REND_MONTAGEM;
  const custoMontagem = horasMontagem * MO_MONTAGEM_HORA;

  const custoTotal = custoMaterial + custoConsumiveis + ferragens + custoAcabamento + custoFabrico + custoMontagem;
  const pvpExIva = margem.valor < 1 ? custoTotal / (1 - margem.valor) : custoTotal;

  return {
    areaTotal, precoPainel, custoMaterial, custoConsumiveis, custoAcabamento,
    horasFabrico, custoFabrico, horasMontagem, custoMontagem, custoTotal, margem, pvpExIva,
    painelNome: a.painelId === "outro" ? (a.descricao || "Painel (preço manual)") : painel.nome,
    acabamentoNome: acabamento.nome,
  };
}

function calcularTotais() {
  const linhas = state.artigos.map((a) => ({ a, c: calcularArtigo(a) }));
  const custoTotal = linhas.reduce((s, l) => s + l.c.custoTotal, 0);
  const pvpExIva = linhas.reduce((s, l) => s + l.c.pvpExIva, 0);
  const ivaValor = state.autoliquidacao ? 0 : pvpExIva * IVA;
  const totalComIva = pvpExIva + ivaValor;
  return { linhas, custoTotal, pvpExIva, ivaValor, totalComIva };
}

// ---------- Geração de texto (Ficha / Proposta) ----------

function gerarFichaCusto() {
  const { linhas, custoTotal, pvpExIva } = calcularTotais();
  const sep = "─".repeat(60), dsep = "═".repeat(60);
  let out = `FICHA DE CUSTO INTERNO — ${state.referencia} — ${state.cliente || "[cliente]"} — ${hoje()}\n${dsep}\n`;
  linhas.forEach(({ a, c }, i) => {
    out += `${i + 1}. ${a.descricao || "(sem descrição)"}  [${c.areaTotal.toFixed(2)} m² | ${c.margem.nome} ${(c.margem.valor * 100).toFixed(0)}%]\n`;
    out += `   Painel: ${c.painelNome} (${eur(c.precoPainel)}/m²)\n`;
    if (c.acabamentoNome !== "Nenhum") out += `   Acabamento: ${c.acabamentoNome}\n`;
    out += `   Material (c/ desperdício 10%)      ${eur(c.custoMaterial).padStart(12)}\n`;
    out += `   Consumíveis (4%)                    ${eur(c.custoConsumiveis).padStart(12)}\n`;
    if (c.custoAcabamento > 0) out += `   Acabamento                          ${eur(c.custoAcabamento).padStart(12)}\n`;
    const ferragens = parseFloat((a.ferragens || "0").toString().replace(",", ".")) || 0;
    if (ferragens > 0) out += `   Ferragens                           ${eur(ferragens).padStart(12)}\n`;
    out += `   MO Fabricação (${c.horasFabrico.toFixed(2)}h × ${MO_FABRICO_HORA}€)     ${eur(c.custoFabrico).padStart(12)}\n`;
    out += `   MO Montagem (${c.horasMontagem.toFixed(2)}h × ${MO_MONTAGEM_HORA}€)      ${eur(c.custoMontagem).padStart(12)}\n`;
    out += `   ${sep}\n`;
    out += `   CUSTO TOTAL PRODUÇÃO                ${eur(c.custoTotal).padStart(12)}\n`;
    out += `   PVP ex-IVA                          ${eur(c.pvpExIva).padStart(12)}\n${sep}\n`;
  });
  out += `${dsep}\nCUSTO TOTAL (todos os artigos)         ${eur(custoTotal).padStart(12)}\nPVP ex-IVA (todos os artigos)          ${eur(pvpExIva).padStart(12)}\n${dsep}\n`;
  return out;
}

function gerarProposta() {
  const { linhas, pvpExIva, ivaValor, totalComIva } = calcularTotais();
  const sep = "─".repeat(60), dsep = "═".repeat(60);
  let out = `PROPOSTA COMERCIAL — ${state.referencia} — ${hoje()}\nCliente: ${state.cliente || "[cliente]"}\nValidade: ${state.validadeDias || "8"} dias\n${dsep}\n`;
  out += `ARTIGO | DESCRIÇÃO                          | VALOR ex-IVA\n${sep}\n`;
  linhas.forEach(({ a, c }, i) => {
    const desc = (a.descricao || "(sem descrição)").padEnd(36).slice(0, 36);
    out += `${String(i + 1).padStart(2, "0")}     | ${desc} | ${eur(c.pvpExIva).padStart(10)}\n`;
  });
  out += `${sep}\nTOTAL ex-IVA                                    ${eur(pvpExIva).padStart(10)}\n`;
  if (state.autoliquidacao) {
    out += `IVA – Autoliquidação Art.º 2.º n.º 1 al. j) CIVA\nTOTAL                                           ${eur(pvpExIva).padStart(10)}\n`;
  } else {
    out += `IVA 23%                                         ${eur(ivaValor).padStart(10)}\nTOTAL c/IVA                                     ${eur(totalComIva).padStart(10)}\n`;
  }
  out += `${dsep}\nCondições: 40% adjudicação / 40% início / 20% conclusão\n`;
  return out;
}

// ---------- Render ----------

function popularSelects() {
  const selPainel = document.getElementById("f-painel");
  selPainel.innerHTML = PAINEIS.map((p) => `<option value="${p.id}">${p.nome}${p.preco ? ` — ${eur(p.preco)}/m²` : ""}</option>`).join("");

  const selAcabamento = document.getElementById("f-acabamento");
  selAcabamento.innerHTML = ACABAMENTOS.map((f) => `<option value="${f.id}">${f.nome}${f.preco ? ` — ${eur(f.preco)}/m²` : ""}</option>`).join("");

  const selMargem = document.getElementById("f-margem");
  selMargem.innerHTML = MARGENS.map((m) => `<option value="${m.id}">${m.nome} — ${(m.valor * 100).toFixed(0)}%</option>`).join("");

  selPainel.addEventListener("change", () => {
    document.getElementById("f-preco-manual-wrap").hidden = selPainel.value !== "outro";
  });
}

function renderGeral() {
  document.getElementById("referencia").value = state.referencia;
  document.getElementById("cliente").value = state.cliente;
  document.getElementById("validade").value = state.validadeDias;
  document.getElementById("autoliq").checked = state.autoliquidacao;
}

function renderLista() {
  const { linhas, custoTotal, pvpExIva, ivaValor, totalComIva } = calcularTotais();
  const lista = document.getElementById("listaArtigos");
  const vazio = document.getElementById("listaVazia");
  const totaisBox = document.getElementById("totaisBox");

  vazio.hidden = linhas.length !== 0;
  lista.innerHTML = "";

  linhas.forEach(({ a, c }, i) => {
    const div = document.createElement("div");
    div.className = "card artigo";
    div.innerHTML = `
      <div class="artigo-head">
        <div>
          <div class="artigo-idx">${String(i + 1).padStart(2, "0")}</div>
          <div class="artigo-titulo">${a.descricao || "(sem descrição)"}</div>
          <div class="artigo-meta">${c.areaTotal.toFixed(2)} m² · ${c.painelNome}${c.acabamentoNome !== "Nenhum" ? ` · ${c.acabamentoNome}` : ""} · ${c.margem.nome} (${(c.margem.valor * 100).toFixed(0)}%)</div>
        </div>
        <button class="artigo-remove" data-id="${a.id}" title="Remover">✕</button>
      </div>
      <div class="artigo-nums">
        <div>Material<b>${eur(c.custoMaterial)}</b></div>
        <div>MO fabrico<b>${eur(c.custoFabrico)}</b></div>
        <div>MO montagem<b>${eur(c.custoMontagem)}</b></div>
        <div>Custo total<b>${eur(c.custoTotal)}</b></div>
      </div>
      <div class="artigo-pvp"><span>PVP ex-IVA</span><span>${eur(c.pvpExIva)}</span></div>
    `;
    lista.appendChild(div);
  });

  lista.querySelectorAll(".artigo-remove").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.artigos = state.artigos.filter((a) => a.id !== btn.dataset.id);
      atualizar();
    });
  });

  if (linhas.length) {
    totaisBox.hidden = false;
    totaisBox.innerHTML = `
      <div class="linha"><span>Custo total produção</span><span>${eur(custoTotal)}</span></div>
      <div class="linha"><span>Total ex-IVA</span><span>${eur(pvpExIva)}</span></div>
      <div class="linha"><span>${state.autoliquidacao ? "IVA (autoliquidação)" : "IVA 23%"}</span><span>${state.autoliquidacao ? "—" : eur(ivaValor)}</span></div>
      <div class="linha destaque"><span>Total c/IVA</span><span>${eur(totalComIva)}</span></div>
    `;
  } else {
    totaisBox.hidden = true;
  }

  const semArtigos = linhas.length === 0;
  ["btnCopiarFicha", "btnCopiarProposta", "btnExcel", "btnPdf"].forEach((id) => {
    document.getElementById(id).disabled = semArtigos;
  });
}

async function renderGuardados() {
  const box = document.getElementById("guardadosBox");
  const lista = document.getElementById("guardadosLista");

  if (!temLigacao()) {
    box.hidden = true;
    return;
  }

  lista.innerHTML = `<span class="chip" style="cursor:default;opacity:.6">A carregar…</span>`;
  box.hidden = false;

  try {
    const itens = await apiChamar("list");
    if (!itens || !itens.length) {
      lista.innerHTML = `<span class="chip" style="cursor:default;opacity:.6">Sem orçamentos guardados ainda</span>`;
      return;
    }
    lista.innerHTML = itens.map((it) =>
      `<button class="chip" data-ref="${it.referencia}">${it.referencia}${it.cliente ? " · " + it.cliente : ""}</button>`
    ).join("");
    lista.querySelectorAll(".chip[data-ref]").forEach((chip) => {
      chip.addEventListener("click", () => abrirOrcamento(chip.dataset.ref));
    });
  } catch (e) {
    lista.innerHTML = `<span class="chip" style="cursor:default;opacity:.6">Não foi possível ligar à folha</span>`;
  }
}

// ---------- Ligação à Google Sheet (Apps Script) ----------

async function apiChamar(action, params) {
  const url = getApiUrl();
  if (!url) throw new Error("sem ligação configurada");

  if (action === "list" || action === "get") {
    const qs = new URLSearchParams({ action, ...(params || {}) });
    const res = await fetch(`${url}?${qs.toString()}`);
    return res.json();
  }
  // save / delete — POST como text/plain evita pedido de preflight CORS
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

function mostrarAviso(msg) {
  const el = document.getElementById("aviso");
  el.textContent = msg;
  el.hidden = false;
  setTimeout(() => { el.hidden = true; }, 3500);
}

function mostrarFeedback(msg) {
  const el = document.getElementById("feedback");
  el.textContent = "✓ " + msg;
  setTimeout(() => { el.textContent = ""; }, 2200);
}

function atualizar() {
  renderLista();
  guardarRascunhoAuto();
}

// ---------- Ações ----------

function lerFormulario() {
  return {
    id: uid(),
    descricao: document.getElementById("f-descricao").value.trim(),
    areaM2: document.getElementById("f-area").value,
    quantidade: document.getElementById("f-qtd").value || "1",
    painelId: document.getElementById("f-painel").value,
    precoManual: document.getElementById("f-preco-manual").value,
    acabamentoId: document.getElementById("f-acabamento").value,
    ferragens: document.getElementById("f-ferragens").value,
    margemId: document.getElementById("f-margem").value,
  };
}

function limparFormulario() {
  document.getElementById("f-descricao").value = "";
  document.getElementById("f-area").value = "";
  document.getElementById("f-qtd").value = "1";
  document.getElementById("f-painel").selectedIndex = 0;
  document.getElementById("f-preco-manual").value = "";
  document.getElementById("f-preco-manual-wrap").hidden = true;
  document.getElementById("f-acabamento").selectedIndex = 0;
  document.getElementById("f-ferragens").value = "";
  document.getElementById("f-margem").selectedIndex = 0;
}

function adicionarArtigo() {
  const a = lerFormulario();
  if (!a.descricao || !(parseFloat(a.areaM2.replace(",", ".")) > 0)) {
    mostrarAviso("Indica pelo menos a descrição e a área (m²) do artigo.");
    return;
  }
  state.artigos.push(a);
  limparFormulario();
  atualizar();
}

async function guardarOrcamento() {
  if (!state.referencia.trim()) {
    mostrarAviso("Indica uma referência antes de guardar.");
    return;
  }
  if (!temLigacao()) {
    mostrarAviso("Cola primeiro o link da Google Sheet no campo do topo (ver COMO_PUBLICAR.md).");
    return;
  }
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
        referencia: data.referencia || "",
        cliente: data.cliente || "",
        validadeDias: data.validadeDias || "8",
        autoliquidacao: !!data.autoliquidacao,
        artigos: Array.isArray(data.artigos) ? data.artigos : [],
      };
      renderGeral();
      atualizar();
    }
  } catch (e) {
    mostrarAviso("Não foi possível abrir este orçamento.");
  }
}

function novoOrcamento() {
  state = { referencia: "CARP-ORÇ-2026-", cliente: "", validadeDias: "8", autoliquidacao: false, artigos: [] };
  renderGeral();
  atualizar();
}

async function copiarTexto(texto, etiqueta) {
  try {
    await navigator.clipboard.writeText(texto);
    mostrarFeedback(`Copiado: ${etiqueta}`);
  } catch (e) {
    mostrarAviso("Não foi possível copiar automaticamente — seleciona e copia manualmente.");
  }
}

function exportarExcel() {
  const { linhas, custoTotal, pvpExIva, ivaValor, totalComIva } = calcularTotais();

  const fichaRows = [
    ["Ref.", state.referencia, "Cliente", state.cliente, "Data", hoje()],
    [],
    ["#", "Descrição", "Área (m²)", "Painel", "Acabamento", "Material", "Consumíveis", "Ferragens", "MO Fabrico", "MO Montagem", "Custo Total", "Margem", "PVP ex-IVA"],
  ];
  linhas.forEach(({ a, c }, i) => {
    const ferragens = parseFloat((a.ferragens || "0").toString().replace(",", ".")) || 0;
    fichaRows.push([
      i + 1, a.descricao, c.areaTotal, c.painelNome, c.acabamentoNome,
      c.custoMaterial, c.custoConsumiveis, ferragens, c.custoFabrico, c.custoMontagem,
      c.custoTotal, `${(c.margem.valor * 100).toFixed(0)}%`, c.pvpExIva,
    ]);
  });
  fichaRows.push([]);
  fichaRows.push(["", "", "", "", "", "", "", "", "", "TOTAL", custoTotal, "", pvpExIva]);

  const propRows = [
    [`PROPOSTA COMERCIAL — ${state.referencia}`],
    [`Cliente: ${state.cliente || ""}`],
    [`Data: ${hoje()}    Validade: ${state.validadeDias} dias`],
    [],
    ["Artigo", "Descrição", "Valor ex-IVA"],
  ];
  linhas.forEach(({ a, c }, i) => {
    propRows.push([String(i + 1).padStart(2, "0"), a.descricao, c.pvpExIva]);
  });
  propRows.push([]);
  propRows.push(["", "TOTAL ex-IVA", pvpExIva]);
  propRows.push(["", state.autoliquidacao ? "IVA (autoliquidação Art.º 2.º n.º 1 al. j) CIVA)" : "IVA 23%", state.autoliquidacao ? 0 : ivaValor]);
  propRows.push(["", "TOTAL c/IVA", state.autoliquidacao ? pvpExIva : totalComIva]);
  propRows.push([]);
  propRows.push(["Condições: 40% adjudicação / 40% início / 20% conclusão"]);

  const wb = XLSX.utils.book_new();
  const wsFicha = XLSX.utils.aoa_to_sheet(fichaRows);
  const wsProp = XLSX.utils.aoa_to_sheet(propRows);

  // formatação de moeda nas colunas relevantes
  const moedaCols = { ficha: [5, 6, 7, 8, 9, 10, 12], proposta: [2] };
  applyCurrencyFormat(wsFicha, moedaCols.ficha, fichaRows.length);
  applyCurrencyFormat(wsProp, moedaCols.proposta, propRows.length);

  wsFicha["!cols"] = [{ wch: 4 }, { wch: 28 }, { wch: 9 }, { wch: 26 }, { wch: 20 }, { wch: 11 }, { wch: 11 }, { wch: 10 }, { wch: 11 }, { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 12 }];
  wsProp["!cols"] = [{ wch: 8 }, { wch: 40 }, { wch: 14 }];

  XLSX.utils.book_append_sheet(wb, wsFicha, "Ficha de Custo Interno");
  XLSX.utils.book_append_sheet(wb, wsProp, "Proposta Comercial");

  XLSX.writeFile(wb, `${state.referencia || "orcamento"}.xlsx`);
  mostrarFeedback("Excel exportado");
}

function applyCurrencyFormat(ws, cols, numRows) {
  for (let r = 0; r < numRows; r++) {
    cols.forEach((c) => {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = ws[addr];
      if (cell && typeof cell.v === "number") {
        cell.z = '#,##0.00 "€"';
      }
    });
  }
}

function exportarPdf() {
  const texto = gerarFichaCusto() + "\n\n" + gerarProposta();
  document.getElementById("printArea").textContent = texto;
  window.print();
}

// ---------- Backup ----------

async function exportarBackup() {
  if (!temLigacao()) {
    mostrarAviso("Sem ligação à Google Sheet — nada para exportar ainda.");
    return;
  }
  try {
    const itens = await apiChamar("list");
    const dados = [];
    for (const it of itens) {
      const data = await apiChamar("get", { ref: it.referencia });
      if (data) dados.push(data);
    }
    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `carpinova-orcamentos-backup-${hoje().replace(/\//g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    mostrarFeedback("Backup exportado");
  } catch (e) {
    mostrarAviso("Falha ao exportar backup da Sheet.");
  }
}

async function importarBackup(file) {
  if (!temLigacao()) {
    mostrarAviso("Cola primeiro o link da Google Sheet antes de importares um backup.");
    return;
  }
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const dados = JSON.parse(reader.result);
      const lista = Array.isArray(dados) ? dados : Object.values(dados);
      for (const item of lista) {
        await apiChamar("save", { data: item });
      }
      await renderGuardados();
      mostrarFeedback("Backup importado para a Sheet");
    } catch (e) {
      mostrarAviso("Ficheiro de backup inválido.");
    }
  };
  reader.readAsText(file);
}

// ---------- Ligações de eventos ----------

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

  document.getElementById("btnAdicionar").addEventListener("click", adicionarArtigo);
  document.getElementById("btnNovo").addEventListener("click", novoOrcamento);
  document.getElementById("btnGuardar").addEventListener("click", guardarOrcamento);
  document.getElementById("btnCopiarFicha").addEventListener("click", () => copiarTexto(gerarFichaCusto(), "Ficha de Custo Interno"));
  document.getElementById("btnCopiarProposta").addEventListener("click", () => copiarTexto(gerarProposta(), "Proposta Comercial"));
  document.getElementById("btnExcel").addEventListener("click", exportarExcel);
  document.getElementById("btnPdf").addEventListener("click", exportarPdf);
  document.getElementById("btnBackupExport").addEventListener("click", exportarBackup);
  document.getElementById("btnBackupImport").addEventListener("change", (e) => {
    if (e.target.files[0]) importarBackup(e.target.files[0]);
  });
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
