#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// Pins
const int trigPin = 5;
const int echoPin = 18;

// Trash can height in cm
const long trashCanHeight = 50;

// Timing
unsigned long previousSensorMillis = 0;
const long sensorInterval = 5000; // read sensor every 5 sec
unsigned long previousLCDMillis = 0;
const long lcdInterval = 1000;    // update LCD every 1 sec

// LCD
LiquidCrystal_I2C lcd(0x27, 16, 2); // 0x27 matches your working example

long distance = 0;
int fillLevel = 0;

void setup() {
  Serial.begin(115200);

  // Ultrasonic sensor pins
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);

  // Initialize I2C on ESP32
  Wire.begin(21, 22); // SDA, SCL
  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcd.setCursor(0,0);
  lcd.print("Trash Monitor");
}

void loop() {
  unsigned long currentMillis = millis();

  // --- Read sensor every 5 sec ---
  if(currentMillis - previousSensorMillis >= sensorInterval){
    previousSensorMillis = currentMillis;

    // Trigger ultrasonic pulse
    digitalWrite(trigPin, LOW);
    delayMicroseconds(2);
    digitalWrite(trigPin, HIGH);
    delayMicroseconds(10);
    digitalWrite(trigPin, LOW);

    // Read echo with timeout
    long duration = pulseIn(echoPin,HIGH,38000);

    // Calculate distance in cm
    distance = duration * 0.034 / 2;

    // Clamp distance
    if(distance > trashCanHeight || distance == 0) distance = trashCanHeight;

    // Calculate fill %
    fillLevel = map(distance,0,trashCanHeight,100,0);
    fillLevel = constrain(fillLevel,0,100);

    Serial.print("Distance: "); Serial.print(distance);
    Serial.print(" cm\t Fill: "); Serial.println(fillLevel);
  }

  // --- Update LCD every 1 sec ---
  if(currentMillis - previousLCDMillis >= lcdInterval){
    previousLCDMillis = currentMillis;

    // Use same LCD logic as your working code
    lcd.setCursor(0,0);
    lcd.print("Fill:        "); // pad to clear old numbers
    lcd.setCursor(6,0);
    lcd.print(fillLevel);
    lcd.print("%");

    lcd.setCursor(0,1);
    if(fillLevel >= 80){
      lcd.print("Empty Trash!");
    } else {
      lcd.print("Status: OK  "); // pad with spaces
    }
  }
}
