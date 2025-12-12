
import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { Plus, Search, Filter, Truck, CheckCircle, Clock, AlertTriangle, Calendar, IndianRupee, X } from 'lucide-react';
import { PurchaseOrder } from '../types';
import { useSearchParams } from 'react-router-dom';

const PurchaseOrders: React.FC = () => {
  const { purchaseOrders, suppliers, products, addPurchaseOrder, receivePurchaseOrder } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchParams] = useSearchParams();
  
  // New PO State
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [poItems, setPoItems] = useState<{productId: string, quantity: number, cost: number}[]>([]);
  
  // Item adding state
  const [itemProductId, setItemProductId] = useState('');
  const [itemQty, setItemQty] = useState(10);
  const [itemCost, setItemCost] = useState(0);

  // Check for Draft Params
  useEffect(() => {
    const isDraft = searchParams.get('draft');
    if (isDraft) {
        const passedSupplierName = searchParams.get('supplierId'); 
        const passedProductId = searchParams.get('productId');
        const passedQty = parseInt(searchParams.get('qty') || '0');

        if (passedSupplierName) {
            const supplier = suppliers.find(s => s.name === decodeURIComponent(passedSupplierName)) || suppliers.find(s => s.id === passedSupplierName);
            if (supplier) {
                setSelectedSupplierId(supplier.id);
            }
        }
        
        if (passedProductId && passedQty > 0) {
            const product = products.find(p => p.id === passedProductId);
            if (product) {
                 setPoItems([{
                     productId: product.id,
                     quantity: passedQty,
                     cost: product.cost
                 }]);
            }
        }
        
        // Set Default Date (Today + 14)
        const d = new Date();
        d.setDate(d.getDate() + 14);
        setExpectedDate(d.toISOString().split('T')[0]);

        setIsModalOpen(true);
    }
  }, [searchParams, suppliers, products]);

  // Metrics
  const activePOs = purchaseOrders.filter(po => po.status === 'Pending' || po.status === 'Delayed');
  const pendingCost = activePOs.reduce((sum, po) => sum + po.totalCost, 0);
  
  // Calculate Avg Lead Time (Global)
  const receivedPOs = purchaseOrders.filter(po => po.status === 'Received' && po.receivedDate);
  const totalLeadTime = receivedPOs.reduce((sum, po) => {
      const start = new Date(po.date).getTime();
      const end = new Date(po.receivedDate!).getTime();
      return sum + Math.max(0, (end - start) / (1000 * 3600 * 24));
  }, 0);
  const avgLeadTime = receivedPOs.length ? Math.round(totalLeadTime / receivedPOs.length) : 0;

  const filteredPOs = purchaseOrders.filter(po => 
      po.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.id.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleAddItem = () => {
      const product = products.find(p => p.id === itemProductId);
      if (product && itemQty > 0) {
          setPoItems(prev => [...prev, {
              productId: product.id,
              quantity: itemQty,
              cost: itemCost || product.cost || product.price * 0.6 
          }]);
          setItemProductId('');
          setItemQty(10);
          setItemCost(0);
      }
  };

  const handleCreatePO = () => {
      const supplier = suppliers.find(s => s.id === selectedSupplierId);
      if (supplier && poItems.length > 0 && expectedDate) {
          const totalCost = poItems.reduce((sum, item) => sum + (item.cost * item.quantity), 0);
          
          const newPO: PurchaseOrder = {
              id: `PO-${Math.floor(Math.random() * 10000)}`,
              supplierId: supplier.id,
              supplierName: supplier.name,
              date: new Date().toISOString().split('T')[0],
              expectedDeliveryDate: expectedDate,
              status: 'Pending',
              totalCost: totalCost,
              items: poItems.map(i => {
                  const p = products.find(prod => prod.id === i.productId);
                  return {
                      productId: i.productId,
                      productName: p?.name || 'Unknown',
                      quantity: i.quantity,
                      unitCost: i.cost
                  };
              })
          };

          addPurchaseOrder(newPO);
          setIsModalOpen(false);
          setPoItems([]);
          setSelectedSupplierId('');
          setExpectedDate('');
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Purchase Orders</h1>
          <p className="text-slate-500 mt-1">Manage procurement and incoming stock</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5 mr-2" />
          Create PO
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg mr-4">
                  <Truck className="w-6 h-6" />
              </div>
              <div>
                  <p className="text-sm font-medium text-slate-500">Active POs</p>
                  <p className="text-2xl font-bold text-slate-800">{activePOs.length}</p>
              </div>
          </div>
           <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center">
              <div className="p-3 bg-orange-50 text-orange-600 rounded-lg mr-4">
                  <IndianRupee className="w-6 h-6" />
              </div>
              <div>
                  <p className="text-sm font-medium text-slate-500">Pending Spend</p>
                  <p className="text-2xl font-bold text-slate-800">₹{pendingCost.toLocaleString()}</p>
              </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center">
              <div className="p-3 bg-purple-50 text-purple-600 rounded-lg mr-4">
                  <Clock className="w-6 h-6" />
              </div>
              <div>
                  <p className="text-sm font-medium text-slate-500">Avg Lead Time</p>
                  <p className="text-2xl font-bold text-slate-800">{avgLeadTime} days</p>
              </div>
          </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
           <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search PO # or Supplier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <button className="flex items-center px-3 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">PO Number</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Supplier</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date Ordered</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Expected / Received</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Cost</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPOs.map((po) => (
                <tr key={po.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-primary-600">#{po.id}</td>
                  <td className="px-6 py-4 font-medium text-slate-900">{po.supplierName}</td>
                  <td className="px-6 py-4 text-slate-600">{po.date}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                      {po.status === 'Received' ? (
                          <span className="text-green-600 font-medium">{po.receivedDate}</span>
                      ) : (
                          <span className={new Date(po.expectedDeliveryDate) < new Date() ? 'text-red-500 font-medium' : ''}>
                              {po.expectedDeliveryDate}
                          </span>
                      )}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-800">₹{po.totalCost.toLocaleString()}</td>
                  <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                          ${po.status === 'Received' ? 'bg-green-100 text-green-800' :
                            po.status === 'Delayed' ? 'bg-red-100 text-red-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                          {po.status}
                      </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {po.status !== 'Received' && (
                        <button 
                            onClick={() => receivePurchaseOrder(po.id)}
                            className="text-xs font-medium text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded transition-colors shadow-sm"
                        >
                            Mark Received
                        </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800">Create Purchase Order</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Supplier</label>
                        <select 
                            value={selectedSupplierId}
                            onChange={(e) => setSelectedSupplierId(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white"
                        >
                            <option value="">Select Supplier...</option>
                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div>
                         <label className="block text-sm font-medium text-slate-700 mb-1">Expected Delivery</label>
                         <input 
                            type="date"
                            value={expectedDate}
                            onChange={(e) => setExpectedDate(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                         />
                    </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                     <h4 className="text-sm font-semibold text-slate-700 mb-3">Add Items</h4>
                     <div className="flex gap-3 items-end">
                         <div className="flex-1">
                             <label className="text-xs text-slate-500 mb-1 block">Product</label>
                             <select 
                                value={itemProductId}
                                onChange={(e) => {
                                    setItemProductId(e.target.value);
                                    // Auto-set cost estimate based on current product cost or price * 0.6
                                    const p = products.find(prod => prod.id === e.target.value);
                                    if(p) setItemCost(p.cost || Number((p.price * 0.6).toFixed(2)));
                                }}
                                className="w-full px-3 py-2 border rounded-lg text-sm outline-none bg-white"
                             >
                                 <option value="">Select Product...</option>
                                 {products.filter(p => p.supplier === suppliers.find(s => s.id === selectedSupplierId)?.name).map(p => (
                                     <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>
                                 ))}
                                 {/* Fallback to show all if supplier mismatch or generic */}
                                 {products.filter(p => p.supplier !== suppliers.find(s => s.id === selectedSupplierId)?.name).map(p => (
                                     <option key={p.id} value={p.id}>{p.name} (Other Supplier)</option>
                                 ))}
                             </select>
                         </div>
                         <div className="w-20">
                             <label className="text-xs text-slate-500 mb-1 block">Qty</label>
                             <input 
                                type="number" 
                                min="1" 
                                value={itemQty} 
                                onChange={e => setItemQty(parseInt(e.target.value))}
                                className="w-full px-3 py-2 border rounded-lg text-sm outline-none"
                             />
                         </div>
                         <div className="w-24">
                             <label className="text-xs text-slate-500 mb-1 block">Unit Cost (₹)</label>
                             <input 
                                type="number" 
                                min="0" 
                                step="0.01"
                                value={itemCost} 
                                onChange={e => setItemCost(parseFloat(e.target.value))}
                                className="w-full px-3 py-2 border rounded-lg text-sm outline-none"
                             />
                         </div>
                         <button 
                            onClick={handleAddItem}
                            disabled={!itemProductId}
                            className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 disabled:opacity-50 h-[38px]"
                         >
                             Add
                         </button>
                     </div>
                </div>

                <div>
                     <h4 className="text-sm font-semibold text-slate-700 mb-2">Order Items ({poItems.length})</h4>
                     {poItems.length === 0 ? (
                         <div className="text-sm text-slate-400 italic text-center py-4 border border-dashed rounded-lg">No items added yet.</div>
                     ) : (
                         <div className="border rounded-lg divide-y divide-slate-100 max-h-40 overflow-y-auto">
                             {poItems.map((item, idx) => {
                                 const p = products.find(prod => prod.id === item.productId);
                                 return (
                                     <div key={idx} className="flex justify-between items-center p-3 text-sm">
                                         <div>
                                             <span className="font-medium text-slate-800">{p?.name}</span>
                                             <span className="text-slate-500 ml-2">{item.quantity} units @ ₹{item.cost}</span>
                                         </div>
                                         <button onClick={() => setPoItems(prev => prev.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600">
                                             <X className="w-4 h-4" />
                                         </button>
                                     </div>
                                 );
                             })}
                         </div>
                     )}
                </div>
                
                 <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                     <div>
                         <p className="text-sm text-slate-500">Estimated Total</p>
                         <p className="text-xl font-bold text-slate-800">
                             ₹{poItems.reduce((sum, i) => sum + (i.cost * i.quantity), 0).toFixed(2)}
                         </p>
                     </div>
                     <button 
                        onClick={handleCreatePO}
                        disabled={!selectedSupplierId || poItems.length === 0 || !expectedDate}
                        className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                     >
                         Confirm Order
                     </button>
                 </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrders;
