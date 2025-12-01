#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// Pins
const int trigPinWaste = 5;
const int echoPinWaste = 18;

const int trigPinRecycle = 23;
const int echoPinRecycle = 32;

// Trash can height in cm
const long trashCanHeight = 50;

// Timing
unsigned long previousSensorMillis = 0;
const long sensorInterval = 5000; // read sensors every 5 sec
unsigned long previousLCDMillis = 0;
const long lcdInterval = 5000;    // update LCD every 5 sec

// LCD
LiquidCrystal_I2C lcd(0x27, 16, 2); // I2C address

// Fill levels
int fillWaste = 0;
int fillRecycle = 0;

void setup() {
  Serial.begin(115200);

  // Ultrasonic sensor pins
  pinMode(trigPinWaste, OUTPUT);
  pinMode(echoPinWaste, INPUT);
  pinMode(trigPinRecycle, OUTPUT);
  pinMode(echoPinRecycle, INPUT);

  // Initialize I2C and LCD
  Wire.begin(21, 22); // SDA, SCL
  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcd.setCursor(0,0);
  lcd.print("Trash Monitor");
}

void loop() {
  unsigned long currentMillis = millis();

  // --- Read sensors every 5 sec ---
  if(currentMillis - previousSensorMillis >= sensorInterval){
    previousSensorMillis = currentMillis;

    // --- Waste sensor ---
    fillWaste = readUltrasonic(trigPinWaste, echoPinWaste);
    Serial.print("Waste Fill: "); Serial.print(fillWaste); Serial.println("%");

    // --- Recycle sensor ---
    fillRecycle = readUltrasonic(trigPinRecycle, echoPinRecycle);
    Serial.print("Recycle Fill: "); Serial.print(fillRecycle); Serial.println("%");
  }

  // --- Update LCD every 1 sec ---
  if(currentMillis - previousLCDMillis >= lcdInterval){
    previousLCDMillis = currentMillis;

    lcd.clear();

    // Top row: Waste
    lcd.setCursor(0,0);
    if(fillWaste >= 80){
      lcd.print("EMPTY WASTE!");
    } else {
      lcd.print("Waste: ");
      lcd.print(fillWaste);
      lcd.print("%");
    }

    // Bottom row: Recycle
    lcd.setCursor(0,1);
    if(fillRecycle >= 80){
      lcd.print("EMPTY RECYCLE!");
    } else {
      lcd.print("Recycle: ");
      lcd.print(fillRecycle);
      lcd.print("%");
    }
  }
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

  if(distance > trashCanHeight || distance == 0) distance = trashCanHeight;

  // Convert to fill %
  int fillLevel = map(distance, 0, trashCanHeight, 100, 0);
  return constrain(fillLevel, 0, 100);
}
