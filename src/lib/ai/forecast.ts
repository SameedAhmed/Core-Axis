/** Simple linear regression (least squares) over an ordered series of values. */
export function linearForecast(values: number[]): { nextValue: number; slope: number } {
    const n = values.length;
    if (n === 0) return { nextValue: 0, slope: 0 };
    if (n === 1) return { nextValue: values[0], slope: 0 };

    const xs = values.map((_, i) => i);
    const meanX = xs.reduce((a, b) => a + b, 0) / n;
    const meanY = values.reduce((a, b) => a + b, 0) / n;

    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i++) {
        num += (xs[i] - meanX) * (values[i] - meanY);
        den += (xs[i] - meanX) ** 2;
    }
    const slope = den === 0 ? 0 : num / den;
    const intercept = meanY - slope * meanX;
    const nextValue = Math.max(0, intercept + slope * n);

    return { nextValue, slope };
}

/** Mean and standard deviation of a numeric series. */
export function meanStdDev(values: number[]): { mean: number; stdDev: number } {
    if (values.length === 0) return { mean: 0, stdDev: 0 };
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
    return { mean, stdDev: Math.sqrt(variance) };
}

/**
 * Holt's linear trend (double exponential smoothing) forecast. Unlike plain
 * OLS regression, it weights recent observations more heavily (alpha) and
 * tracks trend separately (beta), which better suits short, recent-weighted
 * demand series like weekly stock-outs. Also returns the standard deviation
 * of one-step-ahead forecast residuals, used for safety-stock calculations.
 */
export function holtForecast(
    values: number[],
    alpha = 0.3,
    beta = 0.1
): { nextValue: number; trend: number; residualStdDev: number } {
    const n = values.length;
    if (n === 0) return { nextValue: 0, trend: 0, residualStdDev: 0 };
    if (n === 1) return { nextValue: values[0], trend: 0, residualStdDev: 0 };

    let level = values[0];
    let trend = values[1] - values[0];
    const residuals: number[] = [];

    for (let t = 1; t < n; t++) {
        const prevLevel = level;
        const prevTrend = trend;
        const oneStepForecast = prevLevel + prevTrend;
        residuals.push(values[t] - oneStepForecast);

        level = alpha * values[t] + (1 - alpha) * (prevLevel + prevTrend);
        trend = beta * (level - prevLevel) + (1 - beta) * prevTrend;
    }

    const { stdDev: residualStdDev } = meanStdDev(residuals);
    const nextValue = Math.max(0, level + trend);

    return { nextValue, trend, residualStdDev };
}
