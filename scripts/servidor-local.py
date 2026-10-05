"""Servidor para probar el sitio en la compu o en el celular (misma red wifi).

Uso:
    python scripts/servidor-local.py        # http://<IP de la compu>:5500/

Igual que `python -m http.server`, pero le pide al navegador que siempre revalide los archivos:
así, después de cambiar algo, no queda una versión vieja guardada en el navegador.
"""

import functools
import http.server
from pathlib import Path

PUERTO = 5500
RAIZ = Path(__file__).resolve().parent.parent


class SinCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()


if __name__ == "__main__":
    manejador = functools.partial(SinCache, directory=str(RAIZ))
    with http.server.ThreadingHTTPServer(("0.0.0.0", PUERTO), manejador) as servidor:
        print(f"Sirviendo {RAIZ} en http://0.0.0.0:{PUERTO}/")
        servidor.serve_forever()
