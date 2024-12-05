// URLs de los mapas según ubicación y categoría
const mapUrls = {
  quequen: {
    murales: "https://www.google.com/maps/d/u/0/embed?mid=1dxXO7fuLJ_PaViZ44AKumKmAnBYSV4w&ehbc=2E312F&noprof=1",
    escuelas: "https://www.google.com/maps/d/u/0/embed?mid=1X317OxlzPOVKj5KeEwT3PaWzgCBNJGM&ehbc=2E312F&noprof=1",
    abuelas: "https://www.google.com/maps/d/u/0/embed?mid=1_7E-AVQIVTqbXb8Eu7EOTOsi47q14Nc&ehbc=2E312F&noprof=1",
    exCentroclandestinodeDetención : "https://www.google.com/maps/d/u/0/embed?mid=1jrF-6j8wEAlqxIoaM7pk4-kPT3hfyu8&ehbc=2E312F&noprof=1",
    lugadesDeSecuestro : "https://www.google.com/maps/d/u/0/embed?mid=1HZyTvVBNgwfWR55fgfdNKvGzvvNiHDM&ehbc=2E312F&noprof=1"
  },
  terminal: {
    murales: "https://www.google.com/maps/d/u/0/embed?mid=18uFIaiX3bhFtRpxI9qJo7HsblcMoTgw&ehbc=2E312F&noprof=1",
    escuelas: "https://www.google.com/maps/d/u/0/embed?mid=1-eAojrCYuxXSvqe0Aj9vVjcpzLevc2Q&ehbc=2E312F&noprof=1",
    abuelas: "https://www.google.com/maps/d/u/0/embed?mid=1Y-CxU80-VLPfQlrWJEU26OS2y5Hay7A&ehbc=2E312F&noprof=1",
    exCentroclandestinodeDetención :"https://www.google.com/maps/d/u/0/embed?mid=1kQFYk9YkHB9uan9C24oopIutAnmHnhA&ehbc=2E312F&noprof=1",
    lugadesDeSecuestro :"https://www.google.com/maps/d/u/0/embed?mid=1PLk7uTHBO3P5_HQHc_ECO15Cplw1cdE&ehbc=2E312F&noprof=1",
  },
  necochea: {
    murales: "https://www.google.com/maps/d/u/0/embed?mid=1dxXO7fuLJ_PaViZ44AKumKmAnBYSV4w",
    escuelas: "https://www.google.com/maps/d/u/0/embed?mid=3exampleNECO",
    abuelas: "https://www.google.com/maps/d/u/0/embed?mid=3anotherNECO",
  },
};
// Nombres amigables para las categorías
const categoryNames = {
  murales: "Murales",
  escuelas: "Escuelas exAlumnos",
  abuelas: "Memoria de las Abuelas",
  exCentroclandestinodeDetención: "Centro Clandestino de Detención",
  lugadesDeSecuestro: "Lugares de Secuestro",
};
// Referencias a elementos HTML
const locationSelection = document.getElementById("location-selection");
const layerSelection = document.getElementById("layer-selection");
const layerButtonsContainer = document.getElementById("layer-buttons");
const mapIframe = document.getElementById("map");
const backButton = document.getElementById("back-button");

// Manejo de clic en las ubicaciones
document.querySelectorAll(".option").forEach(button => {
  button.addEventListener("click", () => {
    const location = button.dataset.location;

    // Genera los botones de categorías
    generateLayerButtons(location);
    locationSelection.classList.add("hidden");
    layerSelection.classList.remove("hidden");
  });
});

// Manejo del botón "Volver"
backButton.addEventListener("click", () => {
  // Oculta la sección de capas y muestra la selección inicial
  layerSelection.classList.add("hidden");
  locationSelection.classList.remove("hidden");
  // Limpia el iframe
  mapIframe.src = "";
  mapIframe.classList.add("hidden");
});

// Generar botones de categorías dinámicamente
function generateLayerButtons(location) {
  // Limpia botones existentes
  layerButtonsContainer.innerHTML = "";

  // Obtiene las categorías para la ubicación seleccionada
  const categories = mapUrls[location];
  for (const [category, url] of Object.entries(categories)) {
    const button = document.createElement("button");
    button.textContent = categoryNames[category] || category;
    button.classList.add("btn", "btn-primary", "btn-layer");
    button.dataset.mapUrl = url;
    layerButtonsContainer.appendChild(button);

    // Evento para mostrar el mapa correspondiente
    button.addEventListener("click", () => {
      showMap(url);
    });
  };
}

// Mostrar el mapa seleccionado en el iframe
function showMap(url) {
  mapIframe.src = url;
  mapIframe.classList.remove("hidden");
}
