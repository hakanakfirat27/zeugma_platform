// frontend/src/components/widgets/ActivityHeatmapWidget.jsx
import { useState, useEffect } from 'react';
import { Activity, Clock } from 'lucide-react';
import api from '../../utils/api';

const ActivityHeatmapWidget = ({ stats }) => {
  const [activityData, setActivityData] = useState({});
  const [loading, setLoading] = useState(true);

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  useEffect(() => {
    fetchActivityData();
  }, []);

  const fetchActivityData = async () => {
    try {
      // Try to fetch activity data from API
      const response = await api.get('/api/dashboard/comprehensive/');
      
      // Build activity map from recent logins
      const logins = response.data?.recent_logins || [];
      const activityMap = {};
      
      logins.forEach(login => {
        if (login.timestamp) {
          const date = new Date(login.timestamp);
          const dayIndex = (date.getDay() + 6) % 7; // Convert to Mon=0
          const hour = date.getHours();
          const key = `${days[dayIndex]}-${hour}`;
          activityMap[key] = (activityMap[key] || 0) + 1;
        }
      });
      
      setActivityData(activityMap);
    } catch (error) {
      console.error('Error fetching activity data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityLevel = (day, hour) => {
    const key = `${day}-${hour}`;
    const count = activityData[key] || 0;
    
    if (count >= 5) return 'bg-green-600';
    if (count >= 3) return 'bg-green-400';
    if (count >= 2) return 'bg-green-200';
    if (count >= 1) return 'bg-green-100';
    return 'bg-gray-100';
  };

  const hasData = Object.keys(activityData).length > 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Activity Heatmap</h3>
          <p className="text-sm text-gray-500">Login activity by day and hour</p>
        </div>
        <Activity className="w-6 h-6 text-indigo-600" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-pulse text-gray-400">Loading...</div>
        </div>
      ) : !hasData ? (
        <div className="flex flex-col items-center justify-center h-40 text-center">
          <Clock className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-gray-500 text-sm">No activity data yet</p>
          <p className="text-gray-400 text-xs">Activity will appear here as users log in</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <div className="inline-flex flex-col gap-1 min-w-full">
              {/* Hour labels */}
              <div className="flex gap-1 pl-10">
                {hours.filter((_, i) => i % 6 === 0).map(hour => (
                  <div key={hour} className="w-6 text-xs text-gray-500 text-center" style={{ marginLeft: hour === 0 ? 0 : '15px' }}>
                    {hour}:00
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
                      className={`w-3 h-3 rounded ${getActivityLevel(day, hour)} transition-colors`}
                      title={`${day} ${hour}:00 - ${activityData[`${day}-${hour}`] || 0} activities`}
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
        </>
      )}
    </div>
  );
};

export default ActivityHeatmapWidget;
