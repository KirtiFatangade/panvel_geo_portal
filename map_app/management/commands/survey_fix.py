import pandas as pd
import json
from map_app.models import SurveyField
from django.core.management.base import BaseCommand
import requests

class Command(BaseCommand):
    help = "Update survey responses by resolving specific URLs"

    def handle(self, *args, **kwargs):
        surveys = SurveyField.objects.all()
        for survey in surveys:
            update_needed = False  # Track if we need to save changes

            for response in survey.response:
                resp = response["response"]

                # Modify URLs if necessary
                for key, value in resp.items():
                    if isinstance(value, str) and value.startswith("https://mum-objectstore.e2enetworks.net"):
                        print("MUM Objectstore URL detected.")
                        # Extract and ensure PNG extension
                        object_name = "/".join(value.split("?")[0].split("/")[4:])
                        
                        
                        # Save the modified object name back into the response
                        resp[key] = object_name
                        update_needed = True  # Mark that we need to save changes

                    elif isinstance(value, str) and value.startswith("https://tinyurl.com/"):
                        print("TinyURL detected.")

                        # Resolve TinyURL to original URL and ensure PNG extension
                        try:
                            res = requests.get(value)
                            
                            object_name = "/".join(res.url.split("?")[0].split("/")[4:])
                            
                            
                            # Save the modified object name back into the response
                            resp[key] = object_name
                            update_needed = True  # Mark that we need to save changes
                        except requests.RequestException as e:
                            print(f"Error resolving TinyURL {value}: {e}")

            # Save changes only if needed
            if update_needed:
                survey.save()
                print(f"Updated survey ID {survey.id} with modified responses.")
                    