import sys
import subprocess
import os

def main():
    if len(sys.argv) < 2:
        print("Uso: python procesar_pipeline.py auto.jpg")
        sys.exit(1)

    ruta_imagen = sys.argv[1]

    # 1️⃣ Ejecutar el script de detección
    print("[1/3] Detectando placa...")
    r1 = subprocess.run(
        ["python", "recorte.py", ruta_imagen],
        capture_output=True,
        text=True
    )
    print(r1.stdout)

    if not os.path.exists("placa_recortada.png"):
        print("❌ No se generó placa_recortada.png — detención del pipeline.")
        return

    # 2️⃣ Ejecutar el script de preprocesamiento
    print("[2/3] Preprocesando placa...")
    r2 = subprocess.run(
        ["python", "preproces.py", "placa_recortada.png"],
        capture_output=True,
        text=True
    )
    print(r2.stdout)

    if not os.path.exists("placa_procesada.png"):
        print("❌ No se generó placa_procesada.png — detención del pipeline.")
        return

    # 3️⃣ Ejecutar el script de OCR
    print("[3/3] Leyendo texto...")
    r3 = subprocess.run(
        ["python", "leector.py", "placa_procesada.png"],
        capture_output=True,
        text=True
    )

    # Mostrar resultado final
    print("\n===========================")
    print("RESULTADO FINAL DEL OCR")
    print("===========================")
    print(r3.stdout)


if __name__ == "__main__":
    main()

