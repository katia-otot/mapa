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
    murales: "https://www.google.com/maps/d/u/0/embed?mid=1250ovuPZKnEtUXbVBsk2IaaA07t3sSQ&ehbc=2E312F&noprof=1",
    escuelas: "https://www.google.com/maps/d/u/0/embed?mid=1qyOwHvUKlBjJGpPqULsFXaz-Bq4hNZw&ehbc=2E312F&noprof=1",
    abuelas: "https://www.google.com/maps/d/u/0/embed?mid=1HnN0-oD8ltFQOX0xFc1bOQFRkFRDrs4&ehbc=2E312F&noprof=1",
    exCentroclandestinodeDetención: "https://www.google.com/maps/d/u/0/embed?mid=1UxJ3xAKtIxaoSGVoLs6IP1D7ze4fT4s&ehbc=2E312F&noprof=1",
    lugadesDeSecuestro: "https://www.google.com/maps/d/u/0/embed?mid=1Ps_fZ641AJdXe_NxGorjAMyyuUSscUE&ehbc=2E312F&noprof=1",
  },
};
// Cada tema abre recorrido.html?id=<origen>-<id>, con los datos de datos/recorridos/<origen>-<id>.json
const routeIds = {
  murales: "murales",
  escuelas: "escuelas",
  abuelas: "abuelas",
  exCentroclandestinodeDetención: "ccd",
  lugadesDeSecuestro: "secuestro",
};
// Referencias a elementos HTML
const locationSelection = document.getElementById("location-selection");
const layerSelection = document.getElementById("layer-selection");
const layerButtonsContainer = document.getElementById("layer-buttons");
const currentOriginLabel = document.getElementById("current-origin");
const backButton = document.getElementById("back-button");
const stepperItems = document.querySelectorAll(".stepper [data-step]");

let activeLocation = null;

// Asegurar que se muestre la pantalla correcta cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
  // Obtener la ubicación guardada en localStorage
  const lastLocation = localStorage.getItem('lastLocation');

  // Verificar si venimos de la página de representaciones sociales
  const urlParams = new URLSearchParams(window.location.search);

  if (lastLocation && mapUrls[lastLocation]) {
    markActiveLocation(lastLocation);
    generateLayerButtons(lastLocation);
  }

  if (urlParams.get('from') === 'layers' && activeLocation) {
    showLayerStep();
  } else {
    showLocationStep();
  }
});

// Manejo de clic en las ubicaciones
document.querySelectorAll("[data-location]").forEach(button => {
  button.addEventListener("click", () => {
    const location = button.dataset.location;
    markActiveLocation(location);
    generateLayerButtons(location);
    showLayerStep();
  });
});

// Manejo de clic en las tarjetas de temas
layerButtonsContainer.addEventListener("click", (event) => {
  const card = event.target.closest(".choice-card");
  if (!card) return;

  // Guardar la ubicación actual para volver a los temas al regresar
  if (activeLocation) {
    localStorage.setItem('lastLocation', activeLocation);
  }

  if (card.dataset.layer === "representaciones-sociales") {
    window.location.href = "representaciones-sociales.html";
    return;
  }

  window.location.href = `recorrido.html?id=${activeLocation}-${routeIds[card.dataset.category]}`;
});

// Manejo del botón "Volver"
backButton.addEventListener("click", () => {
  // Eliminar la ubicación guardada
  localStorage.removeItem('lastLocation');
  markActiveLocation(null);
  showLocationStep();
});

function markActiveLocation(location) {
  activeLocation = location;
  document.querySelectorAll('[data-location]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.location === location);
  });
  currentOriginLabel.textContent = location ? locationNames[location] : "";
}

function showLocationStep() {
  layerSelection.hidden = true;
  revealSection(locationSelection);
  updateStepper("origin");
}

function showLayerStep() {
  locationSelection.hidden = true;
  revealSection(layerSelection);
  updateStepper("layer");
}

// Muestra una sección reiniciando la animación de entrada de sus tarjetas
function revealSection(section) {
  section.hidden = false;
  section.classList.remove("is-entering");
  void section.offsetWidth;
  section.classList.add("is-entering");
}

function updateStepper(currentStep) {
  const order = ["origin", "layer", "map"];
  const currentIndex = order.indexOf(currentStep);
  stepperItems.forEach(item => {
    const index = order.indexOf(item.dataset.step);
    item.classList.toggle("is-current", index === currentIndex);
    item.classList.toggle("is-done", index < currentIndex);
    if (index === currentIndex) {
      item.setAttribute("aria-current", "step");
    } else {
      item.removeAttribute("aria-current");
    }
  });
}

function buildChoiceCard({ title, subtitle, icon, index, extraClass = "" }) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = `choice-card option ${extraClass}`.trim();
  card.style.setProperty("--i", index);
  card.innerHTML = `
    <span class="choice-icon" aria-hidden="true"><svg viewBox="0 0 24 24">${icon}</svg></span>
    <span class="choice-text">
      <span class="choice-title">${title}</span>
      ${subtitle ? `<span class="choice-sub">${subtitle}</span>` : ""}
    </span>
    <span class="choice-arrow" aria-hidden="true">→</span>
  `;
  return card;
}

// Generar tarjetas de temas dinámicamente
function generateLayerButtons(location) {
  layerButtonsContainer.innerHTML = "";

  // Obtiene las categorías para la ubicación seleccionada
  const categories = mapUrls[location];
  let index = 0;
  for (const category of Object.keys(categories)) {
    const card = buildChoiceCard({
      title: categoryNames[category] || category,
      subtitle: "Ver el recorrido",
      icon: categoryIcons[category] || categoryIcons.lugadesDeSecuestro,
      index: index++,
    });
    card.dataset.category = category;
    layerButtonsContainer.appendChild(card);
  }

  const representacionesCard = buildChoiceCard({
    title: "Representaciones Sociales",
    subtitle: "Video y material de lectura",
    icon: categoryIcons.representaciones,
    index: index,
    extraClass: "choice-card--feature",
  });
  representacionesCard.dataset.layer = "representaciones-sociales";
  layerButtonsContainer.appendChild(representacionesCard);
}