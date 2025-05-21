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

