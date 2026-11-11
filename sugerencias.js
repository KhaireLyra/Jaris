/* Jaris: sugerencias de lectura según el diario (sesión C6, 7 de noviembre de 2026).
   OPCIONAL y APAGADO por defecto (casilla de Ajustes; clave «jaris.sugerencias» = "si" solo si se activa).
   Todo se hace dentro del dispositivo, sin conexión y sin inteligencia artificial: se buscan las palabras de unas
   listas sencillas (aprobadas por la autora) en lo que se escribió en el diario los 3 días ANTERIORES a hoy.
   Así la sugerencia es la misma todo el día (como mucho una al día) sin guardar nada: se calcula y se olvida.
   Nunca copia ni cita el diario y no saca conclusiones; solo propone un grupo de «Cuando lo necesites».
   Cómo busca: sin mayúsculas ni tildes; una palabra sin «*» solo vale entera; con «*» vale cualquier final
   («nervi*» = nervios, nerviosa...); las expresiones se buscan seguidas. Un grupo se sugiere si sus palabras salen
   2 veces o más; si salen varios, el que más (y si empatan, el primero de la lista).
   Pensamientos muy oscuros: con UNA vez basta, y entonces no se sugiere ninguna lectura: sale una frase suave para
   hablar con alguien de confianza y, al pulsar «Teléfonos de ayuda», el 024 y el 112 (comprobados el 7 nov 2026 en
   la página oficial del Ministerio de Sanidad).
   Límite conocido: no entiende frases («no estaba nada nerviosa» cuenta como nervios). */
'use strict';
(function () {
  const CLAVE = 'jaris.sugerencias', DIA_MS = 86400000, DIAS = 3, MINIMO = 2;

  /* LAS LISTAS (aprobadas por la autora el 7 de noviembre de 2026). Los id son los de «Cuando lo necesites».
     «Buenos días» no tiene lista: es un grupo para la mañana, no para algo que se escriba en el diario. */
  const LISTAS = [
    { id: 'calma', palabras: ['nervi*', 'ansiedad', 'ansios*', 'agobi*', 'estres*', 'angusti*', 'preocup*', 'miedo', 'asustad*',
      'pánico', 'inquiet*', 'intrusiv*', 'vueltas a la cabeza', 'dando vueltas', 'darle vueltas', 'no paro de pensar',
      'no puedo dormir', 'insomnio'] },
    { id: 'concreto', palabras: ['decisi*', 'decidir', 'no sé qué hacer', 'resultado', 'resultados', 'esperando noticias',
      'médico', 'médica', 'hospital', 'cita médica', 'enferm*', 'operación', 'prueba médica', 'discusión', 'discutir',
      'discutimos', 'discutido', 'pele*', 'enfad*', 'injust*', 'obstáculo', 'obstáculos'] },
    { id: 'estudios', palabras: ['exam*', 'exposici*', 'exponer', 'hablar en público', 'suspend*', 'suspenso', 'evaluación',
      'selectividad', 'pau', 'no me entra', 'no lo entiendo', 'no entiendo nada'] },
    { id: 'proyecto', palabras: ['proyecto', 'proyectos', 'componer', 'compon*', 'canción', 'canciones', 'melodía', 'melodías',
      'program*', 'inspiraci*', 'sin ideas', 'bloquead*', 'bloqueo'] },   /* no «bloque*»: también es el bloque de asignaturas */
    { id: 'gracias', palabras: ['agradec*', 'agradecid*', 'buena noticia', 'buenas noticias', 'qué suerte', 'feliz', 'felicidad',
      'content*', 'ilusión', 'ilusionad*', 'regal*', 'me ha salido bien', 'salió bien', 'he aprobado', 'aprobé'] },
    { id: 'triste', palabras: ['trist*', 'mala época', 'mala racha', 'llor*', 'soledad', 'me siento sola', 'me siento solo',
      'desanimad*', 'desmotivad*', 'deprim*', 'depresión', 'frustr*', 'no me sale', 'no valgo', 'dudo de mí', 'inútil',
      'hart*', 'fracas*', 'me siento vacía', 'me siento vacío'] },
    { id: 'personas', palabras: ['echo de menos', 'falleci*', 'murió', 'ha muerto', 'difunt*', 'duelo', 'antepasad*',
      'preocupada por', 'preocupado por'] },
  ];
  /* Pensamientos muy oscuros (no se muestran en Ajustes; allí solo se dice que existen). */
  const OSCURAS = ['suicid*', 'matarme', 'quitarme la vida', 'acabar con mi vida', 'acabar con todo', 'no quiero vivir',
    'no quiero seguir viviendo', 'ganas de morir', 'quiero morir', 'me quiero morir', 'morirme', 'mejor muerta', 'mejor muerto',
    'mejor sin mí', 'no vale la pena vivir', 'no merece la pena vivir', 'hacerme daño', 'autolesi*', 'desaparecer para siempre',
    'no aguanto más vivir', 'no quiero seguir aquí', 'no quiero estar aquí', 'no quiero despertar'];

  /* ---------- Buscar ---------- */
  function normalizar(s) {
    return ' ' + String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim() + ' ';
  }
  /* Cada palabra de la lista, preparada: «nervi*» busca « nervi» (cualquier final); «miedo», « miedo » (entera). */
  function preparar(lista) {
    return lista.map(function (p) {
      const libre = /\*$/.test(p), base = normalizar(p.replace(/\*$/, '')).trim();
      return base ? ' ' + base + (libre ? '' : ' ') : null;
    }).filter(Boolean);
  }
  const BUSCAR = LISTAS.map(function (g) { return { id: g.id, agujas: preparar(g.palabras) }; });
  const BUSCAR_OSCURAS = preparar(OSCURAS);
  /* Cuántas veces sale alguna palabra de la lista. Se cuenta por sitio donde empieza, para que «agradecida» no cuente
     dos veces por estar en «agradec*» y en «agradecid*». */
  function contar(texto, agujas) {
    const sitios = new Set();
    agujas.forEach(function (a) {
      let i = texto.indexOf(a);
      while (i >= 0) { sitios.add(i); i = texto.indexOf(a, i + a.length - 1); }
    });
    return sitios.size;
  }
  /* Todo lo que escribió la persona en una entrada (no los títulos fijos: prácticas marcadas, texto del día...). */
  function textoDe(e) {
    const partes = [];
    const meter = function (v) {
      if (typeof v === 'string') partes.push(v);
      else if (Array.isArray(v)) v.forEach(meter);
      else if (v && typeof v === 'object') Object.keys(v).forEach(function (k) { meter(v[k]); });
    };
    Object.keys(e || {}).forEach(function (k) {
      if (['griego', 'actualizada', 'practica', 'textoDelDia'].indexOf(k) >= 0) return;
      /* sesión C7: en «Para pensar» las líneas «Pregunta: …» las pone Jaris (la pregunta y el título de la lectura); solo cuenta la respuesta */
      if (k === 'pensar' && typeof e[k] === 'string') { meter(e[k].split('\n').filter(function (l) { return !/^\s*Pregunta:/.test(l); }).join('\n')); return; }
      meter(e[k]);
    });
    return partes.join(' \n ');
  }
  function iso(civil) { return new Date(civil * DIA_MS).toISOString().slice(0, 10); }
  function leerDiario() {
    try { const d = JSON.parse(localStorage.getItem('jaris.diario')); if (d && d.entradas && typeof d.entradas === 'object') return d; } catch (e) { /* nada */ }
    return { entradas: {} };
  }
  function ocultos() {
    try { if (window.JarisNecesito && window.JarisNecesito.leer) return window.JarisNecesito.leer().ocultos || []; } catch (e) { /* nada */ }
    return [];
  }

  /* ---------- El ajuste ---------- */
  function activo() {
    try { return JSON.parse(localStorage.getItem(CLAVE)) === 'si'; } catch (e) { return false; }
  }
  function activar(si) {
    try { if (si) localStorage.setItem(CLAVE, JSON.stringify('si')); else localStorage.removeItem(CLAVE); } catch (e) { /* sin almacenamiento */ }
  }

  /* La sugerencia de un día (civil = día de hoy). Devuelve null, { tipo: 'ayuda' } o { tipo: 'grupo', id, nombre, veces }.
     Si se pasa «forzar», calcula aunque la casilla esté apagada (solo para las pruebas). */
  function calcular(civil, forzar) {
    if (!forzar && !activo()) return null;
    if (typeof civil !== 'number' || !isFinite(civil)) return null;
    const d = leerDiario();
    let texto = '';
    for (let c = civil - DIAS; c < civil; c++) { const e = d.entradas[iso(c)]; if (e && typeof e === 'object') texto += normalizar(textoDe(e)); }
    if (!texto.trim()) return null;
    if (contar(texto, BUSCAR_OSCURAS) >= 1) return { tipo: 'ayuda' };
    const fuera = ocultos();
    let mejor = null;
    BUSCAR.forEach(function (g) {
      if (fuera.indexOf(g.id) >= 0) return;
      const n = contar(texto, g.agujas);
      if (n >= MINIMO && (!mejor || n > mejor.veces)) mejor = { tipo: 'grupo', id: g.id, veces: n };
    });
    if (mejor) mejor.nombre = nombreGrupo(mejor.id);
    return mejor;
  }
  function nombreGrupo(id) {
    try { const g = window.JarisNecesito.GRUPOS.find(function (x) { return x.id === id; }); if (g) return g.nombre; } catch (e) { /* nada */ }
    return { calma: 'Calma y relajación', concreto: 'Ayuda con algo concreto', estudios: 'Estudios, exámenes y consejo',
      proyecto: 'Un trabajo o proyecto que estás creando', gracias: 'Dar las gracias', triste: 'Estoy triste o en una mala época',
      personas: 'Por alguien que quiero' }[id] || id;
  }

  /* ---------- Lo que se ve ---------- */
  let cuenta = 0;   /* para que los id no se repitan */
  /* Botón «No mostrar sugerencias»: apaga la casilla, quita el aviso y lleva el foco al título de la pantalla. */
  function botonApagar(a, caja) {
    const b = a.el('button', { type: 'button', class: 'secundario' }, 'No mostrar sugerencias');
    b.addEventListener('click', function () {
      activar(false);
      caja.remove();
      const h = document.querySelector('#contenido h1');
      if (h) { if (!h.hasAttribute('tabindex')) h.setAttribute('tabindex', '-1'); h.focus(); }
      if (a.avisar) a.avisar('Sugerencias apagadas. Puedes volver a activarlas en Ajustes.');
    });
    return b;
  }
  /* La frase de ayuda (decidida por la autora: suave, y los teléfonos solo al pulsar «Teléfonos de ayuda»). */
  function bloqueAyuda(a) {
    const el = a.el, n = ++cuenta, idTel = 'sug-telefonos-' + n;
    const caja = el('div', { class: 'sugerencia sugerencia-ayuda' });
    const tel = el('p', { id: idTel },
      'En España puedes llamar al ', el('a', { href: 'tel:024' }, '024'), ', gratis y a cualquier hora. Si hay un peligro inmediato, llama al ',
      el('a', { href: 'tel:112' }, '112'), '.');
    tel.hidden = true;
    const bTel = el('button', { type: 'button', class: 'secundario', 'aria-expanded': 'false', 'aria-controls': idTel }, 'Teléfonos de ayuda');
    bTel.addEventListener('click', function () {
      const abrir = tel.hidden;
      tel.hidden = !abrir;
      bTel.setAttribute('aria-expanded', abrir ? 'true' : 'false');
    });
    caja.append(el('p', { texto: 'Si lo estás pasando muy mal, habla con alguien de confianza.' }), el('p', {}, bTel), tel,
      el('p', {}, botonApagar(a, caja)));
    return caja;
  }
  /* Para arriba de «Hoy»: la sugerencia del día o la frase de ayuda (o nada). */
  function seccionHoy(a, civil) {
    let r = null;
    try { r = calcular(civil); } catch (e) { r = null; }
    if (!r) return null;
    if (r.tipo === 'ayuda') return bloqueAyuda(a);
    const el = a.el, caja = el('div', { class: 'sugerencia' });
    caja.append(el('p', {}, 'Por lo que has escrito estos días, quizá te apetezca leer algo de «' + r.nombre + '». ',
      el('a', { href: '#/necesito' }, 'Ir a «Cuando lo necesites»'), ' (sale marcado como sugerido).'),
      el('p', {}, botonApagar(a, caja)));
    return caja;
  }
  /* Para «Cuando lo necesites»: solo la frase de ayuda, si toca (el grupo sugerido ya sale marcado en su botón). */
  function seccionNecesito(a, civil) {
    let r = null;
    try { r = calcular(civil); } catch (e) { r = null; }
    return r && r.tipo === 'ayuda' ? bloqueAyuda(a) : null;
  }
  function gruposSugeridos(civil) {
    let r = null;
    try { r = calcular(civil); } catch (e) { r = null; }
    return r && r.tipo === 'grupo' ? [r.id] : [];
  }

  /* Bloque de Ajustes: la casilla (apagada por defecto), cómo funciona y las palabras que busca. */
  function bloqueAjustes(a) {
    const el = a.el;
    const casilla = el('input', { type: 'checkbox', id: 'ajustes-sugerencias', 'aria-describedby': 'ajustes-sug-ayuda' });
    casilla.checked = activo();
    casilla.addEventListener('change', function () {
      activar(casilla.checked);
      if (a.avisar) a.avisar(casilla.checked ? 'Sugerencias según el diario activadas.' : 'Sugerencias según el diario desactivadas.');
    });
    const idLista = 'ajustes-sug-palabras';
    const lista = el('div', { id: idLista });
    lista.hidden = true;
    LISTAS.forEach(function (g) {
      lista.append(el('h3', { texto: nombreGrupo(g.id) }),
        el('p', { texto: g.palabras.map(function (p) { return p.replace(/\*$/, '…'); }).join(', ') + '.' }));
    });
    lista.append(el('p', { class: 'buz-ayuda', texto: 'Una palabra con «…» vale con cualquier final: «nervi…» encuentra nervios, nerviosa o nervioso. Las demás solo valen enteras. No importan las mayúsculas ni las tildes. «Buenos días» no tiene palabras, porque es un grupo para la mañana.' }));
    const bLista = el('button', { type: 'button', class: 'secundario', 'aria-expanded': 'false', 'aria-controls': idLista }, 'Ver las palabras que busca');
    bLista.addEventListener('click', function () {
      const abrir = lista.hidden;
      lista.hidden = !abrir;
      bLista.setAttribute('aria-expanded', abrir ? 'true' : 'false');
    });
    return el('section', { 'aria-labelledby': 'ajustes-sug-titulo' },
      el('h2', { id: 'ajustes-sug-titulo', texto: 'Sugerencias según el diario' }),
      el('div', { class: 'buz-opcion' }, casilla, el('label', { for: 'ajustes-sugerencias', texto: 'Sugerirme lecturas según mi diario' })),
      el('div', { id: 'ajustes-sug-ayuda' },
        el('p', { texto: 'Viene apagada. Si la activas, Jaris busca unas palabras sencillas (como «nervios», «examen» o «triste») en lo que escribiste en tu diario los tres días anteriores a hoy. Si un tema sale varias veces, te propone un texto de «Cuando lo necesites», como mucho una vez al día: lo verás arriba de «Hoy», y en «Cuando lo necesites» ese grupo saldrá marcado como sugerido. Nunca son notificaciones.' }),
        el('p', { texto: 'Todo se hace dentro de este dispositivo, sin conexión y sin inteligencia artificial. No guarda nada nuevo, no envía nada a ningún sitio y nunca copia ni cita lo que has escrito. Lo que escribes hoy cuenta a partir de mañana.' }),
        el('p', { texto: 'Como solo busca palabras, no entiende frases: «no estaba nada nerviosa» cuenta como nervios. Es solo una sugerencia.' }),
        el('p', { texto: 'Si encuentra palabras sobre no querer vivir o hacerse daño, en lugar de un texto te propone hablar con alguien de confianza y te deja a mano los teléfonos de ayuda.' })),
      el('p', {}, bLista), lista);
  }

  window.JarisSugerencias = { activo: activo, activar: activar, calcular: calcular, seccionHoy: seccionHoy, seccionNecesito: seccionNecesito,
    gruposSugeridos: gruposSugeridos, bloqueAjustes: bloqueAjustes, normalizar: normalizar, contar: contar, textoDe: textoDe,
    LISTAS: LISTAS, CLAVE: CLAVE };
})();
