<script setup lang="ts">
import { computed, ref } from 'vue'
import { Device } from '../../types/device'
import { deviceStore } from '../../store/deviceStore'

interface Props {
  device: Device
}

const props = defineProps<Props>()

// State
const isLoading = ref(false)
const showTcpIpDialog = ref(false)
const statusMessage = ref('')
const isSuccess = ref(false)

// Computed properties
const isSelected = computed(() => deviceStore.isDeviceSelected(props.device.id))
const statusColor = computed(() => props.device.status === 'connected' ? 'success' : 'error')
const batteryColor = computed(() => {
  if (!props.device.batteryLevel) return 'grey'
  if (props.device.batteryLevel > 50) return 'success'
  if (props.device.batteryLevel > 20) return 'warning'
  return 'error'
})

// Is this a USB-connected device that can be converted to TCP/IP?
const isUsbDevice = computed(() => 
  props.device.status === 'connected' && !props.device.ip
)

// Methods
const toggleSelection = () => {
  deviceStore.toggleDeviceSelection(props.device.id)
}

const disconnectDevice = async () => {
  await deviceStore.disconnectDevice(props.device)
}

const connectDevice = async () => {
  if (props.device.ip) {
    await deviceStore.connectDevice(props.device.ip)
  }
}

// Convert device from USB to TCP/IP mode
const convertToTcpIp = async () => {
  if (!isUsbDevice.value) return
  
  isLoading.value = true
  statusMessage.value = ''
  isSuccess.value = false
  showTcpIpDialog.value = true
  
  try {
    // Call the deviceStore method to convert
    const result = await deviceStore.convertDeviceToTcpIp(props.device.id)
    
    // Display the result
    statusMessage.value = result.message
    isSuccess.value = result.success
  } catch (error) {
    statusMessage.value = `Error: ${error instanceof Error ? error.message : String(error)}`
    isSuccess.value = false
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <v-card
    :class="{ 'selected-card': isSelected }"
    @click="toggleSelection"
    variant="outlined"
    class="device-card mx-2 my-2"
  >
    <v-card-item>
      <v-card-title>{{ device.model+" - "+ device.name || 'Unknown Device' }}</v-card-title>
      <v-card-subtitle>{{ device.ip || 'No IP Address' }}</v-card-subtitle>
      <v-card-subtitle>{{ device.screenWidth+"x"+device.screenHeight || 'No Screen Size' }}</v-card-subtitle>
    </v-card-item>

    <v-card-text>
      <div class="d-flex align-center mb-2">
        <v-icon 
          :color="statusColor"
          size="small"
          class="mr-1"
        >
          mdi-{{ device.status === 'connected' ? 'link' : 'link-off' }}
        </v-icon>
        <span class="text-caption">{{ device.status === 'connected' ? 'Connected' : 'Disconnected' }}</span>
      </div>

      <div v-if="device.batteryLevel !== undefined" class="d-flex align-center mb-2">
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
      
      <!-- Show IP address if available -->
      <div v-if="device.ip" class="d-flex align-center">
        <v-icon 
          color="info"
          size="small"
          class="mr-1"
        >
          mdi-ip-network
        </v-icon>
        <span class="text-caption">{{ device.ip }}</span>
      </div>
      
      <!-- Show USB indicator for devices without IP -->
      <div v-else-if="device.status === 'connected'" class="d-flex align-center">
        <v-icon 
          color="warning"
          size="small"
          class="mr-1"
        >
          mdi-usb
        </v-icon>
        <span class="text-caption">USB Connected</span>
      </div>
    </v-card-text>

    <v-card-actions>
      <!-- For connected IP devices: Disconnect button -->
      <v-btn
        v-if="device.status === 'connected' && device.ip"
        color="error"
        variant="text"
        size="small"
        @click.stop="disconnectDevice"
      >
        Disconnect
      </v-btn>
      
      <!-- For USB-connected devices: Convert to TCP/IP button -->
      <v-btn
        v-else-if="isUsbDevice"
        color="info"
        variant="text"
        size="small"
        @click.stop="convertToTcpIp"
        :loading="isLoading"
      >
        Convert to TCP/IP
      </v-btn>
      
      <!-- For disconnected devices with IP: Connect button -->
      <v-btn
        v-else-if="device.ip && device.status !== 'connected'"
        color="success"
        variant="text"
        size="small"
        @click.stop="connectDevice"
      >
        Connect
      </v-btn>
    </v-card-actions>
    
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

<style scoped>
.device-card {
  transition: all 0.2s ease;
  width: 200px;
}

.device-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.selected-card {
  border: 2px solid green !important;
  background-color: rgba(var(--v-primary-base), 0.05);
}
</style>