# Sintaxis de las fórmulas

Apoyo a la sintaxis de los temas 1 y 4 de los *Apuntes de Lógica*: conectiva principal, subfórmulas y convenciones de precedencia (§1.1.1); alcance, ocurrencias libres y ligadas, sentencias y sustitución (§4.2).

## Explorar una fórmula

Para una fórmula proposicional o de primer orden, la aplicación muestra:
- **Su estructura (§1.1.1):** la conectiva principal (o el cuantificador) y sus subfórmulas inmediatas.
- **Dos escrituras:**
  - con todos los paréntesis, como en la definición inductiva: `((p ∧ q) → r)`;
  - con las convenciones de precedencia del libro: `p ∧ q → r`.
- **El árbol de formación**, con la conectiva principal de cada nodo resaltada, y la lista de subfórmulas.
- **En primer orden:**
  - las apariciones libres (en rojo) y ligadas (en azul);
  - al pasar el ratón por un cuantificador, su alcance y las apariciones que liga;
  - si la fórmula es abierta o una sentencia (§4.2.2);
  - la sustitución de variables libres por constantes, que deja intactas las apariciones ligadas (§4.2.3). Con una variable libre se escribe A(c); con varias se elige cuáles sustituir y se escribe A[a/x, b/y], la otra notación del libro, indicando si quedan variables libres.

## Practicar

Los ejercicios se generan al azar, en lógica proposicional (tema 1) o de primer orden (tema 4), y se lleva la cuenta de aciertos:
- **Conectiva principal.** Pulsar la conectiva principal en una fórmula escrita con las convenciones de precedencia. Si se falla, se dice de qué subfórmula es principal la conectiva pulsada.
- **¿Cómo se agrupa?** Elegir la lectura correcta entre varias, escritas con todos los paréntesis salvo el par exterior. Las incorrectas resultan de leer los mismos símbolos con convenciones equivocadas:
  - de izquierda a derecha;
  - con las precedencias invertidas;
  - con ∧ y ∨ al mismo nivel;
  - con la negación o el cuantificador abarcando todo lo que les sigue.
- **Subfórmulas.** Distinguir, entre trozos de la fórmula que son fórmulas por sí solos, los que son subfórmulas y los que no: en `¬p ∧ q → r`, `q → r` no lo es.
- **Variables libres y ligadas.** Marcar cada aparición y decir si la fórmula es una sentencia.
- **Sustitución.** Escribir A(c). Si el alumno sustituye también las apariciones ligadas, se le señala ese error concreto.

En todas las fórmulas, los paréntesis de agrupación llevan un color según su nivel de anidamiento (cuatro colores que se repiten), para ver qué paréntesis se cierra con cuál. Los que encierran argumentos, como en P(x, a), van en el color del texto.

Las fórmulas de primer orden generadas no tienen cuantificadores vacuos. Salvo en el ejercicio de libres y ligadas, tampoco vuelven a cuantificar una variable ya ligada.

## Sintaxis

Es la misma que en las demás aplicaciones:
- la del libro, o con el teclado (`~`, `&`, `|`, `->`, `<->`, `Ax`, `Ex`);
- también los predicados con los argumentos pegados, como en umsu.de/trees (`Pa`, `Rxy`);
- letras proposicionales p, q, r;
- constantes de la a a la r y variables de la s a la z.

El libro usa a veces `s` como constante (Sócrates). Aquí `s` es una variable, como en el resto de las aplicaciones.

## Ficheros

| Fichero | Contenido |
|---|---|
| `js/sintaxis.js` | Impresión en piezas (con las variables enlazadas a su cuantificador y el alcance de cada uno), conectiva principal, subfórmulas, árbol de formación, sustitución, otras lecturas de una fórmula, trozos y generación de ejercicios |
| `js/app.js` | Interfaz |
| `datos/ejemplos.js` | Ejemplos de «Explorar» (JSON) |
| `css/sintaxis.css` | Estilos propios (los del árbol, en `../comun/css/base.css`) |
| `../pruebas/sintaxis.js` | Pruebas automáticas con Node |

## Pruebas

`node pruebas/sintaxis.js [fórmulas al azar] [semilla]`. Comprueban:
- los ejemplos de §1.1.1 y §4.2.1–4.2.3;
- que la impresión por piezas coincide con la de `primerorden.js` en los tres modos;
- que releer una fórmula con las convenciones del libro devuelve la misma fórmula;
- que las lecturas equivocadas son distintas de la correcta y usan los mismos símbolos en el mismo orden;
- que los trozos se clasifican bien como subfórmulas o no;
- que se generan ejercicios de todos los tipos.
