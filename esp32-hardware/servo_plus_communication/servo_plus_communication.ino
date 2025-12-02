/*
  ESP-NOW Receiver with Camera + Servos
  Sends data to AWS IoT Core:
    - bool    recycle
    - int     recycling_distance
    - int     waste_distance
*/

#include "esp_camera.h"
#include <WiFi.h>
#include <ESP32Servo.h>
#include <WebServer.h>
#include <esp_now.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>

// --------------------  DEVICE / WIFI CREDENTIALS  --------------------
const char WIFI_SSID[]     = "<hidden>";
const char WIFI_PASSWORD[] = "<hidden>";

// AWS IoT credentials (replace with your own certs/endpoint)
const char* aws_endpoint = "YOUR_AWS_IOT_ENDPOINT_HERE";  // e.g., xxxxxxxx-ats.iot.us-east-1.amazonaws.com
const int   aws_port     = 8883;

const char* ca_cert = \
"-----BEGIN CERTIFICATE-----\n" \
"...YOUR_ROOT_CA...\n" \
"-----END CERTIFICATE-----\n";

const char* client_cert = \
"-----BEGIN CERTIFICATE-----\n" \
"...YOUR_DEVICE_CERT...\n" \
"-----END CERTIFICATE-----\n";

const char* private_key = \
"-----BEGIN PRIVATE KEY-----\n" \
"...YOUR_PRIVATE_KEY...\n" \
"-----END PRIVATE KEY-----\n";

// MQTT topics
const char* pub_topic = "trashbin/data";
const char* sub_topic = "trashbin/commands";

// --------------------  IoT Variables --------------------
bool recycle = false;
int recycling_distance = 0;
int waste_distance = 0;

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

// ---- Ultrasonic Sensor ----
const int trigPin = 14;
const int echoPin = 0;

bool detected = false;       
int detectionThreshold = 12; // distance in cm to trigger detection

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

// --------------------  AWS MQTT --------------------
WiFiClientSecure secureClient;
PubSubClient mqttClient(secureClient);

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String msg;
  for (unsigned int i = 0; i < length; i++) msg += (char)payload[i];
  Serial.print("Message received on topic ");
  Serial.println(topic);
  Serial.println(msg);

  if (msg == "recycle") recycle = true;
  if (msg == "waste")   recycle = false;

  updateSystem();
}

void connectAWS() {
  secureClient.setCACert(ca_cert);
  secureClient.setCertificate(client_cert);
  secureClient.setPrivateKey(private_key);

  mqttClient.setServer(aws_endpoint, aws_port);
  mqttClient.setCallback(mqttCallback);

  while (!mqttClient.connected()) {
    Serial.println("Connecting to AWS IoT...");
    if (mqttClient.connect("ESP32_Trashbin")) {
      Serial.println("Connected to AWS IoT!");
      mqttClient.subscribe(sub_topic);
    } else {
      Serial.print("Failed, rc=");
      Serial.print(mqttClient.state());
      delay(2000);
    }
  }
}

void publishData() {
  String payload = "{";
  payload += "\"recycle\":" + String(recycle ? "true" : "false") + ",";
  payload += "\"waste_distance\":" + String(waste_distance) + ",";
  payload += "\"recycling_distance\":" + String(recycling_distance);
  payload += "}";

  mqttClient.publish(pub_topic, payload.c_str());
}

// --------------------  ESP-NOW RECEIVER CALLBACK --------------------
void onDataRecv(const esp_now_recv_info_t *info, const uint8_t *data, int len) {
  if (len < (int)sizeof(incomingData)) {
    memset(&incomingData, 0, sizeof(incomingData));
    memcpy(&incomingData, data, len);
  } else {
    memcpy(&incomingData, data, sizeof(incomingData));
  }

  Serial.println("=== ESP-NOW DATA RECEIVED ===");
  Serial.printf("Waste Fill: %d%%\n", incomingData.wasteFillPct);
  Serial.printf("Recycle Fill: %d%%\n", incomingData.recycFillPct);

  waste_distance = incomingData.wasteFillPct;
  recycling_distance = incomingData.recycFillPct;

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
    digitalWrite(redLedPin, LOW);
    digitalWrite(greenLedPin, LOW);
  }
}

// --------------------  Helper Functions --------------------
long readUltrasonic() {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  long duration = pulseIn(echoPin, HIGH, 30000);
  long distance = duration * 0.034 / 2;
  return distance > 400 ? 400 : distance;
}

void startCameraServer() {
  Serial.println("Camera server started (stub)");
}

void updateSystem() {
  if (recycle) {
    myServo.write(180);
    myServo2.write(100);
    digitalWrite(greenLedPin, HIGH);
    digitalWrite(redLedPin, LOW);
  } else {
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
    publishData();
    Serial.println("AWS IoT data published.");
  } else {
    Serial.println("Unknown command.");
  }
}

// --------------------  Setup --------------------
void setup() {
  Serial.begin(115200);
  delay(100);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(500);
  }
  Serial.println("\nWiFi connected!");

  // ===== ESP-NOW =====
  if (esp_now_init() != ESP_OK) {
    Serial.println("ESP-NOW init failed!");
  } else {
    esp_now_register_recv_cb(onDataRecv);

    esp_now_peer_info_t peerInfo = {};
    memcpy(peerInfo.peer_addr, senderAddress, 6);
    peerInfo.channel = 0;
    peerInfo.encrypt = false;
    esp_err_t r = esp_now_add_peer(&peerInfo);
    if (r != ESP_OK) Serial.printf("esp_now_add_peer returned: %d\n", r);
  }

  // ===== Camera =====
  camera_config_t config = {};
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM; config.pin_d1 = Y3_GPIO_NUM; config.pin_d2 = Y4_GPIO_NUM; config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM; config.pin_d5 = Y7_GPIO_NUM; config.pin_d6 = Y8_GPIO_NUM; config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM; config.pin_pclk = PCLK_GPIO_NUM; config.pin_vsync = VSYNC_GPIO_NUM; config.pin_href = HREF_GPIO_NUM;
  config.pin_sscb_sda = SIOD_GPIO_NUM; config.pin_sscb_scl = SIOC_GPIO_NUM; config.pin_pwdn = PWDN_GPIO_NUM; config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000; config.pixel_format = PIXFORMAT_JPEG;
  config.frame_size = psramFound() ? FRAMESIZE_SVGA : FRAMESIZE_VGA;
  config.jpeg_quality = psramFound() ? 10 : 12; config.fb_count = psramFound() ? 2 : 1;

  if (esp_camera_init(&config) != ESP_OK) Serial.println("Camera Init Failed");
  else startCameraServer();

  // ===== Pins =====
  pinMode(recycleButtonPin, INPUT);
  pinMode(trashButtonPin, INPUT);
  pinMode(greenLedPin, OUTPUT);
  pinMode(redLedPin, OUTPUT);
  myServo.attach(servoPin);
  myServo2.attach(servo2Pin);

  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);

  updateSystem();

  // ===== AWS IoT =====
  connectAWS();

  Serial.println("=== ESP32 RECEIVER READY ===");
}

// --------------------  Main Loop --------------------
void loop() {
  mqttClient.loop();
  server.handleClient();

  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    handleSerialInput(cmd);
  }

  bool recycleState = digitalRead(recycleButtonPin);
  bool trashState   = digitalRead(trashButtonPin);

  if (recycleState == LOW && lastRecycleButton == HIGH) {
    delay(50);
    if (digitalRead(recycleButtonPin) == LOW) {
      recycle = true;
      updateSystem();
    }
  }
  if (trashState == LOW && lastTrashButton == HIGH) {
    delay(50);
    if (digitalRead(trashButtonPin) == LOW) {
      recycle = false;
      updateSystem();
    }
  }

  lastRecycleButton = recycleState;
  lastTrashButton   = trashState;

  long distance = readUltrasonic();
  if (distance < detectionThreshold && distance > 0) {
    if (!detected) {
      detected = true;
      Serial.println("ULTRASONIC: Object detected! Starting classification...");
    }
  } else {
    if (detected) {
      detected = false;
      Serial.println("ULTRASONIC: Object removed.");
    }
  }

  publishData();  // send updated variables to AWS IoT
  delay(2000);    // adjust update rate as needed
}
