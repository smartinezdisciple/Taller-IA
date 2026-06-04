FROM python:3.11-alpine

WORKDIR /app

RUN pip install --no-cache-dir flask flask-cors

COPY app.py .

EXPOSE 6000

CMD ["python", "app.py"]
