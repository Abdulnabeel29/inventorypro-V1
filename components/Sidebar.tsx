
import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, BarChart3, LogOut, BrainCircuit, Users, CheckSquare, RotateCcw, Clock, Truck, TrendingUp, Building2, FileText, BarChart } from 'lucide-react';
import { AuthContext } from '../App';

const Sidebar: React.FC = () => {
  const { logout } = React.useContext(AuthContext);

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center space-x-3 px-6 py-3 text-sm font-medium transition-colors ${
      isActive
        ? 'bg-primary-50 text-primary-600 border-r-4 border-primary-600'
        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
    }`;

  return (
    <div className="w-64 bg-white border-r border-slate-200 flex flex-col h-full">
      <div className="h-16 flex items-center px-6 border-b border-slate-100 shrink-0">
        <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center mr-3">
          <Package className="w-5 h-5 text-white" />
        </div>
        <span className="text-xl font-bold text-slate-800">InventoryPro</span>
      </div>

      <nav className="flex-1 py-6 space-y-1 overflow-y-auto">
        <NavLink to="/" className={navClass} end>
          <LayoutDashboard className="w-5 h-5" />
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/analytics" className={navClass} end>
          <TrendingUp className="w-5 h-5" />
          <span>Analytics</span>
        </NavLink>
        <NavLink to="/analysis/products" className={navClass}>
          <BarChart className="w-5 h-5" />
          <span>Product Analysis</span>
        </NavLink>
        <NavLink to="/products" className={navClass}>
          <Package className="w-5 h-5" />
          <span>Products</span>
        </NavLink>
        <NavLink to="/warehouses" className={navClass}>
          <Building2 className="w-5 h-5" />
          <span>Warehouses</span>
        </NavLink>
        <NavLink to="/orders" className={navClass}>
          <ShoppingCart className="w-5 h-5" />
          <span>Orders</span>
        </NavLink>
         <NavLink to="/purchase-orders" className={navClass}>
          <Truck className="w-5 h-5" />
          <span>Purchase Orders</span>
        </NavLink>
         <NavLink to="/returns" className={navClass}>
          <RotateCcw className="w-5 h-5" />
          <span>Returns</span>
        </NavLink>
         <NavLink to="/suppliers" className={navClass}>
          <Users className="w-5 h-5" />
          <span>Suppliers</span>
        </NavLink>
        <NavLink to="/aging-report" className={navClass}>
          <Clock className="w-5 h-5" />
          <span>Aging Report</span>
        </NavLink>
        <NavLink to="/tasks" className={navClass}>
          <CheckSquare className="w-5 h-5" />
          <span>Tasks</span>
        </NavLink>
        
        <div className="px-6 py-2 mt-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Intelligence</h3>
        </div>
        <NavLink to="/analysis" className={navClass} end>
          <BrainCircuit className="w-5 h-5" />
          <span>AI Insights</span>
        </NavLink>
        <NavLink to="/reports/logs" className={navClass}>
          <FileText className="w-5 h-5" />
          <span>Report Logs</span>
        </NavLink>
      </nav>

      <div className="p-4 border-t border-slate-100 shrink-0">
        <button
          onClick={logout}
          className="flex items-center space-x-3 px-4 py-2 w-full text-sm font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
