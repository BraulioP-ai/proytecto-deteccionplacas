from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
import pytesseract
from PIL import Image
import os
import base64
from datetime import datetime
import re

app = Flask(__name__)
CORS(app)

def detect_plate(image_path, output_path="plate_detected.jpg"):
    """
    Detecta y recorta la región de la placa en la imagen
    """
    img = cv2.imread(image_path)
    if img is None:
        return None

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Mejorar contraste
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
    gray = clahe.apply(gray)
    
    # Reducir ruido
    gray = cv2.bilateralFilter(gray, 11, 17, 17)

    # Detectar bordes con Canny
    edges = cv2.Canny(gray, 30, 200)
    
    # Dilatar para conectar bordes
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    edges = cv2.dilate(edges, kernel, iterations=1)

    contours, _ = cv2.findContours(edges, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
    contours = sorted(contours, key=cv2.contourArea, reverse=True)[:30]

    plate_candidate = None
    best_score = 0

    for cnt in contours:
        perimeter = cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, 0.018 * perimeter, True)

        if len(approx) == 4:
            x, y, w, h = cv2.boundingRect(approx)
            aspect_ratio = w / float(h)
            area = w * h
            
            # Placas mexicanas tienen ratio entre 2:1 y 4:1
            if 2.0 < aspect_ratio < 4.5 and area > 2000:
                score = area * (1 / abs(aspect_ratio - 3.0))
                if score > best_score:
                    best_score = score
                    plate_candidate = (x, y, w, h)

    if plate_candidate:
        x, y, w, h = plate_candidate
        # Agregar margen
        margin = 5
        x = max(0, x - margin)
        y = max(0, y - margin)
        w = min(img.shape[1] - x, w + 2*margin)
        h = min(img.shape[0] - y, h + 2*margin)
        
        plate = img[y:y+h, x:x+w]
        cv2.imwrite(output_path, plate)
        return output_path

    return None


def preprocesar_placa(ruta_imagen):
    """
    Preprocesa la placa usando las técnicas mejoradas de p.py
    MEJORAS INTEGRADAS:
    - CLAHE optimizado (clipLimit=3.0)
    - Adaptive Threshold en lugar de umbral fijo
    - Morphology CLOSE para reparar caracteres
    - Resize 2x para mejor OCR
    - Suavizado controlado con GaussianBlur
    """
    img = cv2.imread(ruta_imagen)
    if img is None:
        return None

    height, width = img.shape[:2]

    # Recortar bordes (ajustado según p.py)
    crop_top = int(height * 0.15)
    crop_bottom = int(height * 0.85)
    crop_left = int(width * 0.02)
    crop_right = int(width * 0.98)
    img = img[crop_top:crop_bottom, crop_left:crop_right]

    # Convertir a escala de grises
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Resize 2x ANTES de procesar (mejora de p.py)
    gray = cv2.resize(gray, None, fx=2, fy=2, interpolation=cv2.INTER_LINEAR)

    # Mejorar contraste con CLAHE (parámetros optimizados de p.py)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    contrast = clahe.apply(gray)

    # Suavizado ligero para quitar ruido sin perder detalles (de p.py)
    contrast = cv2.GaussianBlur(contrast, (3, 3), 0)

    # Binarización adaptativa (mejora clave de p.py)
    thresh = cv2.adaptiveThreshold(
        contrast,
        255,
        cv2.ADAPTIVE_THRESH_MEAN_C,  # Cambiado de GAUSSIAN a MEAN como en p.py
        cv2.THRESH_BINARY,
        19,  # Parámetros optimizados de p.py
        9
    )

    # Morfología CLOSE muy leve para reparar caracteres (de p.py)
    kernel = np.ones((2, 2), np.uint8)
    thresh = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
    
    # Eliminar componentes pequeños (ruido)
    inv = 255 - thresh
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(inv, connectivity=8)
    
    area_minima = 50
    cleaned = np.zeros_like(inv)
    
    for i in range(1, num_labels):
        area = stats[i, cv2.CC_STAT_AREA]
        if area >= area_minima:
            cleaned[labels == i] = 255
    
    cleaned = 255 - cleaned

    output_path = "placa_procesada.png"
    cv2.imwrite(output_path, cleaned)
    return output_path


def limpiar_texto_placa(texto):
    """
    Limpia y corrige el texto detectado
    """
    if not texto:
        return None
    
    # Remover todo excepto letras y números
    texto = re.sub(r'[^A-Z0-9]', '', texto.upper())
    
    # Correcciones comunes de OCR
    correcciones = {
        'O': '0',  # O por 0 en números
        'I': '1',  # I por 1
        'S': '5',  # S por 5
        'Z': '2',  # Z por 2
        'B': '8',  # B por 8
    }
    
    # Aplicar correcciones solo en la parte numérica (posiciones 3-6)
    if len(texto) >= 6:
        inicio = texto[:3]  # Primeras 3 letras
        numeros = texto[3:6]  # 3 números
        final = texto[6:] if len(texto) > 6 else ''  # Última letra
        
        # Corregir números
        for viejo, nuevo in correcciones.items():
            numeros = numeros.replace(viejo, nuevo)
        
        texto = inicio + numeros + final
    
    return texto


def validar_formato_placa(texto):
    """
    Valida que el texto cumpla con formato de placa mexicana AAA000A
    """
    if not texto or len(texto) < 6:
        return False
    
    # Formato: 3 letras + 3 números + 1 letra (opcional el último)
    patron = r'^[A-Z]{3}\d{3}[A-Z]?$'
    return bool(re.match(patron, texto))


def leer_placa(ruta_imagen):
    """
    Lee la placa usando Tesseract OCR con configuración optimizada de p.py
    """
    try:
        img = Image.open(ruta_imagen)
        
        # Configuración de Tesseract optimizada (de p.py)
        # --oem 3: OCR Engine Mode 3 (Default, based on what is available)
        # --psm 7: Treat the image as a single text line
        config = '--oem 3 --psm 7 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
        
        # Configuraciones adicionales para probar
        configs = [
            '--oem 3 --psm 7 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
            '--oem 3 --psm 8 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
            '--oem 3 --psm 13 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
        ]
        
        mejores_resultados = []
        
        for config in configs:
            texto = pytesseract.image_to_string(img, config=config)
            texto_limpio = limpiar_texto_placa(texto)
            
            if texto_limpio and len(texto_limpio) >= 6:
                mejores_resultados.append(texto_limpio)
        
        # Priorizar el que cumpla con formato válido
        for resultado in mejores_resultados:
            if validar_formato_placa(resultado):
                print(f"✅ Placa validada: {resultado}")
                return resultado
        
        # Si ninguno cumple formato perfecto, devolver el más largo
        if mejores_resultados:
            mejor = max(mejores_resultados, key=len)
            print(f"⚠️ Placa detectada (sin validar formato): {mejor}")
            
            # Intentar ajustar al formato correcto
            if len(mejor) >= 7:
                ajustada = mejor[:7]  # Tomar solo 7 caracteres
                if validar_formato_placa(ajustada):
                    return ajustada
            
            return mejor
        
        return None
        
    except Exception as e:
        print(f"❌ Error en OCR: {e}")
        return None


@app.route('/detect', methods=['POST'])
def detect():
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No se envió imagen'}), 400

        file = request.files['image']
        
        temp_input = f"temp_input_{datetime.now().timestamp()}.jpg"
        file.save(temp_input)

        print("🔍 Paso 1: Detectando región de placa...")
        plate_path = detect_plate(temp_input, "temp_plate.jpg")
        
        if not plate_path:
            os.remove(temp_input)
            return jsonify({
                'success': False,
                'message': 'No se detectó placa en la imagen'
            })

        print("🔧 Paso 2: Preprocesando imagen (con mejoras de p.py)...")
        processed_path = preprocesar_placa(plate_path)
        
        if not processed_path:
            os.remove(temp_input)
            os.remove(plate_path)
            return jsonify({
                'success': False,
                'message': 'Error al procesar la placa'
            })

        print("📖 Paso 3: Leyendo texto con OCR optimizado...")
        plate_text = leer_placa(processed_path)
        
        if not plate_text:
            os.remove(temp_input)
            os.remove(plate_path)
            os.remove(processed_path)
            return jsonify({
                'success': False,
                'message': 'No se pudo leer el texto de la placa'
            })

        # Confianza basada en validación de formato
        confidence = 0.95 if validar_formato_placa(plate_text) else 0.75

        with open(plate_path, 'rb') as img_file:
            plate_image_base64 = base64.b64encode(img_file.read()).decode('utf-8')

        os.remove(temp_input)
        os.remove(plate_path)
        os.remove(processed_path)

        print(f"✅ Detección exitosa: {plate_text} (confianza: {confidence})")

        return jsonify({
            'success': True,
            'plate': plate_text,
            'confidence': confidence,
            'image': plate_image_base64,
            'timestamp': datetime.now().isoformat()
        })

    except Exception as e:
        print(f"❌ Error en detección: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok', 
        'message': 'API de detección funcionando con Tesseract OCR MEJORADO v2',
        'improvements': [
            'CLAHE optimizado (clipLimit=3.0)',
            'Adaptive Threshold MEAN',
            'Morphology CLOSE para reparar caracteres',
            'Resize 2x antes de procesamiento',
            'GaussianBlur controlado (3x3)'
        ]
    })


if __name__ == '__main__':
    print("🚀 Iniciando API de detección de placas MEJORADA")
    print("🔍 Servidor corriendo en http://localhost:5000")
    print("✨ MEJORAS INTEGRADAS de p.py:")
    print("   - CLAHE con parámetros optimizados")
    print("   - Adaptive Threshold MEAN_C")
    print("   - Morphology CLOSE ligero")
    print("   - Resize 2x antes de OCR")
    print("   - GaussianBlur controlado")
    app.run(host='0.0.0.0', port=5000, debug=True)