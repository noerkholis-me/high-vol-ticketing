import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate } from 'k6/metrics';

export const successfulBookings = new Counter('successful_bookings');
export const conflictedBookings = new Counter('conflicted_bookings');
export const bookingSuccessRate = new Rate('booking_success_rate');
export const failedFetches = new Counter('failed_seat_fetches');

const BASE_URL = 'http://host.docker.internal:3000/api/v1';

const AUTH_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3YmFjOTE2YS01YzBkLTRiYmQtYmUyYy1kMWNjNmVhYjEwNjkiLCJlbWFpbCI6InVzZXIxQGhpZ2h2b2wuY29tIiwiaWF0IjoxNzY4MzE5MzA2LCJleHAiOjE3Njg0MDU3MDZ9.dN-sa4b9rfRCv4uqDhV-909uWzu1w-33mlBZ4XfZPAg';

const params = {
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${AUTH_TOKEN}`,
  },
};

export const options = {
  stages: [
    { duration: '1m', target: 50 }, // ramp up
    { duration: '2m', target: 100 }, // moderate peak
    { duration: '5m', target: 100 }, // sustained normal sale
    { duration: '2m', target: 0 }, // ramp down
  ],
  thresholds: {
    // Only 5xx are HTTP failures
    'http_req_failed{status:>=500}': ['rate<0.005'],

    // Stricter latency SLO for normal sale traffic
    'http_req_duration{expected_response:true}': ['p(95)<500'],

    // Business-level thresholds for normal scenario
    successful_bookings: ['count>500'],
    booking_success_rate: ['rate>0.7'], // adjust this to your real business target
  },
};

export function bookingFlow() {
  const fetchRes = http.get(`${BASE_URL}/booking`, params);

  if (fetchRes.status !== 200) {
    failedFetches.add(1);
    check(fetchRes, { 'GET available seats gagal': () => false });
    sleep(2);
    return;
  }

  let availableSeatIds = [];
  try {
    const body = JSON.parse(fetchRes.body);
    availableSeatIds = body.data?.map((seat) => seat.id) || [];
  } catch (e) {
    console.log(`Error parsing available seats: ${e}`);
    sleep(1);
    return;
  }

  if (availableSeatIds.length === 0) {
    // In a normal-sale scenario, you might treat this as a warning, but not an error
    check(true, { 'No seats available (normal di high load)': true });
    sleep(1.5);
    return;
  }

  const seatId = availableSeatIds[Math.floor(Math.random() * availableSeatIds.length)];
  const payload = JSON.stringify({ seatId });
  const bookingRes = http.post(`${BASE_URL}/booking`, payload, {
    ...params,
    tags: { endpoint: 'booking', type: 'post' },
  });

  check(
    bookingRes,
    {
      'status 201 atau 400': (r) => r.status === 201 || r.status === 400,
      'booking berhasil (201)': (r) => r.status === 201,
      'konflik seat (400)': (r) => r.status === 400,
    },
    { type: 'booking_outcome' },
  );

  if (bookingRes.status === 201) {
    bookingSuccessRate.add(true);
    successfulBookings.add(1);
  } else if (bookingRes.status === 400) {
    bookingSuccessRate.add(false);
    conflictedBookings.add(1);
  } else if (bookingRes.status >= 500) {
    bookingSuccessRate.add(false);
  }

  sleep(Math.random() * 2.5 + 0.5);
}

export default bookingFlow;
