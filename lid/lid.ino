#include <ESP32Servo.h>

Servo myServo;

// Pin setup
const int recycleButtonPin = 2;  // Button for recycling
const int trashButtonPin = 4;    // Button for trash
const int greenLedPin = 26;      // Green LED
const int redLedPin = 25;        // Red LED
const int servoPin = 13;         // Servo control pin

// State variables
bool isRecycling = false;
bool lastRecycleButton = HIGH;
bool lastTrashButton = HIGH;

void setup() {
  Serial.begin(115200);

  pinMode(recycleButtonPin, );
  pinMode(trashButtonPin, INPUT_PULLUP);
  pinMode(greenLedPin, OUTPUT);
  pinMode(redLedPin, OUTPUT);

  myServo.attach(servoPin);
  updateSystem(); // Initialize LEDs and servo position
}

void loop() {
  bool recycleButtonState = digitalRead(recycleButtonPin);
  bool trashButtonState = digitalRead(trashButtonPin);

  // Recycle button pressed
  if (recycleButtonState == LOW && lastRecycleButton == HIGH) {
    delay(50); // debounce
    if (digitalRead(recycleButtonPin) == LOW) {
      isRecycling = true;
      updateSystem();
      Serial.println("Mode: Recycling");
    }
  }

  // Trash button pressed
  if (trashButtonState == LOW && lastTrashButton == HIGH) {
    delay(50); // debounce
    if (digitalRead(trashButtonPin) == LOW) {
      isRecycling = false;
      updateSystem();
      Serial.println("Mode: Trash");
    }
  }

  lastRecycleButton = recycleButtonState;
  lastTrashButton = trashButtonState;
}

void updateSystem() {
  if (isRecycling) {
    digitalWrite(greenLedPin, HIGH);
    digitalWrite(redLedPin, LOW);
    myServo.write(90);  // Example position for recycling
  } else {
    digitalWrite(greenLedPin, LOW);
    digitalWrite(redLedPin, HIGH);
    myServo.write(0);   // Example position for trash
  }
}
