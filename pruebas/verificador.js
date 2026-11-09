// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Fernando Soler Toscano
// Pruebas del verificador de deducción natural: reglas de primer orden, restricciones
// y mutaciones de las derivaciones del libro con un oráculo semántico.
// Uso: node pruebas/verificador.js [semilla] [mutaciones por derivación]
'use strict';
const PO = require('../comun/js/primerorden.js');
const V = require('../comun/js/verificador.js');
const L = require('../herramientas/libro.js');
let fallos = 0, pruebas = 0;
const ok = (cond, msj) => { pruebas++; if (!cond) { fallos++; console.log('FALLO:', msj); } };
const A = (s) => PO.analizar(s, { atomos: true });
let semilla = Number(process.argv[2] || 1) >>> 0;
const rnd = () => { semilla = (semilla * 1664525 + 1013904223) >>> 0; return semilla / 2 ** 32; };
const elige = (xs) => xs[Math.floor(rnd() * xs.length)];

// Derivación a partir de filas [prof, tipo, fórmula, regla, citas, testigo].
const D = (filas) => filas.map(([prof, tipo, s, regla, citas, testigo]) => ({ prof, tipo: { P: 'premisa', H: 'hipotesis', S: 'paso' }[tipo], f: A(s), regla, citas: citas || [], testigo }));
const bien = (filas, desc, op) => { const r = V.verificar(D(filas), op); ok(r.correcta, `${desc}: ${JSON.stringify(r.errores)}`); };
const mal = (filas, desc, trozo, op) => {
  const r = V.verificar(D(filas), op);
  ok(!r.correcta && (!trozo || r.errores.some((e) => e.mensaje.includes(trozo))), `${desc} (debería fallar${trozo ? ` con «${trozo}»` : ''}): ${JSON.stringify(r.errores)}`);
};

// ---- 1. Casos a mano ---------------------------------------------------------------------
// ∀E
bien([[0, 'P', '∀x (P(x) → Q(x))'], [0, 'S', 'P(a) → Q(a)', '∀E', [1]]], '∀E');
bien([[0, 'P', '∀x R(x, c)'], [0, 'S', 'R(c, c)', '∀E', [1]]], '∀E con una constante que ya estaba');
mal([[0, 'P', '∀x R(x, x)'], [0, 'S', 'R(a, b)', '∀E', [1]]], '∀E con dos constantes distintas', '∀E da A(c)');
mal([[0, 'P', '∀x R(x, x)'], [0, 'S', 'R(a, x)', '∀E', [1]]], '∀E dejando una variable', 'sentencias');
mal([[0, 'P', '∃x P(x)'], [0, 'S', 'P(a)', '∀E', [1]]], '∀E sobre un existencial', 'universal');
// ∀I
bien([[0, 'P', '∀x P(x)'], [0, 'S', 'P(a)', '∀E', [1]], [0, 'S', '∀y P(y)', '∀I', [2]]], '∀I');
mal([[0, 'P', 'P(a)'], [0, 'S', '∀x P(x)', '∀I', [1]]], '∀I con la constante en una premisa', 'premisa');
mal([[0, 'P', '∀x R(x, x)'], [0, 'S', 'R(a, a)', '∀E', [1]], [0, 'S', '∀x R(x, a)', '∀I', [2]]], '∀I sin sustituir todas', 'sigue apareciendo');
mal([[0, 'P', '∀x (P(x) ∧ ∀x Q(x))'], [0, 'S', 'P(a) ∧ ∀x Q(x)', '∀E', [1]], [0, 'S', '∀x (P(x) ∧ ∀x Q(x))', '∀I', [2]]], '∀I con la variable ya en A(c)', 'ya aparece');
mal([[0, 'P', '∀x (P(x) → Q(x))'], [1, 'H', 'P(a)'], [1, 'S', '∀x P(x)', '∀I', [2]]], '∀I con la constante en una hipótesis activa', 'hipótesis activa');
bien([[0, 'P', '∀x (P(x) → Q(x))'], [1, 'H', 'P(a)'], [1, 'S', 'P(a) → Q(a)', '∀E', [1]], [1, 'S', 'Q(a)', '→E', [3, 2]], [0, 'S', 'P(a) → Q(a)', '→I', [[2, 4]]], [0, 'S', '∀x (P(x) → Q(x))', '∀I', [5]]],
  '∀I tras cerrar la caja: la hipótesis ya no está activa');
// ∃I
bien([[0, 'P', 'R(a, a)'], [0, 'S', '∃x R(x, a)', '∃I', [1]]], '∃I sustituyendo solo algunas apariciones');
bien([[0, 'P', 'R(a, a)'], [0, 'S', '∃x R(x, x)', '∃I', [1]]], '∃I sustituyendo todas');
mal([[0, 'P', 'R(a, b)'], [0, 'S', '∃x R(x, x)', '∃I', [1]]], '∃I con constantes distintas', '∃I');
mal([[0, 'P', '∀x P(x) ∧ Q(a)'], [0, 'S', '∃x (∀x P(x) ∧ Q(x))', '∃I', [1]]], '∃I con la variable ya en A(c)', 'ya aparece');
// ∃E
const exE = (tes) => [[0, 'P', '∃x P(x)'], [0, 'P', '∀x (P(x) → Q(x))'], [1, 'H', 'P(c)', undefined, undefined, tes], [1, 'S', 'P(c) → Q(c)', '∀E', [2]], [1, 'S', 'Q(c)', '→E', [4, 3]], [1, 'S', '∃x Q(x)', '∃I', [5]], [0, 'S', '∃x Q(x)', '∃E', [1, [3, 6]]]];
bien(exE('c'), '∃E');
bien(exE(undefined), '∃E sin testigo declarado');
mal(exE('d'), '∃E con otro testigo declarado', 'declara el testigo');
mal([[0, 'P', '∃x P(x)'], [1, 'H', 'P(c)'], [1, 'S', 'P(c)', 'R', [2]], [0, 'S', 'P(c)', '∃E', [1, [2, 3]]]], '∃E con el testigo en la conclusión', 'conclusión');
mal([[0, 'P', 'Q(c)'], [0, 'P', '∃x P(x)'], [1, 'H', 'P(c)'], [1, 'S', 'P(c) ∧ Q(c)', '∧I', [3, 1]], [1, 'S', '∃x (P(x) ∧ Q(x))', '∃I', [4]], [0, 'S', '∃x (P(x) ∧ Q(x))', '∃E', [2, [3, 5]]]], '∃E con el testigo en una premisa', 'premisa');
mal([[0, 'P', '∃x R(x, c)'], [1, 'H', 'R(c, c)'], [1, 'S', '∃y R(y, y)', '∃I', [2]], [0, 'S', '∃y R(y, y)', '∃E', [1, [2, 3]]]], '∃E con el testigo en el existencial', 'tiene que ser nueva');
mal([[0, 'P', '∃x P(x)'], [1, 'H', 'P(c)'], [1, 'S', '∃y P(y)', '∃I', [2]], [0, 'S', '∃y P(y)', '∃E', [[2, 3], 1]]], '∃E con las citas al revés', 'primero');
mal([[0, 'P', '∃x P(x)'], [1, 'H', 'Q(c)'], [1, 'S', '∃y Q(y)', '∃I', [2]], [0, 'S', '∃y Q(y)', '∃E', [1, [2, 3]]]], '∃E con una hipótesis que no es A(c)', 'empezar con A(c)');
mal([[0, 'P', 'p ∨ q'], [1, 'H', 'p'], [1, 'S', 'q ∨ p', '∨I', [2]], [1, 'H', 'q'], [1, 'S', 'q ∨ p', '∨I', [4]], [0, 'S', 'q ∨ p', '∨E', [[2, 3], [4, 5], 1]]], '∨E con las cajas antes que la disyunción', 'primero');
bien([[0, 'P', 'p ∨ q'], [1, 'H', 'p'], [1, 'S', 'q ∨ p', '∨I', [2]], [1, 'H', 'q'], [1, 'S', 'q ∨ p', '∨I', [4]], [0, 'S', 'q ∨ p', '∨E', [1, [2, 3], [4, 5]]]], '∨E');
// =I, =E
bien([[0, 'S', 'a = a', '=I', []]], '=I');
mal([[0, 'S', 'a = b', '=I', []]], '=I con dos constantes', '=I');
bien([[0, 'P', 'a = b'], [0, 'P', 'P(a)'], [0, 'S', 'P(b)', '=E', [1, 2]]], '=E');
bien([[0, 'P', 'a = b'], [0, 'P', 'P(b)'], [0, 'S', 'P(a)', '=E', [1, 2]]], '=E en sentido inverso');
bien([[0, 'P', 'a = b'], [0, 'P', 'R(a, a)'], [0, 'S', 'R(a, b)', '=E', [1, 2]]], '=E en algunas apariciones');
mal([[0, 'P', 'a = b'], [0, 'P', 'R(a, b)'], [0, 'S', 'R(b, a)', '=E', [1, 2]]], '=E en los dos sentidos a la vez', '=E');
mal([[0, 'P', 'a = b'], [0, 'P', 'P(a)'], [0, 'S', 'P(b)', '=E', [2, 1]]], '=E con las citas al revés', 'primero la identidad');
bien([[0, 'P', 'a = b'], [0, 'S', 'a = a', '=I', []], [0, 'S', 'b = a', '=E', [1, 2]]], 'simetría de la identidad');
mal([[0, 'P', 'a = b'], [0, 'P', 'P(a)'], [0, 'S', 'P(c)', '=E', [1, 2]]], '=E con otra constante', '=E');
mal([[0, 'P', 'a = b'], [0, 'P', 'P(a)'], [0, 'S', 'P(a)', '=E', [1, 2]]], '=E sin cambiar nada', 'al menos una');
// CQ
bien([[0, 'P', '¬∀x P(x)'], [0, 'S', '∃x ¬P(x)', 'CQ', [1]]], 'CQ ¬∀ → ∃¬');
bien([[0, 'P', '∃x ¬P(x)'], [0, 'S', '¬∀x P(x)', 'CQ', [1]]], 'CQ ∃¬ → ¬∀');
bien([[0, 'P', '¬∃x P(x)'], [0, 'S', '∀x ¬P(x)', 'CQ', [1]]], 'CQ ¬∃ → ∀¬');
bien([[0, 'P', '∀x ¬P(x)'], [0, 'S', '¬∃x P(x)', 'CQ', [1]]], 'CQ ∀¬ → ¬∃');
mal([[0, 'P', '¬∀x P(x)'], [0, 'S', '∀x ¬P(x)', 'CQ', [1]]], 'CQ equivocada', 'CQ');
mal([[0, 'P', '¬∀x P(x)'], [0, 'S', '∃x ¬P(x)', 'CQ', [1]]], 'CQ con solo reglas básicas', 'derivada', { soloBasicas: true });
// Generales
mal([[0, 'P', 'P(a)'], [0, 'S', 'P(a) ∨ Q(x)', '∨I', [1]]], 'línea con variable libre', 'sentencias');
mal([[0, 'P', 'p'], [1, 'H', 'q'], [1, 'S', 'p ∧ q', '∧I', [1, 2]], [0, 'S', 'p ∧ q', 'R', [3]]], 'cita de una caja cerrada', 'caja ya cerrada');
mal([[0, 'P', 'p → q'], [0, 'P', 'p'], [0, 'S', 'q', '→E', [2, 1]]], '→E con las citas al revés', 'primero el condicional');
mal([[0, 'P', 'p → q'], [0, 'P', '¬q'], [0, 'S', '¬p', 'MT', [1, 2]]], 'MT con solo reglas básicas', 'derivada', { soloBasicas: true });

// ---- 2. Mutaciones de las derivaciones del libro con oráculo semántico --------------------
// Si el verificador acepta una derivación alterada, cada línea del nivel principal tiene
// que seguirse de las premisas: se busca un contramodelo de dominio 1, 2 o 3.
function contramodelo(premisas, conclusion) {
  const formulas = premisas.concat([{ op: 'not', a: conclusion }]);
  const preds = new Map();
  formulas.forEach((f) => PO.predicados(f).forEach((p) => preds.set(p.nombre, p.args.length)));
  const consts = [...new Set(formulas.flatMap((f) => [...PO.constantes(f)]))];
  for (const n of [1, 2, 3]) {
    const lista = [...preds.entries()];
    const tam = lista.map(([, ar]) => n ** ar);
    const bitsP = tam.reduce((s, t) => s + t, 0);
    if (bitsP + consts.length * Math.log2(n) > 17) continue;
    const D = Array.from({ length: n }, (_, i) => i + 1);
    const asigC = consts.reduce((acc) => acc.flatMap((a) => D.map((d) => a.concat([d]))), [[]]);
    for (let bits = 0; bits < 2 ** bitsP; bits++) {
      let desp = 0;
      const ext = new Map();
      lista.forEach(([p, ar], i) => { ext.set(p, { ar, bits: Math.floor(bits / 2 ** desp) % (2 ** tam[i]) }); desp += tam[i]; });
      for (const ac of asigC) {
        const M = {
          D, constante: (c) => ac[consts.indexOf(c)],
          predicado: (p) => ({ aridad: ext.get(p).ar, ext: (...ds) => Math.floor(ext.get(p).bits / 2 ** ds.reduce((s, d) => s * n + (d - 1), 0)) % 2 }),
        };
        if (formulas.every((f) => PO.satisface(f, M))) return { n };
      }
    }
  }
  return null;
}
const CONST = 'abcdefghijklmnopqr'.split('');
function mutarTerminos(f, viejo, nuevo) {
  let hecho = false;
  const t = (x) => { if (!hecho && x.tipo === 'const' && x.nombre === viejo && rnd() < 0.7) { hecho = true; return { tipo: 'const', nombre: nuevo }; } return x; };
  const rec = (g) => {
    switch (g.op) {
      case 'pred': return { op: 'pred', nombre: g.nombre, args: g.args.map(t) };
      case 'eq': return { op: 'eq', a: t(g.a), b: t(g.b) };
      case 'bot': return g;
      case 'not': return { op: 'not', a: rec(g.a) };
      case 'forall': case 'exists': return { op: g.op, v: g.v, a: rec(g.a) };
      default: return { op: g.op, a: rec(g.a), b: rec(g.b) };
    }
  };
  return rec(f);
}
function mutarFormula(f) {
  const x = rnd();
  const consts = [...PO.constantes(f)];
  if (x < 0.45 && consts.length) return mutarTerminos(f, elige(consts), elige(CONST.slice(0, 6)));
  if (x < 0.6 && (f.op === 'forall' || f.op === 'exists')) return { op: f.op === 'forall' ? 'exists' : 'forall', v: f.v, a: f.a };
  if (x < 0.75 && f.op === 'not') return f.a;
  if (x < 0.85) return { op: 'not', a: f };
  if (f.a && f.b && f.op !== 'eq') return { op: elige(['and', 'or', 'imp', 'iff'].filter((o) => o !== f.op)), a: f.a, b: f.b };
  return { op: 'not', a: f };
}
const derivs = L.derivaciones().filter((d) => d.estado === 'normal' && !d.esquemaDeRegla);
let mutantes = 0, aceptados = 0, rechazados = 0;
for (const d of derivs) {
  for (let k = 0; k < Number(process.argv[3] || 40); k++) {
    const lin = d.lineas.map((l) => Object.assign({}, l, { citas: l.citas ? l.citas.slice() : l.citas }));
    const pasos = lin.map((l, i) => i).filter((i) => lin[i].tipo !== 'premisa');
    if (!pasos.length) break;
    const i = elige(pasos);
    if (rnd() < 0.75 || !lin[i].citas || !lin[i].citas.length) lin[i].f = mutarFormula(lin[i].f);
    else {
      const j = Math.floor(rnd() * lin[i].citas.length);
      if (Array.isArray(lin[i].citas[j])) continue;
      lin[i].citas[j] = 1 + Math.floor(rnd() * i);
    }
    mutantes++;
    const r = V.verificar(lin);
    if (!r.correcta) { rechazados++; continue; }
    aceptados++;
    const premisas = lin.filter((l) => l.tipo === 'premisa').map((l) => l.f);
    lin.forEach((l, n) => {
      if (l.prof !== 0 || l.tipo === 'premisa') return;
      const cm = contramodelo(premisas, l.f);
      ok(!cm, `${d.fichero}:${d.lineaTex}: el verificador acepta una derivación alterada cuya línea ${n + 1} (${PO.texto(l.f)}) no se sigue de las premisas (contramodelo de ${cm && cm.n} elementos)`);
    });
  }
}

console.log(`Pruebas: ${pruebas}. Fallos: ${fallos}.`);
console.log(`Mutaciones de ${derivs.length} derivaciones del libro: ${mutantes} (${rechazados} rechazadas; ${aceptados} aceptadas, todas comprobadas con el oráculo semántico).`);
process.exitCode = fallos ? 1 : 0;
