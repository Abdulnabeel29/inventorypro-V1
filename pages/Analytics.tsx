
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    BarChart, Bar, PieChart, Pie, Cell, Legend, Line, ComposedChart
} from 'recharts';
import { Calendar, Filter, IndianRupee, TrendingUp, Percent, Download, CreditCard, ShoppingBag, Wallet, RotateCcw, Activity, Sparkles, FileText, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { generateFinancialReport, FinancialReportData } from '../services/geminiService';
import { jsPDF } from 'jspdf';
import { blobToBase64, saveReport } from '../services/reportStore';

const COLORS = ['#0ea5e9', '#22c55e', '#eab308', '#f97316', '#ef4444', '#8b5cf6'];

const Analytics: React.FC = () => {
    const { orders, products, returns, addNotification } = useData();
    const [searchParams] = useSearchParams();
    const [dateRange, setDateRange] = useState<'3months' | '6months' | '1year'>('6months');
    const [categoryFilter, setCategoryFilter] = useState<string>('All');
    const [productFilter, setProductFilter] = useState<string>(searchParams.get('product') || 'All');

    // AI Report State
    const [reportLoading, setReportLoading] = useState(false);
    const [aiReport, setAiReport] = useState<FinancialReportData | null>(null);

    // 1. Filter Orders Logic
    const filteredOrders = useMemo(() => {
        const now = new Date();
        let startDate = new Date();
        
        if (dateRange === '3months') startDate.setMonth(now.getMonth() - 3);
        if (dateRange === '6months') startDate.setMonth(now.getMonth() - 6);
        if (dateRange === '1year') startDate.setFullYear(now.getFullYear() - 1);

        return orders.filter(order => {
            const orderDate = new Date(order.date);
            const inDateRange = orderDate >= startDate;

            // Drill down filter
            const hasCategory = categoryFilter === 'All' || order.items.some(item => {
                const p = products.find(prod => prod.id === item.productId);
                return p && p.category === categoryFilter;
            });

            const hasProduct = productFilter === 'All' || order.items.some(item => item.productId === productFilter);

            return inDateRange && hasCategory && hasProduct;
        });
    }, [orders, products, dateRange, categoryFilter, productFilter]);

    // 2. Metrics Calculation
    const metrics = useMemo(() => {
        let totalRev = 0;
        let totalCost = 0;
        let totalItemsSold = 0;
        let orderCount = filteredOrders.length;

        filteredOrders.forEach(order => {
            order.items.forEach(item => {
                // Apply drills logic to sum only relevant items if drill-down is active
                const p = products.find(prod => prod.id === item.productId);
                if (!p) return;
                
                if (categoryFilter !== 'All' && p.category !== categoryFilter) return;
                if (productFilter !== 'All' && p.id !== productFilter) return;

                const lineRevenue = item.price * item.quantity;
                const lineCost = (p.cost || p.price * 0.6) * item.quantity;

                totalRev += lineRevenue;
                totalCost += lineCost;
                totalItemsSold += item.quantity;
            });
        });

        // Returns Calculation
        let totalReturns = 0;
        // Filter returns based on the same date logic (approximate using order date for simplicity, or return date)
        const now = new Date();
        let startDate = new Date();
        if (dateRange === '3months') startDate.setMonth(now.getMonth() - 3);
        if (dateRange === '6months') startDate.setMonth(now.getMonth() - 6);
        if (dateRange === '1year') startDate.setFullYear(now.getFullYear() - 1);

        const relevantReturns = returns.filter(r => {
            const rDate = new Date(r.date);
            return rDate >= startDate;
        });
        
        relevantReturns.forEach(r => totalReturns += r.totalRefund);

        const netRevenue = totalRev - totalReturns;
        const grossProfit = netRevenue - totalCost;
        const grossMargin = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;
        const aov = orderCount > 0 ? totalRev / orderCount : 0;

        return { 
            totalRev, 
            totalCost, 
            totalReturns,
            netRevenue,
            grossProfit, 
            grossMargin, 
            aov, 
            totalItemsSold, 
            orderCount 
        };
    }, [filteredOrders, products, categoryFilter, productFilter, returns, dateRange]);

    // 3. Prepare Chart Data (Monthly)
    const chartData = useMemo(() => {
        const dataMap = new Map<string, { name: string, revenue: number, cost: number, profit: number }>();
        
        // Initialize months for the selected range to ensure X-axis continuity
        const now = new Date();
        const monthsToBack = dateRange === '3months' ? 3 : dateRange === '6months' ? 6 : 12;
        
        for (let i = monthsToBack - 1; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = d.toLocaleString('default', { month: 'short', year: '2-digit' });
            dataMap.set(key, { name: key, revenue: 0, cost: 0, profit: 0 });
        }

        filteredOrders.forEach(order => {
            const d = new Date(order.date);
            const key = d.toLocaleString('default', { month: 'short', year: '2-digit' });
            
            if (dataMap.has(key)) {
                let orderRev = 0;
                let orderCost = 0;

                order.items.forEach(item => {
                    const p = products.find(prod => prod.id === item.productId);
                    if (!p) return;
                     if (categoryFilter !== 'All' && p.category !== categoryFilter) return;
                     if (productFilter !== 'All' && p.id !== productFilter) return;

                    const itemRev = item.price * item.quantity;
                    const itemCost = (p.cost || p.price * 0.6) * item.quantity;

                    orderRev += itemRev;
                    orderCost += itemCost;
                });

                const entry = dataMap.get(key)!;
                entry.revenue += orderRev;
                entry.cost += orderCost;
                entry.profit += (orderRev - orderCost);
            }
        });

        return Array.from(dataMap.values());
    }, [filteredOrders, products, categoryFilter, productFilter, dateRange]);

    // 4. Linear Forecast Logic (Simple Regression)
    const forecastData = useMemo(() => {
        if (chartData.length < 2) return [];

        // x = 0, 1, 2...
        // y = revenue
        const n = chartData.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

        chartData.forEach((point, i) => {
            sumX += i;
            sumY += point.revenue;
            sumXY += i * point.revenue;
            sumXX += i * i;
        });

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        // Generate next 3 months
        const lastMonthLabel = chartData[chartData.length - 1].name; // "Oct 23"
        const [mStr, yStr] = lastMonthLabel.split(' ');
        const dateRef = new Date(`${mStr} 1, 20${yStr}`);

        const forecastPoints = [];
        for (let i = 1; i <= 3; i++) {
             const nextDate = new Date(dateRef.getFullYear(), dateRef.getMonth() + i, 1);
             const label = nextDate.toLocaleString('default', { month: 'short', year: '2-digit' });
             const predictedRev = slope * (n - 1 + i) + intercept;
             
             forecastPoints.push({
                 name: label,
                 forecast: Math.max(0, predictedRev) // No negative revenue
             });
        }
        return forecastPoints;
    }, [chartData]);

    const mixedChartData = [...chartData, ...forecastData];

    // 5. Category Distribution & Profitability Data
    const categoryStats = useMemo(() => {
        const catMap = new Map<string, { revenue: number, profit: number }>();
        filteredOrders.forEach(order => {
             order.items.forEach(item => {
                const p = products.find(prod => prod.id === item.productId);
                if (!p) return;
                 if (categoryFilter !== 'All' && p.category !== categoryFilter) return;
                 if (productFilter !== 'All' && p.id !== productFilter) return;
                 
                 const sales = item.price * item.quantity;
                 const cost = (p.cost || p.price * 0.6) * item.quantity;
                 const profit = sales - cost;

                 const current = catMap.get(p.category) || { revenue: 0, profit: 0 };
                 catMap.set(p.category, { 
                     revenue: current.revenue + sales,
                     profit: current.profit + profit
                 });
             });
        });
        return Array.from(catMap.entries()).map(([name, val]) => ({ name, ...val }));
    }, [filteredOrders, products, categoryFilter, productFilter]);

    // Unique Categories and Products for Filters
    const categories = Array.from(new Set(products.map(p => p.category)));
    const filteredProductsList = categoryFilter === 'All' 
        ? products 
        : products.filter(p => p.category === categoryFilter);

    // AI Report Generation
    const handleGenerateReport = async () => {
        setReportLoading(true);
        try {
            // Convert to safe numbers for AI Prompt
            const safeMetrics = {
                totalRev: metrics.totalRev.toFixed(2),
                totalReturns: metrics.totalReturns.toFixed(2),
                netRevenue: metrics.netRevenue.toFixed(2),
                totalCost: metrics.totalCost.toFixed(2),
                grossProfit: metrics.grossProfit.toFixed(2),
                grossMargin: metrics.grossMargin.toFixed(1)
            };
            
            const result = await generateFinancialReport(safeMetrics, chartData);
            if (result) {
                setAiReport(result);
            } else {
                addNotification("Report Warning", "Used fallback data due to connection limits.", "warning");
            }
        } catch (e) {
            console.error(e);
            addNotification("Error", "Could not generate report", "alert");
        } finally {
            setReportLoading(false);
        }
    };

    const downloadPDF = async () => {
        if (!aiReport) return;

        try {
            const doc = new jsPDF();
            const margin = 20;
            let y = 20;
            const width = doc.internal.pageSize.getWidth() - 2 * margin;

            // Title
            doc.setFontSize(22);
            doc.setFont("helvetica", "bold");
            doc.text("AI Financial Analysis Report", margin, y);
            y += 10;
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(100);
            doc.text(`Generated: ${new Date().toLocaleString()} | Period: ${dateRange}`, margin, y);
            y += 15;

            // Executive Summary
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(0);
            doc.text("Executive Summary", margin, y);
            y += 8;
            doc.setFontSize(11);
            doc.setFont("helvetica", "normal");
            const summary = doc.splitTextToSize(aiReport.executiveSummary, width);
            doc.text(summary, margin, y);
            y += summary.length * 6 + 10;

            // Financial Snapshot Table
            doc.setFillColor(245, 245, 245);
            doc.rect(margin, y, width, 25, 'F');
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.text(`Net Revenue: ₹${metrics.netRevenue.toLocaleString()}`, margin + 5, y + 10);
            doc.text(`Gross Profit: ₹${metrics.grossProfit.toLocaleString()}`, margin + 5, y + 18);
            doc.text(`Margin: ${metrics.grossMargin.toFixed(1)}%`, margin + 80, y + 10);
            doc.text(`Returns: ₹${metrics.totalReturns.toLocaleString()}`, margin + 80, y + 18);
            y += 35;

            // KPIs
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.text("Key Performance Indicators", margin, y);
            y += 8;
            doc.setFontSize(11);
            doc.setFont("helvetica", "normal");
            const rev = doc.splitTextToSize(`• Revenue: ${aiReport.keyPerformanceIndicators.revenueAnalysis}`, width);
            doc.text(rev, margin, y);
            y += rev.length * 6 + 3;
            const prof = doc.splitTextToSize(`• Profitability: ${aiReport.keyPerformanceIndicators.profitabilityAnalysis}`, width);
            doc.text(prof, margin, y);
            y += prof.length * 6 + 3;
            const cost = doc.splitTextToSize(`• Cost Efficiency: ${aiReport.keyPerformanceIndicators.costEfficiency}`, width);
            doc.text(cost, margin, y);
            y += cost.length * 6 + 10;

            // Recommendations
            if (y > 220) { doc.addPage(); y = 20; }
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.text("Strategic Recommendations", margin, y);
            y += 10;
            
            aiReport.strategicRecommendations.forEach((rec) => {
                if (y > 250) { doc.addPage(); y = 20; }
                doc.setFontSize(11);
                doc.setFont("helvetica", "bold");
                doc.text(`• ${rec.title} (${rec.priority} Priority)`, margin, y);
                y += 6;
                doc.setFont("helvetica", "normal");
                doc.text(`  Action: ${rec.action}`, margin, y);
                y += 6;
                doc.setFont("helvetica", "italic");
                doc.text(`  Impact: ${rec.expectedImpact}`, margin, y);
                y += 10;
            });

            const blob = doc.output('blob');
            const base64 = await blobToBase64(blob);
            saveReport({
                id: `fin-report-${Date.now()}`,
                title: `Financial Report - ${dateRange}`,
                filename: `Financial_Report_${Date.now()}.pdf`,
                mime: 'application/pdf',
                date: new Date().toISOString(),
                base64,
                size: blob.size
            });
            doc.save(`Financial_Report_${Date.now()}.pdf`);
            addNotification("Report Downloaded", "Financial PDF saved to logs", "success");
        } catch (e) {
            console.error("PDF Gen Error", e);
            addNotification("PDF Error", "Failed to generate PDF.", "alert");
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Financial Analytics</h1>
                    <p className="text-slate-500 mt-1">Deep dive into sales performance, margins, and forecasts.</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    <button 
                        onClick={handleGenerateReport} 
                        disabled={reportLoading}
                        className="flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-70"
                    >
                        <Sparkles className={`w-4 h-4 mr-2 ${reportLoading ? 'animate-spin' : ''}`} />
                        {reportLoading ? 'Analyzing...' : 'Generate AI Report'}
                    </button>

                    <div className="flex flex-wrap gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                        {/* Date Range */}
                        <div className="relative">
                             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Calendar className="h-4 w-4 text-slate-400" />
                            </div>
                            <select 
                                value={dateRange}
                                onChange={(e) => setDateRange(e.target.value as any)}
                                className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            >
                                <option value="3months">Last 3 Months</option>
                                <option value="6months">Last 6 Months</option>
                                <option value="1year">Last Year</option>
                            </select>
                        </div>

                        {/* Category Filter */}
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Filter className="h-4 w-4 text-slate-400" />
                            </div>
                            <select 
                                value={categoryFilter}
                                onChange={(e) => { setCategoryFilter(e.target.value); setProductFilter('All'); }}
                                className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            >
                                <option value="All">All Categories</option>
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* AI Report Section */}
            {aiReport && (
                <div className="bg-white rounded-xl border border-indigo-100 shadow-lg overflow-hidden animate-in slide-in-from-top-4 duration-500">
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 border-b border-indigo-100 flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-bold text-indigo-900 flex items-center">
                                <Sparkles className="w-5 h-5 mr-2 text-indigo-600" /> 
                                AI Financial Insights
                            </h3>
                            <p className="text-sm text-indigo-700 mt-1">Generated analysis based on your current financial data</p>
                        </div>
                        <button onClick={downloadPDF} className="flex items-center px-4 py-2 bg-white border border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-50 transition-colors shadow-sm text-sm font-medium">
                            <Download className="w-4 h-4 mr-2" /> Download Report
                        </button>
                    </div>
                    
                    <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-6">
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Executive Summary</h4>
                                <p className="text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-100">
                                    {aiReport.executiveSummary}
                                </p>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-4 rounded-lg border border-green-100 bg-green-50/50">
                                    <h5 className="font-semibold text-green-900 mb-2 flex items-center"><TrendingUp className="w-4 h-4 mr-1"/> Revenue Analysis</h5>
                                    <p className="text-sm text-green-800">{aiReport.keyPerformanceIndicators.revenueAnalysis}</p>
                                </div>
                                <div className="p-4 rounded-lg border border-blue-100 bg-blue-50/50">
                                    <h5 className="font-semibold text-blue-900 mb-2 flex items-center"><Wallet className="w-4 h-4 mr-1"/> Profitability</h5>
                                    <p className="text-sm text-blue-800">{aiReport.keyPerformanceIndicators.profitabilityAnalysis}</p>
                                </div>
                                <div className="p-4 rounded-lg border border-orange-100 bg-orange-50/50">
                                    <h5 className="font-semibold text-orange-900 mb-2 flex items-center"><Activity className="w-4 h-4 mr-1"/> Efficiency</h5>
                                    <p className="text-sm text-orange-800">{aiReport.keyPerformanceIndicators.costEfficiency}</p>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Risk Assessment</h4>
                                <div className="flex items-start p-4 bg-red-50 rounded-lg border border-red-100 text-red-800">
                                    <AlertTriangle className="w-5 h-5 mr-3 shrink-0 mt-0.5" />
                                    <p className="text-sm">{aiReport.riskAssessment}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                             <h4 className="font-bold text-slate-800 mb-4 flex items-center">
                                 <CheckCircle2 className="w-4 h-4 mr-2 text-primary-600" /> Strategic Actions
                             </h4>
                             <div className="space-y-4">
                                 {aiReport.strategicRecommendations.map((rec, i) => (
                                     <div key={i} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm relative overflow-hidden">
                                         <div className={`absolute top-0 right-0 px-2 py-0.5 text-[10px] font-bold uppercase rounded-bl-lg
                                             ${rec.priority === 'High' ? 'bg-red-100 text-red-600' : 
                                               rec.priority === 'Medium' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}
                                         `}>
                                             {rec.priority}
                                         </div>
                                         <h5 className="font-bold text-slate-800 text-sm mb-1 pr-6">{rec.title}</h5>
                                         <p className="text-xs text-slate-600 mb-2">{rec.action}</p>
                                         <div className="flex items-center text-xs font-medium text-green-600 bg-green-50 w-fit px-2 py-1 rounded">
                                             Impact: {rec.expectedImpact}
                                         </div>
                                     </div>
                                 ))}
                             </div>
                        </div>
                    </div>
                </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-medium text-slate-500 uppercase">Gross Revenue</p>
                    <div className="flex justify-between items-center mt-2">
                        <h3 className="text-xl font-bold text-slate-800">₹{metrics.totalRev.toLocaleString()}</h3>
                        <IndianRupee className="w-4 h-4 text-blue-500" />
                    </div>
                </div>
                 <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-medium text-slate-500 uppercase">Returns</p>
                    <div className="flex justify-between items-center mt-2">
                        <h3 className="text-xl font-bold text-red-600">₹{metrics.totalReturns.toLocaleString()}</h3>
                        <RotateCcw className="w-4 h-4 text-red-500" />
                    </div>
                </div>
                 <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-medium text-slate-500 uppercase">Net Revenue</p>
                    <div className="flex justify-between items-center mt-2">
                        <h3 className="text-xl font-bold text-indigo-600">₹{metrics.netRevenue.toLocaleString()}</h3>
                        <TrendingUp className="w-4 h-4 text-indigo-500" />
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-medium text-slate-500 uppercase">COGS</p>
                    <div className="flex justify-between items-center mt-2">
                        <h3 className="text-xl font-bold text-slate-600">₹{metrics.totalCost.toLocaleString()}</h3>
                        <ShoppingBag className="w-4 h-4 text-slate-400" />
                    </div>
                </div>
                 <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-medium text-slate-500 uppercase">Gross Profit</p>
                    <div className="flex justify-between items-center mt-2">
                        <h3 className="text-xl font-bold text-green-600">₹{metrics.grossProfit.toLocaleString()}</h3>
                        <Wallet className="w-4 h-4 text-green-500" />
                    </div>
                </div>
                 <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-medium text-slate-500 uppercase">Gross Margin</p>
                    <div className="flex justify-between items-center mt-2">
                        <h3 className={`text-xl font-bold ${metrics.grossMargin >= 40 ? 'text-slate-800' : 'text-orange-600'}`}>
                            {metrics.grossMargin.toFixed(1)}%
                        </h3>
                        <Percent className="w-4 h-4 text-purple-500" />
                    </div>
                </div>
            </div>

            {/* Main Chart Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Revenue vs Cost + Forecast */}
                <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">Financial Trends & Forecast</h3>
                            <p className="text-sm text-slate-500">Revenue, Profit, and Cost analysis over time</p>
                        </div>
                        <div className="flex items-center space-x-4 text-xs">
                             <div className="flex items-center"><span className="w-3 h-3 bg-blue-500 rounded-full mr-1"></span>Revenue</div>
                             <div className="flex items-center"><span className="w-3 h-3 bg-green-500 rounded-full mr-1"></span>Profit</div>
                             <div className="flex items-center"><span className="w-3 h-3 bg-orange-400 rounded-full mr-1"></span>Cost</div>
                             <div className="flex items-center"><span className="w-3 h-1 border-t-2 border-dashed border-purple-500 mr-1"></span>Forecast</div>
                        </div>
                    </div>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={mixedChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                                    </linearGradient>
                                     <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val/1000}k`} />
                                <Tooltip 
                                    formatter={(value: number) => `₹${value.toLocaleString()}`}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Area type="monotone" dataKey="revenue" stroke="#0ea5e9" fillOpacity={1} fill="url(#colorRev)" strokeWidth={2} />
                                <Area type="monotone" dataKey="profit" stroke="#22c55e" fillOpacity={1} fill="url(#colorProfit)" strokeWidth={2} />
                                <Line type="monotone" dataKey="cost" stroke="#fb923c" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                                <Line type="monotone" dataKey="forecast" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 5" dot={false} activeDot={{ r: 6 }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Sales by Category */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                    <h3 className="text-lg font-bold text-slate-800 mb-6">Revenue Mix</h3>
                    <div className="flex-1 min-h-[200px]">
                         <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={categoryStats}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="revenue"
                                >
                                    {categoryStats.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(val: number) => `₹${val.toLocaleString()}`} />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Bottom Row: Profitability Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-2">Profit by Category</h3>
                    <p className="text-sm text-slate-500 mb-6">Which categories drive the most bottom-line value?</p>
                    <div className="h-64">
                         <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={categoryStats} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" fontSize={12} tickFormatter={(val) => `₹${val/1000}k`} />
                                <YAxis dataKey="name" type="category" width={100} fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip cursor={{fill: 'transparent'}} formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Net Profit']} />
                                <Bar dataKey="profit" fill="#22c55e" radius={[0, 4, 4, 0]} barSize={24} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-2">Detailed Breakdown</h3>
                     <p className="text-sm text-slate-500 mb-4">Financial performance summary by category.</p>
                     <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                                <tr>
                                    <th className="py-3 px-2 font-semibold">Category</th>
                                    <th className="py-3 px-2 font-semibold text-right">Revenue</th>
                                    <th className="py-3 px-2 font-semibold text-right">Profit</th>
                                    <th className="py-3 px-2 font-semibold text-right">Margin</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[...categoryStats].sort((a,b) => b.revenue - a.revenue).map((cat, idx) => {
                                    const margin = cat.revenue > 0 ? (cat.profit / cat.revenue) * 100 : 0;
                                    return (
                                        <tr key={cat.name} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                                            <td className="py-3 px-2 flex items-center">
                                                <span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                                                {cat.name}
                                            </td>
                                            <td className="py-3 px-2 text-right font-medium text-slate-700">₹{cat.revenue.toLocaleString()}</td>
                                            <td className="py-3 px-2 text-right font-medium text-green-600">₹{cat.profit.toLocaleString()}</td>
                                            <td className="py-3 px-2 text-right text-slate-500">{margin.toFixed(1)}%</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Analytics;
