from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator

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

    def __str__(self):
        return self.name

    def service_count(self):
        """Return the number of services for this crane"""
        return self.services.count()
    
    def asset_count(self):
        """Return the total number of assets across all services"""
        return Asset.objects.filter(service__crane=self).count()

class Service(models.Model):
    """Represents a service that contains multiple assets"""
    SERVICE_TYPES = [
        ('onboardio', 'Onboard IO'),
        ('modbus', 'Modbus'),
        ('loadcell', 'Load Cell'),
        ('io', 'IO Controls'),
        ('other', 'Other'),
    ]
    
    crane = models.ForeignKey(Crane, on_delete=models.CASCADE, related_name='services', default=1)
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
    ]

    service = models.ForeignKey(Service, on_delete=models.CASCADE, related_name='assets')
    asset_id = models.CharField(max_length=100, help_text="Variable name (e.g., IN0, Hoist_voltage, Load)")
    value = models.FloatField(help_text="Value of the datapoint")
    timestamp = models.DateTimeField(help_text="Timestamp from the IoT device")
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Additional fields
    value_type = models.CharField(max_length=20, choices=VALUE_TYPES, default='analog')
    unit = models.CharField(max_length=10, choices=UNITS, blank=True)
    is_active = models.BooleanField(default=True)
    
    # For digital values
    state_0_name = models.CharField(max_length=50, blank=True, default='Off', help_text="Name for state 0")
    state_1_name = models.CharField(max_length=50, blank=True, default='On', help_text="Name for state 1")

    class Meta:
        db_table = 'iot_assets'
        ordering = ['service', 'asset_id']
        indexes = [
            models.Index(fields=['service', 'asset_id']),
            models.Index(fields=['timestamp']),
        ]
        verbose_name = 'Asset'
        verbose_name_plural = 'Assets'
        unique_together = ['service', 'asset_id']

    def __str__(self):
        return f"{self.service.name}.{self.asset_id}"

    def save(self, *args, **kwargs):
        # Auto-detect value type and unit if not set
        if not self.value_type or self.value_type == 'analog':
            self.value_type = self.detect_value_type()
        
        if not self.unit:
            self.unit = self.detect_unit()
            
        super().save(*args, **kwargs)

    def detect_value_type(self):
        """Auto-detect value type based on asset ID patterns"""
        asset_id_lower = self.asset_id.lower()
        
        type_mapping = [
            ('voltage', ['voltage']),
            ('current', ['current', 'amp']),
            ('power', ['power']),
            ('frequency', ['frequency', 'freq']),
            ('load', ['load', 'weight', 'capacity']),
            ('digital', ['in', 'out', 'start', 'stop', 'hoist', 'ct_', 'lt_']),
        ]
        
        for value_type, keywords in type_mapping:
            if any(keyword in asset_id_lower for keyword in keywords):
                return value_type
        
        return 'analog'

    def detect_unit(self):
        """Auto-detect unit based on asset ID patterns"""
        asset_id_lower = self.asset_id.lower()
        
        unit_mapping = [
            ('V', ['voltage']),
            ('A', ['current', 'amp']),
            ('kW', ['power']),
            ('Hz', ['frequency', 'freq']),
            ('kg', ['load', 'weight']),
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
            return f"{self.value} {self.unit}".strip()

class DataHistory(models.Model):
    """Historical data storage for tracking changes over time"""
    service = models.ForeignKey(Service, on_delete=models.CASCADE)
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE)
    value = models.FloatField()
    timestamp = models.DateTimeField()
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'iot_data_history'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['service', 'asset', 'timestamp']),
            models.Index(fields=['timestamp']),
        ]
        verbose_name = 'Data History'
        verbose_name_plural = 'Data History'
        get_latest_by = 'timestamp'

    def __str__(self):
        return f"{self.asset} - {self.value} at {self.timestamp}"

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
    
    # Alert thresholds
    alert_enabled = models.BooleanField(default=False)
    min_value = models.FloatField(null=True, blank=True, help_text="Minimum acceptable value")
    max_value = models.FloatField(null=True, blank=True, help_text="Maximum acceptable value")
    
    # Notification settings
    email_alerts = models.BooleanField(default=False)
    email_address = models.EmailField(blank=True, help_text="Email for alerts")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'iot_service_configurations'
        verbose_name = 'Service Configuration'
        verbose_name_plural = 'Service Configurations'

    def __str__(self):
        return f"Config for {self.service.name}"

class SystemStatus(models.Model):
    """System status and health monitoring"""
    STATUS_CHOICES = [
        ('online', 'Online'),
        ('offline', 'Offline'),
        ('degraded', 'Degraded'),
        ('maintenance', 'Maintenance'),
    ]

    service = models.ForeignKey(Service, on_delete=models.CASCADE, related_name='status_logs')
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

    def __str__(self):
        return f"{self.service.name} - {self.status} at {self.created_at}"

    def uptime_percentage(self):
        """Calculate uptime percentage"""
        if self.assets_total > 0:
            return (self.assets_online / self.assets_total) * 100
        return 0