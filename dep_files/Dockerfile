# Fetching official base image for python
FROM python:3.11

# Setting up the work directory
WORKDIR /home/code/vgt-app

# Preventing python from writing pyc to docker container
ENV PYTHONDONTWRITEBYTECODE=1

# Flushing out python buffer
ENV PYTHONUNBUFFERED=1

# Updating the OS and installing necessary packages
RUN apt-get update && \
    apt-get install -y build-essential  libgdal-dev libgl1-mesa-glx libglib2.0-0 

# Copying requirements file to the working directory
COPY requirements.txt ./


RUN pip install --upgrade pip \
 && pip install --no-cache-dir -r ./requirements.txt \
 && pip install --index-url https://phonepe.mycloudrepo.io/public/repositories/phonepe-pg-sdk-python --extra-index-url https://pypi.org/simple phonepe_sdk==1.1.0 \
 && rm -rf /root/.cache
# Copying the rest of the application files to the working directory
COPY . .

# Fixing entrypoint script
# RUN sed -i 's/\r$//g' /home/code/vgt-app/entrypoint.sh
# RUN chmod +x /home/code/vgt-app/entrypoint.sh

# Defining the entrypoint
# ENTRYPOINT ["./entrypoint.sh"]
