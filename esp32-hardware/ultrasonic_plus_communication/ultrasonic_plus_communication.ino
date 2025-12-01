#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <WiFi.h>
#include <esp_now.h>

// ===== RECEIVER MAC ADDRESS =====
// (Receiver ESP32 = where camera, servos, LEDs, IoT Cloud are)
uint8_t receiverMAC[] = {0x04, 0x83, 0x08, 0x0C, 0xCA, 0x68};

// ===== ESP-NOW STRUCTURE =====
typedef struct binData {
  int wasteFillPct;
  int recycFillPct;
} binData;

binData outgoingData;

// ===== Ultrasonic Pins =====
const int trigPinWaste = 5;
const int echoPinWaste = 18;
const int trigPinRecycle = 23;
const int echoPinRecycle = 32;

// ===== Trash Bin Height (cm) =====
const long trashCanHeight = 50;

// ===== Timing Control =====
unsigned long previousSensorMillis = 0;
const long sensorInterval = 5000; // Read every 5 sec

unsigned long previousLCDMillis = 0;
const long lcdInterval = 5000;    // Refresh LCD every 5 sec

// ===== LCD =====
LiquidCrystal_I2C lcd(0x27, 16, 2);

// ===== Fill Levels =====
int fillWaste = 0;
int fillRecycle = 0;

// ===== Function Prototype =====
int readUltrasonic(int trigPin, int echoPin);

void setup() {
  Serial.begin(115200);

  // Ultrasonic pins
  pinMode(trigPinWaste, OUTPUT);
  pinMode(echoPinWaste, INPUT);
  pinMode(trigPinRecycle, OUTPUT);
  pinMode(echoPinRecycle, INPUT);

  // LCD
  Wire.begin(21, 22);
  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Trash Monitor");

  // ===== ESP-NOW INIT =====
  WiFi.mode(WIFI_STA);  
  Serial.print("Sender MAC: ");
  Serial.println(WiFi.macAddress());

  if (esp_now_init() != ESP_OK) {
    Serial.println("ESP-NOW INIT FAILED!");
    return;
  }

  // Register receiver
  esp_now_peer_info_t peerInfo = {};
  memcpy(peerInfo.peer_addr, receiverMAC, 6);
  peerInfo.channel = 0;
  peerInfo.encrypt = false;

  if (esp_now_add_peer(&peerInfo) != ESP_OK) {
    Serial.println("Failed to add ESP-NOW peer!");
    return;
  }

  Serial.println("ESP32 #1 Ready (Ultrasonic + Sender)");
}

void loop() {
  unsigned long currentMillis = millis();

  // ===== Read sensors every 5 seconds =====
  if (currentMillis - previousSensorMillis >= sensorInterval) {
    previousSensorMillis = currentMillis;

    fillWaste = readUltrasonic(trigPinWaste, echoPinWaste);
    fillRecycle = readUltrasonic(trigPinRecycle, echoPinRecycle);

    Serial.print("Waste Fill: "); Serial.println(fillWaste);
    Serial.print("Recycle Fill: "); Serial.println(fillRecycle);

    // Send via ESP-NOW
    outgoingData.wasteFillPct = fillWaste;
    outgoingData.recycFillPct = fillRecycle;

    esp_err_t result = esp_now_send(receiverMAC, (uint8_t *)&outgoingData, sizeof(outgoingData));
    Serial.println(result == ESP_OK ? "ESP-NOW SEND: OK" : "ESP-NOW SEND: ERROR");
  }

  // ===== LCD Update =====
  if (currentMillis - previousLCDMillis >= lcdInterval) {
    previousLCDMillis = currentMillis;

    lcd.clear();

    lcd.setCursor(0, 0);
    if (fillWaste >= 80) {
      lcd.print("EMPTY TRASH");
    } else {
      lcd.print("Waste: ");
      lcd.print(fillWaste);
      lcd.print("%");
    }

    lcd.setCursor(0, 1);
    if (fillRecycle >= 80) {
      lcd.print("EMPTY RECYCLE");
    } else {
      lcd.print("Recycle: ");
      lcd.print(fillRecycle);
      lcd.print("%");
    }
  }
}

// ===== Ultrasonic Distance to Fill % =====
int readUltrasonic(int trigPin, int echoPin) {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(3);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  long duration = pulseIn(echoPin, HIGH, 38000);
  long distance = duration * 0.034 / 2;

  // Handle invalid readings
  if (distance <= 1 || distance > trashCanHeight) {
    distance = trashCanHeight;
  }

  int fillLevel = map(distance, trashCanHeight, 0, 0, 100);
  return constrain(fillLevel, 0, 100);
}
