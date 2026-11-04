/* Jaris: el buscador (paso 4a).
   Rutas: #/buscar (pantalla), #/buscar/texto/PALABRAS (buscar en todo el libro) y #/buscar/dios/NOMBRE (todo lo de un dios).
   - Busca sin internet: lee los capítulos que ya están guardados en el dispositivo y hace un índice por apartados
     la primera vez (luego se queda en memoria mientras la aplicación está abierta).
   - No distingue mayúsculas ni tildes, y también busca en griego (sin espíritus ni acentos).
   - Por dios: fiestas y días sagrados (calendario-datos.js), ritos, himnos, oraciones, audios y otros apartados.
     Cuando el Cancionero esté en la aplicación, sus salmos se añadirán aquí también.
   app.js pone la pantalla en la página y le pasa sus ayudas (el, libro, capitulo, DATOS). */
'use strict';
(function () {
  let A = null;           /* ayudas de app.js */
  let indice = null;      /* [{cap, a, titulo, capTitulo, texto, n}] */
  let preparando = null;

  /* Sin tildes ni mayúsculas; en griego, sin espíritus ni acentos y con la sigma final igual que la otra. */
  function norm(s) {
    return (s || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/ς/g, 'σ')
      .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  }
  function tieneTodas(textoNorm, palabras) {
    const t = ' ' + textoNorm + ' ';
    return palabras.every(function (p) { return t.indexOf(p) >= 0; });
  }
  function tienePalabra(textoNorm, palabra) { return (' ' + textoNorm + ' ').indexOf(' ' + palabra + ' ') >= 0; }

  /* ---------- Índice del libro por apartados ---------- */
  async function prepararIndice() {
    if (indice) return indice;
    if (preparando) return preparando;
    preparando = (async function () {
      const lista = [];
      for (const c of A.libro.capitulos) {
        if (Object.values(A.libro.indices).indexOf(c.cap) >= 0) continue; /* los índices del final no: repetirían todo */
        let html;
        try { html = await A.capitulo(c.cap); } catch (e) { continue; }
        const plantilla = document.createElement('template');
        plantilla.innerHTML = html;
        plantilla.content.querySelectorAll('section[id]').forEach(function (sec) {
          const h = sec.firstElementChild && /^H[1-6]$/.test(sec.firstElementChild.tagName) ? sec.firstElementChild : null;
          let texto = '';
          for (const hijo of Array.from(sec.children)) {
            if (hijo === h || hijo.tagName === 'SECTION') continue;
            const copia = hijo.cloneNode(true);
            /* Fuera los números de verso y las ilustraciones (su pie no es texto del apartado) */
            if (copia.tagName === 'FIGURE') continue;
            copia.querySelectorAll('[aria-hidden="true"], figure').forEach(function (n) { n.remove(); });
            texto += ' ' + copia.textContent;
          }
          texto = texto.replace(/\s+/g, ' ').trim();
          const titulo = h ? h.textContent.replace(/\s+/g, ' ').trim() : c.titulo;
          lista.push({ cap: c.cap, a: sec.id, titulo: titulo, capTitulo: c.titulo, texto: texto, nt: norm(titulo), n: norm(texto) });
        });
      }
      indice = lista;
      return lista;
    })();
    try { return await preparando; } finally { preparando = null; }
  }

  /* Un trozo del texto alrededor de la primera palabra encontrada, con las palabras marcadas para quien ve. */
  function trozo(texto, palabras) {
    const letras = Array.from(texto);
    const plano = letras.map(function (ch) { const x = ch.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace('ς', 'σ'); return x ? x[0] : ' '; }).join('');
    let pos = -1;
    for (const p of palabras) { const i = plano.indexOf(p); if (i >= 0 && (pos < 0 || i < pos)) pos = i; }
    if (pos < 0) pos = 0;
    let ini = Math.max(0, pos - 70), fin = Math.min(letras.length, pos + 150);
    while (ini > 0 && letras[ini - 1] !== ' ') ini--;
    while (fin < letras.length && letras[fin] !== ' ') fin++;
    const p = A.el('p', { class: 'bus-trozo' });
    if (ini > 0) p.append('…');
    /* Marca cada palabra buscada dentro del trozo (solo se ve; el lector lee el texto seguido). */
    const sub = plano.slice(ini, fin);
    const marcas = [];
    for (const w of palabras) { let i = sub.indexOf(w); while (i >= 0) { marcas.push([i, i + w.length]); i = sub.indexOf(w, i + w.length); } }
    marcas.sort(function (x, y) { return x[0] - y[0]; });
    let ultimo = 0;
    for (const [a, b] of marcas) {
      if (a < ultimo) continue;
      p.append(letras.slice(ini + ultimo, ini + a).join(''), A.el('mark', { texto: letras.slice(ini + a, ini + b).join('') }));
      ultimo = b;
    }
    p.append(letras.slice(ini + ultimo, fin).join(''));
    if (fin < letras.length) p.append('…');
    return p;
  }

  function formulario(valor) {
    const campo = A.el('input', { type: 'search', id: 'bus-campo', name: 'q', autocomplete: 'off', spellcheck: 'false', enterkeyhint: 'search' });
    if (valor) campo.value = valor;
    const form = A.el('form', { class: 'bus-form', role: 'search', 'aria-label': 'Buscar en el libro' },
      A.el('label', { for: 'bus-campo', texto: 'Buscar en todo el libro' }),
      A.el('p', { class: 'bus-ayuda', id: 'bus-ayuda', texto: 'Escribe una o varias palabras; salen los apartados que las tienen todas. Da igual con o sin tildes. También en griego.' }),
      A.el('div', { class: 'bus-fila' }, campo, A.el('button', { type: 'submit' }, 'Buscar')));
    campo.setAttribute('aria-describedby', 'bus-ayuda');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const q = campo.value.trim();
      if (!q) { A.avisar('Escribe algo para buscar.'); campo.focus(); return; }
      const nuevo = '#/buscar/texto/' + encodeURIComponent(q);
      /* Si se busca lo mismo otra vez, la ruta no cambia: se vuelve a pintar igualmente */
      if (location.hash === nuevo) window.dispatchEvent(new HashChangeEvent('hashchange')); else location.hash = nuevo;
    });
    return form;
  }

  /* Los dioses: los de los audios y los del calendario, sin repetir. «Las Musas» se busca como «Musas». */
  function dioses(d) {
    const nombres = new Set(['Atenea', 'Apolo', 'Ártemis', 'Hermes', 'Afrodita', 'Heracles', 'Eros', 'Poseidón', 'Teseo', 'Hécate',
      'Deméter', 'Perséfone', 'Dioniso', 'Zeus', 'Hera', 'Hefesto', 'Helios', 'Rea', 'Las Musas', 'Crono', 'Asclepio', 'Hestia', 'Selene', 'Pan', 'Prometeo']);
    if (d && d.dioses) Object.keys(d.dioses).forEach(function (x) { nombres.add(x); });
    return Array.from(nombres).sort(function (x, y) { return clave(x).localeCompare(clave(y), 'es'); });
  }
  function clave(nombre) { return nombre.replace(/^(Las|Los|La|El)\s+/, ''); }

  function enlace(x, conCapitulo) {
    const ruta = x.cap === 'cancionero' ? '#/cancionero/' + String(x.a || '').replace('salmo-', '') : '#/leer/' + x.cap + (x.a ? '/' + x.a : '');
    const li = A.el('li', {}, A.el('a', { href: ruta }, x.titulo || x.t));
    if (conCapitulo && x.capTitulo) li.append(A.el('span', { class: 'bus-cap', texto: ' (' + x.capTitulo + ')' }));
    return li;
  }
  function grupo(titulo, items) {
    return A.el('section', { class: 'bus-grupo' }, A.el('h2', { texto: titulo + ' (' + items.length + ')' }), A.el('ul', {}, ...items));
  }
  function aviso(caja, texto) { caja.append(A.el('p', { texto: texto })); }

  /* ---------- Pantalla de inicio: el campo de búsqueda y la lista de dioses ---------- */
  async function inicio() {
    const d = window.JarisAudios ? await window.JarisAudios.cargar().catch(function () { return null; }) : null;
    const caja = A.el('div', { class: 'buscar' }, A.el('h1', { texto: 'Buscar' }), formulario(''));
    const ul = A.el('ul', { class: 'bus-dioses' });
    for (const n of dioses(d)) ul.append(A.el('li', {}, A.el('a', { href: '#/buscar/dios/' + encodeURIComponent(n) }, n)));
    caja.append(A.el('section', { 'aria-labelledby': 'bus-por-dios' },
      A.el('h2', { id: 'bus-por-dios', texto: 'Por dios' }),
      A.el('p', { texto: 'Todo lo de cada dios junto: sus fiestas y días, ritos, himnos, oraciones, audios y lo que cuenta el libro de él o de ella.' }),
      ul));
    return { nodo: caja, titulo: 'Buscar', destino: null };
  }

  /* ---------- Buscar palabras en todo el libro ---------- */
  async function porTexto(q) {
    const palabras = norm(q).split(' ').filter(Boolean);
    const caja = A.el('div', { class: 'buscar' }, A.el('h1', { texto: 'Buscar' }), formulario(q));
    if (!palabras.length) { aviso(caja, 'Escribe una o varias palabras en el campo de arriba.'); return { nodo: caja, titulo: 'Buscar', destino: null }; }
    let todo;
    try { todo = await prepararIndice(); }
    catch (e) { aviso(caja, 'No se ha podido preparar el buscador. Si es la primera vez que abres Jaris, hace falta internet hasta que se guarde entera.'); return { nodo: caja, titulo: 'Buscar', destino: null }; }
    /* En el orden del libro; dentro de cada capítulo, primero los que lo llevan en el título. */
    const porCap = new Map();
    for (const x of todo) {
      const t = tieneTodas(x.nt, palabras);
      if (!t && !tieneTodas(x.nt + ' ' + x.n, palabras)) continue;
      if (!porCap.has(x.cap)) porCap.set(x.cap, [[], []]);
      porCap.get(x.cap)[t ? 0 : 1].push(x);
    }
    const res = [];
    for (const [a, b] of porCap.values()) res.push(...a, ...b);
    const MAX = 200;
    const h2 = A.el('h2', { id: 'bus-resultados', texto: res.length ? (res.length === 1 ? 'Un apartado' : res.length + ' apartados') + ' con «' + q + '»' : 'No se ha encontrado «' + q + '»' });
    const sec = A.el('section', { 'aria-labelledby': 'bus-resultados' }, h2);
    if (!res.length) sec.append(A.el('p', { texto: 'Prueba con menos palabras, con una parte de la palabra (por ejemplo, «liba» para libación) o busca por dios con el enlace de abajo.' }));
    if (res.length > MAX) sec.append(A.el('p', { texto: 'Se ven los ' + MAX + ' primeros. Para afinar, añade otra palabra.' }));
    if (res.length) sec.append(A.el('p', { texto: 'Por capítulos, en el orden del libro (cada capítulo es un título de nivel 3). En cada uno, primero los apartados que lo llevan en el título.' }));
    /* Agrupados por capítulo, cada capítulo con su título h3, en el orden en que salen */
    let capActual = null, ul = null;
    for (const x of res.slice(0, MAX)) {
      if (x.capTitulo !== capActual) { capActual = x.capTitulo; ul = A.el('ul'); sec.append(A.el('h3', { texto: capActual }), ul); }
      const li = A.el('li', {}, A.el('a', { href: '#/leer/' + x.cap + '/' + x.a }, x.titulo));
      if (x.texto) li.append(trozo(x.texto, palabras));
      ul.append(li);
    }
    caja.append(sec, A.el('p', {}, A.el('a', { href: '#/buscar' }, 'Buscar por dios')));
    return { nodo: caja, titulo: 'Buscar: ' + q, destino: h2 };
  }

  /* ---------- Todo lo de un dios ---------- */
  function cuando(f) {
    const dia = function (x) { return x === 'ultimo' ? 'el último día' : 'el día ' + x; };
    if (f.solsticio) return 'en el solsticio de ' + f.solsticio;
    if (!f.desde) return 'en ' + f.mes + ' (no se sabe el día)';
    if (f.hasta) return 'en ' + f.mes + ', del ' + (f.desde) + ' al ' + (f.hasta === 'ultimo' ? 'último día' : f.hasta);
    return 'en ' + f.mes + ', ' + dia(f.desde);
  }
  async function porDios(nombre) {
    const w = norm(clave(nombre));
    const caja = A.el('div', { class: 'buscar' }, A.el('h1', { texto: nombre }));
    let todo = [];
    try { todo = await prepararIndice(); } catch (e) { /* se ve lo que haya */ }
    const d = window.JarisAudios ? await window.JarisAudios.cargar().catch(function () { return null; }) : null;
    const nombra = function (s) { return tienePalabra(norm(s), w); };
    const grupos = [], resumen = [];
    const poner = function (titulo, items, singular) {
      if (!items.length) return;
      grupos.push(grupo(titulo, items));
      resumen.push(items.length + ' ' + (items.length === 1 ? singular : titulo.toLowerCase()));
    };
    /* Fiestas y días sagrados (capítulo 8) */
    const fiestas = [];
    const D = A.DATOS || {};
    (D.DIAS_SAGRADOS || []).forEach(function (s) {
      if (nombra(s.texto)) fiestas.push(A.el('li', { texto: (s.dia === 'ultimo' ? 'Último día' : 'Día ' + s.dia) + ' de cada mes: ' + s.texto + (s.nota ? ' (' + s.nota + ')' : '') + '.' }));
    });
    (D.FIESTAS || []).concat(D.FIESTAS_DEL_SOL || []).forEach(function (f) {
      if (nombra(f.nombre + ' ' + f.texto)) fiestas.push(A.el('li', { texto: f.nombre + ', ' + cuando(f) + ': ' + f.texto + (f.nota ? ' (' + f.nota + ')' : '') + '.' }));
    });
    if (fiestas.length) {
      const g = grupo('Fiestas y días sagrados', fiestas);
      g.append(A.el('p', {}, A.el('a', { href: '#/calendario' }, 'Ver en el calendario cuándo caen este año')));
      grupos.push(g); resumen.push(fiestas.length + (fiestas.length === 1 ? ' fiesta o día sagrado' : ' fiestas y días sagrados'));
    }
    const vistos = new Set();
    const marcar = function (cap, a) { vistos.add(cap + '/' + a); };
    /* Ritos: los apartados «Rito ...» que lo nombran (en el título o en el texto) */
    const ritos = todo.filter(function (x) { return /^rito\s/.test(x.nt) && tienePalabra(x.nt + ' ' + x.n, w); });
    ritos.forEach(function (x) { marcar(x.cap, x.a); });
    poner('Ritos', ritos.map(function (x) { return enlace(x, false); }), 'rito');
    /* Himnos y oraciones (las listas del libro) */
    const himnos = A.libro.himnos.filter(function (x) { return nombra(x.t); });
    himnos.forEach(function (x) { marcar(x.cap, x.a); });
    poner('Himnos', himnos.map(function (x) { return enlace(x, false); }), 'himno');
    /* Oraciones: las que lo nombran en el título o en su texto (muchas se titulan por el momento: «Antes de un examen») */
    const textoDe = new Map(todo.map(function (x) { return [x.cap + '/' + x.a, x.n]; }));
    const oraciones = A.libro.oraciones.filter(function (x) {
      return (nombra(x.t) || tienePalabra(textoDe.get(x.cap + '/' + x.a) || '', w)) && !vistos.has(x.cap + '/' + x.a);
    });
    oraciones.forEach(function (x) { marcar(x.cap, x.a); });
    poner('Oraciones', oraciones.map(function (x) { return enlace(x, false); }), 'oración');
    /* Salmos del Cancionero (cancionero.js): los de ese dios o que lo nombran */
    if (window.JarisCancionero) {
      try {
        const salmos = await window.JarisCancionero.salmosDe(null, function (s) {
          return (s.dioses || []).some(function (x) { return norm(clave(x)) === w; }) || nombra(s.titulo + ' ' + s.cuando);
        });
        poner('Salmos del Cancionero', salmos.map(function (s) { return enlace({ cap: 'cancionero', a: s.id, titulo: s.titulo }, false); }), 'salmo del Cancionero');
      } catch (e) { /* sin Cancionero: no pasa nada */ }
    }
    /* Audios (audios.json): para escucharlos, el enlace lleva a su texto; para descargarlos, a la pantalla Audios */
    const ids = d && d.dioses && d.dioses[nombre] ? d.dioses[nombre] : [];
    if (ids.length) {
      const items = ids.map(function (id) { return d.audios.find(function (a) { return a.id === id; }); }).filter(Boolean)
        .map(function (a) { return enlace({ cap: a.cap, a: a.a, titulo: a.titulo + (a.version ? ', ' + a.version : '') }, false); });
      const g = grupo('Audios', items);
      g.append(A.el('p', {}, A.el('a', { href: '#/audios/dios/' + encodeURIComponent(nombre) }, 'Descargar los audios de ' + nombre + ' para escucharlos sin internet')));
      grupos.push(g); resumen.push(items.length + (items.length === 1 ? ' audio' : ' audios'));
    }
    /* Otros apartados del libro con su nombre en el título (mitos, la ficha del dios, preguntas...) */
    const otros = todo.filter(function (x) { return tienePalabra(x.nt, w) && !vistos.has(x.cap + '/' + x.a); });
    poner('Otros apartados del libro', otros.map(function (x) { return enlace(x, true); }), 'apartado más');
    /* Y cuántos apartados lo nombran en el texto */
    const enTexto = todo.filter(function (x) { return tienePalabra(x.nt + ' ' + x.n, w); }).length;

    if (!grupos.length && !enTexto) caja.append(A.el('p', { texto: 'No se ha encontrado nada de ' + nombre + ' en el libro.' }));
    else caja.append(A.el('p', { texto: resumen.length ? 'En Jaris: ' + resumen.join(', ') + '. Cada grupo es un título de nivel 2.' : 'No tiene apartados propios, pero se nombra en el libro.' }));
    caja.append(...grupos);
    if (enTexto) caja.append(A.el('p', {}, A.el('a', { href: '#/buscar/texto/' + encodeURIComponent(clave(nombre)) }, (enTexto === 1 ? 'Ver el apartado que nombra a ' : 'Ver los ' + enTexto + ' apartados que nombran a ') + nombre + ' en el texto')));
    caja.append(A.el('p', {}, A.el('a', { href: '#/buscar' }, 'Volver a Buscar')));
    return { nodo: caja, titulo: nombre, destino: null };
  }

  /* app.js llama a esto con las partes de la ruta (#/buscar/...) y sus ayudas. */
  async function pantalla(partes, ayudas) {
    A = ayudas;
    if (partes[1] === 'texto') return porTexto(partes.slice(2).join('/'));
    if (partes[1] === 'dios' && partes[2]) return porDios(partes[2]);
    return inicio();
  }

  window.JarisBuscar = { pantalla: pantalla, norm: norm };
})();
