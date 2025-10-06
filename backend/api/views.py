from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
from datetime import datetime

crane_config = {
    "deviceId": "crane-001",
    "name": "Main Crane",
    "protocol": "modbus",
    "status": "connected",
    "endpoint": "192.168.1.100",
    "port": 502,
    "pollingInterval": 30,
    "timeout": 10,
    "retryCount": 3,
    "modbusConfig": {
        "unitId": 1,
        "functionCode": 3,
        "startingAddress": 0,
        "quantity": 10,
        "byteOrder": "big_endian",
        "dataType": "uint16"
    },
    "createdAt": datetime.now().isoformat() + 'Z',
    "updatedAt": datetime.now().isoformat() + 'Z'
}

@csrf_exempt
@require_http_methods(["GET", "POST"])
def crane_config_view(request):
    try:
        if request.method == 'GET':
            print("GET request for crane config")
            return JsonResponse(crane_config)
        
        elif request.method == 'POST':
            data = json.loads(request.body)
            print("POST request with data:", json.dumps(data, indent=2))
            
            # Update the configuration
            crane_config.update(data)
            crane_config['updatedAt'] = datetime.now().isoformat() + 'Z'
            
            return JsonResponse(crane_config)
            
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
    
