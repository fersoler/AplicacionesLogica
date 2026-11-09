// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Fernando Soler Toscano
// Pruebas del motor de tableaux.
// Uso: node pruebas/tableaux.js [conjuntos al azar] [semilla]
'use strict';
const PO = require('../comun/js/primerorden.js');
const TB = require('../tableaux/js/tableaux.js');
let fallos = 0, pruebas = 0;
const ok = (cond, msj) => { pruebas++; if (!cond) { fallos++; console.log('FALLO:', msj); } };
const N = Number(process.argv[2] || 3000);
let semilla = Number(process.argv[3] || 1) >>> 0;
const rnd = () => { semilla = (semilla * 1664525 + 1013904223) >>> 0; return semilla / 2 ** 32; };
const elige = (xs) => xs[Math.floor(rnd() * xs.length)];
const OPC = { atomos: true, compacta: true };
const A = (s) => PO.analizar(s, OPC);

function construir(formulas, opciones) {
  const T = TB.crear(formulas.map((s, i) => ({ f: typeof s === 'string' ? A(s) : s, papel: `f${i + 1}` })), opciones);
  return TB.completar(T);
}
// Descripción de un árbol: «n. fórmula [regla, desde]» y el final de cada rama.
const lineas = (T) => T.nodos.map((x) => `${x.n}. ${x.texto}${x.regla ? ` [${x.regla}, ${x.desde}]` : ''}`);
const finales = (T) => T.ramas.map((r) => (r.fin === 'cerrada' ? `⊗ ${r.cierre.join(', ')}` : r.fin.toUpperCase()));

// 1. Los ejemplos del libro, nodo a nodo.
{
  const T = construir(['(p ∨ q) ∧ ¬p', '¬q']);
  ok(lineas(T).join(' | ') === '1. (p ∨ q) ∧ ¬p | 2. ¬q | 3. p ∨ q [α, 1] | 4. ¬p [α, 1] | 5. p [β, 3] | 6. q [β, 3]', 'silogismo disyuntivo: ' + lineas(T).join(' | '));
  ok(finales(T).join(' | ') === '⊗ 4, 5 | ⊗ 2, 6', 'cierres del silogismo disyuntivo: ' + finales(T).join(' | '));
}
{
  const T = construir(['∀x (P(x) → Q(x))', '∃x P(x)', '¬∃x Q(x)']);
  ok(lineas(T).slice(3).join(' | ') === '4. P(a) [δ, 2] | 5. P(a) → Q(a) [γ, 1] | 6. ¬Q(a) [γ, 3] | 7. ¬P(a) [β, 5] | 8. Q(a) [β, 5]', '§6.6, ejemplo 1: ' + lineas(T).join(' | '));
  ok(finales(T).join(' | ') === '⊗ 4, 7 | ⊗ 6, 8', '§6.6, ejemplo 1, cierres');
  ok(TB.estado(T).cerrado, '§6.6, ejemplo 1, cerrado');
}
{
  const T = construir(['∃x P(x)', '∃x Q(x)', '¬∃x (P(x) ∧ Q(x))']);
  ok(lineas(T).slice(3).join(' | ') === '4. P(a) [δ, 1] | 5. Q(b) [δ, 2] | 6. ¬(P(a) ∧ Q(a)) [γ, 3] | 7. ¬(P(b) ∧ Q(b)) [γ, 3] | 8. ¬P(a) [β, 6] | 9. ¬Q(a) [β, 6] | 10. ¬P(b) [β, 7] | 11. ¬Q(b) [β, 7]',
    '§6.6, ejemplo 2: ' + lineas(T).join(' | '));
  ok(finales(T).join(' | ') === '⊗ 4, 8 | ABIERTA | ⊗ 5, 11', '§6.6, ejemplo 2, ramas: ' + finales(T).join(' | '));
  const m = TB.modelo(T, TB.estado(T).abiertas[0]);
  ok(m.D.join() === 'a,b' && m.extensiones.map((e) => `${e.nombre}=${e.tuplas.join(';')}`).join(' ') === 'P=a Q=b', '§6.6, modelo: ' + JSON.stringify(m.extensiones));
  ok(m.literales.join(', ') === 'P(a), Q(b), ¬Q(a), ¬P(b)', 'Ω del §6.6: ' + m.literales.join(', '));
}
{
  // §6.9: rama infinita con la regla δ estándar; modelo finito con la de Boolos.
  const T = construir(['∀x ∃y R(x, y)', '∀x ¬R(x, x)'], { limite: 5 });
  const e = TB.estado(T);
  ok(!e.decidido && e.incompletas.length > 0, '§6.9 con δ estándar: sin decidir');
  const B = construir(['∀x ∃y R(x, y)', '∀x ¬R(x, x)'], { limite: 5, boolos: true });
  const eb = TB.estado(B);
  ok(eb.abiertas.length > 0, '§6.9 con Boolos: rama abierta');
  const mb = TB.modelo(B, eb.abiertas[0]);
  ok(mb.D.join() === 'a,b' && mb.extensiones[0].tuplas.map((t) => t.join('')).join(',') === 'ab,ba', '§6.9 con Boolos: ' + JSON.stringify(mb.extensiones));
}
{
  // γ sin constantes en la rama introduce una nueva; Darapti sin importación existencial.
  const T = construir(['∀x (M(x) → P(x))', '∀x (M(x) → S(x))', '¬∃x (S(x) ∧ P(x))']);
  const e = TB.estado(T);
  ok(e.abiertas.length > 0 && TB.modelo(T, e.abiertas[0]).D.join() === 'a', 'Darapti: contramodelo con D = {a}');
  ok(T.nodos[3].nueva === true && T.nodos[3].constante === 'a', 'γ con constante nueva');
  // Paradoja del bebedor: γ se vuelve a usar con la constante nueva.
  const B = construir(['¬∃x (P(x) → ∀y P(y))']);
  ok(TB.estado(B).cerrado, 'paradoja del bebedor');
  ok(B.nodos.filter((x) => x.regla === 'γ').length === 2, 'γ reutilizada con la constante nueva');
  // Sintaxis compacta
  ok(PO.clave(A('Ax(Px -> Qx)')) === PO.clave(A('∀x (P(x) → Q(x))')) && PO.clave(A('AxEy Rxy')) === PO.clave(A('∀x ∃y R(x, y)')), 'sintaxis compacta');
  // Copiado del PDF del libro: la variable va pegada al predicado (∀xP (x)).
  ok(PO.clave(A('∀xP (x) ∧ ∀x(∃yQ(y) ∧ P (x))')) === PO.clave(A('∀x P(x) ∧ ∀x (∃y Q(y) ∧ P(x))')), 'cuantificador pegado al predicado');
  ok(PO.clave(PO.analizar('∀xTriángulo(x)')) === PO.clave(PO.analizar('∀x Triángulo(x)')), 'cuantificador pegado a un predicado-palabra');
  ok(TB.comprobarFormula(A('∀x P(x) → Q(x)')).includes('libre'), 'variable libre en la raíz');
  ok(TB.comprobarFormula(A('a = b')).includes('identidad'), 'identidad');
}

{
  // Cierre a mano: el alumno señala los nodos contradictorios.
  const M = TB.crear([{ f: A('(p ∨ q) ∧ ¬p'), papel: 'Premisa' }, { f: A('¬q'), papel: 'Negación de la conclusión' }], { cierreManual: true });
  TB.prepararManual(M);
  TB.aplicarManual(M, 1);
  TB.aplicarManual(M, 3);
  ok(M.ramas.every((r) => !r.fin) && TB.porCerrar(M).length === 2, 'cierre a mano: las ramas no se cierran solas');
  ok(TB.cerrarManual(M, 5, [4, 5]).tipo === 'cierre', 'cierre a mano: 4 y 5');
  ok(TB.cerrarManual(M, 6, [2, 4]).error.includes('no son contradictorios'), 'cierre a mano: par no contradictorio');
  ok(TB.cerrarManual(M, 6, [5, 2]).error.includes('no está en esta rama'), 'cierre a mano: nodo de otra rama');
  ok(TB.cerrarManual(M, 6, [6, 2]).tipo === 'cierre' && M.terminado && TB.estado(M).cerrado, 'cierre a mano: 2 y 6, tableau cerrado');
  ok(TB.textoPaso(M, M.pasos[M.pasos.length - 1]) === 'Se cierra la rama: los nodos 2 (¬q) y 6 (q) son contradictorios.', 'texto del cierre a mano');
  // Terminar automáticamente cierra lo que el alumno ha dejado sin cerrar.
  const M2 = TB.crear([{ f: A('p ∧ ¬p'), papel: 'Fórmula' }], { cierreManual: true });
  TB.prepararManual(M2);
  TB.aplicarManual(M2, 1);
  ok(!M2.terminado && TB.porCerrar(M2).length === 1, 'rama con contradicción pendiente de cerrar');
  TB.completar(M2);
  ok(TB.estado(M2).cerrado && M2.pasos[M2.pasos.length - 1].tipo === 'cierre', 'terminar automáticamente cierra la rama');
  // Raíz contradictoria: en modo a mano no se cierra sola.
  const M3 = TB.crear([{ f: A('p'), papel: 'x' }, { f: A('¬p'), papel: 'x' }], { cierreManual: true });
  TB.prepararManual(M3);
  ok(!M3.terminado && TB.cerrarManual(M3, 2, [1, 2]).tipo === 'cierre' && M3.terminado, 'raíz contradictoria cerrada a mano');
}

// 2. Propiedades generales con conjuntos al azar.
function proposicionalAzar(prof) {
  if (prof === 0 || rnd() < 0.3) return { op: 'pred', nombre: elige(['p', 'q', 'r']), args: [] };
  if (rnd() < 0.2) return { op: 'not', a: proposicionalAzar(prof - 1) };
  return { op: elige(['and', 'or', 'imp', 'iff']), a: proposicionalAzar(prof - 1), b: proposicionalAzar(prof - 1) };
}
function primerOrdenAzar(prof, vars) {
  if (prof === 0 || rnd() < 0.25) {
    const term = () => (vars.length && rnd() < 0.7 ? { tipo: 'var', nombre: elige(vars) } : { tipo: 'const', nombre: elige(['a', 'b']) });
    const p = elige(['P', 'Q', 'R']);
    return { op: 'pred', nombre: p, args: p === 'R' ? [term(), term()] : [term()] };
  }
  const x = rnd();
  if (x < 0.15) return { op: 'not', a: primerOrdenAzar(prof - 1, vars) };
  if (x < 0.45) {
    const v = elige(['x', 'y']);
    return { op: elige(['forall', 'exists']), v, a: primerOrdenAzar(prof - 1, [...new Set([...vars, v])]) };
  }
  return { op: elige(['and', 'or', 'imp', 'iff']), a: primerOrdenAzar(prof - 1, vars), b: primerOrdenAzar(prof - 1, vars) };
}
// ¿Tiene el conjunto un modelo con dominio de 1 o 2 elementos? (búsqueda exhaustiva)
function modeloPequeno(formulas) {
  const preds = new Map();
  formulas.forEach((f) => PO.predicados(f).forEach((p) => preds.set(p.nombre, p.args.length)));
  const consts = [...new Set(formulas.flatMap((f) => [...PO.constantes(f)]))];
  for (const n of [1, 2]) {
    const D = Array.from({ length: n }, (_, i) => i + 1);
    const lista = [...preds.entries()];
    const tamaños = lista.map(([, ar]) => n ** ar);
    const total = tamaños.reduce((s, t) => s + t, 0) + consts.length * Math.log2(n || 1);
    if (total > 16) continue;
    const combos = 2 ** tamaños.reduce((s, t) => s + t, 0);
    const asigC = consts.reduce((acc) => acc.flatMap((a) => D.map((d) => a.concat([d]))), [[]]);
    for (let bits = 0; bits < combos; bits++) {
      let desp = 0;
      const ext = new Map();
      lista.forEach(([p, ar], i) => { ext.set(p, { ar, bits: (bits >> desp) & ((1 << tamaños[i]) - 1) }); desp += tamaños[i]; });
      for (const ac of asigC) {
        const M = {
          D,
          constante: (c) => ac[consts.indexOf(c)],
          predicado: (p) => ({ aridad: ext.get(p).ar, ext: (...ds) => { const k = ds.reduce((s, d) => s * n + (d - 1), 0); return (ext.get(p).bits >> k) & 1; } }),
        };
        if (formulas.every((f) => PO.satisface(f, M))) return true;
      }
    }
  }
  return false;
}
function comprobarArbol(T, formulas, desc) {
  const e = TB.estado(T);
  e.abiertas.forEach((r) => {
    ok(!TB.contradiccion(r), `rama abierta con contradicción: ${desc}`);
    const m = TB.modelo(T, r);
    ok(formulas.every((f) => PO.satisface(f, m.M)), `el modelo de la rama abierta satisface la raíz: ${desc}`);
  });
  if (e.cerrado) ok(!modeloPequeno(formulas), `cerrado pero con modelo: ${desc}`);
  T.nodos.forEach((x) => { if (x.hijos.length > 2 && !T.opciones.boolos) ok(false, `más de dos hijos: ${desc}`); });
  comprobarExportacion(T, Infinity, desc);
  const pasos = T.nodos.reduce((m, x) => Math.max(m, x.paso), 0);
  if (pasos > 1) comprobarExportacion(T, 1 + (exportadas % pasos), desc + ' (a medias)');
  return e;
}
// Exportación a texto y a LaTeX del árbol visible hasta el paso kk: cada nodo sale una
// vez, cada rama terminada tiene su final, y en LaTeX no quedan símbolos sin traducir.
let exportadas = 0;
function comprobarExportacion(T, kk, desc) {
  exportadas++;
  const visibles = T.nodos.filter((x) => x.paso < kk);
  const finales = T.ramas.filter((r) => r.fin && r.pasoFin < kk && r.hoja.paso < kk).length;
  const txt = TB.aTexto(T, kk).split('\n');
  const numeros = txt.map((l) => /^[│├└─ ]*(\d+)\. /.exec(l)).filter(Boolean).map((m) => Number(m[1]));
  ok(numeros.length === visibles.length && new Set(numeros).size === numeros.length
    && visibles.every((x) => numeros.includes(x.n)), `texto: nodos ${numeros.length} de ${visibles.length} en ${desc}`);
  ok(txt.filter((l) => /^[│├└─ ]*(⊗|ABIERTA|INCOMPLETA)/.test(l)).length === finales, `texto: finales de rama en ${desc}`);
  const tex = TB.aLatex(T, kk);
  const cuenta = (re) => (tex.match(re) || []).length;
  ok(cuenta(/\\node\[/g) + cuenta(/\\node \(/g) === visibles.length + finales, `LaTeX: nodos en ${desc}`);
  ok(cuenta(/\\draw /g) === visibles.length - 1 + finales, `LaTeX: aristas en ${desc}`);
  ok(cuenta(/\{/g) === cuenta(/\}/g) && cuenta(/\$/g) % 2 === 0, `LaTeX: llaves o $ desparejados en ${desc}`);
  ok(!/[¬∧∨→↔⊥∀∃≠⊗αβγδσ]/.test(tex), `LaTeX: símbolo sin traducir en ${desc}`);
}
// Forma normal negativa: equivale a la fórmula, así que {A, ¬fnn(A)} es insatisfacible.
function fnn(f, neg = false) {
  const N2 = (g) => ({ op: 'not', a: g });
  switch (f.op) {
    case 'pred': return neg ? N2(f) : f;
    case 'not': return fnn(f.a, !neg);
    case 'and': case 'or': {
      const op = neg ? (f.op === 'and' ? 'or' : 'and') : f.op;
      return { op, a: fnn(f.a, neg), b: fnn(f.b, neg) };
    }
    case 'imp': return fnn({ op: 'or', a: N2(f.a), b: f.b }, neg);
    case 'iff': return fnn({ op: 'and', a: { op: 'imp', a: f.a, b: f.b }, b: { op: 'imp', a: f.b, b: f.a } }, neg);
    case 'forall': case 'exists': {
      const op = neg ? (f.op === 'forall' ? 'exists' : 'forall') : f.op;
      return { op, v: f.v, a: fnn(f.a, neg) };
    }
  }
  return f;
}
let cerrados = 0, abiertos = 0, sinDecidir = 0, maxNodos = 0, insatisfacibles = 0, agotados = 0;
for (let k = 0; k < N; k++) {
  const prop = k % 3 === 0;
  const n = 1 + Math.floor(rnd() * 3);
  let formulas = Array.from({ length: n }, () => (prop ? proposicionalAzar(3) : primerOrdenAzar(3, [])));
  const insat = k % 2 === 1;
  if (insat) formulas = [formulas[0], { op: 'not', a: fnn(formulas[0]) }];
  const desc = formulas.map((f) => TB.texto(f)).join(' ; ');
  const boolos = !prop && rnd() < 0.4;
  let T;
  try { T = construir(formulas, { limite: 4, boolos }); } catch (e) { ok(false, `excepción: ${desc}: ${e.stack}`); continue; }
  const e = comprobarArbol(T, formulas, desc + (boolos ? ' (Boolos)' : ''));
  if (insat) { insatisfacibles++; ok(!e.abiertas.length, `rama abierta en un conjunto insatisfacible: ${desc}`); }
  if (T.agotado) agotados++;
  if (prop && !T.agotado) {
    ok(e.decidido, `proposicional sin decidir: ${desc}`);
    ok(e.cerrado === !modeloPequeno(formulas), `proposicional: cerrado si y solo si insatisfacible: ${desc}`);
  }
  T.pasos.forEach((p) => ok(!TB.textoPaso(T, p).includes('undefined'), `texto del paso: ${desc}`));
  if (e.cerrado) cerrados++; else if (e.abiertas.length) abiertos++; else sinDecidir++;
  maxNodos = Math.max(maxNodos, T.nodos.length);

  // Construcción a mano con elecciones al azar: el veredicto ha de ser coherente.
  if (k % 4 === 0) {
    const manualCierre = k % 8 === 0;
    const M = TB.crear(formulas.map((f) => ({ f, papel: 'raíz' })), { limite: 4, boolos, cierreManual: manualCierre });
    TB.prepararManual(M);
    for (let i = 0; i < 120 && !M.terminado; i++) {
      const candidatos = M.nodos.map((x) => ({ x, o: TB.opcionesNodo(M, x) })).filter((c) => c.o.aplicable);
      const conC = manualCierre ? M.ramas.filter((r) => !r.fin && TB.contradiccion(r)) : [];
      if (conC.length && (rnd() < 0.5 || !candidatos.length)) {
        const r = elige(conC);
        const res = TB.cerrarManual(M, r.hoja.n, TB.contradiccion(r));
        ok(!res.error, `cierre a mano: ${res.error} en ${desc}`);
        continue;
      }
      if (!candidatos.length) break;
      const c = elige(candidatos);
      const k2 = c.o.tipo === 'γ' && !c.o.nueva ? elige(c.o.constantes) : undefined;
      const r = TB.aplicarManual(M, c.x.n, k2);
      ok(!r.error, `aplicación manual: ${r.error} en ${desc}`);
    }
    if (manualCierre) TB.completar(M);
    comprobarArbol(M, formulas, 'a mano: ' + desc);
  }
}
console.log(`Pruebas: ${pruebas}. Fallos: ${fallos}.`);
console.log(`Conjuntos al azar: ${N}, ${insatisfacibles} de ellos insatisfacibles por construcción (${cerrados} cerrados, ${abiertos} abiertos, ${sinDecidir} sin decidir). Árbol más grande: ${maxNodos} nodos; ${agotados} llegan al límite de 500 nodos.`);
process.exitCode = fallos ? 1 : 0;
