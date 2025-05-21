import { RawDevice } from '../types/device'

// Use window.ipcRenderer from the context bridge instead of direct import
const ipcRenderer = window.ipcRenderer

/**
 * AdbService handles all interactions with the ADB binary
 * It communicates with the electron main process via IPC
 */
export class AdbService {
  /**
   * Get all connected devices via ADB
   */
  static async getDevices(): Promise<RawDevice[]> {
    try {
      return await ipcRenderer.invoke('adb:get-devices')
    } catch (error) {
      console.error('Failed to get devices:', error)
      return []
    }
  }

  /**
   * Connect to a device using its IP address
   */
  static async connectDevice(ipAddress: string): Promise<boolean> {
    try {
      return await ipcRenderer.invoke('adb:connect', ipAddress)
    } catch (error) {
      console.error(`Failed to connect to device at ${ipAddress}:`, error)
      return false
    }
  }

  /**
   * Disconnect from a device using its IP address
   */
  static async disconnectDevice(ipAddress: string): Promise<boolean> {
    try {
      return await ipcRenderer.invoke('adb:disconnect', ipAddress)
    } catch (error) {
      console.error(`Failed to disconnect device at ${ipAddress}:`, error)
      return false
    }
  }

  /**
   * Get the battery level of a device
   */
  static async getBatteryLevel(deviceId: string): Promise<number> {
    try {
      return await ipcRenderer.invoke('adb:battery-level', deviceId)
    } catch (error) {
      console.error(`Failed to get battery level for device ${deviceId}:`, error)
      return -1
    }
  }

  /**
   * Get the screen dimensions of a device
   */
  static async getScreenDimensions(deviceId: string): Promise<{ width: number, height: number }> {
    try {
      return await ipcRenderer.invoke('adb:screen-dimensions', deviceId)
    } catch (error) {
      console.error(`Failed to get screen dimensions for device ${deviceId}:`, error)
      return { width: 0, height: 0 }
    }
  }

  /**
   * Enable TCP/IP mode on a USB connected device
   */
  static async enableTcpIpMode(deviceId: string): Promise<boolean> {
    try {
      return await ipcRenderer.invoke('adb:enable-tcpip', deviceId)
    } catch (error) {
      console.error(`Failed to enable TCP/IP mode for device ${deviceId}:`, error)
      return false
    }
  }
  
  /**
   * Get the IP address of a device
   */
  static async getDeviceIpAddress(deviceId: string): Promise<string | null> {
    try {
      return await ipcRenderer.invoke('adb:get-ip-address', deviceId)
    } catch (error) {
      console.error(`Failed to get IP address for device ${deviceId}:`, error)
      return null
    }
  }

  /**
   * Get the serial number using getprop ro.boot.serialno
   */
  static async getSerialNumber(deviceId: string): Promise<string> {
    try {
      return await ipcRenderer.invoke('adb:get-serial-number', deviceId)
    } catch (error) {
      console.error(`Failed to get serial number for device ${deviceId}:`, error)
      return ''
    }
  }


  /**
   * Reboot a device
   */
  static async rebootDevice(deviceId: string): Promise<boolean> {
    try {
      return await ipcRenderer.invoke('adb:reboot', deviceId)
    } catch (error) {
      console.error(`Failed to reboot device ${deviceId}:`, error)
      return false
    }
  }
  
  /**
   * Convert USB device to TCP/IP mode and auto-connect
   * Returns success status, IP address, old USB ID, and new TCP/IP ID if successful
   */
  static async convertUsbToTcpIp(deviceId: string ): Promise<{ 
    success: boolean, 
    ipAddress: string | null,
    oldId: string,
    newId: string | null
  }> {
    try {
      return await ipcRenderer.invoke('adb:usb-to-tcpip', deviceId)
    } catch (error) {
      console.error(`Failed to convert USB device ${deviceId} to TCP/IP mode:`, error)
      return { 
        success: false, 
        ipAddress: null, 
        oldId: deviceId,
        newId: null
      }
    }
  }
}