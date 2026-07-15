/**
 * CARPINOVA — Backend de orçamentos (Google Apps Script)
 *
 * Como instalar: ver COMO_PUBLICAR.md, Parte 2.
 * Resumo: cria uma Google Sheet → Extensões → Apps Script → cola este
 * código todo → Implementar → Nova implementação → Web app → copia o link.
 */

const SHEET_NAME = "Orcamentos";

function doGet(e) {
  const sheet = getSheet();
  const action = (e.parameter.action || "list");
  if (action === "list") return responder(listarOrcamentos(sheet));
  if (action === "get") return responder(obterOrcamento(sheet, e.parameter.ref));
  return responder({ erro: "ação desconhecida: " + action });
}

function doPost(e) {
  const sheet = getSheet();
  const corpo = JSON.parse(e.postData.contents);
  if (corpo.action === "save") {
    guardarOrcamento(sheet, corpo.data);
    return responder({ ok: true });
  }
  if (corpo.action === "delete") {
    apagarOrcamento(sheet, corpo.referencia);
    return responder({ ok: true });
  }
  return responder({ erro: "ação desconhecida: " + corpo.action });
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(["Referencia", "Cliente", "GuardadoEm", "JSON"]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function listarOrcamentos(sheet) {
  const dados = sheet.getDataRange().getValues();
  return dados.slice(1)
    .filter((linha) => linha[0])
    .map((linha) => ({ referencia: linha[0], cliente: linha[1], guardadoEm: linha[2] }));
}

function obterOrcamento(sheet, ref) {
  const dados = sheet.getDataRange().getValues();
  for (let i = 1; i < dados.length; i++) {
    if (String(dados[i][0]) === String(ref)) {
      return JSON.parse(dados[i][3]);
    }
  }
  return null;
}

function guardarOrcamento(sheet, orcamento) {
  const dados = sheet.getDataRange().getValues();
  const ref = orcamento.referencia;
  const json = JSON.stringify(orcamento);
  for (let i = 1; i < dados.length; i++) {
    if (String(dados[i][0]) === String(ref)) {
      sheet.getRange(i + 1, 1, 1, 4).setValues([[ref, orcamento.cliente || "", new Date(), json]]);
      return;
    }
  }
  sheet.appendRow([ref, orcamento.cliente || "", new Date(), json]);
}

function apagarOrcamento(sheet, ref) {
  const dados = sheet.getDataRange().getValues();
  for (let i = dados.length - 1; i >= 1; i--) {
    if (String(dados[i][0]) === String(ref)) sheet.deleteRow(i + 1);
  }
}

function responder(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
