/* Jaris: Mi diario helénico (parte 6b).
   Paso 6b-1: escribir la entrada de un día. Rutas: #/diario y #/diario/AAAA-MM-DD.
   Paso 6b-2: releer. Rutas: #/diario/mes/AAAA-MM y #/diario/buscar/PALABRAS; «Tal día como hoy» en #/diario.
   Las preguntas salen del apéndice A1 del libro (contenido/diario.json, lo hace diario_aplicacion.py en cada montaje).
   Todo se guarda SOLO en este dispositivo (localStorage «jaris.diario»); Jaris nunca lo envía a ningún sitio. */
'use strict';
(function () {
  const CLAVE = 'jaris.diario', DIA_MS = 86400000;
  const PRACTICAS = [
    { id: 'rezar', texto: 'He rezado' },
    { id: 'libacion', texto: 'He hecho una libación' },
    { id: 'incienso', texto: 'He ofrecido incienso' },
    { id: 'himno', texto: 'He leído, recitado o cantado un himno' },
    { id: 'rito', texto: 'He hecho el rito del día' },
    { id: 'ofrenda', texto: 'He hecho otra ofrenda (comida, flores, una vela…)' },
  ];
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  let datosA1 = null;

  function leer() {
    try { const d = JSON.parse(localStorage.getItem(CLAVE)); if (d && d.entradas) return d; } catch (e) { /* nada */ }
    return { v: 1, entradas: {}, masAlla: true, cumple: null };
  }
  function escribir(d) {
    try { localStorage.setItem(CLAVE, JSON.stringify(d)); return true; } catch (e) { return false; }
  }
  function iso(civil) { return new Date(civil * DIA_MS).toISOString().slice(0, 10); }
  function civilDe(texto) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto || '');
    if (!m) return null;
    const ms = Date.UTC(+m[1], +m[2] - 1, +m[3]);
    return isNaN(ms) ? null : Math.round(ms / DIA_MS);
  }
  function vacia(e) {
    if (!e) return true;
    return !Object.keys(e).some(function (k) {
      if (k === 'griego' || k === 'actualizada') return false;
      const v = e[k];
      if (Array.isArray(v)) return v.length > 0;
      if (v && typeof v === 'object') return Object.keys(v).some(function (x) { return (v[x] || '').trim(); });
      return typeof v === 'string' ? v.trim() !== '' : !!v;
    });
  }
  let persistido = false;
  function pedirQueNoSeBorre() {
    if (persistido) return;
    persistido = true;
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* nada */ }
  }
  async function cargarA1(a) {
    if (datosA1) return datosA1;
    try { datosA1 = await a.traer('contenido/diario.json'); } catch (e) { datosA1 = { plantilla: [], especiales: {}, masAlla: [], senales: '', sinObligacion: '', cap: null }; }
    return datosA1;
  }

  /* Las preguntas de ese día (apéndice A1, apartado 4) y, de vez en cuando, una para ir más allá (apartado 5). */
  function preguntasDelDia(info, A1, d) {
    const grupos = [], esp = A1.especiales || {};
    const poner = function (clave, titulo) { if (esp[clave] && esp[clave].preguntas.length) grupos.push({ titulo: titulo, preguntas: esp[clave].preguntas }); };
    if (info.dia === 1) poner('noumenia', 'Noumenia, la luna nueva');
    if (info.dia === 2) poner('agathos', 'Agathos Daimon');
    if (info.ultimo) poner('deipnon', 'Deipnon de Hécate');
    const fecha = new Date(info.civil * DIA_MS);
    const esCumple = d.cumple && d.cumple.d === fecha.getUTCDate() && d.cumple.m === fecha.getUTCMonth() + 1;
    if (esCumple) poner('cumple', 'Tu cumpleaños');
    else if (info.dia === 1 && info.mesNumero === 1) poner('cumple', 'Año nuevo');
    const fiestas = info.fiestas.filter(function (f) { return !/a[ñn]o nuevo/i.test(f); });
    if (fiestas.length) poner('fiesta', 'En una fiesta: ' + fiestas.join(', '));
    let masAlla = null;
    if (d.masAlla !== false && (A1.masAlla || []).length && ((info.civil % 7) + 7) % 7 === 3) {
      masAlla = A1.masAlla[Math.floor(info.civil / 7) % A1.masAlla.length];
    }
    return { grupos: grupos, masAlla: masAlla };
  }

  /* ---------- Pantalla principal: #/diario ---------- */
  async function principal(a) {
    const el = a.el, A1 = await cargarA1(a), d = leer(), hoy = a.hoy();
    const raiz = el('div', { class: 'diario' });
    raiz.append(el('h1', { texto: 'Mi diario helénico' }),
      el('p', { texto: 'Un sitio para escribir tu práctica de cada día: lo que has rezado u ofrecido, lo que has sentido y por qué das las gracias. Las preguntas salen del apéndice A1 del libro, «Tu diario helénico». Rellena solo lo que te apetezca; ninguna casilla es obligatoria.' }));
    if (A1.sinObligacion) raiz.append(el('p', { texto: A1.sinObligacion }));
    raiz.append(el('p', {}, el('a', { class: 'boton', href: '#/diario/' + iso(hoy) }, 'Escribir lo de hoy (' + fechaTexto(hoy) + ')')));
    // La fecha sigue la hora del lugar elegido en el calendario; de madrugada se ofrece el día de ayer.
    const mo = a.momento ? a.momento() : null;
    if (mo && mo.hora < 5) raiz.append(el('p', {}, 'Es de madrugada. Si quieres escribir lo del día que acaba de terminar: ',
      el('a', { href: '#/diario/' + iso(hoy - 1) }, 'Escribir lo de ayer (' + fechaTexto(hoy - 1) + ')'), '.'));
    if (mo) raiz.append(el('p', { class: 'buz-ayuda' }, 'Las fechas siguen la hora de ' + mo.lugar +
      (mo.elegido ? '' : ' (por la zona horaria de tu dispositivo)') + '. Si vives en otro sitio, elígelo en el ',
      el('a', { href: '#/calendario' }, 'Calendario'), ', en el apartado «Lugar».'));

    // Otro día
    const campoFecha = el('input', { type: 'date', id: 'dia-otro', max: iso(hoy), 'aria-describedby': 'dia-otro-ayuda' });
    const formOtro = el('form', { class: 'dia-otro', 'aria-labelledby': 'dia-otro-titulo' },
      el('h2', { id: 'dia-otro-titulo', texto: 'Escribir otro día' }),
      el('label', { for: 'dia-otro', class: 'buz-etiqueta', texto: 'Fecha' }),
      el('p', { id: 'dia-otro-ayuda', class: 'buz-ayuda', texto: 'Por si quieres escribir lo de un día que ya ha pasado.' }),
      campoFecha, el('div', { class: 'buz-botones' }, el('button', { type: 'submit', texto: 'Abrir ese día' })));
    formOtro.addEventListener('submit', function (e) {
      e.preventDefault();
      const c = civilDe(campoFecha.value);
      if (c === null) { a.avisar('Escribe o elige una fecha.'); campoFecha.focus(); return; }
      if (c > hoy) { a.avisar('Esa fecha todavía no ha llegado. Elige hoy o un día que ya haya pasado.'); campoFecha.focus(); return; }
      location.hash = '#/diario/' + iso(c);
    });
    raiz.append(formOtro);

    // Releer (paso 6b-2): tal día como hoy, por meses, buscar y las últimas entradas
    const claves = Object.keys(d.entradas).sort().reverse();
    raiz.append(el('h2', { texto: 'Releer mi diario' }));
    const esteMes = iso(hoy).slice(0, 7);
    raiz.append(el('p', {}, el('a', { class: 'boton secundario', href: '#/diario/mes/' + esteMes }, 'Releer este mes (' + nombreMes(esteMes).toLowerCase() + ')')));
    if (!claves.length) raiz.append(el('p', { texto: 'Todavía no has escrito nada. Cuando escribas, aquí podrás releerlo por meses, buscar en él y ver lo que escribiste tal día como hoy.' }));
    else {
      // Tal día como hoy: hace un mes y hace un año (la misma fecha)
      const f = new Date(hoy * DIA_MS), y = f.getUTCFullYear(), m = f.getUTCMonth(), dd = f.getUTCDate();
      const mismaFecha = function (yy, mm) {
        const x = new Date(Date.UTC(yy, mm, dd));
        return x.getUTCDate() === dd ? Math.round(x.getTime() / DIA_MS) : null;   // el 31 no existe en todos los meses
      };
      const sec = el('section', { 'aria-labelledby': 'diario-taldia' }, el('h3', { id: 'diario-taldia', texto: 'Tal día como hoy' }));
      let alguno = false;
      [['Hace un mes', mismaFecha(y, m - 1)], ['Hace un año', mismaFecha(y - 1, m)]].forEach(function (par) {
        const k = par[1] === null ? null : iso(par[1]);
        if (!k || !d.entradas[k]) return;
        alguno = true;
        sec.append(el('h4', {}, par[0] + ': ', el('a', { href: '#/diario/' + k }, fechaTexto(par[1]) + ' (' + (d.entradas[k].griego || '') + ')')));
        sec.append.apply(sec, verEntrada(d.entradas[k], el, true));
      });
      if (!alguno) sec.append(el('p', { texto: 'No escribiste nada hace un mes ni hace un año en esta fecha. Cuando lo haya, saldrá aquí.' }));
      raiz.append(sec);

      // Por meses
      const meses = {};
      claves.forEach(function (k) { const mm = k.slice(0, 7); meses[mm] = (meses[mm] || 0) + 1; });
      const ulM = el('ul');
      Object.keys(meses).forEach(function (mm) {
        ulM.append(el('li', {}, el('a', { href: '#/diario/mes/' + mm }, nombreMes(mm))));   // sin contar días: nada que haga sentir culpa
      });
      raiz.append(el('h3', { texto: 'Por meses' }), ulM);

      // Buscar
      raiz.append(formBuscar(a, ''));

      // Las últimas
      const ul = el('ul');
      for (const k of claves.slice(0, 5)) {
        ul.append(el('li', {}, el('a', { href: '#/diario/' + k }, fechaTexto(civilDe(k)) + (d.entradas[k].griego ? ' (' + d.entradas[k].griego + ')' : ''))));
      }
      raiz.append(el('h3', { texto: 'Últimas entradas' }), ul);
    }

    // Privacidad, dicha con honradez
    raiz.append(el('h2', { texto: 'Privado: solo en este dispositivo' }),
      el('p', { texto: 'Tu diario se guarda solo en este dispositivo y en este navegador. Jaris nunca lo envía a ningún sitio, ni a internet ni a nadie.' }),
      el('p', { texto: 'Por eso mismo no hay copia: si borras los datos del navegador, desinstalas Jaris o cambias de dispositivo, el diario no viaja contigo y se pierde. En el iPhone, usa Jaris instalada en la pantalla de inicio, para que Safari no lo borre.' }));

    // Ajustes
    const ajustes = el('section', { 'aria-labelledby': 'diario-ajustes' }, el('h2', { id: 'diario-ajustes', texto: 'Ajustes del diario' }));
    const casilla = el('input', { type: 'checkbox', id: 'diario-masalla' });
    casilla.checked = d.masAlla !== false;
    casilla.addEventListener('change', function () {
      const x = leer(); x.masAlla = casilla.checked; escribir(x);
      a.avisar(casilla.checked ? 'Saldrá una pregunta para ir más allá una vez por semana.' : 'Ya no saldrán las preguntas para ir más allá.');
    });
    ajustes.append(el('div', { class: 'buz-opcion' }, casilla,
      el('label', { for: 'diario-masalla', texto: 'Una vez por semana, proponerme una pregunta para ir más allá' })));
    const cumple = el('fieldset', { class: 'buz-tipos' }, el('legend', { texto: 'Tu cumpleaños (opcional; ese día salen sus preguntas)' }));
    const selDia = el('select', { id: 'cumple-dia' }), selMes = el('select', { id: 'cumple-mes' });
    selDia.append(el('option', { value: '', texto: 'Sin poner' }));
    for (let i = 1; i <= 31; i++) selDia.append(el('option', { value: String(i), texto: String(i) }));
    selMes.append(el('option', { value: '', texto: 'Sin poner' }));
    MESES.forEach(function (m, i) { selMes.append(el('option', { value: String(i + 1), texto: m })); });
    if (d.cumple) { selDia.value = String(d.cumple.d); selMes.value = String(d.cumple.m); }
    const guardarCumple = function () {
      const x = leer();
      x.cumple = selDia.value && selMes.value ? { d: +selDia.value, m: +selMes.value } : null;
      escribir(x);
      if (x.cumple) a.avisar('Cumpleaños guardado: ' + x.cumple.d + ' de ' + MESES[x.cumple.m - 1] + '.');
      else if (!selDia.value && !selMes.value) a.avisar('Cumpleaños quitado.');
    };
    selDia.addEventListener('change', guardarCumple);
    selMes.addEventListener('change', guardarCumple);
    cumple.append(el('label', { for: 'cumple-dia', class: 'buz-etiqueta', texto: 'Día' }), selDia,
      el('label', { for: 'cumple-mes', class: 'buz-etiqueta', texto: 'Mes' }), selMes);
    ajustes.append(cumple);
    raiz.append(ajustes);

    // Borrar todo
    if (claves.length) {
      const borrar = el('button', { type: 'button', class: 'secundario', texto: 'Borrar todo el diario' });
      borrar.addEventListener('click', function () {
        if (!window.confirm('¿Borrar todo el diario de este dispositivo? Se borran las ' + claves.length + ' entradas y no se pueden recuperar.')) return;
        const x = leer(); x.entradas = {}; escribir(x);
        a.avisar('Diario borrado.');
        location.hash = '#/diario';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      });
      raiz.append(el('h2', { texto: 'Borrar el diario' }), el('p', { texto: 'Borra todas las entradas de este dispositivo. Pide confirmación.' }), borrar);
    }
    if (A1.cap) raiz.append(el('p', {}, el('a', { href: '#/leer/' + A1.cap }, 'Leer el apéndice A1, «Tu diario helénico», en el libro')));
    return { nodo: raiz, titulo: 'Mi diario helénico' };
  }

  /* ---------- Releer (paso 6b-2) ---------- */
  const fFecha = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  function fechaTexto(civil) { return fFecha.format(new Date(civil * DIA_MS)); }
  function nombreMes(mm) {
    const n = MESES[+mm.slice(5, 7) - 1] || '';
    return n.charAt(0).toUpperCase() + n.slice(1) + ' de ' + mm.slice(0, 4);
  }
  const NOMBRES_PRACTICA = { rezar: 'he rezado', libacion: 'he hecho una libación', incienso: 'he ofrecido incienso',
    himno: 'he leído, recitado o cantado un himno', rito: 'he hecho el rito del día', ofrenda: 'he hecho otra ofrenda', texto: 'he leído el texto del día' };
  const CAMPOS = [['dioses', 'A qué dioses'], ['ofrecido', 'Qué he rezado u ofrecido'], ['preguntas', 'Mi respuesta a la pregunta del día'],
    ['libre', 'Escritura libre'], ['gracias', 'Doy las gracias por'], ['senales', 'Señales'], ['suenos', 'Sueños'], ['sensaciones', 'Lo que he sentido']];
  /* Lo escrito un día, en párrafos con su etiqueta en negrita (en el mismo orden que al escribirlo). */
  function verEntrada(e, el) {
    const sal = [];
    const linea = function (etiqueta, texto) { sal.push(el('p', { class: 'diario-texto' }, el('strong', { texto: etiqueta + ': ' }), texto)); };
    if (e.practica && e.practica.length) {
      const hechas = e.practica.map(function (p) { return p === 'texto' && e.textoDelDia ? 'he leído el texto del día, «' + e.textoDelDia.t + '»' : (NOMBRES_PRACTICA[p] || p); });
      linea('Lo que he hecho', hechas.join(', ') + '.');
    }
    CAMPOS.forEach(function (c) { if (e[c[0]]) linea(c[1], e[c[0]]); });
    Object.keys(e.plantilla || {}).forEach(function (p) { linea(p, e.plantilla[p]); });
    if (!sal.length) sal.push(el('p', { texto: 'Sin nada escrito.' }));
    return sal;
  }
  function sinTildes(s) { return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function textoEntrada(e) {
    const partes = [];
    (e.practica || []).forEach(function (p) { partes.push(NOMBRES_PRACTICA[p] || p); });
    if (e.textoDelDia) partes.push(e.textoDelDia.t);
    CAMPOS.forEach(function (c) { if (e[c[0]]) partes.push(e[c[0]]); });
    Object.keys(e.plantilla || {}).forEach(function (p) { partes.push(e.plantilla[p]); });
    if (e.griego) partes.push(e.griego);
    return partes.join(' \n ');
  }
  function formBuscar(a, valor) {
    const el = a.el;
    const campo = el('input', { type: 'search', id: 'diario-buscar', autocomplete: 'off', 'aria-describedby': 'diario-buscar-ayuda' });
    campo.value = valor;
    const form = el('form', { role: 'search', 'aria-labelledby': 'diario-buscar-titulo' },
      el(valor ? 'h2' : 'h3', { id: 'diario-buscar-titulo', texto: valor ? 'Buscar otra cosa' : 'Buscar en mi diario' }),
      el('label', { for: 'diario-buscar', class: 'buz-etiqueta', texto: 'Palabras que buscas' }),
      el('p', { id: 'diario-buscar-ayuda', class: 'buz-ayuda', texto: 'Salen los días que tienen todas las palabras; da igual tildes y mayúsculas. También vale el nombre de un dios o de un mes griego.' }),
      campo, el('div', { class: 'buz-botones' }, el('button', { type: 'submit', texto: 'Buscar' })));
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      const t = campo.value.trim();
      if (!t) { a.avisar('Escribe lo que quieres buscar.'); campo.focus(); return; }
      location.hash = '#/diario/buscar/' + encodeURIComponent(t);
    });
    return form;
  }

  /* Un mes del diario: #/diario/mes/AAAA-MM */
  function pantallaMes(mm, a) {
    const el = a.el, d = leer();
    const todas = Object.keys(d.entradas).sort();
    const delMes = todas.filter(function (k) { return k.slice(0, 7) === mm; });
    const meses = Array.from(new Set(todas.map(function (k) { return k.slice(0, 7); })));
    const i = meses.indexOf(mm);
    const raiz = el('div', { class: 'diario' }, el('h1', { texto: 'Mi diario: ' + nombreMes(mm) }));
    const pasar = el('ul', { class: 'botones' });
    if (i > 0) pasar.append(el('li', {}, el('a', { class: 'boton secundario', href: '#/diario/mes/' + meses[i - 1] }, 'Mes anterior: ' + nombreMes(meses[i - 1]))));
    if (i >= 0 && i < meses.length - 1) pasar.append(el('li', {}, el('a', { class: 'boton secundario', href: '#/diario/mes/' + meses[i + 1] }, 'Mes siguiente: ' + nombreMes(meses[i + 1]))));
    pasar.append(el('li', {}, el('a', { class: 'boton secundario', href: '#/diario' }, 'Volver a Mi diario')));
    raiz.append(el('nav', { 'aria-label': 'Meses del diario' }, pasar));
    if (!delMes.length) {
      raiz.append(el('p', { texto: 'No hay nada escrito en ' + nombreMes(mm).toLowerCase() + '.' }));
      return { nodo: raiz, titulo: 'Mi diario: ' + nombreMes(mm) };
    }

    // Resumen tranquilo, solo si se quiere (sin contar días ni rachas)
    const dioses = new Map(), fiestas = new Set(), hechas = new Set();
    delMes.forEach(function (k) {
      const e = d.entradas[k];
      (e.dioses || '').split(/[,;]| y /).forEach(function (x) { x = x.trim(); if (x) dioses.set(sinTildes(x), x.charAt(0).toUpperCase() + x.slice(1)); });
      (e.practica || []).forEach(function (p) { if (p !== 'texto') hechas.add(NOMBRES_PRACTICA[p] || p); });
      try { a.dia(civilDe(k)).fiestas.forEach(function (f) { fiestas.add(f); }); } catch (err) { /* nada */ }
    });
    const caja = el('div', { id: 'diario-resumen', hidden: 'hidden' });
    caja.append(el('p', { texto: dioses.size ? 'Este mes has honrado a: ' + Array.from(dioses.values()).join(', ') + '.' : 'Este mes no has apuntado a qué dioses has honrado.' }));
    if (hechas.size) caja.append(el('p', { texto: 'Lo que has hecho algún día: ' + Array.from(hechas).join('; ') + '.' }));
    if (fiestas.size) caja.append(el('p', { texto: 'Fiestas en los días que escribiste: ' + Array.from(fiestas).join(', ') + '.' }));
    caja.append(el('p', { texto: 'Los días que no escribiste no importan: el diario es para conocerte y dar las gracias, no para llevar la cuenta.' }));
    const bRes = el('button', { type: 'button', class: 'secundario', 'aria-expanded': 'false', 'aria-controls': 'diario-resumen', texto: 'Ver un resumen del mes' });
    bRes.addEventListener('click', function () {
      const abrir = caja.hidden;
      caja.hidden = !abrir; bRes.setAttribute('aria-expanded', abrir ? 'true' : 'false');
    });
    raiz.append(bRes, caja);

    // Cada día, con lo escrito
    delMes.forEach(function (k) {
      const e = d.entradas[k], c = civilDe(k);
      raiz.append(el('h2', { texto: fechaTexto(c) + (e.griego ? ' (' + e.griego + ')' : '') }));
      raiz.append.apply(raiz, verEntrada(e, el));
      raiz.append(el('p', {}, el('a', { href: '#/diario/' + k }, 'Abrir el ' + fechaTexto(c) + ' para escribir')));
    });
    return { nodo: raiz, titulo: 'Mi diario: ' + nombreMes(mm) };
  }

  /* Buscar en el diario: #/diario/buscar/PALABRAS */
  function pantallaBuscar(texto, a) {
    const el = a.el, d = leer();
    const palabras = sinTildes(texto).split(/\s+/).filter(Boolean);
    const raiz = el('div', { class: 'diario' }, el('h1', { texto: 'Buscar en mi diario' }), formBuscar(a, texto));
    const res = Object.keys(d.entradas).sort().reverse().filter(function (k) {
      const t = sinTildes(textoEntrada(d.entradas[k]) + ' ' + fechaTexto(civilDe(k)));
      return palabras.every(function (p) { return t.indexOf(p) >= 0; });
    });
    const h2 = el('h2', { tabindex: '-1', texto: res.length ? (res.length === 1 ? '1 día' : res.length + ' días') + ' con «' + texto + '»' : 'Ningún día con «' + texto + '»' });
    raiz.append(h2);
    if (!res.length) raiz.append(el('p', { texto: 'Prueba con otra palabra o con menos palabras.' }));
    res.forEach(function (k) {
      const e = d.entradas[k], c = civilDe(k);
      raiz.append(el('h3', {}, el('a', { href: '#/diario/' + k }, fechaTexto(c) + (e.griego ? ' (' + e.griego + ')' : ''))));
      // Solo los apartados donde está alguna de las palabras
      const trozos = verEntrada(e, el).filter(function (p) { const t = sinTildes(p.textContent); return palabras.some(function (w) { return t.indexOf(w) >= 0; }); });
      raiz.append.apply(raiz, trozos.length ? trozos : [el('p', { texto: 'Está en la fecha o en el día griego.' })]);
    });
    raiz.append(el('p', {}, el('a', { href: '#/diario' }, 'Volver a Mi diario')));
    return { nodo: raiz, titulo: 'Buscar en mi diario', foco: h2 };
  }

  /* ---------- Escribir la entrada de un día: #/diario/AAAA-MM-DD ---------- */
  async function entrada(civil, a) {
    const el = a.el, A1 = await cargarA1(a), hoy = a.hoy(), info = a.dia(civil), clave = iso(civil);
    const d = leer(), e = d.entradas[clave] || {};
    const raiz = el('div', { class: 'diario' });
    const h1 = el('h1', { tabindex: '-1', texto: 'Mi diario: ' + info.fechaLarga + ' de ' + new Date(civil * DIA_MS).getUTCFullYear() + (civil === hoy ? ' (hoy)' : '') });
    raiz.append(h1, el('p', { texto: info.griego + ', ' + info.anio + ' (en ' + info.lugar + '). Se celebra: ' + info.resumen + '.' }));
    // El día griego empieza al ponerse el sol: si ya se ha puesto, se dice (la entrada sigue siendo la de hoy).
    const mo = a.momento ? a.momento() : null;
    if (mo && civil === hoy && mo.trasLaPuesta) raiz.append(el('p', { texto: 'El sol ya se ha puesto: para el calendario griego ya es el ' +
      mo.griegoNoche + '. Esta entrada es la de hoy, ' + info.fecha + ', con todo lo que has vivido durante el día.' }));
    const estado = el('p', { class: 'diario-estado', id: 'diario-estado',
      texto: vacia(e) ? 'Todavía no has escrito nada este día. Se guarda solo mientras escribes, solo en este dispositivo.'
        : 'Ya tienes escrito algo este día. Se guarda solo mientras escribes, solo en este dispositivo.' });
    raiz.append(estado);
    const pasar = el('ul', { class: 'botones' });
    pasar.append(el('li', {}, el('a', { class: 'boton secundario', href: '#/diario/' + iso(civil - 1) }, 'Día anterior')));
    if (civil < hoy) pasar.append(el('li', {}, el('a', { class: 'boton secundario', href: '#/diario/' + iso(civil + 1) }, 'Día siguiente')));
    pasar.append(el('li', {}, el('a', { class: 'boton secundario', href: '#/diario/mes/' + clave.slice(0, 7) }, 'Releer el mes de este día (' + nombreMes(clave.slice(0, 7)).toLowerCase() + ')')));
    pasar.append(el('li', {}, el('a', { class: 'boton secundario', href: '#/diario' }, 'Volver a Mi diario')));
    raiz.append(el('nav', { 'aria-label': 'Días del diario' }, pasar));

    const form = el('form', { class: 'diario-form' });
    form.addEventListener('submit', function (ev) { ev.preventDefault(); });
    let n = 0;
    function campo(nombre, etiqueta, ayuda, filas) {
      const id = 'diario-' + (++n);
      const t = el('textarea', { id: id, rows: String(filas || 4), 'data-campo': nombre });
      t.value = (nombre.indexOf('plantilla:') === 0 ? ((e.plantilla || {})[nombre.slice(10)] || '') : (e[nombre] || ''));
      const partes = [el('label', { for: id, class: 'buz-etiqueta', texto: etiqueta })];
      if (ayuda) { const idA = id + '-ayuda'; t.setAttribute('aria-describedby', idA); partes.push(el('p', { id: idA, class: 'buz-ayuda', texto: ayuda })); }
      partes.push(t);
      return partes;
    }

    // 1. Pregunta del día
    const pd = preguntasDelDia(info, A1, d);
    const sPreg = el('section', { 'aria-labelledby': 'diario-preg' }, el('h2', { id: 'diario-preg', texto: 'Pregunta del día' }));
    const idsPreg = [];
    if (!pd.grupos.length && !pd.masAlla) sPreg.append(el('p', { texto: 'Hoy no es un día especial del mes, así que no hay pregunta. Si el día ha sido difícil, pulsa el botón de abajo y saldrán sus preguntas.' }));
    pd.grupos.forEach(function (g, i) {
      const ul = el('ul', { id: 'diario-preg-' + i }); g.preguntas.forEach(function (p) { ul.append(el('li', { texto: p })); });
      idsPreg.push('diario-preg-' + i);
      sPreg.append(el('h3', { texto: g.titulo }), ul);
    });
    if (pd.masAlla) { sPreg.append(el('h3', { texto: 'Para ir más allá' }), el('p', { id: 'diario-preg-masalla', texto: pd.masAlla })); idsPreg.push('diario-preg-masalla'); }
    const dif = (A1.especiales || {}).dificil;
    let cajaDif = null;
    if (dif) {
      cajaDif = el('div', { id: 'diario-dificil', hidden: 'hidden' });
      const ulD = el('ul'); dif.preguntas.forEach(function (p) { ulD.append(el('li', { texto: p })); });
      cajaDif.append(ulD);
      if (dif.nota) cajaDif.append(el('p', { texto: dif.nota }));
      const bDif = el('button', { type: 'button', class: 'secundario', 'aria-expanded': 'false', 'aria-controls': 'diario-dificil', texto: 'Hoy es un día difícil' });
      bDif.addEventListener('click', function () {
        const abrir = cajaDif.hidden;
        cajaDif.hidden = !abrir; bDif.setAttribute('aria-expanded', abrir ? 'true' : 'false');
        describir();
      });
      sPreg.append(bDif, cajaDif);
    }
    // La respuesta: el lector dice las preguntas al entrar en el campo; si no hay pregunta, el campo no sale.
    const resp = campo('preguntas', 'Mi respuesta a la pregunta del día', '', 5), campoResp = resp[1];
    function describir() {
      const ids = idsPreg.concat(cajaDif && !cajaDif.hidden ? ['diario-dificil'] : []);
      if (ids.length) campoResp.setAttribute('aria-describedby', ids.join(' ')); else campoResp.removeAttribute('aria-describedby');
      const ver = ids.length > 0 || campoResp.value.trim() !== '';
      resp.forEach(function (n) { n.hidden = !ver; });
    }
    sPreg.append.apply(sPreg, resp);
    describir();
    form.append(sPreg);

    // 2. Escritura libre
    const sLibre = el('section', { 'aria-labelledby': 'diario-libre' }, el('h2', { id: 'diario-libre', texto: 'Escritura libre' }));
    sLibre.append.apply(sLibre, campo('libre', 'Lo que quieras contar hoy', 'Escribe como hablas; no hace falta escribir bien. También puedes dictar con el teclado del móvil.', 8));
    form.append(sLibre);

    // 3. Ritos y ofrendas, con lo propuesto para el día
    const sRitos = el('section', { 'aria-labelledby': 'diario-ritos' }, el('h2', { id: 'diario-ritos', texto: 'Ritos y ofrendas' }));
    sRitos.append(el('p', {}, 'Lo propuesto para este día: ' + info.resumen + '. ', el('a', { href: info.ruta }, 'Ver qué se hace este día')));
    const hechas = new Set(e.practica || []);
    const grupoP = el('fieldset', { class: 'buz-tipos' }, el('legend', { texto: 'Lo que he hecho' }));
    PRACTICAS.forEach(function (p) {
      const id = 'diario-p-' + p.id, c = el('input', { type: 'checkbox', id: id, value: p.id, 'data-practica': '1' });
      c.checked = hechas.has(p.id);
      grupoP.append(el('div', { class: 'buz-opcion' }, c, el('label', { for: id, texto: p.texto })));
    });
    if (info.texto) {
      const c = el('input', { type: 'checkbox', id: 'diario-p-texto', value: 'texto', 'data-practica': '1' });
      c.checked = hechas.has('texto');
      grupoP.append(el('div', { class: 'buz-opcion' }, c, el('label', { for: 'diario-p-texto', texto: 'He leído el texto del día: «' + info.texto.t + '»' })));
      if (!e.textoDelDia) e.textoDelDia = info.texto;
    }
    sRitos.append(grupoP);
    if (info.texto) sRitos.append(el('p', {}, el('a', { href: '#/leer/' + info.texto.cap + '/' + info.texto.a }, 'Abrir el texto del día, «' + info.texto.t + '»')));
    // Campo de texto normal (sin lista de sugerencias: con NVDA no se podía elegir con las flechas).
    const sinTilde = function (s) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); };
    const deHoy = (a.DIOSES || []).filter(function (x) { return sinTilde(info.resumen).indexOf(sinTilde(x)) >= 0; });
    const idDioses = 'diario-dioses';
    const campoDioses = el('input', { type: 'text', id: idDioses, 'data-campo': 'dioses', autocomplete: 'off', 'aria-describedby': idDioses + '-ayuda' });
    campoDioses.value = e.dioses || '';
    sRitos.append(el('label', { for: idDioses, class: 'buz-etiqueta', texto: 'A qué dioses' }),
      el('p', { id: idDioses + '-ayuda', class: 'buz-ayuda', texto: 'Escribe sus nombres separados por comas, por ejemplo: Atenea, Hestia.' +
        (deHoy.length ? ' Los dioses de este día: ' + deHoy.join(', ') + '.' : '') }), campoDioses);
    sRitos.append.apply(sRitos, campo('ofrecido', 'Qué he rezado u ofrecido', 'Si quieres, con detalle: qué oración, qué himno, qué ofrenda.', 4));
    form.append(sRitos);

    // 4. Conexión con los dioses, con el consejo del libro a la vista
    const sCon = el('section', { 'aria-labelledby': 'diario-con' }, el('h2', { id: 'diario-con', texto: 'Conexión con los dioses' }));
    if (A1.senales) sCon.append(el('p', { class: 'buz-aviso', texto: 'Con calma: ' + A1.senales }));
    sCon.append.apply(sCon, campo('senales', 'Señales', 'Algo que te ha llamado la atención o te ha emocionado.', 3));
    sCon.append.apply(sCon, campo('suenos', 'Sueños', '', 3));
    sCon.append.apply(sCon, campo('sensaciones', 'Lo que he sentido', 'Al rezar, al hacer la ofrenda o en cualquier momento del día.', 3));
    form.append(sCon);

    // 5. Gratitud
    const sGra = el('section', { 'aria-labelledby': 'diario-gra' }, el('h2', { id: 'diario-gra', texto: 'Gratitud' }));
    sGra.append.apply(sGra, campo('gracias', 'Doy las gracias por', '', 4));
    form.append(sGra);

    // 6. El resto de la plantilla del libro (apéndice A1, apartado 3)
    const resto = (A1.plantilla || []).filter(function (p) { return !/rezado u ofrecido|doy las gracias/i.test(p); });
    if (resto.length) {
      const sPla = el('section', { 'aria-labelledby': 'diario-pla' }, el('h2', { id: 'diario-pla', texto: 'Más preguntas de la plantilla del libro' }));
      resto.forEach(function (p) { sPla.append.apply(sPla, campo('plantilla:' + p, p, '', 3)); });
      form.append(sPla);
    }
    // Orden (3 de noviembre, tras la prueba de la autora): primero lo rápido (casillas), luego la pregunta,
    // la escritura libre, la gratitud, la conexión con los dioses y el resto de la plantilla.
    form.prepend(sRitos);
    form.insertBefore(sGra, sCon);
    raiz.append(form);

    // Guardar solo: mientras se escribe (en silencio) y, al salir de un campo o marcar una casilla, «Guardado».
    let pendiente = null;
    const hora = new Intl.DateTimeFormat('es-ES', { hour: 'numeric', minute: '2-digit' });
    function recoger() {
      const x = { griego: info.griego };
      form.querySelectorAll('[data-campo]').forEach(function (c) {
        const nombre = c.getAttribute('data-campo');
        if (nombre.indexOf('plantilla:') === 0) { if (c.value.trim()) (x.plantilla = x.plantilla || {})[nombre.slice(10)] = c.value; }
        else if (c.value.trim()) x[nombre] = c.value;
      });
      const p = Array.from(form.querySelectorAll('[data-practica]:checked')).map(function (c) { return c.value; });
      if (p.length) x.practica = p;
      if (p.indexOf('texto') >= 0 && info.texto) x.textoDelDia = info.texto;
      return x;
    }
    function guardarYa() {
      clearTimeout(pendiente); pendiente = null;
      const todo = leer(), x = recoger();
      if (vacia(x)) delete todo.entradas[clave];
      else { x.actualizada = Date.now(); todo.entradas[clave] = x; pedirQueNoSeBorre(); }
      const bien = escribir(todo);
      estado.textContent = bien
        ? (vacia(x) ? 'Este día está vacío: no se guarda nada.' : 'Guardado a las ' + hora.format(new Date()) + ', solo en este dispositivo.')
        : 'No se ha podido guardar: el navegador no deja guardar datos (quizá es una ventana privada o no queda espacio).';
      return bien;
    }
    form.addEventListener('input', function () {
      clearTimeout(pendiente);
      pendiente = setTimeout(guardarYa, 800);
    });
    form.addEventListener('change', function () {
      a.avisar(guardarYa() ? 'Guardado' : 'No se ha podido guardar.');
    });
    // Si se cambia de pantalla con algo sin guardar, se guarda antes.
    window.addEventListener('hashchange', function antes() {
      window.removeEventListener('hashchange', antes);
      if (pendiente) guardarYa();
    });
    window.addEventListener('pagehide', function () { if (pendiente) guardarYa(); });

    // Borrar esta entrada
    const borrar = el('button', { type: 'button', class: 'secundario', texto: 'Borrar la entrada de este día' });
    borrar.addEventListener('click', function () {
      if (!window.confirm('¿Borrar lo escrito el ' + info.fecha + '? No se puede recuperar.')) return;
      clearTimeout(pendiente); pendiente = null;
      const todo = leer(); delete todo.entradas[clave]; escribir(todo);
      form.querySelectorAll('[data-campo]').forEach(function (c) { c.value = ''; });
      form.querySelectorAll('[data-practica]').forEach(function (c) { c.checked = false; });
      estado.textContent = 'Entrada borrada. Este día está vacío.';
      a.avisar('Entrada borrada.');
      h1.focus();
    });
    raiz.append(el('h2', { texto: 'Esta entrada' }),
      el('p', { texto: 'Lo que escribes se guarda solo. Si quieres empezar de cero este día, puedes borrarlo (pide confirmación).' }),
      borrar,
      el('p', {}, el('a', { href: '#/diario' }, 'Volver a Mi diario')));
    return { nodo: raiz, titulo: 'Mi diario: ' + info.fecha };
  }

  async function pantalla(partes, a) {
    if (partes[1] === 'mes' && /^\d{4}-\d{2}$/.test(partes[2] || '')) return pantallaMes(partes[2], a);
    if (partes[1] === 'buscar') {
      const t = partes.slice(2).join('/').trim();
      if (t) return pantallaBuscar(t, a);
      return principal(a);
    }
    if (partes[1]) {
      const c = civilDe(partes[1]);
      if (c === null) return principal(a);
      if (c > a.hoy()) {
        const r = await principal(a);
        a.avisar('Esa fecha todavía no ha llegado.');
        return r;
      }
      return entrada(c, a);
    }
    return principal(a);
  }
  /* Para el rincón de la noche: añade texto a la entrada de un día (sin borrar lo que ya hubiera). */
  function anadir(civil, griego, campos) {
    const todo = leer(), k = iso(civil), e = todo.entradas[k] || {};
    Object.keys(campos).forEach(function (c) {
      const t = (campos[c] || '').trim();
      if (t) e[c] = e[c] && e[c].trim() ? e[c].replace(/\s+$/, '') + '\n' + t : t;
    });
    if (vacia(e)) return true;
    e.griego = e.griego || griego; e.actualizada = Date.now();
    todo.entradas[k] = e;
    pedirQueNoSeBorre();
    return escribir(todo);
  }
  window.JarisDiario = { pantalla: pantalla, anadir: anadir, iso: iso };
})();
