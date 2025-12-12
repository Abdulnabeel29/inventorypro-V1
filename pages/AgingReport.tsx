
import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Search, AlertTriangle, Clock, X, Trash2, Calendar } from 'lucide-react';
import { Product } from '../types';

interface AgingItem extends Product {
    lastSoldDate: string | null;
    daysSinceSale: number | null;
    daysInStock: number;
    isSlowMoving: boolean;
}

const AgingReport: React.FC = () => {
  const { products, orders, writeOffProduct } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<AgingItem | null>(null);
  const [writeOffQty, setWriteOffQty] = useState(1);
  const [writeOffReason, setWriteOffReason] = useState('Expired');

  // Calculate Aging Metrics
  const today = new Date();
  
  const agingItems: AgingItem[] = products.map(product => {
      // 1. Find last sold date from orders
      const productOrders = orders.filter(o => o.items.some(i => i.productId === product.id));
      const sortedOrders = productOrders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      let lastSoldDate: string | null = null;
      let daysSinceSale: number | null = null;

      if (sortedOrders.length > 0) {
          lastSoldDate = sortedOrders[0].date;
          const soldDate = new Date(lastSoldDate);
          daysSinceSale = Math.floor((today.getTime() - soldDate.getTime()) / (1000 * 3600 * 24));
      }

      // 2. Calculate days in stock (from restock date)
      // Default to 0 if date is missing or invalid
      let daysInStock = 0;
      if (product.lastRestockDate) {
          const restockDate = new Date(product.lastRestockDate);
          daysInStock = Math.floor((today.getTime() - restockDate.getTime()) / (1000 * 3600 * 24));
      }

      // 3. Flag Slow Moving: If stock > 0 AND (No sales OR Last sale > 90 days ago)
      const isSlowMoving = product.stock > 0 && (daysSinceSale === null || daysSinceSale > 90);

      return {
          ...product,
          lastSoldDate,
          daysSinceSale,
          daysInStock,
          isSlowMoving
      };
  });

  const filteredItems = agingItems.filter(item => 
      (item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
       item.sku.toLowerCase().includes(searchTerm.toLowerCase())) &&
       item.stock > 0 // Only show items currently in stock
  );

  const openWriteOffModal = (item: AgingItem) => {
      setSelectedProduct(item);
      setWriteOffQty(1);
      setWriteOffReason('Expired');
      setIsModalOpen(true);
  };

  const handleWriteOff = () => {
      if (selectedProduct && writeOffQty > 0) {
          if (writeOffQty > selectedProduct.stock) {
              alert("Cannot write off more than current stock.");
              return;
          }
          writeOffProduct(selectedProduct.id, writeOffQty, writeOffReason);
          setIsModalOpen(false);
          setSelectedProduct(null);
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Aging Inventory Report</h1>
          <p className="text-slate-500 mt-1">Identify slow-moving stock and manage write-offs</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center">
              <div className="p-3 bg-yellow-50 text-yellow-600 rounded-lg mr-4">
                  <Clock className="w-6 h-6" />
              </div>
              <div>
                  <p className="text-sm font-medium text-slate-500">Slow Moving Items</p>
                  <p className="text-2xl font-bold text-slate-800">{agingItems.filter(i => i.isSlowMoving).length}</p>
              </div>
          </div>
           <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center">
              <div className="p-3 bg-red-50 text-red-600 rounded-lg mr-4">
                  <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                  <p className="text-sm font-medium text-slate-500">Oldest Stock Age</p>
                  <p className="text-2xl font-bold text-slate-800">{Math.max(...agingItems.map(i => i.daysInStock))} days</p>
              </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg mr-4">
                  <Calendar className="w-6 h-6" />
              </div>
              <div>
                  <p className="text-sm font-medium text-slate-500">Avg. Inventory Age</p>
                  <p className="text-2xl font-bold text-slate-800">
                      {Math.round(agingItems.reduce((acc, i) => acc + i.daysInStock, 0) / (agingItems.length || 1))} days
                  </p>
              </div>
          </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200">
           <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Stock</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Last Restock</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Last Sold</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Age</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{item.name}</div>
                    <div className="text-xs text-slate-500">{item.sku}</div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-800">{item.stock}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{item.lastRestockDate || 'N/A'}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                      {item.lastSoldDate ? (
                          <div>
                              {item.lastSoldDate}
                              <span className="text-xs text-slate-400 block">({item.daysSinceSale} days ago)</span>
                          </div>
                      ) : (
                          <span className="text-slate-400 italic">Never Sold</span>
                      )}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{item.daysInStock} days</td>
                  <td className="px-6 py-4">
                      {item.isSlowMoving ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Slow Moving
                          </span>
                      ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Healthy
                          </span>
                      )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                        onClick={() => openWriteOffModal(item)}
                        className="text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-1 rounded transition-colors"
                    >
                        Write Off
                    </button>
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                  <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-slate-500 italic">No inventory matching criteria found.</td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-red-50">
              <h3 className="text-lg font-bold text-red-800 flex items-center">
                  <Trash2 className="w-5 h-5 mr-2" /> Write-Off Inventory
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-red-400 hover:text-red-600"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-6 space-y-4">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <p className="text-sm text-slate-500">Product</p>
                    <p className="font-medium text-slate-900">{selectedProduct.name}</p>
                    <p className="text-xs text-slate-500">Current Stock: {selectedProduct.stock}</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Quantity to Write Off</label>
                    <input 
                        type="number" 
                        min="1" 
                        max={selectedProduct.stock} 
                        value={writeOffQty}
                        onChange={(e) => setWriteOffQty(parseInt(e.target.value))}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none" 
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
                    <select 
                        value={writeOffReason} 
                        onChange={(e) => setWriteOffReason(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none bg-white"
                    >
                        <option value="Expired">Expired</option>
                        <option value="Damaged">Damaged</option>
                        <option value="Lost">Lost / Theft</option>
                        <option value="Obsolete">Obsolete</option>
                    </select>
                </div>
                
                <div className="bg-red-50 p-3 rounded-lg flex items-start text-red-800 text-sm">
                    <AlertTriangle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                    <p>This action is irreversible. The stock count will be permanently reduced.</p>
                </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end space-x-3">
                <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-lg text-slate-700 hover:bg-slate-100">Cancel</button>
                <button 
                    onClick={handleWriteOff} 
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-sm"
                >
                    Confirm Write-Off
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgingReport;
