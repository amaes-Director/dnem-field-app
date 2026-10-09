/* DNEM ADA Lens - Google Drive upload service.
 *
 * Runs in DNEM's Google account as an Apps Script web app. The phone app's "Send visit"
 * posts the visit ZIP here in pieces, and this script saves it in one DNEM Drive folder.
 * Consultants need no Google account and no Drive app; they enter the team code once.
 *
 * One-time setup: see "Google Drive setup.md". Run setup() once, then deploy as a web app
 * (Execute as: Me; Who has access: Anyone).
 */
var FOLDER_NAME = 'DNEM ADA Lens field visits';
var MAX_PARTS = 40; // 40 x 6 MB = 240 MB, far above any real visit

// Run once from the editor. Creates the folder and a team code, and prints both in the log.
function setup() {
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('FOLDER_ID')) props.setProperty('FOLDER_ID', DriveApp.createFolder(FOLDER_NAME).getId());
  if (!props.getProperty('TEAM_CODE')) props.setProperty('TEAM_CODE', String(Math.floor(100000 + Math.random() * 900000)));
  var folder = DriveApp.getFolderById(props.getProperty('FOLDER_ID'));
  Logger.log('Visits will be saved in: ' + folder.getName() + '  ' + folder.getUrl());
  Logger.log('Team code for consultants: ' + props.getProperty('TEAM_CODE'));
}

// To save into a different folder (for example one in a shared drive), open that folder in
// Drive, copy the long id at the end of its web address, paste it below, and run useFolder().
function useFolder() {
  var id = 'PASTE_FOLDER_ID_HERE';
  var folder = DriveApp.getFolderById(id); // fails here if the id is wrong
  PropertiesService.getScriptProperties().setProperty('FOLDER_ID', id);
  Logger.log('Visits will now be saved in: ' + folder.getName());
}

// Simple check that the deployment works: open the web app address in a browser.
function doGet() { return reply({ ok: true, service: 'DNEM ADA Lens upload' }); }

// Body (sent as text): { code, name, upload, part, parts, data }
// data is base64 of one piece of the ZIP. Every piece except the last is a multiple of 3 bytes,
// so the base64 pieces join into one valid base64 string.
function doPost(e) {
  try {
    var req = JSON.parse(e.postData.contents);
    var props = PropertiesService.getScriptProperties();
    if (!props.getProperty('TEAM_CODE') || String(req.code || '') !== props.getProperty('TEAM_CODE')) return reply({ ok: false, error: 'code' });
    if (!/^DNEM_[A-Za-z0-9_-]{1,160}\.zip$/.test(req.name || '')) return reply({ ok: false, error: 'name' });
    if (!/^[A-Za-z0-9-]{8,64}$/.test(req.upload || '')) return reply({ ok: false, error: 'upload' });
    var part = Number(req.part), parts = Number(req.parts);
    if (!(parts >= 1 && parts <= MAX_PARTS && part >= 0 && part < parts) || typeof req.data !== 'string') return reply({ ok: false, error: 'part' });

    var folder = DriveApp.getFolderById(props.getProperty('FOLDER_ID'));
    if (parts === 1) return reply({ ok: true, done: true, url: save(folder, req.name, req.data) });

    // Multi-part: keep each piece in a holding folder until all have arrived.
    var hold = holding(folder);
    var prefix = req.upload + '.';
    trash(hold.getFilesByName(prefix + part));
    hold.createFile(prefix + part, req.data, MimeType.PLAIN_TEXT);
    var pieces = [];
    for (var i = 0; i < parts; i++) {
      var it = hold.getFilesByName(prefix + i);
      if (!it.hasNext()) return reply({ ok: true, done: false });
      pieces.push(it.next());
    }
    var url = save(folder, req.name, pieces.map(function (f) { return f.getBlob().getDataAsString(); }).join(''));
    pieces.forEach(function (f) { f.setTrashed(true); });
    return reply({ ok: true, done: true, url: url });
  } catch (err) {
    return reply({ ok: false, error: 'server', message: String(err && err.message || err) });
  }
}

// Sending the same visit again replaces the earlier copy, so a report never counts it twice.
function save(folder, name, base64) {
  trash(folder.getFilesByName(name));
  var file = folder.createFile(Utilities.newBlob(Utilities.base64Decode(base64), 'application/zip', name));
  return file.getUrl();
}
function holding(folder) {
  var it = folder.getFoldersByName('_incoming (do not use)');
  return it.hasNext() ? it.next() : folder.createFolder('_incoming (do not use)');
}
function trash(it) { while (it.hasNext()) it.next().setTrashed(true); }
function reply(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
