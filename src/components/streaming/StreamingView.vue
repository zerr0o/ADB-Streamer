<template>
  <div class="streaming-container">
    <!-- Overlay de streaming -->
    <div v-if="isStreaming" class="streaming-overlay">
      <div class="streaming-grid" :style="gridStyle">
        <div 
          v-for="(device, index) in selectedDevices" 
          :key="device.id"
          class="streaming-cell"
          :style="getCellStyle(index)"
        >
          <v-btn
            color="primary"
            size="x-large"
            class="rounded-xl"
            @click="restartDeviceStream(device.id, index)"
          >
            <v-icon icon="mdi-refresh" size="large" start />
            Restart Stream ( {{ device.name ? device.name : device.id }} )
            <v-tooltip activator="parent" location="top">Redémarrer le stream</v-tooltip>
          </v-btn>

          <div>
          </div>
        </div>
      </div>
      <div class="streaming-controls">
        <v-btn
          color="red"
          height="100%"
          width="100%"
          class="text-h4"
          size="large"
          prepend-icon="mdi-stop"
          @click="stopStreaming"
        >
          Stop Streaming
        </v-btn>
      </div>
    </div>
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
              <v-icon :color="device.tcpConnected ? 'success' : 'error'">
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
const deviceStreamingStatus = ref<Record<string, boolean>>({})
const cellPositions = ref<Array<{ x: number, y: number, width: number, height: number }>>([])

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
    // Réduire la hauteur de 100px pour laisser de la place pour le bouton Stop Streaming
    height: window.screen.height * dpr - 100
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
    
    // Initialiser le statut de streaming pour chaque appareil
    deviceIds.forEach(id => {
      deviceStreamingStatus.value[id] = false
    })
    
    // Start streaming
    const success = await StreamingService.startMosaicStreaming(deviceIds, screenDimensions.value, (positions) => {
      // Stocker les positions des cellules pour l'overlay
      cellPositions.value = positions
    })
    
    if (success) {
      isStreaming.value = true
      // Mettre à jour le statut de streaming pour chaque appareil
      deviceIds.forEach(id => {
        deviceStreamingStatus.value[id] = true
      })
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
    // Réinitialiser le statut de streaming pour tous les appareils
    Object.keys(deviceStreamingStatus.value).forEach(id => {
      deviceStreamingStatus.value[id] = false
    })
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

// Méthode pour redémarrer un stream spécifique
const restartDeviceStream = async (deviceId: string, index: number) => {
  if (index >= cellPositions.value.length) return;
  
  try {
    // Mettre à jour le statut de streaming
    deviceStreamingStatus.value[deviceId] = false;
    
    // Arrêter le stream existant pour cet appareil
    await StreamingService.stopDeviceStream(deviceId);
    
    // Récupérer la position de la cellule
    const cell = cellPositions.value[index];
    
    // Trouver l'appareil
    const device = selectedDevices.value.find(d => d.id === deviceId);
    
    if (device) {
      // Redémarrer le stream avec les mêmes options
      const success = await StreamingService.startDeviceStream(deviceId, {
        x: cell.x,
        y: cell.y,
        width: cell.width,
        height: cell.height,
        title: `Device ${deviceId}`,
        noBorder: true,
        alwaysOnTop: true,
        noControl: selectedDevices.value.length > 1,
        maxSize: 0,
        crop: device.screenWidth && device.screenHeight ? 
          StreamingService.calculateOptimalCrop(device.screenWidth, device.screenHeight) : 
          `${screenDimensions.value.width}:${screenDimensions.value.height}:0:0`
      });
      
      // Mettre à jour le statut de streaming
      deviceStreamingStatus.value[deviceId] = success;
    }
  } catch (error) {
    console.error(`Error restarting stream for device ${deviceId}:`, error);
    errorMessage.value = `Error restarting stream for device ${deviceId}`;
  }
}

// Style pour la grille
const gridStyle = computed(() => {
  const grid = StreamingService.calculateGrid(selectedDevices.value.length);
  return {
    gridTemplateColumns: `repeat(${grid.cols}, 1fr)`,
    gridTemplateRows: `repeat(${grid.rows}, 1fr)`
  };
});

// Style pour chaque cellule
const getCellStyle = (index: number) => {
  if (index >= cellPositions.value.length) return {};
  
  const cell = cellPositions.value[index];
  return {
    left: `${cell.x}px`,
    top: `${cell.y}px`,
    width: `${cell.width}px`,
    height: `${cell.height}px`,
    position: 'absolute' as const
  };
}

// Lifecycle hooks
onMounted(async () => {
  // Check if SCRCPY is available
  await checkScrcpyAvailability()
  
  // Get initial screen dimensions
  getScreenDimensions()
  
  // Add resize listener
  //window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  // Stop all streams when component is unmounted
  stopStreaming()
  
  // Remove resize listener
  //window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.streaming-container {
  height: 100%;
  position: relative;
}

.streaming-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1000;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  background-color: rgb(6, 6, 6);
}

.streaming-grid {
  flex: 1;
  display: grid;
  position: relative;
}

.streaming-cell {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  pointer-events: auto;
  background-color: rgba(0, 0, 0, 0.5);
}

.streaming-controls {
  height: 100px;
  display: flex;
  justify-content: center;
  align-items: center;
  pointer-events: auto;
  background-color: rgba(0, 0, 0, 0.5);
}
</style>