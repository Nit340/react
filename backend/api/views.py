from datetime import datetime, timedelta
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
import requests
import asyncio
from collections import deque
import threading
from django.db import transaction
from .models import Crane, Service, Asset, DataHistory

# ==================== CONFIGURATION ====================
EXTERNAL_SERVER_GET_BASE_URL = "http://172.28.176.174:5000"

# ==================== IOT DATA STORAGE ====================
iot_data_store = {
    'latest': None,
    'history': deque(maxlen=100),
    'services': []
}

active_connections = set()

# ==================== DATABASE STORAGE FUNCTIONS ====================

def save_to_database_async(services_data):
    """Save IoT data to database in a separate thread"""
    def save_data():
        try:
            with transaction.atomic():
                # Get or create default crane
                crane, _ = Crane.objects.get_or_create(
                    name="Crane",
                    defaults={'description': 'Default crane'}
                )
                
                total_assets_processed = 0
                total_services_processed = 0
                
                for service_data in services_data:
                    if 'name' in service_data and 'assets' in service_data:
                        # Get or create service under the default crane
                        service, created = Service.objects.get_or_create(
                            crane=crane,
                            name=service_data['name'],
                            defaults={
                                'service_type': service_data.get('name', 'other')
                            }
                        )
                        total_services_processed += 1
                        
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
                
                print(f"💾 Database: Saved {total_services_processed} services with {total_assets_processed} assets under crane '{crane.name}'")
                
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
    """Receive IoT data from devices via POST - STORE IN DB ASYNC"""
    print("=" * 50)
    print("📱 Django: IoT Data POST received")
    print("=" * 50)
    
    try:
        data = json.loads(request.body)
        print(f"📦 Raw Service Data received: {len(data)} services")
        
        # Process data for local storage
        processed_data = process_service_based_data(data)
        
        # Store the data locally
        iot_data_store['latest'] = processed_data
        iot_data_store['history'].append(processed_data)
        iot_data_store['services'] = processed_data.get('services', [])
        
        print(f"✅ Stored {processed_data['total_services']} services with {processed_data['total_assets']} assets in local storage")
        
        # Save to database in background thread (non-blocking)
        save_to_database_async(data)
        
        # Broadcast to WebSocket clients
        asyncio.run(broadcast_to_websockets(processed_data))
        
        return JsonResponse({
            "success": True,
            "message": f"Processed {processed_data['total_services']} services",
            "received_services": processed_data['total_services'],
            "received_assets": processed_data['total_assets'],
            "database_save": "started",
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
    
    # Handle array format
    if isinstance(external_data, list):
        services_data = external_data
    elif isinstance(external_data, dict) and 'services' in external_data:
        services_data = external_data['services']
    else:
        services_data = [external_data]
    
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
        # Get default crane
        crane = Crane.objects.filter(name="Crane").first()
        if not crane:
            return JsonResponse({
                "success": False,
                "error": "No crane found",
                "timestamp": datetime.now().isoformat() + 'Z'
            }, status=404)
        
        services = Service.objects.filter(crane=crane).prefetch_related('assets')
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
            "crane": crane.name,
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
    """Get assets from database, optionally filtered by service"""
    try:
        # Get time range filter from query parameters
        hours = int(request.GET.get('hours', 6))
        time_filter = datetime.now() - timedelta(hours=hours)
        
        assets_query = Asset.objects.select_related('service', 'service__crane').filter(
            timestamp__gte=time_filter
        )
        
        if service_name:
            assets_query = assets_query.filter(service__name=service_name)
        
        # Get latest asset for each asset_id to avoid duplicates
        latest_assets = []
        seen_assets = set()
        
        # Order by timestamp descending and take unique asset_ids
        for asset in assets_query.order_by('-timestamp'):
            asset_key = f"{asset.service.name}.{asset.asset_id}"
            if asset_key not in seen_assets:
                seen_assets.add(asset_key)
                latest_assets.append(asset)
        
        asset_data = []
        for asset in latest_assets:
            asset_data.append({
                'crane': asset.service.crane.name,
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
        crane = Crane.objects.filter(name="Crane").first()
        db_service_count = Service.objects.count() if crane else 0
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
            'assets': [asset['id'] for asset in service.get('assets', [])][:3]
        })
    
    # Get database stats
    try:
        crane = Crane.objects.filter(name="Crane").first()
        db_services = Service.objects.count() if crane else 0
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
        "crane": "Crane (default)",
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
# ==================== NEW CRANE ENDPOINTS ====================

@require_http_methods(["GET"])
def get_database_cranes(request):
    """Get all cranes from database"""
    try:
        cranes = Crane.objects.prefetch_related('services').all()
        crane_data = []
        
        for crane in cranes:
            services_data = []
            for service in crane.services.all()[:10]:  # Limit services for performance
                services_data.append({
                    'name': service.name,
                    'service_type': service.service_type,
                    'asset_count': service.assets.count()
                })
            
            crane_data.append({
                'id': crane.id,
                'name': crane.name,
                'description': crane.description,
                'is_active': crane.is_active,
                'service_count': crane.services.count(),
                'asset_count': crane.asset_count(),
                'services': services_data,
                'created_at': crane.created_at.isoformat() + 'Z',
                'updated_at': crane.updated_at.isoformat() + 'Z'
            })
        
        return JsonResponse({
            "success": True,
            "data": crane_data,
            "total_cranes": len(crane_data),
            "source": "database",
            "timestamp": datetime.now().isoformat() + 'Z'
        })
        
    except Exception as e:
        print(f"❌ Database cranes query error: {e}")
        return JsonResponse({
            "success": False,
            "error": str(e)
        }, status=500)

@require_http_methods(["GET"])
def get_crane_detail(request, crane_id):
    """Get detailed information for a specific crane"""
    try:
        crane = Crane.objects.prefetch_related('services').get(id=crane_id)
        
        services_data = []
        for service in crane.services.all():
            assets_data = []
            for asset in service.assets.all()[:10]:  # Limit assets
                assets_data.append({
                    'asset_id': asset.asset_id,
                    'value': asset.value,
                    'value_type': asset.value_type,
                    'unit': asset.unit,
                    'timestamp': asset.timestamp.isoformat() + 'Z'
                })
            
            services_data.append({
                'id': service.id,
                'name': service.name,
                'service_type': service.service_type,
                'asset_count': service.assets.count(),
                'assets': assets_data,
                'is_active': service.is_active
            })
        
        crane_data = {
            'id': crane.id,
            'name': crane.name,
            'description': crane.description,
            'is_active': crane.is_active,
            'service_count': crane.services.count(),
            'asset_count': crane.asset_count(),
            'services': services_data,
            'created_at': crane.created_at.isoformat() + 'Z',
            'updated_at': crane.updated_at.isoformat() + 'Z'
        }
        
        return JsonResponse({
            "success": True,
            "data": crane_data,
            "source": "database",
            "timestamp": datetime.now().isoformat() + 'Z'
        })
        
    except Crane.DoesNotExist:
        return JsonResponse({
            "success": False,
            "error": "Crane not found"
        }, status=404)
    except Exception as e:
        print(f"❌ Crane detail query error: {e}")
        return JsonResponse({
            "success": False,
            "error": str(e)
        }, status=500)

@require_http_methods(["GET"])
def get_crane_services(request, crane_id):
    """Get all services for a specific crane"""
    try:
        crane = Crane.objects.get(id=crane_id)
        services = Service.objects.filter(crane=crane).prefetch_related('assets')
        
        services_data = []
        for service in services:
            assets_data = []
            for asset in service.assets.all()[:20]:
                assets_data.append({
                    'asset_id': asset.asset_id,
                    'value': asset.value,
                    'value_type': asset.value_type,
                    'unit': asset.unit,
                    'timestamp': asset.timestamp.isoformat() + 'Z'
                })
            
            services_data.append({
                'id': service.id,
                'name': service.name,
                'service_type': service.service_type,
                'asset_count': service.assets.count(),
                'assets': assets_data,
                'is_active': service.is_active,
                'created_at': service.created_at.isoformat() + 'Z'
            })
        
        return JsonResponse({
            "success": True,
            "crane": crane.name,
            "data": services_data,
            "total_services": len(services_data),
            "source": "database",
            "timestamp": datetime.now().isoformat() + 'Z'
        })
        
    except Crane.DoesNotExist:
        return JsonResponse({
            "success": False,
            "error": "Crane not found"
        }, status=404)
    except Exception as e:
        print(f"❌ Crane services query error: {e}")
        return JsonResponse({
            "success": False,
            "error": str(e)
        }, status=500)

# ==================== NEW SERVICE ENDPOINTS ====================

@require_http_methods(["GET"])
def get_service_detail(request, service_name):
    """Get detailed information for a specific service"""
    try:
        service = Service.objects.select_related('crane').prefetch_related('assets').get(name=service_name)
        
        assets_data = []
        for asset in service.assets.all():
            assets_data.append({
                'asset_id': asset.asset_id,
                'value': asset.value,
                'value_type': asset.value_type,
                'unit': asset.unit,
                'timestamp': asset.timestamp.isoformat() + 'Z',
                'is_active': asset.is_active,
                'display_value': asset.get_display_value()
            })
        
        service_data = {
            'id': service.id,
            'name': service.name,
            'service_type': service.service_type,
            'crane': service.crane.name,
            'description': service.description,
            'is_active': service.is_active,
            'asset_count': service.assets.count(),
            'assets': assets_data,
            'created_at': service.created_at.isoformat() + 'Z',
            'updated_at': service.updated_at.isoformat() + 'Z'
        }
        
        return JsonResponse({
            "success": True,
            "data": service_data,
            "source": "database",
            "timestamp": datetime.now().isoformat() + 'Z'
        })
        
    except Service.DoesNotExist:
        return JsonResponse({
            "success": False,
            "error": "Service not found"
        }, status=404)
    except Exception as e:
        print(f"❌ Service detail query error: {e}")
        return JsonResponse({
            "success": False,
            "error": str(e)
        }, status=500)

# ==================== NEW ASSET ENDPOINTS ====================

@require_http_methods(["GET"])
def get_asset_detail(request, service_name, asset_id):
    """Get detailed information for a specific asset"""
    try:
        asset = Asset.objects.select_related('service', 'service__crane').get(
            service__name=service_name, 
            asset_id=asset_id
        )
        
        asset_data = {
            'id': asset.id,
            'asset_id': asset.asset_id,
            'service': asset.service.name,
            'crane': asset.service.crane.name,
            'value': asset.value,
            'value_type': asset.value_type,
            'unit': asset.unit,
            'timestamp': asset.timestamp.isoformat() + 'Z',
            'is_active': asset.is_active,
            'display_value': asset.get_display_value(),
            'state_0_name': asset.state_0_name,
            'state_1_name': asset.state_1_name,
            'created_at': asset.created_at.isoformat() + 'Z'
        }
        
        return JsonResponse({
            "success": True,
            "data": asset_data,
            "source": "database",
            "timestamp": datetime.now().isoformat() + 'Z'
        })
        
    except Asset.DoesNotExist:
        return JsonResponse({
            "success": False,
            "error": "Asset not found"
        }, status=404)
    except Exception as e:
        print(f"❌ Asset detail query error: {e}")
        return JsonResponse({
            "success": False,
            "error": str(e)
        }, status=500)

@require_http_methods(["GET"])
def get_asset_history(request, service_name, asset_id):
    """Get historical data for a specific asset"""
    try:
        hours = int(request.GET.get('hours', 24))
        limit = int(request.GET.get('limit', 100))
        
        time_filter = datetime.now() - timedelta(hours=hours)
        
        history = DataHistory.objects.select_related('asset', 'service').filter(
            service__name=service_name,
            asset__asset_id=asset_id,
            timestamp__gte=time_filter
        ).order_by('-timestamp')[:limit]
        
        history_data = []
        for record in history:
            history_data.append({
                'value': record.value,
                'timestamp': record.timestamp.isoformat() + 'Z',
                'recorded_at': record.recorded_at.isoformat() + 'Z'
            })
        
        return JsonResponse({
            "success": True,
            "asset": f"{service_name}.{asset_id}",
            "data": history_data,
            "count": len(history_data),
            "time_range_hours": hours,
            "limit": limit,
            "source": "database",
            "timestamp": datetime.now().isoformat() + 'Z'
        })
        
    except Exception as e:
        print(f"❌ Asset history query error: {e}")
        return JsonResponse({
            "success": False,
            "error": str(e)
        }, status=500)

# ==================== CONFIGURATION ENDPOINTS ====================

@require_http_methods(["GET"])
def get_service_configs(request):
    """Get all service configurations"""
    try:
        configs = ServiceConfiguration.objects.select_related('service').all()
        
        config_data = []
        for config in configs:
            config_data.append({
                'service_id': config.service.id,
                'service_name': config.service.name,
                'is_enabled': config.is_enabled,
                'polling_interval': config.polling_interval,
                'data_retention_days': config.data_retention_days,
                'max_assets': config.max_assets,
                'alert_enabled': config.alert_enabled,
                'min_value': config.min_value,
                'max_value': config.max_value,
                'email_alerts': config.email_alerts,
                'email_address': config.email_address,
                'updated_at': config.updated_at.isoformat() + 'Z'
            })
        
        return JsonResponse({
            "success": True,
            "data": config_data,
            "total_configs": len(config_data),
            "source": "database",
            "timestamp": datetime.now().isoformat() + 'Z'
        })
        
    except Exception as e:
        print(f"❌ Service configs query error: {e}")
        return JsonResponse({
            "success": False,
            "error": str(e)
        }, status=500)

@require_http_methods(["GET"])
def get_service_config(request, service_id):
    """Get configuration for a specific service"""
    try:
        config = ServiceConfiguration.objects.select_related('service').get(service_id=service_id)
        
        config_data = {
            'service_id': config.service.id,
            'service_name': config.service.name,
            'is_enabled': config.is_enabled,
            'polling_interval': config.polling_interval,
            'data_retention_days': config.data_retention_days,
            'max_assets': config.max_assets,
            'alert_enabled': config.alert_enabled,
            'min_value': config.min_value,
            'max_value': config.max_value,
            'email_alerts': config.email_alerts,
            'email_address': config.email_address,
            'created_at': config.created_at.isoformat() + 'Z',
            'updated_at': config.updated_at.isoformat() + 'Z'
        }
        
        return JsonResponse({
            "success": True,
            "data": config_data,
            "source": "database",
            "timestamp": datetime.now().isoformat() + 'Z'
        })
        
    except ServiceConfiguration.DoesNotExist:
        return JsonResponse({
            "success": False,
            "error": "Service configuration not found"
        }, status=404)
    except Exception as e:
        print(f"❌ Service config query error: {e}")
        return JsonResponse({
            "success": False,
            "error": str(e)
        }, status=500)

# ==================== STATUS ENDPOINTS ====================

@require_http_methods(["GET"])
def get_services_status(request):
    """Get status for all services"""
    try:
        status_logs = SystemStatus.objects.select_related('service').order_by('-created_at')
        
        # Get latest status for each service
        service_status = {}
        for status in status_logs:
            if status.service.name not in service_status:
                service_status[status.service.name] = {
                    'service_name': status.service.name,
                    'status': status.status,
                    'message': status.message,
                    'last_data_received': status.last_data_received.isoformat() + 'Z' if status.last_data_received else None,
                    'assets_online': status.assets_online,
                    'assets_total': status.assets_total,
                    'uptime_percentage': status.uptime_percentage(),
                    'created_at': status.created_at.isoformat() + 'Z'
                }
        
        status_data = list(service_status.values())
        
        return JsonResponse({
            "success": True,
            "data": status_data,
            "total_services": len(status_data),
            "source": "database",
            "timestamp": datetime.now().isoformat() + 'Z'
        })
        
    except Exception as e:
        print(f"❌ Services status query error: {e}")
        return JsonResponse({
            "success": False,
            "error": str(e)
        }, status=500)

@require_http_methods(["GET"])
def get_system_stats(request):
    """Get system statistics"""
    try:
        # Database stats
        crane_count = Crane.objects.count()
        service_count = Service.objects.count()
        asset_count = Asset.objects.count()
        history_count = DataHistory.objects.count()
        
        # Latest data
        latest_asset = Asset.objects.order_by('-timestamp').first()
        latest_timestamp = latest_asset.timestamp if latest_asset else None
        
        # Service type distribution
        service_types = Service.objects.values('service_type').annotate(count=models.Count('id'))
        
        stats = {
            'cranes': crane_count,
            'services': service_count,
            'assets': asset_count,
            'history_records': history_count,
            'latest_data_timestamp': latest_timestamp.isoformat() + 'Z' if latest_timestamp else None,
            'service_type_distribution': list(service_types),
            'local_storage_services': len(iot_data_store['services']),
            'local_storage_assets': sum(len(service.get('assets', [])) for service in iot_data_store['services']),
            'local_history_count': len(iot_data_store['history'])
        }
        
        return JsonResponse({
            "success": True,
            "data": stats,
            "source": "database",
            "timestamp": datetime.now().isoformat() + 'Z'
        })
        
    except Exception as e:
        print(f"❌ System stats query error: {e}")
        return JsonResponse({
            "success": False,
            "error": str(e)
        }, status=500)

# ==================== UTILITY ENDPOINTS ====================

@require_http_methods(["GET"])
def export_iot_data(request):
    """Export IoT data in various formats"""
    try:
        format_type = request.GET.get('format', 'json')
        hours = int(request.GET.get('hours', 24))
        
        time_filter = datetime.now() - timedelta(hours=hours)
        
        assets = Asset.objects.select_related('service', 'service__crane').filter(
            timestamp__gte=time_filter
        ).order_by('-timestamp')
        
        export_data = []
        for asset in assets:
            export_data.append({
                'crane': asset.service.crane.name,
                'service': asset.service.name,
                'asset_id': asset.asset_id,
                'value': asset.value,
                'value_type': asset.value_type,
                'unit': asset.unit,
                'timestamp': asset.timestamp.isoformat() + 'Z'
            })
        
        if format_type == 'csv':
            # For CSV export, you would generate CSV content
            # This is a simplified version
            return JsonResponse({
                "success": True,
                "format": "csv",
                "message": "CSV export would be implemented here",
                "record_count": len(export_data),
                "timestamp": datetime.now().isoformat() + 'Z'
            })
        else:
            # Default JSON export
            return JsonResponse({
                "success": True,
                "format": "json",
                "data": export_data,
                "record_count": len(export_data),
                "time_range_hours": hours,
                "source": "database",
                "timestamp": datetime.now().isoformat() + 'Z'
            })
        
    except Exception as e:
        print(f"❌ Export error: {e}")
        return JsonResponse({
            "success": False,
            "error": str(e)
        }, status=500)
# ==================== MISSING VIEW FUNCTIONS ====================

@csrf_exempt
@require_http_methods(["POST"])
def update_service_config(request, service_id):
    """Update configuration for a specific service"""
    try:
        service = Service.objects.get(id=service_id)
        data = json.loads(request.body)
        
        # Get or create service configuration
        config, created = ServiceConfiguration.objects.get_or_create(service=service)
        
        # Update configuration fields
        if 'is_enabled' in data:
            config.is_enabled = data['is_enabled']
        if 'polling_interval' in data:
            config.polling_interval = data['polling_interval']
        if 'data_retention_days' in data:
            config.data_retention_days = data['data_retention_days']
        if 'max_assets' in data:
            config.max_assets = data['max_assets']
        if 'alert_enabled' in data:
            config.alert_enabled = data['alert_enabled']
        if 'min_value' in data:
            config.min_value = data['min_value']
        if 'max_value' in data:
            config.max_value = data['max_value']
        if 'email_alerts' in data:
            config.email_alerts = data['email_alerts']
        if 'email_address' in data:
            config.email_address = data['email_address']
        
        config.save()
        
        return JsonResponse({
            "success": True,
            "message": f"Configuration updated for {service.name}",
            "service_id": service.id,
            "service_name": service.name,
            "timestamp": datetime.now().isoformat() + 'Z'
        })
        
    except Service.DoesNotExist:
        return JsonResponse({
            "success": False,
            "error": "Service not found"
        }, status=404)
    except Exception as e:
        print(f"❌ Service config update error: {e}")
        return JsonResponse({
            "success": False,
            "error": str(e)
        }, status=500)

@require_http_methods(["GET"])
def get_service_status(request, service_name):
    """Get status for a specific service"""
    try:
        service = Service.objects.get(name=service_name)
        latest_status = SystemStatus.objects.filter(service=service).order_by('-created_at').first()
        
        if not latest_status:
            return JsonResponse({
                "success": False,
                "error": "No status data available for this service"
            }, status=404)
        
        status_data = {
            'service_name': service.name,
            'status': latest_status.status,
            'message': latest_status.message,
            'last_data_received': latest_status.last_data_received.isoformat() + 'Z' if latest_status.last_data_received else None,
            'assets_online': latest_status.assets_online,
            'assets_total': latest_status.assets_total,
            'uptime_percentage': latest_status.uptime_percentage(),
            'created_at': latest_status.created_at.isoformat() + 'Z'
        }
        
        return JsonResponse({
            "success": True,
            "data": status_data,
            "source": "database",
            "timestamp": datetime.now().isoformat() + 'Z'
        })
        
    except Service.DoesNotExist:
        return JsonResponse({
            "success": False,
            "error": "Service not found"
        }, status=404)
    except Exception as e:
        print(f"❌ Service status query error: {e}")
        return JsonResponse({
            "success": False,
            "error": str(e)
        }, status=500)

@require_http_methods(["GET"])
def get_system_status(request):
    """Get overall system status"""
    try:
        # Get latest status for all services
        services = Service.objects.all()
        system_status = []
        
        for service in services:
            latest_status = SystemStatus.objects.filter(service=service).order_by('-created_at').first()
            if latest_status:
                system_status.append({
                    'service_name': service.name,
                    'status': latest_status.status,
                    'uptime_percentage': latest_status.uptime_percentage(),
                    'last_data_received': latest_status.last_data_received.isoformat() + 'Z' if latest_status.last_data_received else None,
                    'created_at': latest_status.created_at.isoformat() + 'Z'
                })
        
        # Calculate overall system health
        online_services = len([s for s in system_status if s['status'] == 'online'])
        total_services = len(system_status)
        overall_health = 'healthy' if online_services == total_services else 'degraded' if online_services > 0 else 'offline'
        
        return JsonResponse({
            "success": True,
            "data": {
                'overall_health': overall_health,
                'online_services': online_services,
                'total_services': total_services,
                'services': system_status
            },
            "source": "database",
            "timestamp": datetime.now().isoformat() + 'Z'
        })
        
    except Exception as e:
        print(f"❌ System status query error: {e}")
        return JsonResponse({
            "success": False,
            "error": str(e)
        }, status=500)

@require_http_methods(["GET"])
def get_health_status(request):
    """Get detailed health status"""
    try:
        # Database health
        crane_count = Crane.objects.count()
        service_count = Service.objects.count()
        asset_count = Asset.objects.count()
        
        # Latest data timestamp
        latest_asset = Asset.objects.order_by('-timestamp').first()
        latest_timestamp = latest_asset.timestamp if latest_asset else None
        
        # Service status summary
        services_status = []
        for service in Service.objects.all():
            latest_status = SystemStatus.objects.filter(service=service).order_by('-created_at').first()
            services_status.append({
                'name': service.name,
                'status': latest_status.status if latest_status else 'unknown',
                'asset_count': service.assets.count()
            })
        
        health_data = {
            'database': {
                'cranes': crane_count,
                'services': service_count,
                'assets': asset_count,
                'status': 'healthy'
            },
            'data_freshness': {
                'latest_timestamp': latest_timestamp.isoformat() + 'Z' if latest_timestamp else None,
                'status': 'fresh' if latest_timestamp and (datetime.now().astimezone() - latest_timestamp).total_seconds() < 300 else 'stale'
            },
            'services': services_status,
            'local_storage': {
                'services_count': len(iot_data_store['services']),
                'assets_count': sum(len(service.get('assets', [])) for service in iot_data_store['services']),
                'history_count': len(iot_data_store['history'])
            }
        }
        
        return JsonResponse({
            "success": True,
            "data": health_data,
            "timestamp": datetime.now().isoformat() + 'Z'
        })
        
    except Exception as e:
        print(f"❌ Health status query error: {e}")
        return JsonResponse({
            "success": False,
            "error": str(e)
        }, status=500)
@require_http_methods(["GET"])
def get_load_operations(request):
    """Get load operations data for Load page - CORRELATES OPERATIONS WITH LOAD VALUES"""
    try:
        # Get time range filter from query parameters
        hours = int(request.GET.get('hours', 6))
        time_filter = datetime.now() - timedelta(hours=hours)
        
        print(f"📊 Load operations query: Last {hours} hours")
        
        # Get all assets within time range, ordered by timestamp
        assets = Asset.objects.select_related('service', 'service__crane').filter(
            timestamp__gte=time_filter
        ).order_by('timestamp')
        
        print(f"📊 Found {assets.count()} assets in time range")
        
        # Group assets by timestamp to correlate operations with load values
        timestamp_groups = {}
        
        for asset in assets:
            timestamp_key = asset.timestamp.isoformat()
            
            if timestamp_key not in timestamp_groups:
                timestamp_groups[timestamp_key] = {
                    'timestamp': asset.timestamp,
                    'operations': [],
                    'load_value': 0,
                    'capacity': 10000,  # Default capacity
                    'crane': asset.service.crane.name,
                    'service': asset.service.name
                }
            
            # Check for operation triggers (value = 1 for digital inputs)
            operation_datapoints = ['Hoist_Up', 'Hoist_Down', 'Ct_Left', 'Ct_Right', 'Lt_Forward', 'Lt_Reverse']
            if asset.asset_id in operation_datapoints:
                # For digital inputs, value 1 means operation active
                if asset.value == 1:
                    operation_type = ''
                    if asset.asset_id == 'Hoist_Up':
                        operation_type = 'hoist-up'
                    elif asset.asset_id == 'Hoist_Down':
                        operation_type = 'hoist-down'
                    elif asset.asset_id == 'Ct_Left':
                        operation_type = 'ct-left'
                    elif asset.asset_id == 'Ct_Right':
                        operation_type = 'ct-right'
                    elif asset.asset_id == 'Lt_Forward':
                        operation_type = 'lt-forward'
                    elif asset.asset_id == 'Lt_Reverse':
                        operation_type = 'lt-reverse'
                    
                    if operation_type and operation_type not in timestamp_groups[timestamp_key]['operations']:
                        timestamp_groups[timestamp_key]['operations'].append(operation_type)
                        print(f"🔧 Operation detected: {operation_type} at {asset.timestamp}")
            
            # Get load value from LoadCell service
            if asset.asset_id == 'Load' and asset.service.name == 'LoadCell':
                timestamp_groups[timestamp_key]['load_value'] = float(asset.value)
                print(f"⚖️ Load value: {asset.value} at {asset.timestamp}")
            
            # Get capacity from LoadCell service
            if asset.asset_id == 'Load_Capacity' and asset.service.name == 'LoadCell':
                timestamp_groups[timestamp_key]['capacity'] = float(asset.value)
                print(f"📏 Capacity: {asset.value} at {asset.timestamp}")
        
        # Create operation records
        operation_records = []
        for timestamp_key, group in timestamp_groups.items():
            if group['operations']:  # Only include timestamps with operations
                load_percentage = (group['load_value'] / group['capacity']) * 100 if group['capacity'] > 0 else 0
                
                status = 'normal'
                if group['load_value'] > 0:
                    if load_percentage > 95:
                        status = 'overload'
                    elif load_percentage > 80:
                        status = 'warning'
                    else:
                        status = 'normal'
                
                for operation in group['operations']:
                    # Format timestamp for display
                    formatted_timestamp = group['timestamp'].strftime('%Y-%m-%d %H:%M:%S')
                    
                    operation_records.append({
                        'id': f"{timestamp_key}_{operation}_{len(operation_records)}",
                        'timestamp': formatted_timestamp,
                        'craneId': group['crane'],
                        'operation': operation,
                        'load': round(group['load_value'], 0),
                        'capacity': round(group['capacity'], 0),
                        'percentage': round(load_percentage, 1),
                        'status': status
                    })
        
        # Sort by timestamp descending (newest first)
        operation_records.sort(key=lambda x: x['timestamp'], reverse=True)
        
        print(f"📊 Load operations: Generated {len(operation_records)} operation records")
        
        return JsonResponse({
            "success": True,
            "data": operation_records,
            "count": len(operation_records),
            "time_range_hours": hours,
            "source": "database_operations",
            "timestamp": datetime.now().isoformat() + 'Z'
        })
        
    except Exception as e:
        print(f"❌ Load operations query error: {e}")
        import traceback
        traceback.print_exc()
        return JsonResponse({
            "success": False,
            "error": str(e)
        }, status=500)
    import requests

@csrf_exempt
@require_http_methods(["POST"])
def receive_onboard_notification(request):
    """Receive onboard I/O notifications - STORE TEMPORARILY FOR FRONTEND POLLING"""
    print("=" * 30)
    print("🔔 Onboard Notification Received")
    print("=" * 30)
    
    try:
        data = json.loads(request.body)
        print(f"📦 Raw notification data: {json.dumps(data, indent=2)}")
        
        # Validate basic structure
        if not isinstance(data, dict) or 'name' not in data:
            return JsonResponse({
                "success": False,
                "error": "Invalid notification format: missing 'name' field"
            }, status=400)
        
        service_name = data.get('name', 'unknown')
        notifications = data.get('notifications', [])
        
        print(f"🔔 Service: {service_name}")
        print(f"🔔 Notifications count: {len(notifications)}")
        
        # Process each notification
        processed_notifications = []
        for notification in notifications:
            if isinstance(notification, dict):
                title = notification.get('title', 'Notification')
                message = notification.get('message', 'No message')
                
                notification_data = {
                    'title': title,
                    'message': message,
                    'service': service_name,
                    'timestamp': datetime.now().isoformat() + 'Z',
                    'id': f"{service_name}_{datetime.now().timestamp()}"
                }
                
                processed_notifications.append(notification_data)
                print(f"   📢 {title}: {message}")
        
        # Store in local storage (temporary storage for frontend polling)
        if 'notifications' not in iot_data_store:
            iot_data_store['notifications'] = deque(maxlen=50)
        
        for notification in processed_notifications:
            iot_data_store['notifications'].append(notification)
        
        return JsonResponse({
            "success": True,
            "message": f"Processed {len(processed_notifications)} notifications from {service_name}",
            "service": service_name,
            "notifications_received": len(processed_notifications),
            "stored_count": len(iot_data_store['notifications']),
            "timestamp": datetime.now().isoformat() + 'Z'
        })
        
    except json.JSONDecodeError as e:
        print(f"❌ JSON decode error: {e}")
        return JsonResponse({
            "success": False,
            "error": "Invalid JSON format"
        }, status=400)
    except Exception as e:
        print(f"💥 Notification processing error: {e}")
        return JsonResponse({
            "success": False,
            "error": str(e)
        }, status=500)

@require_http_methods(["GET"])
def get_onboard_notifications(request):
    """Get recent onboard notifications AND CLEAR THEM AFTER SENDING"""
    print("🔔 Fetching recent notifications")
    
    limit = int(request.GET.get('limit', 10))
    clear_after = request.GET.get('clear', 'false').lower() == 'true'
    
    # Get notifications from local storage
    notifications = list(iot_data_store.get('notifications', []))[-limit:]
    
    # Clear notifications after sending if requested
    if clear_after and notifications:
        print(f"🗑️ Clearing {len(notifications)} notifications after sending")
        # Remove the sent notifications from storage
        iot_data_store['notifications'] = deque(
            list(iot_data_store['notifications'])[:-len(notifications)] if len(iot_data_store['notifications']) > len(notifications) else [],
            maxlen=50
        )
    
    return JsonResponse({
        "success": True,
        "data": notifications,
        "count": len(notifications),
        "cleared_after_send": clear_after,
        "remaining_in_storage": len(iot_data_store.get('notifications', [])),
        "timestamp": datetime.now().isoformat() + 'Z'
    })

@require_http_methods(["POST"])
def clear_all_notifications(request):
    """Clear all notifications from storage"""
    print("🗑️ Clearing all notifications")
    
    iot_data_store['notifications'] = deque(maxlen=50)
    
    return JsonResponse({
        "success": True,
        "message": "All notifications cleared",
        "cleared_count": 0,  # We don't track exact count since we're resetting
        "timestamp": datetime.now().isoformat() + 'Z'
    })