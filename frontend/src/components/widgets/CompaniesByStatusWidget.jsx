// frontend/src/components/widgets/CompaniesByStatusWidget.jsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { PieChart as PieChartIcon } from 'lucide-react';

const CompaniesByStatusWidget = ({ stats }) => {
  const data = stats?.companies_by_status || [];

  // Filter out deleted and sort
  const filteredData = data
    .filter(item => item.status !== 'DELETED')
    .sort((a, b) => b.count - a.count);

  const total = filteredData.reduce((sum, item) => sum + item.count, 0);

  if (filteredData.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full">
        <div className="flex items-center gap-3 mb-4">
          <PieChartIcon className="w-5 h-5 text-gray-400" />
          <h3 className="font-semibold text-gray-900">Companies by Status</h3>
        </div>
        <div className="flex items-center justify-center h-40">
          <p className="text-gray-500">No data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <PieChartIcon className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Companies by Status</h3>
        </div>
        <span className="text-sm text-gray-500">{total.toLocaleString()} total</span>
      </div>

      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={filteredData} layout="vertical" margin={{ left: 20 }}>
            <XAxis type="number" hide />
            <YAxis 
              type="category" 
              dataKey="status_display" 
              width={100}
              tick={{ fontSize: 12 }}
            />
            <Tooltip 
              formatter={(value) => [value.toLocaleString(), 'Companies']}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {filteredData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap gap-4 mt-4 justify-center">
        {filteredData.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-sm text-gray-600">
              {item.status_display}: {item.count.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CompaniesByStatusWidget;
