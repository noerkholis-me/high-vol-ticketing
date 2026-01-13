import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 100,
  duration: '10s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
  },
};

const BASE_URL = 'http://host.docker.internal:3000/api/v1';
const SEAT_ID = '35adfc37-e055-427f-8a0e-d4f97ebb0792';

const AUTH_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3YmFjOTE2YS01YzBkLTRiYmQtYmUyYy1kMWNjNmVhYjEwNjkiLCJlbWFpbCI6InVzZXIxQGhpZ2h2b2wuY29tIiwiaWF0IjoxNzY4MzE5MzA2LCJleHAiOjE3Njg0MDU3MDZ9.dN-sa4b9rfRCv4uqDhV-909uWzu1w-33mlBZ4XfZPAg';

export default function () {
  const payload = JSON.stringify({
    seatId: SEAT_ID,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${AUTH_TOKEN}`,
    },
  };

  const res = http.post(`${BASE_URL}/booking`, payload, params);

  check(res, {
    'status 201 atau 400': (r) => r.status === 201 || r.status === 400,
    'booking berhasil (201)': (r) => r.status === 201,
    'konflik seat (400)': (r) => r.status === 400,
  });

  sleep(1);

  console.log(`Response status: ${res.status} Body: ${res.body}`);
}
