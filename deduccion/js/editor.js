// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Fernando Soler Toscano
// Núcleo del asistente de deducción natural: lectura de justificaciones, comprobación
// de una prueba en curso línea a línea, renumeración de citas, exportación a LaTeX y
// a texto, y codificación del estado. No depende de la interfaz.
(function (raiz) {
  'use strict';
  const enNode = typeof module !== 'undefined' && module.exports;
  const PO = enNode ? require('../../comun/js/primerorden.js') : raiz.PrimerOrden;
  const V = enNode ? require('../../comun/js/verificador.js') : raiz.Verificador;
  // Se admiten los predicados con paréntesis, P(a), R(x, b), y pegados, Pa, Rxb.
  const OPC = { atomos: true, compacta: true };

  // ---- Reglas y sus formas de escribirlas ------------------------------------------------
  // Se aceptan los nombres del libro y variantes de teclado, sin distinguir mayúsculas.
  const ALIAS = {
    'R': ['r', 'reit'],
    '∧I': ['∧i', '&i', '^i'], '∧E': ['∧e', '&e', '^e'],
    '∨I': ['∨i', '|i', 'vi'], '∨E': ['∨e', '|e', 've'],
    '→I': ['→i', '->i', '>i', '⊃i'], '→E': ['→e', '->e', '>e', '⊃e', 'mp'],
    '¬I': ['¬i', '~i', '-i'], '¬E': ['¬e', '~e', '-e'],
    'X': ['x', '⊥e', '#e'], 'IP': ['ip'],
    '↔I': ['↔i', '<->i', '≡i'], '↔E': ['↔e', '<->e', '≡e'],
    'MT': ['mt'], 'DS': ['ds'], 'DNE': ['dne', '¬¬e', '~~e'], 'LEM': ['lem'], 'DeM': ['dem'],
    '∀I': ['∀i', 'ai', '!i'], '∀E': ['∀e', 'ae', '!e'], '∃I': ['∃i', 'ei', '?i'], '∃E': ['∃e', 'ee', '?e'],
    '=I': ['=i'], '=E': ['=e'], 'CQ': ['cq'],
  };
  const REGLA = new Map();
  Object.entries(ALIAS).forEach(([r, as]) => as.forEach((a) => REGLA.set(a, r)));
  const PROPOSICIONALES = ['R', '∧I', '∧E', '∨I', '∨E', '→I', '→E', '¬I', '¬E', 'X', 'IP', '↔I', '↔E'];
  const CUANTIFICADORES = ['∀I', '∀E', '∃I', '∃E', '=I', '=E'];
  const DERIVADAS = ['MT', 'DS', 'DNE', 'LEM', 'DeM', 'CQ'];

  // «→E 1, 2», «∃E 1, 3-5», «&E1», «=I» → {regla, citas}; o {vacia} o {error}.
  function leerJustificacion(texto) {
    const s = (texto || '').replace(/[–—−]/g, '-').replace(/\.\./g, '-').trim();
    if (!s) return { vacia: true };
    const m = /^([^\d,;]*?)\s*([\d\s,;-]*)$/.exec(s);
    if (!m) return { error: `No entiendo la justificación «${texto.trim()}». Escribe la regla y las líneas que cita, como en «→E 1, 2» o «∃E 1, 3-5».` };
    const nombre = m[1].replace(/\s+/g, '');
    if (!nombre) return { error: 'Falta el nombre de la regla, delante de las líneas citadas.' };
    const regla = REGLA.get(nombre.toLowerCase());
    if (!regla) return { error: `No reconozco la regla «${m[1].trim()}». Las reglas son ${[...PROPOSICIONALES, ...CUANTIFICADORES, ...DERIVADAS].join(', ')}.` };
    const citas = [];
    const resto = m[2].replace(/\s*-\s*/g, '-').trim();
    for (const t of resto.split(/[\s,;]+/).filter(Boolean)) {
      const r = /^(\d+)-(\d+)$/.exec(t);
      if (r) {
        const a = Number(r[1]), b = Number(r[2]);
        if (a > b) return { error: `En «${t}», la caja va de su hipótesis a su última línea: el primer número es el menor.` };
        citas.push([a, b]);
      } else if (/^\d+$/.test(t)) citas.push(Number(t));
      else return { error: `No entiendo la cita «${t}».` };
    }
    return { regla, citas };
  }

  // Etiqueta de una hipótesis: «Hip.», «Hip. IP», «Hip. testigo c» (o «testigo c»).
  function leerHipotesis(texto) {
    const s = (texto || '').trim();
    const t = /testigo\s*\$?\s*([a-r])\b/i.exec(s);
    if (t) return { etiqueta: `Hip. testigo ${t[1].toLowerCase()}`, testigo: t[1].toLowerCase() };
    if (/\bip\b/i.test(s)) return { etiqueta: 'Hip. IP' };
    return { etiqueta: 'Hip.' };
  }

  const citaTexto = (c) => (Array.isArray(c) ? `${c[0]}-${c[1]}` : String(c));
  const justificacionTexto = (j) => (j.citas.length ? `${j.regla} ${j.citas.map(citaTexto).join(', ')}` : j.regla);

  const mensajeError = (e) => (e.posicion !== undefined ? `${e.message.replace(/\.$/, '')} (posición ${e.posicion + 1}).` : e.message);
  const analizar = (s) => PO.analizar(s, OPC);
  const texto = (f) => PO.texto(f, true);
  const BOT = { op: 'bot' };

  // ---- Problema ----------------------------------------------------------------------------

  function leerProblema(premisasTexto, conclusionTexto) {
    const lineas = premisasTexto.split('\n').map((s) => s.trim()).filter(Boolean);
    const premisas = [];
    for (let i = 0; i < lineas.length; i++) {
      let f;
      try { f = analizar(lineas[i]); } catch (e) { return { error: `Premisa ${i + 1}: ${mensajeError(e)}` }; }
      const lib = [...PO.libres(f)];
      if (lib.length) return { error: `Premisa ${i + 1}: ${texto(f)} tiene libre la variable ${lib.join(', ')}; las premisas son sentencias.` };
      premisas.push(f);
    }
    if (!conclusionTexto.trim()) return { error: 'Escribe la conclusión.' };
    let conclusion;
    try { conclusion = analizar(conclusionTexto); } catch (e) { return { error: `Conclusión: ${mensajeError(e)}` }; }
    const lib = [...PO.libres(conclusion)];
    if (lib.length) return { error: `La conclusión tiene libre la variable ${lib.join(', ')}; tiene que ser una sentencia.` };
    return { premisas, conclusion, texto: `${premisas.map(texto).join(', ')}${premisas.length ? ' ' : ''}⊢ ${texto(conclusion)}` };
  }

  // Líneas iniciales de una prueba: las premisas y una línea vacía.
  function lineasIniciales(problema) {
    return problema.premisas.map((f) => ({ prof: 0, tipo: 'premisa', formula: texto(f), just: 'Prem.' }))
      .concat([{ prof: 0, tipo: 'paso', formula: '', just: '' }]);
  }

  // ---- Comprobación de una prueba en curso ---------------------------------------------------
  // lineas: [{prof, tipo: 'premisa' | 'hipotesis' | 'paso', formula: texto, just: texto}]
  // Devuelve {lineas: [{estado: 'bien' | 'error' | 'vacia' | 'incompleta', mensajes,
  // f}], completa, errores, pendientes, mensaje}.

  function comprobar(problema, lineas, opciones = {}) {
    const res = lineas.map(() => ({ estado: 'bien', mensajes: [] }));
    const rotas = new Set();
    const vl = lineas.map((l, i) => {
      const n = i + 1;
      let f = null;
      if (!l.formula.trim()) { res[i] = { estado: 'vacia', mensajes: [] }; rotas.add(n); }
      else {
        try { f = analizar(l.formula); res[i].f = f; } catch (e) { res[i] = { estado: 'error', mensajes: [mensajeError(e)] }; rotas.add(n); }
      }
      const linea = { prof: l.prof, tipo: l.tipo, f: f || BOT, citas: [] };
      if (l.tipo === 'hipotesis') {
        const h = leerHipotesis(l.just);
        if (h.testigo) linea.testigo = h.testigo;
      } else if (l.tipo === 'paso') {
        const j = leerJustificacion(l.just);
        if (j.vacia) {
          if (res[i].estado === 'bien') res[i] = { estado: 'incompleta', mensajes: ['Falta la justificación: la regla y las líneas que cita.'], f };
          rotas.add(n);
        } else if (j.error) {
          res[i] = { estado: 'error', mensajes: res[i].mensajes.concat([j.error]), f };
          rotas.add(n);
        } else {
          linea.regla = j.regla;
          linea.citas = j.citas;
        }
      }
      return linea;
    });
    const v = V.verificar(vl, { soloBasicas: !!opciones.soloBasicas, prohibidas: opciones.prohibidas || [] });
    v.errores.forEach((e) => {
      const i = e.linea - 1;
      if (i < 0 || rotas.has(e.linea)) return;
      // Si cita una línea vacía o con errores, se dice eso en lugar del error de la regla.
      const citadas = vl[i].citas.flatMap((c) => (Array.isArray(c) ? c : [c]));
      const rota = citadas.find((c) => rotas.has(c));
      const mensaje = rota ? `Cita la línea ${rota}, que está vacía o tiene un error.` : e.mensaje;
      res[i] = { estado: 'error', mensajes: res[i].estado === 'error' ? res[i].mensajes.concat([mensaje]) : [mensaje], f: res[i].f };
    });
    const errores = res.filter((r) => r.estado === 'error').length;
    const pendientes = res.filter((r) => r.estado === 'vacia' || r.estado === 'incompleta').length;
    const ultima = lineas[lineas.length - 1];
    const ultimaF = res[res.length - 1] && res[res.length - 1].f;
    const terminaBien = ultima && ultima.prof === 0 && ultimaF && PO.clave(ultimaF) === PO.clave(problema.conclusion);
    const completa = !errores && !pendientes && terminaBien;
    let mensaje;
    if (completa) mensaje = `Prueba completa: ${problema.texto}.`;
    else if (errores) mensaje = `Hay ${errores} ${errores > 1 ? 'líneas con errores' : 'línea con errores'}.`;
    else if (pendientes) mensaje = 'Sin errores por ahora. Quedan líneas por completar.';
    else if (ultima && ultima.prof > 0) mensaje = 'Sin errores por ahora. Para terminar, cierra las cajas: la conclusión va en el nivel principal.';
    else mensaje = `Sin errores por ahora, pero la prueba no ha terminado: la última línea tiene que ser la conclusión, ${texto(problema.conclusion)}.`;
    return { lineas: res, completa, errores, pendientes, mensaje };
  }

  // ---- Edición -------------------------------------------------------------------------------

  // Cambia en una justificación los números de línea mayores o iguales que desde,
  // sumándoles delta. Si no se entiende, la deja como está.
  function renumerar(just, desde, delta) {
    const j = leerJustificacion(just);
    if (j.vacia || j.error || !j.citas.length) return just;
    const mover = (n) => (n >= desde ? n + delta : n);
    j.citas = j.citas.map((c) => (Array.isArray(c) ? [mover(c[0]), mover(c[1])] : mover(c)));
    return justificacionTexto(j);
  }
  function insertar(lineas, despuesDe, nueva) {
    const n = despuesDe + 2; // número de la línea nueva
    const res = lineas.map((l) => (l.tipo === 'paso' ? Object.assign({}, l, { just: renumerar(l.just, n, 1) }) : l));
    res.splice(despuesDe + 1, 0, nueva);
    return res;
  }
  function borrar(lineas, i) {
    const n = i + 1;
    const res = lineas.filter((_, k) => k !== i);
    return res.map((l) => (l.tipo === 'paso' ? Object.assign({}, l, { just: renumerar(l.just, n + 1, -1) }) : l));
  }

  // ---- Exportación -----------------------------------------------------------------------------

  const LATEX = [[/¬/g, '\\lnot '], [/∧/g, '\\land'], [/∨/g, '\\lor'], [/↔/g, '\\leftrightarrow'], [/→/g, '\\to'],
    [/⊥/g, '\\bot'], [/∀/g, '\\forall '], [/∃/g, '\\exists '], [/≠/g, '\\neq']];
  const MACRO = {
    'R': 'r', '∧I': 'ai', '∧E': 'ae', '∨I': 'oi', '∨E': 'oe', '¬I': 'ni', '¬E': 'ne', '→I': 'ci', '→E': 'ce',
    '↔I': 'bi', '↔E': 'be', 'X': 'x', 'IP': 'ip', 'DS': 'ds', 'MT': 'mt', 'LEM': 'lem', 'DNE': 'dne', 'DeM': 'dem',
    'CQ': 'cq', '∀I': 'Ai', '∀E': 'Ae', '∃I': 'Ei', '∃E': 'Ee', '=I': 'idi', '=E': 'ide',
  };
  const formulaLatex = (f) => LATEX.reduce((s, [re, r]) => s.replace(re, r), texto(f)).replace(/ +/g, ' ').replace(/\\(forall|exists) (\w)/g, '\\$1 $2');

  // LaTeX con el paquete fitch y las macros del libro (rules=myrules).
  function aLatex(lineas) {
    const out = ['$\\begin{nd}[rules=myrules]'];
    let prof = 0;
    const sangria = () => '    ' + '  '.repeat(prof);
    lineas.forEach((l, i) => {
      const n = i + 1;
      let f;
      try { f = formulaLatex(analizar(l.formula)); } catch (e) { f = l.formula; }
      if (l.tipo === 'hipotesis') {
        while (prof >= l.prof) { prof--; out.push(sangria() + '  \\close'); }
        while (prof < l.prof) { out.push(sangria() + '\\open'); prof++; }
        out.push(`${sangria()}\\hypo [${n}] {${n}} {${f}} \\by{${leerHipotesis(l.just).etiqueta.replace(/testigo ([a-r])/, 'testigo $$$1$$')}}{}`);
        return;
      }
      while (prof > l.prof) { prof--; out.push(sangria() + '\\close'); }
      if (l.tipo === 'premisa') { out.push(`${sangria()}\\hypo [${n}] {${n}} {${f}} \\by{Prem.}{}`); return; }
      const j = leerJustificacion(l.just);
      const citas = j.citas ? j.citas.map(citaTexto).join(', ') : '';
      const just = j.regla ? `\\${MACRO[j.regla]}{${citas}}` : `\\by{${l.just}}{}`;
      out.push(`${sangria()}\\have [${n}] {${n}} {${f}} ${just}`);
    });
    while (prof > 0) { prof--; out.push(sangria() + '\\close'); }
    out.push('\\end{nd}$');
    return out.join('\n');
  }

  // Texto con las barras de Fitch y una raya bajo las premisas y bajo cada hipótesis.
  function aTexto(lineas) {
    const ultimaPremisa = lineas.reduce((u, l, i) => (l.tipo === 'premisa' ? i : u), -1);
    const filas = [];
    lineas.forEach((l, i) => {
      let f;
      try { f = texto(analizar(l.formula)); } catch (e) { f = l.formula; }
      const just = l.tipo === 'premisa' ? 'Prem.' : l.tipo === 'hipotesis' ? leerHipotesis(l.just).etiqueta : (() => { const j = leerJustificacion(l.just); return j.regla ? justificacionTexto(j) : l.just; })();
      filas.push([`${String(i + 1).padStart(3)} ${'│ '.repeat(l.prof + 1)}${f}`, just]);
      if (l.tipo === 'hipotesis' || i === ultimaPremisa) {
        filas.push([`    ${'│ '.repeat(l.prof)}├${'─'.repeat(Math.max(3, [...f].length + 1))}`, '']);
      }
    });
    const ancho = Math.max(...filas.map(([a]) => [...a].length)) + 3;
    return filas.map(([a, b]) => (b ? a + ' '.repeat(ancho - [...a].length) + b : a)).join('\n');
  }

  // Preámbulo que necesita el LaTeX exportado: el paquete fitch y las macros de las
  // reglas, como en el libro.
  const PREAMBULO_LATEX = [
    '\\usepackage[rules=myrules,justformat=myjust]{fitch}',
    '\\newcommand{\\myjust}[2]{#1 #2}',
    '\\newcommand{\\myrules}{',
    ' \\ndrules',
    ' \\def\\ci{\\by{$\\to$I}}',
    ' \\def\\ce{\\by{$\\to$E}}',
    ' \\def\\x{\\by{X}}',
    ' \\def\\ip{\\by{IP}}',
    ' \\def\\ds{\\by{DS}}',
    ' \\def\\mt{\\by{MT}}',
    ' \\def\\lem{\\by{LEM}}',
    ' \\def\\dne{\\by{DNE}}',
    ' \\def\\dem{\\by{DeM}}',
    ' \\def\\cq{\\by{CQ}}',
    ' \\def\\bi{\\by{$\\leftrightarrow$I}}',
    ' \\def\\be{\\by{$\\leftrightarrow$E}}',
    ' \\def\\idi{\\by{$=$I}}',
    ' \\def\\ide{\\by{$=$E}}}',
  ].join('\n');

  // ---- Estado en texto (para la dirección y el navegador) ------------------------------------------

  function codificar(lineas) {
    return lineas.filter((l) => l.tipo !== 'premisa')
      .map((l) => [l.prof, l.tipo === 'hipotesis' ? 'h' : 's', l.formula, l.just].map((x) => String(x).replace(/[\t\n]/g, ' ')).join('\t')).join('\n');
  }
  function decodificar(problema, s) {
    const base = lineasIniciales(problema).filter((l) => l.tipo === 'premisa');
    const resto = (s || '').split('\n').filter((x) => x.length).map((x) => {
      const [prof, t, formula, just] = x.split('\t');
      return { prof: Math.max(0, Number(prof) || 0), tipo: t === 'h' ? 'hipotesis' : 'paso', formula: formula || '', just: just || '' };
    });
    return base.concat(resto.length ? resto : [{ prof: 0, tipo: 'paso', formula: '', just: '' }]);
  }

  const API = {
    ALIAS, PROPOSICIONALES, CUANTIFICADORES, DERIVADAS, leerJustificacion, leerHipotesis, justificacionTexto,
    leerProblema, lineasIniciales, comprobar, renumerar, insertar, borrar, aLatex, aTexto, PREAMBULO_LATEX, codificar, decodificar,
    analizar, texto, mensajeError, formulaLatex,
  };
  if (enNode) module.exports = API;
  else raiz.Editor = API;
})(typeof window !== 'undefined' ? window : globalThis);
