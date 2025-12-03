import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

const MIN_FILL_LEVEL_REQUIRED = 50; // Minimum bin fill level (50%) to enable trading

// Initialize DynamoDB client
const client = new DynamoDBClient({
  region: process.env.AWS_DYNAMODB_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const dynamoDb = DynamoDBDocumentClient.from(client);

/**
 * Fetches the current bin fill level from DynamoDB
 */
async function getBinFillLevel(): Promise<number> {
  try {
    const scanCommand = new ScanCommand({
      TableName: 'waste_classifier_images',
      ProjectionExpression: 'bin_fill_level, #ts',
      ExpressionAttributeNames: {
        '#ts': 'timestamp',
      },
    });

    const response = await dynamoDb.send(scanCommand);

    if (!response.Items || response.Items.length === 0) {
      console.log('[Trading API] No items found in DynamoDB');
      return 0;
    }

    // Sort by timestamp to get most recent item
    const sortedItems = response.Items.sort((a, b) => {
      const timestampA = new Date(a.timestamp).getTime();
      const timestampB = new Date(b.timestamp).getTime();
      return timestampB - timestampA; // Most recent first
    });

    const mostRecentItem = sortedItems[0];
    const fillLevel = mostRecentItem.bin_fill_level;

    if (fillLevel !== undefined && fillLevel !== null) {
      const parsedLevel = typeof fillLevel === 'number' ? fillLevel : parseInt(fillLevel);
      console.log(`[Trading API] Current bin fill level: ${parsedLevel}%`);
      return Math.min(100, Math.max(0, parsedLevel));
    }

    console.log('[Trading API] No bin_fill_level attribute found');
    return 0;
  } catch (error) {
    console.error('[Trading API] Error fetching bin fill level:', error);
    return 0;
  }
}

export async function POST() {
  try {
    // Step 1: Check bin fill level requirement
    console.log('[Trading API] Checking bin fill level requirement...');
    const binFillLevel = await getBinFillLevel();

    if (binFillLevel < MIN_FILL_LEVEL_REQUIRED) {
      console.log(`[Trading API] Insufficient fill level: ${binFillLevel}% (minimum: ${MIN_FILL_LEVEL_REQUIRED}%)`);
      return NextResponse.json(
        {
          error: 'Insufficient bin fill level',
          message: `Bin must be at least ${MIN_FILL_LEVEL_REQUIRED}% full to start trading. Current: ${binFillLevel}%`,
          binFillLevel: binFillLevel,
          required: MIN_FILL_LEVEL_REQUIRED,
          status: 'locked',
        },
        { status: 403 } // Forbidden
      );
    }

    console.log(`[Trading API] Fill level sufficient: ${binFillLevel}% >= ${MIN_FILL_LEVEL_REQUIRED}%`);

    // Step 2: Proceed with starting the trading bot
    const ec2Url = process.env.EC2_CONTROL_API_URL;
    const apiKey = process.env.EC2_CONTROL_API_KEY;

    if (!ec2Url || !apiKey) {
      return NextResponse.json(
        { error: 'EC2 configuration missing' },
        { status: 500 }
      );
    }

    // Add timeout to fetch request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const response = await fetch(`${ec2Url}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        return NextResponse.json(data, { status: response.status });
      }

      return NextResponse.json(data);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);

      // Handle network errors gracefully
      if (fetchError.name === 'AbortError') {
        console.warn('Request to EC2 timed out');
        return NextResponse.json(
          { error: 'Connection timeout', status: 'unavailable' },
          { status: 504 }
        );
      }

      // Connection refused or network error
      console.warn('EC2 service unavailable:', fetchError.message);
      return NextResponse.json(
        { error: 'Service unavailable', status: 'unavailable' },
        { status: 503 }
      );
    }
  } catch (error: any) {
    console.error('Error starting trading bot:', error);
    return NextResponse.json(
      { error: 'Failed to start trading bot', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const ec2Url = process.env.EC2_CONTROL_API_URL;
    const apiKey = process.env.EC2_CONTROL_API_KEY;

    if (!ec2Url || !apiKey) {
      return NextResponse.json(
        { error: 'EC2 configuration missing', status: 'unavailable' },
        { status: 200 } // Return 200 so frontend doesn't treat as error
      );
    }

    // Add timeout to fetch request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    try {
      const response = await fetch(`${ec2Url}/status`, {
        headers: {
          'x-api-key': apiKey,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        return NextResponse.json(data, { status: response.status });
      }

      return NextResponse.json(data);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);

      // Handle network errors gracefully - return a valid response instead of throwing
      if (fetchError.name === 'AbortError') {
        console.warn('Status check timed out');
        return NextResponse.json(
          { status: 'unavailable', error: 'Connection timeout' },
          { status: 200 } // Return 200 so app doesn't crash
        );
      }

      // Connection refused or network error - return gracefully
      console.warn('EC2 service unavailable:', fetchError.message);
      return NextResponse.json(
        { status: 'unavailable', error: 'Service unavailable' },
        { status: 200 } // Return 200 so app doesn't crash
      );
    }
  } catch (error: any) {
    console.error('Error getting trading bot status:', error);
    return NextResponse.json(
      { status: 'unavailable', error: 'Failed to get status' },
      { status: 200 } // Return 200 so app doesn't crash
    );
  }
}
