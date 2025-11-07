#include <WiFi.h>
//#include <esp_wifi.h>
#include <esp_now.h>

// LCD
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
LiquidCrystal_I2C lcd(0x27, 16, 2); // 2 x 16 character display

// ultrasonic distance sensors
#define trigPinWaste 5 // trigger for distance sensor
#define echoPinWaste 18 // distance readout
#define trigPinRecycle 23
#define echoPinRecycle 32

#define maxBinDist 40 // known distance to bin bottom (in cm) // cm conversion: sensor_readout = pulseIn(distSensorPin, HIGH); (dist = sensor_readout * 0.034 / 2);
int fillWaste = 0;
int fillRecycle = 0;


// ESP-NOW to-address and message format
uint8_t = recvAddress[] = {0x24,0x24,0x24,0x24,0x24,0x24}; //// Receiver MAC Address

typedef struct msg {
  int wasteFillPct;
  int recycFillPct;
} msg;
msg binData;

void setup() {
  Serial.begin(115200);

  // distance sensor init
  pinMode(trigPinWaste, OUTPUT);
  pinMode(echoPinWaste, INPUT);
  pinMode(trigPinRecycle, OUTPUT);
  pinMode(echoPinRecycle, INPUT);

  // init lcd i2c
  Wire.begin(21, 22); // SDA, SCL
  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcd.setCursor(0,0);
  lcd.print("Trash Monitor");

  // ESP-NOW init
  WiFi.mode(WIFI_STA); // station mode
  esp_now_init();
  
  //esp_now_add_peer(recvAddress, ESP_NOW_ROLE_SLAVE, 1, NULL, 0); // legacy - remove
  // ESP-NOW peer init
  esp_now_peer_info_t peerInfo;
  memcpy(peerInfo.peer_addr, recvAddress, 6);
  peerInfo.channel = 1; //// match to receiver WiFi channel
  peerInfo.encrypt = false; // data transferred (bin fill levels) is 0-risk
  if (esp_now_add_peer(&peerInfo) != ESP_OK) { Serial.println("ESP-NOW peer registration failed"); return; }

  // get MAC address for ESP-NOW
  uint8_t mac[6];
  esp_read_mac(mac, ESP_MAC_WIFI_STA);
  Serial.println("Hello World! My MAC Address for ESP-NOW communication is ");
  for (int i = 0; i < sizeof(mac); i++) { Serial.printf("%02X ", mac[i]); }
  Serial.println();

}

// Function to read a sensor and convert to fill percentage
int readUltrasonic(int trigPin, int echoPin){
  // Trigger pulse
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  // Read echo
  long duration = pulseIn(echoPin, HIGH, 38000);

  // Calculate distance
  long distance = duration * 0.034 / 2;

  if(distance > maxBinDist || distance == 0) distance = maxBinDist;

  // Convert to fill %
  int fillLevel = map(distance, 0, maxBinDist, 100, 0);
  return constrain(fillLevel, 0, 100); // percentage as int
}

// Function to update LCD I2C
//// potential addition: error and warning readout codes to end of line
void lcdUpdate(int fillWaste, int fillRecycle) {
    lcd.clear();

    // Top row: Waste
    lcd.setCursor(0,0);
    if(fillWaste >= 80){
      lcd.print("FULL WASTE!");
    } else {
      lcd.print("Waste: ");
      lcd.print(fillWaste);
      lcd.print("% ");
    }

    // Bottom row: Recycle
    lcd.setCursor(0,1);
    if(fillRecycle >= 80){
      lcd.print("FULL RECYCLE!");
    } else {
      lcd.print("Recycle: ");
      lcd.print(fillRecycle);
      lcd.print("% ");
    }
}

unsigned long prevMillis = 0;
const long updateInterval = 15 * 1000; // 15s refresh time
//unsigned long prevLCDMillis = 0;
//const long lcdInterval = 1000;
void loop() {
  if (millis() - prevMillis > updateInterval || prevMillis == 0) {
    prevMillis = millis();

    // --- Print Timestamp --- // days = prevMillis/86400000;
    Serial.printf("h:m:s %02lu:%02lu:%02lu\n",
      (prevMillis/3600000)%24,
      (prevMillis/60000)%60,
      (prevMillis/1000)%60
    );

    // --- Waste sensor ---
    fillWaste = readUltrasonic(trigPinWaste, echoPinWaste);
    Serial.print("Waste Fill: "); Serial.print(fillWaste); Serial.println("%");

    // --- Recycle sensor ---
    fillRecycle = readUltrasonic(trigPinRecycle, echoPinRecycle);
    Serial.print("Recycle Fill: "); Serial.print(fillRecycle); Serial.println("%");

    // --- Update LCD ---
    lcdUpdate(fillWaste, fillRecycle);

    // --- Send sensor data ---
    binData.wasteFillPct = fillWaste;
    binData.recycFillPct = fillRecycle;
    esp_now_send(recvAddress, (uint8_t*)&binData, sizeof(binData));
  }
}
