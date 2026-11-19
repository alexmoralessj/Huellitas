# 🐾 Huellitas: el Tinder para animales

## Cómo abrirlo
1. Descomprimí la carpeta `pawnder`.
2. Hacé doble clic en **`index.html`** para que se abra en el navegador (Chrome, Edge, Firefox o Safari).
3. Creá una cuenta o tocá **"Entrar con cuenta demo"**.

> Las fotos de los animales se cargan de internet (loremflickr.com). Si estás sin conexión, en su lugar aparece un emoji del animal.

## Qué trae
- **Iniciar sesión / Crear cuenta**: tu cuenta y el perfil de tu mascota (foto, especie, edad, raza y bio).
- **Swipe como en Tinder**: arrastrás la tarjeta a la derecha (LIKE), a la izquierda (NOPE) o hacia arriba (SUPER LIKE).
- **Botones**: deshacer ↩️, nope ❌, super like ⭐, like 💚 y boost ⚡.
- **Varias fotos por perfil**: tocá a la izquierda o a la derecha de la foto para pasar de una a otra.
- **Perfil completo**: tocá la info o la flechita para ver la bio y los intereses.
- **Categorías**: Todos, Perros, Gatos, Conejos, Aves, Roedores, Reptiles y Caballos.
- **¡Es un Match!**: pantalla animada desde la que mandás el primer mensaje.
- **Likes**: los animales que ya te dieron like (si se lo devolvés, es match seguro).
- **Matches y chat**: los animales te contestan solos según su especie 🐶🐱🦜.
- **Perfil**: editar los datos de tu mascota, distancia máxima, estadísticas, cerrar sesión y eliminar la cuenta.
- **Teclado (en la compu)**: ← nope, → like, ↑ super like, Backspace deshacer y espacio para la siguiente foto.

## Estructura
```
pawnder/
├── index.html      → pantallas (login, app y ventanas)
├── css/styles.css  → diseño
├── js/data.js      → animales, categorías y respuestas del chat (editable)
└── js/app.js       → lógica (login, swipe, matches y chat)
```

## Personalizar
- **Agregar animales**: sumá un objeto en `PROFILES` dentro de `js/data.js`.
- **Agregar categorías**: sumá una línea en `CATEGORIES`. El campo `kw` es la palabra en inglés que se usa para buscar las fotos.
- **Colores**: cambiá las variables `--pink` / `--orange` al principio de `css/styles.css`.

## Importante
Esta versión es una **demo que funciona sin servidor**: las cuentas, los matches y los mensajes se guardan en el navegador (localStorage). Eso significa que cada navegador tiene sus propias cuentas y que los demás animales son perfiles de ejemplo. Para que usuarios reales se encuentren entre sí, hace falta un backend (por ejemplo Firebase o Supabase).
