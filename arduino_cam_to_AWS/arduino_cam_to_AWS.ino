#include "esp_camera.h"
#include <WiFi.h>
#include <HTTPClient.h>           // <---- Added for AWS POST
#include <ESP32Servo.h>
#include <WebServer.h>

// ====== Wi-Fi credentials ======
const char* ssid = "wyattphone";
const char* password = "minecraft";

// ===== AWS API Gateway Endpoint =====
// REPLACE THIS WITH YOUR REAL ENDPOINT
String awsUrl = "https://YOUR_API_ID.execute-api.YOUR_REGION.amazonaws.com/analyze";

// ====== Camera Pin Mapping (Freenove ESP32-WROVER) ======
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

// ====== Servo + LEDs ======
Servo myServo;
Servo myServo2;

const int recycleButtonPin = 2;
const int trashButtonPin = 15;
const int greenLedPin = 33;
const int redLedPin = 32;
const int servoPin = 13;
const int servo2Pin = 12;

bool isRecycling = false;
bool lastRecycleButton = HIGH;
bool lastTrashButton = HIGH;

// ===== Function Prototypes =====
void startCameraServer();
void handle_jpg_stream();
void updateSystem();
void handleSerialInput(String cmd);

// ===== AWS Function Prototype =====
String sendImageToAWS();

// ===== Setup =====
void setup() {
  Serial.begin(115200);
  Serial.println("\nStarting ESP32 Camera...");

  WiFi.begin(ssid, password);
  Serial.printf("Connecting to WiFi %s\n", ssid);
  while (WiFi.status() != WL_CONNECTED) {
    delay(400); Serial.print(".");
  }
  Serial.println("\nWiFi connected!");

  Serial.print("Stream URL: http://");
  Serial.println(WiFi.localIP());

  // ===== Camera Config =====
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

  if (psramFound()) {
    config.frame_size = FRAMESIZE_SVGA;
    config.jpeg_quality = 10;
    config.fb_count = 2;
  } else {
    config.frame_size = FRAMESIZE_VGA;
    config.jpeg_quality = 12;
    config.fb_count = 1;
  }

  if (esp_camera_init(&config) != ESP_OK) {
    Serial.println("Camera init failed!");
  }

  startCameraServer();

  pinMode(recycleButtonPin, INPUT);
  pinMode(trashButtonPin, INPUT);
  pinMode(greenLedPin, OUTPUT);
  pinMode(redLedPin, OUTPUT);

  myServo.attach(servoPin);
  myServo2.attach(servo2Pin);

  updateSystem();

  Serial.println("\n=== READY ===");
  Serial.println("Commands:");
  Serial.println("  classify  -> take picture & send to AWS");
  Serial.println("  recycle   -> force recycling mode");
  Serial.println("  trash     -> force trash mode");
  Serial.println("  status    -> show mode");
}

// ===== Main Loop =====
void loop() {
  server.handleClient();

  // Serial commands
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    handleSerialInput(cmd);
  }

  // Button logic
  bool recycleButtonState = digitalRead(recycleButtonPin);
  bool trashButtonState = digitalRead(trashButtonPin);

  if (recycleButtonState == LOW && lastRecycleButton == HIGH) {
    delay(50);
    if (digitalRead(recycleButtonPin) == LOW) {
      isRecycling = true;
      updateSystem();
      Serial.println("Mode: Recycling (button)");
    }
  }

  if (trashButtonState == LOW && lastTrashButton == HIGH) {
    delay(50);
    if (digitalRead(trashButtonPin) == LOW) {
      isRecycling = false;
      updateSystem();
      Serial.println("Mode: Trash (button)");
    }
  }

  lastRecycleButton = recycleButtonState;
  lastTrashButton = trashButtonState;
}

// ===== Serial Input Commands =====
void handleSerialInput(String cmd) {
  if (cmd.equalsIgnoreCase("classify")) {
    Serial.println("Capturing image and sending to AWS...");
    String result = sendImageToAWS();
    Serial.print("AWS Result: ");
    Serial.println(result);

    if (result == "Recycling") {
      isRecycling = true;
    } else if (result == "Trash") {
      isRecycling = false;
    }

    updateSystem();
  }
  else if (cmd.equalsIgnoreCase("recycle")) {
    isRecycling = true;
    updateSystem();
  }
  else if (cmd.equalsIgnoreCase("trash")) {
    isRecycling = false;
    updateSystem();
  }
  else if (cmd.equalsIgnoreCase("status")) {
    Serial.println(isRecycling ? "Recycling" : "Trash");
  }
}

// ===== AWS: Capture & Send Image =====
String sendImageToAWS() {
  camera_fb_t *fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("Camera error!");
    return "Error";
  }

  HTTPClient http;
  http.begin(awsUrl);
  http.addHeader("Content-Type", "application/octet-stream");

  int httpCode = http.POST(fb->buf, fb->len);
  String payload = http.getString();

  http.end();
  esp_camera_fb_return(fb);

  if (httpCode != 200) {
    Serial.print("AWS Error: ");
    Serial.println(httpCode);
    return "Error";
  }

  // payload should be: {"class":"Recycling"}
  if (payload.indexOf("Recycling") >= 0) return "Recycling";
  if (payload.indexOf("Trash") >= 0) return "Trash";

  return "Unknown";
}

// ===== LED + Servo =====
void updateSystem() {
  if (isRecycling) {
    digitalWrite(greenLedPin, HIGH);
    digitalWrite(redLedPin, LOW);
    myServo.write(180);
    myServo2.write(100);
  } else {
    digitalWrite(greenLedPin, LOW);
    digitalWrite(redLedPin, HIGH);
    myServo.write(100);
    myServo2.write(180);
  }
}

// ===== Camera Stream =====
void handle_jpg_stream() {
  WiFiClient client = server.client();
  camera_fb_t * fb = NULL;

  server.sendContent(
    "HTTP/1.1 200 OK\r\n"
    "Content-Type: multipart/x-mixed-replace; boundary=frame\r\n\r\n"
  );

  while (client.connected()) {
    fb = esp_camera_fb_get();
    if (!fb) continue;

    server.sendContent("--frame\r\nContent-Type: image/jpeg\r\n\r\n");
    client.write(fb->buf, fb->len);
    server.sendContent("\r\n");

    esp_camera_fb_return(fb);
  }
}

void startCameraServer() {
  server.on("/", HTTP_GET, []() {
    server.sendHeader("Location", "/stream");
    server.send(302, "text/plain", "");
  });

  server.on("/stream", HTTP_GET, handle_jpg_stream);
  server.begin();
  Serial.println("Camera server started!");
}
