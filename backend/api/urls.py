from django.urls import path
from . import views

urlpatterns = [
    # ==================== EXISTING ENDPOINTS ====================
    # GET endpoints
    path('proxy/config', views.get_crane_config_proxy, name='proxy-get-config'),
    
    # POST endpoints  
    path('proxy/config/update', views.update_crane_config_proxy, name='proxy-update-config'),
    
    # Utility endpoints
    path('health', views.health_check, name='health-check'),
    path('debug', views.debug_info, name='debug-info'),
    
    # ==================== IOT DATA ENDPOINTS ====================
    # IoT Data endpoints
    path('iot-data', views.get_iot_data, name='get-iot-data'),
    path('iot-data/external', views.get_external_iot_data, name='get-external-iot-data'),
    path('iot-data/receive', views.receive_iot_data, name='receive-iot-data'),
    path('iot-data/history', views.get_iot_data_history, name='iot-data-history'),
    
    # WebSocket endpoint
    path('ws/iot-data', views.websocket_iot, name='websocket-iot'),
    
    # ==================== TESTING ENDPOINTS ====================
    path('simulate-data', views.simulate_external_data, name='simulate-data'),
    path('clear-data', views.clear_data_store, name='clear-data'),
]