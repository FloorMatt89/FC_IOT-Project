import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

/**
 * =============================================================================
 * RECYCLING DATA API ROUTE
 * =============================================================================
 *
 * This API route handles fetching waste classification data from AWS DynamoDB
 * and processing it for display on the dashboard.
 *
 * Endpoint: GET /api/recycling
 *
 * Data Flow:
 * 1. Receives HTTP GET request from dashboard frontend
 * 2. Connects to AWS DynamoDB using configured credentials
 * 3. Scans the waste_classifier_images table for recent classifications
 * 4. Sorts items by timestamp (most recent first)
 * 5. Calculates recycling statistics (rate, totals)
 * 6. Formats items for frontend consumption
 * 7. Returns JSON response with processed data
 *
 * Response Format:
 * {
 *   items: Array of recent classification items (max 3)
 *   totalItems: Total number of items classified
 *   recyclingRate: Percentage of items that are recyclable
 * }
 */

// =============================================================================
// CONFIGURATION CONSTANTS
// =============================================================================

/**
 * Maximum number of items to fetch from DynamoDB per request
 * This limits the scan operation to improve performance
 */
const MAX_ITEMS_TO_FETCH = 10;

/**
 * Maximum number of items to display in the recent activity list
 * Even though we fetch more, we only show the most recent ones
 */
const MAX_ITEMS_TO_DISPLAY = 3;

/**
 * DynamoDB table name where waste classifications are stored
 * This table is populated by the Lambda function when images are processed
 */
const DYNAMODB_TABLE_NAME = 'waste_classifier_images';

/**
 * Default AWS region for DynamoDB operations
 * Can be overridden by environment variable
 */
const DEFAULT_AWS_REGION = 'us-east-1';

/**
 * Binary classification value for recyclable items
 * In the DynamoDB schema, 0 = recyclable, 1 = waste
 */
const RECYCLABLE_BINARY_VALUE = 0;

/**
 * Binary classification value for waste items
 * In the DynamoDB schema, 0 = recyclable, 1 = waste
 */
const WASTE_BINARY_VALUE = 1;

/**
 * Time conversion constants for accurate time calculations
 */
const MILLISECONDS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const MILLISECONDS_PER_MINUTE = MILLISECONDS_PER_SECOND * SECONDS_PER_MINUTE;
const MILLISECONDS_PER_HOUR = MILLISECONDS_PER_MINUTE * MINUTES_PER_HOUR;
const MILLISECONDS_PER_DAY = MILLISECONDS_PER_HOUR * HOURS_PER_DAY;

// =============================================================================
// AWS DYNAMODB CLIENT INITIALIZATION
// =============================================================================

/**
 * Retrieves AWS region from environment variables with fallback to default
 * @returns {string} AWS region code (e.g., 'us-east-1')
 */
function getAwsRegion(): string {
  const regionFromEnv = process.env.AWS_DYNAMODB_REGION;
  const region = regionFromEnv || DEFAULT_AWS_REGION;
  console.log(`[DynamoDB Config] Using AWS region: ${region}`);
  return region;
}

/**
 * Retrieves AWS access key ID from environment variables
 * @returns {string} AWS access key ID or empty string if not configured
 */
function getAwsAccessKeyId(): string {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID || '';
  if (!accessKeyId) {
    console.warn('[DynamoDB Config] AWS_ACCESS_KEY_ID not found in environment variables');
  }
  return accessKeyId;
}

/**
 * Retrieves AWS secret access key from environment variables
 * @returns {string} AWS secret access key or empty string if not configured
 */
function getAwsSecretAccessKey(): string {
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || '';
  if (!secretAccessKey) {
    console.warn('[DynamoDB Config] AWS_SECRET_ACCESS_KEY not found in environment variables');
  }
  return secretAccessKey;
}

/**
 * Initialize the base DynamoDB client with credentials and region
 * This client handles the low-level AWS SDK operations
 */
const client = new DynamoDBClient({
  region: getAwsRegion(),
  credentials: {
    accessKeyId: getAwsAccessKeyId(),
    secretAccessKey: getAwsSecretAccessKey(),
  },
});

/**
 * Create a DynamoDB Document Client wrapper
 * This provides a higher-level interface for working with DynamoDB items
 * and automatically handles marshalling/unmarshalling of JavaScript objects
 */
const docClient = DynamoDBDocumentClient.from(client);

console.log('[DynamoDB] Client initialized successfully');

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Represents a raw item from DynamoDB waste_classifier_images table
 */
interface DynamoDBWasteItem {
  img_id: string;
  timestamp: string;
  waste_binary: number;
  pred_class: number;
  confidence?: number;
  image_url?: string;
}

/**
 * Represents a formatted recycling item for the frontend
 */
interface FormattedRecyclingItem {
  id: string;
  name: string;
  type: string;
  time: string;
  class: number;
}

/**
 * Represents the complete API response structure
 */
interface RecyclingApiResponse {
  items: FormattedRecyclingItem[];
  totalItems: number;
  recyclingRate: number;
}

/**
 * Represents an empty/default API response when no data is available
 */
interface EmptyApiResponse {
  items: [];
  totalItems: 0;
  recyclingRate: 0;
}

// =============================================================================
// VALIDATION HELPER FUNCTIONS
// =============================================================================

/**
 * Validates that the DynamoDB response contains items
 * @param {any} items - The items array from DynamoDB response
 * @returns {boolean} True if items exist and array is not empty
 */
function hasValidItems(items: any): boolean {
  if (!items) {
    console.log('[Validation] Response items is null or undefined');
    return false;
  }

  if (!Array.isArray(items)) {
    console.log('[Validation] Response items is not an array');
    return false;
  }

  if (items.length === 0) {
    console.log('[Validation] Response items array is empty');
    return false;
  }

  console.log(`[Validation] Found ${items.length} valid items`);
  return true;
}

/**
 * Validates that an item has a valid timestamp
 * @param {any} item - The DynamoDB item to validate
 * @returns {boolean} True if timestamp exists and is valid
 */
function hasValidTimestamp(item: any): boolean {
  if (!item.timestamp) {
    console.warn('[Validation] Item missing timestamp field');
    return false;
  }

  const timestamp = new Date(item.timestamp as string);
  if (isNaN(timestamp.getTime())) {
    console.warn('[Validation] Item has invalid timestamp format');
    return false;
  }

  return true;
}

// =============================================================================
// DATA PROCESSING HELPER FUNCTIONS
// =============================================================================

/**
 * Sorts items by timestamp in descending order (most recent first)
 * @param {any[]} items - Array of DynamoDB items to sort
 * @returns {any[]} Sorted array of items
 */
function sortItemsByTimestamp(items: any[]): any[] {
  console.log(`[Processing] Sorting ${items.length} items by timestamp`);

  const sorted = items.sort((itemA, itemB) => {
    const timestampA = new Date(itemA.timestamp as string).getTime();
    const timestampB = new Date(itemB.timestamp as string).getTime();

    // Sort descending (most recent first)
    return timestampB - timestampA;
  });

  console.log('[Processing] Items sorted successfully');
  return sorted;
}

/**
 * Filters items to find only recyclable ones
 * @param {any[]} items - Array of items to filter
 * @returns {any[]} Array containing only recyclable items
 */
function filterRecyclableItems(items: any[]): any[] {
  const recyclableItems = items.filter(item => {
    return item.waste_binary === RECYCLABLE_BINARY_VALUE;
  });

  console.log(`[Processing] Found ${recyclableItems.length} recyclable items out of ${items.length} total`);
  return recyclableItems;
}

/**
 * Calculates the recycling rate as a percentage
 * @param {number} recyclableCount - Number of recyclable items
 * @param {number} totalCount - Total number of items
 * @returns {number} Recycling rate percentage (0-100)
 */
function calculateRecyclingRate(recyclableCount: number, totalCount: number): number {
  if (totalCount === 0) {
    console.log('[Calculation] Cannot calculate recycling rate: total count is 0');
    return 0;
  }

  const rate = (recyclableCount / totalCount) * 100;
  const roundedRate = Math.round(rate);

  console.log(`[Calculation] Recycling rate: ${recyclableCount}/${totalCount} = ${roundedRate}%`);
  return roundedRate;
}

/**
 * Determines the display name for an item based on its classification
 * @param {number} wasteBinary - The waste_binary value (0 or 1)
 * @returns {string} Human-readable item name
 */
function getItemDisplayName(wasteBinary: number): string {
  if (wasteBinary === RECYCLABLE_BINARY_VALUE) {
    return 'Recyclable Item';
  } else if (wasteBinary === WASTE_BINARY_VALUE) {
    return 'Waste Item';
  } else {
    console.warn(`[Formatting] Unknown waste_binary value: ${wasteBinary}`);
    return 'Unknown Item';
  }
}

/**
 * Determines the type string for an item based on its classification
 * @param {number} wasteBinary - The waste_binary value (0 or 1)
 * @returns {string} Item type ('recyclable' or 'waste')
 */
function getItemType(wasteBinary: number): string {
  if (wasteBinary === RECYCLABLE_BINARY_VALUE) {
    return 'recyclable';
  } else if (wasteBinary === WASTE_BINARY_VALUE) {
    return 'waste';
  } else {
    console.warn(`[Formatting] Unknown waste_binary value: ${wasteBinary}`);
    return 'unknown';
  }
}

/**
 * Formats a single DynamoDB item for frontend display
 * @param {any} item - Raw DynamoDB item
 * @returns {FormattedRecyclingItem} Formatted item object
 */
function formatSingleItem(item: any): FormattedRecyclingItem {
  const itemId = item.img_id || 'unknown';
  const wasteBinary = item.waste_binary;
  const itemName = getItemDisplayName(wasteBinary);
  const itemType = getItemType(wasteBinary);
  const itemTimestamp = new Date(item.timestamp as string);
  const timeAgo = formatTimeAgo(itemTimestamp);
  const predictionClass = item.pred_class || 0;

  console.log(`[Formatting] Formatted item ${itemId}: ${itemName} (${timeAgo})`);

  return {
    id: itemId,
    name: itemName,
    type: itemType,
    time: timeAgo,
    class: predictionClass,
  };
}

/**
 * Formats multiple items for frontend display
 * @param {any[]} items - Array of sorted DynamoDB items
 * @returns {FormattedRecyclingItem[]} Array of formatted items
 */
function formatItemsForDisplay(items: any[]): FormattedRecyclingItem[] {
  console.log(`[Formatting] Formatting ${items.length} items for display`);

  // Take only the most recent items based on display limit
  const itemsToDisplay = items.slice(0, MAX_ITEMS_TO_DISPLAY);

  console.log(`[Formatting] Displaying ${itemsToDisplay.length} out of ${items.length} items`);

  // Format each item
  const formattedItems = itemsToDisplay.map(item => formatSingleItem(item));

  return formattedItems;
}

// =============================================================================
// TIME FORMATTING HELPER FUNCTIONS
// =============================================================================

/**
 * Calculates the number of minutes elapsed since a given date
 * @param {Date} date - The past date to compare against
 * @returns {number} Number of minutes elapsed
 */
function calculateMinutesAgo(date: Date): number {
  const now = Date.now();
  const pastTime = date.getTime();
  const differenceInMilliseconds = now - pastTime;
  const differenceInMinutes = Math.floor(differenceInMilliseconds / MILLISECONDS_PER_MINUTE);

  return differenceInMinutes;
}

/**
 * Calculates the number of hours elapsed since a given date
 * @param {number} minutes - Number of minutes elapsed
 * @returns {number} Number of hours elapsed
 */
function calculateHoursFromMinutes(minutes: number): number {
  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  return hours;
}

/**
 * Calculates the number of days elapsed since a given date
 * @param {number} hours - Number of hours elapsed
 * @returns {number} Number of days elapsed
 */
function calculateDaysFromHours(hours: number): number {
  const days = Math.floor(hours / HOURS_PER_DAY);
  return days;
}

/**
 * Formats elapsed time as "Xm ago"
 * @param {number} minutes - Number of minutes
 * @returns {string} Formatted string
 */
function formatMinutesAgo(minutes: number): string {
  return `${minutes}m ago`;
}

/**
 * Formats elapsed time as "Xh ago"
 * @param {number} hours - Number of hours
 * @returns {string} Formatted string
 */
function formatHoursAgo(hours: number): string {
  return `${hours}h ago`;
}

/**
 * Formats elapsed time as "Xd ago"
 * @param {number} days - Number of days
 * @returns {string} Formatted string
 */
function formatDaysAgo(days: number): string {
  return `${days}d ago`;
}

/**
 * Converts a date into a human-readable "time ago" format
 * Examples: "5m ago", "2h ago", "3d ago"
 *
 * @param {Date} date - The date to format
 * @returns {string} Formatted time string
 */
function formatTimeAgo(date: Date): string {
  // Calculate minutes elapsed
  const minutesElapsed = calculateMinutesAgo(date);

  // If less than 1 hour, show minutes
  if (minutesElapsed < MINUTES_PER_HOUR) {
    return formatMinutesAgo(minutesElapsed);
  }

  // Calculate hours elapsed
  const hoursElapsed = calculateHoursFromMinutes(minutesElapsed);

  // If less than 1 day, show hours
  if (hoursElapsed < HOURS_PER_DAY) {
    return formatHoursAgo(hoursElapsed);
  }

  // Otherwise, show days
  const daysElapsed = calculateDaysFromHours(hoursElapsed);
  return formatDaysAgo(daysElapsed);
}

// =============================================================================
// DYNAMODB OPERATIONS
// =============================================================================

/**
 * Fetches recent waste classification items from DynamoDB
 * @returns {Promise<any>} DynamoDB scan response
 */
async function fetchItemsFromDynamoDB(): Promise<any> {
  console.log(`[DynamoDB] Scanning table: ${DYNAMODB_TABLE_NAME}`);
  console.log(`[DynamoDB] Fetch limit: ${MAX_ITEMS_TO_FETCH} items`);

  // Create scan command with parameters
  const scanCommand = new ScanCommand({
    TableName: DYNAMODB_TABLE_NAME,
    Limit: MAX_ITEMS_TO_FETCH,
  });

  // Execute the scan operation
  const response = await docClient.send(scanCommand);

  console.log(`[DynamoDB] Scan completed successfully`);
  console.log(`[DynamoDB] Items returned: ${response.Items?.length || 0}`);

  return response;
}

// =============================================================================
// RESPONSE BUILDERS
// =============================================================================

/**
 * Creates an empty API response for when no data is available
 * @returns {EmptyApiResponse} Empty response object
 */
function createEmptyResponse(): EmptyApiResponse {
  console.log('[Response] Creating empty response (no data available)');

  return {
    items: [],
    totalItems: 0,
    recyclingRate: 0,
  };
}

/**
 * Creates a JSON response with empty data
 * @returns {NextResponse} NextJS JSON response
 */
function returnEmptyJsonResponse(): NextResponse<EmptyApiResponse> {
  const emptyResponse = createEmptyResponse();
  return NextResponse.json(emptyResponse);
}

/**
 * Creates a successful API response with processed data
 * @param {FormattedRecyclingItem[]} formattedItems - Formatted items for display
 * @param {number} totalItems - Total number of items
 * @param {number} recyclingRate - Calculated recycling rate percentage
 * @returns {RecyclingApiResponse} Complete API response object
 */
function createSuccessResponse(
  formattedItems: FormattedRecyclingItem[],
  totalItems: number,
  recyclingRate: number
): RecyclingApiResponse {
  console.log('[Response] Creating success response');
  console.log(`[Response] Items: ${formattedItems.length}, Total: ${totalItems}, Rate: ${recyclingRate}%`);

  return {
    items: formattedItems,
    totalItems: totalItems,
    recyclingRate: recyclingRate,
  };
}

/**
 * Creates a JSON response with processed data
 * @param {RecyclingApiResponse} response - The response data
 * @returns {NextResponse} NextJS JSON response
 */
function returnSuccessJsonResponse(response: RecyclingApiResponse): NextResponse<RecyclingApiResponse> {
  return NextResponse.json(response);
}

/**
 * Handles errors and returns an appropriate error response
 * @param {any} error - The error object
 * @returns {NextResponse} NextJS JSON response with empty data
 */
function handleErrorAndReturnResponse(error: any): NextResponse<EmptyApiResponse> {
  console.error('[Error] DynamoDB operation failed:', error);

  if (error.name) {
    console.error(`[Error] Error name: ${error.name}`);
  }

  if (error.message) {
    console.error(`[Error] Error message: ${error.message}`);
  }

  if (error.statusCode) {
    console.error(`[Error] Status code: ${error.statusCode}`);
  }

  // Return empty response on error to prevent breaking the frontend
  return returnEmptyJsonResponse();
}

// =============================================================================
// MAIN API ROUTE HANDLER
// =============================================================================

/**
 * GET handler for /api/recycling endpoint
 *
 * This function orchestrates the entire data fetching and processing pipeline:
 * 1. Fetches data from DynamoDB
 * 2. Validates the response
 * 3. Sorts items by timestamp
 * 4. Calculates statistics
 * 5. Formats items for display
 * 6. Returns JSON response
 *
 * @returns {Promise<NextResponse>} JSON response with recycling data
 */
export async function GET(): Promise<NextResponse> {
  const startTime = Date.now();
  console.log('[API] ========================================');
  console.log('[API] GET /api/recycling - Request received');
  console.log('[API] ========================================');
  console.log('[DEBUG] Environment check:', {
    hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
    hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_DYNAMODB_REGION || 'default'
  });

  try {
    // Step 1: Fetch data from DynamoDB
    console.log('[API] Step 1: Fetching data from DynamoDB');
    const fetchStartTime = Date.now();
    const dynamoDbResponse = await fetchItemsFromDynamoDB();
    const fetchDuration = Date.now() - fetchStartTime;
    console.log(`[PERFORMANCE] DynamoDB fetch took ${fetchDuration}ms`);

    // Step 2: Validate response
    console.log('[API] Step 2: Validating DynamoDB response');
    const items = dynamoDbResponse.Items;

    if (!hasValidItems(items)) {
      console.log('[API] No valid items found, returning empty response');
      return returnEmptyJsonResponse();
    }

    // Step 3: Sort items by timestamp
    console.log('[API] Step 3: Sorting items by timestamp');
    const sortedItems = sortItemsByTimestamp(items);

    // Step 4: Calculate statistics
    console.log('[API] Step 4: Calculating recycling statistics');
    const recyclableItems = filterRecyclableItems(sortedItems);
    const recyclableCount = recyclableItems.length;
    const totalItemCount = sortedItems.length;
    const calculatedRecyclingRate = calculateRecyclingRate(recyclableCount, totalItemCount);

    // Step 5: Format items for display
    console.log('[API] Step 5: Formatting items for frontend display');
    const formattedItems = formatItemsForDisplay(sortedItems);

    // Step 6: Build response object
    console.log('[API] Step 6: Building response object');
    const responseData = createSuccessResponse(
      formattedItems,
      totalItemCount,
      calculatedRecyclingRate
    );

    // Step 7: Return JSON response
    console.log('[API] Step 7: Returning JSON response');
    const totalDuration = Date.now() - startTime;
    console.log(`[PERFORMANCE] Total request took ${totalDuration}ms`);
    console.log('[API] ========================================');
    console.log('[API] Request completed successfully');
    console.log('[API] ========================================');

    return returnSuccessJsonResponse(responseData);

  } catch (error: any) {
    // Error handling - log details and return safe empty response
    console.log('[API] ========================================');
    console.log('[API] Request failed with error');
    console.log('[API] ========================================');

    return handleErrorAndReturnResponse(error);
  }
}
