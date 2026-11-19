/* =========================================================
   HUELLITAS — Datos de ejemplo
   Acá podés agregar, sacar o editar animales y categorías.
   ========================================================= */

// Categorías (el "kw" es la palabra que se usa para buscar fotos)
window.CATEGORIES = [
  { id: 'todos',    label: 'Todos', one: 'Animal',    emoji: '🐾' },
  { id: 'perros',   label: 'Perros', one: 'Perro',   emoji: '🐶', kw: 'dog' },
  { id: 'gatos',    label: 'Gatos', one: 'Gato',    emoji: '🐱', kw: 'cat' },
  { id: 'conejos',  label: 'Conejos', one: 'Conejo',  emoji: '🐰', kw: 'rabbit' },
  { id: 'aves',     label: 'Aves', one: 'Ave',     emoji: '🦜', kw: 'parrot' },
  { id: 'roedores', label: 'Roedores', one: 'Roedor', emoji: '🐹', kw: 'hamster' },
  { id: 'reptiles', label: 'Reptiles', one: 'Reptil', emoji: '🦎', kw: 'lizard' },
  { id: 'caballos', label: 'Caballos', one: 'Caballo', emoji: '🐴', kw: 'horse' },
];

/*
  Cada perfil:
  - photos: números "lock" para que la foto sea siempre la misma
  - likesYou: true = ya te dio like (aparece en la pestaña "Likes" y es match seguro)
  - chance: probabilidad de match cuando le das like (0 a 1)
*/
window.PROFILES = [
  // ---------- PERROS ----------
  { id: 'p1', name: 'Luna', species: 'perros', age: '3 años', breed: 'Golden Retriever', distance: 2,
    bio: 'Amo las pelotas de tenis, el agua y que me rasquen la panza. Busco compañero para correr en el parque 🎾',
    interests: ['Parque', 'Natación', 'Pelotas', 'Siestas'], photos: [101, 102, 103], likesYou: true, chance: 0.6 },
  { id: 'p2', name: 'Rocco', species: 'perros', age: '5 años', breed: 'Bulldog Francés', distance: 4,
    bio: 'Ronco fuerte pero tengo un gran corazón. Fan de los snacks y del sillón.',
    interests: ['Sillón', 'Snacks', 'Netflix'], photos: [104, 105], likesYou: false, chance: 0.5 },
  { id: 'p3', name: 'Maya', species: 'perros', age: '2 años', breed: 'Border Collie', distance: 7,
    bio: 'Inteligente, hiperactiva y muy buena atajando frisbees. Si no te gusta caminar, no hagas swipe 😅',
    interests: ['Frisbee', 'Agility', 'Montaña'], photos: [106, 107, 108], likesYou: false, chance: 0.4 },
  { id: 'p4', name: 'Toto', species: 'perros', age: '8 meses', breed: 'Mestizo', distance: 1,
    bio: 'Cachorro rescatado. Me como las zapatillas pero lo compenso con amor infinito ❤️',
    interests: ['Morder cosas', 'Jugar', 'Mimos'], photos: [109, 110], likesYou: true, chance: 0.7 },
  { id: 'p5', name: 'Kira', species: 'perros', age: '4 años', breed: 'Husky Siberiano', distance: 12,
    bio: 'Aúllo cuando escucho ambulancias. Me encanta el frío y odio los baños.',
    interests: ['Nieve', 'Aullar', 'Correr'], photos: [111, 112, 113], likesYou: false, chance: 0.45 },
  { id: 'p6', name: 'Bruno', species: 'perros', age: '6 años', breed: 'Labrador', distance: 9,
    bio: 'Perro de terapia certificado. Tranquilo, educado y con muchas ganas de conocerte.',
    interests: ['Terapia', 'Paseos', 'Comida'], photos: [114, 115], likesYou: false, chance: 0.55 },

  // ---------- GATOS ----------
  { id: 'g1', name: 'Michi', species: 'gatos', age: '2 años', breed: 'Siamés', distance: 3,
    bio: 'Te voy a ignorar el 90% del tiempo, pero el otro 10% vale la pena 😼',
    interests: ['Cajas', 'Ventanas', 'Ignorar'], photos: [201, 202, 203], likesYou: true, chance: 0.5 },
  { id: 'g2', name: 'Oliva', species: 'gatos', age: '1 año', breed: 'Persa', distance: 5,
    bio: 'Princesa de la casa. Busco a alguien que respete mi espacio y mis horarios de siesta.',
    interests: ['Siesta', 'Cepillado', 'Sol'], photos: [204, 205], likesYou: false, chance: 0.35 },
  { id: 'g3', name: 'Garfield', species: 'gatos', age: '7 años', breed: 'Naranja común', distance: 2,
    bio: 'Odio los lunes. Amo la lasaña. Un neurona y mucha actitud.',
    interests: ['Comer', 'Lunes no', 'Tirar cosas'], photos: [206, 207, 208], likesYou: false, chance: 0.6 },
  { id: 'g4', name: 'Nala', species: 'gatos', age: '3 años', breed: 'Maine Coon', distance: 15,
    bio: 'Grande, peluda y muy cariñosa. Ronroneo como un motor 🚗',
    interests: ['Ronronear', 'Mimos', 'Plumas'], photos: [209, 210], likesYou: true, chance: 0.55 },
  { id: 'g5', name: 'Salem', species: 'gatos', age: '4 años', breed: 'Negro común', distance: 6,
    bio: 'Traigo buena suerte, no hagas caso a los mitos. Cazador nocturno de medias.',
    interests: ['Noche', 'Cazar', 'Misterio'], photos: [211, 212, 213], likesYou: false, chance: 0.45 },

  // ---------- CONEJOS ----------
  { id: 'c1', name: 'Copito', species: 'conejos', age: '1 año', breed: 'Cabeza de León', distance: 4,
    bio: 'Suave como una nube. Mi comida favorita es el perejil 🌿',
    interests: ['Perejil', 'Saltar', 'Esconderme'], photos: [301, 302], likesYou: true, chance: 0.6 },
  { id: 'c2', name: 'Tambor', species: 'conejos', age: '2 años', breed: 'Belier', distance: 8,
    bio: 'Golpeo el piso con la pata cuando me emociono. Busco amigue para hacer binkies.',
    interests: ['Binkies', 'Zanahorias', 'Túneles'], photos: [303, 304, 305], likesYou: false, chance: 0.5 },
  { id: 'c3', name: 'Pelusa', species: 'conejos', age: '3 años', breed: 'Rex', distance: 11,
    bio: 'Tímida al principio, pero después no me despego. Paciencia y lechuga 🥬',
    interests: ['Lechuga', 'Calma', 'Mimos'], photos: [306, 307], likesYou: false, chance: 0.4 },

  // ---------- AVES ----------
  { id: 'a1', name: 'Pepe', species: 'aves', age: '4 años', breed: 'Loro Hablador', distance: 3,
    bio: 'Sé decir "hola", "Pepe lindo" y algunas cosas que no puedo repetir acá 🦜',
    interests: ['Hablar', 'Silbar', 'Semillas'], photos: [401, 402, 403], likesYou: true, chance: 0.65 },
  { id: 'a2', name: 'Kiwi', species: 'aves', age: '1 año', breed: 'Periquito', distance: 6,
    bio: 'Chiquito pero ruidoso. Canto todas las mañanas, perdón por adelantado ☀️',
    interests: ['Cantar', 'Espejos', 'Mañanas'], photos: [404, 405], likesYou: false, chance: 0.5 },
  { id: 'a3', name: 'Mango', species: 'aves', age: '6 años', breed: 'Cacatúa', distance: 14,
    bio: 'Bailo cuando suena música. Mi cresta dice todo lo que siento.',
    interests: ['Bailar', 'Música', 'Frutas'], photos: [406, 407, 408], likesYou: false, chance: 0.45 },

  // ---------- ROEDORES ----------
  { id: 'r1', name: 'Bolita', species: 'roedores', age: '1 año', breed: 'Hámster Sirio', distance: 2,
    bio: 'Guardo comida en los cachetes por si hay crisis. Corro 5 km por noche en mi ruedita 🏃',
    interests: ['Ruedita', 'Semillas', 'Noche'], photos: [501, 502], likesYou: true, chance: 0.6 },
  { id: 'r2', name: 'Chispa', species: 'roedores', age: '2 años', breed: 'Cobayo', distance: 5,
    bio: 'Hago "uic uic" cuando abrís la heladera. Busco compañía para comer heno juntos.',
    interests: ['Heno', 'Uic uic', 'Verduras'], photos: [503, 504, 505], likesYou: false, chance: 0.55 },
  { id: 'r3', name: 'Ratatouille', species: 'roedores', age: '1 año', breed: 'Rata Dumbo', distance: 9,
    bio: 'Chef aficionado. Muy inteligente y limpio, aunque no me creas 👨‍🍳',
    interests: ['Cocina', 'Trucos', 'Queso'], photos: [506, 507], likesYou: false, chance: 0.5 },

  // ---------- REPTILES ----------
  { id: 'x1', name: 'Rex', species: 'reptiles', age: '5 años', breed: 'Dragón Barbudo', distance: 7,
    bio: 'Me gusta tomar sol y mirar fijo. No es que te juzgue, es mi cara.',
    interests: ['Sol', 'Grillos', 'Mirar fijo'], photos: [601, 602, 603], likesYou: true, chance: 0.5 },
  { id: 'x2', name: 'Manuelita', species: 'reptiles', age: '40 años', breed: 'Tortuga terrestre', distance: 18,
    bio: 'Sin apuro. Busco una relación lenta pero duradera 🐢',
    interests: ['Lechuga', 'Paciencia', 'Viajar'], photos: [604, 605], likesYou: false, chance: 0.6 },
  { id: 'x3', name: 'Camaleón Leo', species: 'reptiles', age: '3 años', breed: 'Camaleón Velado', distance: 10,
    bio: 'Cambio de color según mi humor. Si me ponés verde, es que me gustás 💚',
    interests: ['Colores', 'Ramas', 'Insectos'], photos: [606, 607], likesYou: false, chance: 0.4 },

  // ---------- CABALLOS ----------
  { id: 'h1', name: 'Tornado', species: 'caballos', age: '9 años', breed: 'Criollo', distance: 25,
    bio: 'Campo, galope y mates al atardecer. Gaucho de alma 🌅',
    interests: ['Galopar', 'Campo', 'Manzanas'], photos: [701, 702, 703], likesYou: false, chance: 0.5 },
  { id: 'h2', name: 'Estrella', species: 'caballos', age: '6 años', breed: 'Árabe', distance: 32,
    bio: 'Elegante y un poco dramática. Me encanta que me trencen la crin.',
    interests: ['Crin', 'Saltos', 'Zanahorias'], photos: [704, 705], likesYou: true, chance: 0.55 },
  { id: 'h3', name: 'Pony Pancho', species: 'caballos', age: '12 años', breed: 'Pony Shetland', distance: 20,
    bio: 'Bajito pero con carácter. Trabajé en cumpleaños infantiles, tengo anécdotas 🎉',
    interests: ['Niños', 'Fiestas', 'Pasto'], photos: [706, 707], likesYou: false, chance: 0.6 },
];

// Respuestas automáticas del chat según la especie
window.REPLIES = {
  perros: ['¡Guau guau! 🐶', '¿Vamos al parque?', 'Me hiciste mover la cola 🐕', '¿Traés una pelota?', 'Te huelo desde acá y olés re bien 😍', '¿Compartimos un hueso?'],
  gatos: ['Miau 😼', 'Mmm... capaz.', 'Te contesto porque tengo hambre', 'Prrrrr ❤️', '¿Tenés cajas de cartón en tu casa?', 'No me escribas antes de mi siesta'],
  conejos: ['*salta de felicidad* 🐰', '¿Traés zanahorias?', 'Me escondí un rato de la emoción', 'Hagamos binkies juntos 💫', 'Mi nariz se mueve re rápido cuando me escribís'],
  aves: ['¡Pepe lindo! ¡Pepe lindo! 🦜', 'Te canto una canción 🎶', 'Pío pío ❤️', '¿Me traés semillas de girasol?', 'Fiu fiuuuu 😏'],
  roedores: ['¡Uic uic! 🐹', 'Me llené los cachetes de la emoción', 'Corrí 3 vueltas en la ruedita por vos', '¿Te gusta el queso?', 'Juntemos semillas juntos ❤️'],
  reptiles: ['...', '*te mira fijo* 🦎', 'Estoy tomando sol, después te escribo', 'Me pusiste de buen color 💚', 'Despacito, sin apuro'],
  caballos: ['¡Hiiiii! 🐴', '¿Salimos a galopar?', 'Te invito unas manzanas 🍎', 'Relincho de emoción', 'Campo y vos, ¿qué más quiero?'],
};
