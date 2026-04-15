import { useState, useEffect, useMemo } from 'react';
import { IntegrationChart } from './components/IntegrationChart';
import { PointsChart } from './components/PointsChart';
import { ComparisonTable } from './components/ComparisonTable';
import { calculateAll, calculateFromPoints, calculateAllFromPoints, IntegrationResult, IntegrationMethod, PointIntegrationMethod } from './lib/numericalMethods';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Calculator, FunctionSquare, Table2, Info, Settings2, Github, List, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type AppMode = 'function' | 'points';

const methodLabels: Record<string, string> = {
  rectangle_gauche: "Rectangle Gauche",
  rectangle_droite: "Rectangle Droite",
  point_milieu: "Point Milieu",
  trapeze: "Trapèze",
  simpson: "Simpson (1/3)",
  romberg: "Romberg",
  rk4: "Runge-Kutta 4",
  lin_log: "Lin-Log",
};

export default function App() {
  const [mode, setMode] = useState<AppMode>('function');
  const [f, setF] = useState<string>("x^2 + sin(x)");
  const [aStr, setAStr] = useState<string>("0");
  const [bStr, setBStr] = useState<string>("3.14159");
  const [nStr, setNStr] = useState<string>("10");

  const a = parseFloat(aStr) || 0;
  const b = parseFloat(bStr) || 0;
  const n = Math.max(1, parseInt(nStr) || 1);
  const [selectedMethod, setSelectedMethod] = useState<IntegrationMethod>("trapeze");
  const [results, setResults] = useState<IntegrationResult[]>([]);
  const [referenceValue, setReferenceValue] = useState<number>(0);
  const [isReferenceExact, setIsReferenceExact] = useState<boolean>(false);
  const [pointsXStr, setPointsXStr] = useState<string>("0, 1, 2, 3, 4");
  const [pointsYStr, setPointsYStr] = useState<string>("0, 1, 4, 9, 16");

  const pointsX = useMemo(() => pointsXStr.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v)), [pointsXStr]);
  const pointsY = useMemo(() => pointsYStr.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v)), [pointsYStr]);

  useEffect(() => {
    if (mode === 'function') {
      try {
        const summary = calculateAll(f, a, b, n);
        if (summary) {
          setResults(summary.results);
          setReferenceValue(summary.reference);
          setIsReferenceExact(summary.isExact);
        }
      } catch (e) {
        console.error("Calculation error:", e);
      }
    } else {
      const summary = calculateAllFromPoints(pointsX, pointsY, n);
      if (summary) {
        setResults(summary.results);
        setReferenceValue(summary.reference);
        setIsReferenceExact(summary.isExact);
      }
      // If selected method is not in point results, fallback to trapeze
      if (results.length > 0 && !results.find(r => r.method === selectedMethod)) {
        setSelectedMethod('trapeze');
      }
    }
  }, [f, a, b, n, mode, pointsX, pointsY, selectedMethod]);

  const selectedPointMethod = useMemo(() => {
    const mapping: Record<IntegrationMethod, PointIntegrationMethod> = {
      'rectangle_gauche': 'rectangle_gauche_points',
      'rectangle_droite': 'rectangle_droite_points',
      'point_milieu': 'point_milieu_points',
      'trapeze': 'trapeze_points',
      'simpson': 'simpson_points',
      'romberg': 'romberg_points',
      'rk4': 'rk4_points',
      'lin_log': 'lin_log_points'
    };
    return mapping[selectedMethod];
  }, [selectedMethod]);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-accent/50">
      {/* Header */}
      <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex flex-col">
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <div className="relative flex items-center justify-center w-9 h-9 bg-gradient-to-br from-blue-700 to-blue-500 rounded-lg shadow-md overflow-hidden">
              <span className="text-white text-2xl font-serif leading-none mb-1">∫</span>
              <div className="absolute bottom-1.5 right-1.5 flex gap-0.5 items-end">
                <div className="w-1 h-1.5 bg-orange-500 rounded-t-[1px]"></div>
                <div className="w-1 h-2.5 bg-orange-400 rounded-t-[1px]"></div>
                <div className="w-1 h-4 bg-blue-300 rounded-t-[1px]"></div>
              </div>
            </div>
            <span className="flex items-baseline">
              <span className="text-foreground">Integ</span>
              <span className="text-orange-500">rix</span>
            </span>
          </h1>
          <span className="text-[8px] font-bold tracking-[0.2em] text-blue-600 uppercase -mt-1 ml-10">
            La précision dans chaque intégrale
          </span>
        </div>
        <nav className="flex gap-1 h-10 bg-muted p-1 rounded-lg">
          <button 
            onClick={() => setMode('function')}
            className={`px-4 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${mode === 'function' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <FunctionSquare className="w-4 h-4" />
            Mode Fonction
          </button>
          <button 
            onClick={() => setMode('points')}
            className={`px-4 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${mode === 'points' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <List className="w-4 h-4" />
            Mode Points
          </button>
        </nav>
        <div className="w-[100px]"></div>
      </header>

      <main className="grid grid-cols-[280px_1fr] h-[calc(100vh-64px)] bg-border gap-[1px] overflow-hidden">
        {/* Sidebar */}
        <aside className="bg-card p-6 flex flex-col gap-6 overflow-y-auto">
          <section className="space-y-4">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Paramètres</h3>
            
            <AnimatePresence mode="wait">
              {mode === 'function' ? (
                <motion.div 
                  key="func-params"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-4"
                >
                  <div className="space-y-1.5">
                    <Label htmlFor="function" className="text-xs font-semibold">f(x)</Label>
                    <Input 
                      id="function" 
                      value={f} 
                      onChange={(e) => setF(e.target.value)}
                      className="font-mono text-sm h-10"
                      placeholder="ex: x^2 + sin(x)"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="a" className="text-xs font-semibold">Bornes [a]</Label>
                      <Input 
                        id="a" 
                        value={aStr} 
                        onChange={(e) => setAStr(e.target.value)}
                        className="h-10 font-mono text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="b" className="text-xs font-semibold">Bornes [b]</Label>
                      <Input 
                        id="b" 
                        value={bStr} 
                        onChange={(e) => setBStr(e.target.value)}
                        className="h-10 font-mono text-sm"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-3 pt-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="n" className="text-xs font-semibold">Subdivisions (n)</Label>
                      <Input 
                        id="n" 
                        type="number"
                        value={nStr} 
                        onChange={(e) => setNStr(e.target.value)}
                        className="h-10 font-mono text-sm"
                      />
                    </div>
                    <Slider 
                      value={[n]} 
                      onValueChange={(v) => v?.[0] !== undefined && setNStr(v[0].toString())} 
                      min={1} 
                      max={100} 
                      step={1}
                      className="py-2"
                    />
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="points-params"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-4"
                >
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Valeurs de X</Label>
                    <Input 
                      value={pointsXStr} 
                      onChange={(e) => setPointsXStr(e.target.value)}
                      className="font-mono text-xs h-10"
                      placeholder="0, 1, 2, 3, 4"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Valeurs de Y</Label>
                    <Input 
                      value={pointsYStr} 
                      onChange={(e) => setPointsYStr(e.target.value)}
                      className="font-mono text-xs h-10"
                      placeholder="0, 1, 4, 9, 16"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Subdivisions (n)</Label>
                    <Input 
                      type="number"
                      value={nStr} 
                      onChange={(e) => setNStr(e.target.value)}
                      className="h-10 font-mono text-sm"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          <section className="space-y-4">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Méthodes</h3>
            <div className="flex flex-col gap-2.5">
              {results.map(res => (
                <label key={res.method} className="flex items-center gap-2.5 text-xs font-medium cursor-pointer group">
                  <input 
                    type="radio" 
                    name="method"
                    checked={selectedMethod === res.method}
                    onChange={() => setSelectedMethod(res.method)}
                    className="w-3.5 h-3.5 text-primary border-border focus:ring-primary"
                  />
                  <span className={selectedMethod === res.method ? "text-foreground" : "text-muted-foreground group-hover:text-foreground transition-colors"}>
                    {methodLabels[res.method] || res.method}
                  </span>
                </label>
              ))}
            </div>
          </section>
        </aside>

        {/* Content Area */}
        <div className="grid grid-rows-[1fr_200px] gap-5 p-5 bg-background overflow-hidden">
          {/* Visualization Section */}
          <div className="bg-card border border-border rounded-xl flex flex-col shadow-sm overflow-hidden">
            <div className="h-14 border-b border-border flex items-center justify-between px-5 bg-card">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                {mode === 'function' ? (
                  <>Visualisation Géométrique : {methodLabels[selectedMethod]}</>
                ) : (
                  <>Visualisation des Points : {methodLabels[selectedMethod]}</>
                )}
              </h2>
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-end">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase">
                    {isReferenceExact ? "Valeur Exacte (Analytique)" : "Valeur Exacte (Numérique)"}
                  </span>
                  <span className="text-xs font-mono font-bold text-primary">
                    {referenceValue.toFixed(8)}
                  </span>
                </div>
                <div className="w-[1px] h-8 bg-border mx-1"></div>
                <span className="px-2.5 py-1 bg-accent text-accent-foreground rounded text-[11px] font-bold">
                  Approximation ≈ {results.find(r => r.method === selectedMethod)?.result?.toFixed(6) ?? '0.000000'}
                </span>
              </div>
            </div>
            
            <div className="flex-1 p-5 relative min-h-[350px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${mode}-${f}-${a}-${b}-${n}-${selectedMethod}-${pointsXStr}-${pointsYStr}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="h-full w-full"
                >
                  {mode === 'function' ? (
                    <IntegrationChart 
                      f={f} 
                      a={a} 
                      b={b} 
                      n={n} 
                      selectedMethod={selectedMethod} 
                    />
                  ) : (
                    <PointsChart 
                      pointsX={pointsX}
                      pointsY={pointsY}
                      n={n}
                      method={selectedPointMethod}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Comparison Section */}
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="h-10 border-b border-border flex items-center px-5 bg-slate-50/50">
              <h2 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Analyse Comparative</h2>
            </div>
            <div className="flex-1 overflow-auto">
              <ComparisonTable 
                results={results} 
                selectedMethod={selectedMethod} 
                onSelectMethod={setSelectedMethod} 
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
