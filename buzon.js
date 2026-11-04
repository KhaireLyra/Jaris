/* Jaris: buzón de sugerencias y erratas (paso 6-2).
   Rutas: #/buzon y #/buzon/CAPÍTULO (desde el enlace del final de cada capítulo).
   Jaris no envía nada por su cuenta: abre el programa de correo con el mensaje escrito
   (enlace «mailto») y la persona decide si lo envía; también se puede copiar el mensaje.
   La dirección sale de «Herramientas del libro\Datos de la aplicación.txt» (libro.correo). */
'use strict';
(function () {
  const TIPOS = [
    { id: 'errata', texto: 'Una errata (algo mal escrito o equivocado en el libro)', asunto: 'errata' },
    { id: 'idea', texto: 'Una sugerencia o una idea', asunto: 'sugerencia' },
    { id: 'fallo', texto: 'Algo que no funciona bien en la aplicación', asunto: 'algo no funciona' },
    { id: 'otra', texto: 'Otra cosa', asunto: 'mensaje' },
  ];
  const BORRADOR = 'jaris.buzon';
  function leerBorrador() { try { return JSON.parse(sessionStorage.getItem(BORRADOR)) || {}; } catch (e) { return {}; } }
  function guardarBorrador(b) { try { sessionStorage.setItem(BORRADOR, JSON.stringify(b)); } catch (e) { /* nada */ } }

  async function pantalla(partes, a) {
    const el = a.el, libro = a.libro, correo = (libro.correo || '').trim();
    const cap = partes[1] || '';
    const capInfo = cap ? libro.capitulos.find(function (c) { return c.cap === cap; }) : null;
    const borrador = leerBorrador();
    const raiz = el('div', { class: 'buzon' });
    raiz.append(el('h1', { texto: 'Buzón de sugerencias y erratas' }),
      el('p', { texto: 'Si has visto una errata, tienes una idea o algo no funciona bien, cuéntalo aquí. Cada mensaje se lee con cariño y ayuda a mejorar las próximas ediciones de Jaris.' }),
      el('p', { texto: 'Jaris no envía nada por su cuenta: al terminar, se abre tu programa de correo con el mensaje ya escrito y tú decides si lo envías. Quien lo reciba verá tu dirección de correo; no hace falta que pongas tu nombre.' }));
    if (correo) {
      raiz.append(el('p', {}, 'El mensaje va a ', el('strong', { texto: correo }), '.'));
    } else {
      raiz.append(el('p', { class: 'buz-aviso', texto: 'Todavía no está puesta la dirección del buzón. De momento puedes escribir tu mensaje y copiarlo con el botón «Copiar el mensaje».' }));
    }
    const form = el('form', { novalidate: 'novalidate', 'aria-labelledby': 'buz-titulo-form' });
    form.append(el('h2', { id: 'buz-titulo-form', texto: 'Escribir al buzón' }));

    // Qué quieres contar
    const tipoInicial = borrador.tipo || (cap ? 'errata' : 'idea');
    const grupo = el('fieldset', { class: 'buz-tipos' }, el('legend', { texto: 'Qué quieres contar' }));
    TIPOS.forEach(function (t) {
      const id = 'buz-tipo-' + t.id;
      const radio = el('input', { type: 'radio', name: 'buz-tipo', id: id, value: t.id });
      if (t.id === tipoInicial) radio.checked = true;
      grupo.append(el('div', { class: 'buz-opcion' }, radio, el('label', { for: id, texto: t.texto })));
    });
    form.append(grupo);

    // Dónde
    let donde = borrador.cap === cap ? borrador.donde : undefined;   // si viene de otro capítulo, se pone el nuevo
    if (donde === undefined) donde = capInfo ? capInfo.titulo : '';
    const campoDonde = el('input', { type: 'text', id: 'buz-donde', autocomplete: 'off', 'aria-describedby': 'buz-donde-ayuda' });
    campoDonde.value = donde;
    form.append(el('label', { for: 'buz-donde', class: 'buz-etiqueta', texto: 'Dónde está (opcional)' }),
      el('p', { id: 'buz-donde-ayuda', class: 'buz-ayuda', texto: 'El capítulo, la oración o la pantalla. Si vienes desde un capítulo, ya está puesto: añade el apartado si quieres.' }),
      campoDonde);

    // El mensaje
    const campoTexto = el('textarea', { id: 'buz-texto', rows: '8', required: 'required', 'aria-describedby': 'buz-texto-ayuda' });
    campoTexto.value = borrador.texto || '';
    const error = el('p', { id: 'buz-error', class: 'buz-error', hidden: 'hidden' });
    form.append(el('label', { for: 'buz-texto', class: 'buz-etiqueta', texto: 'Tu mensaje' }),
      el('p', { id: 'buz-texto-ayuda', class: 'buz-ayuda', texto: 'Si es una errata, copia la frase tal como está y cómo debería ser.' }),
      campoTexto, error);

    // Datos de la aplicación
    const casilla = el('input', { type: 'checkbox', id: 'buz-datos' });
    casilla.checked = borrador.datos !== false;
    form.append(el('div', { class: 'buz-opcion' }, casilla,
      el('label', { for: 'buz-datos', texto: 'Añadir la edición de Jaris y el tipo de dispositivo (ayuda a arreglar fallos; no incluye nada personal)' })));

    // Botones
    const botones = el('div', { class: 'buz-botones' });
    const abrir = el('button', { type: 'submit', texto: 'Abrir el correo con el mensaje' });
    const copiar = el('button', { type: 'button', texto: 'Copiar el mensaje' });
    if (correo) botones.append(abrir);
    botones.append(copiar);
    form.append(botones,
      el('p', { class: 'buz-ayuda', texto: correo
        ? 'Si no se abre ningún programa de correo, pulsa «Copiar el mensaje» y pégalo en un correo nuevo a ' + correo + '.'
        : 'Cuando esté la dirección del buzón, aquí saldrá también el botón para abrir el correo.' }));
    raiz.append(form);
    raiz.append(el('p', {}, el('a', { href: cap ? '#/leer/' + cap : '#/', texto: cap && capInfo ? 'Volver a «' + capInfo.titulo + '»' : 'Ir a la portada' })));

    function tipoElegido() { const r = form.querySelector('input[name="buz-tipo"]:checked'); return TIPOS.find(function (t) { return r && t.id === r.value; }) || TIPOS[1]; }
    function guardarTodo() { guardarBorrador({ cap: cap, tipo: tipoElegido().id, donde: campoDonde.value, texto: campoTexto.value, datos: casilla.checked }); }
    form.addEventListener('input', guardarTodo);
    form.addEventListener('change', guardarTodo);

    function mensaje() {
      const t = tipoElegido();
      const lineas = ['Tipo: ' + t.texto];
      if (campoDonde.value.trim()) lineas.push('Dónde: ' + campoDonde.value.trim());
      lineas.push('', campoTexto.value.trim());
      if (casilla.checked) {
        lineas.push('', '---', 'Jaris, ' + (libro.edicion || '') + ' (montada el ' + libro.fechaTexto + ', versión ' + libro.version + ').');
        lineas.push('Dispositivo: ' + navigator.userAgent);
      }
      return { asunto: 'Jaris: ' + t.asunto + (campoDonde.value.trim() ? ' (' + campoDonde.value.trim().slice(0, 60) + ')' : ''), cuerpo: lineas.join('\n') };
    }
    function comprobar() {
      if (campoTexto.value.trim()) {
        error.hidden = true; campoTexto.removeAttribute('aria-invalid');
        campoTexto.setAttribute('aria-describedby', 'buz-texto-ayuda');
        return true;
      }
      error.textContent = 'Falta escribir el mensaje.';
      error.hidden = false;
      campoTexto.setAttribute('aria-invalid', 'true');
      campoTexto.setAttribute('aria-describedby', 'buz-error buz-texto-ayuda');
      a.avisar('Falta escribir el mensaje.');
      campoTexto.focus();
      return false;
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!correo || !comprobar()) return;
      const m = mensaje();
      const enlace = 'mailto:' + correo + '?subject=' + encodeURIComponent(m.asunto) + '&body=' + encodeURIComponent(m.cuerpo);
      if (enlace.length > 1900) {
        a.avisar('El mensaje es muy largo para abrirlo directamente en el correo. Pulsa «Copiar el mensaje» y pégalo en un correo nuevo.');
        copiar.focus();
        return;
      }
      window.JarisBuzon.ultimoEnlace = enlace;   // para las pruebas automáticas
      window.location.href = enlace;
      a.avisar('Abriendo tu programa de correo con el mensaje. Revísalo y envíalo desde allí.');
    });
    copiar.addEventListener('click', async function () {
      if (!comprobar()) return;
      const m = mensaje();
      const texto = (correo ? 'Para: ' + correo + '\n' : '') + 'Asunto: ' + m.asunto + '\n\n' + m.cuerpo;
      let hecho = false;
      try { await navigator.clipboard.writeText(texto); hecho = true; } catch (e) {
        try {
          const area = el('textarea', { class: 'solo-lector', 'aria-hidden': 'true' });
          area.value = texto; document.body.append(area); area.select();
          hecho = document.execCommand('copy'); area.remove();
        } catch (e2) { hecho = false; }
        copiar.focus();   // el foco vuelve al botón
      }
      a.avisar(hecho ? 'Mensaje copiado. Pégalo en un correo nuevo' + (correo ? ' a ' + correo : '') + '.'
        : 'No se ha podido copiar. Selecciona el texto del mensaje y cópialo a mano.');
    });
    return { nodo: raiz, titulo: 'Buzón de sugerencias y erratas' };
  }
  function vaciarBorrador() { try { sessionStorage.removeItem(BORRADOR); } catch (e) { /* nada */ } }
  window.JarisBuzon = { pantalla: pantalla, vaciar: vaciarBorrador };
})();
