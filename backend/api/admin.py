from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import Service, Asset, DataHistory, ServiceConfiguration, SystemStatus

class AssetInline(admin.TabularInline):
    """Inline editor for assets within service"""
    model = Asset
    extra = 1
    fields = ['asset_id', 'value', 'value_type', 'unit', 'is_active', 'timestamp']
    readonly_fields = ['timestamp']
    show_change_link = True

class ServiceConfigurationInline(admin.StackedInline):
    """Inline editor for service configuration"""
    model = ServiceConfiguration
    extra = 0
    max_num = 1
    fieldsets = [
        ('Basic Settings', {
            'fields': ['is_enabled', 'polling_interval', 'data_retention_days', 'max_assets']
        }),
        ('Alert Settings', {
            'fields': ['alert_enabled', 'min_value', 'max_value', 'email_alerts', 'email_address'],
            'classes': ['collapse']
        })
    ]

class SystemStatusInline(admin.TabularInline):
    """Inline editor for system status"""
    model = SystemStatus
    extra = 0
    max_num = 5
    readonly_fields = ['created_at']
    fields = ['status', 'message', 'last_data_received', 'assets_online', 'assets_total', 'created_at']
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False

@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ['name', 'service_type', 'asset_count', 'is_active', 'created_at', 'updated_at']
    list_filter = ['service_type', 'is_active', 'created_at', 'updated_at']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at', 'updated_at']
    list_editable = ['is_active']
    inlines = [ServiceConfigurationInline, AssetInline, SystemStatusInline]
    
    fieldsets = [
        ('Service Information', {
            'fields': ['name', 'service_type', 'description', 'is_active']
        }),
        ('Timestamps', {
            'fields': ['created_at', 'updated_at'],
            'classes': ['collapse']
        })
    ]

    def asset_count(self, obj):
        count = obj.assets.count()
        url = reverse('admin:iot_data_asset_changelist') + f'?service__id__exact={obj.id}'
        return format_html('<a href="{}">{}</a>', url, count)
    asset_count.short_description = 'Assets'

@admin.register(Asset)
class AssetAdmin(admin.ModelAdmin):
    list_display = ['asset_id', 'service', 'get_display_value', 'value_type', 'timestamp', 'is_active']
    list_filter = ['service', 'value_type', 'is_active', 'timestamp']
    search_fields = ['asset_id', 'service__name']
    readonly_fields = ['created_at']
    list_editable = ['is_active']
    date_hierarchy = 'timestamp'
    
    fieldsets = [
        ('Basic Information', {
            'fields': ['service', 'asset_id', 'value', 'value_type', 'unit']
        }),
        ('Digital States (for digital values only)', {
            'fields': ['state_0_name', 'state_1_name'],
            'classes': ['collapse']
        }),
        ('Timing Information', {
            'fields': ['timestamp', 'created_at']
        }),
        ('Status', {
            'fields': ['is_active']
        })
    ]

    def get_display_value(self, obj):
        return obj.get_display_value()
    get_display_value.short_description = 'Value'
    get_display_value.admin_order_field = 'value'

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('service')

class ValueRangeFilter(admin.SimpleListFilter):
    """Custom filter for value ranges"""
    title = 'value range'
    parameter_name = 'value_range'

    def lookups(self, request, model_admin):
        return [
            ('low', 'Low Values (< 10)'),
            ('medium', 'Medium Values (10-100)'),
            ('high', 'High Values (> 100)'),
            ('digital_0', 'Digital Off (0)'),
            ('digital_1', 'Digital On (1)'),
        ]

    def queryset(self, request, queryset):
        if self.value() == 'low':
            return queryset.filter(value__lt=10)
        if self.value() == 'medium':
            return queryset.filter(value__range=(10, 100))
        if self.value() == 'high':
            return queryset.filter(value__gt=100)
        if self.value() == 'digital_0':
            return queryset.filter(value=0, value_type='digital')
        if self.value() == 'digital_1':
            return queryset.filter(value=1, value_type='digital')

@admin.register(DataHistory)
class DataHistoryAdmin(admin.ModelAdmin):
    list_display = ['asset', 'service_name', 'value', 'timestamp', 'recorded_at']
    list_filter = ['service', 'timestamp', ValueRangeFilter]
    search_fields = ['asset__asset_id', 'service__name']
    readonly_fields = ['recorded_at']
    date_hierarchy = 'timestamp'
    
    fieldsets = [
        ('Data Information', {
            'fields': ['service', 'asset', 'value', 'timestamp', 'recorded_at']
        })
    ]

    def service_name(self, obj):
        return obj.service.name
    service_name.short_description = 'Service'
    service_name.admin_order_field = 'service__name'

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('service', 'asset')

@admin.register(ServiceConfiguration)
class ServiceConfigurationAdmin(admin.ModelAdmin):
    list_display = ['service', 'is_enabled', 'polling_interval', 'alert_enabled', 'updated_at']
    list_filter = ['is_enabled', 'alert_enabled', 'updated_at']
    search_fields = ['service__name']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = [
        ('Service Configuration', {
            'fields': ['service', 'is_enabled', 'polling_interval', 'data_retention_days', 'max_assets']
        }),
        ('Alert Configuration', {
            'fields': ['alert_enabled', 'min_value', 'max_value']
        }),
        ('Notification Settings', {
            'fields': ['email_alerts', 'email_address']
        }),
        ('Timestamps', {
            'fields': ['created_at', 'updated_at'],
            'classes': ['collapse']
        })
    ]

@admin.register(SystemStatus)
class SystemStatusAdmin(admin.ModelAdmin):
    list_display = ['service', 'status', 'uptime_percentage', 'last_data_received', 'created_at']
    list_filter = ['status', 'service', 'created_at']
    search_fields = ['service__name', 'message']
    readonly_fields = ['created_at']
    date_hierarchy = 'created_at'
    
    fieldsets = [
        ('Status Information', {
            'fields': ['service', 'status', 'message']
        }),
        ('Metrics', {
            'fields': ['last_data_received', 'assets_online', 'assets_total']
        }),
        ('Timestamps', {
            'fields': ['created_at']
        })
    ]

    def uptime_percentage(self, obj):
        percentage = obj.uptime_percentage()
        color = 'green' if percentage > 90 else 'orange' if percentage > 70 else 'red'
        return format_html(
            '<span style="color: {}; font-weight: bold;">{:.1f}%</span>',
            color,
            percentage
        )
    uptime_percentage.short_description = 'Uptime'

# Custom admin site configuration
admin.site.site_header = 'IoT Data Management System'
admin.site.site_title = 'IoT Data Admin'
admin.site.index_title = 'IoT Data Administration'

# Add custom CSS for better admin interface
class CustomAdminSite(admin.AdminSite):
    class Media:
        css = {
            'all': ('css/admin_custom.css',)
        }

# Optional: Custom admin actions
def enable_services(modeladmin, request, queryset):
    queryset.update(is_active=True)
enable_services.short_description = "Enable selected services"

def disable_services(modeladmin, request, queryset):
    queryset.update(is_active=False)
disable_services.short_description = "Disable selected services"

ServiceAdmin.actions = [enable_services, disable_services]