#!/bin/bash

# Stop Gunicorn process with the specific command
echo "Stopping Gunicorn process with command 'gunicorn -w 4 -b 0.0.0.0:8001 mapshow.wsgi:application'..."
ps aux | grep 'gunicorn -w 4 -b 0.0.0.0:8001 mapshow.wsgi:application' | awk '{print $2}' | xargs kill -9
# ps aux | grep "python manage.py runserver" | awk '{print $2}' | xargs kill -9
echo "Gunicorn processes stopped."

# Stop all Celery processes
echo "Stopping all Celery processes..."
ps aux | grep celery | grep -v grep | awk '{print $2}' | xargs kill -9
echo "Celery processes stopped."

echo "All Gunicorn and Celery processes have been stopped."