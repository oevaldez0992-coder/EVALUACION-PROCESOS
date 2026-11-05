/* ============================================================
   IMAGEN DEL INFORME EJECUTIVO (PNG)
   Se dibuja en un canvas de 1600 px de ancho lógico (3200 px con escala 2).
   ev   = resultado de evaluar()
   meta = { nombre, mesNombre, anio }
   ============================================================ */
function dibujarInforme(ev, meta, esc) {
  esc = esc || 2;
  const W = 1600, M = 64, G = 28, NAVY = '#14213D', MUT = '#5B6B82', BORDE = '#DDE3EB', PAG = '#F3F5F8', TRACK = '#E3E8EF', LINEA = '#E8ECF2';
  const FAM = 'Inter, "Segoe UI", system-ui, -apple-system, Arial, sans-serif';
  const mc = document.createElement('canvas').getContext('2d');
  const soportaLS = 'letterSpacing' in mc;
  const fuente = (c, w, s) => { c.font = w + ' ' + s + 'px ' + FAM; };
  // Cifras tabulares (mismo ancho en todos los dígitos) y espaciado entre letras, que el canvas no ofrece de forma uniforme
  const piezas = (t, w, s, ls, tn) => {
    fuente(mc, w, s); if (soportaLS) mc.letterSpacing = '0px';
    const adv0 = mc.measureText('0').width, out = [];
    (tn ? String(t).split(/(\d)/).filter(x => x !== '') : [String(t)]).forEach(z => {
      if (tn && /^\d$/.test(z)) out.push({ z, a: adv0 + ls, dig: true });
      else if (!ls) out.push({ z, a: mc.measureText(z).width });
      else Array.from(z).forEach(ch => out.push({ z: ch, a: mc.measureText(ch).width + ls }));
    });
    return out;
  };
  const ancho = (t, w, s, ls, tn) => { ls = ls || 0; return piezas(t, w, s, ls, tn).reduce((a, p) => a + p.a, 0) - ls; };
  const txt = (c, t, x, y, w, s, col, al, ls, tn) => {
    al = al || 'left'; ls = ls || 0; fuente(c, w, s); c.fillStyle = col; c.textBaseline = 'alphabetic';
    if (soportaLS) c.letterSpacing = '0px';
    if (!ls && !tn) { c.textAlign = al; c.fillText(t, x, y); return; }
    const ps = piezas(t, w, s, ls, tn), tot = ps.reduce((a, p) => a + p.a, 0) - ls;
    let px = al === 'center' ? x - tot / 2 : al === 'right' ? x - tot : x;
    ps.forEach(p => { if (p.dig) { c.textAlign = 'center'; c.fillText(p.z, px + (p.a - ls) / 2, y); } else { c.textAlign = 'left'; c.fillText(p.z, px, y); } px += p.a; });
  };
  const envolver = (t, w, s, maxW) => {
    const pal = String(t).split(/\s+/), out = []; let cur = '';
    pal.forEach(p => { const prueba = cur ? cur + ' ' + p : p; if (cur && ancho(prueba, w, s) > maxW) { out.push(cur); cur = p; } else cur = prueba; });
    if (cur) out.push(cur); return out.length ? out : [''];
  };
  const rr = (c, x, y, w, h, r) => {
    c.beginPath();
    if (c.roundRect) c.roundRect(x, y, w, h, r);
    else { r = Math.min(r, w / 2, h / 2); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  };
  const col = s => COLOR_EST[s], fondoE = s => FONDO_EST[s];

  /* ---------- Medidas ---------- */
  const areas = ev.areas, n = areas.length, nFilas = Math.max(1, Math.ceil(n / 2));
  const XS = [M + 470 + G, M + 470 + G + 473 + G], TOP = 248;
  const tarjetas = areas.map((a, i) => {
    const ultima = i === n - 1 && n % 2 === 1 && n > 1 ? true : (n === 1);
    const w = ultima ? 473 * 2 + G : 473, x = ultima ? XS[0] : XS[i % 2];
    const pillW = ancho(a.estatus, 600, 16) + 23;
    return { a, x, w, fila: Math.floor(i / 2), pillW, lineas: envolver(a.corto, 600, 24.2, Math.min(w - 58 - pillW - 16, 250)) };
  });
  const altoFila = Array.from({ length: nFilas }, (_, r) => Math.max(...tarjetas.filter(t => t.fila === r).map(t => 205 + 31 * t.lineas.length), 236));
  let sumaF = altoFila.reduce((a, b) => a + b, 0) + (nFilas - 1) * G;
  if (sumaF < 500) { altoFila[nFilas - 1] += 500 - sumaF; sumaF = 500; }
  const filaY = []; altoFila.reduce((y, h, r) => { filaY[r] = y; return y + h + G; }, TOP);
  const gridBottom = TOP + sumaF;

  // Detalle del área con menor cumplimiento
  const peor = areas.reduce((m, a) => (a.pct < m.pct ? a : m), areas[0]);
  const usaGrupos = peor.grupos.length > 1 || !!peor.grupos[0].nombre;
  const filasDet = (usaGrupos ? peor.grupos.map(g => ({ t: g.corto, c: g.cumplen, n: g.total })) : peor.grupos[0].items.map(it => ({ t: sinPunto(it.t), c: it.ok ? 1 : 0, n: 1 })))
    .map(f => { const lineas = envolver(f.t, 400, 20.1, 290); return { ...f, lineas, h: Math.max(54, 30 + 24 * lineas.length) }; });
  const hallazgos = ev.hallazgos.map(h => ({ ...h, lineas: envolver(h.texto, 500, 21.2, 626) }));
  const hf = h => 81.25 + 26.5 * (h.lineas.length - 1);
  const yB = gridBottom + G;
  const izqNec = 117.25 + filasDet.reduce((a, f) => a + f.h, 0) + 33;
  const derNec = 116 + (hallazgos.length ? hallazgos.reduce((a, h) => a + hf(h), 0) : 81.25) + 31;
  const altoB = Math.max(izqNec, derNec, 300);
  const H = Math.ceil(yB + altoB + 75);

  /* ---------- Lienzo ---------- */
  const cv = document.createElement('canvas'); cv.width = W * esc; cv.height = H * esc;
  const c = cv.getContext('2d'); c.scale(esc, esc);
  c.fillStyle = PAG; c.fillRect(0, 0, W, H);

  // Encabezado
  c.fillStyle = NAVY; c.fillRect(0, 0, W, 208);
  txt(c, 'Informe ejecutivo de cumplimiento', M, 100.5, 700, 48.7, '#FFFFFF');
  const sub1 = meta.nombre, sub2 = 'Auditoría de ' + meta.mesNombre + ' ' + meta.anio, w1 = ancho(sub1, 400, 25.2);
  txt(c, sub1, M, 145, 400, 25.2, '#AEBBD0');
  c.fillStyle = '#AEBBD0'; c.fillRect(M + w1 + 18, 123, 2, 30);
  txt(c, sub2, M + w1 + 18 + 2 + 16, 145, 400, 25.2, '#AEBBD0');
  const logo = [['#2B4A7A', '#3A5F95', '#1E3560', '#4F76A8'], ['#2B4A7A', '#6B8FBF', '#1E3560', '#3A5F95'], ['#4F76A8', '#2B4A7A', '#3A5F95', '#1E3560']];
  logo.forEach((fila, r) => fila.forEach((cl, k) => { c.fillStyle = cl; rr(c, W - M - 151 + k * 39, 48 + r * 39, 34, 34, 3); c.fill(); }));

  const tarjeta = (x, y, w, h) => { c.fillStyle = BORDE; rr(c, x, y, w, h, 8); c.fill(); c.fillStyle = '#FFFFFF'; rr(c, x + 1, y + 1, w - 2, h - 2, 7); c.fill(); };
  const pastilla = (cx, y, h, texto, est, tam, base, derecha) => {
    const w = ancho(texto, 600, tam) + (h > 31 ? 24.5 : 23), x = derecha ? cx - w : cx - w / 2;
    c.fillStyle = fondoE(est); rr(c, x, y, w, h, h / 2); c.fill();
    txt(c, texto, x + w / 2, y + base, 600, tam, col(est), 'center');
    return w;
  };

  // Tarjeta de nivel total
  const LX = M, LW = 470, LH = sumaF;
  tarjeta(LX, TOP, LW, LH);
  txt(c, 'Nivel de cumplimiento total', LX + 33, TOP + 56.2, 600, 25.1, NAVY);
  const dcx = LX + LW / 2, dcy = TOP + 204.75, dr = 96;
  c.lineWidth = 22; c.lineCap = 'butt';
  c.strokeStyle = TRACK; c.beginPath(); c.arc(dcx, dcy, dr, 0, Math.PI * 2); c.stroke();
  if (ev.pct > 0) { c.strokeStyle = col(ev.estatus); c.beginPath(); c.arc(dcx, dcy, dr, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(ev.pct, 100) / 100); c.stroke(); }
  txt(c, fmtPct(ev.pct), dcx, TOP + 217.5, 700, 45.4, NAVY, 'center', -2.2);
  txt(c, 'cumplimiento', dcx, TOP + 240.5, 400, 20.5, MUT, 'center');
  // "24 de 29 puntos auditados cumplen"
  const pa = ev.cumplen + ' de ' + ev.total, pb = ' puntos auditados cumplen', wa = ancho(pa, 700, 22.2, 0, true), wb = ancho(pb, 400, 22.2), px0 = dcx - (wa + wb) / 2;
  txt(c, pa, px0, TOP + 372.3, 700, 22.2, NAVY, 'left', 0, true); txt(c, pb, px0 + wa, TOP + 372.3, 400, 22.2, MUT);
  txt(c, ev.fallos === 0 ? 'Sin hallazgos por atender' : ev.fallos + (ev.fallos === 1 ? ' hallazgo por atender' : ' hallazgos por atender'), dcx, TOP + 405.5, 400, 22.2, MUT, 'center', 0, true);
  pastilla(dcx, TOP + 433, 32.5, ev.estatus, ev.estatus, 18.7, 22.4);

  // Tarjetas por área
  tarjetas.forEach(t => {
    const y = filaY[t.fila], h = altoFila[t.fila], a = t.a, L = t.lineas.length, cx = t.x + 29, cw = t.w - 58;
    tarjeta(t.x, y, t.w, h);
    const dy = t.fila > 0 ? 1 : 0;
    t.lineas.forEach((l, i) => txt(c, l, cx, y + 50.8 + 31 * i, 600, 24.2, NAVY));
    pastilla(t.x + t.w - 29, y + 27, 30, a.estatus, a.estatus, 16, 20.7, true);
    txt(c, fmtPct(a.pct), cx, y + 102.5 + 31 * L + dy, 700, 68.2, col(a.estatus), 'left', -2.2);
    c.fillStyle = TRACK; rr(c, cx, y + 131 + 31 * L + dy, cw, 12, 6); c.fill();
    if (a.pct > 0) { c.fillStyle = col(a.estatus); rr(c, cx, y + 131 + 31 * L + dy, Math.max(12, cw * a.pct / 100), 12, 6); c.fill(); }
    txt(c, a.cumplen + ' de ' + a.total + (a.total === 1 ? ' punto cumplido' : ' puntos cumplidos'), cx, y + 173.3 + 31 * L + dy, 400, 19.5, MUT, 'left', 0, true);
  });

  // Tarjeta inferior izquierda: detalle por proceso
  const BX = M, BW = 722, BX2 = M + 722 + G;
  tarjeta(BX, yB, BW, altoB);
  txt(c, peor.corto + ': detalle por proceso', BX + 33, yB + 59, 700, 28.1, NAVY);
  txt(c, peor.pct < 100 ? 'Es el área con menor cumplimiento (' + fmtPct(peor.pct) + ')' : 'Todas las áreas cumplen al 100%', BX + 33, yB + 90.2, 400, 19.1, MUT);
  let ry = yB + 117.25;
  filasDet.forEach(f => {
    const p = f.n ? f.c / f.n * 100 : 0, e = estatusDe(p), cy = ry + f.h / 2;
    f.lineas.forEach((l, i) => txt(c, l, BX + 33, cy + 6.5 + (i - (f.lineas.length - 1) / 2) * 24, 400, 20.1, NAVY));
    c.fillStyle = TRACK; rr(c, BX + 341, cy - 5, 270, 10, 5); c.fill();
    if (p > 0) { c.fillStyle = col(e); rr(c, BX + 341, cy - 5, Math.max(10, 270 * p / 100), 10, 5); c.fill(); }
    txt(c, f.c + '/' + f.n, BX + BW - 34, cy + 7, 700, 20.1, col(e), 'right', 0, true);
    ry += f.h;
  });

  // Tarjeta inferior derecha: hallazgos
  tarjeta(BX2, yB, BW, altoB);
  txt(c, 'Hallazgos por atender', BX2 + 33, yB + 58.8, 700, 28.1, NAVY);
  txt(c, 'Puntos que no cumplieron en la auditoría', BX2 + 33, yB + 89.9, 400, 19.1, MUT);
  let hy = yB + 116;
  if (!hallazgos.length) {
    c.fillStyle = LINEA; c.fillRect(BX2 + 33, hy, BW - 66, 1);
    c.fillStyle = col('Cumple'); c.beginPath(); c.arc(BX2 + 38, hy + 27, 5, 0, Math.PI * 2); c.fill();
    txt(c, 'Todos los puntos auditados cumplen.', BX2 + 57.5, hy + 35.9, 500, 21.2, NAVY);
  }
  hallazgos.forEach(h => {
    c.fillStyle = LINEA; c.fillRect(BX2 + 33, hy, BW - 66, 1);
    c.fillStyle = '#B83A32'; c.beginPath(); c.arc(BX2 + 38, hy + 27, 5, 0, Math.PI * 2); c.fill();
    h.lineas.forEach((l, i) => txt(c, l, BX2 + 57.5, hy + 35.9 + 26.5 * i, 500, 21.2, NAVY));
    txt(c, h.contexto, BX2 + 57.5, hy + 35.9 + 26.5 * (h.lineas.length - 1) + 27.6, 400, 18.1, MUT);
    hy += hf(h);
  });

  // Pie
  const fy = yB + altoB + 42.5;
  let lx = M;
  [['Cumple', 'Cumple (' + UMBRALES.cumple + '% o más)'], ['En seguimiento', 'En seguimiento (' + UMBRALES.seguimiento + '% a ' + (UMBRALES.cumple - 1) + '%)'], ['Requiere atención', 'Requiere atención (menos de ' + UMBRALES.seguimiento + '%)']].forEach(([e, t]) => {
    c.fillStyle = col(e); c.beginPath(); c.arc(lx + 5, fy - 5.5, 5, 0, Math.PI * 2); c.fill();
    txt(c, t, lx + 17, fy, 400, 18.1, MUT); lx += 17 + ancho(t, 400, 18.1) + 24.5;
  });
  txt(c, 'Fuente: pestaña Informe ejecutivo, ' + meta.nombre + ', ' + meta.mesNombre + ' ' + meta.anio, W - M, fy, 400, 18.1, MUT, 'right');
  return cv;
}
