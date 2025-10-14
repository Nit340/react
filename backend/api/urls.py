# iot_app/urls.py - Alternative version with api prefix
from django.urls import path
from . import views

urlpatterns = [
    # IoT Data Endpoints
    path('api/iot-data', views.get_iot_data, name='get_iot_data'),
    path('api/iot-data/receive', views.receive_iot_data, name='receive_iot_data'),
    path('api/iot-data/history', views.get_iot_data_history, name='get_iot_data_history'),
    path('api/iot-data/ws', views.websocket_iot, name='websocket_iot'),
    
    # Database Endpoints
    path('api/database/services', views.get_database_services, name='get_database_services'),
    path('api/database/assets', views.get_database_assets, name='get_database_assets'),
    path('api/database/assets/<str:service_name>', views.get_database_assets, name='get_database_assets_by_service'),
    
    # Configuration Endpoints
    path('api/crane-config', views.get_crane_config_proxy, name='get_crane_config'),
    path('api/crane-config/update', views.update_crane_config_proxy, name='update_crane_config'),
    
    # Health & Debug
    path('api/health', views.health_check, name='health_check'),
    path('api/debug', views.debug_info, name='debug_info'),
]