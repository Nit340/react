from django.urls import path
from . import views

urlpatterns = [
    # GET endpoints
    path('proxy/config', views.get_crane_config_proxy, name='proxy-get-config'),
    
    # POST endpoints  
    path('proxy/config/update', views.update_crane_config_proxy, name='proxy-update-config'),
    
    # Utility endpoints
    path('health', views.health_check, name='health-check'),
    path('debug', views.debug_info, name='debug-info'),
]