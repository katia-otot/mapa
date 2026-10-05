// Nombres e íconos de orígenes y temas, compartidos por index.html y recorrido.html

// Nombres amigables para las categorías
const categoryNames = {
  murales: "Murales",
  escuelas: "Escuelas exAlumnos",
  abuelas: "Memoria de las Abuelas",
  exCentroclandestinodeDetención: "Centro Clandestino de Detención",
  lugadesDeSecuestro: "Lugares de Secuestro",
};
const locationNames = {
  quequen: "Quequén",
  terminal: "Terminal de Ómnibus",
  necochea: "Necochea",
};
// Íconos SVG (viewBox 0 0 24 24, trazos) de cada tema; se usan en las tarjetas y en los marcadores del mapa
const categoryIcons = {
  murales: '<circle cx="13.5" cy="6.5" r="1"/><circle cx="17.5" cy="10.5" r="1"/><circle cx="8.5" cy="7.5" r="1"/><circle cx="6.5" cy="12.5" r="1"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.6-.7 1.6-1.7 0-.4-.2-.8-.4-1.1-.3-.3-.5-.7-.5-1.1 0-.9.8-1.7 1.7-1.7h2c3 0 5.6-2.5 5.6-5.6C22 6 17.5 2 12 2z"/>',
  escuelas: '<path d="M22 10v6"/><path d="M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
  // El pañuelo de las Abuelas es siempre blanco: colores fijos, no currentColor
  abuelas: '<g transform="translate(1.4 1) scale(0.22)" stroke="#1b1a18" stroke-width="6" stroke-linejoin="round"><path fill="#fff" d="M33.2 7.8 28.5 11.6 24.4 15.9 20.8 20.5 17.2 26.1 13.2 33.4 10.4 39.2 3.1 57.6 0.1 63.5 0.1 64 13.4 64.4 25.7 65.5 51.8 68.5 65.7 69.2 66 69.8 63.2 72.1 60.5 74.9 56.4 80.7 53.2 87.6 49.4 98.3 49.7 98.4 51.3 97.8 56.9 94.9 60.1 92.7 63.6 89.7 66.1 86.8 68.4 83.4 70.3 79.5 71.9 74.7 72.2 74.2 72.6 74.2 77.4 82.9 80.5 87.5 82.9 90.3 85.8 93.2 89.3 96.1 93.7 98.8 96.3 100 96.5 99.3 93.3 89.9 90.8 83.9 87.9 78.4 85.7 75.3 83.1 72.6 80.4 70.6 77.8 69.2 77.4 68.5 77.6 67.6 80.6 64.1 82 62 84.6 56.7 86.8 50 88.6 41 89 35.8 89.1 28.9 88.5 21.6 87.5 17.1 86.3 13.5 83.4 7.9 80.5 4.6 77.5 2.7 69.5 0.9 60.9 0 52 0.5 46.5 1.6 39.5 4.1Z"/><path fill="#1b1a18" stroke="none" d="M70.9 7.4 73.4 7.5 75.7 8.6 78 10.8 80 13.6 82 17.7 83.2 21.5 84.7 30.4 84.7 37 84.3 41.7 83.7 45.3 82 50.6 79.8 55.4 77.8 58.5 75.6 60.5 74 61.2 72.4 61.5 69.3 61.3 67.3 60.5 65.1 58.5 63.9 56.8 61.8 52.2 60.1 47 59 42 58.4 37 58.4 32.7 59.1 27 60.2 22.2 62.4 16 63.8 12.9 65.4 10.8 67.8 8.7Z"/></g>',
  exCentroclandestinodeDetención: '<path d="M3 10l9-7 9 7v11H3z"/><path d="M9 21v-6h6v6"/>',
  lugadesDeSecuestro: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  representaciones: '<circle cx="12" cy="12" r="10"/><path d="m10 8 6 4-6 4z"/>',
};
