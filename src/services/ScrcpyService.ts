/**
 * Service for launching and managing scrcpy instances
 * This allows capturing and displaying Android device screens
 */

// Use window.ipcRenderer from the context bridge
const ipcRenderer = window.ipcRenderer

export class ScrcpyService {
  /**
   * Start streaming for a specific device
   */
  static async startStream(deviceId: string, options: StreamOptions): Promise<boolean> {
    try {
      return await ipcRenderer.invoke('scrcpy:start-stream', deviceId, options)
    } catch (error) {
      console.error(`Failed to start stream for device ${deviceId}:`, error)
      return false
    }
  }

  /**
   * Stop streaming for a specific device
   */
  static async stopStream(deviceId: string): Promise<boolean> {
    try {
      return await ipcRenderer.invoke('scrcpy:stop-stream', deviceId)
    } catch (error) {
      console.error(`Failed to stop stream for device ${deviceId}:`, error)
      return false
    }
  }

  /**
   * Stop all streams
   */
  static async stopAllStreams(): Promise<boolean> {
    try {
      return await ipcRenderer.invoke('scrcpy:stop-all-streams')
    } catch (error) {
      console.error('Failed to stop all streams:', error)
      return false
    }
  }

  /**
   * Check if scrcpy is installed
   */
  static async isScrcpyInstalled(): Promise<boolean> {
    try {
      return await ipcRenderer.invoke('scrcpy:is-installed')
    } catch (error) {
      console.error('Failed to check if scrcpy is installed:', error)
      return false
    }
  }

  /**
   * Get all active stream processes
   */
  static async getActiveStreams(): Promise<string[]> {
    try {
      return await ipcRenderer.invoke('scrcpy:get-active-streams')
    } catch (error) {
      console.error('Failed to get active streams:', error)
      return []
    }
  }
}

// Options for configuring a scrcpy stream
export interface StreamOptions {
  x?: number           // Window X position
  y?: number           // Window Y position
  width?: number       // Window width
  height?: number      // Window height
  title?: string       // Window title
  borderless?: boolean // Borderless window
  alwaysOnTop?: boolean // Always on top
  fullscreen?: boolean // Fullscreen mode
  maxSize?: number     // Max dimension (width or height)
  bitrate?: number     // Video bitrate in Kbps
  frameRate?: number   // Frame rate
  crop?: string        // Crop (format: width:height:x:y)
  noBorder?: boolean   // No window border
  maxFps?: string      // Maximum frame rate
  noControl?: boolean  // Disable device control
  displayId?: number   // Display ID for multi-display devices
}