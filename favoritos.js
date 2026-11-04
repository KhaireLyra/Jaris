/* Jaris: favoritos (paso 4b).
   - Debajo del título de cada oración, himno y rito: botón «Guardar en favoritos» / «Quitar de favoritos»
     (lista principal) y «Otras listas», que abre las listas propias («Para Atenea», «Antes de dormir»...) con
     una casilla por lista y un campo para crear una lista nueva.
   - Pantalla «Favoritos» (#/favoritos): cada lista con su título h2; subir, bajar y quitar; cambiar el nombre y
     borrar listas; y «Pasar a otro dispositivo»: guardar en un archivo y abrir un archivo (se suma a lo que haya).
   - Todo se guarda solo en el dispositivo (localStorage «jaris.favoritos»); nunca se envía a ningún sitio.
   app.js le pasa sus ayudas con iniciar() y lo llama al abrir cada capítulo y en «Para leer hoy». */
'use strict';
(function () {
  const CLAVE = 'jaris.favoritos', PRINCIPAL = 'fav';
  let A = null;           /* ayudas de app.js: el, avisar, libro */
  let apartados = null;   /* Map 'cap/ancla' -> título: oraciones, himnos (de libro.json) y ritos (se ven al pintar) */

  /* ---------- Datos ---------- */
  function leerDatos() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(CLAVE)); } catch (e) { d = null; }
    if (!d || !Array.isArray(d.listas)) d = { listas: [] };
    if (!d.listas.some(function (l) { return l.id === PRINCIPAL; })) d.listas.unshift({ id: PRINCIPAL, nombre: 'Favoritos', items: [] });
    return d;
  }
  function guardarDatos(d) {
    try { localStorage.setItem(CLAVE, JSON.stringify(d)); return true; }
    catch (e) { A.avisar('No se ha podido guardar: este navegador no deja guardar datos.'); return false; }
  }
  const clave = function (x) { return x.cap + '/' + x.a; };
  function lista(d, id) { return d.listas.find(function (l) { return l.id === id; }); }
  function esta(l, item) { return l.items.some(function (x) { return clave(x) === clave(item); }); }
  function poner(id, item, si) {
    const d = leerDatos(), l = lista(d, id);
    if (!l) return;
    l.items = l.items.filter(function (x) { return clave(x) !== clave(item); });
    if (si) l.items.push({ cap: item.cap, a: item.a, t: item.t });
    if (guardarDatos(d)) A.avisar((si ? 'Guardado en ' : 'Quitado de ') + l.nombre + '.');
  }
  function crearLista(nombre) {
    nombre = (nombre || '').trim().slice(0, 60);
    if (!nombre) return null;
    const d = leerDatos();
    const ya = d.listas.find(function (l) { return l.nombre.toLowerCase() === nombre.toLowerCase(); });
    if (ya) return ya.id;
    const id = 'l' + Date.now().toString(36);
    d.listas.push({ id: id, nombre: nombre, items: [] });
    return guardarDatos(d) ? id : null;
  }
  function enAlguna(item) {
    return leerDatos().listas.filter(function (l) { return esta(l, item); }).map(function (l) { return l.nombre; });
  }

  /* ---------- Los botones junto a cada texto ---------- */
  let contador = 0;
  function botones(item) {
    const n = ++contador, idPanel = 'fav-panel-' + n;
    const caja = A.el('div', { class: 'favorito' });
    const principal = A.el('button', { type: 'button', class: 'boton secundario' });
    const pintarPrincipal = function () {
      const si = esta(lista(leerDatos(), PRINCIPAL), item);
      principal.replaceChildren(A.el('span', { class: 'icono', 'aria-hidden': 'true', texto: si ? '★ ' : '☆ ' }),
        si ? 'Quitar de favoritos' : 'Guardar en favoritos', A.el('span', { class: 'solo-lector', texto: ' «' + item.t + '»' }));
    };
    principal.addEventListener('click', function () {
      poner(PRINCIPAL, item, !esta(lista(leerDatos(), PRINCIPAL), item));
      pintarPrincipal(); pintarPanel();
    });
    const abrir = A.el('button', { type: 'button', class: 'boton secundario', 'aria-expanded': 'false', 'aria-controls': idPanel },
      'Otras listas', A.el('span', { class: 'solo-lector', texto: ' para «' + item.t + '»' }));
    const panel = A.el('div', { class: 'fav-panel', id: idPanel, hidden: 'hidden' });
    abrir.addEventListener('click', function () {
      const ahora = panel.hidden;
      panel.hidden = !ahora;
      abrir.setAttribute('aria-expanded', ahora ? 'true' : 'false');
      if (ahora) pintarPanel();
    });
    function pintarPanel() {
      if (panel.hidden) return;
      const d = leerDatos();
      const grupo = A.el('fieldset', {}, A.el('legend', { texto: 'Guardar «' + item.t + '» en:' }));
      d.listas.forEach(function (l, i) {
        const idc = idPanel + '-' + i;
        const c = A.el('input', { type: 'checkbox', id: idc });
        c.checked = esta(l, item);
        c.addEventListener('change', function () { poner(l.id, item, c.checked); if (l.id === PRINCIPAL) pintarPrincipal(); });
        grupo.append(A.el('div', { class: 'opcion' }, c, A.el('label', { for: idc, texto: l.nombre })));
      });
      const idNueva = idPanel + '-nueva';
      const campo = A.el('input', { type: 'text', id: idNueva, autocomplete: 'off', maxlength: '60' });
      const crear = A.el('button', { type: 'button' }, 'Crear la lista y guardar');
      const hacer = function () {
        const id = crearLista(campo.value);
        if (!id) { A.avisar('Escribe el nombre de la lista nueva.'); campo.focus(); return; }
        poner(id, item, true);
        pintarPanel();
        const marcada = panel.querySelectorAll('input[type="checkbox"]');
        const nueva = Array.from(marcada).find(function (x) { return panel.querySelector('label[for="' + x.id + '"]').textContent.toLowerCase() === campo.value.trim().toLowerCase(); });
        (nueva || marcada[marcada.length - 1]).focus();
      };
      crear.addEventListener('click', hacer);
      campo.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); hacer(); } });
      panel.replaceChildren(grupo,
        A.el('div', { class: 'fav-nueva' }, A.el('label', { for: idNueva, texto: 'Lista nueva (por ejemplo, «Antes de dormir»)' }), campo, crear),
        A.el('p', {}, A.el('a', { href: '#/favoritos' }, 'Ver todos los favoritos')));
    }
    pintarPrincipal();
    /* Aprender de memoria (paso 4c): solo oraciones e himnos, no ritos */
    const aprender = item.aprender ? A.el('a', { class: 'boton secundario', href: '#/aprender/' + item.cap + '/' + item.a },
      'Aprender de memoria', A.el('span', { class: 'solo-lector', texto: ' «' + item.t + '»' })) : null;
    caja.append(A.el('div', { class: 'fav-botones' }, principal, abrir, aprender), panel);
    return caja;
  }

  /* Pone los botones en un capítulo ya pintado: oraciones, himnos y ritos («Rito 7. ...»). */
  function ponerBotones(contenedor, cap) {
    if (!apartados) {
      apartados = new Map();
      A.libro.oraciones.concat(A.libro.himnos).forEach(function (x) { apartados.set(x.cap + '/' + x.a, x.t); });
    }
    contenedor.querySelectorAll('section[id]').forEach(function (sec) {
      const h = sec.firstElementChild && /^H[1-6]$/.test(sec.firstElementChild.tagName) ? sec.firstElementChild : null;
      if (!h) return;
      const texto = h.textContent.replace(/\s+/g, ' ').trim();
      const deLista = apartados.get(cap + '/' + sec.id);
      const t = deLista || (/^Rito \d/.test(texto) ? texto : null);
      if (!t) return;
      const despues = h.nextElementSibling && h.nextElementSibling.classList.contains('escuchar') ? h.nextElementSibling : h;
      despues.after(botones({ cap: cap, a: sec.id, t: t, aprender: !!deLista }));
    });
  }
  /* Para un texto suelto (el de «Para leer hoy»): t = {t, cap, a} */
  function botonPara(t) { return botones({ cap: t.cap, a: t.a, t: t.t, aprender: true }); }

  /* ---------- Pantalla «Favoritos» ---------- */
  function boton(texto, oculto, foco, accion, secundario) {
    const b = A.el('button', { type: 'button', class: secundario ? 'boton secundario' : null, 'data-foco': foco }, texto,
      oculto ? A.el('span', { class: 'solo-lector', texto: ' ' + oculto }) : null);
    b.addEventListener('click', accion);
    return b;
  }
  function pintar(caja, foco) {
    const d = leerDatos();
    const total = d.listas.reduce(function (s, l) { return s + l.items.length; }, 0);
    const otra = function (cambio, nuevoFoco, texto) {
      return function () { const dd = leerDatos(); cambio(dd); if (guardarDatos(dd)) { if (texto) A.avisar(texto); pintar(caja, nuevoFoco); } };
    };
    caja.replaceChildren(A.el('h1', { texto: 'Favoritos' }),
      A.el('p', { texto: total ? 'Tus oraciones, himnos y ritos guardados, en ' + d.listas.length + (d.listas.length === 1 ? ' lista' : ' listas') + ' (cada lista es un título de nivel 2). Se guardan solo en este dispositivo.'
        : 'Todavía no has guardado nada. Debajo del título de cada oración, himno o rito hay un botón «Guardar en favoritos», y otro, «Otras listas», para hacer tus propias listas. Se guardan solo en este dispositivo.' }));
    d.listas.forEach(function (l) {
      const sec = A.el('section', { class: 'fav-lista' }, A.el('h2', { 'data-foco': 'h:' + l.id, texto: l.nombre + ' (' + l.items.length + ')' }));
      if (!l.items.length) sec.append(A.el('p', { texto: 'Esta lista está vacía.' }));
      else {
        const ul = A.el('ul');
        l.items.forEach(function (x, i) {
          const quitar = function (dd) { lista(dd, l.id).items.splice(i, 1); };
          const mover = function (paso) { return function (dd) { const it = lista(dd, l.id).items; const [m] = it.splice(i, 1); it.splice(i + paso, 0, m); }; };
          const siguienteFoco = l.items.length > 1 ? 'e:' + l.id + ':' + Math.min(i, l.items.length - 2) : 'h:' + l.id;
          ul.append(A.el('li', {},
            A.el('a', { href: '#/leer/' + x.cap + '/' + x.a, 'data-foco': 'e:' + l.id + ':' + i }, x.t),
            A.el('div', { class: 'fav-acciones' },
              /^Rito /.test(x.t) ? null : A.el('a', { class: 'boton secundario', href: '#/aprender/' + x.cap + '/' + x.a }, 'Aprender de memoria', A.el('span', { class: 'solo-lector', texto: ' «' + x.t + '»' })),
              i > 0 ? boton('Subir', '«' + x.t + '»', 's:' + l.id + ':' + i, otra(mover(-1), 's:' + l.id + ':' + (i - 1), 'Subido.'), true) : null,
              i < l.items.length - 1 ? boton('Bajar', '«' + x.t + '»', 'b:' + l.id + ':' + i, otra(mover(1), 'b:' + l.id + ':' + (i + 1), 'Bajado.'), true) : null,
              boton('Quitar', '«' + x.t + '» de ' + l.nombre, 'q:' + l.id + ':' + i, otra(quitar, siguienteFoco, 'Quitado de ' + l.nombre + '.'), true))));
        });
        sec.append(ul);
      }
      if (l.id !== PRINCIPAL) {
        sec.append(A.el('div', { class: 'fav-acciones' },
          boton('Cambiar el nombre', 'de la lista ' + l.nombre, 'r:' + l.id, function () {
            const nuevo = (window.prompt('Nombre nuevo para la lista «' + l.nombre + '»:', l.nombre) || '').trim().slice(0, 60);
            if (nuevo && nuevo !== l.nombre) otra(function (dd) { lista(dd, l.id).nombre = nuevo; }, 'h:' + l.id, 'Lista renombrada: ' + nuevo + '.')();
          }, true),
          boton('Borrar la lista', l.nombre, 'x:' + l.id, function () {
            if (window.confirm('¿Borrar la lista «' + l.nombre + '»? Los textos siguen en el libro; solo se borra la lista.'))
              otra(function (dd) { dd.listas = dd.listas.filter(function (z) { return z.id !== l.id; }); }, 'h:' + PRINCIPAL, 'Lista borrada.')();
          }, true)));
      }
      caja.append(sec);
    });
    caja.append(nuevaLista(caja), pasar(caja));
    /* El foco vuelve a donde estaba (o, si ese botón ya no está, al enlace del mismo texto) */
    const buscarFoco = function (k) { return caja.querySelector('[data-foco="' + CSS.escape(k) + '"]'); };
    const f = foco ? (buscarFoco(foco) || buscarFoco('e:' + foco.split(':').slice(1).join(':'))) : null;
    if (f) { if (!f.hasAttribute('tabindex') && /^H/.test(f.tagName)) f.setAttribute('tabindex', '-1'); f.focus(); }
  }

  function nuevaLista(caja) {
    const campo = A.el('input', { type: 'text', id: 'fav-nueva-lista', autocomplete: 'off', maxlength: '60' });
    const form = A.el('form', { class: 'fav-nueva' },
      A.el('label', { for: 'fav-nueva-lista', texto: 'Nombre de la lista (por ejemplo, «Para Atenea»)' }), campo,
      A.el('button', { type: 'submit' }, 'Crear la lista'));
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const id = crearLista(campo.value);
      if (!id) { A.avisar('Escribe el nombre de la lista.'); campo.focus(); return; }
      A.avisar('Lista creada: ' + campo.value.trim() + '.');
      pintar(caja, 'h:' + id);
    });
    return A.el('section', { 'aria-labelledby': 'fav-crear' }, A.el('h2', { id: 'fav-crear', texto: 'Crear una lista' }), form);
  }

  /* Pasar a otro dispositivo: un archivo con las listas. Al abrirlo, se suma a lo que ya hay (no se borra nada). */
  function pasar(caja) {
    const guardarArchivo = boton('Guardar los favoritos en un archivo', null, 'guardar-archivo', function () {
      const d = leerDatos();
      const datos = JSON.stringify({ jaris: 'favoritos', version: 1, fecha: new Date().toISOString().slice(0, 10), listas: d.listas }, null, 1);
      const url = URL.createObjectURL(new Blob([datos], { type: 'application/json' }));
      const a = A.el('a', { href: url, download: 'Jaris - favoritos.json' });
      document.body.append(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
      A.avisar('Archivo «Jaris - favoritos.json» guardado en las descargas.');
    });
    const archivo = A.el('input', { type: 'file', id: 'fav-archivo', accept: '.json,application/json' });
    archivo.addEventListener('change', async function () {
      const f = archivo.files && archivo.files[0];
      if (!f) return;
      let entrada;
      try { entrada = JSON.parse(await f.text()); } catch (e) { entrada = null; }
      if (!entrada || entrada.jaris !== 'favoritos' || !Array.isArray(entrada.listas)) {
        A.avisar('Ese archivo no es de favoritos de Jaris.'); archivo.value = ''; return;
      }
      const d = leerDatos();
      let nuevos = 0;
      for (const l of entrada.listas) {
        if (!l || !Array.isArray(l.items)) continue;
        let destino = l.id === PRINCIPAL ? lista(d, PRINCIPAL) : d.listas.find(function (x) { return x.nombre.toLowerCase() === String(l.nombre || '').toLowerCase(); });
        if (!destino) { destino = { id: 'l' + Date.now().toString(36) + d.listas.length, nombre: String(l.nombre || 'Lista').slice(0, 60), items: [] }; d.listas.push(destino); }
        for (const x of l.items) {
          if (!x || typeof x.cap !== 'string' || typeof x.a !== 'string') continue;
          if (!esta(destino, x)) { destino.items.push({ cap: x.cap, a: x.a, t: String(x.t || x.a) }); nuevos++; }
        }
      }
      if (guardarDatos(d)) {
        A.avisar(nuevos ? 'Añadidos ' + nuevos + ' favoritos del archivo.' : 'Ya tenías todo lo del archivo; no ha cambiado nada.');
        pintar(caja, 'h:' + PRINCIPAL);
      }
    });
    return A.el('section', { 'aria-labelledby': 'fav-pasar' },
      A.el('h2', { id: 'fav-pasar', texto: 'Pasar a otro dispositivo' }),
      A.el('p', { texto: 'Guarda tus favoritos en un archivo y ábrelo en el otro dispositivo. Lo del archivo se suma a lo que ya haya: no se borra nada. También sirve como copia de seguridad.' }),
      A.el('p', {}, guardarArchivo),
      A.el('div', { class: 'fav-nueva' }, A.el('label', { for: 'fav-archivo', texto: 'Abrir un archivo de favoritos' }), archivo));
  }

  function pantalla() {
    const caja = A.el('div', { class: 'favoritos' });
    pintar(caja, null);
    return caja;
  }
  function iniciar(ayudas) { A = ayudas; }

  window.JarisFavoritos = { iniciar: iniciar, ponerBotones: ponerBotones, botonPara: botonPara, pantalla: pantalla, leer: leerDatos };
})();
