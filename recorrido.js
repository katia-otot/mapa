// Recorrido guiado sobre MapLibre. Los datos salen de datos/recorridos/<id>.json,
// generados con scripts/exportar-mymaps.py a partir de los mapas de Google My Maps.
// Los nombres e íconos de temas vienen de temas.js.

const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/positron";
const PITCH = 55;
const ZOOM_VIAJE = 16.2;
const ZOOM_PARADA = 17;

const colores = {
  papel: "#ece5d6",
  papelOscuro: "#e3dbc9",
  agua: "#c3cdcc",
  aguaLinea: "#a9b6b5",
  calle: "#faf7f0",
  calleMayor: "#f6efe1",
  calleBorde: "#cbbfa9",
  limite: "#b3a78f",
  tinta: "#1b1a18",
  tintaSuave: "#4a453e",
  edificio: "#d6ccb8",
};

// Celulares con poca memoria o personas que desactivaron las animaciones: mapa plano y sin vuelos
const modoLiviano =
  window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
  (navigator.deviceMemory !== undefined && navigator.deviceMemory <= 2) ||
  (navigator.hardwareConcurrency !== undefined && navigator.hardwareConcurrency <= 2);

const panel = document.getElementById("rec-panel");
const mapContainer = document.getElementById("rec-map");
const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightbox-img");
const lightboxCaption = document.getElementById("lightbox-caption");
const mqEscritorio = window.matchMedia("(min-width: 900px)");

let map;
let datos;
let paradas = [];
// Índice de la primera parada con contenido: 1 si el mapa tiene un punto de partida aparte, 0 si arranca en una parada
let primera = 1;
let ruta = [];
let acumulado = [];
let largoTotal = 0;
let distanciaParada = [];
let marcadores = [];
let paradaActual = null;
let viaje = null;
let fotoAbierta = { fotos: [], indice: 0, nombre: "" };

// ---------- Geometría ----------

function distancia(a, b) {
  const rad = Math.PI / 180;
  const dLat = (b[1] - a[1]) * rad;
  const dLng = (b[0] - a[0]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

function rumbo(a, b) {
  const rad = Math.PI / 180;
  const y = Math.sin((b[0] - a[0]) * rad) * Math.cos(b[1] * rad);
  const x = Math.cos(a[1] * rad) * Math.sin(b[1] * rad) - Math.sin(a[1] * rad) * Math.cos(b[1] * rad) * Math.cos((b[0] - a[0]) * rad);
  return Math.atan2(y, x) / rad;
}

function diferenciaAngular(desde, hasta) {
  return ((hasta - desde + 540) % 360) - 180;
}

function suavizar(t) {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

function prepararGeometria() {
  acumulado = [0];
  for (let i = 1; i < ruta.length; i++) {
    acumulado.push(acumulado[i - 1] + distancia(ruta[i - 1], ruta[i]));
  }
  largoTotal = acumulado[acumulado.length - 1];

  // Cada parada se ubica en el punto más cercano de la ruta, avanzando siempre hacia adelante
  let desde = 0;
  distanciaParada = paradas.map(parada => {
    let mejor = desde;
    let mejorDistancia = Infinity;
    for (let i = desde; i < ruta.length; i++) {
      const d = distancia(ruta[i], parada.coordenadas);
      if (d < mejorDistancia) {
        mejorDistancia = d;
        mejor = i;
      }
    }
    desde = mejor;
    return acumulado[mejor];
  });
}

function indiceDeTramo(d) {
  let i = 0;
  while (i < acumulado.length - 2 && acumulado[i + 1] < d) i++;
  return i;
}

function puntoEn(d) {
  const dist = Math.max(0, Math.min(largoTotal, d));
  const i = indiceDeTramo(dist);
  const largoTramo = acumulado[i + 1] - acumulado[i] || 1;
  const t = (dist - acumulado[i]) / largoTramo;
  return [
    ruta[i][0] + (ruta[i + 1][0] - ruta[i][0]) * t,
    ruta[i][1] + (ruta[i + 1][1] - ruta[i][1]) * t,
  ];
}

function tramoHasta(d) {
  const i = indiceDeTramo(d);
  return [...ruta.slice(0, i + 1), puntoEn(d)];
}

function lineaGeoJSON(coordenadas) {
  const puntos = coordenadas.length > 1 ? coordenadas : [coordenadas[0], coordenadas[0]];
  return { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: puntos } };
}

function limitesDelRecorrido() {
  const todos = [...ruta, ...paradas.map(p => p.coordenadas)];
  const lngs = todos.map(p => p[0]);
  const lats = todos.map(p => p[1]);
  return [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]];
}

// ---------- Estilo del mapa ----------

function adaptarEstilo(estilo) {
  estilo.layers.forEach(capa => {
    const id = capa.id;
    capa.paint = capa.paint || {};
    if (capa.type === "background") {
      capa.paint["background-color"] = colores.papel;
    } else if (capa.type === "fill") {
      if (id === "water") capa.paint["fill-color"] = colores.agua;
      else if (id === "building") capa.paint["fill-color"] = colores.edificio;
      else if (id.startsWith("aeroway") || id.startsWith("road")) capa.paint["fill-color"] = colores.calle;
      else capa.paint["fill-color"] = colores.papelOscuro;
    } else if (capa.type === "line") {
      if (id === "waterway") capa.paint["line-color"] = colores.aguaLinea;
      else if (id.includes("casing") || id.startsWith("railway")) capa.paint["line-color"] = colores.calleBorde;
      else if (id.startsWith("boundary")) capa.paint["line-color"] = colores.limite;
      else if (id.includes("major") || id.includes("motorway")) capa.paint["line-color"] = colores.calleMayor;
      else capa.paint["line-color"] = colores.calle;
    } else if (capa.type === "symbol" && capa.layout && capa.layout["text-field"]) {
      capa.paint["text-color"] = colores.tintaSuave;
      capa.paint["text-halo-color"] = colores.papel;
      if (JSON.stringify(capa.layout["text-field"]).includes("name")) {
        capa.layout["text-field"] = ["coalesce", ["get", "name:es"], ["get", "name"]];
      }
    }
  });

  if (!modoLiviano) {
    const primerTexto = estilo.layers.findIndex(capa => capa.type === "symbol");
    estilo.layers.splice(primerTexto, 0, {
      id: "edificios-3d",
      type: "fill-extrusion",
      source: "openmaptiles",
      "source-layer": "building",
      minzoom: 14,
      paint: {
        "fill-extrusion-color": colores.edificio,
        "fill-extrusion-height": ["coalesce", ["get", "render_height"], 6],
        "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
        "fill-extrusion-opacity": 0.85,
      },
    });
  }
  return estilo;
}

function agregarCapasDelRecorrido() {
  const primerTexto = map.getStyle().layers.find(capa => capa.type === "symbol");
  const antesDe = primerTexto ? primerTexto.id : undefined;

  map.addSource("ruta", { type: "geojson", data: lineaGeoJSON(ruta) });
  map.addSource("ruta-recorrida", { type: "geojson", data: lineaGeoJSON([ruta[0]]) });

  map.addLayer({
    id: "ruta-base",
    type: "line",
    source: "ruta",
    layout: { "line-join": "round" },
    paint: { "line-color": colores.tinta, "line-opacity": 0.35, "line-width": 3, "line-dasharray": [1, 1.5] },
  }, antesDe);
  map.addLayer({
    id: "ruta-recorrida-borde",
    type: "line",
    source: "ruta-recorrida",
    layout: { "line-join": "round", "line-cap": "round" },
    paint: { "line-color": colores.papel, "line-width": 9, "line-opacity": 0.9 },
  }, antesDe);
  map.addLayer({
    id: "ruta-recorrida",
    type: "line",
    source: "ruta-recorrida",
    layout: { "line-join": "round", "line-cap": "round" },
    paint: { "line-color": colores.tinta, "line-width": 4.5 },
  }, antesDe);
}

function dibujarRecorridoHasta(d) {
  map.getSource("ruta-recorrida").setData(lineaGeoJSON(tramoHasta(d)));
}

// ---------- Marcadores ----------

function nombreVisible(parada) {
  // Los puntos sin título propio en My Maps tienen la dirección completa como nombre
  return /Provincia de Buenos Aires/.test(parada.nombre) ? parada.nombre.split(",")[0].trim() : parada.nombre;
}

function esPartida(indice) {
  return indice < primera;
}

function numeroDeParada(indice) {
  return indice - primera + 1;
}

function totalDeParadas() {
  return paradas.length - primera;
}

function crearMarcadores() {
  const icono = `<svg viewBox="0 0 24 24" aria-hidden="true">${categoryIcons[datos.categoria] || categoryIcons.lugadesDeSecuestro}</svg>`;
  marcadores = paradas.map((parada, indice) => {
    const contenedor = document.createElement("div");
    const boton = document.createElement("button");
    boton.type = "button";
    if (esPartida(indice)) {
      boton.className = "rec-marker rec-marker--partida";
      boton.setAttribute("aria-label", `Punto de partida: ${nombreVisible(parada)}`);
    } else {
      boton.className = "rec-marker";
      boton.innerHTML = `${icono}<span class="rec-marker-num">${numeroDeParada(indice)}</span>`;
      boton.setAttribute("aria-label", `Parada ${numeroDeParada(indice)}: ${nombreVisible(parada)}`);
    }
    boton.addEventListener("click", (evento) => {
      evento.stopPropagation();
      irAParada(indice, { animar: false });
    });
    contenedor.appendChild(boton);
    return new maplibregl.Marker({ element: contenedor, anchor: "center" }).setLngLat(parada.coordenadas).addTo(map);
  });
}

function marcarActiva(indice) {
  marcadores.forEach((marcador, i) => {
    marcador.getElement().firstChild.classList.toggle("is-active", i === indice);
  });
}

// ---------- Panel ----------

function crear(tag, clase, texto) {
  const elemento = document.createElement(tag);
  if (clase) elemento.className = clase;
  if (texto !== undefined) elemento.textContent = texto;
  return elemento;
}

function boton(texto, clase, alHacerClic) {
  const b = crear("button", clase, texto);
  b.type = "button";
  b.addEventListener("click", alHacerClic);
  return b;
}

function renderizarPanel(...hijos) {
  panel.classList.remove("rec-panel--quieto");
  panel.replaceChildren(...hijos.filter(Boolean));
  panel.scrollTop = 0;
}

function barraDeProgreso(indice) {
  const barra = crear("div", "rec-progress");
  const relleno = crear("span");
  relleno.style.width = `${(Math.max(0, numeroDeParada(indice)) / totalDeParadas()) * 100}%`;
  barra.appendChild(relleno);
  return barra;
}

function listaDeParadas() {
  const lista = crear("ol", "rec-stops");
  paradas.forEach((parada, indice) => {
    if (esPartida(indice)) return;
    const item = crear("li");
    const b = boton("", "", () => irAParada(indice, { animar: false }));
    b.append(crear("span", "rec-stops-num", String(numeroDeParada(indice)).padStart(2, "0")), crear("span", "", nombreVisible(parada)));
    item.appendChild(b);
    lista.appendChild(item);
  });
  return lista;
}

function galeria(parada) {
  if (!parada.fotos.length) return null;
  const contenedor = crear("div", parada.fotos.length === 1 ? "rec-gallery rec-gallery--single" : "rec-gallery");
  parada.fotos.forEach((foto, indice) => {
    const b = boton("", "", () => abrirFoto(parada.fotos, indice, nombreVisible(parada)));
    b.setAttribute("aria-label", `Ampliar foto ${indice + 1} de ${parada.fotos.length}`);
    const img = crear("img");
    img.src = foto.chica;
    img.width = foto.ancho;
    img.height = foto.alto;
    img.alt = `Foto ${indice + 1} de ${parada.fotos.length}: ${nombreVisible(parada)}`;
    img.loading = "lazy";
    img.decoding = "async";
    b.appendChild(img);
    contenedor.appendChild(b);
  });
  return contenedor;
}

function textoDeParada(parada) {
  if (!parada.parrafos.length) return crear("p", "rec-empty", "Este punto no tiene texto cargado en el mapa original.");
  const contenedor = crear("div", "rec-text");
  parada.parrafos.forEach(parrafo => contenedor.appendChild(crear("p", "", parrafo)));
  return contenedor;
}

function direccionDe(parada) {
  return parada.direccion ? crear("p", "rec-address", parada.direccion) : null;
}

const URL_TEMAS = "index.html?from=layers";

function enlaceATemas() {
  const enlace = crear("a", "rec-temas-link", "Ver otros recorridos");
  enlace.href = URL_TEMAS;
  return enlace;
}

function mostrarIntro() {
  const km = (largoTotal / 1000).toLocaleString("es-AR", { maximumFractionDigits: 1 });
  const acciones = crear("div", "rec-actions");
  acciones.appendChild(boton("Comenzar recorrido", "btn-primary", () => irAParada(0, { animar: false })));
  renderizarPanel(
    crear("p", "rec-kicker", `${totalDeParadas()} paradas · ${km} km`),
    crear("h2", "rec-title", tituloDelRecorrido()),
    primera ? crear("p", "rec-empty", `Partida: ${nombreVisible(paradas[0])}`) : null,
    acciones,
    enlaceATemas(),
    listaDeParadas(),
  );
}

function mostrarEnCamino(hasta) {
  const acciones = crear("div", "rec-actions");
  const pausa = boton("Pausa", "btn-ghost", () => {
    if (!viaje) return;
    if (viaje.pausado) {
      reanudarViaje();
      pausa.textContent = "Pausa";
    } else {
      pausarViaje();
      pausa.textContent = "Continuar";
    }
  });
  pausa.id = "rec-pausa";
  acciones.append(pausa, boton("Saltar al lugar →", "btn-primary", () => irAParada(hasta, { animar: false })));
  renderizarPanel(
    crear("p", "rec-kicker", `En camino · parada ${numeroDeParada(hasta)} de ${totalDeParadas()}`),
    barraDeProgreso(hasta - 1),
    crear("h2", "rec-title", nombreVisible(paradas[hasta])),
    direccionDe(paradas[hasta]),
    acciones,
    enlaceATemas(),
    galeria(paradas[hasta]),
    textoDeParada(paradas[hasta]),
  );
}

function mostrarParada(indice) {
  const parada = paradas[indice];
  const ultima = paradas.length - 1;
  const acciones = crear("div", "rec-actions");

  if (esPartida(indice)) {
    acciones.append(
      boton("Ver todas las paradas", "btn-ghost", () => vistaGeneral(false)),
      boton("Ir a la parada 1 →", "btn-primary", () => irAParada(primera, { animar: true })),
    );
    renderizarPanel(
      crear("p", "rec-kicker", "Punto de partida"),
      crear("h2", "rec-title", nombreVisible(parada)),
      direccionDe(parada),
      acciones,
      enlaceATemas(),
    );
    return;
  }

  if (indice > 0) {
    acciones.appendChild(boton("← Parada anterior", "btn-ghost", () => irAParada(indice - 1, { animar: false })));
  } else {
    acciones.appendChild(boton("Ver todas las paradas", "btn-ghost", () => vistaGeneral(false)));
  }
  if (indice < ultima) {
    acciones.appendChild(boton("Siguiente parada →", "btn-primary", () => irAParada(indice + 1, { animar: true })));
  } else {
    const temas = crear("a", "btn-ghost", "Ver otros recorridos");
    temas.href = URL_TEMAS;
    acciones.append(
      boton("Ver recorrido completo", "btn-primary", () => vistaGeneral(true)),
      boton("Volver a empezar el recorrido", "btn-ghost", () => irAParada(0, { animar: false })),
      temas,
    );
  }

  renderizarPanel(
    crear("p", "rec-kicker", `Parada ${numeroDeParada(indice)} de ${totalDeParadas()}`),
    barraDeProgreso(indice),
    crear("h2", "rec-title", nombreVisible(parada)),
    direccionDe(parada),
    acciones,
    indice < ultima ? enlaceATemas() : null,
    galeria(parada),
    textoDeParada(parada),
  );
}

function tituloDelRecorrido() {
  return `${categoryNames[datos.categoria] || datos.categoria} desde ${locationNames[datos.origen] || datos.origen}`;
}

// ---------- Navegación y cámara ----------

// En celular el panel tapa la parte de abajo del mapa: la cámara centra los puntos en la parte visible.
// El margen se pasa en cada movimiento porque cambiarlo aparte (setPadding) corta la animación en curso.
function paddingDelMapa() {
  const abajo = mqEscritorio.matches ? 0 : panel.offsetHeight;
  return { top: 0, bottom: abajo, left: 0, right: 0 };
}

function encuadrarRecorrido(duracion) {
  const margen = 50;
  const abajo = paddingDelMapa().bottom;
  map.jumpTo({ padding: { top: 0, bottom: 0, left: 0, right: 0 } });
  map.fitBounds(limitesDelRecorrido(), {
    padding: { top: margen, bottom: margen + abajo, left: margen, right: margen },
    pitch: 0,
    bearing: 0,
    duration: duracion,
  });
}

function vistaGeneral(conRecorridoCompleto) {
  cancelarViaje();
  paradaActual = null;
  marcarActiva(null);
  dibujarRecorridoHasta(conRecorridoCompleto ? largoTotal : 0);
  mostrarIntro();
  encuadrarRecorrido(modoLiviano ? 0 : 1500);
}

function irAParada(indice, { animar }) {
  cancelarViaje();
  if (animar && !modoLiviano && paradaActual !== null && indice === paradaActual + 1) {
    viajar(paradaActual, indice);
  } else {
    llegar(indice, { volar: true });
  }
}

function llegar(indice, { volar }) {
  paradaActual = indice;
  dibujarRecorridoHasta(distanciaParada[indice]);
  marcarActiva(indice);
  mostrarParada(indice);
  const camara = {
    center: paradas[indice].coordenadas,
    zoom: ZOOM_PARADA,
    pitch: modoLiviano ? 0 : PITCH,
    padding: paddingDelMapa(),
  };
  if (modoLiviano) {
    map.jumpTo(camara);
  } else if (volar) {
    map.flyTo({ ...camara, duration: 1800, essential: true });
  } else {
    map.easeTo({ ...camara, duration: 1000 });
  }
}

function viajar(desde, hasta) {
  const inicio = distanciaParada[desde];
  const largo = distanciaParada[hasta] - inicio;
  const duracion = Math.min(9000, Math.max(2500, largo * 12));
  let rumboSuave = map.getBearing();

  const este = { hasta, pausado: false, transcurrido: 0, ultimo: null, cuadro: null, espera: null };
  viaje = este;
  mostrarEnCamino(hasta);
  marcarActiva(hasta);
  const padding = paddingDelMapa();

  const paso = (ahora) => {
    if (viaje !== este || este.pausado) return;
    if (este.ultimo !== null) este.transcurrido += ahora - este.ultimo;
    este.ultimo = ahora;
    const t = Math.min(1, este.transcurrido / duracion);
    const d = inicio + largo * suavizar(t);
    const centro = puntoEn(d);
    const adelante = puntoEn(Math.min(largoTotal, d + 60));
    if (distancia(centro, adelante) > 1) {
      rumboSuave += diferenciaAngular(rumboSuave, rumbo(centro, adelante)) * 0.04;
    }
    dibujarRecorridoHasta(d);
    map.jumpTo({ center: centro, bearing: rumboSuave, pitch: PITCH, zoom: ZOOM_VIAJE, padding });
    if (t < 1) {
      este.cuadro = requestAnimationFrame(paso);
    } else {
      viaje = null;
      // El panel ya mostraba esta parada durante el viaje: se conserva lo que se estaba leyendo
      const scroll = panel.scrollTop;
      llegar(hasta, { volar: false });
      panel.classList.add("rec-panel--quieto");
      panel.scrollTop = scroll;
    }
  };
  este.paso = paso;

  map.easeTo({ center: puntoEn(inicio), zoom: ZOOM_VIAJE, pitch: PITCH, padding, duration: 900 });
  este.espera = setTimeout(() => {
    if (viaje === este) este.cuadro = requestAnimationFrame(paso);
  }, 950);
}

function pausarViaje() {
  if (!viaje) return;
  viaje.pausado = true;
  cancelAnimationFrame(viaje.cuadro);
}

function reanudarViaje() {
  if (!viaje) return;
  viaje.pausado = false;
  viaje.ultimo = null;
  viaje.cuadro = requestAnimationFrame(viaje.paso);
}

function cancelarViaje() {
  if (!viaje) return;
  cancelAnimationFrame(viaje.cuadro);
  clearTimeout(viaje.espera);
  viaje = null;
}

// ---------- Foto ampliada ----------

function abrirFoto(fotos, indice, nombre) {
  fotoAbierta = { fotos, indice, nombre };
  actualizarFoto();
  if (!lightbox.open) lightbox.showModal();
}

function actualizarFoto() {
  const { fotos, indice, nombre } = fotoAbierta;
  lightboxImg.src = fotos[indice].grande;
  lightboxImg.alt = `Foto ${indice + 1} de ${fotos.length}: ${nombre}`;
  lightboxCaption.textContent = `${nombre} · ${indice + 1} de ${fotos.length}`;
  document.getElementById("lightbox-prev").disabled = indice === 0;
  document.getElementById("lightbox-next").disabled = indice === fotos.length - 1;
}

function moverFoto(paso) {
  const nuevo = fotoAbierta.indice + paso;
  if (nuevo < 0 || nuevo >= fotoAbierta.fotos.length) return;
  fotoAbierta.indice = nuevo;
  actualizarFoto();
}

document.getElementById("lightbox-prev").addEventListener("click", () => moverFoto(-1));
document.getElementById("lightbox-next").addEventListener("click", () => moverFoto(1));
document.getElementById("lightbox-close").addEventListener("click", () => lightbox.close());
lightbox.addEventListener("click", (evento) => {
  if (evento.target === lightbox) lightbox.close();
});

document.addEventListener("keydown", (evento) => {
  if (lightbox.open) {
    if (evento.key === "ArrowRight") moverFoto(1);
    if (evento.key === "ArrowLeft") moverFoto(-1);
    return;
  }
  if (paradaActual === null || viaje) return;
  if (evento.key === "ArrowRight" && paradaActual < paradas.length - 1) irAParada(paradaActual + 1, { animar: true });
  if (evento.key === "ArrowLeft" && paradaActual > 0) irAParada(paradaActual - 1, { animar: false });
});

// ---------- Inicio ----------

function mostrarMensaje(texto) {
  const mensaje = crear("div", "rec-map-message");
  mensaje.appendChild(crear("p", "", texto));
  if (datos && datos.mapaOriginal) {
    const enlace = crear("a", "btn-ghost", "Ver mapa original");
    enlace.href = datos.mapaOriginal;
    enlace.target = "_blank";
    enlace.rel = "noopener";
    mensaje.appendChild(enlace);
  }
  mapContainer.replaceChildren(mensaje);
}

async function iniciar() {
  const id = new URLSearchParams(window.location.search).get("id") || "quequen-murales";

  try {
    // "no-cache" revalida con el servidor: si se reexportan los datos, no queda una copia vieja con rutas de fotos que ya no existen
    const respuesta = await fetch(`datos/recorridos/${encodeURIComponent(id)}.json`, { cache: "no-cache" });
    if (!respuesta.ok) throw new Error(respuesta.status);
    datos = await respuesta.json();
  } catch (error) {
    mostrarMensaje("No se encontró este recorrido.");
    return;
  }

  paradas = datos.paradas;
  const inicio = paradas[0];
  primera = !inicio.parrafos.length && !inicio.fotos.length ? 1 : 0;
  ruta = datos.ruta;
  prepararGeometria();

  document.getElementById("rec-kicker").textContent = `Recorrido desde ${locationNames[datos.origen] || datos.origen}`;
  document.getElementById("rec-title").textContent = categoryNames[datos.categoria] || datos.categoria;
  document.title = `${tituloDelRecorrido()} - Mapa Local por la Memoria`;
  document.getElementById("original-link").href = datos.mapaOriginal;

  let estilo;
  try {
    estilo = adaptarEstilo(await (await fetch(MAP_STYLE_URL)).json());
  } catch (error) {
    mostrarMensaje("No se pudo cargar el mapa. Revisá la conexión a internet.");
    return;
  }

  try {
    map = new maplibregl.Map({
      container: mapContainer,
      style: estilo,
      bounds: limitesDelRecorrido(),
      fitBoundsOptions: { padding: 50 },
      maxPitch: 70,
      dragRotate: !modoLiviano,
      attributionControl: false,
    });
  } catch (error) {
    mostrarMensaje("Este dispositivo no puede mostrar el mapa interactivo.");
    return;
  }

  // En celular el panel tapa la parte de abajo: el crédito del mapa (obligatorio) va arriba
  map.addControl(new maplibregl.AttributionControl({ compact: true }), mqEscritorio.matches ? "bottom-right" : "top-left");
  map.addControl(new maplibregl.NavigationControl({ visualizePitch: !modoLiviano, showCompass: !modoLiviano }), "top-right");
  map.on("dragstart", () => {
    if (viaje && !viaje.pausado) {
      pausarViaje();
      const pausa = document.getElementById("rec-pausa");
      if (pausa) pausa.textContent = "Continuar";
    }
  });

  map.on("load", () => {
    agregarCapasDelRecorrido();
    crearMarcadores();
    mostrarIntro();
    encuadrarRecorrido(0);
  });
  // MapLibre abre el crédito compacto al cargar y recién lo cierra con el primer arrastre: se arranca plegado (queda el botón ⓘ)
  map.once("idle", plegarCredito);
}

function plegarCredito() {
  const credito = mapContainer.querySelector(".maplibregl-ctrl-attrib.maplibregl-compact");
  if (!credito) return;
  credito.classList.remove("maplibregl-compact-show");
  credito.removeAttribute("open");
}

iniciar();
