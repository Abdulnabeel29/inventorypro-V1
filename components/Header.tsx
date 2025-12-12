
import React, { useState, useRef, useEffect } from 'react';
import { Bell, Search, User, X, Check, Trash2, ArrowRight, Bot } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { AppNotification } from '../types';

const Header: React.FC = () => {
  const { notifications, markNotificationRead, deleteNotification, markAllNotificationsRead, toggleCopilot, products, orders } = useData();
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const notificationRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close notifications when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleGlobalSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      const term = searchQuery.trim().toLowerCase();
      
      // Smart Routing Logic
      
      // 1. Check for Order ID match (active or partial) or Customer Name
      const isOrder = orders.some(o => 
        o.id.toLowerCase().includes(term) || 
        o.customer.toLowerCase().includes(term)
      );

      // 2. Check for Product match
      const isProduct = products.some(p => 
        p.name.toLowerCase().includes(term) || 
        p.sku.toLowerCase().includes(term)
      );

      // 3. Navigate based on priority
      if (isOrder && !isProduct) {
         navigate(`/orders?search=${encodeURIComponent(term)}`);
      } else if (isProduct) {
         navigate(`/analysis/products?search=${encodeURIComponent(term)}`);
      } else if (term.startsWith('ord') || term.startsWith('#')) {
         navigate(`/orders?search=${encodeURIComponent(term)}`);
      } else {
         // Default fallback
         navigate(`/analysis/products?search=${encodeURIComponent(term)}`);
      }
      
      // Optional: Clear search after navigation if desired, but keeping it might be better UX for refinement
      // setSearchQuery('');
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  // Get latest 5 notifications
  const displayNotifications = notifications.slice(0, 5);

  const handleViewAll = () => {
      setShowNotifications(false);
      navigate('/notifications');
  };
  
  const getIconColor = (type: AppNotification['type']) => {
      switch(type) {
          case 'alert': return 'bg-red-500';
          case 'warning': return 'bg-orange-500';
          case 'success': return 'bg-green-500';
          case 'info': return 'bg-blue-500';
          default: return 'bg-slate-400';
      }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-20 relative shrink-0">
      <div className="flex items-center flex-1">
        <div className="relative w-96 hidden md:block">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="w-5 h-5 text-slate-400" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleGlobalSearch}
            placeholder="Search products, SKUs, orders..."
            className="w-full py-2 pl-10 pr-4 text-sm text-slate-700 bg-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {/* Copilot Toggle */}
        <button 
          onClick={toggleCopilot}
          className="p-2 rounded-full text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
          title="Open Smart Copilot"
        >
          <Bot className="w-5 h-5" />
        </button>

        <div className="relative" ref={notificationRef}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className={`p-2 rounded-full relative transition-colors outline-none ${showNotifications ? 'bg-slate-100 text-slate-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full ring-2 ring-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right z-50">
              <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 backdrop-blur-sm">
                <h3 className="text-sm font-semibold text-slate-800">Notifications ({unreadCount})</h3>
                <div className="flex space-x-1">
                    {unreadCount > 0 && (
                        <button onClick={markAllNotificationsRead} className="p-1 text-slate-400 hover:text-primary-600" title="Mark all read">
                            <Check className="w-4 h-4" />
                        </button>
                    )}
                    <button 
                    onClick={() => setShowNotifications(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
              </div>
              <div className="max-h-[360px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-sm">
                    No notifications
                  </div>
                ) : (
                  displayNotifications.map((notification) => (
                    <div 
                        key={notification.id} 
                        className={`p-3 border-b border-slate-50 transition-colors group relative ${notification.read ? 'bg-white' : 'bg-blue-50/30'}`}
                    >
                      <div className="flex items-start pr-8">
                         <div className={`mt-1.5 w-2 h-2 rounded-full mr-3 shrink-0 ${getIconColor(notification.type)}`}></div>
                        <div className="flex-1">
                          <p className={`text-sm leading-snug ${notification.read ? 'text-slate-600' : 'text-slate-900 font-medium'}`}>
                              {notification.title}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5 mb-1">{notification.message}</p>
                          <p className="text-[10px] text-slate-400">{new Date(notification.timestamp).toLocaleString()}</p>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="absolute top-3 right-3 flex flex-col space-y-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!notification.read && (
                             <button onClick={() => markNotificationRead(notification.id)} className="text-slate-400 hover:text-blue-500" title="Mark Read">
                                 <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                             </button>
                          )}
                          <button onClick={() => deleteNotification(notification.id)} className="text-slate-400 hover:text-red-500" title="Remove">
                              <X className="w-3.5 h-3.5" />
                          </button>
                      </div>
                      
                       {notification.link && (
                          <div 
                            onClick={() => { navigate(notification.link!); setShowNotifications(false); markNotificationRead(notification.id); }}
                            className="absolute inset-0 cursor-pointer z-0"
                          ></div>
                       )}
                    </div>
                  ))
                )}
              </div>
               <div className="p-2 text-center border-t border-slate-100 bg-slate-50/50">
                <button 
                    onClick={handleViewAll}
                    className="text-xs text-primary-600 font-medium hover:text-primary-700 flex items-center justify-center w-full"
                >
                  View all notifications <ArrowRight className="w-3 h-3 ml-1" />
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-3 pl-4 border-l border-slate-200">
          <div className="text-right hidden md:block">
            <p className="text-sm font-semibold text-slate-700">RayosManager</p>
            <p className="text-xs text-slate-500">Warehouse Manager</p>
          </div>
          <div className="w-8 h-8 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
