# views.py
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
import requests
from datetime import datetime
import asyncio
import websockets
import threading
from collections import deque
import time

# ==================== CONFIGURATION ====================
EXTERNAL_SERVER_BASE_URL = "http://0.0.0.0:5001/"
MOCK_CRANE_CONFIG = {
    "deviceId": "crane-001",
    "name": "Main Crane", 
    "status": "connected",
    "protocol": "modbus",
    "endpoint": "192.168.1.100",
    "port": 502,
    "pollingInterval": 30,
    "timeout": 10,
    "retryCount": 3,
    "modbusConfig": {
        "startingAddress": 0,
        "quantity": 10,
        "unitId": 1,
        "functionCode": 3,
        "dataType": "uint16",
        "byteOrder": "big_endian"
    },
    "timestamp": datetime.now().isoformat() + 'Z'
}

# ==================== IOT DATA STORAGE ====================
iot_data_store = {
    'latest': None,
    'history': deque(maxlen=100),
    'services': []  # Service-based data storage
}

active_connections = set()

# ==================== SERVICE-BASED DATA PROCESSING ====================

@require_http_methods(["GET"])
def get_external_iot_data(request):
    """GET IoT data from external server in service-based format"""
    print("=" * 50)
    print("📡 Django: GET External IoT Data request")
    print(f"Request path: {request.path}")
    print(f"Request method: {request.method}")
    print("=" * 50)
    
    print(f"🌐 Attempting to fetch IoT data from: {EXTERNAL_SERVER_BASE_URL}/iot-data")
    
    try:
        print("🔄 Making requests.get call for IoT data...")
        
        response = requests.get(
            f"{EXTERNAL_SERVER_BASE_URL}/iot-data",
            timeout=5,  # Reduced timeout
            headers={'Content-Type': 'application/json'}
        )
        
        print(f"✅ External IoT server response status: {response.status_code}")
        print(f"Response content: {response.text[:200]}...")
        
        if response.status_code == 200:
            external_data = response.json()
            print("✅ Successfully fetched IoT data from external server")
            
            # Process the external IoT data in service-based format
            processed_data = process_service_based_data(external_data)
            
            # Store the data locally
            iot_data_store['latest'] = processed_data
            iot_data_store['history'].append(processed_data)
            iot_data_store['services'] = processed_data.get('services', [])
            
            return JsonResponse({
                "success": True,
                "message": "IoT data retrieved from external server",
                "data": processed_data,
                "source": "external_server",
                "external_url": EXTERNAL_SERVER_BASE_URL,
                "timestamp": datetime.now().isoformat() + 'Z'
            })
        else:
            print(f"❌ External IoT server returned status: {response.status_code}")
            return JsonResponse({
                "success": False,
                "error": f"External server returned {response.status_code}",
                "external_url": EXTERNAL_SERVER_BASE_URL,
                "timestamp": datetime.now().isoformat() + 'Z'
            }, status=response.status_code)
            
    except requests.exceptions.ConnectionError as e:
        print(f"❌ Connection error to IoT server: {e}")
        return JsonResponse({
            "success": False,
            "error": f"Cannot connect to external server: {str(e)}",
            "external_url": EXTERNAL_SERVER_BASE_URL,
            "timestamp": datetime.now().isoformat() + 'Z'
        }, status=503)
    except requests.exceptions.Timeout as e:
        print(f"⏰ Timeout error: {e}")
        return JsonResponse({
            "success": False,
            "error": f"External server timeout: {str(e)}",
            "external_url": EXTERNAL_SERVER_BASE_URL,
            "timestamp": datetime.now().isoformat() + 'Z'
        }, status=504)
    except Exception as e:
        print(f"💥 Unexpected error fetching IoT data: {e}")
        return JsonResponse({
            "success": False,
            "error": f"Unexpected error: {str(e)}",
            "timestamp": datetime.now().isoformat() + 'Z'
        }, status=500)

def process_service_based_data(external_data):
    """Process service-based IoT data format"""
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
        'source': 'external_server',
        'total_services': len(processed_services),
        'total_assets': sum(len(service.get('assets', [])) for service in processed_services)
    }
    
    print(f"✅ Processed {processed['total_services']} services with {processed['total_assets']} total assets")
    return processed

@require_http_methods(["GET"])
def get_iot_data(request):
    """GET endpoint for polling IoT data (service-based format)"""
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
    
    # Try external server as fallback
    try:
        print("🔄 Attempting to fetch from external server...")
        response = requests.get(
            f"{EXTERNAL_SERVER_BASE_URL}/iot-data",
            timeout=3,  # Short timeout for polling
            headers={'Content-Type': 'application/json'}
        )
        
        if response.status_code == 200:
            external_data = response.json()
            processed_data = process_service_based_data(external_data)
            
            # Store locally
            iot_data_store['latest'] = processed_data
            iot_data_store['history'].append(processed_data)
            iot_data_store['services'] = processed_data.get('services', [])
            
            print(f"✅ Returning {processed_data['total_services']} services from external server")
            return JsonResponse({
                "success": True,
                "data": processed_data,
                "source": "external_server",
                "timestamp": datetime.now().isoformat() + 'Z'
            })
        else:
            print(f"❌ External server returned status: {response.status_code}")
            return JsonResponse({
                "success": False,
                "error": f"External server unavailable: {response.status_code}",
                "timestamp": datetime.now().isoformat() + 'Z'
            }, status=503)
    except Exception as e:
        print(f"⚠️ External server unavailable: {e}")
        return JsonResponse({
            "success": False,
            "error": f"External server connection failed: {str(e)}",
            "timestamp": datetime.now().isoformat() + 'Z'
        }, status=503)
    
    # No data available
    print("ℹ️ No IoT data available")
    return JsonResponse({
        "success": False,
        "error": "No IoT data available",
        "timestamp": datetime.now().isoformat() + 'Z'
    }, status=404)

@csrf_exempt
@require_http_methods(["POST"])
def receive_iot_data(request):
    """Receive IoT data from devices via POST in service-based format"""
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
        
        # Store the data
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

@require_http_methods(["GET"])
def get_iot_data_history(request):
    """Get historical IoT data"""
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

@require_http_methods(["GET"])
def get_crane_config_proxy(request):
    """GET endpoint that actually fetches from external server"""
    print("=" * 50)
    print("🔍 Django Proxy: GET request received")
    print(f"Request path: {request.path}")
    print(f"Request method: {request.method}")
    print("=" * 50)
    
    print(f"🌐 Attempting to connect to: {EXTERNAL_SERVER_BASE_URL}/crane-config")
    
    try:
        print("🔄 Making requests.get call...")
        
        response = requests.get(
            f"{EXTERNAL_SERVER_BASE_URL}/crane-config",
            timeout=5,
            headers={'Content-Type': 'application/json'}
        )
        
        print(f"✅ External server response status: {response.status_code}")
        
        if response.status_code == 200:
            external_data = response.json()
            print("✅ Successfully fetched from external server")
            
            # Extract the config data from external server response
            config_data = external_data.get('data', external_data)
            
            return JsonResponse({
                "success": True,
                "message": "Data retrieved from external server",
                "data": config_data,
                "source": "external_server",
                "external_url": EXTERNAL_SERVER_BASE_URL,
                "timestamp": datetime.now().isoformat() + 'Z'
            })
        else:
            print(f"❌ External server returned status: {response.status_code}")
            return JsonResponse({
                "success": False,
                "error": f"External server returned {response.status_code}",
                "external_url": EXTERNAL_SERVER_BASE_URL,
                "timestamp": datetime.now().isoformat() + 'Z'
            }, status=response.status_code)
            
    except requests.exceptions.ConnectionError as e:
        print(f"❌ Connection error: {e}")
        return JsonResponse({
            "success": False,
            "error": f"Cannot connect to external server: {str(e)}",
            "external_url": EXTERNAL_SERVER_BASE_URL,
            "timestamp": datetime.now().isoformat() + 'Z'
        }, status=503)
    except requests.exceptions.Timeout as e:
        print(f"⏰ Timeout error: {e}")
        return JsonResponse({
            "success": False,
            "error": f"External server timeout: {str(e)}",
            "external_url": EXTERNAL_SERVER_BASE_URL,
            "timestamp": datetime.now().isoformat() + 'Z'
        }, status=504)
    except Exception as e:
        print(f"💥 Unexpected error: {e}")
        return JsonResponse({
            "success": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat() + 'Z'
        }, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def update_crane_config_proxy(request):
    """POST endpoint that forwards to external server"""
    print("=" * 50)
    print("📤 Django Proxy: POST request received")
    print(f"Request path: {request.path}")
    print(f"Request method: {request.method}")
    print(f"Request body: {request.body.decode('utf-8') if request.body else 'No body'}")
    print("=" * 50)
    
    try:
        data = json.loads(request.body)
        print(f"📦 Data to forward: {json.dumps(data, indent=2)}")
        
        print(f"🔄 Making POST request to: {EXTERNAL_SERVER_BASE_URL}/crane-config")
        
        response = requests.post(
            f"{EXTERNAL_SERVER_BASE_URL}/crane-config",
            json=data,
            headers={'Content-Type': 'application/json'},
            timeout=5
        )
        
        print(f"✅ External server POST response: {response.status_code}")
        print(f"Response content: {response.text[:200]}...")
        
        if response.status_code == 200:
            external_response = response.json()
            print("✅ Successfully forwarded to external server")
            
            # FIX: Return the external response data properly
            return JsonResponse({
                "success": True,
                "message": "Data forwarded to external server",
                "data": external_response.get('data', external_response),  # Include the actual response data
                "external_response": external_response,
                "source": "external_server",
                "external_url": EXTERNAL_SERVER_BASE_URL,
                "timestamp": datetime.now().isoformat() + 'Z'
            })
        else:
            return JsonResponse({
                "success": False,
                "error": f"External server returned {response.status_code}",
                "external_response": response.text,
                "timestamp": datetime.now().isoformat() + 'Z'
            }, status=response.status_code)
            
    except requests.exceptions.ConnectionError as e:
        print(f"❌ POST Connection error: {e}")
        return JsonResponse({
            "success": False,
            "error": f"Cannot connect to external server: {str(e)}",
            "external_url": EXTERNAL_SERVER_BASE_URL,
            "timestamp": datetime.now().isoformat() + 'Z'
        }, status=503)
    except json.JSONDecodeError:
        return JsonResponse({
            "success": False,
            "error": "Invalid JSON"
        }, status=400)
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
    """Health check that tests external server connectivity"""
    print("🏥 Health check requested")
    
    # Check data storage health
    data_health = "healthy" if iot_data_store['services'] or iot_data_store['latest'] else "no_data"
    
    # Check external server connectivity
    external_status = "unknown"
    try:
        print(f"🏥 Testing connection to: {EXTERNAL_SERVER_BASE_URL}/crane-config")
        response = requests.get(f"{EXTERNAL_SERVER_BASE_URL}/crane-config", timeout=3)
        external_status = "connected" if response.status_code == 200 else f"unavailable ({response.status_code})"
    except Exception as e:
        external_status = f"unreachable ({str(e)})"
    
    print(f"🏥 External server status: {external_status}")
    print(f"🏥 Data storage status: {data_health}")
    
    return JsonResponse({
        "status": "healthy",
        "message": "Django server is running",
        "data_storage": data_health,
        "stored_services": len(iot_data_store['services']),
        "stored_assets": sum(len(service.get('assets', [])) for service in iot_data_store['services']),
        "external_server_status": external_status,
        "external_server_url": EXTERNAL_SERVER_BASE_URL,
        "timestamp": datetime.now().isoformat() + 'Z'
    })

@require_http_methods(["GET"])
def debug_info(request):
    """Debug endpoint to check configuration and data"""
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
        "external_server_url": EXTERNAL_SERVER_BASE_URL,
        "current_data": {
            "total_services": len(current_services),
            "total_assets": sum(len(service.get('assets', [])) for service in current_services),
            "services": service_info,
            "history_count": len(iot_data_store['history'])
        },
        "message": "Current server configuration and data status",
        "timestamp": datetime.now().isoformat() + 'Z'
    })

@require_http_methods(["POST"])
@csrf_exempt
def simulate_external_data(request):
    """Endpoint to simulate external server posting data (for testing)"""
    print("🎯 Simulating external data POST")
    
    try:
        # Use provided data or return error
        if not request.body:
            return JsonResponse({
                "success": False,
                "error": "No data provided for simulation"
            }, status=400)
        
        data = json.loads(request.body)
        
        # Process the data through the normal pipeline
        processed_data = process_service_based_data(data)
        
        # Store the data
        iot_data_store['latest'] = processed_data
        iot_data_store['history'].append(processed_data)
        iot_data_store['services'] = processed_data.get('services', [])
        
        print(f"✅ Simulated data stored: {processed_data['total_services']} services")
        
        # Broadcast to WebSocket clients
        asyncio.run(broadcast_to_websockets(processed_data))
        
        return JsonResponse({
            "success": True,
            "message": f"Simulated data processed: {processed_data['total_services']} services",
            "data": processed_data,
            "timestamp": datetime.now().isoformat() + 'Z'
        })
        
    except Exception as e:
        print(f"💥 Simulation error: {e}")
        return JsonResponse({
            "success": False,
            "error": str(e)
        }, status=500)

@require_http_methods(["POST"])
@csrf_exempt
def clear_data_store(request):
    """Endpoint to clear the data store (for testing)"""
    print("🗑️ Clearing data store")
    
    iot_data_store['latest'] = None
    iot_data_store['history'].clear()
    iot_data_store['services'] = []
    
    return JsonResponse({
        "success": True,
        "message": "Data store cleared",
        "timestamp": datetime.now().isoformat() + 'Z'
    })