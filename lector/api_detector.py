from flask import Flask, request, jsonify
from flask_cors import CORS
import easyocr
import cv2
import numpy as np
from datetime import datetime
import os
import re

app = Flask(__name__)
CORS(app)

# Inicializar EasyOCR (solo una vez al inicio)
print("🔄 Inicializando EasyOCR (puede tardar un poco la primera vez)...")
reader = easyocr.Reader(['en'], gpu=False)  # 'en' para letras y números
print("✅ EasyOCR listo!")


def limpiar_placa(texto):
    """
    Limpia el texto detectado para que parezca placa mexicana
    """
    if not texto:
        return None
    
    # Remover espacios y caracteres raros
    texto = re.sub(r'[^A-Z0-9\-]', '', texto.upper())
    
    # Correcciones comunes
    correcciones = {
        'O': '0', 'I': '1', 'L': '1', 'S': '5', 
        'Z': '2', 'B': '8', 'G': '6'
    }
    
    # Si tiene 7+ caracteres, intentar formato AAA000A
    if len(texto) >= 7:
        # Buscar patrón
        match = re.search(r'[A-Z]{3}[\-]?\d{3}[\-]?[A-Z]', texto)
        if match:
            return match.group(0)
    
    # Aplicar correcciones básicas
    if len(texto) >= 6:
        resultado = ''
        for i, char in enumerate(texto[:7]):
            # Posiciones 0-2 y 6 deben ser letras
            if i in [0, 1, 2, 6] and char.isdigit():
                # Convertir número a letra
                if char in ['0']: resultado += 'O'
                elif char in ['1']: resultado += 'I'
                elif char in ['5']: resultado += 'S'
                elif char in ['8']: resultado += 'B'
                else: resultado += char
            # Posiciones 3-5 deben ser números
            elif i in [3, 4, 5] and char.isalpha():
                # Convertir letra a número
                if char in correcciones:
                    resultado += correcciones[char]
                else:
                    resultado += char
            else:
                resultado += char
        return resultado
    
    return texto if len(texto) >= 4 else None


def validar_placa(texto):
    """
    Valida que parezca placa mexicana
    """
    if not texto or len(texto) < 6:
        return False
    
    # Formato con o sin guiones: AAA000A o AAA-000-A
    patron1 = r'^[A-Z]{3}\d{3}[A-Z]?$'
    patron2 = r'^[A-Z]{3}\-\d{3}\-[A-Z]?$'
    
    return bool(re.match(patron1, texto)) or bool(re.match(patron2, texto))


@app.route('/detect', methods=['POST'])
def detect():
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No se envió imagen'}), 400

        file = request.files['image']
        
        temp_input = f"temp_input_{datetime.now().timestamp()}.jpg"
        file.save(temp_input)
        
        print(f"📸 Procesando imagen con EasyOCR...")
        
        # Leer imagen
        img = cv2.imread(temp_input)
        
        # EasyOCR funciona mejor con imágenes no muy grandes
        height, width = img.shape[:2]
        if width > 1280:
            scale = 1280 / width
            img = cv2.resize(img, None, fx=scale, fy=scale)
        
        # Detectar TODO el texto en la imagen
        results = reader.readtext(img)
        
        print(f"🔍 Textos detectados: {len(results)}")
        
        # Buscar el que más parezca placa
        candidatos = []
        for (bbox, text, confidence) in results:
            texto_limpio = limpiar_placa(text)
            
            if texto_limpio and len(texto_limpio) >= 6:
                es_valido = validar_placa(texto_limpio)
                
                # Calcular score
                score = confidence
                if es_valido:
                    score += 0.5  # Bonus por formato válido
                if len(texto_limpio) == 7:
                    score += 0.2  # Bonus por longitud correcta
                
                candidatos.append({
                    'texto': texto_limpio,
                    'confianza': confidence,
                    'score': score,
                    'valido': es_valido,
                    'original': text
                })
                
                print(f"   📋 '{text}' → '{texto_limpio}' (conf: {confidence:.2f}, válido: {es_valido})")
        
        # Limpiar archivo temporal
        os.remove(temp_input)
        
        if not candidatos:
            print("❌ No se detectó ninguna placa")
            return jsonify({
                'success': False,
                'message': 'No se detectó placa en la imagen'
            })
        
        # Ordenar por score
        candidatos = sorted(candidatos, key=lambda x: x['score'], reverse=True)
        mejor = candidatos[0]
        
        print(f"✅ MEJOR CANDIDATO: {mejor['texto']} (score: {mejor['score']:.2f})")
        
        return jsonify({
            'success': True,
            'plate': mejor['texto'],
            'confidence': mejor['score'],
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        print(f"❌ Error: {e}")
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
        'message': 'API con EasyOCR funcionando',
        'engine': 'EasyOCR (Deep Learning)',
        'ventajas': [
            'No requiere detección de región',
            'Funciona con fotos borrosas',
            'Robusto a iluminación',
            'Detecta texto automáticamente'
        ]
    })


if __name__ == '__main__':
    print("🚀 API de detección con EasyOCR")
    print("🔍 Servidor en http://localhost:5000")
    print("✨ EasyOCR es MUCHO más robusto que Tesseract")
    app.run(host='0.0.0.0', port=5000, debug=True)