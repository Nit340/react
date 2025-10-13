from django.urls import path
from . import views

urlpatterns = [
    # ==================== CONFIGURATION ENDPOINTS ====================
    # Service config endpoints (use Flask server)
    path('proxy/config', views.get_crane_config_proxy, name='proxy-get-config'),
    path('proxy/config/update', views.update_crane_config_proxy, name='proxy-update-config'),
    
    # ==================== IOT DATA ENDPOINTS ====================
    # IoT Data endpoints (local Django processing only)
    path('iot-data', views.get_iot_data, name='get-iot-data'),
    path('iot-data/receive', views.receive_iot_data, name='receive-iot-data'),
    path('iot-data/history', views.get_iot_data_history, name='iot-data-history'),
    
    # ==================== REAL-TIME STREAMING ENDPOINTS ====================
    # Server-Sent Events (SSE) for real-time streaming
    path('stream/iot-data', views.stream_iot_data, name='stream-iot-data'),
    
    # ==================== UTILITY ENDPOINTS ====================
    path('health', views.health_check, name='health-check'),
    path('debug', views.debug_info, name='debug-info'),
    
    # ==================== WEB SOCKET ENDPOINT ====================
    path('ws/iot-data', views.websocket_iot, name='websocket-iot'),
]