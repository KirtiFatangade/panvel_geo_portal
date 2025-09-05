from django.contrib import admin
from .models import *

admin.site.register(Organization)
admin.site.register(Role)
admin.site.register(User)
admin.site.register(Project)
admin.site.register(Activity)
admin.site.register(Selfcache)
admin.site.register(OrganizationRequest)
admin.site.register(SurveyField)
admin.site.register(Plan)
admin.site.register(Feature)
admin.site.register(CreditPointsTransaction)