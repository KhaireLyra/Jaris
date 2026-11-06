/* Jaris: guarda la aplicación entera en el dispositivo para que funcione sin conexión.
   montar_aplicacion.py pone aquí la versión y la lista de archivos cada vez que se monta.
   Cuando cambia la versión, el navegador baja la edición nueva sola y avisa en la página.
   Los audios descargados van en otra caché aparte, «audios-jaris», que esto no borra (parte 3c). */
'use strict';
const VERSION = '8cac6c93f969';
const CACHE = 'jaris-' + VERSION;
const ARCHIVOS = [
"./",
"./app.css",
"./app.js",
"./aprender.js",
"./audios.js",
"./buscar.js",
"./buzon.js",
"./calendario-datos.js",
"./calendario.js",
"./cancionero.js",
"./contenido/audios.json",
"./contenido/cancionero.json",
"./contenido/ch001.html",
"./contenido/ch002.html",
"./contenido/ch003.html",
"./contenido/ch004.html",
"./contenido/ch005.html",
"./contenido/ch006.html",
"./contenido/ch007.html",
"./contenido/ch008.html",
"./contenido/ch009.html",
"./contenido/ch010.html",
"./contenido/ch011.html",
"./contenido/ch012.html",
"./contenido/ch013.html",
"./contenido/ch014.html",
"./contenido/ch015.html",
"./contenido/ch016.html",
"./contenido/ch017.html",
"./contenido/ch018.html",
"./contenido/ch019.html",
"./contenido/ch020.html",
"./contenido/ch021.html",
"./contenido/ch022.html",
"./contenido/ch023.html",
"./contenido/ch024.html",
"./contenido/ch025.html",
"./contenido/ch026.html",
"./contenido/ch027.html",
"./contenido/ch028.html",
"./contenido/ch029.html",
"./contenido/ch030.html",
"./contenido/ch031.html",
"./contenido/ch032.html",
"./contenido/ch033.html",
"./contenido/ch034.html",
"./contenido/ch035.html",
"./contenido/ch036.html",
"./contenido/ch037.html",
"./contenido/ch038.html",
"./contenido/ch039.html",
"./contenido/ch040.html",
"./contenido/ch041.html",
"./contenido/ch042.html",
"./contenido/ch043.html",
"./contenido/ch044.html",
"./contenido/ch045.html",
"./contenido/ch046.html",
"./contenido/ch047.html",
"./contenido/ch048.html",
"./contenido/ch049.html",
"./contenido/ch050.html",
"./contenido/ch051.html",
"./contenido/ch052.html",
"./contenido/ch053.html",
"./contenido/ch054.html",
"./contenido/ch055.html",
"./contenido/ch056.html",
"./contenido/ch057.html",
"./contenido/ch058.html",
"./contenido/ch059.html",
"./contenido/ch060.html",
"./contenido/ch061.html",
"./contenido/ch062.html",
"./contenido/descargas.json",
"./contenido/diario.json",
"./contenido/libro.json",
"./contenido/oraculo.json",
"./contenido/que-hacer.json",
"./diario.js",
"./favoritos.js",
"./iconos/icono-180.png",
"./iconos/icono-192.png",
"./iconos/icono-32.png",
"./iconos/icono-512.png",
"./img/file0.jpg",
"./img/file1.jpg",
"./img/file10.jpg",
"./img/file100.jpg",
"./img/file101.jpg",
"./img/file102.jpg",
"./img/file103.jpg",
"./img/file104.jpg",
"./img/file105.jpg",
"./img/file106.jpg",
"./img/file107.jpg",
"./img/file108.jpg",
"./img/file109.jpg",
"./img/file11.jpg",
"./img/file110.jpg",
"./img/file111.jpg",
"./img/file112.jpg",
"./img/file113.jpg",
"./img/file114.jpg",
"./img/file115.jpg",
"./img/file116.jpg",
"./img/file117.jpg",
"./img/file118.jpg",
"./img/file119.jpg",
"./img/file12.jpg",
"./img/file120.jpg",
"./img/file121.jpg",
"./img/file122.jpg",
"./img/file123.jpg",
"./img/file124.jpg",
"./img/file125.jpg",
"./img/file126.jpg",
"./img/file127.jpg",
"./img/file128.jpg",
"./img/file129.jpg",
"./img/file13.jpg",
"./img/file130.jpg",
"./img/file131.jpg",
"./img/file132.jpg",
"./img/file133.jpg",
"./img/file134.jpg",
"./img/file135.jpg",
"./img/file136.jpg",
"./img/file137.jpg",
"./img/file138.jpg",
"./img/file139.jpg",
"./img/file14.jpg",
"./img/file140.jpg",
"./img/file141.jpg",
"./img/file142.jpg",
"./img/file143.jpg",
"./img/file144.jpg",
"./img/file145.jpg",
"./img/file146.jpg",
"./img/file147.jpg",
"./img/file148.jpg",
"./img/file149.jpg",
"./img/file15.jpg",
"./img/file150.jpg",
"./img/file151.jpg",
"./img/file152.jpg",
"./img/file153.jpg",
"./img/file154.jpg",
"./img/file155.jpg",
"./img/file156.jpg",
"./img/file157.jpg",
"./img/file158.jpg",
"./img/file159.jpg",
"./img/file16.jpg",
"./img/file160.jpg",
"./img/file161.jpg",
"./img/file162.jpg",
"./img/file163.jpg",
"./img/file164.jpg",
"./img/file165.jpg",
"./img/file166.jpg",
"./img/file167.jpg",
"./img/file168.jpg",
"./img/file169.jpg",
"./img/file17.jpg",
"./img/file170.jpg",
"./img/file171.jpg",
"./img/file172.jpg",
"./img/file173.jpg",
"./img/file174.jpg",
"./img/file175.jpg",
"./img/file176.jpg",
"./img/file177.jpg",
"./img/file18.jpg",
"./img/file19.jpg",
"./img/file2.jpg",
"./img/file20.jpg",
"./img/file21.jpg",
"./img/file22.jpg",
"./img/file23.jpg",
"./img/file24.jpg",
"./img/file25.jpg",
"./img/file26.jpg",
"./img/file27.jpg",
"./img/file28.jpg",
"./img/file29.jpg",
"./img/file3.jpg",
"./img/file30.jpg",
"./img/file31.jpg",
"./img/file32.jpg",
"./img/file33.jpg",
"./img/file34.jpg",
"./img/file35.jpg",
"./img/file36.jpg",
"./img/file37.jpg",
"./img/file38.jpg",
"./img/file39.jpg",
"./img/file4.jpg",
"./img/file40.jpg",
"./img/file41.jpg",
"./img/file42.jpg",
"./img/file43.jpg",
"./img/file44.jpg",
"./img/file45.jpg",
"./img/file46.jpg",
"./img/file47.jpg",
"./img/file48.jpg",
"./img/file49.jpg",
"./img/file5.jpg",
"./img/file50.jpg",
"./img/file51.jpg",
"./img/file52.jpg",
"./img/file53.jpg",
"./img/file54.jpg",
"./img/file55.jpg",
"./img/file56.jpg",
"./img/file57.jpg",
"./img/file58.jpg",
"./img/file59.jpg",
"./img/file6.jpg",
"./img/file60.jpg",
"./img/file61.jpg",
"./img/file62.jpg",
"./img/file63.jpg",
"./img/file64.jpg",
"./img/file65.jpg",
"./img/file66.jpg",
"./img/file67.jpg",
"./img/file68.jpg",
"./img/file69.jpg",
"./img/file7.jpg",
"./img/file70.jpg",
"./img/file71.jpg",
"./img/file72.jpg",
"./img/file73.jpg",
"./img/file74.jpg",
"./img/file75.jpg",
"./img/file76.jpg",
"./img/file77.jpg",
"./img/file78.jpg",
"./img/file79.jpg",
"./img/file8.jpg",
"./img/file80.jpg",
"./img/file81.jpg",
"./img/file82.jpg",
"./img/file83.jpg",
"./img/file84.jpg",
"./img/file85.jpg",
"./img/file86.jpg",
"./img/file87.jpg",
"./img/file88.jpg",
"./img/file89.jpg",
"./img/file9.jpg",
"./img/file90.jpg",
"./img/file91.jpg",
"./img/file92.jpg",
"./img/file93.jpg",
"./img/file94.jpg",
"./img/file95.jpg",
"./img/file96.jpg",
"./img/file97.jpg",
"./img/file98.jpg",
"./img/file99.jpg",
"./img/fondo-movil.jpg",
"./img/fondo.jpg",
"./img/oraculo-apolo.jpg",
"./img/oraculo-pitia.jpg",
"./img/presentacion.jpg",
"./index.html",
"./manifest.webmanifest",
"./noche.js",
"./oraculo.js",
"./presentacion.js"
];

self.addEventListener('install', function (evento) {
  evento.waitUntil((async function () {
    const cache = await caches.open(CACHE);
    await cache.addAll(ARCHIVOS.map(function (a) { return new Request(a, { cache: 'reload' }); }));
    /* Una edición nueva NO se pone sola mientras Jaris está abierta (así no se mezclan las dos):
       espera a que la persona pulse «Abrir la edición nueva» (mensaje «activar»), o a que cierre
       Jaris y la vuelva a abrir. La primera vez que se instala se pone enseguida. */
    const ventanas = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
    ventanas.forEach(function (v) { v.postMessage({ tipo: 'guardada', version: VERSION }); });
  })());
});

self.addEventListener('message', function (evento) {
  if (evento.data && evento.data.tipo === 'activar') self.skipWaiting();
});

self.addEventListener('activate', function (evento) {
  evento.waitUntil((async function () {
    for (const nombre of await caches.keys()) {
      if (nombre.indexOf('jaris-') === 0 && nombre !== CACHE) await caches.delete(nombre);
    }
    await self.clients.claim();
  })());
});

async function porTrozos(respuesta, rango) {
  const datos = await respuesta.blob();
  const total = datos.size, tipo = respuesta.headers.get('Content-Type') || 'audio/mpeg';
  const m = rango && /bytes=(\d*)-(\d*)/.exec(rango);
  if (!m) return new Response(datos, { status: 200, headers: { 'Content-Type': tipo, 'Content-Length': String(total), 'Accept-Ranges': 'bytes' } });
  let ini, fin;
  if (m[1] === '') { ini = Math.max(0, total - Number(m[2])); fin = total - 1; }
  else { ini = Number(m[1]); fin = m[2] === '' ? total - 1 : Math.min(Number(m[2]), total - 1); }
  if (ini > fin || ini >= total) return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + total } });
  return new Response(datos.slice(ini, fin + 1), { status: 206, headers: { 'Content-Type': tipo, 'Accept-Ranges': 'bytes',
    'Content-Range': 'bytes ' + ini + '-' + fin + '/' + total, 'Content-Length': String(fin - ini + 1) } });
}

self.addEventListener('fetch', function (evento) {
  if (evento.request.method !== 'GET') return;
  const url = new URL(evento.request.url);
  if (url.origin !== self.location.origin) return;
  /* Audios: si está descargado (caché «audios-jaris»), se sirve desde el dispositivo, por trozos
     («Range»), para que Safari lo reproduzca y se pueda avanzar; si no, por internet. */
  if (url.pathname.indexOf('/audios/') >= 0) {
    evento.respondWith((async function () {
      try {
        const cache = await caches.open('audios-jaris');
        const guardado = (await cache.match(url.href)) || (url.search ? null : await cache.match(evento.request, { ignoreSearch: true }));
        if (guardado) return await porTrozos(guardado, evento.request.headers.get('range'));
      } catch (e) { /* se prueba por internet */ }
      return fetch(evento.request);
    })());
    return;
  }
  evento.respondWith((async function () {
    const cache = await caches.open(CACHE);
    const guardado = await cache.match(evento.request, { ignoreSearch: true });
    if (guardado) return guardado;
    if (evento.request.mode === 'navigate') {
      const inicio = await cache.match('./');
      if (inicio) return inicio;
    }
    return fetch(evento.request);
  })());
});
