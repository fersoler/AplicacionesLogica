# Deducción natural

Asistente para construir derivaciones de deducción natural en el estilo de Fitch, con las reglas de los *Apuntes de Lógica* (temas 1 y 4) y sus ejercicios. Cada línea se comprueba mientras se escribe.

## Ejercicios

La lista trae los ejercicios de deducción natural del libro, agrupados por temas y niveles, sin soluciones.
- **Cuáles.** Son 54: los 58 del libro menos los cuatro de análisis de falacias (4.21–4.24), en los que no se pide una derivación.
- **Qué muestra cada uno:**
  - su número y su título;
  - su enunciado, si lo tiene;
  - la pista del libro, oculta hasta que se pide;
  - en los ejercicios con plantilla guiada (1.7 y 1.13), un botón que la carga con las justificaciones por completar.
- **Restricciones.** En los ejercicios que piden solo reglas básicas (1.15, 1.22, 4.16 y 4.17), la casilla «Solo reglas básicas» se marca sola. En 1.18 y 1.23, que piden derivar leyes de De Morgan, no se admite DeM y su botón no aparece.
  - Las restricciones de 4.16 y 4.17 están en su enunciado. Las del tema 1 están en las instrucciones de sus ejercicios, y el extractor las lee de ahí ("en los ejercicios \ref{…} … usa solo reglas básicas / no uses DeM").
  - El aviso se añade al enunciado, por ejemplo «Según las instrucciones del tema, no uses DeM».
- **Progreso.** Los ejercicios terminados se marcan con ✓ en la lista, y al terminar uno aparece «Siguiente ejercicio».
- **Otro argumento.** También se puede probar cualquier argumento propio. Si coincide con un ejercicio, se enlaza con él.

Los ejercicios están en `datos/ejercicios.js`, generado a partir del fuente del libro con `node herramientas/ejercicios.js`. El extractor toma:
- los números del `.aux`;
- las referencias como «sección 4.8»;
- los niveles, los enunciados, las pistas y las plantillas.

## La prueba

- **Líneas.** Cada línea tiene número, barras de caja como en el libro (continuas, también junto a los mensajes de error), la fórmula y su justificación. En pantallas anchas las líneas van algo más juntas.
  - Las justificaciones se escriben con la regla y las líneas que cita (`→E 1, 2`); las cajas se citan de la hipótesis a su última línea (`∃E 1, 3-6`). Se entienden también `&E`, `|I`, `->E`, `~E`, `AE`, `EI`…
  - Las hipótesis pueden llevar «Hip. IP» o «Hip. testigo c»; si se declara el testigo, se comprueba que sea la constante sustituida.
- **Fórmulas.** Se escriben con los símbolos del libro o en ASCII, y los predicados con paréntesis, `R(x, b)`, o pegados, `Rxb`. Al salir de cada campo se reescriben con la notación del libro.
- **Edición.** Debajo de la prueba hay una barra fija con tres botones: «Nueva línea» (Intro), «Abrir caja» (Ctrl+Intro) y «Cerrar caja» (Mayús+Intro). Sobre una línea vacía, abrir o cerrar la caja transforma esa línea.
- **Paleta.** Cambia según el campo: símbolos en la fórmula, reglas en la justificación, etiquetas en las hipótesis.
- **Línea activa.** Sus botones ⇤, ⇥ y ✕ la sacan de su caja, la meten en la caja de la línea anterior o la borran. ↑ y ↓ cambian de línea; Retroceso en una línea vacía la borra.
- **Renumeración.** Al insertar o borrar líneas, las citas se renumeran solas.
- **Comprobación.** Cada línea muestra ✓ o ✗ con el motivo, y abajo se indica si la prueba está completa.
- **Solo reglas básicas.** Esta casilla rechaza MT, DS, DNE, LEM, DeM y CQ, y quita sus botones de la paleta.
- **Guardado.** La prueba se guarda en el navegador, para cada argumento, y en la dirección de la página.
  - Se usa el almacenamiento local del navegador (claves `deduccion:…`), no cookies; nada se envía a ningún sitio. Es lo único que guardan las aplicaciones: las demás solo usan la dirección.
  - La ayuda desplegable lo explica y tiene un botón discreto, «Borrar lo guardado», que pide confirmación y borra las pruebas y las marcas ✓, sin tocar la prueba en pantalla.
- **Exportación:**
  - a LaTeX, con el paquete `fitch` y las macros del libro. Al exportar se muestra el preámbulo necesario: el paquete con `rules=myrules,justformat=myjust` y las definiciones de `\myjust` y `\myrules`. Con él compilan las 43 derivaciones del libro exportadas.
  - a texto, con las barras y una raya bajo las premisas y bajo cada hipótesis.

## Reglas

Son las del verificador común (`../comun/js/verificador.js`):
- **Básicas:** R, ∧I, ∧E, ∨I, ∨E, →I, →E, ¬I, ¬E, X, IP, ↔I, ↔E, ∀E, ∀I, ∃I, ∃E, =I, =E.
- **Derivadas:** MT, DS, DNE, LEM, DeM, CQ.

Las restricciones de ∀I y ∃E y el orden de las citas son los del apéndice C. Todas las líneas tienen que ser sentencias (§4.2.2).

## Ficheros

| Fichero | Contenido |
|---|---|
| `datos/ejercicios.js` | Ejercicios del libro (JSON, generado) |
| `js/editor.js` | Núcleo, sin interfaz: lectura de justificaciones y de hipótesis, comprobación de una prueba en curso, inserción y borrado con renumeración, exportación a LaTeX y a texto, preámbulo, codificación del estado |
| `js/app.js` | Interfaz |
| `css/deduccion.css` | Estilos propios |
| `../pruebas/deduccion.js` | Pruebas del núcleo y de los ejercicios |

## Pruebas

`node pruebas/deduccion.js` comprueba:
- la lectura de justificaciones;
- los mensajes de una prueba en curso;
- la renumeración y la codificación;
- la notación pegada.

Pasa además por el editor las 43 derivaciones completas del libro: todas salen completas y se exportan a LaTeX sin pérdida. En cuanto a los 54 ejercicios, comprueba que se entienden todos y que las plantillas no tienen más errores que las justificaciones por completar.

## Pendiente

- **Fase 4:** «¿Es válido?», con contramodelo, y pistas de estrategia (§1.5 y §4.9).
- **Decisión del autor:** no se mostrarán soluciones ni se generarán pruebas automáticamente.
