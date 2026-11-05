/* ============================================================
   AUDITORÍA DE COLABORACIÓN: checklists, cálculo y utilidades
   Para cambiar los criterios de estatus edita UMBRALES.
   Para configurar el checklist de otra sucursal, agrégalo en CHECKLISTS
   (o impórtalo desde un Excel con el mismo formato del informe ejecutivo).
   ============================================================ */
const UMBRALES = { cumple: 90, seguimiento: 70 };   // % (celdas D46 y D47 del Excel)
const COLOR_EST = { 'Cumple': '#1F7A4D', 'En seguimiento': '#C98A0B', 'Requiere atención': '#B83A32' };
const FONDO_EST = { 'Cumple': '#E8F1ED', 'En seguimiento': '#F9F3E6', 'Requiere atención': '#F8EBEA' };
const MESES_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const estatusDe = p => p + 1e-9 >= UMBRALES.cumple ? 'Cumple' : p + 1e-9 >= UMBRALES.seguimiento ? 'En seguimiento' : 'Requiere atención';
// 82.7586 -> "82.8%", 68.75 -> "68.8%", 100 -> "100%"
const fmtPct = v => { const r = Math.round(v * 10) / 10; return (Number.isInteger(r) ? String(r) : r.toFixed(1)) + '%'; };
const sinPunto = s => String(s ?? '').trim().replace(/[.:\s]+$/, '').trim();
const oracion = s => { const t = sinPunto(s).replace(/\s*\(s\)\s*/ig, ' ').replace(/\s+/g, ' ').trim().toLowerCase(); return t.charAt(0).toUpperCase() + t.slice(1); };
const cortoDe = o => o.corto || oracion(o.nombre);
const titulo = s => String(s).trim().toLowerCase().split(/\s+/).map((w, i) => (i > 0 && /^(de|del|la|y)$/.test(w)) ? w : w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
const periodoTexto = p => { const [a, m] = String(p).split('-'); return { anio: a, mes: MESES_ES[(+m || 1) - 1] || '', mes3: (MESES_ES[(+m || 1) - 1] || '').slice(0, 3) }; };

/* ---- Checklist de KURODA MOSAIKOS (octubre 2026) ----
   Cada área tiene grupos (subtítulos del Excel). Un grupo con nombre '' no muestra subtítulo.
   t = texto del punto tal como aparece en el Excel
   h = texto del hallazgo en la imagen (si no se indica, se usa t sin el punto final)
   corto = nombre corto para la imagen (si no se indica, se deriva del nombre) */
const pt = (t, h) => ({ t, h });
const PLANTILLA_MOSAIKOS = {
  areas: [
    { nombre: 'EFECTIVO', corto: 'Efectivo', grupos: [{ nombre: '', items: [
      pt('Arqueo punto de venta.'),
      pt('Utilizan el formato de retiros.'),
      pt('Realizan retiros de efectivo frecuentes y los registran en KUMO.'),
      pt('Retiros firmados por Cajera y verificados por Administrativo o Gerencia.'),
      pt('Toman dinero de la venta o fondo de monedas para gastos.'),
      pt('Resguarda el fondo para feria en caja de seguridad.'),
      pt('Se entrega y recolecta el fondo para cambio a la Cajera.'),
      pt('Se ingresa y se retira el fondo de caja en KUMO.'),
      pt('Bolso de mano fuera del área de Cajas.'),
      pt('Puerta cerrada y con seguro.')] }] },
    { nombre: 'FONDO (S) REVOLVENTE Y CAJA CHICA', corto: 'Fondo revolvente y caja chica', grupos: [{ nombre: '', items: [
      pt('Fondo revolvente (Pesos y/o dólares).')] }] },
    { nombre: 'ENTRADAS Y SALIDAS', corto: 'Entradas y salidas', grupos: [
      { nombre: 'Mercancía en Resguardo.', corto: 'Mercancía en resguardo', items: [
        pt('Tienen mercancía en resguardo mayor a 30 días.', 'Mercancía en resguardo con más de 30 días'),
        pt('Cliente firma de conformidad el formato.'),
        pt('Salidas pendientes de contabilizar del Centro de Resguardo.')] },
      { nombre: 'Mercancía en Stock Especial -Apartados.', corto: 'Stock especial y apartados', items: [
        pt('Se tiene material en stock especial mayor a 90 días.'),
        pt('Cuentan con apartados sin material en stock especial.')] },
      { nombre: 'Traspasos Solicitados:', corto: 'Traspasos solicitados', items: [
        pt('Con salida en tienda suministradora pendientes de entradas.'),
        pt('Solicitudes coinciden con pendientes en picking.'),
        pt('Solicitudes en backorder (sin salida).')] },
      { nombre: 'Pedidos a Proveedor:', corto: 'Pedidos a proveedor', items: [
        pt('Entradas pendientes de realizar.'),
        pt('Órdenes de compra con antigüedad mayor a un mes.')] },
      { nombre: 'Picking:', corto: 'Picking', items: [
        pt('Picking JUSTIFICADOS (ZVA05VTAS).', 'Picking justificados (ZVA05VTAS)'),
        pt('Picking pendientes de contabilizar (VL06P)'),
        pt('Picking pendientes de contabilizar (VL06G)'),
        pt('Cliente firma la tablet de recibido.')] },
      { nombre: 'Devoluciones a Proveedor:', corto: 'Devoluciones a proveedor', items: [
        pt('Solicitud de pedido pendiente de realizar en sistema.'),
        pt('Solicitud de pedido pendiente de devolución a proveedor.')] }] },
    { nombre: 'VEHÍCULOS', corto: 'Vehículos', grupos: [{ nombre: '', items: [
      pt('Licencia, póliza de seguro y tarjeta de circulación (Vigentes)'),
      pt('Todos los vehículos cuentan con responsiva.')] }] }
  ]
};

/* Checklist por sucursal. Las sucursales que no aparecen aquí usan la plantilla base
   (la de Kuroda Mosaikos) hasta que les configures la suya.
   nombre = cómo se escribe la sucursal en el informe. */
const CHECKLISTS = {
  'MOSAIKOS': { nombre: 'Kuroda Mosaikos', plantilla: PLANTILLA_MOSAIKOS }
};
const PLANTILLA_BASE = PLANTILLA_MOSAIKOS;

// Auditoría real de octubre 2026 de Kuroda Mosaikos (del Excel INFORME_EJECUTIVO_KURODA_MOSAIKOS_OK.xlsx).
// Solo se listan los puntos que NO cumplen: área.grupo.punto
const NO_CUMPLEN_MOSAIKOS_OCT26 = ['2.0.0', '2.0.2', '2.3.1', '2.4.0', '2.4.1'];
function respuestasTodas(pl, noCumplen) {
  const r = {}; pl.areas.forEach((a, ai) => a.grupos.forEach((g, gi) => g.items.forEach((_, ii) => { r[ai + '.' + gi + '.' + ii] = !noCumplen.includes(ai + '.' + gi + '.' + ii); })));
  return r;
}
const SEMILLA_AUDITORIAS = {
  'MOSAIKOS|2026-10': { resp: respuestasTodas(PLANTILLA_MOSAIKOS, NO_CUMPLEN_MOSAIKOS_OCT26), obs: {}, nombre: 'Kuroda Mosaikos', aplicar: true }
};

/* ---- Cálculo (mismas reglas del Excel) ----
   Cada punto vale lo mismo dentro de su área; % del área = puntos cumplidos / puntos del área.
   Nivel total = 1 - (puntos que no cumplen / puntos auditados). */
function evaluar(pl, resp, obs = {}) {
  let total = 0, cumplen = 0; const hallazgos = [];
  const areas = pl.areas.map((a, ai) => {
    let t = 0, c = 0;
    const grupos = a.grupos.map((g, gi) => {
      let gt = 0, gc = 0;
      const items = g.items.map((it, ii) => {
        const k = ai + '.' + gi + '.' + ii, ok = !!resp[k];
        gt++; if (ok) gc++;
        if (!ok) hallazgos.push({ k, texto: String(obs[k] || '').trim() || it.h || sinPunto(it.t), contexto: g.nombre ? cortoDe(g) : cortoDe(a) });
        return { k, t: it.t, h: it.h, ok };
      });
      t += gt; c += gc;
      return { nombre: g.nombre, corto: g.nombre ? cortoDe(g) : '', total: gt, cumplen: gc, pct: gt ? gc / gt * 100 : 0, items };
    });
    total += t; cumplen += c;
    const pct = t ? c / t * 100 : 0;
    return { nombre: a.nombre, corto: cortoDe(a), total: t, cumplen: c, pct, estatus: estatusDe(pct), grupos };
  });
  const pct = total ? cumplen / total * 100 : 0;
  return { areas, total, cumplen, fallos: total - cumplen, pct, estatus: estatusDe(pct), hallazgos };
}

/* ---- Leer un checklist desde un Excel con el formato del informe ejecutivo ----
   get(fila, columna) devuelve el valor de la celda (columna: 'A'...'F'). */
function parsearChecklist(get, ultimaFila) {
  const ESTAT = ['Cumple', 'En seguimiento', 'Requiere atención'];
  const txt = (r, c) => { const v = get(r, c); return v === undefined || v === null ? '' : String(v).trim(); };
  const areas = []; const resp = []; let area = null, grupo = null, nombreTitulo = '', per = null;
  const t1 = txt(1, 'A').match(/INFORME EJECUTIVO DE\s+(.+?)\s+(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE)\s*[-\/ ]\s*(\d{4})/i);
  if (t1) { nombreTitulo = titulo(t1[1]); per = t1[3] + '-' + String(MESES_ES.indexOf(t1[2].toLowerCase()) + 1).padStart(2, '0'); }
  for (let r = 3; r <= ultimaFila; r++) {
    const a = txt(r, 'A'); if (!a) continue;
    if (/^NIVEL DE CUMPLIMIENTO/i.test(a)) break;
    const f = txt(r, 'F'), e = get(r, 'E'), esMay = a === a.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(a);
    if (ESTAT.includes(f) && typeof e !== 'boolean' && esMay) { area = { nombre: a, grupos: [] }; areas.push(area); grupo = null; continue; }
    if (!area) continue;
    if (f === 'Cumple' || f === 'No cumple') {
      if (!grupo) { grupo = { nombre: '', items: [] }; area.grupos.push(grupo); }
      grupo.items.push({ t: a });
      const d = get(r, 'D'); resp.push(typeof e === 'boolean' ? e : (typeof d === 'number' ? d > 0 : f === 'Cumple'));
      continue;
    }
    if (!f) { grupo = { nombre: a, items: [] }; area.grupos.push(grupo); }
  }
  areas.forEach(a => { a.grupos = a.grupos.filter(g => g.items.length); });
  const pl = { areas: areas.filter(a => a.grupos.length) };
  const respMap = {}; let i = 0;
  pl.areas.forEach((a, ai) => a.grupos.forEach((g, gi) => g.items.forEach((_, ii) => { respMap[ai + '.' + gi + '.' + ii] = !!resp[i++]; })));
  return { plantilla: pl, resp: respMap, nombre: nombreTitulo, periodo: per, puntos: i };
}
