import { NextResponse } from 'next/server';
import { IoTDataPlaneClient, GetThingShadowCommand } from '@aws-sdk/client-iot-data-plane';

// Initialize AWS IoT Data Plane client
const iotClient = new IoTDataPlaneClient({
  region: process.env.AWS_IOT_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

interface DeviceShadow {
  state: {
    reported: {
      binFillLevel?: number;
      isConnected?: boolean;
      itemsThisWeek?: number;
      currentStreak?: number;
      recyclingRate?: number;
      lastRecycledItem?: string;
      lastRecycledTime?: string;
      temperature?: number;
      battery?: number;
    };
  };
  metadata: {
    reported: {
      [key: string]: {
        timestamp: number;
      };
    };
  };
  timestamp: number;
}

async function getDeviceShadow(thingName: string) {
  try {
    const command = new GetThingShadowCommand({
      thingName: thingName,
    });

    const response = await iotClient.send(command);

    if (!response.payload) {
      throw new Error('No payload in response');
    }

    // Convert payload to string and parse JSON
    const payloadString = new TextDecoder().decode(response.payload);
    const shadow: DeviceShadow = JSON.parse(payloadString);

    return shadow.state.reported;
  } catch (error: any) {
    console.error(`Error fetching shadow for ${thingName}:`, error);
    return null;
  }
}

export async function GET() {
  try {
    // Get device names from environment variables
    const device1Name = process.env.AWS_IOT_DEVICE_1_NAME || 'ecotradebin-device-1';
    const device2Name = process.env.AWS_IOT_DEVICE_2_NAME || 'ecotradebin-device-2';

    // Fetch data from both devices
    const [device1Data, device2Data] = await Promise.all([
      getDeviceShadow(device1Name),
      getDeviceShadow(device2Name),
    ]);

    // Combine data from both devices
    const combinedData = {
      devices: [
        {
          id: device1Name,
          name: 'Bin 1',
          status: device1Data?.isConnected ? 'Connected' : 'Not Connected',
          fillLevel: device1Data?.binFillLevel || 0,
          itemsThisWeek: device1Data?.itemsThisWeek || 0,
          lastUpdate: device1Data ? new Date().toISOString() : null,
          ...device1Data,
        },
        {
          id: device2Name,
          name: 'Bin 2',
          status: device2Data?.isConnected ? 'Connected' : 'Not Connected',
          fillLevel: device2Data?.binFillLevel || 0,
          itemsThisWeek: device2Data?.itemsThisWeek || 0,
          lastUpdate: device2Data ? new Date().toISOString() : null,
          ...device2Data,
        },
      ],
      summary: {
        totalItemsThisWeek: (device1Data?.itemsThisWeek || 0) + (device2Data?.itemsThisWeek || 0),
        averageFillLevel: ((device1Data?.binFillLevel || 0) + (device2Data?.binFillLevel || 0)) / 2,
        currentStreak: Math.max(device1Data?.currentStreak || 0, device2Data?.currentStreak || 0),
        recyclingRate: ((device1Data?.recyclingRate || 0) + (device2Data?.recyclingRate || 0)) / 2,
        connectedDevices: [device1Data?.isConnected, device2Data?.isConnected].filter(Boolean).length,
      },
    };

    return NextResponse.json(combinedData);
  } catch (error: any) {
    console.error('Error fetching IoT device data:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch IoT device data',
        details: error.message,
        devices: [],
        summary: {
          totalItemsThisWeek: 0,
          averageFillLevel: 0,
          currentStreak: 0,
          recyclingRate: 0,
          connectedDevices: 0,
        }
      },
      { status: 500 }
    );
  }
}
