# 📡 API Documentation

Dokumentasi umum untuk REST API High-Volume Ticketing Engine. Untuk detail lengkap semua endpoints, lihat [Swagger UI](http://localhost:3000/api/docs).

---

## 📋 Table of Contents

- [Overview](#overview)
- [Base URL & Versioning](#base-url--versioning)
- [Authentication](#authentication)
- [Response Format](#response-format)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)
- [Interactive Documentation](#interactive-documentation)

---

## Overview

API ini dirancang untuk high-volume concurrent requests dengan fokus pada:

- **Performance**: Optimized untuk handle 770+ RPS
- **Consistency**: Distributed locking untuk prevent double-booking
- **Reliability**: Automatic cleanup untuk expired bookings
- **Simplicity**: RESTful design dengan clear response patterns

---

## Base URL & Versioning

### Base URL

```
Development: http://localhost:3000/api/v1
Production:  https://api.example.com/api/v1
```

### API Versioning

API menggunakan **URL-based versioning** dengan prefix `/api/v1`.

- Current version: `v1`
- Future versions akan menggunakan `/api/v2`, `/api/v3`, etc.
- Breaking changes akan increment major version
- Minor updates (new endpoints, new fields) tetap dalam version yang sama

---

## Authentication

> **Note**: Authentication belum diimplementasikan pada versi saat ini. Semua endpoints bersifat public.

Untuk production, direkomendasikan implementasi:

- **JWT Authentication**: Untuk user-based access
- **API Key Authentication**: Untuk service-to-service communication
- **OAuth 2.0**: Untuk third-party integrations

Setelah diimplementasikan, authentication details akan tersedia di [Swagger UI](http://localhost:3000/api/docs).

---

## Response Format

### Success Response Structure

Semua success responses mengikuti format konsisten:

```json
{
  "statusCode": number,
  "message": "string (optional)",
  "data": {} | [] | any
}
```

**Examples**:

```json
// Single resource
{
  "statusCode": 201,
  "message": "Booking berhasil! Segera lakukan pembayaran dalam 15 menit.",
  "data": {
    "id": "abc-123",
    "userId": "user-456",
    "status": "PENDING"
  }
}

// Collection
{
  "statusCode": 200,
  "data": [
    { "id": "seat-1", "number": "A1" },
    { "id": "seat-2", "number": "A2" }
  ]
}

// Simple message
{
  "statusCode": 200,
  "message": "Pembayaran berhasil di konfirmasi"
}
```

### Error Response Structure

Semua error responses mengikuti format:

```json
{
  "statusCode": number,
  "message": "string" | ["string"],
  "error": "string",
  "timestamp": "ISO 8601 string",
  "path": "/api/v1/endpoint"
}
```

---

## Error Handling

### HTTP Status Codes

| Status Code                   | Description                   | When Used                                   |
| ----------------------------- | ----------------------------- | ------------------------------------------- |
| **200 OK**                    | Request berhasil              | Successful GET, PUT, PATCH                  |
| **201 Created**               | Resource berhasil dibuat      | Successful POST                             |
| **400 Bad Request**           | Request tidak valid           | Invalid input, validation errors            |
| **401 Unauthorized**          | Authentication required       | Missing/invalid credentials                 |
| **403 Forbidden**             | Access denied                 | Insufficient permissions                    |
| **404 Not Found**             | Resource tidak ditemukan      | Invalid endpoint, missing resource          |
| **409 Conflict**              | Conflict dengan current state | Duplicate resource, business rule violation |
| **429 Too Many Requests**     | Rate limit exceeded           | Too many requests                           |
| **500 Internal Server Error** | Server error                  | Unexpected server errors                    |

### Common Error Scenarios

**Validation Errors** (400):

- Missing required fields
- Invalid data types
- Invalid UUID format

**Business Logic Errors** (400):

- Seat sudah dipesan
- Seat sedang diproses (locked)
- Booking tidak valid atau expired

**Retry Strategy**:

- Untuk transient errors (429, 500), implement exponential backoff
- Untuk business errors (400), jangan retry tanpa mengubah request
- Lock errors: Wait beberapa detik sebelum retry

---

## Best Practices

### Making Requests

1. **Always include Content-Type header**:

   ```
   Content-Type: application/json
   ```

2. **Handle errors gracefully**:

   - Check `statusCode` in response
   - Display user-friendly error messages
   - Log errors untuk debugging

3. **Validate input client-side**:

   - Ensure UUIDs are valid format
   - Check required fields before sending
   - Provide immediate feedback to users

4. **Handle race conditions**:
   - If receiving "seat sedang diproses" error, implement retry with backoff
   - Don't spam requests - respect rate limits

### Common Workflows

#### Booking Flow

```bash
# 1. Get available seats
GET /api/v1/booking

# 2. Create booking immediately (don't delay!)
POST /api/v1/booking
Body: { "userId": "...", "seatId": "..." }

# 3. Confirm payment within 2 minutes
POST /api/v1/payment/{bookingId}/confirm
```

**Important Notes**:

- ⚠️ Booking expires after 2 minutes if not paid
- ⚠️ Create booking immediately after user selection
- ⚠️ Handle "seat sedang diproses" error with retry logic
- ✅ Refresh available seats list after failed bookings

### Response Handling

1. **Check status codes**: Always verify HTTP status before processing
2. **Parse JSON safely**: Wrap JSON parsing in try-catch blocks
3. **Handle timeouts**: Implement reasonable request timeouts (5-10s)
4. **Cache appropriately**: Cache available seats, but invalidate on updates

---

## Rate Limiting

> **Note**: Rate limiting belum diimplementasikan pada versi saat ini.

Untuk production, direkomendasikan:

- **Per IP**: 100 requests per minute
- **Per User**: 10 bookings per minute
- **Global**: 1000 requests per second

Implementation suggestions:

- Redis-based rate limiting
- NestJS Throttler module
- API Gateway rate limiting

---

## Interactive Documentation

### Swagger UI

**📚 Untuk dokumentasi lengkap semua endpoints, request/response schemas, dan testing**, gunakan:

**Swagger UI**: http://localhost:3000/api/docs

Swagger UI menyediakan:

- ✅ Complete endpoint documentation
- ✅ Request/Response schemas
- ✅ Interactive API testing
- ✅ Try-it-out functionality
- ✅ Auto-generated dari source code

### Quick Links

- **Development Swagger**: http://localhost:3000/api/docs
- **Production Swagger**: https://api.example.com/api/docs

---

## Testing

### Using Swagger UI

1. Navigate to http://localhost:3000/api/docs
2. Expand endpoint yang ingin di-test
3. Click "Try it out"
4. Fill in request parameters
5. Click "Execute"
6. Review response

### Using cURL

Untuk quick testing via command line, lihat examples di Swagger UI atau gunakan:

```bash
# Get available seats
curl -X GET http://localhost:3000/api/v1/booking

# Create booking
curl -X POST http://localhost:3000/api/v1/booking \
  -H "Content-Type: application/json" \
  -d '{"userId": "...", "seatId": "..."}'
```

---

## Support

Untuk pertanyaan atau issues terkait API:

- 📚 Check **Swagger UI** untuk detail endpoints: http://localhost:3000/api/docs
- 🏗️ Review **Architecture docs**: [docs/architecture.md](./architecture.md)
- 🐛 Open an issue di repository

---

## Changelog

### v1.0.0 (Current)

- Initial API release
- Booking endpoints (GET, POST)
- Payment confirmation endpoint
- Basic error handling
- Swagger documentation

Untuk detail perubahan per version, lihat repository releases atau Swagger UI.
