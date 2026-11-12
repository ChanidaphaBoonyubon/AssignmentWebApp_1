# Drone API Server — Assignment #1

ระบบ API Gateway ที่พัฒนาด้วย **Node.js** และ **Express.js** เพื่อทำหน้าที่เป็นตัวกลางเชื่อมต่อระหว่างฝั่ง Client (หน้าเว็บ) กับระบบ Backend หลักอีก 2 ส่วน:

* **Drone Config Server (Server 1):** จัดเก็บข้อมูลการตั้งค่า (Config) และสถานะปัจจุบันของโดรน
* **Drone Log Server / PocketBase (Server 2):** จัดเก็บประวัติบันทึกข้อมูล (Logs) อุณหภูมิของโดรน

**ลิงก์ที่ Deploy แล้ว:** http://assignment1webapp.onrender.com/configs/67010174

---

## การทดสอบใช้งานผ่านเบราว์เซอร์ (ออนไลน์)

สามารถเปิดเบราว์เซอร์แล้วเรียกดูข้อมูลผ่าน Endpoint ต่างๆ ได้ดังนี้:

* **ดึงข้อมูล Config:** `http://assignmentwebapp-1.onrender.com/configs/67010174`
* **ดึงข้อมูลสถานะ (Status):** `http://assignmentwebapp-1.onrender.com/status/67010174`
* **ดึงประวัติอุณหภูมิ (Logs):** `http://assignmentwebapp-1.onrender.com/logs/67010174`

---

## ขั้นตอนการติดตั้งและรันบนเครื่อง (Local Development)

1. ตรวจสอบให้แน่ใจว่าเครื่องติดตั้ง **Node.js เวอร์ชัน 18 ขึ้นไป**
2. เปิดโฟลเดอร์โปรเจกต์ในโปรแกรม VS Code จากนั้นเปิด Terminal (แนะนำ Command Prompt) แล้วพิมพ์คำสั่งติดตั้งแพ็กเกจ:
   ```bash
   npm install
   ```
3. สร้างไฟล์ชื่อ `.env` ไว้ที่ตำแหน่งโฟลเดอร์หลัก (ระดับเดียวกับ `server.js`) และกำหนดค่าตัวแปรดังนี้[cite: 4, 5]:
   ```env
   PORT=3000
   CONFIG_URL=<ใส่ URL ของ Drone Config Server>
   LOG_URL=<ใส่ URL ของ Drone Log Server>
   LOG_API_TOKEN=<ใส่ค่า Bearer Token>
   ```
4. สั่งเริ่มต้นการทำงานของเซิร์ฟเวอร์ด้วยคำสั่ง:
   ```bash
   npm start
   ```
5. ทดสอบเรียกใช้งานผ่านเบราว์เซอร์ด้วย URL ด้านล่าง:
   * `http://localhost:3000/configs/67010174`
   * `http://localhost:3000/status/67010174`
   * `http://localhost:3000/logs/67010174`

---

## ตัวอย่างผลลัพธ์ (Response)

**Endpoint:** `GET /configs/67010174`

```json
{
  "drone_id": 67010174,
  "drone_name": "Spudnik",
  "light": "on",
  "country": "United States",
  "weight": 130
}
```

---

## การนำขึ้นเซิร์ฟเวอร์จริง (Deploy บน Render)

1. ไปที่หน้าแดชบอร์ดของ Render กดปุ่ม **New +** เลือก **Web Service** แล้วเชื่อมต่อกับ Repository นี้
2. ตั้งค่าคำสั่งในการ Build และ Start ระบบตามนี้:
   * **Build Command:** `npm install`
   * **Start Command:** `npm start`
3. เข้าไปที่เมนู **Environment** แล้วเพิ่มตัวแปรให้ครบทั้ง 4 ค่า ได้แก่ `PORT`, `CONFIG_URL`, `LOG_URL` และ `LOG_API_TOKEN`