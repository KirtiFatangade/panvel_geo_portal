from django.apps import AppConfig


class MapappConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'map_app'

    def ready(self):
        import map_app.admin_user_signal