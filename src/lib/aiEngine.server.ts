import {
  salesKpis,
  orderKpis,
  inventoryKpis,
  receivableKpis,
  rankings,
  operationalKpis,
  inventoryTrends,
  receivableTrends,
  today,
  type Range,
} from "./metrics.server";
import { formatCurrency, formatNumber, formatPercent } from "./utils";
import type { Role } from "./shared-types";

export interface AiAnswerResponse {
  answer: string;
  source: "deterministic_gemini" | "deterministic_fallback";
  question: string;
  keyMetrics?: { label: string; value: string }[];
}

export async function askAiAssistant(
  question: string,
  range: Range,
  role: Role = "ADMIN",
): Promise<AiAnswerResponse> {
  const q = question.toLowerCase().trim();

  // Scope verification: check if business/operations related
  const businessKeywords = [
    "sale", "order", "revenue", "product", "customer", "inventory", "stock",
    "outstanding", "overdue", "receivable", "fulfillment", "return", "turnover",
    "performing", "item", "top", "growth", "aov", "average", "pkr", "invoice", "deliver"
  ];

  const isBusinessRelated = businessKeywords.some((kw) => q.includes(kw));

  if (!isBusinessRelated) {
    return {
      answer: "I can't help with that. I can only answer questions about the available Sales & Operations data.",
      source: "deterministic_fallback",
      question,
    };
  }

  // 1. Calculate deterministic ground truth data
  const sKpi = salesKpis(range).data;
  const oKpi = orderKpis(range).data;
  const iKpi = inventoryKpis().data;
  const rKpi = receivableKpis(range).data;
  const rank = rankings(range, 5).data;
  const opKpi = operationalKpis(range).data;
  const iTrends = inventoryTrends(range).data;
  const rTrends = receivableTrends(range).data;

  let verifiedContext = "";
  let fallbackAnswer = "";
  const keyMetrics: { label: string; value: string }[] = [];

  if (q.includes("total sale") || q.includes("sales this") || q.includes("how much are we selling") || q.includes("revenue")) {
    const val = sKpi.totalSales !== null ? formatCurrency(sKpi.totalSales) : "PKR 0";
    const growth = sKpi.salesGrowthPct !== null ? formatPercent(sKpi.salesGrowthPct) : "N/A";
    fallbackAnswer = `Total sales for the selected period are ${val} across ${sKpi.totalOrders} qualifying orders, with an average order value of ${formatCurrency(sKpi.averageOrderValue ?? 0)}. Sales growth compared to the previous period is ${growth}.`;
    verifiedContext = `Total Sales: ${val}, Total Orders: ${sKpi.totalOrders}, AOV: ${formatCurrency(sKpi.averageOrderValue ?? 0)}, Growth: ${growth}`;
    keyMetrics.push({ label: "Total Sales", value: val });
    keyMetrics.push({ label: "Orders", value: String(sKpi.totalOrders) });
  } else if (q.includes("top product") || q.includes("best product") || q.includes("most sale")) {
    const topP = rank.products[0];
    if (topP) {
      fallbackAnswer = `The top performing product is ${topP.name} (${topP.category}), generating ${formatCurrency(topP.sales)} from ${formatNumber(topP.units)} units sold.`;
      verifiedContext = `Top Product: ${topP.name}, Category: ${topP.category}, Sales: ${formatCurrency(topP.sales)}, Units: ${topP.units}`;
      keyMetrics.push({ label: "Top Product", value: topP.name });
      keyMetrics.push({ label: "Sales", value: formatCurrency(topP.sales) });
    } else {
      fallbackAnswer = "No qualifying product sales were recorded in this period.";
      verifiedContext = "No product sales data.";
    }
  } else if (q.includes("top customer") || q.includes("best customer") || q.includes("most revenue")) {
    const topC = rank.customers[0];
    if (topC) {
      const name = role === "VIEWER" ? `Customer #${topC.id}` : topC.name;
      fallbackAnswer = `The top customer by revenue is ${name} (${topC.segment}), generating ${formatCurrency(topC.sales)} across ${topC.orders} orders.`;
      verifiedContext = `Top Customer: ${name}, Segment: ${topC.segment}, Revenue: ${formatCurrency(topC.sales)}, Orders: ${topC.orders}`;
      keyMetrics.push({ label: "Top Customer", value: name });
      keyMetrics.push({ label: "Revenue", value: formatCurrency(topC.sales) });
    } else {
      fallbackAnswer = "No qualifying customer orders were recorded in this period.";
      verifiedContext = "No customer sales data.";
    }
  } else if (q.includes("outstanding") || q.includes("receivable") || q.includes("unpaid")) {
    const val = rKpi.totalOutstanding !== null ? formatCurrency(rKpi.totalOutstanding) : "PKR 0";
    fallbackAnswer = `Total outstanding receivables currently stand at ${val}. Overdue receivables total ${formatCurrency(rKpi.overdueAmount ?? 0)} across ${rKpi.overdueInvoices} overdue invoices.`;
    verifiedContext = `Total Outstanding: ${val}, Overdue Amount: ${formatCurrency(rKpi.overdueAmount ?? 0)}, Overdue Invoices: ${rKpi.overdueInvoices}`;
    keyMetrics.push({ label: "Total Outstanding", value: val });
    keyMetrics.push({ label: "Overdue Amount", value: formatCurrency(rKpi.overdueAmount ?? 0) });
  } else if (q.includes("overdue") || q.includes("late payment")) {
    const overdueVal = formatCurrency(rKpi.overdueAmount ?? 0);
    fallbackAnswer = `There is currently ${overdueVal} overdue across ${rKpi.overdueInvoices} invoices. Average days to pay for paid invoices is ${formatNumber(rKpi.averageDaysToPay ?? 0, 1)} days.`;
    verifiedContext = `Overdue Amount: ${overdueVal}, Overdue Count: ${rKpi.overdueInvoices}, Avg Days to Pay: ${rKpi.averageDaysToPay}`;
    keyMetrics.push({ label: "Overdue Amount", value: overdueVal });
    keyMetrics.push({ label: "Overdue Invoices", value: String(rKpi.overdueInvoices) });
  } else if (q.includes("low stock") || q.includes("reorder") || q.includes("inventory")) {
    const lowCount = iKpi.itemsLowOnStock;
    const outCount = iKpi.itemsOutOfStock;
    const topLow = iTrends.lowStock.slice(0, 3).map((p) => `${p.name} (${p.onHand} left)`).join(", ");
    fallbackAnswer = `There are ${lowCount} products low on stock and ${outCount} products out of stock. Key low stock items include: ${topLow || "None"}. Total stock value is ${formatCurrency(iKpi.totalStockValue ?? 0)}.`;
    verifiedContext = `Low Stock Count: ${lowCount}, Out of Stock: ${outCount}, Total Stock Value: ${formatCurrency(iKpi.totalStockValue ?? 0)}, Low Items: ${topLow}`;
    keyMetrics.push({ label: "Low Stock Items", value: String(lowCount) });
    keyMetrics.push({ label: "Out of Stock", value: String(outCount) });
  } else if (q.includes("fulfillment") || q.includes("delivery") || q.includes("fulfilled")) {
    const rate = oKpi.fulfillmentRatePct !== null ? formatPercent(oKpi.fulfillmentRatePct) : "N/A";
    const avgDays = opKpi.avgFulfillmentDays !== null ? `${formatNumber(opKpi.avgFulfillmentDays, 1)} days` : "N/A";
    fallbackAnswer = `Our order fulfillment rate is ${rate}, with ${oKpi.ordersDelivered} delivered orders out of ${oKpi.totalOrders} total orders. Average fulfillment duration is ${avgDays}.`;
    verifiedContext = `Fulfillment Rate: ${rate}, Delivered: ${oKpi.ordersDelivered}, Total Orders: ${oKpi.totalOrders}, Avg Days: ${avgDays}`;
    keyMetrics.push({ label: "Fulfillment Rate", value: rate });
    keyMetrics.push({ label: "Avg Fulfillment", value: avgDays });
  } else if (q.includes("return rate") || q.includes("returned")) {
    const rate = opKpi.returnRatePct !== null ? formatPercent(opKpi.returnRatePct) : "0%";
    fallbackAnswer = `The product return rate is currently ${rate} for orders in the selected period.`;
    verifiedContext = `Return Rate: ${rate}`;
    keyMetrics.push({ label: "Return Rate", value: rate });
  } else {
    // Summary overview
    const sales = sKpi.totalSales !== null ? formatCurrency(sKpi.totalSales) : "PKR 0";
    fallbackAnswer = `During this period (${range.from} to ${range.to}), VisionPulse recorded ${sales} in total sales across ${sKpi.totalOrders} orders. Total outstanding receivables are ${formatCurrency(rKpi.totalOutstanding ?? 0)}, and inventory value is ${formatCurrency(iKpi.totalStockValue ?? 0)}.`;
    verifiedContext = `Sales: ${sales}, Orders: ${sKpi.totalOrders}, Outstanding: ${formatCurrency(rKpi.totalOutstanding ?? 0)}, Inventory: ${formatCurrency(iKpi.totalStockValue ?? 0)}`;
    keyMetrics.push({ label: "Total Sales", value: sales });
    keyMetrics.push({ label: "Orders", value: String(sKpi.totalOrders) });
  }

  // 2. Try Gemini API if key is present
  const apiKey = process.env["GEMINI_API_KEY"] || "AIzaSyCrOmG9m2xjel91Aqb2KlQxIuepNXeUvL8";
  if (apiKey) {
    try {
      const prompt = `You are the VisionPulse AI Business Assistant. Answer the user question concisely in 1 to 3 short sentences using ONLY the verified ground-truth data provided below. Do not calculate or invent alternative numbers. Always state currency in PKR.

User Question: "${question}"
Date Range: ${range.from} to ${range.to}
Verified Ground-Truth Data: ${verifiedContext}

Rules:
- Be concise, direct, and professional (1 to 3 sentences maximum).
- Put key numbers first.
- Never guess numbers outside the provided ground-truth.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 250, temperature: 0.2 },
          }),
        },
      );

      if (response.ok) {
        const json = (await response.json()) as {
          candidates?: { content?: { parts?: { text?: string }[] } }[];
        };
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && text.trim()) {
          return {
            answer: text.trim(),
            source: "deterministic_gemini",
            question,
            keyMetrics,
          };
        }
      }
    } catch (err) {
      console.warn("Gemini API call skipped or failed, falling back to deterministic answer:", err);
    }
  }

  return {
    answer: fallbackAnswer,
    source: "deterministic_fallback",
    question,
    keyMetrics,
  };
}
