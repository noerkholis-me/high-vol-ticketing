import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 100,
  duration: '10s',
};

export default function () {
  const url = 'http://host.docker.internal:3000/api/v1/booking';
  const payload = JSON.stringify({
    userId: `user-${Math.floor(Math.random() * 1000)}`,
    seatId: 'b5f91462-8d5f-495c-97b8-146b2bad879e',
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
  };

  const res = http.post(url, payload, params);

  check(res, {
    'status is 201 or 400': (r) => r.status === 201 || r.status === 400,
    'no 500 errors': (r) => r.status !== 500,
  });

  sleep(0.1);

  console.log(`Response status: ${res.status} Body: ${res.body}`);
}
