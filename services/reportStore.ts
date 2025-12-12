
export interface SavedReport {
  id: string;
  title: string;
  filename: string;
  mime: string;
  date: string;
  base64: string | null; // Null if storage quota exceeded
  size: number; // Size in bytes
}

const STORAGE_KEY = 'inventory_ai_reports';
const MAX_REPORTS = 50; // Cap to prevent immediate overflow
export const REPORT_EVENT = 'aiReports:changed';

export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const base64ToBlob = (base64: string, mime: string): Blob => {
  const byteCharacters = atob(base64.split(',')[1]);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mime });
};

export const getReports = (): SavedReport[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Failed to load reports", e);
    return [];
  }
};

const dispatchChangeEvent = () => {
    window.dispatchEvent(new Event(REPORT_EVENT));
};

export const saveReport = (report: SavedReport): { success: boolean, message: string } => {
  const reports = getReports();
  
  // Prepend new report
  const newReports = [report, ...reports];
  
  // Enforce max count cap
  if (newReports.length > MAX_REPORTS) {
    newReports.length = MAX_REPORTS;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newReports));
    dispatchChangeEvent();
    return { success: true, message: "Report saved to logs." };
  } catch (e) {
    // Quota exceeded? Try saving without base64 content
    if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
      console.warn("Storage quota exceeded. Saving metadata only.");
      const metadataReport = { ...report, base64: null };
      const fallbackReports = [metadataReport, ...reports];
      
      // If still too big, trim older reports aggressively
      while (fallbackReports.length > 0) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(fallbackReports));
          dispatchChangeEvent();
          return { success: true, message: "Storage full. Saved metadata only." };
        } catch (innerError) {
          fallbackReports.pop(); // Remove oldest
        }
      }
    }
    return { success: false, message: "Failed to save report log." };
  }
};

export const deleteReport = (id: string) => {
  const reports = getReports().filter(r => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
  dispatchChangeEvent();
};

export const updateReportTitle = (id: string, newTitle: string) => {
  const reports = getReports().map(r => r.id === id ? { ...r, title: newTitle } : r);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
  dispatchChangeEvent();
};

export const clearReports = () => {
  localStorage.removeItem(STORAGE_KEY);
  dispatchChangeEvent();
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
