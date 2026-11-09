// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Fernando Soler Toscano
// Ejemplos y frases de la aplicación de tablas de verdad. Los datos están en
// datos/ejercicios.js; este módulo los ofrece con los nombres de siempre.
(function (raiz) {
  'use strict';
  const enNode = typeof module !== 'undefined' && module.exports;
  const D = enNode
    ? require('../../comun/js/datos.js').leerFichero(require('path').join(__dirname, '../datos/ejercicios.js'))
    : raiz.Datos.obtener('tablas');
  const API = { EJEMPLOS_TABLA: D.ejemplosTabla, EJEMPLOS_CONSECUENCIA: D.ejemplosConsecuencia, FRASES: D.frases };
  if (enNode) module.exports = API;
  else raiz.Ejercicios = API;
})(typeof window !== 'undefined' ? window : globalThis);
