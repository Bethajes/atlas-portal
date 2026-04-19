export default function StatCard({ label, value, icon: Icon, color, bg, loading }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <div className={`${bg} ${color} p-3 rounded-xl`}>
          {Icon ? <Icon className="w-6 h-6" /> : null}
        </div>
      </div>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</p>
      {loading ? (
        <div className="animate-pulse bg-gray-200 rounded h-8 w-16 mt-2" />
      ) : (
        <p className="text-3xl font-black text-gray-900 mt-1">{value}</p>
      )}
    </div>
  );
}
