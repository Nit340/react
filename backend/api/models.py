from django.db import models
from django.utils import timezone

class Service(models.Model):
    """Model to store service information"""
    name = models.CharField(max_length=100, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.name
    
    class Meta:
        db_table = 'received_services'
        verbose_name = 'Service'
        verbose_name_plural = 'Services'


class Asset(models.Model):
    """Model to store asset data within services"""
    service = models.ForeignKey(Service, on_delete=models.CASCADE, related_name='assets')
    asset_id = models.CharField(max_length=100)
    value = models.FloatField()
    timestamp = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.service.name} - {self.asset_id}"
    
    class Meta:
        db_table = 'incoming_assets'
        verbose_name = 'Asset'
        verbose_name_plural = 'Assets'
        unique_together = ['service', 'asset_id', 'timestamp']
        indexes = [
            models.Index(fields=['service', 'asset_id']),
            models.Index(fields=['timestamp']),
        ]


class IncomingIoTData(models.Model):
    """Model to store complete incoming IoT data payloads"""
    raw_data = models.JSONField(help_text="Raw JSON payload received")
    total_services = models.IntegerField(default=0)
    total_assets = models.IntegerField(default=0)
    received_at = models.DateTimeField(auto_now_add=True)
    processed = models.BooleanField(default=False)
    
    def __str__(self):
        return f"IoT Data - {self.received_at}"
    
    class Meta:
        db_table = 'incoming_iot_data'
        verbose_name = 'Incoming IoT Data'
        verbose_name_plural = 'Incoming IoT Data'
        ordering = ['-received_at']