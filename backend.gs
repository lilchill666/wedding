// ============================================================
// Wedding RSVP backend — Google Apps Script
// ============================================================
//
// Setup (one time, ~2 minutes):
//   1. Open https://sheets.new — a fresh Google Sheet.
//   2. Extensions → Apps Script.
//   3. Delete the placeholder code, paste this whole file, Save.
//   4. (Optional) Fill TELEGRAM_TOKEN + TELEGRAM_CHAT_ID below to
//      get instant pings from a Telegram bot.
//   5. Deploy → New deployment → Type: Web app
//        - Execute as:       Me
//        - Who has access:   Anyone
//      Click Deploy, authorise, copy the resulting `/exec` URL.
//   6. Paste that URL into script.js as RSVP_ENDPOINT.
//
// Responses appear as rows in the "RSVP" sheet tab. That's it.
// ============================================================

// Paste the long id from your sheet URL:
//   https://docs.google.com/spreadsheets/d/<THIS_PART>/edit
// Required if this script is standalone (created at script.google.com).
// Can be left "" only if the script was created via Extensions → Apps
// Script from inside the sheet itself.
const SHEET_ID         = "1hmd4OPfPZh_HgSLCTzFkM_z2XL0tkBoa6bRt2lETQ3g";
const SHEET_NAME       = "RSVP";
const TELEGRAM_TOKEN   = "";   // optional
const TELEGRAM_CHAT_ID = "";   // optional

function doPost(e) {
  let data = {};
  try { data = JSON.parse(e.postData.contents || "{}"); } catch (_) {}

  const row = [
    new Date(),
    String(data.guest     || "").slice(0, 200),
    String(data.token     || "").slice(0, 100),
    data.answer === "yes" ? "БУДЕ" : "не зможе",
    String(data.userAgent || "").slice(0, 300),
  ];

  getSheet().appendRow(row);
  notifyTelegram(row);

  return json({ ok: true });
}

function doGet() {
  return json({ ok: true, hint: "POST JSON to submit an RSVP" });
}

function getSheet() {
  const ss = SHEET_ID
    ? SpreadsheetApp.openById(SHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error("No spreadsheet. Set SHEET_ID or bind the script to a sheet.");
  }
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(["Час", "Гість", "Токен", "Відповідь", "User Agent"]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function notifyTelegram(row) {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) return;
  const [ts, guest, token, answer] = row;
  const emoji = answer === "БУДЕ" ? "✅" : "❌";
  const text  =
    "💌 RSVP\n\n" +
    emoji + " " + answer + "\n\n" +
    "Гість: "  + guest + "\n" +
    "Токен: "  + token + "\n" +
    "Час: "    + ts.toISOString();
  UrlFetchApp.fetch(
    "https://api.telegram.org/bot" + TELEGRAM_TOKEN + "/sendMessage",
    {
      method:              "post",
      contentType:         "application/json",
      payload:             JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: text }),
      muteHttpExceptions:  true,
    }
  );
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
