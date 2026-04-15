import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { IntegrationResult, IntegrationMethod } from '@/src/lib/numericalMethods';
import { Badge } from "@/components/ui/badge";

interface ComparisonTableProps {
  results: IntegrationResult[];
  selectedMethod: IntegrationMethod;
  onSelectMethod: (method: IntegrationMethod) => void;
}

const methodLabels: Record<IntegrationMethod, string> = {
  rectangle_gauche: "Rectangle Gauche",
  rectangle_droite: "Rectangle Droite",
  point_milieu: "Point Milieu",
  trapeze: "Trapèze",
  simpson: "Simpson (1/3)",
  romberg: "Romberg",
  rk4: "Runge-Kutta 4",
};

export const ComparisonTable: React.FC<ComparisonTableProps> = ({ results, selectedMethod, onSelectMethod }) => {
  return (
    <div className="w-full">
      <Table className="text-[13px]">
        <TableHeader>
          <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-b border-border">
            <TableHead className="h-10 px-4 font-semibold text-muted-foreground">Méthode</TableHead>
            <TableHead className="h-10 px-4 text-right font-semibold text-muted-foreground">Valeur Approchée</TableHead>
            <TableHead className="h-10 px-4 text-right font-semibold text-muted-foreground">Erreur Absolue</TableHead>
            <TableHead className="h-10 px-4 text-right font-semibold text-muted-foreground">Temps (ns)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map((res) => (
            <TableRow 
              key={res.method} 
              className={`cursor-pointer border-b border-border transition-colors ${selectedMethod === res.method ? 'bg-blue-50/50' : 'hover:bg-slate-50/30'}`}
              onClick={() => onSelectMethod(res.method)}
            >
              <TableCell className="py-2.5 px-4 font-medium text-foreground">
                {methodLabels[res.method]}
              </TableCell>
              <TableCell className="py-2.5 px-4 text-right font-mono text-foreground">{res.result.toFixed(6)}</TableCell>
              <TableCell className="py-2.5 px-4 text-right font-mono text-muted-foreground">
                {res.error?.toExponential(4)}
              </TableCell>
              <TableCell className="py-2.5 px-4 text-right font-mono text-muted-foreground">
                {(res.executionTime * 1000000).toFixed(0)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
