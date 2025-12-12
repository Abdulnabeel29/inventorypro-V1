
import React, { useState, useEffect, useMemo } from 'react';
import { Search, FileText, Calendar, Download, Trash2, Edit2, Eye, AlertTriangle, File, X, Filter } from 'lucide-react';
import { getReports, deleteReport, updateReportTitle, clearReports, SavedReport, formatFileSize, base64ToBlob, REPORT_EVENT } from '../services/reportStore';
import { useData } from '../context/DataContext';
import { Link } from 'react-router-dom';

const ReportLogs: React.FC = () => {
  const { addNotification } = useData();
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'date-desc' | 'date-asc' | 'title-asc'>('date-desc');
  
  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  useEffect(() => {
    // Initial load
    loadReports();

    // Listen for changes (e.g. from AIAnalysis page)
    const handleReportsChanged = () => {
        loadReports();
    };

    window.addEventListener(REPORT_EVENT, handleReportsChanged);
    // Also listen to storage event for cross-tab sync
    window.addEventListener('storage', handleReportsChanged);

    return () => {
        window.removeEventListener(REPORT_EVENT, handleReportsChanged);
        window.removeEventListener('storage', handleReportsChanged);
    };
  }, []);

  const loadReports = () => {
    setReports(getReports());
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this report log?")) {
      deleteReport(id);
      // loadReports is called automatically via event listener dispatch in deleteReport
      addNotification("Report Deleted", "Report removed from logs.", "info");
    }
  };

  const handleClearAll = () => {
    if (window.confirm("Delete ALL report logs? This cannot be undone.")) {
      clearReports();
      addNotification("Logs Cleared", "All report logs have been deleted.", "success");
    }
  };

  const handleDownload = (report: SavedReport) => {
    if (!report.base64) {
      addNotification("Download Failed", "File content missing (storage limit).", "alert");
      return;
    }
    const blob = base64ToBlob(report.base64, report.mime);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = report.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePreview = (report: SavedReport) => {
    if (!report.base64) {
      addNotification("Preview Failed", "File content missing (storage limit).", "alert");
      return;
    }
    const blob = base64ToBlob(report.base64, report.mime);
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const startEdit = (report: SavedReport) => {
    setEditingId(report.id);
    setEditTitle(report.title);
  };

  const saveEdit = (id: string) => {
    if (editTitle.trim()) {
      updateReportTitle(id, editTitle);
      setEditingId(null);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
  };

  const filteredReports = useMemo(() => {
    let filtered = reports.filter(r => 
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      r.filename.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filtered.sort((a, b) => {
      if (sortOrder === 'date-desc') return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sortOrder === 'date-asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (sortOrder === 'title-asc') return a.title.localeCompare(b.title);
      return 0;
    });

    return filtered;
  }, [reports, searchTerm, sortOrder]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">AI Report Logs</h1>
          <p className="text-slate-500 mt-1">Archive of generated inventory insights and reports</p>
        </div>
        {reports.length > 0 && (
          <button 
            onClick={handleClearAll}
            className="flex items-center px-4 py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear All Logs
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50/50">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title or filename..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select 
              value={sortOrder} 
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="title-asc">Title (A-Z)</option>
            </select>
          </div>
        </div>

        {/* List */}
        <div className="divide-y divide-slate-100">
          {filteredReports.length === 0 ? (
            <div className="p-16 text-center text-slate-500">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-800 mb-1">No Reports Found</h3>
              <p className="mb-6">Generate your first AI analysis report to see it here.</p>
              <Link 
                to="/analysis"
                className="inline-flex items-center px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Go to AI Insights
              </Link>
            </div>
          ) : (
            filteredReports.map((report) => (
              <div key={report.id} className="p-5 hover:bg-slate-50 transition-all group flex flex-col sm:flex-row gap-4 sm:items-center">
                
                {/* Icon */}
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${report.base64 ? 'bg-primary-50 text-primary-600' : 'bg-orange-50 text-orange-500'}`}>
                   {report.base64 ? <FileText className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {editingId === report.id ? (
                    <div className="flex items-center gap-2 mb-1">
                      <input 
                        autoFocus
                        type="text" 
                        value={editTitle} 
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="flex-1 px-2 py-1 border border-primary-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(report.id); if (e.key === 'Escape') cancelEdit(); }}
                      />
                      <button onClick={() => saveEdit(report.id)} className="p-1 text-green-600 hover:bg-green-50 rounded"><File className="w-4 h-4"/></button>
                      <button onClick={cancelEdit} className="p-1 text-slate-400 hover:bg-slate-100 rounded"><X className="w-4 h-4"/></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-slate-800 truncate" title={report.title}>{report.title}</h3>
                      <button onClick={() => startEdit(report)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-primary-600 transition-opacity">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                    <span className="flex items-center">
                      <File className="w-3.5 h-3.5 mr-1" />
                      {report.filename}
                    </span>
                    <span className="flex items-center">
                      <Calendar className="w-3.5 h-3.5 mr-1" />
                      {new Date(report.date).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-medium">
                      {formatFileSize(report.size)}
                    </span>
                    {!report.base64 && (
                      <span className="text-orange-600 text-xs font-medium bg-orange-50 px-2 py-0.5 rounded border border-orange-100">
                        Metadata Only
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-start sm:self-center">
                  <button 
                    onClick={() => handlePreview(report)} 
                    disabled={!report.base64}
                    className="p-2 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Preview"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => handleDownload(report)}
                    disabled={!report.base64}
                    className="p-2 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Download"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => handleDelete(report.id)}
                    className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportLogs;
