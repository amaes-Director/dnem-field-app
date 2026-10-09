/* DNEM Field Capture - phone app. Plain JavaScript, no build step.
 * Data stays on the phone (IndexedDB) until the consultant taps "Send visit",
 * which packs visit.json + photos into one ZIP and opens the share sheet.
 */
(function () {
  'use strict';
  var APP_VERSION = 'Oct 9 walk update';
  var R = window.DNEM_RULES, E = window.DNEM_ENGINE, W = window.DNEM_WALK;
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
      html += '<p class="help" style="text-align:center">App version ' + APP_VERSION + '</p>';
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
      (isNew ? '' : '<h3>Remove</h3><p><button class="btn danger" type="button" id="delV">Delete this visit from the phone</button></p>') +
      '<div class="sticky-actions"><button class="btn" type="submit">' + (isNew ? 'Start visit' : 'Save') + '</button></div></form>';
    if (!isNew) document.getElementById('delV').onclick = function () {
      var sent = v.exportedAt && v.exportedAt >= v.updated;
      if (confirm((sent ? '' : 'This visit has NOT been sent. ') + 'Delete "' + v.siteName + '" and its photos from this phone?')) store.deleteVisit(v.id).then(function () { toast('Visit deleted'); go('#'); });
    };
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

  // ---------------------------------------------------------------- the walk
  // Visit overview: one big button to carry on, then the stops in walk order.
  function areaFindings(v, areaId) { return (v.findings || []).filter(function (f) { return (f.areaId || '') === areaId; }); }
  function areaStatus(v, areaId) {
    var fs = areaFindings(v, areaId);
    if (!fs.length) return '';
    var st = fs.map(function (f) { return E.evaluateFinding(f, v, R).status; });
    var fail = st.filter(function (s) { return s === 'fail'; }).length, man = st.filter(function (s) { return s === 'manual'; }).length;
    return fs.length + ' recorded' + (fail ? ' · <span class="status-fail">' + fail + ' do not comply</span>' : '') + (man ? ' · <span class="status-manual">' + man + ' need input</span>' : '');
  }
  // Where "Continue" goes: the first stop with nothing recorded and not marked done, else Rooms.
  function nextHash(v, afterId) {
    var areas = W.areas(v), done = v.doneAreas || [];
    if (afterId === undefined) {
      for (var i = 0; i < areas.length; i++) if (done.indexOf(areas[i].id) < 0 && !areaFindings(v, areas[i].id).length) return areas[i].kind === 'room' ? '#area/' + v.id + '/' + areas[i].id : '#area/' + v.id + '/' + areas[i].id;
      return '#rooms/' + v.id;
    }
    var idx = areas.map(function (a) { return a.id; }).indexOf(afterId);
    var nxt = areas[idx + 1];
    if (!nxt || (areas[idx].id === 'entrance')) return '#rooms/' + v.id;
    return '#area/' + v.id + '/' + nxt.id;
  }
  function nextLabel(v, hash) {
    if (hash.indexOf('#rooms/') === 0) return 'Rooms';
    var id = hash.split('/')[2], a = W.areas(v).filter(function (x) { return x.id === id; })[0];
    return a ? a.label : 'Next';
  }
  function markDone(v, areaId) {
    v.doneAreas = v.doneAreas || [];
    if (v.doneAreas.indexOf(areaId) < 0) v.doneAreas.push(areaId);
    return store.putVisit(v);
  }

  function viewVisit(id) {
    store.getVisit(id).then(function (v) {
      if (!v) return go('#');
      setTitle(v.siteName || 'Site visit', '#');
      var nh = nextHash(v);
      var html = '<button class="btn block big" type="button" id="cont">' + (v.findings && v.findings.length ? 'Continue: ' : 'Start: ') + esc(nextLabel(v, nh)) + '</button>' +
        '<h2>' + esc(v.siteName) + '</h2><p class="help">' + esc(v.date) + ' · ' + esc(v.consultant) + '</p><ol class="walk">';
      W.stops.forEach(function (s, i) {
        var done = (v.doneAreas || []).indexOf(s.id) >= 0 || areaFindings(v, s.id).length;
        html += '<li><button type="button" class="card link" data-go="#area/' + v.id + '/' + s.id + '"><strong>' + (i + 1) + '. ' + esc(s.label) + (done ? ' <span aria-label="started">✓</span>' : '') + '</strong><span class="meta">' + (areaStatus(v, s.id) || 'Not started') + '</span></button></li>';
      });
      var rooms = v.rooms || [];
      html += '<li><button type="button" class="card link" data-go="#rooms/' + v.id + '"><strong>4. Rooms</strong><span class="meta">' + rooms.length + ' room' + (rooms.length === 1 ? '' : 's') + ' added</span></button></li></ol>';
      var loose = areaFindings(v, '');
      if (loose.length) html += '<button type="button" class="card link" data-go="#area/' + v.id + '/_none"><strong>Other findings</strong><span class="meta">' + areaStatus(v, '') + '</span></button>';
      html += '<h3>When you are finished</h3><button class="btn block" type="button" id="sendV">Send visit to Google Drive</button>' +
        '<p><a href="#visit/' + v.id + '/edit" class="textlink">Visit details or delete visit</a></p>';
      main.innerHTML = html;
      main.querySelectorAll('[data-go]').forEach(function (b) { b.onclick = function () { go(b.dataset.go); }; });
      document.getElementById('cont').onclick = function () { go(nh); };
      document.getElementById('sendV').onclick = function () { sendVisit(v); };
      focusMain();
    });
  }

  // One stop or room: big Next button, then the element checklist.
  function viewArea(visitId, areaId) {
    store.getVisit(visitId).then(function (v) {
      if (!v) return go('#');
      var area = areaId === '_none' ? { id: '', label: 'Other findings', elements: [], kind: 'none' } : W.areas(v).filter(function (a) { return a.id === areaId; })[0];
      if (!area) return go('#visit/' + v.id);
      var back = area.kind === 'room' ? '#rooms/' + v.id : '#visit/' + v.id;
      setTitle(area.label, back);
      var nh = area.kind === 'none' ? '#visit/' + v.id : nextHash(v, area.id);
      var fs = areaFindings(v, area.id);
      var html = '<button class="btn block big" type="button" id="next">Done here. Next: ' + esc(nextLabel(v, nh)) + '</button>' +
        '<h2>' + esc(area.label) + '</h2>';
      if (area.kind !== 'none') html += '<p class="help">Tap each item you can see here. Skip anything that is not here.</p>';
      html += '<ul class="checklist">';
      area.elements.forEach(function (eid) {
        var n = fs.filter(function (f) { return f.elementType === eid; }).length;
        html += '<li><button type="button" class="card link" data-go="#finding/' + v.id + '/' + (area.id || '_none') + '/new/' + eid + '"><strong>' + esc(elementLabel(eid)) + (n ? ' <span aria-label="recorded">✓</span>' : '') + '</strong><span class="meta">' + (n ? n + ' recorded. Tap to add another.' : 'Tap to record') + '</span></button></li>';
      });
      if (area.kind !== 'none') html += '<li><button type="button" class="card link" data-go="#finding/' + v.id + '/' + area.id + '/new/_pick"><strong>Something else</strong><span class="meta">Any other element, or a photo and note</span></button></li>';
      html += '</ul>';
      if (fs.length) {
        html += '<h3>Recorded here</h3><ul class="checklist">';
        fs.forEach(function (f) {
          var ev = E.evaluateFinding(f, v, R), cls = { fail: 'status-fail', manual: 'status-manual', pass: 'status-pass', na: '' }[ev.status];
          html += '<li><button type="button" class="card link" data-go="#finding/' + v.id + '/' + (area.id || '_none') + '/' + f.id + '"><strong>' + esc(elementLabel(f.elementType)) + '</strong><span class="meta">' + esc(f.location) + ' · ' + (f.photos || []).length + ' photo(s)</span><br><span class="' + cls + '">' + esc(E.STATUS_LABEL[ev.status]) + '</span></button></li>';
        });
        html += '</ul>';
      }
      if (area.kind === 'room') html += '<p><a href="#room/' + v.id + '/' + area.id + '" class="textlink">Rename or remove this room</a></p>';
      main.innerHTML = html;
      main.querySelectorAll('[data-go]').forEach(function (b) { b.onclick = function () { go(b.dataset.go); }; });
      document.getElementById('next').onclick = function () { (area.id ? markDone(v, area.id) : Promise.resolve()).then(function () { go(nh); }); };
      focusMain();
    });
  }

  // Rooms list: add a room at the top, then the rooms in the order added.
  function viewRooms(visitId) {
    store.getVisit(visitId).then(function (v) {
      if (!v) return go('#');
      setTitle('Rooms', '#visit/' + v.id);
      var rooms = v.rooms || [];
      var html = '<button class="btn block big" type="button" id="addRoom">+ Add a room</button><h2>Rooms</h2>';
      if (!rooms.length) html += '<p class="empty">No rooms yet. Add each room as you walk into it.</p>';
      html += '<ul class="checklist">';
      rooms.forEach(function (r) {
        html += '<li><button type="button" class="card link" data-go="#area/' + v.id + '/' + r.id + '"><strong>' + esc(W.roomLabel(r)) + ((v.doneAreas || []).indexOf(r.id) >= 0 ? ' <span aria-label="done">✓</span>' : '') + '</strong><span class="meta">' + (areaStatus(v, r.id) || 'Nothing recorded yet') + '</span></button></li>';
      });
      html += '</ul>';
      if (rooms.length) html += '<h3>When you are finished</h3><button class="btn block" type="button" id="sendV">Send visit to Google Drive</button>';
      main.innerHTML = html;
      main.querySelectorAll('[data-go]').forEach(function (b) { b.onclick = function () { go(b.dataset.go); }; });
      document.getElementById('addRoom').onclick = function () { go('#room/' + v.id + '/new'); };
      if (rooms.length) document.getElementById('sendV').onclick = function () { sendVisit(v); };
      focusMain();
    });
  }

  // Add or rename a room: type, number, and the name the reviewer uses.
  function roomForm(visitId, roomId) {
    store.getVisit(visitId).then(function (v) {
      if (!v) return go('#');
      v.rooms = v.rooms || [];
      var isNew = roomId === 'new';
      var r = isNew ? { id: uid(), type: '', number: '', name: '' } : v.rooms.filter(function (x) { return x.id === roomId; })[0];
      if (!r) return go('#rooms/' + v.id);
      setTitle(isNew ? 'Add a room' : 'Rename room', isNew ? '#rooms/' + v.id : '#area/' + v.id + '/' + r.id);
      var types = W.roomTypes.map(function (t) {
        return '<label class="choice" style="width:100%"><input type="radio" name="rtype" value="' + t.id + '"' + (r.type === t.id ? ' checked' : '') + '> ' + esc(t.label) + '</label>';
      }).join('');
      main.innerHTML = '<form id="rf" novalidate>' +
        '<button class="btn block big" type="submit">' + (isNew ? 'Add room' : 'Save') + '</button>' +
        '<fieldset><legend>Room type (required)</legend><div class="choices">' + types + '</div></fieldset>' +
        '<div class="field"><label for="rnum">Number (optional)</label><input type="text" id="rnum" placeholder="e.g. 2 or 104" value="' + esc(r.number) + '"></div>' +
        '<div class="field"><label for="rname">Name (optional)</label><input type="text" id="rname" placeholder="e.g. Board of Directors meeting room" value="' + esc(r.name) + '"></div>' +
        '<p class="help" id="rprev"></p><p id="rfErr" class="status-fail" role="alert"></p>' +
        (isNew ? '' : '<p><button class="btn danger" type="button" id="delR">Remove this room</button></p>') + '</form>';
      function preview() {
        var t = main.querySelector('input[name=rtype]:checked');
        document.getElementById('rprev').textContent = t ? 'Shown as: ' + W.roomLabel({ type: t.value, number: document.getElementById('rnum').value.trim(), name: document.getElementById('rname').value.trim() }) : '';
      }
      main.querySelectorAll('input').forEach(function (i) { i.addEventListener('input', preview); i.addEventListener('change', preview); });
      preview();
      document.getElementById('rf').onsubmit = function (e) {
        e.preventDefault();
        var t = main.querySelector('input[name=rtype]:checked');
        if (!t) { document.getElementById('rfErr').textContent = 'Choose the room type.'; main.querySelector('input[name=rtype]').focus(); return; }
        r.type = t.value; r.number = document.getElementById('rnum').value.trim(); r.name = document.getElementById('rname').value.trim();
        if (isNew) v.rooms.push(r);
        store.putVisit(v).then(function () { go('#area/' + v.id + '/' + r.id); });
      };
      if (!isNew) document.getElementById('delR').onclick = function () {
        var n = areaFindings(v, r.id).length;
        if (!confirm('Remove ' + W.roomLabel(r) + (n ? ' and its ' + n + ' finding(s)' : '') + '?')) return;
        var gone = areaFindings(v, r.id);
        v.findings = (v.findings || []).filter(function (f) { return f.areaId !== r.id; });
        v.rooms = v.rooms.filter(function (x) { return x.id !== r.id; });
        Promise.all([].concat.apply([], gone.map(function (f) { return f.photos; })).map(store.deletePhoto)).then(function () { return store.putVisit(v); }).then(function () { toast('Room removed'); go('#rooms/' + v.id); });
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

  function viewFinding(visitId, areaKey, findingId, presetElement) {
    store.getVisit(visitId).then(function (v) {
      if (!v) return go('#');
      v.findings = v.findings || [];
      var isNew = findingId === 'new';
      var orig = isNew ? null : v.findings.filter(function (f) { return f.id === findingId; })[0];
      var areaId = areaKey === '_none' ? '' : areaKey;
      var area = W.areas(v).filter(function (a) { return a.id === areaId; })[0];
      var backTo = '#area/' + v.id + '/' + (areaId || '_none');
      if (!isNew && !orig) return go(backTo);
      var preset = presetElement && presetElement !== '_pick' ? presetElement : '';
      var f = orig ? JSON.parse(JSON.stringify(orig)) : { id: uid(), areaId: areaId, elementType: preset, location: area ? area.label : '', values: {}, photos: [], notes: '', flagManual: false, flagReason: '', consultant: v.consultant, created: new Date().toISOString() };
      var addedPhotos = [], removedPhotos = [];
      var lockedType = !!(f.elementType && (preset || !isNew));
      setTitle(lockedType ? elementLabel(f.elementType) : 'Something else', backTo);

      var groups = {};
      R.elements.forEach(function (el) { (groups[el.group] = groups[el.group] || []).push(el); });
      var sel = '<option value="">Choose an element</option>' + Object.keys(groups).map(function (g) {
        return '<optgroup label="' + esc(g) + '">' + groups[g].map(function (el) { return '<option value="' + el.id + '"' + (el.id === f.elementType ? ' selected' : '') + '>' + esc(el.label) + '</option>'; }).join('') + '</optgroup>';
      }).join('');

      main.innerHTML = '<form id="ff" novalidate>' +
        (lockedType ? '<h2>' + esc(elementLabel(f.elementType)) + '</h2><input type="hidden" id="etype" value="' + esc(f.elementType) + '">'
          : '<div class="field"><label for="etype">Element (required)</label><select id="etype">' + sel + '</select></div>') +
        '<div class="field"><label for="loc">Where is it? (required)</label><input type="text" id="loc" placeholder="e.g. north lot, space 3" value="' + esc(f.location) + '"></div>' +
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
      if (!lockedType) document.getElementById('etype').onchange = renderFields;
      document.getElementById('cancelF').onclick = function () {
        Promise.all(addedPhotos.map(store.deletePhoto)).then(function () { go(backTo); });
      };
      if (!isNew) document.getElementById('delF').onclick = function () {
        if (!confirm('Delete this finding and its photos?')) return;
        v.findings = v.findings.filter(function (x) { return x.id !== f.id; });
        Promise.all(f.photos.concat(removedPhotos).map(store.deletePhoto)).then(function () { return store.putVisit(v); }).then(function () { toast('Finding deleted'); go(backTo); });
      };
      document.getElementById('ff').onsubmit = function (e) {
        e.preventDefault();
        var el = E.findElement(R, document.getElementById('etype').value);
        var loc = document.getElementById('loc').value.trim();
        if (!el || !loc) { document.getElementById('ffErr').textContent = !el ? 'Choose the element.' : 'Enter where this is.'; document.getElementById(!el ? 'etype' : 'loc').focus(); return; }
        f.elementType = el.id; f.location = loc; f.values = readFields(el);
        f.notes = document.getElementById('fnotes').value.trim();
        f.flagManual = document.getElementById('flag').checked; f.flagReason = document.getElementById('flagr').value.trim();
        f.updated = new Date().toISOString();
        if (isNew) v.findings.push(f); else v.findings = v.findings.map(function (x) { return x.id === f.id ? f : x; });
        Promise.all(removedPhotos.map(store.deletePhoto)).then(function () { return store.putVisit(v); }).then(function () { toast('Finding saved'); go(backTo); });
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
    var out = { format: 'dnem-field-visit', formatVersion: 2, rulesVersion: R.version, exportedAt: new Date().toISOString(), app: 'DNEM Field Capture', visit: {}, findings: [] };
    ['id', 'siteName', 'address', 'client', 'consultant', 'date', 'buildingStatus', 'notes', 'created', 'updated', 'rooms', 'doneAreas'].forEach(function (k) { out.visit[k] = v[k]; });
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
      visitForm({ id: uid(), siteName: '', address: '', client: '', consultant: pref('consultant') || '', date: today(), buildingStatus: 'unknown', notes: '', rooms: [], doneAreas: [], findings: [], created: new Date().toISOString() }, true);
    } else if (h[0] === 'visit' && h[2] === 'edit') {
      store.getVisit(h[1]).then(function (v) { if (v) visitForm(v, false); else go('#'); });
    } else if (h[0] === 'visit') viewVisit(h[1]);
    else if (h[0] === 'area') viewArea(h[1], h[2]);
    else if (h[0] === 'rooms') viewRooms(h[1]);
    else if (h[0] === 'room') roomForm(h[1], h[2]);
    else if (h[0] === 'finding') viewFinding(h[1], h[2], h[3], h[4]);
    else viewHome();
  }
  window.addEventListener('hashchange', route);
  updateNet();
  openDB().then(function () {
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
    route();
  });
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(function () {});
  }
})();
