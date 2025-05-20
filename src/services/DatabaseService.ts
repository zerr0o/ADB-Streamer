import { Device } from '../types/device'

// Database name and store
const DB_NAME = 'adb-streamer-db'
const DB_VERSION = 1
const DEVICES_STORE = 'devices'

// Initialize the database
let db: IDBDatabase | null = null

// DatabaseService for handling device persistence
export class DatabaseService {
  /**
   * Initialize the database
   */
  static async initDatabase(): Promise<boolean> {
    return new Promise((resolve) => {
      if (db) {
        resolve(true)
        return
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = (event) => {
        console.error('Database error:', event)
        resolve(false)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        // Create device store with id as key path
        if (!db.objectStoreNames.contains(DEVICES_STORE)) {
          db.createObjectStore(DEVICES_STORE, { keyPath: 'id' })
        }
      }

      request.onsuccess = (event) => {
        db = (event.target as IDBOpenDBRequest).result
        resolve(true)
      }
    })
  }

  /**
   * Get all saved devices
   */
  static async getAllDevices(): Promise<Device[]> {
    await this.initDatabase()
    //this.clearDevices()
    
    console.log("%c getAllDevices", 'background:rgb(0, 193, 236); color: #222')
    return new Promise((resolve, reject) => {
      if (!db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = db.transaction(DEVICES_STORE, 'readonly')
      const store = transaction.objectStore(DEVICES_STORE)
      const request = store.getAll()

      request.onerror = () => {
        reject(new Error('Failed to retrieve devices from database'))
      }

      request.onsuccess = () => {
        resolve(request.result)
      }
    })
  }

  /**
   * Save a device to the database
   */
  static async saveDevice(device: Device): Promise<boolean> {
    await this.initDatabase()
    
    return new Promise((resolve, reject) => {
      if (!db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = db.transaction(DEVICES_STORE, 'readwrite')
      const store = transaction.objectStore(DEVICES_STORE)
      const request = store.put(device)

      request.onerror = () => {
        reject(new Error(`Failed to save device ${device.id}`))
      }

      request.onsuccess = () => {
        resolve(true)
      }
    })
  }

  /**
   * Delete a device from the database
   */
  static async deleteDevice(deviceId: string): Promise<boolean> {
    await this.initDatabase()
    
    return new Promise((resolve, reject) => {
      if (!db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = db.transaction(DEVICES_STORE, 'readwrite')
      const store = transaction.objectStore(DEVICES_STORE)
      const request = store.delete(deviceId)

      request.onerror = () => {
        reject(new Error(`Failed to delete device ${deviceId}`))
      }

      request.onsuccess = () => {
        resolve(true)
      }
    })
  }

  /**
   * Clear all devices from the database
   */
  static async clearDevices(): Promise<boolean> {
    await this.initDatabase()
    
    return new Promise((resolve, reject) => {
      if (!db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = db.transaction(DEVICES_STORE, 'readwrite')
      const store = transaction.objectStore(DEVICES_STORE)
      const request = store.clear()

      request.onerror = () => {
        reject(new Error('Failed to clear devices'))
      }

      request.onsuccess = () => {
        resolve(true)
      }
    })
  }
}