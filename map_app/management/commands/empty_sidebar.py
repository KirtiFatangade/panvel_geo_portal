import pandas as pd
import json
from map_app.models import Feature
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    def handle(self, *args, **kwargs):
        for i in Feature.objects.all():
            i.delete()


    
