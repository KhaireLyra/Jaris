/* Jaris: aprender de memoria (paso 4c). Ruta: #/aprender/CAPÍTULO/ANCLA (un himno o una oración).
   Cuatro formas, con un botón cada una:
   - Verso a verso: un verso cada vez (el lector lo dice solo al pasar), ocultarlo para decirlo de memoria.
   - Completar palabras: falta una palabra en cada verso; pistas (la inicial y cuántas letras; luego la mitad).
   - Primeras letras: cada verso solo con la primera letra de cada palabra, y botón para ver el verso.
   - Preguntas guía: cómo empieza, qué viene después de..., cómo termina; la respuesta se abre con un botón.
   Opcional: leer cada verso con la voz del dispositivo (sin internet). Se recuerda por dónde se iba (solo en el dispositivo).
   Los versos salen del propio capítulo: si el libro cambia, esto cambia solo. */
'use strict';
(function () {
  let A = null;
  const CLAVE = 'jaris.aprender';
  const leerEstado = function () { try { return JSON.parse(localStorage.getItem(CLAVE)) || {}; } catch (e) { return {}; } };
  const guardarEstado = function (e) { try { localStorage.setItem(CLAVE, JSON.stringify(e)); } catch (x) { /* nada */ } };
  const plano = function (s) { return (s || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/ς/g, 'σ').replace(/[^\p{L}\p{N}]+/gu, ''); };
  const griego = function (s) { return /[Ͱ-Ͽἀ-῿]/.test(s); };

  /* Los versos de un apartado: sus párrafos, sin la línea de la ofrenda, sin [5] ni números de verso, sin notas entre paréntesis. */
  async function versos(cap, ancla) {
    const p = document.createElement('template');
    p.innerHTML = await A.capitulo(cap);
    const sec = p.content.getElementById(ancla);
    if (!sec) return null;
    const h = sec.querySelector('h1, h2, h3, h4, h5, h6');
    const lista = [];
    for (const n of Array.from(sec.children)) {
      if (n.tagName !== 'P') { if (n.tagName === 'SECTION') break; continue; }
      const c = n.cloneNode(true);
      c.querySelectorAll('[aria-hidden="true"]').forEach(function (x) { x.remove(); });
      const t = c.textContent.replace(/^\s*\[\d+\]\s*/, '').replace(/\s+/g, ' ').trim();
      if (!t || /^ofrenda aromática/i.test(t) || /^\(.*\)$/.test(t) || /^(se dice|para la voz griega|significa|uso):/i.test(t)) continue;
      lista.push(t);
    }
    return { titulo: h ? h.textContent.replace(/\s+/g, ' ').trim() : ancla, versos: lista };
  }

  /* La palabra que se oculta en cada verso: una de cuatro letras o más, distinta según el verso. */
  function palabras(v) { return v.split(' '); }
  function elegida(v, i) {
    const ws = palabras(v);
    const buenas = ws.map(function (w, k) { return [plano(w).length, k]; }).filter(function (x) { return x[0] >= 4; });
    const lista = buenas.length ? buenas : ws.map(function (w, k) { return [plano(w).length, k]; }).filter(function (x) { return x[0] > 0; });
    return lista.length ? lista[(i * 7 + 3) % lista.length][1] : -1;
  }
  function soloPalabra(w) { return w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''); }
  function iniciales(v) {
    return palabras(v).map(function (w) {
      const m = w.match(/^([^\p{L}\p{N}]*)([\p{L}\p{N}])[\p{L}\p{N}\p{M}'’ʼ-]*(.*)$/u);
      return m ? m[1] + m[2] + m[3] : w;
    }).join(' ');
  }

  /* Voz del dispositivo (opcional; funciona sin internet con las voces instaladas) */
  function decir(t) {
    if (!leerEstado().voz || !('speechSynthesis' in window)) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(t);
      u.lang = griego(t) ? 'el-GR' : 'es-ES';
      speechSynthesis.speak(u);
    } catch (e) { /* sin voz */ }
  }
  /* Región para lo que tiene que decir el lector al pulsar (el foco se queda en el botón). */
  function anunciar(region, t) { region.textContent = ''; setTimeout(function () { region.textContent = t; }, 60); }

  const MODOS = [['verso', 'Verso a verso'], ['completar', 'Completar palabras'], ['letras', 'Primeras letras'], ['preguntas', 'Preguntas guía']];

  async function pantalla(partes, ayudas) {
    A = ayudas;
    const cap = partes[1], ancla = partes.slice(2).join('/');
    const caja = A.el('div', { class: 'aprender' });
    let datos = null;
    try { datos = await versos(cap, ancla); } catch (e) { datos = null; }
    if (!datos || !datos.versos.length) {
      caja.append(A.el('h1', { texto: 'Aprender de memoria' }), A.el('p', { texto: 'No se ha encontrado este texto. Puede que haya cambiado en una edición nueva.' }),
        A.el('p', {}, A.el('a', { href: '#/favoritos' }, 'Ir a Favoritos')));
      return { nodo: caja, titulo: 'Aprender de memoria' };
    }
    const id = cap + '/' + ancla, V = datos.versos;
    /* El título completo, como en los índices del libro («Himno órfico 32. A Atenea»), si está */
    const enLista = A.libro ? A.libro.himnos.concat(A.libro.oraciones).find(function (x) { return x.cap === cap && x.a === ancla; }) : null;
    if (enLista) datos.titulo = enLista.t;
    const est = leerEstado();
    const mio = est[id] || (est[id] = { modo: 'verso', verso: 0 });
    const guardar = function () { const e = leerEstado(); e[id] = mio; e.voz = !!vozCasilla.checked; guardarEstado(e); };

    caja.append(A.el('h1', {}, 'Aprender de memoria', A.el('span', { class: 'subtitulo', texto: ': ' + datos.titulo })),
      A.el('p', { texto: V.length + (V.length === 1 ? ' verso' : ' versos') + '. Elige una forma de practicar; se recuerda por dónde ibas.' }));
    const enlaces = A.el('p', {}, A.el('a', { href: '#/leer/' + cap + '/' + ancla }, 'Abrir «' + datos.titulo + '» en el libro'));
    caja.append(enlaces);
    if (window.JarisAudios) { try { const b = await window.JarisAudios.botonesPara(cap, ancla); if (b) caja.append(b); } catch (e) { /* nada */ } }

    const vozCasilla = A.el('input', { type: 'checkbox', id: 'apr-voz' });
    vozCasilla.checked = !!est.voz;
    vozCasilla.addEventListener('change', function () { guardar(); A.avisar(vozCasilla.checked ? 'Se leerá cada verso con la voz del dispositivo.' : 'Sin voz del dispositivo.'); });
    caja.append(A.el('div', { class: 'opcion apr-voz' }, vozCasilla, A.el('label', { for: 'apr-voz', texto: 'Leer cada verso con la voz del dispositivo (útil sin lector de pantalla)' })));

    const botonesModo = A.el('ul', { class: 'apr-modos', 'aria-label': 'Formas de practicar' });
    const zona = A.el('section', { class: 'apr-zona', 'aria-labelledby': 'apr-titulo' });
    const region = A.el('p', { class: 'solo-lector', 'aria-live': 'polite' });
    MODOS.forEach(function (m) {
      const b = A.el('button', { type: 'button', class: 'boton secundario', 'aria-pressed': String(mio.modo === m[0]) }, m[1]);
      b.addEventListener('click', function () {
        mio.modo = m[0]; guardar();
        botonesModo.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        pintar(); const t = document.getElementById('apr-titulo'); if (t) t.focus();
      });
      botonesModo.append(A.el('li', {}, b));
    });
    caja.append(botonesModo, zona, region);

    function pintar() {
      const titulo = A.el('h2', { id: 'apr-titulo', tabindex: '-1', texto: MODOS.find(function (m) { return m[0] === mio.modo; })[1] });
      zona.replaceChildren(titulo);
      ({ verso: modoVerso, completar: modoCompletar, letras: modoLetras, preguntas: modoPreguntas })[mio.modo](zona, V, mio, guardar, region);
    }
    pintar();
    return { nodo: caja, titulo: 'Aprender: ' + datos.titulo };
  }

  /* ---------- Verso a verso ---------- */
  function modoVerso(zona, V, mio, guardar, region) {
    let oculto = false;
    const estado = A.el('p', { class: 'apr-estado' });
    const verso = A.el('p', { class: 'apr-verso' });
    const mostrar = function (anunciarlo) {
      const i = mio.verso = Math.min(Math.max(0, mio.verso || 0), V.length - 1);
      estado.textContent = 'Verso ' + (i + 1) + ' de ' + V.length;
      verso.textContent = oculto ? '(oculto: dilo de memoria y pulsa «Mostrar el verso» para comprobarlo)' : V[i];
      verso.lang = !oculto && griego(V[i]) ? 'el' : '';
      bOcultar.textContent = oculto ? 'Mostrar el verso' : 'Ocultar el verso';
      bAnterior.disabled = i === 0; bSiguiente.disabled = i === V.length - 1;
      guardar();
      if (anunciarlo) anunciar(region, 'Verso ' + (i + 1) + (oculto ? ', oculto.' : '. ' + V[i]));
      if (anunciarlo && !oculto) decir(V[i]);
    };
    const bAnterior = A.el('button', { type: 'button' }, 'Anterior');
    const bSiguiente = A.el('button', { type: 'button' }, 'Siguiente');
    const bRepetir = A.el('button', { type: 'button', class: 'boton secundario' }, 'Repetir');
    const bOcultar = A.el('button', { type: 'button', class: 'boton secundario' }, 'Ocultar el verso');
    const bPrincipio = A.el('button', { type: 'button', class: 'boton secundario' }, 'Volver al principio');
    bAnterior.addEventListener('click', function () { mio.verso--; mostrar(true); });
    bSiguiente.addEventListener('click', function () { mio.verso++; mostrar(true); });
    bRepetir.addEventListener('click', function () { mostrar(true); });
    bOcultar.addEventListener('click', function () { oculto = !oculto; mostrar(true); });
    bPrincipio.addEventListener('click', function () { mio.verso = 0; mostrar(true); });
    zona.append(A.el('p', { texto: 'Lee o escucha un verso, repítelo en voz alta y pasa al siguiente. Al pulsar «Siguiente», el lector de pantalla dice el verso nuevo sin mover el foco. Para comprobar si te lo sabes, oculta el verso, dilo tú y vuelve a mostrarlo.' }),
      estado, verso, A.el('div', { class: 'apr-botones' }, bAnterior, bSiguiente, bRepetir, bOcultar, bPrincipio));
    mostrar(false);
  }

  /* ---------- Completar palabras ---------- */
  function modoCompletar(zona, V, mio, guardar, region) {
    let pista = 0;
    const estado = A.el('p', { class: 'apr-estado' });
    const verso = A.el('p', { class: 'apr-verso' });
    const campo = A.el('input', { type: 'text', id: 'apr-palabra', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false' });
    const ayuda = A.el('p', { class: 'apr-ayuda', id: 'apr-pista' });
    campo.setAttribute('aria-describedby', 'apr-pista');
    let buena = '';
    const mostrar = function (anunciarlo) {
      const i = mio.verso = Math.min(Math.max(0, mio.verso || 0), V.length - 1);
      const ws = palabras(V[i]), k = elegida(V[i], i);
      buena = k >= 0 ? soloPalabra(ws[k]) : '';
      pista = 0; ayuda.textContent = ''; campo.value = '';
      estado.textContent = 'Verso ' + (i + 1) + ' de ' + V.length + (mio.aciertos ? '. Aciertos: ' + mio.aciertos : '');
      verso.replaceChildren();
      verso.lang = griego(V[i]) ? 'el' : '';
      ws.forEach(function (w, j) {
        if (j) verso.append(' ');
        if (j === k) {
          const antes = w.slice(0, w.indexOf(buena)), despues = w.slice(w.indexOf(buena) + buena.length);
          verso.append(antes, A.el('span', { class: 'apr-hueco', 'aria-hidden': 'true', texto: '_____' }), A.el('span', { class: 'solo-lector', lang: 'es', texto: ' (hueco) ' }), despues);
        } else verso.append(w);
      });
      guardar();
      if (anunciarlo) anunciar(region, 'Verso ' + (i + 1) + '. ' + verso.textContent.replace('_____', '').replace(/\s+/g, ' '));
    };
    const comprobar = function () {
      const r = plano(campo.value);
      if (!r) { anunciar(region, 'Escribe la palabra que falta.'); campo.focus(); return; }
      if (r === plano(buena)) {
        mio.aciertos = (mio.aciertos || 0) + 1; guardar();
        anunciar(region, '¡Muy bien! Era «' + buena + '». Pulsa «Siguiente verso».');
        ayuda.textContent = 'Correcto: «' + buena + '».';
        decir(V[mio.verso]);
      } else anunciar(region, 'No es esa. Prueba otra vez o pide una pista.');
    };
    const bComprobar = A.el('button', { type: 'button' }, 'Comprobar');
    const bPista = A.el('button', { type: 'button', class: 'boton secundario' }, 'Pista');
    const bRespuesta = A.el('button', { type: 'button', class: 'boton secundario' }, 'Ver la respuesta');
    const bAnterior = A.el('button', { type: 'button', class: 'boton secundario' }, 'Verso anterior');
    const bSiguiente = A.el('button', { type: 'button' }, 'Siguiente verso');
    bComprobar.addEventListener('click', comprobar);
    campo.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); comprobar(); } });
    bPista.addEventListener('click', function () {
      pista++;
      const letras = Array.from(buena);
      ayuda.textContent = pista === 1 ? 'Pista: empieza por «' + letras[0] + '» y tiene ' + letras.length + ' letras.'
        : 'Pista: empieza por «' + letras.slice(0, Math.ceil(letras.length / 2)).join('') + '».';
      anunciar(region, ayuda.textContent); campo.focus();
    });
    bRespuesta.addEventListener('click', function () { ayuda.textContent = 'La palabra es «' + buena + '». El verso entero: ' + V[mio.verso]; anunciar(region, ayuda.textContent); });
    bAnterior.addEventListener('click', function () { if (mio.verso > 0) { mio.verso--; mostrar(true); campo.focus(); } });
    bSiguiente.addEventListener('click', function () {
      if (mio.verso >= V.length - 1) { anunciar(region, 'Era el último verso. Puedes volver a empezar con «Verso anterior» o elegir otra forma de practicar.'); return; }
      mio.verso++; mostrar(true); campo.focus();
    });
    zona.append(A.el('p', { texto: 'En cada verso falta una palabra. Escríbela (da igual con o sin tildes) y pulsa Intro o «Comprobar». Si no te sale, pide una pista.' }),
      estado, verso, A.el('div', { class: 'fav-nueva' }, A.el('label', { for: 'apr-palabra', texto: 'Palabra que falta' }), campo, bComprobar), ayuda,
      A.el('div', { class: 'apr-botones' }, bPista, bRespuesta, bAnterior, bSiguiente));
    mostrar(false);
  }

  /* ---------- Primeras letras ---------- */
  function modoLetras(zona, V) {
    const ol = A.el('ol', { class: 'apr-letras' });
    V.forEach(function (v, i) {
      const ini = A.el('span', { texto: iniciales(v) });
      if (griego(v)) ini.lang = 'el';
      const entero = A.el('p', { class: 'apr-entero', id: 'apr-entero-' + i, hidden: 'hidden', texto: v });
      if (griego(v)) entero.lang = 'el';
      const b = A.el('button', { type: 'button', class: 'boton secundario', 'aria-expanded': 'false', 'aria-controls': 'apr-entero-' + i }, 'Ver el verso ' + (i + 1));
      b.addEventListener('click', function () {
        entero.hidden = !entero.hidden;
        b.setAttribute('aria-expanded', String(!entero.hidden));
        if (!entero.hidden) decir(v);
      });
      ol.append(A.el('li', {}, ini, ' ', b, entero));
    });
    zona.append(A.el('p', { texto: 'Cada verso, solo con la primera letra de cada palabra. Intenta decirlo entero con esas pistas; si no te sale, abre el verso con su botón. Con NVDA, las letras se leen mejor carácter a carácter o en la línea braille.' }), ol);
  }

  /* ---------- Preguntas guía ---------- */
  function modoPreguntas(zona, V) {
    const qs = [];
    qs.push(['¿Cómo empieza? ¿A quién se dirige?', V[0]]);
    if (V.length > 2) {
      const pasos = Math.min(4, V.length - 2);
      for (let n = 1; n <= pasos; n++) {
        const i = Math.round(n * (V.length - 2) / (pasos + 1));
        qs.push(['¿Qué viene después de «' + V[i] + '»?', V[i + 1]]);
      }
    }
    if (V.length > 1) qs.push(['¿Cómo termina? ¿Qué se pide o se dice al final?', V[V.length - 1]]);
    qs.push(['Sin mirar: ¿cuántos versos tiene y cuáles recuerdas enteros?', V.length + ' versos. Comprueba los que recuerdas con «Verso a verso».']);
    const ol = A.el('ol', { class: 'apr-preguntas' });
    qs.forEach(function (q, i) {
      const r = A.el('p', { class: 'apr-respuesta', id: 'apr-resp-' + i, hidden: 'hidden', texto: q[1] });
      if (griego(q[1])) r.lang = 'el';
      const b = A.el('button', { type: 'button', class: 'boton secundario', 'aria-expanded': 'false', 'aria-controls': 'apr-resp-' + i }, 'Ver la respuesta', A.el('span', { class: 'solo-lector', texto: ' ' + (i + 1) }));
      b.addEventListener('click', function () { r.hidden = !r.hidden; b.setAttribute('aria-expanded', String(!r.hidden)); });
      const p = A.el('p', { texto: q[0] });
      if (griego(q[0])) p.lang = 'el';
      ol.append(A.el('li', {}, p, b, r));
    });
    zona.append(A.el('p', { texto: 'Piensa la respuesta antes de abrirla. Así se recuerda mejor que leyendo.' }), ol);
  }

  window.JarisAprender = { pantalla: pantalla };
})();
