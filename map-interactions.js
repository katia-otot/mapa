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

// Asegurar que se muestre la pantalla correcta cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
  // Asegurarse de que el mapa esté oculto inicialmente
  mapIframe.classList.add("d-none");
  
  // Obtener la ubicación guardada en localStorage
  const lastLocation = localStorage.getItem('lastLocation');
  
  // Verificar si venimos de la página de representaciones sociales
  const urlParams = new URLSearchParams(window.location.search);
  
  if (urlParams.get('from') === 'layers' && lastLocation) {
    // Si venimos de representaciones sociales y hay una ubicación guardada
    const locationButton = document.querySelector(`[data-location="${lastLocation}"]`);
    if (locationButton) {
      locationButton.classList.add('active');
    }
    generateLayerButtons(lastLocation);
    locationSelection.classList.add("d-none");
    layerSelection.classList.remove("d-none");
  } else if (lastLocation) {
    // Si hay una ubicación guardada pero no venimos de representaciones sociales
    // Marcar el botón de ubicación como activo
    const locationButton = document.querySelector(`[data-location="${lastLocation}"]`);
    if (locationButton) {
      locationButton.classList.add('active');
    }
    generateLayerButtons(lastLocation);
    locationSelection.classList.remove("d-none");
    layerSelection.classList.add("d-none");
  } else {
    // Si no hay ubicación guardada o es la primera vez, mostrar la selección de ubicación
    locationSelection.classList.remove("d-none");
    layerSelection.classList.add("d-none");
  }
});

// Manejo de clic en las ubicaciones
document.querySelectorAll(".option").forEach(button => {
  if (button.dataset.layer === "representaciones-sociales") {
    button.addEventListener("click", () => {
      // Guardar la ubicación actual antes de navegar
      const activeLocationButton = document.querySelector('[data-location].active');
      if (activeLocationButton) {
        localStorage.setItem('lastLocation', activeLocationButton.dataset.location);
      }
      window.location.href = "representaciones-sociales.html";
    });
  } else if (button.dataset.location) {
    button.addEventListener("click", () => {
      // Remover clase active de todos los botones de ubicación
      document.querySelectorAll('[data-location]').forEach(btn => {
        btn.classList.remove('active');
      });
      // Agregar clase active al botón seleccionado
      button.classList.add('active');
      
      const location = button.dataset.location;
      generateLayerButtons(location);
      locationSelection.classList.add("d-none");
      layerSelection.classList.remove("d-none");
    });
  }
});

// Manejo del botón "Volver"
backButton.addEventListener("click", () => {
  // Oculta la sección de capas y muestra la selección inicial
  layerSelection.classList.add("d-none");
  locationSelection.classList.remove("d-none");
  // Limpia el iframe
  mapIframe.src = "";
  mapIframe.classList.add("d-none");
  // Eliminar la ubicación guardada
  localStorage.removeItem('lastLocation');
});

// Generar botones de categorías dinámicamente
function generateLayerButtons(location) {
  // Mantener el botón de representaciones sociales
  const representacionesButton = layerButtonsContainer.querySelector('[data-layer="representaciones-sociales"]');
  layerButtonsContainer.innerHTML = "";
  
  // Restaurar el botón de representaciones sociales
  if (representacionesButton) {
    layerButtonsContainer.appendChild(representacionesButton);
  }

  // Obtiene las categorías para la ubicación seleccionada
  const categories = mapUrls[location];
  for (const [category, url] of Object.entries(categories)) {
    const button = document.createElement("button");
    button.textContent = categoryNames[category] || category;
    // Agrega clases de estilo similar a los botones de ubicación
    button.classList.add(
      "btn", 
      "btn-primary", 
      "w-100", 
      "w-md-75", 
      "my-2", 
      "option", 
      "custom-option"
    );
    button.classList.add("btn", "option");
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
  mapIframe.classList.remove("d-none");
  // Scroll to the map
  mapIframe.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Manejo del enlace para olvidar la ubicación guardada
const forgetLocationLink = document.getElementById('forget-location');
if (forgetLocationLink) {
  forgetLocationLink.addEventListener('click', function(e) {
    e.preventDefault();
    localStorage.removeItem('lastLocation');
    // Recargar la página para mostrar la selección de ubicación
    window.location.reload();
  });
}
