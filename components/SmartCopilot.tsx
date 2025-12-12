
import React, { useMemo, useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
// Fixed: Added CheckCircle to imports
import { Bot, X, ArrowRight, AlertTriangle, TrendingUp, TrendingDown, Package, Truck, IndianRupee, Clock, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Insight {
  id: string;
  type: 'Reorder' | 'DeadStock' | 'Forecast' | 'Mover' | 'Supplier' | 'Price' | 'Expiry';
  title: string;
  description: string;
  action: string;
  actionLink: string;
  metric?: string;
  history?: number[]; // For sparklines
}

const Sparkline = ({ data }: { data: number[] }) => {
    if (!data || data.length < 2) return null;
    const width = 80;
    const height = 24;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    
    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((val - min) / range) * height;
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg width={width} height={height} className="opacity-70">
             <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
};

const SmartCopilot: React.FC = () => {
  const { isCopilotOpen, toggleCopilot, products, orders, purchaseOrders, suppliers } = useData();
  const navigate = useNavigate();
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('copilot_dismissed');
    if (saved) setDismissedIds(JSON.parse(saved));
  }, []);

  const handleDismiss = (id: string) => {
    const newDismissed = [...dismissedIds, id];
    setDismissedIds(newDismissed);
    localStorage.setItem('copilot_dismissed', JSON.stringify(newDismissed));
  };

  const handleAction = (link: string) => {
      navigate(link);
      // Optional: Close copilot on navigation
      // toggleCopilot(); 
  };

  // --- Rule-Based AI Engine ---
  const insights = useMemo(() => {
      const generated: Insight[] = [];
      const today = new Date();

      // 1. Reorder Recommendations
      products.forEach(p => {
          if (p.stock <= p.reorderLevel) {
              generated.push({
                  id: `reorder-${p.id}`,
                  type: 'Reorder',
                  title: 'Restock Needed',
                  description: `${p.name} is below reorder level (${p.reorderLevel}). Current: ${p.stock}.`,
                  action: 'Create PO',
                  actionLink: '/purchase-orders',
                  metric: `${p.reorderLevel - p.stock + 20} suggested` // Simple logic
              });
          }
      });

      // 2. Dead Stock (No sales > 60 days)
      products.forEach(p => {
          if (p.stock > 0) {
              // Find last sale
              const productOrders = orders
                  .filter(o => o.items.some(i => i.productId === p.id))
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
              
              const lastActivityDate = productOrders.length > 0 
                  ? new Date(productOrders[0].date) 
                  : (p.lastRestockDate ? new Date(p.lastRestockDate) : new Date(today.getFullYear(), today.getMonth() - 4)); // Fallback

              const daysInactive = Math.floor((today.getTime() - lastActivityDate.getTime()) / (1000 * 3600 * 24));

              if (daysInactive > 60) {
                  generated.push({
                      id: `dead-${p.id}`,
                      type: 'DeadStock',
                      title: 'Dead Stock Alert',
                      description: `${p.name} hasn't moved in ${daysInactive} days.`,
                      action: 'Discount Item',
                      actionLink: '/products',
                      metric: `₹${(p.stock * p.price).toFixed(0)} tied up`
                  });
              }
          }
      });

      // 3. Fast Movers (Top 10% by quantity sold in orders)
      const salesMap = new Map<string, number>();
      orders.forEach(o => o.items.forEach(i => salesMap.set(i.productId, (salesMap.get(i.productId) || 0) + i.quantity)));
      
      const sortedSales = Array.from(salesMap.entries()).sort((a, b) => b[1] - a[1]);
      const top10PercentIndex = Math.ceil(sortedSales.length * 0.1);
      const topProducts = sortedSales.slice(0, top10PercentIndex).map(s => s[0]);

      topProducts.forEach(pid => {
          const p = products.find(prod => prod.id === pid);
          if (p) {
               // Generate history for sparkline
               const history = [0, 0, 0, 0, 0]; // Last 5 "periods" mock
               orders.slice(0, 10).forEach((o, idx) => {
                   if (idx < 5 && o.items.some(i => i.productId === pid)) history[4-idx] += 1;
               });

               generated.push({
                   id: `fast-${p.id}`,
                   type: 'Mover',
                   title: 'Fast Mover',
                   description: `${p.name} is performing in the top 10%.`,
                   action: 'View Analysis',
                   actionLink: '/analytics',
                   metric: 'High Demand',
                   history: history
               });
          }
      });

      // 4. Supplier Performance (Lead Time > Average)
      // Calculate global avg lead time
      const receivedPOs = purchaseOrders.filter(po => po.status === 'Received' && po.receivedDate);
      if (receivedPOs.length > 5) {
          const globalTotalTime = receivedPOs.reduce((sum, po) => {
              const start = new Date(po.date).getTime();
              const end = new Date(po.receivedDate!).getTime();
              return sum + Math.max(0, (end - start) / (1000 * 3600 * 24));
          }, 0);
          const globalAvg = globalTotalTime / receivedPOs.length;

          suppliers.forEach(s => {
             const supplierPOs = receivedPOs.filter(po => po.supplierId === s.id);
             if (supplierPOs.length > 0) {
                 const suppTotalTime = supplierPOs.reduce((sum, po) => {
                     return sum + Math.max(0, (new Date(po.receivedDate!).getTime() - new Date(po.date).getTime()) / (1000 * 3600 * 24));
                 }, 0);
                 const suppAvg = suppTotalTime / supplierPOs.length;

                 if (suppAvg > globalAvg * 1.5) {
                     generated.push({
                         id: `supp-${s.id}`,
                         type: 'Supplier',
                         title: 'Supplier Delay Risk',
                         description: `${s.name} lead time (${Math.round(suppAvg)}d) is significantly higher than avg (${Math.round(globalAvg)}d).`,
                         action: 'Find Alternative',
                         actionLink: '/suppliers',
                     });
                 }
             }
          });
      }
      
      // 5. Price Optimization (High Stock + Low Sales in last 30 days)
      products.forEach(p => {
          if (p.stock > 50) { // High stock threshold
             const recentOrders = orders.filter(o => {
                 const d = new Date(o.date);
                 const diff = (today.getTime() - d.getTime()) / (1000 * 3600 * 24);
                 return diff <= 30 && o.items.some(i => i.productId === p.id);
             });
             
             if (recentOrders.length === 0) {
                 generated.push({
                     id: `price-${p.id}`,
                     type: 'Price',
                     title: 'Price Optimization',
                     description: `${p.name} has high stock but no sales in 30 days.`,
                     action: 'Edit Price',
                     actionLink: '/products',
                     metric: 'Review Pricing'
                 });
             }
          }
      });

      return generated.filter(i => !dismissedIds.includes(i.id));

  }, [products, orders, purchaseOrders, suppliers, dismissedIds]);

  const getIcon = (type: Insight['type']) => {
      switch(type) {
          case 'Reorder': return <AlertTriangle className="w-5 h-5 text-red-500" />;
          case 'DeadStock': return <Package className="w-5 h-5 text-orange-500" />;
          case 'Mover': return <TrendingUp className="w-5 h-5 text-green-500" />;
          case 'Supplier': return <Truck className="w-5 h-5 text-yellow-500" />;
          case 'Price': return <IndianRupee className="w-5 h-5 text-blue-500" />;
          default: return <Bot className="w-5 h-5 text-primary-500" />;
      }
  };

  const getTypeStyle = (type: Insight['type']) => {
      switch(type) {
          case 'Reorder': return 'border-l-4 border-red-500 bg-red-50/30';
          case 'DeadStock': return 'border-l-4 border-orange-500 bg-orange-50/30';
          case 'Mover': return 'border-l-4 border-green-500 bg-green-50/30';
          case 'Supplier': return 'border-l-4 border-yellow-400 bg-yellow-50/30';
          default: return 'border-l-4 border-slate-300 bg-white';
      }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button 
        onClick={toggleCopilot}
        className={`fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-2xl transition-all duration-300 hover:scale-105 flex items-center justify-center
            ${isCopilotOpen ? 'bg-slate-800 text-white rotate-90' : 'bg-gradient-to-r from-primary-600 to-indigo-600 text-white'}
        `}
      >
        {isCopilotOpen ? <X className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
      </button>

      {/* Slide-Over Panel */}
      <div 
        className={`fixed inset-y-0 right-0 z-40 w-full sm:w-96 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out border-l border-slate-100 flex flex-col
            ${isCopilotOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-xl font-bold text-slate-800 flex items-center">
                <Bot className="w-6 h-6 mr-2 text-primary-600" />
                Smart Copilot
            </h2>
            <p className="text-sm text-slate-500 mt-1">
                {insights.length > 0 
                  ? `Here's what I found in your inventory today...` 
                  : "Everything looks good right now!"}
            </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {insights.map(insight => (
                <div key={insight.id} className={`p-4 rounded-lg shadow-sm border border-slate-100 ${getTypeStyle(insight.type)} transition-all hover:shadow-md`}>
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                            {getIcon(insight.type)}
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{insight.type}</span>
                        </div>
                        <button onClick={() => handleDismiss(insight.id)} className="text-slate-300 hover:text-slate-500">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    
                    <h3 className="text-sm font-bold text-slate-800 mb-1">{insight.title}</h3>
                    <p className="text-xs text-slate-600 mb-3 leading-relaxed">{insight.description}</p>
                    
                    {insight.history && (
                        <div className="mb-3 text-primary-600">
                            <Sparkline data={insight.history} />
                        </div>
                    )}

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100/50">
                         {insight.metric && <span className="text-xs font-semibold text-slate-500">{insight.metric}</span>}
                         <button 
                            onClick={() => handleAction(insight.actionLink)}
                            className="text-xs font-medium text-primary-600 hover:text-primary-800 flex items-center ml-auto"
                         >
                             {insight.action} <ArrowRight className="w-3 h-3 ml-1" />
                         </button>
                    </div>
                </div>
            ))}

            {insights.length === 0 && (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                    <CheckCircle className="w-12 h-12 mb-3 opacity-20" />
                    <p className="text-sm">No new insights.</p>
                </div>
            )}
        </div>
        
        <div className="p-4 border-t border-slate-100 text-center">
            <p className="text-[10px] text-slate-400">Analysis runs locally based on your real-time data.</p>
        </div>
      </div>

      {/* Backdrop for mobile */}
      {isCopilotOpen && (
        <div 
            onClick={toggleCopilot} 
            className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm sm:hidden"
        ></div>
      )}
    </>
  );
};

export default SmartCopilot;
