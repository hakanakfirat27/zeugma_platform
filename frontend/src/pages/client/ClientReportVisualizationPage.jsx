// frontend/src/pages/client/ClientReportVisualizationPage.jsx

import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Download, TrendingUp, Globe, PieChart, Filter,
  BarChart3, Activity, Target, Calendar, Database, Gauge,
  Map as MapIcon, FileText
} from 'lucide-react';
import {
  BarChart, Bar, PieChart as RechartsPie, Pie, Cell, LineChart, Line,
  ScatterChart, Scatter, Treemap, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, FunnelChart, Funnel,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import ClientDashboardLayout from '../../components/layout/ClientDashboardLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import ReportFeedbackModal from '../../components/client/ReportFeedbackModal';
import {
  useClientReportData,
  useClientReportStats,
  useClientReportAccess,
  useClientMaterialStats
} from '../../hooks/useClientReports';

// Country coordinates (centroids) for mapping
const COUNTRY_COORDINATES = {
  'Afghanistan': [33.93911, 67.709953],
  'Albania': [41.153332, 20.168331],
  'Algeria': [28.033886, 1.659626],
  'Argentina': [-38.416097, -63.616672],
  'Australia': [-25.274398, 133.775136],
  'Austria': [47.516231, 14.550072],
  'Bangladesh': [23.684994, 90.356331],
  'Belgium': [50.503887, 4.469936],
  'Brazil': [-14.235004, -51.92528],
  'Bulgaria': [42.733883, 25.48583],
  'Canada': [56.130366, -106.346771],
  'Chile': [-35.675147, -71.542969],
  'China': [35.86166, 104.195397],
  'Colombia': [4.570868, -74.297333],
  'Croatia': [45.1, 15.2],
  'Czech Republic': [49.817492, 15.472962],
  'Czechia': [49.817492, 15.472962],
  'Denmark': [56.26392, 9.501785],
  'Egypt': [26.820553, 30.802498],
  'Estonia': [58.595272, 25.013607],
  'Finland': [61.92411, 25.748151],
  'France': [46.227638, 2.213749],
  'Germany': [51.165691, 10.451526],
  'Greece': [39.074208, 21.824312],
  'Hong Kong': [22.396428, 114.109497],
  'Hungary': [47.162494, 19.503304],
  'India': [20.593684, 78.96288],
  'Indonesia': [-0.789275, 113.921327],
  'Ireland': [53.41291, -8.24389],
  'Israel': [31.046051, 34.851612],
  'Italy': [41.87194, 12.56738],
  'Japan': [36.204824, 138.252924],
  'Kenya': [-0.023559, 37.906193],
  'Latvia': [56.879635, 24.603189],
  'Lithuania': [55.169438, 23.881275],
  'Luxembourg': [49.815273, 6.129583],
  'Malaysia': [4.210484, 101.975766],
  'Mexico': [23.634501, -102.552784],
  'Morocco': [31.791702, -7.09262],
  'Netherlands': [52.132633, 5.291266],
  'New Zealand': [-40.900557, 174.885971],
  'Nigeria': [9.081999, 8.675277],
  'Norway': [60.472024, 8.468946],
  'Pakistan': [30.375321, 69.345116],
  'Peru': [-9.189967, -75.015152],
  'Philippines': [12.879721, 121.774017],
  'Poland': [51.919438, 19.145136],
  'Portugal': [39.399872, -8.224454],
  'Romania': [45.943161, 24.96676],
  'Russia': [61.52401, 105.318756],
  'Saudi Arabia': [23.885942, 45.079162],
  'Serbia': [44.016521, 21.005859],
  'Singapore': [1.352083, 103.819836],
  'Slovakia': [48.669026, 19.699024],
  'Slovenia': [46.151241, 14.995463],
  'South Africa': [-30.559482, 22.937506],
  'South Korea': [35.907757, 127.766922],
  'Spain': [40.463667, -3.74922],
  'Sweden': [60.128161, 18.643501],
  'Switzerland': [46.818188, 8.227512],
  'Taiwan': [23.69781, 120.960515],
  'Thailand': [15.870032, 100.992541],
  'Turkey': [38.963745, 35.243322],
  'Ukraine': [48.379433, 31.16558],
  'United Arab Emirates': [23.424076, 53.847818],
  'United Kingdom': [55.378051, -3.435973],
  'United States': [37.09024, -95.712891],
  'USA': [37.09024, -95.712891],
  'Vietnam': [14.058324, 108.277199],
};


const COLORS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#6366F1'];
const HEAT_COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#EF4444'];

// ========================================
// RULE-BASED SUMMARY GENERATOR (NO AI - 100% LOCAL)
// ========================================
const generateDataSummary = (stats, materialStats, heatMapData, reportTitle) => {
  const insights = [];
  const totalCount = stats?.total_count || 0;
  const countriesCount = stats?.countries_count || 0;
  const topCountries = stats?.top_countries || [];
  const categories = stats?.categories || [];
  const materials = materialStats?.materials || [];

  if (totalCount === 0) {
    return [{ type: 'info', icon: '📊', text: 'No data available for the current filter selection.' }];
  }

  // 1. Overview insight
  insights.push({
    type: 'overview',
    icon: '📊',
    title: 'Dataset Overview',
    text: `This dataset contains ${totalCount.toLocaleString()} companies across ${countriesCount} countries and ${categories.length} production categories.`
  });

  // 2. Geographic concentration analysis
  if (topCountries.length > 0) {
    const topCountry = topCountries[0];
    const topCountryPercentage = ((topCountry.count / totalCount) * 100).toFixed(1);
    const top3Countries = topCountries.slice(0, 3);
    const top3Total = top3Countries.reduce((sum, c) => sum + c.count, 0);
    const top3Percentage = ((top3Total / totalCount) * 100).toFixed(1);

    if (parseFloat(topCountryPercentage) > 25) {
      insights.push({
        type: 'geographic',
        icon: '🌍',
        title: 'Geographic Concentration',
        text: `${topCountry.country} dominates the market with ${topCountryPercentage}% of all companies (${topCountry.count.toLocaleString()} companies). The top 3 countries (${top3Countries.map(c => c.country).join(', ')}) account for ${top3Percentage}% of the total.`,
        highlight: 'high-concentration'
      });
    } else if (parseFloat(top3Percentage) < 40) {
      insights.push({
        type: 'geographic',
        icon: '🌍',
        title: 'Geographic Distribution',
        text: `The market is well-distributed geographically. The top 3 countries (${top3Countries.map(c => c.country).join(', ')}) account for only ${top3Percentage}% of companies, indicating a diverse global presence.`,
        highlight: 'balanced'
      });
    } else {
      insights.push({
        type: 'geographic',
        icon: '🌍',
        title: 'Geographic Distribution',
        text: `${topCountry.country} leads with ${topCountryPercentage}% market share (${topCountry.count.toLocaleString()} companies), followed by ${topCountries[1]?.country || 'N/A'} and ${topCountries[2]?.country || 'N/A'}.`
      });
    }
  }

  // 3. Regional analysis
  if (heatMapData && heatMapData.length > 0) {
    const topRegion = heatMapData[0];
    const topRegionPercentage = ((topRegion.value / totalCount) * 100).toFixed(1);
    const regionsWithData = heatMapData.filter(r => r.value > 0);

    if (regionsWithData.length === 1) {
      insights.push({
        type: 'regional',
        icon: '🗺️',
        title: 'Regional Focus',
        text: `All companies in this dataset are located in ${topRegion.name}.`,
        highlight: 'single-region'
      });
    } else {
      insights.push({
        type: 'regional',
        icon: '🗺️',
        title: 'Regional Breakdown',
        text: `${topRegion.name} is the dominant region with ${topRegionPercentage}% of companies (${topRegion.value.toLocaleString()}). The data spans ${regionsWithData.length} major regions worldwide.`
      });
    }
  }

  // 4. Category analysis
  if (categories.length > 0) {
    const topCategory = categories[0];
    const topCategoryPercentage = ((topCategory.count / totalCount) * 100).toFixed(1);

    // Format category name for display
    const formatCategory = (cat) => {
      const categoryNames = {
        'INJECTION': 'Injection Molding',
        'BLOW': 'Blow Molding',
        'PE_FILM': 'PE Film',
        'ROTO': 'Rotomolding',
        'SHEET': 'Sheet Extrusion',
        'PIPE': 'Pipe Extrusion',
        'PROFILE': 'Profile Extrusion',
        'CABLE': 'Cable Extrusion',
        'TUBE_HOSE': 'Tube & Hose',
        'COMPOUNDER': 'Compounding'
      };
      return categoryNames[cat] || cat;
    };

    if (categories.length === 1) {
      insights.push({
        type: 'category',
        icon: '🏭',
        title: 'Production Focus',
        text: `This report focuses exclusively on ${formatCategory(topCategory.category)} manufacturers.`
      });
    } else {
      const categoryList = categories.slice(0, 3).map(c => formatCategory(c.category)).join(', ');
      insights.push({
        type: 'category',
        icon: '🏭',
        title: 'Production Categories',
        text: `${formatCategory(topCategory.category)} is the leading category with ${topCategoryPercentage}% of companies. The report covers ${categories.length} categories including ${categoryList}.`
      });
    }
  }

  // 5. Material analysis
  if (materials.length > 0) {
    const topMaterial = materials[0];
    const topMaterialPercentage = ((topMaterial.count / totalCount) * 100).toFixed(1);
    const top3Materials = materials.slice(0, 3);

    // Categorize materials
    const polyolefins = materials.filter(m => ['LDPE', 'LLDPE', 'HDPE', 'PP', 'MDPE'].includes(m.label));
    const engineering = materials.filter(m => ['PA', 'PC', 'POM', 'PBT', 'PEEK', 'PPO', 'PSU'].includes(m.label));
    const styrenics = materials.filter(m => ['PS', 'ABS', 'SAN'].includes(m.label));

    insights.push({
      type: 'material',
      icon: '🧪',
      title: 'Material Trends',
      text: `${topMaterial.label} is the most common material, used by ${topMaterialPercentage}% of companies (${topMaterial.count.toLocaleString()}). Top 3 materials are ${top3Materials.map(m => m.label).join(', ')}.`
    });

    // Material category insight
    if (polyolefins.length > 0) {
      const polyolefinTotal = polyolefins.reduce((sum, m) => sum + m.count, 0);
      const polyolefinPercentage = ((polyolefinTotal / totalCount) * 100).toFixed(1);
      if (parseFloat(polyolefinPercentage) > 50) {
        insights.push({
          type: 'material-detail',
          icon: '📈',
          title: 'Polyolefin Dominance',
          text: `Polyolefins (PE, PP variants) dominate the material landscape, with ${polyolefinPercentage}% of companies working with these commodity plastics.`
        });
      }
    }

    if (engineering.length > 0 && engineering.some(m => m.count > totalCount * 0.1)) {
      insights.push({
        type: 'material-detail',
        icon: '⚙️',
        title: 'Engineering Plastics',
        text: `Significant presence of engineering plastics (${engineering.filter(m => m.count > 0).map(m => m.label).join(', ')}), indicating high-performance applications in this market segment.`
      });
    }
  }

  // 6. Market size insight
  if (totalCount > 1000) {
    insights.push({
      type: 'market',
      icon: '💼',
      title: 'Market Size',
      text: `With ${totalCount.toLocaleString()} companies, this represents a substantial market segment. Average of ${Math.round(totalCount / countriesCount)} companies per country.`
    });
  } else if (totalCount > 100) {
    insights.push({
      type: 'market',
      icon: '💼',
      title: 'Market Size',
      text: `This dataset includes ${totalCount.toLocaleString()} companies across ${countriesCount} countries, averaging ${Math.round(totalCount / countriesCount)} companies per country.`
    });
  }

  // 7. Diversity score
  const diversityScore = calculateDiversityScore(topCountries, totalCount, countriesCount, categories, materials);
  insights.push({
    type: 'diversity',
    icon: diversityScore.icon,
    title: 'Market Diversity Score',
    text: diversityScore.text,
    score: diversityScore.score
  });

  return insights;
};

// Calculate a diversity/concentration score
const calculateDiversityScore = (topCountries, totalCount, countriesCount, categories, materials) => {
  let score = 0;
  let factors = [];

  // Geographic diversity (0-30 points)
  if (countriesCount >= 20) {
    score += 30;
    factors.push('excellent geographic spread');
  } else if (countriesCount >= 10) {
    score += 20;
    factors.push('good geographic coverage');
  } else if (countriesCount >= 5) {
    score += 10;
    factors.push('moderate geographic presence');
  }

  // Concentration check (0-30 points)
  if (topCountries.length > 0) {
    const top1Percentage = (topCountries[0].count / totalCount) * 100;
    if (top1Percentage < 20) {
      score += 30;
      factors.push('well-distributed market');
    } else if (top1Percentage < 35) {
      score += 20;
      factors.push('balanced distribution');
    } else if (top1Percentage < 50) {
      score += 10;
    }
  }

  // Category diversity (0-20 points)
  if (categories.length >= 5) {
    score += 20;
    factors.push('diverse production types');
  } else if (categories.length >= 3) {
    score += 15;
  } else if (categories.length >= 2) {
    score += 10;
  }

  // Material diversity (0-20 points)
  if (materials.length >= 15) {
    score += 20;
    factors.push('wide material variety');
  } else if (materials.length >= 10) {
    score += 15;
  } else if (materials.length >= 5) {
    score += 10;
  }

  let icon, label;
  if (score >= 80) {
    icon = '🌟';
    label = 'Excellent';
  } else if (score >= 60) {
    icon = '✅';
    label = 'Good';
  } else if (score >= 40) {
    icon = '📊';
    label = 'Moderate';
  } else {
    icon = '📍';
    label = 'Focused';
  }

  const factorText = factors.length > 0 ? ` Key factors: ${factors.slice(0, 2).join(', ')}.` : '';

  return {
    score,
    icon,
    text: `${label} diversity (${score}/100).${factorText}`
  };
};

const ClientReportVisualizationPage = () => {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedChart, setSelectedChart] = useState('all');
  const [exportLoading, setExportLoading] = useState(false);
  const [exportProgress, setExportProgress] = useState('');

  // Refs for PDF export
  const headerRef = useRef(null);
  const statsRef = useRef(null);
  const summaryRef = useRef(null);
  const mapRef = useRef(null);
  const chartsRef = useRef(null);

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

    // Extract status (comma-separated) - IMPORTANT for filter sync from Focus View
    const status = searchParams.get('status');
    if (status) filterObj.status = status.split(',').filter(Boolean);

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
      if (!['search', 'countries', 'categories', 'status', 'filter_groups'].includes(key)) {
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

  // Material stats from backend with filters applied
  const { data: materialStats } = useClientMaterialStats(reportId, filters);

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
      name: item.country,  // Backend returns 'country', not 'name'
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

  // Material Data - from backend with filters applied (top 10 only)
  const materialData = useMemo(() => {
    if (!materialStats?.materials || materialStats.materials.length === 0) return [];

    return materialStats.materials
      .slice(0, 10)  // Limit to top 10 materials
      .map(item => ({
        name: item.label,
        value: item.count,
        percentage: stats?.total_count ? ((item.count / stats.total_count) * 100).toFixed(1) : 0
      }));
  }, [materialStats, stats]);

  // Funnel Data (Top Countries)
  const funnelData = useMemo(() => {
    return (stats?.top_countries || []).slice(0, 5).map((item, idx) => ({
      name: item.country,  // Backend returns 'country', not 'name'
      value: item.count,
      fill: COLORS[idx]
    }));
  }, [stats]);

  // Map Data - ALL countries with coordinates for interactive map
  const mapData = useMemo(() => {
    // Use all_countries_with_counts for map, fallback to top_countries
    const countriesData = stats?.all_countries_with_counts || stats?.top_countries || [];
    
    if (countriesData.length === 0) return [];
    
    const maxCount = Math.max(...countriesData.map(c => c.count), 1);
    
    return countriesData
      .filter(item => COUNTRY_COORDINATES[item.country])
      .map(item => {
        const coords = COUNTRY_COORDINATES[item.country];
        return {
          country: item.country,
          count: item.count,
          lat: coords[0],
          lng: coords[1],
          // Normalize radius between 8 and 35 based on count
          radius: 8 + (item.count / maxCount) * 27,
          percentage: stats?.total_count ? ((item.count / stats.total_count) * 100).toFixed(1) : 0
        };
      });
  }, [stats]);

  // Heat Map Data (Country Distribution by Region)
  const heatMapData = useMemo(() => {
    const countriesData = stats?.all_countries_with_counts || [];
    if (countriesData.length === 0) return [];

    const regions = {
      'Asia': ['China', 'India', 'Japan', 'South Korea', 'Taiwan', 'Thailand', 'Vietnam', 'Indonesia', 'Malaysia', 'Singapore'],
      'Europe': ['Germany', 'United Kingdom', 'France', 'Italy', 'Spain', 'Netherlands', 'Poland', 'Belgium', 'Austria', 'Sweden', 'Czech Republic', 'Czechia', 'Denmark', 'Switzerland', 'Norway', 'Finland', 'Ireland', 'Portugal', 'Greece', 'Hungary', 'Romania', 'Bulgaria', 'Croatia', 'Slovakia', 'Slovenia', 'Estonia', 'Latvia', 'Lithuania', 'Luxembourg', 'Serbia'],
      'North America': ['United States', 'USA', 'Canada', 'Mexico'],
      'South America': ['Brazil', 'Argentina', 'Chile', 'Colombia', 'Peru'],
      'Africa': ['South Africa', 'Egypt', 'Nigeria', 'Kenya', 'Morocco'],
      'Oceania': ['Australia', 'New Zealand'],
      'Middle East': ['Turkey', 'Israel', 'Saudi Arabia', 'United Arab Emirates']
    };

    const regionCounts = {};

    countriesData.forEach(item => {
      const country = item.country;
      const count = item.count;
      for (const [region, countries] of Object.entries(regions)) {
        if (countries.includes(country)) {
          regionCounts[region] = (regionCounts[region] || 0) + count;
          break;
        }
      }
    });

    return Object.entries(regionCounts).map(([name, value]) => ({
      name,
      value,
      intensity: value
    })).sort((a, b) => b.value - a.value);
  }, [stats]);

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

  // Generate data summary insights (rule-based, no AI)
  const summaryInsights = useMemo(() => {
    return generateDataSummary(stats, materialStats, heatMapData, reportAccess?.report_title);
  }, [stats, materialStats, heatMapData, reportAccess?.report_title]);



  // Export all charts to PDF
  const handleExportCharts = async () => {
    setExportLoading(true);
    setExportProgress('Loading libraries...');
    
    try {
      // Dynamically import libraries
      const [html2canvasModule, jsPDFModule] = await Promise.all([
        import('html2canvas'),
        import('jspdf')
      ]);
      const html2canvas = html2canvasModule.default;
      const { jsPDF } = jsPDFModule;

      // Create PDF (A4 size)
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);
      let yPosition = margin;

      // Helper function to add image to PDF
      const addImageToPDF = async (element, title = null) => {
        if (!element) return;

        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false
        });

        const imgData = canvas.toDataURL('image/png');
        const imgWidth = contentWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        // Check if we need a new page
        if (yPosition + imgHeight > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
        }

        // Add section title if provided
        if (title) {
          pdf.setFontSize(14);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(75, 85, 99);
          pdf.text(title, margin, yPosition);
          yPosition += 8;
        }

        pdf.addImage(imgData, 'PNG', margin, yPosition, imgWidth, imgHeight);
        yPosition += imgHeight + 10;
      };

      // 1. Add Title Page
      setExportProgress('Creating title page...');
      pdf.setFontSize(28);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(88, 28, 135); // Purple color
      const title = reportAccess?.report_title || 'Report';
      const titleLines = pdf.splitTextToSize(title, contentWidth);
      pdf.text(titleLines, pageWidth / 2, 50, { align: 'center' });

      // Add description
      if (reportAccess?.report_description) {
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(107, 114, 128);
        const descLines = pdf.splitTextToSize(reportAccess.report_description, contentWidth - 20);
        pdf.text(descLines, pageWidth / 2, 70, { align: 'center' });
      }

      // Add date and stats summary
      pdf.setFontSize(10);
      pdf.setTextColor(156, 163, 175);
      pdf.text(`Generated on: ${new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`, pageWidth / 2, 95, { align: 'center' });

      // Add quick stats
      pdf.setFontSize(11);
      pdf.setTextColor(75, 85, 99);
      const statsText = `Total Companies: ${stats?.total_count?.toLocaleString() || 0} | Countries: ${stats?.countries_count || 0} | Categories: ${stats?.categories?.length || 0} | Materials: ${materialStats?.materials?.length || 0}`;
      pdf.text(statsText, pageWidth / 2, 110, { align: 'center' });

      // Add a decorative line
      pdf.setDrawColor(139, 92, 246);
      pdf.setLineWidth(0.5);
      pdf.line(margin + 30, 120, pageWidth - margin - 30, 120);

      // 2. Stats Cards
      pdf.addPage();
      yPosition = margin;
      setExportProgress('Capturing statistics...');
      if (statsRef.current) {
        await addImageToPDF(statsRef.current, 'Key Statistics');
      }

      // 3. Data Summary
      setExportProgress('Capturing data summary...');
      if (summaryRef.current) {
        await addImageToPDF(summaryRef.current, 'Data Summary & Insights');
      }

      // 4. Map (if visible)
      setExportProgress('Capturing map...');
      if (mapRef.current && (selectedChart === 'all' || selectedChart === 'map')) {
        // For map, we need to wait a bit for tiles to load
        await new Promise(resolve => setTimeout(resolve, 500));
        await addImageToPDF(mapRef.current, 'Geographic Distribution Map');
      }

      // 5. Charts
      setExportProgress('Capturing charts...');
      if (chartsRef.current) {
        // Capture all chart containers
        const chartContainers = chartsRef.current.querySelectorAll('.chart-export-container');
        for (let i = 0; i < chartContainers.length; i++) {
          setExportProgress(`Capturing chart ${i + 1} of ${chartContainers.length}...`);
          await addImageToPDF(chartContainers[i]);
        }
      }

      // 6. Add footer to all pages
      const totalPages = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(156, 163, 175);
        pdf.text(
          `Page ${i} of ${totalPages} | ${title} | A Data`,
          pageWidth / 2,
          pageHeight - 8,
          { align: 'center' }
        );
      }

      // Save PDF
      setExportProgress('Generating PDF file...');
      const fileName = `${title.replace(/[^a-z0-9]/gi, '_')}_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      setExportProgress('');
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export charts. Please try again.');
    } finally {
      setExportLoading(false);
      setExportProgress('');
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      // payload[0].payload contains the actual data object with name, value, etc.
      const dataItem = payload[0].payload;
      // Try multiple ways to get the name
      const itemName = dataItem?.name || dataItem?.category || label || 'Unknown';
      const itemValue = payload[0].value;
      
      return (
        <div className="bg-white dark:bg-gray-800 px-4 py-3 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="font-semibold text-gray-900 dark:text-white">{itemName}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Count: <span className="font-medium text-gray-900 dark:text-white">{itemValue?.toLocaleString()}</span>
          </p>
          {dataItem?.percentage && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {dataItem.percentage}% of total
            </p>
          )}
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
            {exportLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span className="max-w-[200px] truncate">{exportProgress || 'Exporting...'}</span>
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                Export to PDF
              </>
            )}
          </button>
        </div>

        {/* Stats Overview */}
        <div ref={statsRef} className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <p className="text-3xl font-bold">{stats?.countries_count || 0}</p>
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
              <p className="text-sm font-medium opacity-90">Materials</p>
            </div>
            <p className="text-3xl font-bold">
              {materialStats?.materials?.length || 0}
            </p>
          </div>
        </div>

        {/* Data Summary - Rule-based insights (100% local, no AI) */}
        <div ref={summaryRef} className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-lg p-6 border border-slate-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Data Summary</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Automated insights based on current data</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {summaryInsights.map((insight, index) => (
              <div 
              key={`insight-${index}`}
              className={`p-4 rounded-xl border ${
              insight.type === 'diversity' 
              ? 'bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/30 dark:to-blue-900/30 border-purple-200 dark:border-purple-700' 
              : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600'
              } ${
              insight.highlight === 'high-concentration' ? 'ring-2 ring-amber-200 dark:ring-amber-700' : ''
              } ${
              insight.highlight === 'balanced' ? 'ring-2 ring-green-200 dark:ring-green-700' : ''
              }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{insight.icon}</span>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{insight.title}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{insight.text}</p>
                    {insight.score !== undefined && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-500"
                            style={{ width: `${insight.score}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">{insight.score}/100</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart Type Filter */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4 flex-wrap">
            <Filter className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">View:</span>
            {['all', 'map', 'distribution', 'comparison', 'advanced'].map(type => (
              <button
                key={type}
                onClick={() => setSelectedChart(type)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedChart === type
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {type === 'map' ? '🗺️ Map' : type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Charts Grid */}
        <div className="space-y-6">
          {/* Interactive Map */}
          {(selectedChart === 'all' || selectedChart === 'map') && (
            <div ref={mapRef} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-gray-700 chart-export-container">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <MapIcon className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Interactive Company Map</h3>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-300">
                  {mapData.length} countries mapped
                </div>
              </div>
              <div className="h-[500px] rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600 [&_.leaflet-container]:dark:brightness-90">
                <MapContainer
                  center={[30, 10]}
                  zoom={2}
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom={true}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {mapData.map((item, index) => (
                    <CircleMarker
                      key={`marker-${index}-${item.country}`}
                      center={[item.lat, item.lng]}
                      radius={item.radius}
                      pathOptions={{
                        fillColor: COLORS[index % COLORS.length],
                        fillOpacity: 0.7,
                        color: '#fff',
                        weight: 2
                      }}
                    >
                      <Popup>
                        <div className="text-center">
                          <p className="font-bold text-gray-900 text-lg">{item.country}</p>
                          <p className="text-2xl font-bold text-purple-600">{item.count.toLocaleString()}</p>
                          <p className="text-sm text-gray-500">companies</p>
                          <p className="text-sm font-medium text-gray-700 mt-1">{item.percentage}% of total</p>
                        </div>
                      </Popup>
                    </CircleMarker>
                  ))}
                </MapContainer>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Top 10 Countries</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">by company count</span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {mapData.slice(0, 10).map((item, index) => (
                    <div 
                      key={`legend-${index}-${item.country}`}
                      className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{item.country}</span>
                      <span className="text-sm text-gray-500 dark:text-gray-300">({item.count})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Distribution Charts */}
          {(selectedChart === 'all' || selectedChart === 'distribution') && (
            <div ref={chartsRef}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Bar Chart - Top Countries */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-gray-700 chart-export-container">
                  <div className="flex items-center gap-2 mb-4">
                    <Globe className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Top Countries</h3>
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
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-gray-700 chart-export-container">
                  <div className="flex items-center gap-2 mb-4">
                    <PieChart className="w-5 h-5 text-purple-600" />
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Category Distribution (Donut)</h3>
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
                          <Cell key={`cat-cell-${index}-${entry.name}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>

                {/* Treemap - Categories */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-gray-700 chart-export-container">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="w-5 h-5 text-green-600" />
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Treemap - Categories</h3>
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
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-gray-700 chart-export-container">
                  <div className="flex items-center gap-2 mb-4">
                    <MapIcon className="w-5 h-5 text-red-600" />
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Heat Map - Regions</h3>
                  </div>
                  <div className="space-y-3">
                    {heatMapData.map((region, idx) => (
                      <div key={`region-${idx}-${region.name}`} className="flex items-center gap-3">
                        <div className="w-32 text-sm font-medium text-gray-700 dark:text-gray-300">{region.name}</div>
                        <div className="flex-1 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden relative">
                          <div
                            className="h-full transition-all"
                            style={{
                              width: `${(region.value / (stats?.total_count || 1)) * 100}%`,
                              background: `linear-gradient(to right, ${HEAT_COLORS[Math.min(idx, 3)]})`
                            }}
                          />
                          <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-gray-900 dark:text-white">
                            {region.value}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Comparison Charts */}
          {(selectedChart === 'all' || selectedChart === 'comparison') && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Material Bar Chart */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-gray-700 chart-export-container">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Material Distribution (Top 10 Materials)</h3>
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


          {/* Advanced Insights */}
          {(selectedChart === 'all' || selectedChart === 'advanced') && (
            <>
              <div className="grid grid-cols-1 gap-6">
                {/* Geographic Overview List */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-gray-700 chart-export-container">
                  <div className="flex items-center gap-2 mb-4">
                    <Globe className="w-5 h-5 text-orange-600" />
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Geographic Overview</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {countryChartData.slice(0, 10).map((country, index) => (
                      <div key={`country-${index}-${country.name}`} className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-gray-900 dark:text-white">{country.name}</span>
                            <span className="text-sm text-gray-600 dark:text-gray-300">{country.value}</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                              style={{ width: `${country.percentage}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{country.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* FLOATING FEEDBACK BUTTON & MODAL */}
      <ReportFeedbackModal 
        reportId={reportId} 
        reportTitle={reportAccess?.report_title}
      />
    </ClientDashboardLayout>
  );
};

export default ClientReportVisualizationPage;