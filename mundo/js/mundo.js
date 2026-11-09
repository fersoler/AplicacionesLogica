// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Fernando Soler Toscano
// El mundo de Tarski: piezas en un tablero, el diccionario de predicados, la
// estructura M = ⟨D, I⟩ que determinan, mundos al azar y los ejercicios.
// Depende de primerorden.js.
(function (raiz) {
  'use strict';
  const PO = (typeof module !== 'undefined' && module.exports) ? require('../../comun/js/primerorden.js') : raiz.PrimerOrden;

  const TAM_TABLERO = 6;
  const FORMAS = ['tri', 'cua', 'cir'];
  const TAMANOS = ['peq', 'med', 'gra'];
  const COLORES = ['rojo', 'verde', 'azul'];
  const NOMBRE_FORMA = { tri: 'triángulo', cua: 'cuadrado', cir: 'círculo' };
  const NOMBRE_TAMANO = { peq: 'pequeño', med: 'mediano', gra: 'grande' };

  // Diccionario. Los nombres se reconocen sin tildes y sin distinguir mayúsculas;
  // los alias son los de la versión anterior de la aplicación.
  const PREDICADOS = [
    { nombre: 'Triángulo', alias: ['Tri'], aridad: 1, lee: 'x es un triángulo', ext: (a) => a.forma === 'tri' },
    { nombre: 'Cuadrado', alias: ['Cua'], aridad: 1, lee: 'x es un cuadrado', ext: (a) => a.forma === 'cua' },
    { nombre: 'Círculo', alias: ['Cir'], aridad: 1, lee: 'x es un círculo', ext: (a) => a.forma === 'cir' },
    { nombre: 'Pequeño', alias: ['Peque'], aridad: 1, lee: 'x es pequeño', ext: (a) => a.tamano === 'peq' },
    { nombre: 'Mediano', alias: [], aridad: 1, lee: 'x es mediano', ext: (a) => a.tamano === 'med' },
    { nombre: 'Grande', alias: [], aridad: 1, lee: 'x es grande', ext: (a) => a.tamano === 'gra' },
    { nombre: 'Rojo', alias: [], aridad: 1, lee: 'x es rojo', ext: (a) => a.color === 'rojo' },
    { nombre: 'Verde', alias: [], aridad: 1, lee: 'x es verde', ext: (a) => a.color === 'verde' },
    { nombre: 'Azul', alias: [], aridad: 1, lee: 'x es azul', ext: (a) => a.color === 'azul' },
    { nombre: 'IzqDe', alias: [], aridad: 2, lee: 'x está en una columna a la izquierda de la de y', ext: (a, b) => a.x < b.x },
    { nombre: 'DerDe', alias: [], aridad: 2, lee: 'x está en una columna a la derecha de la de y', ext: (a, b) => a.x > b.x },
    { nombre: 'AdelanteDe', alias: [], aridad: 2, lee: 'x está en una fila más abajo (más adelante) que y', ext: (a, b) => a.y < b.y },
    { nombre: 'AtrasDe', alias: [], aridad: 2, lee: 'x está en una fila más arriba (más atrás) que y', ext: (a, b) => a.y > b.y },
    { nombre: 'MismaFila', alias: [], aridad: 2, lee: 'x está en la misma fila que y', ext: (a, b) => a.y === b.y },
    { nombre: 'MismaCol', alias: ['MismaColumna'], aridad: 2, lee: 'x está en la misma columna que y', ext: (a, b) => a.x === b.x },
    { nombre: 'Adyacente', alias: [], aridad: 2, lee: 'x e y ocupan casillas vecinas (también en diagonal)',
      ext: (a, b) => a !== b && Math.abs(a.x - b.x) <= 1 && Math.abs(a.y - b.y) <= 1 },
    { nombre: 'MismaForma', alias: [], aridad: 2, lee: 'x tiene la misma forma que y', ext: (a, b) => a.forma === b.forma },
    { nombre: 'MismoTam', alias: ['MismoTamaño'], aridad: 2, lee: 'x tiene el mismo tamaño que y', ext: (a, b) => a.tamano === b.tamano },
    { nombre: 'MismoColor', alias: [], aridad: 2, lee: 'x tiene el mismo color que y', ext: (a, b) => a.color === b.color },
  ];
  const normal = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const INDICE = new Map();
  PREDICADOS.forEach((p) => [p.nombre, ...p.alias].forEach((n) => INDICE.set(normal(n), p)));
  const buscarPredicado = (nombre) => INDICE.get(normal(nombre)) || null;

  // ---- Mundo y estructura -------------------------------------------------------
  // Un mundo es una lista de piezas {x, y, forma, tamano, color, nombres: ['a', …]}.
  // Las piezas son los objetos del dominio, numerados 1, 2, … por su orden.

  function estructura(piezas) {
    const D = piezas.map((_, i) => i + 1);
    const pieza = (d) => piezas[d - 1];
    const denota = {};
    piezas.forEach((p, i) => p.nombres.forEach((n) => { denota[n] = i + 1; }));
    return {
      D,
      pieza,
      constante: (c) => denota[c],
      constantes: denota,
      predicado(nombre) {
        const p = buscarPredicado(nombre);
        if (!p) return null;
        return { nombre: p.nombre, aridad: p.aridad, ext: (...ds) => p.ext(...ds.map(pieza)) };
      },
      // I(P) como conjunto de elementos o de tuplas
      extension(p) {
        if (p.aridad === 1) return D.filter((d) => p.ext(pieza(d)));
        return D.flatMap((d) => D.filter((e) => p.ext(pieza(d), pieza(e))).map((e) => [d, e]));
      },
    };
  }

  // ---- Mundos al azar ---------------------------------------------------------------

  function azar(semilla) {
    let s = (semilla >>> 0) || 1;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; };
  }
  const elige = (lista, rnd) => lista[Math.floor(rnd() * lista.length)];

  // n piezas en casillas distintas; cada constante nombra una pieza al azar (dos
  // constantes pueden nombrar la misma, lo que importa para la identidad).
  function mundoAleatorio(n, constantesUsadas, rnd) {
    const casillas = [];
    for (let x = 0; x < TAM_TABLERO; x++) for (let y = 0; y < TAM_TABLERO; y++) casillas.push([x, y]);
    for (let i = casillas.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [casillas[i], casillas[j]] = [casillas[j], casillas[i]];
    }
    const piezas = casillas.slice(0, n).map(([x, y]) => ({
      x, y, forma: elige(FORMAS, rnd), tamano: elige(TAMANOS, rnd), color: elige(COLORES, rnd), nombres: [],
    }));
    [...constantesUsadas].sort().forEach((c) => elige(piezas, rnd).nombres.push(c));
    return piezas;
  }

  // Busca un mundo pequeño en el que dos fórmulas (sentencias) tomen valores
  // distintos. Prueba primero con pocas piezas.
  function buscarDiferencia(f1, f2, opciones = {}) {
    const rnd = azar(opciones.semilla || 12345);
    const consts = new Set([...PO.constantes(f1), ...PO.constantes(f2)]);
    const porTamano = opciones.porTamano || 400;
    const maxPiezas = opciones.maxPiezas || 6;
    let probados = 0;
    for (let n = Math.max(1, consts.size ? 1 : 1); n <= maxPiezas; n++) {
      for (let k = 0; k < porTamano; k++) {
        const piezas = mundoAleatorio(n, consts, rnd);
        const M = estructura(piezas);
        probados++;
        const v1 = PO.satisface(f1, M), v2 = PO.satisface(f2, M);
        if (v1 !== v2) return { piezas, v1, v2, probados };
      }
    }
    return { piezas: null, probados };
  }

  // Busca un contramodelo: premisas verdaderas y conclusión falsa.
  function buscarContramodelo(premisas, conclusion, opciones = {}) {
    const rnd = azar(opciones.semilla || 2027);
    const consts = new Set();
    [...premisas, conclusion].forEach((f) => PO.constantes(f, consts));
    for (let n = 1; n <= (opciones.maxPiezas || 6); n++) {
      for (let k = 0; k < (opciones.porTamano || 400); k++) {
        const piezas = mundoAleatorio(n, consts, rnd);
        const M = estructura(piezas);
        if (premisas.every((p) => PO.satisface(p, M)) && !PO.satisface(conclusion, M)) return piezas;
      }
    }
    return null;
  }

  // ---- Codificación para la dirección de la página ---------------------------------
  // Cada pieza: columna, fila, forma (T C O), tamaño (P M G), color (R V A) y nombres.

  const COD = { tri: 'T', cua: 'C', cir: 'O', peq: 'P', med: 'M', gra: 'G', rojo: 'R', verde: 'V', azul: 'A' };
  const DEC = Object.fromEntries(Object.entries(COD).map(([k, v]) => [v, k]));
  const codificar = (piezas) => piezas.map((p) => `${p.x}${p.y}${COD[p.forma]}${COD[p.tamano]}${COD[p.color]}${p.nombres.join('')}`).join('.');
  function decodificar(texto) {
    if (!texto) return [];
    const piezas = [];
    const usadas = new Set(), nombres = new Set();
    for (const s of texto.split('.')) {
      const m = /^([0-9])([0-9])([TCO])([PMG])([RVA])([a-r]*)$/.exec(s);
      if (!m) continue;
      const [, x, y, f, t, c, ns] = m;
      if (+x >= TAM_TABLERO || +y >= TAM_TABLERO || usadas.has(x + y)) continue;
      usadas.add(x + y);
      const propios = [...ns].filter((n) => !nombres.has(n));
      propios.forEach((n) => nombres.add(n));
      piezas.push({ x: +x, y: +y, forma: DEC[f], tamano: DEC[t], color: DEC[c], nombres: propios });
    }
    return piezas;
  }

  // ---- Mundo de ejemplo y ejercicios ------------------------------------------------



  // Retos de contramodelos (§5.3 y §5.4). En los que llevan valido: true no hay
  // contramodelo: el argumento es válido.

  // Ejercicios de formalización (§5.2).

  // Mundo de ejemplo, fórmulas, retos y frases: en datos/mundo.js.
  const DATOS = (typeof module !== 'undefined' && module.exports)
    ? require('../../comun/js/datos.js').leerFichero(require('path').join(__dirname, '../datos/mundo.js'))
    : raiz.Datos.obtener('mundo');
  const MUNDO_EJEMPLO = DATOS.mundoEjemplo;
  const EJEMPLOS = DATOS.ejemplos.map((e) => [e.formula, e.nombre]);
  const RETOS = DATOS.retos;
  const FORMALIZAR = DATOS.formalizar;

  const API = {
    TAM_TABLERO, FORMAS, TAMANOS, COLORES, NOMBRE_FORMA, NOMBRE_TAMANO, PREDICADOS, buscarPredicado,
    estructura, azar, mundoAleatorio, buscarDiferencia, buscarContramodelo, codificar, decodificar,
    MUNDO_EJEMPLO, EJEMPLOS, RETOS, FORMALIZAR,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else raiz.Mundo = API;
})(typeof window !== 'undefined' ? window : globalThis);
