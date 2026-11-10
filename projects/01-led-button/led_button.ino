// กดปุ่มแล้วไฟติด
// ปุ่มต่อที่ขา 2 (มีตัวต้านทาน 10k ดึงลง GND) หลอด LED ต่อที่ขา 13 ผ่านตัวต้านทาน 220 โอห์ม

const int LED = 13;  // ขาที่ต่อหลอด LED
const int BTN = 2;   // ขาที่ต่อปุ่มกด

void setup() {
  pinMode(LED, OUTPUT);  // ขา LED เป็นขาส่งไฟออก
  pinMode(BTN, INPUT);   // ขาปุ่มเป็นขาอ่านค่า
}

void loop() {
  // อ่านค่าจากปุ่ม แล้วส่งค่าเดียวกันไปที่ LED
  // กดปุ่ม = HIGH = ไฟติด, ปล่อยปุ่ม = LOW = ไฟดับ
  digitalWrite(LED, digitalRead(BTN));
}
