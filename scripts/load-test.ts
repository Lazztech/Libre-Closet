import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import autocannon from 'autocannon';

const BASELINE_PATH = path.join(__dirname, 'results', 'baseline.json');
const RESULTS_PATH = path.join(__dirname, 'results', 'load-test-results.json');

async function main() {
  const isBaseline = process.argv.includes('--baseline');
  const isCompare = process.argv.includes('--compare');

  console.log('Building app...');
  execSync('npm run build', { stdio: 'inherit' });

  console.log('Starting server...');
  let stderr = '';
  const server = spawn('node', ['dist/main.js'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'production' },
  });
  server.stderr.on('data', (data: Buffer) => {
    stderr += data.toString();
  });

  server.on('error', (err) => {
    console.error('Server failed to start:', err);
  });

  try {
    await waitForServer('http://localhost:3000', server, stderr);

    console.log('Running load test against GET / ...');
    const results = await autocannon({
      url: 'http://localhost:3000/',
      connections: 10,
      duration: 10,
    });

    fs.mkdirSync(path.dirname(RESULTS_PATH), { recursive: true });
    fs.writeFileSync(RESULTS_PATH, JSON.stringify(results, null, 2));

    printSummary(results as AutocannonResult);

    if (isBaseline) {
      fs.copyFileSync(RESULTS_PATH, BASELINE_PATH);
      console.log(`Baseline saved to ${BASELINE_PATH}`);
    }

    if (isCompare) {
      if (fs.existsSync(BASELINE_PATH)) {
        const baseline = JSON.parse(
          fs.readFileSync(BASELINE_PATH, 'utf-8'),
        ) as AutocannonResult;
        printComparison(baseline, results as AutocannonResult);
      } else {
        console.warn('No baseline found. Run with --baseline first.');
      }
    }
  } finally {
    server.kill('SIGTERM');
  }
}

function waitForServer(
  url: string,
  server: any,
  stderrBuffer: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();

    const onExit = (code: number) => {
      clearInterval(interval);
      reject(
        new Error(
          `Server exited unexpectedly with code ${code}\nStderr:\n${stderrBuffer}`,
        ),
      );
    };
    server.once('exit', onExit);

    const interval = setInterval(() => {
      void (async () => {
        try {
          const res = await fetch(url);
          if (res.ok) {
            clearInterval(interval);
            server.off('exit', onExit);
            resolve();
          }
        } catch {
          if (Date.now() - start > 30000) {
            clearInterval(interval);
            server.off('exit', onExit);
            reject(new Error('Server did not start within 30s'));
          }
        }
      })();
    }, 500);
  });
}

interface AutocannonResult {
  requests: { average: number };
  latency: { average: number; p50: number; p99: number };
  throughput: { average: number };
}

function printSummary(results: AutocannonResult) {
  console.log('\n--- Load Test Results ---');
  console.log(`Requests/sec: ${results.requests.average.toFixed(2)}`);
  console.log(`Latency avg:  ${results.latency.average.toFixed(2)} ms`);
  console.log(`Latency p50:  ${results.latency.p50.toFixed(2)} ms`);
  console.log(`Latency p99:  ${results.latency.p99.toFixed(2)} ms`);
  console.log(
    `Throughput:   ${(results.throughput.average / 1024 / 1024).toFixed(2)} MB/sec`,
  );
  console.log('-------------------------\n');
}

function printComparison(
  baseline: AutocannonResult,
  current: AutocannonResult,
) {
  const reqDiff = percentChange(
    baseline.requests.average,
    current.requests.average,
  );
  const latDiff = percentChange(
    baseline.latency.average,
    current.latency.average,
  );

  console.log('--- Comparison vs Baseline ---');
  console.log(
    `Requests/sec: ${current.requests.average.toFixed(2)} (${reqDiff})`,
  );
  console.log(
    `Latency avg:  ${current.latency.average.toFixed(2)} ms (${latDiff})`,
  );
  console.log('-------------------------------\n');
}

function percentChange(oldVal: number, newVal: number): string {
  const change = ((newVal - oldVal) / oldVal) * 100;
  const sign = change > 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}%`;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
