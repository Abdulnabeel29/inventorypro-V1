
import React, { useMemo, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { ArrowLeft, Download, TrendingUp, AlertTriangle, CheckCircle, Package, Truck, IndianRupee, Calendar, Copy, BarChart2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, Cell } from 'recharts';
import { jsPDF } from 'jspdf';
import { saveReport, blobToBase64 } from '../services/reportStore';
import { Sparkline } from '../components/ProductAnalysisCharts';

const ProductAnalysis: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { products, orders, locationStocks, locations, addNotification } = useData();
  const [activeTab, setActiveTab] = useState<'overview' | 'movement' | 'locations'>('overview');

  const product = products.find(p => p.id === id);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'p' && !e.ctrlKey && !e.metaKey) {
        generatePDF();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [product]);

  // --- Calculations ---
  const analysis = useMemo(() => {
      if (!product) return null;

      const now = new Date();
      // Sales History (Daily for Chart) - Last 90 days
      const historyData = [];
      let totalSales90 = 0;
      let totalSales30 = 0;
      
      // Init last 90 days map
      const dateMap = new Map<string, number>();
      for (let i = 89; i >= 0; i--) {
          const d = new Date();
          d.setDate(now.getDate() - i);
          dateMap.set(d.toISOString().split('T')[0], 0);
      }

      orders.forEach(o => {
          const dStr = o.date.split('T')[0]; // assuming YYYY-MM-DD
          if (dateMap.has(dStr)) {
              const item = o.items.find(i => i.productId === product.id);
              if (item) {
                  dateMap.set(dStr, (dateMap.get(dStr) || 0) + item.quantity);
                  
                  // Counters
                  totalSales90 += item.quantity;
                  const daysDiff = (now.getTime() - new Date(o.date).getTime()) / (1000 * 3600 * 24);
                  if (daysDiff <= 30) totalSales30 += item.quantity;
              }
          }
      });

      const chartData = Array.from(dateMap.entries()).map(([date, sales]) => ({ date, sales }));
      
      // Monthly Summary
      const monthlySummary = new Map<string, { qty: number, revenue: number }>();
      orders.forEach(o => {
           const item = o.items.find(i => i.productId === product.id);
           if (item) {
               const mKey = o.date.substring(0, 7); // YYYY-MM
               if (!monthlySummary.has(mKey)) monthlySummary.set(mKey, { qty: 0, revenue: 0 });
               const entry = monthlySummary.get(mKey)!;
               entry.qty += item.quantity;
               entry.revenue += item.quantity * item.price;
           }
      });
      const monthlyData = Array.from(monthlySummary.entries())
        .sort((a,b) => b[0].localeCompare(a[0])) // Descending
        .slice(0, 12);

      // KPIs
      const avgDailySales = totalSales90 / 90;
      const doi = avgDailySales > 0 ? product.stock / avgDailySales : 999;
      const inventoryValue = product.stock * product.cost;
      const grossMargin = ((product.price - product.cost) / product.price) * 100;

      // Reorder Recommendation
      // Mock lead time 14 days, buffer 7 days
      const leadTime = 14;
      const safetyBuffer = 7;
      const suggestedReorder = Math.max(0, Math.ceil((avgDailySales * (leadTime + safetyBuffer)) - product.stock));

      return {
          chartData,
          totalSales90,
          totalSales30,
          avgDailySales,
          doi,
          inventoryValue,
          grossMargin,
          monthlyData,
          suggestedReorder
      };
  }, [product, orders]);

  if (!product || !analysis) {
      return <div className="p-10 text-center">Product not found. <button onClick={() => navigate('/analysis/products')} className="text-blue-600 underline">Go Back</button></div>;
  }

  const handleCreateDraftPO = () => {
     // Navigate to PO page with pre-fill params
     navigate(`/purchase-orders?draft=true&supplierId=${encodeURIComponent(product.supplier)}&productId=${product.id}&qty=${analysis.suggestedReorder}`);
  };

  const generatePDF = async () => {
    try {
        const doc = new jsPDF();
        const margin = 20;
        let y = 20;

        doc.setFontSize(20);
        doc.text(`Product Analysis: ${product.name}`, margin, y);
        y += 10;
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated on ${new Date().toLocaleString()} | SKU: ${product.sku}`, margin, y);
        y += 15;

        // KPI Grid
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, 170, 30, 'F');
        doc.setFontSize(10);
        doc.setTextColor(0);
        
        doc.text("Current Stock", margin + 5, y + 8);
        doc.setFontSize(14);
        doc.text(String(product.stock), margin + 5, y + 20);

        doc.setFontSize(10);
        doc.text("Avg Daily Sales", margin + 55, y + 8);
        doc.setFontSize(14);
        doc.text(analysis.avgDailySales.toFixed(1), margin + 55, y + 20);

        doc.setFontSize(10);
        doc.text("Days of Inventory", margin + 105, y + 8);
        doc.setFontSize(14);
        doc.text(analysis.doi.toFixed(1), margin + 105, y + 20);
        
        y += 40;

        // Reorder Section
        doc.setFontSize(14);
        doc.text("Reorder Recommendation", margin, y);
        y += 8;
        doc.setFontSize(10);
        doc.text(`Based on 90-day sales velocity of ${analysis.avgDailySales.toFixed(2)} units/day.`, margin, y);
        y += 6;
        doc.text(`Suggested Order Quantity: ${analysis.suggestedReorder}`, margin, y);
        y += 15;

        // Monthly Table
        doc.setFontSize(14);
        doc.text("Recent Monthly Performance", margin, y);
        y += 8;
        
        analysis.monthlyData.slice(0, 5).forEach(m => {
             doc.setFontSize(10);
             doc.text(`${m[0]}: ${m[1].qty} units sold - ₹${m[1].revenue.toFixed(2)}`, margin, y);
             y += 6;
        });

        const blob = doc.output('blob');
        const base64 = await blobToBase64(blob);
        const filename = `${product.sku}_Analysis_${new Date().toISOString().split('T')[0]}.pdf`;

        const result = saveReport({
            id: `prod-${product.id}-${Date.now()}`,
            title: `Product Analysis - ${product.name}`,
            filename,
            mime: 'application/pdf',
            date: new Date().toISOString(),
            base64,
            size: blob.size
        });

        if (result.success) {
            addNotification("Report Saved", "Product analysis saved to logs.", "success");
        }
        doc.save(filename);

    } catch (e) {
        console.error(e);
        addNotification("Export Failed", "Could not generate PDF.", "alert");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
           <button onClick={() => navigate('/analysis/products')} className="text-slate-500 hover:text-slate-800 flex items-center mb-2 text-sm">
               <ArrowLeft className="w-4 h-4 mr-1" /> Back to List
           </button>
           <h1 className="text-2xl font-bold text-slate-800 flex items-center">
             {product.name} 
             <span className={`ml-3 text-xs px-2 py-1 rounded-full border ${product.stock <= product.reorderLevel ? 'bg-red-50 text-red-700 border-red-100' : 'bg-green-50 text-green-700 border-green-100'}`}>
                 {product.status}
             </span>
           </h1>
           <div className="flex gap-4 text-sm text-slate-500 mt-2">
               <span>SKU: <span className="font-mono text-slate-700">{product.sku}</span></span>
               <span>•</span>
               <span>Category: {product.category}</span>
               <span>•</span>
               <span>Supplier: {product.supplier}</span>
           </div>
        </div>
        <div className="flex gap-2">
            <button onClick={generatePDF} className="flex items-center px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors">
                <Download className="w-4 h-4 mr-2" /> Export PDF
            </button>
        </div>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-slate-500 text-xs uppercase font-semibold mb-1">Current Stock</div>
              <div className="text-2xl font-bold text-slate-800">{product.stock}</div>
              <div className="text-xs text-slate-400 mt-1">Reorder Level: {product.reorderLevel}</div>
          </div>
           <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-slate-500 text-xs uppercase font-semibold mb-1">Avg Daily Sales</div>
              <div className="text-2xl font-bold text-slate-800">{analysis.avgDailySales.toFixed(1)}</div>
              <div className="text-xs text-green-600 mt-1 flex items-center">
                  <TrendingUp className="w-3 h-3 mr-1" /> {analysis.totalSales30} last 30d
              </div>
          </div>
           <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-slate-500 text-xs uppercase font-semibold mb-1">Days of Inventory</div>
              <div className={`text-2xl font-bold ${analysis.doi < 14 ? 'text-red-600' : 'text-slate-800'}`}>
                  {analysis.doi.toFixed(0)}
              </div>
              <div className="text-xs text-slate-400 mt-1">Target: 30 days</div>
          </div>
           <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-slate-500 text-xs uppercase font-semibold mb-1">Inv. Value</div>
              <div className="text-2xl font-bold text-slate-800">₹{analysis.inventoryValue.toLocaleString()}</div>
              <div className="text-xs text-slate-400 mt-1">Margin: {analysis.grossMargin.toFixed(1)}%</div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart */}
          <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-4">Sales Trend (90 Days)</h3>
              <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analysis.chartData}>
                          <defs>
                            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis 
                            dataKey="date" 
                            tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                            fontSize={12} 
                            tickLine={false} axisLine={false} 
                            minTickGap={30}
                          />
                          <YAxis fontSize={12} tickLine={false} axisLine={false} />
                          <RechartsTooltip />
                          <Area type="monotone" dataKey="sales" stroke="#0ea5e9" fillOpacity={1} fill="url(#colorSales)" />
                      </AreaChart>
                  </ResponsiveContainer>
              </div>
          </div>

          {/* Reorder Recommendation Panel */}
          <div className="bg-gradient-to-br from-indigo-50 to-white p-6 rounded-xl border border-indigo-100 shadow-sm flex flex-col">
              <h3 className="font-bold text-indigo-900 mb-4 flex items-center">
                  <Truck className="w-5 h-5 mr-2" /> Reorder Intelligence
              </h3>
              
              <div className="flex-1 space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-indigo-100">
                      <span className="text-sm text-indigo-700">Lead Time Estimate</span>
                      <span className="font-bold text-indigo-900">14 Days</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-indigo-100">
                      <span className="text-sm text-indigo-700">Safety Buffer</span>
                      <span className="font-bold text-indigo-900">7 Days</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-indigo-100">
                      <span className="text-sm text-indigo-700">Projected Consumption</span>
                      <span className="font-bold text-indigo-900">{(analysis.avgDailySales * 21).toFixed(0)} units</span>
                  </div>

                  <div className="bg-white p-4 rounded-lg border border-indigo-100 text-center mt-4">
                      <p className="text-xs uppercase font-bold text-indigo-400 mb-1">Recommended Order</p>
                      <p className="text-3xl font-bold text-indigo-600">{analysis.suggestedReorder}</p>
                      <p className="text-xs text-indigo-400 mt-1">Units</p>
                  </div>
              </div>

              <button 
                onClick={handleCreateDraftPO}
                className="w-full mt-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all flex justify-center items-center"
              >
                  <Copy className="w-4 h-4 mr-2" /> Create PO Draft
              </button>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Monthly Performance */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
             <h3 className="font-bold text-slate-800 mb-4">Monthly Breakdown</h3>
             <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm">
                     <thead className="bg-slate-50 text-slate-500">
                         <tr>
                             <th className="px-4 py-2 rounded-l-lg">Month</th>
                             <th className="px-4 py-2">Units Sold</th>
                             <th className="px-4 py-2 rounded-r-lg text-right">Revenue</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                         {analysis.monthlyData.map(([month, data]) => (
                             <tr key={month}>
                                 <td className="px-4 py-3 font-medium text-slate-700">{month}</td>
                                 <td className="px-4 py-3 text-slate-600">{data.qty}</td>
                                 <td className="px-4 py-3 text-right font-mono text-slate-600">₹{data.revenue.toLocaleString()}</td>
                             </tr>
                         ))}
                         {analysis.monthlyData.length === 0 && (
                             <tr><td colSpan={3} className="p-4 text-center text-slate-400">No recent sales data</td></tr>
                         )}
                     </tbody>
                 </table>
             </div>
          </div>

          {/* Location Breakdown */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-4">Stock by Location</h3>
              <div className="space-y-3">
                  {locations.map(loc => {
                      const stock = locationStocks.find(ls => ls.productId === product.id && ls.locationId === loc.id)?.quantity || 0;
                      return (
                          <div key={loc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                              <div className="flex items-center">
                                  <div className={`p-2 rounded-md mr-3 ${stock > 0 ? 'bg-white text-primary-600 shadow-sm' : 'bg-slate-200 text-slate-400'}`}>
                                      <Package className="w-4 h-4" />
                                  </div>
                                  <div>
                                      <div className="font-medium text-slate-800">{loc.name}</div>
                                      <div className="text-xs text-slate-500">{loc.type}</div>
                                  </div>
                              </div>
                              <div className="font-bold text-lg text-slate-700">{stock}</div>
                          </div>
                      );
                  })}
              </div>
          </div>
      </div>

       {/* Mock Insights / Risks */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
         <h3 className="font-bold text-slate-800 mb-4 flex items-center">
             <AlertTriangle className="w-5 h-5 mr-2 text-orange-500" /> Automated Insights
         </h3>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             {analysis.doi < 10 && (
                 <div className="p-4 bg-red-50 border border-red-100 rounded-lg">
                     <h4 className="font-bold text-red-800 text-sm mb-1">High Stockout Risk</h4>
                     <p className="text-xs text-red-600 mb-3">Inventory covers less than 10 days of sales. Immediate reorder recommended.</p>
                     <button onClick={handleCreateDraftPO} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200 font-medium">Create PO</button>
                 </div>
             )}
             {analysis.doi > 90 && (
                 <div className="p-4 bg-orange-50 border border-orange-100 rounded-lg">
                     <h4 className="font-bold text-orange-800 text-sm mb-1">Slow Moving Inventory</h4>
                     <p className="text-xs text-orange-600 mb-3">Stock covers {analysis.doi.toFixed(0)} days. Consider running a promotion to free up capital.</p>
                     <button className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded hover:bg-orange-200 font-medium">Mark Promo</button>
                 </div>
             )}
             {/* Mock Batch Expiry Insight */}
             <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
                 <h4 className="font-bold text-blue-800 text-sm mb-1">Batch Management</h4>
                 <p className="text-xs text-blue-600 mb-3">No batches expiring in next 30 days. Stock rotation is healthy.</p>
                 <button className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 font-medium opacity-50 cursor-not-allowed">No Action</button>
             </div>
         </div>
      </div>
    </div>
  );
};

export default ProductAnalysis;
