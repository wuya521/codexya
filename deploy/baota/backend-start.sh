#!/bin/bash
set -e

cd /www/wwwroot/world-inference/backend
source .venv/bin/activate
exec gunicorn app.main:app -k uvicorn.workers.UvicornWorker -w 2 -b 127.0.0.1:8000
