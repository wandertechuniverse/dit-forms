import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';

const messageLatency = new Trend('sse_message_latency_ms');
const connectionErrors = new Counter('sse_connection_errors');
const messagesReceived = new Counter('sse_messages_received');

const API_BASE = __ENV.API_BASE_URL || 'http://localhost:8000';

export const options = {
  scenarios: {
    steady_state: {
      executor: 'constant-vus',
      vus: 50,
      duration: '2m',
      exec: 'testSSEConnection',
    },
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 200 },
        { duration: '1m', target: 200 },
        { duration: '30s', target: 0 },
      ],
      exec: 'testSSEConnection',
      startTime: '2m30s',
    },
  },
  thresholds: {
    sse_message_latency_ms: ['p(95)<500'],
    sse_connection_errors: ['rate<0.01'],
    http_req_duration: ['p(95)<1000'],
  },
};

export function testSSEConnection() {
  const studentId = `STU-${Math.floor(Math.random() * 10000)}`;
  const url = `${API_BASE}/public/status/stream/${studentId}`;

  const res = http.get(url, {
    headers: { Accept: 'text/event-stream', 'Cache-Control': 'no-cache' },
    timeout: '120s',
  });

  const connected = check(res, {
    'status is 200': (r) => r.status === 200,
    'content-type is event-stream': (r) =>
      r.headers['Content-Type']?.includes('text/event-stream'),
    'receives connected event': (r) =>
      r.body.includes('"type":"connected"'),
  });

  if (!connected) {
    connectionErrors.add(1);
    return;
  }

  const lines = res.body.split('\n\n').filter((l) => l.startsWith('data:'));
  messagesReceived.add(lines.length);

  for (const line of lines) {
    try {
      const data = JSON.parse(line.replace('data: ', ''));
      if (data.timestamp) {
        const latency = Date.now() - new Date(data.timestamp).getTime();
        messageLatency.add(latency);
      }
    } catch {
      connectionErrors.add(1);
    }
  }

  sleep(Math.random() * 60 + 30);
}

export function testStatusEndpoint() {
  const studentId = `STU-${Math.floor(Math.random() * 10000)}`;
  const res = http.get(`${API_BASE}/public/status?idNumber=${studentId}`);

  check(res, {
    'status is 200 or 404': (r) => r.status === 200 || r.status === 404,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}

export function testPaymentRecording() {
  const res = http.post(`${API_BASE}/payments/record?invoiceNumber=INV-TEST-0001&amount=50&reference=LOAD-TEST&method=cash`, null, {
    headers: { Authorization: `Bearer ${__ENV.TEST_TOKEN || ''}` },
  });

  check(res, {
    'returns 400 or 404 (expected)': (r) => r.status === 400 || r.status === 404,
    'response time < 2s': (r) => r.timings.duration < 2000,
  });

  sleep(2);
}
