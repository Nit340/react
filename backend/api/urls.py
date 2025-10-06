from django.urls import path
from . import views

urlpatterns = [
    path('crane/config/', views.crane_config_view, name='crane-config'),
    path('crane/status/', views.update_crane_status, name='crane-status'),
    path('health/', views.health_check, name='health-check'),

]