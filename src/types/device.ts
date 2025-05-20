export interface Device {
  id: string;          // Unique identifier/serial number or IP:port
  previousId?: string | null; // Previous USB ID when converted to TCP/IP
  ip?: string | null;         // IP address of the device (optional, e.g., for USB-only before IP discovery)
  name: string;        // Display name (last segment of IP)
  //status: 'connected' | 'disconnected'; // Connection status
  batteryLevel?: number; // Current battery level (0-100)
  isStreaming?: boolean; // Whether the device is currently streaming
  model?: string;       // Device model
  screenWidth?: number | undefined; // Screen width in pixels
  screenHeight?: number | undefined; // Screen height in pixels
  
  // Nouveaux champs pour distinguer les connexions
  //isTcpIp?: boolean;    // True if this is a TCP/IP device
  tcpConnected?: boolean; // True if connected via TCP/IP
  usbConnected?: boolean; // True if connected via USB
  
}


export interface RawDevice {
  id: string;
  ip: string | null;
  name: string;
  status: 'authorized' | 'unauthorized';
  model: string;
}

export interface DeviceState {
  devices: Device[];
  loading: boolean;
  error: string | null;
  selectedDevices: string[]; // IDs of selected devices for streaming
}