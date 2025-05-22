<template>
  <div class="device-grid-container">
    <!-- Header Section -->
    <div class="header-section">
      <div class="header-content">
        <div class="title-section">
          <h1 class="main-title">Connected Devices</h1>
          <p class="subtitle">Manage and monitor your Android devices</p>
        </div>
        <div class="action-section">
          <v-btn
            color="primary"
            variant="elevated"
            prepend-icon="mdi-refresh"
            @click="refreshDevices"
            :loading="isLoading"
            class="refresh-btn"
            size="large"
          >
            Refresh Devices
          </v-btn>
        </div>
      </div>
    </div>

    <!-- Alert Messages -->
    <v-alert
      v-if="errorMessage"
      type="error"
      variant="tonal"
      class="error-alert"
      closable
      @click:close="errorMessage = ''"
    >
      <template v-slot:title>
        <v-icon icon="mdi-alert-circle" class="mr-2"></v-icon>
        Connection Error
      </template>
      {{ errorMessage }}
    </v-alert>

    <!-- Loading State -->
    <div v-if="isLoading && deviceStore.devices.value.length === 0" class="loading-container">
      <div class="loading-content">
        <v-progress-circular 
          indeterminate 
          color="primary" 
          size="48"
          width="4"
        />
        <p class="loading-text">Scanning for devices...</p>
      </div>
    </div>
    
    <!-- Empty State -->
    <div v-else-if="deviceStore.devices.value.length === 0" class="empty-container">
      <v-card class="empty-card" variant="outlined">
        <v-card-text class="empty-content">
          <div class="empty-icon">
            <v-icon size="64" color="grey-lighten-1">mdi-cellphone-off</v-icon>
          </div>
          
          <div v-if="errorMessage && errorMessage.includes('ADB')" class="adb-error">
            <h2 class="error-title">ADB Not Installed</h2>
            <p class="error-description">
              ADB (Android Debug Bridge) must be installed for this application to work properly.
            </p>
            
            <v-alert
              type="info"
              variant="outlined"
              title="Installation Instructions"
              class="install-alert"
            >
              <ol class="install-steps">
                <li>
                  Download Android SDK Platform Tools from 
                  <a href="https://developer.android.com/tools/releases/platform-tools" target="_blank" class="external-link">
                    developer.android.com
                  </a>
                </li>
                <li>Extract the downloaded zip file</li>
                <li>
                  Copy <code class="code-snippet">adb.exe</code> (Windows) or <code class="code-snippet">adb</code> (macOS/Linux) to:
                  <br />
                  <code class="code-snippet">public/adb/</code> in the application directory
                </li>
                <li>Restart the application</li>
              </ol>
            </v-alert>
          </div>
          
          <div v-else class="no-devices">
            <h2 class="no-devices-title">No Devices Found</h2>
            <p class="no-devices-description">
              Connect a device via USB or ensure WiFi debugging is enabled.
            </p>
            <v-btn
              color="primary"
              variant="elevated"
              prepend-icon="mdi-plus"
              class="mt-4"
              @click="refreshDevices"
            >
              Scan for Devices
            </v-btn>
          </div>
        </v-card-text>
      </v-card>
    </div>

    <!-- Device Cards Grid -->
    <div v-else class="devices-grid">
      <div class="grid-header">
        <div class="device-count">
          <v-chip color="primary" variant="tonal" size="large" class="count-chip">
            <v-icon start icon="mdi-cellphone"></v-icon>
            {{ deviceStore.devices.value.length }} {{ deviceStore.devices.value.length === 1 ? 'Device' : 'Devices' }}
          </v-chip>
          <v-chip 
            v-if="deviceStore.selectedDevices.value.length > 0"
            color="success" 
            variant="tonal" 
            size="large" 
            class="selected-chip"
          >
            <v-icon start icon="mdi-check-circle"></v-icon>
            {{ deviceStore.selectedDevices.value.length }} Selected
          </v-chip>
        </div>
      </div>
      
      <div class="cards-container">
        <DeviceCard
          v-for="device in deviceStore.devices.value"
          :key="device.id"
          :device="device"
          class="device-card-wrapper"
        />
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue';
import { deviceStore } from '../../store/deviceStore';
import DeviceCard from './DeviceCard.vue';

export default defineComponent({
  name: 'DeviceGrid',
  components: {
    DeviceCard
  },
  setup() {
    // State
    const isLoading = ref(false);
    const errorMessage = ref('');

    const refreshDevices = async () => {
      try {
        isLoading.value = true;
        errorMessage.value = '';
        await deviceStore.loadDevices();
      } catch (error) {
        console.error('Error refreshing devices:', error);
        errorMessage.value = 'Failed to refresh devices';
      } finally {
        isLoading.value = false;
      }
    };

    // Lifecycle hooks
    onMounted(async () => {
      isLoading.value = true; 
      errorMessage.value = '';
      try {
        await deviceStore.initialize();
      } catch (error) {
        console.error('Error initializing in DeviceGrid:', error);
        errorMessage.value = 'Failed to initialize application';
      } finally {
        isLoading.value = false; 
      }
      
      const pollInterval = setInterval(async () => {
        if (deviceStore.devices.value.length > 0) {
          await deviceStore.loadDevices();
        }
      }, 10000); 

      // It's good practice to clear intervals when the component is unmounted
      // import { onUnmounted } from 'vue';
      // onUnmounted(() => {
      //   clearInterval(pollInterval);
      // });
    });

    return {
      isLoading,
      errorMessage,
      deviceStore, 
      refreshDevices
    };
  }
});
</script>

<style scoped>
.device-grid-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  padding: 24px;
}

.header-section {
  margin-bottom: 32px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 32px;
  border: 1px solid rgba(226, 232, 240, 0.5);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 24px;
}

.title-section {
  flex: 1;
  min-width: 300px;
}

.main-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 8px 0;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  font-size: 1.125rem;
  color: #64748b;
  margin: 0;
  font-weight: 400;
}

.action-section {
  display: flex;
  gap: 16px;
  align-items: center;
}

.refresh-btn {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8) !important;
  color: white !important;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.3);
  transition: all 0.3s ease;
  font-weight: 600;
  text-transform: none;
  letter-spacing: 0.5px;
}

.refresh-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.4);
}

.error-alert {
  margin-bottom: 24px;
  border-radius: 12px;
  border-left: 4px solid #ef4444;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 20px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(226, 232, 240, 0.5);
}

.loading-content {
  text-align: center;
}

.loading-text {
  margin-top: 16px;
  font-size: 1.1rem;
  color: #64748b;
  font-weight: 500;
}

.empty-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

.empty-card {
  max-width: 600px;
  width: 100%;
  border-radius: 20px;
  border: 1px solid rgba(226, 232, 240, 0.5);
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.empty-content {
  text-align: center;
  padding: 48px 32px;
}

.empty-icon {
  margin-bottom: 24px;
}

.adb-error {
  margin-top: 24px;
}

.error-title {
  color: #dc2626;
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 12px;
}

.error-description {
  color: #64748b;
  font-size: 1rem;
  margin-bottom: 24px;
  line-height: 1.6;
}

.install-alert {
  text-align: left;
  border-radius: 12px;
}

.install-steps {
  margin: 0;
  padding-left: 20px;
}

.install-steps li {
  margin-bottom: 8px;
  line-height: 1.6;
}

.external-link {
  color: #3b82f6;
  text-decoration: none;
  font-weight: 500;
}

.external-link:hover {
  text-decoration: underline;
}

.code-snippet {
  background: rgba(15, 23, 42, 0.1);
  padding: 2px 8px;
  border-radius: 6px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.875rem;
  color: #1e293b;
}

.no-devices {
  margin-top: 24px;
}

.no-devices-title {
  color: #1e293b;
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 12px;
}

.no-devices-description {
  color: #64748b;
  font-size: 1rem;
  margin-bottom: 24px;
  line-height: 1.6;
}

.devices-grid {
  background: rgba(255, 255, 255, 0.6);
  border-radius: 20px;
  padding: 32px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(226, 232, 240, 0.5);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.grid-header {
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.5);
}

.device-count {
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
}

.count-chip {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
  font-weight: 600;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.selected-chip {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  font-weight: 600;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.cards-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
  justify-items: center;
}

.device-card-wrapper {
  width: 100%;
  max-width: 280px;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .device-grid-container {
    padding: 16px;
  }
  
  .header-section {
    padding: 24px;
    margin-bottom: 24px;
  }
  
  .header-content {
    flex-direction: column;
    text-align: center;
    gap: 16px;
  }
  
  .main-title {
    font-size: 2rem;
  }
  
  .subtitle {
    font-size: 1rem;
  }
  
  .devices-grid {
    padding: 24px;
  }
  
  .cards-container {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}

@media (min-width: 1200px) {
  .cards-container {
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  }
}

@media (min-width: 1600px) {
  .cards-container {
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  }
}

/* Dark theme support */
@media (prefers-color-scheme: dark) {
  .device-grid-container {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  }
  
  .header-section,
  .devices-grid,
  .empty-card {
    background: rgba(30, 41, 59, 0.8);
    border-color: rgba(71, 85, 105, 0.5);
  }
  
  .loading-container {
    background: rgba(30, 41, 59, 0.6);
    border-color: rgba(71, 85, 105, 0.5);
  }
  
  .main-title {
    color: #f1f5f9;
  }
  
  .subtitle,
  .loading-text,
  .error-description,
  .no-devices-description {
    color: #94a3b8;
  }
  
  .no-devices-title {
    color: #f1f5f9;
  }
  
  .code-snippet {
    background: rgba(248, 250, 252, 0.1);
    color: #cbd5e1;
  }
}
</style>

