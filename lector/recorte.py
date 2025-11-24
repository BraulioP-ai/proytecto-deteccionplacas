import cv2
import numpy as np
import sys
import os

def detect_plate(image_path, output_path="plate_detected.jpg"):
    img = cv2.imread(image_path)
    if img is None:
        print("No se pudo cargar la imagen.")
        return None

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (5,5), 0)

    # Aumentamos el contraste local
    clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8,8))
    gray = clahe.apply(blur)

    # Bordes Canny
    edges = cv2.Canny(gray, 40, 300)

    # Dilatar para unir bordes fragmentados
    kernel = np.ones((3, 3), np.uint8)
    edges = cv2.dilate(edges, kernel, iterations=1)

    contours, _ = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)

    cv2.imwrite("debug_edges.png", edges)
    plate_candidate = None
    best_area = 0

    # ------------------------------
    # ENFOQUE 1: Buscar cuadriláteros aproximados
    # ------------------------------
    for cnt in contours:
        perimeter = cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, 0.04 * perimeter, True)

        # Tiene forma de placa si:
        # - Tiene 4 lados (cuadrilátero aproximado)
        # - Área razonable
        if len(approx) == 4:
            x, y, w, h = cv2.boundingRect(approx)
            area = w * h

            # Heurística de placa: es horizontal y de tamaño útil
            if w > h * 1.5 and area > best_area:
                best_area = area
                plate_candidate = (x, y, w, h)

    # ------------------------------
    # ENFOQUE 2: si no hay cuadrilátero, buscar región con mayor densidad de bordes horizontales
    # ------------------------------
    if plate_candidate is None:
        sobelx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
        sobely = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)

        # La placa suele tener más cambios horizontales marcados
        sobel_strength = np.abs(sobelx) - 0.5 * np.abs(sobely)
        sobel_strength = cv2.normalize(sobel_strength, None, 0, 255, cv2.NORM_MINMAX)

        # Umbral
        _, thresh = cv2.threshold(sobel_strength.astype(np.uint8), 150, 255, cv2.THRESH_BINARY)

        # Dilatar para unir líneas
        thresh = cv2.dilate(thresh, np.ones((5,5), np.uint8), iterations=2)

        contours_sobel, _ = cv2.findContours(thresh, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)

        for cnt in contours_sobel:
            x, y, w, h = cv2.boundingRect(cnt)
            area = w * h

            # Heurística similar
            if w > h * 1.5 and area > best_area:
                best_area = area
                plate_candidate = (x, y, w, h)

    # ------------------------------
    # Si se encontró la placa, recortar
    # ------------------------------
    if plate_candidate:
        x, y, w, h = plate_candidate
        plate = img[y:y+h, x:x+w]
        cv2.imwrite(output_path, plate)
        print(f"Placa detectada y guardada como {output_path}")
        return output_path

    print("No se pudo detectar una placa con los métodos actuales.")
    return None


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("\nUso: python detect.py imagen.jpg\n")
        exit(1)

    input_img = sys.argv[1]
    out = "placa_recortada.png"
    detect_plate(input_img, out)

