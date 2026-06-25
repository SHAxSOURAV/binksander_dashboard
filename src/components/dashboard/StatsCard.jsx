const StatsCard = ({ label, value, icon, accent = "#1B17E0", trend }) => {
  return (
    <div className="bg-white rounded-2xl p-5 card-shadow hover-lift">
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${accent}14`, color: accent }}
        >
          {icon}
        </div>
        {trend && (
          <span className="text-[11px] font-semibold text-green-500 bg-green-50 px-2 py-1 rounded-full">
            {trend}
          </span>
        )}
      </div>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-800 tracking-tight">{value}</p>
    </div>
  );
};

export default StatsCard;
