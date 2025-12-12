
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Product } from '../types';
import { Sparkline } from './ProductAnalysisCharts';
import { ArrowRight, AlertCircle, Package } from 'lucide-react';

interface ProductAnalysisCardProps {
  product: Product;
  salesHistory: number[]; // Array of numbers for sparkline
  avgDailySales: number;
  totalStock: number;
}

const ProductAnalysisCard: React.FC<ProductAnalysisCardProps> = ({ product, salesHistory, avgDailySales, totalStock }) => {
  const navigate = useNavigate();

  // Metrics
  const doi = avgDailySales > 0 ? (totalStock / avgDailySales).toFixed(1) : '∞';
  const statusColor = 
    product.status === 'Out of Stock' ? 'bg-red-50 text-red-700 border-red-100' :
    product.status === 'Low Stock' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
    'bg-white text-slate-700 border-slate-200';

  return (
    <div className={`rounded-xl border shadow-sm p-5 hover:shadow-md transition-shadow relative group ${statusColor}`}>
      <div className="flex justify-between items-start mb-3">
        <div>
           <div className="text-xs text-slate-500 font-mono mb-1">{product.sku}</div>
           <h3 className="font-bold text-slate-800 text-lg leading-tight line-clamp-1" title={product.name}>
             {product.name}
           </h3>
           <div className="text-xs text-slate-500 mt-1">{product.category}</div>
        </div>
        <div className={`p-2 rounded-lg ${product.stock <= product.reorderLevel ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
           <Package className="w-5 h-5" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide">Stock</p>
          <p className="font-bold text-xl">{totalStock}</p>
        </div>
        <div>
           <p className="text-xs text-slate-500 uppercase tracking-wide">Days Inv.</p>
           <p className={`font-bold text-xl ${Number(doi) < 14 ? 'text-orange-600' : 'text-slate-800'}`}>
             {doi}
           </p>
        </div>
      </div>

      <div className="mb-4">
         <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>30 Day Trend</span>
            {salesHistory.length === 0 && <span>No Data</span>}
         </div>
         <div className="h-10">
            <Sparkline data={salesHistory} width={280} height={40} color={product.stock <= product.reorderLevel ? '#ef4444' : '#0ea5e9'} />
         </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-slate-100/50">
         <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
             product.status === 'In Stock' ? 'bg-green-100 text-green-700' : 
             product.status === 'Low Stock' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
         }`}>
             {product.status}
         </span>
         
         <button 
           onClick={() => navigate(`/analysis/products/${product.id}`)}
           className="text-sm font-medium text-primary-600 hover:text-primary-800 flex items-center"
         >
            Analysis <ArrowRight className="w-4 h-4 ml-1" />
         </button>
      </div>
    </div>
  );
};

export default ProductAnalysisCard;
