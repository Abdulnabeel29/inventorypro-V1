
import React, { useState, useRef, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { Plus, X, Search, Trash2, Upload } from 'lucide-react';
import { Order, OrderItem } from '../types';
import { useSearchParams } from 'react-router-dom';

const Orders: React.FC = () => {
  const { orders, products, addOrder, addNotification } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  
  useEffect(() => {
    const query = searchParams.get('search');
    if (query) {
        setSearchTerm(query);
    }
  }, [searchParams]);

  // Create Order State
  const [newOrder, setNewOrder] = useState<{
      customer: string;
      items: OrderItem[];
  }>({ customer: '', items: [] });
  
  // Line item adding state
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);

  const filteredOrders = orders.filter(o => 
      o.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
      o.customer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalAmount = newOrder.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleAddItem = () => {
      const product = products.find(p => p.id === selectedProductId);
      if (product && quantity > 0) {
          if (quantity > product.stock) {
              addNotification(
                  'Stock Error',
                  `Cannot add ${quantity} of ${product.name}. Only ${product.stock} available.`,
                  'warning'
              );
              return;
          }
          
          setNewOrder(prev => ({
              ...prev,
              items: [...prev.items, {
                  productId: product.id,
                  productName: product.name,
                  quantity: quantity,
                  price: product.price
              }]
          }));
          setSelectedProductId('');
          setQuantity(1);
      }
  };

  const handleRemoveItem = (index: number) => {
      setNewOrder(prev => ({
          ...prev,
          items: prev.items.filter((_, i) => i !== index)
      }));
  };

  const handleSubmitOrder = () => {
      if (!newOrder.customer || newOrder.items.length === 0) return;

      const order: Order = {
          id: `ORD-${Math.floor(Math.random() * 10000)}`,
          customer: newOrder.customer,
          date: new Date().toISOString().split('T')[0],
          status: 'Pending',
          total: totalAmount,
          items: newOrder.items
      };

      addOrder(order);
      setIsModalOpen(false);
      setNewOrder({ customer: '', items: [] });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      const lines = text.split('\n');
      if (lines.length < 2) {
        addNotification("Import Error", "CSV file is empty or missing headers.", 'warning');
        return;
      }

      // Expected Header: Customer, SKU, Quantity
      let successCount = 0;
      let failCount = 0;
      
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;

        const row = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(val => val.trim().replace(/^"|"$/g, ''));
        
        // Basic validation
        if (row.length < 3) {
            failCount++;
            continue;
        }

        const customer = row[0];
        const sku = row[1];
        const quantity = parseInt(row[2]);

        if (!customer || !sku || isNaN(quantity) || quantity <= 0) {
            failCount++;
            continue;
        }

        const product = products.find(p => p.sku === sku);
        
        if (!product) {
            failCount++;
            continue;
        }

        if (product.stock < quantity) {
            failCount++;
            continue;
        }

        const order: Order = {
            id: `ORD-${Math.floor(Math.random() * 100000)}`,
            customer: customer,
            date: new Date().toISOString().split('T')[0],
            status: 'Pending',
            total: product.price * quantity,
            items: [{
                productId: product.id,
                productName: product.name,
                quantity: quantity,
                price: product.price
            }]
        };

        addOrder(order);
        successCount++;
      }

      addNotification(
          'Import Complete', 
          `Created ${successCount} orders. ${failCount} failed due to invalid data or stock limits.`, 
          successCount > 0 ? 'success' : 'warning'
      );
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
           <h1 className="text-2xl font-bold text-slate-800">Orders</h1>
           <p className="text-slate-500 mt-1">Track and manage customer orders</p>
        </div>
        <div className="flex space-x-3">
            <input 
                type="file" 
                accept=".csv" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className="hidden" 
            />
            <button 
                onClick={triggerFileUpload}
                className="flex items-center justify-center px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
            >
                <Upload className="w-5 h-5 mr-2" />
                Import CSV
            </button>
            <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
            >
            <Plus className="w-5 h-5 mr-2" />
            Create Order
            </button>
        </div>
      </div>
      
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200">
           <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search Orders or Customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Order ID</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Items</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-primary-600 hover:text-primary-800 cursor-pointer">
                    #{order.id}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{order.date}</td>
                  <td className="px-6 py-4 text-sm text-slate-900 font-medium">{order.customer}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                      {order.items.reduce((acc, item) => acc + item.quantity, 0)} items
                      <div className="text-xs text-slate-400 truncate max-w-[200px]">
                          {order.items.map(i => i.productName).join(', ')}
                      </div>
                  </td>
                   <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${order.status === 'Delivered' ? 'bg-green-100 text-green-800' :
                        order.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                        order.status === 'Shipped' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-800'
                      }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-900 font-bold text-right">
                    ₹{order.total.toFixed(2)}
                  </td>
                </tr>
              ))}
              {filteredOrders.length === 0 && (
                 <tr><td colSpan={6} className="p-8 text-center text-slate-500">No orders found matching "{searchTerm}"</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Order Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
             <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
                 <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                     <h3 className="text-lg font-bold text-slate-800">Create New Order</h3>
                     <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                 </div>
                 
                 <div className="p-6 overflow-y-auto flex-1">
                     <div className="space-y-6">
                         <div>
                             <label className="block text-sm font-medium text-slate-700 mb-1">Customer Name</label>
                             <input 
                                type="text" 
                                value={newOrder.customer} 
                                onChange={e => setNewOrder({...newOrder, customer: e.target.value})}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" 
                                placeholder="e.g. Acme Corp"
                             />
                         </div>

                         <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                             <h4 className="text-sm font-semibold text-slate-700 mb-3">Add Products</h4>
                             <div className="flex gap-3">
                                 <select 
                                    value={selectedProductId}
                                    onChange={e => setSelectedProductId(e.target.value)}
                                    className="flex-1 px-3 py-2 border rounded-lg text-sm outline-none bg-white"
                                 >
                                     <option value="">Select a product...</option>
                                     {products.map(p => (
                                         <option key={p.id} value={p.id} disabled={p.stock === 0}>
                                             {p.name} (₹{p.price}) - Stock: {p.stock}
                                         </option>
                                     ))}
                                 </select>
                                 <input 
                                    type="number" 
                                    min="1" 
                                    value={quantity} 
                                    onChange={e => setQuantity(parseInt(e.target.value) || 1)}
                                    className="w-20 px-3 py-2 border rounded-lg text-sm outline-none"
                                 />
                                 <button 
                                    onClick={handleAddItem}
                                    disabled={!selectedProductId}
                                    className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 disabled:opacity-50"
                                 >
                                     Add
                                 </button>
                             </div>
                         </div>

                         <div>
                             <h4 className="text-sm font-semibold text-slate-700 mb-2">Order Items ({newOrder.items.length})</h4>
                             {newOrder.items.length === 0 ? (
                                 <p className="text-sm text-slate-400 italic">No items added yet.</p>
                             ) : (
                                 <div className="border rounded-lg divide-y divide-slate-100">
                                     {newOrder.items.map((item, idx) => (
                                         <div key={idx} className="flex justify-between items-center p-3">
                                             <div>
                                                 <p className="font-medium text-slate-800">{item.productName}</p>
                                                 <p className="text-xs text-slate-500">{item.quantity} x ₹{item.price.toFixed(2)}</p>
                                             </div>
                                             <div className="flex items-center gap-4">
                                                 <span className="font-semibold text-slate-700">₹{(item.quantity * item.price).toFixed(2)}</span>
                                                 <button onClick={() => handleRemoveItem(idx)} className="text-red-400 hover:text-red-600">
                                                     <Trash2 className="w-4 h-4" />
                                                 </button>
                                             </div>
                                         </div>
                                     ))}
                                 </div>
                             )}
                         </div>
                     </div>
                 </div>

                 <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                     <div>
                         <p className="text-sm text-slate-500">Total Amount</p>
                         <p className="text-2xl font-bold text-slate-800">₹{totalAmount.toFixed(2)}</p>
                     </div>
                     <button 
                        onClick={handleSubmitOrder}
                        disabled={!newOrder.customer || newOrder.items.length === 0}
                        className="px-6 py-3 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-500/30"
                     >
                         Complete Order
                     </button>
                 </div>
             </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
