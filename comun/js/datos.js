// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Fernando Soler Toscano
// Registro de los datos de las aplicaciones (ejemplos, retos, ejercicios…).
//
// Los datos están en ficheros aparte, datos/*.js, con este formato:
//
//   Datos.registrar("nombre", {
//     … un objeto JSON …
//   });
//
// El contenido es JSON (comillas dobles, sin comas finales), de modo que se puede
// editar como tal. No son ficheros .json porque los navegadores no dejan leerlos
// cuando la página se abre directamente desde el disco; así las aplicaciones
// funcionan igual en local que en un servidor.
(function (raiz) {
  'use strict';
  const almacen = {};
  const Datos = {
    registrar(nombre, valor) { almacen[nombre] = valor; },
    obtener(nombre) {
      if (!(nombre in almacen)) throw new Error(`Faltan los datos «${nombre}»: ¿se ha cargado su fichero datos/*.js?`);
      return almacen[nombre];
    },
  };
  if (typeof module !== 'undefined' && module.exports) {
    // En Node, para las pruebas: lee un fichero de datos y comprueba que es JSON.
    const fs = require('fs');
    Datos.leerFichero = (ruta) => {
      const texto = fs.readFileSync(ruta, 'utf8');
      const m = /Datos\.registrar\(\s*"([^"]+)"\s*,\s*([\s\S]*)\);\s*$/.exec(texto.replace(/^\s*\/\/.*$/gm, '').trim());
      if (!m) throw new Error(`${ruta}: no tiene la forma Datos.registrar("nombre", {…});`);
      let valor;
      try { valor = JSON.parse(m[2]); } catch (e) { throw new Error(`${ruta}: el contenido no es JSON válido (${e.message}).`); }
      Datos.registrar(m[1], valor);
      return valor;
    };
    module.exports = Datos;
  } else raiz.Datos = Datos;
})(typeof window !== 'undefined' ? window : globalThis);
