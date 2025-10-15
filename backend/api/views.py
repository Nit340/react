from datetime import datetime, timedelta
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
import requests
from collections import deque
import threading
from django.db import transaction
from .models import Crane, Service, Asset

# ==================== CONFIGURATION ====================
EXTERNAL_SERVER_GET_BASE_URL = "http://172.28.176.174:5000"

# ==================== IOT DATA STORAGE ====================
iot_data_store = {
    'latest': None,
    'services': [],
    'notifications': deque(maxlen=10)
}

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
        iot_data_store['services'] = processed_data.get('services', [])
        
        print(f"✅ Stored {processed_data['total_services']} services with {processed_data['total_assets']} assets in local storage")
        
        # Save to database in background thread (non-blocking)
        save_to_database_async(data)
        
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

# REMOVED: get_database_assets() function

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

# ==================== LOAD OPERATIONS ENDPOINT ====================

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

# ==================== ONBOARD NOTIFICATION ENDPOINTS ====================

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
            iot_data_store['notifications'] = deque(maxlen=10)
        
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
            maxlen=10
        )
    
    return JsonResponse({
        "success": True,
        "data": notifications,
        "count": len(notifications),
        "cleared_after_send": clear_after,
        "remaining_in_storage": len(iot_data_store.get('notifications', [])),
        "timestamp": datetime.now().isoformat() + 'Z'
    })