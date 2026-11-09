// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Fernando Soler Toscano
// Semántica de la lógica proposicional (tema 2 de los Apuntes): tablas de verdad,
// clasificación, equivalencia, consecuencia, evaluación paso a paso y método de
// asignación directa (§2.6.1).
(function (raiz) {
  'use strict';
  const F = (typeof module !== 'undefined' && module.exports) ? require('../../comun/js/formulas.js') : raiz.Formulas;
  const T = F.textoExplicito;

  const MAX_VARIABLES = 6;
  const OPS = {
    and: (a, b) => a & b,
    or: (a, b) => a | b,
    imp: (a, b) => (1 - a) | b,
    iff: (a, b) => (a === b ? 1 : 0),
  };
  const v = (f, x) => `v(${T(f)}) = ${x}`;
  const listaY = (xs) => (xs.length < 2 ? xs.join('') : xs.slice(0, -1).join(', ') + ' y ' + xs[xs.length - 1]);

  // ---- Tabla de verdad conjunta ---------------------------------------------------
  // Columnas: las variables (en orden alfabético), ⊥ si aparece, y las subfórmulas no
  // atómicas de cada fórmula en el orden en que se construyen, sin repetir. Cada
  // columna sabe de qué columnas depende (hijos) y de qué fórmulas de la entrada es
  // la columna principal.

  function tabla(formulas) {
    const vars = [...new Set(formulas.flatMap(F.variables))].sort();
    const filas = F.interpretaciones(vars);
    const columnas = [];
    const indice = new Map();
    const anade = (f, tipo) => {
      const k = F.clave(f);
      if (indice.has(k)) return;
      indice.set(k, columnas.length);
      columnas.push({ f, clave: k, texto: T(f), tipo, principal: [], hijos: [] });
    };
    vars.forEach((x) => anade(F.Var(x), 'var'));
    if (formulas.some((f) => F.clave(f).includes('#'))) anade(F.BOT, 'bot');
    formulas.forEach((f) => F.subformulas(f).forEach((g) => anade(g, 'compuesta')));
    formulas.forEach((f, i) => columnas[indice.get(F.clave(f))].principal.push(i));
    columnas.forEach((c) => {
      const hijos = c.f.op === 'not' ? [c.f.a] : c.tipo === 'compuesta' ? [c.f.a, c.f.b] : [];
      c.hijos = [...new Set(hijos.map((h) => indice.get(F.clave(h))))];
      c.valores = filas.map((w) => F.evalua(c.f, w));
    });
    return { vars, filas, columnas, formulas, columnaDe: (i) => columnas[indice.get(F.clave(formulas[i]))] };
  }

  function clasificar(valores) {
    if (valores.every((x) => x === 1)) return 'tautologia';
    if (valores.every((x) => x === 0)) return 'contradiccion';
    return 'contingente';
  }
  const NOMBRE_CLASE = { tautologia: 'tautología', contradiccion: 'contradicción', contingente: 'contingente' };

  // Filas (índices) que hacen verdaderas todas las fórmulas de la tabla.
  function filasModelo(t, indices) {
    return t.filas.map((_, r) => r).filter((r) => indices.every((i) => t.columnaDe(i).valores[r] === 1));
  }

  function equivalencia(f, g) {
    const vars = [...new Set([...F.variables(f), ...F.variables(g)])].sort();
    const filas = F.interpretaciones(vars);
    const diferencias = filas.map((_, r) => r).filter((r) => F.evalua(f, filas[r]) !== F.evalua(g, filas[r]));
    return { equivalentes: diferencias.length === 0, diferencias, filas, vars };
  }

  function consecuencia(premisas, conclusion) {
    const t = tabla([...premisas, conclusion]);
    const n = premisas.length;
    const premisasVerdaderas = filasModelo(t, premisas.map((_, i) => i));
    const contraejemplos = premisasVerdaderas.filter((r) => t.columnaDe(n).valores[r] === 0);
    return { tabla: t, premisasVerdaderas, contraejemplos, valida: contraejemplos.length === 0 };
  }

  // Por qué una fila no es un contraejemplo (para corregir al alumno).
  function porQueNoContraejemplo(t, nPremisas, r) {
    const falsas = [];
    for (let i = 0; i < nPremisas; i++) if (t.columnaDe(i).valores[r] === 0) falsas.push(nPremisas > 1 ? `la premisa ${i + 1}` : 'la premisa');
    const motivos = [];
    if (falsas.length) motivos.push(`${listaY(falsas)} ${falsas.length > 1 ? 'son falsas' : 'es falsa'}`);
    if (t.columnaDe(nPremisas).valores[r] === 1) motivos.push('la conclusión es verdadera');
    return listaY(motivos);
  }

  // ---- Evaluación paso a paso (ejemplo de §2.2) -----------------------------------

  function razon(f, a, b) {
    switch (f.op) {
      case 'not': return 'la negación invierte el valor';
      case 'and':
        if (a && b) return 'los dos miembros son verdaderos';
        if (!a && !b) return 'los dos miembros son falsos';
        return `el ${a ? 'segundo' : 'primer'} miembro es falso`;
      case 'or':
        if (!a && !b) return 'los dos miembros son falsos';
        if (a && b) return 'los dos miembros son verdaderos';
        return `el ${a ? 'primer' : 'segundo'} miembro es verdadero`;
      case 'imp':
        if (a && !b) return 'el antecedente es verdadero y el consecuente falso';
        return !a ? 'el antecedente es falso' : 'el consecuente es verdadero';
      case 'iff': return a === b ? 'los dos miembros tienen el mismo valor' : 'los miembros tienen valores distintos';
    }
    return '';
  }

  // Subfórmulas no atómicas de dentro afuera, con su valor y el motivo.
  function pasosEvaluacion(f, w) {
    return F.subformulas(f).map((g) => {
      const hijos = g.op === 'not' ? [g.a] : [g.a, g.b];
      const vals = hijos.map((h) => F.evalua(h, w));
      return { f: g, valor: F.evalua(g, w), hijos: hijos.map((h, i) => ({ f: h, valor: vals[i] })), razon: razon(g, vals[0], vals[1]) };
    });
  }

  // ---- Método de asignación directa (§2.6.1) --------------------------------------
  // Se exige que la conclusión sea falsa y las premisas verdaderas, y se sacan los
  // valores obligados. Cuando una exigencia admite varias posibilidades, se examina
  // cada caso por separado (dando a un miembro el valor 1 y luego el 0). El argumento
  // es válido si todos los casos llevan a contradicción.
  //
  // Devuelve {valida, pasos, contraejemplo}. Los pasos son objetos con tipo
  // 'exige' | 'obliga' | 'cumplida' | 'contradiccion' | 'casos' | 'abierta'; el texto de
  // cada uno se obtiene con textoPaso.

  function asignacionDirecta(premisas, conclusion) {
    const vars = [...new Set([...premisas, conclusion].flatMap(F.variables))].sort();
    const iniciales = [{ f: conclusion, v: 0, papel: premisas.length ? 'la conclusión' : 'la fórmula' }]
      .concat(premisas.map((p, i) => ({ f: p, v: 1, papel: premisas.length > 1 ? `la premisa ${i + 1}` : 'la premisa' })));
    let contraejemplo = null;

    // Valor ya determinado de g: asignado o calculable con lo asignado.
    function conocido(est, g) {
      const k = F.clave(g);
      if (est.valores.has(k)) return est.valores.get(k);
      return calculado(est, g);
    }
    function calculado(est, g) {
      switch (g.op) {
        case 'var': return undefined;
        case 'bot': return 0;
        case 'not': { const a = conocido(est, g.a); return a === undefined ? undefined : 1 - a; }
      }
      const a = conocido(est, g.a), b = conocido(est, g.b);
      if (a !== undefined && b !== undefined) return OPS[g.op](a, b);
      if (g.op === 'and' && (a === 0 || b === 0)) return 0;
      if (g.op === 'or' && (a === 1 || b === 1)) return 1;
      if (g.op === 'imp' && (a === 0 || b === 1)) return 1;
      return undefined;
    }
    const hijos = (g) => (g.op === 'not' ? [g.a] : g.op === 'var' || g.op === 'bot' ? [] : [g.a, g.b]);
    const conocidos = (est, g) => hijos(g).map((h) => ({ f: h, v: conocido(est, h) })).filter((x) => x.v !== undefined)
      .filter((x, i, xs) => xs.findIndex((y) => F.clave(y.f) === F.clave(x.f)) === i);

    // Qué permite concluir la exigencia v(g) = x con lo que ya se sabe.
    function examinar(est, g, x) {
      if (g.op === 'bot') return x === 1 ? { estado: 'contradiccion', conocidos: [] } : { estado: 'cumplida', conocidos: [] };
      if (g.op === 'not') {
        const a = conocido(est, g.a);
        if (a === undefined) return { estado: 'obliga', conocidos: [], obligadas: [{ f: g.a, v: 1 - x }] };
        return 1 - a === x ? { estado: 'cumplida', conocidos: [{ f: g.a, v: a }] } : { estado: 'contradiccion', conocidos: [{ f: g.a, v: a }] };
      }
      const a = conocido(est, g.a), b = conocido(est, g.b);
      if (F.clave(g.a) === F.clave(g.b)) {
        // Los dos miembros son la misma fórmula: solo pueden tener el mismo valor.
        const posibles = (a === undefined ? [1, 0] : [a]).filter((y) => OPS[g.op](y, y) === x);
        const sabidos = a === undefined ? [] : [{ f: g.a, v: a }];
        if (!posibles.length) return { estado: 'contradiccion', conocidos: sabidos, siempre: a === undefined };
        if (a === undefined && posibles.length === 1) return { estado: 'obliga', conocidos: [], obligadas: [{ f: g.a, v: posibles[0] }] };
        return { estado: 'cumplida', conocidos: sabidos };
      }
      const da = a === undefined ? [1, 0] : [a], db = b === undefined ? [1, 0] : [b];
      const cand = [];
      da.forEach((x1) => db.forEach((x2) => { if (OPS[g.op](x1, x2) === x) cand.push([x1, x2]); }));
      const sabidos = conocidos(est, g);
      if (!cand.length) return { estado: 'contradiccion', conocidos: sabidos };
      const obligadas = [];
      let libresA = a === undefined, libresB = b === undefined;
      if (libresA && cand.every((c) => c[0] === cand[0][0])) { obligadas.push({ f: g.a, v: cand[0][0] }); libresA = false; }
      if (libresB && cand.every((c) => c[1] === cand[0][1])) { obligadas.push({ f: g.b, v: cand[0][1] }); libresB = false; }
      if (obligadas.length) return { estado: 'obliga', conocidos: sabidos, obligadas };
      if (cand.length === (libresA ? 2 : 1) * (libresB ? 2 : 1)) return { estado: 'cumplida', conocidos: sabidos };
      return { estado: 'pendiente' };
    }

    // Da a g el valor x. Devuelve un paso de contradicción si choca con lo sabido.
    function asignar(est, g, x) {
      const k = F.clave(g);
      const ya = est.valores.has(k) ? est.valores.get(k) : calculado(est, g);
      if (ya !== undefined) {
        if (ya === x) return null;
        return { tipo: 'contradiccion', f: g, v: x, resulta: ya, conocidos: est.valores.has(k) ? [] : conocidos(est, g), previo: est.valores.has(k) };
      }
      est.valores.set(k, x);
      if (g.op !== 'var') est.pendientes.push({ f: g, v: x });
      return null;
    }

    // Exigencia inicial que conviene imponer ahora, como en los ejemplos del libro:
    // primero la que obliga por sí sola (v(¬q) = 1, v(p ∧ q) = 1…), después la que
    // obliga o queda decidida con lo que ya se sabe y, si no hay ninguna, la primera.
    const vacio = { valores: new Map() };
    function siguienteInicial(est) {
      let i = est.iniciales.findIndex((r) => r.f.op === 'var' || r.f.op === 'bot' || examinar(vacio, r.f, r.v).estado !== 'pendiente');
      if (i < 0) {
        i = est.iniciales.findIndex((r) => conocido(est, r.f) !== undefined || examinar(est, r.f, r.v).estado !== 'pendiente');
      }
      return i < 0 ? 0 : i;
    }

    function procesar(est, pasos) {
      for (;;) {
        // 1. Exigencias ya impuestas que obligan a algo, se cumplen o fallan.
        let hecho = false;
        for (const r of est.pendientes) {
          const e = examinar(est, r.f, r.v);
          if (e.estado === 'pendiente') continue;
          est.pendientes = est.pendientes.filter((s) => s !== r);
          hecho = true;
          if (e.estado === 'contradiccion') {
            pasos.push({ tipo: 'contradiccion', f: r.f, v: r.v, resulta: e.siempre ? 1 - r.v : calculado(est, r.f), conocidos: e.conocidos, siempre: e.siempre });
            return 'cerrada';
          }
          if (e.estado === 'cumplida') {
            if (e.conocidos.length) pasos.push({ tipo: 'cumplida', f: r.f, v: r.v, conocidos: e.conocidos });
            break;
          }
          pasos.push({ tipo: 'obliga', f: r.f, v: r.v, conocidos: e.conocidos, obligadas: e.obligadas });
          for (const o of e.obligadas) {
            const c = asignar(est, o.f, o.v);
            if (c) { pasos.push(c); return 'cerrada'; }
          }
          break;
        }
        if (hecho) continue;

        // 2. La siguiente exigencia inicial.
        if (est.iniciales.length) {
          const r = est.iniciales.splice(siguienteInicial(est), 1)[0];
          const pendiente = r.f.op !== 'var' && conocido(est, r.f) === undefined && examinar(est, r.f, r.v).estado === 'pendiente';
          pasos.push({ tipo: 'exige', f: r.f, v: r.v, papel: r.papel, pendiente });
          if (conocido(est, r.f) === r.v) pasos.push({ tipo: 'cumplida', f: r.f, v: r.v, conocidos: est.valores.has(F.clave(r.f)) ? [] : conocidos(est, r.f) });
          const c = asignar(est, r.f, r.v);
          if (c) { pasos.push(c); return 'cerrada'; }
          continue;
        }

        // 3. Sin exigencias por resolver: hay contraejemplo.
        if (!est.pendientes.length) {
          const w = {}, libres = [];
          vars.forEach((x) => {
            if (est.valores.has(x)) w[x] = est.valores.get(x);
            else { w[x] = 1; libres.push(x); }
          });
          contraejemplo = contraejemplo || w;
          pasos.push({ tipo: 'abierta', v: w, libres, vars });
          return 'abierta';
        }

        // 4. Casos: un miembro de la primera exigencia pendiente vale 1 o 0.
        const r = est.pendientes[0];
        const miembro = [r.f.a, r.f.b].find((h) => conocido(est, h) === undefined);
        const paso = { tipo: 'casos', f: r.f, v: r.v, miembro, ramas: [] };
        pasos.push(paso);
        let resultado = 'cerrada';
        for (const x of [1, 0]) {
          if (resultado === 'abierta') { paso.ramas.push({ valor: x, pasos: [], resultado: 'sin examinar' }); continue; }
          const copia = { valores: new Map(est.valores), pendientes: est.pendientes.slice(), iniciales: est.iniciales.slice() };
          const sub = [];
          asignar(copia, miembro, x);
          const res = procesar(copia, sub);
          paso.ramas.push({ valor: x, pasos: sub, resultado: res });
          if (res === 'abierta') resultado = 'abierta';
        }
        return resultado;
      }
    }

    const pasos = [];
    const res = procesar({ valores: new Map(), pendientes: [], iniciales }, pasos);
    return { valida: res === 'cerrada', pasos, contraejemplo, vars };
  }

  function textoPaso(p) {
    switch (p.tipo) {
      case 'exige':
        return `Forzamos ${p.papel} como ${p.v ? 'verdadera' : 'falsa'}: ${v(p.f, p.v)}.` +
          (p.pendiente ? ' De momento admite varias posibilidades.' : '');
      case 'obliga': {
        const datos = [`${v(p.f, p.v)}`].concat(p.conocidos.map((c) => v(c.f, c.v)));
        return `${listaY(datos)} ${datos.length > 1 ? 'obligan' : 'obliga'} a que ${listaY(p.obligadas.map((o) => v(o.f, o.v)))}.`;
      }
      case 'cumplida':
        if (!p.conocidos.length) return `${v(p.f, p.v)} ya se cumple.`;
        return `${v(p.f, p.v)} ya se cumple, porque ${listaY(p.conocidos.map((c) => v(c.f, c.v)))}.`;
      case 'contradiccion':
        if (p.f.op === 'bot') return `Pero ⊥ es falsa en toda interpretación: contradicción.`;
        if (p.siempre) return `Pero ${v(p.f, p.resulta)} sea cual sea el valor de ${T(p.f.a)}: contradicción.`;
        if (p.previo) return `Pero ya teníamos ${v(p.f, p.resulta)}: contradicción.`;
        if (p.f.op === 'var') return `Pero ya teníamos ${v(p.f, p.resulta)}: contradicción.`;
        return `Pero, con ${listaY(p.conocidos.map((c) => v(c.f, c.v)))}, resulta ${v(p.f, p.resulta)}: contradicción.`;
      case 'casos':
        return `${v(p.f, p.v)} admite varias posibilidades. Examinamos por separado los casos ${v(p.miembro, 1)} y ${v(p.miembro, 0)}.`;
      case 'abierta': {
        const asig = p.vars.map((x) => `v(${x}) = ${p.v[x]}`).join(', ');
        let s = `No hay contradicción. La interpretación ${asig} es un contraejemplo.`;
        if (p.libres.length) s += ` (${listaY(p.libres)} no ${p.libres.length > 1 ? 'han' : 'ha'} recibido valor: sirve cualquiera, y tomamos 1.)`;
        return s;
      }
    }
    return '';
  }

  // ---- Formalización (§2.5) ----------------------------------------------------------
  // Compara la fórmula del alumno con la solución en todas las interpretaciones de las
  // letras del diccionario. Si difieren, da una interpretación en la que difieren y,
  // si el error es uno de los previstos, su comentario.

  function comprobarFormalizacion(f, frase) {
    const letras = Object.keys(frase.diccionario);
    const ajenas = F.variables(f).filter((x) => !letras.includes(x));
    if (ajenas.length) return { estado: 'letras', ajenas, letras };
    const sol = F.analizar(frase.solucion);
    const filas = F.interpretaciones(letras.slice().sort());
    const w = filas.find((x) => F.evalua(f, x) !== F.evalua(sol, x));
    if (!w) return { estado: 'bien' };
    const previsto = frase.errores.find((e) => equivalencia(F.analizar(e.formula), f).equivalentes);
    return { estado: 'mal', interpretacion: w, tuya: F.evalua(f, w), correcta: F.evalua(sol, w), mensaje: previsto ? previsto.mensaje : null };
  }

  // Interpretación como texto: v(p) = 1, v(q) = 0
  const textoInterpretacion = (w, vars) => vars.map((x) => `v(${x}) = ${w[x]}`).join(', ');

  const API = {
    MAX_VARIABLES, OPS, tabla, clasificar, NOMBRE_CLASE, filasModelo, equivalencia, consecuencia,
    porQueNoContraejemplo, pasosEvaluacion, asignacionDirecta, textoPaso, textoInterpretacion, listaY,
    comprobarFormalizacion,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else raiz.Semantica = API;
})(typeof window !== 'undefined' ? window : globalThis);
