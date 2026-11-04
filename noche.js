/* Jaris: el rincón de la noche (extra). Ruta: #/noche.
   Todo sale del libro en cada momento (por el título de cada texto), así que si el libro cambia, esto cambia solo:
   - la oración de esta noche: una de las oraciones de la noche del capítulo 6, distinta cada noche (sale de la fecha);
   - el repaso amable del día (Versos de oro de Pitágoras), que se puede guardar en el diario de hoy;
   - los himnos órficos de la noche (Nyx, Hipnos, Oneiro) y el rito «Al terminar el día»;
   - qué día griego empieza esta noche y qué se celebra;
   - un temporizador para que el audio se pare solo. */
'use strict';
(function () {
  const DIA_MS = 86400000;
  let temporizador = null, finTemporizador = 0, minutosElegidos = 0;

  const MARCAS = new RegExp('[\\u0300-\\u036f]', 'g');   // tildes y otras marcas, para comparar sin ellas
  function normal(s) { return (s || '').toLowerCase().normalize('NFD').replace(MARCAS, ''); }
  /* Las de cada noche («Al terminar el día», «Antes de dormir») y las de cuando cuesta dormir. */
  function oracionesDeNoche(libro) {
    const todas = libro.oraciones.filter(function (o) { return /dormir|terminar el dia|madrugada/.test(normal(o.t)); });
    return {
      cada: todas.filter(function (o) { return /^(al terminar el dia|antes de dormir)$/.test(normal(o.t)); }),
      otras: todas.filter(function (o) { return !/^(al terminar el dia|antes de dormir)$/.test(normal(o.t)); }),
    };
  }
  function himnosDeNoche(libro) {
    return libro.himnos.filter(function (h) { return /^himno orfico (3|85|86)\./.test(normal(h.t)); });
  }
  /* El rito «Al terminar el día» del Libro de ritos (se busca por su título en los capítulos de ritos). */
  async function ritoDeLaNoche(a) {
    const caps = a.libro.capitulos.filter(function (c) { return /ritos/i.test(c.titulo) && !/indice|índice/i.test(c.titulo); });
    for (const c of caps) {
      try {
        const html = await a.capitulo(c.cap);
        const m = /<section id="([^"]+)"[^>]*>\s*<h\d>(Rito \d+\. Al terminar el d[^<]*)<\/h\d>/i.exec(html);
        if (m) return { t: m[2], cap: c.cap, a: m[1] };
      } catch (e) { /* sin ese capítulo: se sigue */ }
    }
    return null;
  }
  function capituloVersosDeOro(libro) {
    return libro.capitulos.find(function (c) { return /versos de oro/i.test(c.titulo) && /^cap/i.test(c.titulo); }) || null;
  }
  function enlace(el, x, texto) { return el('a', { href: '#/leer/' + x.cap + '/' + x.a }, texto || x.t); }

  /* Botones de audio y de favoritos para un texto (los mismos que en «Hoy»). */
  async function conBotones(caja, x) {
    if (window.JarisFavoritos) { try { caja.prepend(window.JarisFavoritos.botonPara(x)); } catch (e) { /* nada */ } }
    if (window.JarisAudios) { try { const b = await window.JarisAudios.botonesPara(x.cap, x.a); if (b) caja.prepend(b); } catch (e) { /* nada */ } }
    return caja;
  }

  async function pantalla(a) {
    const el = a.el, libro = a.libro, n = a.noche();
    const raiz = el('div', { class: 'noche' });
    raiz.append(el('h1', { texto: 'El rincón de la noche' }),
      el('p', { texto: 'Para antes de dormir, con calma: una oración, un repaso amable del día y lo que empieza esta noche. Si quieres, pon el modo oscuro del dispositivo.' }));

    // Esta noche: el día griego empieza al ponerse el sol
    raiz.append(el('h2', { texto: 'Esta noche' }), el('p', {},
      (n.yaEmpezo ? 'Desde la puesta del sol (hacia las ' + n.hora + ') ya es el ' : 'Esta tarde, al ponerse el sol (hacia las ' + n.hora + '), empieza el ') +
      n.griego + ': ' + n.resumen + '. ', el('a', { href: n.ruta }, 'Ver qué se hace ese día')));

    // La oración de esta noche (la misma para todo el mundo esa noche)
    const oraciones = oracionesDeNoche(libro);
    if (oraciones.cada.length) {
      const o = oraciones.cada[((n.base % oraciones.cada.length) + oraciones.cada.length) % oraciones.cada.length];
      const texto = await conBotones(await a.fragmento(o), o);
      raiz.append(el('section', { 'aria-labelledby': 'noche-oracion' }, el('h2', { id: 'noche-oracion', texto: 'Oración de esta noche: ' + o.t }), texto));
    }

    // Repaso amable del día
    raiz.append(repaso(a, n));

    // Si no puedes dormir
    if (oraciones.otras.length) {
      const ul = el('ul');
      oraciones.otras.forEach(function (o) { ul.append(el('li', {}, enlace(el, o))); });
      raiz.append(el('h2', { texto: 'Si no puedes dormir' }), el('p', { texto: 'Oraciones del libro para cuando cuesta dormirse o te despiertas de madrugada:' }), ul);
    }

    // Himnos de la noche y el rito corto
    const himnos = himnosDeNoche(libro);
    if (himnos.length) {
      const sec = el('section', { 'aria-labelledby': 'noche-himnos' }, el('h2', { id: 'noche-himnos', texto: 'Himnos de la noche' }),
        el('p', { texto: 'A la Noche, al Sueño y a los sueños, para leer o escuchar.' }));
      for (const h of himnos) {
        const caja = await conBotones(el('div'), h);
        sec.append(el('h3', {}, enlace(el, h)), caja);
      }
      raiz.append(sec);
    }
    const rito = await ritoDeLaNoche(a);
    if (rito) raiz.append(el('h2', { texto: 'Un rito corto' }), el('p', {}, 'Si quieres cerrar el día con un pequeño rito: ', enlace(el, rito), '.'));

    // Temporizador
    raiz.append(temporizadorUI(a));
    raiz.append(el('p', { class: 'noche-final', texto: 'Buenas noches. Que descanses.' }));
    return { nodo: raiz, titulo: 'El rincón de la noche' };
  }

  /* El repaso del día de los Versos de oro, en su forma amable; se puede guardar en el diario de hoy. */
  function repaso(a, n) {
    const el = a.el, sec = el('section', { 'aria-labelledby': 'noche-repaso', class: 'diario' });
    sec.append(el('h2', { id: 'noche-repaso', texto: 'Repaso del día' }));
    const cap = capituloVersosDeOro(a.libro);
    const intro = el('p', { texto: 'Los Versos de oro de Pitágoras aconsejan no dormirse sin repasar el día. Aquí, en su forma amable: lo bueno, lo que agradeces y lo que harás mañana, sin dar vueltas a los fallos. ' });
    if (cap) intro.append(el('a', { href: '#/leer/' + cap.cap }, 'Leer los Versos de oro'));
    sec.append(intro);
    const campos = [['bien', 'Qué ha ido bien hoy'], ['gracias', 'Doy las gracias por'], ['manana', 'Qué haré mañana']].map(function (c) {
      const t = el('textarea', { id: 'noche-' + c[0], rows: '3' });
      sec.append(el('label', { for: 'noche-' + c[0], class: 'buz-etiqueta', texto: c[1] }), t);
      return t;
    });
    const guardar = el('button', { type: 'button', texto: 'Guardar en mi diario de hoy' });
    const despues = el('p', { hidden: 'hidden' }, el('a', { href: '#/diario/' + (window.JarisDiario ? window.JarisDiario.iso(n.base) : '') }, 'Abrir mi diario de hoy'));
    guardar.addEventListener('click', function () {
      const bien = campos[0].value.trim(), gracias = campos[1].value.trim(), manana = campos[2].value.trim();
      if (!bien && !gracias && !manana) { a.avisar('Escribe algo en el repaso antes de guardarlo.'); campos[0].focus(); return; }
      if (!window.JarisDiario) { a.avisar('No se ha podido abrir el diario.'); return; }
      const libre = [bien ? 'Lo que ha ido bien hoy: ' + bien : '', manana ? 'Mañana: ' + manana : ''].filter(Boolean).join('\n');
      const hecho = window.JarisDiario.anadir(n.base, a.dia(n.base).griego, { gracias: gracias, libre: libre });
      if (!hecho) { a.avisar('No se ha podido guardar: el navegador no deja guardar datos.'); return; }
      campos.forEach(function (t) { t.value = ''; });
      despues.hidden = false;
      a.avisar('Guardado en tu diario de hoy.');
    });
    sec.append(el('p', { class: 'buz-ayuda', texto: 'Se añade a lo que ya tengas escrito hoy en tu diario (lo agradecido, en «Gratitud»; lo demás, en «Escritura libre»). Si no lo guardas, no se guarda en ningún sitio.' }),
      el('div', { class: 'buz-botones' }, guardar), despues);
    return sec;
  }

  /* Temporizador: el audio que suene se para solo (sigue funcionando aunque se cambie de pantalla). */
  function temporizadorUI(a) {
    const el = a.el, sec = el('section', { 'aria-labelledby': 'noche-temp', class: 'diario' });
    sec.append(el('h2', { id: 'noche-temp', texto: 'Para que el audio se pare solo' }),
      el('p', { texto: 'Si escuchas un himno o una oración para dormirte, el audio se parará solo cuando digas.' }));
    const sel = el('select', { id: 'noche-tiempo', 'aria-describedby': 'noche-tiempo-estado' });
    [['0', 'No parar'], ['15', 'Dentro de 15 minutos'], ['30', 'Dentro de 30 minutos'], ['45', 'Dentro de 45 minutos'], ['60', 'Dentro de 1 hora']]
      .forEach(function (o) { sel.append(el('option', { value: o[0], texto: o[1] })); });
    const estado = el('p', { id: 'noche-tiempo-estado', class: 'buz-ayuda' });
    const hora = new Intl.DateTimeFormat('es-ES', { hour: 'numeric', minute: '2-digit' });
    function pintar() {
      estado.textContent = temporizador ? 'El audio se parará a las ' + hora.format(new Date(finTemporizador)) + '.' : 'Ahora no hay temporizador.';
    }
    sel.addEventListener('change', function () {
      clearTimeout(temporizador); temporizador = null;
      const min = +sel.value;
      if (min) {
        minutosElegidos = min;
        finTemporizador = Date.now() + min * 60000;
        temporizador = setTimeout(function () {
          temporizador = null;
          const paro = window.JarisAudios && window.JarisAudios.pausar();
          a.avisar(paro ? 'Audio parado. Buenas noches.' : 'Se ha acabado el tiempo del temporizador.');
          const s = document.getElementById('noche-tiempo'); if (s) s.value = '0';
          const e = document.getElementById('noche-tiempo-estado'); if (e) e.textContent = 'Ahora no hay temporizador.';
        }, min * 60000);
        a.avisar('El audio se parará dentro de ' + (min === 60 ? '1 hora' : min + ' minutos') + '.');
      } else a.avisar('Temporizador quitado.');
      pintar();
    });
    if (temporizador) sel.value = String(minutosElegidos);
    pintar();
    sec.append(el('label', { for: 'noche-tiempo', class: 'buz-etiqueta', texto: 'Parar el audio' }), sel, estado);
    return sec;
  }

  window.JarisNoche = { pantalla: pantalla };
})();
