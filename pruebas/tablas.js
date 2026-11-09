// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Fernando Soler Toscano
// Pruebas de la semántica proposicional (tablas de verdad, consecuencia, asignación
// directa y formalización).
// Uso: node pruebas/tablas.js [argumentos aleatorios] [semilla]
'use strict';
const F = require('../comun/js/formulas.js');
const S = require('../tablas/js/semantica.js');
const E = require('../tablas/js/ejercicios.js');
let fallos = 0, pruebas = 0;
const ok = (cond, msj) => { pruebas++; if (!cond) { fallos++; console.log('FALLO:', msj); } };
const A = F.analizar;
const N = Number(process.argv[2] || 20000);
let semilla = Number(process.argv[3] || 1) >>> 0;
const rnd = () => { semilla = (semilla * 1664525 + 1013904223) >>> 0; return semilla / 2 ** 32; };

// 1. Tabla del silogismo hipotético (§2.3): columnas y valores como en el libro.
{
  const t = S.tabla([A('((p → q) ∧ (q → r)) → (p → r)')]);
  ok(t.columnas.map((c) => c.texto).join(' | ') === 'p | q | r | p → q | q → r | (p → q) ∧ (q → r) | p → r | ((p → q) ∧ (q → r)) → (p → r)',
    'columnas del silogismo hipotético: ' + t.columnas.map((c) => c.texto).join(' | '));
  ok(t.columnas[3].valores.join('') === '11001111', 'columna p → q');
  ok(t.columnas[5].valores.join('') === '10001011', 'columna de la conjunción');
  ok(S.clasificar(t.columnaDe(0).valores) === 'tautologia', 'tautología');
  ok(t.columnas[5].hijos.join() === '3,4', 'dependencias de la conjunción');
}
{
  const t = S.tabla([A('(p ∨ q) → (p ∧ q)')]);
  ok(t.columnaDe(0).valores.join('') === '1001', 'fórmula contingente del §2.3');
  ok(S.clasificar(t.columnaDe(0).valores) === 'contingente', 'contingente');
  ok(S.clasificar(S.tabla([A('p ↔ ¬p')]).columnaDe(0).valores) === 'contradiccion', 'contradicción');
}
// Varias fórmulas: columnas compartidas y principales.
{
  const t = S.tabla([A('p → q'), A('¬p ∨ q'), A('p')]);
  ok(t.columnas.filter((c) => c.texto === 'p').length === 1 && t.columnaDe(2).tipo === 'var', 'una variable como fórmula');
  ok(S.equivalencia(A('p → q'), A('¬p ∨ q')).equivalentes, 'definición del condicional');
  ok(!S.equivalencia(A('p → q'), A('q → p')).equivalentes, 'recíproco');
  ok(S.equivalencia(A('p → q'), A('q → p')).diferencias.join() === '1,2', 'filas en que difieren');
  ok(S.filasModelo(S.tabla([A('p → q'), A('p'), A('¬q')]), [0, 1, 2]).length === 0, 'conjunto insatisfacible');
  ok(S.tabla([A('p ∧ ⊥')]).columnas.some((c) => c.tipo === 'bot'), 'columna de ⊥');
}

// 2. Consecuencia (§2.6): los ejemplos del libro.
{
  const c = S.consecuencia([A('p → q'), A('q')], A('p'));
  ok(!c.valida && c.contraejemplos.join() === '2', 'afirmación del consecuente: fila 3 (p = 0, q = 1)');
  ok(S.porQueNoContraejemplo(c.tabla, 2, 0) === 'la conclusión es verdadera', 'motivo: conclusión verdadera');
  ok(S.porQueNoContraejemplo(c.tabla, 2, 3) === 'la premisa 2 es falsa', 'motivo: premisa falsa');
  ok(S.consecuencia([A('p → q'), A('¬q')], A('¬p')).valida, 'modus tollens');
  ok(S.consecuencia([], A('(p → q) ∨ (q → p)')).valida, 'sin premisas');
  ok(S.consecuencia([A('p'), A('¬p')], A('q')).valida, 'premisas insatisfacibles');
}

// 3. Evaluación paso a paso: el ejemplo de §2.2.
{
  const pasos = S.pasosEvaluacion(A('(p ∧ ¬q) → (q ∨ ¬r)'), { p: 1, q: 0, r: 1 });
  ok(pasos.map((x) => `${F.textoExplicito(x.f)}=${x.valor}`).join(', ') === '¬q=1, p ∧ ¬q=1, ¬r=0, q ∨ ¬r=0, (p ∧ ¬q) → (q ∨ ¬r)=0', 'pasos del §2.2');
  ok(pasos[4].razon === 'el antecedente es verdadero y el consecuente falso', 'razón del condicional');
}

// 4. Asignación directa: los dos ejemplos del libro y argumentos al azar.
{
  const r1 = S.asignacionDirecta([A('p → q'), A('q')], A('p'));
  ok(!r1.valida && r1.contraejemplo.p === 0 && r1.contraejemplo.q === 1, 'afirmación del consecuente por asignación directa');
  const r2 = S.asignacionDirecta([A('p → q'), A('¬q')], A('¬p'));
  const textos = r2.pasos.map(S.textoPaso);
  ok(r2.valida, 'modus tollens por asignación directa');
  ok(textos[0] === 'Forzamos la conclusión como falsa: v(¬p) = 0.', textos[0]);
  ok(textos[1] === 'v(¬p) = 0 obliga a que v(p) = 1.', textos[1]);
  ok(textos.some((s) => s === 'Forzamos la premisa 2 como verdadera: v(¬q) = 1.'), 'la premisa 2 antes que la 1');
  ok(textos[textos.length - 1] === 'Pero, con v(p) = 1 y v(q) = 0, resulta v(p → q) = 0: contradicción.', textos[textos.length - 1]);
  for (const [ps, c] of [[['p → p'], 'q'], [[], 'p → p'], [['p ∨ p'], 'p'], [[], 'p ↔ p'], [['p ↔ p'], '⊥'], [['⊥'], 'p'], [[], '¬⊥']]) {
    const r = S.asignacionDirecta(ps.map(A), A(c));
    ok(r.valida === S.consecuencia(ps.map(A), A(c)).valida, `miembros iguales o ⊥: ${ps.join(', ')} / ${c}`);
  }
}

function formulaAzar(vars, prof) {
  if (prof === 0 || rnd() < 0.25) return rnd() < 0.04 ? F.BOT : F.Var(vars[Math.floor(rnd() * vars.length)]);
  const x = rnd();
  if (x < 0.2) return F.No(formulaAzar(vars, prof - 1));
  const op = ['and', 'or', 'imp', 'iff'][Math.floor(rnd() * 4)];
  return F.Bin(op, formulaAzar(vars, prof - 1), formulaAzar(vars, prof - 1));
}
let validos = 0, ramas = 0, maxPasos = 0;
const cuentaPasos = (pasos) => pasos.reduce((n, p) => n + 1 + (p.ramas ? p.ramas.reduce((m, r) => m + cuentaPasos(r.pasos), 0) : 0), 0);
for (let k = 0; k < N; k++) {
  const vars = ['p', 'q', 'r', 's'].slice(0, 1 + Math.floor(rnd() * 4));
  const premisas = Array.from({ length: Math.floor(rnd() * 4) }, () => formulaAzar(vars, 3));
  const conclusion = formulaAzar(vars, 3);
  const tabla = S.consecuencia(premisas, conclusion);
  let r;
  try { r = S.asignacionDirecta(premisas, conclusion); } catch (e) {
    ok(false, `excepción: ${premisas.map(F.texto).join(', ')} / ${F.texto(conclusion)}: ${e.stack}`);
    continue;
  }
  const desc = `${premisas.map(F.texto).join(', ')} / ${F.texto(conclusion)}`;
  ok(r.valida === tabla.valida, `veredicto: ${desc}`);
  if (!r.valida) {
    const w = r.contraejemplo;
    ok(premisas.every((p) => F.evalua(p, w) === 1) && F.evalua(conclusion, w) === 0, `contraejemplo: ${desc}`);
  }
  const textos = [];
  (function recoge(ps) { ps.forEach((p) => { textos.push(S.textoPaso(p)); if (p.ramas) p.ramas.forEach((x) => recoge(x.pasos)); }); })(r.pasos);
  ok(textos.every((s) => s && !s.includes('undefined')), `textos: ${desc}\n${textos.join('\n')}`);
  if (r.valida) validos++;
  if (JSON.stringify(r.pasos.map((p) => p.tipo)).includes('casos')) ramas++;
  maxPasos = Math.max(maxPasos, cuentaPasos(r.pasos));
}

// 5. Formalización: las soluciones solo usan el diccionario, los errores previstos
// son de verdad errores y se detectan, y las fórmulas equivalentes se aceptan.
for (const fr of E.FRASES) {
  const sol = A(fr.solucion);
  ok(S.comprobarFormalizacion(sol, fr).estado === 'bien', `solución: ${fr.frase}`);
  for (const e of fr.errores) {
    const r = S.comprobarFormalizacion(A(e.formula), fr);
    ok(r.estado === 'mal' && r.mensaje === e.mensaje, `error previsto: ${fr.frase} / ${e.formula}`);
  }
}
const fr8 = E.FRASES.find((x) => x.frase.startsWith('Iremos'));
ok(S.comprobarFormalizacion(A('m ∨ c'), fr8).estado === 'bien', 'a menos que: m ∨ c');
const fr10 = E.FRASES.find((x) => x.frase.startsWith('O bien'));
ok(S.comprobarFormalizacion(A('(d ∨ h) ∧ ¬(d ∧ h)'), fr10).estado === 'bien', 'o bien… o bien');
ok(S.comprobarFormalizacion(A('x → s'), E.FRASES[3]).estado === 'letras', 'letra fuera del diccionario');
const sin = S.comprobarFormalizacion(A('l ∧ s'), E.FRASES[3]);
ok(sin.estado === 'mal' && sin.mensaje === null && sin.interpretacion.l === 0, 'error no previsto: interpretación en que difieren');

// 6. Ejemplos y sintaxis.
for (const e of E.EJEMPLOS_TABLA) for (const s of e.formulas) ok(F.variables(A(s)).length <= S.MAX_VARIABLES, `ejemplo: ${s}`);
for (const e of E.EJEMPLOS_CONSECUENCIA) [...e.premisas, e.conclusion].forEach((s) => ok(A(s), `ejemplo: ${s}`));
try { A('p v q'); ok(false, 'p v q debería fallar'); } catch (e) { ok(e.message.includes('La v es una variable'), 'aviso de la v'); }
ok(F.texto(A('p <-> q <-> r')) === 'p ↔ (q ↔ r)' && A('p -> q -> r').b.op === 'imp', 'agrupación por la derecha');
ok(F.textoExplicito(A('~p & q | r -> s <-> t')) === '(((¬p ∧ q) ∨ r) → s) ↔ t', 'precedencia con paréntesis explícitos');
ok(A('~p & q | r -> s <-> t').op === 'iff' && A('~p & q | r -> s <-> t').a.op === 'imp' && A('~p & q | r -> s <-> t').a.a.op === 'or', 'precedencia ¬, ∧, ∨, →, ↔');

console.log(`Pruebas: ${pruebas}. Fallos: ${fallos}.`);
console.log(`Argumentos al azar: ${N} (${validos} válidos; ${ramas} con casos). Paso más largo: ${maxPasos} pasos.`);
process.exitCode = fallos ? 1 : 0;
