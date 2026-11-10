// เปิดปิดไฟจากมือถือด้วย ESP32
// ESP32 ต่อ Wi-Fi แล้วเปิดหน้าเว็บของตัวเอง กดปุ่มบนหน้าเว็บเพื่อสั่ง LED ที่ GPIO 2

#include <WiFi.h>
#include <WebServer.h>

// แก้สองบรรทัดนี้เป็น Wi-Fi ของคุณ (อย่าอัปโหลดรหัสจริงขึ้นอินเทอร์เน็ต)
const char* WIFI_NAME = "YOUR_WIFI_NAME";
const char* WIFI_PASS = "YOUR_PASSWORD";

const int LED = 2;       // ขาที่ต่อหลอด LED
bool ledOn = false;      // จำว่าตอนนี้ไฟติดอยู่หรือไม่

WebServer server(80);    // เว็บเซิร์ฟเวอร์ที่พอร์ต 80

// สร้างหน้าเว็บที่จะส่งไปให้มือถือ
String page() {
  String html = "<!doctype html><html lang='th'><head><meta charset='utf-8'>";
  html += "<meta name='viewport' content='width=device-width, initial-scale=1'>";
  html += "<title>ESP32 LED</title><style>";
  html += "body{font-family:sans-serif;text-align:center;background:#0B1220;color:#EDEAE0;padding:40px 16px}";
  html += "a{display:inline-block;margin:12px;padding:20px 40px;border-radius:8px;";
  html += "background:#F2E3B6;color:#0B1220;font-size:22px;font-weight:bold;text-decoration:none}";
  html += "</style></head><body><h1>ESP32 LED</h1><p>ตอนนี้ไฟ: ";
  html += ledOn ? "ติด" : "ดับ";
  html += "</p><a href='/on'>เปิดไฟ</a><a href='/off'>ปิดไฟ</a></body></html>";
  return html;
}

void showPage() {
  server.send(200, "text/html; charset=utf-8", page());
}

void turnOn() {
  ledOn = true;
  digitalWrite(LED, HIGH);
  showPage();
}

void turnOff() {
  ledOn = false;
  digitalWrite(LED, LOW);
  showPage();
}

void setup() {
  Serial.begin(115200);
  pinMode(LED, OUTPUT);
  digitalWrite(LED, LOW);

  // ต่อ Wi-Fi แล้วรอจนกว่าจะต่อติด
  WiFi.begin(WIFI_NAME, WIFI_PASS);
  Serial.print("Connecting to Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("Open this address on your phone: http://");
  Serial.println(WiFi.localIP());

  // บอกว่าแต่ละที่อยู่ให้ทำอะไร
  server.on("/", showPage);
  server.on("/on", turnOn);
  server.on("/off", turnOff);
  server.begin();
}

void loop() {
  server.handleClient();  // คอยรับคำสั่งจากมือถือ
}
