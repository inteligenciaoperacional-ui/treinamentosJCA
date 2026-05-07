/* ============================================================
   JCA Treinamentos — Lançamento de Treinamentos
   Script Apps Script para colar no Google Apps Script
   Planilha: 1PwZR8aNiWdI79qt7z_-0_QWq36FF5wVZYPjLxvmLYHI
   ============================================================

   INSTRUÇÕES:
   1. Abra a planilha de lançamentos
   2. Extensões → Apps Script
   3. Cole o código abaixo e salve
   4. Implante → Nova implantação → App da Web
      - Executar como: EU
      - Quem tem acesso: QUALQUER PESSOA
   5. Copie a URL e substitua LANCAMENTO_SCRIPT_URL no dashboard.js
*/

const SHEET_ID = '1PwZR8aNiWdI79qt7z_-0_QWq36FF5wVZYPjLxvmLYHI';
const FOLDER_NAME = 'Anexos_Treinamentos_JCA';

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];

    let anexoUrl = '';

    // Upload do arquivo para o Google Drive
    if (payload.anexoBase64 && payload.anexoNome) {
      const blob = Utilities.newBlob(
        Utilities.base64Decode(payload.anexoBase64),
        payload.anexoTipo || 'application/octet-stream',
        payload.anexoNome
      );

      // Busca ou cria a pasta
      let folder;
      const folders = DriveApp.getFoldersByName(FOLDER_NAME);
      if (folders.hasNext()) {
        folder = folders.next();
      } else {
        folder = DriveApp.createFolder(FOLDER_NAME);
      }

      const file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      anexoUrl = file.getUrl();
    }

    // Linha: A=dataEnvio, B=treinamento, C=matInstrutor, D=matColaborador, E=dataRealizacao, F=vazio, G=anexo, H=emailInstrutor
    sheet.appendRow([
      new Date(),               // A - Data de envio
      payload.treinamento,      // B - Treinamento realizado
      payload.matInstrutor,     // C - Matrícula do instrutor
      payload.matColaborador,   // D - Matrícula do colaborador
      payload.dataRealizacao,   // E - Data de realização
      '',                       // F - (vazio)
      anexoUrl,                 // G - Anexo (link Drive)
      payload.emailInstrutor,   // H - E-mail do instrutor
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService.createTextOutput('JCA Lançamentos OK');
}
