## 🎟️ High-Volume Ticketing Engine

> Sistem backend berperforma tinggi yang dirancang untuk menangani skenario "Ticket War" dengan fokus pada konsistensi data dan skalabilitas.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10.4-red.svg)](https://nestjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-7.2-2D3748.svg)](https://www.prisma.io/)

---

## 🚀 Key Features

- **⚡ High Concurrency Handling**: Mampu menangani **770+ Requests per Second (RPS)** dengan tingkat kegagalan infrastruktur **0%**

- **🔒 Race Condition Protection**: Menggunakan **Redis Distributed Locking** untuk memastikan **100% akurasi inventaris** dan mencegah double-booking

- **🧹 Automated Cleanup**: Integrasi **BullMQ** untuk melepaskan kursi kembali ke inventaris secara otomatis jika pembayaran tidak diselesaikan dalam **15 menit**

- **📊 Database Optimization**: Implementasi **Redis Caching** yang mengurangi beban pembacaan ke PostgreSQL hingga lebih dari **80%**

- **📈 Monitoring & Observability**: Integrasi **Prometheus** dan **Grafana** untuk real-time monitoring dan metrics

---

## 🛠️ Tech Stack

| Category           | Technologies                           |
| ------------------ | -------------------------------------- |
| **Backend**        | NestJS, TypeScript                     |
| **Database**       | PostgreSQL 15, Prisma ORM              |
| **Cache & Queue**  | Redis 7, BullMQ                        |
| **Infrastructure** | Docker, Docker Compose                 |
| **Testing**        | Jest (Unit Testing), k6 (Load Testing) |
| **Monitoring**     | Prometheus, Grafana, Redis Insight     |
| **API Docs**       | Swagger/OpenAPI                        |

---

## 🏗️ Architecture Overview

Sistem menggunakan arsitektur multi-layer dengan Redis caching, distributed locking, dan queue processing untuk menangani high-volume concurrent requests.

```
┌─────────────────┐
│  Client Request │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│  1. Request Gatekeeper          │
│     Redis Cache Check           │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  2. Distributed Lock            │
│     Redis Lock (seatId)         │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  3. Atomic Transaction          │
│     Database Transaction        │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  4. Scheduled Job               │
│     BullMQ Cleanup Queue        │
└─────────────────────────────────┘
```

📖 **Untuk detail lengkap tentang arsitektur**, lihat [Architecture Documentation](./docs/architecture.md)

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **Docker** and **Docker Compose**
- **npm** or **yarn**

---

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/username/high-vol-ticketing.git
cd high-vol-ticketing
```

### 2. Setup Environment Variables

```bash
# Copy environment file (if .env.example exists)
cp .env.example .env

# Or create .env manually with the following variables:
```

**Required Environment Variables:**

```env
# Database
DATABASE_URL=postgresql://user_admin:admin123@postgres:5432/highvol_db?schema=public

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# Application
PORT=3000
NODE_ENV=development
```

### 3. Start Services with Docker Compose

```bash
# Start all services (PostgreSQL, Redis, App, Monitoring)
docker-compose up -d

# View logs
docker-compose logs -f app
```

### 4. Setup Database

```bash
# Navigate to apps directory
cd apps

# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# (Optional) Seed database
npx prisma db seed
```

### 5. Start Development Server

```bash
# Install dependencies (if not using Docker)
npm install

# Start in development mode
npm run start:dev

# The API will be available at:
# - API: http://localhost:3000/api/v1
# - Swagger Docs: http://localhost:3000/api/docs
```

---

## 📡 API Documentation

**Base URL**: `http://localhost:3000/api/v1`

### Quick Examples

**Create Booking**:

```bash
curl -X POST http://localhost:3000/api/v1/booking \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "11ccfb37-ae28-4e35-8df8-992c26cebff9",
    "seatId": "523bc3b9-c143-4bed-a9d3-0697ef5825db"
  }'
```

**Get Available Seats**:

```bash
curl -X GET http://localhost:3000/api/v1/booking
```

**Confirm Payment**:

```bash
curl -X POST http://localhost:3000/api/v1/payment/{bookingId}/confirm
```

📖 **Untuk API overview & best practices**, lihat [API Documentation](./docs/api.md)

🌐 **Untuk detail lengkap semua endpoints**, gunakan [Swagger UI](http://localhost:3000/api/docs)

---

## 📊 Monitoring & Tools

The application includes several monitoring and management tools:

| Service              | URL                            | Description                         |
| -------------------- | ------------------------------ | ----------------------------------- |
| **Swagger API Docs** | http://localhost:3000/api/docs | Interactive API documentation       |
| **Prometheus**       | http://localhost:9090          | Metrics collection and querying     |
| **Grafana**          | http://localhost:3001          | Metrics visualization (admin/admin) |
| **Redis Insight**    | http://localhost:5540          | Redis data browser and management   |
| **Prisma Studio**    | http://localhost:5555          | Database GUI tool                   |

---

## 🧪 Testing

### Unit Testing

```bash
cd apps
npm run test
npm run test:cov      # With coverage
npm run test:watch    # Watch mode
```

### Load Testing with k6

```bash
# Install k6 (if not installed)
# Windows: choco install k6
# Mac: brew install k6
# Linux: https://k6.io/docs/getting-started/installation/

# Run load test
k6 run load.test.js

# Custom load test
k6 run --vus 200 --duration 30s load.test.js
```

---

## 📁 Project Structure

```
high-vol-ticketing/
├── src/                          # Main application directory
│   ├── modules/
│   │   ├── booking/          # Booking module
│   │   └── payment/          # Payment module
│   ├── prisma/               # Prisma service
│   └── common/               # Shared utilities
│   ├── prisma/
│   │   ├── schema.prisma         # Database schema
│   │   └── migrations/           # Database migrations
│   └── test/                     # E2E tests
├── docs/                          # Documentation
│   ├── architecture.md           # Architecture details
│   └── api.md                    # API documentation
├── docker-compose.yml             # Docker services
├── load.test.js                   # k6 load testing
└── README.md
```

---

## 🚀 Available Scripts

| Script                    | Description                            |
| ------------------------- | -------------------------------------- |
| `npm run start`           | Start the application                  |
| `npm run start:dev`       | Start in development mode (watch mode) |
| `npm run start:debug`     | Start in debug mode                    |
| `npm run start:prod`      | Start in production mode               |
| `npm run build`           | Build the application                  |
| `npm run test`            | Run unit tests                         |
| `npm run test:cov`        | Run tests with coverage                |
| `npm run test:e2e`        | Run end-to-end tests                   |
| `npm run lint`            | Lint the codebase                      |
| `npm run format`          | Format code with Prettier              |
| `npm run prisma:generate` | Generate Prisma Client                 |
| `npm run prisma:migrate`  | Run database migrations                |
| `npm run prisma:studio`   | Open Prisma Studio                     |

---

## 📚 Documentation

Dokumentasi lengkap tersedia di folder `docs/`:

- **[Architecture Documentation](./docs/architecture.md)** - Detail arsitektur, data flow, dan optimizations
- **[API Documentation](./docs/api.md)** - API overview, best practices, dan guidelines

---

## 🎯 Performance Metrics

- **Throughput**: 770+ Requests per Second
- **Infrastructure Failure Rate**: 0%
- **Cache Hit Rate**: >80% reduction in PostgreSQL reads
- **Booking Accuracy**: 100% (no double-booking)
- **Auto-cleanup**: 15-minute timeout for pending bookings

---

## 🐳 Docker Services

The `docker-compose.yml` includes:

- **app**: Main NestJS application
- **postgres**: PostgreSQL 15 database
- **redis**: Redis 7 cache and queue
- **redis-insight**: Redis management UI
- **prometheus**: Metrics collection
- **grafana**: Metrics visualization

### Docker Commands

```bash
docker-compose up -d              # Start all services
docker-compose down               # Stop all services
docker-compose logs -f [service]  # View logs
docker-compose up -d --build      # Rebuild services
```

---

## 📝 License

This project is private and unlicensed.

---

## 👥 Contributing

This is a personal project. Contributions and suggestions are welcome!

---

## 📧 Support

For issues and questions:

- Open an issue on the repository
- Check the [documentation](./docs/)
- Review [API docs](./docs/api.md) or [Architecture docs](./docs/architecture.md)
