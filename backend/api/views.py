from datetime import datetime, timedelta
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
import requests
from collections import deque
import threading
from django.db import transaction, models
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
    """Save IoT data to database in a separate thread - ONLY IO SERVICES GET OPERATION COUNTERS"""
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
                
                print(f"🔄 Processing {len(services_data)} services...")
                
                for service_data in services_data:
                    if 'name' in service_data and 'assets' in service_data:
                        service_name = service_data['name']
                        print(f"🔧 Processing service: {service_name}")
                        
                        # Get or create service under the default crane
                        service, created = Service.objects.get_or_create(
                            crane=crane,
                            name=service_name,
                            defaults={
                                'service_type': service_data.get('name', 'other')
                            }
                        )
                        total_services_processed += 1
                        
                        # Check if this is an IO service that needs operation counters
                        is_io_service = service.is_io_service()
                        print(f"🔍 Service {service_name} is IO service: {is_io_service}")
                        
                        for asset_data in service_data['assets']:
                            if 'id' in asset_data and 'value' in asset_data:
                                asset_id = asset_data['id']
                                asset_value = asset_data['value']
                                
                                # Parse timestamp
                                timestamp_str = asset_data.get('timestamp', datetime.now().isoformat() + 'Z')
                                try:
                                    if timestamp_str.endswith('Z'):
                                        timestamp_str = timestamp_str[:-1] + '+00:00'
                                    timestamp = datetime.fromisoformat(timestamp_str)
                                except Exception as e:
                                    print(f"⚠️ Timestamp parsing error: {e}, using current time")
                                    timestamp = datetime.now()
                                
                                print(f"📊 Asset: {asset_id} = {asset_value} at {timestamp}")
                                
                                # Get existing asset to check for value changes
                                existing_asset = Asset.objects.filter(
                                    service=service,
                                    asset_id=asset_id
                                ).first()
                                
                                # Prepare update data - basic fields for all assets
                                update_data = {
                                    'value': asset_value,
                                    'timestamp': timestamp,
                                }
                                
                                # ONLY PROCESS OPERATION COUNTERS FOR IO SERVICES
                                if is_io_service and existing_asset:
                                    old_value = existing_asset.value
                                    new_value = asset_value
                                    
                                    # Check if this is a digital asset that might trigger operations
                                    asset_id_lower = asset_id.lower()
                                    is_digital_asset = any(keyword in asset_id_lower for keyword in 
                                                        ['start', 'stop', 'hoist', 'ct_', 'lt_', 'in', 'out'])
                                    
                                    if is_digital_asset:
                                        print(f"🔍 IO Service Digital asset: {asset_id}, old: {old_value}, new: {new_value}")
                                        
                                        # Operation detected: 0 → 1 transition
                                        if old_value == 0 and new_value == 1:
                                            print(f"🚨 IO SERVICE OPERATION TRIGGERED: {asset_id} changed from {old_value}→{new_value}")
                                            
                                            # IMPROVED PATTERN MATCHING - ONLY FOR IO SERVICES
                                            if 'hoist_up' in asset_id_lower or ('hoist' in asset_id_lower and 'up' in asset_id_lower):
                                                update_data['hoist_up_count'] = existing_asset.hoist_up_count + 1
                                                update_data['last_operation_start'] = timestamp
                                                print(f"✅ IO SERVICE COUNTED: {asset_id} → hoist_up_count = {update_data['hoist_up_count']}")
                                            
                                            elif 'hoist_down' in asset_id_lower or ('hoist' in asset_id_lower and 'down' in asset_id_lower):
                                                update_data['hoist_down_count'] = existing_asset.hoist_down_count + 1
                                                update_data['last_operation_start'] = timestamp
                                                print(f"✅ IO SERVICE COUNTED: {asset_id} → hoist_down_count = {update_data['hoist_down_count']}")
                                            
                                            elif 'ct_left' in asset_id_lower or ('ct' in asset_id_lower and 'left' in asset_id_lower):
                                                update_data['ct_forward_count'] = existing_asset.ct_forward_count + 1
                                                update_data['last_operation_start'] = timestamp
                                                print(f"✅ IO SERVICE COUNTED: {asset_id} → ct_forward_count = {update_data['ct_forward_count']}")
                                            
                                            elif 'ct_right' in asset_id_lower or ('ct' in asset_id_lower and 'right' in asset_id_lower):
                                                update_data['ct_backward_count'] = existing_asset.ct_backward_count + 1
                                                update_data['last_operation_start'] = timestamp
                                                print(f"✅ IO SERVICE COUNTED: {asset_id} → ct_backward_count = {update_data['ct_backward_count']}")
                                            
                                            elif 'lt_forward' in asset_id_lower or ('lt' in asset_id_lower and 'forward' in asset_id_lower):
                                                update_data['lt_forward_count'] = existing_asset.lt_forward_count + 1
                                                update_data['last_operation_start'] = timestamp
                                                print(f"✅ IO SERVICE COUNTED: {asset_id} → lt_forward_count = {update_data['lt_forward_count']}")
                                            
                                            elif 'lt_reverse' in asset_id_lower or ('lt' in asset_id_lower and 'reverse' in asset_id_lower):
                                                update_data['lt_backward_count'] = existing_asset.lt_backward_count + 1
                                                update_data['last_operation_start'] = timestamp
                                                print(f"✅ IO SERVICE COUNTED: {asset_id} → lt_backward_count = {update_data['lt_backward_count']}")
                                            
                                            elif 'start' in asset_id_lower:
                                                update_data['start_count'] = existing_asset.start_count + 1
                                                print(f"ℹ️ IO SERVICE COUNTED: {asset_id} → start_count = {update_data['start_count']}")
                                            
                                            else:
                                                print(f"❌ IO SERVICE UNKNOWN OPERATION: {asset_id} - NOT COUNTED!")
                                        
                                        # Operation ended: 1 → 0 transition  
                                        elif old_value == 1 and new_value == 0:
                                            print(f"🔚 IO SERVICE OPERATION ENDED: {asset_id} changed from {old_value}→{new_value}")
                                            update_data['last_operation_end'] = timestamp
                                            
                                            # Calculate duration and add to total if we have start time
                                            if existing_asset.last_operation_start and timestamp:
                                                duration = (timestamp - existing_asset.last_operation_start).total_seconds()
                                                if duration > 0:
                                                    update_data['total_operation_duration'] = existing_asset.total_operation_duration + duration
                                                    print(f"⏱️ IO SERVICE: Added {duration:.2f}s to total_operation_duration: {update_data['total_operation_duration']:.2f}")
                                
                                # Create or update asset
                                asset, asset_created = Asset.objects.update_or_create(
                                    service=service,
                                    asset_id=asset_id,
                                    defaults=update_data
                                )
                                
                                # Update total operation count for MOVEMENT operations only - ONLY FOR IO SERVICES
                                if not asset_created and is_io_service:
                                    total_movement_ops = (
                                        asset.hoist_up_count + 
                                        asset.hoist_down_count +
                                        asset.ct_forward_count + 
                                        asset.ct_backward_count +
                                        asset.lt_forward_count + 
                                        asset.lt_backward_count
                                    )
                                    
                                    if asset.total_operation_count != total_movement_ops:
                                        # We need to save again with updated total
                                        asset.total_operation_count = total_movement_ops
                                        asset.save(update_fields=['total_operation_count'])
                                        print(f"🔢 IO SERVICE TOTAL OPERATIONS: {asset.total_operation_count}")
                                
                                total_assets_processed += 1
                
                print(f"💾 COMPLETED: Saved {total_services_processed} services with {total_assets_processed} assets")
                
        except Exception as e:
            print(f"❌ Database save error: {e}")
            import traceback
            traceback.print_exc()
    
    # Start the database save in a separate thread
    thread = threading.Thread(target=save_data)
    thread.daemon = True
    thread.start()

@require_http_methods(["GET"])
def get_database_services(request):
    """Get LATEST services data from database - ONLY IO SERVICES HAVE OPERATION COUNTERS"""
    try:
        from django.db.models import Max
        
        # Get default crane
        crane = Crane.objects.filter(name="Crane").first()
        if not crane:
            return JsonResponse({
                "success": False,
                "error": "No crane found",
                "timestamp": datetime.now().isoformat() + 'Z'
            }, status=404)
        
        services = Service.objects.filter(crane=crane)
        service_data = []
        
        for service in services:
            # Get the latest timestamp for each asset in this service
            latest_timestamps = Asset.objects.filter(
                service=service
            ).values('asset_id').annotate(
                latest_timestamp=Max('timestamp')
            )
            
            # Get assets with their latest values
            latest_assets = []
            
            # Initialize operation counters ONLY for IO services
            service_operation_counters = None
            if service.is_io_service():
                service_operation_counters = {
                    'start_count': 0,
                    'hoist_up_count': 0,
                    'hoist_down_count': 0,
                    'ct_forward_count': 0,
                    'ct_backward_count': 0,
                    'lt_forward_count': 0,
                    'lt_backward_count': 0,
                    'total_operation_count': 0,
                    'total_operation_duration': 0.0,
                    'last_operation_start': None,
                    'last_operation_end': None
                }
            
            for item in latest_timestamps:
                latest_asset = Asset.objects.filter(
                    service=service,
                    asset_id=item['asset_id'],
                    timestamp=item['latest_timestamp']
                ).first()
                
                if latest_asset:
                    # Add regular asset data
                    latest_assets.append({
                        'id': latest_asset.asset_id,
                        'value': latest_asset.value,
                        'timestamp': latest_asset.timestamp.isoformat() + 'Z',
                        'value_type': latest_asset.value_type,
                        'unit': latest_asset.unit
                    })
                    
                    # ACCUMULATE operation counters ONLY for IO services
                    if service.is_io_service() and service_operation_counters is not None:
                        service_operation_counters['start_count'] += latest_asset.start_count
                        service_operation_counters['hoist_up_count'] += latest_asset.hoist_up_count
                        service_operation_counters['hoist_down_count'] += latest_asset.hoist_down_count
                        service_operation_counters['ct_forward_count'] += latest_asset.ct_forward_count
                        service_operation_counters['ct_backward_count'] += latest_asset.ct_backward_count
                        service_operation_counters['lt_forward_count'] += latest_asset.lt_forward_count
                        service_operation_counters['lt_backward_count'] += latest_asset.lt_backward_count
                        service_operation_counters['total_operation_count'] += latest_asset.total_operation_count
                        service_operation_counters['total_operation_duration'] += latest_asset.total_operation_duration
                        
                        # Keep the most recent operation timestamps
                        if latest_asset.last_operation_start:
                            if (service_operation_counters['last_operation_start'] is None or 
                                latest_asset.last_operation_start > service_operation_counters['last_operation_start']):
                                service_operation_counters['last_operation_start'] = latest_asset.last_operation_start
                        
                        if latest_asset.last_operation_end:
                            if (service_operation_counters['last_operation_end'] is None or 
                                latest_asset.last_operation_end > service_operation_counters['last_operation_end']):
                                service_operation_counters['last_operation_end'] = latest_asset.last_operation_end
            
            # Format timestamps for JSON (only for IO services)
            if service_operation_counters:
                if service_operation_counters['last_operation_start']:
                    service_operation_counters['last_operation_start'] = service_operation_counters['last_operation_start'].isoformat() + 'Z'
                if service_operation_counters['last_operation_end']:
                    service_operation_counters['last_operation_end'] = service_operation_counters['last_operation_end'].isoformat() + 'Z'
            
            service_data.append({
                'name': service.name,
                'service_type': service.service_type,
                'is_io_service': service.is_io_service(),
                'assets': latest_assets,
                'total_assets': len(latest_assets),
                'operation_counters': service_operation_counters  # Will be None for non-IO services
            })
        
        print(f"📊 Database: Returning {len(service_data)} services with {sum(len(s['assets']) for s in service_data)} latest assets")
        
        return JsonResponse({
            "success": True,
            "data": service_data,
            "crane": {
                "name": crane.name,
                "description": crane.description,
                "service_count": len(service_data),
                "total_assets": sum(len(s['assets']) for s in service_data)
            },
            "timestamp": datetime.now().isoformat() + 'Z'
        })
        
    except Exception as e:
        print(f"❌ Database fetch error: {e}")
        import traceback
        traceback.print_exc()
        return JsonResponse({
            "success": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat() + 'Z'
        }, status=500)

@require_http_methods(["GET"])
def debug_operation_counters(request):
    """Debug endpoint to see all operation counters in database - ONLY IO SERVICES"""
    from django.db.models import Sum
    
    # Get only IO services
    io_services = Service.objects.filter(service_type='io')
    
    # Get all assets with any operation counts from IO services only
    assets_with_operations = Asset.objects.filter(
        service__in=io_services
    ).filter(
        models.Q(start_count__gt=0) |
        models.Q(hoist_up_count__gt=0) |
        models.Q(hoist_down_count__gt=0) |
        models.Q(ct_forward_count__gt=0) |
        models.Q(ct_backward_count__gt=0) |
        models.Q(lt_forward_count__gt=0) |
        models.Q(lt_backward_count__gt=0)
    ).values(
        'service__name', 'asset_id'
    ).annotate(
        total_start=Sum('start_count'),
        total_hoist_up=Sum('hoist_up_count'),
        total_hoist_down=Sum('hoist_down_count'),
        total_ct_forward=Sum('ct_forward_count'),
        total_ct_backward=Sum('ct_backward_count'),
        total_lt_forward=Sum('lt_forward_count'),
        total_lt_backward=Sum('lt_backward_count'),
        total_operations=Sum('total_operation_count')
    )
    
    debug_data = list(assets_with_operations)
    
    # Also get service-wise totals for IO services only
    service_totals = Asset.objects.filter(service__in=io_services).values('service__name').annotate(
        total_start=Sum('start_count'),
        total_hoist_up=Sum('hoist_up_count'),
        total_hoist_down=Sum('hoist_down_count'),
        total_ct_forward=Sum('ct_forward_count'),
        total_ct_backward=Sum('ct_backward_count'),
        total_lt_forward=Sum('lt_forward_count'),
        total_lt_backward=Sum('lt_backward_count'),
        total_operations=Sum('total_operation_count')
    )
    
    return JsonResponse({
        "success": True,
        "asset_breakdown": debug_data,
        "service_totals": list(service_totals),
        "io_services_count": io_services.count(),
        "total_assets_with_operations": len(debug_data),
        "timestamp": datetime.now().isoformat() + 'Z'
    })

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