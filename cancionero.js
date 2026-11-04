/* Jaris: el Cancionero (extra 2). Rutas: #/cancionero, #/cancionero/N (un salmo) y #/cancionero/N/cantar (modo cantar).
   Los salmos salen de «Cancionero\Cancionero - salmos.txt» en cada montaje (contenido/cancionero.json, lo hace
   cancionero_aplicacion.py): si se escriben salmos nuevos en el .txt, salen solos al montar el libro. */
'use strict';
(function () {
  let datos = null;
  const GRIEGO = new RegExp('[\\u0370-\\u03FF\\u1F00-\\u1FFF][\\u0370-\\u03FF\\u1F00-\\u1FFF\\s,.;:\\u00B7\'\\u2019]*', 'g');

  async function cargar(a) {
    if (datos) return datos;
    const traer = a && a.traer ? a.traer : function (r) { return fetch(r).then(function (x) { if (!x.ok) throw new Error(r); return x.json(); }); };
    try { datos = await traer('contenido/cancionero.json'); } catch (e) { datos = { intro: [], apartados: [], salmos: [] }; }
    return datos;
  }
  /* Un texto con el griego marcado con lang="el" (para que el lector use la voz griega). */
  function conGriego(el, texto) {
    const nodo = document.createDocumentFragment();
    let ultimo = 0;
    texto.replace(GRIEGO, function (trozo, pos) {
      const limpio = trozo.replace(/[\s,.;:·]+$/, '');
      if (pos > ultimo) nodo.append(texto.slice(ultimo, pos));
      nodo.append(el('span', { lang: 'el', texto: limpio }));
      ultimo = pos + limpio.length;
      return trozo;
    });
    nodo.append(texto.slice(ultimo));
    return nodo;
  }
  function parrafo(el, lineas, clase) {
    const p = el('p', clase ? { class: clase } : {});
    lineas.forEach(function (l, i) { if (i) p.append(el('br')); p.append(conGriego(el, l)); });
    return p;
  }
  /* El himno del libro del que sale el salmo («Himno homérico 11. ...»), buscado por su número. */
  function himnoDelLibro(libro, h) {
    if (!h) return null;
    const re = new RegExp('^Himno ' + h.tipo + ' ' + h.n + '\\.', 'i');
    return libro.himnos.find(function (x) { return re.test(x.t); }) || null;
  }
  function salmoPorNumero(n) { return datos.salmos.find(function (s) { return String(s.n) === String(n); }) || null; }

  /* ---------- Portada del Cancionero: #/cancionero ---------- */
  function portada(a) {
    const el = a.el, raiz = el('div', { class: 'cancionero' }, el('h1', { texto: 'Cancionero' }));
    datos.intro.forEach(function (t) { raiz.append(el('p', { texto: t })); });
    raiz.append(el('p', { texto: 'Cada salmo tiene su texto, la antífona marcada y un modo para cantarlo verso a verso, con letra grande.' }));
    (datos.apartados || []).forEach(function (ap) {
      const lista = datos.salmos.filter(function (s) { return s.apartado === ap; });
      raiz.append(el('h2', { texto: ap }));
      if (!lista.length) { raiz.append(el('p', { texto: 'Todavía no hay salmos en este apartado.' })); return; }
      const ul = el('ul', { class: 'canc-lista' });
      lista.forEach(function (s) {
        ul.append(el('li', {}, el('a', { href: '#/cancionero/' + s.n }, s.titulo), s.cuando ? '. ' + s.cuando : ''));
      });
      raiz.append(ul);
    });
    if (datos.sobreGriego) raiz.append(el('h2', { texto: 'Sobre el griego' }), parrafo(el, [datos.sobreGriego]));
    return { nodo: raiz, titulo: 'Cancionero' };
  }

  /* ---------- Un salmo: #/cancionero/N ---------- */
  async function salmo(s, a) {
    const el = a.el, raiz = el('div', { class: 'cancionero' }, el('h1', { texto: s.titulo }));
    if (s.cuando) raiz.append(el('p', { texto: s.cuando }));
    // Los himnos del libro de los que sale el salmo (uno o varios), cada uno con su enlace
    const hs = (s.himnos && s.himnos.length ? s.himnos : (s.himno ? [s.himno] : []))
      .map(function (x) { return himnoDelLibro(a.libro, x); }).filter(Boolean);
    if (s.fuente) {
      const p = el('p', { texto: 'Escrito ' + s.fuente + '. ' });
      if (hs.length === 1) p.append(el('a', { href: '#/leer/' + hs[0].cap + '/' + hs[0].a }, 'Leer el himno original en el libro: ' + hs[0].t));
      raiz.append(p);
      if (hs.length > 1) {
        raiz.append(el('p', { texto: 'Leer los himnos originales en el libro:' }));
        const ul = el('ul', { class: 'canc-fuentes' });
        hs.forEach(function (h) { ul.append(el('li', {}, el('a', { href: '#/leer/' + h.cap + '/' + h.a }, h.t))); });
        raiz.append(ul);
      }
    }
    // Las grabaciones, cuando las haya (bloque «Cancionero» de los audios)
    if (window.JarisAudios) {
      try { const b = await window.JarisAudios.botonesPara('cancionero', s.id); if (b) raiz.append(b); } catch (e) { /* nada */ }
    }
    raiz.append(el('p', {}, el('a', { class: 'boton', href: '#/cancionero/' + s.n + '/cantar' }, 'Cantar verso a verso')));

    raiz.append(el('h2', { texto: 'Antífona' }),
      el('p', { class: 'buz-ayuda', texto: 'Se canta al principio, entre estrofa y estrofa, y al final.' }),
      parrafo(el, s.antifona, 'canc-antifona'));
    raiz.append(el('h2', { texto: 'El salmo' }));
    let e = 0;
    s.partes.forEach(function (p) {
      if (p.tipo === 'antifona') {
        const r = el('p', { class: 'canc-repite' }, el('strong', { texto: 'Antífona: ' }));
        r.append(conGriego(el, s.antifona.join(' ')));
        raiz.append(r);
      } else {
        e++;
        raiz.append(el('h3', { class: 'solo-lector', texto: 'Estrofa ' + e }), parrafo(el, p.versos));
      }
    });
    if (s.final.length) {
      raiz.append(el('h2', { texto: 'Para cerrar' }));
      s.final.forEach(function (p) { raiz.append(parrafo(el, p)); });
    }
    if (s.vozGriega) raiz.append(el('p', { class: 'buz-ayuda' }, 'Para la voz griega (sin los signos antiguos): ', el('span', { lang: 'el', texto: s.vozGriega })));

    // Salmo anterior y siguiente
    const i = datos.salmos.indexOf(s), pasar = el('ul', { class: 'botones' });
    if (i > 0) pasar.append(el('li', {}, el('a', { class: 'boton secundario', href: '#/cancionero/' + datos.salmos[i - 1].n }, 'Anterior: ' + datos.salmos[i - 1].titulo)));
    if (i < datos.salmos.length - 1) pasar.append(el('li', {}, el('a', { class: 'boton secundario', href: '#/cancionero/' + datos.salmos[i + 1].n }, 'Siguiente: ' + datos.salmos[i + 1].titulo)));
    pasar.append(el('li', {}, el('a', { class: 'boton secundario', href: '#/cancionero' }, 'Volver al Cancionero')));
    raiz.append(el('nav', { 'aria-label': 'Salmos' }, pasar));
    return { nodo: raiz, titulo: s.titulo };
  }

  /* ---------- Modo cantar: #/cancionero/N/cantar ---------- */
  /* Verso a verso, con letra grande: la antífona al principio, las estrofas con la antífona entre medias, como en el .txt. */
  function versosParaCantar(s) {
    const lista = [], ant = function () { s.antifona.forEach(function (v) { lista.push({ texto: v, antifona: true }); }); };
    ant();
    let e = 0;
    s.partes.forEach(function (p) {
      if (p.tipo === 'antifona') ant();
      else { e++; p.versos.forEach(function (v, i) { lista.push({ texto: v, estrofa: e, primero: i === 0 }); }); }
    });
    return lista;
  }
  function cantar(s, a) {
    const el = a.el, versos = versosParaCantar(s);
    const clave = 'jaris.cantar';
    let pos = 0;
    try { const g = JSON.parse(localStorage.getItem(clave)) || {}; if (g[s.id] && g[s.id] < versos.length) pos = g[s.id]; } catch (e) { /* nada */ }
    const raiz = el('div', { class: 'cancionero cantar' }, el('h1', { texto: 'Cantar: ' + s.titulo }),
      el('p', { texto: 'Pasa de verso con el botón «Siguiente». La antífona va marcada. Se recuerda por dónde ibas.' }));
    const donde = el('p', { class: 'canc-donde' });
    const verso = el('p', { class: 'canc-verso', 'aria-live': 'polite', 'aria-atomic': 'true' });
    const anterior = el('button', { type: 'button', class: 'secundario', texto: 'Anterior' });
    const siguiente = el('button', { type: 'button', texto: 'Siguiente' });
    const principio = el('button', { type: 'button', class: 'secundario', texto: 'Volver al principio' });
    function pintar(decir) {
      const v = versos[pos];
      donde.textContent = 'Verso ' + (pos + 1) + ' de ' + versos.length + (v.antifona ? ', antífona' : ', estrofa ' + v.estrofa);
      verso.replaceChildren();
      if (v.antifona) verso.append(el('span', { class: 'canc-marca', texto: 'Antífona: ' }));
      if (!decir) verso.setAttribute('aria-live', 'off');
      verso.append(conGriego(el, v.texto));
      if (!decir) setTimeout(function () { verso.setAttribute('aria-live', 'polite'); }, 50);
      anterior.disabled = pos === 0;
      siguiente.textContent = pos === versos.length - 1 ? 'Siguiente (es el último)' : 'Siguiente';
      try { const g = JSON.parse(localStorage.getItem(clave)) || {}; g[s.id] = pos; localStorage.setItem(clave, JSON.stringify(g)); } catch (e) { /* nada */ }
    }
    anterior.addEventListener('click', function () { if (pos > 0) { pos--; pintar(true); } });
    siguiente.addEventListener('click', function () {
      if (pos < versos.length - 1) { pos++; pintar(true); } else a.avisar('Has llegado al final del salmo. Pulsa «Volver al principio» para empezar otra vez.');
    });
    principio.addEventListener('click', function () { pos = 0; pintar(true); siguiente.focus(); });
    raiz.append(donde, verso, el('div', { class: 'buz-botones' }, anterior, siguiente, principio));
    const final = s.final.length ? s.final[0] : null;
    if (final) raiz.append(el('h2', { texto: 'Para cerrar' }), parrafo(el, final));
    raiz.append(el('p', {}, el('a', { href: '#/cancionero/' + s.n }, 'Salir del modo cantar y ver todo el salmo')));
    pintar(false);
    return { nodo: raiz, titulo: 'Cantar: ' + s.titulo };
  }

  async function pantalla(partes, a) {
    await cargar(a);
    if (partes[1]) {
      const s = salmoPorNumero(partes[1]);
      if (!s) { const r = portada(a); a.avisar('No encuentro ese salmo.'); return r; }
      return partes[2] === 'cantar' ? cantar(s, a) : salmo(s, a);
    }
    return portada(a);
  }
  /* Para el buscador por dios y la pantalla de cada día: los salmos de un dios o de un día del mes. */
  async function salmosDe(a, filtro) { await cargar(a); return datos.salmos.filter(filtro); }
  window.JarisCancionero = { pantalla: pantalla, salmosDe: salmosDe };
})();
