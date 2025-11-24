
import cv2
import sys
import numpy as np

def preprocesar_placa(ruta_imagen):
    # 1. Cargar imagen
    img = cv2.imread(ruta_imagen)
    if img is None:
        print("No se pudo cargar la imagen.")
        return

    h, w = img.shape[:2]

    # 2. Recortar bordes superior/inferior
    porcorte = 0.15  # 0.12
    porcorte_1 = 0.2 
    img = img[int(h * porcorte_1): int(h * (1 - porcorte)), :]

    # 3. Grises
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # 4. Bilateral (suave)
    gray = cv2.bilateralFilter(gray, d=7, sigmaColor=55, sigmaSpace=55)

    # 5. Contraste
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    contrast = clahe.apply(gray)

    # 6. Threshold adaptativo
    thresh = cv2.adaptiveThreshold(
        contrast,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        31,
        6
    )

    # =============================================================
    # 7. ELIMINAR "ISLAS" CONECTED COMPONENTS
    # =============================================================
    # Invertimos, porque connectedComponents espera fondo=0
    inv = 255 - thresh

    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(inv, connectivity=8)

    # Área mínima para considerar real (ajústalo a tu gusto)
    area_minima = 200  #1200

    # Creamos máscara limpia
    cleaned = np.zeros_like(inv)

    for i in range(1, num_labels):
        area = stats[i, cv2.CC_STAT_AREA]
        if area >= area_minima:
            cleaned[labels == i] = 255

    # Volvemos a invertir a blanco-letras / negro-fondo
    cleaned = 255 - cleaned

    # =============================================================
    # 8. Suavizado leve de bordes
    # =============================================================
    cleaned = cv2.medianBlur(cleaned, 3)

    # =============================================================
    # 9. Escalar para OCR
    # =============================================================
    cleaned = cv2.resize(
        cleaned,
        None,
        fx=2,
        fy=2,
        interpolation=cv2.INTER_CUBIC
    )

    # =============================================================
    # 10. Guardar
    # =============================================================
    cv2.imwrite("placa_procesada.png", cleaned)
    print("Imagen procesada guardada como placa_procesada.png")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python preprocesar_placa.py placa_recortada.png")
        sys.exit(1)

    preprocesar_placa(sys.argv[1])
