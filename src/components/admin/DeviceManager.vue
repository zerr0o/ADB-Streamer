<template>
  <div class="device-manager-container">
    <!-- Modern Header Section -->
    <div class="manager-header">
      <div class="header-content">
        <div class="header-title">
          <h1 class="title-text">Device Management</h1>
          <div class="title-gradient"></div>
          <p class="title-subtitle">Manage and configure your connected devices</p>
        </div>
        <div class="header-actions">
          <v-btn
            class="action-btn secondary-btn"
            size="large"
            variant="elevated"
            :loading="isLoading"
            @click="loadSavedDevices"
          >
            <v-icon class="btn-icon">mdi-refresh</v-icon>
            Refresh
          </v-btn>
          <v-btn
            class="action-btn danger-btn"
            size="large"
            variant="elevated"
            :loading="isLoading"
            @click="clearDatabase"
          >
            <v-icon class="btn-icon">mdi-delete</v-icon>
            Clear Database
          </v-btn>
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

    <!-- Modern Devices Table -->
    <div v-if="deviceStore.devices.value.length > 0" class="modern-card devices-table-card">
      <div class="card-header">
        <h3 class="card-title">
          <v-icon class="title-icon">mdi-devices</v-icon>
          Registered Devices
        </h3>
        <div class="card-subtitle">{{ deviceStore.devices.value.length }} device{{ deviceStore.devices.value.length !== 1 ? 's' : '' }} found</div>
      </div>
      <div class="card-content">
        <div class="table-container">
          <table class="modern-table">
            <thead>
              <tr class="table-header">
                <th>Device Info</th>
                <th>Connection</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="device in deviceStore.devices.value" :key="device.id" class="table-row">
                <td class="device-info-cell">
                  <div class="device-info">
                    <div class="device-main">
                      <div class="device-name">{{ device.name || 'Unknown Device' }}</div>
                      <div class="device-model">{{ device.model || 'Unknown Model' }}</div>
                    </div>
                    <div class="device-details">
                      <div class="detail-item">
                        <span class="detail-label">Serial:</span>
                        <span class="detail-value">{{ device.id }}</span>
                      </div>
                    </div>
                  </div>
                </td>
                <td class="connection-cell">
                  <div class="connection-info">
                    <div class="connection-item">
                      <span class="connection-label">IP:</span>
                      <span class="connection-value">{{ device.ip || 'N/A' }}</span>
                    </div>
                    <div class="connection-item">
                      <span class="connection-label">USB ID:</span>
                      <span class="connection-value">{{ device.usbId || 'N/A' }}</span>
                    </div>
                    <div class="connection-item">
                      <span class="connection-label">TCP ID:</span>
                      <span class="connection-value">{{ device.tcpId || 'N/A' }}</span>
                    </div>
                  </div>
                </td>
                <td class="status-cell">
                  <div class="status-chips">
                    <div class="status-chip" :class="{ 'connected': device.usbConnected }">
                      <v-icon class="status-icon">{{ device.usbConnected ? 'mdi-usb' : 'mdi-usb-off' }}</v-icon>
                      <span>USB</span>
                    </div>
                    <div class="status-chip" :class="{ 'connected': device.tcpConnected }">
                      <v-icon class="status-icon">{{ device.tcpConnected ? 'mdi-wifi' : 'mdi-wifi-off' }}</v-icon>
                      <span>TCP</span>
                    </div>
                  </div>
                </td>
                <td class="actions-cell">
                  <div class="action-buttons">
                    <v-btn
                      class="table-action-btn edit-btn"
                      size="small"
                      variant="text"
                      @click="editDevice(device)"
                    >
                      <v-icon>mdi-pencil</v-icon>
                    </v-btn>
                    <v-btn
                      class="table-action-btn delete-btn"
                      size="small"
                      variant="text"
                      @click="removeDevice(device)"
                    >
                      <v-icon>mdi-delete</v-icon>
                    </v-btn>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modern Empty State -->
    <div v-else class="modern-card empty-state-card">
      <div class="card-content">
        <div class="empty-state">
          <div class="empty-icon-container">
            <v-icon class="empty-icon">mdi-database-off</v-icon>
            <div class="icon-glow"></div>
          </div>
          <h3 class="empty-title">No Devices Found</h3>
          <p class="empty-description">
            No devices found in the database. Connect devices and scan for them to start managing your device fleet.
          </p>
          <div class="empty-action">
            <v-btn 
              class="action-btn primary-btn"
              variant="elevated"
              @click="loadSavedDevices"
              :loading="isLoading"
            >
              <v-icon class="btn-icon">mdi-refresh</v-icon>
              Scan for Devices
            </v-btn>
          </div>
        </div>
      </div>
    </div>

    <!-- Modern Edit Device Dialog -->
    <v-dialog v-model="showEditDialog" max-width="600" persistent>
      <div class="modern-dialog">
        <div class="dialog-header">
          <h3 class="dialog-title">Edit Device</h3>
          <div class="dialog-subtitle">Customize device information</div>
        </div>
        <div class="dialog-content">
          <div class="form-group">
            <label class="form-label">Device Name</label>
            <v-text-field
              v-model="editedName"
              placeholder="Enter device name"
              variant="outlined"
              :error-messages="errorMessage"
              @keyup.enter="saveDeviceName"
              class="modern-input"
            />
          </div>
        </div>
        <div class="dialog-actions">
          <v-btn
            class="action-btn secondary-btn"
            variant="text"
            @click="showEditDialog = false"
          >
            Cancel
          </v-btn>
          <v-btn
            class="action-btn primary-btn"
            variant="elevated"
            @click="saveDeviceName"
            :loading="isLoading"
          >
            <v-icon class="btn-icon">mdi-content-save</v-icon>
            Save Changes
          </v-btn>
        </div>
      </div>
    </v-dialog>
  </div>
</template>


<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { deviceStore } from '../../store/deviceStore'
import { Device } from '../../types/device'
import { DatabaseService } from '../../services/DatabaseService'

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


const clearDatabase = async () => {
  isLoading.value = true
  errorMessage.value = ''
  
  try {
    // Reinitialize the device store - this loads from database and ADB
    await DatabaseService.clearDevices()
    await loadSavedDevices()
  } catch (error) {
    console.error('Error loading saved devices:', error)
    errorMessage.value = 'Failed to load saved devices'
  } finally {
    isLoading.value = false
  }
}

const editDevice = (device: Device) => {
  currentDevice.value = device
  editedName.value = device.name || ''
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
/* Container */
.device-manager-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #0c1221 0%, #1e293b 50%, #0f172a 100%);
  padding: 2rem;
}

/* Header Section */
.manager-header {
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 24px;
  padding: 2rem;
  margin-bottom: 2rem;
  position: relative;
  overflow: hidden;
}

.manager-header::before {
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
  flex: 1;
}

.title-text {
  font-size: 2.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #10b981 100%);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  margin: 0 0 0.5rem;
  text-shadow: 0 0 30px rgba(59, 130, 246, 0.3);
}

.title-gradient {
  width: 60%;
  height: 3px;
  background: linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #10b981 100%);
  border-radius: 2px;
  margin-bottom: 0.75rem;
}

.title-subtitle {
  color: #94a3b8;
  font-size: 1rem;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 1rem;
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

/* Modern Alert */
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

.alert-content {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.alert-icon {
  font-size: 1.5rem;
  color: #ef4444;
  flex-shrink: 0;
  margin-top: 0.125rem;
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

.title-icon {
  color: #3b82f6;
}

.card-subtitle {
  color: #94a3b8;
  font-size: 0.875rem;
  margin: 0;
}

.card-content {
  padding: 1.5rem 2rem 2rem;
}

/* Modern Table */
.table-container {
  overflow-x: auto;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%);
  border: 1px solid rgba(59, 130, 246, 0.1);
}

.modern-table {
  width: 100%;
  border-collapse: collapse;
}

.table-header {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
}

.table-header th {
  padding: 1.5rem 1rem;
  text-align: left;
  font-weight: 600;
  color: #f1f5f9 !important;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid rgba(59, 130, 246, 0.2);
}

.table-row {
  transition: all 0.3s ease;
  border-bottom: 1px solid rgba(59, 130, 246, 0.1);
}

.table-row:hover {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%);
}

.table-row:last-child {
  border-bottom: none;
}

.table-row td {
  padding: 1.5rem 1rem;
  vertical-align: top;
}

/* Device Info Cell */
.device-info {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.device-main {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.device-name {
  font-size: 1rem;
  font-weight: 600;
  color: #f1f5f9;
}

.device-model {
  font-size: 0.875rem;
  color: #94a3b8;
}

.device-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.detail-item {
  display: flex;
  gap: 0.5rem;
}

.detail-label {
  font-size: 0.75rem;
  color: #64748b;
  font-weight: 500;
  min-width: 40px;
}

.detail-value {
  font-size: 0.75rem;
  color: #cbd5e1;
  font-family: 'Monaco', 'Menlo', monospace;
}

/* Connection Cell */
.connection-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.connection-item {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.connection-label {
  font-size: 0.75rem;
  color: #64748b;
  font-weight: 500;
  min-width: 60px;
}

.connection-value {
  font-size: 0.75rem;
  color: #cbd5e1;
  font-family: 'Monaco', 'Menlo', monospace;
}

/* Status Cell */
.status-chips {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.status-chip {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  color: #ef4444;
  font-size: 0.75rem;
  font-weight: 500;
  transition: all 0.3s ease;
}

.status-chip.connected {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%);
  border-color: rgba(16, 185, 129, 0.3);
  color: #10b981;
}

.status-icon {
  font-size: 0.875rem;
}

/* Actions Cell */
.action-buttons {
  display: flex;
  gap: 0.5rem;
}

.table-action-btn {
  width: 36px !important;
  height: 36px !important;
  border-radius: 8px !important;
  transition: all 0.3s ease !important;
}

.edit-btn {
  color: #3b82f6 !important;
  background: rgba(59, 130, 246, 0.1) !important;
}

.edit-btn:hover {
  background: rgba(59, 130, 246, 0.2) !important;
  transform: scale(1.1) !important;
}

.delete-btn {
  color: #ef4444 !important;
  background: rgba(239, 68, 68, 0.1) !important;
}

.delete-btn:hover {
  background: rgba(239, 68, 68, 0.2) !important;
  transform: scale(1.1) !important;
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

/* Modern Dialog */
.modern-dialog {
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.dialog-header {
  padding: 2rem 2rem 1rem;
  border-bottom: 1px solid rgba(59, 130, 246, 0.1);
}

.dialog-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #f1f5f9;
  margin: 0 0 0.5rem;
}

.dialog-subtitle {
  color: #94a3b8;
  font-size: 0.875rem;
  margin: 0;
}

.dialog-content {
  padding: 1.5rem 2rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #f1f5f9;
  margin-bottom: 0.5rem;
}

.modern-input {
  background: rgba(59, 130, 246, 0.05) !important;
  border-radius: 12px !important;
}

.modern-input :deep(.v-field) {
  background: rgba(59, 130, 246, 0.05) !important;
  border: 1px solid rgba(59, 130, 246, 0.2) !important;
  border-radius: 12px !important;
}

.modern-input :deep(.v-field:hover) {
  border-color: rgba(59, 130, 246, 0.4) !important;
}

.modern-input :deep(.v-field--focused) {
  border-color: #3b82f6 !important;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2) !important;
}

.dialog-actions {
  padding: 1rem 2rem 2rem;
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

/* Responsive Design */
@media (max-width: 768px) {
  .device-manager-container {
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
  
  .action-btn {
    flex: 1;
    min-width: 140px;
  }
  
  .table-container {
    overflow-x: auto;
  }
  
  .modern-table {
    min-width: 800px;
  }
  
  .card-header {
    padding: 1.5rem 1.5rem 1rem;
  }
  
  .card-content {
    padding: 1rem 1.5rem 1.5rem;
  }
  
  .dialog-actions {
    flex-direction: column;
  }
}

@media (max-width: 480px) {
  .device-manager-container {
    padding: 0.75rem;
  }
  
  .title-text {
    font-size: 1.75rem;
  }
  
  .modern-card {
    border-radius: 16px;
  }
  
  .manager-header {
    border-radius: 16px;
    padding: 1.5rem;
  }
  
  .table-header th {
    padding: 1rem 0.75rem;
  }
  
  .table-row td {
    padding: 1rem 0.75rem;
  }
}
</style>