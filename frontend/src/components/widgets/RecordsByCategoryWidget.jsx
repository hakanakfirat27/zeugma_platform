import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const RecordsByCategoryWidget = ({ stats }) => {
  const data = stats?.records_by_category?.labels?.map((label, index) => ({
    name: label,
    value: stats?.records_by_category?.data[index]
  })) || [];

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Records by Category</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} fontSize={12} />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" fill="#3b82f6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RecordsByCategoryWidget;