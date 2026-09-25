# Shelfy — Hướng Dẫn Cài Đặt & Chạy Dự Án

Shelfy là nền tảng quản lý tủ đồ cá nhân thông minh, hỗ trợ gợi ý trang phục theo thời tiết & lịch trình (rule-based stylist) và mô phỏng thử đồ ảo bằng AI (Virtual Try-On).

Dự án được thiết kế theo kiến trúc hướng vi dịch vụ (Microservices-oriented) gồm 4 thành phần chính:
- **Core API Service (`BE/Shelfy`)**: Viết bằng **Java 17 / Spring Boot 3.3.5**, quản lý xác thực (Auth JWT), tài khoản người dùng, dữ liệu tủ đồ (Wardrobe items), phân quyền và lưu trữ file qua Cloudinary.
- **Nodejs Service (`Nodejs`)**: Viết bằng **Express.js**, phụ trách các dịch vụ mở rộng: lấy thời tiết thực tế (Open-Meteo & Nominatim), đồng bộ Google Calendar, lịch sử mặc đồ (`daily_outfits`), sở thích/trạng thái món đồ và gợi ý phối đồ thông minh.
- **Frontend Web (`FE/Shelfyy`)**: Giao diện người dùng trên nền tảng web viết bằng **React 19 + Vite**, phục vụ qua Nginx khi deploy Docker.
- **Mobile App (`Mobile/Shelfy`)**: Ứng dụng di động viết bằng **React Native + Expo SDK 57** sử dụng **Expo Router**.

---

## Mục Lục

1. [Yêu Cầu Môi Trường (Prerequisites)](#1-yêu-cầu-môi-trường-prerequisites)
2. [Cấu Trúc Thư Mục Dự Án](#2-cấu-trúc-thư-mục-dự-án)
3. [Cách 1: Khởi Chạy Nhanh Toàn Bộ Bằng Docker Compose (Khuyên dùng)](#3-cách-1-khởi-chạy-nhanh-toàn-bộ-bằng-docker-compose-khuyên-dùng)
4. [Cách 2: Chạy Từng Service Cục Bộ (Local Development)](#4-cách-2-chạy-từng-service-cục-bộ-local-development)
   - [4.1. Khởi động PostgreSQL](#41-khởi-động-postgresql)
   - [4.2. Chạy Core API Service (Spring Boot)](#42-chạy-core-api-service-spring-boot)
   - [4.3. Chạy Node.js Service](#43-chạy-nodejs-service)
   - [4.4. Chạy Frontend Web (React + Vite)](#44-chạy-frontend-web-react--vite)
   - [4.5. Chạy Mobile App (React Native + Expo)](#45-chạy-mobile-app-react-native--expo)
5. [Tài Khoản Dùng Thử & Dữ Liệu Khởi Tạo](#5-tài-khoản-dùng-thử--dữ-liệu-khởi-tạo)
6. [Danh Sách Cổng & Địa Chỉ Truy Cập](#6-danh-sách-cổng--địa-chỉ-truy-cập)
7. [Các Biến Môi Trường Quan Trọng](#7-các-biến-môi-trường-quan-trọng)
8. [Xử Lý Lỗi Thường Gặp (Troubleshooting)](#8-xử-lý-lỗi-thường-gặp-troubleshooting)

---

## 1. Yêu Cầu Môi Trường (Prerequisites)

Tùy vào cách bạn muốn chạy dự án, hãy chuẩn bị các công cụ sau:

- **Nếu dùng Docker Compose (Nhanh nhất cho Web & Backend):**
  - [Docker Desktop](https://www.docker.com/products/docker-desktop/) (hỗ trợ Docker Compose v2)
- **Nếu chạy cục bộ từng service (Local Development):**
  - **Java**: JDK 17 (khuyến nghị OpenJDK 17 hoặc Eclipse Temurin 17)
  - **Node.js**: Phiên bản 18.x hoặc 20.x trở lên (kèm `npm`)
  - **Maven**: Dự án đã tích hợp sẵn wrapper (`./mvnw` hoặc `mvnw.cmd`)
  - **PostgreSQL 16**: Có thể chạy nhanh qua Docker container
  - **Mobile**: Thiết bị di động cài app **Expo Go** (Android/iOS) hoặc máy ảo Android Emulator / iOS Simulator

---

## 2. Cấu Trúc Thư Mục Dự Án

```text
Shelfyy/
├── BE/
│   └── Shelfy/               # Spring Boot Core API Service (Java 17)
│       ├── src/              # Mã nguồn Java & Flyway migrations
│       ├── run-local.ps1     # Script PowerShell chạy BE cục bộ
│       ├── Dockerfile        # Dockerfile đóng gói Spring Boot
│       └── pom.xml           # Cấu hình Maven dependencies
├── Nodejs/                   # Node.js Express Microservice
│   ├── routes/               # API routes (weather, calendar, daily-outfits,...)
│   ├── services/             # Logic gợi ý, OAuth, reverse geocoding
│   ├── migrations/           # Database migrations riêng của Nodejs
│   ├── run-local.ps1         # Script PowerShell chạy Nodejs cục bộ
│   └── Dockerfile            # Dockerfile đóng gói Node.js
├── FE/
│   └── Shelfyy/              # Frontend Web (React 19 + Vite)
│       ├── src/              # Giao diện, components, hooks, api client
│       └── Dockerfile        # Multi-stage build (Vite build -> Nginx)
├── Mobile/
│   └── Shelfy/               # Mobile App (React Native, Expo SDK 57)
│       ├── app/              # File-based routes (Expo Router)
│       └── src/              # UI components, theme, api calls
├── docs/                     # Tài liệu kiến trúc và hướng dẫn phát triển
├── docker-compose.yml        # Orchestration toàn bộ Web, BE, Node & DB
├── .env.example              # Mẫu cấu hình môi trường gốc cho Docker Compose
└── README.md                 # Hướng dẫn chạy dự án
```

---

## 3. Cách 1: Khởi Chạy Nhanh Toàn Bộ Bằng Docker Compose (Khuyên dùng)

Cách này sẽ tự động tải image, build và kết nối mạng giữa 4 service: **PostgreSQL**, **Spring Boot Core API**, **Node.js Service** và **Frontend Web (Nginx)**.

### Bước 1: Tạo file cấu hình môi trường gốc

Sao chép file mẫu `.env.example` thành `.env` tại thư mục gốc:

```powershell
# Trên Windows PowerShell:
Copy-Item .env.example .env

# Trên Linux / macOS / Git Bash:
cp .env.example .env
```

> **Lưu ý:** Các giá trị mặc định trong `.env.example` đã được cấu hình sẵn để chạy ngay ở môi trường phát triển local.

### Bước 2: Khởi chạy các container

Chạy lệnh sau tại thư mục gốc của dự án:

```bash
docker compose up --build -d
```

### Bước 3: Chạy migration cho Node.js Service

Sau khi các container đã khởi động thành công (UP), chạy migration cho Node.js:

```bash
docker compose exec node npm run migrate
```

### Bước 4: Kiểm tra trạng thái

Kiểm tra danh sách container đang chạy:

```bash
docker compose ps
```

Các container hoạt động:
- `postgres_db`: PostgreSQL 16 (Port `5432:5432`)
- `shelfy_be`: Spring Boot Core API (Port `8080:8080`)
- `shelfy_node`: Node.js Express Service (Port `3000:3000`)
- `shelfy_frontend`: React App qua Nginx (Port `5173:80`)

### Lệnh dừng hệ thống:

```bash
# Dừng các container
docker compose down

# Dừng và xóa toàn bộ dữ liệu database (volumes)
docker compose down -v
```

---

## 4. Cách 2: Chạy Từng Service Cục Bộ (Local Development)

Phương pháp này phù hợp khi bạn đang trực tiếp code và debug một phần của hệ thống.

### 4.1. Khởi động PostgreSQL

Bạn có thể chạy riêng container PostgreSQL được cấu hình sẵn trong `BE/Shelfy`:

```powershell
cd BE\Shelfy

# Bật container postgres (chạy ở cổng 15432 để tránh xung đột cổng 5432 mặc định)
docker compose up -d db
```

Hoặc nếu bạn muốn dùng container ở root:
```bash
docker compose up -d db
```

---

### 4.2. Chạy Core API Service (Spring Boot)

1. Di chuyển vào thư mục backend:
   ```powershell
   cd BE\Shelfy
   ```
2. Tạo file `.env` nếu chưa có:
   ```powershell
   Copy-Item .env.example .env
   ```
3. Chạy service:
   - **Cách A (PowerShell tự động nạp .env):**
     ```powershell
     .\run-local.ps1
     ```
   - **Cách B (Maven thông thường):**
     ```powershell
     .\mvnw.cmd spring-boot:run
     # Trên Linux / macOS:
     # ./mvnw spring-boot:run
     ```
4. Khi khởi động xong:
   - Core API chạy tại: `http://localhost:8080`
   - Tài liệu Swagger UI: `http://localhost:8080/swagger-ui.html`
   - Flyway migration sẽ tự động chạy và khởi tạo cấu trúc cơ sở dữ liệu.

---

### 4.3. Chạy Node.js Service

1. Di chuyển vào thư mục `Nodejs`:
   ```powershell
   cd Nodejs
   ```
2. Cài đặt các thư viện phụ thuộc:
   ```powershell
   npm install
   ```
3. Tạo file `.env`:
   ```powershell
   Copy-Item .env.example .env
   ```
   > Đảm bảo `JWT_SECRET` trong `Nodejs/.env` trùng khớp với `JWT_SECRET` trong `BE/Shelfy/.env` để cả hai service có thể giải mã token của nhau.
4. Chạy migration của Node.js:
   ```powershell
   npm run migrate
   ```
5. Khởi chạy server:
   - **Cách A (PowerShell nạp env từ cả BE và Node):**
     ```powershell
     .\run-local.ps1
     ```
   - **Cách B (NPM thông thường):**
     ```powershell
     npm start
     ```
6. Node.js Service chạy tại: `http://localhost:3000` (Kiểm tra sức khỏe: `http://localhost:3000/health`)

---

### 4.4. Chạy Frontend Web (React + Vite)

1. Di chuyển vào thư mục `FE/Shelfyy`:
   ```powershell
   cd FE\Shelfyy
   ```
2. Cài đặt các thư viện:
   ```powershell
   npm install
   ```
3. Kiểm tra file `FE/Shelfyy/.env`:
   ```env
   VITE_API_BASE_URL=http://localhost:8080/api
   VITE_NODE_API_BASE_URL=http://localhost:3000/api
   ```
4. Khởi chạy dev server:
   ```powershell
   npm run dev
   ```
5. Mở trình duyệt và truy cập: `http://localhost:5173`

---

### 4.5. Chạy Mobile App (React Native + Expo)

1. Di chuyển vào thư mục `Mobile/Shelfy`:
   ```powershell
   cd Mobile\Shelfy
   ```
2. Cài đặt các thư viện:
   ```powershell
   npm install
   ```
3. Cấu hình file `Mobile/Shelfy/.env`:
   ```env
   # Nếu test trên điện thoại thật qua mạng WiFi chung, thay localhost bằng IP LAN máy tính (ví dụ: http://192.168.1.50:8080/api)
   # Nếu test bằng Android Emulator, có thể dùng: http://10.0.2.2:8080/api
   # Hoặc trỏ thẳng tới Core API production đã deploy trên Railway:
   EXPO_PUBLIC_CORE_API_URL=https://shelfyy-production-4f6e.up.railway.app/api
   EXPO_PUBLIC_NODE_API_URL=http://localhost:3000/api
   ```
4. Khởi chạy ứng dụng với Expo:
   ```powershell
   npx expo start
   ```
5. Trải nghiệm ứng dụng:
   - Quét mã QR bằng ứng dụng **Expo Go** trên điện thoại (Android hoặc iOS).
   - Nhấn `a` trên terminal để mở Android Emulator.
   - Nhấn `i` trên terminal để mở iOS Simulator (chỉ dành cho macOS).
   - Nhấn `w` trên terminal để xem thử trên trình duyệt web.

---

## 5. Tài Khoản Dùng Thử & Dữ Liệu Khởi Tạo

Khi chạy Core API lần đầu, hệ thống sẽ tự động tạo sẵn tài khoản quản trị/thử nghiệm:

- **Email:** `demo@shelfy.app`
- **Mật khẩu:** `123456`

Bạn cũng có thể trực tiếp nhấn **Đăng ký (Register)** trên giao diện web hoặc app để tạo tài khoản mới.

---

## 6. Danh Sách Cổng & Địa Chỉ Truy Cập

| Dịch vụ | Địa chỉ Local | Ghi chú |
| :--- | :--- | :--- |
| **Frontend Web** | [http://localhost:5173](http://localhost:5173) | Giao diện người dùng Web |
| **Core API Service** | [http://localhost:8080](http://localhost:8080) | Spring Boot REST API |
| **Swagger UI** | [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html) | Tài liệu tra cứu & test API |
| **Node.js Service** | [http://localhost:3000](http://localhost:3000) | Microservice thời tiết, lịch, gợi ý |
| **PostgreSQL (Docker Compose gốc)** | `localhost:5432` | DB khi chạy root docker-compose |
| **PostgreSQL (BE Docker riêng)** | `localhost:15432` | DB khi chạy `BE/Shelfy/docker-compose.yml` |

---

## 7. Các Biến Môi Trường Quan Trọng

| Biến môi trường | Mục đích | Bắt buộc? |
| :--- | :--- | :--- |
| `JWT_SECRET` | Khóa bí mật giải mã/ký JWT token. **Bắt buộc phải đồng nhất** giữa BE và Node.js. | **Có** |
| `DB_URL` / `DB_PASSWORD` | Thông tin kết nối cơ sở dữ liệu PostgreSQL. | **Có** |
| `CLOUDINARY_*` | API Key & Secret để tải ảnh trang phục và avatar người dùng lên Cloudinary. | Tùy chọn (Cần khi upload ảnh) |
| `OPEN_METEO_API_URL` | API thời tiết Open-Meteo (miễn phí, không cần key). | Có sẵn mặc định |
| `GOOGLE_CLIENT_ID` / `_SECRET` | Dùng để tích hợp Google Calendar OAuth thật. | Tùy chọn |
| `REPLICATE_API_TOKEN` | Token Replicate để chạy mô hình AI Virtual Try-On (IDM-VTON). | Tùy chọn |
| `VNPAY_*` | Cấu hình cổng thanh toán VNPay Sandbox cho gói Premium. | Tùy chọn |

---

## 8. Xử Lý Lỗi Thường Gặp (Troubleshooting)

### 1. Lỗi Docker Compose báo: `Thiếu DB_PASSWORD trong .env`
- **Nguyên nhân:** Thư mục gốc chưa có file `.env`.
- **Cách sửa:** Copy từ file mẫu bằng lệnh: `Copy-Item .env.example .env` (hoặc `cp .env.example .env`).

### 2. Lỗi cổng đã bị chiếm dụng (Port is already in use: 5432, 8080, 3000, 5173)
- **Nguyên nhân:** Đang có một tiến trình hoặc service khác (như service PostgreSQL cài cứng trên Windows) chiếm cổng này.
- **Cách sửa:**
  - Với cổng 5432: Nếu máy đã cài PostgreSQL, bạn có thể đổi cổng mapped trong `docker-compose.yml` (ví dụ `"5433:5432"`) hoặc tắt service PostgreSQL của máy: `net stop postgresql-x64-16`.
  - Tìm tiến trình chiếm cổng: `netstat -ano | findstr :<PORT>` và kill tiến trình nếu cần.

### 3. Lỗi xác thực JWT giữa FE, BE và Nodejs (401 Unauthorized)
- **Nguyên nhân:** `JWT_SECRET` trong file `.env` của Spring Boot và file `.env` của Nodejs không khớp nhau.
- **Cách sửa:** Đảm bảo chuỗi bí mật `JWT_SECRET` ở cả 2 service đều giống nhau (ví dụ: `shelfy-local-dev-jwt-secret-change-me-32-bytes-minimum`).

### 4. Lỗi trên ứng dụng di động (Mobile) không kết nối được tới Backend
- **Nguyên nhân:** Thiết bị di động thật không thể hiểu địa chỉ `localhost` của máy tính.
- **Cách sửa:** Mở file `Mobile/Shelfy/.env`, thay `localhost` bằng IP mạng LAN của máy tính (xem bằng lệnh `ipconfig`, ví dụ `http://192.168.1.x:8080/api` và `http://192.168.1.x:3000/api`), đảm bảo điện thoại và máy tính cùng kết nối chung một mạng WiFi.
