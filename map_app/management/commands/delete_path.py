# your_app/management/commands/delete_paths.py
from django.core.management.base import BaseCommand
from map_app.models import FilePaths
import os
import logging
import shutil

class Command(BaseCommand):
    help = 'Deletes paths and their containing directories saved in the model'

    def handle(self, *args, **kwargs):
        # Set up logging
        logger = logging.getLogger(__name__)
        handler = logging.FileHandler('file_deletion.log')
        formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)

        entries = FilePaths.objects.all()
        for entry in entries:
            path = entry.path  # Get the path from the database entry

            # Check if the path is a file
            if os.path.isfile(path):
                os.remove(path)
                success_message = f'Successfully deleted file: {path}'
                logger.info(success_message)

            # Check if the path is a directory
            elif os.path.isdir(path):
                shutil.rmtree(path)
                dir_message = f'Successfully deleted directory: {path} and all its contents'
                logger.info(dir_message)

            else:
                warning_message = f'Path {path} does not exist or is invalid'
                logger.warning(warning_message)

            # Delete the entry from the database after processing
            entry.delete()

        # Close and remove the logger handler
        handler.close()
        logger.removeHandler(handler)
