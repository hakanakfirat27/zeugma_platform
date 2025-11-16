import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const MonthlyTrendWidget = ({ stats }) => {
  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Records Added (6 Month Trend)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={stats?.monthly_trend || []}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" fontSize={12} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="records" stroke="#8b5cf6" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MonthlyTrendWidget;