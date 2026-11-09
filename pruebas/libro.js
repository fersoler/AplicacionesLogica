// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Fernando Soler Toscano
// Comprueba con el verificador todas las derivaciones de los Apuntes de Lógica.
// Uso: node pruebas/libro.js [-v]   (APUNTES=ruta del libro, por defecto ../ApuntesLogica)
'use strict';
const V = require('../comun/js/verificador.js');
const L = require('../herramientas/libro.js');
const detalle = process.argv.includes('-v');

const ds = L.derivaciones();
if (!ds.length) { console.log(`No se encuentra el libro en ${L.rutaLibro()}.`); process.exit(0); }
const cuenta = { correctas: 0, fallan: 0, esquemas: 0, erroresDetectados: 0, erroresNoDetectados: 0 };
const informe = [];
for (const d of ds) {
  const sitio = `${d.fichero}:${d.lineaTex}`;
  if (d.estado === 'esquema') {
    cuenta.esquemas++;
    if (detalle) informe.push(`  [esquema] ${sitio}: ${d.motivo}`);
    continue;
  }
  const r = V.verificar(d.lineas, { esquema: !!d.esquemaDeRegla });
  if (d.estado === 'falacia') {
    // Ejercicios de falacias: tiene que haber exactamente un error.
    if (r.errores.length === 1) { cuenta.erroresDetectados++; informe.push(`  [falacia, detectada] ${sitio} («${d.pregunta}»), línea ${r.errores[0].linea}: ${r.errores[0].mensaje}`); }
    else { cuenta.erroresNoDetectados++; informe.push(`  [FALACIA CON ${r.errores.length} ERRORES] ${sitio}: ${r.errores.map((x) => `línea ${x.linea}: ${x.mensaje}`).join(' | ')}`); }
    continue;
  }
  if (d.estado === 'error-esperado') {
    const e = r.errores.find((x) => x.linea === d.errorEsperado.linea);
    if (e) { cuenta.erroresDetectados++; informe.push(`  [error del libro, detectado] ${sitio}, línea ${e.linea}: ${e.mensaje} (el libro: ${d.errorEsperado.nota})`); }
    else { cuenta.erroresNoDetectados++; informe.push(`  [ERROR DEL LIBRO NO DETECTADO] ${sitio}, línea ${d.errorEsperado.linea}: ${d.errorEsperado.nota}`); }
    continue;
  }
  if (r.correcta) {
    cuenta.correctas++;
    if (d.esquemaDeRegla) cuenta.esquemasRegla = (cuenta.esquemasRegla || 0) + 1;
    if (detalle) informe.push(`  [bien] ${sitio} (${d.lineas.length} líneas${d.renombrada ? `; ${d.renombrada}` : ''}${d.esquemaDeRegla ? '; esquema de regla' : ''})`);
  } else {
    cuenta.fallan++;
    informe.push(`  [FALLA] ${sitio}${d.renombrada ? ` (${d.renombrada})` : ''}`);
    d.lineas.forEach((l, i) => {
      const e = r.errores.filter((x) => x.linea === i + 1).map((x) => x.mensaje).join(' ');
      informe.push(`      ${String(i + 1).padStart(2)} ${'│ '.repeat(l.prof)}${l.texto.padEnd(34)} ${l.tipo === 'paso' ? `${l.regla} ${l.citas.map((c) => (Array.isArray(c) ? c.join('-') : c)).join(', ')}` : l.tipo}${e ? '   ← ' + e : ''}`);
    });
  }
}
console.log(informe.join('\n'));
console.log(`Derivaciones del libro: ${ds.length}. Correctas: ${cuenta.correctas} (${cuenta.esquemasRegla || 0} de ellas, esquemas de reglas). Fallan: ${cuenta.fallan}. Esquemas sin comprobar: ${cuenta.esquemas}. Errores intencionados (falacias) detectados: ${cuenta.erroresDetectados} de ${cuenta.erroresDetectados + cuenta.erroresNoDetectados}.`);
process.exitCode = cuenta.fallan || cuenta.erroresNoDetectados ? 1 : 0;
