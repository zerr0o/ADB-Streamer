<template>
  <v-card 
    :class="{ 'selected-card': isSelected, 'disabled-card': !device.tcpConnected || !device.tcpId || (howManySelected > 3 && !isSelected) }" 
    @click="toggleSelection"
    :disabled="!device.tcpConnected || !device.tcpId || (howManySelected > 3 && !isSelected)" 
    variant="elevated"
    class="device-card"
    elevation="3"
  >
    <!-- Header with device icon and name -->
    <div class="card-header">
      <div class="device-icon">
        <v-icon size="24" color="primary">mdi-cellphone</v-icon>
      </div>
      <div class="device-info">
        <h3 class="device-name">{{ device.name || device.model || 'Unknown Device' }}</h3>
        <p class="device-model">{{ device.model || 'Unknown Model' }}</p>
      </div>
      <div class="selection-indicator" v-if="isSelected">
        <v-icon color="success" size="20">mdi-check-circle</v-icon>
      </div>
    </div>

    <!-- Device details -->
    <div class="device-details">
      <div class="detail-row">
        <v-icon size="16" class="detail-icon">mdi-ip-network</v-icon>
        <span class="detail-text">{{ device.ip || 'No IP Address' }}</span>
      </div>
      <div class="detail-row">
        <v-icon size="16" class="detail-icon">mdi-monitor</v-icon>
        <span class="detail-text">{{ device.screenWidth + "×" + device.screenHeight || 'Unknown Resolution' }}</span>
      </div>
    </div>

    <!-- Connection Status Section -->
    <div class="connection-status">
      <!-- Status Indicators -->
      <div class="status-grid">
        <!-- USB Status -->
        <div class="status-item">
          <v-icon :color="device.usbConnected ? 'success' : 'grey-lighten-1'" size="18">
            mdi-usb
          </v-icon>
          <span class="status-label">USB</span>
          <v-chip 
            :color="device.usbConnected ? 'success' : 'grey'" 
            size="x-small" 
            variant="flat"
            class="status-chip"
          >
            {{ device.usbConnected ? 'ON' : 'OFF' }}
          </v-chip>
        </div>

        <!-- WiFi Status -->
        <div class="status-item">
          <v-icon :color="device.tcpConnected ? 'success' : 'grey-lighten-1'" size="18">
            {{ device.tcpConnected ? 'mdi-wifi' : 'mdi-wifi-off' }}
          </v-icon>
          <span class="status-label">WiFi</span>
          <v-chip 
            :color="device.tcpConnected ? 'success' : 'grey'" 
            size="x-small" 
            variant="flat"
            class="status-chip"
          >
            {{ device.tcpConnected ? 'ON' : 'OFF' }}
          </v-chip>
        </div>
      </div>

      <!-- Battery Level -->
      <div class="battery-section">
        <div class="d-flex align-center justify-space-between">
          <div class="d-flex align-center">
            <v-icon :color="batteryColor" size="18" class="mr-2">
              mdi-battery{{
                device.batteryLevel >= 90 ? '' :
                  device.batteryLevel >= 70 ? '-80' :
                    device.batteryLevel >= 50 ? '-60' :
                      device.batteryLevel >= 30 ? '-40' :
                        device.batteryLevel >= 10 ? '-20' : '-alert'
              }}
            </v-icon>
            <span class="battery-label">Battery</span>
          </div>
          <span class="battery-percentage">
            {{ device.batteryLevel !== undefined ? device.batteryLevel + '%' : 'N/A' }}
          </span>
        </div>
        <v-progress-linear
          v-if="device.batteryLevel !== undefined"
          :model-value="device.batteryLevel"
          :color="batteryColor"
          height="6"
          rounded
          class="mt-2"
        />
      </div>

      <!-- Ready Status -->
      <div class="ready-status">
        <v-chip
          :color="device.tcpConnected && device.tcpId ? 'success' : 'warning'"
          variant="flat"
          class="status-main-chip"
          block
        >
          <v-icon 
            :icon="device.tcpConnected && device.tcpId ? 'mdi-play-circle' : 'mdi-alert-circle'" 
            start 
            size="16"
          />
          {{ device.tcpConnected && device.tcpId ? 'Ready to Stream' : 'Check Connection' }}
        </v-chip>
      </div>
    </div>

    <!-- <code >
        {{device}}
      </code> -->

    <v-card-actions class="card-actions">
      <v-btn 
        block 
        color="error" 
        variant="outlined" 
        class="reboot-btn" 
        @click.stop="showRebootDialog = true"
        size="small"
      >
        <v-icon start icon="mdi-restart" size="16"></v-icon>
        Reboot
      </v-btn>
    </v-card-actions>

    <!-- Reboot Dialog -->
    <v-dialog v-model="showRebootDialog" max-width="400">
      <v-card>
        <v-card-title>Reboot Device</v-card-title>
        <v-card-text>
          Are you sure you want to reboot this device?
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="primary" variant="text" @click="showRebootDialog = false">Cancel</v-btn>
          <v-btn color="primary" variant="text" @click="rebootDevice(device)">Reboot</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>


  </v-card>
</template>



<script lang="ts">
import { defineComponent, ref, computed, PropType } from 'vue';
import { Device } from '../../types/device';
import { deviceStore } from '../../store/deviceStore';
import { AdbService } from '../../services/AdbService';

export default defineComponent({
  name: 'DeviceCard',
  props: {
    device: {
      type: Object as PropType<Device>,
      required: true
    }
  },
  setup(props) {
    // State
    const isLoading = ref(false);
    const showRebootDialog = ref(false);
    const statusMessage = ref('');
    const isSuccess = ref(false);

    // Computed properties
    const isSelected = computed(() => deviceStore.isDeviceSelected(props.device.id));

    const howManySelected = computed(() => deviceStore.selectedDevices.value.length);

    const batteryColor = computed(() => {
      if (!props.device.batteryLevel) return 'grey';
      if (props.device.batteryLevel > 50) return 'success';
      if (props.device.batteryLevel > 20) return 'warning';
      return 'error';
    });


    // Methods
    const toggleSelection = () => {
      deviceStore.toggleDeviceSelection(props.device.id);
    };

    const rebootDevice = (device: Device) => {

      if (!device.usbId && !device.tcpId) {
        console.error('Device ID not found')
        console.log(device)
        return
      }

      if (device.usbConnected && device.usbId) {
        AdbService.rebootDevice(device.usbId)
      }
      if (device.tcpConnected && device.tcpId) {
        AdbService.rebootDevice(device.tcpId)
      }
      else {
        console.error('Device is not connected')
        console.log(device)
        return
      }


      showRebootDialog.value = false;
    };


    return {
      isLoading,
      showRebootDialog,
      statusMessage,
      isSuccess,
      isSelected,
      batteryColor,
      toggleSelection,
      rebootDevice,
      howManySelected
    };
  }
});
</script>



<style scoped>
.device-card {
  transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
  width: 280px;
  min-height: 320px;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%);
  border-radius: 16px;
  border: 1px solid rgba(226, 232, 240, 0.4);
  backdrop-filter: blur(10px);
  position: relative;
  overflow: hidden;
  cursor: pointer;
}

.device-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6, #06b6d4);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.device-card:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  border-color: rgba(59, 130, 246, 0.3);
}

.device-card:hover::before {
  opacity: 1;
}

.selected-card {
  border: 2px solid #10b981 !important;
  background: linear-gradient(145deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%);
  box-shadow: 0 8px 32px rgba(16, 185, 129, 0.2);
}

.selected-card::before {
  background: linear-gradient(90deg, #10b981, #059669);
  opacity: 1;
}

.disabled-card {
  opacity: 0.6;
  cursor: not-allowed;
  filter: grayscale(0.3);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 20px 16px;
  background: linear-gradient(135deg, rgba(248, 250, 252, 0.8) 0%, rgba(241, 245, 249, 0.6) 100%);
  border-bottom: 1px solid rgba(226, 232, 240, 0.3);
}

.device-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.device-info {
  flex: 1;
  margin-left: 16px;
}

.device-name {
  font-size: 1.1rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 4px 0;
  line-height: 1.3;
}

.device-model {
  font-size: 0.875rem;
  color: #64748b;
  margin: 0;
  line-height: 1.2;
}

.selection-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #10b981, #059669);
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
}

.device-details {
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.4);
}

.detail-row {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.detail-row:last-child {
  margin-bottom: 0;
}

.detail-icon {
  margin-right: 12px;
  color: #64748b;
}

.detail-text {
  font-size: 0.875rem;
  color: #374151;
  font-weight: 500;
}

.connection-status {
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.6);
}

.status-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}

.status-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 8px;
  border: 1px solid rgba(226, 232, 240, 0.5);
  transition: all 0.2s ease;
}

.status-item:hover {
  background: rgba(255, 255, 255, 0.9);
  transform: translateY(-1px);
}

.status-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
  margin: 6px 0 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-chip {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 12px;
}

.battery-section {
  margin-bottom: 16px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 12px;
  border: 1px solid rgba(226, 232, 240, 0.5);
}

.battery-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
}

.battery-percentage {
  font-size: 0.875rem;
  font-weight: 700;
  color: #1e293b;
}

.ready-status {
  margin-bottom: 8px;
}

.status-main-chip {
  font-weight: 600;
  padding: 12px 16px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.card-actions {
  padding: 16px 20px 20px;
  background: rgba(248, 250, 252, 0.6);
}

.reboot-btn {
  font-weight: 600;
  border-radius: 10px;
  transition: all 0.2s ease;
}

.reboot-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

/* Dark theme support */
@media (prefers-color-scheme: dark) {
  .device-card {
    background: linear-gradient(145deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%);
    border-color: rgba(71, 85, 105, 0.4);
  }
  
  .card-header {
    background: linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.6) 100%);
    border-bottom-color: rgba(71, 85, 105, 0.3);
  }
  
  .device-name {
    color: #f1f5f9;
  }
  
  .device-model {
    color: #94a3b8;
  }
  
  .detail-text {
    color: #cbd5e1;
  }
  
  .device-details,
  .connection-status {
    background: rgba(15, 23, 42, 0.4);
  }
  
  .status-item,
  .battery-section {
    background: rgba(30, 41, 59, 0.7);
    border-color: rgba(71, 85, 105, 0.5);
  }
  
  .card-actions {
    background: rgba(15, 23, 42, 0.6);
  }
}
</style>