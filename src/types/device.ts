export interface Device {
  id: string;          // Unique identifier/serial number or IP:port
  usbId?: string | null; // USB ID of the device (optional, e.g., for USB-only before IP discovery)
  tcpId?: string | null; // TCP ID of the device (optional, e.g., for TCP-only before USB discovery)
  //previousId?: string | null; // Previous USB ID when converted to TCP/IP
  ip?: string | null;         // IP address of the device (optional, e.g., for USB-only before IP discovery)
  name?: string | undefined;        // Display name (last segment of IP)
  batteryLevel?: number | undefined; // Current battery level (0-100)
  isStreaming?: boolean | undefined; // Whether the device is currently streaming
  model?: string | undefined;       // Device model
  screenWidth?: number | undefined; // Screen width in pixels
  screenHeight?: number | undefined; // Screen height in pixels
  
  // Nouveaux champs pour distinguer les connexions
  tcpConnected?: boolean; // True if connected via TCP/IP
  usbConnected?: boolean; // True if connected via USB
  
}


export interface RawDevice {
  id: string;
  ip: string | null;
  name: string;
  status: string;
  model: string;
}

export interface DeviceState {
  devices: Device[];
  loading: boolean;
  error: string | null;
  selectedDevices: string[]; // IDs of selected devices for streaming
}