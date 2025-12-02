# AWS IoT Setup Guide for EcoTradeBin

## Overview

This guide will help you set up 2 ESP32 devices to report data to AWS IoT Core and display it on your dashboard.

## Part 1: AWS IoT Core Setup

### Step 1: Create IAM User for IoT Access

1. Go to **AWS Console** → **IAM** → **Users** → **Create User**
2. User name: `ecotradebin-iot-user`
3. Attach policies:
   - `AWSIoTDataAccess`
   - `AWSIoTConfigAccess`
4. Create **Access Key** → Copy `Access Key ID` and `Secret Access Key`

### Step 2: Create IoT Things

1. Go to **AWS Console** → **IoT Core** → **All devices** → **Things**
2. Click **Create things** → **Create single thing**

**For Device 1:**
- Thing name: `ecotradebin-device-1`
- Device Shadow: **Named shadow** → Name: `default`
- Click **Next**

**For Device 2:**
- Repeat with thing name: `ecotradebin-device-2`

### Step 3: Create Certificates for Each Device

For each thing:
1. Click **Create thing** → **Auto-generate a new certificate**
2. Download:
   - Device certificate (`.pem.crt`)
   - Private key (`.pem.key`)
   - Root CA certificate
3. **Activate** the certificate
4. Attach policy (create if needed):
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "iot:Connect",
           "iot:Publish",
           "iot:Subscribe",
           "iot:Receive"
         ],
         "Resource": "*"
       }
     ]
   }
   ```

### Step 4: Get Your AWS IoT Endpoint

```bash
aws iot describe-endpoint --endpoint-type iot:Data-ATS
```

Or in AWS Console → **IoT Core** → **Settings** → Copy the **Endpoint**

Example: `a1b2c3d4e5f6g7-ats.iot.us-east-1.amazonaws.com`

## Part 2: Configure Environment Variables

### For Local Development

Edit `ecotradebin-dashboard/.env.local`:

```bash
# AWS IoT Configuration
AWS_IOT_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_iam_access_key
AWS_SECRET_ACCESS_KEY=your_iam_secret_key
AWS_IOT_DEVICE_1_NAME=ecotradebin-device-1
AWS_IOT_DEVICE_2_NAME=ecotradebin-device-2
```

### For Production (Vercel)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add these 5 variables for **Production**, **Preview**, and **Development**:
   - `AWS_IOT_REGION`
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_IOT_DEVICE_1_NAME`
   - `AWS_IOT_DEVICE_2_NAME`

5. Click **Save**
6. **Redeploy** your app from the Deployments tab

## Part 3: ESP32 Code

### Install Required Libraries

In Arduino IDE:
1. **Sketch** → **Include Library** → **Manage Libraries**
2. Install:
   - `PubSubClient` by Nick O'Leary
   - `ArduinoJson` by Benoit Blanchon
   - `WiFiClientSecure`

### ESP32 Code Example

```cpp
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// AWS IoT Core endpoint
const char* aws_iot_endpoint = "your-endpoint.iot.us-east-1.amazonaws.com";

// Device name
const char* thing_name = "ecotradebin-device-1";

// Certificates (paste your certificates here)
const char* root_ca = R"EOF(
-----BEGIN CERTIFICATE-----
...your root CA certificate...
-----END CERTIFICATE-----
)EOF";

const char* device_cert = R"EOF(
-----BEGIN CERTIFICATE-----
...your device certificate...
-----END CERTIFICATE-----
)EOF";

const char* private_key = R"EOF(
-----BEGIN RSA PRIVATE KEY-----
...your private key...
-----END RSA PRIVATE KEY-----
)EOF";

WiFiClientSecure wifi_client;
PubSubClient mqtt_client(wifi_client);

// Sensor pins
#define ULTRASONIC_TRIG 5
#define ULTRASONIC_ECHO 18

// Device state
int binFillLevel = 0;
int itemsThisWeek = 0;
int currentStreak = 0;
int recyclingRate = 75;

void setup() {
  Serial.begin(115200);
  pinMode(ULTRASONIC_TRIG, OUTPUT);
  pinMode(ULTRASONIC_ECHO, INPUT);

  connectWiFi();

  wifi_client.setCACert(root_ca);
  wifi_client.setCertificate(device_cert);
  wifi_client.setPrivateKey(private_key);

  mqtt_client.setServer(aws_iot_endpoint, 8883);
  connectAWS();
}

void loop() {
  if (!mqtt_client.connected()) {
    connectAWS();
  }
  mqtt_client.loop();

  static unsigned long lastUpdate = 0;
  if (millis() - lastUpdate > 5000) {
    lastUpdate = millis();
    binFillLevel = readBinFillLevel();
    updateDeviceShadow();
  }
}

void connectWiFi() {
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected!");
}

void connectAWS() {
  while (!mqtt_client.connected()) {
    if (mqtt_client.connect(thing_name)) {
      Serial.println("AWS IoT Connected!");
    } else {
      delay(5000);
    }
  }
}

void updateDeviceShadow() {
  StaticJsonDocument<256> doc;
  JsonObject state = doc.createNestedObject("state");
  JsonObject reported = state.createNestedObject("reported");

  reported["binFillLevel"] = binFillLevel;
  reported["isConnected"] = true;
  reported["itemsThisWeek"] = itemsThisWeek;
  reported["currentStreak"] = currentStreak;
  reported["recyclingRate"] = recyclingRate;

  char jsonBuffer[256];
  serializeJson(doc, jsonBuffer);

  String topic = "$aws/things/" + String(thing_name) + "/shadow/update";
  mqtt_client.publish(topic.c_str(), jsonBuffer);
}

int readBinFillLevel() {
  digitalWrite(ULTRASONIC_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(ULTRASONIC_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(ULTRASONIC_TRIG, LOW);

  long duration = pulseIn(ULTRASONIC_ECHO, HIGH);
  int distance = duration * 0.034 / 2;
  int fillLevel = map(distance, 50, 0, 0, 100);
  return constrain(fillLevel, 0, 100);
}
```

## Part 4: Testing

### Test Dashboard Locally

```bash
cd ecotradebin-dashboard
npm run dev
```

Visit http://localhost:3000 and click the Recycling tab.

### Test API Endpoint

```bash
curl http://localhost:3000/api/iot/devices
```

### Verify in AWS Console

Go to AWS IoT Core → Your Thing → Device Shadow to see the reported state.

## Troubleshooting

See the guide for detailed troubleshooting steps.

Your IoT integration is complete! 🎉
