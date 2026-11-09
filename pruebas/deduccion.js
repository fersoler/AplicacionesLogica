// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Fernando Soler Toscano
// Pruebas del núcleo del asistente de deducción natural.
// Uso: node pruebas/deduccion.js
'use strict';
const PO = require('../comun/js/primerorden.js');
const E = require('../deduccion/js/editor.js');
const L = require('../herramientas/libro.js');
let fallos = 0, pruebas = 0;
const ok = (cond, msj) => { pruebas++; if (!cond) { fallos++; console.log('FALLO:', msj); } };

// 1. Justificaciones
const J = (s) => JSON.stringify(E.leerJustificacion(s));
ok(J('→E 1, 2') === '{"regla":"→E","citas":[1,2]}', '→E 1, 2');
ok(J('->E 1,2') === '{"regla":"→E","citas":[1,2]}', '->E 1,2');
ok(J('&E1') === '{"regla":"∧E","citas":[1]}', '&E1');
ok(J('∃E 1, 3-5') === '{"regla":"∃E","citas":[1,[3,5]]}', '∃E 1, 3-5');
ok(J('EE 1, 3–5') === '{"regla":"∃E","citas":[1,[3,5]]}', 'EE con raya');
ok(J('|E 1, 2 - 3, 4-5') === '{"regla":"∨E","citas":[1,[2,3],[4,5]]}', '|E con espacios en el intervalo');
ok(J('=I') === '{"regla":"=I","citas":[]}', '=I');
ok(J('dem 3') === '{"regla":"DeM","citas":[3]}', 'dem en minúsculas');
ok(J('~E 4, 2') === '{"regla":"¬E","citas":[4,2]}', '~E');
ok(E.leerJustificacion('').vacia, 'vacía');
ok(E.leerJustificacion('1, 2').error.includes('Falta el nombre'), 'sin regla');
ok(E.leerJustificacion('Z 1').error.includes('No reconozco'), 'regla desconocida');
ok(E.leerJustificacion('→I 5-3').error.includes('menor'), 'intervalo al revés');
ok(E.leerHipotesis('Hip. testigo c').testigo === 'c' && E.leerHipotesis('testigo d').etiqueta === 'Hip. testigo d', 'hipótesis con testigo');
ok(E.leerHipotesis('Hip. IP').etiqueta === 'Hip. IP' && E.leerHipotesis('').etiqueta === 'Hip.', 'otras hipótesis');

// 2. Comprobación de una prueba en curso
const prob = E.leerProblema('p → q\nq → r', 'p → r');
const L1 = (filas) => filas.map(([prof, tipo, formula, just]) => ({ prof, tipo, formula, just }));
const prueba = L1([[0, 'premisa', 'p → q', 'Prem.'], [0, 'premisa', 'q → r', 'Prem.'], [1, 'hipotesis', 'p', 'Hip.'], [1, 'paso', 'q', '->E 1, 3'], [1, 'paso', 'r', '→E 2, 4'], [0, 'paso', 'p → r', '→I 3-5']]);
let c = E.comprobar(prob, prueba);
ok(c.completa && c.mensaje.startsWith('Prueba completa'), 'prueba completa: ' + c.mensaje);
c = E.comprobar(prob, prueba.slice(0, 5));
ok(!c.completa && !c.errores && c.mensaje.includes('cierra las cajas'), 'falta cerrar la caja: ' + c.mensaje);
const conError = prueba.map((l) => Object.assign({}, l));
conError[3].just = '→E 3, 1';
c = E.comprobar(prob, conError);
ok(c.lineas[3].estado === 'error' && c.lineas[3].mensajes[0].includes('primero el condicional'), 'orden de las citas');
const conVacia = prueba.map((l) => Object.assign({}, l));
conVacia[3].formula = '';
c = E.comprobar(prob, conVacia);
ok(c.lineas[3].estado === 'vacia' && c.lineas[4].mensajes[0].includes('Cita la línea 4'), 'cita una línea vacía');
const conSintaxis = prueba.map((l) => Object.assign({}, l));
conSintaxis[4].formula = 'r →';
c = E.comprobar(prob, conSintaxis);
ok(c.lineas[4].estado === 'error' && c.lineas[4].mensajes[0].includes('incompleta'), 'error de sintaxis');
const sinJust = prueba.map((l) => Object.assign({}, l));
sinJust[4].just = '';
ok(E.comprobar(prob, sinJust).lineas[4].estado === 'incompleta', 'falta la justificación');
ok(!E.comprobar(prob, prueba.slice(0, 2).concat([{ prof: 0, tipo: 'paso', formula: 'p → r', just: 'R 1' }])).completa, 'R mal aplicada');
ok(E.comprobar(E.leerProblema('p → q\n¬q', '¬p'), L1([[0, 'premisa', 'p → q', ''], [0, 'premisa', '¬q', ''], [0, 'paso', '¬p', 'MT 1, 2']]), { soloBasicas: true }).lineas[2].mensajes[0].includes('derivada'), 'solo reglas básicas');
{
  const pd = E.leerProblema('¬(p ∨ q)', '¬p ∧ ¬q');
  const ld = L1([[0, 'premisa', '¬(p ∨ q)', ''], [0, 'paso', '¬p ∧ ¬q', 'DeM 1']]);
  ok(E.comprobar(pd, ld).completa, 'DeM admitida sin restricciones');
  const rd = E.comprobar(pd, ld, { prohibidas: ['DeM'] });
  ok(!rd.completa && rd.lineas[1].mensajes[0].includes('no se admite'), 'DeM prohibida en un ejercicio');
  ok(E.comprobar(pd, ld, { prohibidas: ['MT'] }).completa, 'prohibir otra regla no afecta a DeM');
}
ok(E.leerProblema('P(x)', 'q').error.includes('libre'), 'premisa con variable libre');

// 3. Insertar y borrar renumeran las citas
const ins = E.insertar(prueba, 2, { prof: 1, tipo: 'paso', formula: '', just: '' });
ok(ins[4].just === '→E 1, 3' && ins[5].just === '→E 2, 5' && ins[6].just === '→I 3-6', 'insertar renumera: ' + ins.map((l) => l.just).join(' | '));
const bor = E.borrar(ins, 3);
ok(bor.map((l) => l.just).join(' | ') === prueba.map((l) => l.just).join(' | ').replace('->E 1, 3', '→E 1, 3'), 'borrar renumera: ' + bor.map((l) => l.just).join(' | '));

// 4. Codificación
const cod = E.codificar(prueba);
ok(JSON.stringify(E.decodificar(prob, cod)) === JSON.stringify(prueba), 'codificar y decodificar');
ok(E.decodificar(prob, E.codificar([{ prof: 0, tipo: 'premisa', formula: 'p', just: '' }, { prof: 0, tipo: 'paso', formula: '~p | q', just: '~I 1' }]))[2].formula === '~p | q', 'la ~ se conserva');

// 5. Todas las derivaciones correctas del libro: como líneas del editor, completas;
// exportadas a LaTeX y vueltas a leer, iguales.
let delLibro = 0;
for (const d of L.derivaciones().filter((x) => x.estado === 'normal' && !x.esquemaDeRegla)) {
  const ultima = d.lineas[d.lineas.length - 1];
  if (ultima.prof !== 0) continue;
  delLibro++;
  const sitio = `${d.fichero}:${d.lineaTex}`;
  const lineas = d.lineas.map((l) => ({
    prof: l.prof, tipo: l.tipo, formula: PO.texto(l.f),
    just: l.tipo === 'paso' ? E.justificacionTexto({ regla: l.regla, citas: l.citas }) : l.tipo === 'hipotesis' ? (l.testigo ? `Hip. testigo ${l.testigo}` : 'Hip.') : 'Prem.',
  }));
  const problema = { premisas: d.lineas.filter((l) => l.tipo === 'premisa').map((l) => l.f), conclusion: ultima.f, texto: '' };
  const r = E.comprobar(problema, lineas);
  ok(r.completa, `${sitio}: el editor no la da por completa: ${r.mensaje} ${JSON.stringify(r.lineas.filter((x) => x.mensajes.length).map((x) => x.mensajes))}`);
  const tex = E.aLatex(lineas);
  const otra = L.derivacionesDe(tex, 'exportada')[0];
  ok(otra && otra.estado === 'normal' && otra.lineas.length === d.lineas.length &&
    otra.lineas.every((l, i) => PO.clave(l.f) === PO.clave(d.lineas[i].f) && l.prof === d.lineas[i].prof && l.tipo === d.lineas[i].tipo &&
      (l.regla || '') === (d.lineas[i].regla || '') && JSON.stringify(l.citas || []) === JSON.stringify(d.lineas[i].citas || []) && (l.testigo || '') === (d.lineas[i].testigo || '')),
  `${sitio}: la exportación a LaTeX no reproduce la derivación\n${tex}`);
  const txt = E.aTexto(lineas).split('\n');
  const rayas = lineas.filter((l) => l.tipo === 'hipotesis').length + (lineas.some((l) => l.tipo === 'premisa') ? 1 : 0);
  ok(txt.filter((x) => /^\s*\d+ │/.test(x)).length === lineas.length && txt.filter((x) => /├─/.test(x)).length === rayas, `${sitio}: exportación a texto\n${txt.join('\n')}`);
}
// 6. Notación compacta (Rxb) además de la del libro (R(x, b))
const pc = E.leerProblema('Ax (Px -> Qx)\nPa', 'Qa');
ok(!pc.error && pc.texto === '∀x (P(x) → Q(x)), P(a) ⊢ Q(a)', 'problema en notación compacta: ' + (pc.error || pc.texto));
ok(E.comprobar(pc, L1([[0, 'premisa', '∀x (P(x) → Q(x))', ''], [0, 'premisa', 'P(a)', ''], [0, 'paso', 'Pa -> Qa', 'AE 1'], [0, 'paso', 'Qa', '->E 3, 2']])).completa, 'prueba en notación compacta');
ok(E.texto(E.analizar('AxEy Rxy')) === '∀x ∃y R(x, y)', 'cuantificadores pegados');
ok(E.texto(E.analizar('Ax (A(x) | E(x))')) === '∀x (A(x) ∨ E(x))', 'A y E como predicados, con paréntesis');

// 7. Ejercicios del libro: todos se entienden y las plantillas no tienen más
// errores que las justificaciones por completar.
const Datos = require('../comun/js/datos.js');
const EJ = Datos.leerFichero(require('path').join(__dirname, '../deduccion/datos/ejercicios.js'));
const lista = EJ.temas.flatMap((t) => t.niveles.flatMap((n) => n.ejercicios));
ok(lista.length === 54 && new Set(lista.map((e) => e.numero)).size === 54, `54 ejercicios distintos (hay ${lista.length})`);
lista.forEach((e) => {
  const p = E.leerProblema(e.premisas.join('\n'), e.conclusion);
  ok(!p.error, `ejercicio ${e.numero}: ${p.error}`);
  if (e.plantilla) {
    const r = E.comprobar(p, e.plantilla);
    ok(!r.errores && r.pendientes > 0, `plantilla del ejercicio ${e.numero}: ${r.mensaje}`);
  }
});
ok(lista.filter((e) => e.soloBasicas).map((e) => e.numero).join() === '1.15,1.22,4.16,4.17', 'ejercicios con solo reglas básicas');
ok(lista.filter((e) => e.prohibidas).map((e) => `${e.numero}:${e.prohibidas}`).join() === '1.18:DeM,1.23:DeM', 'ejercicios sin DeM');

console.log(`Pruebas: ${pruebas}. Fallos: ${fallos}. Derivaciones del libro pasadas por el editor y exportadas: ${delLibro}. Ejercicios: ${lista.length}.`);
process.exitCode = fallos ? 1 : 0;
