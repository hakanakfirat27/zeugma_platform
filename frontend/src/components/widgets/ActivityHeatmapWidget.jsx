import { Activity } from 'lucide-react';

const ActivityHeatmapWidget = ({ stats }) => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Generate mock heatmap data - replace with real data
  const getActivityLevel = (day, hour) => {
    const value = Math.random() * 100;
    if (value > 80) return 'bg-green-600';
    if (value > 60) return 'bg-green-400';
    if (value > 40) return 'bg-green-200';
    if (value > 20) return 'bg-green-100';
    return 'bg-gray-100';
  };

  return (
    <div className="card h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">User Activity Heatmap</h3>
          <p className="text-sm text-gray-500">Activity by day and hour</p>
        </div>
        <Activity className="w-6 h-6 text-indigo-600" />
      </div>

      <div className="overflow-x-auto">
        <div className="inline-flex flex-col gap-1 min-w-full">
          {/* Hour labels */}
          <div className="flex gap-1 pl-10">
            {hours.filter((_, i) => i % 6 === 0).map(hour => (
              <div key={hour} className="w-6 text-xs text-gray-500 text-center">
                {hour}
              </div>
            ))}
          </div>

          {/* Heatmap grid */}
          {days.map(day => (
            <div key={day} className="flex gap-1 items-center">
              <span className="w-8 text-xs text-gray-600 font-medium">{day}</span>
              {hours.map(hour => (
                <div
                  key={`${day}-${hour}`}
                  className={`w-3 h-3 rounded ${getActivityLevel(day, hour)}`}
                  title={`${day} ${hour}:00`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
        <span>Less</span>
        <div className="flex gap-1">
          <div className="w-3 h-3 bg-gray-100 rounded"></div>
          <div className="w-3 h-3 bg-green-100 rounded"></div>
          <div className="w-3 h-3 bg-green-200 rounded"></div>
          <div className="w-3 h-3 bg-green-400 rounded"></div>
          <div className="w-3 h-3 bg-green-600 rounded"></div>
        </div>
        <span>More</span>
      </div>
    </div>
  );
};

export default ActivityHeatmapWidget;