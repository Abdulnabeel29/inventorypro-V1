
import React, { useState } from 'react';
import { Bell, Check, Trash2, Filter, AlertTriangle, Info, CheckCircle, AlertCircle } from 'lucide-react';
import { useData } from '../context/DataContext';
import { AppNotification } from '../types';

const Notifications: React.FC = () => {
  const { notifications, markNotificationRead, deleteNotification, markAllNotificationsRead } = useData();
  const [filter, setFilter] = useState<'all' | 'unread' | 'alert'>('all');

  const filteredNotifications = notifications.filter(n => {
      if (filter === 'unread') return !n.read;
      if (filter === 'alert') return n.type === 'alert' || n.type === 'warning';
      return true;
  });

  const getIcon = (type: AppNotification['type']) => {
      switch(type) {
          case 'alert': return <AlertCircle className="w-5 h-5 text-red-500" />;
          case 'warning': return <AlertTriangle className="w-5 h-5 text-orange-500" />;
          case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
          case 'info': return <Info className="w-5 h-5 text-blue-500" />;
      }
  };

  const getTypeStyle = (type: AppNotification['type']) => {
       switch(type) {
          case 'alert': return 'bg-red-50 border-red-100';
          case 'warning': return 'bg-orange-50 border-orange-100';
          case 'success': return 'bg-green-50 border-green-100';
          case 'info': return 'bg-blue-50 border-blue-100';
          default: return 'bg-white border-slate-100';
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center">
             <div className="p-2 bg-primary-100 rounded-lg mr-3">
                <Bell className="w-6 h-6 text-primary-600" />
             </div>
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Notifications</h1>
                <p className="text-slate-500 mt-1">Manage your system alerts and messages</p>
            </div>
        </div>
        <div className="flex space-x-2">
            {notifications.some(n => !n.read) && (
                <button 
                    onClick={markAllNotificationsRead}
                    className="flex items-center px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
                >
                    <Check className="w-4 h-4 mr-2" />
                    Mark All Read
                </button>
            )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex space-x-2">
            <button 
                onClick={() => setFilter('all')} 
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
                All
            </button>
            <button 
                onClick={() => setFilter('unread')} 
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'unread' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
                Unread
            </button>
             <button 
                onClick={() => setFilter('alert')} 
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'alert' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
                Alerts & Warnings
            </button>
        </div>

        <div className="divide-y divide-slate-100">
            {filteredNotifications.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                    <p className="text-lg font-medium">No notifications found</p>
                    <p className="text-sm">You're all caught up!</p>
                </div>
            ) : (
                filteredNotifications.map(notification => (
                    <div 
                        key={notification.id} 
                        className={`p-6 flex items-start gap-4 transition-colors hover:bg-slate-50 group ${notification.read ? 'opacity-75' : ''}`}
                    >
                        <div className={`p-2 rounded-full shrink-0 ${notification.read ? 'bg-slate-100' : 'bg-white shadow-sm border border-slate-100'}`}>
                             {getIcon(notification.type)}
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className={`font-semibold ${notification.read ? 'text-slate-600' : 'text-slate-900'}`}>
                                        {notification.title}
                                    </h3>
                                    <p className="text-slate-600 mt-1">{notification.message}</p>
                                    <p className="text-xs text-slate-400 mt-2">{new Date(notification.timestamp).toLocaleString()}</p>
                                </div>
                                <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {!notification.read && (
                                        <button 
                                            onClick={() => markNotificationRead(notification.id)}
                                            className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                                            title="Mark as Read"
                                        >
                                            <Check className="w-4 h-4" />
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => deleteNotification(notification.id)}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
      </div>
    </div>
  );
};

export default Notifications;
