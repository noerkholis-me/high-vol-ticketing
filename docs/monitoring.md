# 📈 Monitoring & Observability

Dokumentasi ini menjelaskan bagaimana sistem memonitor performa dan health menggunakan **Prometheus** dan **Grafana**, serta bagaimana cara menghasilkan evidence (bukti) dari monitoring tersebut.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Exposed Metrics](#exposed-metrics)
- [Prometheus](#prometheus)
- [Grafana Dashboards](#grafana-dashboards)
- [Monitoring During Load Test](#monitoring-during-load-test)
- [How to Reproduce](#how-to-reproduce)

---

## Overview

Sistem ini menggunakan:

- **Prometheus** untuk scraping dan menyimpan metrics time-series
- **Grafana** untuk visualisasi metrics dan pembuatan dashboard
- **NestJS + PrometheusModule** untuk expose HTTP dan business metrics di endpoint `/api/v1/metrics`

Tujuannya adalah:

1. Memantau throughput (RPS), latency, dan error rate
2. Melihat jumlah tiket terjual (business metric)
3. Membuktikan stabilitas sistem saat high load (digabung dengan hasil k6)

---

## Architecture

### Monitoring Components

- **App (NestJS)**
  - Menggunakan `@willsoto/nestjs-prometheus` untuk expose metrics
  - Menggunakan `HttpMetricsInterceptor` untuk mencatat HTTP metrics
  - Menggunakan custom counter `tickets_sold_total` di `PaymentService`
- **Prometheus**
  - Scrape metrics dari `app` di endpoint `/api/v1/metrics`
- **Grafana**
  - Membaca data dari Prometheus dan menampilkan di dashboard

### Prometheus Scrape Config

```yaml
scrape_configs:
  - job_name: 'nestjs-app'
    metrics_path: /api/v1/metrics
    static_configs:
      - targets: ['app:3000']
```

Keterangan:

- `metrics_path: /api/v1/metrics` — endpoint metrics yang di-expose oleh NestJS
- `targets: ["app:3000"]` — Prometheus mengakses service `app` di dalam Docker network

---

## Exposed Metrics

Aplikasi expose beberapa jenis metrics utama:

### 1. HTTP Request Metrics

Dibuat oleh `HttpMetricsInterceptor`:

- `http_requests_total` (**Counter**)
  - Labels: `method`, `path`, `statusCode`, `route`
  - Contoh: jumlah total request `POST /api/v1/booking` dengan status 201/400/500

- `http_requests_duration_seconds` (**Histogram**)
  - Labels: `method`, `path`, `statusCode`, `route`
  - Digunakan untuk menghitung latency p90/p95

#### Contoh Query PromQL

- Total HTTP requests per 1 menit, per route:

  ```promql
  sum(rate(http_requests_total[1m])) by (method, route, statusCode)
  ```

- p95 latency per route:

  ```promql
  histogram_quantile(0.95,
    sum(rate(http_requests_duration_seconds_bucket[1m])) by (le, method, route)
  )
  ```

### 2. Business Metric: Tickets Sold

Dibuat di `PaymentService`:

- `tickets_sold_total` (**Counter**)
  - Di-`inc()` setiap kali pembayaran berhasil dikonfirmasi

Contoh query:

```promql
increase(tickets_sold_total[5m])
```

Untuk melihat berapa banyak tiket yang terjual dalam 5 menit terakhir.

### 3. Default Metrics

Selain metrics custom di atas, PrometheusModule juga dapat expose default Node.js process metrics (CPU, memory, dll) jika diaktifkan.

---

## Prometheus

### Akses UI Prometheus

- URL: `http://localhost:9090`

Langkah:

1. Buka Prometheus UI
2. Di menu **Graph**, masukkan salah satu query contoh, misalnya:

   ```promql
   sum(rate(http_requests_total[1m])) by (method, route, statusCode)
   ```

3. Klik **Execute** dan lihat grafik di bawahnya

### Evidence yang Direkomendasikan

Tambahkan screenshot berikut ke repo (di `docs/images/`):

1. **Prometheus HTTP Requests**
   - Query: `sum(rate(http_requests_total[1m])) by (route)`
   - Tunjukkan grafik meningkat saat load test berjalan

2. **Prometheus Tickets Sold**
   - Query: `increase(tickets_sold_total[5m])`
   - Tunjukkan jumlah tiket yang terjual selama periode load test

Nama file yang direkomendasikan:

- `docs/images/prometheus-http-requests.png`
- `docs/images/prometheus-tickets-sold.png`

---

## Grafana Dashboards

### Akses Grafana

- URL: `http://localhost:3001`
- Default credentials: `admin / admin` (ubah di production)

### Konfigurasi Data Source (Prometheus)

1. Masuk ke Grafana
2. Buka **Configuration → Data sources**
3. Klik **Add data source** → pilih **Prometheus**
4. Isi:
   - **Name**: `Prometheus`
   - **URL**: `http://prometheus:9090` (nama service di Docker Compose)
5. Klik **Save & test** (harusnya muncul "Data source is working")

### Dashboard yang Direkomendasikan

Buat satu dashboard baru, lalu tambahkan panel-panel berikut:

#### Panel 1: HTTP Requests per Second (RPS)

- **Title**: `HTTP RPS by Path`
- **Query**:

  ```promql
  sum(rate(http_requests_total[1m])) by (path)
  ```

- Tampilkan sebagai **Time series**

#### Panel 2: p95 Latency per Path

- **Title**: `HTTP p95 Latency`
- **Query**:

  ```promql
  histogram_quantile(0.95,
    sum(rate(http_requests_duration_seconds_bucket[1m])) by (le, path)
  )
  ```

- Unit: `seconds`

#### Panel 3: Tickets Sold Over Time

- **Title**: `Tickets Sold (5m window)`
- **Query**:

  ```promql
  increase(tickets_sold_total[5m])
  ```

- Visualization: Bar chart atau time series

#### Panel 4 (Opsional): Error Rate

- **Title**: `Error Rate (4xx/5xx)`

  ```promql
  sum(rate(http_requests_total{statusCode=~"4..|5.."}[1m]))
  /
  sum(rate(http_requests_total[1m]))
  ```

### Evidence yang Direkomendasikan

Tambahkan screenshot berikut:

- `docs/images/grafana-http-rps.png` — Panel RPS saat load test
- `docs/images/grafana-latency.png` — Panel p95 latency
- `docs/images/grafana-tickets-sold.png` — Panel tickets sold
- `docs/images/grafana-error-rate.png` — Panel error rate

---

## Monitoring During Load Test

Untuk menunjukkan end-to-end observability:

1. Jalankan seluruh stack dengan Docker Compose
2. Jalankan k6 load test (lihat [`performance.md`](./performance.md))
3. Sambil test berjalan:
   - Buka **Prometheus** dan jalankan query RPS/latency
   - Buka **Grafana** dan lihat dashboard yang sudah dibuat
4. Ambil screenshot panel/grafik saat traffic sedang tinggi

Hal ini menunjukkan bahwa:

- Monitoring stack aktif saat high load
- Metric `http_requests_total`, `http_requests_duration_seconds`, dan `tickets_sold_total` ter-update realtime

---

## How to Reproduce

### 1. Start Monitoring Stack

```bash
docker-compose up -d app postgres redis prometheus grafana redis-insight
```

### 2. Verify Metrics Endpoint

Buka di browser atau gunakan curl:

```bash
curl http://localhost:3000/api/v1/metrics
```

Harusnya mengembalikan text dengan berbagai metrics Prometheus.

### 3. Open Prometheus & Grafana

- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3001`

### 4. (Optional) Run Load Test

Ikuti instruksi di [`performance.md`](./performance.md) untuk menjalankan k6 dan melihat efeknya di dashboard.

---

## Related Documentation

- [Architecture Documentation](./architecture.md)
- [API Documentation](./api.md)
- [Performance Test Results](./performance.md)
