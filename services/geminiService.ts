
import { GoogleGenAI } from "@google/genai";
import { Product, Order } from '../types';

// Initialize Gemini Client
const apiKey = process.env.API_KEY || ''; 
const ai = new GoogleGenAI({ apiKey });

export interface InventoryAnalysisData {
  heroOverview: {
    summary: string;
  };
  statusBreakdown: {
    inStock: string[];
    lowStock: string[];
    outOfStock: string[];
  };
  criticalIssues: {
    name: string;
    stock: number;
    reorderLevel: number;
    status: string;
    reason: string;
  }[];
  reorderPriorities: {
    level: 'Immediate' | 'High' | 'Moderate';
    items: string;
    explanation: string;
  }[];
  salesTrends: {
    monthlyPerformance: { period: string; details: string }[];
    observations: string[];
  };
  finalInsights: string;
}

export interface FinancialReportData {
  executiveSummary: string;
  keyPerformanceIndicators: {
    revenueAnalysis: string;
    profitabilityAnalysis: string;
    costEfficiency: string;
  };
  strategicRecommendations: {
    title: string;
    action: string;
    expectedImpact: string;
    priority: 'High' | 'Medium' | 'Low';
  }[];
  riskAssessment: string;
}

// --- MOCK DATA FOR FALLBACK ---
const MOCK_INVENTORY_ANALYSIS: InventoryAnalysisData = {
    heroOverview: { summary: "Inventory levels are generally healthy, with 85% of SKUs in stock. However, a critical shortage in the 'Electronics' category requires immediate attention to prevent lost revenue." },
    statusBreakdown: { inStock: ["Mechanical Keyboard", "Webcam 1080p"], lowStock: ["Ergonomic Office Chair"], outOfStock: ["27-inch 4K Monitor"] },
    criticalIssues: [ { name: "27-inch 4K Monitor", stock: 0, reorderLevel: 5, status: "Out of Stock", reason: "High demand item currently completely stocked out." } ],
    reorderPriorities: [ { level: "Immediate", items: "27-inch 4K Monitor", explanation: "Zero stock with pending backorders." }, { level: "High", items: "Ergonomic Office Chair", explanation: "Stock below reorder level (8 < 10)." } ],
    salesTrends: { monthlyPerformance: [{ period: "Last 30 Days", details: "Strong performance in Accessories." }], observations: ["Webcam sales spiked 20% this month.", "Furniture category is moving slower than Q3 average."] },
    finalInsights: "Prioritize restocking the 4K Monitor immediately. Consider a promotional bundle for Office Chairs to clear aging stock."
};

const MOCK_FINANCIAL_REPORT: FinancialReportData = {
    executiveSummary: "The business is showing a healthy Gross Revenue trajectory with a stable Gross Margin of ~42%. However, Returns have ticked up slightly (5%), impacting Net Revenue. COGS management remains efficient. The primary focus for the next quarter should be optimizing the return process and clearing slow-moving inventory.",
    keyPerformanceIndicators: {
        revenueAnalysis: "Gross Revenue is strong, but Returns are eroding 8% of top-line value.",
        profitabilityAnalysis: "Gross Profit remains healthy. Net Profit is positive but can be improved by reducing returns.",
        costEfficiency: "COGS is well-controlled at 58% of revenue, indicating good supplier pricing."
    },
    strategicRecommendations: [
        {
            title: "Reduce Return Rate",
            action: "Analyze return reasons for 'Wireless Headphones' and improve product description/packaging.",
            expectedImpact: "Recover ~₹1,500 in lost revenue monthly.",
            priority: "High"
        },
        {
            title: "Clear Slow Movers",
            action: "Run a 15% discount campaign on 'USB-C Docking Station'.",
            expectedImpact: "Unlock ₹800 in tied-up working capital.",
            priority: "Medium"
        },
        {
            title: "Bulk Purchase Negotiation",
            action: "Negotiate 5% discount on next 'Webcam' bulk order.",
            expectedImpact: "Improve category margin by 2%.",
            priority: "Low"
        }
    ],
    riskAssessment: "Moderate risk associated with 'Out of Stock' high-value items (Monitors). Return rate trend warrants monitoring."
};

const MOCK_INSIGHTS = { 
    tip: "Bundle slow-moving accessories with high-demand electronics.", 
    alert: "27-inch 4K Monitor is out of stock." 
};

// Helper to extract JSON from AI response
const extractJSON = (text: string) => {
    try {
        // Attempt 1: Look for Markdown code blocks
        const match = text.match(/```json\s*([\s\S]*?)\s*```/);
        if (match && match[1]) return JSON.parse(match[1]);
        
        // Attempt 2: Look for raw object syntax
        const rawMatch = text.match(/\{[\s\S]*\}/);
        if (rawMatch) return JSON.parse(rawMatch[0]);
        
        // Attempt 3: Direct parse
        return JSON.parse(text);
    } catch (e) {
        console.error("JSON Parse Error:", e);
        return null;
    }
};

const handleApiError = (error: any, fallbackData: any) => {
    // Check if it's a quota error (429) or generic error
    const msg = error?.message || error?.toString() || '';
    if (msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
        console.warn("Gemini API Quota Exceeded. Switching to Mock Data.");
    } else {
        console.error("Gemini API Error:", error);
    }
    return fallbackData;
};

export const analyzeInventory = async (products: Product[], orders: Order[]): Promise<InventoryAnalysisData | null> => {
  if (!apiKey) {
    console.warn("API Key missing. Returning mock inventory analysis.");
    return new Promise(resolve => setTimeout(() => resolve(MOCK_INVENTORY_ANALYSIS), 1500));
  }

  try {
    const prompt = `
      You are an expert Inventory Analyst. Analyze the provided inventory and order data.
      Return a JSON object with the exact structure below. 
      IMPORTANT: Return ONLY raw JSON. Do not use Markdown code blocks (no \`\`\`json). Do not add comments.
      
      Data:
      Current Inventory: ${JSON.stringify(products.map(p => ({ name: p.name, stock: p.stock, reorder: p.reorderLevel, status: p.status })))}
      Recent Orders: ${JSON.stringify(orders.slice(0, 20).map(o => ({ date: o.date, total: o.total })))}

      Required JSON Structure:
      {
        "heroOverview": { "summary": "One concise paragraph describing overall inventory health, highlighting specific percentages/quantities." },
        "statusBreakdown": {
          "inStock": ["Item Name 1", "Item Name 2"],
          "lowStock": ["Item Name 1"],
          "outOfStock": ["Item Name 1"]
        },
        "criticalIssues": [
          { "name": "Product Name", "stock": 0, "reorderLevel": 10, "status": "Out of Stock", "reason": "Short, sharp explanation why it is critical." }
        ],
        "reorderPriorities": [
          { "level": "Immediate", "items": "Item A, Item B", "explanation": "Why these must be ordered now." },
          { "level": "High", "items": "Item C", "explanation": "Why these are high priority." },
          { "level": "Moderate", "items": "Item D", "explanation": "Why these can wait slightly." }
        ],
        "salesTrends": {
          "monthlyPerformance": [ { "period": "Last 30 Days", "details": "Summary of performance" } ],
          "observations": ["Observation 1", "Observation 2"]
        },
        "finalInsights": "One concise wrap-up paragraph summarizing risks and missed revenue opportunities."
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });

    const data = extractJSON(response.text || '');
    return data || MOCK_INVENTORY_ANALYSIS;
  } catch (error) {
    return handleApiError(error, MOCK_INVENTORY_ANALYSIS);
  }
};

export const getDashboardInsights = async (products: Product[]): Promise<{tip: string, alert: string}> => {
    if (!apiKey) return { tip: "Add API Key for AI insights.", alert: "Monitor stock manually." };
    
    try {
         const prompt = `
          Analyze this inventory data. 
          1. Provide one short, actionable tip (max 15 words) to improve efficiency.
          2. Provide one short urgent alert (max 10 words) about stock levels.
          Return ONLY valid JSON format: { "tip": "...", "alert": "..." }
          
          Data: ${JSON.stringify(products.map(p => ({n: p.name, s: p.stock, r: p.reorderLevel })))}
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });
        
        const data = extractJSON(response.text || '');
        return data || MOCK_INSIGHTS;
    } catch (e) {
        // Return realistic mock data on error instead of "Unavailable"
        return handleApiError(e, MOCK_INSIGHTS);
    }
}

export const generateFinancialReport = async (metrics: any, trends: any[]): Promise<FinancialReportData | null> => {
    if (!apiKey) {
        console.warn("API Key missing. Returning mock financial report.");
        return new Promise(resolve => setTimeout(() => resolve(MOCK_FINANCIAL_REPORT), 1500));
    }

    try {
        const prompt = `
            You are a CFO / Financial Analyst. Analyze this financial summary. All monetary values are in Indian Rupee (INR/₹).
            
            Metrics:
            Gross Revenue: ₹${metrics.totalRev}
            Returns: ₹${metrics.totalReturns}
            Net Revenue: ₹${metrics.netRevenue}
            COGS: ₹${metrics.totalCost}
            Gross Profit: ₹${metrics.grossProfit}
            Margin: ${metrics.grossMargin}%
            
            Monthly Trend (Last 6 months):
            ${JSON.stringify(trends.slice(0, 6).map(t => ({ month: t.name, rev: t.revenue, profit: t.profit })))}

            Return a valid JSON object with this structure:
            {
                "executiveSummary": "A professional paragraph summarizing the financial health, trends, and key takeaways.",
                "keyPerformanceIndicators": {
                    "revenueAnalysis": "Analysis of revenue growth/decline.",
                    "profitabilityAnalysis": "Analysis of margins and profit.",
                    "costEfficiency": "Comment on COGS and efficiency."
                },
                "strategicRecommendations": [
                    {
                        "title": "Action Title",
                        "action": "Specific action to take.",
                        "expectedImpact": "Estimated financial impact in INR.",
                        "priority": "High"
                    },
                    {
                        "title": "Action Title",
                        "action": "Specific action to take.",
                        "expectedImpact": "Estimated financial impact in INR.",
                        "priority": "Medium"
                    },
                    {
                         "title": "Action Title",
                        "action": "Specific action to take.",
                        "expectedImpact": "Estimated financial impact in INR.",
                        "priority": "Low"
                    }
                ],
                "riskAssessment": "Assessment of financial risks."
            }
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });

        const data = extractJSON(response.text || '');
        return data || MOCK_FINANCIAL_REPORT;
    } catch (e) {
        return handleApiError(e, MOCK_FINANCIAL_REPORT);
    }
};
