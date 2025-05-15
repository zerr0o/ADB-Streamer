import { ChildProcess, spawn } from 'child_process';
import path from 'node:path';
import { StreamOptions } from '../../src/services/ScrcpyService';
import { ipcMain } from 'electron';

// Fonction pour obtenir dynamiquement le chemin SCRCPY
function getScrcpyPath(): string {
  const vitePublic = process.env.VITE_PUBLIC;
  if (!vitePublic) {
    throw new Error('VITE_PUBLIC environment variable is not defined');
  }
  return path.join(vitePublic, 'scrcpy', process.platform === 'win32' ? 'scrcpy.exe' : 'scrcpy');
}

// Store active scrcpy processes
const activeStreams = new Map<string, ChildProcess>();

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
  if ((options as any).displayId !== undefined) {
    args.push('--display', String((options as any).displayId));
  }
  // Ajout du deviceId en tant que --serial
  if (deviceId) args.push('--serial', deviceId);
  return args;
}

// Start a scrcpy stream for a device
export async function startStream(deviceId: string, options: StreamOptions): Promise<boolean> {
  if (activeStreams.has(deviceId)) {
    return false;
  }
  const args = optionsToArgs(options, deviceId);
  try {
    console.log(`[scrcpy] Command: ${getScrcpyPath()} ${args.join(' ')}`);
    const proc = spawn(getScrcpyPath(), args, { stdio: 'ignore' });
    activeStreams.set(deviceId, proc);
    proc.on('exit', () => {
      activeStreams.delete(deviceId);
    });
    return true;
  } catch (e) {
    console.error('[scrcpy] Failed to start:', e);
    return false;
  }
}

// Stop a scrcpy stream for a device
export async function stopStream(deviceId: string): Promise<boolean> {
  const proc = activeStreams.get(deviceId);
  if (!proc) return false;
  try {
    proc.kill();
    activeStreams.delete(deviceId);
    return true;
  } catch {
    return false;
  }
}

// Stop all scrcpy streams
export async function stopAllStreams(): Promise<boolean> {
  let stopped = true;
  for (const [deviceId, proc] of activeStreams.entries()) {
    try {
      proc.kill();
      activeStreams.delete(deviceId);
    } catch {
      stopped = false;
    }
  }
  return stopped;
}
