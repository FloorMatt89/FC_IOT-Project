import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

// Initialize DynamoDB
const client = new DynamoDBClient({
  region: process.env.AWS_DYNAMODB_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const docClient = DynamoDBDocumentClient.from(client);

export async function GET() {
  try {
    // Fetch recent classifications from DynamoDB
    const response = await docClient.send(new ScanCommand({
      TableName: 'waste_classifier_images',
      Limit: 10,
    }));

    if (!response.Items || response.Items.length === 0) {
      return NextResponse.json({ items: [], totalItems: 0, recyclingRate: 0 });
    }

    // Sort by timestamp
    const sorted = response.Items.sort((a, b) =>
      new Date(b.timestamp as string).getTime() - new Date(a.timestamp as string).getTime()
    );

    // Calculate stats
    const recyclable = sorted.filter(item => item.waste_binary === 0).length;
    const recyclingRate = Math.round((recyclable / sorted.length) * 100);

    // Format items
    const items = sorted.slice(0, 3).map(item => ({
      id: item.img_id,
      name: item.waste_binary === 0 ? 'Recyclable Item' : 'Waste Item',
      type: item.waste_binary === 0 ? 'recyclable' : 'waste',
      time: formatTimeAgo(new Date(item.timestamp as string)),
      class: item.pred_class,
    }));

    return NextResponse.json({
      items,
      totalItems: sorted.length,
      recyclingRate,
    });
  } catch (error: any) {
    console.error('DynamoDB error:', error);
    return NextResponse.json({ items: [], totalItems: 0, recyclingRate: 0 });
  }
}

function formatTimeAgo(date: Date): string {
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
