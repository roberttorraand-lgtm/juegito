// =====================================================================
//  EPISODIO 1 – LA DISTORSIÓN EXTERNA
//  Guion convertido en pasos. Tipos de paso:
//    { card, sub }            tarjeta de escena (espera clic)
//    { bg }                   cambia el fondo
//    { set: {...} }           cambia el estado del escenario
//    { actors: {id: {...}} }  coloca/quita personajes (null = quitar)
//    { say, who, text }       línea de diálogo (who = quién habla, para animación y voz)
//    { narr }                 narración (texto en cursiva)
//    { scream }               grito (texto rojo + temblor)
//    { fx, color, ms }        efectos: shake | flash | glitch
//    { sfx }                  sonido
//    { fade: 'out'|'in', ms } fundido a negro / desde negro
//    { wait }                 espera en milisegundos
//    { end }                  fin del episodio
// =====================================================================
const LOB = { kind: 'fig', hat: 'headset' };
const GON = { kind: 'fig', hat: 'cap' };

const STORY = [
  { card: 'ESCENA 1', sub: 'Discord · Llamada en el grupo «Picha Brava»' },
  { bg: 'call' },
  { fade: 'in', ms: 800 },
  { narr: '2 amigos de hace años están en llamada en Discord. Están una noche como cualquier otra jugando a un juego del universo Project Moon...' },
  { narr: 'Ellos empiezan a sacar teorías de una actualización.' },

  { say: 'LOBELTO', who: 'lobelto', text: 'Hermano yo creo que si o si en el canto 10 sacan un E.G.O Aleph porque si' },
  { say: 'GONZA', who: 'gonza', text: 'Posiblemente cabrón, pero a saber que puta mierda sacan ahora' },
  { say: 'LOBELTO', who: 'lobelto', text: 'Tu confia bro, si o si sale, 100% rial no feik' },
  { say: 'GONZA', who: 'gonza', text: 'Por favor que saquen un E.G.O gud bais, les mamo la polla si lo hacen' },
  { say: 'LOBELTO', who: 'lobelto', text: 'Hermano luego dices que no te llamemos gay, con razón saliste a tu padre' },
  { say: 'GONZA', who: 'gonza', text: 'Tu puta madre lobelto, ojito se viene momento gambling....' },
  { say: 'GONZA', who: 'gonza', text: 'LOBELTO MIRA ESTO' },

  { bg: 'share' },
  { sfx: 'gacha' },
  { fx: 'flash', color: '#ffe28a', ms: 400 },
  { narr: 'Gonza cerró la pestaña del juego y abrió Discord para compartir pantalla: le habían tocado 2 personajes de 3 estrellas.' },
  { set: { silent: 'lobelto' } },
  { narr: 'Curiosamente, no se escuchaba a Lobelto quejarse ni decir la más mínima palabra, cuando habitualmente se habría cagado en toda la existencia de Gonza.' },

  { bg: 'call' },
  { say: 'GONZA', who: 'gonza', text: 'Bro lobelto estas bien?' },
  { say: 'LOBELTO', who: 'lobelto', text: '. . . .' },
  { wait: 600 },
  { set: { silent: null, glitch: 'lobelto' } },
  { sfx: 'scream' },
  { fx: 'shake', ms: 1200 },
  { fx: 'flash', color: '#ff2a3c', ms: 500 },
  { scream: '*Gritó con furia indesatable*' },
  { say: 'LOBELTO', who: 'lobelto', text: 'GONZA AYUDA O QUIEN CO-', cut: true },
  { sfx: 'disconnect' },
  { set: { glitch: null, offline: { lobelto: true } } },
  { wait: 500 },
  { say: 'GONZA', who: 'gonza', text: 'Lobelto, deja tus putas bromas de mierda con el panel de sonidos eh' },
  { say: 'GONZA', who: 'gonza', text: 'de verdad lobelto de verdad eh. . . . .' },
  { wait: 400 },
  { sfx: 'thud' },
  { fx: 'shake', ms: 300 },
  { narr: 'Gonza escuchó algo dudosamente pesado caer detrás suyo.' },

  // ---- La habitación de Gonza ----
  { fade: 'out', ms: 500 },
  { bg: 'room' },
  { actors: { gonza: { ...GON, x: 92, y: 140, face: -1 } } },
  { fade: 'in', ms: 500 },
  { narr: 'Lentamente, Gonza se giró...' },
  { actors: {
      gonza: { ...GON, x: 92, y: 140, face: 1 },
      corrupted: { kind: 'corrupted', x: 232, y: 140 },
      lobelto: { ...LOB, x: 204, y: 108, face: -1, lifted: true, shake: true, pain: true },
  } },
  { sfx: 'scream' },
  { fx: 'shake', ms: 600 },
  { narr: 'Era Lobelto, sujetado por una figura que alguna vez fue humana: un empleado consumido por su propio traje E.G.O., con el arma fundida a su brazo como una hoja dentada.' },
  { actors: { gonza: { ...GON, x: 92, y: 140, face: 1, shake: true, pain: true } } },
  { narr: 'Gonza gritó con un inmenso terror, pensando que eso era un sueño.' },
  { narr: 'Lobelto, en un intento desesperado, tomó una taza que había cerca...' },
  { set: { mugGone: true } },
  { sfx: 'hit' },
  { fx: 'flash', color: '#ffffff', ms: 250 },
  { fx: 'shake', ms: 400 },
  { actors: { corrupted: { kind: 'corrupted', x: 232, y: 140, blind: true, rage: true } } },
  { narr: '...y se la estampó en la cara a esa cosa.' },
  { sfx: 'slash' },
  { fx: 'flash', color: '#ff2a3c', ms: 450 },
  { fx: 'shake', ms: 500 },
  { actors: { lobelto: { ...LOB, x: 186, y: 140, face: -1, armless: true, pain: true, shake: true } } },
  { narr: 'Aunque su intento de acto heroico le costó la mitad del brazo, que por una extraña razón no sangraba por las fuertes quemaduras que dejó ese corte.' },
  { sfx: 'scream' },
  { narr: 'Los gemidos de dolor de la criatura y de Lobelto resonaban por la habitación.' },
  { narr: 'La criatura, cegada por la taza, lanzó un tajo desesperado con su arma...' },
  { sfx: 'rift' },
  { set: { rift: { x: 150, y: 96, w: 0, h: 110, target: 60 } } },
  { fx: 'shake', ms: 2000 },
  { wait: 1200 },
  { narr: '...abriendo una brecha en el propio espacio, que se llevaría a Gonza y a Lobelto a un lugar desconocido.' },
  { set: { rift: { x: 150, y: 96, w: 60, h: 110, target: 400 } } },
  { fx: 'flash', color: '#f0e8ff', ms: 1500 },
  { wait: 900 },
  { fade: 'out', ms: 1200 },
  { actors: { gonza: null, lobelto: null, corrupted: null } },
  { set: { rift: null, mugGone: false } },
  { wait: 800 },

  // ---- Escena 2 ----
  { card: 'ESCENA 2', sub: '¿¿¿??? · Entrada a una vieja sucursal de la L.Corp' },
  { bg: 'branch' },
  { actors: {
      lobelto: { ...LOB, x: 112, y: 150, face: 1, armless: true, sitting: true },
      gonza: { ...GON, x: 206, y: 150, face: -1 },
  } },
  { fade: 'in', ms: 1200 },
  { narr: 'Lobelto y Gonza miraron a sus alrededores, intentando manejar un poco la situación, empezando a golpearse cada uno a sí mismo para ver si esto era un sueño.' },
  { narr: 'El silencio entre los 2 dejaba un gran vacío. Lobelto estaba vendando con un pedazo de su ropa el muñón, mientras Gonza estaba de pie mirando los alrededores.' },
  { say: 'GONZA', who: 'gonza', text: 'Illo, esto parecerá raro y un chiste pero creo que tenemos delante la puta L corp' },
  { say: 'GONZA', who: 'gonza', text: 'o mínimo una de esas mierdas pequeñas suyas como la del canto I o II o no se cual mierdas era. . .' },
  { actors: { lobelto: { ...LOB, x: 112, y: 150, face: 1, armless: true } } },
  { say: 'LOBELTO', who: 'lobelto', text: 'Hermano, estamos en la putisima mierda como bos quedemos aqui afuera, hecha pa dentro' },
  { say: 'LOBELTO', who: 'lobelto', text: 'que prefiero morir por un vicho raro antes que me agan sufrir arrancandome incluso los ojos de cejata que llevo' },
  { say: 'GONZA', who: 'gonza', text: 'Pero Lobelto, no habra un gud bais ahi dentro?' },
  { say: 'LOBELTO', who: 'lobelto', text: 'Me la putisimo pela sabes? Ahi mínimo tendremos aunque sea un palo o algo pa\' defendernos' },
  { actors: {
      lobelto: { ...LOB, x: 140, y: 150, face: 1, armless: true },
      gonza: { ...GON, x: 180, y: 150, face: -1 },
  } },
  { narr: 'Los dos se acercaron a la pesada puerta de la sucursal...' },
  { fade: 'out', ms: 1500 },
  { end: true },
];
