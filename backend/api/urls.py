from django.urls import path
from . import views

urlpatterns = [
    # ==================== IOT DATA ENDPOINTS ====================
    
    # Local storage endpoints
    path('api/iot-data', views.get_iot_data, name='get_iot_data'),
    path('api/iot-data/receive', views.receive_iot_data, name='receive_iot_data'),
    path('api/iot-data/history', views.get_iot_data_history, name='get_iot_data_history'),
    path('api/iot-data/ws', views.websocket_iot, name='websocket_iot'),
    
    # ==================== DATABASE QUERY ENDPOINTS ====================
    
    # Service endpoints
    path('api/database/services', views.get_database_services, name='get_database_services'),
    path('api/database/assets', views.get_database_assets, name='get_database_assets'),
    path('api/database/assets/<str:service_name>', views.get_database_assets, name='get_database_assets_by_service'),
    
    # ==================== CONFIGURATION ENDPOINTS ====================
    
    # External server proxy endpoints
    path('api/crane-config', views.get_crane_config_proxy, name='get_crane_config'),
    path('api/crane-config/update', views.update_crane_config_proxy, name='update_crane_config'),
    
    # ==================== UTILITY & DEBUG ENDPOINTS ====================
    
    path('api/health', views.health_check, name='health_check'),
    path('api/debug', views.debug_info, name='debug_info'),

    # ==================== LOAD OPERATIONS ENDPOINT ====================
    path('api/database/load-operations', views.get_load_operations, name='get_load_operations'),
    
    # ==================== NEW ONBOARD NOTIFICATION ENDPOINTS ====================
    path('api/onboard-notification', views.receive_onboard_notification, name='receive_onboard_notification'),
    path('api/onboard-notifications', views.get_onboard_notifications, name='get_onboard_notifications'),
]