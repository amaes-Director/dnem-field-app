/* DNEM ADA Lens Report Builder - turns visit ZIPs from the phone app into a Word report.
 * Runs in the browser (single HTML file) and in Node (for testing): buildReport(deps, visits, opts) -> docx.Document
 * visits: [{ data: <visit.json>, photos: { 'photos/F01_1.jpg': { bytes: Uint8Array, width, height } } }]
 */
(function (root) {
  // Same palette and type as the DNEM Access Lens reports (layout.py): Calibri, 14 pt minimum.
  var BLUE = '0758B5', TINT = 'E7EFF9', INK = '17263A', MUTED = '485668', LINE = 'CBD7E5';
  var APP_NAME = 'DNEM ADA Lens';
  var RESULT_FILL = { fail: 'FBE3E4', manual: 'FFF1CC', pass: 'E3F1E6', na: 'F2F2F2' };
  var RESULT_TEXT = { fail: 'A4161A', manual: '6B4300', pass: '1E6B2E', na: '4A4A4A' };
  var ORDER = { fail: 0, manual: 1, pass: 2, na: 3 };

  function buildReport(deps, visits, opts) {
    var d = deps.docx, R = deps.rules, E = deps.engine, W = deps.walk;
    opts = opts || {};
    var P = d.Paragraph, T = d.TextRun;

    // ---- evaluate everything --------------------------------------------------
    var items = []; // one per finding
    visits.forEach(function (vz, vi) {
      var v = vz.data.visit;
      (vz.data.findings || []).forEach(function (f) {
        var ev = E.evaluateFinding(f, v, R);
        items.push({ visit: v, visitIndex: vi, finding: f, ev: ev, photos: (f.photos || []).map(function (p) { return vz.photos[p.file]; }).filter(Boolean) });
      });
    });
    // ---- walk order: Parking, Route, Entrance, then each visit's rooms, then anything unassigned
    var multiSite = uniq(visits.map(function (z) { return z.data.visit.siteName; })).length > 1;
    var groups = W.stops.map(function (st) { return { key: 'stop:' + st.id, label: st.label, kind: 'stop', items: [] }; });
    visits.forEach(function (vz, vi) {
      (vz.data.visit.rooms || []).forEach(function (r) {
        groups.push({ key: vi + ':' + r.id, label: W.roomLabel(r) + (multiSite ? ' (' + vz.data.visit.siteName + ')' : ''), kind: 'room', items: [] });
      });
    });
    var other = { key: 'other', label: 'Other findings', kind: 'other', items: [] };
    groups.push(other);
    var gIndex = {}; groups.forEach(function (g, i) { gIndex[g.key] = i; });
    items.forEach(function (it, i) {
      var a = it.finding.areaId || '';
      var key = W.stops.some(function (st) { return st.id === a; }) ? 'stop:' + a : (gIndex[it.visitIndex + ':' + a] !== undefined ? it.visitIndex + ':' + a : 'other');
      it.group = groups[gIndex[key]]; it.seq = i;
    });
    items.sort(function (a, b) { return gIndex[a.group.key] - gIndex[b.group.key] || a.visitIndex - b.visitIndex || a.seq - b.seq; });
    items.forEach(function (it, i) { it.no = i + 1; it.group.items.push(it); });

    var sites = uniq(visits.map(function (z) { return z.data.visit.siteName; }));
    var consultants = uniq(visits.map(function (z) { return z.data.visit.consultant; }).concat(items.map(function (it) { return it.finding.consultant; })));
    var dates = uniq(visits.map(function (z) { return z.data.visit.date; })).sort();
    var statuses = uniq(visits.map(function (z) { return statusLabel(R, z.data.visit.buildingStatus); }));
    var first = visits[0].data.visit;

    // ---- small builders --------------------------------------------------------
    function txt(s, o) { return new T(Object.assign({ text: String(s == null ? '' : s) }, o || {})); }
    function para(s, o) { return new P(Object.assign({ children: Array.isArray(s) ? s : [txt(s)], spacing: { after: 120 } }, o || {})); }
    function h(level, s) { return new P({ text: s, heading: level, keepNext: true }); }
    function small(s) { return new P({ children: [txt(s, { color: MUTED })], spacing: { after: 120 } }); }
    function bullet(runs) { return new P({ children: Array.isArray(runs) ? runs : [txt(runs)], bullet: { level: 0 }, spacing: { after: 60 } }); }
    function cell(content, o) {
      o = o || {};
      var kids = (Array.isArray(content) ? content : [content]).map(function (c) {
        return c instanceof P ? c : new P({ children: [txt(c, { bold: o.bold, color: o.color, size: 28 })], spacing: { after: 0 } });
      });
      return new d.TableCell({ children: kids, shading: o.fill ? { type: d.ShadingType.CLEAR, color: 'auto', fill: o.fill } : undefined,
        margins: { top: 60, bottom: 60, left: 90, right: 90 }, width: o.width ? { size: o.width, type: d.WidthType.PERCENTAGE } : undefined });
    }
    function headRow(labels, widths) {
      return new d.TableRow({ tableHeader: true, cantSplit: true, children: labels.map(function (l, i) { return cell(l, { bold: true, color: 'FFFFFF', fill: BLUE, width: widths && widths[i] }); }) });
    }
    function table(rows) {
      return new d.Table({ rows: rows, width: { size: 100, type: d.WidthType.PERCENTAGE }, layout: d.TableLayoutType.AUTOFIT,
        borders: { top: border(), bottom: border(), left: border(), right: border(), insideHorizontal: border(), insideVertical: border() } });
    }
    function border() { return { style: d.BorderStyle.SINGLE, size: 4, color: LINE }; }
    function kv(rows) {
      return table(rows.map(function (r) { return new d.TableRow({ cantSplit: true, children: [cell(r[0], { bold: true, fill: TINT, width: 28 }), cell(r[1], { width: 72 })] }); }));
    }
    function resultCell(status, extra) {
      var kids = [new P({ children: [txt(E.STATUS_LABEL[status], { bold: true, color: RESULT_TEXT[status], size: 28 })], spacing: { after: 0 } })];
      if (extra) kids.push(new P({ children: [txt(extra, { size: 28, color: INK })], spacing: { after: 0 } }));
      return new d.TableCell({ children: kids, shading: { type: d.ShadingType.CLEAR, color: 'auto', fill: RESULT_FILL[status] }, margins: { top: 60, bottom: 60, left: 90, right: 90 }, width: { size: 20, type: d.WidthType.PERCENTAGE } });
    }
    function citeText(r) { return (r.cite || '') + (r.verify ? ' †' : ''); }

    // ---- counts ---------------------------------------------------------------
    var count = { fail: 0, manual: 0, pass: 0, na: 0 };
    items.forEach(function (it) { count[it.ev.status]++; });

    var children = [];
    // ---- title page -------------------------------------------------------------
    if (opts.logo) children.push(new P({ children: [new d.ImageRun({ type: 'png', data: opts.logo, transformation: { width: 240, height: 90 },
      altText: { name: 'DNEM logo', title: 'Disability Network Eastern Michigan', description: 'Disability Network Eastern Michigan logo' } })], spacing: { after: 160 } }));
    children.push(new P({ text: opts.title || 'Facility Accessibility Field Evaluation', heading: d.HeadingLevel.TITLE }));
    children.push(new P({ children: [txt(sites.join('; '), { size: 36, color: MUTED })], spacing: { after: 240 } }));
    children.push(kv([
      ['Site', sites.join('; ')],
      ['Address', uniq(visits.map(function (z) { return z.data.visit.address; })).join('; ') || 'Not recorded'],
      ['Client', uniq(visits.map(function (z) { return z.data.visit.client; })).join('; ') || 'Not recorded'],
      ['Visit date(s)', dates.join(', ')],
      ['Field consultant(s)', consultants.join(', ')],
      ['Building status', statuses.join('; ')],
      ['Standards applied', R.codes.ada.name + '; ' + R.codes.mi.name],
      ['Prepared by', opts.preparedBy || 'Disability Network Eastern Michigan (DNEM)'],
      ['Report generated', new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) + ' (rules table ' + R.version + ')']
    ]));

    // ---- 1. summary ---------------------------------------------------------------
    children.push(h(d.HeadingLevel.HEADING_1, '1. Summary'));
    children.push(para(items.length + ' finding(s) were recorded at ' + sites.length + ' site(s). ' +
      count.fail + ' do not comply with at least one requirement, ' + count.manual + ' need manual input before a determination can be made, and ' +
      count.pass + ' comply with every requirement that was measured.'));
    var sumRows = [headRow(['Area (in walk order)', 'Findings', 'Does not comply', 'Needs manual input', 'Complies'])];
    groups.forEach(function (g) {
      if (g.kind === 'other' && !g.items.length) return;
      var b = { fail: 0, manual: 0, pass: 0, na: 0 };
      g.items.forEach(function (it) { b[it.ev.status]++; });
      sumRows.push(new d.TableRow({ cantSplit: true, children: [cell(g.label), cell(String(g.items.length)), cell(String(b.fail)), cell(String(b.manual)), cell(String(b.pass + b.na))] }));
    });
    sumRows.push(new d.TableRow({ cantSplit: true, children: [cell('Total', { bold: true, fill: TINT }), cell(String(items.length), { bold: true, fill: TINT }), cell(String(count.fail), { bold: true, fill: TINT }), cell(String(count.manual), { bold: true, fill: TINT }), cell(String(count.pass + count.na), { bold: true, fill: TINT })] }));
    children.push(table(sumRows));

    children.push(h(d.HeadingLevel.HEADING_2, 'How to read this report'));
    children.push(bullet([txt('Order. ', { bold: true }), txt('Findings follow the order the site was walked: parking, the route to the entrance, the entrance, then each room. Finding numbers follow the same order.')]));
    children.push(bullet([txt('Which code governs. ', { bold: true }), txt('Each measurement is compared with the 2010 ADA Standards and with the Michigan barrier-free requirements (2021 Michigan Building Code, which adopts ICC A117.1-2017). Where both set a limit, the stricter one is used and cited. When the two match, both are cited with "(same requirement)".')]));
    children.push(bullet([txt('Results. ', { bold: true }), txt('"Does not comply" means a recorded measurement or answer falls outside the stricter requirement. "Complies" means every recorded value meets it. "Needs manual input" means the tool could not decide: a value was not recorded, the requirement depends on something not captured (such as the building\'s permit date), or the item needs a consultant\'s judgment.')]));
    children.push(bullet([txt('Citations marked †. ', { bold: true }), txt('These citations have not yet been checked against the printed code text. They are listed in Appendix A for confirmation before the report is issued.')]));
    children.push(bullet([txt('Measurements. ', { bold: true }), txt('Values are shown in inches, percent slope (with the ratio), pounds-force or seconds. Values entered in other units are converted and the original entry is shown in brackets. Dimensions are subject to conventional industry tolerances (ADA 104.1.1).')]));

    // ---- 2. problems to fix, then findings in walk order --------------------------------
    var sec = 2;
    var fails = [];
    items.forEach(function (it) {
      it.ev.results.forEach(function (r) { if (r.status === 'fail') fails.push([String(it.no), it.group.label, it.ev.element ? it.ev.element.label : it.finding.elementType, r.label, r.measured || '', r.required || '']); });
    });
    children.push(h(d.HeadingLevel.HEADING_1, (sec++) + '. Problems to Fix'));
    if (fails.length) {
      children.push(para(fails.length + ' requirement(s) were not met, listed in the order the site was walked. Details and photos follow under each area.'));
      children.push(table([headRow(['Finding', 'Area', 'Element', 'Requirement not met', 'Measured', 'Required'], [9, 20, 17, 24, 15, 15])].concat(fails.map(function (r) {
        return new d.TableRow({ cantSplit: true, children: r.map(function (c) { return cell(c); }) });
      }))));
    } else children.push(para('No recorded measurement or answer failed a requirement.'));

    function groupBody(g, level) {
      if (!g.items.length) { children.push(small('Nothing was recorded here.')); return; }
      g.items.forEach(function (it) { findingBlock(it, level).forEach(function (c) { children.push(c); }); });
    }
    groups.forEach(function (g) {
      if (g.kind !== 'stop') return;
      children.push(h(d.HeadingLevel.HEADING_1, (sec++) + '. ' + g.label));
      groupBody(g, d.HeadingLevel.HEADING_2);
    });
    var roomGroups = groups.filter(function (g) { return g.kind === 'room'; });
    children.push(h(d.HeadingLevel.HEADING_1, (sec++) + '. Rooms'));
    if (!roomGroups.length) children.push(small('No rooms were recorded.'));
    roomGroups.forEach(function (g) {
      children.push(h(d.HeadingLevel.HEADING_2, g.label));
      groupBody(g, d.HeadingLevel.HEADING_3);
    });
    if (other.items.length) {
      children.push(h(d.HeadingLevel.HEADING_1, (sec++) + '. Other Findings'));
      groupBody(other, d.HeadingLevel.HEADING_2);
    }

    function findingBlock(it, level) {
      var f = it.finding, out = [];
      var elLabel = it.ev.element ? it.ev.element.label : f.elementType;
      out.push(h(level, 'Finding ' + it.no + ' - ' + elLabel + (f.location && f.location !== it.group.label ? ' - ' + f.location : '')));
      out.push(small('Site: ' + it.visit.siteName + '. Recorded by ' + (f.consultant || it.visit.consultant) + ' on ' + (it.visit.date || '') + '. Overall result: ' + E.STATUS_LABEL[it.ev.status] + '.'));
      var shown = it.ev.results.filter(function (r) { return r.status !== 'na'; });
      var naCount = it.ev.results.length - shown.length;
      if (shown.length) {
        var rows = [headRow(['Check', 'Measured', 'Required (stricter)', 'Citation', 'Result'], [24, 16, 18, 22, 20])];
        shown.sort(function (a, b) { return ORDER[a.status] - ORDER[b.status]; }).forEach(function (r) {
          var extra = r.reason || '';
          if (r.status === 'fail' && r.note) extra = r.note;
          rows.push(new d.TableRow({ cantSplit: true, children: [cell(r.label, { width: 24 }), cell(r.measured || '', { width: 16 }), cell(r.required || '', { width: 18 }), cell(citeText(r), { width: 22 }), resultCell(r.status, extra)] }));
        });
        out.push(table(rows));
      }
      if (naCount) out.push(small(naCount + ' check(s) did not apply to this element and are not shown.'));
      if (f.notes) { out.push(new P({ children: [txt('Consultant notes: ', { bold: true }), txt(f.notes)], spacing: { before: 120, after: 120 } })); }
      if (f.flagManual) out.push(new P({ children: [txt('Flagged for manual review: ', { bold: true }), txt(f.flagReason || 'See notes.')], spacing: { after: 120 } }));
      if (it.photos.length) {
        var runs = [];
        it.photos.forEach(function (ph, i) {
          var w = 300, hgt = ph.width && ph.height ? Math.round(w * ph.height / ph.width) : 225;
          if (hgt > 360) { w = Math.round(w * 360 / hgt); hgt = 360; }
          var alt = 'Photo ' + (i + 1) + ' of finding ' + it.no + ': ' + elLabel + ' at ' + (f.location || 'location not recorded');
          runs.push(new d.ImageRun({ type: 'jpg', data: ph.bytes, transformation: { width: w, height: hgt },
            altText: { name: 'Finding ' + it.no + ' photo ' + (i + 1), title: alt, description: alt } }));
          if (i % 2 === 0 && i < it.photos.length - 1) runs.push(txt('  '));
          if (i % 2 === 1 && i < it.photos.length - 1) runs.push(new T({ break: 1 }));
        });
        out.push(new P({ children: runs, spacing: { before: 120, after: 60 } }));
        out.push(small(it.photos.length + ' photo(s) for finding ' + it.no + '.'));
      }
      return out;
    }

    // ---- 3. manual input list ---------------------------------------------------------
    var manualRows = [];
    items.forEach(function (it) {
      it.ev.results.forEach(function (r) {
        if (r.status === 'manual') manualRows.push([String(it.no), it.group.label, r.label, r.reason || '', citeText(r)]);
      });
    });
    children.push(h(d.HeadingLevel.HEADING_1, (sec++) + '. Items Needing Manual Input'));
    if (manualRows.length) {
      children.push(para(manualRows.length + ' check(s) could not be decided automatically. Resolve each one before the report is issued, then delete this section or record the outcome.'));
      children.push(table([headRow(['Finding', 'Area', 'Check', 'Why it needs input', 'Citation'], [9, 20, 25, 26, 20])].concat(manualRows.map(function (r) {
        return new d.TableRow({ cantSplit: true, children: r.map(function (c, i) { return cell(c); }) });
      }))));
    } else children.push(para('None. Every check had enough information to decide.'));

    // ---- appendix A: citations to verify ---------------------------------------------
    var verify = {};
    items.forEach(function (it) {
      it.ev.results.forEach(function (r) {
        if (!r.verify || !r.cite || r.status === 'na') return;
        r.cite.replace(/ \(same requirement\)$/, '').split('; ').forEach(function (c) {
          if (/^ADA 2010/.test(c)) return; // ADA 2010 section numbers are standard
          verify[c] = (verify[c] || 0) + 1;
        });
      });
    });
    children.push(h(d.HeadingLevel.HEADING_1, 'Appendix A. Citations to Verify (†)'));
    children.push(para('These citations come from the tool\'s rules table and have not yet been confirmed against the printed ICC A117.1-2017 or 2021 Michigan Building Code text. ADA 2010 section numbers are standard; Michigan section numbers can differ from ADA numbering, especially for parking and signage. Confirm each one, then initial it.'));
    var vk = Object.keys(verify).sort();
    if (vk.length) children.push(table([headRow(['Michigan citation', 'Uses', 'Confirmed by / date'], [62, 10, 28])].concat(vk.map(function (k) {
      return new d.TableRow({ cantSplit: true, children: [cell(k), cell(String(verify[k])), cell('')] });
    }))));
    else children.push(para('None.'));

    // ---- appendix B: method -------------------------------------------------------------
    children.push(h(d.HeadingLevel.HEADING_1, 'Appendix B. Method'));
    children.push(para('DNEM ADA-certified consultants recorded each element on site with the DNEM ADA Lens phone app: element type, location, photos, measurements and yes/no observations. The DNEM ADA Lens report builder compared each recorded value with the rules table (version ' + R.version + ').'));
    children.push(para(R.codes.mi.note + ' Requirements that A117.1-2017 applies only to new buildings (for example the 67 in turning circle and 30 x 52 in clear floor space) are applied when the visit records the building as built or altered under the 2021 Michigan Building Code (effective April 9, 2025). When building status is unknown and a measurement meets only the older size, the item is marked "Needs manual input".'));
    children.push(para('This report covers the elements the consultants recorded. It is not a complete survey of every element at the site unless stated in the visit notes.'));
    visits.forEach(function (z) { if (z.data.visit.notes) children.push(para([txt('Visit notes (' + z.data.visit.consultant + ', ' + z.data.visit.date + '): ', { bold: true }), txt(z.data.visit.notes)])); });

    return new d.Document({
      creator: APP_NAME, title: (opts.title || 'Facility Accessibility Field Evaluation') + ' - ' + sites.join('; '),
      description: 'Accessibility field evaluation citing the 2010 ADA Standards and the Michigan barrier-free code.',
      styles: {
        default: { document: { run: { font: 'Calibri', size: 28, color: INK }, paragraph: { spacing: { after: 120, line: 264, lineRule: d.LineRuleType.AUTO } } } },
        paragraphStyles: [
          { id: 'Title', name: 'Title', basedOn: 'Normal', next: 'Normal', run: { size: 52, bold: true, color: BLUE }, paragraph: { spacing: { after: 60 } } },
          { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 44, bold: true, color: BLUE }, paragraph: { spacing: { before: 220, after: 120 }, keepNext: true } },
          { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 32, bold: true, color: BLUE }, paragraph: { spacing: { before: 220, after: 120 }, keepNext: true } },
          { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 36, bold: true, color: BLUE }, paragraph: { spacing: { before: 220, after: 120 }, keepNext: true } }
        ]
      },
      features: { updateFields: false },
      sections: [{
        properties: { page: { size: { width: 12240, height: 15840, orientation: d.PageOrientation.LANDSCAPE }, margin: { top: 936, bottom: 936, left: 1080, right: 1080, header: 331, footer: 331 } } },
        headers: { default: new d.Header({ children: [new P({ children: [txt(APP_NAME, { color: MUTED })], spacing: { after: 0 } })] }) },
        footers: { default: new d.Footer({ children: [new P({ alignment: d.AlignmentType.CENTER, children: [txt('Field evaluation draft - consultant review required. Page ', { color: MUTED }), new T({ children: [d.PageNumber.CURRENT], color: MUTED }), txt(' of ', { color: MUTED }), new T({ children: [d.PageNumber.TOTAL_PAGES], color: MUTED })] })] }) },
        children: children
      }]
    });
  }

  function uniq(a) { var s = []; a.forEach(function (x) { if (x && s.indexOf(x) < 0) s.push(x); }); return s; }
  function statusLabel(R, id) { var s = R.buildingStatus.filter(function (b) { return b.id === id; })[0]; return s ? s.label : 'Not known'; }

  // Read a visit ZIP (ArrayBuffer/Blob) into { data, photos }. getSize(bytes) -> Promise<{width,height}>
  function readVisitZip(JSZip, input, getSize) {
    return JSZip.loadAsync(input).then(function (zip) {
      var vj = zip.file('visit.json') || zip.file(/(^|\/)visit\.json$/)[0];
      if (!vj) throw new Error('No visit.json inside');
      var prefix = vj.name.replace(/visit\.json$/, '');
      return vj.async('string').then(function (s) {
        var data = JSON.parse(s);
        if (data.format !== 'dnem-field-visit') throw new Error('Not a DNEM field visit file');
        var photos = {}, jobs = [];
        (data.findings || []).forEach(function (f) {
          (f.photos || []).forEach(function (p) {
            var zf = zip.file(prefix + p.file);
            if (!zf) return;
            jobs.push(zf.async('uint8array').then(function (bytes) {
              return Promise.resolve(getSize ? getSize(bytes) : null).then(function (sz) { photos[p.file] = { bytes: bytes, width: sz && sz.width, height: sz && sz.height }; });
            }));
          });
        });
        return Promise.all(jobs).then(function () { return { data: data, photos: photos }; });
      });
    });
  }

  var API = { buildReport: buildReport, readVisitZip: readVisitZip };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.DNEM_REPORT = API;
})(this);
