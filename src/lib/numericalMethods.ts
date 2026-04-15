import { create, all } from 'mathjs';
import nerdamer from 'nerdamer';
import 'nerdamer/Calculus';

const math = create(all);

export type IntegrationMethod = 
  | 'rectangle_gauche' 
  | 'rectangle_droite' 
  | 'point_milieu' 
  | 'trapeze' 
  | 'simpson' 
  | 'romberg' 
  | 'rk4'
  | 'lin_log';

export type PointIntegrationMethod =
  | 'rectangle_gauche_points'
  | 'rectangle_droite_points'
  | 'point_milieu_points'
  | 'trapeze_points'
  | 'simpson_points'
  | 'romberg_points'
  | 'rk4_points'
  | 'lin_log_points';

export interface IntegrationResult {
  method: IntegrationMethod;
  result: number;
  error?: number;
  executionTime: number;
}

/**
 * Calculates the exact analytical integral using nerdamer.
 */
export function calculateExact(f: string, a: number, b: number): number | null {
  try {
    // Convert mathjs-style power ^ to nerdamer-style ^ (usually same)
    // and handle some common differences if any.
    // nerdamer uses 'defint(expression, start, end, variable)'
    const expression = f.replace(/pow\(([^,]+),([^)]+)\)/g, '($1)^($2)');
    const result = nerdamer(`defint(${expression}, ${a}, ${b}, x)`);
    const val = parseFloat(result.evaluate().text());
    return isNaN(val) ? null : val;
  } catch (e) {
    console.error("Symbolic integration error:", e);
    return null;
  }
}

/**
 * Validates if a function string is likely to be evaluatable.
 */
export function isValidFunction(f: string): boolean {
  if (!f || f.trim() === "") return false;
  try {
    math.parse(f);
    return true;
  } catch (e) {
    return false;
  }
}

export function evaluateFunction(f: string, x: number): number {
  if (!f || f.trim() === "") return NaN;
  try {
    // We use a simple cache or just evaluate. 
    // For better performance in loops, we should compile once.
    return math.evaluate(f, { x });
  } catch (e) {
    // Only log if it's not a common parsing error during typing
    if (!(e instanceof Error && e.message.includes('Unexpected end of expression'))) {
      console.error(`Erreur d'évaluation de la fonction à x=${x}:`, e);
    }
    return NaN;
  }
}

// Helper to get a compiled evaluator for performance
function getEvaluator(f: string) {
  try {
    const node = math.parse(f);
    const code = node.compile();
    return (x: number) => {
      try {
        return code.evaluate({ x });
      } catch {
        return NaN;
      }
    };
  } catch {
    return () => NaN;
  }
}

// 1. Rectangle Gauche
export function rectangleGauche(evaluator: (x: number) => number, a: number, b: number, n: number): number {
  const h = (b - a) / n;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += evaluator(a + i * h);
  }
  return h * sum;
}

// 2. Rectangle Droite
export function rectangleDroite(evaluator: (x: number) => number, a: number, b: number, n: number): number {
  const h = (b - a) / n;
  let sum = 0;
  for (let i = 1; i <= n; i++) {
    sum += evaluator(a + i * h);
  }
  return h * sum;
}

// 3. Point Milieu
export function pointMilieu(evaluator: (x: number) => number, a: number, b: number, n: number): number {
  const h = (b - a) / n;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const x_mid = a + (i + 0.5) * h;
    sum += evaluator(x_mid);
  }
  return h * sum;
}

// 4. Trapèze
export function trapeze(evaluator: (x: number) => number, a: number, b: number, n: number): number {
  const h = (b - a) / n;
  let sum = (evaluator(a) + evaluator(b)) / 2;
  for (let i = 1; i < n; i++) {
    sum += evaluator(a + i * h);
  }
  return h * sum;
}

// 5. Simpson 1/3
export function simpson(evaluator: (x: number) => number, a: number, b: number, n: number): number {
  if (n % 2 !== 0) n++;
  const h = (b - a) / n;
  let sum = evaluator(a) + evaluator(b);
  
  for (let i = 1; i < n; i++) {
    const x = a + i * h;
    if (i % 2 === 0) {
      sum += 2 * evaluator(x);
    } else {
      sum += 4 * evaluator(x);
    }
  }
  return (h / 3) * sum;
}

// 6. Romberg
export function romberg(evaluator: (x: number) => number, a: number, b: number, n: number): number {
  if (isNaN(n) || n <= 0) return NaN;
  
  const R: number[][] = [];
  // Increase max steps to 14 for very high precision (2^13 = 8192 subdivisions)
  const maxSteps = Math.max(1, Math.min(14, Math.floor(Math.log2(n)) + 1));
  
  for (let i = 0; i < maxSteps; i++) {
    R[i] = [];
    const subdivisions = Math.pow(2, i);
    R[i][0] = trapeze(evaluator, a, b, subdivisions);
    
    for (let j = 1; j <= i; j++) {
      const diff = (R[i][j - 1] - R[i - 1][j - 1]) / (Math.pow(4, j) - 1);
      R[i][j] = R[i][j - 1] + diff;
    }
  }
  
  return R[maxSteps - 1][maxSteps - 1];
}

// 7. Runge-Kutta 4 (RK4)
export function rk4(evaluator: (x: number) => number, a: number, b: number, n: number): number {
  const h = (b - a) / n;
  let y = 0;
  let x = a;
  
  for (let i = 0; i < n; i++) {
    const k1 = evaluator(x);
    const k2 = evaluator(x + h / 2);
    const k3 = evaluator(x + h / 2);
    const k4 = evaluator(x + h);
    
    y += (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
    x += h;
  }
  return y;
}

// 8. Lin-Log (Linear up / Log down)
export function linLog(evaluator: (x: number) => number, a: number, b: number, n: number): number {
  const h = (b - a) / n;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const x1 = a + i * h;
    const x2 = a + (i + 1) * h;
    const y1 = evaluator(x1);
    const y2 = evaluator(x2);
    
    if (y1 <= 0 || y2 <= 0) {
      // Fallback to trapezoid if log is impossible
      sum += (h / 2) * (y1 + y2);
    } else if (Math.abs(y1 - y2) < 1e-12) {
      sum += h * y1;
    } else {
      sum += h * (y2 - y1) / (Math.log(y2) - Math.log(y1));
    }
  }
  return sum;
}

export interface IntegrationSummary {
  results: IntegrationResult[];
  reference: number;
  isExact: boolean;
}

export function calculateAll(f: string, a: number, b: number, n: number): IntegrationSummary | null {
  if (!isValidFunction(f) || isNaN(a) || isNaN(b) || isNaN(n) || n <= 0) {
    return null;
  }

  const evaluator = getEvaluator(f);
  
  const methods: { name: IntegrationMethod; fn: Function }[] = [
    { name: 'rectangle_gauche', fn: rectangleGauche },
    { name: 'rectangle_droite', fn: rectangleDroite },
    { name: 'point_milieu', fn: pointMilieu },
    { name: 'trapeze', fn: trapeze },
    { name: 'simpson', fn: simpson },
    { name: 'romberg', fn: romberg },
    { name: 'rk4', fn: rk4 },
    { name: 'lin_log', fn: linLog },
  ];

  const results: IntegrationResult[] = [];
  
  // Try to get exact analytical value first
  const exactValue = calculateExact(f, a, b);
  const isExact = exactValue !== null;
  // Fallback to high-precision Romberg if symbolic fails
  const reference = isExact ? exactValue : romberg(evaluator, a, b, 8192);

  for (const m of methods) {
    const start = performance.now();
    const res = m.fn(evaluator, a, b, n);
    const end = performance.now();
    
    results.push({
      method: m.name,
      result: res,
      error: isNaN(reference) || isNaN(res) ? undefined : Math.abs(reference - res),
      executionTime: end - start
    });
  }

  return { results, reference, isExact };
}

// Point-based methods
export function calculateFromPoints(
  x: number[], 
  y: number[], 
  n: number, 
  method: PointIntegrationMethod
): number {
  const nToUse = Math.min(n, x.length - 1);
  if (nToUse <= 0) return 0;

  let sum = 0;

  switch (method) {
    case 'rectangle_gauche_points':
      for (let i = 0; i < nToUse; i++) {
        const h = x[i+1] - x[i];
        sum += h * y[i];
      }
      break;

    case 'rectangle_droite_points':
      for (let i = 0; i < nToUse; i++) {
        const h = x[i+1] - x[i];
        sum += h * y[i+1];
      }
      break;

    case 'trapeze_points':
      for (let i = 0; i < nToUse; i++) {
        const h = x[i+1] - x[i];
        sum += (h / 2) * (y[i] + y[i+1]);
      }
      break;

    case 'simpson_points':
      // Simpson's 1/3 rule requires uniform intervals. 
      // If intervals are non-uniform, we fallback to trapezoidal or a more complex approach.
      // For simplicity, we'll assume uniform intervals for the formula but apply it to segments.
      // If nToUse is odd, we use Simpson's for nToUse-1 and trapezoid for the last one.
      let i = 0;
      while (i < nToUse - 1) {
        const h1 = x[i+1] - x[i];
        const h2 = x[i+2] - x[i+1];
        // General Simpson's for non-uniform (Parabolic interpolation)
        const h = h1 + h2;
        sum += (h / 6) * (
          (2 - h2/h1) * y[i] + 
          (h * h / (h1 * h2)) * y[i+1] + 
          (2 - h1/h2) * y[i+2]
        );
        i += 2;
      }
      if (i === nToUse - 1) {
        // Last segment with trapezoid
        const h = x[i+1] - x[i];
        sum += (h / 2) * (y[i] + y[i+1]);
      }
      break;

    case 'lin_log_points':
      for (let i = 0; i < nToUse; i++) {
        const h = x[i+1] - x[i];
        const y1 = y[i];
        const y2 = y[i+1];
        if (y1 <= 0 || y2 <= 0) {
          sum += (h / 2) * (y1 + y2);
        } else if (Math.abs(y1 - y2) < 1e-12) {
          sum += h * y1;
        } else {
          sum += h * (y2 - y1) / (Math.log(y2) - Math.log(y1));
        }
      }
      break;
  }

  return sum;
}

// Helper to get an evaluator from discrete points using linear interpolation
function getPointEvaluator(x: number[], y: number[]) {
  // Sort points by x to ensure interpolation works correctly
  const points = x.map((val, i) => ({ x: val, y: y[i] }))
    .sort((a, b) => a.x - b.x);
  
  const sortedX = points.map(p => p.x);
  const sortedY = points.map(p => p.y);

  return (val: number) => {
    if (val <= sortedX[0]) return sortedY[0];
    if (val >= sortedX[sortedX.length - 1]) return sortedY[sortedY.length - 1];

    // Find the interval containing val
    let i = 1;
    while (i < sortedX.length && sortedX[i] < val) {
      i++;
    }

    const x0 = sortedX[i - 1];
    const x1 = sortedX[i];
    const y0 = sortedY[i - 1];
    const y1 = sortedY[i];

    // Linear interpolation formula: y = y0 + (x - x0) * (y1 - y0) / (x1 - x0)
    return y0 + (val - x0) * (y1 - y0) / (x1 - x0);
  };
}

export function calculateAllFromPoints(x: number[], y: number[], n: number): IntegrationSummary | null {
  if (x.length !== y.length || x.length < 2) return null;

  const a = Math.min(...x);
  const b = Math.max(...x);
  const evaluator = getPointEvaluator(x, y);

  const methods: { name: IntegrationMethod; fn: Function }[] = [
    { name: 'rectangle_gauche', fn: rectangleGauche },
    { name: 'rectangle_droite', fn: rectangleDroite },
    { name: 'point_milieu', fn: pointMilieu },
    { name: 'trapeze', fn: trapeze },
    { name: 'simpson', fn: simpson },
    { name: 'romberg', fn: romberg },
    { name: 'rk4', fn: rk4 },
    { name: 'lin_log', fn: linLog },
  ];

  const results: IntegrationResult[] = [];
  // For points, the reference is the integral of the interpolated function.
  // We use a very high-precision Romberg (8192 subdivisions) as the "exact" reference.
  const reference = romberg(evaluator, a, b, 8192);
  
  for (const m of methods) {
    const start = performance.now();
    const res = m.fn(evaluator, a, b, n);
    const end = performance.now();
    
    results.push({
      method: m.name,
      result: res,
      error: isNaN(reference) || isNaN(res) ? undefined : Math.abs(reference - res),
      executionTime: end - start
    });
  }

  return { results, reference, isExact: false }; // Points are always approximations
}
