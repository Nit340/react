from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
from datetime import datetime

# Initialize with empty config that will be populated by POST requests
crane_config = {
    "deviceId": "",
    "name": "",
    "protocol": "",
    "status": "disconnected",
    "endpoint": "",
    "port": 0,
    "pollingInterval": 0,
    "timeout": 0,
    "retryCount": 0,
    "modbusConfig": {
        "unitId": 0,
        "functionCode": 0,
        "startingAddress": 0,
        "quantity": 0,
        "byteOrder": "",
        "dataType": ""
    },
    "createdAt": "",
    "updatedAt": ""
}

@csrf_exempt
@require_http_methods(["GET", "POST"])
def crane_config_view(request):
    try:
        if request.method == 'GET':
            print("GET request for crane config")
            # Return current configuration (may be empty if no POST received yet)
            return JsonResponse(crane_config)
        
        elif request.method == 'POST':
            # Parse incoming JSON data from another server
            data = json.loads(request.body)
            print("POST request received with data:", json.dumps(data, indent=2))
            
            # Update the configuration with received data
            crane_config.update(data)
            
            # Add/update timestamps
            current_time = datetime.now().isoformat() + 'Z'
            if not crane_config.get('createdAt'):
                crane_config['createdAt'] = current_time
            crane_config['updatedAt'] = current_time
            
            print("Configuration updated successfully")
            return JsonResponse({
                "message": "Configuration updated successfully",
                "config": crane_config
            })
            
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@require_http_methods(["GET"])
def health_check(request):
    return JsonResponse({
        "status": "healthy",
        "message": "Django server is running",
        "timestamp": datetime.now().isoformat() + 'Z'
    })

@csrf_exempt
@require_http_methods(["POST"])
def update_crane_status(request):
    try:
        data = json.loads(request.body)
        status = data.get('status')
        
        if status not in ['connected', 'disconnected', 'error']:
            return JsonResponse({"error": "Invalid status"}, status=400)
        
        crane_config['status'] = status
        crane_config['updatedAt'] = datetime.now().isoformat() + 'Z'
        
        print(f"Status updated to: {status}")
        return JsonResponse({"status": status, "message": "Status updated successfully"})
        
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)