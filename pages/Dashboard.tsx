
import React, { useEffect, useState } from 'react';
import { 
    IndianRupee, Package, ShoppingCart, AlertTriangle, TrendingUp, Activity, Sparkles, ArrowRight,
    CheckSquare, Truck, Building2, RotateCcw, Calendar
} from 'lucide-react';
import KPICard from '../components/KPICard';
import { useData } from '../context/DataContext';
import { getDashboardInsights } from '../services/geminiService';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const { products, orders, activities, tasks, purchaseOrders, returns, locations, locationStocks } = useData();
  const [insights, setInsights] = useState<{tip: string, alert: string} | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchInsights = async () => {
        const result = await getDashboardInsights(products);
        setInsights(result);
    }
    fetchInsights();
  }, [products.length]); // Refresh when product count changes

  // --- Calculations ---
  const totalRevenue = orders.reduce((acc, order) => acc + order.total, 0);
  const lowStockCount = products.filter(p => p.stock <= p.reorderLevel).length;
  
  // 1. Revenue Trends (Mocked)
  const salesData = [
    { name: 'Mon', sales: 4000 },
    { name: 'Tue', sales: 3000 },
    { name: 'Wed', sales: 2000 },
    { name: 'Thu', sales: 2780 },
    { name: 'Fri', sales: 1890 },
    { name: 'Sat', sales: 2390 },
    { name: 'Sun', sales: 3490 },
  ];

  // 2. Category Distribution
  const categoryData = products.reduce((acc: any[], product) => {
      const existing = acc.find(item => item.name === product.category);
      if (existing) {
          existing.value += product.stock;
      } else {
          acc.push({ name: product.category, value: product.stock });
      }
      return acc;
  }, []);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  // 3. Top Selling Products
  const productSales = new Map<string, number>();
  orders.forEach(order => {
      order.items.forEach(item => {
          const current = productSales.get(item.productId) || 0;
          productSales.set(item.productId, current + item.quantity);
      });
  });
  
  const topProducts = Array.from(productSales.entries())
      .map(([id, count]) => {
          const p = products.find(prod => prod.id === id);
          return { id, name: p?.name || 'Unknown', count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

  // 4. Operations Snippets Data
  const pendingTasks = tasks.filter(t => t.status !== 'Completed').slice(0, 3);
  const activePOs = purchaseOrders.filter(po => po.status !== 'Received').slice(0, 3);
  const warehouseStats = locations.map(loc => {
      const count = locationStocks.filter(ls => ls.locationId === loc.id).reduce((acc, curr) => acc + curr.quantity, 0);
      return { name: loc.name, count };
  });
  const pendingReturns = returns.filter(r => r.status === 'Pending');

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* AI Header */}
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center">
             <div>
                 <h1 className="text-2xl font-bold flex items-center">
                    <Sparkles className="w-6 h-6 mr-2 text-yellow-300" />
                    Inventory AI Insights
                 </h1>
                 <p className="text-indigo-100 mt-1">Real-time analysis of your stock performance</p>
             </div>
             {insights && (
                 <div className="mt-4 md:mt-0 bg-white/10 backdrop-blur-md rounded-lg p-3 border border-white/20 max-w-md">
                     <p className="text-xs font-semibold text-yellow-300 uppercase tracking-wider mb-1">Smart Alert</p>
                     <p className="text-sm font-medium">{insights.alert}</p>
                 </div>
             )}
          </div>
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-purple-500/20 rounded-full blur-2xl"></div>
      </div>

      {/* Main KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total Revenue"
          value={`₹${totalRevenue.toLocaleString()}`}
          change="12% vs last month"
          trend="up"
          icon={<IndianRupee className="w-6 h-6" />}
          color="green"
        />
        <KPICard
          title="Total Orders"
          value={orders.length.toString()}
          change="8% vs last month"
          trend="up"
          icon={<ShoppingCart className="w-6 h-6" />}
          color="blue"
        />
        <KPICard
          title="Products In Stock"
          value={products.length.toString()}
          change="2 new added"
          trend="up"
          icon={<Package className="w-6 h-6" />}
          color="orange"
        />
        <KPICard
          title="Low Stock Alerts"
          value={lowStockCount.toString()}
          change={lowStockCount > 0 ? "Action Needed" : "All Good"}
          trend={lowStockCount > 0 ? "down" : "up"}
          icon={<AlertTriangle className="w-6 h-6" />}
          color="red"
        />
      </div>

      {/* Charts & Activity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-800">Revenue Trends</h3>
            <div className="flex items-center text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
                <TrendingUp className="w-4 h-4 mr-1" />
                +14.5% Growth
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    itemStyle={{ color: '#0f172a' }}
                    formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Revenue']}
                />
                <Area type="monotone" dataKey="sales" stroke="#0ea5e9" fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-800 flex items-center">
                    <Activity className="w-5 h-5 mr-2 text-primary-600" />
                    Activity
                </h3>
                <button onClick={() => navigate('/activities')} className="text-xs text-primary-600 font-medium hover:underline">View All</button>
            </div>
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 max-h-[320px]">
                {activities.slice(0, 6).map((activity) => (
                    <div key={activity.id} className="flex items-start p-3 bg-slate-50 rounded-lg group hover:bg-slate-100 transition-colors">
                        <div className={`mt-1 w-2 h-2 rounded-full mr-3 shrink-0 
                            ${activity.type === 'alert' ? 'bg-red-500' : 
                              activity.type === 'order' ? 'bg-green-500' : 
                              activity.type === 'stock' ? 'bg-blue-500' : 'bg-slate-400'}`}>
                        </div>
                        <div>
                            <p className="text-sm text-slate-800 font-medium leading-tight">{activity.message}</p>
                            <p className="text-xs text-slate-500 mt-1">{activity.timestamp}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>

      {/* Operations Snippets Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Tasks Snippet */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-slate-800 flex items-center">
                      <CheckSquare className="w-5 h-5 mr-2 text-blue-600" />
                      Pending Tasks
                  </h3>
                  <button onClick={() => navigate('/tasks')} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-blue-600"><ArrowRight className="w-4 h-4" /></button>
              </div>
              <div className="space-y-3">
                  {pendingTasks.length > 0 ? pendingTasks.map(task => (
                      <div key={task.id} className="p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors">
                          <div className="flex justify-between items-start">
                              <span className="font-medium text-slate-800 text-sm">{task.title}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium border ${
                                  task.priority === 'High' ? 'bg-red-50 text-red-600 border-red-100' : 
                                  task.priority === 'Medium' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-blue-50 text-blue-600 border-blue-100'
                              }`}>{task.priority}</span>
                          </div>
                          <div className="flex justify-between items-center mt-2 text-xs text-slate-500">
                              <span>{task.assignee}</span>
                              <span className="flex items-center"><Calendar className="w-3 h-3 mr-1" />{task.dueDate}</span>
                          </div>
                      </div>
                  )) : (
                      <div className="text-center py-6 text-slate-400 text-sm">No pending tasks</div>
                  )}
              </div>
          </div>

          {/* POs Snippet */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-slate-800 flex items-center">
                      <Truck className="w-5 h-5 mr-2 text-orange-600" />
                      Incoming Stock
                  </h3>
                  <button onClick={() => navigate('/purchase-orders')} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-orange-600"><ArrowRight className="w-4 h-4" /></button>
              </div>
              <div className="space-y-3">
                  {activePOs.length > 0 ? activePOs.map(po => (
                      <div key={po.id} className="p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors">
                          <div className="flex justify-between items-start">
                              <span className="font-medium text-slate-800 text-sm">{po.supplierName}</span>
                              <span className="text-xs font-mono text-slate-500">#{po.id}</span>
                          </div>
                          <div className="flex justify-between items-center mt-2">
                              <span className="text-xs text-slate-500">ETA: {po.expectedDeliveryDate}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${po.status === 'Delayed' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                  {po.status}
                              </span>
                          </div>
                      </div>
                  )) : (
                      <div className="text-center py-6 text-slate-400 text-sm">No active POs</div>
                  )}
              </div>
          </div>

          {/* Warehouses/Returns Mixed Snippet */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
               <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-slate-800 flex items-center">
                      <Building2 className="w-5 h-5 mr-2 text-purple-600" />
                      Warehouses
                  </h3>
                  <button onClick={() => navigate('/warehouses')} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-purple-600"><ArrowRight className="w-4 h-4" /></button>
              </div>
              <div className="flex-1 space-y-3">
                  {warehouseStats.slice(0, 3).map((wh, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2">
                          <span className="text-sm text-slate-700">{wh.name}</span>
                          <div className="flex items-center">
                              <div className="w-24 h-2 bg-slate-100 rounded-full mr-2 overflow-hidden">
                                  <div className="h-full bg-purple-500" style={{ width: `${Math.min(100, (wh.count / 200) * 100)}%` }}></div>
                              </div>
                              <span className="text-xs font-bold text-slate-800">{wh.count}</span>
                          </div>
                      </div>
                  ))}
              </div>
              
              {/* Returns Mini-Summary at bottom of card */}
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between" onClick={() => navigate('/returns')} style={{cursor: 'pointer'}}>
                  <div className="flex items-center text-sm text-slate-600">
                      <RotateCcw className="w-4 h-4 mr-2 text-slate-400" />
                      Pending Returns
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${pendingReturns.length > 0 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                      {pendingReturns.length}
                  </span>
              </div>
          </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Inventory Distribution */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
             <h3 className="text-lg font-bold text-slate-800 mb-2">Inventory by Category</h3>
             <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={categoryData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {categoryData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                    </PieChart>
                </ResponsiveContainer>
             </div>
             <div className="flex flex-wrap gap-2 justify-center mt-2">
                 {categoryData.map((entry, index) => (
                     <div key={entry.name} className="flex items-center text-xs text-slate-600">
                         <div className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                         {entry.name}
                     </div>
                 ))}
             </div>
          </div>
          
          {/* Top Products */}
          <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
             <h3 className="text-lg font-bold text-slate-800 mb-4">Top Selling Products</h3>
             <div className="space-y-4">
                 {topProducts.map((product, index) => (
                     <div 
                        key={product.id} 
                        onClick={() => navigate(`/analysis/products/${product.id}`)}
                        className="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:border-primary-200 transition-colors cursor-pointer"
                     >
                         <div className="flex items-center">
                             <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-sm mr-3">
                                 {index + 1}
                             </div>
                             <div>
                                 <p className="font-medium text-slate-800">{product.name}</p>
                                 <p className="text-xs text-slate-500">{product.count} units sold</p>
                             </div>
                         </div>
                         <div className="flex items-center text-primary-600 text-sm font-medium">
                             View Analysis <ArrowRight className="w-4 h-4 ml-1" />
                         </div>
                     </div>
                 ))}
                 {topProducts.length === 0 && <div className="text-slate-400 text-sm text-center py-4">No sales data yet</div>}
             </div>
          </div>
      </div>
    </div>
  );
};

export default Dashboard;
