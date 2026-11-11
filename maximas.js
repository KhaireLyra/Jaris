/* Jaris: la máxima de la semana, en la pantalla «Hoy» (sesión B, parte 4; 7 de noviembre de 2026).
   Solo las 129 máximas que eligió la autora para el ejercicio (las 18 que quedan fuera siguen en el libro, capítulo 23).
   Dos formas de elegir, como dice el capítulo 23: al azar entre todas, o según el momento (por grupos).
   La máxima dura de lunes a domingo; se puede pedir otra. Lo elegido se guarda SOLO en este dispositivo (localStorage «jaris.maxima»).
   El botón del diario añade lo que escribas al diario de hoy, en su propio apartado (campo «maxima»; diario.js lo enseña, lo deja corregir
   y lo busca, y app.js lo exporta en el archivo del diario). */
'use strict';
(function () {
  const CLAVE = 'jaris.maxima';
  const GRUPOS = [
    { id: 'dioses', nombre: 'Con los dioses', m: [[1, 'Sigue a la divinidad.'], [3, 'Venera a los dioses.'], [13, 'Honra el hogar (a Hestia).'],
      [18, 'Honra la providencia.'], [36, 'Guarda silencio en lo sagrado (habla con respeto en los ritos).'], [49, 'Distingue lo que es sagrado.'],
      [52, 'Pide lo que sea posible.'], [76, 'Pide a los dioses la buena suerte.'], [106, 'Sé agradecido.'], [115, 'Practica el silencio respetuoso.'],
      [123, 'Respeta los oráculos.'], [131, 'Honra a tus antepasados con coronas.'], [134, 'No te burles de los muertos.'], [140, 'No hagas daño a los muertos.']] },
    { id: 'calma', nombre: 'Calma', m: [[16, 'Controla tu ira.'], [38, 'Nada en exceso.'], [60, 'No envidies a nadie.'],
      [68, 'Reconoce el papel de la fortuna.'], [73, 'Disfruta de lo que tienes.'], [77, 'Acepta tu suerte.'], [90, 'Vive sin pena.'],
      [113, 'Acepta la vejez.'], [129, 'Respétate a ti mismo.'], [137, 'No te entristezcas por todo.'], [147, 'Al morir, sé libre de pena.']] },
    { id: 'dificiles', nombre: 'Días difíciles', m: [[62, 'Alaba la esperanza.'], [92, 'Llega hasta el final sin acobardarte.'],
      [133, 'No te disgustes con la vida.'], [135, 'Acompaña en su pena a quien sufre una desgracia.']] },
    { id: 'estudiar', nombre: 'Estudiar y aprender', m: [[6, 'Comprende lo que has aprendido.'], [7, 'Comprende lo que oyes.'],
      [21, 'Aférrate a la educación.'], [23, 'Desea la sabiduría.'], [35, 'Escucha a todos.'], [48, 'Sé amante de la sabiduría.'],
      [53, 'Consulta a los sabios.'], [78, 'Observa lo que oyes.'], [121, 'No te canses de aprender.'], [127, 'Enseña a los jóvenes.']] },
    { id: 'conocerse', nombre: 'Conocerse y cuidarse', m: [[8, 'Sé tú mismo.'], [11, 'Piensa como un mortal.'], [14, 'Gobiérnate a ti mismo.'],
      [41, 'Desprecia la soberbia (hybris (se dice "ívris")).'], [83, 'Rechaza la soberbia.'], [96, 'Hazte el bien a ti mismo.'],
      [101, 'Arrepiéntete de tus errores.'], [114, 'No presumas de fuerza.'], [141, 'Cuando te vaya bien, recuerda que eres mortal.'],
      [144, 'De joven, sé dueño de ti.'], [145, 'De adulto, sé justo.'], [146, 'De anciano, sé sensato.']] },
    { id: 'decidir', nombre: 'Decidir y empezar algo', m: [[10, 'Reconoce el momento oportuno.'], [17, 'Cultiva la prudencia.'],
      [39, 'Aprovecha bien el tiempo.'], [40, 'Prevé el futuro.'], [50, 'Actúa cuando sepas.'], [57, 'Usa tu oficio.'],
      [79, 'Trabaja por lo que puedes conseguir.'], [99, 'Esfuérzate por una gloria honrosa.'], [100, 'Actúa sin arrepentirte.'],
      [103, 'Piénsalo con tiempo.'], [104, 'Actúa con rapidez.'], [110, 'Busca lo que te conviene.'], [111, 'Aprovecha la ocasión.'],
      [120, 'Arriésgate con prudencia.'], [142, 'No confíes en la suerte.']] },
    { id: 'amistad', nombre: 'Amistad', m: [[15, 'Ayuda a tus amigos.'], [20, 'Ama la amistad.'], [28, 'Sé benévolo con tus amigos.'],
      [37, 'Haz favores a tus amigos.'], [75, 'Devuelve los favores.'], [105, 'Protege la amistad.']] },
    { id: 'convivir', nombre: 'Convivir con los demás', m: [[12, 'Si eres forastero, compórtate como tal.'], [32, 'Sé abierto con todos.'],
      [42, 'Respeta a los suplicantes.'], [43, 'Adáptate a todos.'], [54, 'Pon a prueba el carácter.'], [56, 'No mires a nadie con recelo.'],
      [59, 'Honra a quien te hace un bien.'], [65, 'Honra a los buenos.'], [74, 'Respeta la vergüenza (el pudor y la decencia).'],
      [80, 'Odia la discordia.'], [89, 'No te apoyes en la fuerza.'], [91, 'Convive con amabilidad.'], [93, 'Sé amable con todos.'],
      [97, 'Sé cortés.'], [107, 'Busca la concordia.'], [112, 'Acaba con las enemistades.'], [116, 'Huye del odio.'],
      [130, 'No seas el primero en ofender.'], [136, 'Ayuda sin hacer daño.']] },
    { id: 'palabras', nombre: 'Las palabras', m: [[19, 'No uses juramentos.'], [24, 'Alaba lo que es bueno.'], [25, 'No culpes a nadie.'],
      [26, 'Elogia la virtud.'], [47, 'Habla bien de todos.'], [63, 'Odia la calumnia.'], [70, 'Habla con claridad.'], [82, 'Contén la lengua.'],
      [87, 'Acusa a quien está presente (no hables a espaldas de nadie).'], [88, 'Habla cuando sepas.'], [98, 'Responde a su debido tiempo.'],
      [108, 'Guarda en secreto lo que no se debe decir.'], [125, 'No te pelees con quien no está presente.'], [139, 'No prometas nada a nadie.']] },
    { id: 'justicia', nombre: 'Justicia y honradez', m: [[2, 'Obedece la ley.'], [5, 'Déjate vencer por lo que es justo.'], [27, 'Haz lo que es justo.'],
      [30, 'Cultiva la nobleza.'], [31, 'Apártate del mal.'], [34, 'No te quedes con lo ajeno.'], [51, 'Evita matar.'],
      [55, 'Devuelve lo que te han prestado.'], [84, 'Juzga con justicia.'], [86, 'Juzga sin dejarte sobornar.'], [119, 'Odia el mal.']] },
    { id: 'dinero', nombre: 'Dinero y cosas', m: [[33, 'Cuida lo que es tuyo.'], [45, 'Da de lo que tienes.'], [58, 'Lo que vayas a dar, dalo.'],
      [64, 'Gana con justicia.'], [69, 'Huye de dar garantías.'], [72, 'Controla tus gastos.'], [85, 'Usa lo que tienes.'],
      [117, 'Hazte rico con justicia.'], [122, 'No dejes de ahorrar.'], [128, 'No confíes en la riqueza.']] },
    { id: 'familia', nombre: 'Familia y mayores', m: [[4, 'Respeta a tus padres.'], [124, 'Quiere a quienes crías.'], [126, 'Respeta a los mayores.']] },
  ];
  const TODAS = [];
  GRUPOS.forEach(function (g) { g.m.forEach(function (x) { TODAS.push({ n: x[0], t: x[1], grupo: g }); }); });
  TODAS.sort(function (a, b) { return a.n - b.n; });
  function buscar(n) { return TODAS.find(function (x) { return x.n === n; }) || null; }
  function grupoDe(id) { return GRUPOS.find(function (g) { return g.id === id; }) || null; }

  function leer() {
    try { const v = JSON.parse(localStorage.getItem(CLAVE)); if (v && typeof v === 'object' && !Array.isArray(v)) return v; } catch (e) { /* nada */ }
    return {};
  }
  function escribir(v) { try { localStorage.setItem(CLAVE, JSON.stringify(v)); return true; } catch (e) { return false; } }

  /* Las semanas van de lunes a domingo. El día civil 0 (1 de enero de 1970) fue jueves. */
  function semanaDe(civil) { return Math.floor((civil + 3) / 7); }
  function lunesDe(semana) { return semana * 7 - 3; }
  function lista(e) {
    const g = e.forma === 'momento' ? grupoDe(e.grupo) : null;
    return g ? g.m.map(function (x) { return x[0]; }) : TODAS.map(function (x) { return x.n; });
  }
  /* Sortea una máxima de la lista que toca, sin repetir las que ya han salido hasta que salgan todas. */
  function sortear(e, evitar) {
    const todas = lista(e);
    let vistas = Array.isArray(e.vistas) ? e.vistas.filter(function (n) { return typeof n === 'number'; }) : [];
    let libres = todas.filter(function (n) { return vistas.indexOf(n) < 0 && n !== evitar; });
    if (!libres.length) {
      vistas = vistas.filter(function (n) { return todas.indexOf(n) < 0; });   // se empieza otra vuelta en esta lista
      libres = todas.filter(function (n) { return n !== evitar; });
      if (!libres.length) libres = todas;
    }
    e.num = libres[Math.floor(Math.random() * libres.length)];
    e.vistas = vistas.concat([e.num]).slice(-200);
  }
  /* La máxima de esta semana: si la semana ha cambiado (o lo guardado no vale), sale una nueva. */
  function deLaSemana(civil) {
    const e = leer(), s = semanaDe(civil);
    if (e.forma !== 'momento') e.forma = 'azar';
    if (e.forma === 'momento' && !grupoDe(e.grupo)) e.grupo = 'calma';
    if (e.semana !== s || !buscar(e.num) || lista(e).indexOf(e.num) < 0) {
      sortear(e);
      e.semana = s;
      escribir(e);
    }
    return e;
  }

  const fDia = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  function fecha(civil) { return fDia.format(new Date(civil * 86400000)).replace(',', ''); }   // «lunes 2 de noviembre», sin la coma

  /* La sección de la pantalla «Hoy». a = { el, avisar, civil, griego, rutaLibro } (rutaLibro: el capítulo 23, si se encuentra). */
  function seccion(a) {
    const el = a.el, e = deLaSemana(a.civil), lunes = lunesDe(e.semana);
    const sec = el('section', { class: 'maxima-semana', 'aria-labelledby': 'maxima-titulo' },
      el('h2', { id: 'maxima-titulo', texto: 'La máxima de la semana' }),
      el('p', { texto: 'Una de las máximas de Delfos, para pensar en ella toda la semana: del ' + fecha(lunes) + ' al ' + fecha(lunes + 6) + '.' }));
    const fuerte = el('strong');
    const pTexto = el('p', { class: 'maxima', id: 'maxima-texto' }, fuerte);
    const pGrupo = el('p', { id: 'maxima-grupo' });
    sec.append(pTexto, pGrupo);

    // Cómo se elige: al azar o según el momento (por grupos)
    const formas = el('fieldset', { class: 'buz-tipos' }, el('legend', { texto: 'Cómo se elige la máxima' }));
    [['azar', 'Al azar, entre todas (' + TODAS.length + ' máximas)'], ['momento', 'Según el momento: eliges un grupo']].forEach(function (o) {
      const id = 'maxima-forma-' + o[0], r = el('input', { type: 'radio', name: 'maxima-forma', id: id, value: o[0] });
      r.checked = e.forma === o[0];
      formas.append(el('div', { class: 'buz-opcion' }, r, el('label', { for: id, texto: o[1] })));
    });
    const selGrupo = el('select', { id: 'maxima-grupo-elegido' });
    GRUPOS.forEach(function (g) { selGrupo.append(el('option', { value: g.id, texto: g.nombre + ' (' + g.m.length + (g.m.length === 1 ? ' máxima)' : ' máximas)') })); });
    selGrupo.value = e.grupo || 'calma';
    const cajaGrupo = el('div', { class: 'maxima-elegir-grupo' }, el('label', { for: 'maxima-grupo-elegido', class: 'buz-etiqueta', texto: 'Para qué momento' }), selGrupo);
    cajaGrupo.hidden = e.forma !== 'momento';
    formas.append(cajaGrupo);
    sec.append(formas);

    // Botones: otra máxima y escribir en el diario
    const otra = el('button', { type: 'button', class: 'secundario', texto: 'Otra máxima' });
    const abrir = el('button', { type: 'button', 'aria-expanded': 'false', 'aria-controls': 'maxima-diario', texto: 'Escribir en mi diario lo que significa para mí' });
    sec.append(el('ul', { class: 'botones' }, el('li', {}, otra), el('li', {}, abrir)));

    // El hueco para escribir (oculto hasta pulsar el botón)
    const etiqueta = el('label', { for: 'maxima-escrito', class: 'buz-etiqueta' });
    const escrito = el('textarea', { id: 'maxima-escrito', rows: '5', 'aria-describedby': 'maxima-escrito-ayuda' });
    const guardarB = el('button', { type: 'button', texto: 'Guardar en mi diario de hoy' });
    const estado = el('p', { class: 'diario-estado', id: 'maxima-estado' });
    const iso = window.JarisDiario ? window.JarisDiario.iso(a.civil) : null;
    const caja = el('div', { id: 'maxima-diario', class: 'maxima-diario' }, etiqueta,
      el('p', { id: 'maxima-escrito-ayuda', class: 'buz-ayuda', texto: 'Qué te dice, cómo la vives o qué vas a hacer con ella esta semana. Se añade a tu diario de hoy, en el apartado «La máxima de la semana», sin borrar lo que ya tengas, y se guarda solo en este dispositivo.' }),
      escrito, el('p', {}, guardarB), estado);
    if (iso) caja.append(el('p', {}, el('a', { href: '#/diario/' + iso }, 'Abrir mi diario de hoy')));
    caja.hidden = true;
    sec.append(caja);
    if (a.rutaLibro) sec.append(el('p', {}, el('a', { href: a.rutaLibro }, 'Leer todas las máximas en el libro (capítulo 23)')));

    function pintar() {
      const m = buscar(e.num);
      fuerte.textContent = m.n + '. ' + m.t;
      pGrupo.textContent = 'Es del grupo «' + m.grupo.nombre + '».';
      etiqueta.textContent = 'Qué significa para mí la máxima ' + m.n + ', «' + m.t.replace(/\.$/, '') + '»';
    }
    function cambiar(evitar) {
      sortear(e, evitar);
      escribir(e);
      pintar();
      const m = buscar(e.num);
      a.avisar('Máxima de la semana: ' + m.n + '. ' + m.t);
    }
    formas.addEventListener('change', function (ev) {
      if (ev.target === selGrupo) { e.grupo = selGrupo.value; cambiar(); return; }
      if (ev.target.name !== 'maxima-forma') return;
      e.forma = ev.target.value;
      cajaGrupo.hidden = e.forma !== 'momento';
      if (e.forma === 'momento') e.grupo = selGrupo.value;
      if (lista(e).indexOf(e.num) < 0) cambiar();   // la de ahora no es de ese grupo: sale otra
      else { escribir(e); a.avisar(e.forma === 'momento' ? 'Según el momento. Elige el grupo en la lista «Para qué momento».' : 'Al azar, entre todas.'); }
    });
    otra.addEventListener('click', function () { cambiar(e.num); });
    abrir.addEventListener('click', function () {
      const ver = caja.hidden;
      caja.hidden = !ver;
      abrir.setAttribute('aria-expanded', ver ? 'true' : 'false');
      if (ver) escrito.focus();
    });
    guardarB.addEventListener('click', function () {
      const t = escrito.value.trim();
      if (!t) { a.avisar('Escribe algo antes de guardarlo.'); escrito.focus(); return; }
      if (!window.JarisDiario) { a.avisar('No se ha podido abrir el diario.'); return; }
      const m = buscar(e.num);
      const bien = window.JarisDiario.anadir(a.civil, a.griego, { maxima: 'Máxima ' + m.n + ', «' + m.t.replace(/\.$/, '') + '»: ' + t });
      if (!bien) { estado.textContent = 'No se ha podido guardar: el navegador no deja guardar datos.'; a.avisar(estado.textContent); return; }
      escrito.value = '';
      estado.textContent = 'Guardado en tu diario de hoy a las ' + new Intl.DateTimeFormat('es-ES', { hour: 'numeric', minute: '2-digit' }).format(new Date()) + '.';
      a.avisar('Guardado en tu diario de hoy.');
    });
    pintar();
    return sec;
  }

  window.JarisMaximas = { seccion: seccion, total: TODAS.length, grupos: GRUPOS };
})();
