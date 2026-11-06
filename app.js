/* Jaris: el programa de la aplicación (parte 1: leer el libro sin conexión; los audios están en audios.js).
   Rutas: #/ portada, #/indice, #/oraciones, #/himnos, #/ritos, #/leer/ch010 o #/leer/ch010/ancla.
   Normas: al cambiar de pantalla, el foco va al título (h1) o al apartado pedido; los avisos los dice
   el lector de pantalla (región #avisos); nada de atajos de una letra. */
'use strict';
(function () {
  const main = document.getElementById('contenido');
  const avisos = document.getElementById('avisos');
  let libro = null;
  let turno = 0;
  let primeraVez = true;
  const capitulosLeidos = new Map();

  let borrarAviso = null;
  function avisar(texto) {
    avisos.textContent = '';
    clearTimeout(borrarAviso);
    setTimeout(function () { avisos.textContent = texto; }, 150);
    /* El aviso se borra al poco, para que no se quede escrito al final de la página. */
    borrarAviso = setTimeout(function () { avisos.textContent = ''; }, 8000);
  }
  function guardar(clave, valor) { try { localStorage.setItem(clave, JSON.stringify(valor)); } catch (e) { /* sin almacenamiento: no pasa nada */ } }
  function recuperar(clave) { try { return JSON.parse(localStorage.getItem(clave)); } catch (e) { return null; } }

  function el(etiqueta, atributos) {
    const nodo = document.createElement(etiqueta);
    for (const [k, v] of Object.entries(atributos || {})) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'texto') nodo.textContent = v; else nodo.setAttribute(k, v);
    }
    for (let i = 2; i < arguments.length; i++) if (arguments[i] !== null && arguments[i] !== undefined) nodo.append(arguments[i]);
    return nodo;
  }

  async function traer(ruta, comoTexto) {
    const r = await fetch(ruta);
    if (!r.ok) throw new Error(ruta);
    return comoTexto ? r.text() : r.json();
  }
  async function capitulo(cap) {
    if (!capitulosLeidos.has(cap)) capitulosLeidos.set(cap, await traer('contenido/' + cap + '.html', true));
    return capitulosLeidos.get(cap);
  }

  function ponerTitulo(t) { document.title = t ? t + ' · Jaris' : 'Jaris. Antología del helenismo'; }
  function marcarMenu(ruta) {
    document.querySelectorAll('.cabecera nav a').forEach(function (a) {
      if (a.getAttribute('href') === ruta) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }
  function enfocar(nodo) {
    if (!nodo) return;
    if (!nodo.hasAttribute('tabindex')) nodo.setAttribute('tabindex', '-1');
    nodo.focus({ preventScroll: true });
    nodo.scrollIntoView({ block: 'start' });
  }
  /* Después de pintar una pantalla: el foco va al título, salvo la primera vez que se abre la aplicación. */
  function terminar(destino) {
    if (destino && destino !== main.querySelector('h1')) { enfocar(destino); }
    else if (!primeraVez) { enfocar(main.querySelector('h1')); }
    else { window.scrollTo(0, 0); }
    primeraVez = false;
  }

  function lista(nodos) {
    const ul = el('ul');
    for (const n of nodos) {
      const li = el('li', {}, el('a', { href: '#/leer/' + n.cap, texto: n.titulo }));
      if (n.hijos && n.hijos.length) li.append(lista(n.hijos));
      ul.append(li);
    }
    return ul;
  }
  function buscarNodo(nodos, cap) {
    for (const n of nodos) {
      if (n.cap === cap) return n;
      const h = buscarNodo(n.hijos || [], cap);
      if (h) return h;
    }
    return null;
  }

  /* ---------- Pantallas ---------- */
  function portada() {
    const p = libro.portada;
    const ultimo = recuperar('jaris.ultimo');
    const botones = el('ul', { class: 'botones' });
    if (ultimo && ultimo.cap) {
      botones.append(el('li', {}, el('a', { class: 'boton', href: '#/leer/' + ultimo.cap }, 'Seguir leyendo: ' + ultimo.titulo)));
    }
    botones.append(
      el('li', {}, el('a', { class: 'boton' + (ultimo ? ' secundario' : ''), href: '#/leer/' + libro.primero }, 'Empezar a leer')),
      el('li', {}, el('a', { class: 'boton secundario', href: '#/indice' }, 'Ver el índice'))
    );
    const sobre = el('section', { 'aria-labelledby': 'sobre-titulo' }, el('h2', { id: 'sobre-titulo', texto: 'Sobre este libro' }));
    for (const parrafo of libro.sinopsis) sobre.append(el('p', { texto: parrafo }));

    const instalar = el('section', { class: 'instalar', 'aria-labelledby': 'instalar-titulo', id: 'instalar', hidden: 'hidden' },
      el('h2', { id: 'instalar-titulo', texto: 'Tener Jaris en este dispositivo' }));
    rellenarInstalar(instalar);

    const cubierta = el('figure', { class: 'cubierta' },
      el('img', { src: p.imagen, alt: p.descripcion, width: p.ancho, height: p.alto }));
    const pantalla = el('div', { class: 'portada' },
      el('h1', { class: 'titulo-libro' }, libro.titulo, el('span', { class: 'solo-lector', texto: '.\u00a0' }), el('span', { class: 'subtitulo', texto: libro.subtitulo })),
      el('p', { class: 'autora', texto: libro.autora }),
      accesoHoy(), cubierta, botones,
      el('section', { 'aria-labelledby': 'partes-titulo' }, el('h2', { id: 'partes-titulo', texto: 'Partes del libro' }),
        lista(libro.arbol.map(function (n) { return { cap: n.cap, titulo: n.titulo, hijos: [] }; }))),
      instalar, sobre);
    if (window.JarisPresentacion) {
      // Junto a «Empezar a leer» (antes estaba al final de la portada y costaba encontrarlo; 4 de noviembre)
      const ver = el('button', { type: 'button', class: 'boton secundario', texto: 'Ver otra vez la presentación' });
      ver.addEventListener('click', function () {
        window.JarisPresentacion.mostrar({ libro: libro, alTerminar: function () { ver.focus(); } });
      });
      botones.append(el('li', {}, ver));
    }
    main.replaceChildren(pantalla);
    ponerTitulo('');
    marcarMenu('#/');
    terminar(null);
  }

  function indice() {
    const pantalla = el('div', { class: 'indice' },
      el('h1', { texto: 'Índice' }),
      el('p', { texto: 'Todas las partes del libro y sus capítulos. Cada parte es una lista con sus capítulos dentro.' }),
      lista(libro.arbol));
    main.replaceChildren(pantalla);
    ponerTitulo('Índice');
    marcarMenu('#/indice');
    terminar(null);
  }

  async function leer(cap, ancla, rutaMenu) {
    const mio = ++turno;
    const i = libro.capitulos.findIndex(function (c) { return c.cap === cap; });
    if (i < 0) return noEncontrada();
    let html;
    try { html = await capitulo(cap); }
    catch (e) {
      main.replaceChildren(el('h1', { texto: 'No se ha podido abrir este capítulo' }),
        el('p', { texto: 'Si es la primera vez que abres Jaris, hace falta conexión hasta que se guarde entera en el dispositivo. Vuelve a intentarlo dentro de un momento.' }),
        el('p', {}, el('a', { href: '#/indice' }, 'Volver al índice')));
      ponerTitulo('Error'); terminar(null); return;
    }
    if (mio !== turno) return;
    const c = libro.capitulos[i];
    const articulo = el('article', { class: 'capitulo' });
    articulo.innerHTML = html;
    /* Botones «Escuchar» junto a cada texto que tiene audio (audios.js, parte 3b) */
    if (window.JarisAudios) { try { await window.JarisAudios.ponerBotones(articulo, cap); } catch (e) { /* sin audios: se lee igual */ } }
    /* Botones de favoritos debajo de cada oración, himno y rito (favoritos.js, paso 4b) */
    if (window.JarisFavoritos) { try { window.JarisFavoritos.ponerBotones(articulo, cap); } catch (e) { /* se lee igual */ } }
    if (mio !== turno) return;
    const nodo = buscarNodo(libro.arbol, cap);
    if (nodo && nodo.hijos && nodo.hijos.length) {
      articulo.append(el('h2', { texto: 'En esta parte' }), lista(nodo.hijos));
    }
    const pasar = el('ul');
    const anterior = libro.capitulos[i - 1], siguiente = libro.capitulos[i + 1];
    if (anterior) pasar.append(el('li', {}, el('a', { href: '#/leer/' + anterior.cap, rel: 'prev' }, el('span', { class: 'etiqueta', texto: 'Anterior:' }), ' ' + anterior.titulo)));
    if (siguiente) pasar.append(el('li', {}, el('a', { href: '#/leer/' + siguiente.cap, rel: 'next' }, el('span', { class: 'etiqueta', texto: 'Siguiente:' }), ' ' + siguiente.titulo)));
    const buzon = el('p', { class: 'enlace-buzon' }, '¿Has visto una errata o tienes una idea? ',
      el('a', { href: '#/buzon/' + cap }, 'Escribir al buzón sobre este capítulo'));
    main.replaceChildren(articulo, buzon, el('nav', { class: 'pasar', 'aria-label': 'Pasar de capítulo' }, pasar));
    ponerTitulo(c.titulo);
    marcarMenu(rutaMenu || '');
    if (!rutaMenu) guardar('jaris.ultimo', { cap: cap, titulo: c.titulo });
    let destino = null;
    if (ancla) {
      const objetivo = document.getElementById(ancla);
      if (objetivo) destino = objetivo.matches('section') ? (objetivo.querySelector('h1, h2, h3, h4, h5, h6') || objetivo) : objetivo;
    }
    terminar(destino);
  }

  /* ---------- Calendario ático (paso 2a-2) ---------- */
  const CAL = window.JarisCalendario, DATOS = window.JarisDatosCalendario, DIA_MS = 86400000;
  const formatoLargo = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const formatoCorto = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  function fechaCivil(dia, larga) { return (larga ? formatoLargo : formatoCorto).format(new Date(dia * DIA_MS)); }

  /* El lugar elegido; si no hay ninguno, el de la zona horaria del dispositivo (no se usa la ubicación). */
  function lugarElegido() {
    const l = DATOS.LUGARES.find(function (x) { return x.id === recuperar('jaris.lugar'); });
    if (l) return { lugar: l, elegido: true };
    let zona = '';
    try { zona = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) { /* nada */ }
    return { lugar: DATOS.LUGARES.find(function (x) { return x.zona === zona; }) || DATOS.LUGARES[0], elegido: false };
  }
  function modoSur(lugar) { return lugar.lat < 0 ? (recuperar('jaris.sur') || 'tal') : 'tal'; }

  /* Lo que se celebra cada día de un mes griego (sirve también para la pantalla de «Hoy»). */
  function celebracionesDelMes(anio, mes, lugar) {
    const modo = modoSur(lugar), porDia = {}, sinDia = [];
    const poner = function (d, cosa) { (porDia[d] = porDia[d] || []).push(cosa); };
    const dia = function (x) { return x === 'ultimo' ? mes.dias : Math.min(x, mes.dias); };
    for (const s of DATOS.DIAS_SAGRADOS) poner(dia(s.dia), { texto: s.texto, nota: s.nota, corto: CORTOS[s.dia] });
    for (const f of DATOS.FIESTAS) {
      const mover = modo === 'movido' || (modo === 'mixto' && f.campo);
      if ((mover ? DATOS.PAREJAS[f.mes] : f.mes) !== mes.nombre) continue;
      const nota = [f.nota, mover ? 'movida medio año por el hemisferio sur' : null].filter(Boolean).join('; ');
      if (f.desde === undefined) { sinDia.push({ titulo: f.nombre, texto: f.texto, nota: nota }); continue; }
      const d1 = dia(f.desde), d2 = f.hasta === undefined ? d1 : dia(f.hasta);
      for (let d = d1; d <= d2; d++) poner(d, { titulo: f.nombre, texto: f.texto, nota: nota, dias: d2 > d1 ? 'del ' + d1 + ' al ' + d2 : '' });
    }
    const fin = mes.inicio + mes.dias - 1;
    for (const f of DATOS.FIESTAS_DEL_SOL) {
      let invierno = f.solsticio === 'invierno';
      if (lugar.lat < 0 && modo !== 'tal') invierno = !invierno;
      for (const y of [anio.anio, anio.anio + 1]) {
        const d = CAL.diaLocal(invierno ? CAL.solsticioDiciembre(y) : CAL.solsticioJunio(y), lugar);
        if (d >= mes.inicio && d <= fin) poner(d - mes.inicio + 1, { titulo: f.nombre, texto: f.texto, nota: f.nota });
      }
    }
    return { porDia: porDia, sinDia: sinDia };
  }
  function textoCelebracion(c) {
    return (c.titulo ? c.titulo + ': ' : '') + c.texto + (c.dias ? ' (' + c.dias + ')' : '') + (c.nota ? ' (' + c.nota + ')' : '');
  }
  /* En pocas palabras: el nombre sin la pronunciación (para la lista del mes). */
  const CORTOS = { 1: 'Noumenia', 2: 'Agathos Daimon', 3: 'Atenea', 5: 'Horkos y las Erinias', 6: 'Ártemis', 7: 'Apolo',
    15: 'Luna llena, Atenea', 16: 'Ártemis', ultimo: 'Deipnon de Hécate' };
  function resumenCelebracion(c) {
    if (c.titulo) return c.titulo.replace(/\s*\(se dice [^)]*\)/g, '');
    return c.corto || c.texto;
  }

  /* «Qué se hace»: lo saca montar_aplicacion.py de los capítulos 10 (en casa) y 11 (ritos) en cada montaje. */
  let queHacer = null;
  function normalizar(s) {
    s = s.replace(/\([^)]*\)/g, ' ').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ');
    return s.trim().replace(/^(la|el|los|las)\s+/, '').split(/\s+/).join(' ');
  }
  function buscarQueHacer(clave) { return queHacer.fiestas.find(function (e) { return e.clave === clave; }); }
  function entradasDe(c, d, ultimo) {
    if (!c.titulo) {   /* días sagrados de cada mes */
      if (d === 1) return [buscarQueHacer('noumenia')];
      if (d === 2) return [buscarQueHacer('agathos daimon')];
      if (d === ultimo) return [buscarQueHacer('deipnon de hecate')];
      if (d === 5) return [];
      const r = [buscarQueHacer('dias sagrados del mes'), buscarQueHacer('dia de un dios')];
      if (d === 7) r.push(buscarQueHacer('llevar el laurel'));
      return r;
    }
    const n = ' ' + normalizar(c.titulo) + ' ';
    return queHacer.fiestas.filter(function (e) { return e.clave.length > 3 && (n.indexOf(' ' + e.clave + ' ') >= 0 || (' ' + e.clave + ' ').indexOf(n) >= 0); });
  }
  function queSeHace(cosas, d, ultimo) {
    const seccion = el('section', { 'aria-labelledby': 'que-hacer-titulo' }, el('h2', { id: 'que-hacer-titulo', texto: 'Qué se hace' }));
    if (!queHacer) { seccion.append(el('p', { texto: 'No se ha podido cargar. Vuelve a abrir este día dentro de un momento.' })); return seccion; }
    const vistas = new Set();
    let algo = false;
    for (const c of cosas) {
      const entradas = entradasDe(c, d, ultimo).filter(function (e) { return e && !vistas.has(e.clave); });
      if (!entradas.length) continue;
      seccion.append(el('h3', { texto: resumenCelebracion(c) }));
      for (const e of entradas) {
        vistas.add(e.clave);
        for (const t of (e.enCasa || [])) seccion.append(el('p', { texto: 'En casa: ' + t }));
        if (e.rito) {
          const p = el('p', { texto: 'Rito ' + e.rito.numero + (e.rito.corto ? ' (en corto): ' + e.rito.corto : '.') + ' ' });
          if (e.rito.cap && e.rito.ancla) p.append(el('a', { href: '#/leer/' + e.rito.cap + '/' + e.rito.ancla }, 'Ver el rito ' + e.rito.numero + ' en el Libro de ritos'));
          seccion.append(p);
        }
        algo = true;
      }
    }
    if (!algo) {
      const basico = buscarQueHacer('rito basico');
      const p = el('p', { texto: 'Nada especial: si quieres, tu práctica de siempre o el rito básico. ' });
      if (basico && basico.rito.ancla) p.append(el('a', { href: '#/leer/' + basico.rito.cap + '/' + basico.rito.ancla }, 'Ver el rito básico (rito 1)'));
      seccion.append(p);
    }
    if (queHacer.esquema && queHacer.esquema.ancla) {
      seccion.append(el('p', {}, el('a', { href: '#/leer/' + queHacer.esquema.cap + '/' + queHacer.esquema.ancla }, 'El esquema de cualquier fiesta (capítulo 10)')));
    }
    return seccion;
  }

  /* Un día con detalle: #/dia/AÑO/MES/DÍA */
  async function vistaDia(partes) {
    const mio = ++turno;
    if (!queHacer) { try { queHacer = await traer('contenido/que-hacer.json'); } catch (e) { /* se avisa en la sección */ } }
    if (mio !== turno) return;
    const lugar = lugarElegido().lugar, hoy = CAL.ahora(Date.now(), lugar);
    const anio = CAL.anioGriego(parseInt(partes[1], 10) || hoy.anio.anio, lugar);
    const mes = anio.meses[(parseInt(partes[2], 10) || 1) - 1];
    const d = parseInt(partes[3], 10);
    if (!mes || !(d >= 1 && d <= mes.dias)) return noEncontrada();
    const civil = mes.inicio + d - 1;
    const cel = celebracionesDelMes(anio, mes, lugar);
    const hora = new Intl.DateTimeFormat('es-ES', { hour: 'numeric', minute: '2-digit', timeZone: lugar.zona })
      .format(new Date(CAL.puestaDeSol(civil - 1, lugar)));
    const pantalla = el('div', { class: 'dia' },
      el('h1', { texto: d + ' de ' + mes.nombre + (d === mes.dias ? ', el último día del mes' : '') }),
      el('p', { texto: 'De día es el ' + fechaCivil(civil, true) + '. Empieza la tarde anterior, al ponerse el sol (hacia las ' + hora + ' en ' + lugar.nombre + ').' }));
    const cosas = cel.porDia[d] || [];
    pantalla.append(el('h2', { texto: 'Lo que se celebra' }));
    if (cosas.length) { const ul = el('ul'); for (const c of cosas) ul.append(el('li', { texto: textoCelebracion(c) })); pantalla.append(ul); }
    else pantalla.append(el('p', { texto: 'Este día no tiene ninguna fiesta ni día sagrado señalado. Es un buen día para tu práctica de siempre.' }));
    pantalla.append(queSeHace(cosas, d, mes.dias));
    const pc = await paraCantar(d, d === mes.dias, cosas);
    if (mio !== turno) return;
    if (pc) pantalla.append(pc);
    const ant = d > 1 ? '#/dia/' + anio.anio + '/' + mes.numero + '/' + (d - 1) : null;
    const sig = d < mes.dias ? '#/dia/' + anio.anio + '/' + mes.numero + '/' + (d + 1) : null;
    const nav = el('ul', { class: 'botones' });
    if (ant) nav.append(el('li', {}, el('a', { class: 'boton secundario', href: ant }, 'Día anterior')));
    if (sig) nav.append(el('li', {}, el('a', { class: 'boton secundario', href: sig }, 'Día siguiente')));
    nav.append(el('li', {}, el('a', { class: 'boton secundario', href: '#/calendario/' + anio.anio + '/' + mes.numero }, 'Volver al mes')));
    pantalla.append(el('nav', { 'aria-label': 'Cambiar de día' }, nav));
    main.replaceChildren(pantalla);
    ponerTitulo(d + ' de ' + mes.nombre);
    marcarMenu('#/calendario');
    terminar(null);
  }

  /* «Para cantar»: los salmos del Cancionero de ese día del mes o de los dioses de sus fiestas. */
  async function paraCantar(d, ultimo, cosas) {
    if (!window.JarisCancionero) return null;
    let salmos = [];
    try {
      const texto = ' ' + normalizar(cosas.filter(function (c) { return c.titulo; }).map(function (c) { return c.titulo + ' ' + c.texto; }).join(' ')) + ' ';
      salmos = await window.JarisCancionero.salmosDe({ traer: traer }, function (s) {
        return (s.dias || []).indexOf(d) >= 0 || (ultimo && (s.dias || []).indexOf('ultimo') >= 0) ||
          (s.dioses || []).some(function (x) { return texto.indexOf(' ' + normalizar(x) + ' ') >= 0; });
      });
    } catch (e) { return null; }
    if (!salmos.length) return null;
    const ul = el('ul');
    salmos.forEach(function (s) {
      ul.append(el('li', {}, el('a', { href: '#/cancionero/' + s.n }, s.titulo), ' (', el('a', { href: '#/cancionero/' + s.n + '/cantar' }, 'cantarlo verso a verso'), ')'));
    });
    return el('section', { 'aria-labelledby': 'para-cantar' }, el('h2', { id: 'para-cantar', texto: 'Para cantar' }), ul);
  }

  function capituloQueEmpieza(texto) {
    const c = libro.capitulos.find(function (x) { return x.titulo.indexOf(texto) === 0; });
    return c ? c.cap : null;
  }

  /* Formulario de «Tu lugar» (7B, 6 nov 2026): ciudad o país y, en el hemisferio sur, cómo seguir las fiestas.
     Lo usan la pantalla Calendario y Ajustes, para que las dos cambien exactamente lo mismo (jaris.lugar y jaris.sur).
     alGuardar(lugarNuevo) se llama después de guardar. */
  function formularioLugar(lugar, idSelect, alGuardar) {
    const select = el('select', { id: idSelect });
    let grupo = null;
    for (const l of DATOS.LUGARES) {
      if (!grupo || grupo.label !== l.pais) { grupo = el('optgroup', { label: l.pais }); select.append(grupo); }
      grupo.append(el('option', { value: l.id, selected: l === lugar ? 'selected' : null }, l.nombre + ' (' + l.pais + ')'));
    }
    const form = el('form', { class: 'form-lugar' },
      el('label', { for: idSelect, texto: 'Ciudad o país más cercano' }), select);
    if (lugar.lat < 0) {
      const modo = modoSur(lugar);
      const fs = el('fieldset', {}, el('legend', { texto: 'Estás en el hemisferio sur. ¿Cómo quieres seguir las fiestas?' }));
      [['tal', 'Tal cual, como en Grecia (lo que hace la mayoría)'],
        ['movido', 'Movido entero medio año, para que cada fiesta caiga en su estación'],
        ['mixto', 'Mixto: las fiestas del campo siguen tus estaciones y las demás se quedan en su fecha']].forEach(function (o) {
        fs.append(el('div', { class: 'opcion' }, el('input', { type: 'radio', name: 'sur', id: 'sur-' + o[0], value: o[0], checked: modo === o[0] ? 'checked' : null }),
          el('label', { for: 'sur-' + o[0], texto: o[1] })));
      });
      form.append(fs);
    }
    form.append(el('button', { type: 'submit' }, 'Guardar'));
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const nuevo = DATOS.LUGARES.find(function (x) { return x.id === select.value; });
      guardar('jaris.lugar', nuevo.id);
      const marcado = form.querySelector('input[name="sur"]:checked');
      if (marcado) guardar('jaris.sur', marcado.value);
      alGuardar(nuevo);
    });
    return form;
  }

  function vistaCalendario(partes, enfocarEn) {
    const elegido = lugarElegido(), lugar = elegido.lugar;
    const hoy = CAL.ahora(Date.now(), lugar);
    const pa = parseInt(partes[1], 10), pm = parseInt(partes[2], 10);
    const anio = pa ? CAL.anioGriego(pa, lugar) : hoy.anio;
    const mes = anio.meses[(pm || (pa ? 1 : hoy.numeroMes)) - 1] || anio.meses[0];
    const i = mes.numero - 1, fin = mes.inicio + mes.dias - 1;
    let rutaAnterior;
    if (i > 0) rutaAnterior = '#/calendario/' + anio.anio + '/' + i;
    else { const a = CAL.anioGriego(anio.anio - 1, lugar); rutaAnterior = '#/calendario/' + a.anio + '/' + a.meses.length; }
    const rutaSiguiente = i < anio.meses.length - 1 ? '#/calendario/' + anio.anio + '/' + (i + 2) : '#/calendario/' + (anio.anio + 1) + '/1';
    const cel = celebracionesDelMes(anio, mes, lugar);

    const pantalla = el('div', { class: 'calendario' }, el('h1', { texto: 'Calendario ático' }));
    pantalla.append(el('p', { texto: 'Calculado para ' + lugar.nombre + ' (' + lugar.pais + ')' +
      (elegido.elegido ? '.' : ', según la zona horaria de tu dispositivo. Puedes cambiar el lugar al final de esta página.') }));
    pantalla.append(el('p', { class: 'hoy-griego', texto: 'Hoy es ' + hoy.dia + ' de ' + hoy.mes + (hoy.trasLaPuesta ? ' (desde la puesta del sol)' : '') +
      '. Año ' + hoy.anio.anioOlimpiada + ' de la Olimpiada ' + hoy.anio.olimpiada + '.' }));
    pantalla.append(el('p', { texto: 'Cada día griego empieza la tarde anterior, al ponerse el sol: por eso muchas fiestas se celebran desde la víspera.' }));

    const tituloMes = el('h2', { id: 'mes-titulo', texto: mes.nombre + ': del ' + fechaCivil(mes.inicio) + ' al ' + fechaCivil(fin) + ' (' + mes.dias + ' días)' });
    pantalla.append(tituloMes);
    pantalla.append(el('nav', { 'aria-label': 'Cambiar de mes', class: 'meses-nav' }, el('ul', { class: 'botones' },
      el('li', {}, el('a', { class: 'boton secundario', href: rutaAnterior }, 'Mes anterior')),
      el('li', {}, el('a', { class: 'boton secundario', href: '#/calendario/' + hoy.anio.anio + '/' + hoy.numeroMes }, 'Mes de hoy')),
      el('li', {}, el('a', { class: 'boton secundario', href: rutaSiguiente }, 'Mes siguiente')))));

    /* Una línea por día, con lo que se celebra en pocas palabras; el detalle, al abrir el día. */
    pantalla.append(el('p', { texto: 'Abre un día para ver con detalle lo que se celebra.' }));
    const lista = el('ul', { class: 'dias' });
    for (let d = 1; d <= mes.dias; d++) {
      const civil = mes.inicio + d - 1, esHoy = civil === hoy.diaCivil;
      const resumen = (cel.porDia[d] || []).map(resumenCelebracion);
      lista.append(el('li', { 'aria-current': esHoy ? 'date' : null, class: esHoy ? 'es-hoy' : null },
        el('a', { href: '#/dia/' + anio.anio + '/' + mes.numero + '/' + d }, 'Día ' + d + ', ' + fechaCivil(civil, true) + (esHoy ? ' (hoy)' : '')),
        resumen.length ? '. ' + resumen.join('; ') + '.' : '.'));
    }
    pantalla.append(lista);
    if (cel.sinDia.length) {
      const ul = el('ul');
      for (const c of cel.sinDia) ul.append(el('li', { texto: textoCelebracion(c) }));
      pantalla.append(el('h3', { texto: 'Este mes, sin día conocido' }), ul);
    }

    const meses = el('ul');
    for (const m of anio.meses) {
      meses.append(el('li', {}, el('a', { href: '#/calendario/' + anio.anio + '/' + m.numero, 'aria-current': m === mes ? 'true' : null },
        m.nombre + ': desde el ' + fechaCivil(m.inicio))));
    }
    pantalla.append(el('h2', { texto: 'Los meses de este año (' + anio.anio + '-' + (anio.anio + 1) + ')' + (anio.embolismico ? ', con Poseideon II' : '') }), meses);

    /* Elegir el lugar (y, en el hemisferio sur, cómo seguir las fiestas): el mismo formulario que en Ajustes */
    const form = formularioLugar(lugar, 'lugar', function (nuevo) {
      vistaCalendario(partes, 'lugar-titulo');
      avisar('Guardado. Calendario calculado para ' + nuevo.nombre + '.');
    });
    pantalla.append(el('section', { 'aria-labelledby': 'lugar-titulo' }, el('h2', { id: 'lugar-titulo', texto: 'Lugar' }),
      el('p', { texto: 'El calendario se calcula para el lugar que elijas. Jaris no usa la ubicación de tu dispositivo, y lo que elijas se guarda solo en él.' }), form));

    const c8 = capituloQueEmpieza('Capítulo 8.'), c10 = capituloQueEmpieza('Capítulo 10.');
    const mas = el('ul');
    if (c8) mas.append(el('li', {}, el('a', { href: '#/leer/' + c8 }, 'Capítulo 8: calendario ático y fiestas')));
    if (c10) mas.append(el('li', {}, el('a', { href: '#/leer/' + c10 }, 'Capítulo 10: las fiestas en casa')));
    pantalla.append(el('h2', { texto: 'Para saber más' }), mas);

    main.replaceChildren(pantalla);
    ponerTitulo('Calendario: ' + mes.nombre);
    marcarMenu('#/calendario');
    terminar(enfocarEn ? document.getElementById(enfocarEn) : (pa ? tituloMes : null));
  }

  /* ---------- Hoy (paso 2b) ---------- */
  const cacheMeses = {};
  /* Fecha griega de un día civil, con lo que se celebra ese día. */
  function diaGriegoCompleto(civil, lugar) {
    const f = CAL.fechaGriega(civil, lugar);
    const mes = f.anio.meses[f.numeroMes - 1];
    const clave = f.anio.anio + '-' + mes.numero + '-' + lugar.id + '-' + modoSur(lugar);
    if (!cacheMeses[clave]) cacheMeses[clave] = celebracionesDelMes(f.anio, mes, lugar);
    return { f: f, mes: mes, cosas: cacheMeses[clave].porDia[f.dia] || [] };
  }
  function rutaDia(g) { return '#/dia/' + g.f.anio.anio + '/' + g.mes.numero + '/' + g.f.dia; }
  function resumenDia(cosas) { return cosas.length ? cosas.map(resumenCelebracion).join('; ') : 'ningún día sagrado ni fiesta señalados'; }

  /* La oración (o el himno) del día: la misma para todo el mundo ese día, porque sale de la fecha. */
  const DIOSES = ['Atenea', 'Apolo', 'Ártemis', 'Hermes', 'Afrodita', 'Heracles', 'Eros', 'Poseidón', 'Teseo', 'Hécate',
    'Deméter', 'Perséfone', 'Dioniso', 'Zeus', 'Hera', 'Hefesto', 'Helios', 'Rea', 'Musas', 'Crono', 'Asclepio', 'Hestia', 'Selene', 'Pan'];
  function textoDelDia(g, civil) {
    const todos = libro.oraciones.concat(libro.himnos);
    const elegir = function (lista) { return lista.length ? lista[((civil % lista.length) + lista.length) % lista.length] : null; };
    const contiene = function (x, palabra) { return (' ' + normalizar(x.t) + ' ').indexOf(' ' + normalizar(palabra) + ' ') >= 0; };
    if (g.f.dia === 1) { const r = elegir(libro.oraciones.filter(function (x) { return contiene(x, 'noumenia'); })); if (r) return r; }
    if (g.f.ultimo) { const r = elegir(libro.oraciones.filter(function (x) { return contiene(x, 'deipnon'); })); if (r) return r; }
    if (g.f.dia === 2) { const r = elegir(libro.oraciones.filter(function (x) { return contiene(x, 'agathos daimon'); })); if (r) return r; }
    for (const c of g.cosas) if (c.titulo) {
      const r = elegir(todos.filter(function (x) { return contiene(x, resumenCelebracion(c)); }));
      if (r) return r;
    }
    const texto = g.cosas.map(function (c) { return (c.titulo || '') + ' ' + c.texto; }).join(' ');
    const dioses = DIOSES.filter(function (d) { return (' ' + normalizar(texto) + ' ').indexOf(' ' + normalizar(d) + ' ') >= 0; });
    if (dioses.length) {
      const r = elegir(todos.filter(function (x) { return dioses.some(function (d) { return contiene(x, d); }); }));
      if (r) return r;
    }
    const cap6 = capituloQueEmpieza('Capítulo 6.');
    return elegir(libro.oraciones.filter(function (x) { return x.cap === cap6; })) || elegir(libro.oraciones);
  }
  /* Saca del capítulo el texto de una oración o un himno (si es muy largo, solo el principio). */
  async function fragmento(t) {
    const caja = el('div', { class: 'fragmento' });
    try {
      const plantilla = document.createElement('template');
      plantilla.innerHTML = await capitulo(t.cap);
      const sec = plantilla.content.getElementById(t.a);
      if (!sec) throw new Error('sin texto');
      let largo = 0, cortado = false;
      for (const hijo of Array.from(sec.children)) {
        if (/^H[1-6]$/.test(hijo.tagName) && hijo === sec.firstElementChild) continue;
        if (hijo.tagName === 'SECTION' || largo > 2500) { cortado = true; break; }
        const copia = hijo.cloneNode(true);
        copia.querySelectorAll('[id]').forEach(function (n) { n.removeAttribute('id'); });
        if (/^H[1-6]$/.test(copia.tagName)) { const p = el('p', {}, el('strong', { texto: copia.textContent })); caja.append(p); }
        else caja.append(copia);
        largo += copia.textContent.length;
      }
      if (cortado) caja.append(el('p', { texto: 'Sigue en el libro.' }));
    } catch (e) { caja.append(el('p', { texto: 'Ábrelo en el libro con el enlace de abajo.' })); }
    caja.append(el('p', {}, el('a', { href: '#/leer/' + t.cap + '/' + t.a }, 'Abrir «' + t.t + '» en el libro')));
    return caja;
  }

  /* Acceso rápido a lo de hoy, al principio de la portada. */
  function accesoHoy() {
    try {
      const lugar = lugarElegido().lugar, ahora = CAL.ahora(Date.now(), lugar);
      const g = diaGriegoCompleto(ahora.diaCivil, lugar);
      return el('section', { class: 'acceso-hoy', 'aria-labelledby': 'acceso-hoy-titulo' },
        el('h2', { id: 'acceso-hoy-titulo', texto: 'Hoy' }),
        el('p', { texto: 'Hoy es ' + g.f.dia + ' de ' + g.mes.nombre + ': ' + resumenDia(g.cosas) + '.' }),
        el('p', {}, el('a', { class: 'boton', href: '#/hoy' }, 'Ver lo de hoy')));
    } catch (e) { return null; }
  }

  async function vistaHoy() {
    const mio = ++turno;
    if (!queHacer) { try { queHacer = await traer('contenido/que-hacer.json'); } catch (e) { /* se avisa en la sección */ } }
    const lugar = lugarElegido().lugar, ahora = CAL.ahora(Date.now(), lugar);
    const civil = ahora.diaCivil, g = diaGriegoCompleto(civil, lugar);
    const hora = function (ms) { return new Intl.DateTimeFormat('es-ES', { hour: 'numeric', minute: '2-digit', timeZone: lugar.zona }).format(new Date(ms)); };
    const t = textoDelDia(g, civil);
    const texto = t ? await fragmento(t) : null;
    if (texto && window.JarisFavoritos) { try { texto.prepend(window.JarisFavoritos.botonPara(t)); } catch (e) { /* nada */ } }
    if (texto && window.JarisAudios) { try { const b = await window.JarisAudios.botonesPara(t.cap, t.a); if (b) texto.prepend(b); } catch (e) { /* nada */ } }
    if (mio !== turno) return;

    const pantalla = el('div', { class: 'hoy' },
      el('h1', { texto: 'Hoy, ' + g.f.dia + ' de ' + g.mes.nombre + (g.f.ultimo ? ' (último día del mes)' : '') }),
      el('p', { texto: (ahora.trasLaPuesta ? 'Empezó esta tarde, al ponerse el sol. De día será el ' : 'Es el ') + fechaCivil(civil, true) +
        '. Año ' + g.f.anio.anioOlimpiada + ' de la Olimpiada ' + g.f.anio.olimpiada + ', en ' + lugar.nombre + '.' }));
    pantalla.append(el('h2', { texto: 'Lo que se celebra' }));
    if (g.cosas.length) { const ul = el('ul'); for (const c of g.cosas) ul.append(el('li', { texto: textoCelebracion(c) })); pantalla.append(ul); }
    else pantalla.append(el('p', { texto: 'Hoy no hay ningún día sagrado ni fiesta señalados.' }));
    pantalla.append(queSeHace(g.cosas, g.f.dia, g.mes.dias));
    const pc = await paraCantar(g.f.dia, !!g.f.ultimo, g.cosas);
    if (mio !== turno) return;
    if (pc) pantalla.append(pc);

    if (t) pantalla.append(el('section', { 'aria-labelledby': 'texto-dia' }, el('h2', { id: 'texto-dia', texto: 'Para leer hoy: ' + t.t }), texto));

    /* Mañana y los próximos días señalados */
    const m = diaGriegoCompleto(civil + 1, lugar);
    /* El día de mañana empieza al ponerse el sol del día civil de hoy. */
    const empieza = (ahora.trasLaPuesta ? 'mañana' : 'esta tarde') + ' al ponerse el sol, hacia las ' + hora(CAL.puestaDeSol(civil, lugar));
    pantalla.append(el('h2', { texto: 'Mañana' }), el('p', {},
      el('a', { href: rutaDia(m) }, m.f.dia + ' de ' + m.mes.nombre), ': ' + resumenDia(m.cosas) + '. Empieza ' + empieza + '.'));
    const proximos = el('ul'), vistos = new Set();
    for (let d = civil + 2; d < civil + 60 && vistos.size < 5; d++) {
      const p = diaGriegoCompleto(d, lugar);
      for (const c of p.cosas) {
        const nombre = c.titulo ? resumenCelebracion(c) : (p.f.dia === 1 ? 'Noumenia' : (p.f.ultimo ? 'Deipnon de Hécate' : null));
        if (!nombre || vistos.has(nombre) || vistos.size >= 5) continue;
        vistos.add(nombre);
        proximos.append(el('li', {}, el('a', { href: rutaDia(p) }, nombre), ': ' + p.f.dia + ' de ' + p.mes.nombre + ', ' +
          fechaCivil(d, true) + ' (dentro de ' + (d - civil) + ' días).'));
      }
    }
    pantalla.append(el('h2', { texto: 'Próximos días señalados' }), proximos,
      el('p', {}, el('a', { href: '#/calendario' }, 'Ver el calendario del mes')));

    main.replaceChildren(pantalla);
    ponerTitulo('Hoy');
    marcarMenu('#/hoy');
    terminar(null);
  }

  /* ---------- Audios: descargar por bloques (paso 3c; la pantalla la hace audios.js) ---------- */
  async function vistaAudios(partes) {
    const mio = ++turno;
    const pantalla = window.JarisAudios ? await window.JarisAudios.pantalla() : el('h1', { texto: 'Audios' });
    if (mio !== turno) return;
    main.replaceChildren(pantalla);
    ponerTitulo('Audios');
    marcarMenu('#/audios');
    /* #/audios/dios/Atenea (desde el buscador): el foco va al grupo de ese dios */
    let destino = null;
    if (partes && partes[1] === 'dios' && partes[2]) {
      destino = Array.from(main.querySelectorAll('.aud-grupo h3')).find(function (h) { return h.textContent === partes[2]; }) || null;
    }
    terminar(destino);
  }

  /* ---------- Buscar (paso 4a; la pantalla la hace buscar.js) ---------- */
  async function vistaBuscar(partes) {
    const mio = ++turno;
    if (!window.JarisBuscar) return noEncontrada();
    main.replaceChildren(el('h1', { texto: 'Buscar' }), el('p', { texto: 'Preparando el buscador…' }));
    const r = await window.JarisBuscar.pantalla(partes, { el: el, libro: libro, capitulo: capitulo, avisar: avisar, DATOS: DATOS });
    if (mio !== turno) return;
    main.replaceChildren(r.nodo);
    ponerTitulo(r.titulo);
    marcarMenu('#/buscar');
    terminar(r.destino);
  }

  /* ---------- Favoritos (paso 4b; la pantalla la hace favoritos.js) ---------- */
  function vistaFavoritos() {
    ++turno;
    if (!window.JarisFavoritos) return noEncontrada();
    main.replaceChildren(window.JarisFavoritos.pantalla());
    ponerTitulo('Favoritos');
    marcarMenu('#/favoritos');
    terminar(null);
  }

  /* ---------- Aprender de memoria (paso 4c; la pantalla la hace aprender.js) ---------- */
  async function vistaAprender(partes) {
    const mio = ++turno;
    if (!window.JarisAprender || !partes[1]) return noEncontrada();
    const r = await window.JarisAprender.pantalla(partes, { el: el, capitulo: capitulo, avisar: avisar, libro: libro });
    if (mio !== turno) return;
    main.replaceChildren(r.nodo);
    ponerTitulo(r.titulo);
    marcarMenu('#/favoritos');
    terminar(null);
  }

  /* ---------- Oráculo (parte 5; la pantalla la hace oraculo.js) ---------- */
  async function vistaOraculo(partes) {
    const mio = ++turno;
    if (!window.JarisOraculo) return noEncontrada();
    const r = await window.JarisOraculo.pantalla(partes, { el: el, capitulo: capitulo, avisar: avisar, libro: libro });
    if (mio !== turno) return;
    main.replaceChildren(r.nodo);
    ponerTitulo(r.titulo);
    marcarMenu('#/oraculo');
    terminar(null);
  }

  /* ---------- Buzón de sugerencias y erratas (paso 6-2; la pantalla la hace buzon.js) ---------- */
  async function vistaBuzon(partes) {
    const mio = ++turno;
    if (!window.JarisBuzon) return noEncontrada();
    const r = await window.JarisBuzon.pantalla(partes, { el: el, avisar: avisar, libro: libro });
    if (mio !== turno) return;
    main.replaceChildren(r.nodo);
    ponerTitulo(r.titulo);
    marcarMenu('');
    terminar(null);
  }

  /* ---------- Mi diario helénico (parte 6b; la pantalla la hace diario.js) ---------- */
  /* Lo del calendario que necesita el diario: la fecha griega y lo que se celebra un día civil. */
  function diaParaDiario(civil) {
    const lugar = lugarElegido().lugar, g = diaGriegoCompleto(civil, lugar);
    const t = textoDelDia(g, civil);
    return {
      civil: civil, fecha: fechaCivil(civil, false), fechaLarga: fechaCivil(civil, true),
      griego: g.f.dia + ' de ' + g.mes.nombre + (g.f.ultimo ? ' (último día del mes)' : ''),
      anio: 'año ' + g.f.anio.anioOlimpiada + ' de la Olimpiada ' + g.f.anio.olimpiada,
      dia: g.f.dia, ultimo: !!g.f.ultimo, mesNumero: g.mes.numero, lugar: lugar.nombre,
      fiestas: g.cosas.filter(function (c) { return c.titulo; }).map(resumenCelebracion),
      resumen: resumenDia(g.cosas), ruta: rutaDia(g), texto: t ? { t: t.t, cap: t.cap, a: t.a } : null,
    };
  }
  function hoyCivil() { const lugar = lugarElegido().lugar; return CAL.ahora(Date.now(), lugar).diaCivil; }
  /* La hora y la fecha en el lugar elegido (no en el del dispositivo): sirve para el diario y la noche. */
  function momentoLugar() {
    const le = lugarElegido(), lugar = le.lugar, ahora = CAL.ahora(Date.now(), lugar);
    let hora = 12;
    try { hora = +new Intl.DateTimeFormat('es-ES', { hour: 'numeric', hourCycle: 'h23', timeZone: lugar.zona }).format(new Date()); } catch (e) { /* nada */ }
    const g = diaGriegoCompleto(ahora.diaCivil + 1, lugar);
    return { civil: ahora.diaCivil, hora: hora, trasLaPuesta: ahora.trasLaPuesta, lugar: lugar.nombre, elegido: le.elegido,
      griegoNoche: g.f.dia + ' de ' + g.mes.nombre };
  }
  async function vistaDiario(partes) {
    const mio = ++turno;
    if (!window.JarisDiario) return noEncontrada();
    const r = await window.JarisDiario.pantalla(partes, { el: el, avisar: avisar, libro: libro, traer: traer,
      dia: diaParaDiario, hoy: hoyCivil, momento: momentoLugar, DIOSES: DIOSES });
    if (mio !== turno) return;
    main.replaceChildren(r.nodo);
    ponerTitulo(r.titulo);
    marcarMenu('#/diario');
    terminar(r.foco || null);
  }

  /* ---------- El rincón de la noche (extra; la pantalla la hace noche.js) ---------- */
  /* Qué día griego empieza (o ha empezado ya) esta noche, al ponerse el sol. De madrugada (antes de las 5) cuenta el día de ayer. */
  function nocheInfo() {
    const lugar = lugarElegido().lugar, ahora = CAL.ahora(Date.now(), lugar);
    const madrugada = momentoLugar().hora < 5;   // la hora del lugar elegido, no la del dispositivo
    const base = madrugada ? ahora.diaCivil - 1 : ahora.diaCivil;
    const g = diaGriegoCompleto(base + 1, lugar);
    const hora = new Intl.DateTimeFormat('es-ES', { hour: 'numeric', minute: '2-digit', timeZone: lugar.zona }).format(new Date(CAL.puestaDeSol(base, lugar)));
    return { base: base, yaEmpezo: madrugada || ahora.trasLaPuesta, hora: hora,
      griego: g.f.dia + ' de ' + g.mes.nombre, resumen: resumenDia(g.cosas), ruta: rutaDia(g) };
  }
  async function vistaNoche() {
    const mio = ++turno;
    if (!window.JarisNoche) return noEncontrada();
    const r = await window.JarisNoche.pantalla({ el: el, avisar: avisar, libro: libro, capitulo: capitulo, fragmento: fragmento,
      noche: nocheInfo, dia: diaParaDiario });
    if (mio !== turno) return;
    main.replaceChildren(r.nodo);
    ponerTitulo(r.titulo);
    marcarMenu('#/noche');
    terminar(null);
  }

  /* ---------- Cancionero (extra 2; la pantalla la hace cancionero.js) ---------- */
  async function vistaCancionero(partes) {
    const mio = ++turno;
    if (!window.JarisCancionero) return noEncontrada();
    const r = await window.JarisCancionero.pantalla(partes, { el: el, avisar: avisar, libro: libro, traer: traer });
    if (mio !== turno) return;
    main.replaceChildren(r.nodo);
    ponerTitulo(r.titulo);
    marcarMenu('#/cancionero');
    terminar(r.foco || null);
  }

  /* ---------- Ajustes (6 de noviembre de 2026): pantalla #/ajustes, en bloques ----------
     Todo se guarda en el navegador, con claves «jaris.*» (para que la copia de seguridad de la sesión 7 las recoja).
     Cada ajuste de lectura pone un atributo «data-...» en <html>, y app.css cambia el aspecto según ese atributo.
     Si el valor es el de por defecto, el atributo no se pone. Los demás bloques llegan en las sesiones 7 y 7B. */
  const AJUSTES_LECTURA = [
    { clave: 'jaris.letra', atributo: 'data-letra', defecto: 'normal', titulo: 'Tamaño de la letra',
      opciones: [['normal', 'Normal'], ['grande', 'Grande'], ['muygrande', 'Muy grande']] },
    { clave: 'jaris.tema', atributo: 'data-tema', defecto: 'auto', titulo: 'Tema',
      opciones: [['auto', 'Automático (el del dispositivo)'], ['claro', 'Claro'], ['oscuro', 'Oscuro']] },
    { clave: 'jaris.contraste', atributo: 'data-contraste', defecto: 'normal', titulo: 'Contraste',
      opciones: [['normal', 'Normal'], ['alto', 'Alto contraste']] },
    { clave: 'jaris.interlineado', atributo: 'data-interlineado', defecto: 'normal', titulo: 'Espacio entre líneas',
      opciones: [['normal', 'Normal'], ['amplio', 'Amplio'], ['muyamplio', 'Muy amplio']] },
    { clave: 'jaris.ancho', atributo: 'data-ancho', defecto: 'normal', titulo: 'Ancho del texto',
      opciones: [['estrecho', 'Estrecho'], ['normal', 'Normal'], ['ancho', 'Ancho']] },
    { clave: 'jaris.sedice', atributo: 'data-sedice', defecto: 'si', titulo: 'Pronunciaciones',
      ayuda: 'Son las que van entre paréntesis después de «se dice», para saber cómo se pronuncia una palabra.',
      opciones: [['si', 'Mostrarlas'], ['no', 'Ocultarlas']] }
  ];
  function ajusteValor(a) {
    const v = recuperar(a.clave);
    return a.opciones.some(function (o) { return o[0] === v; }) ? v : a.defecto;
  }
  function aplicarAjustes() {
    const raiz = document.documentElement;
    AJUSTES_LECTURA.forEach(function (a) {
      const v = ajusteValor(a);
      if (v === a.defecto) raiz.removeAttribute(a.atributo); else raiz.setAttribute(a.atributo, v);
    });
    /* La velocidad de los audios también es un ajuste: el reproductor toma lo guardado (si ya está cargado). */
    if (window.JarisAudios && window.JarisAudios.sincronizarVelocidad) window.JarisAudios.sincronizarVelocidad();
  }
  window.JarisAjustes = { valor: function (clave) { const a = AJUSTES_LECTURA.find(function (x) { return x.clave === clave; }); return a ? ajusteValor(a) : null; }, aplicar: aplicarAjustes };
  aplicarAjustes();

  /* Pronunciaciones: lo que va entre paréntesis después de «se dice» se envuelve en <span class="se-dice">,
     y app.css lo oculta cuando <html> lleva data-sedice="no". Se hace sobre lo que se pinta en <main>
     (capítulos, Hoy, Calendario...), sin tocar los textos del libro; no en Aprender ni en Ajustes. */
  function envolverSeDice(raiz) {
    const recorrido = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!/\(se dice\b/i.test(n.nodeValue)) return NodeFilter.FILTER_REJECT;
        const p = n.parentElement;
        if (!p || p.closest('.se-dice, .aprender, .ajustes, script, style, textarea')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodos = [];
    while (recorrido.nextNode()) nodos.push(recorrido.currentNode);
    nodos.forEach(function (n) {
      const texto = n.nodeValue;
      const re = /\s*\(se dice\b[^()]*\)/gi;
      const trozos = document.createDocumentFragment();
      let m, ultimo = 0;
      while ((m = re.exec(texto))) {
        if (m.index > ultimo) trozos.append(texto.slice(ultimo, m.index));
        const s = document.createElement('span');
        s.className = 'se-dice';
        s.textContent = m[0];
        trozos.append(s);
        ultimo = m.index + m[0].length;
      }
      if (!trozos.hasChildNodes()) return;
      if (ultimo < texto.length) trozos.append(texto.slice(ultimo));
      n.replaceWith(trozos);
    });
  }
  if (window.MutationObserver) {
    let pendienteSeDice = false;
    const vigiaSeDice = new MutationObserver(function () {
      if (pendienteSeDice) return;
      pendienteSeDice = true;
      setTimeout(function () {
        pendienteSeDice = false;
        vigiaSeDice.disconnect();
        try { envolverSeDice(main); } catch (e) { /* si falla, se ve todo: no pasa nada */ }
        vigiaSeDice.observe(main, { childList: true, subtree: true });
      }, 0);
    });
    vigiaSeDice.observe(main, { childList: true, subtree: true });
  }

  /* ---------- Tus datos (6 de noviembre de 2026, sesión 7): copia de seguridad en un archivo ----------
     La copia recoge lo que es de la persona: diario, favoritos, Aprender, oráculo, cantar, velocidad, lugar y ajustes de lectura.
     NO recoge lo interno: jaris.errores, jaris.edicion, jaris.novedadesAntes, jaris.ultimo, jaris.presentacion. */
  const CLAVES_DATOS = ['jaris.diario', 'jaris.favoritos', 'jaris.aprender', 'jaris.oraculo', 'jaris.cantar',
    'jaris.velocidad', 'jaris.lugar', 'jaris.sur'].concat(AJUSTES_LECTURA.map(function (a) { return a.clave; }));
  function datosDelDispositivo() {
    const datos = {};
    CLAVES_DATOS.forEach(function (c) {
      let t = null;
      try { t = localStorage.getItem(c); } catch (e) { t = null; }
      if (t === null) return;
      try { datos[c] = JSON.parse(t); } catch (e) { datos[c] = t; }
    });
    return datos;
  }
  function juntarLista(partes) {
    if (partes.length < 2) return partes.join('');
    return partes.slice(0, -1).join(', ') + ' y ' + partes[partes.length - 1];
  }
  /* Qué trae un conjunto de datos, en frases cortas (sirve para decir qué se guarda y, luego, qué trae una copia). */
  function resumenDatos(datos) {
    const partes = [];
    const lleno = function (v) { return !!v && (Array.isArray(v) ? v.length > 0 : typeof v === 'object' ? Object.keys(v).length > 0 : true); };
    const d = datos['jaris.diario'];
    const nEntradas = d && d.entradas ? Object.keys(d.entradas).length : 0;
    if (nEntradas) partes.push(nEntradas + (nEntradas === 1 ? ' entrada de diario' : ' entradas de diario'));
    if (d && d.cumple) partes.push('tu cumpleaños');   /* revisión parte 3: sin esto, con solo el cumpleaños, «Borrar» decía que no había nada */
    const f = datos['jaris.favoritos'];
    if (f && Array.isArray(f.listas)) {
      const vistos = {};
      f.listas.forEach(function (l) { (l.items || []).forEach(function (x) { vistos[x.cap + '/' + x.a] = true; }); });
      const nFav = Object.keys(vistos).length;
      const nListas = f.listas.filter(function (l) { return l.items && l.items.length; }).length;
      if (nFav) partes.push(nFav + (nFav === 1 ? ' favorito' : ' favoritos') + (nListas > 1 ? ' en ' + nListas + ' listas' : ''));
    }
    if (lleno(datos['jaris.aprender'])) partes.push('tu progreso en Aprender');
    if (lleno(datos['jaris.oraculo'])) partes.push('tus preferencias del oráculo');
    if (lleno(datos['jaris.cantar'])) partes.push('por dónde ibas en los salmos');
    const otros = AJUSTES_LECTURA.map(function (a) { return a.clave; }).concat(['jaris.velocidad', 'jaris.lugar', 'jaris.sur']);
    if (otros.some(function (c) { return datos[c] !== undefined; })) partes.push('tus ajustes');
    return partes;
  }
  function fechaLocalISO() {
    const h = new Date();
    return h.getFullYear() + '-' + String(h.getMonth() + 1).padStart(2, '0') + '-' + String(h.getDate()).padStart(2, '0');
  }
  function hacerCopia() {
    const datos = datosDelDispositivo();
    if (!Object.keys(datos).length) return null;
    const copia = { jaris: 'copia-de-datos', formato: 1, fecha: new Date().toISOString(),
      edicion: (typeof libro !== 'undefined' && libro && libro.version) ? libro.version : '', datos: datos };
    return { texto: JSON.stringify(copia, null, 1), nombre: 'Jaris - copia de mis datos (' + fechaLocalISO() + ').json', partes: resumenDatos(datos) };
  }
  function descargarArchivo(nombre, texto, tipo) {
    const blob = new Blob([texto], { type: tipo });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombre;
    document.body.append(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
  }
  /* ---- El diario para leerlo (parte 4): un archivo .md con un título por cada día, del más antiguo al más nuevo ----
     PRACTICAS_MD y CAMPOS_MD repiten NOMBRES_PRACTICA y CAMPOS de diario.js: si allí cambian, hay que cambiarlas aquí. */
  const PRACTICAS_MD = { rezar: 'he rezado', libacion: 'he hecho una libación', incienso: 'he ofrecido incienso',
    himno: 'he leído, recitado o cantado un himno', rito: 'he hecho el rito del día', ofrenda: 'he hecho otra ofrenda', texto: 'he leído el texto del día' };
  const CAMPOS_MD = [['ofrecido', 'Qué he rezado u ofrecido'], ['preguntas', 'Mi respuesta a la pregunta del día'], ['libre', 'Escritura libre'],
    ['gracias', 'Doy las gracias por'], ['senales', 'Señales'], ['suenos', 'Sueños'], ['sensaciones', 'Lo que he sentido']];
  const formatoDiaMD = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const formatoFechaMD = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  /* El texto escrito por la persona, sin que Markdown lo confunda con títulos, listas o citas; cada salto de línea se conserva. */
  function mdTexto(t) {
    const lineas = String(t).replace(/\r\n?/g, '\n').trim().split('\n');
    return lineas.map(function (l, i) {
      let s = l.replace(/\s+$/, '').replace(/^(\s*)(\d+)([.)])(?=\s)/, '$1$2\\$3').replace(/^(\s*)([#>*+=`|~-])/, '$1\\$2');
      if (s && i < lineas.length - 1 && lineas[i + 1].trim()) s += '  ';
      return s;
    }).join('\n');
  }
  function mdLinea(t) { return mdTexto(t).replace(/\s+/g, ' ').trim(); }
  function diarioEnMarkdown() {
    const d = limpiarDatos(datosDelDispositivo())['jaris.diario'];
    const claves = d ? Object.keys(d.entradas).sort() : [];
    if (!claves.length) return null;
    const fecha = function (k, conSemana) {
      const m = k.split('-');
      const t = (conSemana ? formatoDiaMD : formatoFechaMD).format(new Date(Date.UTC(+m[0], +m[1] - 1, +m[2])));
      return conSemana ? t.charAt(0).toUpperCase() + t.slice(1) : t;
    };
    const desde = fecha(claves[0]), hasta = fecha(claves[claves.length - 1]);
    const sal = ['# Mi diario helénico', '',
      'Copia hecha el ' + fecha(fechaLocalISO(), true).toLowerCase() + '. ' + claves.length + (claves.length === 1 ? ' día con entrada' : ' días con entradas') +
      (claves.length > 1 ? ', del ' + desde + ' al ' + hasta : ', el ' + desde) + '.'];
    claves.forEach(function (k) {
      const e = d.entradas[k];
      sal.push('', '## ' + fecha(k, true));
      if (typeof e.griego === 'string' && e.griego.trim()) sal.push('', 'Día griego: ' + mdLinea(e.griego));
      let escrito = 0;
      if (Array.isArray(e.practica) && e.practica.length) {
        const hechas = e.practica.map(function (p) {
          return p === 'texto' && e.textoDelDia && e.textoDelDia.t ? 'he leído el texto del día, «' + e.textoDelDia.t + '»' : (PRACTICAS_MD[p] || String(p));
        });
        sal.push('', '**Lo que he hecho:** ' + mdTexto(hechas.join(', ') + '.'));
        escrito++;
      }
      if (typeof e.dioses === 'string' && e.dioses.trim()) { sal.push('', '**A qué dioses:** ' + mdLinea(e.dioses)); escrito++; }
      CAMPOS_MD.forEach(function (c) {
        if (typeof e[c[0]] === 'string' && e[c[0]].trim()) { sal.push('', '### ' + c[1], '', mdTexto(e[c[0]])); escrito++; }
      });
      const pl = e.plantilla && typeof e.plantilla === 'object' ? e.plantilla : {};
      Object.keys(pl).forEach(function (p) {
        if (typeof pl[p] === 'string' && pl[p].trim()) { sal.push('', '### ' + mdLinea(p), '', mdTexto(pl[p])); escrito++; }
      });
      if (!escrito) sal.push('', 'Sin nada escrito.');
    });
    return { texto: '\uFEFF' + sal.join('\n') + '\n', dias: claves.length, desde: desde, hasta: hasta };
  }
  /* ---- Recuperar una copia (parte 2) ---- */
  let mensajeDatos = '';   /* lo que se dice al volver a pintar Ajustes tras recuperar una copia */
  const FECHA_DIARIO = /^\d{4}-\d{2}-\d{2}$/;
  /* Deja solo lo que Jaris sabe leer: ni claves ajenas ni formas raras (una copia puede venir de un archivo cualquiera). */
  function limpiarDatos(datos) {
    const r = {};
    const objeto = function (v) { return !!v && typeof v === 'object' && !Array.isArray(v); };
    CLAVES_DATOS.forEach(function (c) {
      const v = datos[c];
      if (v === undefined || v === null) return;
      if (c === 'jaris.diario') {
        if (!objeto(v) || !objeto(v.entradas)) return;
        const entradas = {};
        Object.keys(v.entradas).forEach(function (k) { if (FECHA_DIARIO.test(k) && objeto(v.entradas[k])) entradas[k] = v.entradas[k]; });
        r[c] = Object.assign({}, v, { entradas: entradas });
      } else if (c === 'jaris.favoritos') {
        if (!objeto(v) || !Array.isArray(v.listas)) return;
        const listas = v.listas.filter(function (l) { return objeto(l) && typeof l.id === 'string' && Array.isArray(l.items); })
          .map(function (l) { return Object.assign({}, l, { items: l.items.filter(function (x) { return objeto(x) && typeof x.cap === 'string' && typeof x.a === 'string'; }) }); });
        r[c] = Object.assign({}, v, { listas: listas });
      } else if (c === 'jaris.aprender' || c === 'jaris.cantar' || c === 'jaris.oraculo') {
        if (objeto(v)) r[c] = v;
      } else if (c === 'jaris.sur') {
        if (['tal', 'movido', 'mixto'].indexOf(v) >= 0) r[c] = v;   /* revisión parte 3: un valor raro hacía decir «undefined» en Ajustes */
      } else if (typeof v === 'string' || typeof v === 'number') {
        r[c] = v;   /* lugar, velocidad y ajustes de lectura: solo valores sencillos (cada pantalla ya ignora los que no conoce) */
      }
    });
    return r;
  }
  function copiaValida(texto) {
    let j = null;
    try { j = JSON.parse(texto); } catch (e) { return { error: 'No se puede leer ese archivo: no es una copia de datos de Jaris. No se ha cambiado nada.' }; }
    if (!j || j.jaris !== 'copia-de-datos' || !j.datos || typeof j.datos !== 'object') return { error: 'Ese archivo no es una copia de datos de Jaris. No se ha cambiado nada.' };
    /* Revisión parte 3: una copia hecha por una edición futura (formato 2 o más) podría guardar el diario de otra forma y perderse al leerla con esta. */
    if (typeof j.formato === 'number' && j.formato > 1) return { error: 'Esta copia la ha hecho una edición más nueva de Jaris. Abre la edición nueva y vuelve a recuperarla. No se ha cambiado nada.' };
    return { datos: limpiarDatos(j.datos), fecha: j.fecha || '' };
  }
  /* Juntar: se suma todo; si hay conflicto, gana lo que ya hay en el dispositivo, salvo en el diario, donde gana la entrada más reciente de cada día. */
  function fusionar(actual, copia) {
    const r = {};
    CLAVES_DATOS.forEach(function (c) {
      const a = actual[c], b = copia[c];
      if (b === undefined) { if (a !== undefined) r[c] = a; return; }
      if (a === undefined) { r[c] = b; return; }
      if (c === 'jaris.diario') {
        const m = Object.assign({}, a, { entradas: Object.assign({}, a.entradas) });
        Object.keys(b.entradas).forEach(function (k) {
          const x = m.entradas[k], y = b.entradas[k];
          if (!x || (Number(y.actualizada) || 0) > (Number(x.actualizada) || 0)) m.entradas[k] = y;
        });
        if (!m.cumple && b.cumple) m.cumple = b.cumple;
        r[c] = m;
      } else if (c === 'jaris.favoritos') {
        const m = Object.assign({}, a, { listas: a.listas.map(function (l) { return Object.assign({}, l, { items: l.items.slice() }); }) });
        b.listas.forEach(function (l) {
          const mia = m.listas.find(function (x) { return x.id === l.id; });
          if (!mia) { m.listas.push(l); return; }
          l.items.forEach(function (it) { if (!mia.items.some(function (x) { return x.cap === it.cap && x.a === it.a; })) mia.items.push(it); });
        });
        r[c] = m;
      } else if (c === 'jaris.aprender' || c === 'jaris.cantar' || c === 'jaris.oraculo') {
        r[c] = Object.assign({}, b, a);
      } else {
        r[c] = a;
      }
    });
    return r;
  }
  function fotoDelDispositivo() {
    const f = {};
    CLAVES_DATOS.forEach(function (c) { try { f[c] = localStorage.getItem(c); } catch (e) { f[c] = null; } });
    return f;
  }
  /* Escribe los datos; si algo falla a medias, deja el dispositivo como estaba (por la foto de antes). */
  function escribirDatos(datos, sustituir) {
    const foto = fotoDelDispositivo();
    try {
      if (sustituir) CLAVES_DATOS.forEach(function (c) { localStorage.removeItem(c); });
      Object.keys(datos).forEach(function (c) { localStorage.setItem(c, JSON.stringify(datos[c])); });
      return true;
    } catch (e) {
      CLAVES_DATOS.forEach(function (c) {
        try { if (foto[c] === null) localStorage.removeItem(c); else localStorage.setItem(c, foto[c]); } catch (x) { /* nada */ }
      });
      return false;
    }
  }
  function bloqueDatos() {
    const bloque = el('section', { 'aria-labelledby': 'ajustes-datos' },
      el('h2', { id: 'ajustes-datos', texto: 'Tus datos' }),
      el('p', { texto: 'Tu diario, tus favoritos, tu progreso y tus ajustes se guardan solo en este dispositivo. Una copia de seguridad los guarda en un archivo, para que no los pierdas si cambias de dispositivo o si el navegador borra sus datos.' }),
      el('p', { class: 'buz-ayuda', texto: 'El archivo de la copia incluye tu diario: guárdalo en un sitio privado.' }));
    const estado = el('p', { id: 'datos-estado', class: 'buz-ayuda', tabindex: '-1' });
    const decir = function (texto) { estado.textContent = texto; avisar(texto); };
    const botonGuardar = el('button', { type: 'button' }, 'Guardar una copia de mis datos');
    botonGuardar.addEventListener('click', function () {
      let c = null;
      try { c = hacerCopia(); } catch (e) { c = null; decir('No se ha podido hacer la copia. Inténtalo otra vez.'); return; }
      if (!c) { decir('Todavía no hay nada tuyo guardado en este dispositivo (ni diario, ni favoritos, ni ajustes), así que no hay copia que hacer.'); return; }
      try { descargarArchivo(c.nombre, c.texto, 'application/json'); }
      catch (e) { decir('No se ha podido guardar el archivo en este dispositivo.'); return; }
      decir('Copia guardada en el archivo «' + c.nombre + '», que se ha descargado en este dispositivo (búscalo en la carpeta de descargas). Trae ' + juntarLista(c.partes) + '.');
    });
    const botones = el('p', {}, botonGuardar);
    if (navigator.share) {
      const botonEnviar = el('button', { type: 'button', class: 'secundario' }, 'Enviar una copia de mis datos');
      botonEnviar.addEventListener('click', async function () {
        let c = null;
        try { c = hacerCopia(); } catch (e) { c = null; }
        if (!c) { decir('Todavía no hay nada tuyo guardado en este dispositivo, así que no hay copia que enviar.'); return; }
        try {
          const archivo = new File([c.texto], c.nombre, { type: 'application/json' });
          if (!navigator.canShare || !navigator.canShare({ files: [archivo] })) { decir('Este dispositivo no permite enviar archivos desde aquí. Usa «Guardar una copia de mis datos».'); return; }
          await navigator.share({ files: [archivo], title: 'Copia de mis datos de Jaris' });
          decir('Copia enviada. Trae ' + juntarLista(c.partes) + '.');
        } catch (e) {
          if (e && e.name === 'AbortError') decir('Has cancelado el envío. No se ha enviado nada.');
          else decir('No se ha podido enviar la copia. Usa «Guardar una copia de mis datos».');
        }
      });
      botones.append(' ', botonEnviar);
    }
    /* Recuperar una copia: elegir el archivo, decir qué trae y, si ya hay datos, preguntar si juntar o sustituir. */
    const panel = el('div', { class: 'datos-panel' });
    /* Revisión parte 3: vaciar el panel también le quita el papel de grupo o de diálogo (si no, el lector encontraba un grupo vacío). */
    const cerrarPanel = function () { panel.replaceChildren(); ['role', 'aria-labelledby', 'aria-describedby'].forEach(function (a) { panel.removeAttribute(a); }); };
    const archivo = el('input', { type: 'file', accept: '.json,application/json', id: 'datos-archivo', hidden: 'hidden', 'aria-hidden': 'true', tabindex: '-1' });
    const botonRecuperar = el('button', { type: 'button', class: 'secundario' }, 'Recuperar una copia de mis datos');
    botonRecuperar.addEventListener('click', function () { archivo.value = ''; archivo.click(); });
    botones.append(' ', botonRecuperar, archivo);
    function ofrecerCopia(texto) {
      const c = copiaValida(texto);
      cerrarPanel();
      if (c.error) { decir(c.error); return; }
      const partes = resumenDatos(c.datos);
      if (!partes.length) { decir('La copia está vacía: no trae diario, favoritos ni ajustes. No se ha cambiado nada.'); return; }
      const hay = Object.keys(datosDelDispositivo()).length > 0;
      let cuando = '';
      if (c.fecha) {
        const f = new Date(c.fecha);
        if (!isNaN(f.getTime())) cuando = ', hecha el ' + f.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) + ',';
      }
      const titulo = el('h3', { id: 'datos-recuperar-titulo', tabindex: '-1', texto: 'Recuperar la copia' });
      panel.removeAttribute('aria-describedby');
      panel.setAttribute('role', 'group');
      panel.setAttribute('aria-labelledby', 'datos-recuperar-titulo');
      panel.append(titulo, el('p', { texto: 'La copia' + cuando + ' trae ' + juntarLista(partes) + '. ' + (hay
        ? 'Este dispositivo ya tiene datos: elige qué hacer.' : 'Este dispositivo todavía no tiene datos.') }));
      const aplicar = function (modo) {
        const sustituir = modo === 'sustituir';
        const nuevo = sustituir ? c.datos : fusionar(limpiarDatos(datosDelDispositivo()), c.datos);
        if (!escribirDatos(nuevo, sustituir)) { cerrarPanel(); decir('No se ha podido recuperar la copia (puede que no quepa en el espacio del navegador). No se ha cambiado nada.'); estado.focus(); return; }
        aplicarAjustes();
        mensajeDatos = 'Copia recuperada' + (hay ? (sustituir ? ', sustituyendo lo que había' : ', juntada con lo que había') : '') +
          '. Ahora este dispositivo tiene ' + juntarLista(resumenDatos(datosDelDispositivo())) + '.';
        vistaAjustes();
      };
      const cancelar = el('button', { type: 'button', class: 'secundario' }, 'Cancelar');
      cancelar.addEventListener('click', function () { cerrarPanel(); decir('No se ha cambiado nada.'); botonRecuperar.focus(); });
      if (hay) {
        const juntar = el('button', { type: 'button' }, 'Juntar con lo que ya tengo');
        juntar.addEventListener('click', function () { aplicar('juntar'); });
        const sustituir = el('button', { type: 'button' }, 'Sustituir lo que tengo por la copia');
        sustituir.addEventListener('click', function () { aplicar('sustituir'); });
        const antes = el('button', { type: 'button', class: 'secundario' }, 'Guardar antes una copia de lo que tengo');
        antes.addEventListener('click', function () { botonGuardar.click(); });
        /* Revisión parte 3: si la copia no trae diario (o trae menos días), decirlo claro antes de sustituir, porque se perdería el de aquí. */
        const diarioAqui = limpiarDatos(datosDelDispositivo())['jaris.diario'], diarioCopia = c.datos['jaris.diario'];
        const nAqui = diarioAqui ? Object.keys(diarioAqui.entradas).length : 0, nCopia = diarioCopia ? Object.keys(diarioCopia.entradas).length : 0;
        const ojo = nAqui && !nCopia ? ' Ojo: la copia no trae diario, así que perderías las ' + nAqui + (nAqui === 1 ? ' entrada' : ' entradas') + ' del diario que tienes aquí.'
          : nAqui > nCopia ? ' Ojo: aquí tienes ' + nAqui + ' entradas de diario y la copia trae ' + nCopia + '; las que no estén en la copia se perderían.' : '';
        panel.append(
          el('p', {}, juntar), el('p', { class: 'buz-ayuda', texto: 'Se suma todo. Si un mismo día del diario está en los dos sitios, se queda la entrada más reciente. Los ajustes que ya tengas en este dispositivo se quedan como están; los que no hayas cambiado nunca se toman de la copia.' }),
          el('p', {}, sustituir), el('p', { class: 'buz-ayuda', texto: 'Se borra lo que hay en este dispositivo y se pone lo de la copia, ajustes incluidos.' + ojo + ' Si tienes dudas, guarda antes una copia de lo que tienes.' }),
          el('p', {}, antes), el('p', {}, cancelar));
      } else {
        const poner = el('button', { type: 'button' }, 'Recuperar la copia');
        poner.addEventListener('click', function () { aplicar('sustituir'); });
        panel.append(el('p', {}, poner, ' ', cancelar));
      }
      titulo.focus();
    }
    archivo.addEventListener('change', function () {
      const f = archivo.files && archivo.files[0];
      if (!f) return;
      const lector = new FileReader();
      lector.onerror = function () { decir('No se ha podido leer el archivo. No se ha cambiado nada.'); };
      lector.onload = function () { ofrecerCopia(String(lector.result || '').replace(/^\uFEFF/, '')); };
      lector.readAsText(f);
    });
    /* Borrar todos mis datos: con confirmación (dos botones, y el foco en «No»). No toca libros ni audios guardados (eso es la caché). */
    const CLAVES_BORRAR = CLAVES_DATOS.concat(['jaris.ultimo']);
    const botonBorrar = el('button', { type: 'button', class: 'secundario' }, 'Borrar todos mis datos');
    botonBorrar.addEventListener('click', function () {
      const partes = resumenDatos(datosDelDispositivo());
      let hayUltimo = false;
      try { hayUltimo = localStorage.getItem('jaris.ultimo') !== null; } catch (e) { /* nada */ }
      cerrarPanel();
      if (!partes.length && !hayUltimo) { decir('No hay nada tuyo guardado en este dispositivo, así que no hay nada que borrar.'); return; }
      const texto = 'Se va a borrar lo que Jaris tiene guardado en este dispositivo' + (partes.length ? ': ' + juntarLista(partes) : '') +
        (hayUltimo ? (partes.length ? ', y' : ':') + ' por dónde ibas leyendo' : '') +
        '. No se puede deshacer. No se borran los libros ni los audios que hayas guardado para usarlos sin conexión. Si quieres conservar algo, guarda antes una copia.';
      panel.setAttribute('role', 'alertdialog');
      panel.setAttribute('aria-labelledby', 'datos-borrar-titulo');
      panel.setAttribute('aria-describedby', 'datos-borrar-texto');
      const no = el('button', { type: 'button', class: 'secundario' }, 'No, cancelar');
      const si = el('button', { type: 'button' }, 'Sí, borrar todo');
      const antes = el('button', { type: 'button', class: 'secundario' }, 'Guardar antes una copia de mis datos');
      no.addEventListener('click', function () { cerrarPanel(); decir('No se ha borrado nada.'); botonBorrar.focus(); });
      antes.addEventListener('click', function () { botonGuardar.click(); });
      si.addEventListener('click', function () {
        let bien = true;
        try {
          CLAVES_BORRAR.forEach(function (c) { localStorage.removeItem(c); });
          sessionStorage.removeItem('jaris.buzon');
          bien = !CLAVES_BORRAR.some(function (c) { return localStorage.getItem(c) !== null; });
        } catch (e) { bien = false; }
        if (!bien) { cerrarPanel(); aplicarAjustes(); decir('No se han podido borrar todos los datos. Inténtalo otra vez.'); estado.focus(); return; }
        aplicarAjustes();
        mensajeDatos = 'Se han borrado todos tus datos de este dispositivo. Los ajustes han vuelto a sus valores por defecto.';
        vistaAjustes();
      });
      panel.append(el('h3', { id: 'datos-borrar-titulo', texto: '¿Borrar todos tus datos?' }), el('p', { id: 'datos-borrar-texto', texto: texto }),
        el('p', {}, no, ' ', si), el('p', {}, antes));
      no.focus();
    });
    /* El diario para leerlo: un archivo Markdown (.md), no sirve para recuperar datos (para eso está la copia). */
    const botonDiario = el('button', { type: 'button', class: 'secundario' }, 'Descargar mi diario para leerlo');
    botonDiario.addEventListener('click', function () {
      let r = null;
      try { r = diarioEnMarkdown(); } catch (e) { decir('No se ha podido preparar el diario. Inténtalo otra vez.'); return; }
      if (!r) { decir('Todavía no hay ninguna entrada en tu diario, así que no hay nada que descargar.'); return; }
      const nombre = 'Jaris - mi diario (' + fechaLocalISO() + ').md';
      try { descargarArchivo(nombre, r.texto, 'text/markdown;charset=utf-8'); }
      catch (e) { decir('No se ha podido guardar el archivo en este dispositivo.'); return; }
      decir('Diario guardado en el archivo «' + nombre + '», que se ha descargado en este dispositivo. Trae ' + r.dias + (r.dias === 1 ? ' día' : ' días') +
        (r.dias > 1 ? ', del ' + r.desde + ' al ' + r.hasta : ', el ' + r.desde) + '.');
    });
    bloque.append(botones,
      el('p', {}, botonDiario),
      el('p', { class: 'buz-ayuda', texto: 'El diario para leerlo es un archivo de texto con formato Markdown (.md), con la fecha de cada día como título. Se abre con el Bloc de notas o con cualquier programa de texto. No sirve para recuperar datos: para eso está la copia.' }),
      el('p', {}, botonBorrar), estado, panel);
    if (mensajeDatos) {
      /* Revisión parte 4: igual que en Calendario y lugar, el foco va directo al mensaje (sin pasar por el título ni oírse dos veces). */
      estado.textContent = mensajeDatos;
      mensajeDatos = '';
      focoAjustes = 'datos-estado';
    }
    return bloque;
  }

  /* ---------- Ajustes > Calendario y lugar (sesión 7B, 6 de noviembre de 2026) ----------
     Reutiliza formularioLugar() de la pantalla Calendario: elegir aquí o allí cambia lo mismo (jaris.lugar y jaris.sur). */
  let mensajeLugar = '';
  let focoAjustes = null;   /* id de lo que debe recibir el foco al volver a pintar Ajustes */
  function bloqueLugar() {
    const elegido = lugarElegido(), lugar = elegido.lugar;
    const delCampo = DATOS.FIESTAS.filter(function (f) { return f.campo; }).map(function (f) { return f.nombre; });
    const bloque = el('section', { 'aria-labelledby': 'ajustes-lugar-titulo' },
      el('h2', { id: 'ajustes-lugar-titulo', texto: 'Calendario y lugar' }),
      el('p', { texto: 'Jaris usa el calendario ático (el de Atenas) y lo calcula para el lugar que elijas, porque el comienzo de cada mes y la puesta del sol cambian según dónde estés. No usa la ubicación de tu dispositivo, y lo que elijas se guarda solo en él.' }));
    const modos = { tal: 'las fiestas tal cual, como en Grecia', movido: 'las fiestas movidas medio año', mixto: 'las fiestas del campo movidas y las demás tal cual' };
    const ahora = 'Ahora: ' + lugar.nombre + ' (' + lugar.pais + ')' +
      (elegido.elegido ? '' : ', según la zona horaria de tu dispositivo, porque todavía no has elegido ninguno') +
      (lugar.lat < 0 ? '; ' + modos[modoSur(lugar)] : '') + '.';
    const estado = el('p', { id: 'lugar-estado', tabindex: '-1', texto: ahora });
    bloque.append(estado);
    bloque.append(formularioLugar(lugar, 'ajustes-lugar', function (nuevo) {
      mensajeLugar = 'Guardado. Calendario calculado para ' + nuevo.nombre + ' (' + nuevo.pais + ').' +
        (nuevo.lat < 0 ? ' Está en el hemisferio sur: elige abajo cómo quieres seguir las fiestas.' : '');
      vistaAjustes();
    }));
    if (lugar.lat >= 0) {
      bloque.append(el('p', { class: 'buz-ayuda', texto: 'Si eliges un lugar del hemisferio sur, al guardar aparecerán las opciones para las fiestas.' }));
    }
    bloque.append(
      el('h3', { texto: 'Qué cambia según el hemisferio' }),
      el('p', { texto: 'En el hemisferio norte no cambia nada: las fiestas caen en su fecha de Grecia y coinciden con tus estaciones.' }),
      el('p', { texto: 'En el hemisferio sur las estaciones van al revés que en Grecia, y puedes elegir entre tres formas de seguir las fiestas:' }),
      el('ul', {},
        el('li', { texto: 'Tal cual: todas las fiestas caen en su fecha de Grecia, aunque aquí sea otra estación. Es lo que hace la mayoría.' }),
        el('li', { texto: 'Movido: todas las fiestas se mueven medio año, para que cada una caiga en su estación. También cambian de sitio las fiestas del Sol: Heliogenna (solsticio de invierno) y Prometheia y Herakleia (solsticio de verano).' }),
        el('li', { texto: 'Mixto: solo se mueven las fiestas del campo' + (delCampo.length ? ' (' + juntarLista(delCampo) + ')' : '') + ' y las del Sol; las demás se quedan en su fecha.' })),
      el('p', { class: 'buz-ayuda', texto: 'Hay más sobre el calendario en el capítulo 8 del libro.' }));
    if (mensajeLugar) {
      /* Revisión parte 4: antes el foco pasaba por el título «Ajustes» y el mensaje se oía dos veces (aviso y foco).
         Ahora vistaAjustes() lleva el foco directamente aquí, y al enfocarlo el lector lo lee una vez. */
      estado.textContent = mensajeLugar + ' ' + ahora;
      mensajeLugar = '';
      focoAjustes = 'lugar-estado';
    }
    return bloque;
  }

  /* ---------- Ajustes > Audios (sesión 7B, 6 de noviembre de 2026) ----------
     Velocidad por defecto (jaris.velocidad, la misma que cambia el reproductor), cuánto ocupan los audios guardados
     para usarlos sin conexión y botón para borrarlos (con aviso). La lógica está en audios.js (JarisAudios). */
  function bloqueAudios() {
    const A = window.JarisAudios;
    const bloque = el('section', { 'aria-labelledby': 'ajustes-audios' },
      el('h2', { id: 'ajustes-audios', texto: 'Audios' }));
    if (!A || !A.resumen) {
      bloque.append(el('p', { texto: 'Los audios no están disponibles ahora mismo.' }));
      return bloque;
    }
    bloque.append(el('p', { texto: 'Los audios (himnos, oraciones, frases en griego y música) se escuchan con conexión y, si quieres, se guardan en este dispositivo para escucharlos sin conexión. Aquí puedes ver cuánto espacio ocupan y borrarlos.' }));

    /* Velocidad por defecto */
    const guardada = recuperar('jaris.velocidad');
    const selVel = el('select', { id: 'ajustes-velocidad' });
    A.VELOCIDADES.forEach(function (v) {
      selVel.append(el('option', { value: String(v), texto: String(v).replace('.', ',') + (v === 1 ? ' (normal)' : '') }));
    });
    selVel.value = String(A.VELOCIDADES.indexOf(guardada) >= 0 ? guardada : 1);
    selVel.addEventListener('change', function () {
      A.fijarVelocidad(Number(selVel.value));
      avisar('Velocidad de los audios: ' + selVel.options[selVel.selectedIndex].textContent + '.');
    });
    bloque.append(el('p', {}, el('label', { for: 'ajustes-velocidad', texto: 'Velocidad al escuchar ' }), selVel),
      el('p', { class: 'buz-ayuda', texto: 'Es la velocidad con la que empieza cada audio. También se puede cambiar desde el reproductor, y se guarda igual.' }));

    /* Espacio */
    const resumen = el('p', { id: 'audios-resumen', texto: 'Mirando cuánto espacio ocupan los audios guardados…' });
    const estado = el('p', { id: 'audios-estado', class: 'buz-ayuda', tabindex: '-1' });
    const panel = el('div', { id: 'audios-panel' });
    const decir = function (texto) { estado.textContent = texto; avisar(texto); };
    let ultimo = null;
    async function pintarResumen() {
      let r = null;
      try { r = await A.resumen(); } catch (e) { r = null; }
      ultimo = r;
      if (!r) { resumen.textContent = 'No se ha podido mirar qué audios hay guardados. Inténtalo más tarde.'; return; }
      if (!r.puedeGuardar) { resumen.textContent = 'Este navegador no deja guardar audios para escucharlos sin conexión; se oyen con conexión.'; return; }
      const todos = 'Todos los audios juntos ocupan ' + A.tamano(r.bytesTotal) + '.';
      resumen.textContent = r.guardados
        ? 'Guardados en este dispositivo: ' + r.guardados + (r.guardados === 1 ? ' audio' : ' audios') + ' de ' + r.total + ', que ocupan ' + A.tamano(r.bytesGuardados) + '. ' + todos
        : 'No hay ningún audio guardado en este dispositivo. ' + todos + ' Se guardan desde la pantalla Audios.';
      if (navigator.storage && navigator.storage.estimate) {
        try {
          const e = await navigator.storage.estimate();
          if (e && e.quota) resumen.textContent += ' Espacio libre para Jaris: unos ' + A.tamano(Math.max(0, e.quota - (e.usage || 0))) + '.';
        } catch (e) { /* nada */ }
      }
    }
    pintarResumen();

    /* Borrar, con aviso (mismo estilo que «Borrar todos mis datos»; el foco empieza en «No») */
    const botonBorrar = el('button', { type: 'button', class: 'secundario' }, 'Borrar los audios guardados');
    botonBorrar.addEventListener('click', async function () {
      panel.replaceChildren();
      panel.removeAttribute('role');
      await pintarResumen();
      if (!ultimo || !ultimo.puedeGuardar) { decir('Este navegador no guarda audios, así que no hay nada que borrar.'); return; }
      if (!ultimo.guardados) { decir('No hay ningún audio guardado en este dispositivo, así que no hay nada que borrar.'); return; }
      const texto = 'Se van a borrar de este dispositivo ' + ultimo.guardados + (ultimo.guardados === 1 ? ' audio guardado' : ' audios guardados') +
        ' (' + A.tamano(ultimo.bytesGuardados) + '). Dejarán de oírse sin conexión, pero se pueden volver a guardar cuando quieras. El libro y tus datos no se borran.';
      panel.setAttribute('role', 'alertdialog');
      panel.setAttribute('aria-labelledby', 'audios-borrar-titulo');
      panel.setAttribute('aria-describedby', 'audios-borrar-texto');
      const no = el('button', { type: 'button', class: 'secundario' }, 'No, cancelar');
      const si = el('button', { type: 'button' }, 'Sí, borrar los audios');
      no.addEventListener('click', function () { panel.replaceChildren(); panel.removeAttribute('role'); decir('No se ha borrado nada.'); botonBorrar.focus(); });
      si.addEventListener('click', async function () {
        /* Revisión parte 4: un doble clic ya no borra dos veces, y si falla el foco no se pierde (el botón desaparece). */
        if (si.disabled) return;
        si.disabled = true;
        let n = 0;
        try { n = await A.quitarTodo(); } catch (e) { panel.replaceChildren(); panel.removeAttribute('role'); decir('No se han podido borrar los audios. Inténtalo otra vez.'); estado.focus(); return; }
        panel.replaceChildren();
        panel.removeAttribute('role');
        await pintarResumen();
        decir('Borrados ' + n + (n === 1 ? ' audio' : ' audios') + ' de este dispositivo.');
        estado.focus();
      });
      panel.append(el('h3', { id: 'audios-borrar-titulo', texto: '¿Borrar los audios guardados?' }), el('p', { id: 'audios-borrar-texto', texto: texto }),
        el('p', {}, no, ' ', si));
      no.focus();
    });
    bloque.append(resumen, el('p', {}, botonBorrar, ' ', el('a', { href: '#/audios', class: 'boton secundario' }, 'Ir a la pantalla Audios')), estado, panel);
    return bloque;
  }

  /* ---------- Ajustes > Acerca de Jaris (sesión 7B, 6 de noviembre de 2026) ----------
     La frase de privacidad se comprobó contra el código el 6 de noviembre: solo hay fetch() de archivos de la propia aplicación
     (app.js, audios.js, cancionero.js, oraculo.js, sw.js), ningún servicio externo, estadísticas, cookies ni geolocalización;
     lo único que sale del dispositivo es lo que la persona manda (buzon.js abre el correo con «mailto:»; app.js usa
     navigator.share solo al pulsar «Enviar una copia de mis datos») y las descargas de descargas.json (enlaces a GitHub).
     SI SE AÑADE ALGO QUE ENVÍE DATOS, HAY QUE CAMBIAR ESTE TEXTO. */
  function bloqueAcerca() {
    const bloque = el('section', { 'aria-labelledby': 'ajustes-acerca' },
      el('h2', { id: 'ajustes-acerca', texto: 'Acerca de Jaris' }));
    if (libro) {
      bloque.append(el('p', { texto: libro.titulo + (libro.subtitulo ? '. ' + libro.subtitulo : '') + ', de ' + libro.autora + '. ' + libro.edicion +
        ' (montada el ' + libro.fechaTexto + ').' }),
        el('p', { texto: 'Versión de la aplicación: ' + libro.version + '. Es un código que cambia en cada edición; el Buzón lo añade si dejas marcada la casilla de la edición y el dispositivo, y ayuda a arreglar fallos.' }));
    }
    bloque.append(el('h3', { texto: 'Más sobre Jaris' }),
      el('ul', {},
        el('li', {}, el('a', { href: '#/novedades' }, 'Novedades de Jaris'), ': lo que ha cambiado en cada edición.'),
        el('li', {}, el('a', { href: '#/buzon' }, 'Buzón de sugerencias y erratas'), ': para contar una errata, una idea o algo que no funciona.'),
        el('li', {}, el('a', { href: '#/descargas' }, 'Descargar los libros'), ': para leerlos fuera de la aplicación.')),
      el('h3', { texto: 'Privacidad' }),
      el('p', { texto: 'Tu diario, tus favoritos, tus ajustes y tu progreso se quedan en este dispositivo. Jaris no los envía a ningún sitio, no tiene cuentas, no usa cookies ni estadísticas y no te pide la ubicación (para el calendario usa la zona horaria del dispositivo o el lugar que elijas).' }),
      el('p', { texto: 'Solo sale algo de tu dispositivo si tú lo mandas. El Buzón abre tu programa de correo con el mensaje ya escrito y eres tú quien lo envía; quien lo reciba verá tu dirección de correo. «Enviar una copia de mis datos» usa el menú de compartir del dispositivo, donde eliges adónde va.' }),
      el('p', { texto: 'Como en cualquier página web, al abrir Jaris el servidor donde está alojada (GitHub) recibe la petición de la página, y los libros de «Descargar los libros» se bajan de GitHub cuando tú los pulsas.' }));
    return bloque;
  }

  function vistaAjustes() {
    ++turno;
    const nodo = el('div', { class: 'ajustes' }, el('h1', { texto: 'Ajustes' }));
    const lectura = el('section', { 'aria-labelledby': 'ajustes-lectura' },
      el('h2', { id: 'ajustes-lectura', texto: 'Lectura' }));
    AJUSTES_LECTURA.forEach(function (a, n) {
      const grupo = el('fieldset', { class: 'buz-tipos' }, el('legend', { texto: a.titulo }));
      a.opciones.forEach(function (o) {
        const id = 'ajuste-' + n + '-' + o[0];
        const radio = el('input', { type: 'radio', name: 'ajuste-' + n, id: id, value: o[0] });
        radio.checked = ajusteValor(a) === o[0];
        radio.addEventListener('change', function () {
          if (!radio.checked) return;
          guardar(a.clave, o[0]);
          aplicarAjustes();
          avisar(a.titulo + ': ' + o[1].toLowerCase() + '.');
        });
        grupo.append(el('div', { class: 'buz-opcion' }, radio, el('label', { for: id, texto: o[1] })));
      });
      if (a.ayuda) grupo.append(el('p', { class: 'buz-ayuda', texto: a.ayuda }));
      lectura.append(grupo);
    });
    const volver = el('button', { type: 'button' }, 'Volver a los valores por defecto');
    volver.addEventListener('click', function () {
      /* Se marcan las opciones por defecto sin volver a pintar la pantalla: así el foco se queda en este botón (revisión del 6 nov). */
      AJUSTES_LECTURA.forEach(function (a, n) {
        try { localStorage.removeItem(a.clave); } catch (e) { /* nada */ }
        a.opciones.forEach(function (o) { const r = document.getElementById('ajuste-' + n + '-' + o[0]); if (r) r.checked = o[0] === a.defecto; });
      });
      aplicarAjustes();
      avisar('Los ajustes de lectura han vuelto a sus valores por defecto.');
    });
    lectura.append(el('p', {}, volver));
    lectura.append(el('p', { texto: 'Los ajustes se guardan en este móvil u ordenador; en otro dispositivo hay que elegirlos otra vez (o recuperarlos desde una copia de tus datos, más abajo).' }));
    nodo.append(lectura);
    nodo.append(bloqueLugar());
    nodo.append(bloqueAudios());
    nodo.append(bloqueDatos());
    nodo.append(bloqueAcerca());
    main.replaceChildren(nodo);
    ponerTitulo('Ajustes');
    marcarMenu('#/ajustes');
    const foco = focoAjustes ? document.getElementById(focoAjustes) : null;
    focoAjustes = null;
    terminar(foco);
  }

  /* ---------- Descargas de los libros (5 de noviembre de 2026; contenido/descargas.json, lo hace descargas_libros.py) ---------- */
  function pesoTexto(b) {
    if (b < 1048576) return Math.max(1, Math.round(b / 1024)) + ' KB';
    return Math.round(b / 1048576) + ' MB';
  }
  async function vistaDescargas() {
    const mio = ++turno;
    let lista = [];
    try { lista = await traer('contenido/descargas.json'); } catch (e) { lista = []; }
    if (mio !== turno) return;
    const nodo = el('div', { class: 'descargas' }, el('h1', { texto: 'Descargar los libros' }));
    if (!lista.length) {
      nodo.append(el('p', { texto: 'Las descargas estarán aquí muy pronto.' }));
    } else {
      nodo.append(el('p', { texto: 'Cada libro se descarga por separado; al final están todos juntos en un solo archivo. Son siempre la última edición.' }));
      const ul = el('ul', { class: 'lista-descargas' });
      lista.forEach(function (x) {
        ul.append(el('li', {},
          el('a', { href: x.url, download: x.nombre }, x.titulo + ' (' + pesoTexto(x.bytes) + ')'),
          el('p', { texto: x.texto })));
      });
      nodo.append(ul);
      nodo.append(el('p', {}, 'Los audios no hace falta descargarlos: en ', el('a', { href: '#/audios' }, 'Audios'),
        ' se pueden guardar dentro de la aplicación para escucharlos sin conexión.'));
    }
    main.replaceChildren(nodo);
    ponerTitulo('Descargar los libros');
    marcarMenu('#/descargas');
    terminar(null);
  }

  function noEncontrada() {
    main.replaceChildren(el('h1', { texto: 'Esta página no existe' }), el('p', {}, el('a', { href: '#/' }, 'Ir a la portada')));
    ponerTitulo('Página no encontrada'); marcarMenu(''); terminar(null);
  }

  function irA() {
    const h = location.hash || '#/';
    if (h.indexOf('#/') !== 0) return;
    const partes = h.slice(2).split('/').map(function (t) { try { return decodeURIComponent(t); } catch (e) { return t; } });
    if (partes[0] !== 'novedades') ultimaRuta = h;   // para volver aquí al cerrar «Novedades»
    switch (partes[0]) {
      case '': return portada();
      case 'indice': return indice();
      case 'hoy': return vistaHoy();
      case 'calendario': return vistaCalendario(partes);
      case 'dia': return vistaDia(partes);
      case 'audios': return vistaAudios(partes);
      case 'buscar': return vistaBuscar(partes);
      case 'favoritos': return vistaFavoritos();
      case 'aprender': return vistaAprender(partes);
      case 'oraculo': return vistaOraculo(partes);
      case 'novedades': return vistaNovedades();
      case 'buzon': return vistaBuzon(partes);
      case 'diario': return vistaDiario(partes);
      case 'noche': return vistaNoche();
      case 'cancionero': return vistaCancionero(partes);
      case 'descargas': return vistaDescargas();
      case 'ajustes': return vistaAjustes();
      case 'oraciones': case 'himnos': case 'ritos':
        return leer(libro.indices[partes[0]], null, '#/' + partes[0]);
      case 'leer': return leer(partes[1], partes.slice(2).join('/') || null, null);
      default: return noEncontrada();
    }
  }

  /* ---------- Instalar y funcionar sin conexión ---------- */
  let avisoInstalar = null;
  function rellenarInstalar(instalar) {
    if (!instalar.hidden) return;
    const enPantalla = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    const esIphone = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (enPantalla) return;
    if (esIphone) {
      instalar.append(el('p', { texto: 'En el iPhone o el iPad: abre Jaris en Safari, pulsa el botón Compartir y elige «Añadir a pantalla de inicio». Así se abre como una aplicación más y funciona sin conexión.' }));
      instalar.hidden = false;
    } else if (avisoInstalar) {
      const boton = el('button', { type: 'button' }, 'Instalar Jaris');
      boton.addEventListener('click', async function () {
        if (!avisoInstalar) return;
        avisoInstalar.prompt();
        const r = await avisoInstalar.userChoice;
        avisoInstalar = null;
        if (r.outcome === 'accepted') instalar.hidden = true;
      });
      instalar.append(el('p', { texto: 'Puedes instalar Jaris como una aplicación más: se abre en su propia ventana y funciona sin conexión.' }), boton);
      instalar.hidden = false;
    }
  }
  window.addEventListener('appinstalled', function () {
    const s = document.getElementById('instalar');
    if (s) s.hidden = true;
    avisar('Jaris ya está instalada.');
  });
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    avisoInstalar = e;
    const s = document.getElementById('instalar');
    if (s) rellenarInstalar(s);
  });

  async function estadoSinInternet() {
    const estado = document.getElementById('estado');
    try {
      if (window.caches && await caches.has('jaris-' + libro.version)) {
        estado.textContent = 'Guardada en este dispositivo: funciona sin conexión.';
        return true;
      }
    } catch (e) { /* nada */ }
    estado.textContent = '';
    return false;
  }

  /* ---------- Ediciones nuevas (parte 6-1) ----------
     Se busca si hay edición nueva al abrir Jaris, al volver a ella (por ejemplo, desde otra aplicación),
     al recuperar internet y cada media hora si sigue abierta. Mientras se descarga, se dice
     «Descargando la edición nueva...»; cuando está guardada, se avisa siempre con el botón
     «Abrir la edición nueva», también si ya estaba descargada de antes (registro «en espera»). */
  const avisoEdicion = document.getElementById('aviso-edicion');
  const textoEdicion = document.getElementById('texto-edicion');
  const botonEdicion = document.getElementById('recargar');
  const enlaceNovedades = document.getElementById('ver-novedades');
  const cerrarAvisoEdicion = document.getElementById('cerrar-aviso-edicion');
  cerrarAvisoEdicion.addEventListener('click', function () { mostrarEdicion(''); enfocar(main.querySelector('h1') || main); });
  /* Las novedades de una edición, como lista de frases (para saber si una edición nueva trae novedades o no). */
  function cambiosDe(l) { return ((l && l.novedades) || []).reduce(function (s, n) { return s.concat(n.cambios || []); }, []); }
  /* ¿La edición nueva que espera (ya descargada) trae novedades? Se mira su libro.json en su caché. */
  async function hayNovedadesEnEspera() {
    try {
      const actual = 'jaris-' + libro.version;
      for (const nombre of await caches.keys()) {
        if (nombre.indexOf('jaris-') !== 0 || nombre === actual) continue;
        const r = await (await caches.open(nombre)).match('contenido/libro.json', { ignoreSearch: true });
        if (!r) continue;
        return JSON.stringify(cambiosDe(await r.json())) !== JSON.stringify(cambiosDe(libro));
      }
    } catch (e) { /* si no se puede mirar, se avisa por si acaso */ }
    return true;
  }
  let estadoEdicion = '';   // '', 'bajando', 'lista', 'puesta'
  let abriendoEdicion = false;
  function mostrarEdicion(estado) {
    if (estado === estadoEdicion) return;
    estadoEdicion = estado;
    if (!estado) { avisoEdicion.hidden = true; return; }
    avisoEdicion.hidden = false;
    botonEdicion.hidden = estado !== 'lista';
    enlaceNovedades.hidden = estado !== 'puesta';
    if (estado === 'bajando') {
      textoEdicion.textContent = 'Descargando la edición nueva de Jaris… Puedes seguir leyendo.';
      avisar('Descargando la edición nueva de Jaris. Puedes seguir leyendo; te avisaré cuando esté lista.');
    } else if (estado === 'lista') {
      textoEdicion.textContent = 'La edición nueva de Jaris está lista.';
      avisar('La edición nueva de Jaris está lista. El botón «Abrir la edición nueva» está al principio de la página.');
    } else if (estado === 'puesta') {
      textoEdicion.textContent = 'Ya tienes la edición nueva de Jaris, con novedades.';
    }
    cerrarAvisoEdicion.hidden = estado !== 'puesta';
  }
  function seguirInstalacion(trabajador) {
    if (!trabajador || !navigator.serviceWorker.controller) return;   // la primera instalación no es una edición nueva
    const mirar = function () {
      // Solo se avisa si la edición nueva trae novedades; si no, se pone sola la próxima vez que se abra Jaris, sin decir nada.
      if (trabajador.state === 'installed') hayNovedadesEnEspera().then(function (si) { if (si) mostrarEdicion('lista'); });
      else if (trabajador.state === 'redundant' && estadoEdicion === 'bajando') {
        mostrarEdicion('');
        avisar('No se ha podido terminar de descargar la edición nueva. Se volverá a intentar más tarde; puedes seguir usando esta.');
      }
    };
    trabajador.addEventListener('statechange', mirar);
    mirar();
  }
  if ('serviceWorker' in navigator) {
    let registro = null, ultimaComprobacion = 0;
    const comprobar = function (forzar) {
      if (!registro || !navigator.onLine) return;
      if (!forzar && Date.now() - ultimaComprobacion < 60000) return;   // como mucho, una vez por minuto
      ultimaComprobacion = Date.now();
      registro.update().catch(function () { /* sin conexión o sin servidor: se probará más tarde */ });
    };
    navigator.serviceWorker.addEventListener('message', async function (e) {
      if (e.data && e.data.tipo === 'guardada' && !navigator.serviceWorker.controller && libro) {
        if (await estadoSinInternet()) avisar('Jaris ya está guardada en este dispositivo y funciona sin conexión.');
      }
    });
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (abriendoEdicion) location.reload();
    });
    window.addEventListener('load', async function () {
      try {
        registro = await navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' });
      } catch (e) { return; /* sin servicio: se lee con internet */ }
      if (registro.waiting) seguirInstalacion(registro.waiting);
      if (registro.installing) seguirInstalacion(registro.installing);
      registro.addEventListener('updatefound', function () { seguirInstalacion(registro.installing); });
      comprobar(true);
    });
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') comprobar(false); });
    window.addEventListener('focus', function () { comprobar(false); });
    window.addEventListener('online', function () { comprobar(true); });
    setInterval(function () { comprobar(true); }, 30 * 60000);
    botonEdicion.addEventListener('click', async function () {
      const reg = registro || await navigator.serviceWorker.getRegistration();
      try {
        sessionStorage.setItem('jaris.abrirNovedades', '1');
        // Para volver aquí al cerrar «Novedades» (lo que se estaba leyendo)
        if (location.hash && location.hash !== '#/novedades') sessionStorage.setItem('jaris.volverA', location.hash);
      } catch (e) { /* nada */ }
      if (reg && reg.waiting) {
        abriendoEdicion = true;
        textoEdicion.textContent = 'Abriendo la edición nueva…';
        avisar('Abriendo la edición nueva.');
        reg.waiting.postMessage({ tipo: 'activar' });
        setTimeout(function () { location.reload(); }, 4000);   // por si el navegador no avisa del cambio
      } else {
        location.reload();
      }
    });
  } else {
    botonEdicion.addEventListener('click', function () { location.reload(); });
  }
  /* Al abrir Jaris: ¿es una edición distinta de la última vez? */
  function revisarEdicionVista() {
    const vista = recuperar('jaris.edicion');
    let pidioNovedades = false;
    try { pidioNovedades = sessionStorage.getItem('jaris.abrirNovedades') === '1'; sessionStorage.removeItem('jaris.abrirNovedades'); } catch (e) { /* nada */ }
    const cambios = cambiosDe(libro);
    guardar('jaris.edicion', { version: libro.version, fecha: libro.fecha, cambios: cambios });
    if (!vista || !vista.version || vista.version === libro.version) return false;
    // Edición nueva SIN novedades (un arreglo pequeño): se queda puesta sin decir nada.
    if (Array.isArray(vista.cambios) && JSON.stringify(vista.cambios) === JSON.stringify(cambios)) return false;
    guardar('jaris.novedadesAntes', Array.isArray(vista.cambios) ? vista.cambios : null);
    if (pidioNovedades) return true;   // ha pulsado «Abrir la edición nueva»: se abre «Novedades»
    mostrarEdicion('puesta');
    avisar('Ya tienes la edición nueva de Jaris, con novedades. Al principio de la página están el enlace «Ver qué hay de nuevo» y el botón «Cerrar este aviso».');
    return false;
  }
  enlaceNovedades.addEventListener('click', function () { mostrarEdicion(''); });

  function vistaNovedades() {
    const lista = libro.novedades || [];
    // Lo nuevo es lo que no estaba en las novedades de la edición que se tenía antes (jaris.novedadesAntes)
    const antes = recuperar('jaris.novedadesAntes');
    const esNuevo = function (c) { return Array.isArray(antes) && antes.indexOf(c) < 0; };
    const h1 = el('h1', { texto: 'Novedades de Jaris' });
    const cosas = [h1, el('p', { texto: 'Esta es la ' + (libro.edicion ? libro.edicion.toLowerCase() : 'edición') +
      ', montada el ' + libro.fechaTexto + '. Jaris se pone al día sola cuando hay una edición nueva: si trae novedades, te avisa al principio de la página, y nunca se pierden tus favoritos, tus audios descargados ni tus ajustes.' })];
    if (!lista.length) {
      cosas.push(el('p', { texto: 'Todavía no hay novedades apuntadas.' }));
    } else {
      const nuevas = cambiosDe(libro).filter(esNuevo).length;
      if (nuevas) cosas.push(el('p', { texto: nuevas === 1 ? 'Lo nuevo desde la última vez que abriste Jaris va marcado como «nuevo».'
        : 'Lo nuevo desde la última vez que abriste Jaris (' + nuevas + ' cosas) va marcado como «nuevo».' }));
      lista.forEach(function (n, i) {
        const seccion = el('section', { 'aria-labelledby': 'novedad-' + i });
        seccion.append(el('h2', { id: 'novedad-' + i, texto: n.fechaTexto + (n.cambios.some(esNuevo) ? ' (con cosas nuevas)' : '') }));
        const ul = el('ul');
        n.cambios.forEach(function (c) { ul.append(el('li', { texto: (esNuevo(c) ? 'Nuevo: ' : '') + c })); });
        seccion.append(ul);
        cosas.push(seccion);
      });
    }
    // Cerrar: vuelve a lo que se estaba leyendo (o a la portada). También con Escape.
    const destino = destinoAlCerrarNovedades();
    const queEs = destino === '#/' ? 'la portada' : 'donde estabas';
    const botonCerrar = function () {
      const b = el('button', { type: 'button', class: 'secundario', texto: 'Cerrar las novedades y volver a ' + queEs });
      b.addEventListener('click', cerrarNovedades);
      return el('p', { class: 'cerrar-novedades' }, b, el('span', { class: 'buz-ayuda', texto: ' (también con la tecla Escape)' }));
    };
    cosas.splice(2, 0, botonCerrar());
    cosas.push(botonCerrar());
    cosas.push(el('p', {}, el('a', { href: '#/' }, 'Ir a la portada'), ' · ', el('a', { href: '#/hoy' }, 'Ver lo de hoy')));
    main.replaceChildren.apply(main, cosas);
    ponerTitulo('Novedades'); marcarMenu(''); terminar(null);
    if (primeraVezNovedades) { primeraVezNovedades = false; enfocar(h1); }
  }
  /* Si algo falla (por ejemplo, en un navegador distinto), Jaris lo dice en voz alta en vez de quedarse callada,
     y lo guarda (localStorage «jaris.errores», los 10 últimos) para poder contárselo a quien la arregla. */
  let ultimoAvisoError = 0;
  function apuntarError(texto) {
    try {
      const lista = JSON.parse(localStorage.getItem('jaris.errores') || '[]');
      lista.unshift(new Date().toISOString().slice(0, 16) + ' ' + location.hash + ' ' + texto);
      localStorage.setItem('jaris.errores', JSON.stringify(lista.slice(0, 10)));
    } catch (e) { /* nada */ }
    if (Date.now() - ultimoAvisoError < 5000) return;
    ultimoAvisoError = Date.now();
    avisar('Algo ha fallado en Jaris: ' + texto);
  }
  window.addEventListener('error', function (e) { apuntarError((e.message || 'error') + (e.filename ? ' (' + e.filename.split('/').pop() + ', línea ' + e.lineno + ')' : '')); });
  window.addEventListener('unhandledrejection', function (e) { apuntarError(String((e.reason && (e.reason.message || e.reason)) || 'error')); });
  let primeraVezNovedades = false;
  /* Adónde se vuelve al cerrar «Novedades»: la pantalla de antes (en esta visita), la que había antes de abrir la
     edición nueva (se guarda al pulsar el botón) o, si no, la portada. */
  let ultimaRuta = null;
  function destinoAlCerrarNovedades() {
    if (ultimaRuta) return ultimaRuta;
    let r = null;
    try { r = sessionStorage.getItem('jaris.volverA'); } catch (e) { /* nada */ }
    return r && r !== '#/novedades' ? r : '#/';
  }
  function cerrarNovedades() {
    const d = destinoAlCerrarNovedades();
    try { sessionStorage.removeItem('jaris.volverA'); } catch (e) { /* nada */ }
    if (location.hash === d || (d === '#/' && !location.hash)) irA(); else location.hash = d;
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && location.hash === '#/novedades' && !document.querySelector('.presentacion')) { e.preventDefault(); cerrarNovedades(); }
  });
  document.getElementById('saltar').addEventListener('click', function (e) { e.preventDefault(); enfocar(main.querySelector('h1') || main); });

  /* ---------- Menú plegable en pantallas estrechas o con letra grande (6 de noviembre de 2026) ----------
     En el móvil con letra muy grande, la lista de enlaces ocupaba casi toda la pantalla. Ahora hay un botón «Menú»
     (aria-expanded: el lector dice «contraído» o «expandido») que abre y cierra la lista; app.css solo lo muestra
     cuando la pantalla es estrecha. En pantallas anchas, la lista se ve siempre y el botón no existe. */
  (function () {
    const botonMenu = document.getElementById('boton-menu');
    const cabecera = document.querySelector('.cabecera');
    if (!botonMenu || !cabecera) return;
    function menu(abrir) {
      cabecera.classList.toggle('menu-abierto', abrir);
      botonMenu.setAttribute('aria-expanded', abrir ? 'true' : 'false');
    }
    botonMenu.addEventListener('click', function () { menu(botonMenu.getAttribute('aria-expanded') !== 'true'); });
    cabecera.querySelectorAll('nav a').forEach(function (a) { a.addEventListener('click', function () { menu(false); }); });
    window.addEventListener('hashchange', function () { menu(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && botonMenu.getAttribute('aria-expanded') === 'true' && cabecera.contains(document.activeElement)) {
        menu(false); botonMenu.focus();
      }
    });
  })();

  /* ---------- Arranque ---------- */
  window.addEventListener('hashchange', irA);
  traer('contenido/libro.json').then(function (datos) {
    libro = datos;
    if (window.JarisFavoritos) window.JarisFavoritos.iniciar({ el: el, avisar: avisar, libro: libro });
    document.getElementById('edicion').textContent = libro.titulo + '. ' + libro.subtitulo + ', de ' + libro.autora + '. ' + libro.edicion + ' (montada el ' + libro.fechaTexto + ').';
    estadoSinInternet();
    if (revisarEdicionVista()) {
      primeraVezNovedades = true;
      if (location.hash !== '#/novedades') { location.hash = '#/novedades'; return; }   // hashchange abre «Novedades»
    }
    irA();
    /* La presentación con las letras cayendo, solo la primera vez (extra 3; la hace presentacion.js) */
    if (window.JarisPresentacion) {
      window.JarisPresentacion.alAbrir({ libro: libro, alTerminar: function () { enfocar(main.querySelector('h1') || main); } });
    }
  }).catch(function () {
    main.replaceChildren(el('h1', { texto: 'No se ha podido abrir Jaris' }),
      el('p', { texto: 'La primera vez hace falta conexión. Compruébala y vuelve a abrir Jaris.' }));
  });
})();
