from flask import Flask, request, jsonify
from flask_cors import CORS
import random

app = Flask(__name__)
CORS(app) # Enable CORS for frontend connection

MARCAS = ['Toyota', 'Nissan', 'Hyundai', 'Honda', 'Kia', 'Ford', 'Chevrolet', 'Mazda']
COLORES = ['rojo', 'azul', 'negro', 'blanco', 'gris', 'plateado', 'naranja']

@app.route('/analizar', methods=['POST'])
def analizar():
    if 'imagen' not in request.files:
        return jsonify({'error': 'No se proporciono ninguna imagen'}), 400
        
    file = request.files['imagen']
    if file.filename == '':
        return jsonify({'error': 'Archivo de imagen vacio'}), 400
        
    # Mocking classification
    marca = random.choice(MARCAS)
    color = random.choice(COLORES)
    
    return jsonify({
        'marca': marca,
        'color': color
    })

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'OK'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=6000)
