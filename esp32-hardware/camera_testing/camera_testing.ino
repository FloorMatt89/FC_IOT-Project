#include "esp_camera.h"
#include <WiFi.h>
#include <ESP32Servo.h>
#include <WebServer.h>
#include "FS.h"
#include "SPIFFS.h"

// ====== Wi-Fi credentials ======
const char* ssid = "wyattphone";
const char* password = "minecraft";

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

// ===== File-saving function (NEW) =====
bool saveImageToSPIFFS() {
  camera_fb_t *fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("Camera capture failed");
    return false;
  }

  Serial.printf("Captured: %d bytes\n", fb->len);

  File file = SPIFFS.open("/photo.jpg", FILE_WRITE);
  if (!file) {
    Serial.println("Failed to open /photo.jpg");
    esp_camera_fb_return(fb);
    return false;
  }

  file.write(fb->buf, fb->len);
  file.close();
  esp_camera_fb_return(fb);

  Serial.println("Image saved as /photo.jpg");
  return true;
}

// ====== Camera Stream Function ======
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

// ====== Web Server Setup ======
void startCameraServer() {

  // Redirect root -> stream
  server.on("/", HTTP_GET, []() {
    server.sendHeader("Location", "/stream");
    server.send(302, "text/plain", "");
  });

  // Live Stream
  server.on("/stream", HTTP_GET, handle_jpg_stream);

  // ===== NEW: Take picture and save =====
  server.on("/capture", HTTP_GET, []() {
    bool ok = saveImageToSPIFFS();
    if (ok)
      server.send(200, "text/plain", "Image captured and saved as /photo.jpg");
    else
      server.send(500, "text/plain", "Capture failed");
  });

  // ===== NEW: Download the saved JPEG =====
  server.on("/photo", HTTP_GET, []() {
    if (!SPIFFS.exists("/photo.jpg")) {
      server.send(404, "text/plain", "No photo saved yet!");
      return;
    }

    File file = SPIFFS.open("/photo.jpg", FILE_READ);
    server.streamFile(file, "image/jpeg");
    file.close();
  });

  server.begin();
  Serial.println("Camera server started!");
}

void setup() {
  Serial.begin(115200);

  // WiFi connect
  WiFi.begin(ssid, password);
  Serial.printf("Connecting to WiFi %s", ssid);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected!");
  Serial.print("ESP32 IP: ");
  Serial.println(WiFi.localIP());

  // Init SPIFFS
  if (!SPIFFS.begin(true)) {
    Serial.println("SPIFFS Mount Failed!");
  } else {
    Serial.println("SPIFFS Mounted.");
  }

  // Camera config
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
    config.frame_size = FRAMESIZE_SVGA;   // AWS-friendly resolution
    config.jpeg_quality = 10;             // Good quality
    config.fb_count = 2;
  } else {
    config.frame_size = FRAMESIZE_VGA;
    config.jpeg_quality = 12;
    config.fb_count = 1;
  }

  // Init camera
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed! 0x%x\n", err);
  } else {
    Serial.println("Camera ready.");
  }

  startCameraServer();
}

void loop() {
  server.handleClient();
}
