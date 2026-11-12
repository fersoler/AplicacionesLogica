// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Fernando Soler Toscano
// Lectura de las derivaciones de los Apuntes de Lógica (fuente LaTeX, paquete fitch)
// para comprobarlas con el verificador. Uso desde Node.
//
// Cada derivación \begin{nd} … \end{nd} se convierte en el formato del verificador:
// {prof, tipo, f, regla, citas, testigo}. Las que son esquemas (con ⋮, «?», Γ…) se
// marcan como tales y no se comprueban. Las que el libro presenta como errores
// («¡Error ∃E!») se marcan para comprobar que el verificador las rechaza.
'use strict';
const fs = require('fs');
const path = require('path');
const PO = require('../comun/js/primerorden.js');

const FICHEROS = ['capitulos/cap1_teoria.tex', 'capitulos/cap1_ejercicios.tex', 'capitulos/cap3_metalociga.tex', 'capitulos/cap4_teoria.tex', 'capitulos/cap4_ejercicios.tex', 'capitulos/apendice_soluciones.tex', 'capitulos/apendice_resumen_reglas.tex'];

// Macros de reglas de fitch.sty y de \myrules del preámbulo del libro.
const MACROS = {
  r: 'R', ai: '∧I', ae: '∧E', oi: '∨I', oe: '∨E', ni: '¬I', ne: '¬E', ci: '→I', ce: '→E',
  bi: '↔I', be: '↔E', x: 'X', ip: 'IP', ds: 'DS', mt: 'MT', lem: 'LEM', dne: 'DNE', dem: 'DeM',
  cq: 'CQ', Ai: '∀I', Ae: '∀E', Ei: '∃I', Ee: '∃E', idi: '=I', ide: '=E',
};
const SIMBOLOS = [
  [/\\(lnot|neg)\b/g, '¬'], [/\\(land|wedge)\b/g, '∧'], [/\\(lor|vee)\b/g, '∨'],
  [/\\leftrightarrow\b/g, '↔'], [/\\(to|rightarrow|supset)\b/g, '→'], [/\\bot\b/g, '⊥'],
  [/\\forall\b/g, '∀'], [/\\exists\b/g, '∃'], [/\\(neq|ne)\b/g, '≠'],
  [/\\left\b|\\right\b/g, ''], [/\\[,;:! ]/g, ' '], [/~/g, ' '], [/\$/g, ''],
];

// Argumento entre llaves (o corchetes) equilibrados a partir de la posición i.
function argumento(s, i, abre = '{', cierra = '}') {
  while (s[i] === ' ' || s[i] === '\t') i++;
  if (s[i] !== abre) return null;
  let nivel = 0;
  for (let j = i; j < s.length; j++) {
    if (s[j] === abre) nivel++;
    else if (s[j] === cierra && --nivel === 0) return { valor: s.slice(i + 1, j), fin: j + 1 };
  }
  return null;
}

function latexAFormula(s) {
  let t = s.replace(/\\(text|mathrm|mbox)\{([^{}]*)\}/g, ' $2');
  for (const [re, rep] of SIMBOLOS) t = t.replace(re, rep);
  return t.replace(/[{}]/g, '').replace(/\s+/g, ' ').trim();
}

function normalizarRegla(s) {
  let t = s;
  for (const [re, rep] of SIMBOLOS) t = t.replace(re, rep);
  return t.replace(/[{}]/g, '').replace(/\s+/g, ' ').trim();
}

// Justificación: {regla, citas (texto)} a partir del resto de la línea.
function justificacion(resto) {
  const m = /^\s*\\([A-Za-z]+)/.exec(resto);
  if (!m) return { regla: '', citas: '' };
  let i = m[0].length;
  if (m[1] === 'by') {
    const a = argumento(resto, i);
    if (!a) return { regla: '?', citas: '' };
    const b = argumento(resto, a.fin);
    return { regla: normalizarRegla(a.valor), citas: b ? b.valor : '' };
  }
  const a = argumento(resto, i);
  return { regla: MACROS[m[1]] || '\\' + m[1], citas: a ? a.valor : '' };
}

// Las derivaciones de un fichero, con su número de línea en el .tex.
function derivacionesDe(texto, fichero) {
  const res = [];
  const re = /\\begin\{nd\}(\[[^\]]*\])?([\s\S]*?)\\end\{nd\}/g;
  let m;
  while ((m = re.exec(texto))) {
    const lineaTex = texto.slice(0, m.index).split('\n').length;
    const cuerpo = m[2].split('\n').map((x) => x.replace(/(^|[^\\])%.*$/, '$1')).join(' ');
    const lineas = [];
    let prof = 0;
    let esquema = null;
    // Cada orden (\hypo, \have, \open, \close) llega hasta la siguiente, aunque ocupe
    // varias líneas del .tex.
    const toks = cuerpo.split(/(?=\\(?:hypo|have|open|close)\b)/).map((x) => x.replace(/\s+/g, ' ').trim()).filter(Boolean);
    // Pregunta que contiene la derivación (para reconocer las falacias del tema 4).
    const antes = texto.slice(0, m.index);
    const ip = antes.lastIndexOf('\\begin{pregunta}');
    const pregunta = ip >= 0 && antes.lastIndexOf('\\end{pregunta}') < ip ? (/\\begin\{pregunta\}\[([^\]]*)\]/.exec(antes.slice(ip)) || [])[1] || '' : null;
    for (const l of toks) {
      if (/^\\open\b/.test(l)) { prof++; continue; }
      if (/^\\close\b/.test(l)) { prof--; continue; }
      const h = /^\\(hypo|have)\s*/.exec(l);
      if (!h) { esquema = esquema || `línea no reconocida: ${l}`; continue; }
      let i = h[0].length;
      const opt = argumento(l, i, '[', ']');
      if (opt) i = opt.fin;
      const etq = argumento(l, i);
      if (!etq) { esquema = esquema || 'sin etiqueta'; continue; }
      let form = argumento(l, etq.fin);
      if (!form) {
        // fitch admite una fórmula de un solo símbolo sin llaves: \have [m] {1} A
        const t = /^\s*([^\s\\{}]+)/.exec(l.slice(etq.fin));
        if (t) form = { valor: t[1], fin: etq.fin + t[0].length };
      }
      if (!form) { esquema = esquema || 'sin fórmula'; continue; }
      const just = justificacion(l.slice(form.fin));
      lineas.push({ macro: h[1], prof, etiqueta: etq.valor.trim(), mostrado: opt ? opt.valor.trim() : '', latex: form.valor, regla: just.regla, citasTexto: just.citas });
    }
    res.push(convertir({ fichero, lineaTex, lineas, esquema, pregunta }));
  }
  return res;
}

// Convierte las líneas leídas al formato del verificador.
function convertir(d) {
  const r = { fichero: d.fichero, lineaTex: d.lineaTex, estado: 'normal', motivo: d.esquema, lineas: [], errorEsperado: null, pregunta: d.pregunta, crudas: d.lineas };
  if (d.esquema) { r.estado = 'esquema'; return r; }
  const pos = new Map();
  d.lineas.forEach((l, i) => { pos.set(l.etiqueta, i + 1); if (l.mostrado && !pos.has(l.mostrado)) pos.set(l.mostrado, i + 1); });
  const esquema = (motivo) => { r.estado = 'esquema'; r.motivo = r.motivo || motivo; };
  let anterior = null;
  for (const l of d.lineas) {
    const texto = latexAFormula(l.latex);
    if (/\\(vdots|dots|ldots|Gamma|Delta|mathcal|text|mathit)|\.\.\./.test(l.latex) || !texto) { esquema('esquema (⋮, Γ, …)'); break; }
    let f;
    try { f = PO.analizar(texto, { atomos: true }); } catch (e) { esquema(`fórmula no reconocida: ${texto} (${e.message})`); break; }
    const linea = { f, texto };
    if (l.macro === 'hypo') {
      if (l.prof === 0) linea.tipo = 'premisa';
      else {
        if (anterior && anterior.prof >= l.prof && anterior.macro === 'hypo' && anterior.prof === l.prof) { esquema('dos hipótesis seguidas en la misma caja'); break; }
        linea.tipo = 'hipotesis';
        const t = /testigo\s*\$?\s*([a-z])/.exec(l.regla);
        if (t) linea.testigo = t[1];
      }
      linea.prof = l.prof;
    } else if (!l.regla && l.prof === 0 && !r.lineas.some((x) => x.tipo !== 'premisa')) {
      // Esquemas de las reglas: las líneas de partida no llevan justificación.
      linea.tipo = 'premisa';
      linea.prof = 0;
      r.esquemaDeRegla = true;
    } else {
      linea.tipo = 'paso';
      linea.prof = l.prof;
      let regla = l.regla;
      const error = /^¡Error\s*([^!]*)!\s*(.*)$/.exec(regla);
      if (error) { regla = normalizarRegla(error[1]); r.errorEsperado = { linea: r.lineas.length + 1, regla, nota: error[2] }; }
      if (!regla || regla === '?' || /Deriv|Teorema|Lema/.test(regla)) { esquema(`justificación «${l.regla || '(vacía)'}»`); break; }
      linea.regla = regla.replace(/\s+/g, '');
      linea.citas = [];
      const citas = l.citasTexto.replace(/\$/g, '').replace(/--|–|—/g, '-').split(',').map((x) => x.trim()).filter(Boolean);
      for (const c of citas) {
        const rango = c.split('-').map((x) => x.trim());
        const nums = rango.map((x) => pos.get(x));
        if (nums.some((x) => x === undefined)) { esquema(`cita no reconocida: ${c}`); break; }
        linea.citas.push(nums.length === 2 ? nums : nums[0]);
      }
      if (r.estado === 'esquema') break;
    }
    r.lineas.push(linea);
    anterior = l;
  }
  if (r.estado === 'esquema') return r;
  if (r.errorEsperado) r.estado = 'error-esperado';
  else if (d.pregunta && /falacia/i.test(d.pregunta)) r.estado = 'falacia';
  renombrarSocrates(r);
  return r;
}

// El libro usa s como constante (Sócrates), pero en la sintaxis de las aplicaciones
// s es una variable. Si s aparece libre en una derivación y ningún cuantificador la
// liga, se cambia por una constante que no se use.
function renombrarSocrates(r) {
  const libreS = r.lineas.some((l) => PO.libres(l.f).has('s'));
  if (!libreS) return;
  const usadas = new Set();
  r.lineas.forEach((l) => PO.constantes(l.f, usadas));
  const k = 'abcdefghijklmnopqr'.split('').reverse().find((c) => !usadas.has(c));
  const sust = (f) => {
    const t = (x) => (x.tipo === 'var' && x.nombre === 's' ? { tipo: 'const', nombre: k } : x);
    switch (f.op) {
      case 'pred': return { op: 'pred', nombre: f.nombre, args: f.args.map(t) };
      case 'eq': return { op: 'eq', a: t(f.a), b: t(f.b) };
      case 'bot': return f;
      case 'not': return { op: 'not', a: sust(f.a) };
      case 'forall': case 'exists': return f.v === 's' ? f : { op: f.op, v: f.v, a: sust(f.a) };
      default: return { op: f.op, a: sust(f.a), b: sust(f.b) };
    }
  };
  r.lineas.forEach((l) => { l.f = sust(l.f); });
  r.renombrada = `s → ${k}`;
}

function rutaLibro() {
  return process.env.APUNTES || path.resolve(__dirname, '../../ApuntesLogica');
}

function derivaciones(ruta = rutaLibro()) {
  return FICHEROS.flatMap((f) => {
    const p = path.join(ruta, f);
    if (!fs.existsSync(p)) return [];
    return derivacionesDe(fs.readFileSync(p, 'utf8'), f);
  });
}

module.exports = { derivaciones, derivacionesDe, latexAFormula, argumento, rutaLibro, FICHEROS };
