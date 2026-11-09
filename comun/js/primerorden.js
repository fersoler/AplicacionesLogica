// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Fernando Soler Toscano
// Fórmulas de primer orden con identidad: análisis, impresión y semántica de Tarski,
// con la notación de los Apuntes de Lógica (tema 5).
//
// Sintaxis (la del libro, con alternativas de teclado):
//   cuantificadores  ∀x  ∃x   (también Ax, Ex, forall x, exists x, !x, ?x)
//   conectivas       ¬ ~   ∧ &   ∨ |   → ->   ↔ <->   ⊥ #
//   identidad        a = b    a ≠ b  (o a != b, que es ¬(a = b))
//   predicados       una palabra que empieza por mayúscula, con sus argumentos
//                    entre paréntesis: Rojo(a), IzqDe(x, b)
//   términos         constantes: una minúscula de la a a la r
//                    variables:  una minúscula de la s a la z
// Opciones de analizar(texto, opciones), para los tableaux del tema 6:
//   atomos    letras proposicionales: p, q (una minúscula sola) o P (una mayúscula
//             sin argumentos)
//   compacta  predicados de una letra con los argumentos pegados, como en
//             umsu.de/trees: Pa, Rxy, AxPx (Ax y Ex siguen siendo cuantificadores)
// Precedencia, de más a menos fuerte: ¬ y los cuantificadores, ∧, ∨, →, ↔; las
// binarias se agrupan por la derecha. Como en el libro, el alcance de un cuantificador
// es la fórmula que le sigue inmediatamente: ∀x (P(x) → Q(x)) lleva paréntesis.
//
// Representación:
//   {op: 'pred', nombre, args: [término]}   {op: 'eq', a, b}   {op: 'bot'}
//   {op: 'not', a}   {op: 'and' | 'or' | 'imp' | 'iff', a, b}
//   {op: 'forall' | 'exists', v, a}
//   término: {tipo: 'const' | 'var', nombre}
//
// Estructura (para la semántica): {
//   D: [elementos],                     dominio no vacío
//   constante(nombre) -> elemento | undefined
//   predicado(nombre) -> {nombre, aridad, ext(...elementos) -> bool} | null }
(function (raiz) {
  'use strict';

  const PREC = { iff: 1, imp: 2, or: 3, and: 4 };
  const SIMBOLO = { and: '∧', or: '∨', imp: '→', iff: '↔' };

  class ErrorSintaxis extends Error {
    constructor(mensaje, posicion) { super(mensaje); this.posicion = posicion; }
  }
  class ErrorSemantico extends Error {}

  const esConstante = (c) => /^[a-r]$/.test(c);
  const esVariable = (c) => /^[s-z]$/.test(c);

  // ---- Análisis ----------------------------------------------------------------

  const LETRA = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+/;

  function tokenizar(texto, opciones = {}) {
    const t = [];
    let i = 0;
    const pon = (tipo, largo, extra) => { t.push(Object.assign({ tipo, pos: i }, extra)); i += largo; };
    while (i < texto.length) {
      const c = texto[i];
      const sig = (s) => texto.startsWith(s, i);
      if (/\s/.test(c)) { i++; continue; }
      if (sig('<->') || sig('<=>')) { pon('iff', 3); continue; }
      if (sig('->') || sig('=>')) { pon('imp', 2); continue; }
      if (sig('!=')) { pon('neq', 2); continue; }
      if (sig('&&') || sig('||')) { pon(c === '&' ? 'and' : 'or', 2); continue; }
      if ('↔⇔≡'.includes(c)) { pon('iff', 1); continue; }
      if ('→⇒⊃'.includes(c)) { pon('imp', 1); continue; }
      if ('¬~∼-−'.includes(c)) { pon('not', 1); continue; }
      if ('∧&^'.includes(c)) { pon('and', 1); continue; }
      if ('∨|+'.includes(c)) { pon('or', 1); continue; }
      if ('#⊥'.includes(c)) { pon('bot', 1); continue; }
      if (c === '≠') { pon('neq', 1); continue; }
      if (c === '=') { pon('eq', 1); continue; }
      if (c === '∀' || c === '!') { pon('forall', 1); continue; }
      if (c === '∃' || c === '?') { pon('exists', 1); continue; }
      if (c === '(' || c === ')' || c === ',') { pon(c, 1); continue; }
      const m = LETRA.exec(texto.slice(i));
      if (m) {
        const w = m[0];
        // Tras ∀ o ∃, la variable es una sola letra aunque vaya pegada a lo que sigue:
        // ∀xP(x), como sale al copiar del PDF del libro.
        const previo = t.length ? t[t.length - 1].tipo : null;
        if ((previo === 'forall' || previo === 'exists') && w.length > 1 && /^[a-zñ]/.test(w)) {
          pon('term', 1, { nombre: w[0] });
          continue;
        }
        if (opciones.compacta && /^[A-Z][A-Za-z]*$/.test(w)) {
          // Forma compacta: cada trozo que empieza por mayúscula es un cuantificador
          // (Ax, Ey) o un predicado de una letra seguido de sus argumentos (Rab).
          let pos = i;
          for (const trozo of w.match(/[A-Z][a-z]*/g)) {
            if (/^[AE][s-z]$/.test(trozo)) {
              t.push({ tipo: trozo[0] === 'A' ? 'forall' : 'exists', pos });
              t.push({ tipo: 'term', nombre: trozo[1], pos: pos + 1 });
            } else {
              const pred = { tipo: 'pred', nombre: trozo[0], pos, compactos: [] };
              t.push(pred);
              for (let k = 1; k < trozo.length; k++) pred.compactos.push({ tipo: 'term', nombre: trozo[k], pos: pos + k });
            }
            pos += trozo.length;
          }
          i += w.length;
          continue;
        }
        if (/^[A-ZÁÉÍÓÚÜÑ]/.test(w)) {
          // Ax, Ey, AxEy… son cuantificadores (ningún predicado del diccionario se
          // llama así).
          if (/^([AE][s-z])+$/.test(w)) {
            for (let k = 0; k < w.length; k += 2) {
              t.push({ tipo: w[k] === 'A' ? 'forall' : 'exists', pos: i + k });
              t.push({ tipo: 'term', nombre: w[k + 1], pos: i + k + 1 });
            }
            i += w.length;
            continue;
          }
          pon('pred', w.length, { nombre: w });
          continue;
        }
        if (w === 'forall' || w === 'all') { pon('forall', w.length); continue; }
        if (w === 'exists') { pon('exists', w.length); continue; }
        if (w.length === 1) { pon('term', 1, { nombre: w }); continue; }
        throw new ErrorSintaxis(`«${w}»: los nombres de los objetos (a–r) y las variables (s–z) son una sola letra minúscula.`, i);
      }
      throw new ErrorSintaxis(`Símbolo no reconocido: «${c}».`, i);
    }
    return t;
  }

  function analizar(texto, opciones = {}) {
    const t = tokenizar(texto, opciones);
    if (t.length === 0) throw new ErrorSintaxis('Escribe una fórmula.', 0);
    let k = 0;
    const ver = () => t[k];
    const fin = () => (k < t.length ? t[k].pos : texto.length);

    function termino() {
      const x = ver();
      if (!x || x.tipo !== 'term') throw new ErrorSintaxis('Aquí va un nombre (de la a a la r) o una variable (de la s a la z).', fin());
      k++;
      return { tipo: esVariable(x.nombre) ? 'var' : 'const', nombre: x.nombre };
    }

    let nivelIff, nivelImp, nivelOr, nivelAnd;
    function unaria() {
      const x = ver();
      if (!x) throw new ErrorSintaxis('La fórmula está incompleta.', fin());
      if (x.tipo === 'not') { k++; return { op: 'not', a: unaria() }; }
      if (x.tipo === 'forall' || x.tipo === 'exists') {
        k++;
        const v = ver();
        if (!v || v.tipo !== 'term' || !esVariable(v.nombre)) {
          throw new ErrorSintaxis('Tras el cuantificador va una variable (de la s a la z).', fin());
        }
        k++;
        return { op: x.tipo, v: v.nombre, a: unaria() };
      }
      if (x.tipo === 'bot') { k++; return { op: 'bot' }; }
      if (x.tipo === '(') {
        k++;
        const f = nivelIff();
        if (!ver() || ver().tipo !== ')') throw new ErrorSintaxis('Falta un paréntesis de cierre.', fin());
        k++;
        return f;
      }
      if (x.tipo === 'pred') {
        k++;
        if (x.compactos && x.compactos.length) {
          return { op: 'pred', nombre: x.nombre, args: x.compactos.map((y) => ({ tipo: esVariable(y.nombre) ? 'var' : 'const', nombre: y.nombre })) };
        }
        if ((!ver() || ver().tipo !== '(') && opciones.atomos) return { op: 'pred', nombre: x.nombre, args: [] };
        if (!ver() || ver().tipo !== '(') throw new ErrorSintaxis(`Tras ${x.nombre} van sus argumentos entre paréntesis.`, fin());
        k++;
        const args = [termino()];
        while (ver() && ver().tipo === ',') { k++; args.push(termino()); }
        if (!ver() || ver().tipo !== ')') throw new ErrorSintaxis('Falta el paréntesis que cierra los argumentos.', fin());
        k++;
        return { op: 'pred', nombre: x.nombre, args };
      }
      if (x.tipo === 'term') {
        const a = termino();
        const y = ver();
        if (y && (y.tipo === 'eq' || y.tipo === 'neq')) {
          k++;
          const f = { op: 'eq', a, b: termino() };
          return y.tipo === 'eq' ? f : { op: 'not', a: f };
        }
        if (opciones.atomos) return { op: 'pred', nombre: a.nombre, args: [] };
        throw new ErrorSintaxis(`«${a.nombre}» sola no es una fórmula: falta un predicado o una identidad.`, x.pos);
      }
      throw new ErrorSintaxis('Falta una fórmula antes de este símbolo.', x.pos);
    }
    const nivel = (op, inferior, propio) => () => {
      const a = inferior();
      if (ver() && ver().tipo === op) { k++; return { op, a, b: propio() }; }
      return a;
    };
    nivelAnd = nivel('and', unaria, () => nivelAnd());
    nivelOr = nivel('or', () => nivelAnd(), () => nivelOr());
    nivelImp = nivel('imp', () => nivelOr(), () => nivelImp());
    nivelIff = nivel('iff', () => nivelImp(), () => nivelIff());

    const f = nivelIff();
    if (k < t.length) {
      const x = t[k];
      const msj = x.tipo === ')' ? 'Sobra un paréntesis de cierre.' : 'Falta una conectiva entre dos fórmulas.';
      throw new ErrorSintaxis(msj, x.pos);
    }
    return f;
  }

  // ---- Impresión, en la notación del libro ------------------------------------------

  const binaria = (f) => f.op in PREC;
  const atomoIgualdad = (f) => f.op === 'eq' || (f.op === 'not' && f.a.op === 'eq');

  function necesita(padre, hijo, lado) {
    if (!binaria(hijo)) return false;
    const p = PREC[padre], h = PREC[hijo.op];
    if (h < p) return true;
    if ((padre === 'and' && hijo.op === 'or') || (padre === 'or' && hijo.op === 'and')) return true;
    if (h === p) return lado === 'izq' || padre !== 'imp';
    return false;
  }

  // Con «explicito», cada miembro binario de una conectiva binaria va entre
  // paréntesis, como en los tableaux del libro: (p ∨ q) → r.
  function texto(f, explicito) {
    const T = (g) => texto(g, explicito);
    switch (f.op) {
      case 'pred': return f.args.length ? f.nombre + '(' + f.args.map((x) => x.nombre).join(', ') + ')' : f.nombre;
      case 'eq': return f.a.nombre + ' = ' + f.b.nombre;
      case 'bot': return '⊥';
      case 'not':
        if (f.a.op === 'eq') return f.a.a.nombre + ' ≠ ' + f.a.b.nombre;
        return '¬' + (binaria(f.a) ? '(' + T(f.a) + ')' : T(f.a));
      case 'forall':
      case 'exists': {
        const q = (f.op === 'forall' ? '∀' : '∃') + f.v;
        const cuerpo = binaria(f.a) || atomoIgualdad(f.a) ? '(' + T(f.a) + ')' : T(f.a);
        return q + ' ' + cuerpo;
      }
      default: {
        let a = T(f.a), b = T(f.b);
        if (explicito ? binaria(f.a) : necesita(f.op, f.a, 'izq')) a = '(' + a + ')';
        if (explicito ? binaria(f.b) : necesita(f.op, f.b, 'der')) b = '(' + b + ')';
        return a + ' ' + SIMBOLO[f.op] + ' ' + b;
      }
    }
  }

  function clave(f) {
    switch (f.op) {
      case 'pred': return f.nombre + '(' + f.args.map((x) => x.nombre).join(',') + ')';
      case 'eq': return f.a.nombre + '=' + f.b.nombre;
      case 'bot': return '#';
      case 'not': return '~' + clave(f.a);
      case 'forall': return 'A' + f.v + clave(f.a);
      case 'exists': return 'E' + f.v + clave(f.a);
      default: return '(' + clave(f.a) + f.op + clave(f.b) + ')';
    }
  }

  // ---- Variables libres y constantes --------------------------------------------

  function libres(f, ligadas = new Set(), res = new Set()) {
    const term = (x) => { if (x.tipo === 'var' && !ligadas.has(x.nombre)) res.add(x.nombre); };
    switch (f.op) {
      case 'pred': f.args.forEach(term); break;
      case 'eq': term(f.a); term(f.b); break;
      case 'bot': break;
      case 'not': libres(f.a, ligadas, res); break;
      case 'forall': case 'exists': libres(f.a, new Set([...ligadas, f.v]), res); break;
      default: libres(f.a, ligadas, res); libres(f.b, ligadas, res);
    }
    return res;
  }

  // Átomos en los que aparece libre alguna variable: sirve para explicar al alumno
  // que el alcance de un cuantificador no llega hasta ahí.
  function atomosConLibres(f, ligadas = new Set(), res = []) {
    const libre = (x) => x.tipo === 'var' && !ligadas.has(x.nombre);
    switch (f.op) {
      case 'pred': if (f.args.some(libre)) res.push({ atomo: f, variables: f.args.filter(libre).map((x) => x.nombre) }); break;
      case 'eq': if (libre(f.a) || libre(f.b)) res.push({ atomo: f, variables: [f.a, f.b].filter(libre).map((x) => x.nombre) }); break;
      case 'bot': break;
      case 'not': atomosConLibres(f.a, ligadas, res); break;
      case 'forall': case 'exists': atomosConLibres(f.a, new Set([...ligadas, f.v]), res); break;
      default: atomosConLibres(f.a, ligadas, res); atomosConLibres(f.b, ligadas, res);
    }
    return res;
  }

  function constantes(f, res = new Set()) {
    const term = (x) => { if (x.tipo === 'const') res.add(x.nombre); };
    switch (f.op) {
      case 'pred': f.args.forEach(term); break;
      case 'eq': term(f.a); term(f.b); break;
      case 'bot': break;
      case 'not': case 'forall': case 'exists': constantes(f.a, res); break;
      default: constantes(f.a, res); constantes(f.b, res);
    }
    return res;
  }

  function predicados(f, res = []) {
    switch (f.op) {
      case 'pred': res.push(f); break;
      case 'eq': case 'bot': break;
      case 'not': case 'forall': case 'exists': predicados(f.a, res); break;
      default: predicados(f.a, res); predicados(f.b, res);
    }
    return res;
  }

  // Errores de vocabulario respecto a una estructura: predicados desconocidos, aridad
  // y constantes sin denotación. Devuelve una lista de mensajes.
  function comprobarVocabulario(f, M) {
    const errores = [];
    const vistos = new Set();
    predicados(f).forEach((p) => {
      const d = M.predicado(p.nombre);
      if (!d) {
        if (!vistos.has(p.nombre)) errores.push(`El predicado ${p.nombre} no está en el diccionario de este mundo.`);
      } else if (d.aridad !== p.args.length) {
        const k = `${p.nombre}/${p.args.length}`;
        if (!vistos.has(k)) errores.push(`${d.nombre} lleva ${d.aridad} argumento${d.aridad > 1 ? 's' : ''}, y en ${texto(p)} tiene ${p.args.length}.`);
        vistos.add(k);
      }
      vistos.add(p.nombre);
    });
    [...constantes(f)].sort().forEach((c) => {
      if (M.constante(c) === undefined) {
        errores.push(`La constante ${c} no nombra ningún objeto. En una estructura, cada constante denota un objeto del dominio: ponle el nombre ${c} a alguna pieza.`);
      }
    });
    return errores;
  }

  // ---- Semántica de Tarski -------------------------------------------------------

  function denotacion(x, M, g) {
    if (x.tipo === 'const') {
      const d = M.constante(x.nombre);
      if (d === undefined) throw new ErrorSemantico(`La constante ${x.nombre} no nombra ningún objeto.`);
      return d;
    }
    if (!(x.nombre in g)) throw new ErrorSemantico(`La variable ${x.nombre} está libre y la asignación no le da valor.`);
    return g[x.nombre];
  }

  const variante = (g, v, d) => Object.assign({}, g, { [v]: d });

  // M, g ⊨ f
  function satisface(f, M, g = {}) {
    switch (f.op) {
      case 'pred': {
        const p = M.predicado(f.nombre);
        if (!p) throw new ErrorSemantico(`Predicado desconocido: ${f.nombre}.`);
        return !!p.ext(...f.args.map((x) => denotacion(x, M, g)));
      }
      case 'eq': return denotacion(f.a, M, g) === denotacion(f.b, M, g);
      case 'bot': return false;
      case 'not': return !satisface(f.a, M, g);
      case 'and': return satisface(f.a, M, g) && satisface(f.b, M, g);
      case 'or': return satisface(f.a, M, g) || satisface(f.b, M, g);
      case 'imp': return !satisface(f.a, M, g) || satisface(f.b, M, g);
      case 'iff': return satisface(f.a, M, g) === satisface(f.b, M, g);
      case 'forall': return M.D.every((d) => satisface(f.a, M, variante(g, f.v, d)));
      case 'exists': return M.D.some((d) => satisface(f.a, M, variante(g, f.v, d)));
    }
    throw new Error('Fórmula mal construida');
  }

  // Todas las asignaciones de valores a unas variables.
  function asignaciones(vars, D) {
    let res = [{}];
    vars.forEach((v) => { res = res.flatMap((g) => D.map((d) => variante(g, v, d))); });
    return res;
  }

  // Verdad en M (§5.1.4): una sentencia es verdadera si la satisface una asignación
  // cualquiera; una fórmula abierta, si la satisface toda asignación.
  function verdadera(f, M) {
    const vs = [...libres(f)].sort();
    return asignaciones(vs, M.D).every((g) => satisface(f, M, g));
  }

  const API = {
    ErrorSintaxis, ErrorSemantico, esConstante, esVariable,
    analizar, texto, clave, libres, atomosConLibres, constantes, predicados,
    comprobarVocabulario, denotacion, variante, satisface, asignaciones, verdadera,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else raiz.PrimerOrden = API;
})(typeof window !== 'undefined' ? window : globalThis);
