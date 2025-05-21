<template>
  <v-card
    :class="{ 'selected-card': isSelected }"
    @click="toggleSelection"
    :disabled="!device.tcpConnected && !device.tcpId"
    variant="outlined"
    class="device-card mx-2 my-2 rounded-xl"
    
  >
    <v-card-item>
      <v-card-title>{{ device.name || device.model }}</v-card-title>
      <v-card-subtitle>{{ device.model || 'Unknown Model' }}</v-card-subtitle>
      <v-card-subtitle class="text-caption">{{ device.ip || 'No IP Address' }}</v-card-subtitle>
      <v-card-subtitle class="text-caption">{{ device.screenWidth+"x"+device.screenHeight || 'No Screen Size' }}</v-card-subtitle>
    </v-card-item>

    <v-card-text>
      <!-- USB Connection Status -->
      <div v-if="device.usbConnected" class="d-flex align-center mb-1">
        <v-icon color="success" size="small" class="mr-1">mdi-usb</v-icon>
        <span class="text-caption">USB Connected</span>
      </div>
      <div v-else class="d-flex align-center mb-1">
        <v-icon color="error" size="small" class="mr-1">mdi-usb</v-icon>
        <span class="text-caption">USB Disconnected</span>
      </div>

      <!-- TCP/IP Connection Status -->
      <div v-if="device.tcpConnected" class="d-flex align-center mb-1">
        <v-icon :color="device.tcpConnected ? 'success' : 'error'" size="small" class="mr-1">
          {{ device.tcpConnected ? 'mdi-wifi' : 'mdi-wifi-off' }}
        </v-icon>
        <span class="text-caption">
          TCP/IP: {{ device.ip }}
        </span>
      </div>
      <div v-else class="d-flex align-center mb-1">
        <v-icon color="error" size="small" class="mr-1">mdi-wifi-off</v-icon>
        <span class="text-caption"> TCP/IP Disconnected</span>
      </div>
      

      <code >
        {{device}}
      </code>

      <!-- Battery Level -->
      <div v-if="device.batteryLevel !== undefined && (device.tcpConnected || device.usbConnected)" class="d-flex align-center mt-2 mb-1">
        <v-icon 
          :color="batteryColor"
          size="small"
          class="mr-1"
        >
          mdi-battery{{ 
            device.batteryLevel >= 90 ? '' : 
            device.batteryLevel >= 70 ? '-80' : 
            device.batteryLevel >= 50 ? '-60' : 
            device.batteryLevel >= 30 ? '-40' : 
            device.batteryLevel >= 10 ? '-20' : '-alert'
          }}
        </v-icon>
        <span class="text-caption">{{ device.batteryLevel }}%</span>
      </div>
      <div v-else class="d-flex align-center mb-1">
        <v-icon color="error" size="small" class="mr-1">mdi-battery-alert</v-icon>
        <span class="text-caption">Battery Level Unknown</span>
      </div>
    </v-card-text>
    
    <!-- TCP/IP Conversion Dialog -->
    <v-dialog v-model="showTcpIpDialog" max-width="400">
      <v-card>
        <v-card-title>Convert to TCP/IP</v-card-title>
        
        <v-card-text>
          <v-alert
            v-if="statusMessage"
            :type="isSuccess ? 'success' : 'error'"
            variant="tonal"
            class="mb-3"
          >
            {{ statusMessage }}
          </v-alert>
          
          <div v-if="isLoading" class="text-center py-3">
            <v-progress-circular indeterminate />
            <p class="mt-2">Converting device to TCP/IP mode...</p>
          </div>
          
          <p v-else-if="!statusMessage">
            Converting this device from USB to TCP/IP mode will allow you to 
            connect wirelessly after unplugging the USB cable.
          </p>
        </v-card-text>
        
        <v-card-actions>
          <v-spacer />
          <v-btn
            color="primary"
            variant="text"
            @click="showTcpIpDialog = false"
          >
            Close
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>



<script lang="ts">
import { defineComponent, ref, computed, PropType } from 'vue';
import { Device } from '../../types/device';
import { deviceStore } from '../../store/deviceStore';

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
    const showTcpIpDialog = ref(false);
    const statusMessage = ref('');
    const isSuccess = ref(false);

    // Computed properties
    const isSelected = computed(() => deviceStore.isDeviceSelected(props.device.id));

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



    return {
      isLoading,
      showTcpIpDialog,
      statusMessage,
      isSuccess,
      isSelected,
      batteryColor,
      toggleSelection,

    };
  }
});
</script>



<style scoped>

.device-card {
  transition: all 0.2s ease;
  width: 200px;
  background-color: rgba(255, 255, 255, 0.1);
}

.device-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.selected-card {
  border: 2px solid green !important;
  background-color: rgba(7, 207, 0, 0.2)
}
</style>