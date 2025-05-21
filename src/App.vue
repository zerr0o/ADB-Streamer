<template>
  <v-app >
    <!-- App Bar -->
    <v-app-bar>
      <v-app-bar-nav-icon @click="drawer = !drawer"></v-app-bar-nav-icon>
      <v-app-bar-title class="text-uppercase">
        ADB Streamer
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
        :disabled="currentView === 'devices' && deviceStore.selectedDevices.value.length === 0"
        color="green"
        width="300"
        class="mr-5 ml-5"
        variant="elevated"
        @click=" currentView === 'devices' ? setView('streaming') : setView('devices')"
      >
        <v-icon v-if="currentView === 'streaming'" start icon="mdi-virtual-reality"></v-icon>
        <v-icon v-else start icon="mdi-cast"></v-icon>
        {{ currentView === 'streaming' ? 'Go to Devices View' : 'Go to Streaming View' }}
      </v-btn>
    </v-app-bar>

    <!-- Navigation Drawer -->
    <v-navigation-drawer v-model="drawer" temporary>
      <v-list>
        <v-list-item
          title="ADB Streamer"

          class="pb-2"
        >
        <template v-slot:prepend>
          <v-icon color="red" size="40">mdi-lightning-bolt</v-icon>
        </template>
        <template v-slot:subtitle>
          <p class="pb-1">Manage VR Devices</p>
        </template>

        </v-list-item>
      </v-list>

      <v-divider></v-divider>

      <v-list density="compact" nav>
        <v-list-item
          v-for="item in navItems"
          :key="item.value"
          :value="item.value"
          :title="item.title"
          :prepend-icon="item.icon"
          :active="currentView === item.value"
          @click="setView(item.value)"
        ></v-list-item>
      </v-list>
      
      <template v-slot:append>
        <div class="pa-2">
          <v-btn
            block
            append-icon="mdi-wrench"
            variant="tonal"
            color="grey"
            href="https://docs.google.com/document/d/1AV3D0fRl9Zzo5ZYlD_8oDttCqM2L3TX34vh-72rlazs/edit?usp=sharing"
            target="_blank"
          >
          Notice
          </v-btn>
          <p class="mt-2 text-grey">
            {{ version }}
          </p>
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



<style>
/* Global styles */
html, body {
  overflow-y: auto;
}
</style>
