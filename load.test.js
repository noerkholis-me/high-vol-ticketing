/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 1000,
  duration: '5s',
  // stages: [
  //   { duration: '10s', target: 100 },
  //   { duration: '30s', target: 1000 },
  //   { duration: '10s', target: 0 },
  // ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
  },
};

const BASE_URL = 'http://host.docker.internal:3000/api/v1'; // penting untuk Docker
const SEAT_ID = '077b84a3-b771-4ed3-9e13-5cbcba89e969'; // ganti dengan seat yang AVAILABLE

// GANTI DENGAN TOKEN VALID DARI LOGIN
const AUTH_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzYjNlZmEzZi02MWI1LTQ1ZWQtYjU1Mi1kODk3ZGEzNmY3MGIiLCJlbWFpbCI6Im5vZXJraG9saXNAZ21haWwuY29tIiwiaWF0IjoxNzY3Nzk5NjcyLCJleHAiOjE3Njc4MDA1NzJ9.d8cI5TGC9Xa-RLV7NqY0qbtPJmfW4wD9PVrVqQGwucs';
// const users = [
//   'user1@test.com',
//   'user2@test.com',
//   'user3@test.com',
//   // ... tambah kalau perlu, atau generate random
// ];

export default function () {
  // const userEmail = users[Math.floor(Math.random() * users.length)];

  const payload = JSON.stringify({
    seatId: SEAT_ID,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${AUTH_TOKEN}`, // ← INI KUNCI
    },
  };

  const res = http.post(`${BASE_URL}/booking`, payload, params);

  check(res, {
    'status 201 atau 400': (r) => r.status === 201 || r.status === 400,
    'booking berhasil (201)': (r) => r.status === 201,
    'konflik seat (400)': (r) =>
      (r.status === 400 && JSON.stringify(r.body).includes('diproses')) ||
      JSON.stringify(r.body).includes('tidak tersedia') ||
      JSON.stringify(r.body).includes('diambil orang lain'),
  });

  sleep(0.1);

  console.log(`Response status: ${res.status} Body: ${res.body}`);
}
