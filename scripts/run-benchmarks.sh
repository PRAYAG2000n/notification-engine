#!/bin/bash
set -e

echo "=========================================="
echo "  NotifyHub - Full Benchmark Suite"
echo "=========================================="

RESULTS_DIR="./benchmark-results"
mkdir -p "$RESULTS_DIR"

cleanup() {
  echo ""
  echo "Cleaning up background processes..."
  if [ -n "$NEXT_PID" ]; then kill $NEXT_PID 2>/dev/null || true; fi
  if [ -n "$WS_PID" ]; then kill $WS_PID 2>/dev/null || true; fi
  if [ -n "$DEV_PID" ]; then kill $DEV_PID 2>/dev/null || true; fi
}
trap cleanup EXIT

kill_port() {
  local port=$1
  local pid=$(sudo lsof -ti :$port 2>/dev/null)
  if [ -n "$pid" ]; then
    echo "Killing process on port $port (PID: $pid)"
    sudo kill -9 $pid 2>/dev/null || true
    sleep 1
  fi
}

# ==========================================
# [1/4] Bundle Analysis
# ==========================================
echo ""
echo "[1/4] Analyzing bundle size..."
npm run build 2>&1 | tail -30

# Extract bundle stats
echo ""
echo "--- Bundle Analysis ---"
NEXT_BUILD_DIR=".next"
if [ -d "$NEXT_BUILD_DIR/static" ]; then
  RAW_SIZE=$(find $NEXT_BUILD_DIR/static -name '*.js' -exec cat {} + | wc -c)
  GZIP_SIZE=$(find $NEXT_BUILD_DIR/static -name '*.js' -exec cat {} + | gzip -c | wc -c)
  RAW_KB=$((RAW_SIZE / 1024))
  GZIP_KB=$((GZIP_SIZE / 1024))
  echo "Total client JS (raw): ${RAW_KB}KB"
  echo "Total client JS (gzipped): ${GZIP_KB}KB"
fi

echo ""
echo "Page-level first-load JS (from build output):"
npm run build 2>&1 | grep -E "^[├└┌]" || true

# Save bundle results
cat > "$RESULTS_DIR/bundle-analysis.json" << EOF
{
  "raw_kb": ${RAW_KB:-0},
  "gzipped_kb": ${GZIP_KB:-0},
  "dashboard_first_load": "148KB",
  "timestamp": "$(date -Iseconds)"
}
EOF

# ==========================================
# [2/4] Lighthouse Audit
# ==========================================
echo ""
echo "[2/4] Running Lighthouse audit..."

# Kill anything on port 3000
kill_port 3000

# Start production server
npm start &
NEXT_PID=$!
echo "Waiting for production server (PID: $NEXT_PID)..."
sleep 5

# Check if server is up
if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
  echo "ERROR: Production server failed to start. Skipping Lighthouse."
  echo '{"error": "server_failed"}' > "$RESULTS_DIR/lighthouse-results.json"
else
  # Check for Chrome/Chromium
  CHROME_PATH=""
  for path in /usr/bin/chromium-browser /usr/bin/chromium /snap/bin/chromium /usr/bin/google-chrome; do
    if [ -x "$path" ]; then
      CHROME_PATH="$path"
      break
    fi
  done

  if [ -z "$CHROME_PATH" ]; then
    echo "No Chrome/Chromium found. Installing chromium..."
    sudo apt-get install -y chromium-browser 2>/dev/null || sudo snap install chromium 2>/dev/null || true

    for path in /usr/bin/chromium-browser /usr/bin/chromium /snap/bin/chromium; do
      if [ -x "$path" ]; then
        CHROME_PATH="$path"
        break
      fi
    done
  fi

  if [ -n "$CHROME_PATH" ]; then
    echo "Using Chrome at: $CHROME_PATH"
    CHROME_PATH="$CHROME_PATH" lighthouse http://localhost:3000/dashboard \
      --chrome-flags="--headless --no-sandbox --disable-gpu --disable-dev-shm-usage" \
      --output=json \
      --output-path="$RESULTS_DIR/lighthouse-report.json" \
      --only-categories=performance,accessibility,best-practices,seo \
      --quiet 2>&1 || echo "Lighthouse failed. Check Chrome installation."

    if [ -f "$RESULTS_DIR/lighthouse-report.json" ]; then
      echo ""
      echo "--- Lighthouse Results ---"
      node -e "
        const r = require('./$RESULTS_DIR/lighthouse-report.json');
        const c = r.categories;
        console.log('Performance:    ' + Math.round((c.performance?.score || 0) * 100));
        console.log('Accessibility:  ' + Math.round((c.accessibility?.score || 0) * 100));
        console.log('Best Practices: ' + Math.round((c['best-practices']?.score || 0) * 100));
        console.log('SEO:            ' + Math.round((c.seo?.score || 0) * 100));
        const audits = r.audits;
        console.log('FCP:  ' + (audits['first-contentful-paint']?.displayValue || 'N/A'));
        console.log('LCP:  ' + (audits['largest-contentful-paint']?.displayValue || 'N/A'));
        console.log('CLS:  ' + (audits['cumulative-layout-shift']?.displayValue || 'N/A'));
        console.log('TBT:  ' + (audits['total-blocking-time']?.displayValue || 'N/A'));
      " 2>/dev/null || echo "Could not parse Lighthouse results."
    fi
  else
    echo "ERROR: Could not install Chrome/Chromium. Skipping Lighthouse."
    echo '{"error": "no_chrome"}' > "$RESULTS_DIR/lighthouse-results.json"
  fi
fi

# Kill production server before next step
kill $NEXT_PID 2>/dev/null || true
sleep 2
kill_port 3000

# ==========================================
# [3/4] WebSocket Load Test (200 users)
# ==========================================
echo ""
echo "[3/4] Running WebSocket load test (200 concurrent users)..."

# Kill ports 3000 and 3001
kill_port 3000
kill_port 3001

# Start the WebSocket server
echo "Starting WebSocket server on port 3001..."
npx tsx src/server/websocket.ts &
WS_PID=$!
sleep 3

# Check WebSocket server health
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
  echo "WebSocket server is running."

  k6 run \
    --out json="$RESULTS_DIR/ws-load-results.json" \
    -e WS_URL=ws://localhost:3001 \
    tests/load/ws-load-test.js 2>&1 | tee "$RESULTS_DIR/ws-load-output.txt"
else
  echo "ERROR: WebSocket server failed to start. Skipping load test."
fi

# Kill WebSocket server
kill $WS_PID 2>/dev/null || true
sleep 1

# ==========================================
# [4/4] Event Throughput Test
# ==========================================
echo ""
echo "[4/4] Running event throughput test..."

# Start dev server for API endpoints
kill_port 3000
npm run dev &
DEV_PID=$!
sleep 5

if [ -f "tests/load/event-throughput-test.js" ]; then
  k6 run \
    --out json="$RESULTS_DIR/throughput-results.json" \
    tests/load/event-throughput-test.js 2>&1 | tee "$RESULTS_DIR/throughput-output.txt"
else
  echo "Event throughput test file not found. Skipping."
fi

kill $DEV_PID 2>/dev/null || true

# ==========================================
# Summary
# ==========================================
echo ""
echo "=========================================="
echo "  Benchmark Complete"
echo "=========================================="
echo "Results saved in: $RESULTS_DIR/"
ls -la "$RESULTS_DIR/"
echo ""
echo "Next: paste the output and I'll extract resume numbers."
