import { useState, useEffect } from 'react';
import { useSyncEngine } from './sync-engine';

// ----------------------------------------------------------------------------
// BLE Mock Service
// Simulates capturing a raw BLE payload from a Xiaomi Scale
// ----------------------------------------------------------------------------

export interface BleDevice {
  id: string;
  name: string;
  mac: string;
  rssi: number;
}

export interface WeightMeasurement {
  weight: number; // kg
  impedance: number; // ohm
  unit: 'kg' | 'lbs';
  isStabilized: boolean;
}

export function useBleMockService() {
  const [isScanning, setIsScanning] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState<BleDevice | null>(null);
  const [lastMeasurement, setLastMeasurement] = useState<WeightMeasurement | null>(null);
  const { pushChange, generateUUID } = useSyncEngine();

  // Mock Device
  const MOCK_DEVICE: BleDevice = {
    id: "ble-123",
    name: "MIBFS", // Xiaomi Scale Broadcast Name
    mac: "C0:11:22:33:44:55",
    rssi: -45
  };

  const startScan = () => {
    setIsScanning(true);
    console.log("[BLE] Scanning started...");
    
    // Simulate finding device
    setTimeout(() => {
      console.log("[BLE] Device found:", MOCK_DEVICE);
      setIsScanning(false);
      connect(MOCK_DEVICE);
    }, 2000);
  };

  const connect = (device: BleDevice) => {
    console.log("[BLE] Connecting to", device.name);
    setConnectedDevice(device);
    
    // Simulate incoming data stream (notification)
    simulateDataStream();
  };

  const simulateDataStream = () => {
    let currentWeight = 0;
    const targetWeight = 72.50; // kg
    
    const interval = setInterval(() => {
      // Ramp up weight
      if (currentWeight < targetWeight) {
        currentWeight += (Math.random() * 5);
        if (currentWeight > targetWeight) currentWeight = targetWeight;
        
        setLastMeasurement({
          weight: parseFloat(currentWeight.toFixed(2)),
          impedance: 0,
          unit: 'kg',
          isStabilized: false
        });
      } else {
        // Stabilized
        clearInterval(interval);
        const finalMeasurement = {
          weight: targetWeight,
          impedance: 450, // Simulated impedance
          unit: 'kg' as const,
          isStabilized: true
        };
        
        setLastMeasurement(finalMeasurement);
        
        // Auto-push to Sync Engine when stabilized
        handleStabilizedMeasurement(finalMeasurement);
      }
    }, 200);
  };

  const handleStabilizedMeasurement = (data: WeightMeasurement) => {
    console.log("[BLE] Measurement Stabilized. Pushing to Sync Engine.");
    
    // Push to 'body_records' table as per schema
    pushChange('body_records', 'create', {
      id: generateUUID(),
      weight_kg: data.weight,
      impedance_ohm: data.impedance,
      source: 'ble_mock',
      device_mac: MOCK_DEVICE.mac,
      recorded_at: new Date().toISOString()
    });
  };

  return {
    isScanning,
    connectedDevice,
    lastMeasurement,
    startScan
  };
}
