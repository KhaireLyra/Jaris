/* Jaris: el motor del calendario ático (parte 2a-1). Calcula, sin conexión, para cualquier año y lugar,
   con las reglas del capítulo 8 («Cómo se calcula el calendario hoy»):
   1. El día empieza al ponerse el sol.
   2. El mes empieza con la Noumenia: si la luna nueva fue más de 20 horas antes de la puesta de sol,
      el mes empieza esa tarde; si no, la tarde siguiente (la regla de la aplicación «Attic Calendar»).
   3. El año empieza con la primera Noumenia después del solsticio de verano (Hekatombaion).
   4. Los meses tienen 29 o 30 días, según la luna.
   5. Si hay trece meses, se repite Poseideon (Poseideon II).
   6. El año olímpico: desde el verano de 2025, año 1 de la Olimpiada 701.
   Astronomía: luna nueva y solsticio con los métodos de Jean Meeus («Astronomical Algorithms»),
   puesta del sol con la ecuación de la salida y la puesta del sol. Error: un par de minutos.
   Los días se manejan como números enteros («día civil»): días desde el 1 de enero de 1970. */
'use strict';
(function (global) {
  const DIA = 86400000, HORA = 3600000;
  const RAD = Math.PI / 180;
  const sen = function (g) { return Math.sin(g * RAD); };
  const cos = function (g) { return Math.cos(g * RAD); };

  const MESES = ['Hekatombaion', 'Metageitnion', 'Boedromion', 'Pyanepsion', 'Maimakterion', 'Poseideon',
    'Gamelion', 'Anthesterion', 'Elaphebolion', 'Mounichion', 'Thargelion', 'Skirophorion'];

  function msDeJd(jd) { return (jd - 2440587.5) * DIA; }
  function jdDeMs(ms) { return ms / DIA + 2440587.5; }

  /* Diferencia entre el tiempo de los astrónomos (TT) y el de los relojes (UT), en segundos. */
  function deltaT(anio) {
    const t = anio - 2000;
    if (anio >= 2005 && anio < 2050) return 62.92 + 0.32217 * t + 0.005589 * t * t;
    const u = (anio - 1820) / 100;
    return -20 + 32 * u * u;
  }

  /* Luna nueva número k (k = 0: enero de 2000). Devuelve el instante en milisegundos (UTC). */
  function lunaNueva(k) {
    const T = k / 1236.85, T2 = T * T, T3 = T2 * T, T4 = T3 * T;
    let jde = 2451550.09766 + 29.530588861 * k + 0.00015437 * T2 - 0.00000015 * T3 + 0.00000000073 * T4;
    const E = 1 - 0.002516 * T - 0.0000074 * T2;
    const M = 2.5534 + 29.1053567 * k - 0.0000014 * T2 - 0.00000011 * T3;
    const Mp = 201.5643 + 385.81693528 * k + 0.0107582 * T2 + 0.00001238 * T3 - 0.000000058 * T4;
    const F = 160.7108 + 390.67050284 * k - 0.0016118 * T2 - 0.00000227 * T3 + 0.000000011 * T4;
    const Om = 124.7746 - 1.56375588 * k + 0.0020672 * T2 + 0.00000215 * T3;
    jde += -0.4072 * sen(Mp) + 0.17241 * E * sen(M) + 0.01608 * sen(2 * Mp) + 0.01039 * sen(2 * F)
      + 0.00739 * E * sen(Mp - M) - 0.00514 * E * sen(Mp + M) + 0.00208 * E * E * sen(2 * M)
      - 0.00111 * sen(Mp - 2 * F) - 0.00057 * sen(Mp + 2 * F) + 0.00056 * E * sen(2 * Mp + M)
      - 0.00042 * sen(3 * Mp) + 0.00042 * E * sen(M + 2 * F) + 0.00038 * E * sen(M - 2 * F)
      - 0.00024 * E * sen(2 * Mp - M) - 0.00017 * sen(Om) - 0.00007 * sen(Mp + 2 * M)
      + 0.00004 * sen(2 * Mp - 2 * F) + 0.00004 * sen(3 * M) + 0.00003 * sen(Mp + M - 2 * F)
      + 0.00003 * sen(2 * Mp + 2 * F) - 0.00003 * sen(Mp + M + 2 * F) + 0.00003 * sen(Mp - M + 2 * F)
      - 0.00002 * sen(Mp - M - 2 * F) - 0.00002 * sen(3 * Mp + M) + 0.00002 * sen(4 * Mp);
    const anio = 2000 + k / 12.3685;
    return msDeJd(jde) - deltaT(anio) * 1000;
  }
  /* Número k de la primera luna nueva después de un instante. */
  function kDespuesDe(ms) {
    let k = Math.floor((jdDeMs(ms) - 2451550.09766) / 29.530588861) - 1;
    while (lunaNueva(k) <= ms) k++;
    return k;
  }

  const TERMINOS_SOLSTICIO = [[485, 324.96, 1934.136], [203, 337.23, 32964.467], [199, 342.08, 20.186],
    [182, 27.85, 445267.112], [156, 73.14, 45036.886], [136, 171.52, 22518.443], [77, 222.54, 65928.934],
    [74, 296.72, 3034.906], [70, 243.58, 9037.513], [58, 119.81, 33718.147], [52, 297.17, 150.678],
    [50, 21.02, 2281.226], [45, 247.54, 29929.562], [44, 325.15, 31555.956], [29, 60.93, 4443.417],
    [18, 155.12, 67555.328], [17, 288.79, 4562.452], [16, 198.04, 62894.029], [14, 199.76, 31436.921],
    [12, 95.39, 14577.848], [12, 287.11, 31931.756], [12, 320.81, 34777.259], [9, 227.73, 1222.114],
    [8, 15.45, 16859.074]];
  /* Solsticio de junio (verano en el norte) del año dado, en milisegundos (UTC). */
  function solsticioDiciembre(anio) { return solsticioJunio(anio, true); }
  function solsticioJunio(anio, diciembre) {
    const Y = (anio - 2000) / 1000;
    const jde0 = diciembre
      ? 2451900.05952 + 365242.74049 * Y - 0.06223 * Y * Y - 0.00823 * Y * Y * Y + 0.00032 * Y * Y * Y * Y
      : 2451716.56767 + 365241.62603 * Y + 0.00325 * Y * Y + 0.00888 * Y * Y * Y - 0.0003 * Y * Y * Y * Y;
    const T = (jde0 - 2451545) / 36525;
    const W = 35999.373 * T - 2.47;
    const dl = 1 + 0.0334 * cos(W) + 0.0007 * cos(2 * W);
    let S = 0;
    for (const t of TERMINOS_SOLSTICIO) S += t[0] * cos(t[1] + t[2] * T);
    return msDeJd(jde0 + 0.00001 * S / dl) - deltaT(anio) * 1000;
  }

  /* ---------- Hora del lugar ---------- */
  /* Un lugar es { nombre, lat, lon, zona } (zona: «Europe/Madrid»...). Para las pruebas se puede
     poner { desfase: minutos } en vez de la zona. */
  const formatos = {};
  function desfase(lugar, ms) {
    if (typeof lugar.desfase === 'number') return lugar.desfase;
    let f = formatos[lugar.zona];
    if (!f) {
      f = formatos[lugar.zona] = new Intl.DateTimeFormat('en-US', { timeZone: lugar.zona, hourCycle: 'h23',
        year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' });
    }
    const p = {};
    for (const x of f.formatToParts(new Date(ms))) p[x.type] = Number(x.value);
    return Math.round((Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - Math.floor(ms / 60000) * 60000) / 60000);
  }
  function diaLocal(ms, lugar) { return Math.floor((ms + desfase(lugar, ms) * 60000) / DIA); }

  /* Puesta del sol del día civil «dia» en el lugar (milisegundos UTC). */
  const cachePuestas = {};
  function puestaDeSol(dia, lugar) {
    const clave = lugar.lat + ',' + lugar.lon + ',' + dia;
    if (cachePuestas[clave] !== undefined) return cachePuestas[clave];
    const n = dia - 10957;
    const jEstrella = n - lugar.lon / 360;
    const M = ((357.5291 + 0.98560028 * jEstrella) % 360 + 360) % 360;
    const C = 1.9148 * sen(M) + 0.02 * sen(2 * M) + 0.0003 * sen(3 * M);
    const lambda = (M + C + 180 + 102.9372) % 360;
    const transito = 2451545 + jEstrella + 0.0053 * sen(M) - 0.0069 * sen(2 * lambda);
    const senDecl = sen(lambda) * sen(23.4397);
    const decl = Math.asin(senDecl) / RAD;
    const cosW = (sen(-0.833) - sen(lugar.lat) * senDecl) / (cos(lugar.lat) * cos(decl));
    let ms;
    if (cosW >= -1 && cosW <= 1) ms = msDeJd(transito + Math.acos(cosW) / RAD / 360);
    else ms = dia * DIA + (18 * 60 - desfase(lugar, dia * DIA)) * 60000;   /* sin puesta de sol: a las seis */
    cachePuestas[clave] = ms;
    return ms;
  }

  /* ---------- Meses y años ---------- */
  /* Día civil (de día) en que cae la Noumenia del mes que empieza con la luna nueva k. */
  function noumenia(k, lugar) {
    const nm = lunaNueva(k);
    let d = diaLocal(nm, lugar);
    if (puestaDeSol(d, lugar) <= nm) d++;
    if (puestaDeSol(d, lugar) - nm < 20 * HORA) d++;
    return d + 1;   /* empieza la tarde de d y es «de día» el día d + 1 */
  }
  /* Primera luna nueva (k) del año que empieza en el verano del año «anio». */
  function kDelAnio(anio, lugar) {
    const s = solsticioJunio(anio);
    let k = kDespuesDe(s - 40 * DIA);
    while (puestaDeSol(noumenia(k, lugar) - 1, lugar) <= s) k++;
    return k;
  }

  const cacheAnios = {};
  /* El año griego que empieza en el verano del año «anio» (por ejemplo, 2026: de julio de 2026 a junio de 2027). */
  function anioGriego(anio, lugar) {
    const clave = anio + '|' + lugar.lat + ',' + lugar.lon + '|' + (lugar.zona || lugar.desfase);
    if (cacheAnios[clave]) return cacheAnios[clave];
    const k0 = kDelAnio(anio, lugar), k1 = kDelAnio(anio + 1, lugar);
    const nombres = MESES.slice();
    const embolismico = (k1 - k0) === 13;
    if (embolismico) nombres.splice(6, 0, 'Poseideon II');
    const meses = [];
    for (let k = k0; k < k1; k++) {
      const inicio = noumenia(k, lugar), fin = noumenia(k + 1, lugar);
      meses.push({ numero: meses.length + 1, nombre: nombres[k - k0], inicio: inicio, dias: fin - inicio, lunaNueva: lunaNueva(k) });
    }
    const n = anio - 2025;
    const res = { anio: anio, inicio: meses[0].inicio, fin: noumenia(k1, lugar), meses: meses, embolismico: embolismico,
      olimpiada: 701 + Math.floor(n / 4), anioOlimpiada: ((n % 4) + 4) % 4 + 1 };
    cacheAnios[clave] = res;
    return res;
  }

  /* Fecha griega de un día civil (de día). */
  function fechaGriega(dia, lugar) {
    let anio = new Date(dia * DIA).getUTCFullYear();
    let a = anioGriego(anio, lugar);
    if (dia < a.inicio) a = anioGriego(anio - 1, lugar);
    for (let i = a.meses.length - 1; i >= 0; i--) {
      const m = a.meses[i];
      if (dia >= m.inicio) {
        const d = dia - m.inicio + 1;
        return { dia: d, mes: m.nombre, numeroMes: m.numero, diasDelMes: m.dias, ultimo: d === m.dias,
          anio: a, inicioMes: m.inicio, diaCivil: dia };
      }
    }
    return null;
  }
  /* Fecha griega de ahora mismo: después de la puesta del sol ya es el día siguiente. */
  function ahora(ms, lugar) {
    let d = diaLocal(ms, lugar);
    const puesta = puestaDeSol(d, lugar);
    const tras = ms >= puesta;
    const f = fechaGriega(tras ? d + 1 : d, lugar);
    f.trasLaPuesta = tras;
    f.puestaDeHoy = puesta;
    return f;
  }

  /* Ayudas para pasar de día civil a fecha y al revés. */
  function diaDe(anio, mes, dia) { return Math.floor(Date.UTC(anio, mes - 1, dia) / DIA); }
  function fechaDe(dia) { const f = new Date(dia * DIA); return { anio: f.getUTCFullYear(), mes: f.getUTCMonth() + 1, dia: f.getUTCDate() }; }
  function iso(dia) { return new Date(dia * DIA).toISOString().slice(0, 10); }

  global.JarisCalendario = { MESES: MESES, lunaNueva: lunaNueva, kDespuesDe: kDespuesDe, solsticioJunio: solsticioJunio, solsticioDiciembre: solsticioDiciembre,
    puestaDeSol: puestaDeSol, diaLocal: diaLocal, noumenia: noumenia, anioGriego: anioGriego,
    fechaGriega: fechaGriega, ahora: ahora, diaDe: diaDe, fechaDe: fechaDe, iso: iso };
})(typeof self !== 'undefined' ? self : this);
