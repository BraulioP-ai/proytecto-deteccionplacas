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
    Detecta y recorta la región de la placa usando múltiples técnicas
    """
    img = cv2.imread(image_path)
    if img is None:
        return None

    height, width = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # MEJORA 1: Ecualización de histograma adaptativo
    clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8,8))
    gray = clahe.apply(gray)
    
    # MEJORA 2: Múltiples técnicas de detección de bordes
    # Técnica 1: Bilateral + Canny
    blur1 = cv2.bilateralFilter(gray, 11, 17, 17)
    edges1 = cv2.Canny(blur1, 30, 200)
    
    # Técnica 2: GaussianBlur + Canny con diferentes parámetros
    blur2 = cv2.GaussianBlur(gray, (5,5), 0)
    edges2 = cv2.Canny(blur2, 50, 150)
    
    # Combinar ambas detecciones
    edges = cv2.bitwise_or(edges1, edges2)
    
    # Dilatación para conectar bordes
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    edges = cv2.dilate(edges, kernel, iterations=1)

    contours, _ = cv2.findContours(edges, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
    contours = sorted(contours, key=cv2.contourArea, reverse=True)[:40]

    candidates = []

    for cnt in contours:
        perimeter = cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, 0.02 * perimeter, True)

        # MEJORA 3: Buscar tanto cuadriláteros como rectángulos aproximados
        if len(approx) >= 4:
            x, y, w, h = cv2.boundingRect(cnt)
            
            # Validaciones más flexibles
            aspect_ratio = w / float(h) if h > 0 else 0
            area = w * h
            
            # Filtros para placas mexicanas
            # - Aspect ratio entre 1.8 y 5.0 (más flexible)
            # - Área mínima de 1500 px
            # - No muy grande (máximo 40% de la imagen)
            # - No muy chica en altura (mínimo 15px)
            max_area = (width * height) * 0.4
            
            if (1.8 < aspect_ratio < 5.0 and 
                1500 < area < max_area and 
                h > 15 and w > 50):
                
                # Calcular score con múltiples factores
                ratio_ideal = 3.2  # Ratio ideal para placas mexicanas
                ratio_score = 1 / (1 + abs(aspect_ratio - ratio_ideal))
                area_score = area / 5000  # Normalizar área
                position_score = 1 - (y / height)  # Placas suelen estar en parte baja
                
                total_score = (area_score * 0.5) + (ratio_score * 0.3) + (position_score * 0.2)
                
                candidates.append({
                    'bbox': (x, y, w, h),
                    'score': total_score,
                    'area': area,
                    'ratio': aspect_ratio
                })

    if not candidates:
        return None
    
    # MEJORA 4: Ordenar por score y probar los mejores candidatos
    candidates = sorted(candidates, key=lambda x: x['score'], reverse=True)
    
    # Tomar el mejor candidato
    best = candidates[0]
    x, y, w, h = best['bbox']
    
    # MEJORA 5: Agregar margen inteligente según tamaño
    margin_x = int(w * 0.05)  # 5% del ancho
    margin_y = int(h * 0.1)   # 10% del alto
    
    x = max(0, x - margin_x)
    y = max(0, y - margin_y)
    w = min(img.shape[1] - x, w + 2*margin_x)
    h = min(img.shape[0] - y, h + 2*margin_y)
    
    plate = img[y:y+h, x:x+w]
    cv2.imwrite(output_path, plate)
    
    print(f"📍 Placa detectada: área={best['area']}, ratio={best['ratio']:.2f}, score={best['score']:.2f}")
    return output_path


def corregir_rotacion(img):
    """
    MEJORA 6: Detecta y corrige la rotación de la placa
    """
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img
    
    # Detectar bordes
    edges = cv2.Canny(gray, 50, 150, apertureSize=3)
    
    # Detectar líneas con Hough Transform
    lines = cv2.HoughLines(edges, 1, np.pi/180, threshold=100)
    
    if lines is not None and len(lines) > 0:
        # Calcular ángulo promedio de las líneas
        angles = []
        for rho, theta in lines[:10]:  # Tomar las 10 líneas más fuertes
            angle = np.degrees(theta) - 90
            if -45 < angle < 45:  # Filtrar ángulos razonables
                angles.append(angle)
        
        if angles:
            median_angle = np.median(angles)
            
            # Solo rotar si el ángulo es significativo
            if abs(median_angle) > 2:
                print(f"🔄 Corrigiendo rotación: {median_angle:.2f}°")
                h, w = gray.shape
                center = (w // 2, h // 2)
                M = cv2.getRotationMatrix2D(center, median_angle, 1.0)
                img = cv2.warpAffine(img, M, (w, h), 
                                     flags=cv2.INTER_CUBIC,
                                     borderMode=cv2.BORDER_REPLICATE)
    
    return img


def preprocesar_placa(ruta_imagen):
    """
    MEJORA 7: Múltiples técnicas de preprocesamiento
    """
    img = cv2.imread(ruta_imagen)
    if img is None:
        return None

    # Corregir rotación primero
    img = corregir_rotacion(img)
    
    height, width = img.shape[:2]

    # Recortar bordes conservadoramente
    crop_top = int(height * 0.1)
    crop_bottom = int(height * 0.9)
    crop_left = int(width * 0.02)
    crop_right = int(width * 0.98)
    img = img[crop_top:crop_bottom, crop_left:crop_right]

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # MEJORA 8: Resize más agresivo (3x en lugar de 2x)
    gray = cv2.resize(gray, None, fx=3, fy=3, interpolation=cv2.INTER_CUBIC)

    # MEJORA 9: Ecualización adaptativa más suave
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)

    # MEJORA 10: Denoise antes de binarizar
    denoised = cv2.fastNlMeansDenoising(enhanced, None, h=10, templateWindowSize=7, searchWindowSize=21)
    
    # Suavizado ligero
    denoised = cv2.GaussianBlur(denoised, (3, 3), 0)

    # MEJORA 11: Probar múltiples técnicas de binarización
    results = []
    
    # Técnica 1: Adaptive MEAN (de p.py)
    thresh1 = cv2.adaptiveThreshold(
        denoised, 255,
        cv2.ADAPTIVE_THRESH_MEAN_C,
        cv2.THRESH_BINARY,
        19, 9
    )
    
    # Técnica 2: Adaptive GAUSSIAN
    thresh2 = cv2.adaptiveThreshold(
        denoised, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        19, 9
    )
    
    # Técnica 3: OTSU
    _, thresh3 = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    # MEJORA 12: Morphología para cada técnica
    kernel = np.ones((2, 2), np.uint8)
    
    for thresh in [thresh1, thresh2, thresh3]:
        # Aplicar CLOSE para reparar caracteres
        processed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
        
        # Eliminar ruido pequeño
        inv = 255 - processed
        num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(inv, connectivity=8)
        
        cleaned = np.zeros_like(inv)
        for i in range(1, num_labels):
            area = stats[i, cv2.CC_STAT_AREA]
            if 30 <= area <= 5000:  # Filtro de área más estricto
                cleaned[labels == i] = 255
        
        cleaned = 255 - cleaned
        results.append(cleaned)
    
    # Guardar las 3 versiones para probarlas con OCR
    for idx, result in enumerate(results):
        output_path = f"placa_procesada_{idx}.png"
        cv2.imwrite(output_path, result)
    
    return results  # Retornar lista de rutas


def corregir_caracter_inteligente(texto, posicion):
    """
    MEJORA 13: Corrección de caracteres según posición
    Formato mexicano: AAA000A
    Posiciones 0-2: Solo letras
    Posiciones 3-5: Solo números
    Posición 6: Solo letra
    """
    correcciones_a_numero = {
        'O': '0', 'I': '1', 'L': '1', 'Z': '2', 
        'S': '5', 'B': '8', 'G': '6', 'Q': '0'
    }
    
    correcciones_a_letra = {
        '0': 'O', '1': 'I', '2': 'Z', '5': 'S', 
        '8': 'B', '6': 'G'
    }
    
    if posicion in [0, 1, 2, 6]:  # Posiciones de letras
        if texto in correcciones_a_letra:
            return correcciones_a_letra[texto]
    elif posicion in [3, 4, 5]:  # Posiciones de números
        if texto in correcciones_a_numero:
            return correcciones_a_numero[texto]
    
    return texto


def limpiar_texto_placa_inteligente(texto):
    """
    MEJORA 14: Limpieza y corrección inteligente
    """
    if not texto:
        return None
    
    # Remover espacios y caracteres especiales
    texto = re.sub(r'[^A-Z0-9]', '', texto.upper())
    
    if len(texto) < 6:
        return None
    
    # Si es muy largo, intentar extraer 7 caracteres válidos
    if len(texto) > 7:
        # Buscar patron AAA000A en el texto
        patron = r'[A-Z]{3}[0-9]{3}[A-Z]'
        match = re.search(patron, texto)
        if match:
            texto = match.group(0)
        else:
            texto = texto[:7]
    
    # Aplicar correcciones según posición
    texto_corregido = ''
    for i, char in enumerate(texto[:7]):
        if i < 7:
            texto_corregido += corregir_caracter_inteligente(char, i)
        else:
            break
    
    return texto_corregido


def validar_formato_placa(texto):
    """
    Valida formato de placa mexicana AAA000A
    """
    if not texto or len(texto) < 6:
        return False
    
    patron = r'^[A-Z]{3}\d{3}[A-Z]?$'
    return bool(re.match(patron, texto))


def leer_placa(rutas_imagenes):
    """
    MEJORA 15: Lee múltiples versiones y elige la mejor
    """
    try:
        todos_resultados = []
        
        # Si es string, convertir a lista
        if isinstance(rutas_imagenes, str):
            rutas_imagenes = [rutas_imagenes]
        elif not isinstance(rutas_imagenes, list):
            return None
        
        # Configuraciones de Tesseract a probar
        configs = [
            '--oem 3 --psm 7 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
            '--oem 3 --psm 8 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
            '--oem 3 --psm 6 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
            '--oem 3 --psm 13 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
        ]
        
        # Probar cada imagen procesada
        for ruta in rutas_imagenes:
            if not os.path.exists(ruta):
                continue
                
            img = Image.open(ruta)
            
            # Probar cada configuración
            for config in configs:
                texto = pytesseract.image_to_string(img, config=config)
                texto_limpio = limpiar_texto_placa_inteligente(texto)
                
                if texto_limpio and len(texto_limpio) >= 6:
                    # Calcular score de calidad
                    score = len(texto_limpio)
                    if validar_formato_placa(texto_limpio):
                        score += 10  # Bonus si cumple formato perfecto
                    
                    todos_resultados.append({
                        'texto': texto_limpio,
                        'score': score,
                        'valido': validar_formato_placa(texto_limpio)
                    })
        
        if not todos_resultados:
            return None
        
        # MEJORA 16: Ordenar por score y validez
        todos_resultados = sorted(todos_resultados, key=lambda x: (x['valido'], x['score']), reverse=True)
        
        # Tomar el mejor resultado
        mejor = todos_resultados[0]
        print(f"✅ Mejor resultado: {mejor['texto']} (válido: {mejor['valido']}, score: {mejor['score']})")
        
        # Si los primeros 3 resultados coinciden, es más confiable
        if len(todos_resultados) >= 3:
            top3 = [r['texto'] for r in todos_resultados[:3]]
            if top3[0] == top3[1] or top3[0] == top3[2]:
                print("🎯 Alta confianza: múltiples coincidencias")
        
        return mejor['texto']
        
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

        print("🔍 Paso 1: Detectando región de placa con técnicas mejoradas...")
        plate_path = detect_plate(temp_input, "temp_plate.jpg")
        
        if not plate_path:
            os.remove(temp_input)
            return jsonify({
                'success': False,
                'message': 'No se detectó placa en la imagen'
            })

        print("🔧 Paso 2: Preprocesando con múltiples técnicas...")
        processed_images = preprocesar_placa(plate_path)
        
        if not processed_images:
            os.remove(temp_input)
            os.remove(plate_path)
            return jsonify({
                'success': False,
                'message': 'Error al procesar la placa'
            })

        # Crear lista de rutas
        processed_paths = [f"placa_procesada_{i}.png" for i in range(len(processed_images))]

        print("📖 Paso 3: Leyendo con OCR ultra-optimizado...")
        plate_text = leer_placa(processed_paths)
        
        # Limpiar archivos temporales
        os.remove(temp_input)
        os.remove(plate_path)
        for path in processed_paths:
            if os.path.exists(path):
                os.remove(path)
        
        if not plate_text:
            return jsonify({
                'success': False,
                'message': 'No se pudo leer el texto de la placa'
            })

        # Confianza basada en validación
        confidence = 0.98 if validar_formato_placa(plate_text) else 0.70

        print(f"✅ Detección exitosa: {plate_text} (confianza: {confidence})")

        return jsonify({
            'success': True,
            'plate': plate_text,
            'confidence': confidence,
            'timestamp': datetime.now().isoformat()
        })

    except Exception as e:
        print(f"❌ Error en detección: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok', 
        'message': 'API de detección ULTRA-MEJORADA funcionando',
        'improvements': [
            'Detección multi-técnica con scoring',
            'Corrección automática de rotación',
            'Preprocesamiento con 3 técnicas diferentes',
            'Resize 3x para mejor precisión',
            'OCR con múltiples configuraciones',
            'Corrección inteligente por posición',
            'Validación estricta de formato'
        ]
    })


if __name__ == '__main__':
    print("🚀 Iniciando API de detección de placas ULTRA-MEJORADA")
    print("🔍 Servidor corriendo en http://localhost:5000")
    print("✨ MEJORAS ADICIONALES:")
    print("   1. Detección multi-técnica con scoring inteligente")
    print("   2. Corrección automática de rotación")
    print("   3. 3 técnicas de binarización (MEAN, GAUSSIAN, OTSU)")
    print("   4. Resize 3x para mayor precisión")
    print("   5. 4 configuraciones de Tesseract (PSM 6,7,8,13)")
    print("   6. Corrección de caracteres según posición")
    print("   7. Validación estricta con scoring")
    app.run(host='0.0.0.0', port=5000, debug=True)