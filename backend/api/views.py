from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
import requests
from datetime import datetime

# ==================== CONFIGURATION ====================
# UPDATE THIS TO YOUR ACTUAL EXTERNAL SERVER URL
EXTERNAL_SERVER_BASE_URL = "http://192.168.1.16:5001/api"  # Replace with your actual IP  # ⚠️ CHANGE THIS!

# Fallback mock data in case external server is down
MOCK_CRANE_CONFIG = {
    "deviceId": "crane-001",
    "name": "Main Crane", 
    "status": "connected",
    "protocol": "modbus",
    "endpoint": "192.168.1.100",
    "port": 502,
    "timestamp": datetime.now().isoformat() + 'Z'
}

@require_http_methods(["GET"])
def get_crane_config_proxy(request):
    """GET endpoint that actually fetches from external server"""
    print("=" * 50)
    print("🔍 Django Proxy: GET request received")
    print(f"Request path: {request.path}")
    print(f"Request method: {request.method}")
    print(f"Request headers: {dict(request.headers)}")
    print("=" * 50)
    
    print(f"🌐 Attempting to connect to: {EXTERNAL_SERVER_BASE_URL}/crane-config")
    
    # First, try to get data from external server
    try:
        print("🔄 Making requests.get call...")
        
        response = requests.get(
            f"{EXTERNAL_SERVER_BASE_URL}/crane-config",
            timeout=10,
            headers={'Content-Type': 'application/json'}
        )
        
        print(f"✅ External server response status: {response.status_code}")
        print(f"Response content: {response.text[:200]}...")
        
        if response.status_code == 200:
            external_data = response.json()
            print("✅ Successfully fetched from external server")
            
            return JsonResponse({
                "success": True,
                "message": "Data retrieved from external server",
                "data": external_data.get('data', external_data),  # Handle both formats
                "source": "external_server",
                "external_url": EXTERNAL_SERVER_BASE_URL,
                "timestamp": datetime.now().isoformat() + 'Z'
            })
        else:
            print(f"❌ External server returned status: {response.status_code}")
            # Fall back to mock data
            return JsonResponse({
                "success": True,
                "message": f"Using mock data (external server returned {response.status_code})",
                "data": MOCK_CRANE_CONFIG,
                "source": "mock_data_fallback",
                "external_url": EXTERNAL_SERVER_BASE_URL,
                "timestamp": datetime.now().isoformat() + 'Z'
            })
            
    except requests.exceptions.ConnectionError as e:
        print(f"❌ Connection error (this is likely your issue): {e}")
        print(f"❌ This usually means the server at {EXTERNAL_SERVER_BASE_URL}/crane-config is not running or not accessible")
        return JsonResponse({
            "success": True,
            "message": f"Using mock data (connection refused: {str(e)})",
            "data": MOCK_CRANE_CONFIG,
            "source": "mock_data_fallback",
            "external_url": EXTERNAL_SERVER_BASE_URL,
            "timestamp": datetime.now().isoformat() + 'Z'
        })
    except requests.exceptions.Timeout as e:
        print(f"⏰ Timeout error: {e}")
        return JsonResponse({
            "success": True,
            "message": f"Using mock data (timeout: {str(e)})",
            "data": MOCK_CRANE_CONFIG,
            "source": "mock_data_fallback",
            "external_url": EXTERNAL_SERVER_BASE_URL,
            "timestamp": datetime.now().isoformat() + 'Z'
        })
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
        
        # Forward to external server
        print(f"🔄 Making POST request to: {EXTERNAL_SERVER_BASE_URL}/crane-config")
        
        response = requests.post(
            f"{EXTERNAL_SERVER_BASE_URL}/crane-config",
            json=data,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        print(f"✅ External server POST response: {response.status_code}")
        print(f"Response content: {response.text[:200]}...")
        
        if response.status_code == 200:
            external_response = response.json()
            print("✅ Successfully forwarded to external server")
            
            return JsonResponse({
                "success": True,
                "message": "Data forwarded to external server",
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

@require_http_methods(["GET"]) 
def health_check(request):
    """Health check that tests external server connectivity"""
    print("🏥 Health check requested")
    external_status = "unknown"
    try:
        print(f"🏥 Testing connection to: {EXTERNAL_SERVER_BASE_URL}/crane-config")
        response = requests.get(f"{EXTERNAL_SERVER_BASE_URL}/crane-config", timeout=5)
        external_status = "connected" if response.status_code == 200 else f"unavailable ({response.status_code})"
    except Exception as e:
        external_status = f"unreachable ({str(e)})"
    
    print(f"🏥 External server status: {external_status}")
    
    return JsonResponse({
        "status": "healthy",
        "message": "Django server is running",
        "external_server_status": external_status,
        "external_server_url": EXTERNAL_SERVER_BASE_URL,
        "timestamp": datetime.now().isoformat() + 'Z'
    })

@require_http_methods(["GET"])
def debug_info(request):
    """Debug endpoint to check configuration"""
    print("🔍 Debug info requested")
    
    return JsonResponse({
        "external_server_url": EXTERNAL_SERVER_BASE_URL,
        "message": "Current external server configuration",
        "timestamp": datetime.now().isoformat() + 'Z'
    })