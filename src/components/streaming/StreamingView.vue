<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { StreamingService, ScreenDimensions } from '../../services/StreamingService'
import { deviceStore } from '../../store/deviceStore'

// State
const isLoading = ref(false)
const errorMessage = ref('')
const isScrcpyAvailable = ref(false)
const isStreaming = ref(false)
const screenDimensions = ref<ScreenDimensions>({ width: 0, height: 0 })

// Computed
const selectedDevices = computed(() => {
  return deviceStore.state.value.devices
    .filter(device => deviceStore.selectedDevices.value.includes(device.id))
})

const noDevicesSelected = computed(() => selectedDevices.value.length === 0)

const gridSize = computed(() => {
  const numDevices = selectedDevices.value.length
  if (numDevices <= 1) return '1x1'
  if (numDevices <= 2) return '1x2'
  if (numDevices <= 4) return '2x2'
  if (numDevices <= 6) return '2x3'
  if (numDevices <= 9) return '3x3'
  if (numDevices <= 12) return '3x4'
  return '4x4'
})

// Methods
const checkScrcpyAvailability = async () => {
  try {
    isScrcpyAvailable.value = await StreamingService.isScrcpyAvailable()
    
    if (!isScrcpyAvailable.value) {
      errorMessage.value = 'SCRCPY is not installed. Please install it to enable streaming.'
    }
  } catch (error) {
    console.error('Error checking SCRCPY availability:', error)
    errorMessage.value = 'Error checking SCRCPY availability'
    isScrcpyAvailable.value = false
  }
}

const getScreenDimensions = () => {
  // Use window dimensions
  const dpr = window.devicePixelRatio;
  
  // Calculer les dimensions réelles en tenant compte du scaling
  screenDimensions.value = {
    width: window.screen.width * dpr,
    height: window.screen.height * dpr
  };
}

const startStreaming = async () => {
  if (noDevicesSelected.value) {
    errorMessage.value = 'No devices selected for streaming'
    return
  }
  
  if (!isScrcpyAvailable.value) {
    errorMessage.value = 'SCRCPY is not available'
    return
  }
  
  isLoading.value = true
  errorMessage.value = ''
  
  try {
    // Get the selected device IDs
    const deviceIds = selectedDevices.value.map(device => device.id)
    
    // Update screen dimensions
    getScreenDimensions()
    
    // Start streaming
    const success = await StreamingService.startMosaicStreaming(deviceIds, screenDimensions.value)
    
    if (success) {
      isStreaming.value = true
    } else {
      errorMessage.value = 'Failed to start streaming'
    }
  } catch (error) {
    console.error('Error starting streaming:', error)
    errorMessage.value = 'Error starting streaming: ' + 
      (error instanceof Error ? error.message : String(error))
  } finally {
    isLoading.value = false
  }
}

const stopStreaming = async () => {
  isLoading.value = true
  errorMessage.value = ''
  
  try {
    await StreamingService.stopAllStreams()
    isStreaming.value = false
  } catch (error) {
    console.error('Error stopping streaming:', error)
    errorMessage.value = 'Error stopping streaming: ' + 
      (error instanceof Error ? error.message : String(error))
  } finally {
    isLoading.value = false
  }
}

// This is a placeholder for dealing with window resize
const handleResize = () => {
  getScreenDimensions()
  
  // If currently streaming, restart the stream with new dimensions
  if (isStreaming.value) {
    startStreaming()
  }
}

// Lifecycle hooks
onMounted(async () => {
  // Check if SCRCPY is available
  await checkScrcpyAvailability()
  
  // Get initial screen dimensions
  getScreenDimensions()
  
  // Add resize listener
  window.addEventListener('resize', handleResize)
  

})

onBeforeUnmount(() => {
  // Stop all streams when component is unmounted
  stopStreaming()
  
  // Remove resize listener
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <div class="streaming-container">
    <v-row class="my-2">
      <v-col>
        <div class="d-flex justify-space-between align-center">
          <h2 class="text-h5">Device Streaming</h2>
          <div class="d-flex">
            <v-btn
              v-if="!isStreaming"
              color="primary"
              :loading="isLoading"
              :disabled="noDevicesSelected || !isScrcpyAvailable"
              prepend-icon="mdi-play"
              @click="startStreaming"
              class="mr-2"
            >
              Start Streaming
            </v-btn>
            <v-btn
              v-else
              color="error"
              :loading="isLoading"
              prepend-icon="mdi-stop"
              @click="stopStreaming"
              class="mr-2"
            >
              Stop Streaming
            </v-btn>
            <v-chip v-if="!noDevicesSelected" color="info">
              {{ selectedDevices.length }} device{{ selectedDevices.length !== 1 ? 's' : '' }} selected
            </v-chip>
            <v-chip v-if="isStreaming" color="primary" class="ml-2">
              {{ gridSize }} grid
            </v-chip>
          </div>
        </div>
      </v-col>
    </v-row>
    
    <!-- Error message -->
    <v-alert
      v-if="errorMessage"
      type="error"
      closable
      class="mb-4"
      @click:close="errorMessage = ''"
    >
      {{ errorMessage }}
    </v-alert>
    
    <!-- SCRCPY not available warning -->
    <v-alert
      v-if="!isScrcpyAvailable"
      type="warning"
      icon="mdi-alert-circle"
      class="mb-4"
    >
      <v-alert-title>SCRCPY Not Installed</v-alert-title>
      <p>SCRCPY is required for device streaming but is not installed or not found in PATH.</p>
      <p class="mt-2">Please install SCRCPY and place it in the <code>public/scrcpy</code> folder.</p>
      <p class="mt-2">
        <a href="https://github.com/Genymobile/scrcpy" target="_blank">
          Download SCRCPY from GitHub
        </a>
      </p>
    </v-alert>
    
    <!-- No devices selected -->
    <v-card
      v-if="noDevicesSelected"
      variant="outlined"
      class="my-4 pa-4 text-center"
    >
      <v-card-text>
        <v-icon size="64" color="grey">mdi-cellphone-off</v-icon>
        <h3 class="text-h5 mt-4">No Devices Selected</h3>
        <p class="text-body-1 mt-2">
          Select one or more devices from the Devices page to start streaming.
        </p>
      </v-card-text>
    </v-card>
    
    <!-- Selected devices list -->
    <v-card
      v-else-if="!isStreaming"
      variant="outlined"
      class="my-4"
    >
      <v-card-title>Selected Devices</v-card-title>
      <v-card-text>
        <v-list>
          <v-list-item
            v-for="device in selectedDevices"
            :key="device.id"
            :title="device.name || device.id"
            :subtitle="device.ip || 'No IP'"
          >
            <template v-slot:prepend>
              <v-icon :color="device.status === 'connected' ? 'success' : 'error'">
                mdi-cellphone-link
              </v-icon>
            </template>
          </v-list-item>
        </v-list>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn
          color="primary"
          :loading="isLoading"
          :disabled="!isScrcpyAvailable"
          prepend-icon="mdi-play"
          @click="startStreaming"
        >
          Start Streaming
        </v-btn>
      </v-card-actions>
    </v-card>
    
    <!-- Streaming status -->
    <v-card
      v-else
      variant="outlined"
      class="my-4"
    >
      <v-card-title>
        Streaming Active
        <v-chip color="success" class="ml-2">{{ gridSize }} grid</v-chip>
      </v-card-title>
      <v-card-text class="text-center py-4">
        <p class="text-body-1">
          Streaming {{ selectedDevices.length }} device{{ selectedDevices.length !== 1 ? 's' : '' }} in mosaic view.
        </p>
        <p class="text-body-2 text-grey">
          SCRCPY windows are running in separate processes. To interact with a specific device, click on its window.
        </p>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn
          color="error"
          :loading="isLoading"
          prepend-icon="mdi-stop"
          @click="stopStreaming"
        >
          Stop Streaming
        </v-btn>
      </v-card-actions>
    </v-card>
  </div>
</template>

<style scoped>
.streaming-container {
  height: 100%;
}
</style>