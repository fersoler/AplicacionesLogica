// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Fernando Soler Toscano
// Genera deduccion/datos/ejercicios.js con los ejercicios de deducción natural de los
// Apuntes de Lógica (temas 1 y 4), leídos del fuente LaTeX del libro.
// Uso: node herramientas/ejercicios.js   (APUNTES=ruta del libro, por defecto ../ApuntesLogica)
// No incluye soluciones. Deja fuera los ejercicios que no piden una derivación (las
// falacias del tema 4, en las que hay que localizar el error).
'use strict';
const fs = require('fs');
const path = require('path');
const PO = require('../comun/js/primerorden.js');
const L = require('./libro.js');

const RUTA = L.rutaLibro();
const SALIDA = path.resolve(__dirname, '../deduccion/datos/ejercicios.js');
const FICHEROS = [['cap1_ejercicios.tex', 1], ['cap4_ejercicios.tex', 4]];

// Etiquetas del .aux (números de ejercicios y de secciones) y títulos de los temas.
function leerAux() {
  const etiquetas = new Map();
  const aux = path.join(RUTA, 'ApuntesLogica.aux');
  if (fs.existsSync(aux)) {
    for (const m of fs.readFileSync(aux, 'utf8').matchAll(/\\newlabel\{([^}]+)\}\{\{([^}]*)\}/g)) etiquetas.set(m[1], m[2]);
  }
  const temas = new Map();
  const toc = path.join(RUTA, 'ApuntesLogica.toc');
  if (fs.existsSync(toc)) {
    for (const m of fs.readFileSync(toc, 'utf8').matchAll(/\{chapter\}\{\\numberline \{(\d+)\}([^}]*)\}/g)) temas.set(Number(m[1]), m[2]);
  }
  return { etiquetas, temas };
}
const { etiquetas, temas } = leerAux();

// LaTeX de texto corrido a texto con los símbolos del libro.
function textoPlano(s) {
  let t = s;
  t = t.replace(/\\ref\{([^}]*)\}/g, (_, e) => etiquetas.get(e) || '');
  t = t.replace(/\\label\{[^}]*\}/g, '');
  // Primero las fórmulas, con sus símbolos; después el texto.
  const simbolos = (m) => L.latexAFormula(m).replace(/¬\s+/g, '¬').replace(/([∀∃])\s+([a-z])/g, '$1$2').replace(/\s+([IE])\b/g, '$1');
  t = t.replace(/\\\[([\s\S]*?)\\\]/g, (_, m) => ' ' + simbolos(m) + ' ');
  t = t.replace(/\$([^$]*)\$/g, (_, m) => simbolos(m));
  for (let k = 0; k < 3; k++) t = t.replace(/\\(emph|textit|textbf|text|mathrm|mbox)\{([^{}]*)\}/g, '$2');
  t = t.replace(/\\(ldots|dots)\b/g, '…').replace(/---/g, '—').replace(/--/g, '–');
  t = t.replace(/~/g, ' ').replace(/\\[,;:! ]/g, ' ').replace(/\\(hfill|quad|qquad|noindent|par)\b/g, ' ');
  t = t.replace(/[{}]/g, '').replace(/\s+/g, ' ').trim();
  return t;
}

// Fórmula LaTeX → texto con la notación del libro (comprobando que se entiende).
function formula(latex, donde) {
  const s = L.latexAFormula(latex);
  try { return PO.texto(PO.analizar(s, { atomos: true }), true); } catch (e) { throw new Error(`${donde}: no entiendo la fórmula «${s}» (${e.message})`); }
}

// Separa las premisas por las comas de primer nivel (no las de R(x, y)).
function partirComas(s) {
  const res = [];
  let nivel = 0, actual = '';
  for (const c of s) {
    if (c === '(' || c === '{') nivel++;
    if (c === ')' || c === '}') nivel--;
    if (c === ',' && nivel === 0) { res.push(actual); actual = ''; } else actual += c;
  }
  if (actual.trim()) res.push(actual);
  return res.map((x) => x.trim()).filter(Boolean);
}

// Plantilla guiada: las líneas de la derivación del libro; las justificaciones «?»
// quedan vacías para que las complete el alumno.
function plantilla(cuerpo, donde) {
  const d = L.derivacionesDe(cuerpo, donde)[0];
  if (!d || !d.crudas) return null;
  return d.crudas.map((l) => {
    const f = formula(l.latex, donde);
    if (l.macro === 'hypo') {
      if (l.prof === 0) return { prof: 0, tipo: 'premisa', formula: f, just: 'Prem.' };
      const t = /testigo\s*\$?\s*([a-r])/.exec(l.regla);
      return { prof: l.prof, tipo: 'hipotesis', formula: f, just: t ? `Hip. testigo ${t[1]}` : /IP/.test(l.regla) ? 'Hip. IP' : 'Hip.' };
    }
    const regla = l.regla === '?' ? '' : l.regla;
    const citas = l.citasTexto.replace(/--|–/g, '-').trim();
    return { prof: l.prof, tipo: 'paso', formula: f, just: regla ? `${regla}${citas ? ' ' + citas : ''}` : '' };
  });
}

// Restricciones que las instrucciones de un tema imponen a ejercicios concretos:
// «en los ejercicios~\ref{e1-15} y~\ref{e1-22}, …, usa solo reglas básicas, y en los
// ejercicios~\ref{e1-18} y~\ref{e1-23}, …, no uses DeM». Devuelve etiqueta → restricción.
function restricciones(texto) {
  const res = new Map();
  const instr = /\\begin\{quote\}([\s\S]*?)\\end\{quote\}/.exec(texto);
  if (!instr) return res;
  for (const parte of instr[1].split(/[Ee]n los ejercicios/).slice(1)) {
    const frase = parte.split(/\.\s/)[0];
    const r = {};
    if (/solo reglas básicas/.test(frase)) { r.soloBasicas = true; r.restriccion = 'Según las instrucciones del tema, usa solo reglas básicas.'; }
    const no = /no uses ([A-Za-z]+)/.exec(frase);
    if (no) { r.prohibidas = [no[1]]; r.restriccion = `Según las instrucciones del tema, no uses ${no[1]}.`; }
    for (const m of frase.matchAll(/\\ref\{(e\d+-\d+)\}/g)) res.set(m[1], r);
  }
  return res;
}

function ejerciciosDe(fichero, tema) {
  const texto = fs.readFileSync(path.join(RUTA, fichero), 'utf8');
  const restr = restricciones(texto);
  const niveles = [];
  const omitidos = [];
  const trozos = texto.split(/(?=\\section\*\{)/);
  for (const trozo of trozos) {
    const sec = /^\\section\*\{([^\n]*)\}\s*\n/.exec(trozo);
    if (!sec) continue;
    const titulo = textoPlano(sec[1]);
    const intro = /^\\section\*\{[^\n]*\}\s*\n\s*\\textit\{([\s\S]*?)\}\s*\n/.exec(trozo);
    const nivel = { titulo, descripcion: intro ? textoPlano(intro[1]) : '', ejercicios: [] };
    for (const m of trozo.matchAll(/\\begin\{pregunta\}(\[([^\]]*)\])?\s*\\label\{([^}]+)\}([\s\S]*?)\\end\{pregunta\}/g)) {
      const [, , tituloP, etiqueta, cuerpo] = m;
      const numero = etiquetas.get(etiqueta) || etiqueta.replace(/^e(\d+)-(\d+)$/, '$1.$2');
      const donde = `${fichero}, ejercicio ${numero}`;
      // El secuente: la primera fórmula con \vdash.
      // Primero las fórmulas destacadas \[…\]; si no, las $…$ en orden.
      const sinNd = cuerpo.replace(/\\begin\{nd\}[\s\S]*?\\end\{nd\}/g, (x) => ' '.repeat(x.length));
      const mates = [...sinNd.matchAll(/\\\[([\s\S]*?)\\\]/g)].concat([...sinNd.replace(/\\\[[\s\S]*?\\\]/g, (x) => ' '.repeat(x.length)).matchAll(/\$([^$]*)\$/g)].map((x) => Object.assign(x, { 2: x[1], 1: undefined })));
      const sec2 = mates.find((x) => /\\vdash/.test(x[1] || x[2] || ''));
      if (!sec2) { omitidos.push(`${numero}${tituloP ? ' (' + textoPlano(tituloP) + ')' : ''}`); continue; }
      const [izq, der] = (sec2[1] || sec2[2]).split('\\vdash');
      const premisas = partirComas(izq.replace(/\\ /g, ' ')).map((x) => formula(x, donde));
      const conclusion = formula(der.replace(/\\ /g, ' '), donde);
      const antes = cuerpo.slice(0, sec2.index);
      const despues = cuerpo.slice(sec2.index + sec2[0].length);
      const pista = /\\textit\{Pista\.\}([\s\S]*?)(?=\\textbf\{Plantilla|\\begin\{center\}|$)/.exec(despues);
      const nd = /\\begin\{nd\}[\s\S]*?\\end\{nd\}/.exec(despues);
      const e = { numero, etiqueta, titulo: tituloP ? textoPlano(tituloP) : '', enunciado: textoPlano(antes), premisas, conclusion };
      if (/reglas básicas/i.test(e.enunciado)) e.soloBasicas = true;
      if (restr.has(etiqueta)) Object.assign(e, restr.get(etiqueta));
      if (pista) e.pista = textoPlano(pista[1]);
      if (nd) {
        e.plantilla = plantilla(nd[0], donde);
        const prem = e.plantilla.filter((l) => l.tipo === 'premisa').map((l) => l.formula);
        if (prem.join('|') !== premisas.join('|')) throw new Error(`${donde}: las premisas de la plantilla no son las del ejercicio.`);
      }
      nivel.ejercicios.push(e);
    }
    if (nivel.ejercicios.length) niveles.push(nivel);
  }
  return { tema, titulo: temas.get(tema) || `Tema ${tema}`, niveles, omitidos };
}

const resultado = FICHEROS.map(([f, t]) => ejerciciosDe(f, t));
const datos = {
  fuente: 'Apuntes de Lógica (Grado en Filosofía, Universidad de Sevilla), ejercicios de deducción natural de los temas 1 y 4.',
  temas: resultado.map(({ tema, titulo, niveles }) => ({ tema, titulo, niveles })),
};
const cabecera = [
  '// SPDX-License-Identifier: CC-BY-SA-4.0',
  '// Tomados de: Fernando Soler Toscano, Apuntes de Lógica (Grado en Filosofía, Universidad de Sevilla), CC BY-SA 4.0.',
  '// Ejercicios de deducción natural de los Apuntes de Lógica (temas 1 y 4), sin soluciones.',
  '// Generado a partir del fuente del libro con «node herramientas/ejercicios.js»: si',
  '// cambian los ejercicios del libro, vuelve a generarlo en lugar de editarlo a mano.',
  '// El contenido es JSON (véase comun/js/datos.js).',
];
fs.mkdirSync(path.dirname(SALIDA), { recursive: true });
fs.writeFileSync(SALIDA, `${cabecera.join('\n')}\nDatos.registrar("ejercicios-deduccion", ${JSON.stringify(datos, null, 2)});\n`);
const total = datos.temas.reduce((s, t) => s + t.niveles.reduce((u, n) => u + n.ejercicios.length, 0), 0);
console.log(`Escrito ${path.relative(process.cwd(), SALIDA)}: ${total} ejercicios.`);
resultado.forEach((r) => { if (r.omitidos.length) console.log(`Tema ${r.tema}: omitidos (no piden una derivación): ${r.omitidos.join(', ')}.`); });
