/**
 * Service for handling streaming of multiple devices
 * Combines the SCRCPY service with device management
 */

import { ScrcpyService, StreamOptions } from './ScrcpyService'
import { deviceStore } from '../store/deviceStore'
import { Device } from '../types/device';


// Helper for screen dimensions
export interface ScreenDimensions {
  width: number;
  height: number;
}

export class StreamingService {
  /**
   * Start streaming a single device
   */
  static async startDeviceStream(deviceId: string, options: StreamOptions): Promise<boolean> {
    try {
      // Start the stream
      const result = await ScrcpyService.startStream(deviceId, options)
      
      // Update device streaming status
      if (result) {
        deviceStore.setDeviceStreaming(deviceId, true)
      }
      
      return result
    } catch (error) {
      console.error(`Error starting stream for device ${deviceId}:`, error)
      return false
    }
  }
  
  /**
   * Stop streaming a device
   */
  static async stopDeviceStream(deviceId: string): Promise<boolean> {
    try {
      const result = await ScrcpyService.stopStream(deviceId)
      
      // Update device streaming status
      if (result) {
        deviceStore.setDeviceStreaming(deviceId, false)
      }
      
      return result
    } catch (error) {
      console.error(`Error stopping stream for device ${deviceId}:`, error)
      return false
    }
  }


  static calculateOptimalCrop(screenWidth : number, screenHeight : number) {
    // Basé sur l'exemple: pour 3664x1920 → 1600:900:2017:510
    
    // Calculer les ratios par rapport à la résolution d'exemple
    const widthRatio = screenWidth / 3664;
    const heightRatio = screenHeight / 1920;
    
    // Appliquer ces ratios aux valeurs de crop optimales
    const cropWidth = Math.round(1600 * widthRatio);
    const cropHeight = Math.round(900 * heightRatio);
    
    // Le point de départ X est légèrement à droite du centre (2017 pour 3664)
    // Ce qui correspond à environ 55% de la largeur totale
    const cropX = Math.round(screenWidth * 0.55);
    
    // Le point Y est à environ 26.5% de la hauteur depuis le haut
    const cropY = Math.round(screenHeight * 0.265);
    console.log(`Screen: ${screenWidth}x${screenHeight}`);
    console.log(`Optimal crop: ${cropWidth}:${cropHeight}:${cropX}:${cropY}`);
    return `${cropWidth}:${cropHeight}:${cropX}:${cropY}`;
  }
  
  /**
   * Start streaming multiple devices in a mosaic layout
   */
  static async startMosaicStreaming(deviceIds: string[], screenDimensions: ScreenDimensions): Promise<boolean> {
    if (deviceIds.length === 0) {
      console.warn('No devices selected for mosaic streaming')
      return false
    }
    
    try {
      // First stop any existing streams
      await this.stopAllStreams()
      
      // Calculate grid dimensions
      const grid = this.calculateGrid(deviceIds.length)
      const cells = this.calculateCellPositions(grid.rows, grid.cols, screenDimensions)

      // Trim 100px from the screen height
      screenDimensions.height -= 500;

      
      let anyStarted = false;
      for (let index = 0; index < deviceIds.length; index++) {
        if (index >= cells.length) break;

        const deviceId = deviceIds[index];
        const device: Device | undefined = deviceStore.findDeviceByAnyId(deviceId);
        const cell = cells[index];
        const options: StreamOptions = {
          x: cell.x,
          y: cell.y,
          width: cell.width,
          height: cell.height,
          title: `Device ${deviceId}`,
          noBorder: true,
          alwaysOnTop: true,
          noControl: deviceIds.length > 1, // Disable control in mosaic mode (except for single device)
          maxSize: 0, // No limit for multi-screen,
          crop: device ? this.calculateOptimalCrop(device.screenWidth as number, device.screenHeight as number) : `${screenDimensions.width}:${screenDimensions.height}:0:0`
        };
        const result = await this.startDeviceStream(deviceId, options);
        if (result) anyStarted = true;
        // Add a delay between launches to avoid resource conflicts
        await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
      }
      return anyStarted;
    } catch (error) {
      console.error('Error starting mosaic streaming:', error)
      return false
    }
  }
  
  /**
   * Stop all streams
   */
  static async stopAllStreams(): Promise<boolean> {
    try {
      // Get active streams
      const activeStreams = await ScrcpyService.getActiveStreams()
      
      // Stop all streams
      const result = await ScrcpyService.stopAllStreams()
      
      // Update device streaming status for all previously streaming devices
      if (result) {
        activeStreams.forEach(deviceId => {
          deviceStore.setDeviceStreaming(deviceId, false)
        })
      }
      
      return result
    } catch (error) {
      console.error('Error stopping all streams:', error)
      return false
    }
  }
  
  /**
   * Calculate the optimal grid dimensions for the mosaic layout
   */
  private static calculateGrid(numDevices: number): { rows: number, cols: number } {
    if (numDevices <= 1) return { rows: 1, cols: 1 }
    if (numDevices <= 2) return { rows: 1, cols: 2 }
    if (numDevices <= 4) return { rows: 2, cols: 2 }
    if (numDevices <= 6) return { rows: 2, cols: 3 }
    if (numDevices <= 9) return { rows: 3, cols: 3 }
    if (numDevices <= 12) return { rows: 3, cols: 4 }
    return { rows: 4, cols: 4 } // Max 16 devices
  }
  
  /**
   * Calculate the position and size of each cell in the grid
   */
  private static calculateCellPositions(rows: number, cols: number, screen: ScreenDimensions): Array<{ x: number, y: number, width: number, height: number }> {
    const cells: Array<{ x: number, y: number, width: number, height: number }> = []
    
    // Calculate cell dimensions
    const cellWidth = Math.floor(screen.width / cols)
    const cellHeight = Math.floor(screen.height / rows)
    
    // Calculate positions for each cell
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        cells.push({
          x: col * cellWidth,
          y: row * cellHeight,
          width: cellWidth,
          height: cellHeight
        })
      }
    }
    
    return cells
  }
  
  /**
   * Check if scrcpy is available
   */
  static async isScrcpyAvailable(): Promise<boolean> {
    return await ScrcpyService.isScrcpyInstalled()
  }
}