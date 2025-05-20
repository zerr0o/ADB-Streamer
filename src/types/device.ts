export interface Device {
  id: string;          // Unique identifier/serial number or IP:port
  previousId?: string; // Previous USB ID when converted to TCP/IP
  ip: string;          // IP address of the device
  name: string;        // Display name (last segment of IP)
  status: 'connected' | 'disconnected'; // Connection status
  batteryLevel?: number; // Current battery level (0-100)
  isStreaming?: boolean; // Whether the device is currently streaming
  model?: string;       // Device model
  screenWidth?: number; // Screen width in pixels
  screenHeight?: number; // Screen height in pixels
  
  // Nouveaux champs pour distinguer les connexions
  isTcpIp?: boolean;    // True if this is a TCP/IP device
  tcpConnected?: boolean; // True if connected via TCP/IP
  usbConnected?: boolean; // True if connected via USB
}

export interface DeviceState {
  devices: Device[];
  loading: boolean;
  error: string | null;
  selectedDevices: string[]; // IDs of selected devices for streaming
}