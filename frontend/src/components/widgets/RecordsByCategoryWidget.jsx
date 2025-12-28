// frontend/src/components/widgets/RecordsByCategoryWidget.jsx
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { PieChart as PieChartIcon } from 'lucide-react';

const RecordsByCategoryWidget = ({ stats }) => {
  const data = stats?.records_by_category || [];

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full">
        <div className="flex items-center gap-3 mb-4">
          <PieChartIcon className="w-5 h-5 text-gray-400" />
          <h3 className="font-semibold text-gray-900">Sites by Category</h3>
        </div>
        <div className="flex items-center justify-center h-48">
          <p className="text-gray-500 text-sm">No category data available</p>
        </div>
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + item.count, 0);

  // Custom colors for categories
  const categoryColors = {
    'INJECTION': '#8B5CF6',
    'BLOW': '#3B82F6',
    'ROTO': '#10B981',
    'PE_FILM': '#F59E0B',
    'SHEET': '#EF4444',
    'PIPE': '#EC4899',
    'TUBE_HOSE': '#06B6D4',
    'PROFILE': '#84CC16',
    'CABLE': '#F97316',
    'COMPOUNDER': '#6366F1',
    'RECYCLER': '#14B8A6',
  };

  const chartData = data.map(item => ({
    ...item,
    color: item.color || categoryColors[item.category] || '#6B7280',
    name: item.category_display || item.category,
  }));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <PieChartIcon className="w-5 h-5 text-violet-600" />
          <h3 className="font-semibold text-gray-900">Sites by Category</h3>
        </div>
        <span className="text-sm text-gray-500">{total.toLocaleString()} sites</span>
      </div>

      <div className="flex gap-4">
        <div className="w-48 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={70}
                paddingAngle={2}
                dataKey="count"
                nameKey="name"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [value.toLocaleString(), name]}
                contentStyle={{
                  borderRadius: '8px',
                  border: 'none',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto max-h-48">
          {chartData.slice(0, 8).map((item, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-gray-700 truncate">{item.name}</span>
              </div>
              <span className="text-gray-600 font-medium">
                {item.count.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RecordsByCategoryWidget;
