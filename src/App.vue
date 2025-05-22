<template>
  <v-app class="modern-app">
    <!-- App Bar -->
    <v-app-bar 
      class="modern-app-bar"
      elevation="0"
      height="80"
    >
      <v-app-bar-nav-icon 
        @click="drawer = !drawer" 
        class="nav-icon"
        size="large"
      ></v-app-bar-nav-icon>
      
      <v-app-bar-title class="app-title">
        <div class="title-container">
          <v-icon 
            size="32" 
            color="primary" 
            class="title-icon"
          >
            mdi-lightning-bolt
          </v-icon>
          <span class="title-text">ADB Streamer</span>
        </div>
      </v-app-bar-title>
      
      <v-spacer></v-spacer>
      
      <!-- Show selected devices count if any -->
      <v-chip
        v-if="deviceStore.selectedDevices.value.length > 0"
        color="success"
        variant="tonal"
        size="large"
        class="selected-chip mr-4"
        closable
        @click:close="clearSelectedDevices"
      >
        <v-icon start icon="mdi-check-circle" size="18"></v-icon>
        {{ deviceStore.selectedDevices.value.length }} device{{ deviceStore.selectedDevices.value.length > 1 ? 's' : '' }} selected
      </v-chip>
      
      <!-- Stream/View toggle button -->
      <v-btn
        :disabled="currentView === 'devices' && deviceStore.selectedDevices.value.length === 0"
        :color="currentView === 'streaming' ? 'primary' : 'success'"
        variant="elevated"
        size="large"
        class="view-toggle-btn mr-4"
        @click="currentView === 'devices' ? setView('streaming') : setView('devices')"
      >
        <v-icon 
          :icon="currentView === 'streaming' ? 'mdi-virtual-reality' : 'mdi-cast'" 
          start 
          size="20"
        ></v-icon>
        {{ currentView === 'streaming' ? 'Back to Devices' : 'Start Streaming' }}
      </v-btn>
    </v-app-bar>    <!-- Navigation Drawer -->
    <v-navigation-drawer v-model="drawer" temporary class="modern-drawer">
      <div class="drawer-header">
        <div class="drawer-title">
          <v-icon color="primary" size="40" class="mr-3">mdi-lightning-bolt</v-icon>
          <div>
            <h3 class="drawer-title-text">ADB Streamer</h3>
            <p class="drawer-subtitle">Manage VR Devices</p>
          </div>
        </div>
      </div>

      <v-divider class="drawer-divider"></v-divider>

      <v-list density="compact" nav class="drawer-nav">
        <v-list-item
          v-for="item in navItems"
          :key="item.value"
          :value="item.value"
          :title="item.title"
          :prepend-icon="item.icon"
          :active="currentView === item.value"
          @click="setView(item.value)"
          class="nav-item"
          variant="text"
        ></v-list-item>
      </v-list>
      
      <template v-slot:append>
        <div class="drawer-footer">
          <v-btn
            block
            append-icon="mdi-wrench"
            variant="tonal"
            color="primary"
            href="https://docs.google.com/document/d/1AV3D0fRl9Zzo5ZYlD_8oDttCqM2L3TX34vh-72rlazs/edit?usp=sharing"
            target="_blank"
            class="notice-btn"
          >
            Notice
          </v-btn>
          <p class="version-text">
            {{ version }}
          </p>
        </div>
      </template>
    </v-navigation-drawer>    <!-- Main Content -->
    <v-main class="modern-main">
      <v-container fluid class="main-container">
        <!-- Loading overlay -->
        <v-overlay v-model="isLoading" class="align-center justify-center loading-overlay">
          <div class="loading-content">
            <v-progress-circular 
              indeterminate 
              color="primary" 
              size="64"
              width="4"
            />
            <p class="loading-text mt-4">Initializing ADB Streamer...</p>
          </div>
        </v-overlay>
        
        <!-- Error alert -->
        <v-alert
          v-if="initError"
          type="error"
          variant="tonal"
          class="error-alert mb-6"
          closable
          @click:close="initError = null"
        >
          <template v-slot:title>
            <v-icon icon="mdi-alert-circle" class="mr-2"></v-icon>
            Initialization Error
          </template>
          {{ initError }}
        </v-alert>
        
        <!-- Devices View -->
        <DeviceGrid v-if="currentView === 'devices'" />
        
        <!-- Administration View -->
        <DeviceManager v-else-if="currentView === 'admin'" />
        
        <!-- Streaming View -->
        <StreamingView v-else-if="currentView === 'streaming'" />
      </v-container>
    </v-main>
    
    <!-- Footer -->
    <!-- <v-footer app class="d-flex flex-column">
      <div class="text-center">
        <p class="text-caption text-medium-emphasis">
          ADB Management Interface | Made with Electron, Vue 3, and Vuetify
        </p>
      </div>
    </v-footer> -->
  </v-app>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import DeviceGrid from './components/device/DeviceGrid.vue'
import DeviceManager from './components/admin/DeviceManager.vue'
import StreamingView from './components/streaming/StreamingView.vue'
import { deviceStore } from './store/deviceStore'

// State
const drawer = ref(false)
const currentView = ref('devices')
const isLoading = ref(true)
const initError = ref<string | null>(null)
const version = ref(process.env.VITE_APP_VERSION)


// Navigation items
const navItems = [
  { title: 'Devices', icon: 'mdi-virtual-reality', value: 'devices' },
  { title: 'Streaming', icon: 'mdi-cast', value: 'streaming' },
  { title: 'Administration', icon: 'mdi-cog', value: 'admin' }

]

// Methods
const setView = (view: string) => {
  currentView.value = view
  
  // On mobile, close drawer after selection
  if (window.innerWidth < 1024) {
    drawer.value = false
  }
}

const clearSelectedDevices = () => {
  deviceStore.clearSelectedDevices()
}

// Initialize the application
onMounted(async () => {


  try {
    isLoading.value = true
    
    // Initialize database and load devices
    await deviceStore.initialize()
    
  } catch (error) {
    console.error('Error initializing application:', error)
    initError.value = `Failed to initialize application: ${error instanceof Error ? error.message : String(error)}`
  } finally {
    isLoading.value = false
  }
})
</script>



<style scoped>
/* Modern App Styles */
.modern-app {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  min-height: 100vh;
}

.modern-app-bar {
  background: rgba(255, 255, 255, 0.9) !important;
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(226, 232, 240, 0.3);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08) !important;
}

.nav-icon {
  color: #475569 !important;
  transition: all 0.2s ease;
  border-radius: 10px;
}

.nav-icon:hover {
  background: rgba(59, 130, 246, 0.1) !important;
  color: #3b82f6 !important;
  transform: scale(1.05);
}

.app-title {
  font-weight: 700 !important;
}

.title-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.title-icon {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  border-radius: 10px;
  padding: 8px;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.title-text {
  font-size: 1.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, #1e293b, #475569);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.selected-chip {
  background: linear-gradient(135deg, #10b981, #059669) !important;
  color: white !important;
  font-weight: 600;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.view-toggle-btn {
  font-weight: 600 !important;
  border-radius: 12px !important;
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.3) !important;
  transition: all 0.3s ease !important;
  text-transform: none !important;
  letter-spacing: 0.5px;
}

.view-toggle-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.4) !important;
}

/* Modern Drawer Styles */
.modern-drawer {
  background: rgba(255, 255, 255, 0.95) !important;
  backdrop-filter: blur(12px);
  border-right: 1px solid rgba(226, 232, 240, 0.3);
}

.drawer-header {
  padding: 24px;
  background: linear-gradient(135deg, rgba(248, 250, 252, 0.8) 0%, rgba(241, 245, 249, 0.6) 100%);
  border-bottom: 1px solid rgba(226, 232, 240, 0.3);
}

.drawer-title {
  display: flex;
  align-items: center;
}

.drawer-title-text {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
  line-height: 1.2;
}

.drawer-subtitle {
  font-size: 0.875rem;
  color: #64748b;
  margin: 4px 0 0 0;
  line-height: 1.2;
}

.drawer-divider {
  border-color: rgba(226, 232, 240, 0.5) !important;
  margin: 0;
}

.drawer-nav {
  padding: 16px 12px;
}

.nav-item {
  margin-bottom: 8px;
  border-radius: 12px !important;
  transition: all 0.2s ease;
  font-weight: 500;
}

.nav-item:hover {
  background: rgba(59, 130, 246, 0.1) !important;
  transform: translateX(4px);
}

.nav-item.v-list-item--active {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(139, 92, 246, 0.1) 100%) !important;
  color: #3b82f6 !important;
  font-weight: 600;
}

.drawer-footer {
  padding: 24px;
  background: rgba(248, 250, 252, 0.6);
  border-top: 1px solid rgba(226, 232, 240, 0.3);
}

.notice-btn {
  font-weight: 600 !important;
  border-radius: 10px !important;
  margin-bottom: 16px;
  transition: all 0.2s ease;
}

.notice-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3) !important;
}

.version-text {
  font-size: 0.75rem;
  color: #94a3b8;
  text-align: center;
  margin: 0;
  font-weight: 500;
}

/* Modern Main Content */
.modern-main {
  background: transparent;
  min-height: calc(100vh - 80px);
}

.main-container {
  padding: 0;
  max-width: 100%;
}

.loading-overlay {
  background: rgba(15, 23, 42, 0.8) !important;
  backdrop-filter: blur(8px);
}

.loading-content {
  text-align: center;
  color: white;
}

.loading-text {
  font-size: 1.1rem;
  font-weight: 500;
  color: #f1f5f9;
}

.error-alert {
  border-radius: 12px;
  border-left: 4px solid #ef4444;
  background: rgba(254, 242, 242, 0.9) !important;
  backdrop-filter: blur(8px);
  margin: 24px;
}

/* Responsive Design */
@media (max-width: 768px) {
  .title-text {
    font-size: 1.25rem;
  }
  
  .selected-chip {
    display: none;
  }
  
  .view-toggle-btn {
    font-size: 0.875rem;
    padding: 8px 16px;
  }
  
  .drawer-header {
    padding: 20px;
  }
  
  .drawer-title-text {
    font-size: 1.125rem;
  }
}

/* Dark theme support */
@media (prefers-color-scheme: dark) {
  .modern-app {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  }
  
  .modern-app-bar {
    background: rgba(30, 41, 59, 0.9) !important;
    border-bottom-color: rgba(71, 85, 105, 0.3);
  }
  
  .modern-drawer {
    background: rgba(30, 41, 59, 0.95) !important;
    border-right-color: rgba(71, 85, 105, 0.3);
  }
  
  .drawer-header {
    background: linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.6) 100%);
    border-bottom-color: rgba(71, 85, 105, 0.3);
  }
  
  .drawer-title-text {
    color: #f1f5f9;
  }
  
  .drawer-subtitle {
    color: #94a3b8;
  }
  
  .drawer-footer {
    background: rgba(15, 23, 42, 0.6);
    border-top-color: rgba(71, 85, 105, 0.3);
  }
  
  .title-text {
    background: linear-gradient(135deg, #f1f5f9, #cbd5e1);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  
  .nav-icon {
    color: #cbd5e1 !important;
  }
  
  .nav-icon:hover {
    color: #3b82f6 !important;
  }
  
  .error-alert {
    background: rgba(127, 29, 29, 0.9) !important;
    color: #fecaca;
  }
}
</style>

<style>
/* Global styles */
html, body {
  overflow-y: auto;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* Vuetify component overrides */
.v-application {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: rgba(241, 245, 249, 0.5);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.5);
  border-radius: 4px;
  transition: background 0.2s ease;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 116, 139, 0.7);
}

@media (prefers-color-scheme: dark) {
  ::-webkit-scrollbar-track {
    background: rgba(30, 41, 59, 0.5);
  }
  
  ::-webkit-scrollbar-thumb {
    background: rgba(71, 85, 105, 0.5);
  }
  
  ::-webkit-scrollbar-thumb:hover {
    background: rgba(100, 116, 139, 0.7);
  }
}
</style>
