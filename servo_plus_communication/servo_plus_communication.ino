/*
  ESP-NOW Receiver with Camera + Servos
  Sends data to Arduino IoT Cloud variables:
    - bool    recycle
    - int     recycling_distance
    - int     waste_distance

  IMPORTANT:
  - Replace any credentials here if you want to keep them private locally.
  - If you get compile errors related to ArduinoIoTCloud API calls,
    tell me the exact error and I'll adapt to your installed library version.
*/

#include "esp_camera.h"
#include <WiFi.h>
#include <ESP32Servo.h>
#include <WebServer.h>
#include <esp_now.h>

// Arduino IoT Cloud
#include "ArduinoIoTCloud.h"
#include "Arduino_ConnectionHandler.h"

// --------------------  DEVICE / WIFI CREDENTIALS  --------------------
// Device provisioning values (as provided)
const char DEVICE_ID[]    = "9205b4fe-48c7-425a-9fc5-cc4242e77a7c";     // Device ID (UUID)
const char DEVICE_SECRET[] = "1KRs9BDnANnmuIfuq??SX3dsQ";             // Device Secret Key

// Wi-Fi credentials (from your Secrets page)
const char WIFI_SSID[]     = "NETGEAR20";
const char WIFI_PASSWORD[] = "dizzywater213";

// --------------------  IoT Cloud "Thing" variables --------------------
// These must match the variable names & types you created in Arduino IoT Cloud
bool recycle = false;
int recycling_distance = 0;
int waste_distance = 0;

// Connection handler for Arduino IoT Cloud
WiFiConnectionHandler ArduinoIoTPreferredConnection(WIFI_SSID, WIFI_PASSWORD);

// --------------------  ESP-NOW / CAMERA / HARDWARE --------------------
// MAC of the ultrasonic ESP32 sender
uint8_t senderAddress[] = {0x04, 0x83, 0x08, 0x0D, 0xCD, 0xC8};

// Camera pins (Freenove ESP32-WROVER)
#define PWDN_GPIO_NUM    -1
#define RESET_GPIO_NUM   -1
#define XCLK_GPIO_NUM    21
#define SIOD_GPIO_NUM    26
#define SIOC_GPIO_NUM    27
#define Y9_GPIO_NUM      35
#define Y8_GPIO_NUM      34
#define Y7_GPIO_NUM      39
#define Y6_GPIO_NUM      36
#define Y5_GPIO_NUM      19
#define Y4_GPIO_NUM      18
#define Y3_GPIO_NUM      5
#define Y2_GPIO_NUM      4
#define VSYNC_GPIO_NUM   25
#define HREF_GPIO_NUM    23
#define PCLK_GPIO_NUM    22

WebServer server(80);

// Servos, LEDs, buttons
Servo myServo;
Servo myServo2;
const int recycleButtonPin = 2;
const int trashButtonPin = 15;
const int greenLedPin = 33;
const int redLedPin = 32;
const int servoPin = 13;
const int servo2Pin = 12;

bool lastRecycleButton = HIGH;
bool lastTrashButton = HIGH;

// Incoming data struct (must match sender)
typedef struct msg {
  int wasteFillPct;
  int recycFillPct;
} msg;
msg incomingData;

// Function prototypes
void startCameraServer();
void updateSystem();
void handleSerialInput(String cmd);

// --------------------  ESP-NOW RECEIVER CALLBACK  --------------------
void onDataRecv(const esp_now_recv_info_t *info, const uint8_t *data, int len) {
  // Defensive: ensure we don't copy beyond the struct if length is smaller
  if (len < (int)sizeof(incomingData)) {
    // If smaller, zero the struct then copy what we have
    memset(&incomingData, 0, sizeof(incomingData));
    memcpy(&incomingData, data, len);
  } else {
    memcpy(&incomingData, data, sizeof(incomingData));
  }

  Serial.println("=== ESP-NOW DATA RECEIVED ===");
  Serial.printf("Waste Fill: %d%%\n", incomingData.wasteFillPct);
  Serial.printf("Recycle Fill: %d%%\n", incomingData.recycFillPct);

  // Update Arduino IoT Cloud variables
  waste_distance = incomingData.wasteFillPct;
  recycling_distance = incomingData.recycFillPct;

  // Push updates to the cloud (ArduinoCloud.update() called in loop too)
  ArduinoCloud.update();

  // Hardware actions
  if (incomingData.wasteFillPct >= 80) {
    digitalWrite(redLedPin, HIGH);
    digitalWrite(greenLedPin, LOW);
    myServo.write(100);
    myServo2.write(180);
  } else if (incomingData.recycFillPct >= 80) {
    digitalWrite(redLedPin, LOW);
    digitalWrite(greenLedPin, HIGH);
    myServo.write(180);
    myServo2.write(100);
  } else {
    // Below thresholds - clear LEDs
    digitalWrite(redLedPin, LOW);
    digitalWrite(greenLedPin, LOW);
  }
}

// --------------------  Arduino IoT Cloud property registration  --------------------
void initProperties() {
  // Register variables with the IoT Cloud
  // The string names below are optional in some library versions — keep them simple.
  ArduinoCloud.addProperty(recycle, READWRITE, ON_CHANGE, NULL);
  ArduinoCloud.addProperty(recycling_distance, READWRITE, ON_CHANGE, NULL);
  ArduinoCloud.addProperty(waste_distance, READWRITE, ON_CHANGE, NULL);
}

// --------------------  Setup  --------------------
void setup() {
  Serial.begin(115200);
  delay(100);

  // ===== ESP-NOW receiver init (STA mode) =====
  WiFi.mode(WIFI_STA);
  Serial.print("Receiver MAC: ");
  Serial.println(WiFi.macAddress());

  if (esp_now_init() != ESP_OK) {
    Serial.println("ESP-NOW init failed!");
    // we continue because IoT Cloud may still be used if desired
  } else {
    esp_now_register_recv_cb(onDataRecv);

    // Optionally add peer (sender)
    esp_now_peer_info_t peerInfo = {};
    memcpy(peerInfo.peer_addr, senderAddress, 6);
    peerInfo.channel = 0;
    peerInfo.encrypt = false;
    esp_err_t r = esp_now_add_peer(&peerInfo);
    if (r != ESP_OK) {
      Serial.printf("esp_now_add_peer returned: %d (peer might already exist)\n", r);
    }
  }

  // ===== Initialize camera =====
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  config.frame_size = psramFound() ? FRAMESIZE_SVGA : FRAMESIZE_VGA;
  config.jpeg_quality = psramFound() ? 10 : 12;
  config.fb_count = psramFound() ? 2 : 1;

  if (esp_camera_init(&config) != ESP_OK) {
    Serial.println("Camera Init Failed");
  } else {
    startCameraServer();
  }

  // ===== IO setup =====
  pinMode(recycleButtonPin, INPUT);
  pinMode(trashButtonPin, INPUT);
  pinMode(greenLedPin, OUTPUT);
  pinMode(redLedPin, OUTPUT);
  myServo.attach(servoPin);
  myServo2.attach(servo2Pin);

  updateSystem();

  // ===== Arduino IoT Cloud init =====
  initProperties();

  // IMPORTANT: depending on ArduinoIoTCloud library version the functions used
  // to provide device credentials change. The most compatible flow is:
  //  - If the Web Editor created your sketch, it will have already embedded
  //    device provisioning calls in 'thingProperties.h' — you can use that instead.
  //
  // We'll attempt to start the cloud connection here using the WiFiConnectionHandler.
  // Some library versions require calling additional methods such as:
  //   ArduinoCloud.setThingId(...);
  //   ArduinoCloud.setDeviceId(...);
  //   ArduinoCloud.setSecretDeviceKey(...);
  //
  // If your library version requires explicit device provisioning calls, tell me
  // the compile error and I'll modify this block to match.
  //
  Serial.println("Connecting to Arduino IoT Cloud (using provided Wi-Fi creds)...");
  // ===== Arduino IoT Cloud initialization =====
  ArduinoCloud.setThingId("715f31bb-9043-420f-a302-6703925e5dae");
  ArduinoCloud.setDeviceId(DEVICE_ID);
  ArduinoCloud.setSecretDeviceKey(DEVICE_SECRET);
  ArduinoCloud.begin(ArduinoIoTPreferredConnection);
  setDebugMessageLevel(1);
  ArduinoCloud.printDebugInfo();

  // wait for connection
  unsigned long start = millis();
  while (!ArduinoCloud.connected() && millis() - start < 15000) {
    ArduinoCloud.update();
    delay(100);
  }

  if (ArduinoCloud.connected()) {
    Serial.println("Connected to Arduino IoT Cloud!");
  } else {
    Serial.println("Warning: Could not connect to Arduino IoT Cloud within timeout.");
    // still OK — code will continue and will update when connection becomes available
  }

  Serial.println("=== ESP32 RECEIVER READY ===");
}

// --------------------  Main loop  --------------------
void loop() {
  ArduinoCloud.update();   // keep cloud connection alive / sync variables
  server.handleClient();

  // Serial command processing (optional)
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    handleSerialInput(cmd);
  }

  // Button handling for manual recycle/waste toggle (debounced)
  bool recycleState = digitalRead(recycleButtonPin);
  bool trashState = digitalRead(trashButtonPin);

  if (recycleState == LOW && lastRecycleButton == HIGH) {
    delay(50);
    if (digitalRead(recycleButtonPin) == LOW) {
      recycle = true;
      ArduinoCloud.update();
      updateSystem();
    }
  }

  if (trashState == LOW && lastTrashButton == HIGH) {
    delay(50);
    if (digitalRead(trashButtonPin) == LOW) {
      recycle = false;
      ArduinoCloud.update();
      updateSystem();
    }
  }

  lastRecycleButton = recycleState;
  lastTrashButton = trashState;
}

// --------------------  Helper stubs  --------------------
// Minimal implementations for camera server + system update. Replace as needed.

void startCameraServer() {
  // You can copy your existing camera server code here (mjpeg streaming endpoints, etc.)
  // For brevity this is left as a stub. If you want, I can paste a complete camera server implementation.
  Serial.println("Camera server started (stub)");
}

void updateSystem() {
  // Called to apply the current 'recycle' mode to servos/LEDs if needed.
  if (recycle) {
    // e.g. select recycle servo positions
    myServo.write(180);
    myServo2.write(100);
    digitalWrite(greenLedPin, HIGH);
    digitalWrite(redLedPin, LOW);
  } else {
    // normal/waste mode default
    myServo.write(100);
    myServo2.write(180);
    digitalWrite(greenLedPin, LOW);
    digitalWrite(redLedPin, LOW);
  }
}

void handleSerialInput(String cmd) {
  if (cmd == "status") {
    Serial.printf("recycle=%d, recycling_distance=%d, waste_distance=%d\n",
                  recycle, recycling_distance, waste_distance);
  } else if (cmd == "forceCloudUpdate") {
    ArduinoCloud.update();
    Serial.println("Cloud update forced.");
  } else {
    Serial.println("Unknown command.");
  }
}
