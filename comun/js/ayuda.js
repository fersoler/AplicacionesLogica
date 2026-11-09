// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Fernando Soler Toscano
// Ayuda común: cómo escribir las fórmulas. Así todas las aplicaciones explican la
// sintaxis con las mismas palabras y la misma tabla.
//
// En la página, cada elemento con el atributo data-ayuda-sintaxis se rellena al
// cargar. El valor del atributo dice qué admite la aplicación:
//   prop      variables proposicionales (p, q, r…)
//   bot       la contradicción ⊥
//   cuant     cuantificadores, constantes y variables
//   igualdad  = y ≠
//   pegados   predicados de una letra, con paréntesis o pegados (Rxb)
//   palabras  predicados del diccionario (el mundo de Tarski)
// En los textos, lo que va entre llaves {…} es una fórmula y se compone como tal.
(function (raiz) {
  'use strict';

  // [nombre, símbolo del libro, teclado, rasgo necesario]
  const FILAS = [
    ['negación', '¬', '~'],
    ['conjunción', '∧', '&'],
    ['disyunción', '∨', '|'],
    ['condicional', '→', '->'],
    ['bicondicional', '↔', '<->'],
    ['contradicción', '⊥', '#', 'bot'],
    ['cuantificador universal', '∀x', 'Ax', 'cuant'],
    ['cuantificador existencial', '∃x', 'Ex', 'cuant'],
    ['identidad', 'a = b', 'a = b', 'igualdad'],
    ['distinto', 'a ≠ b', 'a != b', 'igualdad'],
  ];

  // Textos de la ayuda para un conjunto de rasgos (sin DOM, para poder probarlos).
  function textos(rasgos) {
    const r = new Set(rasgos);
    const filas = FILAS.filter((f) => !f[3] || r.has(f[3]));
    const letras = [];
    if (r.has('prop')) {
      letras.push(r.has('cuant')
        ? 'Las variables proposicionales son letras sueltas: {p}, {q}, {r}… Dentro de los argumentos de un predicado, en cambio, una letra minúscula es una constante o una variable.'
        : 'Las variables proposicionales son letras sueltas: {p}, {q}, {r}… La {v} también es una variable, no la disyunción.');
    }
    if (r.has('cuant')) letras.push('Las constantes son las letras de la {a} a la {r}, y las variables, de la {s} a la {z}.');
    if (r.has('pegados')) {
      letras.push('Los predicados son letras mayúsculas, con sus argumentos entre paréntesis, {R(x, b)}, o pegados, {Rxb}. En la forma pegada, {Ax} y {Ex} son cuantificadores.');
    }
    if (r.has('palabras')) {
      letras.push('Los predicados son las palabras del diccionario, con sus argumentos entre paréntesis: {IzqDe(a, x)}. Se reconocen sin tildes y sin distinguir mayúsculas.');
    }
    const convenciones = ['Precedencia, de más a menos fuerte: {¬}, {∧}, {∨}, {→}, {↔} (§1.1.1). Las conectivas binarias se agrupan por la derecha: {A → B → C} es {A → (B → C)}.'];
    if (r.has('cuant')) {
      const [P, Q] = r.has('palabras') ? ['Triángulo', 'Rojo'] : ['P', 'Q'];
      convenciones.push(`Los cuantificadores, como el negador, afectan solo a la fórmula más breve que les sigue: {∀x ${P}(x) → ${Q}(x)} es {(∀x ${P}(x)) → ${Q}(x)}. Para que abarquen más, hay que poner paréntesis: {∀x (${P}(x) → ${Q}(x))}.`);
    }
    return {
      intro: 'Cada símbolo se escribe con su botón, con el del libro o con el teclado:',
      filas, letras, convenciones,
    };
  }

  function rellenar(doc) {
    doc.querySelectorAll('[data-ayuda-sintaxis]').forEach((caja) => {
      const t = textos(caja.dataset.ayudaSintaxis.split(/\s+/).filter(Boolean));
      const el = (etiqueta, clase, texto) => {
        const e = doc.createElement(etiqueta);
        if (clase) e.className = clase;
        if (texto !== undefined) e.textContent = texto;
        return e;
      };
      const tabla = el('table', 'simbolos tabla-sintaxis');
      const cab = el('thead');
      const fc = el('tr');
      ['Símbolo', 'Libro', 'Teclado'].forEach((x) => fc.append(el('th', '', x)));
      cab.append(fc);
      const cuerpo = el('tbody');
      t.filas.forEach(([nombre, libro, teclado]) => {
        const tr = el('tr');
        const td = el('td');
        td.append(el('code', '', teclado));
        tr.append(el('th', '', nombre), el('td', 'fo', libro), td);
        cuerpo.append(tr);
      });
      tabla.append(cab, cuerpo);
      // Párrafo con las fórmulas {…} en la letra de las fórmulas.
      const parrafo = (texto) => {
        const p = el('p', 'explica');
        texto.split(/\{([^}]*)\}/).forEach((trozo, i) => p.append(i % 2 ? el('span', 'fo', trozo) : trozo));
        return p;
      };
      caja.replaceChildren(parrafo(t.intro), tabla, parrafo(t.letras.join(' ')), parrafo(t.convenciones.join(' ')));
    });
  }

  const API = { FILAS, textos, rellenar };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else {
    raiz.Ayuda = API;
    if (raiz.document) raiz.document.addEventListener('DOMContentLoaded', () => rellenar(raiz.document));
  }
})(typeof window !== 'undefined' ? window : globalThis);
