<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { deviceStore } from '../../store/deviceStore'
import DeviceCard from './DeviceCard.vue'
import { DatabaseService } from '../../services/DatabaseService'

// State
const isLoading = ref(false)
const showAddDialog = ref(false)
const newDeviceIp = ref('')
const errorMessage = ref('')

// Methods
const loadDevices = async () => {
  isLoading.value = true
  errorMessage.value = ''
  
  try {
    // Use the updated device store to load from database and ADB
    await deviceStore.initialize()
  } catch (error) {
    console.error('Error loading devices:', error)
    errorMessage.value = 'Failed to load devices. Please try again.'
  } finally {
    isLoading.value = false
  }
}

const addDevice = async () => {
  if (!newDeviceIp.value) {
    errorMessage.value = 'Please enter an IP address'
    return
  }
  
  isLoading.value = true
  errorMessage.value = ''
  
  try {
    await deviceStore.connectDevice(newDeviceIp.value)
    newDeviceIp.value = ''
    showAddDialog.value = false
  } catch (error) {
    console.error('Error adding device:', error)
    errorMessage.value = 'Failed to add device. Please check the IP address.'
  } finally {
    isLoading.value = false
  }
}

const refreshDevices = async () => {
  try {
    isLoading.value = true
    errorMessage.value = ''
    
    // Reload devices from ADB
    await deviceStore.loadDevices()
  } catch (error) {
    console.error('Error refreshing devices:', error)
    errorMessage.value = 'Failed to refresh devices'
  } finally {
    isLoading.value = false
  }
}

// Lifecycle hooks
onMounted(async () => {
  try {
    // Initialize the device store (loads database and ADB devices)
    await deviceStore.initialize()
  } catch (error) {
    console.error('Error initializing in DeviceGrid:', error)
    errorMessage.value = 'Failed to initialize application'
  }
  
  // Set up polling for status updates
  setInterval(async () => {
    if (deviceStore.devices.value.length > 0) {
      await deviceStore.loadDevices() // Only refresh ADB devices, database is already loaded
    }
  }, 30000) // Update every 30 seconds
})
</script>

<template>
  <div>
    <v-row class="my-2">
      <v-col>
        <div class="d-flex justify-space-between align-center">
          <h2 class="text-h5">Devices</h2>
          <div>
            <v-btn
              color="primary"
              class="mx-1"
              prepend-icon="mdi-refresh"
              @click="refreshDevices"
              :loading="isLoading"
            >
              Refresh
            </v-btn>
            <v-btn
              color="success"
              class="mx-1"
              prepend-icon="mdi-plus"
              @click="showAddDialog = true"
            >
              Add Device
            </v-btn>
          </div>
        </div>
      </v-col>
    </v-row>

    <v-alert
      v-if="errorMessage"
      type="error"
      class="mt-2"
      closable
      @click:close="errorMessage = ''"
    >
      {{ errorMessage }}
    </v-alert>

    <v-row v-if="isLoading && deviceStore.devices.value.length === 0">
      <v-col class="d-flex justify-center">
        <v-progress-circular indeterminate color="primary" />
      </v-col>
    </v-row>
    
    <v-row v-else-if="deviceStore.devices.value.length === 0">
      <v-col class="d-flex justify-center">
        <v-card width="600" class="pa-4">
          <v-card-text class="text-center">
            <v-icon size="large" color="grey">mdi-cellphone-off</v-icon>
            
            <div v-if="errorMessage && errorMessage.includes('ADB')">
              <h3 class="text-h6 mt-4 text-red">ADB Not Installed</h3>
              <p class="mt-2">ADB (Android Debug Bridge) must be installed for this application to work properly.</p>
              
              <v-alert
                type="info"
                variant="outlined"
                title="How to install ADB"
                class="mt-4 text-left"
              >
                <ol>
                  <li>Download Android SDK Platform Tools from 
                    <a href="https://developer.android.com/tools/releases/platform-tools" target="_blank">
                      developer.android.com
                    </a>
                  </li>
                  <li>Extract the downloaded zip file</li>
                  <li>Copy <code>adb.exe</code> (Windows) or <code>adb</code> (macOS/Linux) to:
                    <br />
                    <code>public/adb/</code> in the application directory
                  </li>
                  <li>Restart the application</li>
                </ol>
              </v-alert>
            </div>
            <p v-else class="mt-2">No devices found. Connect a device or add one manually.</p>
          </v-card-text>
          <v-card-actions class="justify-center">
            <v-btn
              color="primary"
              variant="outlined"
              @click="showAddDialog = true"
            >
              Add Device
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <v-row v-else class="d-flex flex-wrap">
      <DeviceCard
        v-for="device in deviceStore.devices.value"
        :key="device.id"
        :device="device"
        class="ma-2"
      />
    </v-row>

    <!-- Add Device Dialog -->
    <v-dialog v-model="showAddDialog" max-width="500">
      <v-card>
        <v-card-title>Add New Device</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="newDeviceIp"
            label="IP Address"
            placeholder="192.168.1.100:5555"
            hint="Format: IP:PORT (default port is 5555)"
            :error-messages="errorMessage"
            @keyup.enter="addDevice"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            color="grey-darken-1"
            variant="text"
            @click="showAddDialog = false"
          >
            Cancel
          </v-btn>
          <v-btn
            color="primary"
            variant="text"
            @click="addDevice"
            :loading="isLoading"
          >
            Add
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>