
import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Building2, Plus, MapPin, Package, IndianRupee, Edit2, Trash2, X } from 'lucide-react';
import { Location } from '../types';

const Warehouses: React.FC = () => {
    const { locations, locationStocks, products, addLocation, updateLocation, deleteLocation } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<{name: string, address: string, type: 'Warehouse' | 'Store'}>({
        name: '', address: '', type: 'Warehouse'
    });

    const getLocationStats = (locationId: string) => {
        const stocks = locationStocks.filter(ls => ls.locationId === locationId);
        const totalItems = stocks.reduce((sum, s) => sum + s.quantity, 0);
        const totalValue = stocks.reduce((sum, s) => {
            const product = products.find(p => p.id === s.productId);
            return sum + (s.quantity * (product?.cost || 0));
        }, 0);
        return { totalItems, totalValue };
    };

    const handleOpenModal = (location?: Location) => {
        if (location) {
            setEditingId(location.id);
            setFormData({ name: location.name, address: location.address, type: location.type });
        } else {
            setEditingId(null);
            setFormData({ name: '', address: '', type: 'Warehouse' });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingId) {
            updateLocation({ id: editingId, ...formData });
        } else {
            addLocation({ id: Math.random().toString(36).substr(2, 9), ...formData });
        }
        setIsModalOpen(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Warehouses & Locations</h1>
                    <p className="text-slate-500 mt-1">Manage physical inventory locations</p>
                </div>
                <button 
                    onClick={() => handleOpenModal()}
                    className="flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Add Location
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {locations.map(loc => {
                    const stats = getLocationStats(loc.id);
                    return (
                        <div key={loc.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                            <div className="p-5 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
                                <div className="flex items-start">
                                    <div className={`p-2 rounded-lg mr-3 ${loc.type === 'Warehouse' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                                        <Building2 className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800">{loc.name}</h3>
                                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide mt-1 ${loc.type === 'Warehouse' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                            {loc.type}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex space-x-1">
                                    <button onClick={() => handleOpenModal(loc)} className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => deleteLocation(loc.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <div className="p-5 space-y-4">
                                <div className="flex items-start text-sm text-slate-600">
                                    <MapPin className="w-4 h-4 mr-2 mt-0.5 text-slate-400" />
                                    {loc.address}
                                </div>
                                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1 flex items-center"><Package className="w-3 h-3 mr-1" /> Stock Count</p>
                                        <p className="text-lg font-bold text-slate-800">{stats.totalItems.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1 flex items-center"><IndianRupee className="w-3 h-3 mr-1" /> Inventory Value</p>
                                        <p className="text-lg font-bold text-slate-800">₹{stats.totalValue.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="text-lg font-bold text-slate-800">{editingId ? 'Edit Location' : 'Add New Location'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Location Name</label>
                                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="e.g. North Warehouse" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                                <input required type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="123 Street..." />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                                <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white">
                                    <option value="Warehouse">Warehouse</option>
                                    <option value="Store">Retail Store</option>
                                </select>
                            </div>
                            <div className="pt-4 flex justify-end space-x-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-lg text-slate-700 hover:bg-slate-50">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">Save Location</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Warehouses;
