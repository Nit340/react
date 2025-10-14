# views.py

from datetime import datetime, timedelta  # Add timedelta here
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
import requests
from datetime import datetime
import asyncio
from collections import deque
import threading
from django.db import transaction
from .models import Service, Asset, DataHistory

# ==================== CONFIGURATION ====================
EXTERNAL_SERVER_GET_BASE_URL = "http://172.28.176.174:5000"

# ==================== IOT DATA STORAGE ====================
iot_data_store = {
    'latest': None,
    'history': deque(maxlen=100),
    'services': []  # Service-based data storage
}

active_connections = set()

# ==================== DATABASE STORAGE FUNCTIONS ====================

def save_to_database_async(services_data):
    """Save IoT data to database in a separate thread"""
    def save_data():
        try:
            with transaction.atomic():
                total_assets_processed = 0
                
                for service_data in services_data:
                    if 'name' in service_data and 'assets' in service_data:
                        # Get or create service
                        service, created = Service.objects.get_or_create(
                            name=service_data['name']
                        )
                        
                        for asset_data in service_data['assets']:
                            if 'id' in asset_data and 'value' in asset_data:
                                # Parse timestamp
                                timestamp_str = asset_data.get('timestamp', datetime.now().isoformat() + 'Z')
                                try:
                                    timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                                except:
                                    timestamp = datetime.now()
                                
                                # Create or update asset
                                asset, asset_created = Asset.objects.update_or_create(
                                    service=service,
                                    asset_id=asset_data['id'],
                                    defaults={
                                        'value': asset_data['value'],
                                        'timestamp': timestamp,
                                    }
                                )
                                
                                # Create data history entry
                                DataHistory.objects.create(
                                    service=service,
                                    asset=asset,
                                    value=asset_data['value'],
                                    timestamp=timestamp
                                )
                                
                                total_assets_processed += 1
                
                print(f"💾 Database: Saved {len(services_data)} services with {total_assets_processed} assets")
                
        except Exception as e:
            print(f"❌ Database save error: {e}")
    
    # Start the database save in a separate thread
    thread = threading.Thread(target=save_data)
    thread.daemon = True
    thread.start()

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
    """Receive IoT data from devices via POST - FORWARD IMMEDIATELY + STORE IN DB ASYNC"""
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
        
        # Process data for local storage
        processed_data = process_service_based_data(data)
        
        # Store the data locally
        iot_data_store['latest'] = processed_data
        iot_data_store['history'].append(processed_data)
        iot_data_store['services'] = processed_data.get('services', [])
        
        print(f"✅ Stored {processed_data['total_services']} services with {processed_data['total_assets']} assets in local storage")
        
        # Save to database in background thread (non-blocking)
        if isinstance(data, list):
            save_to_database_async(data)
        else:
            services_data = data.get('services', [data]) if isinstance(data, dict) else [data]
            save_to_database_async(services_data)
        
        # Broadcast to WebSocket clients
        asyncio.run(broadcast_to_websockets(processed_data))
        
        return JsonResponse({
            "success": True,
            "message": f"Processed {processed_data['total_services']} services",
            "received_services": processed_data['total_services'],
            "received_assets": processed_data['total_assets'],
            "database_save": "started",  # Indicate that DB save is in progress
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

# ==================== DATABASE QUERY ENDPOINTS ====================

@require_http_methods(["GET"])
def get_database_services(request):
    """Get services from database"""
    try:
        services = Service.objects.prefetch_related('assets').all()
        service_data = []
        
        for service in services:
            assets = []
            for asset in service.assets.all()[:20]:  # Limit assets for performance
                assets.append({
                    'id': asset.asset_id,
                    'value': asset.value,
                    'timestamp': asset.timestamp.isoformat() + 'Z',
                    'value_type': asset.value_type,
                    'unit': asset.unit
                })
            
            service_data.append({
                'name': service.name,
                'assets': assets,
                'total_assets': service.assets.count()
            })
        
        return JsonResponse({
            "success": True,
            "data": service_data,
            "total_services": len(service_data),
            "source": "database",
            "timestamp": datetime.now().isoformat() + 'Z'
        })
        
    except Exception as e:
        print(f"❌ Database query error: {e}")
        return JsonResponse({
            "success": False,
            "error": str(e)
        }, status=500)

@require_http_methods(["GET"])
def get_database_assets(request, service_name=None):
    """Get assets from database, optionally filtered by service - ENHANCED VERSION"""
    try:
        # Get time range filter from query parameters
        hours = int(request.GET.get('hours', 6))  # Default to last 6 hours for dashboard
        time_filter = datetime.now() - timedelta(hours=hours)
        
        assets_query = Asset.objects.select_related('service').filter(
            timestamp__gte=time_filter
        )
        
        if service_name:
            assets_query = assets_query.filter(service__name=service_name)
        
        # Get latest asset for each asset_id to avoid duplicates
        latest_assets = []
        seen_assets = set()
        
        # Order by timestamp descending and take unique asset_ids
        for asset in assets_query.order_by('-timestamp'):
            if asset.asset_id not in seen_assets:
                seen_assets.add(asset.asset_id)
                latest_assets.append(asset)
        
        asset_data = []
        for asset in latest_assets:
            asset_data.append({
                'service': asset.service.name,
                'asset_id': asset.asset_id,
                'value': asset.value,
                'value_type': asset.value_type,
                'unit': asset.unit,
                'timestamp': asset.timestamp.isoformat() + 'Z',
                'created_at': asset.created_at.isoformat() + 'Z'
            })
        
        print(f"📊 Database assets query: {len(asset_data)} unique assets from last {hours} hours")
        
        return JsonResponse({
            "success": True,
            "data": asset_data,
            "count": len(asset_data),
            "time_range_hours": hours,
            "service_filter": service_name,
            "source": "database",
            "timestamp": datetime.now().isoformat() + 'Z'
        })
        
    except Exception as e:
        print(f"❌ Database assets query error: {e}")
        return JsonResponse({
            "success": False,
            "error": str(e)
        }, status=500)

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
    
    # Check database health
    try:
        db_service_count = Service.objects.count()
        db_asset_count = Asset.objects.count()
        db_health = "healthy"
    except Exception as e:
        db_service_count = 0
        db_asset_count = 0
        db_health = f"error: {e}"
    
    print(f"🏥 Data storage status: {data_health}")
    print(f"🏥 Database status: {db_health}")
    
    return JsonResponse({
        "status": "healthy",
        "message": "Django server is running",
        "data_storage": data_health,
        "database": db_health,
        "stored_services": len(iot_data_store['services']),
        "stored_assets": sum(len(service.get('assets', [])) for service in iot_data_store['services']),
        "db_services": db_service_count,
        "db_assets": db_asset_count,
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
    
    # Get database stats
    try:
        db_services = Service.objects.count()
        db_assets = Asset.objects.count()
        recent_assets = Asset.objects.order_by('-timestamp')[:5]
        recent_assets_info = [
            f"{asset.service.name}.{asset.asset_id}={asset.value}"
            for asset in recent_assets
        ]
    except Exception as e:
        db_services = 0
        db_assets = 0
        recent_assets_info = [f"Error: {e}"]
    
    return JsonResponse({
        "server_type": "django_iot_server",
        "config_external_url": EXTERNAL_SERVER_GET_BASE_URL,
        "current_data": {
            "total_services": len(current_services),
            "total_assets": sum(len(service.get('assets', [])) for service in current_services),
            "services": service_info,
            "history_count": len(iot_data_store['history'])
        },
        "database_data": {
            "total_services": db_services,
            "total_assets": db_assets,
            "recent_assets": recent_assets_info
        },
        "message": "Django IoT server status - local data processing with async DB storage",
        "timestamp": datetime.now().isoformat() + 'Z'
    })