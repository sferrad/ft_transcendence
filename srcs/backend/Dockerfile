FROM python:3.11-slim

WORKDIR /app

COPY . .

RUN pip install --upgrade pip

RUN pip install --no-cache-dir -r requirements.txt

EXPOSE 80
# 80 -> http pourquoi ? 

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "80"]