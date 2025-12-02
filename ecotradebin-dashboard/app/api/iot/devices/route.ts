import { NextResponse } from 'next/server';
// COMMENTED OUT: AWS IoT Core integration - uncomment when ESP32 devices are ready
// import { IoTDataPlaneClient, GetThingShadowCommand } from '@aws-sdk/client-iot-data-plane';

// Initialize AWS IoT Data Plane client
// COMMENTED OUT: Requires valid AWS credentials
// const iotClient = new IoTDataPlaneClient({
//   region: process.env.AWS_IOT_REGION || 'us-east-1',
//   credentials: {
//     accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
//     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
//   },
// });

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

// COMMENTED OUT: AWS IoT Core shadow fetching - uncomment when ESP32 devices are ready
// async function getDeviceShadow(thingName: string) {
//   try {
//     const command = new GetThingShadowCommand({
//       thingName: thingName,
//     });
//
//     const response = await iotClient.send(command);
//
//     if (!response.payload) {
//       throw new Error('No payload in response');
//     }
//
//     // Convert payload to string and parse JSON
//     const payloadString = new TextDecoder().decode(response.payload);
//     const shadow: DeviceShadow = JSON.parse(payloadString);
//
//     return shadow.state.reported;
//   } catch (error: any) {
//     console.error(`Error fetching shadow for ${thingName}:`, error);
//     return null;
//   }
// }

export async function GET() {
  try {
    // COMMENTED OUT: Real AWS IoT data fetching
    // Get device names from environment variables
    // const device1Name = process.env.AWS_IOT_DEVICE_1_NAME || 'ecotradebin-device-1';
    // const device2Name = process.env.AWS_IOT_DEVICE_2_NAME || 'ecotradebin-device-2';
    // const [device1Data, device2Data] = await Promise.all([
    //   getDeviceShadow(device1Name),
    //   getDeviceShadow(device2Name),
    // ]);

    // TEMPORARY: Return empty/mock data until ESP32 devices are connected
    // This prevents AWS credential errors while still allowing the dashboard to function
    const combinedData = {
      devices: [
        {
          id: 'ecotradebin-device-1',
          name: 'Bin 1',
          status: 'Not Connected',
          fillLevel: 0,
          itemsThisWeek: 0,
          lastUpdate: null,
          isConnected: false,
          currentStreak: 0,
          recyclingRate: 0,
        },
        {
          id: 'ecotradebin-device-2',
          name: 'Bin 2',
          status: 'Not Connected',
          fillLevel: 0,
          itemsThisWeek: 0,
          lastUpdate: null,
          isConnected: false,
          currentStreak: 0,
          recyclingRate: 0,
        },
      ],
      summary: {
        totalItemsThisWeek: 0,
        averageFillLevel: 0,
        currentStreak: 0,
        recyclingRate: 0,
        connectedDevices: 0,
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
