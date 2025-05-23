import { ChildProcess, spawn, exec } from 'child_process';
import * as util from 'util';
import path from 'node:path';
import { StreamOptions } from '../../src/services/ScrcpyService';

// Fonction pour obtenir dynamiquement le chemin SCRCPY
function getScrcpyPath(): string {
  const vitePublic = process.env.VITE_PUBLIC;
  if (!vitePublic) {
    throw new Error('VITE_PUBLIC environment variable is not defined');
  }
  return path.join(vitePublic, 'scrcpy', process.platform === 'win32' ? 'scrcpy.exe' : 'scrcpy');
}

// Store active scrcpy processes and manage ADB processes
class ScrcpyManager {
  private activeStreams = new Map<string, ChildProcess>();
  private mainAdbServerPid: number | null = null;
  private execPromise = util.promisify(exec);
  private isCleanupInProgress = false;

  // Get all running ADB process PIDs
  async getAdbPids(): Promise<Set<number>> {
    try {
      const { stdout } = await this.execPromise('tasklist /fi "imagename eq adb.exe" /fo csv');
      const pids = new Set<number>();
      
      // Parse CSV output, skip header row
      const lines = stdout.split('\n').filter(line => line.trim().length > 0);
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',');
        if (parts.length >= 2) {
          // PID is the second column, remove quotes
          const pid = parseInt(parts[1].replace(/"/g, '').trim(), 10);
          if (!isNaN(pid)) {
            pids.add(pid);
          }
        }
      }
      return pids;
    } catch (error) {
      console.error('[ScrcpyManager] Error getting ADB PIDs:', error);
      return new Set<number>();
    }
  }
  
  // Identify the main ADB server PID before any streams are started
  // We consider the main ADB server to be the one running before we start any streams
  async identifyMainAdbServer(): Promise<void> {
    try {
      // If we already identified the main server, don't do it again
      if (this.mainAdbServerPid !== null) {
        console.log(`[ScrcpyManager] Main ADB server already identified with PID: ${this.mainAdbServerPid}`);
        return;
      }
      
      const pids = await this.getAdbPids();
      if (pids.size > 0) {
        // In most cases, there should be only one ADB server running
        // If there are multiple, we'll take the one with the lowest PID
        this.mainAdbServerPid = Math.min(...Array.from(pids));
        console.log(`[ScrcpyManager] Identified main ADB server with PID: ${this.mainAdbServerPid}`);
      } else {
        console.log('[ScrcpyManager] No ADB processes found before starting stream');
      }
    } catch (error) {
      console.error('[ScrcpyManager] Error identifying main ADB server:', error);
    }
  }

  // Kill all ADB processes except the main server
  async cleanupAdbProcesses(): Promise<void> {
    // Prevent concurrent cleanups
    if (this.isCleanupInProgress) {
      console.log('[ScrcpyManager] Cleanup already in progress, skipping...');
      return;
    }

    this.isCleanupInProgress = true;
    
    try {
      // Ensure we have identified the main ADB server
      if (this.mainAdbServerPid === null) {
        console.log('[ScrcpyManager] Main ADB server not identified, attempting to identify...');
        await this.identifyMainAdbServer();
      }
      
      // Get all current ADB processes
      const currentPids = await this.getAdbPids();
      const pidsToKill: number[] = [];
      
      // Find all PIDs except the main server
      currentPids.forEach(pid => {
        if (pid !== this.mainAdbServerPid) {
          pidsToKill.push(pid);
        }
      });
      
      if (pidsToKill.length > 0) {
        console.log(`[ScrcpyManager] Cleaning up ${pidsToKill.length} ADB processes:`, pidsToKill);
        console.log('[ScrcpyManager] Protecting main ADB server with PID:', this.mainAdbServerPid);
        
        for (const pid of pidsToKill) {
          try {
            await this.execPromise(`taskkill /PID ${pid} /F`);
            console.log(`[ScrcpyManager] Successfully killed process with PID: ${pid}`);
          } catch (killError) {
            console.error(`[ScrcpyManager] Failed to kill process with PID ${pid}:`, killError);
          }
        }
      } else {
        console.log('[ScrcpyManager] No additional ADB processes to clean up');
      }
    } catch (error) {
      console.error('[ScrcpyManager] Error cleaning up ADB processes:', error);
    } finally {
      this.isCleanupInProgress = false;
    }
  }

  // Store a new active stream
  setActiveStream(deviceId: string, process: ChildProcess): void {
    this.activeStreams.set(deviceId, process);
  }

  // Check if a stream is active
  hasActiveStream(deviceId: string): boolean {
    return this.activeStreams.has(deviceId);
  }

  // Get an active stream
  getActiveStream(deviceId: string): ChildProcess | undefined {
    return this.activeStreams.get(deviceId);
  }

  // Delete an active stream
  deleteActiveStream(deviceId: string): void {
    this.activeStreams.delete(deviceId);
  }

  // Identify the main ADB server before starting any streams
  async initializeAdbTracking(): Promise<void> {
    // Identify the main ADB server
    await this.identifyMainAdbServer();
    console.log('[ScrcpyManager] Main ADB server PID (protected):', this.mainAdbServerPid);
  }

  // Get all active device IDs
  getAllActiveDeviceIds(): string[] {
    return Array.from(this.activeStreams.keys());
  }
}

// Create a singleton instance
const scrcpyManager = new ScrcpyManager();

// Check if scrcpy is available
export async function isScrcpyInstalled(): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const proc = spawn(getScrcpyPath(), ['--version']);
      proc.on('error', () => resolve(false));
      proc.on('exit', (code) => resolve(code === 0));
    } catch {
      resolve(false);
    }
  });
}

// Convert stream options to command line arguments
export function optionsToArgs(options: StreamOptions, deviceId?: string): string[] {
  const args: string[] = [];

  if (options.width && options.height) {
    args.push('--window-width', options.width.toString());
    args.push('--window-height', options.height.toString());
  }
  if (options.x !== undefined && options.y !== undefined) {
    args.push('--window-x', options.x.toString());
    args.push('--window-y', options.y.toString());
  }
  if (options.maxFps) {
    args.push('--max-fps', String(options.maxFps));
  } else {
    args.push('--max-fps', '25');
  }
  if ((options as any).borderless || (options as any).noBorder) {
    args.push('--window-borderless');
  }
  if (options.alwaysOnTop) {
    args.push('--always-on-top');
  }
  if (options.fullscreen) {
    args.push('--fullscreen');
  }
  if (options.maxSize) {
    args.push('--max-size', String(options.maxSize));
  }
  if (options.bitrate) {
    args.push('--video-bit-rate', String(options.bitrate) + 'K');
  }
  if ((options as any).frameRate) {
    args.push('--max-fps', String((options as any).frameRate));
  }
  if (options.crop) {
    args.push('--crop', options.crop);
  }
  if (options.noControl) {
    args.push('--no-control');
  }
  if (!options.withAudio) {
    args.push('--no-audio');
  }
  if ((options as any).displayId !== undefined) {
    args.push('--display', String((options as any).displayId));
  }
  // Ajout du deviceId en tant que --serial
  if (deviceId) args.push('--serial', deviceId);
  return args;
}

// Start a scrcpy stream for a device
export async function startStream(deviceId: string, options: StreamOptions): Promise<boolean> {
  if (scrcpyManager.hasActiveStream(deviceId)) {
    return false;
  }
  
  // Identify the main ADB server if we haven't already
  await scrcpyManager.initializeAdbTracking();
  
  // Short delay to ensure ADB server is ready
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const args = optionsToArgs(options, deviceId);
  try {
    console.log(`[scrcpy] Command: ${getScrcpyPath()} ${args.join(' ')}`);
    const proc = spawn(getScrcpyPath(), args, { stdio: 'ignore' });
    scrcpyManager.setActiveStream(deviceId, proc);
    
    proc.on('exit', async () => {
      scrcpyManager.deleteActiveStream(deviceId);
      
      // Only clean up ADB processes if this was the last active stream
      if (scrcpyManager.getAllActiveDeviceIds().length === 0) {
        // Wait a moment before cleaning up to ensure all child processes have properly exited
        setTimeout(async () => {
          console.log('[scrcpy] Last stream closed, cleaning up ADB processes...');
          await scrcpyManager.cleanupAdbProcesses();
        }, 2000);
      }
    });
    
    return true;
  } catch (e) {
    console.error('[scrcpy] Failed to start:', e);
    return false;
  }
}

// Stop a scrcpy stream for a device
export async function stopStream(deviceId: string): Promise<boolean> {
  const proc = scrcpyManager.getActiveStream(deviceId);
  if (!proc) return false;
  
  try {
    proc.kill();
    scrcpyManager.deleteActiveStream(deviceId);
    
    // Wait a moment before cleaning up
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Clean up orphaned ADB processes
    await scrcpyManager.cleanupAdbProcesses();
    
    return true;
  } catch (error) {
    console.error('[scrcpy] Failed to stop stream:', error);
    return false;
  }
}

// Stop all scrcpy streams
export async function stopAllStreams(): Promise<boolean> {
  let stopped = true;
  const activeDeviceIds = scrcpyManager.getAllActiveDeviceIds();
  
  for (const deviceId of activeDeviceIds) {
    try {
      const success = await stopStream(deviceId);
      if (!success) {
        stopped = false;
      }
    } catch (error) {
      console.error(`[scrcpy] Error stopping stream for device ${deviceId}:`, error);
      stopped = false;
    }
  }
  
  // Only if all streams were stopped, clean up ADB processes
  if (stopped && scrcpyManager.getAllActiveDeviceIds().length === 0) {
    // Wait a moment before cleaning up
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('[scrcpy] All streams stopped, cleaning up ADB processes...');
    await scrcpyManager.cleanupAdbProcesses();
  }
  
  return stopped;
}
