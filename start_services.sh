#!/bin/bash

# Define the Gunicorn command and run it in the background (daemon mode)
echo "Starting Gunicorn in daemon mode..."
nohup gunicorn -w 4 -b 0.0.0.0:8001 mapshow.wsgi:application --timeout 3600 >> gunicorn.log 2>&1 &

# Define the Celery command and run it in the background (daemon mode)
echo "Starting Celery worker in daemon mode..."
nohup celery -A mapshow worker -l info >> celery.log 2>&1 &

# Output a message that both services are running
echo "Gunicorn and Celery are now running."