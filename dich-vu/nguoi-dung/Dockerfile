FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY ung_dung ./ung_dung
RUN useradd -r -u 10001 app && mkdir -p /khoa && chown app /khoa
USER app
EXPOSE 8000
CMD ["uvicorn", "ung_dung.main:app", "--host", "0.0.0.0", "--port", "8000"]
