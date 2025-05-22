<template>
  <div class="streaming-container">
    <!-- Modern Streaming Overlay -->
    <div v-if="isStreaming" class="streaming-overlay">
      <div class="streaming-grid" :style="gridStyle">
        <div 
          v-for="(device, index) in selectedDevices" 
          :key="device.id"
          class="streaming-cell"
          :style="getCellStyle(index)"
        >
          <div class="streaming-cell-content">
            <v-btn
              class="restart-btn"
              size="large"
              variant="elevated"
              :disabled="isLoading || isCleanupInProgress"
              @click="restartDeviceStream(device.id, index)"
            >
              <v-icon class="restart-icon">mdi-refresh</v-icon>
              <span class="restart-text">Restart Stream</span>
              <div class="device-name">{{ device.name ? device.name : device.id }}</div>
            </v-btn>
          </div>
        </div>
      </div>
      <div class="streaming-controls">
        <v-btn
          class="stop-streaming-btn"
          size="x-large"
          variant="elevated"
          :loading="isLoading || isCleanupInProgress"
          :disabled="isCleanupInProgress"
          @click="stopStreaming"
        >
          <v-icon class="stop-icon">mdi-stop</v-icon>
          <span class="stop-text">Stop Streaming</span>
        </v-btn>
      </div>
    </div>

    <!-- Modern Header Section -->
    <div class="streaming-header">
      <div class="header-content">
        <div class="header-title">
          <h1 class="title-text">Device Streaming</h1>
          <div class="title-gradient"></div>
        </div>
        <div class="header-actions">
          <v-btn
            v-if="!isStreaming"
            class="action-btn primary-btn"
            size="large"
            variant="elevated"
            :loading="isLoading"
            :disabled="noDevicesSelected || !isScrcpyAvailable || isCleanupInProgress"
            @click="startStreaming"
          >
            <v-icon class="btn-icon">mdi-play</v-icon>
            Start Streaming
          </v-btn>
          <v-btn
            v-else
            class="action-btn danger-btn"
            size="large"
            variant="elevated"
            :loading="isLoading || isCleanupInProgress"
            :disabled="isCleanupInProgress"
            @click="stopStreaming"
          >
            <v-icon class="btn-icon">mdi-stop</v-icon>
            Stop Streaming
          </v-btn>
          
          <div class="status-chips">
            <div v-if="!noDevicesSelected" class="status-chip devices-chip">
              <v-icon class="chip-icon">mdi-devices</v-icon>
              <span>{{ selectedDevices.length }} device{{ selectedDevices.length !== 1 ? 's' : '' }}</span>
            </div>
            <div v-if="isStreaming" class="status-chip grid-chip">
              <v-icon class="chip-icon">mdi-grid</v-icon>
              <span>{{ gridSize }} grid</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Modern Error Alert -->
    <div v-if="errorMessage" class="modern-alert error-alert">
      <div class="alert-content">
        <v-icon class="alert-icon">mdi-alert-circle</v-icon>
        <div class="alert-text">
          <div class="alert-title">Error</div>
          <div class="alert-message">{{ errorMessage }}</div>
        </div>
        <v-btn 
          class="alert-close-btn"
          icon
          variant="text"
          size="small"
          @click="errorMessage = ''"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </div>
    </div>
    
    <!-- Modern SCRCPY Warning -->
    <div v-if="!isScrcpyAvailable" class="modern-alert warning-alert">
      <div class="alert-content">
        <v-icon class="alert-icon">mdi-alert-triangle</v-icon>
        <div class="alert-text">
          <div class="alert-title">SCRCPY Not Installed</div>
          <div class="alert-message">
            SCRCPY is required for device streaming but is not installed or not found in PATH.
          </div>
          <div class="alert-details">
            <p>Please install SCRCPY and place it in the <code>public/scrcpy</code> folder.</p>
            <a href="https://github.com/Genymobile/scrcpy" target="_blank" class="download-link">
              <v-icon class="link-icon">mdi-download</v-icon>
              Download SCRCPY from GitHub
            </a>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Modern No Devices Card -->
    <div v-if="noDevicesSelected" class="modern-card empty-state-card">
      <div class="card-content">
        <div class="empty-state">
          <div class="empty-icon-container">
            <v-icon class="empty-icon">mdi-cellphone-off</v-icon>
            <div class="icon-glow"></div>
          </div>
          <h3 class="empty-title">No Devices Selected</h3>
          <p class="empty-description">
            Select one or more devices from the Devices page to start streaming.
          </p>
          <div class="empty-action">
            <v-btn 
              class="action-btn secondary-btn"
              variant="elevated"
              router
              to="/devices"
            >
              <v-icon class="btn-icon">mdi-devices</v-icon>
              Go to Devices
            </v-btn>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Modern Selected Devices Card -->
    <div v-else-if="!isStreaming" class="modern-card devices-card">
      <div class="card-header">
        <h3 class="card-title">Selected Devices</h3>
        <div class="card-subtitle">Ready for streaming</div>
      </div>
      <div class="card-content">
        <div class="devices-list">
          <div
            v-for="device in selectedDevices"
            :key="device.id"
            class="device-item"
          >
            <div class="device-status">
              <div class="status-indicator" :class="{ 'connected': device.tcpConnected }"></div>
            </div>
            <div class="device-info">
              <div class="device-name">{{ device.name || device.id }}</div>
              <div class="device-ip">{{ device.ip || 'No IP' }}</div>
            </div>
            <div class="device-icon">
              <v-icon>mdi-cellphone-link</v-icon>
            </div>
          </div>
        </div>
      </div>
      <div class="card-actions">
        <v-btn
          class="action-btn primary-btn"
          size="large"
          variant="elevated"
          :loading="isLoading"
          :disabled="!isScrcpyAvailable || isCleanupInProgress"
          @click="startStreaming"
        >
          <v-icon class="btn-icon">mdi-play</v-icon>
          Start Streaming
        </v-btn>
      </div>
    </div>
    
    <!-- Modern Streaming Status Card -->
    <div v-else class="modern-card streaming-status-card">
      <div class="card-header">
        <h3 class="card-title">
          Streaming Active
          <div class="status-chip grid-chip active">
            <v-icon class="chip-icon">mdi-grid</v-icon>
            <span>{{ gridSize }} grid</span>
          </div>
        </h3>
      </div>
      <div class="card-content">
        <div class="streaming-info">
          <div class="info-item">
            <v-icon class="info-icon">mdi-play-circle</v-icon>
            <div class="info-text">
              <div class="info-title">Active Streams</div>
              <div class="info-value">{{ selectedDevices.length }} device{{ selectedDevices.length !== 1 ? 's' : '' }}</div>
            </div>
          </div>
          <div class="info-item">
            <v-icon class="info-icon">mdi-information</v-icon>
            <div class="info-text">
              <div class="info-description">
                SCRCPY windows are running in separate processes. Click on any window to interact with that device.
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="card-actions">
        <v-btn
          class="action-btn danger-btn"
          size="large"
          variant="elevated"
          :loading="isLoading || isCleanupInProgress"
          :disabled="isCleanupInProgress"
          @click="stopStreaming"
        >
          <v-icon class="btn-icon">mdi-stop</v-icon>
          Stop Streaming
        </v-btn>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
//TODO ; régler le Probleme des ip vs ID
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue'
import { StreamingService, ScreenDimensions } from '../../services/StreamingService'
import { ScrcpyService } from '../../services/ScrcpyService'
import { deviceStore } from '../../store/deviceStore'

// State
const isLoading = ref(false)
const errorMessage = ref('')
const isScrcpyAvailable = ref(false)
const isStreaming = ref(false)
const isCleanupInProgress = ref(false)
const screenDimensions = ref<ScreenDimensions>({ width: 0, height: 0 })
const deviceStreamingStatus = ref<Record<string, boolean>>({})
const cellPositions = ref<Array<{ x: number, y: number, width: number, height: number }>>([])

// Computed
const selectedDevices = computed(() => {
  return deviceStore.state.value.devices
    .filter(device => deviceStore.selectedDevices.value.includes(device.id))
})

// Watcher pour vérifier l'état du nettoyage des processus ADB
setInterval(() => {
  isCleanupInProgress.value = ScrcpyService.isCleanupInProgress()
}, 100)

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
    //get the id of the device
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
  if (isCleanupInProgress.value) {
    console.log('Cleanup in progress, cannot restart stream');
    return;
  }
  try {
    isLoading.value = true;
    // Mettre à jour le statut de streaming
    deviceStreamingStatus.value[deviceId] = false;
    
    // Arrêter le stream existant pour cet appareil
    await StreamingService.stopDeviceStream(deviceId);
    
    // Récupérer la position de la cellule
    const cell = cellPositions.value[index];
    
    // Trouver l'appareil
    const device = selectedDevices.value.find(d => d.id === deviceId);
    
    if (device && device.tcpId) {
      // Redémarrer le stream avec les mêmes options
      const success = await StreamingService.startDeviceStream(device.tcpId, {
        x: cell.x,
        y: cell.y,
        width: cell.width,
        height: cell.height,
        title: `Device ${deviceId}`,
        noBorder: true,
        alwaysOnTop: true,
        //noControl: selectedDevices.value.length > 1,
        maxSize: 0,
        crop: device.screenWidth && device.screenHeight ? 
          StreamingService.calculateOptimalCrop(device) : 
          `${screenDimensions.value.width}:${screenDimensions.value.height}:0:0`
      });
      
      // Mettre à jour le statut de streaming
      deviceStreamingStatus.value[deviceId] = success;
    }
  } catch (error) {
    console.error(`Error restarting stream for device ${deviceId}:`, error);
    errorMessage.value = `Error restarting stream for device ${deviceId}`;
  } finally {
    isLoading.value = false;
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
/* Container */
.streaming-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #0c1221 0%, #1e293b 50%, #0f172a 100%);
  padding: 2rem;
  position: relative;
}

/* Streaming Overlay */
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
  background: linear-gradient(135deg, rgba(6, 6, 6, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%);
  backdrop-filter: blur(20px);
}

.streaming-grid {
  flex: 1;
  display: grid;
  position: relative;
  gap: 4px;
  padding: 1rem;
}

.streaming-cell {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  pointer-events: auto;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 16px;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.streaming-cell:hover {
  border-color: rgba(59, 130, 246, 0.4);
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%);
  transform: scale(1.02);
}

.streaming-cell-content {
  text-align: center;
}

.streaming-controls {
  height: 120px;
  display: flex;
  justify-content: center;
  align-items: center;
  pointer-events: auto;
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%);
  border-top: 1px solid rgba(59, 130, 246, 0.2);
  backdrop-filter: blur(20px);
  padding: 1rem;
}

/* Header Section */
.streaming-header {
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 24px;
  padding: 2rem;
  margin-bottom: 2rem;
  position: relative;
  overflow: hidden;
}

.streaming-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, rgba(59, 130, 246, 0.5) 50%, transparent 100%);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 2rem;
}

.header-title {
  position: relative;
}

.title-text {
  font-size: 2.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #10b981 100%);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  margin: 0;
  text-shadow: 0 0 30px rgba(59, 130, 246, 0.3);
}

.title-gradient {
  position: absolute;
  bottom: -8px;
  left: 0;
  width: 60%;
  height: 3px;
  background: linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #10b981 100%);
  border-radius: 2px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.status-chips {
  display: flex;
  gap: 0.75rem;
}

.status-chip {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 12px;
  backdrop-filter: blur(10px);
  color: #e2e8f0;
  font-size: 0.875rem;
  font-weight: 500;
}

.status-chip.active {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(59, 130, 246, 0.2) 100%);
  border-color: rgba(16, 185, 129, 0.4);
  color: #10b981;
}

.chip-icon {
  font-size: 1rem;
}

/* Modern Buttons */
.action-btn {
  border-radius: 16px !important;
  text-transform: none !important;
  font-weight: 600 !important;
  padding: 0 2rem !important;
  height: 48px !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3) !important;
  transition: all 0.3s ease !important;
  position: relative !important;
  overflow: hidden !important;
}

.primary-btn {
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%) !important;
  color: white !important;
}

.primary-btn:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 12px 40px rgba(59, 130, 246, 0.4) !important;
}

.secondary-btn {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%) !important;
  border: 1px solid rgba(59, 130, 246, 0.3) !important;
  color: #3b82f6 !important;
  backdrop-filter: blur(10px) !important;
}

.secondary-btn:hover {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%) !important;
  border-color: rgba(59, 130, 246, 0.5) !important;
  transform: translateY(-2px) !important;
}

.danger-btn {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%) !important;
  color: white !important;
}

.danger-btn:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 12px 40px rgba(239, 68, 68, 0.4) !important;
}

.btn-icon {
  margin-right: 0.5rem !important;
}

/* Restart Button in Streaming Overlay */
.restart-btn {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.9) 0%, rgba(139, 92, 246, 0.9) 100%) !important;
  color: white !important;
  border-radius: 16px !important;
  padding: 1rem 2rem !important;
  min-height: 80px !important;
  flex-direction: column !important;
  gap: 0.5rem !important;
  backdrop-filter: blur(20px) !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
}

.restart-btn:hover {
  transform: translateY(-2px) scale(1.05) !important;
  box-shadow: 0 12px 40px rgba(59, 130, 246, 0.5) !important;
}

.restart-icon {
  font-size: 2rem !important;
}

.restart-text {
  font-weight: 600 !important;
  font-size: 1rem !important;
}

.device-name {
  font-size: 0.75rem !important;
  opacity: 0.8 !important;
  margin-top: 0.25rem !important;
}

.stop-streaming-btn {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%) !important;
  color: white !important;
  border-radius: 20px !important;
  padding: 1rem 3rem !important;
  min-height: 64px !important;
  font-size: 1.2rem !important;
  font-weight: 700 !important;
  backdrop-filter: blur(20px) !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
}

.stop-streaming-btn:hover {
  transform: translateY(-3px) scale(1.05) !important;
  box-shadow: 0 16px 48px rgba(239, 68, 68, 0.5) !important;
}

.stop-icon {
  font-size: 1.5rem !important;
  margin-right: 0.75rem !important;
}

.stop-text {
  font-size: 1.2rem !important;
}

/* Modern Alerts */
.modern-alert {
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  border-left: 4px solid;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.error-alert {
  border-left-color: #ef4444;
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(30, 41, 59, 0.9) 100%);
}

.warning-alert {
  border-left-color: #f59e0b;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(30, 41, 59, 0.9) 100%);
}

.alert-content {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.alert-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
  margin-top: 0.125rem;
}

.error-alert .alert-icon {
  color: #ef4444;
}

.warning-alert .alert-icon {
  color: #f59e0b;
}

.alert-text {
  flex: 1;
}

.alert-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #f1f5f9;
  margin-bottom: 0.5rem;
}

.alert-message {
  color: #cbd5e1;
  line-height: 1.6;
  margin-bottom: 0.75rem;
}

.alert-details {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(59, 130, 246, 0.2);
}

.alert-details p {
  color: #94a3b8;
  margin-bottom: 0.75rem;
}

.alert-details code {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  font-family: 'Monaco', 'Menlo', monospace;
}

.download-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: #3b82f6;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.3s ease;
}

.download-link:hover {
  color: #60a5fa;
  transform: translateX(4px);
}

.link-icon {
  font-size: 1rem;
}

.alert-close-btn {
  color: #64748b !important;
  flex-shrink: 0;
}

.alert-close-btn:hover {
  color: #f1f5f9 !important;
  background: rgba(59, 130, 246, 0.1) !important;
}

/* Modern Cards */
.modern-card {
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
  position: relative;
}

.modern-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, rgba(59, 130, 246, 0.5) 50%, transparent 100%);
}

.modern-card:hover {
  border-color: rgba(59, 130, 246, 0.4);
  transform: translateY(-4px);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
}

.card-header {
  padding: 2rem 2rem 1rem;
  border-bottom: 1px solid rgba(59, 130, 246, 0.1);
}

.card-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #f1f5f9;
  margin: 0 0 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.card-subtitle {
  color: #94a3b8;
  font-size: 0.875rem;
  margin: 0;
}

.card-content {
  padding: 1.5rem 2rem;
}

.card-actions {
  padding: 1rem 2rem 2rem;
  display: flex;
  gap: 1rem;
  justify-content: flex-start;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 3rem 2rem;
}

.empty-icon-container {
  position: relative;
  display: inline-block;
  margin-bottom: 2rem;
}

.empty-icon {
  font-size: 4rem;
  color: #64748b;
  display: block;
}

.icon-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100px;
  height: 100px;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, transparent 70%);
  border-radius: 50%;
  animation: glow 3s ease-in-out infinite;
}

@keyframes glow {
  0%, 100% { opacity: 0.5; transform: translate(-50%, -50%) scale(1); }
  50% { opacity: 0.8; transform: translate(-50%, -50%) scale(1.1); }
}

.empty-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #f1f5f9;
  margin-bottom: 1rem;
}

.empty-description {
  color: #94a3b8;
  line-height: 1.6;
  margin-bottom: 2rem;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
}

.empty-action {
  margin-top: 2rem;
}

/* Devices List */
.devices-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.device-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 12px;
  transition: all 0.3s ease;
}

.device-item:hover {
  border-color: rgba(59, 130, 246, 0.4);
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
  transform: translateX(4px);
}

.device-status {
  flex-shrink: 0;
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #64748b;
  transition: all 0.3s ease;
}

.status-indicator.connected {
  background: #10b981;
  box-shadow: 0 0 12px rgba(16, 185, 129, 0.5);
}

.device-info {
  flex: 1;
}

.device-name {
  font-weight: 600;
  color: #f1f5f9;
  margin-bottom: 0.25rem;
}

.device-ip {
  font-size: 0.875rem;
  color: #94a3b8;
  font-family: 'Monaco', 'Menlo', monospace;
}

.device-icon {
  flex-shrink: 0;
  color: #64748b;
}

/* Streaming Info */
.streaming-info {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.info-item {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.info-icon {
  font-size: 1.25rem;
  color: #3b82f6;
  flex-shrink: 0;
  margin-top: 0.25rem;
}

.info-text {
  flex: 1;
}

.info-title {
  font-weight: 600;
  color: #f1f5f9;
  margin-bottom: 0.25rem;
}

.info-value {
  color: #3b82f6;
  font-weight: 500;
}

.info-description {
  color: #94a3b8;
  line-height: 1.6;
}

/* Responsive Design */
@media (max-width: 768px) {
  .streaming-container {
    padding: 1rem;
  }
  
  .header-content {
    flex-direction: column;
    align-items: stretch;
    gap: 1.5rem;
  }
  
  .title-text {
    font-size: 2rem;
  }
  
  .header-actions {
    justify-content: center;
    flex-wrap: wrap;
  }
  
  .status-chips {
    justify-content: center;
    flex-wrap: wrap;
  }
  
  .action-btn {
    flex: 1;
    min-width: 200px;
  }
  
  .card-header {
    padding: 1.5rem 1.5rem 1rem;
  }
  
  .card-content {
    padding: 1rem 1.5rem;
  }
  
  .card-actions {
    padding: 1rem 1.5rem 1.5rem;
    flex-direction: column;
  }
  
  .device-item {
    padding: 0.75rem;
  }
  
  .streaming-controls {
    height: 100px;
    padding: 0.75rem;
  }
  
  .stop-streaming-btn {
    padding: 0.75rem 2rem !important;
    min-height: 56px !important;
    font-size: 1rem !important;
  }
  
  .stop-text {
    font-size: 1rem !important;
  }
}

@media (max-width: 480px) {
  .streaming-container {
    padding: 0.75rem;
  }
  
  .title-text {
    font-size: 1.75rem;
  }
  
  .modern-card {
    border-radius: 16px;
  }
  
  .streaming-header {
    border-radius: 16px;
    padding: 1.5rem;
  }
}
</style>