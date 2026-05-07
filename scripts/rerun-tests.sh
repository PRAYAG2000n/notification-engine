#!/bin/bash
set -e

echo "=========================================="
echo "  NotifyHub - Re-run Failed Tests"
echo "=========================================="

RESULTS_DIR="./benchmark-results"
mkdir -p "$RESULTS_DIR"

cleanup() {
  echo ""
  echo "Cleaning up..."
  [ -n "$WS_PID" ] && kill $WS_PID 2>/dev/null || true
  [ -n "$DEV_PID" ] && kill $DEV_PID 2>/dev/null || true
  sudo fuser -k 3000/tcp 2>/dev/null || true
  sudo fuser -k 3001/tcp 2>/dev/null || true
}
trap cleanup EXIT

# Kill everything on ports we need
echo "Freeing ports..."
sudo fuser -k 3000/tcp 2>/dev/null || true
sudo fuser -k 3001/tcp 2>/dev/null || true
sleep 2

# ==========================================
# [1/2] WebSocket Load Test (200 users)
# ==========================================
echo ""
echo "[1/2] Starting WebSocket server on port 3001..."

npx tsx src/server/websocket.ts &
WS_PID=$!
sleep 4

# Verify WebSocket server is running
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
  echo "WebSocket server is running."
  echo ""
  echo "Running k6 WebSocket load test (200 concurrent users)..."

  k6 run \
    --out json="$RESULTS_DIR/ws-load-results-v2.json" \
    -e WS_URL=ws://localhost:3001 \
    tests/load/ws-load-test.js 2>&1 | tee "$RESULTS_DIR/ws-load-output-v2.txt"
else
  echo "ERROR: WebSocket server failed to start."
  echo "Checking logs..."
  sleep 2
  # Try starting again with more debug info
  kill $WS_PID 2>/dev/null || true
  WS_PORT=3001 npx tsx src/server/websocket.ts 2>&1 &
  WS_PID=$!
  sleep 5

  if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "WebSocket server started on retry."
    k6 run \
      --out json="$RESULTS_DIR/ws-load-results-v2.json" \
      -e WS_URL=ws://localhost:3001 \
      tests/load/ws-load-test.js 2>&1 | tee "$RESULTS_DIR/ws-load-output-v2.txt"
  else
    echo "WebSocket server failed twice. Skipping."
  fi
fi

# Kill WebSocket server
kill $WS_PID 2>/dev/null || true
sleep 1

# ==========================================
# [2/2] Event Throughput Test
# ==========================================
echo ""
echo "[2/2] Starting dev server for throughput test..."

# Free port 3000 again
sudo fuser -k 3000/tcp 2>/dev/null || true
sleep 2

# Use dev server instead of production (production has Pages Router compilation issues)
npm run dev &
DEV_PID=$!
echo "Waiting for dev server to be ready..."
sleep 8

# Verify dev server is up
if curl -s http://localhost:3000 > /dev/null 2>&1; then
  echo "Dev server is running."

  # Quick test: verify the publish endpoint works
  echo "Testing /api/events/publish endpoint..."
  RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/events/publish \
    -H "Content-Type: application/json" \
    -d '{"title":"test","body":"test","type":"SYSTEM","priority":"NORMAL"}')

  if [ "$RESPONSE" = "201" ] || [ "$RESPONSE" = "200" ]; then
    echo "Publish endpoint returned $RESPONSE. Running throughput test..."

    k6 run \
      --out json="$RESULTS_DIR/throughput-results-v2.json" \
      -e API_URL=http://localhost:3000 \
      tests/load/event-throughput-test.js 2>&1 | tee "$RESULTS_DIR/throughput-output-v2.txt"
  else
    echo "ERROR: Publish endpoint returned HTTP $RESPONSE."
    echo "Fetching full response for debugging..."
    curl -s -X POST http://localhost:3000/api/events/publish \
      -H "Content-Type: application/json" \
      -d '{"title":"test","body":"test","type":"SYSTEM","priority":"NORMAL"}'
    echo ""
  fi
else
  echo "ERROR: Dev server failed to start."
fi

kill $DEV_PID 2>/dev/null || true

echo ""
echo "=========================================="
echo "  Re-run Complete"
echo "=========================================="
echo "Results in: $RESULTS_DIR/"
ls -la "$RESULTS_DIR/"*v2* 2>/dev/null || echo "No new result files."
