import easyocr
import cv2
import sys

def leer_placa(ruta_imagen):
    img = cv2.imread(ruta_imagen)
    if img is None:
        print("No se pudo cargar la imagen.")
        return

    # Imagen en escala de grises
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Inicializar OCR solo para inglés (rápido)
    reader = easyocr.Reader(['en'], gpu=False)

    results = reader.readtext(gray, detail=0)

    print("\n======================")
    print("TEXTO DETECTADO:")
    print("======================")
    if results:
        print(results[0])
    else:
        print("No se detectó texto.")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python leer_placa_easyocr.py placa_procesada.png")
        sys.exit(1)

    leer_placa(sys.argv[1])

