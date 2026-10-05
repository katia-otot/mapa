# Problemas resueltos

Registro vivo de incidentes y soluciones de **este proyecto**.
**Orden:** lo más reciente arriba. El agente debe consultar este archivo antes de depurar.

---

## 2026-09-30 — Fotos rotas o versión vieja al probar en local; el celular no abre el link

**Síntoma:** después de reexportar, el recorrido mostraba fotos rotas (404 a `datos/recorridos/fotos/<id>/...`) aunque el JSON en disco ya tenía las rutas nuevas. Además, el celular no abría `http://192.168.1.182:5500/`.
**Contexto:** servidor local para probar en la compu y en el celular.
**Causa:** `python -m http.server` no manda `Cache-Control`, y el navegador reusaba `recorrido.js` y el JSON viejos. Aparte, había tres servidores escuchando en el puerto 5500 a la vez (Windows lo permite), uno solo en `127.0.0.1`; las conexiones podían caer en uno colgado.
**Solución:** usar `python scripts/servidor-local.py` (manda `Cache-Control: no-cache`). `recorrido.js` pide el JSON con `cache: "no-cache"`. Antes de levantar el servidor, cerrar los que queden: `netstat -ano | Select-String ":5500 .*LISTENING"` y `Stop-Process` de esos PID.
**Prevención:** un solo servidor por puerto. Si el celular sigue sin abrir y en el log del servidor no aparece su IP, es el router (red de invitados o aislamiento de clientes), no el sitio.

## 2026-09-30 — Exportar los 15 recorridos: capa equivocada, nombres con dirección y fotos repetidas

**Síntoma:** al exportar un mapa se podía tomar la capa de otro tema (algunas capas ajenas traen texto); en los mapas del Hospital los nombres traían la dirección pegada (`"Comisaria 1°"\nAv. 58 3002, ...`); las fotos ocupaban 18,7 MB porque se repetían entre recorridos.
**Contexto:** `scripts/exportar-mymaps.py`, datos en `datos/recorridos/`.
**Causa:** cada mapa de My Maps tiene las capas de varios recorridos, y a veces otras capas tienen texto copiado (sin fotos). Los mapas repiten las mismas fotos con URLs distintas. El recorrido CCD desde Quequén no tiene punto de partida aparte: arranca en la Comisaría 2°.
**Solución:** capas fijadas a mano en `MAPAS` (la del tema es la única con fotos). `nombre_y_direccion` separa nombre y dirección. Las fotos se nombran por el hash del contenido y se guardan una sola vez en `datos/recorridos/fotos/` (5,8 MB). `recorrido.js` detecta si el primer punto es una partida sin contenido (`primera`) y numera las paradas en consecuencia.
**Prevención:** si se agrega o cambia un mapa, revisar qué capa tiene fotos antes de fijarla en `MAPAS` y volver a correr el script.

## 2026-09-29 — Fotos de My Maps no cargan en el recorrido / la cámara no viaja a la parada

**Síntoma:** en `recorrido.html` las fotos aparecían rotas aunque la URL respondía 200 desde Python. Además, al elegir una parada la cámara a veces no se movía.
**Contexto:** prototipo del recorrido con MapLibre (`recorrido.js`) y datos exportados por `scripts/exportar-mymaps.py`.
**Causa:** las imágenes de `mymaps.usercontent.google.com` vienen con `Cross-Origin-Resource-Policy: same-site`, así que el navegador las bloquea fuera de sitios de Google (Python ignora ese encabezado). La cámara se cortaba porque `map.setPadding()` (llamado desde un ResizeObserver del panel) hace un `jumpTo` que detiene cualquier `flyTo`/`easeTo` en curso.
**Solución:** el script descarga las fotos y las guarda achicadas en WebP en `datos/recorridos/fotos/<id>/` (dos tamaños). El margen del mapa se pasa como opción `padding` en cada `flyTo`/`easeTo`/`jumpTo`, sin `setPadding` aparte.
**Prevención:** probar siempre imágenes externas desde el navegador, no solo desde consola. No llamar a `setPadding` mientras puede haber una animación de cámara.

## 2026-09-29 — "No se ve nada" en mapas y documentos de Google embebidos

**Síntoma:** en el navegador integrado de Cursor el mapa quedaba en "Cargando mapa…" y Representaciones Sociales parecía vacía. En Chrome/Edge se veía bien.
**Contexto:** iframes de Google My Maps y Google Drive; overlay de carga que se ocultaba con el evento `load` del iframe.
**Causa:** en el navegador integrado los iframes de Google no terminan de cargar y el evento `load` nunca llega, así que el overlay tapaba el iframe para siempre. Aparte, el video de Drive (`1X1_WXg4...`) devuelve 404 para cualquier usuario sin acceso: está borrado o no es público.
**Solución:** el aviso de carga va detrás del iframe (`z-index: 0`, iframe con `z-index: 1`) y no depende de JavaScript; cuando el contenido pinta, lo tapa solo. Sin `loading="lazy"` en los iframes de Drive. Probar siempre en un navegador normal además del integrado.
**Prevención:** nunca tapar un iframe de terceros con un overlay que dependa de su evento `load`. No cambiar los enlaces de Drive/My Maps: son los del proyecto original.
