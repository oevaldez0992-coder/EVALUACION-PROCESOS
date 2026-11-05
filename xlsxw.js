/* ============================================================
   Escritor XLSX mínimo (con estilos, fórmulas, combinaciones y formato condicional)
   SheetJS gratuito no escribe estilos, por eso se arma el archivo aquí.
   informeXlsx(ev, meta) -> Uint8Array con el informe ejecutivo (mismo formato del Excel de referencia)
   ============================================================ */
const _crcT = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = _crcT[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
function zipStore(files) {
  const enc = new TextEncoder(), parts = [], cen = []; let off = 0;
  const u16 = n => [n & 255, (n >> 8) & 255], u32 = n => [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255];
  files.forEach(f => {
    const name = enc.encode(f.name), data = typeof f.data === 'string' ? enc.encode(f.data) : f.data, crc = crc32(data);
    const lh = new Uint8Array([0x50, 0x4b, 3, 4, 20, 0, 0, 8, 0, 0, 0, 0, 0x21, 0, ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), 0, 0]);
    parts.push(lh, name, data);
    cen.push({ name, crc, size: data.length, off });
    off += lh.length + name.length + data.length;
  });
  let cs = 0; const cparts = [];
  cen.forEach(c => {
    const h = new Uint8Array([0x50, 0x4b, 1, 2, 20, 0, 20, 0, 0, 8, 0, 0, 0, 0, 0x21, 0, ...u32(c.crc), ...u32(c.size), ...u32(c.size), ...u16(c.name.length), 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, ...u32(c.off)]);
    cparts.push(h, c.name); cs += h.length + c.name.length;
  });
  const end = new Uint8Array([0x50, 0x4b, 5, 6, 0, 0, 0, 0, ...u16(cen.length), ...u16(cen.length), ...u32(cs), ...u32(off), 0, 0]);
  const all = [...parts, ...cparts, end], out = new Uint8Array(all.reduce((a, p) => a + p.length, 0)); let o = 0;
  all.forEach(p => { out.set(p, o); o += p.length; });
  return out;
}
const xe = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const colLetra = i => String.fromCharCode(65 + i);
const argb = c => 'FF' + c.replace('#', '').toUpperCase();

function informeXlsx(ev, meta) {
  const INK = '14213D', LINE = 'D5DCE6';
  // ---- registro de estilos
  const fonts = [], fills = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>'], borders = [], numFmts = [], xfs = [];
  const idx = (arr, x) => { const i = arr.indexOf(x); if (i >= 0) return i; arr.push(x); return arr.length - 1; };
  const fontX = f => `<font>${f.b ? '<b/>' : ''}<sz val="${f.sz || 11}"/><color rgb="${argb(f.c || '000000')}"/><name val="Calibri"/><family val="2"/></font>`;
  const brd = (s, c) => s ? `style="${s}"><color rgb="${argb(c || INK)}"/>` : '>';
  const borderX = b => `<border><left ${brd(b.l && b.l[0], b.l && b.l[1])}</left><right ${brd(b.r && b.r[0], b.r && b.r[1])}</right><top ${brd(b.t && b.t[0], b.t && b.t[1])}</top><bottom ${brd(b.b && b.b[0], b.b && b.b[1])}</bottom><diagonal/></border>`;
  idx(fonts, fontX({})); idx(borders, borderX({})); xfs.push('<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>');
  const NF = { '0.0%': 164, '0.0#%': 165, '0%': 9 };
  const estilo = s => {
    const fo = idx(fonts, fontX(s.font || {})), fi = s.fill ? idx(fills, `<fill><patternFill patternType="solid"><fgColor rgb="${argb(s.fill)}"/><bgColor indexed="64"/></patternFill></fill>`) : 0;
    const bo = idx(borders, borderX(s.border || {})), nf = s.nf ? NF[s.nf] : 0;
    const al = s.al ? `<alignment horizontal="${s.al.h || 'general'}" vertical="${s.al.v || 'center'}"${s.al.wrap ? ' wrapText="1"' : ''}${s.al.indent ? ` indent="${s.al.indent}"` : ''}/>` : '';
    return idx(xfs, `<xf numFmtId="${nf}" fontId="${fo}" fillId="${fi}" borderId="${bo}" xfId="0"${nf ? ' applyNumberFormat="1"' : ''} applyFont="1" applyFill="1" applyBorder="1"${al ? ' applyAlignment="1">' + al + '</xf>' : '/>'}`);
  };
  // ---- celdas
  const cells = {}, alto = {}, merges = [];
  const put = (r, c, o) => { (cells[r] = cells[r] || {})[c] = o; };
  const M = ['medium', INK], T = ['thin', LINE];
  const meses = MESES_ES, per = periodoTexto(meta.periodo);
  const tituloTxt = `INFORME EJECUTIVO DE ${String(meta.nombre).toUpperCase()} ${per.mes.toUpperCase()}-${per.anio}`;
  const base = (extra = {}) => Object.assign({}, extra);
  // fila 1
  alto[1] = 46.05;
  for (let c = 0; c < 6; c++) put(1, c, { s: { font: { b: 1, sz: 16, c: 'FFFFFF' }, fill: INK, al: { h: 'center' }, border: { t: M, l: c === 0 ? M : null, r: c === 5 ? M : null } }, v: c === 0 ? tituloTxt : undefined });
  merges.push('A1:F1');
  // fila 2
  alto[2] = 31.95;
  const h2 = (c, v, al) => put(2, c, { s: { font: { b: 1, sz: 10, c: 'FFFFFF' }, fill: '2B4A7A', al, border: { l: c === 0 ? M : null, r: c === 5 ? M : null } }, v });
  h2(0, 'ÁREAS AUDITADAS', { h: 'left', indent: 1 }); h2(1, 'Verificación', { h: 'center', wrap: 1 }); h2(2, undefined, { h: 'center', wrap: 1 }); h2(3, 'Porcentaje de cumplimiento', { h: 'center', wrap: 1 }); h2(4, undefined, { h: 'center' }); h2(5, 'Estatus', { h: 'center', wrap: 1 });
  merges.push('B2:C2');
  let r = 3; const filasArea = [], filasPunto = [];
  const nTot = ev.total;
  // las filas de criterio se ubican después de calcular r; se usan marcadores
  const refs = { crit1: 0, crit2: 0 };
  const estF = (rr) => `IF(D${rr}>=$D$@C1,"Cumple",IF(D${rr}>=$D$@C2,"En seguimiento","Requiere atención"))`;
  const pend = [];   // fórmulas con marcadores
  ev.areas.forEach(a => {
    const rA = r++; filasArea.push(rA); alto[rA] = 25.95;
    const rIni = r;
    a.grupos.forEach(g => {
      if (g.nombre) { alto[r] = 21; for (let c = 0; c < 6; c++) if (c !== 4) put(r, c, { s: { font: { b: 1, sz: 10.5, c: '1F3A63' }, fill: 'E6ECF4', al: c === 0 ? { h: 'left', indent: 1 } : { v: 'center' }, border: { l: c === 0 ? M : null, r: c === 5 ? M : null } }, v: c === 0 ? g.nombre : undefined }); r++; }
      g.items.forEach(it => {
        alto[r] = a.total === 1 || a.grupos.length === 1 && a.grupos[0].items.length < 12 && !g.nombre && a.total <= 2 ? 21 : (g.nombre ? 21 : 19.8);
        const w = Math.round(1000000 / a.total) / 10000, wTxt = (Number.isInteger(w) ? w : String(w)) + '%';
        const bt = { b: T };
        put(r, 0, { s: { font: { sz: 10.5, c: '1F2937' }, al: { h: 'left', indent: 2 }, border: { l: M, b: T[0] ? T : null } }, v: it.t });
        put(r, 1, { s: { font: { sz: 12, c: it.ok ? '1F7A4D' : 'B83A32', b: 1 }, al: { h: 'center' }, border: bt }, f: `IF(E${r}=TRUE,"☑","☐")`, tv: it.ok ? '☑' : '☐', t: 'str' });
        put(r, 2, { s: { font: { sz: 10.5, c: '1F2937' }, border: bt } });
        put(r, 3, { s: { font: { sz: 10.5, c: '4B5563' }, al: { h: 'center' }, nf: '0.0#%', border: bt }, f: `IF(E${r}=TRUE,${wTxt},0)`, tv: it.ok ? w / 100 : 0, t: 'n' });
        put(r, 4, { v: !!it.ok, t: 'b', s: {} });
        put(r, 5, { s: { font: { b: 1, sz: 10, c: '4B5563' }, al: { h: 'center' }, border: { r: M, b: T } }, f: `IF(D${r}>0,"Cumple","No cumple")`, tv: it.ok ? 'Cumple' : 'No cumple', t: 'str' });
        filasPunto.push(r); r++;
      });
    });
    const rFin = r - 1;
    const hd = (c, o) => put(rA, c, Object.assign({ s: { font: { b: 1, sz: 12, c: 'FFFFFF' }, fill: '1F3A63', al: { v: 'center' }, border: { l: c === 0 ? M : null, r: c === 5 ? M : null } } }, o));
    hd(0, { v: a.nombre }); hd(0, { v: a.nombre, s: { font: { b: 1, sz: 12, c: 'FFFFFF' }, fill: '1F3A63', al: { h: 'left', indent: 1 }, border: { l: M } } });
    hd(1, {}); hd(2, {});
    put(rA, 3, { s: { font: { b: 1, sz: 12, c: 'FFFFFF' }, fill: '1F3A63', al: { h: 'center' }, nf: '0.0%' }, f: `SUM(D${rIni}:D${rFin})`, tv: a.pct / 100, t: 'n' });
    put(rA, 5, { s: { font: { b: 1, sz: 12, c: 'FFFFFF' }, fill: '1F3A63', al: { h: 'center' }, border: { r: M } }, f: estF(rA), tv: a.estatus, t: 'str', marcador: true });
  });
  const rT = r, rC = r + 1, rSp = r + 2, rCr = r + 3, rC1 = r + 4, rC2 = r + 5, rC3 = r + 6;
  alto[rT] = 34.05; alto[rC] = 15; alto[rSp] = 10.05; alto[rCr] = 19.95; alto[rC1] = 18; alto[rC2] = 18; alto[rC3] = 18;
  const ult = rT - 1;
  const tb = (c) => ({ t: M, b: M, l: c === 0 ? M : null, r: c === 5 ? M : null });
  [0, 1, 2, 3, 5].forEach(c => put(rT, c, { s: { font: { b: 1, sz: 13, c: INK }, fill: 'DCE6F2', al: c === 0 ? { h: 'left', indent: 1 } : { h: 'center' }, nf: c === 3 ? '0%' : undefined, border: tb(c) } }));
  cells[rT][0].v = 'NIVEL DE CUMPLIMIENTO TOTAL';
  cells[rT][3].f = `1-(E${rC}/E${rT})`; cells[rT][3].tv = ev.pct / 100; cells[rT][3].t = 'n';
  cells[rT][5].f = estF(rT); cells[rT][5].tv = ev.estatus; cells[rT][5].t = 'str';
  put(rT, 4, { s: { border: { t: M, b: M } }, v: ev.total, t: 'n' });
  put(rC, 4, { s: {}, f: `COUNTIF(E4:E${ult},FALSE)`, tv: ev.fallos, t: 'n' });
  put(rCr, 0, { s: { font: { b: 1, sz: 12, c: INK }, al: { h: 'left', indent: 1 } }, v: 'Criterio de estatus' });
  const crit = (rr, txt, val) => { put(rr, 0, { s: { font: { sz: 12, c: '5B6B82' }, al: { h: 'left', indent: 1 } }, v: txt }); if (val !== undefined) put(rr, 3, { s: { font: { b: 1, sz: 12, c: '0000FF' }, fill: 'FFF2CC', al: { h: 'center' }, nf: '0%' }, v: val, t: 'n' }); };
  crit(rC1, 'Cumple: cumplimiento igual o mayor a', UMBRALES.cumple / 100); crit(rC2, 'En seguimiento: cumplimiento igual o mayor a', UMBRALES.seguimiento / 100); crit(rC3, 'Requiere atención: cumplimiento menor al criterio anterior');
  merges.push(`A${rC3}:D${rC3}`);
  // ---- hoja
  const rowsXml = [];
  for (let rr = 1; rr <= rC3; rr++) {
    const cs = cells[rr] || {}; let x = '';
    for (let c = 0; c < 6; c++) {
      const o = cs[c]; if (!o) continue;
      const ref = colLetra(c) + rr, s = estilo(o.s || {});
      if (o.f) { const f = xe(o.f.replace(/@C1/g, rC1).replace(/@C2/g, rC2)); x += o.t === 'str' ? `<c r="${ref}" s="${s}" t="str"><f>${f}</f><v>${xe(o.tv)}</v></c>` : `<c r="${ref}" s="${s}"><f>${f}</f><v>${o.tv}</v></c>`; }
      else if (o.t === 'b') x += `<c r="${ref}" s="${s}" t="b"><v>${o.v ? 1 : 0}</v></c>`;
      else if (o.t === 'n') x += `<c r="${ref}" s="${s}"><v>${o.v}</v></c>`;
      else if (o.v !== undefined) x += `<c r="${ref}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${xe(o.v)}</t></is></c>`;
      else x += `<c r="${ref}" s="${s}"/>`;
    }
    rowsXml.push(`<row r="${rr}"${alto[rr] ? ` ht="${alto[rr]}" customHeight="1"` : ''}>${x}</row>`);
  }
  // formato condicional (dxfs)
  const dxfs = [], dx = (fc, bg) => { dxfs.push(`<dxf><font><color rgb="${argb(fc)}"/></font>${bg ? `<fill><patternFill patternType="solid"><fgColor rgb="${argb(bg)}"/><bgColor rgb="${argb(bg)}"/></patternFill></fill>` : ''}</dxf>`); return dxfs.length - 1; };
  const dVerde = dx('FFFFFF', '1F7A4D'), dAmb = dx('FFFFFF', 'C98A0B'), dRojo = dx('FFFFFF', 'B83A32'), dCero = dx('B83A32', 'FDECEA'), dTxtV = dx('1F7A4D'), dTxtR = dx('B83A32');
  let pri = 1, cf = '';
  [...filasArea, rT].forEach(rr => {
    cf += `<conditionalFormatting sqref="D${rr}:F${rr}">` +
      `<cfRule type="expression" dxfId="${dVerde}" priority="${pri++}"><formula>$D${rr}&gt;=$D$${rC1}</formula></cfRule>` +
      `<cfRule type="expression" dxfId="${dAmb}" priority="${pri++}"><formula>AND($D${rr}&lt;$D$${rC1},$D${rr}&gt;=$D$${rC2})</formula></cfRule>` +
      `<cfRule type="expression" dxfId="${dRojo}" priority="${pri++}"><formula>$D${rr}&lt;$D$${rC2}</formula></cfRule></conditionalFormatting>`;
  });
  const sqD = filasPunto.map(x => 'D' + x).join(' '), sqF = filasPunto.map(x => 'F' + x).join(' ');
  if (filasPunto.length) cf += `<conditionalFormatting sqref="${sqD}"><cfRule type="cellIs" dxfId="${dCero}" priority="${pri++}" operator="equal"><formula>0</formula></cfRule></conditionalFormatting>` +
    `<conditionalFormatting sqref="${sqF}"><cfRule type="cellIs" dxfId="${dTxtV}" priority="${pri++}" operator="equal"><formula>"Cumple"</formula></cfRule><cfRule type="cellIs" dxfId="${dTxtR}" priority="${pri++}" operator="equal"><formula>"No cumple"</formula></cfRule></conditionalFormatting>`;
  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetPr><tabColor rgb="${argb(INK)}"/><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:F${rC3}"/>` +
    `<sheetViews><sheetView showGridLines="0" tabSelected="1" workbookViewId="0"><pane ySplit="2" topLeftCell="A3" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A3" sqref="A3"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/>` +
    `<cols><col min="1" max="1" width="72" customWidth="1"/><col min="2" max="2" width="7" customWidth="1"/><col min="3" max="3" width="5.9" customWidth="1"/><col min="4" max="4" width="15.4" customWidth="1"/><col min="5" max="5" width="14.8" hidden="1" customWidth="1"/><col min="6" max="6" width="19" customWidth="1"/></cols>` +
    `<sheetData>${rowsXml.join('')}</sheetData><mergeCells count="${merges.length}">${merges.map(m => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>${cf}` +
    `<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/><pageSetup orientation="portrait" fitToHeight="0"/></worksheet>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="2"><numFmt numFmtId="164" formatCode="0.0%"/><numFmt numFmtId="165" formatCode="0.0#%"/></numFmts>` +
    `<fonts count="${fonts.length}">${fonts.join('')}</fonts><fills count="${fills.length}">${fills.join('')}</fills><borders count="${borders.length}">${borders.join('')}</borders>` +
    `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${xfs.length}">${xfs.join('')}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles><dxfs count="${dxfs.length}">${dxfs.join('')}</dxfs></styleSheet>`;
  const wb = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="INFORME EJECUTIVO" sheetId="1" r:id="rId1"/></sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`;
  return zipStore([
    { name: '[Content_Types].xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>` },
    { name: '_rels/.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { name: 'xl/workbook.xml', data: wb },
    { name: 'xl/_rels/workbook.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    { name: 'xl/styles.xml', data: styles },
    { name: 'xl/worksheets/sheet1.xml', data: sheet }
  ]);
}
