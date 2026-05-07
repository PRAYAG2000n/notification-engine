module.exports = {
  ci: {
    collect: {
      url: [
        "http://localhost:3000/login",
        "http://localhost:3000/dashboard",
      ],
      numberOfRuns: 3,
      settings: {
        preset: "desktop",
        throttling: {
          // Simulate 4G connection
          rttMs: 150,
          throughputKbps: 1638.4,
          cpuSlowdownMultiplier: 4,
        },
        formFactor: "desktop",
        screenEmulation: {
          mobile: false,
          width: 1350,
          height: 940,
        },
      },
    },
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 0.9 }],
        "categories:accessibility": ["warn", { minScore: 0.85 }],
        "categories:best-practices": ["warn", { minScore: 0.9 }],
        "categories:seo": ["warn", { minScore: 0.85 }],
        "first-contentful-paint": ["warn", { maxNumericValue: 1500 }],
        "largest-contentful-paint": ["warn", { maxNumericValue: 2500 }],
        "cumulative-layout-shift": ["warn", { maxNumericValue: 0.1 }],
        "total-blocking-time": ["warn", { maxNumericValue: 200 }],
      },
    },
    upload: {
      target: "filesystem",
      outputDir: "./lighthouse-results",
    },
  },
};
