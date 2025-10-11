# views.py
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
import requests
from datetime import datetime
import asyncio
from collections import deque

# ==================== CONFIGURATION ====================
# Only for crane config endpoints


# ==================== IOT DATA STORAGE ====================
iot_data_store = {
    'latest': None,
    'history': deque(maxlen=100),
    'services': []  # Service-based data storage
}

active_connections = set()

# ==================== SERVICE-BASED DATA PROCESSING ====================

@require_http_methods(["GET"])
def get_iot_data(request):
    """GET endpoint for polling IoT data (service-based format) - LOCAL STORAGE ONLY"""
    print("=" * 50)
    print("📡 Django: IoT Data GET request")
    print(f"Request path: {request.path}")
    print(f"Request method: {request.method}")
    print("=" * 50)
    
    # Check if we have service data in local storage
    if iot_data_store['services']:
        latest_data = {
            'services': iot_data_store['services'],
            'timestamp': datetime.now().isoformat() + 'Z',
            'source': 'local_storage',
            'total_services': len(iot_data_store['services']),
            'total_assets': sum(len(service.get('assets', [])) for service in iot_data_store['services'])
        }
        print(f"✅ Returning {latest_data['total_services']} services from local storage")
        return JsonResponse({
            "success": True,
            "data": latest_data,
            "source": "local_storage",
            "timestamp": datetime.now().isoformat() + 'Z'
        })
    
    # No data available in local storage
    print("ℹ️ No IoT data available in local storage")
    return JsonResponse({
        "success": False,
        "error": "No IoT data available in local storage",
        "timestamp": datetime.now().isoformat() + 'Z'
    }, status=404)

@csrf_exempt
@require_http_methods(["POST"])
def receive_iot_data(request):
    """Receive IoT data from devices via POST in service-based format - LOCAL PROCESSING ONLY"""
    print("=" * 50)
    print("📱 Django: IoT Data POST received")
    print(f"Request path: {request.path}")
    print(f"Request method: {request.method}")
    print("=" * 50)
    
    try:
        data = json.loads(request.body)
        print(f"📦 Raw Service Data received")
        print(f"Data type: {type(data)}")
        print(f"Data length: {len(str(data))} characters")
        
        # Log first service for debugging
        if isinstance(data, list) and len(data) > 0:
            first_service = data[0]
            print(f"First service: {first_service.get('name', 'Unknown')} with {len(first_service.get('assets', []))} assets")
        
        processed_data = process_service_based_data(data)
        
        # Store the data locally
        iot_data_store['latest'] = processed_data
        iot_data_store['history'].append(processed_data)
        iot_data_store['services'] = processed_data.get('services', [])
        
        print(f"✅ Stored {processed_data['total_services']} services with {processed_data['total_assets']} assets")
        
        # Broadcast to WebSocket clients
        asyncio.run(broadcast_to_websockets(processed_data))
        
        return JsonResponse({
            "success": True,
            "message": f"Processed {processed_data['total_services']} services",
            "received_services": processed_data['total_services'],
            "received_assets": processed_data['total_assets'],
            "timestamp": datetime.now().isoformat() + 'Z'
        })
        
    except json.JSONDecodeError as e:
        print(f"❌ JSON decode error: {e}")
        return JsonResponse({
            "success": False,
            "error": "Invalid JSON format"
        }, status=400)
    except Exception as e:
        print(f"💥 IoT data processing error: {e}")
        return JsonResponse({
            "success": False,
            "error": str(e)
        }, status=500)

def process_service_based_data(external_data):
    """Process service-based IoT data format - LOCAL PROCESSING"""
    print("🔄 Processing service-based IoT data...")
    
    # Handle both array format and object format
    if isinstance(external_data, list):
        services_data = external_data
    elif isinstance(external_data, dict) and 'services' in external_data:
        services_data = external_data['services']
    else:
        services_data = external_data
    
    # Validate and process each service
    processed_services = []
    for service in services_data:
        if 'name' in service and 'assets' in service:
            processed_assets = []
            for asset in service['assets']:
                if 'id' in asset and 'value' in asset:
                    processed_assets.append({
                        'id': asset['id'],
                        'value': asset['value'],
                        'timestamp': asset.get('timestamp', datetime.now().isoformat() + 'Z')
                    })
            processed_services.append({
                'name': service['name'],
                'assets': processed_assets
            })
    
    # Create processed data structure
    processed = {
        'services': processed_services,
        'timestamp': datetime.now().isoformat() + 'Z',
        'source': 'django_server',
        'total_services': len(processed_services),
        'total_assets': sum(len(service.get('assets', [])) for service in processed_services)
    }
    
    print(f"✅ Processed {processed['total_services']} services with {processed['total_assets']} total assets")
    return processed

@require_http_methods(["GET"])
def get_iot_data_history(request):
    """Get historical IoT data - LOCAL STORAGE ONLY"""
    print("📊 IoT Data History request")
    
    limit = int(request.GET.get('limit', 10))
    history = list(iot_data_store['history'])[-limit:]
    
    return JsonResponse({
        "success": True,
        "data": history,
        "count": len(history),
        "timestamp": datetime.now().isoformat() + 'Z'
    })

# ==================== WEB SOCKET SUPPORT ====================

async def broadcast_to_websockets(data):
    """Broadcast new data to all connected WebSocket clients"""
    if not active_connections:
        return
        
    message = json.dumps({
        "type": "iot_data_update",
        "data": data,
        "timestamp": datetime.now().isoformat() + 'Z'
    })
    
    disconnected = set()
    for websocket in active_connections:
        try:
            await websocket.send(message)
        except Exception as e:
            print(f"WebSocket send error: {e}")
            disconnected.add(websocket)
    
    for websocket in disconnected:
        active_connections.remove(websocket)

@csrf_exempt
async def websocket_iot(request):
    """WebSocket endpoint for real-time IoT data"""
    print("🔌 WebSocket connection attempt")
    
    return JsonResponse({
        "success": False,
        "message": "WebSocket support requires Django Channels setup",
        "alternative": "Use polling mode with /api/iot-data endpoint"
    })

# ==================== CONFIGURATION ENDPOINTS ====================
# These use the external server for crane configuration

# views.py - Update the configuration section
# ==================== CONFIGURATION ====================
# Only for service config endpoints - Flask server
EXTERNAL_SERVER_GET_BASE_URL = "http://172.28.176.174:5000"

# Update the get_crane_config_proxy function:
@require_http_methods(["GET"])
def get_crane_config_proxy(request):
    """GET endpoint that fetches from Flask server - ONLY FOR CONFIG"""
    print("=" * 50)
    print("🔍 Django Proxy: GET Services request")
    print(f"Request path: {request.path}")
    print(f"Request method: {request.method}")  
    
    print("=" * 50)
    
    print(f"🌐 Attempting to connect to: {EXTERNAL_SERVER_GET_BASE_URL}/api/crane-config")
    
    try:
        print("🔄 Making requests.get call...")
        
        response = requests.get(
            f"{EXTERNAL_SERVER_GET_BASE_URL}/api/crane-config",
            timeout=10,
            headers={'Content-Type': 'application/json'}
        )
        
        print(f"✅ Flask server response status: {response.status_code}")
        
        if response.status_code == 200:
            external_data = response.json()
            print("✅ Successfully fetched from Flask server")
            
            return JsonResponse({
                "success": True,
                "message": "Services retrieved from Flask server",
                "data": external_data.get('data', external_data),
                "source": "flask_server",
                "external_url": EXTERNAL_SERVER_GET_BASE_URL,
                "timestamp": datetime.now().isoformat() + 'Z'
            })
        else:
            print(f"❌ Flask server returned status: {response.status_code}")
            return JsonResponse({
                "success": False,
                "error": f"Flask server returned {response.status_code}",
                "external_url": EXTERNAL_SERVER_GET_BASE_URL,
                "timestamp": datetime.now().isoformat() + 'Z'
            }, status=response.status_code)
            
    except requests.exceptions.ConnectionError as e:
        print(f"❌ Connection error to Flask server: {e}")
        return JsonResponse({
            "success": False,
            "error": f"Cannot connect to Flask server: {str(e)}",
            "external_url": EXTERNAL_SERVER_GET_BASE_URL,
            "timestamp": datetime.now().isoformat() + 'Z'
        }, status=503)
    except Exception as e:
        print(f"💥 Unexpected error: {e}")
        return JsonResponse({
            "success": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat() + 'Z'
        }, status=500)

# Update the update_crane_config_proxy function:
@csrf_exempt
@require_http_methods(["POST"])
def update_crane_config_proxy(request):
    """POST endpoint that forwards to Flask server - ONLY FOR CONFIG"""
    print("=" * 50)
    print("📤 Django Proxy: POST Services request")
    print(f"Request path: {request.path}")
    print(f"Request method: {request.method}")
    print("=" * 50)
    
    try:
        data = json.loads(request.body)
        print(f"📦 Data to forward: {json.dumps(data, indent=2)}")
        
        # Forward to Flask server
        print(f"🔄 Making POST request to: {EXTERNAL_SERVER_GET_BASE_URL}/api/crane-config")
        
        response = requests.post(
            f"{EXTERNAL_SERVER_GET_BASE_URL}/api/crane-config",
            json=data,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
            
        print(f"✅ Flask server POST response: {response.status_code}")
        
        if response.status_code == 200:
            external_response = response.json()
            print("✅ Successfully forwarded to Flask server")
            
            return JsonResponse({
                "success": True,
                "message": "Data forwarded to Flask server",
                "external_response": external_response,   
                "source": "flask_server",
                "external_url": EXTERNAL_SERVER_GET_BASE_URL,
                "timestamp": datetime.now().isoformat() + 'Z'
            })
        else:
            return JsonResponse({
                "success": False,
                "error": f"Flask server returned {response.status_code}",
                "external_response": response.text,
                "timestamp": datetime.now().isoformat() + 'Z'
            }, status=response.status_code)
            
    except requests.exceptions.ConnectionError as e:
        print(f"❌ POST Connection error: {e}")
        return JsonResponse({
            "success": False,
            "error": f"Cannot connect to Flask server: {str(e)}",
            "external_url": EXTERNAL_SERVER_GET_BASE_URL,
            "timestamp": datetime.now().isoformat() + 'Z'
        }, status=503)
    except Exception as e:
        print(f"💥 POST Unexpected error: {e}")
        return JsonResponse({
            "success": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat() + 'Z'
        }, status=500)

# ==================== UTILITY ENDPOINTS ====================

@require_http_methods(["GET"]) 
def health_check(request):
    """Health check for Django server - LOCAL ONLY"""
    print("🏥 Health check requested")
    
    # Check data storage health
    data_health = "healthy" if iot_data_store['services'] or iot_data_store['latest'] else "no_data"
    
    print(f"🏥 Data storage status: {data_health}")
    
    return JsonResponse({
        "status": "healthy",
        "message": "Django server is running",
        "data_storage": data_health,
        "stored_services": len(iot_data_store['services']),
        "stored_assets": sum(len(service.get('assets', [])) for service in iot_data_store['services']),
        "timestamp": datetime.now().isoformat() + 'Z'
    })

@require_http_methods(["GET"])
def debug_info(request):
    """Debug endpoint to check configuration and data - LOCAL FOCUS"""
    print("🔍 Debug info requested")
    
    # Get current data stats
    current_services = iot_data_store['services']
    service_info = []
    
    for service in current_services:
        service_info.append({
            'name': service['name'],
            'asset_count': len(service.get('assets', [])),
            'assets': [asset['id'] for asset in service.get('assets', [])][:3]  # First 3 assets
        })
    
    return JsonResponse({
        "server_type": "django_iot_server",
        "config_external_url": EXTERNAL_SERVER_GET_BASE_URL,
        "current_data": {
            "total_services": len(current_services),
            "total_assets": sum(len(service.get('assets', [])) for service in current_services),
            "services": service_info,
            "history_count": len(iot_data_store['history'])
        },
        "message": "Django IoT server status - local data processing",
        "timestamp": datetime.now().isoformat() + 'Z'
    })