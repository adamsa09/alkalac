/*
  Adam Sarhan & Lucas Dauth - Alkalac
  Complete project details at https://github.com/adamsa09/alkalac
*/

// Import required libraries
#include <WiFi.h>
#include <ESPAsyncWebServer.h>
#include <AsyncTCP.h>
#include <FS.h>
#include <LittleFS.h>
#include <Wire.h>
#include <time.h>
#include <ArduinoJson.h>
#include "certs.h"


#define DISPENSE_DATA_PATH "/dispense_data.jsonl"
#define PH_DATA_PATH "/ph_data.jsonl"
#define PH_PIN 34

#define DIR_PIN 26
#define STEP_PIN 27

// Helper function prototype defs
void appendReading(const char* timestamp, float pH);
void mountFS();
void moveMotor();

// Classic wifi credentials
const char* ssid = "";
const char* password = "";


const char* ntpServer = "pool.ntp.org";
const long gmtOffset_sec = 0;
const int daylightOffset_sec = 0;

// pH sensor calibration TODO
const float slope = 3.8230475;
const float intercept = 0.04696;

// Stepper revolutions
const int stepsToTake = 200;
const int stepDelay = 2000; // Higher value = slower spin

// Create AsyncWebServer object on port 80
AsyncWebServer server(80);

// Time management (write to data.json every <writeInterval> minutes)
unsigned long lastReadTime = 0;
unsigned long writeInterval = 60000;


void setup() {
  // Serial port for debugging purposes
  Serial.begin(115200);

  // Initialize LittleFS
  if (!LittleFS.begin()) {
    Serial.println("An Error has occurred while mounting LittleFS");
    return;
  }

  // Connect to classic wifi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.println("Connecting to WiFi..");
  }
  // Print ESP32 Local IP Address
  Serial.println(WiFi.localIP());

 
  while (WiFi.status() != WL_CONNECTED) {
      delay(1000);
      Serial.println("Connecting to WiFi...");
  }
  Serial.println(WiFi.localIP());

  pinMode(STEP_PIN, OUTPUT);
  pinMode(DIR_PIN, OUTPUT);

  digitalWrite(STEP_PIN, HIGH);
  digitalWrite(DIR_PIN, LOW);


  mountFS();

  // Start server
  server.begin();

  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);

  lastReadTime = millis();
}

void loop() {
  if (millis() - lastReadTime >= writeInterval) {
    // // Generate pH value: units between 5-8, two random decimal places -- TESTING ONLY -- USE REAL PH READING IN PRODUCTION
    // int units = random(5, 9);  // 5 to 8 inclusive
    // int tenths = random(0, 10);
    // int hundredths = random(0, 10);
    // float phValue = units + (tenths / 10.0) + (hundredths / 100.0);

    float phValue = slope * analogReadMilliVolts(PH_PIN) / 1000.0 + intercept;
    
    lastReadTime = millis();
    Serial.print("Read: ");
    Serial.print(phValue);
    Serial.print(" @ ");

    struct tm timeinfo;
    while (!getLocalTime(&timeinfo)) delay(500);

    char iso[30];
    strftime(iso, sizeof(iso), "%Y-%m-%dT%H:%M:%SZ", &timeinfo);

    Serial.println(iso);

    appendReading(iso, phValue); // Append reading to data.jsonl

    if (phValue < 6) {
      moveMotor();
      appendDispense(iso, phValue);
    }
  }
}

// ------------------------------------------------------------------------------------------

void appendReading(const char* timestamp, float pH) {
  File file = LittleFS.open(PH_DATA_PATH, "a");
  if (!file) {
    Serial.println("Failed to open ph_data.jsonl for appending");
    return;
  }

  JsonDocument doc;
  doc["timestamp"] = timestamp;
  doc["pH"] = pH;

  serializeJson(doc, file);
  file.print("\n");  // JSONL requires newline between records
  file.close();
}

void appendDispense(const char* timestamp, float pH) {
  File file = LittleFS.open(DISPENSE_DATA_PATH, "a");
  if (!file) {
    Serial.println("Failed to open dispense_data.jsonl for appending");
    return;
  }

  JsonDocument doc;
  doc["timestamp"] = timestamp;
  doc["pH"] = pH;

  serializeJson(doc, file);
  file.print("\n");
  file.close();
}

void mountFS() {
   // Route for root / web page
  server.on("/", HTTP_GET, [](AsyncWebServerRequest* request) {
    request->send(LittleFS, "/index.html", String(), false);
  });

  server.on("/history", HTTP_GET, [](AsyncWebServerRequest* request) {
    request->send(LittleFS, "/history.html", String(), false);
  });

  // Route to load style.css file
  server.on("/styles.css", HTTP_GET, [](AsyncWebServerRequest* request) {
    request->send(LittleFS, "/styles.css", "text/css");
  });

  // Route to load index.js file
  server.on("/index.js", HTTP_GET, [](AsyncWebServerRequest* request) {
    request->send(LittleFS, "/index.js", "text/javascript");
  });

   server.on("/history.js", HTTP_GET, [](AsyncWebServerRequest* request) {
    request->send(LittleFS, "/history.js", "text/javascript");
  });

  // Route to load data.json file
  server.on("/ph_data.jsonl", HTTP_GET, [](AsyncWebServerRequest* request) {
    request->send(LittleFS, "/ph_data.jsonl", "text/json");
  });

  server.on("/dispense_data.jsonl", HTTP_GET, [](AsyncWebServerRequest* request) {
    request->send(LittleFS, "/dispense_data.jsonl", "text/json");
  });

  // Route to get current pH value
  server.on("/ph_current", HTTP_GET, [](AsyncWebServerRequest* request) {
    float phValue = slope * analogReadMilliVolts(PH_PIN) / 1000.0 + intercept;
    JsonDocument doc;
    doc["pH"] = phValue;
    String response;
    serializeJson(doc, response);
    request->send(200, "application/json", response);
  });
}

void moveMotor() {
  for (int i = 0; i < stepsToTake; i++) {
    // These four lines create 1 single step pulse
    digitalWrite(STEP_PIN, LOW); // Pull low to create a pulse
    delayMicroseconds(stepDelay);
    digitalWrite(STEP_PIN, HIGH); // Pull back high
    delayMicroseconds(stepDelay);
  }
}
