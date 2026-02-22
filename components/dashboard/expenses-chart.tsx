"use client";

import { BarChart, Bar, PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Legend } from "recharts";
import { formatCurrency } from "@/lib/format";

const colors = ["#10b981", "#22c55e", "#f59e0b", "#ef4444", "#0ea5e9", "#14b8a6", "#8b5cf6"];

type ChartValue = {
  category: string;
  amount: number;
};

type TrendValue = {
  month: string;
  income: number;
  expense: number;
};

type ExpensesChartProps = {
  byCategory: ChartValue[];
  trend: TrendValue[];
};

export function ExpensesChart({ byCategory, trend }: ExpensesChartProps) {
  const pieData = byCategory.map((item, index) => ({
    ...item,
    fill: colors[index % colors.length]
  }));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-ink-100 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-ink-700">Egresos por categoría</h3>
        <div className="h-72">
          <ResponsiveContainer height="100%" width="100%">
            <PieChart>
              <Pie data={pieData} dataKey="amount" nameKey="category" outerRadius={110}>
                {pieData.map((entry) => (
                  <Cell fill={entry.fill} key={entry.category} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatCurrency(Number(value))} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-ink-100 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-ink-700">Tendencia mensual</h3>
        <div className="h-72">
          <ResponsiveContainer height="100%" width="100%">
            <LineChart data={trend}>
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value: number) => formatCurrency(Number(value))} />
              <Legend />
              <Line dataKey="income" name="Ingresos" stroke="#10b981" strokeWidth={2} />
              <Line dataKey="expense" name="Egresos" stroke="#ef4444" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-ink-100 bg-white p-4 lg:col-span-2">
        <h3 className="mb-3 text-sm font-semibold text-ink-700">Top categorías (USD)</h3>
        <div className="h-72">
          <ResponsiveContainer height="100%" width="100%">
            <BarChart data={byCategory}>
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip formatter={(value: number) => formatCurrency(Number(value))} />
              <Bar dataKey="amount" fill="#047857" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

