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

function detectarColuna(cabecalho, padroes) {
  for (let i = 0; i < cabecalho.length; i++) {
    const v = (cabecalho[i] || "").toString().toLowerCase();
    if (padroes.some((p) => p.test(v))) return i;
  }
  return -1;
}

function importarExcel(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const wb = XLSX.read(e.target.result, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const linhas = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

      let headerIdx = 0;
      let colDesc = -1, colQtd = -1, colUnid = -1;
      for (let i = 0; i < Math.min(linhas.length, 5); i++) {
        colDesc = detectarColuna(linhas[i], [/descri/, /artigo/, /designa/]);
        colQtd = detectarColuna(linhas[i], [/qtd/, /quant/]);
        colUnid = detectarColuna(linhas[i], [/unid/, /^un$/]);
        if (colDesc !== -1) { headerIdx = i; break; }
      }
      if (colDesc === -1) { colDesc = 0; colQtd = 1; colUnid = 2; headerIdx = 0; }

      let importadas = 0;
      for (let i = headerIdx + 1; i < linhas.length; i++) {
        const row = linhas[i];
        const descricao = (row[colDesc] || "").toString().trim();
        if (!descricao) continue;
        const qtd = colQtd !== -1 ? num(row[colQtd]) : 1;
        const unidade = colUnid !== -1 ? (row[colUnid] || "un").toString().trim() : "un";
        state.linhas.push({
          id: uid(), descricao, tipo: "Material",
          qtd: qtd > 0 ? qtd : 1,
          unidade: UNIDADES.includes(unidade) ? unidade : "un",
          custoUnit: "",
        });
        importadas++;
      }
      atualizar();
      mostrarImportStatus(importadas ? `✓ ${importadas} linha(s) importada(s) — falta preencher os preços.` : "Nenhuma linha reconhecida neste ficheiro.");
    } catch (err) {
      mostrarImportStatus("Não foi possível ler este ficheiro.");
    }
  };
  reader.readAsArrayBuffer(file);
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

function exportarExcel() {
  const t = calcularTotais();
  const fichaRows = [
    ["Ref.", state.referencia, "Cliente", state.cliente, "Data", hoje()], [],
    ["#", "Descrição", "Tipo", "Qtd", "Unid", "Custo Unit.", "Total"],
  ];
  t.linhas.forEach((l, i) => fichaRows.push([i + 1, l.descricao, l.tipo, num(l.qtd), l.unidade, num(l.custoUnit), l.total]));
  fichaRows.push([]);
  fichaRows.push(["", "", "", "", "", "SUBTOTAL MATERIAL", t.subtotalMaterial]);
  fichaRows.push(["", "", "", "", "", "DESPERDÍCIO 10%", t.desperdicio]);
  if (t.subtotalFerragens) fichaRows.push(["", "", "", "", "", "FERRAGENS", t.subtotalFerragens]);
  if (t.subtotalAcabamento) fichaRows.push(["", "", "", "", "", "ACABAMENTO", t.subtotalAcabamento]);
  fichaRows.push(["", "", "", "", "", "MO FABRICAÇÃO", t.moFabricacao]);
  fichaRows.push(["", "", "", "", "", "MO MONTAGEM", t.moMontagem]);
  if (t.subtotalOutro) fichaRows.push(["", "", "", "", "", "OUTROS", t.subtotalOutro]);
  fichaRows.push(["", "", "", "", "", "CUSTO TOTAL PRODUÇÃO", t.custoTotalProducao]);
  fichaRows.push(["", "", "", "", "", "MARGEM APLICADA", `${(t.margem.valor * 100).toFixed(0)}%`]);
  fichaRows.push(["", "", "", "", "", "PVP ex-IVA", t.pvpExIva]);

  const desc = state.descricaoGeral || `Fornecimento e montagem de carpintaria — ${state.cliente || ""}`;
  const propRows = [
    [`PROPOSTA COMERCIAL — ${state.referencia}`], [`Cliente: ${state.cliente || ""}`],
    [`Data: ${hoje()}    Validade: ${state.validadeDias} dias`], [],
    ["Artigo", "Descrição", "Valor ex-IVA"], ["01", desc, t.pvpExIva], [],
    ["", "TOTAL ex-IVA", t.pvpExIva],
    ["", state.autoliquidacao ? "IVA (autoliquidação)" : "IVA 23%", state.autoliquidacao ? 0 : t.ivaValor],
    ["", "TOTAL c/IVA", state.autoliquidacao ? t.pvpExIva : t.totalComIva], [],
    ["Condições: 40% adjudicação / 40% início / 20% conclusão"],
  ];

  const wb = XLSX.utils.book_new();
  const wsFicha = XLSX.utils.aoa_to_sheet(fichaRows);
  const wsProp = XLSX.utils.aoa_to_sheet(propRows);
  aplicarFormatoMoeda(wsFicha, [5, 6], fichaRows.length);
  aplicarFormatoMoeda(wsProp, [2], propRows.length);
  wsFicha["!cols"] = [{ wch: 4 }, { wch: 28 }, { wch: 14 }, { wch: 8 }, { wch: 6 }, { wch: 22 }, { wch: 12 }];
  wsProp["!cols"] = [{ wch: 8 }, { wch: 46 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsFicha, "Ficha de Custo Interno");
  XLSX.utils.book_append_sheet(wb, wsProp, "Proposta Comercial");
  XLSX.writeFile(wb, `${state.referencia || "orcamento"}.xlsx`);
  mostrarFeedback("Excel exportado");
}

function aplicarFormatoMoeda(ws, cols, numRows) {
  for (let r = 0; r < numRows; r++) {
    cols.forEach((c) => {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (cell && typeof cell.v === "number") cell.z = '#,##0.00 "€"';
    });
  }
}

function exportarPdf() {
  document.getElementById("printArea").textContent = gerarFichaCusto() + "\n\n" + gerarProposta();
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
