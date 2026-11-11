/* Jaris: el rincón de la noche (extra). Ruta: #/noche.
   Todo sale del libro en cada momento (por el título de cada texto), así que si el libro cambia, esto cambia solo:
   - (sesión C4) la oración final: alterna «Antes de dormir» (Hipnos) con las tres oraciones a Nyx del capítulo 6 (sale de la fecha), o una de tu lista de Favoritos;
   - el repaso amable del día (Versos de oro de Pitágoras), que se puede guardar en el diario de hoy;
   - los himnos órficos de la noche (Nyx, Hipnos, Oneiro) y el rito «Al terminar el día»;
   - qué día griego empieza esta noche y qué se celebra;
   - un temporizador para que el audio se pare solo;
   - (sesión C4) arriba del todo, los planes de lectura de la noche: «Lectura de esta noche» (ver más abajo). */
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

  /* ============================================================================================
     PLANES DE LECTURA DE LA NOCHE (sesión C4, 7 de noviembre de 2026).
     Los datos los hace montar_aplicacion.py (lecturas_aplicacion.py, sesión C3) en contenido/lecturas.json.
     Aquí solo se guarda por dónde vas: clave «jaris.lectura» (en este dispositivo; entra en la copia de «Tus datos»):
       { plan, duracion, dios, progreso: { <plan o undios:<dios>>: <id del siguiente texto por leer, o '#fin'> }, pausa, otra }
     El progreso es por TEXTO (no por número de lectura): así cambiar de duración no hace perder el sitio.
     Nunca hay rachas, contadores de días ni avisos de «llevas X días».
     ============================================================================================ */
  const CLAVE_LECTURA = 'jaris.lectura';
  const DURACIONES = ['corta', 'media', 'larga'];
  const NOMBRE_DURACION = { corta: 'Corta (unos 3 minutos)', media: 'Media (unos 6 minutos)', larga: 'Larga (unos 10 minutos)' };
  const FIN = '#fin';                       // progreso de un plan que ya se ha terminado
  const BLOQUES = ['p', 'li', 'blockquote', 'table', 'figure', 'pre', 'dl'];   // los mismos que en lecturas_aplicacion.py
  const SUBIR_TITULOS = 3;                  // los títulos del libro bajan 3 niveles (h1 pasa a h4): la lectura ya usa h2 y h3

  /* Segunda vuelta (sesión C7): «vueltas» = cuántas veces se ha repetido cada plan después de terminarlo (por la misma clave
     que el progreso); «preguntas» = cuándo sale la pregunta para pensar: 'vuelta' (solo al repetir, por defecto), 'siempre' o 'nunca'. */
  const MODOS_PREGUNTAS = ['vuelta', 'siempre', 'nunca'];
  const NOMBRE_MODO = { vuelta: 'Solo al repetir un plan', siempre: 'También la primera vez', nunca: 'Nunca' };
  function estadoVacio() { return { plan: 'tranquilo', duracion: 'media', dios: '', progreso: {}, pausa: false, otra: null, vueltas: {}, preguntas: 'vuelta' }; }
  function leerEstado() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(CLAVE_LECTURA)); } catch (e) { d = null; }
    const e = estadoVacio();
    if (!d || typeof d !== 'object' || Array.isArray(d)) return e;
    if (typeof d.plan === 'string' && d.plan) e.plan = d.plan;
    if (DURACIONES.indexOf(d.duracion) >= 0) e.duracion = d.duracion;
    if (typeof d.dios === 'string') e.dios = d.dios;
    if (d.progreso && typeof d.progreso === 'object' && !Array.isArray(d.progreso)) {
      Object.keys(d.progreso).forEach(function (k) { if (typeof d.progreso[k] === 'string') e.progreso[k] = d.progreso[k]; });
    }
    e.pausa = d.pausa === true;
    if (d.vueltas && typeof d.vueltas === 'object' && !Array.isArray(d.vueltas)) {
      Object.keys(d.vueltas).forEach(function (k) {
        const v = Math.floor(Number(d.vueltas[k]));
        if (v > 0) e.vueltas[k] = Math.min(v, 999);
      });
    }
    if (MODOS_PREGUNTAS.indexOf(d.preguntas) >= 0) e.preguntas = d.preguntas;
    if (d.otra && typeof d.otra === 'object' && typeof d.otra.cap === 'string' && typeof d.otra.a === 'string') {
      e.otra = { dia: Number(d.otra.dia) || 0, cap: d.otra.cap, a: d.otra.a, t: typeof d.otra.t === 'string' ? d.otra.t : '' };
    }
    return e;
  }
  function guardarEstado(e) {
    try { localStorage.setItem(CLAVE_LECTURA, JSON.stringify(e)); return true; } catch (x) { return false; }
  }

  /* El plan que toca (y la clave con la que se guarda su progreso). «Un dios» es un plan por cada dios. */
  function planActivo(datos, e) {
    if (e.plan === 'undios' && datos.unDios && datos.unDios.dioses && datos.unDios.dioses.length) {
      const d = datos.unDios.dioses.find(function (x) { return x.id === e.dios; }) || datos.unDios.dioses[0];
      return { p: d, clave: 'undios:' + d.id, nombre: 'Un dios: ' + d.nombre, inicios: [] };
    }
    const p = datos.planes.find(function (x) { return x.id === e.plan; })
      || datos.planes.find(function (x) { return x.id === (datos.porDefecto && datos.porDefecto.plan); }) || datos.planes[0];
    return { p: p, clave: p.id, nombre: p.nombre, inicios: p.inicios || [] };
  }
  /* Índice del siguiente texto por leer (si el plan está terminado, es el número de textos). */
  function posicion(p, e, clave) {
    const prog = e.progreso[clave];
    if (prog === FIN) return p.textos.length;
    const i = prog ? p.textos.findIndex(function (t) { return t.id === prog; }) : 0;
    return i < 0 ? 0 : i;
  }
  /* La lectura de esta noche: empieza justo en el texto por leer y acaba donde acaba la lectura normal de esa duración
     (igual que lectura_desde() de lecturas_aplicacion.py: si se cambió de duración, nunca se salta nada). */
  function lecturaDe(p, dur, i) {
    const ls = p.lecturas[dur] || [];
    for (let n = 0; n < ls.length; n++) if (ls[n].de <= i && i < ls[n].a) return { n: n, inicio: ls[n].de, a: ls[n].a, total: ls.length };
    return null;
  }
  function palabrasDe(p, de, a) { let s = 0; for (let k = de; k < a; k++) s += p.textos[k].palabras || 0; return s; }
  function minutosDe(palabras) { return Math.max(1, Math.round(palabras / 120)); }
  function tituloDe(p, de, a) {
    return a - de <= 1 ? p.textos[de].titulo : 'De «' + p.textos[de].titulo + '» a «' + p.textos[a - 1].titulo + '»';
  }
  function idSiguiente(p, a) { return a < p.textos.length ? p.textos[a].id : FIN; }
  /* A dónde lleva «Volver a la anterior»: al principio de esta lectura si ya vas a mitad, o al de la anterior. -1 si no hay. */
  function indiceAnterior(p, dur, i) {
    if (!p.textos.length) return -1;
    const terminado = i >= p.textos.length;
    const L = lecturaDe(p, dur, terminado ? p.textos.length - 1 : i);
    if (!L) return -1;
    if (terminado || i > L.inicio) return L.inicio;
    return L.n === 0 ? -1 : p.lecturas[dur][L.n - 1].de;
  }
  /* Las cuatro acciones. Cambian el estado `e` (hay que guardarlo después); devuelven false si no había nada que hacer. */
  function marcarLeida(datos, e) {
    const ap = planActivo(datos, e), i = posicion(ap.p, e, ap.clave), L = lecturaDe(ap.p, e.duracion, i);
    if (!L) return false;
    e.progreso[ap.clave] = idSiguiente(ap.p, L.a);
    return true;
  }
  function volverALaAnterior(datos, e) {
    const ap = planActivo(datos, e), j = indiceAnterior(ap.p, e.duracion, posicion(ap.p, e, ap.clave));
    if (j < 0) return false;
    e.progreso[ap.clave] = ap.p.textos[j].id;
    return true;
  }
  /* Si el plan estaba TERMINADO y se vuelve a empezar (de nuevo o desde otro sitio), empieza una vuelta más.
     Empezar de nuevo a mitad de plan no cuenta como vuelta. */
  function contarVuelta(e, clave) {
    if (e.progreso[clave] === FIN) e.vueltas[clave] = Math.min((e.vueltas[clave] || 0) + 1, 999);
  }
  function empezarEn(datos, e, textoId) {
    const ap = planActivo(datos, e);
    if (!ap.p.textos.some(function (t) { return t.id === textoId; })) return false;
    contarVuelta(e, ap.clave);
    e.progreso[ap.clave] = textoId;
    return true;
  }
  function empezarDeNuevo(datos, e) {
    const ap = planActivo(datos, e);
    contarVuelta(e, ap.clave);
    delete e.progreso[ap.clave];
    return true;
  }

  /* ---------- Segunda vuelta: una pregunta corta para pensar (sesión C7; lista aprobada por la autora en
     'Para la próxima conversación\27. Segunda vuelta - preguntas para pensar (C7, aprobadas).txt') ----------
     El tipo sale del capítulo del PRIMER texto de la lectura. La pregunta rota con el número de la lectura y de la vuelta:
     la misma lectura enseña siempre la misma pregunta, y dos lecturas seguidas del mismo tipo no la repiten. */
  const PREGUNTAS = {
    oracion: ['¿Qué frase de esta oración te gustaría llevarte a mañana?', '¿En qué momento de tu vida te vendría bien?',
      'Si la dijeras con tus palabras, ¿cómo empezaría?', '¿Por quién o por qué te gustaría rezarla?'],
    himno: ['¿Qué te dice hoy este himno?', '¿Qué nombre o título del dios te ha llamado la atención?',
      '¿Qué parte recitarías en voz alta?', '¿Has notado algo que no viste la primera vez?'],
    mito: ['¿Con qué personaje te identificas hoy?', '¿Qué crees que enseña esta historia?',
      '¿Se parece a algo que te ha pasado?', '¿Qué parte le contarías a alguien?'],
    ficha: ['¿Qué te gustaría pedirle o agradecerle a este dios?', '¿Dónde ves a este dios en tu día a día?',
      '¿Qué has descubierto de él que no sabías?'],
    sabiduria: ['¿Cómo podrías vivir este consejo mañana?', '¿En qué estás de acuerdo y en qué no?',
      '¿Recuerdas un día en que te habría venido bien?', '¿Qué palabra o frase te quedas?'],
    alma: ['¿Qué te hace pensar esta lectura sobre la vida?', '¿Qué te ha dado calma y qué te ha dejado preguntas?',
      '¿Qué te llevas de esta lectura?'],
    salmo: ['¿Qué verso de este salmo te gustaría cantar mañana?', '¿Qué parte te sale del corazón?'],
    libro: ['¿Qué te gustaría probar de lo que has leído?', '¿Qué has aprendido esta noche?',
      '¿Hay algo que quieras apuntar para no olvidarlo?'],
  };
  function tipoDeTexto(libro, t) {
    const c = t && libro && Array.isArray(libro.capitulos) ? libro.capitulos.find(function (x) { return x.cap === t.cap; }) : null;
    const tit = c && c.titulo ? c.titulo : '';
    if (/^ap[eé]ndice a8\b/i.test(tit)) return 'salmo';
    const m = /^cap[ií]tulo (\d+)/i.exec(tit), n = m ? Number(m[1]) : 0;
    if (n === 6) return 'oracion';
    if (n === 13) return 'ficha';
    if (n >= 15 && n <= 18) return 'himno';
    if (n >= 19 && n <= 22) return 'mito';
    if (n >= 23 && n <= 26) return 'sabiduria';
    if (n >= 27 && n <= 29) return 'alma';
    return 'libro';
  }
  function preguntaPara(tipo, nLectura, vuelta, extra) {
    const lista = PREGUNTAS[tipo] || PREGUNTAS.libro;
    return lista[modulo((Number(nLectura) || 0) + (Number(vuelta) || 0) + (Number(extra) || 0), lista.length)];
  }
  function hayPreguntas(e, clave) {
    if (e.preguntas === 'nunca') return false;
    return e.preguntas === 'siempre' || (e.vueltas[clave] || 0) > 0;
  }
  const ORDINALES = ['primera', 'segunda', 'tercera', 'cuarta', 'quinta', 'sexta', 'séptima', 'octava', 'novena', 'décima'];
  function nombreVuelta(vueltas) {   // vueltas = repeticiones hechas; 0 = primera vez (no se dice nada)
    if (!vueltas) return '';
    return (ORDINALES[vueltas] ? ORDINALES[vueltas] : 'vuelta número ' + (vueltas + 1)) + (ORDINALES[vueltas] ? ' vuelta' : '');
  }
  /* Revisión C7: el día del diario donde se guarda lo de la Noche es el que Mi diario llama «hoy» (n.hoy, lo da app.js);
     «base» es el día civil de esta tarde y sirve para la oración final y «Esta noche, otra cosa». */
  function diaDelDiario(n) { return n && typeof n.hoy === 'number' ? n.hoy : (n ? n.base : 0); }
  /* Texto que va al diario (apartado «Para pensar (lectura de la noche)», campo «pensar»). La línea «Pregunta: …»
     no la miran las sugerencias según el diario (sugerencias.js), para que las palabras de la pregunta no cuenten. */
  function textoParaElDiario(pregunta, titulo, respuesta) {
    return 'Pregunta: ' + pregunta + (titulo ? ' (' + titulo + ')' : '') + '\n' + String(respuesta || '').trim();
  }

  /* ---------- Cómo se pinta un texto de la lectura (los trozos que dejó preparados lecturas_aplicacion.py) ---------- */
  let lecturasDatos = null, capituloPuesto = { cap: '', dom: null };
  async function cargarLecturas(a) {
    if (lecturasDatos) return lecturasDatos;
    const d = await a.traer('contenido/lecturas.json');
    if (!d || !Array.isArray(d.planes) || !d.planes.length) throw new Error('lecturas');
    lecturasDatos = d;
    return d;
  }
  async function domDeCapitulo(a, cap) {
    if (capituloPuesto.cap === cap && capituloPuesto.dom) return capituloPuesto.dom;
    const plantilla = document.createElement('template');
    plantilla.innerHTML = await a.capitulo(cap);
    capituloPuesto = { cap: cap, dom: plantilla.content };
    return plantilla.content;
  }
  function bloquesPropios(sec) {
    const r = [];
    (function rec(n) {
      Array.from(n.children).forEach(function (h) {
        const t = h.tagName.toLowerCase();
        if (t === 'section' || /^h[1-6]$/.test(t)) return;
        if (BLOQUES.indexOf(t) >= 0) { r.push(h); return; }
        rec(h);
      });
    })(sec);
    return r;
  }
  function limpiarCopia(contenedor) {
    contenedor.querySelectorAll('[id]').forEach(function (n) { n.removeAttribute('id'); });
    contenedor.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(function (h) {
      const nivel = Math.min(6, Number(h.tagName[1]) + SUBIR_TITULOS);
      if (nivel === Number(h.tagName[1])) return;
      const nuevo = document.createElement('h' + nivel);
      while (h.firstChild) nuevo.appendChild(h.firstChild);
      h.replaceWith(nuevo);
    });
    return contenedor;
  }
  /* Un trozo: m = «t» (la sección entera), «p» (solo lo propio, sin sus subsecciones), «b» (bloques de..a de lo propio). */
  function pintarTrozo(dom, tr) {
    const sec = dom.getElementById(tr.s);
    if (!sec) return null;
    const caja = document.createElement('div');
    if (tr.m === 't') caja.append(sec.cloneNode(true));
    else if (tr.m === 'p') Array.from(sec.children).forEach(function (h) { if (h.tagName !== 'SECTION') caja.append(h.cloneNode(true)); });
    else {
      if (tr.de === 0) { const tit = Array.from(sec.children).find(function (h) { return /^H[1-6]$/.test(h.tagName); }); if (tit) caja.append(tit.cloneNode(true)); }
      let lista = null, padreLista = null;
      bloquesPropios(sec).slice(tr.de, tr.a).forEach(function (b) {
        if (b.tagName === 'LI') {   // los puntos seguidos de una misma lista vuelven a ser una lista
          if (!lista || padreLista !== b.parentElement) {
            lista = document.createElement(b.parentElement && b.parentElement.tagName === 'OL' ? 'ol' : 'ul');
            padreLista = b.parentElement; caja.append(lista);
          }
          lista.append(b.cloneNode(true));
        } else { lista = null; caja.append(b.cloneNode(true)); }
      });
    }
    return limpiarCopia(caja);
  }
  async function pintarTextoDOM(a, t) {
    const el = a.el, caja = el('div', { class: 'lectura-texto' });
    const sid = String(t.texto || t.id).split('#').pop();
    let dom = null;
    try { dom = await domDeCapitulo(a, t.cap); } catch (e) { dom = null; }
    const piezas = dom ? t.trozos.map(function (tr) { return pintarTrozo(dom, tr); }) : [];
    if (!dom || !piezas.length || piezas.some(function (x) { return !x; })) {
      caja.append(el('h4', { texto: t.titulo }), el('p', {}, 'No se ha podido sacar este texto aquí. ', el('a', { href: '#/leer/' + t.cap + '/' + sid }, 'Ábrelo en el libro')));
      return caja;
    }
    const primero = t.trozos[0];
    if (t.parte && primero.m === 'b' && primero.de > 0) caja.append(el('h4', { texto: t.titulo }));
    else if (t.parte) caja.append(el('p', { class: 'buz-ayuda', texto: 'Parte ' + t.parte[0] + ' de ' + t.parte[1] + '.' }));
    piezas.forEach(function (x) { caja.append(x); });
    if (!t.parte && window.JarisAudios) {
      try { const b = await window.JarisAudios.botonesPara(t.cap, sid); if (b) caja.prepend(b); } catch (e) { /* sin audio: se sigue */ }
    }
    return caja;
  }

  /* ---------- Parte 2: elegir plan y duración, «Esta noche, otra cosa» y pausa ---------- */
  function plural(n, uno, varios) { return n + ' ' + (n === 1 ? uno : varios); }
  /* Los planes que se pueden elegir (los de lecturas.json y «Un dios», que es uno por dios). */
  function listaDePlanes(datos) {
    const r = datos.planes.map(function (p) { return { id: p.id, nombre: p.nombre, descripcion: p.descripcion || '' }; });
    if (datos.unDios && datos.unDios.dioses && datos.unDios.dioses.length) {
      r.push({ id: 'undios', nombre: datos.unDios.nombre || 'Un dios', descripcion: datos.unDios.descripcion || '' });
    }
    return r;
  }
  /* «169 noches», o «de 1 a 21 noches según el dios» para «Un dios». */
  function nochesTexto(datos, id, dur) {
    if (id === 'undios') {
      const v = datos.unDios.dioses.map(function (d) { return d.noches[dur]; });
      return 'de ' + Math.min.apply(null, v) + ' a ' + plural(Math.max.apply(null, v), 'noche', 'noches') + ' según el dios';
    }
    const p = datos.planes.find(function (x) { return x.id === id; });
    return p ? plural(p.noches[dur], 'noche', 'noches') : '';
  }
  /* Cambiar de plan, de dios y de duración: el progreso de cada plan se queda como está (se guarda por plan). */
  function cambiarPlan(datos, e, plan, dios, dur) {
    if (DURACIONES.indexOf(dur) < 0) return false;
    if (plan === 'undios') {
      if (!datos.unDios || !datos.unDios.dioses.some(function (d) { return d.id === dios; })) return false;
      e.dios = dios;
    } else if (!datos.planes.some(function (p) { return p.id === plan; })) return false;
    e.plan = plan; e.duracion = dur; e.pausa = false; e.otra = null;
    return true;
  }
  function ponerPausa(e, pausa) { e.pausa = !!pausa; }
  /* «Esta noche, otra cosa»: solo vale esta noche (base = el número de la noche) y no mueve el plan. */
  function otraDeEstaNoche(e, base) { return e.otra && e.otra.dia === base ? e.otra : null; }
  function ponerOtra(e, base, x) { e.otra = { dia: base, cap: x.cap, a: x.a, t: x.t || '' }; }
  function quitarOtra(e) { e.otra = null; }
  /* Textos cortos del plan que aún no has leído (de donde vas en adelante), enteros y sin partes. */
  function candidatasSinLeer(datos, e) {
    const ap = planActivo(datos, e), i = posicion(ap.p, e, ap.clave);
    return ap.p.textos.slice(i).filter(function (t) {
      return !t.parte && t.trozos.length === 1 && t.trozos[0].m === 't' && (t.palabras || 0) <= 450;
    }).map(function (t) { return { cap: t.cap, a: String(t.id).split('#').pop(), t: t.titulo }; });
  }
  function favoritosPlanos() {
    const r = [], vistos = {};
    try {
      if (!window.JarisFavoritos) return r;
      window.JarisFavoritos.leer().listas.forEach(function (l) {
        (l.items || []).forEach(function (x) {
          const k = x.cap + '/' + x.a;
          if (!vistos[k]) { vistos[k] = true; r.push({ cap: x.cap, a: x.a, t: x.t || '' }); }
        });
      });
    } catch (e) { /* sin favoritos */ }
    return r;
  }
  /* Uno al azar de la lista, procurando que no sea el que ya salió. */
  function elegirOtro(lista, azar, evitar) {
    if (!lista.length) return null;
    const posibles = lista.length > 1 && evitar ? lista.filter(function (x) { return !(x.cap === evitar.cap && x.a === evitar.a); }) : lista;
    return posibles[Math.min(posibles.length - 1, Math.floor(azar() * posibles.length))];
  }

  /* ---------- La pantalla: «Lectura de esta noche» ---------- */
  async function seccionLectura(a, n) {
    const el = a.el, base = n ? n.base : 0, azar = a.azar || Math.random;
    const sec = el('section', { 'aria-labelledby': 'noche-lectura-t', class: 'noche-lectura' });
    sec.append(el('h2', { id: 'noche-lectura-t', texto: 'Lectura de esta noche' }));
    let datos = null;
    try { datos = await cargarLecturas(a); } catch (e) { datos = null; }
    if (!datos) {
      sec.append(el('p', { texto: 'Las lecturas de la noche no están disponibles ahora. Abre Jaris una vez con conexión para que se guarden en el dispositivo; después funcionan sin conexión.' }));
      return sec;
    }
    sec.append(el('p', { texto: 'Un trocito del libro cada noche, para leer o escuchar, sin prisa. Funciona sin conexión. Por dónde vas se guarda solo en este dispositivo y entra en la copia de seguridad de «Tus datos». Solo avanza cuando tú dices que la has leído.' }));
    const cuerpo = el('div', { class: 'noche-lectura-cuerpo' });
    sec.append(cuerpo);
    const pintarTexto = a.pintarTexto || pintarTextoDOM;
    let version = 0;

    function guardarYPintar(e, aviso, conFoco) {
      if (!guardarEstado(e)) { a.avisar('No se ha podido guardar: el navegador no deja guardar datos.'); return; }
      return pintar(conFoco !== false, aviso);
    }
    function boton(texto, alPulsar) {
      const b = el('button', { type: 'button', texto: texto });
      b.addEventListener('click', alPulsar);
      return b;
    }

    function avisoDeEmpezar(x) {
      const clave = planActivo(datos, x).clave, v = x.vueltas[clave] || 0;
      if (!v) return 'Empiezas el plan de nuevo.';
      return 'Empiezas la ' + nombreVuelta(v) + ' del plan.' + (hayPreguntas(x, clave) ? ' Cada lectura trae una pregunta para pensar.' : '');
    }
    /* «Para pensar» (sesión C7): una pregunta opcional después de los textos. Nunca hace falta contestarla para seguir. */
    function paraPensar(tipo, nLectura, vuelta, titulo) {
      let extra = 0, pregunta = preguntaPara(tipo, nLectura, vuelta, 0);
      const caja = el('div', { class: 'noche-pensar' });
      const texto = el('p', { id: 'noche-pensar-pregunta', class: 'noche-pensar-pregunta', texto: pregunta });
      caja.append(el('h4', { texto: 'Para pensar' }), texto,
        el('p', { class: 'buz-ayuda', texto: 'Es opcional: para pensarlo o apuntarlo en tu diario. No hace falta contestar para seguir.' }));
      const area = el('textarea', { id: 'noche-pensar-texto', rows: '4' });
      const etiqueta = el('label', { for: 'noche-pensar-texto', class: 'buz-etiqueta', texto: pregunta });
      const escribir = el('div', { hidden: 'hidden' });
      const dd = diaDelDiario(n);
      const abrirDiario = el('p', { hidden: 'hidden' }, el('a', { href: '#/diario/' + (window.JarisDiario && dd ? window.JarisDiario.iso(dd) : '') }, 'Abrir mi diario de hoy'));
      const botonEscribir = boton('Escribir en mi diario', function () {
        escribir.hidden = false; botonEscribir.hidden = true; area.focus();
      });
      const otraPregunta = boton('Otra pregunta', function () {
        const lista = PREGUNTAS[tipo] || PREGUNTAS.libro;
        if (lista.length < 2) { a.avisar('No hay otra pregunta para este tipo de texto.'); return; }
        extra++;
        pregunta = preguntaPara(tipo, nLectura, vuelta, extra);
        texto.textContent = pregunta; etiqueta.textContent = pregunta;
        a.avisar(pregunta);
      });
      const guardar = boton('Guardar en mi diario', function () {
        const r = area.value.trim();
        if (!r) { a.avisar('Escribe algo antes de guardarlo.'); area.focus(); return; }
        if (!window.JarisDiario || !dd) { a.avisar('No se ha podido abrir el diario.'); return; }
        const hecho = window.JarisDiario.anadir(dd, a.dia(dd).griego, { pensar: textoParaElDiario(pregunta, titulo, r) });
        if (!hecho) { a.avisar('No se ha podido guardar: el navegador no deja guardar datos.'); return; }
        area.value = ''; escribir.hidden = true; botonEscribir.hidden = false; abrirDiario.hidden = false;
        botonEscribir.focus();
        a.avisar('Guardado en tu diario de hoy, en «Para pensar».');
      });
      const cancelar = boton('Cancelar', function () { escribir.hidden = true; botonEscribir.hidden = false; botonEscribir.focus(); });
      escribir.append(etiqueta, area, el('div', { class: 'buz-botones' }, guardar, ' ', cancelar));
      const quitar = boton('No mostrar preguntas', function () {
        const x = leerEstado(); x.preguntas = 'nunca';
        guardarYPintar(x, 'Ya no saldrán preguntas. Puedes volver a ponerlas en «Cambiar de plan o de duración».');
      });
      caja.append(el('div', { class: 'buz-botones' }, otraPregunta, ' ', botonEscribir, ' ', quitar), escribir, abrirDiario);
      return caja;
    }

    async function pintar(conFoco, aviso) {
      const mio = ++version, e = leerEstado(), ap = planActivo(datos, e), p = ap.p, i = posicion(p, e, ap.clave);
      const L = lecturaDe(p, e.duracion, i), otra = otraDeEstaNoche(e, base), nodos = [];
      const total = (p.lecturas[e.duracion] || []).length;
      const vuelta = e.vueltas[ap.clave] || 0, nomVuelta = nombreVuelta(vuelta);
      nodos.push(el('p', { class: 'buz-ayuda', texto: 'Plan: ' + ap.nombre + (nomVuelta ? ' (' + nomVuelta + ')' : '') + '. Duración: ' + NOMBRE_DURACION[e.duracion] + '. Dura ' + plural(total, 'noche', 'noches') + '.' }));
      let foco = null, resumen = '';

      if (otra) {
        // Esta noche, otra cosa: no mueve el plan
        resumen = 'Tu plan sigue en el mismo sitio.';
        foco = el('h3', { id: 'noche-lectura-foco', tabindex: '-1', texto: 'Esta noche, otra cosa: ' + (otra.t || 'un texto') });
        nodos.push(foco, el('p', { class: 'buz-ayuda', texto: 'Esta lectura no mueve tu plan: sigue esperándote en el mismo sitio.' }));
        nodos.push(await conBotones(await a.fragmento({ cap: otra.cap, a: otra.a, t: otra.t }), { cap: otra.cap, a: otra.a, t: otra.t }));
        nodos.push(el('div', { class: 'buz-botones' }, boton('Volver a mi lectura del plan', function () {
          const x = leerEstado(); quitarOtra(x); guardarYPintar(x, 'Vuelves a tu plan.');
        })));
      } else if (e.pausa) {
        resumen = 'Tu plan está en pausa.';
        foco = el('h3', { id: 'noche-lectura-foco', tabindex: '-1', texto: 'El plan está en pausa' });
        nodos.push(foco, el('p', { texto: 'No pasa nada por parar. Cuando quieras, pulsa «Seguir con el plan» y vuelves justo por donde lo dejaste. No se cuenta ningún día.' }));
      } else if (L) {
        const mins = minutosDe(palabrasDe(p, i, L.a));
        resumen = 'Noche ' + (L.n + 1) + ' de ' + L.total + '.';
        foco = el('h3', { id: 'noche-lectura-foco', tabindex: '-1', texto: 'Noche ' + (L.n + 1) + ' de ' + L.total + ': ' + tituloDe(p, i, L.a) });
        nodos.push(foco, el('p', { class: 'buz-ayuda', texto: 'Unos ' + mins + (mins === 1 ? ' minuto' : ' minutos') + ' de lectura.' }));
        for (let k = i; k < L.a; k++) nodos.push(await pintarTexto(a, p.textos[k]));
        if (hayPreguntas(e, ap.clave)) nodos.push(paraPensar(tipoDeTexto(a.libro, p.textos[i]), L.n, vuelta, tituloDe(p, i, L.a)));
      } else {
        resumen = 'Has terminado el plan.';
        foco = el('h3', { id: 'noche-lectura-foco', tabindex: '-1', texto: 'Has terminado «' + ap.nombre + '»' });
        nodos.push(foco, el('p', { texto: 'Ya has leído todo este plan. Puedes repetirlo desde el principio, volver a la última lectura o elegir otro plan en «Cambiar de plan o de duración».' }));
        if (e.preguntas !== 'nunca') nodos.push(el('p', { texto: 'Si lo repites, cada lectura traerá una pregunta corta para pensar o apuntar en tu diario. Es opcional y puedes quitarla.' }));
      }

      // Botones del plan
      const botones = el('div', { class: 'buz-botones' });
      if (!otra && !e.pausa) {
        if (L) botones.append(boton('Ya la he leído', function () {
          const x = leerEstado(); if (!marcarLeida(datos, x)) return; guardarYPintar(x, 'Guardado.');
        }));
        else botones.append(boton('Repetir este plan desde el principio', function () {
          const x = leerEstado(); empezarDeNuevo(datos, x); guardarYPintar(x, avisoDeEmpezar(x));
        }));
        if (indiceAnterior(p, e.duracion, i) >= 0) botones.append(' ', boton('Volver a la anterior', function () {
          const x = leerEstado(); if (!volverALaAnterior(datos, x)) return; guardarYPintar(x, 'Vuelves a la lectura anterior.');
        }));
      }
      if (e.pausa && !otra) botones.append(boton('Seguir con el plan', function () {
        const x = leerEstado(); ponerPausa(x, false); guardarYPintar(x, 'Sigues con el plan.');
      }));
      nodos.push(botones);

      // Esta noche, otra cosa (dos opciones que salen al pulsar)
      const otras = el('div', { class: 'buz-botones', hidden: 'hidden' });
      function sacar(lista, vacio, quien) {
        const x = leerEstado(), c = elegirOtro(lista, azar, otraDeEstaNoche(x, base));
        if (!c) { a.avisar(vacio); return; }
        ponerOtra(x, base, c); guardarYPintar(x, quien);
      }
      const abrirOtra = boton(otra ? 'Otra cosa distinta' : 'Esta noche, otra cosa', function () {
        abrirOtra.hidden = true; otras.hidden = false; primeraOtra.focus();
      });
      const primeraOtra = boton('Algo que aún no he leído', function () {
        sacar(candidatasSinLeer(datos, leerEstado()), 'No queda nada corto sin leer en este plan. Prueba con tus favoritos.', 'Esta noche, otra cosa.');
      });
      const deFavoritos = boton('Algo de mis favoritos', function () {
        sacar(favoritosPlanos(), 'Todavía no tienes favoritos. Debajo de cada oración, himno o rito hay un botón para guardarlo.', 'Esta noche, algo de tus favoritos.');
      });
      const cancelarOtra = boton('No, mejor no', function () { otras.hidden = true; abrirOtra.hidden = false; abrirOtra.focus(); });
      otras.append(primeraOtra, ' ', deFavoritos, ' ', cancelarOtra);
      nodos.push(el('p', {}, abrirOtra), otras);

      // Pausar (sin consecuencias)
      if (!e.pausa) {
        nodos.push(el('p', {}, boton('Pausar el plan', function () {
          const x = leerEstado(); ponerPausa(x, true); guardarYPintar(x, 'Plan en pausa. Sin prisa, aquí queda tu sitio.');
        })), el('p', { class: 'buz-ayuda', texto: 'Pausar no borra nada y no cuenta días: al seguir vuelves justo por donde lo dejaste.' }));
      }

      // Cambiar de plan o de duración (con las noches que dura cada cosa)
      {
        const planes = listaDePlanes(datos);
        const det = el('details', { class: 'noche-cambiar' }, el('summary', { texto: 'Cambiar de plan o de duración' }));
        const selPlan = el('select', { id: 'noche-plan' }), selDios = el('select', { id: 'noche-dios' }), selDur = el('select', { id: 'noche-dur' });
        const descr = el('p', { class: 'buz-ayuda', id: 'noche-plan-descr' });
        const cajaDios = el('div', {}, el('label', { for: 'noche-dios', class: 'buz-etiqueta', texto: 'Dios' }), selDios);
        function etiquetar() {
          const dur = selDur.value;
          Array.from(selPlan.options).forEach(function (o) {
            const pl = planes.find(function (x) { return x.id === o.value; });
            o.textContent = pl.nombre + ' (' + nochesTexto(datos, pl.id, dur) + ')';
          });
          Array.from(selDios.options).forEach(function (o) {
            const d = datos.unDios.dioses.find(function (x) { return x.id === o.value; });
            o.textContent = d.nombre + ' (' + plural(d.noches[dur], 'noche', 'noches') + ')';
          });
          const pl = planes.find(function (x) { return x.id === selPlan.value; });
          descr.textContent = pl ? pl.descripcion : '';
          cajaDios.hidden = selPlan.value !== 'undios';
        }
        planes.forEach(function (pl) { selPlan.append(el('option', { value: pl.id, texto: pl.nombre })); });
        if (datos.unDios && datos.unDios.dioses) datos.unDios.dioses.forEach(function (d) { selDios.append(el('option', { value: d.id, texto: d.nombre })); });
        DURACIONES.forEach(function (d) { selDur.append(el('option', { value: d, texto: NOMBRE_DURACION[d] })); });
        selPlan.value = e.plan === 'undios' ? 'undios' : ap.p.id;
        selDios.value = e.dios || (datos.unDios && datos.unDios.dioses[0] ? datos.unDios.dioses[0].id : '');
        selDur.value = e.duracion;
        selPlan.addEventListener('change', etiquetar); selDur.addEventListener('change', etiquetar);
        etiquetar();
        // Preguntas para pensar (sesión C7): cuándo salen
        const selPreg = el('select', { id: 'noche-preguntas', 'aria-describedby': 'noche-preguntas-ayuda' });
        MODOS_PREGUNTAS.forEach(function (m) { selPreg.append(el('option', { value: m, texto: NOMBRE_MODO[m] })); });
        selPreg.value = e.preguntas;
        const aplicar = boton('Usar este plan y esta duración', function () {
          const x = leerEstado(), antes = x.preguntas;
          if (!cambiarPlan(datos, x, selPlan.value, selDios.value, selDur.value)) return;
          if (MODOS_PREGUNTAS.indexOf(selPreg.value) >= 0) x.preguntas = selPreg.value;
          const nuevo = planActivo(datos, x);
          guardarYPintar(x, 'Plan «' + nuevo.nombre + '», duración ' + NOMBRE_DURACION[x.duracion].split(' (')[0] + '. Sigues por donde lo dejaste.' +
            (x.preguntas !== antes ? ' Preguntas para pensar: ' + NOMBRE_MODO[x.preguntas].toLowerCase() + '.' : ''));
        });
        det.append(el('p', { class: 'buz-ayuda', texto: 'Cada plan recuerda por dónde ibas. Si cambias de duración, sigues en el mismo texto, sin perder nada.' }),
          el('label', { for: 'noche-plan', class: 'buz-etiqueta', texto: 'Plan (entre paréntesis, cuántas noches dura)' }), selPlan, descr, cajaDios,
          el('label', { for: 'noche-dur', class: 'buz-etiqueta', texto: 'Duración de cada lectura' }), selDur,
          el('label', { for: 'noche-preguntas', class: 'buz-etiqueta', texto: 'Preguntas para pensar' }), selPreg,
          el('p', { class: 'buz-ayuda', id: 'noche-preguntas-ayuda', texto: 'Una pregunta corta después de cada lectura, para pensar o apuntar en tu diario. Es opcional. El cambio se guarda al pulsar «Usar este plan y esta duración».' }),
          el('p', {}, aplicar));
        nodos.push(det);
      }

      // Empezar desde otro sitio
      if (ap.inicios.length) {
        const det = el('details', { class: 'noche-otro-sitio' }, el('summary', { texto: 'Empezar desde otro sitio' }));
        const sel = el('select', { id: 'noche-inicio' });
        ap.inicios.forEach(function (x) { sel.append(el('option', { value: x.texto, texto: x.titulo })); });
        det.append(el('p', { class: 'buz-ayuda', texto: 'Elige el capítulo por el que quieres empezar: el plan sigue desde ahí.' }),
          el('label', { for: 'noche-inicio', class: 'buz-etiqueta', texto: 'Empezar en' }), sel, ' ',
          boton('Empezar aquí', function () {
            const x = leerEstado(); if (!empezarEn(datos, x, sel.value)) return;
            x.pausa = false; x.otra = null;
            guardarYPintar(x, 'Empiezas en «' + sel.options[sel.selectedIndex].textContent + '».');
          }));
        nodos.push(det);
      }
      // Empezar el plan de nuevo (con confirmación en la misma pantalla)
      const nuevo = el('button', { type: 'button', texto: 'Empezar el plan de nuevo' });
      const confirmar = el('div', { class: 'buz-botones', hidden: 'hidden' });
      const si = boton('Sí, empezar de nuevo (se borra por dónde ibas en este plan)', function () {
        const x = leerEstado(); empezarDeNuevo(datos, x); x.pausa = false; x.otra = null; guardarYPintar(x, avisoDeEmpezar(x));
      });
      const no = boton('No, dejarlo como está', function () { confirmar.hidden = true; nuevo.hidden = false; nuevo.focus(); });
      confirmar.append(si, ' ', no);
      nuevo.addEventListener('click', function () { nuevo.hidden = true; confirmar.hidden = false; si.focus(); });
      nodos.push(el('p', {}, nuevo), confirmar);

      if (mio !== version) return;
      cuerpo.replaceChildren(...nodos);
      if (conFoco && foco) {
        foco.focus();
        if (foco.scrollIntoView) foco.scrollIntoView({ block: 'start' });
      }
      if (aviso) a.avisar(aviso + ' ' + resumen);
    }
    await pintar(false);
    return sec;
  }

  /* ============================================================================================
     ORACIÓN FINAL DE LA NOCHE (sesión C4, parte 3). Sustituye a la «Oración de esta noche» de antes, para que no salgan dos.
     Alterna «Antes de dormir» (a Hipnos) con las oraciones a Nyx de la sesión C1: un día una, otro día otra, y las de Nyx
     van rotando entre ellas. Los títulos son los EXACTOS del capítulo 6 (se comparan sin mayúsculas ni tildes).
     Si un título no se encuentra en el libro, se salta sin dar error.
     ============================================================================================ */
  const ORACION_DE_HIPNOS = 'Antes de dormir';
  const ORACIONES_A_NYX = [
    'Al cerrar el día, a la Noche',   // a Nyx (sesión C1, composición de esta antología)
    'A la Noche, sin miedo',          // a Nyx (sesión C1)
    'Al acostarse',                   // a Nyx (sesión C1)
  ];
  const CLAVE_ORACIONES = 'jaris.noche';   // { lista: id de la lista de Favoritos de «Mis oraciones de la noche» }

  function oracionPorTitulo(libro, titulo) {
    return libro.oraciones.find(function (x) { return normal(x.t) === normal(titulo); }) || null;
  }
  function modulo(n, m) { return m ? ((n % m) + m) % m : 0; }
  /* La oración del libro que toca esta noche: un día Hipnos y otro Nyx (y entre las de Nyx, rota). Igual para todo el mundo ese día. */
  function oracionFinalDelLibro(libro, base) {
    const hipnos = oracionPorTitulo(libro, ORACION_DE_HIPNOS);
    const nyx = ORACIONES_A_NYX.map(function (t) { return oracionPorTitulo(libro, t); }).filter(Boolean);
    if (hipnos && nyx.length) return modulo(base, 2) === 0 ? hipnos : nyx[modulo(Math.floor(base / 2), nyx.length)];
    return hipnos || (nyx.length ? nyx[modulo(base, nyx.length)] : null);
  }
  function listaElegidaDeLaNoche() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(CLAVE_ORACIONES)); } catch (e) { d = null; }
    return d && typeof d.lista === 'string' ? d.lista : '';
  }
  function guardarListaDeLaNoche(id) {
    try {
      if (id) localStorage.setItem(CLAVE_ORACIONES, JSON.stringify({ lista: id })); else localStorage.removeItem(CLAVE_ORACIONES);
      return true;
    } catch (e) { return false; }
  }
  function listasConTextos() {
    try {
      if (!window.JarisFavoritos) return [];
      return window.JarisFavoritos.leer().listas.filter(function (l) { return l.items && l.items.length; });
    } catch (e) { return []; }
  }
  /* Qué oración final toca: la de la lista elegida (si hay y no está vacía) o la del libro. */
  function oracionFinalDeHoy(libro, base) {
    const id = listaElegidaDeLaNoche();
    if (id) {
      const l = listasConTextos().find(function (x) { return x.id === id; });
      if (l) return { o: l.items[modulo(base, l.items.length)], lista: l.nombre, perdida: false };
    }
    return { o: oracionFinalDelLibro(libro, base), lista: null, perdida: !!id };
  }

  /* La sección «Oración final» (se vuelve a pintar si se elige otra lista) y «Mis oraciones de la noche». */
  async function oracionFinal(a, n) {
    const el = a.el, libro = a.libro, base = n.base, caja = el('div', { class: 'noche-oracion-final' });
    const sec = el('section', { 'aria-labelledby': 'noche-oracion' });
    let version = 0;
    async function pintar() {
      const mio = ++version, r = oracionFinalDeHoy(libro, base), nodos = [];
      if (r.perdida) nodos.push(el('p', { class: 'buz-ayuda', texto: 'La lista que elegiste ya no existe o está vacía, así que esta noche sale una oración del libro.' }));
      if (r.o) {
        nodos.unshift(el('h2', { id: 'noche-oracion', texto: 'Oración final: ' + r.o.t }));
        if (r.lista) nodos.push(el('p', { class: 'buz-ayuda', texto: 'Sale de tu lista «' + r.lista + '».' }));
        nodos.push(await conBotones(await a.fragmento(r.o), r.o));
      } else {
        nodos.unshift(el('h2', { id: 'noche-oracion', texto: 'Oración final' }));
        nodos.push(el('p', { texto: 'No se ha encontrado ninguna oración de la noche en el libro.' }));
      }
      if (mio !== version) return null;
      sec.replaceChildren(...nodos);
      return r.o ? r.o.t : null;
    }
    await pintar();
    caja.append(sec, misOracionesDeLaNoche(a, pintar));
    return caja;
  }
  /* «Mis oraciones de la noche»: elegir una lista de Favoritos para la oración final. */
  function misOracionesDeLaNoche(a, pintar) {
    const el = a.el, sec = el('section', { 'aria-labelledby': 'noche-mias', class: 'diario' });
    sec.append(el('h2', { id: 'noche-mias', texto: 'Mis oraciones de la noche' }),
      el('p', { texto: 'Si tienes tus propias oraciones, guárdalas en una lista de Favoritos y elígela aquí: la oración final de cada noche saldrá de esa lista, una distinta cada noche. Lo que elijas se guarda solo en este dispositivo y entra en la copia de seguridad de «Tus datos».' }));
    const listas = listasConTextos(), actual = listaElegidaDeLaNoche();
    const sel = el('select', { id: 'noche-lista' });
    sel.append(el('option', { value: '', texto: 'Las oraciones del libro (por defecto)' }));
    listas.forEach(function (l) {
      sel.append(el('option', { value: l.id, texto: l.nombre + ' (' + l.items.length + (l.items.length === 1 ? ' texto)' : ' textos)') }));
    });
    sel.value = listas.some(function (l) { return l.id === actual; }) ? actual : '';
    /* Revisión C7: se guarda con un botón y no al mover el selector (con el teclado, cada flecha guardaba y se anunciaba). */
    const usar = el('button', { type: 'button', texto: 'Usar esta lista' });
    usar.addEventListener('click', async function () {
      if (!guardarListaDeLaNoche(sel.value)) { a.avisar('No se ha podido guardar: el navegador no deja guardar datos.'); return; }
      const titulo = await pintar();
      const nombre = sel.value ? sel.options[sel.selectedIndex].textContent.replace(/ \(\d+ textos?\)$/, '') : '';
      a.avisar((nombre ? 'Elegida tu lista «' + nombre + '».' : 'Vuelven las oraciones del libro.') + (titulo ? ' La oración final de esta noche es «' + titulo + '».' : ''));
    });
    sec.append(el('label', { for: 'noche-lista', class: 'buz-etiqueta', texto: 'Lista de Favoritos para la oración final de la noche' }), sel, ' ', usar);
    if (!listas.length) sec.append(el('p', { class: 'buz-ayuda', texto: 'Todavía no tienes ninguna lista con textos. Debajo de cada oración, himno o rito hay un botón para guardarlo en favoritos o en una lista tuya.' }));
    sec.append(el('p', {}, el('a', { href: '#/favoritos' }, 'Ver y cambiar mis listas de favoritos')));
    return sec;
  }

  async function pantalla(a) {
    const el = a.el, libro = a.libro, n = a.noche();
    const raiz = el('div', { class: 'noche' });
    raiz.append(el('h1', { texto: 'El rincón de la noche' }),
      el('p', { texto: 'Para antes de dormir, con calma: una lectura, una oración, un repaso amable del día y lo que empieza esta noche. Si quieres, pon el modo oscuro del dispositivo.' }));

    // Sesión C5: enlace a «Cuando lo necesites»
    if (window.JarisNecesito) raiz.append(el('p', { class: 'enlace-necesito' }, el('a', { href: '#/necesito' }, 'Cuando lo necesites: un texto corto para este momento')));

    // Sesión C4: la lectura de esta noche (con su temporizador justo debajo, para el audio)
    raiz.append(await seccionLectura(a, n));
    raiz.append(temporizadorUI(a));
    // Sesión C4 (parte 3): la oración final (sustituye a la «Oración de esta noche») y «Mis oraciones de la noche»
    raiz.append(await oracionFinal(a, n));

    // Esta noche: el día griego empieza al ponerse el sol
    raiz.append(el('h2', { texto: 'Esta noche' }), el('p', {},
      (n.yaEmpezo ? 'Desde la puesta del sol (hacia las ' + n.hora + ') ya es el ' : 'Esta tarde, al ponerse el sol (hacia las ' + n.hora + '), empieza el ') +
      n.griego + ': ' + n.resumen + '. ', el('a', { href: n.ruta }, 'Ver qué se hace ese día')));

    const oraciones = oracionesDeNoche(libro);

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
    const dd = diaDelDiario(n);
    const despues = el('p', { hidden: 'hidden' }, el('a', { href: '#/diario/' + (window.JarisDiario ? window.JarisDiario.iso(dd) : '') }, 'Abrir mi diario de hoy'));
    guardar.addEventListener('click', function () {
      const bien = campos[0].value.trim(), gracias = campos[1].value.trim(), manana = campos[2].value.trim();
      if (!bien && !gracias && !manana) { a.avisar('Escribe algo en el repaso antes de guardarlo.'); campos[0].focus(); return; }
      if (!window.JarisDiario) { a.avisar('No se ha podido abrir el diario.'); return; }
      const libre = [bien ? 'Lo que ha ido bien hoy: ' + bien : '', manana ? 'Mañana: ' + manana : ''].filter(Boolean).join('\n');
      const hecho = window.JarisDiario.anadir(dd, a.dia(dd).griego, { gracias: gracias, libre: libre });
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

  window.JarisNoche = { pantalla: pantalla, motor: { CLAVE: CLAVE_LECTURA, FIN: FIN, DURACIONES: DURACIONES, leerEstado: leerEstado, guardarEstado: guardarEstado,
    planActivo: planActivo, posicion: posicion, lecturaDe: lecturaDe, indiceAnterior: indiceAnterior, tituloDe: tituloDe, palabrasDe: palabrasDe,
    marcarLeida: marcarLeida, volverALaAnterior: volverALaAnterior, empezarEn: empezarEn, empezarDeNuevo: empezarDeNuevo,
    oracionFinalDelLibro: oracionFinalDelLibro, oracionFinalDeHoy: oracionFinalDeHoy, ORACIONES_A_NYX: ORACIONES_A_NYX, ORACION_DE_HIPNOS: ORACION_DE_HIPNOS,
    listaDePlanes: listaDePlanes, nochesTexto: nochesTexto, cambiarPlan: cambiarPlan, ponerPausa: ponerPausa, otraDeEstaNoche: otraDeEstaNoche,
    ponerOtra: ponerOtra, quitarOtra: quitarOtra, candidatasSinLeer: candidatasSinLeer, favoritosPlanos: favoritosPlanos, elegirOtro: elegirOtro,
    PREGUNTAS: PREGUNTAS, MODOS_PREGUNTAS: MODOS_PREGUNTAS, tipoDeTexto: tipoDeTexto, preguntaPara: preguntaPara, hayPreguntas: hayPreguntas,
    nombreVuelta: nombreVuelta, textoParaElDiario: textoParaElDiario,
    vaciarCache: function () { lecturasDatos = null; capituloPuesto = { cap: '', dom: null }; }, pintarTexto: pintarTextoDOM } };
})();
