const DURATION_BUCKETS_SECONDS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10] as const;

interface RequestLabels {
  method: string;
  route: string;
  statusCode: number;
}

interface HistogramState {
  count: number;
  sum: number;
  buckets: number[];
}

export class ApiMetrics {
  private inflight = 0;
  private readonly requests = new Map<string, number>();
  private readonly errors = new Map<string, number>();
  private readonly durations = new Map<string, HistogramState>();

  requestStarted(): void {
    this.inflight += 1;
  }

  requestFinished(labels: RequestLabels, durationSeconds: number): void {
    this.inflight = Math.max(0, this.inflight - 1);
    const key = requestKey(labels);
    this.requests.set(key, (this.requests.get(key) ?? 0) + 1);
    const histogram = this.durations.get(key) ?? {
      count: 0,
      sum: 0,
      buckets: DURATION_BUCKETS_SECONDS.map(() => 0)
    };
    histogram.count += 1;
    histogram.sum += Math.max(0, durationSeconds);
    for (let index = 0; index < DURATION_BUCKETS_SECONDS.length; index += 1) {
      if (durationSeconds <= DURATION_BUCKETS_SECONDS[index]!) histogram.buckets[index]! += 1;
    }
    this.durations.set(key, histogram);
  }

  error(route: string, code: string): void {
    const key = `${safeLabel(route)}\u0000${safeLabel(code)}`;
    this.errors.set(key, (this.errors.get(key) ?? 0) + 1);
  }

  render(): string {
    const lines = [
      "# HELP h3_http_inflight_requests Current in-flight HTTP requests.",
      "# TYPE h3_http_inflight_requests gauge",
      `h3_http_inflight_requests ${this.inflight}`,
      "# HELP h3_http_requests_total Completed HTTP requests.",
      "# TYPE h3_http_requests_total counter"
    ];
    for (const [key, count] of sorted(this.requests)) {
      lines.push(`h3_http_requests_total{${requestLabels(key)}} ${count}`);
    }
    lines.push(
      "# HELP h3_http_request_duration_seconds Server request duration.",
      "# TYPE h3_http_request_duration_seconds histogram"
    );
    for (const [key, histogram] of sorted(this.durations)) {
      const labels = requestLabels(key);
      for (let index = 0; index < DURATION_BUCKETS_SECONDS.length; index += 1) {
        lines.push(
          `h3_http_request_duration_seconds_bucket{${labels},le="${DURATION_BUCKETS_SECONDS[index]}"} ${histogram.buckets[index]}`
        );
      }
      lines.push(`h3_http_request_duration_seconds_bucket{${labels},le="+Inf"} ${histogram.count}`);
      lines.push(`h3_http_request_duration_seconds_sum{${labels}} ${histogram.sum.toFixed(6)}`);
      lines.push(`h3_http_request_duration_seconds_count{${labels}} ${histogram.count}`);
    }
    lines.push("# HELP h3_http_errors_total Normalized API errors.", "# TYPE h3_http_errors_total counter");
    for (const [key, count] of sorted(this.errors)) {
      const [route, code] = key.split("\u0000");
      lines.push(`h3_http_errors_total{route="${route}",code="${code}"} ${count}`);
    }
    return `${lines.join("\n")}\n`;
  }
}

export function metricRoute(route: string | undefined): string {
  if (!route || route === "*") return "unmatched";
  return safeLabel(route);
}

function requestKey({ method, route, statusCode }: RequestLabels): string {
  return `${safeLabel(method.toUpperCase())}\u0000${safeLabel(route)}\u0000${statusCode}`;
}

function requestLabels(key: string): string {
  const [method, route, statusCode] = key.split("\u0000");
  return `method="${method}",route="${route}",status_code="${statusCode}"`;
}

function safeLabel(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"').replaceAll("\n", "\\n").slice(0, 160);
}

function sorted<T>(map: Map<string, T>): [string, T][] {
  return [...map.entries()].sort(([left], [right]) => left.localeCompare(right));
}
