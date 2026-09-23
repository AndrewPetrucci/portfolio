FROM python:3.12-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HF_HOME=/models \
    LAYA_SERVE_BACKEND=laya \
    LAYA_SERVE_DEVICE=cpu \
    LAYA_SERVE_PRELOAD=false \
    LAYA_SERVE_MAX_LOADED=1 \
    TOKENIZERS_PARALLELISM=false

WORKDIR /app

COPY warmup.py ./warmup.py

RUN pip install --no-cache-dir --upgrade pip \
 && pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu \
 && pip install --no-cache-dir "laya-serve[inference]==0.1.0"

EXPOSE 8000

CMD ["sh", "-c", "python warmup.py && laya-serve"]
