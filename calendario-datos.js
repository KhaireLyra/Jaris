/* Jaris: datos del calendario (paso 2a-2), sacados del capítulo 8 del libro.
   SI CAMBIA EL CAPÍTULO 8 (días sagrados o fiestas), HAY QUE CAMBIARLO TAMBIÉN AQUÍ.
   mes: nombre del mes; desde/hasta: días ('ultimo' = el último día, 29 o 30); sin desde = no se sabe el día.
   campo: fiesta del campo (se mueve en el calendario mixto del hemisferio sur). nota: fecha probable, moderna... */
'use strict';
(function (global) {
  const DIAS_SAGRADOS = [
    { dia: 1, texto: 'Noumenia (se dice «numinía»): la luna nueva visible, el día más sagrado del mes' },
    { dia: 2, texto: 'Agathos Daimon (se dice «agazós démon»), el buen espíritu de la casa' },
    { dia: 3, texto: 'Nacimiento de Atenea' },
    { dia: 4, texto: 'Hermes, Afrodita, Heracles y Eros' },
    { dia: 5, texto: 'Horkos y las Erinias, día desfavorable', nota: 'según Hesíodo, no de Atenas' },
    { dia: 6, texto: 'Nacimiento de Ártemis' },
    { dia: 7, texto: 'Nacimiento de Apolo' },
    { dia: 8, texto: 'Poseidón y Teseo' },
    { dia: 9, texto: 'Rea, Helios y las Musas', nota: 'costumbre moderna' },
    { dia: 15, texto: 'Luna llena: Atenea', nota: 'costumbre moderna' },
    { dia: 16, texto: 'Ártemis', nota: 'dudoso como día de cada mes' },
    { dia: 21, texto: 'Atenea', nota: 'costumbre moderna' },
    { dia: 22, texto: 'Atenea', nota: 'costumbre moderna' },
    { dia: 28, texto: 'Atenea', nota: 'costumbre moderna' },
    { dia: 'ultimo', texto: 'Deipnon de Hécate (se dice «dípnon») y recuerdo de los difuntos' }
  ];

  const FIESTAS = [
    { mes: 'Hekatombaion', desde: 1, nombre: 'Año Nuevo', texto: 'el primer día del año griego' },
    { mes: 'Hekatombaion', desde: 7, nombre: 'Hekatombaia (se dice «ekatómvea»)', texto: 'Apolo Hekatombaios', nota: 'fecha probable' },
    { mes: 'Hekatombaion', desde: 12, nombre: 'Kronia (se dice «krónia»)', texto: 'fiesta de Crono' },
    { mes: 'Hekatombaion', desde: 15, hasta: 16, nombre: 'Synoikia', texto: 'la unión de los pueblos de Ática; el 16, Zeus Phratrios y Atenea Phratria' },
    { mes: 'Hekatombaion', desde: 23, hasta: 'ultimo', nombre: 'Panateneas', texto: 'la gran fiesta de Atenea, sobre todo el día 28, su cumpleaños' },
    { mes: 'Metageitnion', nombre: 'Metageitnia (se dice «metayítnia»)', texto: 'Apolo, protector de los vecinos' },
    { mes: 'Metageitnion', desde: 15, hasta: 18, nombre: 'Eleusinias', texto: 'Deméter, con juegos', nota: 'fecha probable' },
    { mes: 'Boedromion', desde: 2, nombre: 'Niketeria', texto: 'la victoria de Atenea sobre Poseidón' },
    { mes: 'Boedromion', desde: 5, nombre: 'Genesia (se dice «yenésia»)', texto: 'los difuntos y los antepasados' },
    { mes: 'Boedromion', desde: 6, nombre: 'Artemis Agrotera', texto: 'Ártemis cazadora, en recuerdo de Maratón' },
    { mes: 'Boedromion', desde: 7, nombre: 'Boedromia (se dice «voidrómia»)', texto: 'Apolo', nota: 'fecha probable' },
    { mes: 'Boedromion', desde: 15, hasta: 23, nombre: 'Grandes Misterios de Eleusis', texto: 'Deméter y Perséfone' },
    { mes: 'Boedromion', desde: 17, nombre: 'Epidauria (se dice «epidávria»)', texto: 'Asclepio', nota: 'día 17 o 18' },
    { mes: 'Boedromion', desde: 22, nombre: 'Plemochoai', texto: 'el rito final de los Misterios, de lluvia y fertilidad' },
    { mes: 'Pyanepsion', desde: 6, nombre: 'Proerosia (se dice «proirósia»)', texto: 'Deméter, antes de la siembra', nota: 'fecha probable', campo: true },
    { mes: 'Pyanepsion', desde: 7, nombre: 'Pyanepsia (se dice «pianépsia»)', texto: 'Apolo; guiso de legumbres y la eiresione', campo: true },
    { mes: 'Pyanepsion', desde: 7, nombre: 'Oschophoria (se dice «osjofória»)', texto: 'Dioniso y Atenea, con racimos de uvas', nota: 'no se sabe el día exacto', campo: true },
    { mes: 'Pyanepsion', desde: 8, nombre: 'Theseia (se dice «zisía»)', texto: 'el héroe Teseo' },
    { mes: 'Pyanepsion', desde: 9, nombre: 'Stenia (se dice «stínia»)', texto: 'mujeres, en honor a Deméter y Perséfone' },
    { mes: 'Pyanepsion', desde: 11, hasta: 13, nombre: 'Tesmoforias', texto: 'la gran fiesta de mujeres a Deméter Tesmófora' },
    { mes: 'Pyanepsion', nombre: 'Apaturia (se dice «apatúria»)', texto: 'las familias y las fratrías, a finales del mes' },
    { mes: 'Pyanepsion', desde: 'ultimo', nombre: 'Calquias', texto: 'los artesanos: Atenea Ergane y Hefesto' },
    { mes: 'Maimakterion', desde: 5, hasta: 6, nombre: 'Katallageia (se dice «katalayía»)', texto: 'la reconciliación de Hefesto y Hera', nota: 'fiesta moderna' },
    { mes: 'Maimakterion', nombre: 'Maimakteria (se dice «memaktíria»)', texto: 'Zeus Maimaktes, para un invierno suave', nota: 'dudosa' },
    { mes: 'Maimakterion', nombre: 'Pompaia (se dice «pombéa»)', texto: 'purificación con procesión' },
    { mes: 'Poseideon', desde: 8, nombre: 'Poseideia (se dice «posídia»)', texto: 'Poseidón', nota: 'fecha probable' },
    { mes: 'Poseideon', nombre: 'Dionisias rurales', texto: 'Dioniso, a lo largo del mes' },
    { mes: 'Poseideon', desde: 26, nombre: 'Haloa (se dice «alóa»)', texto: 'mujeres, a Deméter, Perséfone y Dioniso', campo: true },
    { mes: 'Gamelion', desde: 12, hasta: 15, nombre: 'Leneas', texto: 'Dioniso, con teatro', nota: 'del 12 al 15, como muchos calendarios de hoy' },
    { mes: 'Gamelion', desde: 27, nombre: 'Theogamia o Hieros Gamos', texto: 'la boda sagrada de Zeus y Hera' },
    { mes: 'Anthesterion', desde: 11, hasta: 13, nombre: 'Antesterias', texto: 'la gran fiesta de primavera de Dioniso; el último día, los difuntos', campo: true },
    { mes: 'Anthesterion', desde: 20, hasta: 26, nombre: 'Misterios Menores', texto: 'Perséfone y Deméter', nota: 'al menos tres días entre el 20 y el 26' },
    { mes: 'Anthesterion', desde: 23, nombre: 'Diasia', texto: 'Zeus Meilichios, protector de las familias' },
    { mes: 'Elaphebolion', desde: 6, nombre: 'Elaphebolia (se dice «elafivólia»)', texto: 'Ártemis cazadora de ciervos', nota: 'fecha moderna' },
    { mes: 'Elaphebolion', desde: 8, nombre: 'Asklepieia (se dice «asklipiía»)', texto: 'Asclepio' },
    { mes: 'Elaphebolion', desde: 10, hasta: 17, nombre: 'Grandes Dionisias', texto: 'la gran fiesta del teatro', nota: 'fechas aproximadas' },
    { mes: 'Elaphebolion', nombre: 'Pandia (se dice «pándia»)', texto: 'Zeus' },
    { mes: 'Mounichion', desde: 6, nombre: 'Delphinia (se dice «delfínia»)', texto: 'Apolo Delfinio' },
    { mes: 'Mounichion', desde: 16, nombre: 'Mounichia (se dice «muníjia»)', texto: 'Ártemis, con pasteles rodeados de velas pequeñas' },
    { mes: 'Mounichion', desde: 19, nombre: 'Olympieia (se dice «olimbíia»)', texto: 'Zeus Olímpico' },
    { mes: 'Thargelion', desde: 6, hasta: 7, nombre: 'Thargelia (se dice «zaryília»)', texto: 'Apolo y Ártemis, con los primeros frutos', campo: true },
    { mes: 'Thargelion', desde: 19, nombre: 'Bendideia (se dice «vendídia»)', texto: 'la diosa tracia Bendis' },
    { mes: 'Thargelion', desde: 24, hasta: 28, nombre: 'Kallynteria (se dice «kalindíria»)', texto: 'limpieza del templo de Atenea', nota: 'fecha aproximada' },
    { mes: 'Thargelion', desde: 25, nombre: 'Plynteria (se dice «plindíria»)', texto: 'se lavaba la estatua antigua de Atenea', nota: 'hacia el día 25' },
    { mes: 'Skirophorion', desde: 3, nombre: 'Arreforia (se dice «arifória»)', texto: 'ritual secreto de muchachas para Atenea', nota: 'fecha probable' },
    { mes: 'Skirophorion', desde: 12, nombre: 'Skira', texto: 'Deméter, Perséfone y Atenea', campo: true },
    { mes: 'Skirophorion', desde: 14, nombre: 'Dipolieia (se dice «dipolíia») o Bouphonia', texto: 'Zeus Polieus, protector de la ciudad' }
  ];
  /* Fiestas que van con el sol, no con la luna. */
  const FIESTAS_DEL_SOL = [
    { solsticio: 'invierno', nombre: 'Heliogenna', texto: 'el solsticio de invierno', nota: 'fiesta moderna' },
    { solsticio: 'verano', nombre: 'Prometheia y Herakleia', texto: 'Prometeo y Heracles, como las celebra YSEE', nota: 'forma moderna' }
  ];
  /* Calendario mixto del hemisferio sur: cada mes y el que está seis meses después. */
  const PAREJAS = { Hekatombaion: 'Gamelion', Metageitnion: 'Anthesterion', Boedromion: 'Elaphebolion',
    Pyanepsion: 'Mounichion', Maimakterion: 'Thargelion', Poseideon: 'Skirophorion' };
  for (const k of Object.keys(PAREJAS)) PAREJAS[PAREJAS[k]] = k;

  /* Lugares para calcular el calendario: la persona elige uno (no se usa la ubicación del dispositivo).
     País, ciudad, latitud, longitud (este positivo) y zona horaria. */
  const L = function (pais, nombre, lat, lon, zona) {
    return { id: (pais + '-' + nombre).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-'), pais: pais, nombre: nombre, lat: lat, lon: lon, zona: zona };
  };
  const LUGARES = [
    L('España', 'Madrid', 40.42, -3.70, 'Europe/Madrid'), L('España', 'Barcelona', 41.39, 2.17, 'Europe/Madrid'),
    L('España', 'Valencia', 39.47, -0.38, 'Europe/Madrid'), L('España', 'Sevilla', 37.39, -5.98, 'Europe/Madrid'),
    L('España', 'Málaga', 36.72, -4.42, 'Europe/Madrid'), L('España', 'Granada', 37.18, -3.60, 'Europe/Madrid'),
    L('España', 'Murcia', 37.98, -1.13, 'Europe/Madrid'), L('España', 'Alicante', 38.35, -0.48, 'Europe/Madrid'),
    L('España', 'Zaragoza', 41.65, -0.88, 'Europe/Madrid'), L('España', 'Bilbao', 43.26, -2.93, 'Europe/Madrid'),
    L('España', 'Oviedo', 43.36, -5.85, 'Europe/Madrid'), L('España', 'A Coruña', 43.36, -8.41, 'Europe/Madrid'),
    L('España', 'Valladolid', 41.65, -4.72, 'Europe/Madrid'), L('España', 'Badajoz', 38.88, -6.97, 'Europe/Madrid'),
    L('España', 'Palma', 39.57, 2.65, 'Europe/Madrid'), L('España', 'Las Palmas de Gran Canaria', 28.12, -15.44, 'Atlantic/Canary'),
    L('España', 'Santa Cruz de Tenerife', 28.46, -16.25, 'Atlantic/Canary'),
    L('México', 'Ciudad de México', 19.43, -99.13, 'America/Mexico_City'), L('México', 'Guadalajara', 20.67, -103.35, 'America/Mexico_City'),
    L('México', 'Monterrey', 25.69, -100.32, 'America/Monterrey'), L('México', 'Mérida', 20.97, -89.62, 'America/Merida'),
    L('México', 'Tijuana', 32.51, -117.04, 'America/Tijuana'), L('México', 'Cancún', 21.16, -86.85, 'America/Cancun'),
    L('Guatemala', 'Ciudad de Guatemala', 14.63, -90.51, 'America/Guatemala'),
    L('El Salvador', 'San Salvador', 13.69, -89.22, 'America/El_Salvador'),
    L('Honduras', 'Tegucigalpa', 14.07, -87.19, 'America/Tegucigalpa'),
    L('Nicaragua', 'Managua', 12.11, -86.24, 'America/Managua'),
    L('Costa Rica', 'San José', 9.93, -84.08, 'America/Costa_Rica'),
    L('Panamá', 'Ciudad de Panamá', 8.98, -79.52, 'America/Panama'),
    L('Cuba', 'La Habana', 23.11, -82.37, 'America/Havana'),
    L('República Dominicana', 'Santo Domingo', 18.49, -69.93, 'America/Santo_Domingo'),
    L('Puerto Rico', 'San Juan', 18.47, -66.11, 'America/Puerto_Rico'),
    L('Colombia', 'Bogotá', 4.71, -74.07, 'America/Bogota'), L('Colombia', 'Medellín', 6.24, -75.58, 'America/Bogota'),
    L('Colombia', 'Cali', 3.45, -76.53, 'America/Bogota'), L('Colombia', 'Barranquilla', 10.96, -74.80, 'America/Bogota'),
    L('Venezuela', 'Caracas', 10.49, -66.88, 'America/Caracas'), L('Venezuela', 'Maracaibo', 10.65, -71.64, 'America/Caracas'),
    L('Ecuador', 'Quito', -0.18, -78.47, 'America/Guayaquil'), L('Ecuador', 'Guayaquil', -2.17, -79.92, 'America/Guayaquil'),
    L('Perú', 'Lima', -12.05, -77.04, 'America/Lima'), L('Perú', 'Arequipa', -16.41, -71.54, 'America/Lima'),
    L('Bolivia', 'La Paz', -16.50, -68.15, 'America/La_Paz'), L('Bolivia', 'Santa Cruz de la Sierra', -17.78, -63.18, 'America/La_Paz'),
    L('Paraguay', 'Asunción', -25.26, -57.58, 'America/Asuncion'),
    L('Uruguay', 'Montevideo', -34.90, -56.16, 'America/Montevideo'),
    L('Chile', 'Santiago', -33.45, -70.67, 'America/Santiago'), L('Chile', 'Concepción', -36.83, -73.05, 'America/Santiago'),
    L('Chile', 'Punta Arenas', -53.16, -70.91, 'America/Punta_Arenas'),
    L('Argentina', 'Buenos Aires', -34.60, -58.38, 'America/Argentina/Buenos_Aires'),
    L('Argentina', 'Córdoba', -31.42, -64.18, 'America/Argentina/Cordoba'),
    L('Argentina', 'Rosario', -32.95, -60.64, 'America/Argentina/Cordoba'),
    L('Argentina', 'Mendoza', -32.89, -68.83, 'America/Argentina/Mendoza'),
    L('Argentina', 'Ushuaia', -54.80, -68.30, 'America/Argentina/Ushuaia'),
    L('Brasil', 'São Paulo', -23.55, -46.63, 'America/Sao_Paulo'), L('Brasil', 'Río de Janeiro', -22.91, -43.17, 'America/Sao_Paulo'),
    L('Estados Unidos', 'Nueva York', 40.71, -74.01, 'America/New_York'), L('Estados Unidos', 'Miami', 25.76, -80.19, 'America/New_York'),
    L('Estados Unidos', 'Chicago', 41.88, -87.63, 'America/Chicago'), L('Estados Unidos', 'Houston', 29.76, -95.37, 'America/Chicago'),
    L('Estados Unidos', 'Los Ángeles', 34.05, -118.24, 'America/Los_Angeles'),
    L('Canadá', 'Toronto', 43.65, -79.38, 'America/Toronto'),
    L('Guinea Ecuatorial', 'Malabo', 3.75, 8.78, 'Africa/Malabo'),
    L('Grecia', 'Atenas', 37.98, 23.73, 'Europe/Athens'), L('Andorra', 'Andorra la Vella', 42.51, 1.52, 'Europe/Andorra'),
    L('Portugal', 'Lisboa', 38.72, -9.14, 'Europe/Lisbon'), L('Francia', 'París', 48.86, 2.35, 'Europe/Paris'),
    L('Italia', 'Roma', 41.90, 12.50, 'Europe/Rome'), L('Reino Unido', 'Londres', 51.51, -0.13, 'Europe/London'),
    L('Alemania', 'Berlín', 52.52, 13.40, 'Europe/Berlin'), L('Suiza', 'Zúrich', 47.38, 8.54, 'Europe/Zurich'),
    L('Australia', 'Sídney', -33.87, 151.21, 'Australia/Sydney')
  ];

  global.JarisDatosCalendario = { DIAS_SAGRADOS: DIAS_SAGRADOS, FIESTAS: FIESTAS, FIESTAS_DEL_SOL: FIESTAS_DEL_SOL,
    PAREJAS: PAREJAS, LUGARES: LUGARES };
})(typeof self !== 'undefined' ? self : this);
