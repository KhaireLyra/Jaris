/* Jaris: el oráculo (parte 5). Pantalla «Oráculo» (#/oraculo), oráculo del alfabeto (#/oraculo/alfabeto, paso 5b),
   oráculo de las tabas (#/oraculo/tabas) y sus 56 respuestas (#/oraculo/tabas/lista) (paso 5c). Los datos salen del capítulo 29 en cada montaje (contenido/oraculo.json).
   Accesibilidad: cada paso tiene su título h2 y el foco va a él; la respuesta va siempre en español; el verso en griego
   es opcional (casilla que se recuerda) y va marcado con lang="el"; la letra grande es solo visual (aria-hidden). */
'use strict';
(function () {
  let datos = null;
  async function cargar() {
    if (!datos) {
      const r = await fetch('contenido/oraculo.json');
      if (!r.ok) throw new Error('oraculo.json');
      datos = await r.json();
    }
    return datos;
  }
  function recuperar() { try { return JSON.parse(localStorage.getItem('jaris.oraculo')) || {}; } catch (e) { return {}; } }
  function guardar(v) { try { localStorage.setItem('jaris.oraculo', JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } }
  /* Un número al azar del 0 al n-1, igual de probable para todos (sin conexión). */
  function azar(n) {
    const a = new Uint32Array(1), limite = Math.floor(0x100000000 / n) * n;
    let x;
    do { crypto.getRandomValues(a); x = a[0]; } while (x >= limite);
    return x % n;
  }
  function enfocar(n) {
    n.setAttribute('tabindex', '-1');
    n.focus({ preventScroll: true });
    n.scrollIntoView({ block: 'start' });
  }
  function enlaceLibro(D, clave, texto, A) {
    const L = D.libro || {};
    if (!L.cap) return null;
    return A.el('a', { href: '#/leer/' + L.cap + (L[clave] ? '/' + encodeURIComponent(L[clave]) : ''), texto: texto });
  }
  function seccion(A, id, titulo) {
    const s = A.el('section', { 'aria-labelledby': id, class: 'orc-paso' });
    s.append(A.el('h2', { id: id, texto: titulo }));
    return s;
  }
  function consejos(D, A) {
    const s = seccion(A, 'orc-calma', 'Con calma');
    const ul = A.el('ul');
    (D.consejos || []).forEach(function (c) { ul.append(A.el('li', { texto: c })); });
    s.append(ul);
    const a = enlaceLibro(D, 'consejos', 'Leer los consejos en el libro', A);
    if (a) s.append(A.el('p', {}, a));
    return s;
  }

  /* «Cómo leer la respuesta»: frases del capítulo 29 (oraculo.json, «leer»). nivel: 'h2' o 'h3'. */
  function comoLeer(D, A, nivel) {
    const caja = A.el('div', { class: 'orc-leer' });
    caja.append(A.el(nivel, { texto: 'Cómo leer la respuesta' }),
      A.el('p', { texto: 'Léela despacio, como un consejo para pensar, no como una orden. Pregúntate qué te dice sobre tu pregunta y sobre ti; la decisión sigue siendo tuya.' }));
    const ul = A.el('ul');
    (D.leer || []).forEach(function (t) { ul.append(A.el('li', { texto: t })); });
    caja.append(ul);
    const a = enlaceLibro(D, '', 'Más sobre la adivinación en el capítulo 29 del libro', A);
    if (a) caja.append(A.el('p', {}, a));
    return caja;
  }

  /* ---------- #/oraculo: elegir oráculo ---------- */
  function inicio(D, A) {
    const nodo = A.el('div', { class: 'oraculo' });
    // «Tu pequeño Delfos» (idea de la autora, 3 de noviembre); en el menú sigue diciendo «Oráculo»
    nodo.append(A.el('h1', { texto: 'Tu pequeño Delfos' }),
      A.el('p', { class: 'orc-lema', texto: 'El oráculo de Delfos calló hace siglos, pero aquí puedes seguir preguntando a Apolo.' }));
    // Las ilustraciones de Apolo y de la Pitia, si ya están (las pone montar_aplicacion.py: libro.oraculoImagenes)
    const imgs = (A.libro && A.libro.oraculoImagenes) || [];
    if (imgs.length) {
      const fila = A.el('div', { class: 'orc-imagenes' });
      imgs.forEach(function (im) {
        fila.append(A.el('figure', { class: 'orc-figura' }, A.el('img', { src: im.src, alt: im.alt, width: im.ancho, height: im.alto, loading: 'lazy' }),
          im.pie ? A.el('figcaption', { texto: im.pie }) : null));
      });
      nodo.append(fila);
    }
    nodo.append(
      A.el('p', { texto: 'Dos oráculos antiguos, tal como se consultaban en las ciudades griegas de Asia Menor: el del alfabeto y el de las tabas. Vienen del capítulo 29 del libro. Una respuesta es un consejo para pensar, no un destino: la decisión sigue siendo tuya.' }));
    const s = seccion(A, 'orc-elegir', 'Elige un oráculo');
    s.append(A.el('p', { texto: 'Del alfabeto: sale una de las 24 letras griegas, cada una con un verso. De las tabas: se tiran cinco tabas (huesecillos), y cada tirada tiene la respuesta de un dios; hay 56.' }));
    s.append(A.el('ul', { class: 'botones' },
      A.el('li', {}, A.el('a', { class: 'boton', href: '#/oraculo/alfabeto', texto: 'Oráculo del alfabeto' })),
      A.el('li', {}, A.el('a', { class: 'boton secundario', href: '#/oraculo/tabas', texto: 'Oráculo de las tabas' }))));
    const sLeer = A.el('section', { class: 'orc-paso' }, comoLeer(D, A, 'h2'));
    nodo.append(s, sLeer, consejos(D, A));
    return { nodo: nodo, titulo: 'Tu pequeño Delfos' };
  }

  /* ---------- Tabas: ayudas ---------- */
  const NOMBRES = { 1: ['uno', 'unos'], 3: ['tres', 'treses'], 4: ['cuatro', 'cuatros'], 6: ['seis', 'seises'] };
  const CUANTOS = ['', 'un', 'dos', 'tres', 'cuatro', 'cinco'];
  /* [1,3,3,4,6] -> «un uno, dos treses, un cuatro y un seis» */
  function enPalabras(tirada) {
    const partes = [1, 3, 4, 6].map(function (v) {
      const n = tirada.filter(function (x) { return x === v; }).length;
      return n ? CUANTOS[n] + ' ' + NOMBRES[v][n > 1 ? 1 : 0] : null;
    }).filter(Boolean);
    return partes.length > 1 ? partes.slice(0, -1).join(', ') + ' y ' + partes[partes.length - 1] : partes[0];
  }
  /* Una taba de verdad: las caras de 3 y 4 salen mucho más que las de 1 y 6. */
  function tirarTaba(prob) {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    let x = a[0] / 0x100000000;
    for (const cara of ['1', '3', '4', '6']) { x -= prob[cara] || 0; if (x < 0) return Number(cara); }
    return 4;
  }
  function etiquetaDe(r) {
    if (r.etiqueta === 'compuesta') return 'Esta respuesta se perdió del todo en la piedra; la ha compuesto esta antología en el mismo estilo.';
    if (r.etiqueta === 'completada') return 'Texto antiguo, con partes rotas en la piedra que se han completado: lo completado va entre corchetes.';
    return 'Texto antiguo, traducido del griego.';
  }
  function tituloDe(r) { return 'Respuesta ' + r.n + ' (' + r.romano + '): ' + (r.dios || 'dios perdido'); }

  /* ---------- #/oraculo/tabas ---------- */
  function tabas(D, A) {
    const T = D.tabas, pref = recuperar();
    const nodo = A.el('div', { class: 'oraculo' });
    nodo.append(A.el('h1', { texto: 'Oráculo de las tabas' }),
      A.el('p', { texto: 'Se tiran cinco tabas (los huesecillos del tobillo de una oveja o una cabra) y cada tirada tiene la respuesta de un dios: hay 56. Estas respuestas se grababan en las plazas y junto a los templos de las ciudades de Asia Menor, y cualquiera podía consultarlas.' }));
    if (T.inscripcion) nodo.append(A.el('p', { texto: T.inscripcion }));

    // 1. Cómo empezar
    const s1 = seccion(A, 'orc-empezar', 'Cómo quieres empezar');
    const bRito = A.el('button', { type: 'button', texto: 'Empezar con un rito breve' });
    const bDirecto = A.el('button', { type: 'button', class: 'secundario', texto: 'Ir directo a la pregunta' });
    s1.append(A.el('p', { texto: 'Puedes empezar con un rito breve, como se hacía antes de consultar, o ir directamente a la pregunta.' }),
      A.el('div', { class: 'apr-botones' }, bRito, bDirecto));

    // 2. Rito breve (los tres primeros pasos del libro)
    const sR = seccion(A, 'orc-rito', 'Rito breve');
    sR.hidden = true;
    const pasos = T.pasos || [];
    const ol = A.el('ol', { class: 'orc-pasos' });
    const caja = A.el('div', { class: 'orc-oracion' });
    if (pasos[0]) ol.append(A.el('li', { texto: pasos[0] }));
    if (pasos[1]) ol.append(A.el('li', {}, A.el('p', { texto: pasos[1] }), caja));
    if (pasos[2]) ol.append(A.el('li', { texto: pasos[2] }));
    const bListo = A.el('button', { type: 'button', texto: 'Ya estoy: ir a la pregunta' });
    sR.append(ol, A.el('div', { class: 'apr-botones' }, bListo));
    oracion(D, A, caja);

    // 3. La pregunta y la tirada
    const sP = seccion(A, 'orc-pregunta', 'Tu pregunta');
    sP.hidden = true;
    const campo = A.el('input', { type: 'text', id: 'orc-texto', autocomplete: 'off', 'aria-describedby': 'orc-texto-ayuda' });
    sP.append(A.el('p', { texto: 'Piensa una sola pregunta, concreta. Si quieres, escríbela para tenerla delante: no se guarda en ningún sitio.' }),
      A.el('label', { for: 'orc-texto', texto: 'Tu pregunta (opcional)' }), campo,
      A.el('p', { id: 'orc-texto-ayuda', class: 'orc-ayuda', texto: 'Se borra al salir de esta pantalla.' }));
    const fs = A.el('fieldset', { class: 'orc-formas' }, A.el('legend', { texto: 'Cómo tirar las tabas' }));
    const radios = {};
    [['jaris', 'Que Jaris tire las cinco tabas (como tabas de verdad: los 3 y los 4 salen mucho más que los 1 y los 6)'],
     ['mias', 'He tirado mis tabas (o un dado): escribo lo que ha salido en cada una']].forEach(function (f) {
      const r = A.el('input', { type: 'radio', name: 'orc-tirar', id: 'orc-tirar-' + f[0], value: f[0] });
      if ((pref.tirar || 'jaris') === f[0]) r.checked = true;
      radios[f[0]] = r;
      fs.append(A.el('div', { class: 'apr-voz' }, r, A.el('label', { for: 'orc-tirar-' + f[0], texto: f[1] })));
    });
    const cajaMias = A.el('fieldset', { class: 'orc-formas orc-mias', 'aria-describedby': 'orc-caras' },
      A.el('legend', { texto: 'Lo que ha salido en cada taba' }));
    (T.caras || []).forEach(function (c, i) { cajaMias.append(A.el('p', { class: 'orc-ayuda', id: i ? null : 'orc-caras', texto: c })); });
    const selects = [];
    for (let i = 1; i <= 5; i++) {
      const s = A.el('select', { id: 'orc-taba-' + i, 'aria-describedby': 'orc-error' },
        A.el('option', { value: '', texto: 'Elige' }), A.el('option', { value: '1', texto: '1 (cara estrecha y plana)' }),
        A.el('option', { value: '3', texto: '3 (cara ancha y cóncava)' }), A.el('option', { value: '4', texto: '4 (cara ancha y convexa)' }),
        A.el('option', { value: '6', texto: '6 (cara estrecha y sinuosa)' }));
      selects.push(s);
      cajaMias.append(A.el('div', { class: 'orc-taba' }, A.el('label', { for: 'orc-taba-' + i, texto: 'Taba ' + i }), s));
    }
    const error = A.el('p', { id: 'orc-error', class: 'apr-ayuda' });
    const bTirar = A.el('button', { type: 'button' });
    sP.append(fs, cajaMias, error, A.el('div', { class: 'apr-botones' }, bTirar));
    function forma() { return radios.mias.checked ? 'mias' : 'jaris'; }
    function ponerForma() {
      cajaMias.hidden = forma() === 'jaris';
      bTirar.textContent = forma() === 'jaris' ? 'Tirar las tabas' : 'Ver la respuesta';
      error.textContent = '';
      selects.forEach(function (s) { s.removeAttribute('aria-invalid'); });
      pref.tirar = forma(); guardar(pref);
    }
    Object.values(radios).forEach(function (r) { r.addEventListener('change', ponerForma); });
    ponerForma();

    // 4. La respuesta
    const sA = seccion(A, 'orc-respuesta', 'La respuesta');
    sA.hidden = true;
    const cuerpo = A.el('div', { class: 'orc-cuerpo' });
    const bOtra = A.el('button', { type: 'button', class: 'secundario', texto: 'Empezar de nuevo' });
    const enLibro = enlaceLibro(D, 'respuestas', 'Las 56 respuestas, en el libro', A);
    sA.append(cuerpo,
      A.el('p', { texto: 'Piensa en cómo se aplica a tu pregunta. Es un consejo, no una orden: la decisión es tuya.' }),
      comoLeer(D, A, 'h3'),
      A.el('p', { texto: 'Para terminar, da las gracias a Apolo y a Hermes, con tus palabras o en silencio.' }),
      A.el('p', { class: 'orc-ayuda', texto: 'Si quieres consultar otra cosa, que sea otra pregunta: el libro aconseja no repetir la misma hasta que salga lo que se quiere.' }),
      A.el('div', { class: 'apr-botones' }, bOtra),
      A.el('ul', {}, A.el('li', {}, A.el('a', { href: '#/oraculo/tabas/lista', texto: 'Ver las 56 respuestas' })),
        enLibro ? A.el('li', {}, enLibro) : null, A.el('li', {}, A.el('a', { href: '#/oraculo', texto: 'Volver al oráculo' }))));

    function mostrar(tirada, caidas) {
      const orden = tirada.slice().sort(function (a, b) { return a - b; });
      const r = (T.respuestas || []).find(function (x) { return x.tirada.join('-') === orden.join('-'); });
      if (!r) { A.avisar('No encuentro la respuesta de esa tirada.'); return; }
      sA.querySelector('h2').textContent = tituloDe(r);
      cuerpo.replaceChildren();
      const pregunta = campo.value.trim();
      if (pregunta) cuerpo.append(A.el('p', { texto: 'Tu pregunta: «' + pregunta + '»' }));
      if (caidas) cuerpo.append(A.el('p', { texto: 'Han caído las tabas: ' + caidas.join(', ') + '.' }));
      const suma = orden.reduce(function (a, b) { return a + b; }, 0);
      cuerpo.append(A.el('p', { texto: 'Tirada: ' + enPalabras(orden) + ' (suma ' + suma + ').' }),
        A.el('p', { class: 'orc-tirada', 'aria-hidden': 'true', texto: orden.join(' · ') }),
        A.el('p', { texto: r.dios ? 'Responde: ' + r.dios + '.' : 'El nombre del dios se ha perdido en la piedra; se puede entender que responde Apolo, el señor de todo el oráculo.' }),
        A.el('p', { class: 'orc-verso', texto: '«' + r.texto + '»' }),
        A.el('p', { class: 'orc-nota', texto: etiquetaDe(r) }));
      sP.hidden = true; sA.hidden = false;
      enfocar(sA.querySelector('h2'));
    }
    function tirar() {
      if (forma() === 'jaris') {
        const caidas = [0, 0, 0, 0, 0].map(function () { return tirarTaba(T.probabilidades || { 1: 0.1, 3: 0.4, 4: 0.4, 6: 0.1 }); });
        return mostrar(caidas, caidas);
      }
      const vacia = selects.find(function (s) { return !s.value; });
      if (vacia) {
        const t = 'Falta elegir lo que ha salido en la ' + vacia.labels[0].textContent.toLowerCase() + '.';
        error.textContent = t; vacia.setAttribute('aria-invalid', 'true'); A.avisar(t); vacia.focus();
        return;
      }
      selects.forEach(function (s) { s.removeAttribute('aria-invalid'); });
      error.textContent = '';
      mostrar(selects.map(function (s) { return Number(s.value); }), null);
    }

    bRito.addEventListener('click', function () { s1.hidden = true; sR.hidden = false; enfocar(sR.querySelector('h2')); });
    bDirecto.addEventListener('click', function () { s1.hidden = true; sP.hidden = false; enfocar(sP.querySelector('h2')); });
    bListo.addEventListener('click', function () { sR.hidden = true; sP.hidden = false; enfocar(sP.querySelector('h2')); });
    bTirar.addEventListener('click', tirar);
    bOtra.addEventListener('click', function () {
      campo.value = ''; error.textContent = '';
      selects.forEach(function (s) { s.value = ''; s.removeAttribute('aria-invalid'); });
      sA.hidden = true; sR.hidden = true; sP.hidden = true; s1.hidden = false;
      enfocar(s1.querySelector('h2'));
    });
    nodo.append(s1, sR, sP, sA);
    if (T.sabias) {
      const s = seccion(A, 'orc-sabias', '¿Sabías que...?');
      s.append(A.el('p', { texto: T.sabias.replace(/^¿Sabías que\.\.\.\?\s*/, '') }));
      nodo.append(s);
    }
    nodo.append(consejos(D, A));
    return { nodo: nodo, titulo: 'Oráculo de las tabas' };
  }

  /* ---------- #/oraculo/tabas/lista: las 56 respuestas ---------- */
  function lista(D, A) {
    const T = D.tabas;
    const nodo = A.el('div', { class: 'oraculo' });
    nodo.append(A.el('h1', { texto: 'Las 56 respuestas de las tabas' }),
      A.el('p', { texto: 'Ordenadas como en el libro, por la suma de la tirada. Cada respuesta tiene su título, para ir de una a otra con los títulos del lector de pantalla.' }),
      A.el('p', {}, A.el('a', { href: '#/oraculo/tabas', texto: 'Consultar el oráculo de las tabas' })));
    (T.respuestas || []).forEach(function (r) {
      const s = A.el('section', { class: 'orc-respuesta-lista', 'aria-labelledby': 'orc-r' + r.n });
      s.append(A.el('h2', { id: 'orc-r' + r.n, texto: tituloDe(r) }),
        A.el('p', { texto: 'Tirada: ' + enPalabras(r.tirada) + ' (suma ' + r.suma + ').' }),
        A.el('p', { class: 'orc-verso', texto: '«' + r.texto + '»' }),
        A.el('p', { class: 'orc-nota', texto: etiquetaDe(r) }));
      nodo.append(s);
    });
    if (T.fuente) nodo.append(A.el('p', { class: 'orc-nota', texto: T.fuente }));
    return { nodo: nodo, titulo: 'Las 56 respuestas de las tabas' };
  }

  /* La oración «Antes de consultar un oráculo», sacada del capítulo 6 (si cambia el libro, cambia sola). */
  async function oracion(D, A, caja) {
    const o = D.libro && D.libro.oracion;
    if (!o) return;
    try {
      const doc = new DOMParser().parseFromString(await A.capitulo(o.cap), 'text/html');
      const sec = doc.getElementById(o.ancla);
      if (!sec) return;
      const ps = Array.from(sec.querySelectorAll('p')).filter(function (p) { return p.closest('section') === sec; });
      if (!ps.length) return;
      caja.replaceChildren(A.el('p', { class: 'orc-etiqueta', texto: 'O con la oración del libro, «' + o.t + '»:' }));
      ps.forEach(function (p) { caja.append(document.importNode(p, true)); });
      caja.append(A.el('p', {}, A.el('a', { href: '#/leer/' + o.cap + '/' + encodeURIComponent(o.ancla), texto: 'Ver la oración en el libro' })));
    } catch (e) { /* sin la oración: queda la invocación corta */ }
  }

  /* ---------- #/oraculo/alfabeto ---------- */
  function alfabeto(D, A) {
    const AL = D.alfabeto, pref = recuperar();
    if (pref.griego === undefined) pref.griego = true;
    const nodo = A.el('div', { class: 'oraculo' });
    nodo.append(A.el('h1', { texto: 'Oráculo del alfabeto' }),
      A.el('p', { texto: 'Sale una de las 24 letras griegas, y cada letra trae un verso con un consejo. Es un oráculo antiguo: sus versos se grabaron en piedra en ciudades de Licia y Pisidia, en el sur de la actual Turquía. La respuesta va siempre en español; el verso original en griego se puede mostrar u ocultar.' }));

    // 1. Cómo empezar
    const s1 = seccion(A, 'orc-empezar', 'Cómo quieres empezar');
    const bRito = A.el('button', { type: 'button', texto: 'Empezar con un rito breve' });
    const bDirecto = A.el('button', { type: 'button', class: 'secundario', texto: 'Ir directo a la pregunta' });
    s1.append(A.el('p', { texto: 'Puedes empezar con un rito breve, como se hacía antes de consultar, o ir directamente a la pregunta.' }),
      A.el('div', { class: 'apr-botones' }, bRito, bDirecto));

    // 2. Rito breve (los tres primeros pasos del libro)
    const sR = seccion(A, 'orc-rito', 'Rito breve');
    sR.hidden = true;
    const pasos = AL.pasos || [];
    const ol = A.el('ol', { class: 'orc-pasos' });
    if (pasos[0]) ol.append(A.el('li', { texto: pasos[0] }));
    const caja = A.el('div', { class: 'orc-oracion' });
    if (AL.invocacion) caja.append(A.el('p', { class: 'orc-etiqueta', texto: 'Una invocación antigua:' }), A.el('p', { texto: '«' + AL.invocacion + '»' }));
    if (pasos[1]) ol.append(A.el('li', {}, A.el('p', { texto: pasos[1] }), caja));
    if (pasos[2]) ol.append(A.el('li', { texto: pasos[2] }));
    const bListo = A.el('button', { type: 'button', texto: 'Ya estoy: ir a la pregunta' });
    sR.append(ol, A.el('div', { class: 'apr-botones' }, bListo));
    oracion(D, A, caja);

    // 3. La pregunta y cómo sacar la letra
    const sP = seccion(A, 'orc-pregunta', 'Tu pregunta');
    sP.hidden = true;
    const campo = A.el('input', { type: 'text', id: 'orc-texto', autocomplete: 'off', 'aria-describedby': 'orc-texto-ayuda' });
    sP.append(A.el('p', { texto: 'Piensa una sola pregunta, concreta. Si quieres, escríbela para tenerla delante: no se guarda en ningún sitio.' }),
      A.el('label', { for: 'orc-texto', texto: 'Tu pregunta (opcional)' }), campo,
      A.el('p', { id: 'orc-texto-ayuda', class: 'orc-ayuda', texto: 'Se borra al salir de esta pantalla.' }));
    const formas = [['jaris', 'Que la saque Jaris al azar (como sacar una ficha de una bolsa con las 24 letras)'],
                    ['dados', 'Con mis cinco dados: escribo la suma'], ['tabas', 'Con mis cinco tabas: escribo la suma']];
    const fs = A.el('fieldset', { class: 'orc-formas' }, A.el('legend', { texto: 'Cómo sacar la letra' }));
    const radios = {};
    formas.forEach(function (f) {
      const r = A.el('input', { type: 'radio', name: 'orc-forma', id: 'orc-forma-' + f[0], value: f[0] });
      if ((pref.forma || 'jaris') === f[0]) r.checked = true;
      radios[f[0]] = r;
      fs.append(A.el('div', { class: 'apr-voz' }, r, A.el('label', { for: 'orc-forma-' + f[0], texto: f[1] })));
    });
    const suma = A.el('input', { type: 'number', id: 'orc-suma', inputmode: 'numeric', min: '5', max: '30', step: '1', 'aria-describedby': 'orc-suma-ayuda orc-error' });
    const etiquetaSuma = A.el('label', { for: 'orc-suma' });
    const ayudaSuma = A.el('p', { id: 'orc-suma-ayuda', class: 'orc-ayuda' });
    const cajaSuma = A.el('div', { class: 'orc-suma' }, etiquetaSuma, suma, ayudaSuma);
    const error = A.el('p', { id: 'orc-error', class: 'apr-ayuda' });
    const bVer = A.el('button', { type: 'button', texto: 'Ver la respuesta' });
    sP.append(fs, cajaSuma, error, A.el('div', { class: 'apr-botones' }, bVer));
    function forma() { return Object.keys(radios).find(function (k) { return radios[k].checked; }) || 'jaris'; }
    function ponerForma() {
      const f = forma();
      cajaSuma.hidden = f === 'jaris';
      etiquetaSuma.textContent = f === 'dados' ? 'Suma de los cinco dados' : 'Suma de las cinco tabas';
      ayudaSuma.textContent = f === 'dados'
        ? 'Tira los cinco dados y suma los puntos de todos. Va de 5 a 30.'
        : 'Cada taba vale 1, 3, 4 o 6, según la cara en la que quede. Suma las cinco. Va de 5 a 30 (nunca sale 6 ni 29).';
      error.textContent = ''; suma.removeAttribute('aria-invalid');
      pref.forma = f; guardar(pref);
    }
    Object.values(radios).forEach(function (r) { r.addEventListener('change', ponerForma); });
    ponerForma();

    // 4. La respuesta
    const sA = seccion(A, 'orc-respuesta', 'La respuesta');
    sA.hidden = true;
    const cuerpo = A.el('div', { class: 'orc-cuerpo' });
    const cajaGriego = A.el('div', { class: 'orc-griego' });
    const casilla = A.el('input', { type: 'checkbox', id: 'orc-ver-griego' });
    casilla.checked = pref.griego;
    casilla.addEventListener('change', function () {
      pref.griego = casilla.checked; guardar(pref);
      cajaGriego.hidden = !casilla.checked;
      A.avisar(casilla.checked ? 'Se muestra el verso en griego.' : 'Verso en griego oculto.');
    });
    const bOtra = A.el('button', { type: 'button', class: 'secundario', texto: 'Empezar de nuevo' });
    const enLibro = enlaceLibro(D, 'versos', 'Los 24 versos, en el libro', A);
    sA.append(cuerpo, cajaGriego,
      A.el('div', { class: 'apr-voz' }, casilla, A.el('label', { for: 'orc-ver-griego', texto: 'Mostrar también el verso original en griego' })),
      A.el('p', { texto: (pasos[4] || 'Piensa en cómo se aplica a tu pregunta.') + ' Es un consejo, no una orden: la decisión es tuya.' }),
      comoLeer(D, A, 'h3'),
      A.el('p', { texto: 'Para terminar, da las gracias a Apolo y a Hermes, con tus palabras o en silencio.' }),
      A.el('p', { class: 'orc-ayuda', texto: 'Si quieres consultar otra cosa, que sea otra pregunta: el libro aconseja no repetir la misma hasta que salga lo que se quiere.' }),
      A.el('div', { class: 'apr-botones' }, bOtra),
      A.el('ul', {}, enLibro ? A.el('li', {}, enLibro) : null, A.el('li', {}, A.el('a', { href: '#/oraculo', texto: 'Volver al oráculo' }))));

    function mostrar(letra, como) {
      sA.querySelector('h2').textContent = 'La respuesta: ' + letra.nombre;
      cuerpo.replaceChildren();
      const pregunta = campo.value.trim();
      if (pregunta) cuerpo.append(A.el('p', { texto: 'Tu pregunta: «' + pregunta + '»' }));
      cuerpo.append(A.el('p', { texto: como }),
        A.el('p', { class: 'orc-letra', 'aria-hidden': 'true', lang: 'el', texto: letra.letra }),
        A.el('p', { class: 'orc-verso', texto: '«' + letra.texto + '»' }));
      if (letra.nota) cuerpo.append(A.el('p', { class: 'orc-nota', texto: 'Nota: ' + letra.nota }));
      cajaGriego.replaceChildren(A.el('p', { class: 'orc-etiqueta', texto: 'Verso original en griego:' }),
        A.el('p', { lang: 'el', class: 'orc-verso-griego', texto: letra.griego }));
      cajaGriego.hidden = !casilla.checked;
      sP.hidden = true; sA.hidden = false;
      enfocar(sA.querySelector('h2'));
    }
    function fallo(texto) {
      error.textContent = texto;
      suma.setAttribute('aria-invalid', 'true');
      A.avisar(texto);
      suma.focus();
    }
    function verRespuesta() {
      const f = forma(), L = AL.letras;
      if (!L.length) { A.avisar('No se han podido cargar las letras del oráculo.'); return; }
      if (f === 'jaris') {
        const l = L[azar(L.length)];
        return mostrar(l, 'Jaris ha sacado la letra ' + l.nombre + ' (la ' + l.numero + ' de 24).');
      }
      const s = parseInt(suma.value, 10);
      const quien = f === 'dados' ? 'dados' : 'tabas';
      if (isNaN(s)) return fallo('Escribe la suma de tus ' + quien + ' con números.');
      if (f === 'dados' && (AL.repetirDados || []).indexOf(s) >= 0) {
        return fallo('La suma ' + s + ' era de una letra antigua que no tiene verso en este oráculo. Vuelve a tirar los dados y escribe la suma nueva.');
      }
      const l = L.find(function (x) { return (f === 'dados' ? x.dados : x.tabas) === s; });
      if (!l) {
        if (f === 'tabas' && (s === 6 || s === 29)) return fallo('Con cinco tabas no puede salir ' + s + ', porque las caras valen 1, 3, 4 y 6. Revisa la cuenta.');
        return fallo('Con cinco ' + quien + ' la suma va de 5 a 30. Revisa la cuenta.');
      }
      error.textContent = ''; suma.removeAttribute('aria-invalid');
      mostrar(l, 'Tus ' + quien + ' suman ' + s + ': la letra ' + l.nombre + '.');
    }

    bRito.addEventListener('click', function () { s1.hidden = true; sR.hidden = false; enfocar(sR.querySelector('h2')); });
    bDirecto.addEventListener('click', function () { s1.hidden = true; sP.hidden = false; enfocar(sP.querySelector('h2')); });
    bListo.addEventListener('click', function () { sR.hidden = true; sP.hidden = false; enfocar(sP.querySelector('h2')); });
    bVer.addEventListener('click', verRespuesta);
    suma.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); verRespuesta(); } });
    bOtra.addEventListener('click', function () {
      campo.value = ''; suma.value = ''; error.textContent = '';
      sA.hidden = true; sR.hidden = true; sP.hidden = true; s1.hidden = false;
      enfocar(s1.querySelector('h2'));
    });
    nodo.append(s1, sR, sP, sA, consejos(D, A));
    return { nodo: nodo, titulo: 'Oráculo del alfabeto' };
  }

  window.JarisOraculo = {
    pantalla: async function (partes, A) {
      let D;
      try { D = await cargar(); } catch (e) {
        return { nodo: A.el('div', {}, A.el('h1', { texto: 'Oráculo' }), A.el('p', { texto: 'No se ha podido abrir el oráculo. Prueba a cerrar y abrir Jaris.' })), titulo: 'Oráculo' };
      }
      if (partes[1] === 'alfabeto') return alfabeto(D, A);
      if (partes[1] === 'tabas') return partes[2] === 'lista' ? lista(D, A) : tabas(D, A);
      return inicio(D, A);
    }
  };
})();
