/* Jaris: «Al despertar» (sesión C2, 7 de noviembre de 2026). Ruta: #/despertar.
   Es la pareja de la Noche (noche.js). Todo sale del libro en cada momento (por el título de cada texto):
   - una frase de hoy: la fiesta que toca o «Hoy es un día sin fiesta...», con enlace a «Hoy»;
   - la oración corta de esta mañana, distinta cada día (sale de la fecha) entre las de la lista de aquí debajo;
   - «Si tienes un minuto más»: el himno órfico 78 a Eos (la aurora), siempre el mismo;
   - «Mis oraciones de la mañana»: elegir una lista de Favoritos; si se elige, la oración corta sale de esa lista.
   Se guarda solo la lista elegida, en este dispositivo (clave «jaris.alba», que entra en la copia de seguridad de «Tus datos»). */
'use strict';
(function () {
  const CLAVE = 'jaris.alba';

  /* ============================================================================================
     LISTA ÚNICA DE LAS ORACIONES CORTAS DE LA MAÑANA (este es el ÚNICO sitio donde están).
     Cada título es el de la oración tal como está en el capítulo 6 (se comparan sin mayúsculas ni tildes).
     La oración de cada día se elige por la fecha, rotando por esta lista en este orden.
     SESIÓN C1 (la oración nueva a Eos para despertar): cuando esté escrita en el capítulo 6, solo hay que
     añadir su título EXACTO como una línea más aquí abajo. No hay que tocar nada más de este archivo.
     Si un título no se encuentra en el libro, se salta sin dar error (así un título mal puesto no rompe la pantalla).
     ============================================================================================ */
  const ORACIONES_DE_LA_MANANA = [
    'Al saludar al Sol',      // a Helios, unos 15 segundos
    'Al empezar el día',      // a Hestia, unos 20 segundos
    'Al despertar',           // a Eos, unos 20 segundos (sesión C1, composición de esta antología)
    'Buenos días a Eos',      // a Eos, unos 15 segundos (sesión C1)
    'Para despertar poco a poco', // a Eos, unos 20 segundos (sesión C1)
  ];
  /* El himno de «Si tienes un minuto más»: órfico 78, a Eos (se busca por el principio de su título). */
  const HIMNO_UN_MINUTO_MAS = /^himno orfico 78\./;
  /* Y debajo, como enlaces, dos pasajes de Homero (capítulo 19), por su código (sesión C10). */
  const PASAJES_DE_LA_MANANA = [/^pasaje de homero 13\./, /^pasaje de homero 14\./];
  const FRASE_SIN_FIESTA = 'Hoy es un día sin fiesta. Un día normal también es sagrado.';

  const MARCAS = new RegExp('[\\u0300-\\u036f]', 'g');   // tildes y otras marcas, para comparar sin ellas
  function normal(s) { return (s || '').toLowerCase().normalize('NFD').replace(MARCAS, ''); }

  /* Las oraciones de la lista de arriba que de verdad están en el libro, en el mismo orden. */
  function oracionesDeLaManana(libro) {
    const r = [];
    ORACIONES_DE_LA_MANANA.forEach(function (titulo) {
      const o = libro.oraciones.find(function (x) { return normal(x.t) === normal(titulo); });
      if (o && !r.some(function (x) { return x.cap === o.cap && x.a === o.a; })) r.push(o);
    });
    return r;
  }
  function himnoDeEos(libro) {
    return libro.himnos.find(function (h) { return HIMNO_UN_MINUTO_MAS.test(normal(h.t)); }) || null;
  }
  /* El número de día elige la oración: así es la misma para todo el mundo ese día (como la de la noche). */
  function indiceDelDia(civil, total) { return total ? ((civil % total) + total) % total : 0; }

  /* ---------- Lo que se guarda: solo la lista elegida ---------- */
  function listaElegida() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(CLAVE)); } catch (e) { d = null; }
    return d && typeof d.lista === 'string' ? d.lista : '';
  }
  function guardarLista(id) {
    try {
      if (id) localStorage.setItem(CLAVE, JSON.stringify({ lista: id })); else localStorage.removeItem(CLAVE);
      return true;
    } catch (e) { return false; }
  }
  function listasConTextos() {
    try {
      if (!window.JarisFavoritos) return [];
      return window.JarisFavoritos.leer().listas.filter(function (l) { return l.items && l.items.length; });
    } catch (e) { return []; }
  }

  /* Qué oración toca hoy: la de la lista elegida (si hay y no está vacía) o una de las del libro. */
  function oracionDeHoy(libro, civil) {
    const id = listaElegida();
    if (id) {
      const l = listasConTextos().find(function (x) { return x.id === id; });
      if (l) return { o: l.items[indiceDelDia(civil, l.items.length)], lista: l.nombre, perdida: false };
    }
    const del = oracionesDeLaManana(libro);
    return { o: del.length ? del[indiceDelDia(civil, del.length)] : null, lista: null, perdida: !!id };
  }

  /* Botones de audio y de favoritos para un texto (los mismos que en «Hoy» y en la Noche). */
  async function conBotones(caja, x) {
    if (window.JarisFavoritos) { try { caja.prepend(window.JarisFavoritos.botonPara(x)); } catch (e) { /* nada */ } }
    if (window.JarisAudios) { try { const b = await window.JarisAudios.botonesPara(x.cap, x.a); if (b) caja.prepend(b); } catch (e) { /* nada */ } }
    return caja;
  }

  async function pantalla(a) {
    const el = a.el, libro = a.libro, civil = a.hoy();
    const raiz = el('div', { class: 'alba' });
    raiz.append(el('h1', { texto: 'Al despertar' }),
      el('p', { texto: 'Para empezar el día con calma: una frase de hoy, una oración corta y, si tienes un minuto más, un himno a la aurora. Esta pantalla funciona sin conexión; los audios, si los has descargado antes en «Audios».' }));

    // Hoy: la fiesta que toca, o la frase de los días normales
    const d = a.dia(civil), fiestas = (d.fiestas || []).filter(Boolean);
    raiz.append(el('section', { 'aria-labelledby': 'alba-hoy' }, el('h2', { id: 'alba-hoy', texto: 'Hoy' }),
      el('p', {}, fiestas.length ? 'Hoy se celebra: ' + fiestas.join('; ') + '. ' : FRASE_SIN_FIESTA + ' ', el('a', { href: '#/hoy' }, 'Ver lo de hoy'))));

    // La oración corta de esta mañana (se vuelve a pintar si se elige otra lista)
    const secOracion = el('section', { 'aria-labelledby': 'alba-oracion' });
    let version = 0;
    async function pintarOracion() {
      const mio = ++version, r = oracionDeHoy(libro, civil);
      const nodos = [];
      if (r.perdida) nodos.push(el('p', { class: 'buz-ayuda', texto: 'La lista que elegiste ya no existe o está vacía, así que hoy sale una oración del libro.' }));
      if (r.o) {
        nodos.unshift(el('h2', { id: 'alba-oracion', texto: 'Oración de esta mañana: ' + r.o.t }));
        if (r.lista) nodos.push(el('p', { class: 'buz-ayuda', texto: 'Sale de tu lista «' + r.lista + '».' }));
        nodos.push(await conBotones(await a.fragmento(r.o), r.o));
      } else {
        nodos.unshift(el('h2', { id: 'alba-oracion', texto: 'Oración de esta mañana' }));
        nodos.push(el('p', { texto: 'No se ha encontrado ninguna oración de la mañana en el libro.' }));
      }
      if (mio !== version) return null;
      secOracion.replaceChildren(...nodos);
      return r.o ? r.o.t : null;
    }
    await pintarOracion();
    raiz.append(secOracion);

    // Si tienes un minuto más: el himno órfico 78 a Eos
    const himno = himnoDeEos(libro);
    if (himno) {
      const sec = el('section', { 'aria-labelledby': 'alba-minuto' }, el('h2', { id: 'alba-minuto', texto: 'Si tienes un minuto más' }),
        el('p', { texto: 'El himno a Eos, la aurora, para leer o escuchar. Dura algo más de un minuto.' }),
        el('h3', {}, el('a', { href: '#/leer/' + himno.cap + '/' + himno.a }, himno.t)));
      sec.append(await conBotones(el('div'), himno));
      // Sesión C10 (aprobado por la autora el 11 nov): dos pasajes de Homero de la mañana, solo como enlaces.
      const pasajes = PASAJES_DE_LA_MANANA.map(function (re) {
        return libro.himnos.find(function (h) { return re.test(normal(h.t)); });
      }).filter(Boolean);
      if (pasajes.length) {
        sec.append(el('p', { texto: 'O, para pensar, un pasaje de Homero:' }),
          el('ul', {}, ...pasajes.map(function (h) { return el('li', {}, el('a', { href: '#/leer/' + h.cap + '/' + h.a }, h.t)); })));
      }
      raiz.append(sec);
    }

    raiz.append(misOraciones(a, pintarOracion));
    raiz.append(el('p', { texto: 'Buenos días.' }));
    return { nodo: raiz, titulo: 'Al despertar' };
  }

  /* «Mis oraciones de la mañana»: elegir una lista de Favoritos para la oración corta. */
  function misOraciones(a, pintarOracion) {
    const el = a.el, sec = el('section', { 'aria-labelledby': 'alba-mias', class: 'diario' });
    sec.append(el('h2', { id: 'alba-mias', texto: 'Mis oraciones de la mañana' }),
      el('p', { texto: 'Si tienes tus propias oraciones, guárdalas en una lista de Favoritos y elígela aquí: la oración corta de cada mañana saldrá de esa lista, una distinta cada día. Lo que elijas se guarda solo en este dispositivo y entra en la copia de seguridad de «Tus datos».' }));
    const listas = listasConTextos(), actual = listaElegida();
    const sel = el('select', { id: 'alba-lista' });
    sel.append(el('option', { value: '', texto: 'Las oraciones del libro (por defecto)' }));
    listas.forEach(function (l) {
      sel.append(el('option', { value: l.id, texto: l.nombre + ' (' + l.items.length + (l.items.length === 1 ? ' texto)' : ' textos)') }));
    });
    sel.value = listas.some(function (l) { return l.id === actual; }) ? actual : '';
    /* Revisión C7: se guarda con un botón y no al mover el selector (con el teclado, en Edge y Chrome cada flecha
       cambiaba la lista, la guardaba y el lector de pantalla anunciaba el cambio en cada opción). */
    const usar = el('button', { type: 'button', texto: 'Usar esta lista' });
    usar.addEventListener('click', async function () {
      if (!guardarLista(sel.value)) { a.avisar('No se ha podido guardar: el navegador no deja guardar datos.'); return; }
      const titulo = await pintarOracion();
      const nombre = sel.value ? sel.options[sel.selectedIndex].textContent.replace(/ \(\d+ textos?\)$/, '') : '';
      a.avisar((nombre ? 'Elegida tu lista «' + nombre + '».' : 'Vuelven las oraciones del libro.') + (titulo ? ' La oración de esta mañana es «' + titulo + '».' : ''));
    });
    sec.append(el('label', { for: 'alba-lista', class: 'buz-etiqueta', texto: 'Lista de Favoritos para la oración de la mañana' }), sel, ' ', usar);
    if (!listas.length) sec.append(el('p', { class: 'buz-ayuda', texto: 'Todavía no tienes ninguna lista con textos. Debajo de cada oración, himno o rito hay un botón para guardarlo en favoritos o en una lista tuya.' }));
    sec.append(el('p', {}, el('a', { href: '#/favoritos' }, 'Ver y cambiar mis listas de favoritos')));
    return sec;
  }

  window.JarisDespertar = { pantalla: pantalla, ORACIONES_DE_LA_MANANA: ORACIONES_DE_LA_MANANA,
    oracionesDeLaManana: oracionesDeLaManana, himnoDeEos: himnoDeEos, indiceDelDia: indiceDelDia };
})();
