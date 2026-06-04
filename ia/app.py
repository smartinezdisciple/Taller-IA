import os
import cv2
import numpy as np
import traceback
from flask import Flask, request, jsonify
from flask_cors import CORS
import car_classifier

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*", "methods": ["GET", "POST", "OPTIONS"], "allow_headers": ["Content-Type", "Authorization"]}})

print("[INFO] Cargando modelos de Inteligencia Artificial (YOLOv3 + Spectrico)...", flush=True)
classifier = car_classifier.CarClassifier(0.5, 0.3)
print("[INFO] ¡Modelos cargados exitosamente!", flush=True)

@app.route('/analizar', methods=['POST'])
def analizar():
    print("====== Petición de Análisis Recibida ======", flush=True)
    if 'imagen' not in request.files:
        return jsonify({"error": "No se proporciono ninguna imagen"}), 400

    try:
        file = request.files['imagen']
        img_bytes = file.read()
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            return jsonify({"error": "Imagen inválida o corrupta"}), 400

        # Predict objects
        objects = classifier.predict(img)
        print(f"[INFO] Detecciones: {objects}", flush=True)
        
        if len(objects) > 0:
            # Get the first detected vehicle
            first_car = objects[0]
            # Map brand and color to match the frontend expectations
            return jsonify({
                "marca": first_car.get("make", "Desconocido"),
                "color": first_car.get("color", "Desconocido"),
                "modelo": first_car.get("model", "")
            })
        else:
            return jsonify({
                "marca": "Desconocido",
                "color": "Desconocido",
                "modelo": ""
            })

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'OK'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=6000)
