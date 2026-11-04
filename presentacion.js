/* Jaris: la presentación (extra 3). Las letras de «Jaris» caen del cielo y se posan sobre el templo de la portada.
   - Solo la primera vez que se abre Jaris (localStorage «jaris.presentacion»); se puede volver a ver desde la portada.
   - Accesible: es un diálogo con su nombre («Jaris. Antología del helenismo») y una descripción de lo que pasa;
     el foco va al botón «Saltar la presentación» (también Escape). El resto de la página queda inerte mientras dura.
   - Cada letra suena al posarse (una nota de lira hecha por el navegador, en modo dórico, sin archivos), si el
     navegador deja sonar (la primera vez algunos navegadores no dejan; al volver a verla desde la portada, sí).
   - Con «reducir movimiento» no se mueve nada: las letras aparecen ya colocadas.
   - Dura unos 6 segundos (para que dé tiempo a que el lector diga el nombre y la descripción) y se cierra sola; el foco vuelve al título de la pantalla. */
'use strict';
(function () {
  const CLAVE = 'jaris.presentacion';
  const NOTAS = [329.63, 392.0, 440.0, 493.88, 659.25];   // Mi, Sol, La, Si, Mi agudo (dórico)
  let abierta = false;

  function vista() { try { return !!localStorage.getItem(CLAVE); } catch (e) { return true; } }
  function marcar() { try { localStorage.setItem(CLAVE, 'vista'); } catch (e) { /* nada */ } }
  function quieto() { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }

  /* Una nota suave, como una cuerda pulsada (si el navegador no deja sonar todavía, no pasa nada). */
  let ctx = null;
  function nota(frecuencia, cuando) {
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      const t = ctx.currentTime + (cuando || 0);
      const osc = ctx.createOscillator(), vol = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = frecuencia;
      vol.gain.setValueAtTime(0.0001, t);
      vol.gain.exponentialRampToValueAtTime(0.18, t + 0.01);
      vol.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
      osc.connect(vol).connect(ctx.destination);
      osc.start(t); osc.stop(t + 1.7);
    } catch (e) { /* sin sonido */ }
  }

  /* opciones: { libro, alTerminar } */
  function mostrar(op) {
    if (abierta) return;
    abierta = true;
    const libro = op.libro || {}, portada = libro.portada || {};
    const fondo = Array.from(document.body.children).filter(function (n) { return n.tagName !== 'SCRIPT' && n.id !== 'avisos'; });
    fondo.forEach(function (n) { n.setAttribute('inert', ''); n.setAttribute('aria-hidden', 'true'); });

    const caja = document.createElement('div');
    caja.className = 'presentacion' + (quieto() ? ' quieta' : '');
    caja.setAttribute('role', 'dialog');
    caja.setAttribute('aria-modal', 'true');
    caja.setAttribute('aria-labelledby', 'pres-titulo');
    caja.setAttribute('aria-describedby', 'pres-desc');
    const titulo = document.createElement('h1');
    titulo.id = 'pres-titulo';
    titulo.className = 'solo-lector';
    titulo.textContent = (libro.titulo || 'Jaris') + '. ' + (libro.subtitulo || 'Antología del helenismo');
    const desc = document.createElement('p');
    desc.id = 'pres-desc';
    desc.className = 'solo-lector';
    desc.textContent = 'Las letras de Jaris caen del cielo una a una, cada una con una nota de lira, y forman la portada sobre el templo.';
    const escena = document.createElement('div');
    escena.className = 'pres-escena';
    escena.setAttribute('aria-hidden', 'true');
    // La ilustración de la portada sin el título (la 31): las letras caen donde va el título en la cubierta.
    const imagen = portada.presentacion || portada.imagen;
    if (imagen) {
      const img = document.createElement('img');
      img.src = imagen; img.alt = ''; img.className = 'pres-templo';
      escena.append(img);
    }
    const palabra = document.createElement('div');
    palabra.className = 'pres-palabra';
    Array.from(libro.titulo || 'Jaris').forEach(function (letra, i) {
      const s = document.createElement('span');
      s.textContent = letra;
      s.style.animationDelay = (0.25 + i * 0.45) + 's';
      palabra.append(s);
    });
    escena.append(palabra);
    // Después de las letras aparecen, suaves, el subtítulo y la firma, como en la cubierta (solo se ven).
    const n0 = (libro.titulo || 'Jaris').length;
    const sub = document.createElement('p');
    sub.className = 'pres-sub';
    sub.textContent = libro.subtitulo || 'Antología del helenismo';
    sub.style.animationDelay = (0.25 + n0 * 0.45 + 0.6) + 's';
    const firma = document.createElement('p');
    firma.className = 'pres-firma';
    firma.textContent = libro.autora || 'Khaire Lyra';
    firma.style.animationDelay = (0.25 + n0 * 0.45 + 0.9) + 's';
    escena.append(sub, firma);
    const desbordeAntes = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';   // sin barra de desplazamiento mientras dura
    const saltar = document.createElement('button');
    saltar.type = 'button';
    saltar.className = 'pres-saltar';
    saltar.textContent = 'Saltar la presentación';
    caja.append(titulo, desc, escena, saltar);
    document.body.append(caja);
    saltar.focus();

    // Las notas, al ritmo de las letras (una a una; con «reducir movimiento», más seguidas)
    // Las notas salen de «Datos de la aplicación.txt» («Notas de la presentación»); si no hay, las de siempre.
    const notas = Array.isArray(libro.notasPresentacion) && libro.notasPresentacion.length ? libro.notasPresentacion : NOTAS;
    const n = (libro.titulo || 'Jaris').length;
    // Si están grabadas con la lira de la autora («Música\Notas de la lira para la presentación»), suenan esas; si no, las del navegador.
    const lira = Array.isArray(libro.notasLira) && libro.notasLira.length ? libro.notasLira.map(function (src) { const a = new Audio(src); a.preload = 'auto'; return a; }) : null;
    for (let i = 0; i < n; i++) {
      const cuando = quieto() ? 0.2 + i * 0.25 : 0.25 + i * 0.45 + 0.7;
      if (lira) {
        const sonido = lira[i % lira.length];
        setTimeout(function () { try { const s = sonido.cloneNode(); s.volume = 0.8; const p = s.play(); if (p) p.catch(function () { /* sin permiso para sonar */ }); } catch (e) { /* nada */ } }, cuando * 1000);
      } else nota(notas[i % notas.length], cuando);
    }

    let hecho = false;
    function cerrar() {
      if (hecho) return;
      hecho = true; abierta = false;
      clearTimeout(reloj);
      document.removeEventListener('keydown', tecla, true);
      marcar();
      fondo.forEach(function (x) { x.removeAttribute('inert'); x.removeAttribute('aria-hidden'); });
      caja.remove();
      document.documentElement.style.overflow = desbordeAntes;
      if (op.alTerminar) op.alTerminar();
    }
    function tecla(e) {
      if (e.key === 'Escape') { e.preventDefault(); cerrar(); }
      else if (e.key === 'Tab') { e.preventDefault(); saltar.focus(); }   // el foco no sale del diálogo
    }
    document.addEventListener('keydown', tecla, true);
    saltar.addEventListener('click', cerrar);
    // Al final, se desvanece suavemente (medio segundo) y se cierra; con «reducir movimiento», sin desvanecer.
    const reloj = setTimeout(function () {
      if (quieto()) { cerrar(); return; }
      caja.classList.add('saliendo');
      setTimeout(cerrar, 500);
    }, quieto() ? 4000 : 5500);
  }

  window.JarisPresentacion = {
    mostrar: mostrar,
    /* Al abrir Jaris: solo si no se ha visto nunca */
    alAbrir: function (op) { if (!vista()) mostrar(op); },
  };
})();
