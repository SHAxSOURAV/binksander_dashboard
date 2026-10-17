import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

const COLORS = ["#333333", "#cccccc"];

const OrdersDonut = ({ data }) => {
  const chartData = [
    { name: "Completed Order", value: data.completed },
    { name: "Cancel Order", value: data.canceled },
  ];

  const denom = data.completed + data.canceled;
  const completedPct = denom > 0 ? Math.round((data.completed / denom) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl p-5 card-shadow h-full">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-sm font-semibold text-gray-700">Order Analytics</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Completed vs cancelled orders
          </p>
        </div>
      </div>

      <div className="relative h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              innerRadius={78}
              outerRadius={108}
              paddingAngle={2}
              cornerRadius={8}
              startAngle={90}
              endAngle={-270}
            >
              {chartData.map((entry, index) => (
                <Cell key={index} fill={COLORS[index]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-bold text-gray-800">
            {data.total.toLocaleString()}
          </span>
          <span className="text-xs text-gray-400">Total Orders</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <LegendCard
          color={COLORS[0]}
          label="Completed Order"
          value={data.completed.toLocaleString()}
          pct={`${completedPct}%`}
        />
        <LegendCard
          color={COLORS[1]}
          label="Cancel Order"
          value={data.canceled.toLocaleString()}
          pct={`${100 - completedPct}%`}
        />
      </div>
    </div>
  );
};

const LegendCard = ({ color, label, value, pct }) => (
  <div className="bg-[#f9fafc] rounded-xl px-4 py-3">
    <div className="flex items-center gap-2 mb-1">
      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-xs text-gray-500">{label}</span>
    </div>
    <div className="flex items-baseline gap-2">
      <span className="text-base font-bold text-gray-800">{value}</span>
      <span className="text-[11px] text-gray-400">{pct}</span>
    </div>
  </div>
);

export default OrdersDonut;
