/* Jaris: «Cuando lo necesites» (sesión C5, 7 de noviembre de 2026). Ruta: #/necesito.
   Es la pantalla de los momentos difíciles y de los buenos: «¿Cómo estás?», un botón por grupo y, al pulsarlo, UN solo
   texto corto (el foco va a su título) con «Otra» (no repite hasta que han salido todos), Escuchar, favoritos y
   «Ver todas las de este grupo». El grupo «Ayuda con algo concreto» pregunta antes con qué.
   Todo sale del libro en cada momento, buscando cada texto por su título (capítulo 6, himnos y Cancionero).
   Se guarda solo lo que elige la persona, en este dispositivo (clave «jaris.necesito», que entra en la copia de
   seguridad de «Tus datos»): los grupos ocultos, el orden de los grupos y las listas de Favoritos que salen aquí. */
'use strict';
(function () {
  const CLAVE = 'jaris.necesito';

  /* ============================================================================================
     SITIO PARA «SUGERIDO» (lo usará la SESIÓN C6, sugerencias según el diario).
     Debe devolver una lista con los id de los grupos que hay que marcar como «Sugerido» (por ejemplo ['calma']).
     Mientras la C6 no exista, no sugiere nada. El grupo marcado sale con «(sugerido)» en el nombre del botón.
     Los id son los de la lista GRUPOS de aquí abajo: calma, concreto, estudios, buenosdias, proyecto, gracias,
     triste, personas (y 'lista:...' para las listas propias de Favoritos).
     ============================================================================================ */
  /* Sesión C6: lo calcula sugerencias.js (solo si la casilla de Ajustes está activada; si no, devuelve []). */
  function gruposSugeridos(a) {
    if (!window.JarisSugerencias || !a || typeof a.hoy !== 'function') return [];
    try { return window.JarisSugerencias.gruposSugeridos(a.hoy()); } catch (e) { return []; }
  }

  /* ============================================================================================
     LOS GRUPOS Y SUS TEXTOS (aprobados por la autora el 7 de noviembre de 2026).
     Cada texto se busca por su título tal como está en el libro (se compara sin mayúsculas ni tildes; un título
     que en el libro lleve un paréntesis detrás, como «La oración de Pletón (para cada día)», también vale).
       { o: 'título' }  oración del capítulo 6      { h: /regex/ }  himno (por el principio de su título)
       { s: 'título' }  salmo del Cancionero
     Si un título no se encuentra, se salta sin dar error (así un título mal puesto no rompe la pantalla).
     ============================================================================================ */
  /* Sesión C10 (11 nov 2026, aprobado por la autora): pasajes de Homero del capítulo 19 por su código
     ({ h: /^pasaje de homero 5\./ }, porque en la aplicación salen como «Pasaje de Homero 5. Como las hojas»)
     y la oración de la siembra del capítulo 25. Lista en 'Para la próxima conversación\31. ...'. */
  const GRUPOS = [
    { id: 'calma', nombre: 'Calma y relajación', dioses: 'Los acompañan Hestia, Atenea e Hipnos.', textos: [
      { o: 'Cuando me invaden los nervios' }, { o: 'Cuando todo me agobia' }, { o: 'Cuando la ansiedad aprieta' },
      { o: 'Cuando los pensamientos no paran' }, { o: 'Cuando tengo miedo' }, { o: 'Con nervios' },
      { s: 'Salmo a Hestia' }, { s: 'Salmo cuando tengo miedo' }, { h: /^pasaje de homero 27\./ }] },
    { id: 'concreto', nombre: 'Ayuda con algo concreto', dioses: 'Según el tema, te acompañan Hefesto, Hécate, Apolo, Asclepio, Atenea o Dike.',
      pregunta: '¿Con qué necesitas ayuda?', temas: [
      { id: 'reto', nombre: 'Un reto o un obstáculo', textos: [{ o: 'Ante un reto o un obstáculo' }] },
      { id: 'decision', nombre: 'Una decisión difícil', textos: [{ o: 'Ante una decisión difícil' }, { h: /^pasaje de homero 2\./ }] },
      { id: 'espera', nombre: 'Esperar un resultado', textos: [{ o: 'Al esperar un resultado' }] },
      { id: 'salud', nombre: 'Mi salud', textos: [{ o: 'Antes de una cita médica o una prueba' }, { o: 'En la enfermedad' }] },
      { id: 'saludotra', nombre: 'La salud de otra persona', textos: [{ o: 'Por una persona enferma' }, { s: 'Salmo por alguien enfermo' }] },
      { id: 'discusion', nombre: 'Una discusión o un enfado', textos: [{ o: 'Ante una discusión o un enfado' }] },
      { id: 'injusticia', nombre: 'Una injusticia', textos: [{ o: 'Ante una injusticia' }] }] },
    { id: 'estudios', nombre: 'Estudios, exámenes y consejo', dioses: 'Los acompaña Atenea, con Mnemósine, Hermes y Hefesto.', textos: [
      { o: 'Antes de estudiar o de un examen' }, { o: 'Antes de un examen' }, { o: 'Al bloquearse' },
      { o: 'Al no saber cómo hacer algo' }, { o: 'Antes de hablar en público' }, { o: 'Al terminar, pase lo que pase' },
      { o: 'Al empezar un curso o una etapa nueva' }, { s: 'Salmo a Atenea' }] },
    { id: 'buenosdias', nombre: 'Buenos días', dioses: 'Los acompañan Helios y Hestia.', textos: [
      { o: 'Al saludar al Sol' }, { o: 'Al empezar el día' }, { o: 'Al abrir la puerta por la mañana' },
      { h: /^himno homerico 31\./ }] },
    { id: 'proyecto', nombre: 'Un trabajo o proyecto que estás creando', dioses: 'Los acompañan Hestia, Apolo, Hefesto y las Musas.', textos: [
      { o: 'Antes de hacer música o crear' }, { o: 'Antes de trabajar con el ordenador o con herramientas' }, { o: 'Al bloquearse' },
      { o: 'Al terminar un trabajo' }, { s: 'Salmo a Apolo' }, { s: 'Salmo a Hestia' }, { s: 'Salmo a las Musas' },
      { o: 'La oración de la siembra' }, { h: /^pasaje de homero 20\./ }] },
    { id: 'gracias', nombre: 'Dar las gracias', dioses: 'Se las das a los dioses de tu casa; la oración de Pletón es para Zeus y todos los dioses.', textos: [
      { o: 'Para dar las gracias por un regalo' }, { o: 'Al recibir una buena noticia' },
      { o: 'La oración de Pletón' }, { s: 'Salmo para dar las gracias' }, { h: /^pasaje de homero 24\./ }] },
    { id: 'triste', nombre: 'Estoy triste o en una mala época', dioses: 'Los acompañan Perséfone, Atenea y Hefesto.', textos: [
      { o: 'Cuando estoy triste' }, { o: 'En una mala época' }, { o: 'Cuando dudo de mí' },
      { o: 'Cuando me frustro porque algo no me sale' }, { s: 'Salmo en una mala época' }, { h: /^pasaje de homero 5\./ }, { h: /^pasaje de homero 11\./ }] },
    { id: 'personas', nombre: 'Por alguien que quiero', dioses: 'Los acompañan Zeus, Hera, Hestia, Asclepio, Hermes y Ártemis.', textos: [
      { o: 'Por la familia' }, { o: 'Por una amistad' }, { o: 'Por una persona enferma' }, { o: 'Por los difuntos' },
      { o: 'Por los antepasados' }, { o: 'Por los animales y las mascotas' }, { o: 'Cuando muere un animal querido' },
      { s: 'Salmo por alguien enfermo' }, { h: /^pasaje de homero 6\./ }, { h: /^pasaje de homero 17\./ }, { h: /^pasaje de homero 18\./ }] }
  ];

  const MARCAS = new RegExp('[\\u0300-\\u036f]', 'g');   // tildes y otras marcas, para comparar sin ellas
  function normal(s) { return (s || '').toLowerCase().normalize('NFD').replace(MARCAS, ''); }

  /* ---------- Lo que se guarda: grupos ocultos, orden y listas de Favoritos que salen aquí ---------- */
  function limpiaLista(v) {
    return Array.isArray(v) ? v.filter(function (x) { return typeof x === 'string' && x; }).map(function (x) { return x.slice(0, 80); }).slice(0, 100) : [];
  }
  function leer() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(CLAVE)); } catch (e) { d = null; }
    if (!d || typeof d !== 'object') d = {};
    return { ocultos: limpiaLista(d.ocultos), orden: limpiaLista(d.orden), listas: limpiaLista(d.listas) };
  }
  function guardar(d) {
    try {
      if (!d.ocultos.length && !d.orden.length && !d.listas.length) localStorage.removeItem(CLAVE);
      else localStorage.setItem(CLAVE, JSON.stringify({ ocultos: d.ocultos, orden: d.orden, listas: d.listas }));
      return true;
    } catch (e) { return false; }
  }
  /* La casilla «Mostrar en Cuando lo necesites» de cada lista de Favoritos (la usa favoritos.js). */
  function listaMostrada(id) { return leer().listas.indexOf(id) >= 0; }
  function mostrarLista(id, si) {
    const d = leer();
    d.listas = d.listas.filter(function (x) { return x !== id; });
    if (si) d.listas.push(id);
    return guardar(d);
  }

  /* ---------- Buscar cada texto en el libro ---------- */
  function resolver(ref, libro, salmos) {
    if (ref.o) {
      const n = normal(ref.o);
      const x = libro.oraciones.find(function (z) { const t = normal(z.t); return t === n || t.indexOf(n + ' (') === 0; });
      return x ? { tipo: 'texto', clave: x.cap + '/' + x.a, t: x.t, x: x } : null;
    }
    if (ref.h) {
      const x = libro.himnos.find(function (z) { return ref.h.test(normal(z.t)); });
      return x ? { tipo: 'texto', clave: x.cap + '/' + x.a, t: x.t, x: x } : null;
    }
    if (ref.s) {
      const n = normal(ref.s);
      const s = salmos.find(function (z) { return normal(z.titulo) === n; });
      return s ? { tipo: 'salmo', clave: 'salmo/' + s.n, t: s.titulo, s: s } : null;
    }
    return null;
  }
  function resolverTodos(refs, libro, salmos) {
    const r = [];
    refs.forEach(function (ref) {
      const it = resolver(ref, libro, salmos);
      if (it && !r.some(function (z) { return z.clave === it.clave; })) r.push(it);
    });
    return r;
  }
  function itemsDe(g, libro, salmos) {
    if (g.propia) return g.items.map(function (x) { return { tipo: 'texto', clave: x.cap + '/' + x.a, t: x.t, x: x }; });
    if (g.temas) {
      let todo = [];
      g.temas.forEach(function (t) { todo = todo.concat(t.textos); });
      return resolverTodos(todo, libro, salmos);
    }
    return resolverTodos(g.textos, libro, salmos);
  }

  /* ---------- Grupos: los del libro más las listas de Favoritos marcadas; con su orden y sin los ocultos ---------- */
  function todosLosGrupos() {
    const d = leer();
    const base = GRUPOS.slice();
    try {
      if (window.JarisFavoritos) {
        window.JarisFavoritos.leer().listas.forEach(function (l) {
          if (d.listas.indexOf(l.id) >= 0 && l.items && l.items.length) {
            base.push({ id: 'lista:' + l.id, nombre: l.nombre, dioses: 'Son tus textos guardados en la lista «' + l.nombre + '».', propia: true, items: l.items });
          }
        });
      }
    } catch (e) { /* nada */ }
    const pos = {};
    d.orden.forEach(function (id, i) { pos[id] = i; });
    const tiene = function (id) { return Object.prototype.hasOwnProperty.call(pos, id); };
    return base.map(function (g, i) { return { g: g, i: i }; }).sort(function (x, y) {
      const px = tiene(x.g.id) ? pos[x.g.id] : 100000 + x.i, py = tiene(y.g.id) ? pos[y.g.id] : 100000 + y.i;
      return px - py;
    }).map(function (z) { return z.g; });
  }
  function gruposVisibles() {
    const ocultos = leer().ocultos;
    return todosLosGrupos().filter(function (g) { return ocultos.indexOf(g.id) < 0; });
  }

  /* ---------- «Otra»: no repite hasta que han salido todos ---------- */
  const barajas = {};
  function barajar(lista) {
    const r = lista.slice();
    for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = r[i]; r[i] = r[j]; r[j] = t; }
    return r;
  }
  function siguiente(clave, items) {
    let b = barajas[clave];
    if (!b || b.n !== items.length) b = barajas[clave] = { cola: [], ultimo: -1, n: items.length };
    if (!b.cola.length) {
      b.cola = barajar(items.map(function (_, i) { return i; }));
      if (b.cola.length > 1 && b.cola[0] === b.ultimo) b.cola.push(b.cola.shift());
    }
    const i = b.cola.shift();
    b.ultimo = i;
    return items[i];
  }

  /* Botones de audio y de favoritos para un texto (los mismos que en «Hoy», «Al despertar» y la Noche). */
  async function conBotones(caja, x) {
    if (window.JarisFavoritos) { try { caja.prepend(window.JarisFavoritos.botonPara(x)); } catch (e) { /* nada */ } }
    if (window.JarisAudios) { try { const b = await window.JarisAudios.botonesPara(x.cap, x.a); if (b) caja.prepend(b); } catch (e) { /* nada */ } }
    return caja;
  }
  /* Un salmo del Cancionero, en pequeño: la antífona y sus estrofas, con enlaces al salmo entero y al modo cantar. */
  async function cajaSalmo(a, s) {
    const el = a.el, caja = el('div', { class: 'fragmento' });
    if (window.JarisAudios) { try { const b = await window.JarisAudios.botonesPara('cancionero', s.id); if (b) caja.append(b); } catch (e) { /* nada */ } }
    const lineas = function (vs, clase) {
      const p = el('p', clase ? { class: clase } : {});
      vs.forEach(function (v, i) { if (i) p.append(el('br')); p.append(v); });
      return p;
    };
    caja.append(el('p', {}, el('strong', { texto: 'Antífona' })), lineas(s.antifona, 'canc-antifona'));
    let e = 0;
    s.partes.forEach(function (p) {
      if (p.tipo === 'antifona') return;
      e++;
      caja.append(el('p', {}, el('strong', { class: 'solo-lector', texto: 'Estrofa ' + e })), lineas(p.versos));
    });
    caja.append(el('p', {}, el('a', { href: '#/cancionero/' + s.n }, 'Abrir «' + s.titulo + '» entero'), ' · ',
      el('a', { href: '#/cancionero/' + s.n + '/cantar' }, 'Cantar «' + s.titulo + '» verso a verso')));
    return caja;
  }

  /* ---------- La pantalla ---------- */
  async function pantalla(a) {
    const el = a.el, libro = a.libro;
    let salmos = [];
    try { if (window.JarisCancionero) salmos = await window.JarisCancionero.salmosDe(a, function () { return true; }); } catch (e) { salmos = []; }
    const raiz = el('div', { class: 'necesito' });
    raiz.append(el('h1', { texto: 'Cuando lo necesites' }),
      el('p', { texto: 'Un texto corto para cada momento: elige cómo estás y sale uno; con «Otra» sale otro. Esta pantalla funciona sin conexión; los audios, si los has descargado antes en «Audios». Estos textos acompañan, pero no sustituyen a un médico ni a un psicólogo cuando hace falta.' }));

    /* Sesión C6: si el diario lleva a la frase de ayuda, sale aquí arriba (y no se marca ningún grupo). */
    if (window.JarisSugerencias && typeof a.hoy === 'function') {
      try { const ayuda = window.JarisSugerencias.seccionNecesito(a, a.hoy()); if (ayuda) raiz.append(ayuda); } catch (e) { /* nada */ }
    }

    const cajaGrupos = el('div');
    const secGrupos = el('section', { 'aria-labelledby': 'nec-como' }, el('h2', { id: 'nec-como', tabindex: '-1', texto: '¿Cómo estás?' }), cajaGrupos);
    const resultado = el('div', { id: 'nec-resultado' });
    const panel = el('section', { 'aria-labelledby': 'nec-orden' });
    raiz.append(secGrupos, resultado, panel,
      el('p', {}, el('a', { href: '#/favoritos' }, 'Mis listas de favoritos (allí puedes elegir cuáles salen aquí como un grupo más)')));

    let version = 0;
    const enfocar = function (id) { const n = raiz.querySelector('#' + id); if (n) n.focus(); };

    function pintarGrupos() {
      const vis = gruposVisibles(), sug = gruposSugeridos(a) || [];
      cajaGrupos.replaceChildren();
      if (!vis.length) {
        cajaGrupos.append(el('p', { texto: 'Has ocultado todos los grupos. Puedes volver a mostrarlos más abajo, en «Ordenar y ocultar grupos».' }));
        return;
      }
      const ul = el('ul', { class: 'nec-grupos' });
      vis.forEach(function (g, i) {
        const idd = 'nec-d-' + i, esSug = sug.indexOf(g.id) >= 0;
        const b = el('button', { type: 'button', class: 'boton' + (esSug ? ' sugerido' : ''), 'aria-describedby': idd, 'data-grupo': g.id }, g.nombre + (esSug ? ' (sugerido)' : ''));
        b.addEventListener('click', function () { abrirGrupo(g); });
        ul.append(el('li', {}, b, el('p', { id: idd, class: 'buz-ayuda', texto: g.dioses })));
      });
      cajaGrupos.append(ul);
    }

    function abrirGrupo(g) {
      if (g.temas) { pintarTemas(g); return; }
      const items = itemsDe(g, libro, salmos);
      if (!items.length) {
        ++version;
        resultado.replaceChildren(el('h2', { id: 'nec-foco', tabindex: '-1', texto: g.nombre }), el('p', { texto: 'No se ha encontrado ningún texto de este grupo en el libro.' }));
        enfocar('nec-foco');
        return;
      }
      mostrar(g, items, null);
    }

    /* El grupo «Ayuda con algo concreto» pregunta antes con qué */
    function pintarTemas(g) {
      ++version;
      const ul = el('ul', { class: 'nec-grupos' });
      g.temas.forEach(function (t) {
        const b = el('button', { type: 'button', class: 'boton secundario' }, t.nombre);
        b.addEventListener('click', function () {
          const items = resolverTodos(t.textos, libro, salmos);
          if (!items.length) { a.avisar('No se ha encontrado ningún texto para este tema en el libro.'); return; }
          mostrar(g, items, t);
        });
        ul.append(el('li', {}, b));
      });
      resultado.replaceChildren(el('h2', { id: 'nec-foco', tabindex: '-1', texto: g.nombre + ': ' + g.pregunta }), el('p', { class: 'buz-ayuda', texto: g.dioses }), ul, volver());
      enfocar('nec-foco');
    }

    function volver() {
      const b = el('button', { type: 'button', class: 'boton secundario' }, 'Volver a los grupos');
      b.addEventListener('click', function () { ++version; resultado.replaceChildren(); enfocar('nec-como'); });
      return b;
    }

    /* Un texto del grupo (o del tema), con sus botones; el foco va al título del texto */
    async function mostrar(g, items, tema) {
      const mio = ++version;
      const it = siguiente(g.id + (tema ? ':' + tema.id : ''), items);
      /* la primera vez, con el libro sin abrir, puede tardar un poco: se avisa para que no parezca que no pasa nada */
      const espera = setTimeout(function () { a.avisar('Buscando el texto…'); }, 600);
      let caja;
      try { caja = it.tipo === 'salmo' ? await cajaSalmo(a, it.s) : await conBotones(await a.fragmento(it.x), it.x); }
      catch (e) {
        /* Revisión C7: si el capítulo no se puede abrir (por ejemplo, sin conexión y sin haberlo guardado), antes no pasaba nada */
        caja = el('p', {}, 'No se ha podido abrir este texto ahora. ', el('a', { href: it.tipo === 'salmo' ? '#/cancionero/' + it.s.n : '#/leer/' + it.x.cap + '/' + it.x.a }, 'Intentar abrirlo en el libro'));
      }
      finally { clearTimeout(espera); }
      if (mio !== version) return;
      const nodos = [el('h2', { id: 'nec-foco', tabindex: '-1', texto: g.nombre + ': ' + it.t })];
      if (tema) nodos.push(el('p', { class: 'buz-ayuda', texto: 'Tema: ' + tema.nombre + '.' }));
      nodos.push(caja);

      const botones = el('div', { class: 'buz-botones' });
      if (items.length > 1) {
        const otra = el('button', { type: 'button', class: 'boton' }, 'Otra', el('span', { class: 'solo-lector', texto: ' del grupo «' + g.nombre + '»' }));
        otra.addEventListener('click', function () { mostrar(g, items, tema); });
        botones.append(otra);
      }
      const todas = itemsDe(g, libro, salmos);
      const idLista = 'nec-todas';
      const ver = el('button', { type: 'button', class: 'boton secundario', 'aria-expanded': 'false', 'aria-controls': idLista }, 'Ver todas las de este grupo',
        el('span', { class: 'solo-lector', texto: ' «' + g.nombre + '»' }));
      const lista = el('ul', { id: idLista, hidden: 'hidden' });
      todas.forEach(function (z) {
        lista.append(el('li', {}, el('a', { href: z.tipo === 'salmo' ? '#/cancionero/' + z.s.n : '#/leer/' + z.x.cap + '/' + z.x.a }, z.t)));
      });
      ver.addEventListener('click', function () {
        const abrir = lista.hidden;
        lista.hidden = !abrir;
        ver.setAttribute('aria-expanded', abrir ? 'true' : 'false');
      });
      botones.append(ver);
      if (tema) {
        const otroTema = el('button', { type: 'button', class: 'boton secundario' }, 'Elegir otro tema');
        otroTema.addEventListener('click', function () { pintarTemas(g); });
        botones.append(otroTema);
      }
      nodos.push(botones, lista, volver());
      resultado.replaceChildren(...nodos);
      enfocar('nec-foco');
    }

    /* Ordenar y ocultar grupos */
    function pintarPanel(foco) {
      const todos = todosLosGrupos(), d = leer();
      const nodos = [el('h2', { id: 'nec-orden', texto: 'Ordenar y ocultar grupos' }),
        el('p', { texto: 'Aquí puedes quitar los grupos que no uses y cambiar su orden. Se guarda solo en este dispositivo y entra en la copia de seguridad de «Tus datos».' })];
      const ul = el('ul', { class: 'nec-orden' });
      const cambiar = function (fn, avisoTexto, nuevoFoco) {
        return function () {
          const dd = leer();
          dd.orden = todosLosGrupos().map(function (g) { return g.id; });
          fn(dd);
          if (!guardar(dd)) { a.avisar('No se ha podido guardar: el navegador no deja guardar datos.'); return; }
          const txt = typeof avisoTexto === 'function' ? avisoTexto() : avisoTexto;
          if (txt) a.avisar(txt);
          pintarGrupos();
          pintarPanel(nuevoFoco);
        };
      };
      todos.forEach(function (g, i) {
        const oculto = d.ocultos.indexOf(g.id) >= 0, idc = 'nec-v-' + i;
        const c = el('input', { type: 'checkbox', id: idc, 'data-foco': 'v:' + g.id });
        c.checked = !oculto;
        c.addEventListener('change', cambiar(function (dd) {
          dd.ocultos = dd.ocultos.filter(function (x) { return x !== g.id; });
          if (!c.checked) dd.ocultos.push(g.id);
        }, function () { return c.checked ? 'El grupo «' + g.nombre + '» vuelve a mostrarse.' : 'El grupo «' + g.nombre + '» queda oculto.'; }, 'v:' + g.id));
        const fila = el('div', { class: 'fav-acciones' });
        if (i > 0) {
          const s = el('button', { type: 'button', class: 'boton secundario', 'data-foco': 's:' + g.id }, 'Subir', el('span', { class: 'solo-lector', texto: ' «' + g.nombre + '»' }));
          s.addEventListener('click', cambiar(function (dd) { const o = dd.orden, k = o.indexOf(g.id); o.splice(k, 1); o.splice(k - 1, 0, g.id); },
            '«' + g.nombre + '» sube al puesto ' + i + ' de ' + todos.length + '.', 's:' + g.id));
          fila.append(s);
        }
        if (i < todos.length - 1) {
          const b = el('button', { type: 'button', class: 'boton secundario', 'data-foco': 'b:' + g.id }, 'Bajar', el('span', { class: 'solo-lector', texto: ' «' + g.nombre + '»' }));
          b.addEventListener('click', cambiar(function (dd) { const o = dd.orden, k = o.indexOf(g.id); o.splice(k, 1); o.splice(k + 1, 0, g.id); },
            '«' + g.nombre + '» baja al puesto ' + (i + 2) + ' de ' + todos.length + '.', 'b:' + g.id));
          fila.append(b);
        }
        ul.append(el('li', {}, el('div', { class: 'opcion' }, c, el('label', { for: idc, texto: 'Mostrar «' + g.nombre + '»' })), fila));
      });
      nodos.push(ul);
      const rest = el('button', { type: 'button', class: 'boton secundario', 'data-foco': 'r' }, 'Volver al orden de siempre y mostrar todos los grupos');
      rest.addEventListener('click', function () {
        const dd = leer();
        dd.ocultos = []; dd.orden = [];
        if (!guardar(dd)) { a.avisar('No se ha podido guardar: el navegador no deja guardar datos.'); return; }
        a.avisar('Los grupos han vuelto a su orden de siempre y se muestran todos.');
        pintarGrupos(); pintarPanel('r');
      });
      nodos.push(el('p', {}, rest));
      panel.replaceChildren(...nodos);
      if (foco) {
        const buscar = function (k) { return panel.querySelector('[data-foco="' + CSS.escape(k) + '"]'); };
        const parejas = { s: 'b', b: 's' };
        const f = buscar(foco) || (parejas[foco.charAt(0)] ? buscar(parejas[foco.charAt(0)] + foco.slice(1)) : null);
        if (f) f.focus();
      }
    }

    pintarGrupos();
    pintarPanel(null);
    return { nodo: raiz, titulo: 'Cuando lo necesites' };
  }

  window.JarisNecesito = { pantalla: pantalla, GRUPOS: GRUPOS, leer: leer, listaMostrada: listaMostrada, mostrarLista: mostrarLista,
    gruposSugeridos: gruposSugeridos, resolver: resolver, itemsDe: itemsDe, todosLosGrupos: todosLosGrupos };
})();
