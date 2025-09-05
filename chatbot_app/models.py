from django.db import models
from map_app.models import User, BaseModel
from django.contrib.postgres.fields import ArrayField


class ChatHistory(BaseModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=False)
    chat_id = models.CharField(max_length=16, null=False, blank=False)
    prompt_message = models.CharField(max_length=500, null=False, blank=False)
    chat_response = models.CharField(max_length=5000, null=True, blank=False)
    paths = ArrayField(models.CharField())
    mode = models.IntegerField(null=True)
    log_cleared = models.BooleanField(null=False, default=False)

    def __str__(self):
        return f"{self.id} - {self.prompt_message[:50]}"
