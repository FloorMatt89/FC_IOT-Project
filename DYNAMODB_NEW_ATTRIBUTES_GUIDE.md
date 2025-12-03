# DynamoDB New Attributes Guide

## ✅ Changes Completed

### 1. **Removed "Bin Connected" Section**
- No longer shows connection status banner
- Cleaner dashboard interface

### 2. **Added Color Coding**
- ✅ **Recyclable items**: Green icon (FaRecycle) + Green badge
- ❌ **Waste items**: Red icon (FaTrash) + Red badge

### 3. **New DynamoDB Attributes**
- `bin_fill_level` - Track bin capacity (0-100%)
- `current_day_streak` - Track consecutive days of recycling

### 4. **Updated API**
- Fetches new attributes from DynamoDB
- Calculates and returns fill level and streak
- Falls back to IoT data if DynamoDB attributes are missing

### 5. **Updated Dashboard**
- Now displays DynamoDB-sourced fill level and streak
- Real-time color-coded activity feed

---

## 📋 Updated DynamoDB Schema

Your items should now include these attributes:

```json
{
  "img_id": "string",              // ✅ Required - Unique identifier
  "timestamp": "string",           // ✅ Required - ISO 8601 format
  "waste_binary": 0 or 1,          // ✅ Required - 0=recyclable, 1=waste
  "pred_class": 0-9,               // ✅ Required - Classification category
  "confidence": 0.0-1.0,           // ⚪ Optional - Confidence score
  "bin_fill_level": 0-100,         // 🆕 NEW - Bin capacity percentage
  "current_day_streak": 0+         // 🆕 NEW - Consecutive days
}
```

---

## 🧪 How to Add New Attributes to DynamoDB

### Option 1: Add to Existing Items

1. **Go to DynamoDB Console**
   - AWS Console → DynamoDB → Tables
   - Click `waste_classifier_images`
   - Click **Explore table items**

2. **Edit Your Existing Item**
   - Click on the item you created earlier
   - Click **Actions** → **Edit item**

3. **Add bin_fill_level**
   - Click **Add new attribute**
   - **Attribute name**: `bin_fill_level`
   - **Type**: Number
   - **Value**: `45` (or any number 0-100)

4. **Add current_day_streak**
   - Click **Add new attribute**
   - **Attribute name**: `current_day_streak`
   - **Type**: Number
   - **Value**: `7` (or any positive number)

5. **Save Changes**
   - Click **Save changes**

---

### Option 2: Create Complete Test Items

Replace your test items with these complete examples:

#### Test Item 1: Recyclable Item (Fresh streak, low fill)
```json
{
  "img_id": "test-recyclable-001",
  "timestamp": "2025-12-03T12:00:00Z",
  "waste_binary": 0,
  "pred_class": 5,
  "confidence": 0.95,
  "bin_fill_level": 25,
  "current_day_streak": 3
}
```

#### Test Item 2: Waste Item (Growing streak, medium fill)
```json
{
  "img_id": "test-waste-001",
  "timestamp": "2025-12-03T11:55:00Z",
  "waste_binary": 1,
  "pred_class": 8,
  "confidence": 0.88,
  "bin_fill_level": 45,
  "current_day_streak": 5
}
```

#### Test Item 3: Recyclable Item (Long streak, high fill)
```json
{
  "img_id": "test-recyclable-002",
  "timestamp": "2025-12-03T11:50:00Z",
  "waste_binary": 0,
  "pred_class": 3,
  "confidence": 0.92,
  "bin_fill_level": 85,
  "current_day_streak": 12
}
```

#### Test Item 4: Waste Item (Very high fill - needs emptying!)
```json
{
  "img_id": "test-waste-002",
  "timestamp": "2025-12-03T11:45:00Z",
  "waste_binary": 1,
  "pred_class": 7,
  "confidence": 0.89,
  "bin_fill_level": 95,
  "current_day_streak": 12
}
```

---

## 🎨 Visual Changes You'll See

### Before:
```
┌─────────────────────────────────┐
│ 🔌 Bin Connected                │
│ Bin #12345 • 1 Connected        │
└─────────────────────────────────┘

📊 Recent Activity:
  ♻️  Recyclable Item   [recyclable]
  ♻️  Waste Item        [waste]
```

### After:
```
📊 Recent Activity:
  ♻️  Recyclable Item   [🟢 recyclable]  ← Green badge
  🗑️  Waste Item        [🔴 waste]       ← Red badge + trash icon
```

### Dashboard Changes:

**Current Streak Card:**
- Now shows: `12 Days` (from DynamoDB `current_day_streak`)
- Updates automatically when you add new items

**Bin Fill Level:**
- Now shows: `85%` (from DynamoDB `bin_fill_level`)
- Warning at >80%: "Bins are getting full!"

---

## 🧪 Testing Your Changes

### Step 1: Start Development Server

```bash
cd ~/FC_IOT-Project/ecotradebin-dashboard
npm run dev
```

### Step 2: Check Console Logs

You should see:
```
[API] Step 5: Extracting bin fill level and streak
[Extraction] Bin fill level from most recent item: 85%
[Extraction] Current day streak from most recent item: 12 days
```

### Step 3: View Dashboard

Go to `http://localhost:3000` and verify:

1. **No "Bin Connected" banner** ✅
2. **Current Streak** shows the value from DynamoDB
3. **Bin Fill Level** shows the value from DynamoDB
4. **Recent Activity** shows:
   - 🟢 Green recycle icons for `waste_binary: 0`
   - 🔴 Red trash icons for `waste_binary: 1`
   - Color-coded badges

### Step 4: Test Real-Time Updates

1. Add a new item in DynamoDB with different values:
   ```json
   {
     "img_id": "test-new-001",
     "timestamp": "2025-12-03T13:00:00Z",
     "waste_binary": 1,
     "pred_class": 6,
     "bin_fill_level": 90,
     "current_day_streak": 15
   }
   ```

2. Wait 30 seconds (auto-refresh)

3. Dashboard should update:
   - Streak: `15 Days`
   - Fill Level: `90%` with warning
   - New red trash icon in Recent Activity

---

## 🎯 Expected API Response

After adding the new attributes, your API should return:

```json
{
  "items": [
    {
      "id": "test-recyclable-001",
      "name": "Recyclable Item",
      "type": "recyclable",
      "time": "5m ago",
      "class": 5
    }
  ],
  "totalItems": 4,
  "recyclingRate": 50,
  "binFillLevel": 85,
  "currentDayStreak": 12
}
```

Test with:
```bash
curl http://localhost:3000/api/recycling
```

---

## 🔄 How the System Works

### Most Recent Item Priority:

The system uses the **most recent item** (by timestamp) for:
- `bin_fill_level` - Current bin capacity
- `current_day_streak` - Latest streak count

**Why?** These values represent the **current state** of your bin, not historical data.

### Example Workflow:

```
12:00 PM - Item 1: bin_fill_level=25, streak=3
11:55 AM - Item 2: bin_fill_level=45, streak=5
11:50 AM - Item 3: bin_fill_level=85, streak=12

Dashboard displays: Fill=25%, Streak=3 days
(Uses most recent: Item 1)
```

---

## 📊 Updating Your Lambda Function

To make your Lambda function write these attributes:

```python
# In your Lambda function that processes images
import boto3
from datetime import datetime

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('waste_classifier_images')

# After classification
table.put_item(
    Item={
        'img_id': image_id,
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'waste_binary': 0,  # or 1
        'pred_class': predicted_class,
        'confidence': confidence_score,

        # NEW ATTRIBUTES
        'bin_fill_level': calculate_fill_level(),  # Your logic here
        'current_day_streak': calculate_streak()   # Your logic here
    }
)
```

### Calculating Fill Level (Example):

```python
def calculate_fill_level():
    # Option 1: Based on item count
    item_count = get_item_count_today()
    max_capacity = 50
    return min(100, int((item_count / max_capacity) * 100))

    # Option 2: From sensor data
    sensor_value = read_ultrasonic_sensor()
    return sensor_value  # If sensor already returns 0-100
```

### Calculating Streak (Example):

```python
from datetime import datetime, timedelta

def calculate_streak():
    # Get dates with classifications
    response = table.scan(
        ProjectionExpression='#ts',
        ExpressionAttributeNames={'#ts': 'timestamp'}
    )

    dates = set()
    for item in response['Items']:
        date = item['timestamp'][:10]  # YYYY-MM-DD
        dates.add(date)

    # Count consecutive days backwards from today
    streak = 0
    current_date = datetime.utcnow().date()

    while str(current_date) in dates:
        streak += 1
        current_date -= timedelta(days=1)

    return streak
```

---

## 🐛 Troubleshooting

### Dashboard shows fill level = 0%

**Check:**
```bash
# In your terminal logs, look for:
[Extraction] No bin_fill_level attribute found, defaulting to 0
```

**Solution:** Add the `bin_fill_level` attribute to your DynamoDB items.

### Dashboard shows streak = 0 days

**Check:**
```bash
[Extraction] No current_day_streak attribute found, defaulting to 0
```

**Solution:** Add the `current_day_streak` attribute to your DynamoDB items.

### Items still showing wrong colors

**Check:** Make sure `waste_binary` is set correctly:
- `0` = Recyclable (green)
- `1` = Waste (red)

**Verify in DynamoDB:**
1. Check the `waste_binary` value is a **Number** type, not String
2. Should be `0` or `1`, not `"0"` or `"1"`

---

## ✅ Deployment Checklist

Before deploying to Vercel:

- [ ] Added `bin_fill_level` to at least one DynamoDB item
- [ ] Added `current_day_streak` to at least one DynamoDB item
- [ ] Tested locally - dashboard shows correct values
- [ ] Verified color coding works (green vs red)
- [ ] Confirmed "Bin Connected" section is removed
- [ ] API returns all 5 fields in response
- [ ] Lambda function updated to write new attributes (if applicable)

---

## 🚀 Deploy to Vercel

Once everything works locally:

```bash
cd ~/FC_IOT-Project

git add .
git commit -m "Add color coding and new DynamoDB attributes (bin fill level, streak)"
git push origin Dynamodb
```

Vercel will auto-deploy. Check your production dashboard in ~2 minutes!

---

## 📝 Summary

**What You Need to Do:**

1. ✅ Add `bin_fill_level` (Number 0-100) to DynamoDB items
2. ✅ Add `current_day_streak` (Number 0+) to DynamoDB items
3. ✅ Test locally with `npm run dev`
4. ✅ Verify color coding and new metrics
5. ✅ Deploy to Vercel

**What Happens Automatically:**

- ✅ Dashboard pulls fill level from DynamoDB
- ✅ Dashboard pulls streak from DynamoDB
- ✅ Green/red color coding based on `waste_binary`
- ✅ Auto-refresh every 30 seconds
- ✅ Falls back to IoT data if DynamoDB attributes missing

---

Need help? Let me know which step you're on!
