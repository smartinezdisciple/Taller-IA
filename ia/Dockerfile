FROM python:3.8-slim-bullseye

ENV DEBIAN_FRONTEND=noninteractive

# Actualizar e instalar dependencias gráficas para OpenCV y visión por computadora
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsm6 \
    libxext6 \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir --upgrade pip
RUN pip install --no-cache-dir tensorflow opencv-python Pillow six flask flask-cors

WORKDIR /app

COPY . /app

EXPOSE 6000

CMD ["python", "app.py"]
