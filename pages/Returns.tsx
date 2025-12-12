
import React, { useState } from 'react';
import { Plus, Search, RotateCcw, X, AlertCircle } from 'lucide-react';
import { useData } from '../context/DataContext';
import { Order, Return, ReturnItem } from '../types';

const Returns: React.FC = () => {
  const { returns, orders, addReturn } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form State
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  
  // Staging for new return items
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);

  const filteredReturns = returns.filter(r => 
      r.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
      r.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.orderId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOrderSelect = (orderId: string) => {
      const order = orders.find(o => o.id === orderId);
      if (order) {
          setSelectedOrderId(orderId);
          setSelectedOrder(order);
          // Initialize return items based on order items (initially 0 quantity selected)
          setReturnItems(order.items.map(item => ({
              productId: item.productId,
              productName: item.productName,
              quantity: 0,
              reason: 'Defective',
              condition: 'Opened',
              action: 'Discard',
              refundAmount: 0,
              maxQuantity: item.quantity, // Helper prop not in interface, handled in logic
              unitPrice: item.price
          })) as any);
      }
  };

  const handleItemChange = (index: number, field: keyof ReturnItem, value: any) => {
      const updatedItems = [...returnItems];
      updatedItems[index] = { ...updatedItems[index], [field]: value };
      
      // Recalculate refund if quantity changes
      if (field === 'quantity') {
          const qty = parseInt(value) || 0;
          const max = (updatedItems[index] as any).maxQuantity;
          // Clamp quantity
          const finalQty = Math.min(Math.max(0, qty), max);
          updatedItems[index].quantity = finalQty;
          updatedItems[index].refundAmount = finalQty * (updatedItems[index] as any).unitPrice;
      }
      
      setReturnItems(updatedItems);
  };

  const handleSubmit = () => {
      if (!selectedOrder) return;

      const activeItems = returnItems.filter(i => i.quantity > 0);
      if (activeItems.length === 0) return;

      const totalRefund = activeItems.reduce((sum, item) => sum + item.refundAmount, 0);

      const newReturn: Return = {
          id: `RET-${Math.floor(Math.random() * 10000)}`,
          orderId: selectedOrder.id,
          customer: selectedOrder.customer,
          date: new Date().toISOString().split('T')[0],
          status: 'Processed',
          totalRefund: totalRefund,
          items: activeItems.map(({ productId, productName, quantity, reason, condition, action, refundAmount }) => ({
             productId, productName, quantity, reason, condition, action, refundAmount
          }))
      };

      addReturn(newReturn);
      handleCloseModal();
  };

  const handleCloseModal = () => {
      setIsModalOpen(false);
      setSelectedOrderId('');
      setSelectedOrder(null);
      setReturnItems([]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Returns Management</h1>
          <p className="text-slate-500 mt-1">Process customer returns and manage restocking</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5 mr-2" />
          Process Return
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200">
           <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Return ID, Order ID, or Customer..."
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
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Return ID</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Order ID</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Items</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Refund Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReturns.map((ret) => (
                <tr key={ret.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{ret.id}</td>
                  <td className="px-6 py-4 text-primary-600 font-medium">{ret.orderId}</td>
                  <td className="px-6 py-4 text-slate-600">{ret.date}</td>
                  <td className="px-6 py-4 text-slate-800">{ret.customer}</td>
                  <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                          {ret.items.map((item, idx) => (
                              <span key={idx} className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded inline-block w-fit">
                                  {item.quantity}x {item.productName} ({item.action})
                              </span>
                          ))}
                      </div>
                  </td>
                  <td className="px-6 py-4">
                     <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${ret.status === 'Processed' ? 'bg-green-100 text-green-800' :
                        ret.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                      {ret.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-slate-900">₹{ret.totalRefund.toFixed(2)}</td>
                </tr>
              ))}
              {filteredReturns.length === 0 && (
                  <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-slate-500 italic">No returns found.</td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[95vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800">Process New Return</h3>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
                {/* 1. Select Order */}
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Find Order</label>
                    <div className="flex gap-3">
                         <select 
                            value={selectedOrderId}
                            onChange={(e) => handleOrderSelect(e.target.value)}
                            className="flex-1 px-4 py-2 border rounded-lg outline-none bg-white"
                         >
                             <option value="">Select an order to return...</option>
                             {orders.filter(o => o.status === 'Delivered').map(order => (
                                 <option key={order.id} value={order.id}>
                                     {order.id} - {order.customer} ({order.date})
                                 </option>
                             ))}
                         </select>
                    </div>
                </div>

                {/* 2. Select Items */}
                {selectedOrder && (
                    <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
                        <h4 className="font-semibold text-slate-800">Select Items to Return</h4>
                        <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-2 font-medium text-slate-600">Product</th>
                                        <th className="px-4 py-2 font-medium text-slate-600 w-24">Qty Bought</th>
                                        <th className="px-4 py-2 font-medium text-slate-600 w-24">Return Qty</th>
                                        <th className="px-4 py-2 font-medium text-slate-600 w-32">Reason</th>
                                        <th className="px-4 py-2 font-medium text-slate-600 w-32">Condition</th>
                                        <th className="px-4 py-2 font-medium text-slate-600 w-32">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {returnItems.map((item, idx) => (
                                        <tr key={idx} className={item.quantity > 0 ? 'bg-primary-50/30' : ''}>
                                            <td className="px-4 py-3 font-medium text-slate-700">{item.productName}</td>
                                            <td className="px-4 py-3 text-slate-500">{(item as any).maxQuantity}</td>
                                            <td className="px-4 py-3">
                                                <input 
                                                    type="number" 
                                                    min="0"
                                                    max={(item as any).maxQuantity}
                                                    value={item.quantity}
                                                    onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                                                    className="w-16 px-2 py-1 border rounded text-center outline-none focus:ring-1 focus:ring-primary-500"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                 <select 
                                                    value={item.reason}
                                                    onChange={(e) => handleItemChange(idx, 'reason', e.target.value)}
                                                    className="w-full px-2 py-1 border rounded bg-white text-xs outline-none"
                                                    disabled={item.quantity === 0}
                                                 >
                                                     <option value="Defective">Defective</option>
                                                     <option value="Damaged">Damaged</option>
                                                     <option value="Wrong Item">Wrong Item</option>
                                                     <option value="No Longer Needed">No Longer Needed</option>
                                                 </select>
                                            </td>
                                            <td className="px-4 py-3">
                                                 <select 
                                                    value={item.condition}
                                                    onChange={(e) => handleItemChange(idx, 'condition', e.target.value)}
                                                    className="w-full px-2 py-1 border rounded bg-white text-xs outline-none"
                                                    disabled={item.quantity === 0}
                                                 >
                                                     <option value="New">New</option>
                                                     <option value="Opened">Opened</option>
                                                     <option value="Damaged">Damaged</option>
                                                 </select>
                                            </td>
                                            <td className="px-4 py-3">
                                                 <select 
                                                    value={item.action}
                                                    onChange={(e) => handleItemChange(idx, 'action', e.target.value)}
                                                    className={`w-full px-2 py-1 border rounded text-xs outline-none font-medium
                                                        ${item.action === 'Restock' ? 'text-green-700 bg-green-50 border-green-200' : 'text-red-700 bg-red-50 border-red-200'}
                                                    `}
                                                    disabled={item.quantity === 0}
                                                 >
                                                     <option value="Restock">Restock</option>
                                                     <option value="Discard">Discard</option>
                                                 </select>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        
                        <div className="bg-yellow-50 p-3 rounded-lg flex items-start text-yellow-800 text-sm">
                             <AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                             <p>Items marked as <strong>Restock</strong> will automatically be added back to inventory. Items marked as <strong>Discard</strong> will not affect stock levels.</p>
                        </div>

                        <div className="flex justify-end pt-4 border-t border-slate-100">
                             <div className="text-right mr-6">
                                 <p className="text-sm text-slate-500">Total Refund Amount</p>
                                 <p className="text-2xl font-bold text-slate-800">
                                     ₹{returnItems.reduce((sum, item) => sum + item.refundAmount, 0).toFixed(2)}
                                 </p>
                             </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end space-x-3">
                <button type="button" onClick={handleCloseModal} className="px-4 py-2 border rounded-lg text-slate-700 hover:bg-slate-100">Cancel</button>
                <button 
                    onClick={handleSubmit} 
                    disabled={!selectedOrder || returnItems.every(i => i.quantity === 0)}
                    className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                    Confirm Return
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Returns;
