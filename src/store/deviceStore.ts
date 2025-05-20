import { ref, computed } from 'vue'
import { Device, DeviceState } from '../types/device'
import { AdbService } from '../services/AdbService'
import { DatabaseService } from '../services/DatabaseService'

// Create a reactive state
const state = ref<DeviceState>({
  devices: [],
  loading: false,
  error: null,
  selectedDevices: []
})

// Map to cache database data in memory for faster operations
const savedDevicesCache = ref<Map<string, Device>>(new Map())

// Device store with methods for device management
// Helper to create a serializable copy of a device for database storage
const createSerializableDevice = (device: Device): Device => {
  return {
    id: device.id,
    ip: device.ip || '',
    name: device.name || '',
    status: device.status,
    isStreaming: device.isStreaming || false,
    previousId: device.previousId,
    batteryLevel: device.batteryLevel,
    model: device.model,
    screenWidth: device.screenWidth,
    screenHeight: device.screenHeight,
    isTcpIp: device.isTcpIp,
    tcpConnected: device.tcpConnected,
    usbConnected: device.usbConnected
  }
}

export const deviceStore = {
  // State access
  state: computed(() => state.value),
  devices: computed(() => state.value.devices),
  loading: computed(() => state.value.loading),
  error: computed(() => state.value.error),
  selectedDevices: computed(() => state.value.selectedDevices),

  // Get a device by ID
  getDeviceById(id: string): Device | undefined {
    return state.value.devices.find(device => device.id === id)
  },

  // Find a device by either current ID or previous ID
  findDeviceByAnyId(id: string): Device | undefined {
    // First look for direct match by current ID
    const directMatch = state.value.devices.find(device => device.id === id)
    if (directMatch) return directMatch

    // Then check for devices where this ID is the previous ID (USB-to-TCP/IP conversion)
    return state.value.devices.find(device => device.previousId === id)
  },

  // Find a device in the saved devices cache by any ID
  findSavedDeviceByAnyId(id: string): Device | undefined {
    // Check for direct match in the cache
    if (savedDevicesCache.value.has(id)) {
      return savedDevicesCache.value.get(id)
    }

    // Check for previous ID match
    for (const device of savedDevicesCache.value.values()) {
      if (device.previousId === id) {
        return device
      }
    }

    return undefined
  },

  // Initialize the device store and load saved devices from the database
  async initialize() {
    try {
      // Initialize the database
      await DatabaseService.initDatabase()

      // Load saved devices from database into cache
      await this.loadSavedDevicesFromDb()

      // Load devices from ADB
      await this.loadDevices()
    } catch (error) {
      console.error('Failed to initialize device store:', error)
      state.value.error = 'Failed to initialize device store: ' +
        (error instanceof Error ? error.message : 'Unknown error')
    }
  },

  // Load saved devices from database into memory cache
  async loadSavedDevicesFromDb() {
    try {
      const devices = await DatabaseService.getAllDevices()
      savedDevicesCache.value.clear()

      // Populate the cache with devices from the database
      for (const device of devices) {
        savedDevicesCache.value.set(device.id, device)
      }

      return devices
    } catch (error) {
      console.error('Failed to load saved devices from database:', error)
      throw error
    }
  },



  /**
   * @summary Updates a device object with details fetched from ADB, like battery level and screen dimensions.
   * @param {Device} device - The device to update.
   * @returns {Promise<Device>} The updated device.
   * @private
   */
  async _updateAdbDeviceDetails(device: Device): Promise<Device> {
    if (device.status === 'connected') {
      // Battery level might have been fetched during TCP verification, but re-fetch if not or for USB.
      if (typeof device.batteryLevel === 'undefined') {
        device.batteryLevel = await AdbService.getBatteryLevel(device.id);
      }
      const screenDimensions = await AdbService.getScreenDimensions(device.id);
      device.screenWidth = screenDimensions.width;
      device.screenHeight = screenDimensions.height;
    }
    return device;
  },

  /**
   * @summary Attempts to automatically convert a USB-connected device to TCP/IP mode.
   * @param {Device} usbDevice - The USB device to attempt conversion on.
   * @param {Device[]} allAdbDevices - List of all devices currently reported by ADB.
   * @returns {Promise<{ finalDevice: Device; oldUsbIdToRemove?: string }>} Result of the conversion attempt.
   * `finalDevice` is the device to be used (original USB or new/updated TCP/IP).
   * `oldUsbIdToRemove` is populated if the USB device's entry should be removed from cache due to successful conversion to a new ID.
   * @private
   */
  async _attemptUsbToTcpAutoConversion(usbDevice: Device, allAdbDevices: Device[]): Promise<{ finalDevice: Device; oldUsbIdToRemove?: string }> {
    let finalDevice = { ...usbDevice }; // Work with a copy
    let oldUsbIdToRemove: string | undefined = undefined;

    const isUsbOnlyDevice = !finalDevice.ip && !finalDevice.id.includes(':');
    if (isUsbOnlyDevice && finalDevice.status === 'connected') {
      console.log(`USB device detected: ${finalDevice.id} - Attempting to convert to TCP/IP mode`);
      const ipAddress = await AdbService.getDeviceIpAddress(finalDevice.id);

      if (ipAddress) {
        console.log(`Got IP address for ${finalDevice.id}: ${ipAddress}`);
        const expectedTcpId = `${ipAddress}:5555`;

        // Check if a TCP/IP device with this IP is already connected via ADB or saved and connected
        const adbTcpDevice = allAdbDevices.find(d => d.id === expectedTcpId && d.tcpConnected);
        const savedTcpDevice = this.findSavedDeviceByAnyId(expectedTcpId);

        if (adbTcpDevice) {
          console.log(`TCP/IP counterpart ${expectedTcpId} for USB ${finalDevice.id} is already connected via ADB. Prioritizing TCP/IP.`);
          // The main loop will handle adbTcpDevice. This USB device might be skipped or handled based on usbToTcpMap.
          // No conversion needed here, the TCP device takes precedence.
        } else if (savedTcpDevice && savedTcpDevice.tcpConnected) {
          console.log(`Saved TCP/IP device ${expectedTcpId} for USB ${finalDevice.id} is marked as connected. Skipping conversion.`);
          if (savedTcpDevice.previousId !== finalDevice.id) {
            console.log(`Updating relationship for ${finalDevice.id} to existing TCP ${savedTcpDevice.id}`);
            savedTcpDevice.previousId = finalDevice.id;
            savedDevicesCache.value.set(savedTcpDevice.id, savedTcpDevice);
            await DatabaseService.saveDevice(createSerializableDevice(savedTcpDevice));
          }
          // Indicate that this USB device might be superseded by the existing active TCP device.
          // The caller will decide based on usbToTcpMap whether to skip this USB device.
        } else {
          console.log(`No existing active TCP/IP device found for ${ipAddress}, proceeding with conversion attempt for ${finalDevice.id}`);
          const result = await AdbService.convertUsbToTcpIp(finalDevice.id);
          if (result.success && result.ipAddress && result.newId) {
            console.log(`Successfully converted ${finalDevice.id} to TCP/IP mode at ${result.ipAddress} with new ID ${result.newId}`);

            // Important: The device ID changes here.
            oldUsbIdToRemove = result.oldId; // Mark original USB ID for potential cleanup

            finalDevice.id = result.newId;
            finalDevice.ip = result.ipAddress;
            finalDevice.previousId = result.oldId; // Link back to original USB ID
            finalDevice.isTcpIp = true;
            finalDevice.tcpConnected = true; // Assuming successful conversion implies connection
            finalDevice.usbConnected = false;

            // Update name if it was default or based on old ID
            if (!finalDevice.name || finalDevice.name === result.oldId || finalDevice.name.startsWith('Device ')) {
              const nameParts = result.ipAddress.split('.');
              finalDevice.name = nameParts[nameParts.length - 1];
            }
          } else {
            console.warn(`Could not convert ${finalDevice.id} to TCP/IP mode automatically.`);
          }
        }
      }
    }
    // Ensure IP is string | undefined
    finalDevice.ip = finalDevice.ip ?? undefined;
    return { finalDevice, oldUsbIdToRemove };
  },

  /**
   * @summary Synchronizes a device with the persisted state in cache and database.
   * Merges with existing saved data or saves as a new device. Manages `previousId` linkage.
   * @param {Device} deviceToSync - The device data from ADB (potentially after TCP/IP conversion).
   * @param {string} [originalAdbId] - The original ID from ADB if `deviceToSync.id` changed (e.g., after TCP/IP conversion).
   * @returns {Promise<Device>} The synchronized device, updated with any persisted data.
   * @private
   */
  async _synchronizeDeviceWithStorage(deviceToSync: Device, originalAdbId?: string): Promise<Device> {
    const idToSearch = deviceToSync.id; // This is the current ID (could be new TCP/IP ID)
    let finalDeviceState = { ...deviceToSync };

    const savedDevice = this.findSavedDeviceByAnyId(idToSearch) || (originalAdbId ? this.findSavedDeviceByAnyId(originalAdbId) : undefined);

    if (savedDevice) {
      console.log(`Device ${idToSearch} (or original ${originalAdbId}) found in cache. Merging with ID ${savedDevice.id}.`);
      // Merge: saved data (name, persisted ID) takes precedence, updated with current ADB status
      finalDeviceState = {
        ...savedDevice, // Start with persisted state (custom name, original ID, etc.)
        ...deviceToSync, // Overlay with fresh ADB data (status, battery, new IP if converted)
        id: savedDevice.id, // Ensure persisted ID is kept if different from deviceToSync.id (e.g. deviceToSync.id was temp USB id)
        name: savedDevice.name || deviceToSync.name, // Persisted name is king
      };

      // If the ADB reported ID is different from the saved device's primary ID, AND
      // it's not already tracked as previousId, update previousId.
      if (originalAdbId && originalAdbId !== savedDevice.id && savedDevice.previousId !== originalAdbId) {
        console.log(`Linking new previousId ${originalAdbId} to existing device ${savedDevice.id}`);
        finalDeviceState.previousId = originalAdbId;
        // Clean up any old cache entry for originalAdbId if it's not the primary ID
        if (savedDevicesCache.value.has(originalAdbId) && originalAdbId !== savedDevice.id) {
          await DatabaseService.deleteDevice(originalAdbId);
          savedDevicesCache.value.delete(originalAdbId);
        }
      }
    } else {
      console.log(`New device ${idToSearch} discovered. Saving.`);
      // This is a new device not found in cache by its current ID or original ADB ID.
      // Assign a default name if needed.
      if (!finalDeviceState.name || finalDeviceState.name === finalDeviceState.id) {
        if (finalDeviceState.ip) {
          const nameParts = finalDeviceState.ip.split('.');
          finalDeviceState.name = nameParts[nameParts.length - 1];
        } else {
          finalDeviceState.name = `Device ${finalDeviceState.id.substring(0, 4)}`;
        }
      }
    }

    // Ensure connection flags are consistent
    finalDeviceState.isTcpIp = finalDeviceState.id.includes(':') || !!finalDeviceState.ip;
    if (finalDeviceState.status === 'connected') {
      if (finalDeviceState.isTcpIp) finalDeviceState.tcpConnected = true;
      else finalDeviceState.usbConnected = true;
    } else {
      finalDeviceState.tcpConnected = false;
      finalDeviceState.usbConnected = false;
    }

    savedDevicesCache.value.set(finalDeviceState.id, finalDeviceState);
    await DatabaseService.saveDevice(createSerializableDevice(finalDeviceState));
    return finalDeviceState;
  },




  async SimpleLoadDevices(){
    state.value.loading = true
    state.value.error = null

    try {
      const RawDevices = await AdbService.getDevices()
      const savedDevices = await DatabaseService.getAllDevices()
      const devices : Device[] = [];


      //Pour chaque RawDevice, on vérifie si il existe dans savedDevices
      //Si oui, on ajoute le savedDevice à devices
      //Si non, on ajoute le RawDevice à devices
      for (const rawDevice of RawDevices) {
        const savedDevice = savedDevices.find(d => d.id === rawDevice.id)
        if (savedDevice) {
          console.log("%c Device " + rawDevice.id + " found in the cache", 'background: #bada55; color: #222')
          devices.push(savedDevice)
        } else {

          if (rawDevice.id.includes(':')) {
            console.log("This device does not exist in the cache and is not a TCP/IP device: " + rawDevice.id)
            continue;
          }

          let newDevice : Device = {
            id: rawDevice.id,
            name: rawDevice.name,
            ip: rawDevice.ip,
            batteryLevel: undefined,
            model: rawDevice.model,
            screenWidth: undefined,
            screenHeight: undefined,
            tcpConnected: false,
            usbConnected: true,
            isStreaming: false,
            previousId: undefined,
          }

          //get screen dimensions
          const screenDimensions = await AdbService.getScreenDimensions(rawDevice.id)
          newDevice.screenWidth = screenDimensions.width
          newDevice.screenHeight = screenDimensions.height
          
          //get battery level
          const batteryLevel = await AdbService.getBatteryLevel(rawDevice.id)
          newDevice.batteryLevel = batteryLevel

          const ipAddress = await AdbService.getDeviceIpAddress(rawDevice.id)
          newDevice.ip = ipAddress

          //add to cache
          savedDevicesCache.value.set(rawDevice.id, newDevice)

          devices.push(newDevice)
        }
      }

      //remove devices that are not in the cache
      for (const device of devices) {
        if (!savedDevicesCache.value.has(device.id)) {
          console.log("%c Device " + device.id + " removed from the cache", 'background: #ff0000; color: #222')
          devices.splice(devices.indexOf(device), 1)
        }
      }




      console.log(devices)
      state.value.devices = devices;
      
      
    } catch (error) {
      state.value.error = `Error loading devices: ${error}`
    } finally {
      state.value.loading = false
    }
    
  },



  /**
   * @summary Loads devices from ADB, merges them with saved device information,
   * handles device status updates, and manages USB to TCP/IP conversions.
   */
  async loadDevices() {

    await this.SimpleLoadDevices()
    return;

  },

  // Connect to a device by IP
  async connectDevice(ipAddress: string) {
    state.value.loading = true
    state.value.error = null

    try {
      const success = await AdbService.connectDevice(ipAddress)
      if (success) {
        // After connecting, refresh the device list
        // The loadDevices() method has been updated to automatically save new devices
        await this.loadDevices()

        // We don't need to manually save here since loadDevices() now
        // automatically saves all new devices with proper names
      } else {
        state.value.error = `Failed to connect to device at ${ipAddress}`
      }
    } catch (error) {
      console.error(`Error connecting to device at ${ipAddress}:`, error)
      state.value.error = `Error connecting to device: ${error}`
    } finally {
      state.value.loading = false
    }
  },

  // Disconnect a device
  async disconnectDevice(device: Device) {
    state.value.loading = true
    state.value.error = null

    try {
      if (device.ip) {
        const success = await AdbService.disconnectDevice(device.ip)
        if (success) {
          // Update status locally
          const index = state.value.devices.findIndex(d => d.id === device.id)
          if (index !== -1) {
            state.value.devices[index].status = 'disconnected'
            state.value.devices[index].batteryLevel = undefined
          }

          // Save disconnected status in the database to ensure device is remembered
          // even when disconnected

          // First make sure the device is in our cache
          if (!savedDevicesCache.value.has(device.id)) {
            // If it wasn't saved before, save it now
            savedDevicesCache.value.set(device.id, {
              ...device,
              status: 'disconnected',
              batteryLevel: undefined
            })
          } else {
            // Update the existing entry
            const savedDevice = savedDevicesCache.value.get(device.id)!
            const updatedDevice = {
              ...savedDevice,
              status: 'disconnected',
              batteryLevel: undefined
            }

            // Update in-memory cache
            savedDevicesCache.value.set(device.id, updatedDevice as Device)

            // Update in database
            await DatabaseService.saveDevice(updatedDevice as Device)
          }
        } else {
          state.value.error = `Failed to disconnect device ${device.name || device.id}`
        }
      }
    } catch (error) {
      console.error(`Error disconnecting device ${device.id}:`, error)
      state.value.error = `Error disconnecting device: ${error}`
    } finally {
      state.value.loading = false
    }
  },

  // Add a new device to saved devices
  async addDevice(device: Device) {
    try {
      // Save to our in-memory cache
      savedDevicesCache.value.set(device.id, device)

      // Save serializable copy to database
      await DatabaseService.saveDevice(createSerializableDevice(device))

      // Only add to current state if not already there
      if (!state.value.devices.some(d => d.id === device.id)) {
        state.value.devices.push(device)
      }
    } catch (error) {
      console.error(`Error adding device ${device.id} to database:`, error)
      // Still keep it in memory even if database fails
      state.value.error = `Error saving device: ${error instanceof Error ? error.message : error}`
    }
  },

  // Remove a device from saved devices
  async removeDevice(deviceId: string) {
    try {
      // Remove from in-memory cache
      savedDevicesCache.value.delete(deviceId)

      // Remove from database
      await DatabaseService.deleteDevice(deviceId)

      // Remove from current state if it's not connected
      const index = state.value.devices.findIndex(d => d.id === deviceId)
      if (index !== -1 && state.value.devices[index].status !== 'connected') {
        state.value.devices.splice(index, 1)
      }
    } catch (error) {
      console.error(`Error removing device ${deviceId} from database:`, error)
      state.value.error = null

      try {
        const device = this.getDeviceById(deviceId)
        if (!device) {
          state.value.error = `Device ${deviceId} not found`
          return { success: false, message: 'Device not found' }
        }

        // Skip if already connected via IP
        if (device.ip || device.id.includes(':')) {
          state.value.error = `Device ${device.name || deviceId} is already connected via IP`
          return {
            success: false,
            message: `Device is already in TCP/IP mode`
          }
        }

        // Check if device is connected via USB
        if (device.status !== 'connected') {
          state.value.error = `Device ${device.name || deviceId} must be connected via USB to convert to TCP/IP mode`
          return {
            success: false,
            message: 'Device must be connected via USB first'
          }
        }

        // Check if we already have a TCP/IP device with this device's IP
        // First get the IP address
        const ipAddress = await AdbService.getDeviceIpAddress(deviceId)
        if (!ipAddress) {
          state.value.error = `Could not determine IP address for device ${deviceId}`
          return {
            success: false,
            message: 'Could not determine device IP address'
          }
        }

        // Check if we already have a device with the expected TCP/IP ID
        const expectedTcpId = `${ipAddress}:5555`
        const existingTcpDevice = this.findSavedDeviceByAnyId(expectedTcpId)

        if (existingTcpDevice) {
          state.value.error = `A device with this IP (${ipAddress}) is already in TCP/IP mode`
          return {
            success: false,
            message: `Device already exists in TCP/IP mode as "${existingTcpDevice.name}"`
          }
        }

        // Convert the device to TCP/IP mode
        const result = await AdbService.convertUsbToTcpIp(deviceId)

        if (result.success && result.ipAddress && result.newId) {
          // Store the device properties we want to preserve
          const deviceName = device.name

          // Check if we already have a device with this new ID
          const existingDevice = this.findSavedDeviceByAnyId(result.newId)

          if (existingDevice) {
            console.log(`Device with TCP/IP ID ${result.newId} already exists, updating...`)

            // Update the existing device with the USB ID relationship
            const updatedDevice: Device = {
              ...existingDevice,
              status: 'connected',
              ip: result.ipAddress,
              model: device.model,
              previousId: deviceId
            }

            // Update in cache and database
            savedDevicesCache.value.set(updatedDevice.id, updatedDevice)
            await DatabaseService.saveDevice(createSerializableDevice(updatedDevice))

            // Remove the USB device to prevent duplication 
            if (savedDevicesCache.value.has(deviceId)) {
              savedDevicesCache.value.delete(deviceId)
              await DatabaseService.deleteDevice(deviceId)
            }
          } else {
            // Create a new device with the TCP/IP ID
            const tcpDevice: Device = {
              id: result.newId,
              previousId: deviceId, // Track the relationship
              name: deviceName,
              ip: result.ipAddress,
              status: 'connected',
              batteryLevel: device.batteryLevel,
              model: device.model

            }

            // Save the new TCP/IP device to cache
            savedDevicesCache.value.set(tcpDevice.id, tcpDevice)

            // Save serializable copy to database
            await DatabaseService.saveDevice(createSerializableDevice(tcpDevice))

            // Remove the USB device to prevent duplication
            if (savedDevicesCache.value.has(deviceId)) {
              savedDevicesCache.value.delete(deviceId)
              await DatabaseService.deleteDevice(deviceId)
            }
          }

          // Refresh the device list to show new connections
          await this.loadDevices()

          return {
            success: true,
            message: `Successfully converted to TCP/IP mode (${result.ipAddress})`
          }
        } else {
          state.value.error = `Failed to convert device ${device.name || deviceId} to TCP/IP mode`
          return {
            success: false,
            message: 'Failed to convert to TCP/IP mode'
          }
        }
      } catch (error) {
        console.error(`Error converting device ${deviceId} to TCP/IP mode:`, error)
        state.value.error = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        return {
          success: false,
          message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      } finally {
        state.value.loading = false
      }
    }
  },


  // Update the name of a device
  async updateDeviceName(deviceId: string, newName: string): Promise<void> {
    try {
      let deviceToUpdate: Device | undefined = this.getDeviceById(deviceId); // Check live devices first

      if (deviceToUpdate) {
        deviceToUpdate.name = newName; // Update live device state
      }

      // Check cache separately, as device might be disconnected but known
      const cachedDevice = savedDevicesCache.value.get(deviceId);
      if (cachedDevice) {
        cachedDevice.name = newName;
        deviceToUpdate = cachedDevice; // Ensure deviceToUpdate points to the (potentially cached-only) device
      }

      if (deviceToUpdate) {
        const serializableDevice = createSerializableDevice(deviceToUpdate);
        serializableDevice.name = newName; // Ensure name is correct on the copy

        await DatabaseService.saveDevice(serializableDevice);

        // Update the cache with the fully updated serializable device to ensure consistency
        savedDevicesCache.value.set(deviceId, serializableDevice);

        console.log(`Device name updated for ${deviceId} to ${newName} and saved.`);
      } else {
        console.warn(`Device not found for name update: ${deviceId}`);
        state.value.error = `Device ${deviceId} not found for name update.`;
      }
    } catch (error) {
      console.error(`Error updating device name for ${deviceId}:`, error);
      state.value.error = `Failed to update device name: ${error instanceof Error ? error.message : String(error)}`;
    }
  },

  // Convert a USB device to TCP/IP mode
  async convertDeviceToTcpIp(usbDeviceId: string): Promise<{ success: boolean; message: string; newDeviceId?: string }> {
    try {
      const originalDeviceInState = this.getDeviceById(usbDeviceId);
      if (!originalDeviceInState && !savedDevicesCache.value.has(usbDeviceId)) {
        const message = `USB Device not found for TCP/IP conversion: ${usbDeviceId}`;
        console.warn(message);
        state.value.error = message;
        return { success: false, message };
      }

      const sourceDeviceData = originalDeviceInState || savedDevicesCache.value.get(usbDeviceId)!;

      if (sourceDeviceData.isTcpIp || sourceDeviceData.id.includes(':')) {
        const message = `Device ${usbDeviceId} is already a TCP/IP device or has an IP-like ID. Attempting to ensure connection.`;
        console.warn(message);
        if (!sourceDeviceData.tcpConnected) {
          console.log(`Attempting to connect already TCP/IP device: ${sourceDeviceData.id}`);
          const ipToConnect = sourceDeviceData.ip || sourceDeviceData.id.split(':')[0];
          if (ipToConnect) {
            await this.connectDevice(ipToConnect);
            await this.loadDevices();
            const updatedDevice = this.getDeviceById(sourceDeviceData.id);
            if (updatedDevice?.tcpConnected) {
              return { success: true, message: `Device ${sourceDeviceData.id} is now connected via TCP/IP.`, newDeviceId: sourceDeviceData.id };
            } else {
              return { success: false, message: `Failed to connect TCP/IP device ${sourceDeviceData.id}.` };
            }
          } else {
            const errMsg = `Could not determine IP for already TCP/IP device: ${sourceDeviceData.id}`;
            console.error(errMsg);
            return { success: false, message: errMsg };
          }
        }
        return { success: true, message: `Device ${sourceDeviceData.id} was already TCP/IP and connected.`, newDeviceId: sourceDeviceData.id };
      }

      const conversionResult = await AdbService.convertUsbToTcpIp(usbDeviceId);

      if (conversionResult.success && conversionResult.newId && conversionResult.ipAddress) {
        const newTcpDeviceId = conversionResult.newId;
        const newIpAddress = conversionResult.ipAddress;
        console.log(`Device ${usbDeviceId} switched to TCP/IP. New ID is ${newTcpDeviceId}`);

        const newTcpDeviceData: Device = {
          ...createSerializableDevice(sourceDeviceData),
          id: newTcpDeviceId,
          previousId: usbDeviceId,
          ip: newIpAddress,
          name: sourceDeviceData.name,
          isTcpIp: true,
          usbConnected: false,
          tcpConnected: false,
          status: 'disconnected',
        };

        if (savedDevicesCache.value.has(usbDeviceId)) {
          savedDevicesCache.value.delete(usbDeviceId);
        }
        savedDevicesCache.value.set(newTcpDeviceId, newTcpDeviceData);
        await DatabaseService.saveDevice(newTcpDeviceData);
        await this.loadDevices();

        const finalTcpDevice = this.getDeviceById(newTcpDeviceId);
        if (finalTcpDevice?.tcpConnected) {
          return { success: true, message: `Device successfully switched to TCP/IP (${newTcpDeviceId}) and connected.`, newDeviceId: newTcpDeviceId };
        } else {
          // It switched but didn't connect automatically, which is common. User might need to manually connect if ADB daemon on device is slow to restart on new port.
          return { success: true, message: `Device switched to TCP/IP mode (${newTcpDeviceId}). You may need to manually connect if it doesn't appear automatically.`, newDeviceId: newTcpDeviceId };
        }
      } else {
        const message = `Failed to switch device ${usbDeviceId} to TCP/IP mode. ADB service reported: ${JSON.stringify(conversionResult)}. Ensure device is authorized and ADB is working.`;
        console.error(message);
        state.value.error = message;
        if (conversionResult.newId) { // It might have a new ID even if connection part failed
          await this.loadDevices();
        }
        return { success: false, message };
      }
    } catch (error) {
      const message = `Error in convertDeviceToTcpIp for ${usbDeviceId}: ${error instanceof Error ? error.message : String(error)}`;
      console.error(message);
      state.value.error = message;
      return { success: false, message };
    }
  },

  // Toggle device selection for streaming
  toggleDeviceSelection(deviceId: string) {
    const index = state.value.selectedDevices.indexOf(deviceId)
    if (index === -1) {
      // Add to selection
      state.value.selectedDevices.push(deviceId)
    } else {
      // Remove from selection
      state.value.selectedDevices.splice(index, 1)
    }
  },

  // Check if a device is selected
  isDeviceSelected(deviceId: string): boolean {
    return state.value.selectedDevices.includes(deviceId)
  },

  // Clear all device selections
  clearSelectedDevices() {
    state.value.selectedDevices = []
  },

  // Update device streaming status
  async setDeviceStreaming(deviceId: string, isStreaming: boolean) {
    try {
      const device = this.getDeviceById(deviceId)

      if (device) {
        // Vérifier que le device est connecté en TCP/IP pour le streaming
        if (isStreaming && device.tcpConnected !== true) {
          console.warn(`Tentative de streaming sur un appareil non connecté en TCP/IP: ${deviceId}`);
          return false;
        }

        // Update local state
        device.isStreaming = isStreaming

        // If it's in our saved devices, update it there too
        if (savedDevicesCache.value.has(deviceId)) {
          const savedDevice = savedDevicesCache.value.get(deviceId)!
          savedDevice.isStreaming = isStreaming

          // Save to database
          await DatabaseService.saveDevice(createSerializableDevice(savedDevice))
        } else {
          // If it's a new device that wasn't saved before, save it now
          savedDevicesCache.value.set(deviceId, device)
          await DatabaseService.saveDevice(createSerializableDevice(device))
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Error updating streaming status for device ${deviceId}:`, error)
      return false;
    }
  }
} 