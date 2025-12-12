import React from 'react';
import { Clock, Activity as ActivityIcon } from 'lucide-react';
import { useData } from '../context/DataContext';

const Activities: React.FC = () => {
  const { activities } = useData();

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <div className="p-2 bg-primary-100 rounded-lg mr-3">
            <ActivityIcon className="w-6 h-6 text-primary-600" />
        </div>
        <div>
            <h1 className="text-2xl font-bold text-slate-800">Activity Log</h1>
            <p className="text-slate-500 mt-1">Complete history of system events and alerts</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-100">
          {activities.length === 0 ? (
             <div className="p-12 text-center text-slate-500">
                <div className="flex justify-center mb-4">
                    <ActivityIcon className="w-12 h-12 text-slate-300" />
                </div>
                <p className="text-lg font-medium text-slate-600">No activity recorded</p>
                <p className="text-sm">System events will appear here.</p>
             </div>
          ) : (
            activities.map((activity) => (
              <div key={activity.id} className="p-6 hover:bg-slate-50 transition-colors flex items-start group">
                 <div className={`mt-1.5 w-3 h-3 rounded-full mr-5 shrink-0 
                    ${activity.type === 'alert' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 
                      activity.type === 'order' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 
                      activity.type === 'stock' ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-slate-400'}`}>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <p className="text-slate-800 font-medium text-lg">{activity.message}</p>
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-slate-100 text-slate-600 uppercase tracking-wide">
                        {activity.type}
                    </span>
                  </div>
                  <div className="flex items-center mt-2 text-sm text-slate-500">
                    <Clock className="w-4 h-4 mr-1.5" />
                    {activity.timestamp}
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

export default Activities;