"""Descarga los recorridos de Google My Maps (solo lectura) y los guarda como JSON.

Uso:
    python scripts/exportar-mymaps.py                 # exporta todos los recorridos configurados
    python scripts/exportar-mymaps.py quequen-murales # exporta solo ese recorrido

Cada mapa de My Maps trae varias capas (una por recorrido). Solo la capa del tema
tiene nombres, textos y fotos completos; por eso cada recorrido indica su capa.
Si no se indica, se elige la capa con más contenido y se avisa por consola.

Las fotos se descargan y se guardan achicadas en WebP porque Google no permite
mostrarlas desde otros sitios (Cross-Origin-Resource-Policy: same-site).
Requiere Pillow: pip install Pillow
"""

import hashlib
import html
import io
import json
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

from PIL import Image, ImageOps

KML_NS = "{http://www.opengis.net/kml/2.2}"
KML_URL = "https://www.google.com/maps/d/kml?mid={mid}&forcekml=1"
EMBED_URL = "https://www.google.com/maps/d/u/0/embed?mid={mid}&ehbc=2E312F&noprof=1"
RAIZ = Path(__file__).resolve().parent.parent
SALIDA = RAIZ / "datos" / "recorridos"
CARPETA_FOTOS = SALIDA / "fotos"
TAMANOS_FOTO = {"chica": 640, "grande": 1600}
CALIDAD_WEBP = 78

CATEGORIAS = {
    "murales": "murales",
    "escuelas": "escuelas",
    "abuelas": "abuelas",
    "ccd": "exCentroclandestinodeDetención",
    "secuestro": "lugadesDeSecuestro",
}

# origen -> tema -> (mid del mapa, índice de la capa del tema). Capas revisadas a mano:
# en cada mapa, la capa del tema es la única con fotos.
MAPAS = {
    "quequen": {
        "murales": ("1dxXO7fuLJ_PaViZ44AKumKmAnBYSV4w", 0),
        "escuelas": ("1X317OxlzPOVKj5KeEwT3PaWzgCBNJGM", 1),
        "abuelas": ("1_7E-AVQIVTqbXb8Eu7EOTOsi47q14Nc", 2),
        "ccd": ("1jrF-6j8wEAlqxIoaM7pk4-kPT3hfyu8", 3),
        "secuestro": ("1HZyTvVBNgwfWR55fgfdNKvGzvvNiHDM", 4),
    },
    "terminal": {
        "murales": ("18uFIaiX3bhFtRpxI9qJo7HsblcMoTgw", 5),
        "escuelas": ("1-eAojrCYuxXSvqe0Aj9vVjcpzLevc2Q", 6),
        "abuelas": ("1Y-CxU80-VLPfQlrWJEU26OS2y5Hay7A", 7),
        "ccd": ("1kQFYk9YkHB9uan9C24oopIutAnmHnhA", 8),
        "secuestro": ("1PLk7uTHBO3P5_HQHc_ECO15Cplw1cdE", 9),
    },
    "necochea": {
        "murales": ("1250ovuPZKnEtUXbVBsk2IaaA07t3sSQ", 4),
        "escuelas": ("1qyOwHvUKlBjJGpPqULsFXaz-Bq4hNZw", 3),
        "abuelas": ("1HnN0-oD8ltFQOX0xFc1bOQFRkFRDrs4", 2),
        "ccd": ("1UxJ3xAKtIxaoSGVoLs6IP1D7ze4fT4s", 0),
        "secuestro": ("1Ps_fZ641AJdXe_NxGorjAMyyuUSscUE", 1),
    },
}

RECORRIDOS = {
    f"{origen}-{tema}": {"origen": origen, "categoria": CATEGORIAS[tema], "mid": mid, "capa": capa}
    for origen, temas in MAPAS.items()
    for tema, (mid, capa) in temas.items()
}


def descargar(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req) as respuesta:
        return respuesta.read()


def descargar_kml(mid):
    return ET.fromstring(descargar(KML_URL.format(mid=mid)))


def guardar_foto(url):
    """Guarda la foto en dos tamaños y devuelve sus rutas relativas.
    Los mapas repiten las mismas fotos con URLs distintas: el nombre sale del contenido para guardarlas una sola vez."""
    original = descargar(url + "?fife=s16383")
    clave = hashlib.sha1(original).hexdigest()[:12]
    rutas = {nombre: CARPETA_FOTOS / f"{clave}-{nombre}.webp" for nombre in TAMANOS_FOTO}
    if not all(ruta.exists() for ruta in rutas.values()):
        imagen = ImageOps.exif_transpose(Image.open(io.BytesIO(original)))
        imagen = imagen.convert("RGB")
        CARPETA_FOTOS.mkdir(parents=True, exist_ok=True)
        for nombre, lado in TAMANOS_FOTO.items():
            copia = imagen.copy()
            copia.thumbnail((lado, lado))
            copia.save(rutas[nombre], "WEBP", quality=CALIDAD_WEBP, method=6)
    with Image.open(rutas["grande"]) as grande:
        ancho, alto = grande.size
    foto = {nombre: ruta.relative_to(RAIZ).as_posix() for nombre, ruta in rutas.items()}
    foto.update({"ancho": ancho, "alto": alto, "original": url})
    return foto


def coordenadas(texto):
    puntos = []
    for tripla in texto.split():
        lng, lat = tripla.split(",")[:2]
        puntos.append([round(float(lng), 6), round(float(lat), 6)])
    return puntos


def fotos_de(placemark, descripcion):
    urls = re.findall(r'<img[^>]+src="([^"]+)"', descripcion)
    for data in placemark.iter(KML_NS + "Data"):
        if data.get("name") == "gx_media_links":
            urls.extend((data.findtext(KML_NS + "value") or "").split())
    sin_repetir = []
    for url in urls:
        base = url.split("?")[0]
        if base not in sin_repetir:
            sin_repetir.append(base)
    return sin_repetir


def parrafos_de(descripcion):
    texto = re.sub(r"<img[^>]*>", "", descripcion)
    texto = re.sub(r"<br\s*/?>", "\n", texto, flags=re.IGNORECASE)
    texto = html.unescape(re.sub(r"<[^>]+>", "", texto))
    return [p.strip() for p in re.split(r"\n\s*\n", texto) if p.strip()]


def nombre_y_direccion(texto):
    """Algunos mapas ponen la dirección dentro del nombre: '"Comisaría 1°"\\nAv. 58 3002, Necochea, ...'
    o 'Juan Felipe Miyares (16/06/2023) Calle 71 799, Necochea, ...'. Se separan en dos campos."""
    texto = texto.strip()
    if "\n" in texto:
        nombre, direccion = texto.split("\n", 1)
    else:
        partes = re.match(r"^(.*\))\s+(.+Provincia de Buenos Aires.*)$", texto)
        if not partes:
            return texto, ""
        nombre, direccion = partes.groups()
    direccion = re.sub(r",\s*Provincia de Buenos Aires(,\s*Argentina)?$", "", " ".join(direccion.split()))
    return nombre.strip().strip('"').strip(), direccion


def leer_capa(carpeta):
    ruta = []
    paradas = []
    for placemark in carpeta.iter(KML_NS + "Placemark"):
        linea = placemark.find(f".//{KML_NS}LineString/{KML_NS}coordinates")
        if linea is not None:
            ruta.extend(coordenadas(linea.text))
            continue
        punto = placemark.find(f".//{KML_NS}Point/{KML_NS}coordinates")
        if punto is None:
            continue
        descripcion = placemark.findtext(KML_NS + "description") or ""
        nombre, direccion = nombre_y_direccion(placemark.findtext(KML_NS + "name") or "")
        paradas.append({
            "nombre": nombre,
            "direccion": direccion,
            "coordenadas": coordenadas(punto.text)[0],
            "parrafos": parrafos_de(descripcion),
            "fotos": fotos_de(placemark, descripcion),
        })
    return ruta, paradas


def capa_con_mas_contenido(carpetas):
    def puntaje(carpeta):
        _, paradas = leer_capa(carpeta)
        return sum(len(" ".join(p["parrafos"])) + 200 * len(p["fotos"]) for p in paradas)
    return max(range(len(carpetas)), key=lambda i: puntaje(carpetas[i]))


def exportar(recorrido_id, config):
    raiz = descargar_kml(config["mid"])
    carpetas = list(raiz.iter(KML_NS + "Folder"))
    indice = config.get("capa")
    if indice is None:
        indice = capa_con_mas_contenido(carpetas)
        print(f"  aviso: capa elegida automáticamente ({indice}); revisala y fijala en RECORRIDOS")
    carpeta = carpetas[indice]
    ruta, paradas = leer_capa(carpeta)

    for parada in paradas:
        parada["fotos"] = [guardar_foto(url) for url in parada["fotos"]]

    datos = {
        "id": recorrido_id,
        "titulo": raiz.findtext(f"{KML_NS}Document/{KML_NS}name"),
        "origen": config["origen"],
        "categoria": config["categoria"],
        "capa": carpeta.findtext(KML_NS + "name"),
        "mapaOriginal": EMBED_URL.format(mid=config["mid"]),
        "ruta": ruta,
        "paradas": paradas,
    }
    SALIDA.mkdir(parents=True, exist_ok=True)
    destino = SALIDA / f"{recorrido_id}.json"
    destino.write_text(json.dumps(datos, ensure_ascii=False, indent=2), encoding="utf-8")
    cantidad_fotos = sum(len(p["fotos"]) for p in paradas)
    print(f"  {destino.name}: {len(paradas)} paradas, {len(ruta)} puntos de ruta, {cantidad_fotos} fotos")


def main():
    pedidos = sys.argv[1:] or list(RECORRIDOS)
    for recorrido_id in pedidos:
        if recorrido_id not in RECORRIDOS:
            sys.exit(f"Recorrido desconocido: {recorrido_id}")
        print(recorrido_id)
        exportar(recorrido_id, RECORRIDOS[recorrido_id])


if __name__ == "__main__":
    main()
