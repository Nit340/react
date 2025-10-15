from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db.models.signals import post_save, post_migrate
from django.dispatch import receiver
from django.db import connection

class Crane(models.Model):
    """Represents a crane that contains multiple services"""
    name = models.CharField(max_length=100, default="Crane", help_text="Name of the crane")
    description = models.TextField(blank=True, help_text="Description of the crane")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'iot_cranes'
        verbose_name = 'Crane'
        verbose_name_plural = 'Cranes'
        indexes = [
            models.Index(fields=['is_active']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return self.name

    def service_count(self):
        """Return the number of services for this crane"""
        return self.services.count()
    
    def asset_count(self):
        """Return the total number of assets across all services"""
        return Asset.objects.filter(service__crane=self).count()
    
    def get_status(self):
        """Get overall crane status based on services"""
        services = self.services.all()
        if not services:
            return 'no_services'
        
        active_services = services.filter(is_active=True)
        if active_services.count() == services.count():
            return 'all_active'
        elif active_services.count() == 0:
            return 'all_inactive'
        else:
            return 'partial_active'

class Service(models.Model):
    """Represents a service that contains multiple assets"""
    SERVICE_TYPES = [
        ('onboardio', 'Onboard IO'),
        ('modbus', 'Modbus'),
        ('loadcell', 'Load Cell'),
        ('io', 'IO Controls'),
        ('other', 'Other'),
    ]
    
    crane = models.ForeignKey(Crane, on_delete=models.CASCADE, related_name='services')
    name = models.CharField(max_length=100, help_text="Name of the service (e.g., onboardio, modbus, LoadCell)")
    service_type = models.CharField(max_length=20, choices=SERVICE_TYPES, default='other')
    description = models.TextField(blank=True, help_text="Description of the service")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'iot_services'
        ordering = ['name']
        verbose_name = 'Service'
        verbose_name_plural = 'Services'
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['service_type']),
            models.Index(fields=['is_active']),
            models.Index(fields=['crane', 'is_active']),
        ]
        unique_together = ['crane', 'name']

    def __str__(self):
        return f"{self.name} ({self.get_service_type_display()})"

    def asset_count(self):
        """Return the number of assets for this service"""
        return self.assets.count()
    
    def latest_timestamp(self):
        """Get the latest timestamp from assets"""
        latest_asset = self.assets.order_by('-timestamp').first()
        return latest_asset.timestamp if latest_asset else None
    
    def get_data_freshness(self):
        """Check how fresh the data is"""
        latest = self.latest_timestamp()
        if not latest:
            return 'no_data'
        
        now = timezone.now()
        diff = now - latest
        
        if diff.total_seconds() < 300:  # 5 minutes
            return 'fresh'
        elif diff.total_seconds() < 3600:  # 1 hour
            return 'stale'
        else:
            return 'outdated'

class Asset(models.Model):
    """Represents an asset (datapoint) within a service"""
    VALUE_TYPES = [
        ('digital', 'Digital (0/1)'),
        ('analog', 'Analog Value'),
        ('voltage', 'Voltage'),
        ('current', 'Current'),
        ('power', 'Power'),
        ('frequency', 'Frequency'),
        ('load', 'Load'),
        ('other', 'Other'),
    ]

    UNITS = [
        ('', 'None'),
        ('V', 'Volts'),
        ('A', 'Amps'),
        ('kW', 'Kilowatts'),
        ('Hz', 'Hertz'),
        ('kg', 'Kilograms'),
        ('ton', 'Tons'),
    ]

    service = models.ForeignKey(Service, on_delete=models.CASCADE, related_name='assets', db_index=True)
    asset_id = models.CharField(max_length=100, help_text="Variable name (e.g., IN0, Hoist_voltage, Load)")
    value = models.FloatField(help_text="Value of the datapoint")
    timestamp = models.DateTimeField(help_text="Timestamp from the IoT device", db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    value_type = models.CharField(max_length=20, choices=VALUE_TYPES, default='analog')
    unit = models.CharField(max_length=10, choices=UNITS, blank=True)
    is_active = models.BooleanField(default=True, db_index=True)
    
    state_0_name = models.CharField(max_length=50, blank=True, default='Off', help_text="Name for state 0")
    state_1_name = models.CharField(max_length=50, blank=True, default='On', help_text="Name for state 1")

    class Meta:
        db_table = 'iot_assets'
        ordering = ['service', 'asset_id']
        indexes = [
            models.Index(fields=['service', 'asset_id']),
            models.Index(fields=['timestamp']),
            models.Index(fields=['value_type']),
            models.Index(fields=['is_active', 'timestamp']),
            models.Index(fields=['service', 'timestamp']),
        ]
        verbose_name = 'Asset'
        verbose_name_plural = 'Assets'
        unique_together = ['service', 'asset_id']

    def __str__(self):
        return f"{self.service.name}.{self.asset_id}"

    def save(self, *args, **kwargs):
        if not self.value_type or self.value_type == 'analog':
            self.value_type = self.detect_value_type()
        
        if not self.unit:
            self.unit = self.detect_unit()
            
        super().save(*args, **kwargs)

    def detect_value_type(self):
        """Auto-detect value type based on asset ID patterns"""
        asset_id_lower = self.asset_id.lower()
        
        type_mapping = [
            ('voltage', ['voltage', 'volt']),
            ('current', ['current', 'amp', 'ampere']),
            ('power', ['power', 'watt', 'kw']),
            ('frequency', ['frequency', 'freq', 'hz']),
            ('load', ['load', 'weight', 'capacity', 'ton']),
            ('digital', ['in', 'out', 'start', 'stop', 'hoist', 'ct_', 'lt_', 'switch', 'button']),
        ]
        
        for value_type, keywords in type_mapping:
            if any(keyword in asset_id_lower for keyword in keywords):
                return value_type
        
        return 'analog'

    def detect_unit(self):
        """Auto-detect unit based on asset ID patterns"""
        asset_id_lower = self.asset_id.lower()
        
        unit_mapping = [
            ('V', ['voltage', 'volt']),
            ('A', ['current', 'amp', 'ampere']),
            ('kW', ['power', 'watt', 'kw']),
            ('Hz', ['frequency', 'freq', 'hz']),
            ('kg', ['load', 'weight']),
            ('ton', ['ton', 'capacity']),
        ]
        
        for unit, keywords in unit_mapping:
            if any(keyword in asset_id_lower for keyword in keywords):
                return unit
        
        return ''

    def get_display_value(self):
        """Get formatted value for display"""
        if self.value_type == 'digital':
            return self.state_1_name if self.value == 1 else self.state_0_name
        else:
            if self.value_type in ['voltage', 'current']:
                formatted_value = f"{self.value:.1f}"
            elif self.value_type == 'power':
                formatted_value = f"{self.value:.2f}"
            elif self.value_type == 'load':
                formatted_value = f"{self.value:.0f}"
            else:
                formatted_value = f"{self.value:.2f}"
                
            return f"{formatted_value} {self.unit}".strip()
    
    def is_value_normal(self):
        """Check if value is within normal ranges"""
        if self.value_type == 'digital':
            return self.value in [0, 1]
        elif self.value_type == 'voltage':
            return 0 <= self.value <= 1000
        elif self.value_type == 'current':
            return 0 <= self.value <= 500
        elif self.value_type == 'load':
            return self.value >= 0
        return True

class DataHistory(models.Model):
    """Historical data storage for tracking changes over time"""
    service = models.ForeignKey(Service, on_delete=models.CASCADE, db_index=True)
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, db_index=True)
    value = models.FloatField()
    timestamp = models.DateTimeField(db_index=True)
    recorded_at = models.DateTimeField(auto_now_add=True)
    
    value_type = models.CharField(max_length=20, choices=Asset.VALUE_TYPES, default='analog')
    unit = models.CharField(max_length=10, choices=Asset.UNITS, blank=True)

    class Meta:
        db_table = 'iot_data_history'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['service', 'asset', 'timestamp']),
            models.Index(fields=['timestamp']),
            models.Index(fields=['asset', 'timestamp']),
            models.Index(fields=['service', 'timestamp']),
            models.Index(fields=['value_type', 'timestamp']),
        ]
        verbose_name = 'Data History'
        verbose_name_plural = 'Data History'
        get_latest_by = 'timestamp'

    def __str__(self):
        return f"{self.asset} - {self.value} at {self.timestamp}"
    
    def get_display_value(self):
        """Get formatted historical value for display"""
        if self.value_type == 'digital':
            return "On" if self.value == 1 else "Off"
        else:
            return f"{self.value} {self.unit}".strip()

class ServiceConfiguration(models.Model):
    """Configuration settings for services"""
    service = models.OneToOneField(Service, on_delete=models.CASCADE, related_name='configuration')
    is_enabled = models.BooleanField(default=True)
    polling_interval = models.IntegerField(
        default=60, 
        help_text="Polling interval in seconds",
        validators=[MinValueValidator(1), MaxValueValidator(3600)]
    )
    data_retention_days = models.IntegerField(
        default=30, 
        help_text="Days to keep historical data",
        validators=[MinValueValidator(1), MaxValueValidator(365)]
    )
    max_assets = models.IntegerField(
        default=50, 
        help_text="Maximum number of assets allowed",
        validators=[MinValueValidator(1), MaxValueValidator(1000)]
    )
    
    alert_enabled = models.BooleanField(default=False)
    min_value = models.FloatField(null=True, blank=True, help_text="Minimum acceptable value")
    max_value = models.FloatField(null=True, blank=True, help_text="Maximum acceptable value")
    
    email_alerts = models.BooleanField(default=False)
    email_address = models.EmailField(blank=True, help_text="Email for alerts")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'iot_service_configurations'
        verbose_name = 'Service Configuration'
        verbose_name_plural = 'Service Configurations'
        indexes = [
            models.Index(fields=['is_enabled']),
        ]

    def __str__(self):
        return f"Config for {self.service.name}"
    
    def clean(self):
        """Validate configuration settings"""
        from django.core.exceptions import ValidationError
        
        if self.alert_enabled:
            if self.min_value is None and self.max_value is None:
                raise ValidationError("Either min_value or max_value must be set when alerts are enabled.")
            
            if self.min_value is not None and self.max_value is not None:
                if self.min_value >= self.max_value:
                    raise ValidationError("min_value must be less than max_value.")

class SystemStatus(models.Model):
    """System status and health monitoring"""
    STATUS_CHOICES = [
        ('online', 'Online'),
        ('offline', 'Offline'),
        ('degraded', 'Degraded'),
        ('maintenance', 'Maintenance'),
    ]

    service = models.ForeignKey(Service, on_delete=models.CASCADE, related_name='status_logs', db_index=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='online')
    message = models.TextField(blank=True, help_text="Status message or error details")
    last_data_received = models.DateTimeField(null=True, blank=True)
    assets_online = models.IntegerField(default=0)
    assets_total = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'iot_system_status'
        ordering = ['-created_at']
        verbose_name = 'System Status'
        verbose_name_plural = 'System Status'
        get_latest_by = 'created_at'
        indexes = [
            models.Index(fields=['service', 'created_at']),
            models.Index(fields=['status', 'created_at']),
        ]

    def __str__(self):
        return f"{self.service.name} - {self.status} at {self.created_at}"

    def uptime_percentage(self):
        """Calculate uptime percentage"""
        if self.assets_total > 0:
            return (self.assets_online / self.assets_total) * 100
        return 0
    
    def get_uptime_display(self):
        """Get formatted uptime percentage"""
        percentage = self.uptime_percentage()
        if percentage >= 95:
            return f"✓ {percentage:.1f}%"
        elif percentage >= 80:
            return f"⚠ {percentage:.1f}%"
        else:
            return f"✗ {percentage:.1f}%"


# =============================================
# AUTOMATIC CRANE CREATION
# =============================================

@receiver(post_migrate)
def create_default_crane(sender, **kwargs):
    """
    Automatically create a default crane after migrations if none exists
    This runs only once after database setup
    """
    # Only run for our app to avoid running multiple times
    if sender.name == 'api':  # Replace 'your_app_name' with your actual app name
        try:
            # Check if any crane exists
            if not Crane.objects.exists():
                # Create default crane
                default_crane = Crane.objects.create(
                    name="Crane",
                    description="Default crane system",
                    is_active=True
                )
                print(f"✅ Default crane created: {default_crane}")
            else:
                print("✅ Crane already exists, no action needed")
        except Exception as e:
            print(f"⚠️ Could not create default crane: {e}")

@receiver(post_save, sender=Service)
def create_service_configuration(sender, instance, created, **kwargs):
    """Automatically create configuration when a new service is created"""
    if created:
        ServiceConfiguration.objects.get_or_create(service=instance)

@receiver(post_save, sender=Asset)
def update_data_history(sender, instance, created, **kwargs):
    """Automatically update data history when asset is saved"""
    DataHistory.objects.create(
        service=instance.service,
        asset=instance,
        value=instance.value,
        value_type=instance.value_type,
        unit=instance.unit,
        timestamp=instance.timestamp
    )