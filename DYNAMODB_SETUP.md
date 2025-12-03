# DynamoDB Recycling Data - Plug & Play Setup

## What This Does

Connects your EcoTradeBin dashboard to DynamoDB to display real-time waste classification data from your Lambda function.

**Flow:** `ESP32 Camera` → `Lambda` → `DynamoDB` → `Dashboard`

---

## Quick Setup (3 Steps)

### 1. Install Dependencies

```bash
cd ecotradebin-dashboard
npm install
```

### 2. Add Environment Variables

Create `ecotradebin-dashboard/.env.local`:

```env
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_DYNAMODB_REGION=us-east-1
```

### 3. Run Dashboard

```bash
npm run dev
```

Visit http://localhost:3000 → **Recycling tab** → See live data!

---

## What Shows on Dashboard

### Recycling Rate
- Automatically calculated from DynamoDB classifications
- Updates every 30 seconds

### Items This Week
- Total count from DynamoDB table

### Recent Activity (Bottom Section)
- Last 3 classifications from DynamoDB
- Shows:
  - "Recyclable Item" or "Waste Item"
  - Time ago (e.g., "5m ago")
  - Type badge

---

## Requirements

✅ DynamoDB table `waste_classifier_images` exists in `us-east-1`
✅ Lambda function writing data to DynamoDB
✅ AWS credentials with DynamoDB read access

---

## AWS IAM Policy (Read-Only)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:Scan",
        "dynamodb:GetItem"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:*:table/waste_classifier_images"
    }
  ]
}
```

---

## Testing

### 1. Test API Endpoint

```bash
# Start dev server
npm run dev

# Test in another terminal
curl http://localhost:3000/api/recycling
```

**Expected Response:**
```json
{
  "items": [
    {
      "id": "abc123",
      "name": "Recyclable Item",
      "type": "recyclable",
      "time": "5m ago",
      "class": 2
    }
  ],
  "totalItems": 15,
  "recyclingRate": 75
}
```

### 2. Verify Dashboard

1. Open http://localhost:3000
2. Click **Recycling** tab
3. Check "This Week" shows item count
4. Check "Recycling Rate" shows percentage
5. Check "Recent Activity" shows items or "No classifications yet"

---

## Deploy to Vercel

### 1. Add Environment Variables in Vercel

Vercel Dashboard → Project → Settings → Environment Variables

Add for **Production**, **Preview**, **Development**:
```
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_DYNAMODB_REGION=us-east-1
```

### 2. Push and Deploy

```bash
git add .
git commit -m "Connect DynamoDB to recycling dashboard"
git push origin Dynamodb
```

Vercel auto-deploys ✅

---

## Troubleshooting

### "No classifications yet" showing

**Cause:** DynamoDB table is empty
**Fix:** Run Lambda function to process an image

### API returns empty data

**Cause:** AWS credentials not configured or invalid
**Fix:**
```bash
# Verify credentials work
aws dynamodb scan --table-name waste_classifier_images --limit 1 --region us-east-1

# If error, reconfigure
aws configure
```

### Recycling Rate shows 0%

**Cause:** No data in DynamoDB yet
**Fix:** Process at least one image through Lambda

### CORS or API errors

**Cause:** API route issue
**Fix:** Check browser console (F12) for errors

---

## What Was Changed

### Files Modified:
- `package.json` - Added DynamoDB SDK
- `app/page.tsx` - Added DynamoDB data fetch and display

### Files Created:
- `app/api/recycling/route.ts` - API endpoint for DynamoDB

### What Wasn't Touched:
- Trading/Alpaca functionality (untouched)
- IoT device status (untouched)
- All existing features work as before

---

## Data Flow

```
┌──────────────┐
│   Lambda     │ Writes to DynamoDB when image processed
└──────┬───────┘
       │
       ↓
┌──────────────┐
│  DynamoDB    │ Table: waste_classifier_images
└──────┬───────┘
       │
       ↓
┌──────────────┐
│    API       │ GET /api/recycling
│  /recycling  │ Fetches last 10 items, calculates stats
└──────┬───────┘
       │
       ↓
┌──────────────┐
│  Dashboard   │ Shows in Recycling tab
│   page.tsx   │ Auto-refreshes every 30s
└──────────────┘
```

---

## Configuration Options

### Change refresh interval

**File:** `app/page.tsx` line 78

```typescript
const interval = setInterval(fetchRecyclingData, 30000); // 30 seconds

// Change to:
const interval = setInterval(fetchRecyclingData, 60000); // 60 seconds
```

### Show more than 3 items

**File:** `app/api/recycling/route.ts` line 43

```typescript
const items = sorted.slice(0, 3) // Change 3 to any number
```

### Change DynamoDB region

**File:** `.env.local`

```env
AWS_DYNAMODB_REGION=us-west-2  # Or your region
```

---

## Security Notes

- Never commit `.env.local` to git (already in .gitignore)
- Use IAM user with minimal permissions (read-only DynamoDB)
- Rotate AWS credentials regularly
- In production, consider using IAM roles instead of keys

---

## That's It! 🎉

Your dashboard now displays live recycling data from DynamoDB.

- Recycling rate auto-calculated
- Item counts updated in real-time
- Recent activity shows last 3 classifications
- Fully plug-and-play - just add AWS credentials

**Ready to test? Run `npm install && npm run dev`**
