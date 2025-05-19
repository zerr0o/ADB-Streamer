<template>
  <div>
    <v-row class="my-2">
      <v-col>
        <div class="d-flex justify-space-between align-center">
          <h2 class="text-h5">Device Management</h2>
          <v-btn
            color="primary"
            prepend-icon="mdi-refresh"
            @click="loadSavedDevices"
            :loading="isLoading"
          >
            Refresh
          </v-btn>
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

    <v-table v-if="deviceStore.devices.value.length > 0">
      <thead>
        <tr >
          <th>Name</th>
          <th>Serial</th>
          <th>Model</th>
          <th>IP Address</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="device in deviceStore.devices.value" :key="device.id">
          <td>{{ device.name || 'Unknown' }}</td>
          <td>{{ device.id }}</td>
          <td>{{ device.model || 'Unknown' }}</td>
          <td>{{ device.ip || 'N/A' }}</td>
          <td>
            <v-chip
              size="small"
              :color="device.status === 'connected' ? 'success' : 'error'"
              :text-color="device.status === 'connected' ? 'white' : 'white'"
            >
              {{ device.status }}
            </v-chip>
          </td>
          <td>
            <v-btn
              icon
              variant="text"
              size="small"
              color="primary"
              @click="editDevice(device)"
            >
              <v-icon>mdi-pencil</v-icon>
            </v-btn>
            <v-btn
              icon
              variant="text"
              size="small"
              color="error"
              @click="removeDevice(device)"
              
            >
            <!-- :disabled="device.status === 'connected'" -->
              <v-icon>mdi-delete</v-icon>
            </v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>
    
    <v-card v-else class="pa-4 mt-4">
      <v-card-text class="text-center">
        <v-icon size="large" color="grey">mdi-database-off</v-icon>
        <p class="mt-2">No devices found in database.</p>
      </v-card-text>
    </v-card>

    <!-- Edit Device Dialog -->
    <v-dialog v-model="showEditDialog" max-width="500">
      <v-card>
        <v-card-title>Edit Device</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="editedName"
            label="Device Name"
            :error-messages="errorMessage"
            @keyup.enter="saveDeviceName"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            color="grey-darken-1"
            variant="text"
            @click="showEditDialog = false"
          >
            Cancel
          </v-btn>
          <v-btn
            color="primary"
            variant="text"
            @click="saveDeviceName"
            :loading="isLoading"
          >
            Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>


<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { deviceStore } from '../../store/deviceStore'
import { DatabaseService } from '../../services/DatabaseService'
import { Device } from '../../types/device'

// State
const isLoading = ref(false)
const showEditDialog = ref(false)
const currentDevice = ref<Device | null>(null)
const editedName = ref('')
const errorMessage = ref('')

// Methods
const loadSavedDevices = async () => {
  isLoading.value = true
  errorMessage.value = ''
  
  try {
    // Reinitialize the device store - this loads from database and ADB
    await deviceStore.initialize()
  } catch (error) {
    console.error('Error loading saved devices:', error)
    errorMessage.value = 'Failed to load saved devices'
  } finally {
    isLoading.value = false
  }
}

const editDevice = (device: Device) => {
  currentDevice.value = device
  editedName.value = device.name
  showEditDialog.value = true
}

const saveDeviceName = async () => {
  if (!currentDevice.value || !editedName.value) {
    errorMessage.value = 'Invalid device or name'
    return
  }
  
  isLoading.value = true
  errorMessage.value = ''
  
  try {
    // Use updated deviceStore method which updates both cache and database
    await deviceStore.updateDeviceName(currentDevice.value.id, editedName.value)
    showEditDialog.value = false
  } catch (error) {
    console.error('Error updating device name:', error)
    errorMessage.value = 'Failed to update device name'
  } finally {
    isLoading.value = false
  }
}

const removeDevice = async (device: Device) => {
  // Confirm first
  if (!window.confirm(`Are you sure you want to remove ${device.name || device.id}?`)) {
    return
  }
  
  isLoading.value = true
  errorMessage.value = ''
  
  try {
    // Use device store method that handles both cache and database removal
    await deviceStore.removeDevice(device.id)
  } catch (error) {
    console.error('Error removing device:', error)
    errorMessage.value = 'Failed to remove device'
  } finally {
    isLoading.value = false
  }
}

// Lifecycle hooks
onMounted(async () => {
  try {
    // Initialize database and load devices
    await deviceStore.initialize()
  } catch (error) {
    console.error('Error initializing database in DeviceManager:', error)
    errorMessage.value = 'Failed to initialize database'
  }
})
</script>


<style scoped>

/* text-align: center; sur th */
th {
  text-align: center !important;
  color: white !important;
  
}



</style>