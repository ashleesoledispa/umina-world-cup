# Umiña World Cup — marcador en vivo

Web responsive para publicar posiciones y resultados del torneo benéfico organizado por Rotaract Umiña. Incluye vista pública, marcador en vivo, tabla por grupo, tabla comparativa de terceros, cruces de eliminación y panel privado de árbitro.

## Requisitos
- Node.js 20 o superior
- Proyecto de Supabase
- Cuenta de administrador: `ashleesoledispavilla@gmail.com`

## 1. Instalar y probar localmente

```bash
npm install
npm run dev
```

Sin variables de Supabase se muestra una demo local: puedes probar los controles y los cambios se mantienen solo en el estado de esa sesión. Para publicar resultados reales, configura Supabase.

## 2. Configurar Supabase

1. Abre tu proyecto en Supabase.
2. Ve a **SQL Editor → New query**.
3. Copia y ejecuta todo el archivo `supabase/schema.sql`.
4. En **Authentication → Users**, crea o invita a `ashleesoledispavilla@gmail.com` y define una contraseña.
5. En **Project Settings → API** copia Project URL y la publishable key (o anon key legacy).
6. Crea `.env` en la raíz del proyecto usando `.env.example` como guía:

```env
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_PUBLISHABLE_O_ANON_KEY
```

No uses nunca `service_role` en una variable `VITE_*`; esas variables se exponen al navegador.

## 3. Publicar en Netlify

- Sube el contenido de este ZIP a un repositorio GitHub.
- En Netlify importa el repositorio.
- Build command: `npm run build`
- Publish directory: `dist`
- En **Site configuration → Environment variables**, agrega `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
- Vuelve a desplegar después de agregar las variables.
- `public/_redirects` ya viene incluido para que la navegación de la SPA no falle en rutas internas.

También puedes desplegar en Vercel con `npm run build` y las mismas variables.

## Panel de árbitro
Pulsa el discreto enlace `admin` del pie de página. Inicia sesión con el usuario autorizado. El árbitro puede asignar goles y cambiar el estado entre Programado, En juego y Finalizado. El público ve los cambios en tiempo real cuando Realtime está habilitado.

## Criterios de clasificación
- Victoria: 3 puntos; empate: 1 punto por equipo; derrota: 0.
- Orden: puntos, diferencia de goles, goles a favor, menos goles en contra y nombre del equipo como último desempate técnico.
- Clasifican los dos primeros de cada grupo y los dos mejores terceros.
- Cuartos: 1.º vs 8.º, 2.º vs 7.º, 3.º vs 6.º y 4.º vs 5.º.
- Semifinales: ganador de cuartos 1 vs ganador de cuartos 4; ganador de cuartos 2 vs ganador de cuartos 3.

## Notas importantes
- Los nombres y horarios de fase de grupos se precargan según las imágenes proporcionadas.
- El panel y la vista pública comparten la misma tabla `matches`.
- El SQL crea las políticas RLS: el público puede consultar, pero solo el usuario autenticado cuyo correo coincide con el administrador autorizado puede editar.
- Para reiniciar resultados, cambia manualmente los goles a `NULL` y el estado a `scheduled` desde el panel o SQL Editor.
- La web utiliza una imagen de cancha remota de Unsplash para el hero; puedes reemplazarla por una imagen propia si lo deseas.
