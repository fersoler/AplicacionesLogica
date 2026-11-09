// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Fernando Soler Toscano
// Verificador de derivaciones de deducción natural (estilo Fitch) con las reglas de
// los Apuntes de Lógica (sistema de forall x: Calgary):
//   básicas:   R, ∧I, ∧E, ∨I, ∨E, →I, →E, ¬I, ¬E, X, IP, ↔I, ↔E,
//              ∀E, ∀I, ∃I, ∃E, =I, =E
//   derivadas: MT, DS, DNE, LEM, DeM, CQ
// Las líneas citadas se comprueban en el orden de los esquemas del libro (apéndice C):
// primero la negación en ¬E, el condicional en →E y
// MT, el bicondicional en ↔E, la disyunción en ∨E y DS, la identidad en =E y el
// existencial en ∃E. Las restricciones de ∀I y ∃E son las del apéndice C.
//
// Las fórmulas pueden ser las de formulas.js (lógica proposicional, átomos {op:'var'})
// o las de primerorden.js (átomos {op:'pred'} y {op:'eq'}, cuantificadores).
//
// Formato de una derivación: un array de líneas, numeradas desde 1 por su posición.
//   { prof: profundidad (0 = nivel principal; una caja abierta en el nivel 0 tiene 1),
//     tipo: 'premisa' | 'hipotesis' | 'paso',
//     f: fórmula,
//     regla: 'R', '∧I', …  (solo en los pasos),
//     citas: [n, …] o [[desde, hasta], …] para las cajas,
//     testigo: 'c'  (opcional, en la hipótesis de una caja de ∃E) }
// La primera línea de una caja es su hipótesis. Las premisas van al principio, en el
// nivel 0.
(function (raiz) {
  'use strict';
  const enNode = typeof module !== 'undefined' && module.exports;
  const F = enNode ? require('./formulas.js') : raiz.Formulas;
  const PO = enNode ? require('./primerorden.js') : raiz.PrimerOrden;

  const BASICAS = ['R', '∧I', '∧E', '∨I', '∨E', '→I', '→E', '¬I', '¬E', 'X', 'IP', '↔I', '↔E', '∀E', '∀I', '∃I', '∃E', '=I', '=E'];
  const DERIVADAS = ['MT', 'DS', 'DNE', 'LEM', 'DeM', 'CQ'];

  // ---- Fórmulas: clave, texto y términos ---------------------------------------------

  function clave(f) {
    switch (f.op) {
      case 'var': return f.nombre;
      case 'pred': return f.nombre + '(' + f.args.map((t) => t.nombre).join(',') + ')';
      case 'eq': return f.a.nombre + '=' + f.b.nombre;
      case 'bot': return '#';
      case 'not': return '~' + clave(f.a);
      case 'forall': return 'A' + f.v + clave(f.a);
      case 'exists': return 'E' + f.v + clave(f.a);
      default: return '(' + clave(f.a) + f.op + clave(f.b) + ')';
    }
  }
  const tieneVar = (f) => f.op === 'var' || (f.a && tieneVar(f.a)) || (f.b && f.op !== 'eq' && tieneVar(f.b));
  function texto(f) {
    if (tieneVar(f)) return F ? F.texto(f) : clave(f);
    return PO ? PO.texto(f, true) : clave(f);
  }
  const ig = (f, g) => clave(f) === clave(g);
  const No = (a) => ({ op: 'not', a });
  const esNo = (f) => f.op === 'not';
  const esBot = (f) => f.op === 'bot';
  const cuantificada = (f) => f.op === 'forall' || f.op === 'exists';

  function constantes(f, res = new Set()) {
    const t = (x) => { if (x.tipo === 'const') res.add(x.nombre); };
    switch (f.op) {
      case 'pred': f.args.forEach(t); break;
      case 'eq': t(f.a); t(f.b); break;
      case 'var': case 'bot': break;
      case 'not': case 'forall': case 'exists': constantes(f.a, res); break;
      default: constantes(f.a, res); constantes(f.b, res);
    }
    return res;
  }
  // ¿Aparece la variable x en f (libre, ligada o tras un cuantificador)?
  function apareceVariable(f, x) {
    switch (f.op) {
      case 'pred': return f.args.some((t) => t.tipo === 'var' && t.nombre === x);
      case 'eq': return [f.a, f.b].some((t) => t.tipo === 'var' && t.nombre === x);
      case 'var': case 'bot': return false;
      case 'not': return apareceVariable(f.a, x);
      case 'forall': case 'exists': return f.v === x || apareceVariable(f.a, x);
      default: return apareceVariable(f.a, x) || apareceVariable(f.b, x);
    }
  }
  function libres(f, ligadas = new Set(), res = new Set()) {
    const t = (x) => { if (x.tipo === 'var' && !ligadas.has(x.nombre)) res.add(x.nombre); };
    switch (f.op) {
      case 'pred': f.args.forEach(t); break;
      case 'eq': t(f.a); t(f.b); break;
      case 'var': case 'bot': break;
      case 'not': libres(f.a, ligadas, res); break;
      case 'forall': case 'exists': libres(f.a, new Set([...ligadas, f.v]), res); break;
      default: libres(f.a, ligadas, res); libres(f.b, ligadas, res);
    }
    return res;
  }

  // ¿Es C el resultado de sustituir en B las apariciones libres de x por una misma
  // constante? Devuelve {c} (c es undefined si x no aparece libre en B) o null.
  function emparejar(B, C, x) {
    let c;
    const termino = (s, t, ligadas) => {
      if (s.tipo === 'var' && s.nombre === x && !ligadas.has(x)) {
        if (t.tipo !== 'const') return false;
        if (c === undefined) c = t.nombre;
        return c === t.nombre;
      }
      return s.tipo === t.tipo && s.nombre === t.nombre;
    };
    const rec = (b, d, ligadas) => {
      if (b.op !== d.op) return false;
      switch (b.op) {
        case 'pred': return b.nombre === d.nombre && b.args.length === d.args.length && b.args.every((s, i) => termino(s, d.args[i], ligadas));
        case 'eq': return termino(b.a, d.a, ligadas) && termino(b.b, d.b, ligadas);
        case 'var': return b.nombre === d.nombre;
        case 'bot': return true;
        case 'not': return rec(b.a, d.a, ligadas);
        case 'forall': case 'exists': return b.v === d.v && rec(b.a, d.a, b.v === x ? new Set([...ligadas, x]) : ligadas);
        default: return rec(b.a, d.a, ligadas) && rec(b.b, d.b, ligadas);
      }
    };
    return rec(B, C, new Set()) ? { c } : null;
  }

  // ¿Se obtiene D de C sustituyendo una, varias o todas las apariciones de a por b?
  // Devuelve el número de apariciones sustituidas, o -1 si no.
  function sustitucionIdentidad(C, D, a, b) {
    let cambios = 0;
    const termino = (s, t) => {
      if (s.tipo === t.tipo && s.nombre === t.nombre) return true;
      if (s.tipo === 'const' && t.tipo === 'const' && s.nombre === a && t.nombre === b) { cambios++; return true; }
      return false;
    };
    const rec = (x, y) => {
      if (x.op !== y.op) return false;
      switch (x.op) {
        case 'pred': return x.nombre === y.nombre && x.args.length === y.args.length && x.args.every((s, i) => termino(s, y.args[i]));
        case 'eq': return termino(x.a, y.a) && termino(x.b, y.b);
        case 'var': return x.nombre === y.nombre;
        case 'bot': return true;
        case 'not': return rec(x.a, y.a);
        case 'forall': case 'exists': return x.v === y.v && rec(x.a, y.a);
        default: return rec(x.a, y.a) && rec(x.b, y.b);
      }
    };
    return rec(C, D) ? cambios : -1;
  }

  // ---- Estructura de cajas -------------------------------------------------------------

  // Cajas abiertas en cada línea: pilas[i] es la lista de cajas que contienen la
  // línea i; cajas[c] = {inicio, fin, padre}.
  function estructura(lineas) {
    const cajas = [], pilas = [], errores = [];
    let pila = [];
    let premisasTerminadas = false;
    lineas.forEach((l, i) => {
      const n = i + 1;
      if (l.tipo === 'premisa') {
        if (l.prof !== 0) errores.push({ linea: n, mensaje: 'Las premisas van en el nivel principal.' });
        if (premisasTerminadas) errores.push({ linea: n, mensaje: 'Las premisas van al principio de la derivación.' });
        pilas.push([]);
        return;
      }
      premisasTerminadas = true;
      if (l.tipo === 'hipotesis') {
        if (l.prof < 1 || l.prof > pila.length + 1) {
          errores.push({ linea: n, mensaje: 'La hipótesis no abre una caja en un lugar válido.' });
        }
        pila = pila.slice(0, Math.max(0, l.prof - 1));
        const id = cajas.length;
        cajas.push({ inicio: i, fin: i, padre: pila.length ? pila[pila.length - 1] : null, prof: l.prof });
        pila = pila.concat([id]);
      } else {
        if (l.prof > pila.length) {
          errores.push({ linea: n, mensaje: 'La línea está dentro de una caja que no se ha abierto.' });
        }
        pila = pila.slice(0, Math.min(l.prof, pila.length));
      }
      pila.forEach((c) => { cajas[c].fin = i; });
      pilas.push(pila);
    });
    return { cajas, pilas, errores };
  }

  const prefijo = (a, b) => a.length <= b.length && a.every((x, i) => b[i] === x);

  // opciones: {soloBasicas: true} rechaza las reglas derivadas; {prohibidas: [...]}
  // rechaza esas reglas (por ejemplo, DeM en un ejercicio que pide derivarla); {esquema: true} trata
  // las premisas como líneas anteriores cualesquiera, sin restricciones para ∀I y ∃E
  // (sirve para comprobar los esquemas de las reglas).
  function verificar(lineas, opciones = {}) {
    const { cajas, pilas, errores } = estructura(lineas);
    if (errores.length) return { correcta: false, errores };
    const premisas = opciones.esquema ? [] : lineas.map((l, i) => ({ l, n: i + 1 })).filter((x) => x.l.tipo === 'premisa');

    lineas.forEach((l, i) => {
      const n = i + 1;
      const error = (m) => errores.push({ linea: n, mensaje: m });
      const lib = [...libres(l.f)];
      if (lib.length) {
        error(`${texto(l.f)} tiene libre${lib.length > 1 ? 's las variables' : ' la variable'} ${lib.join(', ')}: en una derivación todas las líneas son sentencias (§4.2.2).`);
        return;
      }
      if (l.tipo !== 'paso') return;
      if (opciones.soloBasicas && DERIVADAS.includes(l.regla)) {
        error(`${l.regla} es una regla derivada: aquí solo se admiten las reglas básicas.`);
        return;
      }
      if ((opciones.prohibidas || []).includes(l.regla)) {
        error(`${l.regla} no se admite en este ejercicio.`);
        return;
      }

      // Resolver las citas: líneas accesibles y cajas cerradas accesibles.
      const lin = [], caj = [];
      let orden = '';
      for (const c of (l.citas || [])) {
        orden += Array.isArray(c) ? 'c' : 'l';
        if (Array.isArray(c)) {
          const [a, b] = c;
          const id = cajas.findIndex((k) => k.inicio === a - 1 && k.fin === b - 1);
          if (id < 0) { error(`${a}–${b} no es una caja completa: se cita desde su hipótesis hasta su última línea.`); return; }
          const k = cajas[id];
          const padre = pilas[k.inicio].slice(0, -1);
          if (!(b < n && !pilas[i].includes(id) && prefijo(padre, pilas[i]))) {
            error(`La caja ${a}–${b} no se puede citar desde aquí.`); return;
          }
          caj.push({ hip: lineas[a - 1].f, fin: lineas[b - 1].f, testigo: lineas[a - 1].testigo, texto: `${a}–${b}`, inicio: a });
        } else {
          if (!(c >= 1 && c < n && prefijo(pilas[c - 1], pilas[i]))) {
            error(c >= n ? `La línea ${c} no es anterior a esta.` : `La línea ${c} está en una caja ya cerrada: no se puede citar desde aquí.`); return;
          }
          lin.push(lineas[c - 1].f);
        }
      }
      // Contexto para las restricciones de ∀I y ∃E: premisas e hipótesis activas.
      const ctx = {
        orden,
        premisas,
        activas: pilas[i].map((id) => ({ n: cajas[id].inicio + 1, f: lineas[cajas[id].inicio].f })),
      };
      const r = comprobarRegla(l.regla, l.f, lin, caj, ctx);
      if (r) error(r);
    });
    return { correcta: errores.length === 0, errores };
  }

  // ¿Dónde aparece la constante c entre las premisas y las hipótesis activas?
  function dondeAparece(c, ctx) {
    const p = ctx.premisas.find((x) => constantes(x.l.f).has(c));
    if (p) return `la premisa de la línea ${p.n}`;
    const h = ctx.activas.find((x) => constantes(x.f).has(c));
    if (h) return `la hipótesis activa de la línea ${h.n}`;
    return null;
  }

  // Devuelve null si la regla se aplica bien, o un mensaje de error.
  function comprobarRegla(regla, A, lin, caj, ctx = { premisas: [], activas: [] }) {
    const plural = (k, s, p) => `${k} ${k === 1 ? s : p}`;
    const cuantas = (nl, nc) => (lin.length === nl && caj.length === nc)
      ? null
      : `${regla} cita ${nl && nc ? `${plural(nl, 'línea', 'líneas')} y ${plural(nc, 'caja', 'cajas')}` : nl ? plural(nl, 'línea', 'líneas') : nc ? plural(nc, 'caja', 'cajas') : 'nada'}.`;
    const mal = `No es una aplicación correcta de ${regla}.`;
    let e;
    switch (regla) {
      case 'R':
        if ((e = cuantas(1, 0))) return e;
        return ig(lin[0], A) ? null : 'R copia una línea anterior sin cambiarla.';
      case '∧I':
        if ((e = cuantas(2, 0))) return e;
        return A.op === 'and' && ((ig(A.a, lin[0]) && ig(A.b, lin[1])) || (ig(A.a, lin[1]) && ig(A.b, lin[0]))) ? null : mal;
      case '∧E':
        if ((e = cuantas(1, 0))) return e;
        if (lin[0].op !== 'and') return '∧E cita una conjunción.';
        return ig(lin[0].a, A) || ig(lin[0].b, A) ? null : '∧E da uno de los dos miembros de la conjunción citada.';
      case '∨I':
        if ((e = cuantas(1, 0))) return e;
        return A.op === 'or' && (ig(A.a, lin[0]) || ig(A.b, lin[0])) ? null : '∨I da una disyunción con la línea citada como uno de sus miembros.';
      case '∨E': {
        if ((e = cuantas(1, 2))) return e;
        const d = lin[0];
        if (d.op !== 'or' || (ctx.orden && ctx.orden[0] !== 'l')) return '∨E cita primero la disyunción y después las dos cajas.';
        const ok = (c1, c2) => ig(c1.hip, d.a) && ig(c2.hip, d.b) && ig(c1.fin, A) && ig(c2.fin, A);
        return ok(caj[0], caj[1]) || ok(caj[1], caj[0]) ? null : '∨E: cada caja empieza con un miembro de la disyunción y las dos terminan en la fórmula que se concluye.';
      }
      case '→I':
        if ((e = cuantas(0, 1))) return e;
        return A.op === 'imp' && ig(A.a, caj[0].hip) && ig(A.b, caj[0].fin) ? null : '→I da el condicional cuyo antecedente es la hipótesis de la caja y cuyo consecuente es su última línea.';
      case '→E':
        if ((e = cuantas(2, 0))) return e;
        if (lin[0].op !== 'imp') return '→E cita primero el condicional.';
        return ig(lin[0].a, lin[1]) && ig(lin[0].b, A) ? null : mal;
      case '¬I':
        if ((e = cuantas(0, 1))) return e;
        if (!esBot(caj[0].fin)) return '¬I: la caja tiene que terminar en ⊥.';
        return esNo(A) && ig(A.a, caj[0].hip) ? null : '¬I da la negación de la hipótesis de la caja.';
      case '¬E':
        if ((e = cuantas(2, 0))) return e;
        if (!esNo(lin[0])) return '¬E cita primero la negación.';
        if (!esBot(A)) return '¬E da ⊥.';
        return ig(lin[0].a, lin[1]) ? null : mal;
      case 'X':
        if ((e = cuantas(1, 0))) return e;
        return esBot(lin[0]) ? null : 'X cita una línea con ⊥.';
      case 'IP':
        if ((e = cuantas(0, 1))) return e;
        if (!esBot(caj[0].fin)) return 'IP: la caja tiene que terminar en ⊥.';
        return ig(caj[0].hip, No(A)) ? null : 'IP da la fórmula cuya negación es la hipótesis de la caja.';
      case '↔I': {
        if ((e = cuantas(0, 2))) return e;
        if (A.op !== 'iff') return mal;
        const ok = (c1, c2) => ig(c1.hip, A.a) && ig(c1.fin, A.b) && ig(c2.hip, A.b) && ig(c2.fin, A.a);
        return ok(caj[0], caj[1]) || ok(caj[1], caj[0]) ? null : mal;
      }
      case '↔E': {
        if ((e = cuantas(2, 0))) return e;
        const b = lin[0];
        if (b.op !== 'iff') return '↔E cita primero el bicondicional.';
        return (ig(b.a, lin[1]) && ig(b.b, A)) || (ig(b.b, lin[1]) && ig(b.a, A)) ? null : mal;
      }
      case 'MT':
        if ((e = cuantas(2, 0))) return e;
        if (lin[0].op !== 'imp') return 'MT cita primero el condicional.';
        return ig(lin[1], No(lin[0].b)) && ig(A, No(lin[0].a)) ? null : mal;
      case 'DS': {
        if ((e = cuantas(2, 0))) return e;
        const d = lin[0];
        if (d.op !== 'or') return 'DS cita primero la disyunción.';
        return (ig(lin[1], No(d.a)) && ig(A, d.b)) || (ig(lin[1], No(d.b)) && ig(A, d.a)) ? null : mal;
      }
      case 'DNE':
        if ((e = cuantas(1, 0))) return e;
        return ig(lin[0], No(No(A))) ? null : mal;
      case 'LEM': {
        if ((e = cuantas(0, 2))) return e;
        const ok = (c1, c2) => ig(c2.hip, No(c1.hip)) && ig(c1.fin, A) && ig(c2.fin, A);
        return ok(caj[0], caj[1]) || ok(caj[1], caj[0]) ? null : mal;
      }
      case 'DeM': {
        if ((e = cuantas(1, 0))) return e;
        const s = lin[0];
        const formas = [];
        if (esNo(s) && (s.a.op === 'or' || s.a.op === 'and')) {
          formas.push({ op: s.a.op === 'or' ? 'and' : 'or', a: No(s.a.a), b: No(s.a.b) });
        }
        if ((s.op === 'and' || s.op === 'or') && esNo(s.a) && esNo(s.b)) {
          formas.push(No({ op: s.op === 'and' ? 'or' : 'and', a: s.a.a, b: s.b.a }));
        }
        return formas.some((g) => ig(g, A)) ? null : mal;
      }

      // ---- Cuantificadores e identidad ----------------------------------------------
      case '∀E': {
        if ((e = cuantas(1, 0))) return e;
        const u = lin[0];
        if (u.op !== 'forall') return '∀E cita una fórmula universal, ∀x A(x).';
        return emparejar(u.a, A, u.v) ? null : `∀E da A(c): la fórmula que sigue a ∀${u.v}, con todas las apariciones libres de ${u.v} sustituidas por una misma constante.`;
      }
      case '∀I': {
        if ((e = cuantas(1, 0))) return e;
        if (A.op !== 'forall') return '∀I da una fórmula universal, ∀x A(x).';
        const C = lin[0];
        const m = emparejar(A.a, C, A.v);
        if (!m) return `∀I: la línea citada tiene que ser A(c), es decir, la fórmula que sigue a ∀${A.v} con ${A.v} sustituida por una constante.`;
        if (apareceVariable(C, A.v)) return `∀I: la variable ${A.v} ya aparece en la línea citada.`;
        if (m.c === undefined) return null;
        if (constantes(A).has(m.c)) return `∀I: la constante ${m.c} sigue apareciendo en ${texto(A)}; hay que sustituir todas sus apariciones.`;
        const donde = dondeAparece(m.c, ctx);
        if (donde) return `∀I: la constante ${m.c} aparece en ${donde}, así que no representa un objeto cualquiera.`;
        return null;
      }
      case '∃I': {
        if ((e = cuantas(1, 0))) return e;
        if (A.op !== 'exists') return '∃I da una fórmula existencial, ∃x A(x).';
        const C = lin[0];
        if (!emparejar(A.a, C, A.v)) return `∃I: la línea citada tiene que ser A(c), y la conclusión ∃${A.v} A(${A.v}), con ${A.v} en lugar de algunas apariciones de una constante c.`;
        if (apareceVariable(C, A.v)) return `∃I: la variable ${A.v} ya aparece en la línea citada.`;
        return null;
      }
      case '∃E': {
        if ((e = cuantas(1, 1))) return e;
        const ex = lin[0];
        if (ex.op !== 'exists' || (ctx.orden && ctx.orden[0] !== 'l')) return '∃E cita primero la fórmula existencial y después la caja.';
        const k = caj[0];
        const m = emparejar(ex.a, k.hip, ex.v);
        if (!m) return `∃E: la caja tiene que empezar con A(c), la fórmula que sigue a ∃${ex.v} con ${ex.v} sustituida por una constante.`;
        if (!ig(k.fin, A)) return '∃E da la última línea de la caja.';
        const c = m.c;
        if (c === undefined) return null;
        if (k.testigo && k.testigo !== c) return `∃E: la hipótesis declara el testigo ${k.testigo}, pero la constante que sustituye a ${ex.v} es ${c}.`;
        if (constantes(ex).has(c)) return `∃E: la constante testigo ${c} aparece en ${texto(ex)}; tiene que ser nueva.`;
        if (constantes(A).has(c)) return `∃E: la constante testigo ${c} aparece en la conclusión ${texto(A)}; tiene que ser nueva.`;
        const donde = dondeAparece(c, ctx);
        if (donde) return `∃E: la constante testigo ${c} aparece en ${donde}; tiene que ser nueva.`;
        return null;
      }
      case '=I':
        if ((e = cuantas(0, 0))) return e;
        return A.op === 'eq' && A.a.tipo === 'const' && A.a.nombre === A.b.nombre ? null : '=I da c = c, sin citar ninguna línea.';
      case '=E': {
        if ((e = cuantas(2, 0))) return e;
        const id = lin[0];
        if (id.op !== 'eq') return '=E cita primero la identidad.';
        const a = id.a.nombre, b = id.b.nombre;
        const directo = sustitucionIdentidad(lin[1], A, a, b), inverso = sustitucionIdentidad(lin[1], A, b, a);
        if (directo > 0 || inverso > 0) return null;
        if (directo === 0 || inverso === 0) return `=E tiene que cambiar al menos una aparición de ${a} por ${b} (o de ${b} por ${a}); para copiar una línea se usa R.`;
        return `=E: la conclusión resulta de cambiar en la segunda línea citada una, varias o todas las apariciones de ${a} por ${b} (o de ${b} por ${a}).`;
      }
      case 'CQ': {
        if ((e = cuantas(1, 0))) return e;
        const s = lin[0];
        const formas = [];
        if (esNo(s) && s.a.op === 'forall') formas.push({ op: 'exists', v: s.a.v, a: No(s.a.a) });
        if (esNo(s) && s.a.op === 'exists') formas.push({ op: 'forall', v: s.a.v, a: No(s.a.a) });
        if (cuantificada(s) && esNo(s.a)) formas.push(No({ op: s.op === 'exists' ? 'forall' : 'exists', v: s.v, a: s.a.a }));
        return formas.some((g) => ig(g, A)) ? null : 'CQ convierte ¬∀x A en ∃x ¬A, ¬∃x A en ∀x ¬A, o al revés.';
      }
      default:
        return `Regla desconocida: ${regla}.`;
    }
  }

  // Comprueba además que la derivación prueba lo que se quiere: esas premisas (en
  // cualquier orden) y la conclusión en la última línea, fuera de toda caja.
  function verificarArgumento(lineas, premisas, conclusion, opciones = {}) {
    const r = verificar(lineas, opciones);
    const errores = r.errores.slice();
    const prem = lineas.filter((l) => l.tipo === 'premisa').map((l) => clave(l.f)).sort();
    const esperadas = premisas.map(clave).sort();
    if (prem.join('|') !== esperadas.join('|')) {
      errores.push({ linea: 0, mensaje: 'Las premisas no son las del argumento.' });
    }
    const ultima = lineas[lineas.length - 1];
    if (!ultima || ultima.prof !== 0 || !ig(ultima.f, conclusion)) {
      errores.push({ linea: lineas.length, mensaje: `La última línea del nivel principal no es ${texto(conclusion)}.` });
    }
    return { correcta: errores.length === 0, errores };
  }

  const API = { verificar, verificarArgumento, estructura, comprobarRegla, clave, emparejar, BASICAS, DERIVADAS };
  if (enNode) module.exports = API;
  else raiz.Verificador = API;
})(typeof window !== 'undefined' ? window : globalThis);
