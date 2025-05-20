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
    screenHeight: device.screenHeight
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
  
  // Load devices from ADB and merge with saved devices
  async loadDevices() {
    state.value.loading = true
    state.value.error = null
    
    try {
      // Get connected devices from ADB
      let adbDevices = await AdbService.getDevices()
      
      // Filtrage strict pour les devices TCP/IP
      // Certains peuvent être rapportés comme connectés par ADB alors qu'ils ne le sont plus réellement
      const verifiedDevices = [];
      for (const device of adbDevices) {
        // Si c'est un device TCP/IP, vérifier qu'on peut vraiment l'atteindre
        if (device.id.includes(':') && device.status === 'connected') {
          try {
            // On utilise getBatteryLevel comme test pratique de connectivité
            // Si cette commande réussit, le device est vraiment joignable
            console.log(`Vérification de connectivité réelle pour device TCP/IP ${device.id}...`);
            const batteryLevel = await AdbService.getBatteryLevel(device.id);
            
            if (batteryLevel === -1) {
              console.log(`Device TCP/IP ${device.id} marqué connecté par ADB mais non joignable (échec getBatteryLevel) - marqué déconnecté`);
              device.status = 'disconnected' as const;
            } else {
              console.log(`Device TCP/IP ${device.id} confirmé joignable (batteryLevel: ${batteryLevel})`);
              // Stocker le niveau de batterie obtenu
              device.batteryLevel = batteryLevel;
            }
          } catch (err) {
            console.log(`Erreur lors de la vérification de connectivité pour ${device.id} - marqué déconnecté`, err);
            device.status = 'disconnected' as const;
          }
        }
        verifiedDevices.push(device);
      }
      
      // Utiliser les devices vérifiés pour la suite
      adbDevices = verifiedDevices;
      
      // Check if we got a proper response
      if (adbDevices.length === 0) {
        // Check if we have saved devices - if not, might be an ADB error
        if (savedDevicesCache.value.size === 0) {
          console.warn('No devices found and no saved devices. ADB might not be properly set up.')
          state.value.error = 'ADB might not be properly installed. Check the console for details.'
        }
      }
      
      // Merge with saved devices and update statuses
      const mergedDevices: Device[] = []
      
      // First, build a mapping of USB to TCP/IP devices from our saved cache
      // This helps us identify USB devices that have TCP/IP counterparts
      const usbToTcpMap = new Map<string, string>();
      
      // Build the map from our saved devices
      for (const device of savedDevicesCache.value.values()) {
        if (device.previousId && device.id.includes(':')) {
          // This is a TCP/IP device with a previous USB ID
          usbToTcpMap.set(device.previousId, device.id);
        }
      }
      
      // Process and add connected devices
      for (const device of adbDevices) {
        let finalDevice: Device = { ...device };
        
        // Check if this USB device has a TCP/IP counterpart already connected
        if (!device.id.includes(':') && usbToTcpMap.has(device.id)) {
          const tcpDeviceId = usbToTcpMap.get(device.id);
          const tcpDevice = adbDevices.find(d => d.id === tcpDeviceId);
          
          // If the TCP/IP counterpart is already connected, skip this USB device
          if (tcpDevice && tcpDevice.status === 'connected') {
            console.log(`Skipping USB device ${device.id} as its TCP/IP counterpart ${tcpDeviceId} is connected`);
            continue;
          }
        }
        
        // Get battery level for connected devices
        if (device.status === 'connected') {
          const batteryLevel = await AdbService.getBatteryLevel(device.id)
          finalDevice.batteryLevel = batteryLevel
          const screenDimensions = await AdbService.getScreenDimensions(device.id)
          finalDevice.screenWidth = screenDimensions.width
          finalDevice.screenHeight = screenDimensions.height
          
          // Check if this is a USB-connected device (no IP address or IP in ID)
          // We'll attempt to get its IP and convert to TCP/IP mode for wireless connection
          const isUsbOnlyDevice = !finalDevice.ip && !device.id.includes(':');
          
          if (isUsbOnlyDevice) {
            console.log(`USB device detected: ${device.id} - Attempting to convert to TCP/IP mode`)
            
            // First try to get the device IP address
            const ipAddress = await AdbService.getDeviceIpAddress(device.id)
            
            if (ipAddress) {
              console.log(`Got IP address for ${device.id}: ${ipAddress}`)
              
              // Check if we already have a TCP/IP device with this IP address before converting
              const expectedTcpId = `${ipAddress}:5555`;
              const existingTcpDevice = this.findSavedDeviceByAnyId(expectedTcpId);
              
              if (existingTcpDevice) {
                console.log(`We already have a device with TCP/IP ID ${expectedTcpId}, skipping conversion`);

                
                // Update the relationship if needed
                if (existingTcpDevice.previousId !== device.id) {
                  console.log(`Updating the USB-TCP/IP relationship for ${device.id}`);
                  existingTcpDevice.previousId = device.id;
                  savedDevicesCache.value.set(existingTcpDevice.id, existingTcpDevice);
                  await DatabaseService.saveDevice(createSerializableDevice(existingTcpDevice));
                  
                  // Skip processing this USB device and handle the TCP one
                  continue;
                }
              } else {
                // Proceed with conversion only if we don't already have a TCP/IP device
                console.log(`No existing TCP/IP device found for ${ipAddress}, proceeding with conversion`);
                
                // Auto-convert to TCP/IP mode
                const result = await AdbService.convertUsbToTcpIp(device.id)
                
                if (result.success && result.ipAddress && result.newId) {
                  console.log(`Successfully converted ${device.id} to TCP/IP mode at ${result.ipAddress} with new ID ${result.newId}`)
                  
                  // Check if we already have a device with this IP-based ID (double-check)
                  const existingIpDevice = this.findSavedDeviceByAnyId(result.newId)
                  if (existingIpDevice) {
                    console.log(`Device with ID ${result.newId} already exists, updating status...`)
                    // Skip this device, as we'll process the new IP-based one later
                    continue
                  }
                  
                  // Update the device with the IP information
                  finalDevice.ip = result.ipAddress
                  
                  // Track the identity transition - OLD ID to NEW ID
                  finalDevice.previousId = result.oldId
                  
                  // We'll change the ID later when adding/merging this device
                  const nameParts = result.ipAddress.split('.')
                  finalDevice.name = nameParts[nameParts.length - 1]
                  
                  // The new device's ID will be the TCP/IP ID
                  finalDevice.id = result.newId
                  
                  // Mark this device for deletion from its original ID
                  // to prevent duplication across connection types
                  if (savedDevicesCache.value.has(result.oldId)) {
                    await DatabaseService.deleteDevice(result.oldId)
                    savedDevicesCache.value.delete(result.oldId)
                  }
                } else {
                  console.warn(`Could not convert ${device.id} to TCP/IP mode automatically`)
                }
              }
            }
          }
        }
        
        // Find if this device exists in our saved devices cache by any ID
        const savedDevice = this.findSavedDeviceByAnyId(device.id)
        
        if (savedDevice) {
          // If it exists, keep saved properties (like name) but update status, battery and IP
          finalDevice = {
            ...savedDevice,                 // Preserve saved properties, especially custom name
            status: device.status,          // Update status from ADB
            batteryLevel: finalDevice.batteryLevel,   // Update battery from ADB
            ip: finalDevice.ip || savedDevice.ip, // Use new IP if available, otherwise keep saved IP
            model: finalDevice.model || savedDevice.model, // Update model if not saved
            screenWidth: finalDevice.screenWidth || savedDevice.screenWidth,
            screenHeight: finalDevice.screenHeight || savedDevice.screenHeight,
            // Keep track of previous ID if it exists
            previousId: savedDevice.previousId || 
                       (device.id !== savedDevice.id ? device.id : undefined)
          }
          
          // If IDs differ and this is not already tracked by previousId
          if (device.id !== savedDevice.id && savedDevice.previousId !== device.id) {
            console.log(`Device ID changed from ${device.id} to ${savedDevice.id}, tracking this relationship`)
            finalDevice.previousId = device.id
            
            // Clean up old ID entry to prevent duplication
            if (savedDevicesCache.value.has(device.id)) {
              await DatabaseService.deleteDevice(device.id)
              savedDevicesCache.value.delete(device.id)
            }
          }
          
          // Update device in cache
          savedDevicesCache.value.set(finalDevice.id, finalDevice)
          
          // Create a serializable copy for database storage
          const deviceForStorage = createSerializableDevice(finalDevice)
          
          // Save to database
          await DatabaseService.saveDevice(deviceForStorage)
        } else {
          // This is a new device discovered via ADB - automatically save it 
          // Extract name from IP (last segment) if available
          if (finalDevice.ip && (!finalDevice.name || finalDevice.name === finalDevice.id)) {
            const nameParts = finalDevice.ip.split('.')
            finalDevice.name = nameParts[nameParts.length - 1]
          } else if (!finalDevice.name || finalDevice.name === finalDevice.id) {
            // Use a friendly default name if no IP
            finalDevice.name = `Device ${finalDevice.id.substring(0, 4)}`
          }
          
          // Save to cache
          savedDevicesCache.value.set(finalDevice.id, finalDevice)
          
          // Create a serializable copy for database storage
          const deviceForStorage = createSerializableDevice(finalDevice)
          
          // Save to database
          await DatabaseService.saveDevice(deviceForStorage)
        }
        
        mergedDevices.push(finalDevice)
      }
      
      // Then add saved devices that are not currently connected
      for (const [id, device] of savedDevicesCache.value.entries()) {
        // Skip if device is already in the list
        if (!mergedDevices.some(d => d.id === id)) {
          // Si c'est un device TCP/IP
          if (device.id.includes(':')) {
            // Est-il présent dans adbDevices ?
            const stillConnected = adbDevices.some(d => d.id === device.id);
            if (!stillConnected) {
              // Marquer explicitement comme déconnecté partout
              const disconnectedDevice = {
                ...device,
                status: 'disconnected' as const,
                batteryLevel: undefined
              };
              savedDevicesCache.value.set(device.id, disconnectedDevice);
              await DatabaseService.saveDevice(createSerializableDevice(disconnectedDevice));
              mergedDevices.push(disconnectedDevice);
              continue;
            }
          }
          // Si c'est un device TCP/IP, vérifier si un USB avec previousId existe et est connecté
          if (device.id.includes(':') && device.previousId) {
            const usbDevice = mergedDevices.find(d => d.id === device.previousId && d.status === 'connected');
            if (usbDevice) {
              // Relancer la conversion TCP/IP automatiquement
              console.log(`TCP/IP device ${device.id} absent, USB ${usbDevice.id} connecté : relance automatique du switch TCP/IP.`);
              try {
                const result = await AdbService.convertUsbToTcpIp(usbDevice.id);
                if (result.success && result.ipAddress && result.newId) {
                  console.log(`Conversion USB->TCP/IP réussie pour ${usbDevice.id}`);
                  // Mettre à jour le device dans le cache et la DB
                  const updatedDevice = {
                    ...usbDevice,
                    id: result.newId,
                    ip: result.ipAddress,
                    previousId: usbDevice.id,
                    status: 'connected' as const,
                  };
                  savedDevicesCache.value.set(result.newId, updatedDevice);
                  await DatabaseService.saveDevice(createSerializableDevice(updatedDevice));
                  mergedDevices.push(updatedDevice);
                  continue; // On ne push pas l'ancien device TCP/IP déconnecté
                } else {
                  console.warn(`Echec de la reconversion USB->TCP/IP pour ${usbDevice.id}`);
                }
              } catch (err) {
                console.error(`Erreur lors de la reconversion USB->TCP/IP :`, err);
              }
            }
          }
          // Ajouter comme déconnecté sinon
          mergedDevices.push({
            ...device,
            status: 'disconnected' as const,
            batteryLevel: undefined,
          });
        }
      }
      
      state.value.devices = mergedDevices
    } catch (error) {
      console.error('Failed to load devices:', error)
      state.value.error = 'Failed to load devices: ' + 
        (error instanceof Error ? error.message : 'Unknown error')
    } finally {
      state.value.loading = false
    }
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
      state.value.error = `Error removing device: ${error instanceof Error ? error.message : error}`
    }
  },
  
  // Update a device's display name
  async updateDeviceName(deviceId: string, newName: string) {
    try {
      // Update in current devices
      const device = state.value.devices.find(d => d.id === deviceId)
      if (device) {
        device.name = newName
        
        // Also update in saved devices cache and database
        if (savedDevicesCache.value.has(deviceId)) {
          const savedDevice = savedDevicesCache.value.get(deviceId)!
          const updatedDevice = {
            ...savedDevice,
            name: newName
          }
          
          // Update in-memory cache
          savedDevicesCache.value.set(deviceId, updatedDevice)
          
          // Update serializable copy in database
          await DatabaseService.saveDevice(createSerializableDevice(updatedDevice))
        }
      }
    } catch (error) {
      console.error(`Error updating device ${deviceId} name in database:`, error)
      state.value.error = `Error updating device name: ${error instanceof Error ? error.message : error}`
    }
  },
  
  // Manually convert a USB device to TCP/IP mode
  async convertDeviceToTcpIp(deviceId: string): Promise<{ success: boolean, message: string }> {
    state.value.loading = true
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
  setDeviceStreaming(deviceId: string, isStreaming: boolean) {
    const device = this.findDeviceByAnyId(deviceId)
    if (device) {
      device.isStreaming = isStreaming
      
      // Also update in the cache and database if found
      const savedDevice = this.findSavedDeviceByAnyId(deviceId)
      if (savedDevice) {
        savedDevice.isStreaming = isStreaming
        savedDevicesCache.value.set(savedDevice.id, savedDevice)
        
        // Create a serializable copy of the device object for database storage
        const deviceForStorage = createSerializableDevice(savedDevice)
        
        // Save the clean object to the database
        DatabaseService.saveDevice(deviceForStorage).catch(error => {
          console.error(`Error updating streaming status for ${deviceId}:`, error)
        })
      }
    }
  }
}