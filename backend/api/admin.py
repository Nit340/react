from django.contrib import admin
from .models import Service, Asset, IncomingIoTData

@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ['name', 'created_at', 'updated_at']
    search_fields = ['name']
    readonly_fields = ['created_at', 'updated_at']
    list_per_page = 20

@admin.register(Asset)
class AssetAdmin(admin.ModelAdmin):
    list_display = ['service', 'asset_id', 'value', 'timestamp', 'created_at']
    list_filter = ['service', 'timestamp']
    search_fields = ['asset_id', 'service__name']
    readonly_fields = ['created_at']
    list_per_page = 50

@admin.register(IncomingIoTData)
class IncomingIoTDataAdmin(admin.ModelAdmin):
    list_display = ['id', 'received_at', 'total_services', 'total_assets', 'processed']
    list_filter = ['processed', 'received_at']
    readonly_fields = ['received_at']
    date_hierarchy = 'received_at'
    list_per_page = 25