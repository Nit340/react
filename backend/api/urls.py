from django.urls import path
from . import views

urlpatterns = [
    # ==================== IOT DATA ENDPOINTS ====================
    path('api/iot-data', views.get_iot_data, name='get_iot_data'),
    path('api/iot-data/receive', views.receive_iot_data, name='receive_iot_data'),
    
    # ==================== DATABASE QUERY ENDPOINTS ====================
    path('api/database/services', views.get_database_services, name='get_database_services'),
    # REMOVED: path('api/database/assets', views.get_database_assets, name='get_database_assets'),
    
    # ==================== CONFIGURATION ENDPOINTS ====================
    path('api/crane-config', views.get_crane_config_proxy, name='get_crane_config'),
    path('api/crane-config/update', views.update_crane_config_proxy, name='update_crane_config'),
    
    # ==================== ONBOARD NOTIFICATION ENDPOINTS ====================
    path('api/onboard-notification', views.receive_onboard_notification, name='receive_onboard_notification'),
    path('api/onboard-notifications', views.get_onboard_notifications, name='get_onboard_notifications'),
]  