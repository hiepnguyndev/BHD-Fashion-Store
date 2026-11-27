FROM python:3.12-slim
WORKDIR /sql
RUN pip install --no-cache-dir "pymssql>=2.3,<3"
COPY . .
CMD ["python", "init_db.py"]
