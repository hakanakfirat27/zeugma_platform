// frontend/src/pages/client/ClientReportVisualizationPage.jsx

import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Download, TrendingUp, Globe, PieChart, Filter,
  BarChart3, Activity, Target, Calendar, Database, Gauge,
  Map
} from 'lucide-react';
import {
  BarChart, Bar, PieChart as RechartsPie, Pie, Cell, LineChart, Line,
  ScatterChart, Scatter, Treemap, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, FunnelChart, Funnel,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import ClientDashboardLayout from '../../components/layout/ClientDashboardLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  useClientReportData,
  useClientReportStats,
  useClientReportAccess
} from '../../hooks/useClientReports';

const COLORS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#6366F1'];
const HEAT_COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#EF4444'];

const ClientReportVisualizationPage = () => {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedChart, setSelectedChart] = useState('all');
  const [exportLoading, setExportLoading] = useState(false);

  const { data: reportAccess, isLoading: accessLoading } = useClientReportAccess(reportId);

  // ========================================
  // EXTRACT FILTERS FROM URL QUERY PARAMETERS
  // ========================================
  const filters = useMemo(() => {
    const filterObj = {};

    // Extract search query
    const search = searchParams.get('search');
    if (search) filterObj.search = search;

    // Extract countries (comma-separated)
    const countries = searchParams.get('countries');
    if (countries) filterObj.countries = countries.split(',').filter(Boolean);

    // Extract categories (comma-separated)
    const categories = searchParams.get('categories');
    if (categories) filterObj.categories = categories.split(',').filter(Boolean);

    // Extract filter_groups (JSON string)
    const filterGroups = searchParams.get('filter_groups');
    if (filterGroups) {
      try {
        filterObj.filter_groups = filterGroups;
      } catch (e) {
        console.error('Error parsing filter_groups:', e);
      }
    }

    // Extract any other material/field filters (e.g., pvc, pp, pe, etc.)
    for (const [key, value] of searchParams.entries()) {
      if (!['search', 'countries', 'categories', 'filter_groups'].includes(key)) {
        filterObj[key] = value;
      }
    }

    return filterObj;
  }, [searchParams]);

  // ========================================
  // FETCH DATA WITH FILTERS APPLIED
  // ========================================
  const { data: reportData } = useClientReportData(reportId, {
    page: 1,
    page_size: 10000,
    ...filters
  });

  const { data: stats, isLoading: statsLoading } = useClientReportStats(reportId, filters);

  const records = reportData?.results || [];

  // Verify access
  useEffect(() => {
    if (!accessLoading && !reportAccess) {
      alert('You do not have access to this report');
      navigate('/client/reports');
    }
  }, [reportAccess, accessLoading, navigate]);

  // CHART DATA PREPARATION
  const countryChartData = useMemo(() => {
    return (stats?.top_countries || []).slice(0, 10).map(item => ({
      name: item.name,
      value: item.count,
      percentage: stats?.total_count ? ((item.count / stats.total_count) * 100).toFixed(1) : 0
    }));
  }, [stats]);

  const categoryChartData = useMemo(() => {
    return (stats?.categories || []).map(item => ({
      name: item.category,
      value: item.count
    }));
  }, [stats]);

  // Material Data
  const materialData = useMemo(() => {
    if (!records || records.length === 0) return [];

    const materials = {
      'PVC': records.filter(r => r.pvc).length,
      'PP': records.filter(r => r.pp).length,
      'PE': records.filter(r => r.hdpe || r.ldpe || r.lldpe).length,
      'PET': records.filter(r => r.pet).length,
      'ABS': records.filter(r => r.abs).length,
      'PS': records.filter(r => r.ps).length,
    };

    return Object.entries(materials)
      .filter(([_, count]) => count > 0)
      .map(([name, value]) => ({
        name,
        value,
        percentage: ((value / records.length) * 100).toFixed(1)
      }))
      .sort((a, b) => b.value - a.value);
  }, [records]);

  // Funnel Data (Top Countries)
  const funnelData = useMemo(() => {
    return (stats?.top_countries || []).slice(0, 5).map((item, idx) => ({
      name: item.name,
      value: item.count,
      fill: COLORS[idx]
    }));
  }, [stats]);

  // Heat Map Data (Country Distribution by Region)
  const heatMapData = useMemo(() => {
    const regions = {
      'Asia': ['China', 'India', 'Japan', 'South Korea', 'Taiwan', 'Thailand', 'Vietnam', 'Indonesia', 'Malaysia', 'Singapore'],
      'Europe': ['Germany', 'United Kingdom', 'France', 'Italy', 'Spain', 'Netherlands', 'Poland', 'Belgium', 'Austria', 'Sweden'],
      'North America': ['United States', 'Canada', 'Mexico'],
      'South America': ['Brazil', 'Argentina', 'Chile', 'Colombia', 'Peru'],
      'Africa': ['South Africa', 'Egypt', 'Nigeria', 'Kenya', 'Morocco'],
      'Oceania': ['Australia', 'New Zealand']
    };

    const regionCounts = {};

    records.forEach(record => {
      const country = record.country;
      for (const [region, countries] of Object.entries(regions)) {
        if (countries.includes(country)) {
          regionCounts[region] = (regionCounts[region] || 0) + 1;
          break;
        }
      }
    });

    return Object.entries(regionCounts).map(([name, value]) => ({
      name,
      value,
      intensity: value
    })).sort((a, b) => b.value - a.value);
  }, [records]);

  // Gauge Data (Progress toward goals)
  const gaugeData = useMemo(() => {
    const total = stats?.total_count || 0;
    const target = 10000; // Example target
    const percentage = Math.min((total / target) * 100, 100);

    return [
      { name: 'Progress', value: percentage, fill: '#10B981' },
      { name: 'Remaining', value: 100 - percentage, fill: '#E5E7EB' }
    ];
  }, [stats]);

  // Treemap Data (Categories)
  const treemapData = useMemo(() => {
    return (stats?.categories || []).slice(0, 12).map((item, idx) => ({
      name: item.category,
      size: item.count,
      fill: COLORS[idx % COLORS.length]
    }));
  }, [stats]);

  // Timeline Data (Simulated growth data)
  const timelineData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map((month, idx) => ({
      month,
      companies: Math.floor((stats?.total_count || 0) * ((idx + 1) / 6))
    }));
  }, [stats]);

  // Scatter Plot Data (Random distribution for demo)
  const scatterData = useMemo(() => {
    return countryChartData.slice(0, 15).map((item, idx) => ({
      x: idx * 10 + Math.random() * 20,
      y: item.value,
      z: Math.random() * 100,
      name: item.name
    }));
  }, [countryChartData]);



  // Export all charts
  const handleExportCharts = () => {
    setExportLoading(true);
    setTimeout(() => {
      alert('Chart export functionality would be implemented here');
      setExportLoading(false);
    }, 1000);
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white px-4 py-3 rounded-xl shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-900">{payload[0].name}</p>
          <p className="text-sm text-gray-600">
            Count: <span className="font-medium text-gray-900">{payload[0].value}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  if (accessLoading || statsLoading) {
    return (
      <ClientDashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <LoadingSpinner />
        </div>
      </ClientDashboardLayout>
    );
  }

  return (
    <ClientDashboardLayout
      pageTitle={reportAccess?.report_title || 'Report View'}
      pageSubtitleBottom='Visualizations - Interactive charts and data insights'
    >
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="mb-6 gap-2">
            <button
              type="button"
              onClick={() => navigate(`/client/reports/${reportId}`)}
              className="text-white bg-purple-700 hover:bg-purple-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center"
            >
              <ArrowLeft className="w-4 h-4 me-2" />
              Back to Reports
            </button>
          </div>

          <button
            onClick={handleExportCharts}
            disabled={exportLoading}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:bg-purple-400"
          >
            <Download className="w-4 h-4" />
            {exportLoading ? 'Exporting...' : 'Export Charts'}
          </button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center gap-3 mb-2">
              <Database className="w-6 h-6" />
              <p className="text-sm font-medium opacity-90">Total Companies</p>
            </div>
            <p className="text-3xl font-bold">{stats?.total_count?.toLocaleString() || 0}</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center gap-3 mb-2">
              <Globe className="w-6 h-6" />
              <p className="text-sm font-medium opacity-90">Countries</p>
            </div>
            <p className="text-3xl font-bold">{stats?.top_countries?.length || 0}</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center gap-3 mb-2">
              <Target className="w-6 h-6" />
              <p className="text-sm font-medium opacity-90">Categories</p>
            </div>
            <p className="text-3xl font-bold">{stats?.categories?.length || 0}</p>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center gap-3 mb-2">
              <Activity className="w-6 h-6" />
              <p className="text-sm font-medium opacity-90">Active Filters</p>
            </div>
            <p className="text-3xl font-bold">
              {Object.keys(filters).length}
            </p>
          </div>
        </div>

        {/* Chart Type Filter */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center gap-4 flex-wrap">
            <Filter className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">View:</span>
            {['all', 'distribution', 'comparison', 'trends', 'advanced'].map(type => (
              <button
                key={type}
                onClick={() => setSelectedChart(type)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedChart === type
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Charts Grid */}
        <div className="space-y-6">
          {/* Distribution Charts */}
          {(selectedChart === 'all' || selectedChart === 'distribution') && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Bar Chart - Top Countries */}
                <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                  <div className="flex items-center gap-2 mb-4">
                    <Globe className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-bold text-gray-900">Top Countries</h3>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={countryChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" fill="#3B82F6" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Donut Chart - Categories */}
                <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                  <div className="flex items-center gap-2 mb-4">
                    <PieChart className="w-5 h-5 text-purple-600" />
                    <h3 className="text-lg font-bold text-gray-900">Category Distribution (Donut)</h3>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPie>
                      <Pie
                        data={categoryChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {categoryChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>

                {/* Treemap - Categories */}
                <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="w-5 h-5 text-green-600" />
                    <h3 className="text-lg font-bold text-gray-900">Treemap - Categories</h3>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <Treemap
                      data={treemapData}
                      dataKey="size"
                      stroke="#fff"
                      fill="#8884d8"
                    >
                      <Tooltip content={<CustomTooltip />} />
                    </Treemap>
                  </ResponsiveContainer>
                </div>

                {/* Heat Map - Regional Distribution */}
                <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                  <div className="flex items-center gap-2 mb-4">
                    <Map className="w-5 h-5 text-red-600" />
                    <h3 className="text-lg font-bold text-gray-900">Heat Map - Regions</h3>
                  </div>
                  <div className="space-y-3">
                    {heatMapData.map((region, idx) => (
                      <div key={region.name} className="flex items-center gap-3">
                        <div className="w-32 text-sm font-medium text-gray-700">{region.name}</div>
                        <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden relative">
                          <div
                            className="h-full transition-all"
                            style={{
                              width: `${(region.value / (stats?.total_count || 1)) * 100}%`,
                              background: `linear-gradient(to right, ${HEAT_COLORS[Math.min(idx, 3)]})`
                            }}
                          />
                          <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-gray-900">
                            {region.value}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Comparison Charts */}
          {(selectedChart === 'all' || selectedChart === 'comparison') && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Material Bar Chart */}
                <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                    <h3 className="text-lg font-bold text-gray-900">Material Distribution</h3>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={materialData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={60} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" fill="#8B5CF6" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}

          {/* Trend Charts */}
          {(selectedChart === 'all' || selectedChart === 'trends') && (
            <>

            </>
          )}

          {/* Advanced Insights */}
          {(selectedChart === 'all' || selectedChart === 'advanced') && (
            <>
              <div className="grid grid-cols-1 gap-6">
                {/* Geographic Overview List */}
                <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                  <div className="flex items-center gap-2 mb-4">
                    <Globe className="w-5 h-5 text-orange-600" />
                    <h3 className="text-lg font-bold text-gray-900">Geographic Overview</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {countryChartData.slice(0, 10).map((country, index) => (
                      <div key={country.name} className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-gray-900">{country.name}</span>
                            <span className="text-sm text-gray-600">{country.value}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                              style={{ width: `${country.percentage}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-gray-900">{country.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </ClientDashboardLayout>
  );
};

export default ClientReportVisualizationPage;