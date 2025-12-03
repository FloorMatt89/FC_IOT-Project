# DynamoDB Recycling Data - Complete Setup and Configuration Guide

## Table of Contents
1. [Overview](#overview)
2. [Quick Setup](#quick-setup)
3. [Detailed Architecture](#detailed-architecture)
4. [Requirements](#requirements)
5. [Installation Steps](#installation-steps)
6. [Configuration Options](#configuration-options)
7. [Dashboard Features](#dashboard-features)
8. [AWS IAM Configuration](#aws-iam-configuration)
9. [Testing and Verification](#testing-and-verification)
10. [Deployment](#deployment)
11. [Troubleshooting](#troubleshooting)
12. [Performance Optimization](#performance-optimization)
13. [Security Best Practices](#security-best-practices)
14. [Frequently Asked Questions](#frequently-asked-questions)
15. [Advanced Configuration](#advanced-configuration)

---

## Overview

### What This Does

This integration connects your EcoTradeBin dashboard to AWS DynamoDB to display real-time waste classification data from your Lambda function. It provides a complete solution for monitoring recycling activities, tracking waste classification statistics, and displaying recent activity in an intuitive dashboard interface.

### System Architecture Flow

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│  ESP32      │      │   Lambda    │      │  DynamoDB   │      │  Dashboard  │
│  Camera     │─────▶│  Function   │─────▶│   Table     │◀─────│  Frontend   │
└─────────────┘      └─────────────┘      └─────────────┘      └─────────────┘
   Captures             Classifies          Stores Data          Displays
   Images               Waste Type          Classifications      Statistics
```

**Complete Data Flow:**
1. `ESP32 Camera` captures waste item images
2. `Lambda Function` processes images using ML model
3. `Lambda` writes classification results to `DynamoDB`
4. `Dashboard API` reads data from `DynamoDB`
5. `Dashboard Frontend` displays statistics and recent activity

### Key Features

- ✅ **Real-time Data**: Auto-refreshes every 30 seconds
- ✅ **Live Statistics**: Automatic recycling rate calculation
- ✅ **Activity Feed**: Shows most recent 3 classifications
- ✅ **Plug & Play**: Minimal configuration required
- ✅ **Error Handling**: Graceful fallbacks for missing data
- ✅ **Performance Optimized**: Efficient DynamoDB queries
- ✅ **Secure**: Read-only AWS credentials support
- ✅ **Scalable**: Handles high-volume classification data

---

## Quick Setup

### Prerequisites

Before starting, ensure you have:
- Node.js 16.x or higher installed
- npm or yarn package manager
- AWS account with DynamoDB access
- AWS IAM user with appropriate permissions
- Lambda function already writing to DynamoDB

### 3-Step Quick Start

#### 1. Install Dependencies

Navigate to the dashboard directory and install required packages:

```bash
cd ecotradebin-dashboard
npm install
```

This will install:
- `@aws-sdk/client-dynamodb` - Core DynamoDB client
- `@aws-sdk/lib-dynamodb` - Document client for easier data handling
- All existing dependencies from `package.json`

#### 2. Configure Environment Variables

Create a new file `ecotradebin-dashboard/.env.local` with your AWS credentials:

```env
# AWS Access Credentials
AWS_ACCESS_KEY_ID=your_aws_access_key_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here

# AWS Region Configuration
AWS_DYNAMODB_REGION=us-east-1
```

**Important Security Notes:**
- Never commit `.env.local` to version control
- Use read-only IAM credentials
- Rotate credentials regularly
- Keep credentials secure

#### 3. Start the Development Server

Run the dashboard in development mode:

```bash
npm run dev
```

Then visit: **http://localhost:3000** → Click **Recycling tab** → See live data!

---

## Detailed Architecture

### Component Overview

The integration consists of three main components:

#### 1. API Route (`/api/recycling`)

**File:** `ecotradebin-dashboard/app/api/recycling/route.ts`

**Purpose:** Serves as the backend endpoint that fetches data from DynamoDB and processes it for frontend consumption.

**Key Responsibilities:**
- Connects to AWS DynamoDB using SDK
- Scans the `waste_classifier_images` table
- Sorts items by timestamp (newest first)
- Calculates recycling statistics
- Formats data for frontend
- Handles errors gracefully

**Request Flow:**
```
Frontend → API Route → DynamoDB Client → DynamoDB Table → Response Processing → Frontend
```

#### 2. Dashboard Frontend (`page.tsx`)

**File:** `ecotradebin-dashboard/app/page.tsx`

**Purpose:** React component that displays recycling data in a user-friendly interface.

**Key Features:**
- Tab-based navigation (Recycling / Trading)
- Real-time data fetching
- Auto-refresh functionality
- Responsive statistics cards
- Recent activity feed
- Loading states and error handling

**State Management:**
- Uses React hooks (`useState`, `useEffect`)
- Manages IoT data and recycling data separately
- Auto-refreshes on configurable intervals

#### 3. DynamoDB Integration

**AWS Service:** Amazon DynamoDB

**Table Name:** `waste_classifier_images`

**Table Schema:**
```json
{
  "img_id": "string (Primary Key)",
  "timestamp": "string (ISO 8601 format)",
  "waste_binary": "number (0=recyclable, 1=waste)",
  "pred_class": "number (Classification class ID)",
  "confidence": "number (Optional - Model confidence)",
  "image_url": "string (Optional - S3 URL to image)"
}
```

### Data Processing Pipeline

#### Step 1: Data Fetching
```typescript
// Scan DynamoDB table with limit
const response = await docClient.send(new ScanCommand({
  TableName: 'waste_classifier_images',
  Limit: 10,
}));
```

#### Step 2: Data Validation
```typescript
// Check if items exist
if (!response.Items || response.Items.length === 0) {
  return empty response
}
```

#### Step 3: Sorting
```typescript
// Sort by timestamp (newest first)
const sorted = items.sort((a, b) =>
  new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
);
```

#### Step 4: Statistics Calculation
```typescript
// Calculate recycling rate
const recyclable = sorted.filter(item => item.waste_binary === 0).length;
const recyclingRate = Math.round((recyclable / sorted.length) * 100);
```

#### Step 5: Formatting
```typescript
// Format items for display
const items = sorted.slice(0, 3).map(item => ({
  id: item.img_id,
  name: item.waste_binary === 0 ? 'Recyclable Item' : 'Waste Item',
  type: item.waste_binary === 0 ? 'recyclable' : 'waste',
  time: formatTimeAgo(new Date(item.timestamp)),
  class: item.pred_class,
}));
```

---

## Requirements

### System Requirements

**Development Environment:**
- Node.js version: `>= 16.0.0`
- npm version: `>= 7.0.0` or yarn `>= 1.22.0`
- Operating System: Windows, macOS, or Linux
- RAM: Minimum 4GB (8GB recommended)
- Disk Space: 500MB for node_modules

**Browser Compatibility:**
- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions

### AWS Requirements

**DynamoDB Table:**
- ✅ Table name: `waste_classifier_images`
- ✅ Region: `us-east-1` (or configured region)
- ✅ Primary Key: `img_id` (String)
- ✅ Read Capacity: Minimum 5 RCU (or on-demand)
- ✅ Table Status: ACTIVE

**Lambda Function:**
- ✅ Must write data to DynamoDB after classification
- ✅ Must include all required fields (img_id, timestamp, waste_binary, pred_class)
- ✅ Proper error handling and logging

**IAM Permissions:**
- ✅ `dynamodb:Scan` on table
- ✅ `dynamodb:GetItem` on table (optional, for future features)
- ✅ Read-only access (no write permissions needed)

### Network Requirements

**Outbound Access:**
- AWS DynamoDB endpoints (port 443)
- `*.amazonaws.com` domains
- Proper SSL/TLS support

---

## Installation Steps

### Step 1: Navigate to Project Directory

```bash
cd /path/to/your/project/ecotradebin-dashboard
```

Verify you're in the correct directory:
```bash
ls package.json  # Should show package.json file
```

### Step 2: Install AWS SDK Dependencies

Install the required AWS SDK packages:

```bash
npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
```

**What gets installed:**
- `@aws-sdk/client-dynamodb@^3.940.0` - Core DynamoDB client
- `@aws-sdk/lib-dynamodb@^3.940.0` - Document client wrapper
- All transitive dependencies

**Verify installation:**
```bash
npm list @aws-sdk/client-dynamodb
npm list @aws-sdk/lib-dynamodb
```

### Step 3: Create Environment Configuration

Create `.env.local` file in the dashboard root:

```bash
touch .env.local  # On Mac/Linux
# OR
type nul > .env.local  # On Windows
```

Add your AWS credentials:

```env
# AWS Credentials (REQUIRED)
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

# AWS Region (REQUIRED)
AWS_DYNAMODB_REGION=us-east-1

# Optional: Enable debug logging
DEBUG_MODE=false
```

**Security Checklist:**
- [ ] Never use root AWS credentials
- [ ] Use IAM user with minimal permissions
- [ ] Never commit `.env.local` to git
- [ ] Rotate credentials every 90 days
- [ ] Use different credentials for dev/prod

### Step 4: Verify Installation

Test that the API can connect to DynamoDB:

```bash
# Start dev server
npm run dev

# In another terminal, test the API
curl http://localhost:3000/api/recycling
```

**Expected Response:**
```json
{
  "items": [...],
  "totalItems": 15,
  "recyclingRate": 75
}
```

If you see this response, installation is successful!

---

## Configuration Options

### Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AWS_ACCESS_KEY_ID` | Yes | None | AWS IAM access key ID |
| `AWS_SECRET_ACCESS_KEY` | Yes | None | AWS IAM secret access key |
| `AWS_DYNAMODB_REGION` | No | `us-east-1` | AWS region for DynamoDB |

### Customizing Refresh Intervals

#### IoT Data Refresh Interval

**File:** `app/page.tsx` (Line 38)

```typescript
// Default: 10 seconds (10000 milliseconds)
const IOT_DATA_REFRESH_INTERVAL_MS = 10000;

// Change to 30 seconds
const IOT_DATA_REFRESH_INTERVAL_MS = 30000;

// Change to 1 minute
const IOT_DATA_REFRESH_INTERVAL_MS = 60000;
```

#### Recycling Data Refresh Interval

**File:** `app/page.tsx` (Line 44)

```typescript
// Default: 30 seconds (30000 milliseconds)
const RECYCLING_DATA_REFRESH_INTERVAL_MS = 30000;

// Change to 1 minute
const RECYCLING_DATA_REFRESH_INTERVAL_MS = 60000;

// Change to 5 minutes
const RECYCLING_DATA_REFRESH_INTERVAL_MS = 300000;
```

### Customizing Display Items Count

#### Number of Items to Fetch

**File:** `app/api/recycling/route.ts` (Line 40)

```typescript
// Default: Fetch 10 items from DynamoDB
const MAX_ITEMS_TO_FETCH = 10;

// Fetch more for better statistics
const MAX_ITEMS_TO_FETCH = 50;

// Fetch fewer to reduce cost
const MAX_ITEMS_TO_FETCH = 5;
```

#### Number of Items to Display

**File:** `app/api/recycling/route.ts` (Line 46)

```typescript
// Default: Display 3 recent items
const MAX_ITEMS_TO_DISPLAY = 3;

// Show 5 items
const MAX_ITEMS_TO_DISPLAY = 5;

// Show 10 items
const MAX_ITEMS_TO_DISPLAY = 10;
```

### Changing DynamoDB Table Name

**File:** `app/api/recycling/route.ts` (Line 52)

```typescript
// Default table name
const DYNAMODB_TABLE_NAME = 'waste_classifier_images';

// Custom table name
const DYNAMODB_TABLE_NAME = 'my_custom_table_name';
```

### Customizing Bin Fill Warning Threshold

**File:** `app/page.tsx` (Line 50)

```typescript
// Default: Show warning at 80% full
const BIN_FULL_THRESHOLD_PERCENT = 80;

// Show warning earlier (at 60%)
const BIN_FULL_THRESHOLD_PERCENT = 60;

// Show warning later (at 90%)
const BIN_FULL_THRESHOLD_PERCENT = 90;
```

---

## Dashboard Features

### Recycling Tab Overview

The recycling tab displays comprehensive waste classification data:

#### 1. Bin Connection Status Card
- **WiFi Icon**: Visual indicator of connectivity
- **Bin ID**: Unique identifier for the device
- **Connection Status**: Number of connected devices

#### 2. Current Streak Card
- **Streak Days**: Consecutive days of recycling activity
- **Items This Week**: Total count from DynamoDB
- **Recycling Rate**: Percentage of recyclable items

#### 3. Bin Fill Level Card
- **Percentage**: Current fill level (0-100%)
- **Progress Bar**: Visual representation
- **Reminder Text**: Contextual message based on fill level

#### 4. Recent Activity Feed
- **Last 3 Classifications**: Most recent items processed
- **Item Name**: "Recyclable Item" or "Waste Item"
- **Time Stamp**: Relative time (e.g., "5m ago", "2h ago")
- **Type Badge**: Visual indicator of waste type

### Data Display Logic

#### Recycling Rate Calculation
```
Recycling Rate = (Recyclable Items / Total Items) × 100%
```

Example: 15 recyclable out of 20 total = 75%

#### Time Formatting
- **Under 1 hour**: Shows minutes (e.g., "5m ago", "45m ago")
- **1-23 hours**: Shows hours (e.g., "2h ago", "12h ago")
- **24+ hours**: Shows days (e.g., "1d ago", "5d ago")

#### Empty State Handling
When no data is available:
- Shows "No classifications yet" message
- Displays "Waiting for data..." subtitle
- Shows placeholder "-" badge

---

## AWS IAM Configuration

### Creating an IAM User

#### Step 1: Open IAM Console
1. Sign in to AWS Console
2. Navigate to IAM service
3. Click "Users" in left sidebar
4. Click "Add users"

#### Step 2: Configure User
1. **User name**: `ecotrade-dashboard-readonly`
2. **Access type**: Programmatic access
3. Click "Next: Permissions"

#### Step 3: Set Permissions
1. Click "Attach existing policies directly"
2. Click "Create policy"
3. Use JSON editor (see policy below)
4. Review and create policy
5. Attach policy to user

#### Step 4: Save Credentials
1. Download CSV with credentials
2. **IMPORTANT**: Save securely - only shown once
3. Add to `.env.local` file

### IAM Policy (Read-Only)

**Policy Name:** `DynamoDBWasteClassifierReadOnly`

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DynamoDBReadWasteClassifierTable",
      "Effect": "Allow",
      "Action": [
        "dynamodb:Scan",
        "dynamodb:GetItem",
        "dynamodb:Query",
        "dynamodb:DescribeTable"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:*:table/waste_classifier_images"
    }
  ]
}
```

**Policy Explanation:**
- `dynamodb:Scan` - Fetch all items (used by API)
- `dynamodb:GetItem` - Fetch single item by ID
- `dynamodb:Query` - Query items with conditions
- `dynamodb:DescribeTable` - Get table metadata

### IAM Policy (Minimal - Scan Only)

For tighter security, use this minimal policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["dynamodb:Scan"],
      "Resource": "arn:aws:dynamodb:us-east-1:ACCOUNT_ID:table/waste_classifier_images"
    }
  ]
}
```

**Replace `ACCOUNT_ID` with your AWS account ID.**

---

## Testing and Verification

### 1. Test API Endpoint Locally

#### Start Development Server
```bash
cd ecotradebin-dashboard
npm run dev
```

#### Test with cURL
```bash
# Basic test
curl http://localhost:3000/api/recycling

# Pretty-print JSON
curl -s http://localhost:3000/api/recycling | json_pp

# Save response to file
curl http://localhost:3000/api/recycling > test-response.json
```

#### Test with Browser
Open: http://localhost:3000/api/recycling

#### Test with Postman
1. Create new GET request
2. URL: `http://localhost:3000/api/recycling`
3. Click "Send"

### 2. Expected API Response Format

```json
{
  "items": [
    {
      "id": "img_abc123xyz",
      "name": "Recyclable Item",
      "type": "recyclable",
      "time": "5m ago",
      "class": 2
    },
    {
      "id": "img_def456uvw",
      "name": "Waste Item",
      "type": "waste",
      "time": "12m ago",
      "class": 7
    },
    {
      "id": "img_ghi789rst",
      "name": "Recyclable Item",
      "type": "recyclable",
      "time": "1h ago",
      "class": 3
    }
  ],
  "totalItems": 15,
  "recyclingRate": 67
}
```

### 3. Dashboard Visual Verification

#### Checklist for Recycling Tab:
1. **Open Dashboard**
   - [ ] Navigate to http://localhost:3000
   - [ ] Dashboard loads without errors

2. **Click Recycling Tab**
   - [ ] Tab switches successfully
   - [ ] Tab highlights as active

3. **Verify Statistics Cards**
   - [ ] "Current Streak" shows number of days
   - [ ] "This Week" shows item count
   - [ ] "Recycling Rate" shows percentage
   - [ ] All values are numbers (not "NaN" or "undefined")

4. **Verify Bin Status**
   - [ ] "Bin Connected" card appears
   - [ ] Bin ID displays correctly
   - [ ] Connection status shows

5. **Verify Fill Level**
   - [ ] "Bin Fill Level" card appears
   - [ ] Percentage displays (0-100%)
   - [ ] Progress bar width matches percentage
   - [ ] Reminder text appears

6. **Verify Recent Activity**
   - [ ] "Recent Activity" section appears
   - [ ] Shows 3 items (or "No classifications yet")
   - [ ] Each item has name, time, and badge
   - [ ] Times format correctly ("Xm ago", "Xh ago", "Xd ago")

### 4. Browser Console Check

Open Developer Tools (F12) and check console:

**Expected Logs:**
```
[Dashboard] Setting up IoT data fetching
[Dashboard] Setting up recycling data fetching
[IoT Fetch] Starting fetch from /api/iot/devices
[Recycling Fetch] Starting fetch from /api/recycling
[Recycling Fetch] Data received successfully
[Computed] Items this week (from DynamoDB): 15
[Computed] Recycling rate (from DynamoDB): 67%
```

**Should NOT see:**
- ❌ CORS errors
- ❌ 404 errors
- ❌ Authentication errors
- ❌ TypeError or ReferenceError

### 5. Test Auto-Refresh Functionality

1. Open dashboard in browser
2. Open Developer Tools → Network tab
3. Filter by "recycling"
4. Wait 30 seconds
5. **Verify**: New request to `/api/recycling` appears every 30 seconds

### 6. Test with Empty DynamoDB Table

Temporarily clear DynamoDB table to test empty state:

**Expected Behavior:**
- API returns: `{"items": [], "totalItems": 0, "recyclingRate": 0}`
- Dashboard shows: "No classifications yet"
- No JavaScript errors in console

### 7. AWS CLI Verification

Verify you can access DynamoDB with your credentials:

```bash
# Configure AWS CLI
aws configure
# Enter: Access Key ID, Secret Access Key, Region

# Test scan operation
aws dynamodb scan \
  --table-name waste_classifier_images \
  --limit 5 \
  --region us-east-1

# Expected: Returns 5 items from table
```

---

## Deployment

### Deploy to Vercel

Vercel is recommended for Next.js applications and provides seamless deployment.

#### Prerequisites
- Vercel account (free tier available)
- Git repository with your code
- Vercel CLI installed (optional)

#### Method 1: Deploy via Vercel Dashboard

**Step 1: Push Code to Git**
```bash
git add .
git commit -m "Add DynamoDB integration"
git push origin main
```

**Step 2: Import Project**
1. Go to https://vercel.com/dashboard
2. Click "Add New" → "Project"
3. Import your Git repository
4. Vercel auto-detects Next.js configuration

**Step 3: Configure Environment Variables**
1. In project settings, go to "Environment Variables"
2. Add variables for **Production**, **Preview**, and **Development**:

```
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_DYNAMODB_REGION=us-east-1
```

**Step 4: Deploy**
- Click "Deploy"
- Wait for build to complete
- Visit your production URL

#### Method 2: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Follow prompts to configure project
```

#### Post-Deployment Verification

1. Visit your production URL
2. Navigate to recycling tab
3. Verify data loads correctly
4. Check browser console for errors
5. Test on mobile devices

### Deploy to Netlify

#### Step 1: Prepare Build Configuration

Create `netlify.toml` in project root:

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

#### Step 2: Deploy via Netlify Dashboard

1. Go to https://app.netlify.com
2. Click "Add new site" → "Import an existing project"
3. Connect to Git repository
4. Configure build settings (auto-detected from `netlify.toml`)
5. Add environment variables in Site settings → Build & deploy → Environment

#### Step 3: Deploy
- Click "Deploy site"
- Wait for build completion
- Visit site URL

### Deploy to AWS Amplify

#### Step 1: Create Amplify App

```bash
# Install Amplify CLI
npm install -g @aws-amplify/cli

# Initialize Amplify
amplify init

# Add hosting
amplify add hosting

# Choose: Hosting with Amplify Console
```

#### Step 2: Configure Build

Amplify auto-detects Next.js. Add environment variables in Amplify Console:

1. Go to Amplify Console
2. Select your app
3. Environment variables → Manage variables
4. Add AWS credentials

#### Step 3: Deploy

```bash
amplify publish
```

### Environment-Specific Configuration

#### Development
```env
AWS_DYNAMODB_REGION=us-east-1
DEBUG_MODE=true
```

#### Staging
```env
AWS_DYNAMODB_REGION=us-east-1
DEBUG_MODE=false
```

#### Production
```env
AWS_DYNAMODB_REGION=us-east-1
DEBUG_MODE=false
```

---

## Troubleshooting

### Common Issues and Solutions

#### Issue 1: "No classifications yet" Showing

**Symptoms:**
- Dashboard shows "No classifications yet"
- API returns empty items array
- `totalItems: 0` in API response

**Possible Causes:**
1. DynamoDB table is empty
2. Table name mismatch
3. AWS region mismatch
4. IAM permissions issue

**Solutions:**

**Check 1: Verify Table Has Data**
```bash
aws dynamodb scan --table-name waste_classifier_images --limit 1
```
- If no items returned → Table is empty, run Lambda to add data
- If error → Check credentials and permissions

**Check 2: Verify Table Name**
Look in `app/api/recycling/route.ts`:
```typescript
const DYNAMODB_TABLE_NAME = 'waste_classifier_images';
```
Make sure this matches your actual table name in AWS.

**Check 3: Verify Region**
Check `.env.local`:
```env
AWS_DYNAMODB_REGION=us-east-1
```
Make sure this matches the region where your table exists.

**Check 4: Verify IAM Permissions**
Test with AWS CLI:
```bash
aws dynamodb scan --table-name waste_classifier_images
```
If error → Review IAM policy

#### Issue 2: API Returns Empty Response

**Symptoms:**
- API endpoint returns `{"items":[],"totalItems":0,"recyclingRate":0}`
- No errors in console
- DynamoDB table has data

**Solutions:**

**Check 1: Verify Environment Variables**
```bash
# In project root
cat .env.local

# Should show:
# AWS_ACCESS_KEY_ID=AKIAXXXXX...
# AWS_SECRET_ACCESS_KEY=xxxxx...
# AWS_DYNAMODB_REGION=us-east-1
```

**Check 2: Restart Development Server**
```bash
# Stop server (Ctrl+C)
# Start again
npm run dev
```
Environment variables are loaded on server start.

**Check 3: Check Server Logs**
Look for errors in terminal where `npm run dev` is running:
```
[DynamoDB] Scan completed successfully
[DynamoDB] Items returned: 0  ← Issue here!
```

#### Issue 3: CORS Errors

**Symptoms:**
- Browser console shows CORS error
- `Access-Control-Allow-Origin` error
- API requests fail

**Solutions:**

**For Development:**
CORS should not occur in development (same origin).

**For Production:**
Next.js API routes handle CORS automatically. If issues persist:

Add to `next.config.js`:
```javascript
module.exports = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST' },
        ],
      },
    ];
  },
};
```

#### Issue 4: Authentication Errors

**Symptoms:**
- Error: "The security token included in the request is invalid"
- Error: "UnrecognizedClientException"
- 403 Forbidden errors

**Solutions:**

**Check 1: Verify Credentials**
```bash
# Test credentials with AWS CLI
aws sts get-caller-identity
```
Should return your IAM user details.

**Check 2: Check for Spaces**
Environment variables should not have quotes or spaces:
```env
# ❌ Wrong
AWS_ACCESS_KEY_ID=" AKIAIOSFODNN7EXAMPLE "
AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI..."

# ✅ Correct
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

**Check 3: Credential Expiration**
If using temporary credentials, they may have expired.
Generate new credentials and update `.env.local`.

#### Issue 5: High DynamoDB Costs

**Symptoms:**
- AWS bill higher than expected
- Many scan operations in CloudWatch

**Solutions:**

**Solution 1: Reduce Fetch Limit**
In `app/api/recycling/route.ts`:
```typescript
const MAX_ITEMS_TO_FETCH = 10; // Reduce to 5
```

**Solution 2: Increase Refresh Interval**
In `app/page.tsx`:
```typescript
const RECYCLING_DATA_REFRESH_INTERVAL_MS = 30000; // Increase to 60000
```

**Solution 3: Use DynamoDB On-Demand**
- Go to DynamoDB Console
- Select table → Settings → Read/write capacity
- Change to "On-demand"

**Solution 4: Add Query Index**
Instead of Scan, use Query with a secondary index on timestamp.

#### Issue 6: Slow Performance

**Symptoms:**
- Dashboard takes long to load
- API response time > 3 seconds
- Laggy UI

**Solutions:**

**Check 1: Measure API Performance**
```bash
time curl http://localhost:3000/api/recycling
```
Should complete in < 2 seconds.

**Check 2: Check DynamoDB Table Size**
Large table scans are slow. Use Query instead:
```typescript
// Instead of Scan, use Query on timestamp index
const response = await docClient.send(new QueryCommand({
  TableName: 'waste_classifier_images',
  IndexName: 'timestamp-index',
  KeyConditionExpression: 'status = :status',
  ExpressionAttributeValues: { ':status': 'active' },
  ScanIndexForward: false, // Sort descending
  Limit: 10,
}));
```

**Check 3: Implement Caching**
Add caching to reduce DynamoDB calls (see Advanced Configuration).

#### Issue 7: Recycling Rate Incorrect

**Symptoms:**
- Recycling rate shows unexpected value
- Calculation seems wrong

**Solutions:**

**Check 1: Verify Data Classification**
Ensure Lambda is setting `waste_binary` correctly:
- `0` = Recyclable
- `1` = Waste

**Check 2: Check Calculation Logic**
In `app/api/recycling/route.ts`:
```typescript
// Count recyclable items (waste_binary = 0)
const recyclable = sorted.filter(item => item.waste_binary === 0).length;
// Calculate percentage
const recyclingRate = Math.round((recyclable / sorted.length) * 100);
```

**Check 3: Verify Sample Size**
Small sample sizes can show misleading rates.
Increase `MAX_ITEMS_TO_FETCH` for more accurate statistics.

---

## Performance Optimization

### 1. Reduce DynamoDB Scan Operations

**Problem:** Scan reads entire table, expensive for large tables.

**Solution:** Use Query with secondary index.

**Implementation:**

#### Create GSI (Global Secondary Index)
1. Go to DynamoDB Console
2. Select `waste_classifier_images` table
3. Indexes → Create index
4. Partition key: `status` (String)
5. Sort key: `timestamp` (String)
6. Index name: `status-timestamp-index`

#### Update API Code
```typescript
// Replace Scan with Query
const response = await docClient.send(new QueryCommand({
  TableName: 'waste_classifier_images',
  IndexName: 'status-timestamp-index',
  KeyConditionExpression: 'status = :status',
  ExpressionAttributeValues: { ':status': 'active' },
  ScanIndexForward: false, // DESC order
  Limit: 10,
}));
```

### 2. Implement Server-Side Caching

**Add caching to reduce repeated DynamoDB calls:**

```typescript
// Add at top of route.ts
const cache = {
  data: null,
  timestamp: 0,
  ttl: 30000, // 30 seconds
};

export async function GET() {
  const now = Date.now();

  // Return cached data if still valid
  if (cache.data && (now - cache.timestamp) < cache.ttl) {
    console.log('[Cache] Returning cached data');
    return NextResponse.json(cache.data);
  }

  // Fetch fresh data
  const response = await fetchItemsFromDynamoDB();

  // Process data...
  const responseData = createSuccessResponse(...);

  // Update cache
  cache.data = responseData;
  cache.timestamp = now;

  return NextResponse.json(responseData);
}
```

### 3. Optimize Frontend Rendering

**Use React.memo to prevent unnecessary re-renders:**

```typescript
const ActivityItem = React.memo(({ item }) => (
  <div className={styles.activityItem}>
    {/* ... */}
  </div>
));
```

### 4. Reduce Bundle Size

**Analyze bundle:**
```bash
npm run build
```

**Use dynamic imports for large components:**
```typescript
const PortfolioDisplay = dynamic(() => import('./components/PortfolioDisplay'), {
  loading: () => <p>Loading portfolio...</p>,
});
```

### 5. Enable DynamoDB DAX (Advanced)

For production with high traffic:
1. Create DAX cluster in AWS
2. Update DynamoDB client to use DAX endpoint
3. Enjoy microsecond latency

---

## Security Best Practices

### 1. Credentials Management

**✅ DO:**
- Use IAM users with minimal permissions
- Store credentials in environment variables
- Use different credentials per environment
- Rotate credentials every 90 days
- Use AWS Secrets Manager for production

**❌ DON'T:**
- Commit credentials to Git
- Use root AWS account credentials
- Share credentials via email/chat
- Hard-code credentials in source files
- Use same credentials across team members

### 2. IAM Policy Hardening

**Restrict by Resource:**
```json
{
  "Resource": "arn:aws:dynamodb:us-east-1:123456789012:table/waste_classifier_images"
}
```
Replace `*` with specific table ARN.

**Restrict by IP (Optional):**
```json
{
  "Condition": {
    "IpAddress": {
      "aws:SourceIp": ["1.2.3.4/32"]
    }
  }
}
```

### 3. Environment Variable Security

**Use Vercel Environment Variables:**
- Encrypted at rest
- Not exposed to client
- Different per environment

**Never:**
```javascript
// ❌ Don't expose to frontend
const API_KEY = process.env.AWS_SECRET_ACCESS_KEY;
return <div>{API_KEY}</div>;
```

### 4. API Route Security

**Add rate limiting:**
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
});
```

**Add authentication (optional):**
```typescript
export async function GET(request: Request) {
  const token = request.headers.get('Authorization');

  if (!isValidToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ... rest of code
}
```

### 5. HTTPS Only

**In production, ensure HTTPS:**
- Vercel provides HTTPS automatically
- For custom domains, enable SSL certificate
- Redirect HTTP to HTTPS

### 6. Monitor AWS CloudTrail

Enable CloudTrail to audit DynamoDB access:
1. AWS Console → CloudTrail
2. Create trail
3. Enable for DynamoDB events
4. Review logs regularly

---

## Frequently Asked Questions

### Q1: How much will this cost in AWS?

**Answer:** Costs depend on usage patterns.

**Typical Monthly Cost:**
- DynamoDB: $0.25-$5 (based on read/write units)
- Data transfer: Minimal ($0.01-$0.50)
- Total: ~$1-$6/month for small-medium usage

**Cost Breakdown:**
- Scan operations: $0.25 per million requests
- Storage: $0.25 per GB-month
- On-demand mode: $1.25 per million read requests

**Cost Optimization:**
- Use on-demand pricing for unpredictable traffic
- Implement caching to reduce reads
- Use Query instead of Scan

### Q2: Can I use a different AWS region?

**Answer:** Yes! Update `.env.local`:

```env
AWS_DYNAMODB_REGION=eu-west-1
```

Make sure your DynamoDB table exists in that region.

### Q3: How do I add more fields to display?

**Answer:** Modify the API route and frontend.

**Step 1: Update API (route.ts)**
```typescript
const items = sorted.slice(0, 3).map(item => ({
  id: item.img_id,
  name: getItemDisplayName(item.waste_binary),
  type: getItemType(item.waste_binary),
  time: formatTimeAgo(new Date(item.timestamp)),
  class: item.pred_class,
  // Add new field
  confidence: item.confidence,
  imageUrl: item.image_url,
}));
```

**Step 2: Update Frontend (page.tsx)**
```typescript
interface RecyclingItem {
  id: string;
  name: string;
  type: string;
  time: string;
  class: number;
  // Add new fields
  confidence?: number;
  imageUrl?: string;
}
```

**Step 3: Update UI**
```typescript
<div className={styles.activityName}>
  {item.name}
  {item.confidence && ` (${Math.round(item.confidence * 100)}%)`}
</div>
```

### Q4: Can I filter items by date range?

**Answer:** Yes! Modify the Scan command.

```typescript
const response = await docClient.send(new ScanCommand({
  TableName: 'waste_classifier_images',
  FilterExpression: 'timestamp >= :startDate AND timestamp <= :endDate',
  ExpressionAttributeValues: {
    ':startDate': '2024-01-01T00:00:00Z',
    ':endDate': '2024-12-31T23:59:59Z',
  },
  Limit: 10,
}));
```

### Q5: How do I backup DynamoDB data?

**Answer:** Use AWS Backup or manual exports.

**Automatic Backup:**
1. DynamoDB Console → Backups tab
2. Enable point-in-time recovery
3. Create on-demand backup

**Export to S3:**
```bash
aws dynamodb export-table-to-point-in-time \
  --table-arn arn:aws:dynamodb:us-east-1:123456789012:table/waste_classifier_images \
  --s3-bucket my-backup-bucket \
  --export-format DYNAMODB_JSON
```

### Q6: Can I use this with MongoDB instead?

**Answer:** Yes, but requires code changes.

You'll need to:
1. Install MongoDB driver: `npm install mongodb`
2. Replace DynamoDB client with MongoDB client
3. Update query syntax
4. Modify data processing logic

The structure will be similar, but MongoDB uses different APIs.

### Q7: How do I debug API issues?

**Answer:** Enable detailed logging.

**Add to route.ts:**
```typescript
console.log('[DEBUG] Full response:', JSON.stringify(response, null, 2));
console.log('[DEBUG] Items:', response.Items);
console.log('[DEBUG] Count:', response.Count);
```

**Check browser console:**
- Open Developer Tools (F12)
- Console tab
- Look for `[API]`, `[DynamoDB]`, `[Error]` prefixed logs

**Check server logs:**
- Terminal where `npm run dev` is running
- Look for error messages and stack traces

### Q8: What's the maximum number of items I can fetch?

**Answer:** DynamoDB Scan has a 1MB limit per request.

**Practical Limits:**
- Single Scan: Up to 1MB of data (~100-1000 items depending on item size)
- With pagination: Unlimited (but slower)

**Recommendation:**
- Fetch 10-50 items for dashboard
- Use pagination for larger datasets
- Implement caching for frequently accessed data

### Q9: How do I add authentication?

**Answer:** Implement authentication middleware.

**Using NextAuth.js:**
```bash
npm install next-auth
```

**Protect API route:**
```typescript
import { getServerSession } from "next-auth";

export async function GET(request: Request) {
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ... rest of code
}
```

### Q10: Can I run this without AWS?

**Answer:** Not directly, but you can use alternatives.

**Alternatives to DynamoDB:**
- MongoDB Atlas (cloud MongoDB)
- Firebase Firestore
- Supabase (PostgreSQL)
- Local JSON file (development only)

Each requires adapting the data fetching code.

---

## Advanced Configuration

### Custom Error Handling

**Add detailed error responses:**

```typescript
function handleErrorAndReturnResponse(error: any): NextResponse {
  const errorResponse = {
    success: false,
    error: {
      code: error.name || 'UnknownError',
      message: error.message || 'An error occurred',
      timestamp: new Date().toISOString(),
    },
    items: [],
    totalItems: 0,
    recyclingRate: 0,
  };

  return NextResponse.json(errorResponse, { status: 500 });
}
```

### Add Pagination Support

**Fetch next page of results:**

```typescript
export async function GET(request: Request) {
  const url = new URL(request.url);
  const lastKey = url.searchParams.get('lastKey');

  const scanParams = {
    TableName: 'waste_classifier_images',
    Limit: 10,
    ...(lastKey && {
      ExclusiveStartKey: JSON.parse(lastKey),
    }),
  };

  const response = await docClient.send(new ScanCommand(scanParams));

  return NextResponse.json({
    items: formatItems(response.Items),
    lastKey: response.LastEvaluatedKey
      ? JSON.stringify(response.LastEvaluatedKey)
      : null,
  });
}
```

### Add Real-Time Updates with WebSockets

**Use Vercel Edge Functions:**

```typescript
// app/api/recycling/stream/route.ts
export async function GET(request: Request) {
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  setInterval(async () => {
    const data = await fetchRecyclingData();
    await writer.write(new TextEncoder().encode(JSON.stringify(data) + '\n'));
  }, 10000);

  return new Response(stream.readable);
}
```

### Add Data Visualization

**Install charting library:**
```bash
npm install recharts
```

**Create chart component:**
```typescript
import { LineChart, Line, XAxis, YAxis } from 'recharts';

const RecyclingChart = ({ data }) => (
  <LineChart width={600} height={300} data={data}>
    <XAxis dataKey="date" />
    <YAxis />
    <Line type="monotone" dataKey="recyclingRate" stroke="#8884d8" />
  </LineChart>
);
```

---

## Conclusion

🎉 **Congratulations!** Your EcoTradeBin dashboard is now fully integrated with DynamoDB!

### What You've Accomplished

✅ Connected dashboard to AWS DynamoDB
✅ Display real-time waste classification data
✅ Automatic recycling rate calculation
✅ Recent activity feed with live updates
✅ Secure, read-only AWS credentials
✅ Production-ready deployment

### Next Steps

1. **Monitor Usage**: Check AWS billing dashboard regularly
2. **Optimize Performance**: Implement caching and Query vs Scan
3. **Add Features**: Consider charts, filters, or exports
4. **Scale**: Upgrade DynamoDB capacity as usage grows
5. **Secure**: Rotate credentials, review IAM policies

### Getting Help

**Official Documentation:**
- [Next.js Docs](https://nextjs.org/docs)
- [AWS DynamoDB Docs](https://docs.aws.amazon.com/dynamodb/)
- [AWS SDK for JavaScript](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/)

**Community Support:**
- GitHub Issues
- Stack Overflow
- AWS Forums

### Quick Reference

**Start Development:**
```bash
npm run dev
```

**Test API:**
```bash
curl http://localhost:3000/api/recycling
```

**Deploy to Vercel:**
```bash
vercel
```

**Check DynamoDB:**
```bash
aws dynamodb scan --table-name waste_classifier_images --limit 1
```

---

**📋 Summary:** Plug & play DynamoDB integration for EcoTradeBin dashboard. Just add AWS credentials and start tracking recycling data in real-time!

**Ready to test? Run `npm install && npm run dev` and visit http://localhost:3000** 🚀
