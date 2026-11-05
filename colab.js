/* ============================================================
   AUDITORÍA DE COLABORACIÓN: pantalla del checklist
   Los datos se guardan en Supabase (tablas auditorias_colab y auditoria_checklists)
   cada vez que se modifica algo, y en el navegador como respaldo cuando no hay sesión.
   ============================================================ */
const LS_AUD = 'kuroda.auditorias', LS_CHK = 'kuroda.checklists';
const leerLS = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
const escribirLS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
let audStore = Object.assign({}, JSON.parse(JSON.stringify(SEMILLA_AUDITORIAS)), leerLS(LS_AUD, {}));
let chkCustom = leerLS(LS_CHK, {});
const mesAnterior = () => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
const colab = { suc: 'MOSAIKOS', mes: '2026-10', msg: '' };
const kAud = (s, m) => s + '|' + m;
const plantillaDe = s => chkCustom[s] || (CHECKLISTS[s] && CHECKLISTS[s].plantilla) || PLANTILLA_BASE;
const esBase = s => !chkCustom[s] && !CHECKLISTS[s];
const nombreDef = s => (CHECKLISTS[s] && CHECKLISTS[s].nombre) || 'Kuroda ' + titulo(s);
function registro(s, m) {
  const k = kAud(s, m);
  if (!audStore[k]) audStore[k] = { resp: {}, obs: {}, nombre: nombreDef(s), aplicar: true };
  return audStore[k];
}
const persistir = () => {
  const k = kAud(colab.suc, colab.mes); registro(colab.suc, colab.mes).t = Date.now();
  if (!escribirLS(LS_AUD, audStore)) colab.msg = 'No se pudo guardar en este navegador; descarga tus archivos antes de cerrar.';
  pendientes.add(k); clearTimeout(sbTimer); sbTimer = setTimeout(subirPendientes, 600);
};

/* ---- Sincronización con Supabase ---- */
const pendientes = new Set(); let sbTimer = 0;
const conSesion = async () => { try { return !!(sb && (await sb.auth.getSession()).data.session); } catch (e) { return false; } };
const estadoSync = (t, error) => { colab.sync = t; colab.syncErr = !!error; const e = $('c-sync'); if (e) { e.textContent = t; e.className = error ? 'note' : 'note ok'; } };
const horaCorta = () => new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
const filaAud = k => {
  const [suc, mes] = k.split('|'), r = audStore[k], ev = evaluar(plantillaDe(suc), r.resp, r.obs);
  return { sucursal: suc, periodo: mes + '-01', nombre: r.nombre, aplicar: !!r.aplicar, resp: r.resp, obs: r.obs,
    puntos: ev.total, cumplen: ev.cumplen, pct: Math.round(ev.pct * 100) / 100, estatus: ev.estatus,
    actualizado_en: new Date(r.t || Date.now()).toISOString() };
};
async function subirPendientes() {
  if (!pendientes.size) return;
  if (!(await conSesion())) return estadoSync('Sin sesión: los cambios se guardan solo en este navegador. Inicia sesión (panel izquierdo) para guardarlos en Supabase.', true);
  const ks = [...pendientes]; pendientes.clear();
  const { error } = await sb.from('auditorias_colab').upsert(ks.filter(k => audStore[k]).map(filaAud), { onConflict: 'sucursal,periodo' });
  if (error) { ks.forEach(k => pendientes.add(k)); return estadoSync('No se pudo guardar en Supabase: ' + error.message, true); }
  estadoSync('Guardado en Supabase a las ' + horaCorta() + '.');
}
async function subirChecklist(suc) {
  if (!(await conSesion())) return estadoSync('Sin sesión: el checklist se guardó solo en este navegador.', true);
  const { error } = chkCustom[suc]
    ? await sb.from('auditoria_checklists').upsert({ sucursal: suc, plantilla: chkCustom[suc], actualizado_en: new Date().toISOString() })
    : await sb.from('auditoria_checklists').delete().eq('sucursal', suc);
  estadoSync(error ? 'No se pudo guardar el checklist en Supabase: ' + error.message : 'Checklist guardado en Supabase a las ' + horaCorta() + '.', !!error);
}
// Trae todo de Supabase. Gana la versión más reciente; lo que solo existe en el navegador se sube.
let sincronizando = false;
async function sincronizarColab() {
  if (sincronizando || !(await conSesion())) return; sincronizando = true;
  try {
    const [a, c] = await Promise.all([sb.from('auditorias_colab').select('*'), sb.from('auditoria_checklists').select('*')]);
    if (a.error || c.error) return estadoSync('No se pudieron leer los datos de Supabase: ' + (a.error || c.error).message, true);
    const chkRemotos = new Set(c.data.map(x => x.sucursal));
    const chkLocales = Object.keys(chkCustom).filter(s => !chkRemotos.has(s));
    c.data.forEach(x => { chkCustom[x.sucursal] = x.plantilla; });
    const remotas = new Set();
    a.data.forEach(x => {
      const k = kAud(x.sucursal, String(x.periodo).slice(0, 7)), loc = audStore[k], tr = Date.parse(x.actualizado_en);
      remotas.add(k);
      if (loc && loc.t && loc.t > tr) pendientes.add(k);
      else audStore[k] = { resp: x.resp || {}, obs: x.obs || {}, nombre: x.nombre || nombreDef(x.sucursal), aplicar: x.aplicar, t: tr };
    });
    Object.keys(audStore).forEach(k => { if (!remotas.has(k) && (audStore[k].t || SEMILLA_AUDITORIAS[k])) pendientes.add(k); });
    escribirLS(LS_CHK, chkCustom); escribirLS(LS_AUD, audStore);
    for (const s of chkLocales) await subirChecklist(s);
    if (pendientes.size) await subirPendientes(); else estadoSync('Datos cargados de Supabase a las ' + horaCorta() + '.');
    renderReport();   // refresca la pestaña abierta (incluye la calificación de auditoría en el reporte de rutas)
  } finally { sincronizando = false; }
}
if (sb) sb.auth.onAuthStateChange(ev => { if (ev === 'SIGNED_IN' || ev === 'INITIAL_SESSION') setTimeout(sincronizarColab, 0); });
const evaluarColab = () => { const r = registro(colab.suc, colab.mes); return evaluar(plantillaDe(colab.suc), r.resp, r.obs); };
const metaColab = () => { const r = registro(colab.suc, colab.mes), p = periodoTexto(colab.mes); return { nombre: r.nombre || nombreDef(colab.suc), mesNombre: p.mes, anio: p.anio, periodo: colab.mes }; };
// Calificación de auditoría (%) de una sucursal y mes, solo si se marcó "considerar en la evaluación de procesos"
function auditoriaColab(suc, mes) {
  const r = audStore[kAud(suc, mes)]; if (!r || !r.aplicar) return null;
  const pl = (chkCustom[suc] || (CHECKLISTS[suc] && CHECKLISTS[suc].plantilla) || PLANTILLA_BASE);
  return Math.round(evaluar(pl, r.resp, r.obs).pct * 100) / 100;
}

async function guardarArchivo(nombre, datos) {
  try {
    const dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null;
    if (dl) { await dl.save({ filename: nombre, data: datos }); return; }
  } catch (e) { if (e && e.code === 'declined') return; }
  const url = URL.createObjectURL(datos instanceof Blob ? datos : new Blob([datos]));
  const a = document.createElement('a'); a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
const nombreArchivo = () => { const m = metaColab(); return 'INFORME_EJECUTIVO_' + m.nombre.toUpperCase().replace(/[^A-Z0-9]+/g, '_') + '_' + m.mesNombre.toUpperCase() + '_' + m.anio; };

async function cargarFuentes() {
  try { await Promise.all(['400', '500', '600', '700'].map(w => document.fonts.load(w + ' 20px Inter'))); } catch (e) { }
}

function htmlColab() {
  const r = registro(colab.suc, colab.mes), pl = plantillaDe(colab.suc), ev = evaluarColab();
  let h = '<p class="desc">Checklist de cumplimiento por sucursal. Marca los puntos que cumple el colaborador; el informe y la imagen se generan con el mismo formato del informe ejecutivo.</p>';
  h += '<div class="params">' +
    '<label>Sucursal<select id="c-suc">' + SUCURSALES.map(s => '<option' + (s === colab.suc ? ' selected' : '') + ' value="' + esc(s) + '">' + esc(s) + '</option>').join('') + '</select></label>' +
    '<label>Mes de la auditoría<input id="c-mes" type="month" value="' + esc(colab.mes) + '"></label>' +
    '<label style="flex:1;min-width:220px">Nombre en el informe<input id="c-nom" value="' + esc(r.nombre) + '"></label></div>';
  if (esBase(colab.suc)) h += '<p class="note">Esta sucursal aún no tiene checklist propio: se usa el de Kuroda Mosaikos como base. Puedes importar su checklist desde un Excel con el formato del informe ejecutivo.</p>';
  h += '<div class="actions" style="flex-wrap:wrap"><button id="c-all">Marcar todo</button><button id="c-none">Limpiar</button>' +
    '<button id="c-imp">Importar checklist de Excel</button><input id="c-file" type="file" accept=".xlsx,.xls" hidden>' +
    (chkCustom[colab.suc] ? '<button id="c-rst" class="link">Quitar checklist importado</button>' : '') + '</div>';
  h += '<label class="chk"><input type="checkbox" id="c-ap"' + (r.aplicar ? ' checked' : '') + '> Considerar en la evaluación de procesos (solo el porcentaje total del gerente)</label>';
  h += '<p id="c-msg" class="note" role="status">' + esc(colab.msg) + '</p>';
  h += '<p id="c-sync" class="' + (colab.syncErr ? 'note' : 'note ok') + '" role="status">' + esc(colab.sync || '') + '</p>';
  h += '<div id="c-sum"></div>';
  pl.areas.forEach((a, ai) => {
    h += '<fieldset class="area"><legend>' + esc(a.nombre) + ' <span class="pct" data-area="' + ai + '"></span></legend>';
    a.grupos.forEach((g, gi) => {
      if (g.nombre) h += '<h4>' + esc(g.nombre) + '</h4>';
      g.items.forEach((it, ii) => {
        const k = ai + '.' + gi + '.' + ii, ok = !!r.resp[k];
        h += '<div class="pt"><label class="chk"><input type="checkbox" data-c="' + k + '"' + (ok ? ' checked' : '') + '> ' + esc(it.t) + '</label>' +
          '<input class="hall" data-o="' + k + '" placeholder="Hallazgo (opcional, aparece en el informe)" value="' + esc(r.obs[k] || '') + '"' + (ok ? ' hidden' : '') + '></div>';
      });
    });
    h += '</fieldset>';
  });
  h += '<div class="actions"><button class="primary" id="c-xl">Descargar informe en Excel</button><button class="primary" id="c-png">Descargar imagen (PNG)</button></div>';
  h += '<div class="prev"><canvas id="c-cv" aria-label="Vista previa del informe"></canvas></div>';
  return h;
}

let cvTimer = 0;
async function refrescarColab(soloResumen) {
  const ev = evaluarColab();
  const sum = $('c-sum'); if (!sum) return;
  sum.innerHTML = '<div class="resumen"><div><small>Nivel de cumplimiento total</small><strong style="color:' + COLOR_EST[ev.estatus] + '">' + fmtPct(ev.pct) + '</strong>' +
    '<span class="pill" style="background:' + FONDO_EST[ev.estatus] + ';color:' + COLOR_EST[ev.estatus] + '">' + ev.estatus + '</span></div>' +
    '<div><small>Puntos que cumplen</small><strong>' + ev.cumplen + '/' + ev.total + '</strong></div>' +
    '<div><small>Hallazgos</small><strong>' + ev.fallos + '</strong></div></div>';
  ev.areas.forEach((a, i) => { const e = document.querySelector('.pct[data-area="' + i + '"]'); if (e) { e.textContent = fmtPct(a.pct) + ' · ' + a.estatus; e.style.color = COLOR_EST[a.estatus]; } });
  clearTimeout(cvTimer);
  cvTimer = setTimeout(async () => {
    await cargarFuentes();
    const cv = $('c-cv'); if (!cv) return;
    const src = dibujarInforme(evaluarColab(), metaColab(), 2);
    cv.width = src.width; cv.height = src.height; cv.getContext('2d').drawImage(src, 0, 0);
  }, 150);
}

function renderColab() {
  $('view').innerHTML = '<h3 class="rtitle">Auditoría de Colaboración</h3>' + htmlColab();
  refrescarColab();
}

async function descargarPng() {
  await cargarFuentes();
  const cv = dibujarInforme(evaluarColab(), metaColab(), 2);
  const blob = await new Promise(res => cv.toBlob(res, 'image/png'));
  await guardarArchivo(nombreArchivo() + '.png', blob);
}
async function descargarXlsx() {
  await guardarArchivo(nombreArchivo() + '.xlsx', informeXlsx(evaluarColab(), metaColab()));
}
async function importarChecklist(file) {
  try {
    const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames.find(n => /informe/i.test(n)) || wb.SheetNames[0]];
    const ref = XLSX.utils.decode_range(ws['!ref']);
    const get = (r, c) => { const x = ws[c + r]; return x ? x.v : undefined; };
    const p = parsearChecklist(get, ref.e.r + 1);
    if (!p.puntos) { colab.msg = 'No se encontraron puntos de checklist en ese archivo. Usa el formato del informe ejecutivo.'; return renderColab(); }
    chkCustom[colab.suc] = p.plantilla; escribirLS(LS_CHK, chkCustom); subirChecklist(colab.suc);
    const r = registro(colab.suc, colab.mes); r.resp = p.resp; r.obs = {}; if (p.nombre) r.nombre = p.nombre;
    persistir();
    colab.msg = 'Checklist importado: ' + p.plantilla.areas.length + ' áreas y ' + p.puntos + ' puntos para ' + colab.suc + '.';
  } catch (e) { colab.msg = 'No se pudo leer el archivo de Excel.'; }
  renderColab();
}

/* Eventos de la pantalla (delegados en #view) */
$('view').addEventListener('change', e => {
  if (current !== 'colab') return; const t = e.target;
  if (t.id === 'c-suc') { colab.suc = t.value; colab.msg = ''; return renderColab(); }
  if (t.id === 'c-mes') { if (t.value) { colab.mes = t.value; colab.msg = ''; renderColab(); } return; }
  if (t.id === 'c-file') { if (t.files[0]) importarChecklist(t.files[0]); t.value = ''; return; }
  const r = registro(colab.suc, colab.mes);
  if (t.id === 'c-nom') { r.nombre = t.value.trim() || nombreDef(colab.suc); }
  else if (t.id === 'c-ap') { r.aplicar = t.checked; }
  else if (t.dataset.c !== undefined) { r.resp[t.dataset.c] = t.checked; const o = t.closest('.pt').querySelector('.hall'); o.hidden = t.checked; }
  else if (t.dataset.o !== undefined) { r.obs[t.dataset.o] = t.value; }
  else return;
  persistir(); refrescarColab();
});
$('view').addEventListener('click', e => {
  if (current !== 'colab') return; const id = e.target.id; if (!id || id.slice(0, 2) !== 'c-') return;
  const pl = plantillaDe(colab.suc), r = registro(colab.suc, colab.mes);
  if (id === 'c-all' || id === 'c-none') { const v = id === 'c-all'; pl.areas.forEach((a, ai) => a.grupos.forEach((g, gi) => g.items.forEach((_, ii) => { r.resp[ai + '.' + gi + '.' + ii] = v; }))); persistir(); colab.msg = ''; renderColab(); }
  else if (id === 'c-xl') descargarXlsx();
  else if (id === 'c-png') descargarPng();
  else if (id === 'c-imp') $('c-file').click();
  else if (id === 'c-rst') { delete chkCustom[colab.suc]; escribirLS(LS_CHK, chkCustom); subirChecklist(colab.suc); persistir(); colab.msg = 'Se quitó el checklist importado.'; renderColab(); }
});
