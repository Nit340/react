from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.db.models import Count, Avg, Max
from .models import Crane, Service, Asset, DataHistory, ServiceConfiguration, SystemStatus


class AssetInline(admin.TabularInline):
    """Inline editor for assets within service"""
    model = Asset
    extra = 1
    fields = ['asset_id', 'value', 'get_display_value', 'value_type', 'unit', 'is_active', 'timestamp']
    readonly_fields = ['timestamp', 'get_display_value']
    show_change_link = True
    classes = ['collapse']

    def get_display_value(self, obj):
        return obj.get_display_value()
    get_display_value.short_description = 'Display Value'


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
    max_num = 3
    readonly_fields = ['created_at', 'uptime_percentage_display']
    fields = ['status', 'uptime_percentage_display', 'assets_online', 'assets_total', 'last_data_received', 'created_at']
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False

    def uptime_percentage_display(self, obj):
        percentage = obj.uptime_percentage()
        color = 'green' if percentage > 90 else 'orange' if percentage > 70 else 'red'
        return format_html(
            '<span style="color: {}; font-weight: bold;">{:.1f}%</span>',
            color,
            percentage
        )
    uptime_percentage_display.short_description = 'Uptime'


class ServiceInline(admin.TabularInline):
    """Inline editor for services within crane"""
    model = Service
    extra = 1
    fields = ['name', 'service_type', 'asset_count_display', 'is_active']
    readonly_fields = ['asset_count_display']
    show_change_link = True

    def asset_count_display(self, obj):
        return obj.assets.count()
    asset_count_display.short_description = 'Assets'


@admin.register(Crane)
class CraneAdmin(admin.ModelAdmin):
    list_display = ['name', 'service_count_display', 'asset_count_display', 'is_active', 'created_at', 'status_indicator']
    list_filter = ['is_active', 'created_at', 'services__service_type']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at', 'updated_at', 'service_count_display', 'asset_count_display']
    list_editable = ['is_active']
    inlines = [ServiceInline]
    list_per_page = 25
    
    fieldsets = [
        ('Crane Information', {
            'fields': ['name', 'description', 'is_active']
        }),
        ('Statistics', {
            'fields': ['service_count_display', 'asset_count_display'],
            'classes': ['collapse']
        }),
        ('Timestamps', {
            'fields': ['created_at', 'updated_at'],
            'classes': ['collapse']
        })
    ]

    def service_count_display(self, obj):
        count = obj.services.count()
        url = reverse('admin:iot_data_service_changelist') + f'?crane__id__exact={obj.id}'
        return format_html('<a href="{}" class="badge">{}</a>', url, count)
    service_count_display.short_description = 'Services'

    def asset_count_display(self, obj):
        count = Asset.objects.filter(service__crane=obj).count()
        url = reverse('admin:iot_data_asset_changelist') + f'?service__crane__id__exact={obj.id}'
        return format_html('<a href="{}" class="badge">{}</a>', url, count)
    asset_count_display.short_description = 'Assets'

    def status_indicator(self, obj):
        """Visual indicator for crane status"""
        active_services = obj.services.filter(is_active=True).count()
        total_services = obj.services.count()
        
        if total_services == 0:
            return format_html('<span style="color: gray;">●</span> No Services')
        elif active_services == total_services:
            return format_html('<span style="color: green;">●</span> All Active')
        elif active_services == 0:
            return format_html('<span style="color: red;">●</span> All Inactive')
        else:
            return format_html('<span style="color: orange;">●</span> {}/{} Active', active_services, total_services)
    status_indicator.short_description = 'Status'

    def get_queryset(self, request):
        return super().get_queryset(request).prefetch_related('services')


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ['name', 'crane', 'service_type', 'asset_count_display', 'latest_data', 'is_active', 'status_badge']
    list_filter = ['crane', 'service_type', 'is_active', 'created_at']
    search_fields = ['name', 'description', 'crane__name']
    readonly_fields = ['created_at', 'updated_at', 'asset_count_display', 'latest_data']
    list_editable = ['is_active']
    inlines = [ServiceConfigurationInline, AssetInline, SystemStatusInline]
    list_per_page = 25
    
    fieldsets = [
        ('Service Information', {
            'fields': ['crane', 'name', 'service_type', 'description', 'is_active']
        }),
        ('Statistics', {
            'fields': ['asset_count_display', 'latest_data'],
            'classes': ['collapse']
        }),
        ('Timestamps', {
            'fields': ['created_at', 'updated_at'],
            'classes': ['collapse']
        })
    ]

    def asset_count_display(self, obj):
        count = obj.assets.count()
        url = reverse('admin:iot_data_asset_changelist') + f'?service__id__exact={obj.id}'
        return format_html('<a href="{}" class="badge">{}</a>', url, count)
    asset_count_display.short_description = 'Assets'

    def latest_data(self, obj):
        latest = obj.latest_timestamp()
        if latest:
            from django.utils import timezone
            now = timezone.now()
            diff = now - latest
            if diff.total_seconds() < 300:  # 5 minutes
                color = 'green'
            elif diff.total_seconds() < 3600:  # 1 hour
                color = 'orange'
            else:
                color = 'red'
            return format_html(
                '<span style="color: {}">{}</span>',
                color,
                latest.strftime('%Y-%m-%d %H:%M')
            )
        return format_html('<span style="color: gray">No data</span>')
    latest_data.short_description = 'Latest Data'

    def status_badge(self, obj):
        """Status badge based on configuration and activity"""
        if not obj.is_active:
            return format_html('<span class="badge badge-secondary">Disabled</span>')
        
        try:
            config = obj.configuration
            if not config.is_enabled:
                return format_html('<span class="badge badge-warning">Config Disabled</span>')
        except ServiceConfiguration.DoesNotExist:
            return format_html('<span class="badge badge-info">No Config</span>')
        
        return format_html('<span class="badge badge-success">Active</span>')
    status_badge.short_description = 'Config Status'

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('crane').prefetch_related('assets')


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
            ('no_data', 'No Recent Data (> 1 hour)'),
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
        if self.value() == 'no_data':
            from django.utils import timezone
            from datetime import timedelta
            one_hour_ago = timezone.now() - timedelta(hours=1)
            return queryset.filter(timestamp__lt=one_hour_ago)


class OperationCountFilter(admin.SimpleListFilter):
    """Custom filter for operation counts"""
    title = 'operation activity'
    parameter_name = 'operation_activity'

    def lookups(self, request, model_admin):
        return [
            ('has_operations', 'Has Operations'),
            ('no_operations', 'No Operations'),
            ('frequent_operations', 'Frequent Operations (100+ total)'),
        ]

    def queryset(self, request, queryset):
        if self.value() == 'has_operations':
            return queryset.filter(total_operation_count__gt=0)
        if self.value() == 'no_operations':
            return queryset.filter(total_operation_count=0)
        if self.value() == 'frequent_operations':
            return queryset.filter(total_operation_count__gte=100)


@admin.register(Asset)
class AssetAdmin(admin.ModelAdmin):
    list_display = ['asset_id', 'service_with_crane', 'get_display_value_colored', 'value_type_badge', 
                   'operation_summary', 'timestamp_recent', 'is_active']
    list_filter = ['service__crane', 'service', 'value_type', 'is_active', 'timestamp', 
                  ValueRangeFilter, OperationCountFilter]
    search_fields = ['asset_id', 'service__name', 'service__crane__name']
    readonly_fields = ['created_at', 'get_display_value', 'get_operation_summary_display']
    list_editable = ['is_active']
    date_hierarchy = 'timestamp'
    list_per_page = 50
    list_select_related = ['service', 'service__crane']
    
    fieldsets = [
        ('Basic Information', {
            'fields': ['service', 'asset_id', 'value', 'get_display_value', 'value_type', 'unit', 'is_active']
        }),
        ('Operation Counters', {
            'fields': ['get_operation_summary_display'],
            'classes': ['collapse']
        }),
        ('Detailed Operation Counters', {
            'fields': [
                'start_count', 'hoist_up_count', 'hoist_down_count',
                'ct_forward_count', 'ct_backward_count', 
                'lt_forward_count', 'lt_backward_count',
                'total_operation_count', 'total_operation_duration'
            ],
            'classes': ['collapse']
        }),
        ('Operation Timing', {
            'fields': ['last_operation_start', 'last_operation_end'],
            'classes': ['collapse']
        }),
        ('Digital States (for digital values only)', {
            'fields': ['state_0_name', 'state_1_name'],
            'classes': ['collapse']
        }),
        ('Timing Information', {
            'fields': ['timestamp', 'created_at']
        })
    ]

    def service_with_crane(self, obj):
        return format_html('{}<br><small style="color: gray">{}</small>', 
                         obj.service.name, obj.service.crane.name)
    service_with_crane.short_description = 'Service'
    service_with_crane.admin_order_field = 'service__name'

    def get_display_value_colored(self, obj):
        display_value = obj.get_display_value()
        
        # Color coding based on value type and value
        if obj.value_type == 'digital':
            color = 'green' if obj.value == 1 else 'red'
        elif obj.value_type in ['voltage', 'current', 'power']:
            if obj.value > 100:
                color = 'red'
            elif obj.value > 50:
                color = 'orange'
            else:
                color = 'green'
        else:
            color = 'blue'
            
        return format_html('<span style="color: {}; font-weight: bold;">{}</span>', color, display_value)
    get_display_value_colored.short_description = 'Value'
    get_display_value_colored.admin_order_field = 'value'

    def value_type_badge(self, obj):
        colors = {
            'digital': 'blue',
            'analog': 'green', 
            'voltage': 'orange',
            'current': 'red',
            'power': 'purple',
            'frequency': 'teal',
            'load': 'brown'
        }
        color = colors.get(obj.value_type, 'gray')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 0.8em;">{}</span>',
            color, obj.get_value_type_display()
        )
    value_type_badge.short_description = 'Type'

    def operation_summary(self, obj):
        """Display operation summary in list view"""
        if obj.total_operation_count > 0:
            # Show total operations and duration
            hours = obj.total_operation_duration / 3600
            return format_html(
                '<div style="font-size: 0.8em;">'
                '<strong>{} ops</strong><br>'
                '<span style="color: gray">{:.1f}h</span>'
                '</div>',
                obj.total_operation_count,
                hours
            )
        return format_html('<span style="color: gray">No ops</span>')
    operation_summary.short_description = 'Operations'

    def get_operation_summary_display(self, obj):
        """Display detailed operation summary in edit view"""
        summary = obj.get_operation_summary()
        return format_html(
            '<div style="background: #f8f9fa; padding: 10px; border-radius: 5px;">'
            '<h4>Operation Summary</h4>'
            '<table style="width: 100%; border-collapse: collapse;">'
            '<tr><td style="padding: 4px; border-bottom: 1px solid #dee2e6;"><strong>Start:</strong></td><td style="padding: 4px; border-bottom: 1px solid #dee2e6;">{start_count}</td></tr>'
            '<tr><td style="padding: 4px; border-bottom: 1px solid #dee2e6;"><strong>Hoist Up:</strong></td><td style="padding: 4px; border-bottom: 1px solid #dee2e6;">{hoist_up_count}</td></tr>'
            '<tr><td style="padding: 4px; border-bottom: 1px solid #dee2e6;"><strong>Hoist Down:</strong></td><td style="padding: 4px; border-bottom: 1px solid #dee2e6;">{hoist_down_count}</td></tr>'
            '<tr><td style="padding: 4px; border-bottom: 1px solid #dee2e6;"><strong>CT Forward:</strong></td><td style="padding: 4px; border-bottom: 1px solid #dee2e6;">{ct_forward_count}</td></tr>'
            '<tr><td style="padding: 4px; border-bottom: 1px solid #dee2e6;"><strong>CT Backward:</strong></td><td style="padding: 4px; border-bottom: 1px solid #dee2e6;">{ct_backward_count}</td></tr>'
            '<tr><td style="padding: 4px; border-bottom: 1px solid #dee2e6;"><strong>LT Forward:</strong></td><td style="padding: 4px; border-bottom: 1px solid #dee2e6;">{lt_forward_count}</td></tr>'
            '<tr><td style="padding: 4px; border-bottom: 1px solid #dee2e6;"><strong>LT Backward:</strong></td><td style="padding: 4px; border-bottom: 1px solid #dee2e6;">{lt_backward_count}</td></tr>'
            '<tr style="background: #e9ecef;">'
            '<td style="padding: 4px;"><strong>Total Operations:</strong></td><td style="padding: 4px;"><strong>{total_operation_count}</strong></td></tr>'
            '<tr style="background: #e9ecef;">'
            '<td style="padding: 4px;"><strong>Total Duration:</strong></td><td style="padding: 4px;"><strong>{total_operation_duration:.1f} sec</strong></td></tr>'
            '</table>'
            '</div>',
            **summary
        )
    get_operation_summary_display.short_description = 'Operation Summary'

    def timestamp_recent(self, obj):
        from django.utils import timezone
        from datetime import timedelta
        
        now = timezone.now()
        diff = now - obj.timestamp
        
        if diff < timedelta(minutes=5):
            color = 'green'
            text = 'Just now'
        elif diff < timedelta(hours=1):
            color = 'orange'
            text = f'{int(diff.total_seconds() / 60)}m ago'
        else:
            color = 'red'
            text = obj.timestamp.strftime('%m/%d %H:%M')
            
        return format_html('<span style="color: {}">{}</span>', color, text)
    timestamp_recent.short_description = 'Last Update'

    def get_display_value(self, obj):
        return obj.get_display_value()
    get_display_value.short_description = 'Formatted Value'

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('service__crane')


@admin.register(DataHistory)
class DataHistoryAdmin(admin.ModelAdmin):
    list_display = ['asset_name', 'service_name', 'value_display', 'timestamp_formatted', 'recorded_at']
    list_filter = ['service', 'timestamp', ValueRangeFilter]
    search_fields = ['asset__asset_id', 'service__name', 'service__crane__name']
    readonly_fields = ['recorded_at']
    date_hierarchy = 'timestamp'
    list_per_page = 50
    
    fieldsets = [
        ('Data Information', {
            'fields': ['service', 'asset', 'value', 'timestamp', 'recorded_at']
        })
    ]

    def asset_name(self, obj):
        return obj.asset.asset_id
    asset_name.short_description = 'Asset'
    asset_name.admin_order_field = 'asset__asset_id'

    def service_name(self, obj):
        return format_html('{}<br><small style="color: gray">{}</small>', 
                         obj.service.name, obj.service.crane.name)
    service_name.short_description = 'Service'
    service_name.admin_order_field = 'service__name'

    def value_display(self, obj):
        # Try to use asset's display method if available
        try:
            return obj.asset.get_display_value()
        except:
            return f"{obj.value}"
    value_display.short_description = 'Value'

    def timestamp_formatted(self, obj):
        return obj.timestamp.strftime('%Y-%m-%d %H:%M:%S')
    timestamp_formatted.short_description = 'Timestamp'
    timestamp_formatted.admin_order_field = 'timestamp'

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('service__crane', 'asset')


@admin.register(ServiceConfiguration)
class ServiceConfigurationAdmin(admin.ModelAdmin):
    list_display = ['service_with_crane', 'is_enabled_badge', 'polling_interval', 'alert_enabled_badge', 'updated_at_recent']
    list_filter = ['is_enabled', 'alert_enabled', 'updated_at']
    search_fields = ['service__name', 'service__crane__name']
    readonly_fields = ['created_at', 'updated_at']
    list_per_page = 25
    
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

    def service_with_crane(self, obj):
        return format_html('{}<br><small style="color: gray">{}</small>', 
                         obj.service.name, obj.service.crane.name)
    service_with_crane.short_description = 'Service'
    service_with_crane.admin_order_field = 'service__name'

    def is_enabled_badge(self, obj):
        if obj.is_enabled:
            return format_html('<span class="badge badge-success">Enabled</span>')
        return format_html('<span class="badge badge-secondary">Disabled</span>')
    is_enabled_badge.short_description = 'Enabled'

    def alert_enabled_badge(self, obj):
        if obj.alert_enabled:
            return format_html('<span class="badge badge-warning">Alerts On</span>')
        return format_html('<span class="badge badge-secondary">Alerts Off</span>')
    alert_enabled_badge.short_description = 'Alerts'

    def updated_at_recent(self, obj):
        from django.utils import timezone
        from datetime import timedelta
        
        now = timezone.now()
        diff = now - obj.updated_at
        
        if diff < timedelta(hours=1):
            return format_html('<span style="color: green">Recently</span>')
        elif diff < timedelta(days=1):
            return format_html('<span style="color: orange">Today</span>')
        else:
            return obj.updated_at.strftime('%m/%d')
    updated_at_recent.short_description = 'Last Updated'

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('service__crane')


@admin.register(SystemStatus)
class SystemStatusAdmin(admin.ModelAdmin):
    list_display = ['service_with_crane', 'status_badge', 'uptime_percentage_display', 'assets_online_display', 'last_data_recent', 'created_at']
    list_filter = ['status', 'service', 'created_at']
    search_fields = ['service__name', 'service__crane__name', 'message']
    readonly_fields = ['created_at', 'uptime_percentage_display']
    date_hierarchy = 'created_at'
    list_per_page = 25
    
    fieldsets = [
        ('Status Information', {
            'fields': ['service', 'status', 'message']
        }),
        ('Metrics', {
            'fields': ['last_data_received', 'assets_online', 'assets_total', 'uptime_percentage_display']
        }),
        ('Timestamps', {
            'fields': ['created_at']
        })
    ]

    def service_with_crane(self, obj):
        return format_html('{}<br><small style="color: gray">{}</small>', 
                         obj.service.name, obj.service.crane.name)
    service_with_crane.short_description = 'Service'
    service_with_crane.admin_order_field = 'service__name'

    def status_badge(self, obj):
        status_colors = {
            'online': 'success',
            'offline': 'danger',
            'degraded': 'warning',
            'maintenance': 'info'
        }
        color = status_colors.get(obj.status, 'secondary')
        return format_html('<span class="badge badge-{}">{}</span>', color, obj.get_status_display())
    status_badge.short_description = 'Status'

    def uptime_percentage_display(self, obj):
        percentage = obj.uptime_percentage()
        color = 'green' if percentage > 90 else 'orange' if percentage > 70 else 'red'
        return format_html(
            '<span style="color: {}; font-weight: bold;">{:.1f}%</span>',
            color,
            percentage
        )
    uptime_percentage_display.short_description = 'Uptime'

    def assets_online_display(self, obj):
        return format_html('{} / {}', obj.assets_online, obj.assets_total)
    assets_online_display.short_description = 'Online Assets'

    def last_data_recent(self, obj):
        if obj.last_data_received:
            from django.utils import timezone
            from datetime import timedelta
            
            now = timezone.now()
            diff = now - obj.last_data_received
            
            if diff < timedelta(minutes=5):
                return format_html('<span style="color: green">Recent</span>')
            elif diff < timedelta(hours=1):
                return format_html('<span style="color: orange">{:.0f}m ago</span>', diff.total_seconds() / 60)
            else:
                return format_html('<span style="color: red">{:.1f}h ago</span>', diff.total_seconds() / 3600)
        return format_html('<span style="color: gray">Never</span>')
    last_data_recent.short_description = 'Last Data'

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('service__crane')


# Custom admin site configuration
admin.site.site_header = '🏗️ IoT Crane Data Management System'
admin.site.site_title = 'IoT Crane Admin'
admin.site.index_title = 'Crane Data Administration'

# Add custom CSS for better styling
class CustomAdminSite(admin.AdminSite):
    class Media:
        css = {
            'all': ('admin/css/custom.css',)
        }

# Admin actions
def enable_services(modeladmin, request, queryset):
    updated = queryset.update(is_active=True)
    modeladmin.message_user(request, f'{updated} services enabled successfully.')
enable_services.short_description = "✅ Enable selected services"

def disable_services(modeladmin, request, queryset):
    updated = queryset.update(is_active=False)
    modeladmin.message_user(request, f'{updated} services disabled successfully.')
disable_services.short_description = "❌ Disable selected services"

def enable_alerts(modeladmin, request, queryset):
    updated = queryset.update(alert_enabled=True)
    modeladmin.message_user(request, f'Alerts enabled for {updated} configurations.')
enable_alerts.short_description = "🔔 Enable alerts for selected"

def disable_alerts(modeladmin, request, queryset):
    updated = queryset.update(alert_enabled=False)
    modeladmin.message_user(request, f'Alerts disabled for {updated} configurations.')
disable_alerts.short_description = "🔕 Disable alerts for selected"

def reset_operation_counters(modeladmin, request, queryset):
    """Admin action to reset operation counters"""
    updated = queryset.update(
        start_count=0,
        hoist_up_count=0,
        hoist_down_count=0,
        ct_forward_count=0,
        ct_backward_count=0,
        lt_forward_count=0,
        lt_backward_count=0,
        total_operation_count=0,
        total_operation_duration=0,
        last_operation_start=None,
        last_operation_end=None
    )
    modeladmin.message_user(request, f'Operation counters reset for {updated} assets.')
reset_operation_counters.short_description = "🔄 Reset operation counters"

ServiceAdmin.actions = [enable_services, disable_services]
ServiceConfigurationAdmin.actions = [enable_alerts, disable_alerts]
AssetAdmin.actions = [reset_operation_counters]