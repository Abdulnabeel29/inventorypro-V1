
import React, { useState } from 'react';
import { analyzeInventory, InventoryAnalysisData } from '../services/geminiService';
import { mockProducts, mockOrders } from '../services/mockData';
import { Sparkles, RefreshCw, AlertCircle, CheckCircle2, AlertTriangle, XCircle, TrendingUp, Info, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { saveReport, blobToBase64 } from '../services/reportStore';
import { useData } from '../context/DataContext';

const AIAnalysis: React.FC = () => {
  const { addNotification } = useData();
  const [analysis, setAnalysis] = useState<InventoryAnalysisData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await analyzeInventory(mockProducts, mockOrders);
      if (result) {
        setAnalysis(result);
      } else {
        setError("Failed to generate analysis. Please try again.");
      }
    } catch (err) {
      setError("Failed to fetch analysis. Please check your API key and connection.");
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = async () => {
    if (!analysis) return;

    try {
        // Prompt for Title
        const defaultTitle = `Inventory AI Report ${new Date().toLocaleString([], {year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute:'2-digit'})}`;
        const userTitle = window.prompt("Enter a title for this report:", defaultTitle);
        
        // User cancelled
        if (userTitle === null) return;
        
        const finalTitle = userTitle.trim() || defaultTitle;
        const filename = `Inventory_AI_Report_${new Date().toISOString().split('T')[0]}_${Date.now().toString().slice(-4)}.pdf`;

        // Create Document
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 20;
        const contentWidth = pageWidth - (margin * 2);
        let y = 20;

        const checkPageBreak = (heightNeeded: number) => {
            if (y + heightNeeded > pageHeight - margin) {
                doc.addPage();
                y = 20;
            }
        };

        // Title
        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        doc.setTextColor(30, 41, 59); // slate-800
        doc.text(finalTitle, margin, y);
        y += 10;

        // Metadata
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text(`Generated on: ${new Date().toLocaleString()}`, margin, y);
        y += 15;

        // --- 1. Hero Overview ---
        checkPageBreak(40);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(30, 41, 59);
        doc.text("Inventory Health Summary", margin, y);
        y += 8;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        const heroSummary = analysis.heroOverview?.summary || "No summary available.";
        const heroText = doc.splitTextToSize(String(heroSummary), contentWidth);
        doc.text(heroText, margin, y);
        y += (heroText.length * 6) + 15;

        // --- 2. Status Breakdown ---
        checkPageBreak(50);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("Status Breakdown", margin, y);
        y += 10;

        // Helper to draw a status box text
        const drawStatusSection = (title: string, items: string[], color: [number, number, number]) => {
            checkPageBreak(30);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.setTextColor(...color);
            doc.text(title, margin, y);
            y += 6;
            
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.setTextColor(71, 85, 105); // slate-600
            
            const safeItems = Array.isArray(items) ? items : [];
            const text = safeItems.length > 0 ? safeItems.join(", ") : "None";
            const splitText = doc.splitTextToSize(text, contentWidth);
            doc.text(splitText, margin, y);
            y += (splitText.length * 5) + 8;
        };

        const breakdown = analysis.statusBreakdown || { inStock: [], lowStock: [], outOfStock: [] };
        drawStatusSection("In Stock (Healthy)", breakdown.inStock, [22, 163, 74]); // green-600
        drawStatusSection("Low Stock", breakdown.lowStock, [202, 138, 4]); // yellow-600
        drawStatusSection("Out of Stock", breakdown.outOfStock, [220, 38, 38]); // red-600
        y += 5;

        // --- 3. Critical Issues ---
        const criticalIssues = analysis.criticalIssues || [];
        if (criticalIssues.length > 0) {
            checkPageBreak(30);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(14);
            doc.setTextColor(30, 41, 59);
            doc.text("Critical Stock Issues", margin, y);
            y += 10;

            criticalIssues.forEach(issue => {
                checkPageBreak(45);
                // Box
                doc.setDrawColor(226, 232, 240); // slate-200
                doc.setFillColor(255, 255, 255);
                doc.rect(margin, y, contentWidth, 35);
                
                // Border Left Red
                doc.setDrawColor(239, 68, 68); // red-500
                doc.setLineWidth(1);
                doc.line(margin, y, margin, y + 35);
                doc.setLineWidth(0.2); // reset

                let boxY = y + 8;
                doc.setFont("helvetica", "bold");
                doc.setFontSize(12);
                doc.setTextColor(30, 41, 59);
                doc.text(String(issue.name || 'Unknown Item'), margin + 5, boxY);
                
                boxY += 7;
                doc.setFont("helvetica", "normal");
                doc.setFontSize(10);
                doc.setTextColor(71, 85, 105);
                doc.text(`Stock: ${issue.stock}  |  Reorder Level: ${issue.reorderLevel}  |  Status: ${issue.status}`, margin + 5, boxY);
                
                boxY += 7;
                doc.setFont("helvetica", "italic");
                const reason = doc.splitTextToSize(`Reason: ${issue.reason}`, contentWidth - 10);
                doc.text(reason, margin + 5, boxY);
                
                y += 42;
            });
        }

        // --- 4. Reorder Priorities ---
        const priorities = analysis.reorderPriorities || [];
        if (priorities.length > 0) {
            checkPageBreak(30);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(14);
            doc.setTextColor(30, 41, 59);
            doc.text("Reorder Priorities", margin, y);
            y += 10;

            priorities.forEach(p => {
                checkPageBreak(35);
                doc.setDrawColor(226, 232, 240);
                doc.rect(margin, y, contentWidth, 25);
                
                let boxY = y + 8;
                doc.setFont("helvetica", "bold");
                doc.setFontSize(10);
                
                // Color based on priority
                if (p.level === 'Immediate') doc.setTextColor(220, 38, 38);
                else if (p.level === 'High') doc.setTextColor(234, 88, 12);
                else doc.setTextColor(37, 99, 235);
                
                doc.text(`${(p.level || 'Moderate').toUpperCase()} PRIORITY`, margin + 5, boxY);
                
                boxY += 6;
                doc.setTextColor(30, 41, 59);
                doc.setFontSize(11);
                doc.text(String(p.items || ''), margin + 5, boxY);
                
                boxY += 6;
                doc.setTextColor(100, 116, 139);
                doc.setFont("helvetica", "normal");
                doc.setFontSize(9);
                doc.text(String(p.explanation || ''), margin + 5, boxY);

                y += 32;
            });
        }

        // --- 5. Sales Trends ---
        const salesTrends = analysis.salesTrends || { monthlyPerformance: [], observations: [] };
        
        checkPageBreak(40);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(30, 41, 59);
        doc.text("Sales Trends & Observations", margin, y);
        y += 10;

        // Monthly Performance
        if (salesTrends.monthlyPerformance?.length > 0) {
            salesTrends.monthlyPerformance.forEach(mp => {
                checkPageBreak(10);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(10);
                doc.text(String(mp.period || ''), margin + 5, y);
                doc.setFont("helvetica", "normal");
                doc.text(String(mp.details || ''), margin + 50, y);
                y += 7;
            });
            y += 5;
        }

        // Observations
        if (salesTrends.observations?.length > 0) {
            salesTrends.observations.forEach(obs => {
                checkPageBreak(15);
                doc.setFont("helvetica", "normal");
                doc.setFontSize(10);
                const bullet = "•";
                const obsLines = doc.splitTextToSize(`${bullet} ${obs}`, contentWidth);
                doc.text(obsLines, margin, y);
                y += (obsLines.length * 5) + 3;
            });
            y += 10;
        }

        // --- 6. Final Insights ---
        checkPageBreak(40);
        // Background fill simulation (grey box)
        doc.setFillColor(241, 245, 249); // slate-100
        doc.rect(margin, y, contentWidth, 40, 'F');
        
        let finalY = y + 10;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(30, 41, 59);
        doc.text("Strategic Recommendation", margin + 5, finalY);
        
        finalY += 8;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        const finalInsights = analysis.finalInsights || "No final recommendations provided.";
        const finalLines = doc.splitTextToSize(finalInsights, contentWidth - 10);
        doc.text(finalLines, margin + 5, finalY);

        // Save Logic
        const blob = doc.output('blob');
        const base64 = await blobToBase64(blob);

        const reportToSave = {
            id: `report-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            title: finalTitle,
            filename: filename,
            mime: 'application/pdf',
            date: new Date().toISOString(),
            base64: base64,
            size: blob.size
        };

        const saveResult = saveReport(reportToSave);
        
        if (saveResult.success) {
            addNotification("Report Saved", saveResult.message, "success", "/reports/logs");
        } else {
            addNotification("Save Warning", saveResult.message, "warning");
        }

        // Trigger Download
        doc.save(filename);

    } catch (err) {
        console.error("PDF Generation Error:", err);
        addNotification("Report Error", "Failed to generate PDF. Check console for details.", "alert");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center">
            <Sparkles className="w-6 h-6 text-purple-600 mr-2" />
            AI Inventory Intelligence
          </h1>
          <p className="text-slate-500 mt-1">Deep learning analysis of your entire supply chain</p>
        </div>
        <div className="flex space-x-3">
            {analysis && (
                <button
                    onClick={generatePDF}
                    className="flex items-center px-4 py-3 bg-white border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-all font-medium shadow-sm"
                >
                    <Download className="w-5 h-5 mr-2" />
                    Download AI Report
                </button>
            )}
            <button
            onClick={runAnalysis}
            disabled={loading}
            className="flex items-center px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 transition-all shadow-lg shadow-purple-200 font-medium"
            >
            {loading ? (
                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
            ) : (
                <Sparkles className="w-5 h-5 mr-2" />
            )}
            {loading ? 'Processing Data...' : 'Generate New Report'}
            </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-100 flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            {error}
        </div>
      )}

      {!analysis && !loading && !error && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-16 text-center">
            <div className="w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-10 h-10 text-purple-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Ready to Analyze</h3>
            <p className="text-slate-500 max-w-md mx-auto">
                Our AI model will review your product stock levels, recent order history, and reorder thresholds to generate a premium health report.
            </p>
        </div>
      )}

      {loading && (
        <div className="space-y-6 animate-pulse">
            <div className="h-32 bg-slate-200 rounded-xl w-full"></div>
            <div className="grid grid-cols-3 gap-6">
                <div className="h-48 bg-slate-200 rounded-xl"></div>
                <div className="h-48 bg-slate-200 rounded-xl"></div>
                <div className="h-48 bg-slate-200 rounded-xl"></div>
            </div>
            <div className="h-64 bg-slate-200 rounded-xl w-full"></div>
        </div>
      )}

      {analysis && !loading && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 relative">
            
            {/* 1. Hero Overview Box */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-slate-50 to-white px-8 py-4 border-b border-slate-100">
                    <h2 className="text-lg font-bold text-slate-800">Inventory Health Summary</h2>
                </div>
                <div className="p-8">
                    <p className="text-slate-700 text-lg leading-relaxed">{analysis.heroOverview?.summary}</p>
                </div>
            </div>

            {/* 2. Status Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl border border-green-100 shadow-sm overflow-hidden">
                    <div className="bg-green-50 px-6 py-3 border-b border-green-100 flex items-center">
                        <CheckCircle2 className="w-5 h-5 text-green-600 mr-2" />
                        <h3 className="font-bold text-green-800">In Stock (Healthy)</h3>
                    </div>
                    <ul className="p-6 space-y-2">
                        {analysis.statusBreakdown?.inStock?.length > 0 ? (
                            analysis.statusBreakdown.inStock.map((item, i) => (
                                <li key={i} className="flex items-center text-slate-700">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-2"></span>
                                    {item}
                                </li>
                            ))
                        ) : <li className="text-slate-400 italic">No items listed</li>}
                    </ul>
                </div>

                <div className="bg-white rounded-xl border border-yellow-100 shadow-sm overflow-hidden">
                    <div className="bg-yellow-50 px-6 py-3 border-b border-yellow-100 flex items-center">
                        <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
                        <h3 className="font-bold text-yellow-800">Low Stock</h3>
                    </div>
                    <ul className="p-6 space-y-2">
                        {analysis.statusBreakdown?.lowStock?.length > 0 ? (
                            analysis.statusBreakdown.lowStock.map((item, i) => (
                                <li key={i} className="flex items-center text-slate-700">
                                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 mr-2"></span>
                                    {item}
                                </li>
                            ))
                        ) : <li className="text-slate-400 italic">No low stock items</li>}
                    </ul>
                </div>

                <div className="bg-white rounded-xl border border-red-100 shadow-sm overflow-hidden">
                    <div className="bg-red-50 px-6 py-3 border-b border-red-100 flex items-center">
                        <XCircle className="w-5 h-5 text-red-600 mr-2" />
                        <h3 className="font-bold text-red-800">Out of Stock</h3>
                    </div>
                    <ul className="p-6 space-y-2">
                        {analysis.statusBreakdown?.outOfStock?.length > 0 ? (
                            analysis.statusBreakdown.outOfStock.map((item, i) => (
                                <li key={i} className="flex items-center text-slate-700">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-2"></span>
                                    {item}
                                </li>
                            ))
                        ) : <li className="text-slate-400 italic">All items in stock</li>}
                    </ul>
                </div>
            </div>

            {/* 3. Critical Stock Issues */}
            {analysis.criticalIssues?.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
                        <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                        Critical Stock Issues
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {analysis.criticalIssues.map((issue, idx) => (
                            <div key={idx} className="bg-white border-l-4 border-red-500 rounded-r-xl shadow-sm p-5 border-t border-r border-b border-slate-100">
                                <h4 className="font-bold text-slate-900 text-lg mb-3">{issue.name}</h4>
                                <div className="space-y-2 mb-4">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Current Stock:</span>
                                        <span className="font-mono font-bold text-red-600">{issue.stock}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Reorder Level:</span>
                                        <span className="font-mono font-medium text-slate-700">{issue.reorderLevel}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Status:</span>
                                        <span className="font-medium text-red-600 bg-red-50 px-2 rounded">{issue.status}</span>
                                    </div>
                                </div>
                                <div className="pt-3 border-t border-slate-100">
                                    <p className="text-xs text-slate-600 italic">"{issue.reason}"</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 4. Reorder Priorities */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
                     <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
                        <TrendingUp className="w-5 h-5 text-blue-600 mr-2" />
                        Reorder Priorities
                    </h3>
                    <div className="space-y-4">
                        {analysis.reorderPriorities?.map((p, idx) => {
                            const styles = p.level === 'Immediate' 
                                ? 'bg-red-50 border-red-200 text-red-900' 
                                : p.level === 'High' 
                                ? 'bg-orange-50 border-orange-200 text-orange-900' 
                                : 'bg-blue-50 border-blue-200 text-blue-900';
                            
                            const badge = p.level === 'Immediate' ? 'bg-red-200 text-red-800' 
                                : p.level === 'High' ? 'bg-orange-200 text-orange-800' 
                                : 'bg-blue-200 text-blue-800';

                            return (
                                <div key={idx} className={`p-5 rounded-xl border ${styles}`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={`text-xs font-bold px-2 py-1 rounded uppercase tracking-wide ${badge}`}>{p.level} Priority</span>
                                    </div>
                                    <p className="font-bold text-lg mb-1">{p.items}</p>
                                    <p className="text-sm opacity-80">{p.explanation}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 5. Sales Trends */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
                     <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
                        <TrendingUp className="w-5 h-5 text-purple-600 mr-2" />
                        Sales Trends Analysis
                    </h3>
                    
                    <div className="mb-6">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Performance Overview</h4>
                        <div className="bg-slate-50 rounded-xl overflow-hidden border border-slate-100">
                            {analysis.salesTrends?.monthlyPerformance?.map((mp, idx) => (
                                <div key={idx} className="p-4 border-b border-slate-100 last:border-0 flex justify-between items-center">
                                    <span className="font-medium text-slate-700">{mp.period}</span>
                                    <span className="text-slate-600">{mp.details}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Key Observations</h4>
                        <ul className="space-y-3">
                            {analysis.salesTrends?.observations?.map((obs, idx) => (
                                <li key={idx} className="flex items-start">
                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2 mr-3 shrink-0"></span>
                                    <span className="text-slate-600 leading-relaxed">{obs}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            {/* 6. Final Insights */}
            <div className="bg-slate-800 rounded-2xl shadow-lg p-8 text-white relative overflow-hidden">
                <div className="relative z-10 flex items-start gap-4">
                    <div className="p-3 bg-white/10 rounded-lg">
                        <Info className="w-6 h-6 text-blue-300" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white mb-2">Strategic Recommendation</h3>
                        <p className="text-slate-300 leading-relaxed text-lg">{analysis.finalInsights}</p>
                    </div>
                </div>
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-purple-600/20 rounded-full blur-3xl"></div>
            </div>

        </div>
      )}
    </div>
  );
};

export default AIAnalysis;
