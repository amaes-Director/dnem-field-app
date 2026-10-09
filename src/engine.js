/* DNEM ADA Lens - checking engine.
 * evaluateFinding(finding, visit, rules) -> { results: [...], status }
 * Each result: { checkId, label, status: pass|fail|manual|na, measured, required, cite, reason, verify, note }
 */
(function (root) {
  var STATUS_LABEL = { pass: 'Complies', fail: 'Does not comply', manual: 'Needs manual input', na: 'Not applicable' };

  // ---- units ---------------------------------------------------------------
  // Accepts 32, 32.5, 32,5, "32 1/2", "32-1/2", "1/2"
  function parseNum(raw) {
    var t = String(raw).trim().replace(',', '.');
    var m = t.match(/^(\d+(?:\.\d+)?)?(?:[\s-]+)?(?:(\d+)\/(\d+))?$/);
    if (!m || (!m[1] && !m[2])) return parseFloat(t);
    var v = m[1] ? parseFloat(m[1]) : 0;
    if (m[2] && +m[3]) v += (+m[2]) / (+m[3]);
    return v;
  }
  function toBase(type, m) {
    if (!m || m.na || m.value === '' || m.value === null || m.value === undefined) return null;
    var v = typeof m.value === 'number' ? m.value : parseNum(m.value);
    if (isNaN(v)) return null;
    if (type === 'len' && m.unit === 'cm') return v / 2.54;
    if (type === 'len' && m.unit === 'mm') return v / 25.4;
    if (type === 'slope' && m.unit === 'deg') return Math.tan(v * Math.PI / 180) * 100;
    if (type === 'force' && m.unit === 'N') return v / 4.448;
    return v;
  }
  function round(v, d) { var p = Math.pow(10, d); return Math.round(v * p) / p; }
  function slopeRatio(pct) { return pct > 0 ? '1:' + round(100 / pct, 1) : 'level'; }
  var UNIT = { len: 'in', slope: '%', force: 'lbf', time: 'sec', count: '' };
  function fmt(type, v) {
    if (v === null || v === undefined) return '';
    if (type === 'slope') return round(v, 2) + '% (' + slopeRatio(v) + ')';
    if (type === 'count') return String(v);
    return round(v, 2) + ' ' + UNIT[type];
  }
  function fmtMeasured(field, m) {
    if (!m) return 'Not recorded';
    if (m.na) return 'N/A';
    var base = toBase(field.type, m);
    if (base === null) return 'Not recorded';
    var s = fmt(field.type, base);
    if (m.unit && m.unit !== UNIT[field.type] && field.type !== 'count') s += ' [entered ' + m.value + ' ' + m.unit + ']';
    return s;
  }
  function fmtBool(v) { return v === true ? 'Yes' : v === false ? 'No' : 'Not recorded'; }

  // ---- helpers ---------------------------------------------------------------
  function fieldOf(el, id) { for (var i = 0; i < el.fields.length; i++) if (el.fields[i].id === id) return el.fields[i]; return null; }
  function rawVal(finding, el, id) {
    var f = fieldOf(el, id); var m = (finding.values || {})[id];
    if (!f) return { missing: true };
    if (m && m.na) return { na: true };
    if (f.type === 'bool') return (m && typeof m.value === 'boolean') ? { v: m.value } : { missing: true };
    if (f.type === 'choice') return (m && m.value) ? { v: m.value } : { missing: true };
    var b = toBase(f.type, m); return b === null ? { missing: true } : { v: b };
  }

  // Returns 'yes' | 'no' | 'unknown'
  function conditionMet(when, finding, el) {
    if (!when) return 'yes';
    var unknown = false;
    for (var k in when) {
      var r = rawVal(finding, el, k);
      if (r.na) return 'no';
      if (r.missing) { unknown = true; continue; }
      var c = when[k];
      if (c !== null && typeof c === 'object') {
        if (c.gt !== undefined && !(r.v > c.gt)) return 'no';
        if (c.lt !== undefined && !(r.v < c.lt)) return 'no';
      } else if (r.v !== c) return 'no';
    }
    return unknown ? 'unknown' : 'yes';
  }
  function describeWhen(when, el) {
    return Object.keys(when).map(function (k) { var f = fieldOf(el, k); return f ? f.label : k; }).join('; ');
  }

  // Which code sides are in force for this visit. Michigan "new building" values switch on building status.
  function sides(check, visit) {
    var out = [];
    if (check.ada) out.push({ key: 'ada', s: check.ada });
    if (check.mi) {
      var s = check.mi;
      if (s.newBuilding) {
        var st = (visit && visit.buildingStatus) || 'unknown';
        if (st === 'new') out.push({ key: 'mi', s: s });
        else if (st === 'existing') out.push({ key: 'mi', s: Object.assign({}, s, { min: s.elseMin !== undefined ? s.elseMin : s.min, max: s.elseMax !== undefined ? s.elseMax : s.max, newBuilding: false }) });
        else out.push({ key: 'mi', s: s, statusUnknown: true });
      } else out.push({ key: 'mi', s: s });
    }
    return out;
  }
  function citeJoin(list) {
    if (list.length === 2) return list[0].s.cite + '; ' + list[1].s.cite + ' (same requirement)';
    return list.map(function (x) { return x.s.cite; }).join('; ');
  }
  function anyVerify(list) { return list.some(function (x) { return x.s.verify; }); }

  // ---- numeric and yes/no checks --------------------------------------------------
  function numericCheck(check, field, finding, visit, el) {
    var m = (finding.values || {})[check.field];
    var r = rawVal(finding, el, check.field);
    var sd = sides(check, visit);
    // effective (stricter) limits using only sides with known applicability
    var known = sd.filter(function (x) { return !x.statusUnknown; });
    var effMin = null, effMax = null;
    known.forEach(function (x) {
      if (x.s.min !== undefined && (effMin === null || x.s.min > effMin)) effMin = x.s.min;
      if (x.s.max !== undefined && (effMax === null || x.s.max < effMax)) effMax = x.s.max;
    });
    var binding = known.filter(function (x) {
      return (x.s.min !== undefined && x.s.min === effMin) || (x.s.max !== undefined && x.s.max === effMax);
    });
    var req = [];
    if (effMin !== null && effMax !== null) req.push(fmt(field.type, effMin) + ' to ' + fmt(field.type, effMax));
    else if (effMin !== null) req.push(fmt(field.type, effMin) + ' min');
    else if (effMax !== null) req.push(fmt(field.type, effMax) + ' max');
    var res = {
      measured: fmtMeasured(field, m), required: req.join(''), cite: citeJoin(binding.length ? binding : known),
      verify: anyVerify(binding.length ? binding : known)
    };
    if (r.na) return Object.assign(res, { status: 'na', reason: 'Marked not applicable by the consultant.' });
    if (r.missing) return Object.assign(res, { status: 'manual', reason: 'Measurement not recorded.' });
    var v = r.v;
    var ok = (effMin === null || v >= effMin - 1e-9) && (effMax === null || v <= effMax + 1e-9);
    if (!ok) return Object.assign(res, { status: 'fail' });
    // Michigan side that depends on building status
    var pend = sd.filter(function (x) { return x.statusUnknown; });
    for (var i = 0; i < pend.length; i++) {
      var s = pend[i].s;
      var okNew = (s.min === undefined || v >= s.min) && (s.max === undefined || v <= s.max);
      if (!okNew) {
        return Object.assign(res, {
          status: 'manual', cite: res.cite + '; ' + s.cite, verify: true,
          required: res.required + ' (' + fmt(field.type, s.min !== undefined ? s.min : s.max) + (s.min !== undefined ? ' min' : ' max') + ' if new building)',
          reason: 'Meets the existing-building requirement but not the 2021 Michigan new-building requirement. Confirm the building status (permit date).'
        });
      }
    }
    return Object.assign(res, { status: 'pass' });
  }

  function boolCheck(check, field, finding, visit, el) {
    var r = rawVal(finding, el, check.field);
    var sd = sides(check, visit);
    var expect = sd[0].s.expect;
    var res = { measured: r.na ? 'N/A' : fmtBool(r.v), required: expect ? 'Yes' : 'No', cite: citeJoin(sd), verify: anyVerify(sd) };
    if (r.na) return Object.assign(res, { status: 'na', reason: 'Marked not applicable by the consultant.' });
    if (r.missing) return Object.assign(res, { status: 'manual', reason: 'Not answered.' });
    return Object.assign(res, { status: r.v === expect ? 'pass' : 'fail' });
  }

  // ---- special checks -------------------------------------------------------
  function table208(total) {
    if (total <= 0) return 0;
    if (total <= 25) return 1; if (total <= 50) return 2; if (total <= 75) return 3; if (total <= 100) return 4;
    if (total <= 150) return 5; if (total <= 200) return 6; if (total <= 300) return 7; if (total <= 400) return 8;
    if (total <= 500) return 9; if (total <= 1000) return Math.ceil(total * 0.02);
    return 20 + Math.ceil((total - 1000) / 100);
  }
  var SPECIAL = {
    parkingCount: function (check, finding, visit, el) {
      var t = rawVal(finding, el, 'total'), a = rawVal(finding, el, 'accessible'), med = rawVal(finding, el, 'medical');
      var res = { cite: citeJoin(sides(check, visit)), verify: true };
      if (t.missing || a.missing) return Object.assign(res, { status: 'manual', measured: 'Not recorded', required: '', reason: 'Total or accessible space count not recorded.' });
      var need = table208(t.v);
      res.measured = a.v + ' accessible of ' + t.v + ' total';
      res.required = need + ' min';
      if (med.v === true) return Object.assign(res, { status: 'manual', reason: 'Medical or rehabilitation facility: confirm the 10% or 20% requirement applies to the spaces serving that use.' });
      return Object.assign(res, { status: a.v >= need ? 'pass' : 'fail' });
    },
    vanCount: function (check, finding, visit, el) {
      var a = rawVal(finding, el, 'accessible'), van = rawVal(finding, el, 'van');
      var res = { cite: citeJoin(sides(check, visit)), verify: true };
      if (a.missing || van.missing) return Object.assign(res, { status: 'manual', measured: 'Not recorded', required: '', reason: 'Accessible or van space count not recorded.' });
      var need = Math.ceil(a.v / 6);
      return Object.assign(res, { measured: van.v + ' van of ' + a.v + ' accessible', required: need + ' min', status: van.v >= need ? 'pass' : 'fail' });
    },
    vanDims: function (check, finding, visit, el) {
      var s = rawVal(finding, el, 'space_width'), a = rawVal(finding, el, 'aisle_width');
      var res = { cite: citeJoin(sides(check, visit)), verify: anyVerify(sides(check, visit)), required: '132 in space + 60 in aisle, or 96 in + 96 in' };
      if (s.missing || a.missing) return Object.assign(res, { status: 'manual', measured: 'Not recorded', reason: 'Space or aisle width not recorded.' });
      res.measured = 'Space ' + round(s.v, 2) + ' in, aisle ' + round(a.v, 2) + ' in';
      var ok = (s.v >= 132 && a.v >= 60) || (s.v >= 96 && a.v >= 96);
      return Object.assign(res, { status: ok ? 'pass' : 'fail' });
    },
    levelChange: function (check, finding, visit, el) {
      var h = rawVal(finding, el, 'level_change'), b = rawVal(finding, el, 'beveled');
      var res = { cite: citeJoin(sides(check, visit)), verify: anyVerify(sides(check, visit)), required: '1/4 in max vertical, or 1/2 in max with 1:2 bevel' };
      if (h.na) return Object.assign(res, { status: 'na', measured: 'N/A', reason: 'No change in level.' });
      if (h.missing) return Object.assign(res, { status: 'manual', measured: 'Not recorded', reason: 'Change in level not recorded.' });
      res.measured = round(h.v, 3) + ' in' + (b.v === true ? ', beveled' : b.v === false ? ', not beveled' : '');
      if (h.v <= 0.25) return Object.assign(res, { status: 'pass' });
      if (h.v > 0.5) return Object.assign(res, { status: 'fail', reason: 'Over 1/2 in must be ramped (ADA 303.4).' });
      if (b.missing) return Object.assign(res, { status: 'manual', reason: 'Between 1/4 and 1/2 in: bevel not recorded.' });
      return Object.assign(res, { status: b.v ? 'pass' : 'fail' });
    }
  };

  // ---- main -------------------------------------------------------------------
  function findElement(rules, id) { for (var i = 0; i < rules.elements.length; i++) if (rules.elements[i].id === id) return rules.elements[i]; return null; }

  function evaluateFinding(finding, visit, rules) {
    var el = findElement(rules, finding.elementType);
    if (!el) return { results: [{ label: 'Unknown element type "' + finding.elementType + '"', status: 'manual', reason: 'Element type not in rules table.' }], status: 'manual' };
    var results = el.checks.map(function (check) {
      var base = { checkId: check.id, label: check.label, note: check.note || '' };
      var cond = conditionMet(check.when, finding, el);
      var sd = sides(check, visit);
      if (cond === 'no') return Object.assign(base, { status: 'na', measured: '', required: '', cite: citeJoin(sd), reason: 'Does not apply to this element.' });
      if (cond === 'unknown') return Object.assign(base, { status: 'manual', measured: '', required: '', cite: citeJoin(sd), verify: anyVerify(sd), reason: 'Cannot tell whether this applies: ' + describeWhen(check.when, el) + ' not recorded.' });
      var r;
      if (check.kind === 'manual') r = { status: 'manual', measured: 'See photos and notes', required: 'See citation', cite: citeJoin(sd), verify: anyVerify(sd), reason: 'Requires consultant judgment.' };
      else if (check.kind && SPECIAL[check.kind]) r = SPECIAL[check.kind](check, finding, visit, el);
      else {
        var f = fieldOf(el, check.field);
        r = f.type === 'bool' ? boolCheck(check, f, finding, visit, el) : numericCheck(check, f, finding, visit, el);
      }
      return Object.assign(base, r);
    });
    if (finding.flagManual) results.push({ checkId: 'consultant-flag', label: 'Consultant flagged this finding for review', status: 'manual', measured: '', required: '', cite: '', reason: finding.flagReason || 'See consultant notes.' });
    var status = results.some(function (r) { return r.status === 'fail'; }) ? 'fail'
      : results.some(function (r) { return r.status === 'manual'; }) ? 'manual'
      : results.some(function (r) { return r.status === 'pass'; }) ? 'pass' : 'na';
    return { element: el, results: results, status: status };
  }

  // Effective requirement hint for the phone app (stricter of the two, assuming the visit's building status).
  function hintFor(el, fieldId, visit) {
    var hints = [];
    el.checks.forEach(function (c) {
      if (c.field !== fieldId || c.kind) return;
      var sd = sides(c, visit).filter(function (x) { return !x.statusUnknown; });
      var mn = null, mx = null, ex;
      sd.forEach(function (x) { if (x.s.min !== undefined && (mn === null || x.s.min > mn)) mn = x.s.min; if (x.s.max !== undefined && (mx === null || x.s.max < mx)) mx = x.s.max; if (x.s.expect !== undefined) ex = x.s.expect; });
      var f = fieldOf(el, fieldId);
      if (ex !== undefined) hints.push('Should be ' + (ex ? 'Yes' : 'No'));
      else if (mn !== null && mx !== null) hints.push(fmt(f.type, mn) + ' to ' + fmt(f.type, mx));
      else if (mn !== null) hints.push(fmt(f.type, mn) + ' min');
      else if (mx !== null) hints.push(fmt(f.type, mx) + ' max');
    });
    return hints.filter(function (h, i) { return hints.indexOf(h) === i; }).join(' · ');
  }

  var API = { evaluateFinding: evaluateFinding, hintFor: hintFor, STATUS_LABEL: STATUS_LABEL, findElement: findElement, fieldOf: fieldOf, fmtMeasured: fmtMeasured, table208: table208 };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.DNEM_ENGINE = API;
})(this);
