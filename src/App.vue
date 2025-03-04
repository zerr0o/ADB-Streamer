<script setup lang="ts">
import { ref, onMounted } from 'vue'
import DeviceGrid from './components/device/DeviceGrid.vue'
import DeviceManager from './components/admin/DeviceManager.vue'
import StreamingView from './components/streaming/StreamingView.vue'
import { deviceStore } from './store/deviceStore'
import { DatabaseService } from './services/DatabaseService'

// State
const drawer = ref(false)
const currentView = ref('devices')
const isLoading = ref(true)
const initError = ref<string | null>(null)

// Navigation items
const navItems = [
  { title: 'Devices', icon: 'mdi-cellphone-link', value: 'devices' },
  { title: 'Administration', icon: 'mdi-cog', value: 'admin' },
  { title: 'Streaming', icon: 'mdi-cast', value: 'streaming' }
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

<template>
  <v-app>
    <!-- App Bar -->
    <v-app-bar>
      <v-app-bar-nav-icon @click="drawer = !drawer"></v-app-bar-nav-icon>
      <v-app-bar-title class="text-uppercase">
        ADB Management Interface
      </v-app-bar-title>
      <v-spacer></v-spacer>
      
      <!-- Show selected devices count if any -->
      <v-chip
        v-if="deviceStore.selectedDevices.value.length > 0"
        color="primary"
        class="mr-2"
        closable
        @click:close="clearSelectedDevices"
      >
        {{ deviceStore.selectedDevices.value.length }} device{{ deviceStore.selectedDevices.value.length > 1 ? 's' : '' }} selected
      </v-chip>
      
      <!-- Future: Stream button will be enabled when functionality is implemented -->
      <v-btn
        :disabled="deviceStore.selectedDevices.value.length === 0"
        color="success"
        prepend-icon="mdi-cast"
        variant="outlined"
        @click="setView('streaming')"
      >
        Stream
      </v-btn>
    </v-app-bar>

    <!-- Navigation Drawer -->
    <v-navigation-drawer v-model="drawer" temporary>
      <v-list>
        <v-list-item
          prepend-avatar="/logo.svg"
          title="ADB Streamer"
          subtitle="Manage your Android devices"
        ></v-list-item>
      </v-list>

      <v-divider></v-divider>

      <v-list density="compact" nav>
        <v-list-item
          v-for="item in navItems"
          :key="item.value"
          :value="item.value"
          :title="item.title"
          :prepend-icon="item.icon"
          :disabled="item.disabled"
          :active="currentView === item.value"
          @click="setView(item.value)"
        ></v-list-item>
      </v-list>
      
      <template v-slot:append>
        <div class="pa-2">
          <v-btn
            block
            prepend-icon="mdi-github"
            variant="tonal"
            color="grey"
            href="https://github.com/electron-vite/electron-vite-vue"
            target="_blank"
          >
            GitHub
          </v-btn>
        </div>
      </template>
    </v-navigation-drawer>

    <!-- Main Content -->
    <v-main>
      <v-container fluid>
        <!-- Loading overlay -->
        <v-overlay v-model="isLoading" class="align-center justify-center">
          <v-progress-circular indeterminate size="64" />
        </v-overlay>
        
        <!-- Error alert -->
        <v-alert
          v-if="initError"
          type="error"
          title="Initialization Error"
          closable
          class="mb-4"
          @click:close="initError = null"
        >
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
    <v-footer app class="d-flex flex-column">
      <div class="text-center">
        <p class="text-caption text-medium-emphasis">
          ADB Management Interface | Made with Electron, Vue 3, and Vuetify
        </p>
      </div>
    </v-footer>
  </v-app>
</template>

<style>
/* Global styles */
html, body {
  overflow-y: auto;
}
</style>
