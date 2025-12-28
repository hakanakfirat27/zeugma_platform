// frontend/src/components/widgets/UsersByRoleWidget.jsx
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { PieChart as PieChartIcon } from 'lucide-react';

const UsersByRoleWidget = ({ stats }) => {
  const data = stats?.users_by_role || [
    { role: 'Clients', count: stats?.total_clients || 0, color: '#3B82F6' },
    { role: 'Staff', count: stats?.staff_members || 0, color: '#8B5CF6' },
    { role: 'Data Collectors', count: stats?.data_collectors || 0, color: '#10B981' },
    { role: 'Guests', count: stats?.guest_users || 0, color: '#F59E0B' },
  ].filter(item => item.count > 0);

  const total = data.reduce((sum, item) => sum + item.count, 0);

  if (total === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full">
        <div className="flex items-center gap-3 mb-4">
          <PieChartIcon className="w-5 h-5 text-gray-400" />
          <h3 className="font-semibold text-gray-900">Users by Role</h3>
        </div>
        <div className="flex items-center justify-center h-48">
          <p className="text-gray-500">No users yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full">
      <div className="flex items-center gap-3 mb-4">
        <PieChartIcon className="w-5 h-5 text-violet-600" />
        <h3 className="font-semibold text-gray-900">Users by Role</h3>
      </div>
      
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={70}
              paddingAngle={2}
              dataKey="count"
              nameKey="role"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value, name) => [value, name]}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap gap-3 mt-2 justify-center">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-xs text-gray-600">{item.role}: {item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UsersByRoleWidget;
