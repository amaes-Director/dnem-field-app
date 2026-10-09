/* DNEM Field Capture - phone app. Plain JavaScript, no build step.
 * Data stays on the phone (IndexedDB) until the consultant taps "Send visit",
 * which packs visit.json + photos into one ZIP and opens the share sheet.
 */
(function () {
  'use strict';
  var R = window.DNEM_RULES, E = window.DNEM_ENGINE;
  var main = document.getElementById('main');
  var titleEl = document.getElementById('title');
  var backBtn = document.getElementById('back');

  // ---------------------------------------------------------------- storage
  var db = null, memory = { visits: {}, photos: {} };
  function openDB() {
    return new Promise(function (resolve) {
      try {
        var req = indexedDB.open('dnem-field', 1);
        req.onupgradeneeded = function () {
          var d = req.result;
          d.createObjectStore('visits', { keyPath: 'id' });
          var p = d.createObjectStore('photos', { keyPath: 'id' });
          p.createIndex('visitId', 'visitId');
        };
        req.onsuccess = function () { db = req.result; resolve(); };
        req.onerror = function () { resolve(); };
      } catch (e) { resolve(); }
    });
  }
  function tx(store, mode, fn) {
    if (!db) return Promise.resolve(fn(null));
    return new Promise(function (resolve, reject) {
      var t = db.transaction(store, mode), s = t.objectStore(store), out;
      var r = fn(s);
      if (r && 'onsuccess' in r) r.onsuccess = function () { out = r.result; };
      t.oncomplete = function () { resolve(out); };
      t.onerror = function () { reject(t.error); };
    });
  }
  var store = {
    allVisits: function () {
      if (!db) return Promise.resolve(Object.values(memory.visits));
      return tx('visits', 'readonly', function (s) { return s.getAll(); });
    },
    getVisit: function (id) {
      if (!db) return Promise.resolve(memory.visits[id]);
      return tx('visits', 'readonly', function (s) { return s.get(id); });
    },
    putVisit: function (v, keepUpdated) {
      if (!keepUpdated) v.updated = new Date().toISOString();
      if (!db) { memory.visits[v.id] = v; return Promise.resolve(); }
      return tx('visits', 'readwrite', function (s) { return s.put(v); });
    },
    deleteVisit: function (id) {
      if (!db) { delete memory.visits[id]; return Promise.resolve(); }
      return store.photosFor(id).then(function (ps) {
        return tx('photos', 'readwrite', function (s) { ps.forEach(function (p) { s.delete(p.id); }); });
      }).then(function () { return tx('visits', 'readwrite', function (s) { return s.delete(id); }); });
    },
    putPhoto: function (p) {
      if (!db) { memory.photos[p.id] = p; return Promise.resolve(); }
      return tx('photos', 'readwrite', function (s) { return s.put(p); });
    },
    getPhoto: function (id) {
      if (!db) return Promise.resolve(memory.photos[id]);
      return tx('photos', 'readonly', function (s) { return s.get(id); });
    },
    deletePhoto: function (id) {
      if (!db) { delete memory.photos[id]; return Promise.resolve(); }
      return tx('photos', 'readwrite', function (s) { return s.delete(id); });
    },
    photosFor: function (visitId) {
      if (!db) return Promise.resolve(Object.values(memory.photos).filter(function (p) { return p.visitId === visitId; }));
      return tx('photos', 'readonly', function (s) { return s.index('visitId').getAll(visitId); });
    }
  };
  function pref(k, v) {
    try { if (v === undefined) return localStorage.getItem('dnem.' + k); localStorage.setItem('dnem.' + k, v); } catch (e) { return null; }
  }

  // ---------------------------------------------------------------- utils
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function today() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function toast(msg) { var t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('show'); }, 2600); }
  function go(hash) { location.hash = hash; }
  function setTitle(t, back) { titleEl.textContent = t; document.title = t + ' - DNEM Field Capture'; backBtn.hidden = !back; backBtn.onclick = function () { go(back); }; }
  function focusMain() { main.focus(); window.scrollTo(0, 0); }
  function slug(s) { return String(s || 'site').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40) || 'site'; }
  function elementLabel(id) { var el = E.findElement(R, id); return el ? el.label : id; }

  function updateNet() { var n = document.getElementById('net'); n.textContent = navigator.onLine ? '' : 'Offline - saving on phone'; n.hidden = navigator.onLine; }
  window.addEventListener('online', updateNet); window.addEventListener('offline', updateNet);

  // Shrink photos so a visit stays small enough to share (long edge 1600 px, JPEG).
  function compress(file) {
    return new Promise(function (resolve) {
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        var max = 1600, w = img.naturalWidth, h = img.naturalHeight, sc = Math.min(1, max / Math.max(w, h));
        var c = document.createElement('canvas'); c.width = Math.round(w * sc); c.height = Math.round(h * sc);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) { resolve(b || file); }, 'image/jpeg', 0.82);
      };
      img.onerror = function () { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  }

  // ---------------------------------------------------------------- screens
  function viewHome() {
    setTitle('DNEM Field Capture');
    store.allVisits().then(function (visits) {
      visits.sort(function (a, b) { return (b.updated || '').localeCompare(a.updated || ''); });
      var html = '<h2>Site visits</h2>' +
        '<p class="help">Everything is saved on this phone, even with no signal. Tap "Send visit" when you are done, choose Drive, and save it to the shared DNEM field-visits folder.</p>';
      if (!db) html += '<p class="card status-manual">This browser is not allowing storage, so visits will be lost if you close the app. Send each visit before closing.</p>';
      if (!visits.length) html += '<p class="empty">No visits yet.</p>';
      visits.forEach(function (v) {
        var n = (v.findings || []).length;
        html += '<button type="button" class="card link" data-open="' + esc(v.id) + '"><strong>' + esc(v.siteName || 'Untitled site') + '</strong>' +
          '<span class="meta">' + esc(v.date) + ' · ' + n + ' finding' + (n === 1 ? '' : 's') + '</span>' +
          (v.exportedAt && v.exportedAt >= v.updated ? '<span class="badge">Sent</span>' : (n ? '<span class="badge">Not sent yet</span>' : '')) + '</button>';
      });
      html += '<div class="sticky-actions"><button type="button" class="btn" id="newVisit">+ New site visit</button></div>';
      main.innerHTML = html;
      main.querySelectorAll('[data-open]').forEach(function (b) { b.onclick = function () { go('#visit/' + b.dataset.open); }; });
      document.getElementById('newVisit').onclick = function () { go('#new'); };
      focusMain();
    });
  }

  function visitForm(v, isNew) {
    setTitle(isNew ? 'New site visit' : 'Visit details', isNew ? '#' : '#visit/' + v.id);
    var st = R.buildingStatus.map(function (s) {
      return '<label class="choice" style="width:100%"><input type="radio" name="bstatus" value="' + s.id + '"' + (v.buildingStatus === s.id ? ' checked' : '') + '> ' + esc(s.label) + '</label>';
    }).join('');
    main.innerHTML = '<h2>' + (isNew ? 'Start a site visit' : 'Edit visit details') + '</h2><form id="vf" novalidate>' +
      '<div class="field"><label for="siteName">Site or facility name (required)</label><input type="text" id="siteName" required autocomplete="off" value="' + esc(v.siteName) + '"></div>' +
      '<div class="field"><label for="address">Address</label><input type="text" id="address" autocomplete="street-address" value="' + esc(v.address) + '"></div>' +
      '<div class="field"><label for="client">Client</label><input type="text" id="client" value="' + esc(v.client) + '"></div>' +
      '<div class="field"><label for="consultant">Your name (required)</label><input type="text" id="consultant" required autocomplete="name" value="' + esc(v.consultant) + '"></div>' +
      '<div class="field"><label for="date">Visit date</label><input type="date" id="date" value="' + esc(v.date) + '"></div>' +
      '<fieldset><legend>Building status</legend><p class="help">Decides whether the 2021 Michigan new-building sizes apply (for example a 67 in turning circle). Leave "Not known" if unsure; the report will flag those items.</p><div class="choices">' + st + '</div></fieldset>' +
      '<div class="field"><label for="vnotes">Visit notes</label><textarea id="vnotes">' + esc(v.notes) + '</textarea></div>' +
      '<p id="vfErr" class="status-fail" role="alert"></p>' +
      '<div class="sticky-actions"><button class="btn" type="submit">' + (isNew ? 'Start visit' : 'Save') + '</button></div></form>';
    document.getElementById('vf').onsubmit = function (e) {
      e.preventDefault();
      var g = function (id) { return document.getElementById(id).value.trim(); };
      if (!g('siteName') || !g('consultant')) {
        document.getElementById('vfErr').textContent = 'Enter the site name and your name.';
        document.getElementById(!g('siteName') ? 'siteName' : 'consultant').focus(); return;
      }
      v.siteName = g('siteName'); v.address = g('address'); v.client = g('client'); v.consultant = g('consultant');
      v.date = g('date') || today(); v.notes = g('vnotes');
      var b = main.querySelector('input[name=bstatus]:checked'); v.buildingStatus = b ? b.value : 'unknown';
      pref('consultant', v.consultant);
      store.putVisit(v).then(function () { toast('Saved'); go('#visit/' + v.id); });
    };
    focusMain();
  }

  function viewVisit(id) {
    store.getVisit(id).then(function (v) {
      if (!v) return go('#');
      setTitle(v.siteName || 'Site visit', '#');
      var fs = v.findings || [];
      var bs = R.buildingStatus.filter(function (s) { return s.id === v.buildingStatus; })[0];
      var html = '<h2>' + esc(v.siteName) + '</h2><p class="help">' + esc(v.date) + ' · ' + esc(v.consultant) + (v.address ? ' · ' + esc(v.address) : '') + '<br>Building: ' + esc(bs ? bs.label : 'Not known') + '</p>' +
        '<div class="row" style="margin:12px 0"><button class="btn secondary" type="button" id="editV">Edit details</button><button class="btn" type="button" id="sendV">Send visit</button></div>' +
        '<h3>Findings (' + fs.length + ')</h3>';
      if (!fs.length) html += '<p class="empty">No findings yet. Tap "Add finding" to start.</p>';
      fs.forEach(function (f, i) {
        var ev = E.evaluateFinding(f, v, R);
        var cls = { fail: 'status-fail', manual: 'status-manual', pass: 'status-pass', na: '' }[ev.status];
        html += '<button type="button" class="card link" data-f="' + esc(f.id) + '"><strong>' + (i + 1) + '. ' + esc(elementLabel(f.elementType)) + '</strong>' +
          '<span class="meta">' + esc(f.location || 'No location') + ' · ' + (f.photos || []).length + ' photo(s)</span><br>' +
          '<span class="' + cls + '">' + esc(E.STATUS_LABEL[ev.status]) + '</span></button>';
      });
      html += '<h3>Remove</h3><button class="btn danger" type="button" id="delV">Delete this visit from the phone</button>' +
        '<div class="sticky-actions"><button class="btn" type="button" id="addF">+ Add finding</button></div>';
      main.innerHTML = html;
      main.querySelectorAll('[data-f]').forEach(function (b) { b.onclick = function () { go('#finding/' + v.id + '/' + b.dataset.f); }; });
      document.getElementById('addF').onclick = function () { go('#finding/' + v.id + '/new'); };
      document.getElementById('editV').onclick = function () { go('#visit/' + v.id + '/edit'); };
      document.getElementById('sendV').onclick = function () { sendVisit(v); };
      document.getElementById('delV').onclick = function () {
        var sent = v.exportedAt && v.exportedAt >= v.updated;
        if (confirm((sent ? '' : 'This visit has NOT been sent. ') + 'Delete "' + v.siteName + '" and its photos from this phone?')) store.deleteVisit(v.id).then(function () { toast('Visit deleted'); go('#'); });
      };
      focusMain();
    });
  }

  // ---------------------------------------------------------------- finding form
  var UNITS = { len: ['in', 'cm'], slope: ['%', 'deg'], force: ['lbf', 'N'], time: ['sec'], count: [''] };
  var UNIT_NAME = { 'in': 'inches', cm: 'centimeters', '%': 'percent', deg: 'degrees', lbf: 'pounds-force', N: 'newtons', sec: 'seconds' };

  function fieldHTML(el, f, val, visit) {
    var id = 'v_' + f.id, hint = E.hintFor(el, f.id, visit), m = val || {};
    var hintHTML = hint ? '<p class="hint" id="' + id + '_h">Requirement: ' + esc(hint) + '</p>' : '';
    if (f.type === 'bool') {
      var opts = [['yes', 'Yes'], ['no', 'No'], ['na', 'N/A']].map(function (o) {
        var chk = (o[0] === 'yes' && m.value === true) || (o[0] === 'no' && m.value === false) || (o[0] === 'na' && m.na);
        return '<label class="choice"><input type="radio" name="' + id + '" value="' + o[0] + '"' + (chk ? ' checked' : '') + '> ' + o[1] + '</label>';
      }).join('');
      return '<fieldset><legend>' + esc(f.label) + '</legend><div class="choices">' + opts + '</div>' + hintHTML + '</fieldset>';
    }
    if (f.type === 'choice') {
      return '<fieldset><legend>' + esc(f.label) + '</legend><div class="choices">' + f.options.map(function (o) {
        return '<label class="choice"><input type="radio" name="' + id + '" value="' + esc(o.id) + '"' + (m.value === o.id ? ' checked' : '') + '> ' + esc(o.label) + '</label>';
      }).join('') + '</div></fieldset>';
    }
    var units = UNITS[f.type], unit = m.unit || units[0]; // always default to in / % / lbf so a stray cm choice never carries over
    var unitHTML = units.length > 1
      ? '<select id="' + id + '_u" aria-label="Unit for ' + esc(f.label) + '">' + units.map(function (u) { return '<option value="' + u + '"' + (u === unit ? ' selected' : '') + '>' + u + '</option>'; }).join('') + '</select>'
      : '<span>' + esc(units[0]) + '</span>';
    return '<div class="field"><label for="' + id + '">' + esc(f.label) + '</label><div class="meas">' +
      '<input type="text" inputmode="decimal" id="' + id + '" value="' + esc(m.na ? '' : (m.value != null ? m.value : '')) + '"' + (hint ? ' aria-describedby="' + id + '_h"' : '') + ' autocomplete="off">' + unitHTML + '</div>' +
      hintHTML + '<label class="na"><input type="checkbox" id="' + id + '_na"' + (m.na ? ' checked' : '') + '> Not applicable</label></div>';
  }

  function readFields(el) {
    var values = {};
    el.fields.forEach(function (f) {
      var id = 'v_' + f.id;
      if (f.type === 'bool') {
        var r = main.querySelector('input[name="' + id + '"]:checked');
        if (r) values[f.id] = r.value === 'na' ? { na: true } : { value: r.value === 'yes' };
      } else if (f.type === 'choice') {
        var c = main.querySelector('input[name="' + id + '"]:checked');
        if (c) values[f.id] = { value: c.value };
      } else {
        var inp = document.getElementById(id), na = document.getElementById(id + '_na'), u = document.getElementById(id + '_u');
        if (na && na.checked) values[f.id] = { na: true };
        else if (inp && inp.value.trim() !== '') values[f.id] = { value: inp.value.trim(), unit: u ? u.value : UNITS[f.type][0] };
      }
    });
    return values;
  }

  function viewFinding(visitId, findingId) {
    store.getVisit(visitId).then(function (v) {
      if (!v) return go('#');
      v.findings = v.findings || [];
      var isNew = findingId === 'new';
      var orig = isNew ? null : v.findings.filter(function (f) { return f.id === findingId; })[0];
      if (!isNew && !orig) return go('#visit/' + v.id);
      var f = orig ? JSON.parse(JSON.stringify(orig)) : { id: uid(), elementType: pref('lastElement') || '', location: '', values: {}, photos: [], notes: '', flagManual: false, flagReason: '', consultant: v.consultant, created: new Date().toISOString() };
      var addedPhotos = [], removedPhotos = [];
      setTitle(isNew ? 'New finding' : 'Edit finding', '#visit/' + v.id);

      var groups = {};
      R.elements.forEach(function (el) { (groups[el.group] = groups[el.group] || []).push(el); });
      var sel = '<option value="">Choose an element</option>' + Object.keys(groups).map(function (g) {
        return '<optgroup label="' + esc(g) + '">' + groups[g].map(function (el) { return '<option value="' + el.id + '"' + (el.id === f.elementType ? ' selected' : '') + '>' + esc(el.label) + '</option>'; }).join('') + '</optgroup>';
      }).join('');

      main.innerHTML = '<form id="ff" novalidate>' +
        '<div class="field"><label for="etype">Element (required)</label><select id="etype">' + sel + '</select></div>' +
        '<div class="field"><label for="loc">Location (required)</label><input type="text" id="loc" placeholder="e.g. 2nd floor women\'s restroom, east entrance" value="' + esc(f.location) + '"></div>' +
        '<h3>Photos</h3><div class="row"><label class="btn secondary file-btn">Take photo<input type="file" accept="image/*" capture="environment" id="cam"></label>' +
        '<label class="btn secondary file-btn">Choose photos<input type="file" accept="image/*" multiple id="gal"></label></div>' +
        '<div class="photos" id="photos" aria-live="polite"></div>' +
        '<div id="mfields"></div>' +
        '<div class="field"><label for="fnotes">Notes</label><textarea id="fnotes">' + esc(f.notes) + '</textarea></div>' +
        '<fieldset><legend>Manual review</legend><label class="check"><input type="checkbox" id="flag"' + (f.flagManual ? ' checked' : '') + '> Flag this finding as "Needs manual input"</label>' +
        '<div class="field"><label for="flagr">Reason (optional)</label><input type="text" id="flagr" value="' + esc(f.flagReason) + '"></div></fieldset>' +
        (isNew ? '' : '<button class="btn danger" type="button" id="delF">Delete finding</button>') +
        '<p id="ffErr" class="status-fail" role="alert"></p>' +
        '<div class="sticky-actions"><button class="btn secondary" type="button" id="cancelF">Cancel</button><button class="btn" type="submit">Save finding</button></div></form>';

      function renderFields() {
        var el = E.findElement(R, document.getElementById('etype').value);
        var box = document.getElementById('mfields');
        if (!el) { box.innerHTML = ''; return; }
        var current = readFields(el); // keep anything typed before a re-render
        var vals = Object.assign({}, f.values, current);
        box.innerHTML = el.fields.length ? '<h3>Measurements and checks</h3><p class="help">Fill in what applies. Anything left blank is marked "Needs manual input" in the report.</p>' +
          (el.scopeNote ? '<p class="help">' + esc(el.scopeNote) + '</p>' : '') +
          el.fields.map(function (fl) { return fieldHTML(el, fl, vals[fl.id], v); }).join('') : '<p class="help">Photo and notes only. This finding will be marked "Needs manual input".</p>';
      }
      function renderPhotos() {
        var box = document.getElementById('photos'); box.innerHTML = '';
        f.photos.forEach(function (pid, i) {
          store.getPhoto(pid).then(function (p) {
            if (!p) return;
            var d = document.createElement('div'); d.className = 'photo';
            var url = URL.createObjectURL(p.blob);
            d.innerHTML = '<img alt="Photo ' + (i + 1) + '" src="' + url + '"><button type="button" aria-label="Remove photo ' + (i + 1) + '">&times;</button>';
            d.querySelector('button').onclick = function () { f.photos.splice(f.photos.indexOf(pid), 1); removedPhotos.push(pid); renderPhotos(); toast('Photo removed'); };
            box.appendChild(d);
          });
        });
      }
      function addFiles(files) {
        var list = Array.prototype.slice.call(files || []);
        if (!list.length) return;
        toast('Saving photo' + (list.length > 1 ? 's' : '') + '...');
        // one at a time so photos keep the order they were taken in
        list.reduce(function (chain, file) {
          return chain.then(function () { return compress(file); }).then(function (blob) {
            var p = { id: uid(), visitId: v.id, blob: blob, taken: new Date().toISOString() };
            addedPhotos.push(p.id); f.photos.push(p.id);
            return store.putPhoto(p);
          });
        }, Promise.resolve()).then(function () { renderPhotos(); toast(list.length + ' photo(s) added'); });
      }
      document.getElementById('cam').onchange = function (e) { addFiles(e.target.files); e.target.value = ''; };
      document.getElementById('gal').onchange = function (e) { addFiles(e.target.files); e.target.value = ''; };
      document.getElementById('etype').onchange = function () { pref('lastElement', this.value); renderFields(); };
      document.getElementById('cancelF').onclick = function () {
        Promise.all(addedPhotos.map(store.deletePhoto)).then(function () { go('#visit/' + v.id); });
      };
      if (!isNew) document.getElementById('delF').onclick = function () {
        if (!confirm('Delete this finding and its photos?')) return;
        v.findings = v.findings.filter(function (x) { return x.id !== f.id; });
        Promise.all(f.photos.concat(removedPhotos).map(store.deletePhoto)).then(function () { return store.putVisit(v); }).then(function () { toast('Finding deleted'); go('#visit/' + v.id); });
      };
      document.getElementById('ff').onsubmit = function (e) {
        e.preventDefault();
        var el = E.findElement(R, document.getElementById('etype').value);
        var loc = document.getElementById('loc').value.trim();
        if (!el || !loc) { document.getElementById('ffErr').textContent = 'Choose the element and enter its location.'; document.getElementById(!el ? 'etype' : 'loc').focus(); return; }
        f.elementType = el.id; f.location = loc; f.values = readFields(el);
        f.notes = document.getElementById('fnotes').value.trim();
        f.flagManual = document.getElementById('flag').checked; f.flagReason = document.getElementById('flagr').value.trim();
        f.updated = new Date().toISOString();
        if (isNew) v.findings.push(f); else v.findings = v.findings.map(function (x) { return x.id === f.id ? f : x; });
        Promise.all(removedPhotos.map(store.deletePhoto)).then(function () { return store.putVisit(v); }).then(function () { toast('Finding saved'); go('#visit/' + v.id); });
      };
      renderFields(); renderPhotos(); focusMain();
    });
  }

  // ---------------------------------------------------------------- export
  function sendVisit(v) {
    if (!window.JSZip) { toast('ZIP library missing'); return; }
    if (!(v.findings || []).length) { toast('Add at least one finding first'); return; }
    toast('Packing visit...');
    var zip = new JSZip(), photoDir = zip.folder('photos');
    var out = { format: 'dnem-field-visit', formatVersion: 1, rulesVersion: R.version, exportedAt: new Date().toISOString(), app: 'DNEM Field Capture', visit: {}, findings: [] };
    ['id', 'siteName', 'address', 'client', 'consultant', 'date', 'buildingStatus', 'notes', 'created', 'updated'].forEach(function (k) { out.visit[k] = v[k]; });
    var jobs = [];
    v.findings.forEach(function (f, i) {
      var copy = JSON.parse(JSON.stringify(f)); copy.photos = [];
      f.photos.forEach(function (pid, j) {
        var name = 'F' + String(i + 1).padStart(2, '0') + '_' + (j + 1) + '.jpg';
        copy.photos.push({ file: 'photos/' + name });
        jobs.push(store.getPhoto(pid).then(function (p) { if (p) photoDir.file(name, p.blob); }));
      });
      out.findings.push(copy);
    });
    Promise.all(jobs).then(function () {
      zip.file('visit.json', JSON.stringify(out, null, 2));
      return zip.generateAsync({ type: 'blob', compression: 'STORE' });
    }).then(function (blob) {
      var name = 'DNEM_Field_' + slug(v.siteName) + '_' + (v.date || today()) + '_' + slug(v.consultant) + '.zip';
      var file = new File([blob], name, { type: 'application/zip' });
      var markSent = function (msg) {
        v.exportedAt = new Date().toISOString();
        return store.putVisit(v, true).then(function () { toast(msg); route(); });
      };
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: name })
          .then(function () { return markSent('Sent. Check it arrived in the shared folder.'); })
          .catch(function (err) {
            if (err && err.name === 'AbortError') toast('Not sent');
            else { download(file); markSent('Downloaded. Upload the ZIP to the Google Drive folder.'); }
          });
      } else { download(file); markSent('Downloaded. Upload the ZIP to the Google Drive folder.'); }
    }).catch(function (err) { toast('Could not pack visit: ' + err.message); });
  }
  function download(file) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = file.name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 60000);
  }

  // ---------------------------------------------------------------- router
  function route() {
    var h = location.hash.replace(/^#/, '').split('/');
    if (h[0] === 'new') {
      visitForm({ id: uid(), siteName: '', address: '', client: '', consultant: pref('consultant') || '', date: today(), buildingStatus: 'unknown', notes: '', findings: [], created: new Date().toISOString() }, true);
    } else if (h[0] === 'visit' && h[2] === 'edit') {
      store.getVisit(h[1]).then(function (v) { if (v) visitForm(v, false); else go('#'); });
    } else if (h[0] === 'visit') viewVisit(h[1]);
    else if (h[0] === 'finding') viewFinding(h[1], h[2]);
    else viewHome();
  }
  window.addEventListener('hashchange', route);
  updateNet();
  openDB().then(function () {
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
    route();
  });
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }
})();
