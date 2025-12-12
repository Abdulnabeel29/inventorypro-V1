
import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import ProductAnalysisCard from '../components/ProductAnalysisCard';
import { Search, Filter, Download, List, Grid } from 'lucide-react';
import { Product } from '../types';
import { useSearchParams } from 'react-router-dom';

const ProductAnalysisIndex: React.FC = () => {
  const { products, orders } = useData();
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  useEffect(() => {
      const query = searchParams.get('search');
      if (query) {
          setSearchTerm(query);
      }
  }, [searchParams]);

  // Helper: Get sales history for sparkline (last 30 days daily buckets)
  const getProductMetrics = (productId: string) => {
      const now = new Date();
      const cutoff = new Date();
      cutoff.setDate(now.getDate() - 30);

      const relevantOrders = orders.filter(o => 
        new Date(o.date) >= cutoff && 
        o.items.some(i => i.productId === productId)
      );

      // Daily buckets for last 30 days
      const history = new Array(30).fill(0);
      let totalSales30d = 0;

      relevantOrders.forEach(o => {
          const dayIndex = Math.floor((now.getTime() - new Date(o.date).getTime()) / (1000 * 3600 * 24));
          if (dayIndex >= 0 && dayIndex < 30) {
              const item = o.items.find(i => i.productId === productId);
              if (item) {
                  history[29 - dayIndex] += item.quantity; // Fill reverse (0 is oldest displayed left? No 29 is today)
              }
          }
      });
      
      // Fix history mapping: index 0 = 30 days ago, index 29 = today
      const sparklineData = new Array(30).fill(0);
      relevantOrders.forEach(o => {
          const d = new Date(o.date);
          const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 3600 * 24));
          if (diffDays >= 0 && diffDays < 30) {
              const item = o.items.find(i => i.productId === productId);
              if (item) {
                  sparklineData[29 - diffDays] += item.quantity;
                  totalSales30d += item.quantity;
              }
          }
      });

      return {
          history: sparklineData,
          avgDaily: totalSales30d / 30
      };
  };

  // Memoize heavy filtering
  const filteredProducts = useMemo(() => {
      return products.filter(p => {
          const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase());
          const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter;
          const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
          return matchesSearch && matchesCategory && matchesStatus;
      });
  }, [products, searchTerm, categoryFilter, statusFilter]);

  const categories = Array.from(new Set(products.map(p => p.category)));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Product Analysis</h1>
          <p className="text-slate-500 mt-1">Deep dive into individual product performance and metrics.</p>
        </div>
        <div className="flex space-x-2">
            <div className="flex bg-slate-100 p-1 rounded-lg">
                <button onClick={() => setViewMode('grid')} className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-white shadow-sm text-primary-600' : 'text-slate-400'}`}>
                    <Grid className="w-5 h-5" />
                </button>
                <button onClick={() => setViewMode('table')} className={`p-2 rounded-md ${viewMode === 'table' ? 'bg-white shadow-sm text-primary-600' : 'text-slate-400'}`}>
                    <List className="w-5 h-5" />
                </button>
            </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
         <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search products by Name or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex flex-wrap gap-3 w-full md:w-auto">
             <select 
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-4 py-2 border border-slate-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
             >
                 <option value="All">All Categories</option>
                 {categories.map(c => <option key={c} value={c}>{c}</option>)}
             </select>
             <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-slate-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
             >
                 <option value="All">All Statuses</option>
                 <option value="In Stock">In Stock</option>
                 <option value="Low Stock">Low Stock</option>
                 <option value="Out of Stock">Out of Stock</option>
             </select>
          </div>
      </div>

      {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map(product => {
                const metrics = getProductMetrics(product.id);
                return (
                    <ProductAnalysisCard 
                        key={product.id}
                        product={product}
                        salesHistory={metrics.history}
                        avgDailySales={metrics.avgDaily}
                        totalStock={product.stock}
                    />
                );
            })}
             {filteredProducts.length === 0 && (
                <div className="col-span-full p-12 text-center text-slate-500">
                    No products found matching "{searchTerm}"
                </div>
            )}
          </div>
      ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                  <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                              <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Product</th>
                              <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">SKU</th>
                              <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Category</th>
                              <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Stock</th>
                              <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Avg Daily Sales</th>
                              <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">DOI</th>
                              <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                              <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase text-right">Actions</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {filteredProducts.map(product => {
                              const metrics = getProductMetrics(product.id);
                              const doi = metrics.avgDaily > 0 ? (product.stock / metrics.avgDaily).toFixed(1) : '∞';
                              return (
                                  <tr key={product.id} className="hover:bg-slate-50">
                                      <td className="px-6 py-4 font-medium text-slate-900">{product.name}</td>
                                      <td className="px-6 py-4 text-slate-500">{product.sku}</td>
                                      <td className="px-6 py-4 text-slate-600">{product.category}</td>
                                      <td className="px-6 py-4 font-bold text-slate-800">{product.stock}</td>
                                      <td className="px-6 py-4 text-slate-600">{metrics.avgDaily.toFixed(2)}</td>
                                      <td className="px-6 py-4 text-slate-600">{doi}</td>
                                      <td className="px-6 py-4">
                                         <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                             product.status === 'In Stock' ? 'bg-green-100 text-green-700' :
                                             product.status === 'Low Stock' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                                         }`}>{product.status}</span>
                                      </td>
                                      <td className="px-6 py-4 text-right">
                                          <a href={`#/analysis/products/${product.id}`} className="text-primary-600 hover:text-primary-800 font-medium text-sm">View Analysis</a>
                                      </td>
                                  </tr>
                              );
                          })}
                          {filteredProducts.length === 0 && (
                            <tr><td colSpan={8} className="p-8 text-center text-slate-500">No products found matching "{searchTerm}"</td></tr>
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
      )}
    </div>
  );
};

export default ProductAnalysisIndex;
