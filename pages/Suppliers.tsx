
import React, { useState } from 'react';
import { Plus, Search, Edit2, Trash2, Mail, Phone, X, TrendingUp, AlertCircle, IndianRupee, Clock } from 'lucide-react';
import { useData } from '../context/DataContext';
import { Supplier, PurchaseOrder } from '../types';

// Simple Sparkline Component
const Sparkline = ({ data, color = "#0ea5e9" }: { data: number[], color?: string }) => {
    if (data.length < 2) return <div className="h-8 w-24 bg-slate-50 rounded"></div>;
    
    const height = 32;
    const width = 96;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    
    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((val - min) / range) * height;
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg width={width} height={height} className="overflow-visible">
            <polyline
                points={points}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            {data.map((val, i) => {
                 const x = (i / (data.length - 1)) * width;
                 const y = height - ((val - min) / range) * height;
                 return <circle key={i} cx={x} cy={y} r="2" fill={color} />
            })}
        </svg>
    );
};

const Suppliers: React.FC = () => {
  const { suppliers, addSupplier, updateSupplier, deleteSupplier, purchaseOrders } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    email: ''
  });

  // KPI Calculations helper
  const getSupplierMetrics = (supplierId: string) => {
      const pos = purchaseOrders.filter(po => po.supplierId === supplierId && po.status === 'Received');
      
      if (pos.length === 0) return {
          totalSpend: 0,
          avgLeadTime: 0,
          onTimeRate: 0,
          leadTimeHistory: []
      };

      const totalSpend = pos.reduce((sum, po) => sum + po.totalCost, 0);
      
      let totalLeadTime = 0;
      let onTimeCount = 0;
      const leadTimeHistory: number[] = [];

      pos.forEach(po => {
          if (po.receivedDate) {
              const orderDate = new Date(po.date).getTime();
              const receiveDate = new Date(po.receivedDate).getTime();
              const expectedDate = new Date(po.expectedDeliveryDate).getTime();
              
              const leadTimeDays = Math.max(0, Math.floor((receiveDate - orderDate) / (1000 * 3600 * 24)));
              totalLeadTime += leadTimeDays;
              leadTimeHistory.push(leadTimeDays);

              if (receiveDate <= expectedDate) {
                  onTimeCount++;
              }
          }
      });

      return {
          totalSpend,
          avgLeadTime: Math.round(totalLeadTime / pos.length),
          onTimeRate: Math.round((onTimeCount / pos.length) * 100),
          leadTimeHistory
      };
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.contact.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
        updateSupplier({ id: editingId, ...formData });
    } else {
        addSupplier({
            id: Math.random().toString(36).substr(2, 9),
            ...formData
        });
    }
    closeModal();
  };

  const openEdit = (supplier: Supplier) => {
      setFormData({ name: supplier.name, contact: supplier.contact, email: supplier.email });
      setEditingId(supplier.id);
      setIsModalOpen(true);
  };

  const closeModal = () => {
      setIsModalOpen(false);
      setEditingId(null);
      setFormData({ name: '', contact: '', email: '' });
  };

  return (
    <div className="space-y-6">
       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Supplier Management</h1>
          <p className="text-slate-500 mt-1">Manage vendor relationships and track performance</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Supplier
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200">
           <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search suppliers..."
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
                        <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Company & Contact</th>
                        <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg Lead Time</th>
                        <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">On-Time %</th>
                        <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Spend</th>
                        <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Perf. Trend</th>
                        <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {filteredSuppliers.map((supplier) => {
                        const metrics = getSupplierMetrics(supplier.id);
                        return (
                            <tr key={supplier.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-medium text-slate-900">{supplier.name}</div>
                                    <div className="text-sm text-slate-600 mb-1">{supplier.contact}</div>
                                    <div className="flex items-center text-xs text-slate-500">
                                        <Mail className="w-3 h-3 mr-1" />
                                        {supplier.email}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center text-slate-700 font-medium">
                                        <Clock className="w-4 h-4 mr-2 text-slate-400" />
                                        {metrics.avgLeadTime > 0 ? `${metrics.avgLeadTime} days` : 'N/A'}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                     {metrics.avgLeadTime > 0 ? (
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                            ${metrics.onTimeRate >= 90 ? 'bg-green-100 text-green-800' :
                                              metrics.onTimeRate >= 75 ? 'bg-yellow-100 text-yellow-800' :
                                              'bg-red-100 text-red-800'
                                            }`}>
                                            {metrics.onTimeRate}%
                                        </span>
                                     ) : (
                                         <span className="text-slate-400 text-sm">N/A</span>
                                     )}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center text-slate-700 font-bold">
                                        <IndianRupee className="w-3.5 h-3.5 text-slate-400 mr-0.5" />
                                        {metrics.totalSpend.toLocaleString()}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    {metrics.leadTimeHistory.length > 1 ? (
                                        <div title="Lead Time Trend (Days)">
                                            <Sparkline data={metrics.leadTimeHistory} color="#6366f1" />
                                        </div>
                                    ) : (
                                        <span className="text-xs text-slate-400">Not enough data</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end space-x-2">
                                        <button onClick={() => openEdit(supplier)} className="p-1 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded">
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => deleteSupplier(supplier.id)} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
      </div>

       {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800">{editingId ? 'Edit Supplier' : 'Add New Supplier'}</h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                    <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="e.g. Acme Inc" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Contact Person</label>
                    <input required type="text" value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="e.g. John Doe" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="john@acme.com" />
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                    <button type="button" onClick={closeModal} className="px-4 py-2 border rounded-lg text-slate-700 hover:bg-slate-50">Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">Save Supplier</button>
                </div>
            </form>
          </div>
        </div>
       )}
    </div>
  );
};

export default Suppliers;
