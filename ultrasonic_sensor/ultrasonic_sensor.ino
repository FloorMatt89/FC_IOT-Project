// Pin definitions
const int trigPin = 5;
const int echoPin = 18;

// Trash can height in cm
const long trashCanHeight = 50; // adjust to your trash can

// Time tracking
unsigned long previousMillis = 0;
const long interval = 10000; // 10 seconds

void setup() {
  Serial.begin(115200);

  // Ultrasonic sensor pins
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
}

void loop() {
  unsigned long currentMillis = millis();

  // Only run every 10 seconds
  if(currentMillis - previousMillis >= interval){
    previousMillis = currentMillis;

    long duration, distance;

    // Trigger the ultrasonic pulse
    digitalWrite(trigPin, LOW);
    delayMicroseconds(2);
    digitalWrite(trigPin, HIGH);
    delayMicroseconds(10);
    digitalWrite(trigPin, LOW);

    // Read the echo
    duration = pulseIn(echoPin, HIGH);

    // Calculate distance in cm
    distance = duration * 0.034 / 2;

    // Clamp distance to trash can height
    if(distance > trashCanHeight) distance = trashCanHeight;

    // Calculate trash fill percentage
    int fillLevel = map(distance, 0, trashCanHeight, 100, 0); // 0cm = full, max height = empty
    fillLevel = constrain(fillLevel, 0, 100);

    // Print readings
    Serial.print("Distance: ");
    Serial.print(distance);
    Serial.print(" cm\t Fill Level: ");
    Serial.print(fillLevel);
    Serial.println("%");

    // Check if trash is ≥ 80% full
    if(fillLevel >= 80){
      Serial.println("⚠️ Trash is over 80%! Time to empty!");
    }
  }
}
