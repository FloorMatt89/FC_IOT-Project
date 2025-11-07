#include "esp_camera.h"
#include <WiFi.h>
#include <ESP32Servo.h>
#include <WebServer.h>
#include <esp_now.h>


// ====== Wi-Fi credentials ======
const char* ssid = "ATTfEqa6if";
const char* password = "hb6axzafb8bn";

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

// ====== Web Server for Camera Stream ======
WebServer server(80);

// ====== Servo and LED/Button Setup ======
Servo myServo;
Servo myServo2;

const int recycleButtonPin = 2;   // Button for recycling
const int trashButtonPin = 15;    // Button for trash
const int greenLedPin = 33;       // Green LED
const int redLedPin = 32;         // Red LED
const int servoPin = 13;          // Servo control pin
const int servo2Pin = 12;    // second servo pin (new)

bool isRecycling = false;
bool lastRecycleButton = HIGH;
bool lastTrashButton = HIGH;

// ===== Function Prototypes =====
void startCameraServer();
void handle_jpg_stream();
void updateSystem();
void handleSerialInput(String cmd);

typedef struct msg {
  int wasteFillPct;
  int recycFillPct;
} msg;

msg incomingData;

void onDataRecv(const esp_now_recv_info_t *recv_info, const uint8_t *incomingDataBytes, int len) {
  memcpy(&incomingData, incomingDataBytes, sizeof(incomingData));
  
  Serial.println("=== ESP-NOW Data Received ===");
  Serial.printf("Waste Fill: %d%%\n", incomingData.wasteFillPct);
  Serial.printf("Recycle Fill: %d%%\n", incomingData.recycFillPct);

  // Optional: print sender MAC
  Serial.print("From MAC: ");
  for (int i = 0; i < 6; i++) {
    Serial.printf("%02X", recv_info->src_addr[i]);
    if (i < 5) Serial.print(":");
  }
  Serial.println();

  // Example: control LEDs and servos
  if (incomingData.wasteFillPct >= 80) {
    digitalWrite(redLedPin, HIGH);
    digitalWrite(greenLedPin, LOW);
    myServo.write(100);
    myServo2.write(180);
    Serial.println("Trash full — closing trash chute.");
  } 
  else if (incomingData.recycFillPct >= 80) {
    digitalWrite(redLedPin, LOW);
    digitalWrite(greenLedPin, HIGH);
    myServo.write(180);
    myServo2.write(100);
    Serial.println("Recycle full — opening recycle chute.");
  }
}

// ===== Setup =====
void setup() {
  Serial.begin(115200);
  Serial.println();
  Serial.println("Starting ESP32 Camera + Servo System...");

  // ===== WiFi Connection =====
  WiFi.begin(ssid, password);
  Serial.printf("Connecting to WiFi: %s\n", ssid);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected!");
  Serial.print("Camera Stream URL: http://");
  Serial.println(WiFi.localIP());

  // ===== Initialize ESP-NOW =====
  if (esp_now_init() != ESP_OK) {
    Serial.println("Error initializing ESP-NOW");
  } else {
    Serial.println("ESP-NOW initialized!");
    esp_now_register_recv_cb(onDataRecv);
  }

  // ===== Camera Configuration =====
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
  config.pixel_format = PIXFORMAT_JPEG;  // Keep JPEG

  if (psramFound()) {
    config.frame_size = FRAMESIZE_SVGA;
    config.jpeg_quality = 10;
    config.fb_count = 2;
  } else {
    config.frame_size = FRAMESIZE_VGA;
    config.jpeg_quality = 12;
    config.fb_count = 1;
  }

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed! Error 0x%x\n", err);
  } else {
    Serial.println("Camera initialized successfully!");
  }

  // ===== Adjust Camera Settings =====
  sensor_t * s = esp_camera_sensor_get();
  if (s->id.PID == OV3660_PID) {
    s->set_vflip(s, 1);
    s->set_brightness(s, 1);
    s->set_saturation(s, -2);
  }

  // ===== Start Camera Server =====
  startCameraServer();

  // ===== Setup Servo + LEDs + Buttons =====
  pinMode(recycleButtonPin, INPUT);
  pinMode(trashButtonPin, INPUT);
  pinMode(greenLedPin, OUTPUT);
  pinMode(redLedPin, OUTPUT);

  myServo.attach(servoPin);
  myServo2.attach(servo2Pin);
  updateSystem(); // Initialize LEDs and servo

  Serial.println("\n=== System Ready ===");
  Serial.println("Type commands in Serial Monitor:");
  Serial.println("  recycle  -> switch to recycling mode");
  Serial.println("  trash    -> switch to trash mode");
  Serial.println("  status   -> show current mode");
  Serial.println("  help     -> list commands");
}

// ===== Main Loop =====
void loop() {
  server.handleClient();

  // Read Serial input
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    handleSerialInput(cmd);
  }

  // Optional: physical button handling
  bool recycleButtonState = digitalRead(recycleButtonPin);
  bool trashButtonState = digitalRead(trashButtonPin);

  if (recycleButtonState == LOW && lastRecycleButton == HIGH) {
    delay(50);
    if (digitalRead(recycleButtonPin) == LOW) {
      isRecycling = true;
      updateSystem();
      Serial.println("Mode: Recycling (Button)");
    }
  }

  if (trashButtonState == LOW && lastTrashButton == HIGH) {
    delay(50);
    if (digitalRead(trashButtonPin) == LOW) {
      isRecycling = false;
      updateSystem();
      Serial.println("Mode: Trash (Button)");
    }
  }

  lastRecycleButton = recycleButtonState;
  lastTrashButton = trashButtonState;
}

// ===== Serial Input Commands =====
void handleSerialInput(String cmd) {
  if (cmd.equalsIgnoreCase("recycle")) {
    isRecycling = true;
    updateSystem();
    Serial.println("Switched to: Recycling Mode");
  } 
  else if (cmd.equalsIgnoreCase("trash")) {
    isRecycling = false;
    updateSystem();
    Serial.println("Switched to: Trash Mode");
  } 
  else if (cmd.equalsIgnoreCase("status")) {
    Serial.print("Current Mode: ");
    Serial.println(isRecycling ? "Recycling" : "Trash");
  } 
  else if (cmd.equalsIgnoreCase("help")) {
    Serial.println("Available commands:");
    Serial.println("  recycle  -> switch to recycling mode");
    Serial.println("  trash    -> switch to trash mode");
    Serial.println("  status   -> show current mode");
    Serial.println("  help     -> list commands");
  } 
  else {
    Serial.println("Unknown command. Type 'help' for options.");
  }
}

// ===== LED + Servo Update Function =====
void updateSystem() {
  if (isRecycling) {
    digitalWrite(greenLedPin, HIGH);
    digitalWrite(redLedPin, LOW);
    myServo.write(180);  // Recycling position
    myServo2.write(100);
  } else {
    digitalWrite(greenLedPin, LOW);
    digitalWrite(redLedPin, HIGH);
    myServo.write(100);  // Trash position
    myServo2.write(180);
  }
}

// ===== Camera Streaming Functions =====
void handle_jpg_stream() {
  WiFiClient client = server.client();
  camera_fb_t * fb = NULL;
  String response = "HTTP/1.1 200 OK\r\n";
  response += "Content-Type: multipart/x-mixed-replace; boundary=frame\r\n\r\n";
  server.sendContent(response);

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
