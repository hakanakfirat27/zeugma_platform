// frontend/src/components/widgets/TopMaterialsWidget.jsx
import { Package } from 'lucide-react';

const TopMaterialsWidget = ({ stats }) => {
  const materials = stats?.top_materials || [];

  if (materials.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full">
        <div className="flex items-center gap-3 mb-4">
          <Package className="w-5 h-5 text-gray-400" />
          <h3 className="font-semibold text-gray-900">Top Materials</h3>
        </div>
        <div className="flex items-center justify-center h-32">
          <p className="text-gray-500 text-sm">No material data available</p>
        </div>
      </div>
    );
  }

  const maxCount = materials[0]?.count || 1;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full">
      <div className="flex items-center gap-3 mb-4">
        <Package className="w-5 h-5 text-orange-600" />
        <h3 className="font-semibold text-gray-900">Top Materials</h3>
      </div>

      <div className="space-y-3">
        {materials.slice(0, 6).map((item, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className="w-16 text-sm font-medium text-gray-700">
              {item.material}
            </div>
            <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${(item.count / maxCount) * 100}%` }}
              />
            </div>
            <div className="w-12 text-right text-sm text-gray-600">
              {item.count.toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TopMaterialsWidget;
