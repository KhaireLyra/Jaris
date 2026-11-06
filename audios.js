/* Jaris: escuchar los audios (parte 3b).
   - Pone un botón «Escuchar» debajo del título de cada himno, oración o pieza que tiene audio
     (los datos salen de contenido/audios.json, que hace montar_aplicacion.py en cada montaje).
   - Un solo reproductor para toda la aplicación, al final de la página (zona «Reproductor»):
     pausar y seguir, retroceder y adelantar 10 segundos, velocidad de 0,5 a 2, posición e «Ir al texto».
   - Sigue sonando al cambiar de pantalla. Funciona con los botones del teclado multimedia,
     los auriculares y la pantalla de bloqueo del móvil (Media Session).
   - Accesibilidad: botones con texto de verdad; los avisos («Sonando», «En pausa») van a la región
     de avisos; el foco no se mueve solo al pulsar «Escuchar»; nada de atajos de una letra.
   - Los que no están descargados se oyen por internet. Descargar por bloques (parte 3c): pantalla «Audios»
     (#/audios), por tipo o por dios, con progreso, pausa y borrar; se guardan en la caché «audios-jaris». */
'use strict';
(function () {
  const VELOCIDADES = [0.5, 0.75, 1, 1.25, 1.5, 2];
  let datos = null, cargando = null;
  let actual = null;          // el audio que está en el reproductor
  let botonOrigen = null;     // el botón «Escuchar» que lo puso, para volver a él al cerrar
  let primeraVez = true;
  const sonido = new Audio();
  sonido.preload = 'metadata';

  function avisar(texto) {
    const avisos = document.getElementById('avisos');
    if (!avisos) return;
    avisos.textContent = '';
    clearTimeout(avisar.t);
    setTimeout(function () { avisos.textContent = texto; }, 150);
    avisar.t = setTimeout(function () { avisos.textContent = ''; }, 8000);
  }
  function guardar(clave, valor) { try { localStorage.setItem(clave, JSON.stringify(valor)); } catch (e) { /* nada */ } }
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

  function cargar() {
    if (datos) return Promise.resolve(datos);
    if (!cargando) {
      cargando = fetch('contenido/audios.json').then(function (r) { if (!r.ok) throw new Error('audios'); return r.json(); })
        .then(function (d) { datos = d; return d; })
        .catch(function () { cargando = null; return null; });
    }
    return cargando;
  }
  function nombreCompleto(a) { return a.titulo + (a.version ? ' (' + a.version + ')' : ''); }

  /* ---------- Tiempo dicho en palabras, para el lector de pantalla ---------- */
  function reloj(s) {
    if (!isFinite(s)) return '0:00';
    s = Math.max(0, Math.floor(s));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }
  function enPalabras(s) {
    if (!isFinite(s)) return 'desconocido';
    s = Math.max(0, Math.floor(s));
    const m = Math.floor(s / 60), r = s % 60, partes = [];
    if (m) partes.push(m + (m === 1 ? ' minuto' : ' minutos'));
    if (r || !m) partes.push(r + (r === 1 ? ' segundo' : ' segundos'));
    return partes.join(' y ');
  }

  /* ---------- El reproductor ---------- */
  const rep = el('section', { class: 'reproductor', id: 'reproductor', 'aria-labelledby': 'rep-titulo', hidden: 'hidden' });
  const repTitulo = el('h2', { id: 'rep-titulo', class: 'solo-lector', texto: 'Reproductor' });
  const sonando = el('p', { class: 'rep-sonando' });
  const bPausa = el('button', { type: 'button', class: 'rep-principal' }, 'Pausar');
  const bAtras = el('button', { type: 'button' }, 'Retroceder 10 segundos');
  const bAdelante = el('button', { type: 'button' }, 'Adelantar 10 segundos');
  const selVelocidad = el('select', { id: 'rep-velocidad' });
  for (const v of VELOCIDADES) selVelocidad.append(el('option', { value: String(v), texto: String(v).replace('.', ',') + (v === 1 ? ' (normal)' : '') }));
  const posicion = el('input', { type: 'range', id: 'rep-posicion', min: '0', max: '0', step: '1', value: '0' });
  const tiempo = el('span', { class: 'rep-tiempo', 'aria-hidden': 'true', texto: '0:00 / 0:00' });
  const irTexto = el('a', { class: 'rep-ir', href: '#/' }, 'Ir al texto');
  const bCerrar = el('button', { type: 'button', class: 'boton secundario' }, 'Cerrar el reproductor');
  rep.append(repTitulo, sonando,
    el('div', { class: 'rep-controles' }, bAtras, bPausa, bAdelante),
    el('div', { class: 'rep-ajustes' },
      el('label', { for: 'rep-velocidad' }, 'Velocidad '), selVelocidad,
      el('label', { for: 'rep-posicion' }, 'Posición '), posicion, tiempo),
    el('div', { class: 'rep-pie' }, irTexto, bCerrar));

  function colocarReproductor() {
    if (rep.isConnected) return;
    const main = document.getElementById('contenido');
    if (main && main.parentNode) main.parentNode.insertBefore(rep, main.nextSibling);
  }

  const velocidadGuardada = recuperar('jaris.velocidad');
  sonido.playbackRate = VELOCIDADES.indexOf(velocidadGuardada) >= 0 ? velocidadGuardada : 1;
  selVelocidad.value = String(sonido.playbackRate);

  function ponerVelocidad() {
    const v = Number(selVelocidad.value);
    sonido.playbackRate = v;
    sonido.defaultPlaybackRate = v;
    guardar('jaris.velocidad', v);
  }
  selVelocidad.addEventListener('change', ponerVelocidad);

  function pintarEstado() {
    const pausado = sonido.paused;
    bPausa.textContent = pausado ? (sonido.ended ? 'Volver a escuchar' : 'Seguir') : 'Pausar';
    document.querySelectorAll('.escuchar button').forEach(function (b) {
      const suyo = actual && b.dataset.audio === actual.id;
      b.classList.toggle('sonando', suyo && !pausado);
      const txt = b.querySelector('.accion');
      if (txt) txt.textContent = suyo && !pausado ? 'Pausar' : 'Escuchar';
    });
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = actual ? (pausado ? 'paused' : 'playing') : 'none';
  }
  let ultimaPintada = -1;
  function pintarTiempo() {
    const d = sonido.duration, t = sonido.currentTime;
    if (isFinite(d) && posicion.max !== String(Math.floor(d))) posicion.max = String(Math.floor(d));
    const s = Math.floor(t);
    if (s === ultimaPintada) return;
    ultimaPintada = s;
    posicion.value = String(s);
    posicion.setAttribute('aria-valuetext', enPalabras(t) + ' de ' + enPalabras(d));
    tiempo.textContent = reloj(t) + ' / ' + reloj(d);
  }

  function saltar(segundos) {
    if (!actual) return;
    const d = isFinite(sonido.duration) ? sonido.duration : Infinity;
    sonido.currentTime = Math.min(Math.max(0, sonido.currentTime + segundos), d);
    pintarTiempo();
  }
  bAtras.addEventListener('click', function () { saltar(-10); });
  bAdelante.addEventListener('click', function () { saltar(10); });
  posicion.addEventListener('input', function () { sonido.currentTime = Number(posicion.value); pintarTiempo(); });
  bPausa.addEventListener('click', function () { alternar(true); });
  bCerrar.addEventListener('click', cerrar);

  async function alternar(decir) {
    if (!actual) return;
    if (sonido.paused) {
      try { await sonido.play(); if (decir) avisar('Sonando.'); } catch (e) { fallo(); }
    } else {
      sonido.pause();
      if (decir) avisar('En pausa.');
    }
  }

  function cerrar() {
    sonido.pause();
    sonido.removeAttribute('src');
    sonido.load();
    actual = null;
    rep.hidden = true;
    pintarEstado();
    avisar('Reproductor cerrado.');
    const volver = botonOrigen && botonOrigen.isConnected ? botonOrigen : document.querySelector('#contenido h1');
    if (volver) { if (!volver.hasAttribute('tabindex') && volver.tagName === 'H1') volver.setAttribute('tabindex', '-1'); volver.focus(); }
  }

  function fallo() {
    if (!actual) return;
    avisar(navigator.onLine === false
      ? 'Este audio no está descargado y ahora no hay conexión. Cuando vuelva, se puede descargar en la pantalla Audios, del menú.'
      : 'No se ha podido abrir el audio. Vuelve a intentarlo dentro de un momento.');
    pintarEstado();
  }

  async function escuchar(id, boton) {
    const d = await cargar();
    const a = d && d.audios.find(function (x) { return x.id === id; });
    if (!a) return;
    if (actual && actual.id === id) { alternar(true); return; }
    colocarReproductor();
    actual = a;
    botonOrigen = boton || null;
    ultimaPintada = -1;
    await prepararEstado();
    sonido.src = srcDe(a);
    sonido.playbackRate = Number(selVelocidad.value);
    sonando.textContent = 'Sonando: ' + nombreCompleto(a);
    irTexto.href = a.cap === 'cancionero' ? '#/cancionero/' + (a.a || '').replace('salmo-', '') : '#/leer/' + a.cap + (a.a ? '/' + a.a : '');
    posicion.max = '0'; posicion.value = '0';
    posicion.setAttribute('aria-valuetext', 'cargando');
    tiempo.textContent = '0:00 / 0:00';
    rep.hidden = false;
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({ title: nombreCompleto(a), artist: 'Khaire Lyra', album: 'Jaris. Antología del helenismo',
          artwork: [{ src: 'iconos/icono-512.png', sizes: '512x512', type: 'image/png' }] });
      } catch (e) { /* nada */ }
    }
    try {
      await sonido.play();
      sonido.playbackRate = Number(selVelocidad.value);
      avisar('Sonando: ' + nombreCompleto(a) + '.' + (primeraVez ? ' Los botones del reproductor están al final de la página.' : ''));
      primeraVez = false;
    } catch (e) { if (e && e.name !== 'AbortError') fallo(); }
  }

  sonido.addEventListener('play', pintarEstado);
  sonido.addEventListener('pause', pintarEstado);
  sonido.addEventListener('timeupdate', pintarTiempo);
  sonido.addEventListener('loadedmetadata', function () { ultimaPintada = -1; pintarTiempo(); });
  sonido.addEventListener('ended', function () { pintarEstado(); if (actual) avisar('Terminado: ' + nombreCompleto(actual) + '.'); });
  sonido.addEventListener('error', function () { if (actual && sonido.getAttribute('src')) fallo(); });

  if ('mediaSession' in navigator) {
    const acciones = {
      play: function () { if (actual) sonido.play().catch(fallo); },
      pause: function () { sonido.pause(); },
      seekbackward: function () { saltar(-10); },
      seekforward: function () { saltar(10); },
      stop: function () { if (actual) cerrar(); },
    };
    for (const [k, f] of Object.entries(acciones)) { try { navigator.mediaSession.setActionHandler(k, f); } catch (e) { /* no la tiene */ } }
  }

  /* ---------- Descargar por bloques (parte 3c) ----------
     Los audios descargados se guardan en la caché «audios-jaris» (aparte de la aplicación: una edición
     nueva no los borra). Cada uno se guarda con su huella (?v=...): si un audio cambia en una edición
     nueva, el viejo se borra solo y hay que volver a descargarlo. sw.js los sirve sin conexión. */
  const CACHE_AUDIOS = 'audios-jaris';
  const descargados = new Set();
  let estadoListo = null;
  let descarga = null;
  const gruposEnPantalla = [];

  function claveDe(a) { return new URL(a.archivo + '?v=' + a.huella, location.href).href; }
  function srcDe(a) { return descargados.has(a.id) ? a.archivo + '?v=' + a.huella : a.archivo; }
  function tamano(bytes) {
    const mb = bytes / 1048576;
    if (!bytes) return '0 MB';
    if (mb < 1) return 'menos de 1 MB';
    if (mb >= 1024) return (mb / 1024).toFixed(1).replace('.', ',') + ' GB';
    return (mb < 10 ? mb.toFixed(1).replace('.', ',') : String(Math.round(mb))) + ' MB';
  }
  function prepararEstado() {
    if (estadoListo) return estadoListo;
    estadoListo = (async function () {
      const d = await cargar();
      if (!d || !window.caches) return;
      try {
        const cache = await caches.open(CACHE_AUDIOS);
        const validas = new Map(d.audios.map(function (a) { return [claveDe(a), a.id]; }));
        for (const req of await cache.keys()) {
          const id = validas.get(req.url);
          if (id) descargados.add(id); else await cache.delete(req);   /* de una edición anterior o ya quitado */
        }
      } catch (e) { /* sin caché: se oye por internet */ }
    })();
    return estadoListo;
  }
  function audiosDe(ids) {
    return ids.map(function (id) { return datos.audios.find(function (a) { return a.id === id; }); }).filter(Boolean);
  }

  function marcarBotones() {
    document.querySelectorAll('.escuchar button[data-audio]').forEach(function (b) {
      const e = b.querySelector('.estado');
      if (e) e.textContent = descargados.has(b.dataset.audio) ? ' (descargado)' : '';
    });
  }
  function textoEstado(ids) {
    const lista = audiosDe(ids), hechos = lista.filter(function (a) { return descargados.has(a.id); }).length;
    const total = lista.reduce(function (s, a) { return s + a.bytes; }, 0);
    const base = lista.length + (lista.length === 1 ? ' audio, ' : ' audios, ') + tamano(total) + '. ';
    if (!hechos) return base + 'Sin descargar.';
    if (hechos === lista.length) return base + 'Ya descargado: se puede escuchar sin conexión.';
    return base + 'Descargados ' + hechos + ' de ' + lista.length + '.';
  }
  function textoResumen() {
    const hechos = datos.audios.filter(function (a) { return descargados.has(a.id); });
    return 'Descargados en este dispositivo: ' + hechos.length + ' de ' + datos.audios.length + ' audios (' +
      tamano(hechos.reduce(function (s, a) { return s + a.bytes; }, 0)) + ' de ' + tamano(datos.bytes) + ').';
  }
  function pintarBloques() {
    for (const g of gruposEnPantalla) if (g.p.isConnected) { g.p.textContent = textoEstado(g.ids); pintarBotonesGrupo(g); }
    const r = document.getElementById('aud-resumen');
    if (r && datos) r.textContent = textoResumen();
  }
  function pintarDescarga() {
    const sec = document.getElementById('aud-progreso');
    if (!sec) return;
    const x = descarga;
    if (!x) { sec.hidden = true; return; }
    sec.hidden = false;
    const cuenta = x.hechos + ' de ' + x.lista.length + ' audios (' + tamano(x.bytesHechos) + ' de ' + tamano(x.bytesTotal) + ')';
    document.getElementById('aud-progreso-texto').textContent = x.terminada ? 'Terminada: ' + x.nombre + '. ' + cuenta + '.'
      : (x.pausada ? 'En pausa: ' : 'Descargando ') + x.nombre + ': ' + cuenta + '.';
    const barra = document.getElementById('aud-barra');
    barra.max = String(x.bytesTotal || 1);
    barra.value = String(x.bytesHechos);
    barra.setAttribute('aria-valuetext', Math.floor(100 * x.bytesHechos / (x.bytesTotal || 1)) + ' por ciento');
    const b = document.getElementById('aud-pausa');
    b.hidden = !!x.terminada;
    b.textContent = x.pausada ? 'Seguir con la descarga' : 'Pausar la descarga';
  }

  async function descargar(nombre, ids) {
    const d = await cargar();
    await prepararEstado();
    if (!d) return;
    if (descarga && !descarga.terminada && !descarga.pausada) {
      avisar('Ya hay una descarga en marcha (' + descarga.nombre + '). Espera a que termine o pulsa «Pausar la descarga».');
      return;
    }
    if (!window.caches) { avisar('Este navegador no deja guardar los audios. Se pueden escuchar con conexión.'); return; }
    if (navigator.onLine === false) { avisar('Ahora no hay conexión. Vuelve a intentarlo cuando la haya.'); return; }
    const faltan = audiosDe(ids).filter(function (a) { return !descargados.has(a.id); });
    if (!faltan.length) { avisar(nombre + ' ya está descargado.'); return; }
    try { if (navigator.storage && navigator.storage.persist) await navigator.storage.persist(); } catch (e) { /* nada */ }
    descarga = { nombre: nombre, lista: faltan, hechos: 0, bytesHechos: 0, cuarto: 0, pausada: false, terminada: false, control: null,
      bytesTotal: faltan.reduce(function (s, a) { return s + a.bytes; }, 0) };
    avisar('Descargando ' + nombre + ': ' + faltan.length + (faltan.length === 1 ? ' audio, ' : ' audios, ') + tamano(descarga.bytesTotal) + '.');
    seguirDescarga();
  }
  async function seguirDescarga() {
    const x = descarga;
    if (!x || x.terminada) return;
    x.pausada = false;
    pintarDescarga();
    let cache;
    try { cache = await caches.open(CACHE_AUDIOS); } catch (e) { avisar('No se ha podido guardar en este dispositivo.'); return; }
    for (const a of x.lista) {
      if (x.pausada || descarga !== x) return;
      if (descargados.has(a.id)) continue;
      x.control = new AbortController();
      try {
        const r = await fetch(a.archivo + '?v=' + a.huella, { cache: 'no-store', signal: x.control.signal });
        if (r.status !== 200) throw new Error('respuesta ' + r.status);
        await cache.put(claveDe(a), r);
      } catch (e) {
        if (x.pausada || descarga !== x) return;   /* pausada a propósito */
        x.pausada = true;
        pintarDescarga();
        avisar(e && e.name === 'QuotaExceededError'
          ? 'No queda espacio en el dispositivo para más audios. La descarga se ha parado; puedes borrar otros bloques.'
          : 'La descarga de ' + x.nombre + ' se ha parado, quizá por falta de conexión. Lo descargado se queda guardado. Pulsa «Seguir con la descarga» cuando haya conexión.');
        return;
      }
      if (descarga !== x) return;   /* revisión parte 4: se borró todo mientras se guardaba este audio; no contarlo */
      descargados.add(a.id);
      x.hechos++;
      x.bytesHechos += a.bytes;
      marcarBotones(); pintarBloques(); pintarDescarga();
      const cuarto = Math.floor(4 * x.bytesHechos / (x.bytesTotal || 1));
      if (cuarto > x.cuarto && cuarto < 4) { x.cuarto = cuarto; avisar('Descarga de ' + x.nombre + ': ' + (cuarto * 25) + ' por ciento.'); }
    }
    x.terminada = true;
    pintarDescarga(); pintarBloques();
    avisar('Descarga terminada: ' + x.nombre + '. Ya se puede escuchar sin conexión.');
  }
  function pausarDescarga() {
    if (!descarga || descarga.terminada || descarga.pausada) return;
    descarga.pausada = true;
    if (descarga.control) descarga.control.abort();
    pintarDescarga();
    avisar('Descarga en pausa. Lo descargado se queda guardado.');
  }
  async function borrar(nombre, ids) {
    await prepararEstado();
    const lista = audiosDe(ids).filter(function (a) { return descargados.has(a.id); });
    if (!lista.length) { avisar('No hay nada descargado de ' + nombre + '.'); return; }
    if (!window.confirm('¿Borrar de este dispositivo los audios descargados de ' + nombre + ' (' + tamano(lista.reduce(function (s, a) { return s + a.bytes; }, 0)) + ')? Se pueden volver a descargar cuando quieras.')) return;
    if (descarga && !descarga.terminada) pausarDescarga();
    try {
      const cache = await caches.open(CACHE_AUDIOS);
      for (const a of lista) { await cache.delete(claveDe(a)); descargados.delete(a.id); }
    } catch (e) { /* nada */ }
    marcarBotones(); pintarBloques();
    avisar('Borrados los audios de ' + nombre + '.');
  }
  /* Quita todos los audios descargados, sin preguntar (quien llama pregunta antes). Devuelve cuántos había.
     Lo usan la pantalla Audios (borrarTodo) y Ajustes > Audios (7B, 6 nov 2026). */
  async function quitarTodo() {
    await prepararEstado();
    const n = descargados.size;
    if (descarga && !descarga.terminada) pausarDescarga();
    /* Revisión parte 4: si el navegador no deja borrar, se avisa del fallo (antes decía «Borrados» aunque no se hubiera borrado nada). */
    if (window.caches) await caches.delete(CACHE_AUDIOS);
    descargados.clear();
    descarga = null;
    marcarBotones(); pintarBloques(); pintarDescarga();
    return n;
  }
  async function borrarTodo() {
    await prepararEstado();
    if (!descargados.size) { avisar('No hay ningún audio descargado.'); return; }
    if (!window.confirm('¿Borrar de este dispositivo todos los audios descargados? El libro no se borra, y los audios se pueden volver a descargar.')) return;
    try { await quitarTodo(); } catch (e) { avisar('No se han podido borrar los audios. Inténtalo otra vez.'); return; }
    avisar('Borrados todos los audios descargados.');
  }
  /* Cuántos audios hay guardados en este dispositivo y cuánto ocupan (para Ajustes). */
  async function resumenGuardados() {
    const d = await cargar();
    if (!d) return null;
    await prepararEstado();
    const hechos = d.audios.filter(function (a) { return descargados.has(a.id); });
    return { guardados: hechos.length, total: d.audios.length, bytesGuardados: hechos.reduce(function (s, a) { return s + a.bytes; }, 0),
      bytesTotal: d.bytes, puedeGuardar: !!window.caches };
  }
  /* La velocidad por defecto (jaris.velocidad): la misma que cambia el reproductor. */
  function fijarVelocidad(v) {
    if (VELOCIDADES.indexOf(v) < 0) return;
    selVelocidad.value = String(v);
    ponerVelocidad();
  }
  function sincronizarVelocidad() {   // tras recuperar una copia o borrar los datos: el reproductor toma lo guardado
    const g = recuperar('jaris.velocidad'), v = VELOCIDADES.indexOf(g) >= 0 ? g : 1;
    selVelocidad.value = String(v);
    sonido.playbackRate = v;
    sonido.defaultPlaybackRate = v;
  }

  /* La pantalla «Audios» (#/audios). app.js la pone en la página. */
  function grupo(nivel, titulo, ids, enlace, pregunta) {
    const sec = el('section', { class: 'aud-grupo' }, el(nivel, { texto: titulo }));
    const p = el('p', { class: 'aud-estado', tabindex: '-1', texto: textoEstado(ids) });
    const bDescargar = el('button', { type: 'button' });
    const bBorrar = el('button', { type: 'button', class: 'boton secundario' }, 'Borrar lo descargado', el('span', { class: 'solo-lector', texto: ' de ' + titulo }));
    bDescargar.addEventListener('click', function () {
      if (pregunta && !window.confirm(pregunta())) return;
      descargar(titulo, ids);
    });
    bBorrar.addEventListener('click', function () { borrar(titulo, ids); });
    const g = { p: p, ids: ids, titulo: titulo, bDescargar: bDescargar, bBorrar: bBorrar };
    gruposEnPantalla.push(g);
    pintarBotonesGrupo(g);
    sec.append(p, el('div', { class: 'aud-botones' }, bDescargar, bBorrar, enlace || null));
    return sec;
  }
  /* Según lo descargado: «Descargar», «Descargar lo que falta» o nada (si ya está todo descargado); «Borrar», solo si hay algo.
     Si el botón que tenía el foco desaparece, el foco pasa a la línea del estado, para no perderse. */
  function pintarBotonesGrupo(g) {
    const lista = audiosDe(g.ids), hechos = lista.filter(function (a) { return descargados.has(a.id); }).length;
    const faltan = lista.length - hechos;
    // (el nombre solo cambia de «Descargar» a «Descargar lo que falta», no en cada audio, para que el lector no lo repita)
    const etiqueta = hechos ? 'Descargar lo que falta' : 'Descargar';
    if (g.bDescargar.dataset.etiqueta !== etiqueta) {
      g.bDescargar.dataset.etiqueta = etiqueta;
      g.bDescargar.replaceChildren(etiqueta, el('span', { class: 'solo-lector', texto: (hechos ? ' de ' : ' ') + g.titulo }));
    }
    const quitar = function (b, ocultar) {
      if (ocultar && document.activeElement === b) { b.hidden = true; g.p.focus(); }
      b.hidden = ocultar;
    };
    quitar(g.bDescargar, faltan === 0);
    quitar(g.bBorrar, hechos === 0);
  }
  async function pantalla() {
    const d = await cargar();
    await prepararEstado();
    const caja = el('div', { class: 'audios' }, el('h1', { texto: 'Audios' }));
    if (!d) {
      caja.append(el('p', { texto: 'No se ha podido abrir la lista de audios. Vuelve a intentarlo con conexión.' }));
      return caja;
    }
    gruposEnPantalla.length = 0;
    caja.append(
      el('p', { texto: 'Los audios son opcionales: el libro se lee entero sin ellos. Con conexión, cualquier audio se puede escuchar pulsando «Escuchar» junto a su texto. Para escucharlos sin conexión, descárgalos aquí, por tipo o por dios. Se guardan solo en este dispositivo y se pueden borrar cuando quieras.' }),
      el('p', { id: 'aud-resumen', texto: textoResumen() }),
      el('p', { id: 'aud-espacio' }));
    const bPausa = el('button', { type: 'button', id: 'aud-pausa' }, 'Pausar la descarga');
    bPausa.addEventListener('click', function () { if (descarga && descarga.pausada) seguirDescarga(); else pausarDescarga(); });
    caja.append(el('section', { id: 'aud-progreso', class: 'aud-progreso', 'aria-labelledby': 'aud-progreso-titulo', hidden: 'hidden' },
      el('h2', { id: 'aud-progreso-titulo', texto: 'Descarga' }),
      el('p', { id: 'aud-progreso-texto' }),
      el('progress', { id: 'aud-barra', max: '1', value: '0', 'aria-labelledby': 'aud-progreso-titulo' }),
      el('p', {}, bPausa)));

    // Todo de una vez (pedido por la autora el 3 de noviembre): pregunta antes, diciendo cuánto ocupa lo que falta
    const todos = d.audios.map(function (a) { return a.id; });
    caja.append(el('h2', { texto: 'Todo de una vez' }),
      el('p', { texto: 'Descarga todos los audios de Jaris para escucharlos sin conexión. Ocupa mucho: mejor con wifi. En el iPhone el espacio para las aplicaciones web es más pequeño; si no cabe todo, la descarga se para y lo descargado se queda.' }),
      grupo('h3', 'Todos los audios', todos, null, function () {
        const faltan = audiosDe(todos).filter(function (a) { return !descargados.has(a.id); });
        return '¿Descargar ' + (faltan.length === todos.length ? 'todos los audios' : 'los ' + faltan.length + ' audios que faltan') + ' (' +
          tamano(faltan.reduce(function (s, a) { return s + a.bytes; }, 0)) + ')? Mejor con wifi. Se puede pausar.';
      }));
    caja.append(el('h2', { texto: 'Por tipo' }));
    for (const b of d.bloques) {
      caja.append(grupo('h3', b.titulo, b.audios, b.cap ? el('a', { href: b.cap === 'cancionero' ? '#/cancionero' : '#/leer/' + b.cap }, b.cap === 'cancionero' ? 'Ver el Cancionero' : 'Ver en el libro', el('span', { class: 'solo-lector', texto: ': ' + b.capTitulo })) : null));
    }
    caja.append(el('h2', { texto: 'Por dios' }),
      el('p', { texto: 'Todos los audios de cada dios juntos: himnos, oraciones, frases en griego y música.' }));
    for (const [dios, ids] of Object.entries(d.dioses)) caja.append(grupo('h3', dios, ids, null));

    const bTodo = el('button', { type: 'button', class: 'boton secundario' }, 'Borrar todos los audios descargados');
    bTodo.addEventListener('click', borrarTodo);
    caja.append(el('h2', { texto: 'Borrar todo' }),
      el('p', { texto: 'Para dejar sitio en el dispositivo. El libro no se borra.' }), el('p', {}, bTodo));

    pintarBloques();
    setTimeout(pintarDescarga, 0);
    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then(function (e) {
        const p = document.getElementById('aud-espacio');
        if (p && e && e.quota) p.textContent = 'Espacio libre para Jaris en este dispositivo: unos ' + tamano(Math.max(0, e.quota - (e.usage || 0))) + '. Todos los audios juntos ocupan ' + tamano(d.bytes) + '.';
      }).catch(function () { /* nada */ });
    }
    return caja;
  }

  /* ---------- Los botones «Escuchar» junto a cada texto ---------- */
  function grupoDeBotones(lista) {
    const variosTitulos = new Set(lista.map(function (a) { return a.titulo; })).size > 1;
    const caja = el('div', { class: 'escuchar' });
    for (const a of lista) {
      const extra = variosTitulos ? ': ' + nombreCompleto(a) : (a.version ? ', ' + a.version : '');
      const boton = el('button', { type: 'button', 'data-audio': a.id },
        el('span', { class: 'icono', 'aria-hidden': 'true', texto: '♪ ' }),
        el('span', { class: 'accion', texto: actual && actual.id === a.id && !sonido.paused ? 'Pausar' : 'Escuchar' }),
        extra,
        variosTitulos ? null : el('span', { class: 'solo-lector', texto: ' «' + a.titulo + '»' }),
        el('span', { class: 'estado', texto: descargados.has(a.id) ? ' (descargado)' : '' }));
      boton.addEventListener('click', function () { escuchar(a.id, boton); });
      caja.append(boton);
    }
    return caja;
  }

  /* Pone los botones en un capítulo ya pintado (lo llama app.js al abrir cada capítulo). */
  async function ponerBotones(contenedor, cap) {
    const d = await cargar();
    if (!d) return;
    await prepararEstado();
    const porApartado = new Map();
    for (const a of d.audios) {
      if (a.cap !== cap) continue;
      const k = a.a || '';
      if (!porApartado.has(k)) porApartado.set(k, []);
      porApartado.get(k).push(a);
    }
    for (const [ancla, lista] of porApartado) {
      const sec = ancla ? contenedor.querySelector('[id="' + CSS.escape(ancla) + '"]') : null;
      const titulo = sec ? (sec.matches('h1, h2, h3, h4, h5, h6') ? sec : sec.querySelector('h1, h2, h3, h4, h5, h6'))
        : contenedor.querySelector('h1');
      if (titulo) titulo.after(grupoDeBotones(lista));
    }
  }

  /* Botones para un apartado suelto (por ejemplo, el texto del día en la pantalla de «Hoy»). */
  async function botonesPara(cap, ancla) {
    const d = await cargar();
    if (!d) return null;
    await prepararEstado();
    const lista = d.audios.filter(function (a) { return a.cap === cap && a.a === ancla; });
    return lista.length ? grupoDeBotones(lista) : null;
  }

  window.JarisAudios = { cargar: cargar, ponerBotones: ponerBotones, botonesPara: botonesPara, pantalla: pantalla,
    /* Para Ajustes > Audios */
    VELOCIDADES: VELOCIDADES, tamano: tamano, resumen: resumenGuardados, quitarTodo: quitarTodo,
    fijarVelocidad: fijarVelocidad, sincronizarVelocidad: sincronizarVelocidad,
    /* Para el temporizador del rincón de la noche: para lo que suene (sin cerrar el reproductor). */
    pausar: function () { if (!sonido.paused) { sonido.pause(); return true; } return false; } };
})();
