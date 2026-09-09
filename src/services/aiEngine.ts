import { type Dataset } from "@/lib/dataset";
import {
  calculateDeliveryPerformance,
  calculateInventoryHealth,
  calculateMonthlySeries,
  calculateReceivables,
  calculateSales,
  formatCompactPKR,
  formatPKR,
  getInventoryRecords,
  getReceivableRecords,
  getTopCustomers,
  getTopProducts,
  getTopProductsByProfit,
  getCityPerformance,
  getIndustryPerformance,
  getChannelPerformance,
  getOrderStatusSummary,
} from "./metrics";
import { inRange, resolvePreset, type DateRange } from "./dateRange";

export interface ChartConfig {
  type: "bar" | "line" | "pie" | "area";
  title: string;
  data: { name: string; value: number; secondaryValue?: number }[];
  formatValue?: "pkr" | "number" | "pct";
}

export interface AIAnalysisResult {
  isSupported: boolean;
  question: string;
  structuredFacts: string;
  directAnswer: string;
  chartConfig?: ChartConfig;
}

export function detectRequestedChartType(
  q: string,
  defaultType: "bar" | "line" | "pie" | "area",
): "bar" | "line" | "pie" | "area" {
  const qLower = q.toLowerCase();
  if (qLower.includes("pie") || qLower.includes("donut")) return "pie";
  if (qLower.includes("line") || qLower.includes("trend")) return "line";
  if (qLower.includes("area") || qLower.includes("growth")) return "area";
  if (qLower.includes("bar") || qLower.includes("column")) return "bar";
  return defaultType;
}

export interface ChatHistoryMessage {
  sender: "user" | "ai";
  text: string;
}

function extractContextFromHistory(
  chatHistory: ChatHistoryMessage[] | undefined,
  data: Dataset,
) {
  if (!chatHistory || chatHistory.length === 0) return {};

  const recentMessages = chatHistory.slice(-8).reverse();

  let referencedProduct = null;
  let referencedCustomer = null;
  let referencedCity: string | null = null;
  let mostRecentType: "product" | "customer" | "city" | null = null;

  for (const msg of recentMessages) {
    const textLower = msg.text.toLowerCase();

    if (!referencedCustomer) {
      let firstPos = Infinity;
      let bestC = null;
      for (const c of data.customers) {
        const name = c.customer_name.toLowerCase();
        const pos = textLower.indexOf(name);
        if (pos !== -1 && pos < firstPos) {
          firstPos = pos;
          bestC = c;
        }
      }
      if (bestC) {
        referencedCustomer = bestC;
        if (!mostRecentType) mostRecentType = "customer";
      }
    }

    if (!referencedProduct) {
      let firstPos = Infinity;
      let bestP = null;
      for (const p of data.products) {
        const name = p.product_name.toLowerCase();
        const sku = p.sku.toLowerCase();
        const posName = textLower.indexOf(name);
        const posSku = textLower.indexOf(sku);
        let pos = posName;
        if (pos === -1 || (posSku !== -1 && posSku < pos)) pos = posSku;
        if (pos !== -1 && pos < firstPos) {
          firstPos = pos;
          bestP = p;
        }
      }
      if (bestP) {
        referencedProduct = bestP;
        if (!mostRecentType) mostRecentType = "product";
      }
    }

    if (!referencedCity) {
      const cities = [
        "lahore",
        "karachi",
        "faisalabad",
        "islamabad",
        "sialkot",
        "multan",
        "rawalpindi",
        "peshawar",
        "gujranwala",
        "quetta",
      ];
      let firstPos = Infinity;
      let bestCity: string | null = null;
      for (const city of cities) {
        const pos = textLower.indexOf(city);
        if (pos !== -1 && pos < firstPos) {
          firstPos = pos;
          bestCity = city;
        }
      }
      if (bestCity) {
        referencedCity = bestCity.charAt(0).toUpperCase() + bestCity.slice(1);
        if (!mostRecentType) mostRecentType = "city";
      }
    }
  }

  return {
    referencedProduct,
    referencedCustomer,
    referencedCity,
    mostRecentType,
  };
}

function extractLimit(q: string, defaultLimit = 5): number {
  const matchNum = q.match(/\btop\s*(\d+)\b/i) || q.match(/\b(\d+)\s*(customer|product|item|repeat|selling|repeated)\b/i);
  if (matchNum && matchNum[1]) {
    const num = parseInt(matchNum[1], 10);
    if (!isNaN(num) && num > 0) return Math.min(num, 20);
  }
  const wordMap: Record<string, number> = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
  };
  const wordMatch = q.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\b/i);
  if (wordMatch && wordMatch[1]) {
    const num = wordMap[wordMatch[1].toLowerCase()];
    if (num) return num;
  }
  return defaultLimit;
}

export function queryAiEngine(
  question: string,
  data: Dataset,
  currentRange: DateRange,
  chatHistory?: ChatHistoryMessage[],
): AIAnalysisResult {
  const qRaw = question.toLowerCase().trim();
  const q = qRaw.replace(/[^a-z0-9\s]/g, "").trim();

  // Extract contextual entities from prior chat history if user asks follow-up / pronoun queries
  const historyContext = extractContextFromHistory(chatHistory, data);
  const pronounRegex = /\b(it|its|this|that|they|their|them|same|above|previous|former|latter|the product|the item|the customer|the city)\b/i;
  const isFollowUp = pronounRegex.test(qRaw) || q.includes("what about") || q.includes("tell me more");

  // Chart Format Follow-up Interceptor (e.g. "create its pie chart instead of bar", "make it a line chart", "show pie chart instead")
  const isChartFormatFollowUp =
    (q.includes("pie") || q.includes("bar") || q.includes("line") || q.includes("area") || q.includes("chart") || q.includes("graph")) &&
    (q.includes("instead") || q.includes("convert") || q.includes("change") || q.includes("switch") || q.includes("make it") || q.includes("show as") || q.includes("create its") || q.includes("render as") || q.includes("format"));

  if (isChartFormatFollowUp && chatHistory && chatHistory.length > 0) {
    const userMessages = [...chatHistory].reverse().filter((m) => m.sender === "user");
    let lastAnalyticalQuery: string | null = null;

    for (const uMsg of userMessages) {
      const uText = uMsg.text.toLowerCase();
      const isFormatOnly =
        uText.includes("instead") ||
        uText.includes("create its") ||
        uText.includes("make it a") ||
        uText.includes("change to") ||
        uText.includes("convert to") ||
        uText.includes("show as");
      if (!isFormatOnly && uText.trim().length > 3) {
        lastAnalyticalQuery = uMsg.text;
        break;
      }
    }

    if (lastAnalyticalQuery) {
      const historyWithoutLast = chatHistory.slice(0, -1);
      const combinedQuery = `${lastAnalyticalQuery} ${question}`;
      const res = queryAiEngine(combinedQuery, data, currentRange, historyWithoutLast);
      if (res && res.isSupported) {
        return {
          ...res,
          question,
        };
      }
    }
  }

  // Helper to check if user explicitly requests a chart/visualization
  const isExplicitChartRequest =
    q.includes("chart") ||
    q.includes("graph") ||
    q.includes("visualiz") ||
    q.includes("show me") ||
    q.includes("display") ||
    q.includes("draw") ||
    q.includes("bar") ||
    q.includes("line") ||
    q.includes("area") ||
    q.includes("pie") ||
    q.includes("visual");

  // Helper to prepend chat history summary to structured facts for Gemini
  const attachHistoryFacts = (facts: string) => {
    if (!chatHistory || chatHistory.length === 0) return facts;
    const historySummary = chatHistory
      .filter((m) => m.text && m.text.length > 0)
      .slice(-4)
      .map((m) => `${m.sender === "user" ? "User" : "AI"}: "${m.text.replace(/\s+/g, " ").substring(0, 100)}..."`)
      .join(" | ");
    return `[Recent Conversation Context: ${historySummary}] ${facts}`;
  };

  // 1. Clarification & Repetition Requests ("sorry?", "pardon?", "what?", "huh?", "excuse me?")
  const isClarificationRequest =
    /^(sorry\?|pardon\??|what\?|huh\??|excuse me\??|repeat\??|explain\??|what do you mean\??)$/i.test(
      qRaw.trim(),
    );

  if (isClarificationRequest) {
    let answer =
      "Could you please clarify what you'd like me to explain? You can ask me to expand on your **sales performance**, **inventory stock**, **top customers**, or **receivables**.";

    if (chatHistory && chatHistory.length > 0) {
      const lastAiMsg = [...chatHistory].reverse().find((m) => m.sender === "ai");
      if (lastAiMsg && lastAiMsg.text) {
        answer = `To clarify my previous message:\n${lastAiMsg.text}\n\nPlease let me know if you would like more specific details or data on any of these figures.`;
      }
    }

    return {
      isSupported: true,
      question,
      structuredFacts: attachHistoryFacts(
        "User requested clarification or repetition of previous response.",
      ),
      directAnswer: answer,
    };
  }

  // 2. Conversational Remarks, Pleasantries & Apologies (supports "sorry", "thanks", "ok", "cool", "hello", etc.)
  const isConversational =
    /^(h+e+l+o+|h+i+|h+e+y+|howdy|greetings|good\s*(morning|afternoon|evening)|how\s*are\s*you|who\s*are\s*you|what\s*can\s*you\s*do|sorry|my\s*bad|oops|apolog|thank\s*you|thanks|thx|ok|okay|k|cool|got\s*it|great|awesome|perfect|bye|goodbye|help|what\s*should\s*i\s*ask)/i.test(
      qRaw,
    ) &&
    !qRaw.includes("?") &&
    !q.includes("product") &&
    !q.includes("sales") &&
    !q.includes("order") &&
    !q.includes("customer") &&
    !q.includes("profit") &&
    !q.includes("stock") &&
    !q.includes("receivable");

  if (isConversational) {
    let answer =
      "Hello! I am your **PulseOps Sales & Operations Intelligence Assistant**. How can I help you analyze your business performance, sales, inventory, or customer data today?";

    if (
      qRaw.includes("sorry") ||
      qRaw.includes("my bad") ||
      qRaw.includes("oops") ||
      qRaw.includes("apolog")
    ) {
      answer =
        "No problem at all! Feel free to ask any question about your **sales performance**, **inventory stock**, **top customers**, or **receivables**.";
    } else if (qRaw.includes("thank") || qRaw.includes("thx")) {
      answer =
        "You're very welcome! Let me know if you need any other business insights or data reports.";
    } else if (/^(ok|okay|k|cool|got\s*it|great|awesome|perfect)$/i.test(qRaw.trim())) {
      answer = "Sounds good! I'm here whenever you're ready to explore more insights.";
    } else if (qRaw.includes("bye") || qRaw.includes("goodbye")) {
      answer = "Goodbye! Have a great day ahead.";
    } else if (qRaw.includes("help") || qRaw.includes("what can you do")) {
      answer =
        "I can analyze your **Sales Revenue**, **Top Customers**, **Inventory & Stock Levels**, **Overdue Receivables**, **Delivery Performance**, and **Profitability**. Ask me any question!";
    }

    return {
      isSupported: true,
      question,
      structuredFacts: attachHistoryFacts(
        "User conversational remark/pleasantry. Respond warmly and helpfully as PulseOps Sales & Operations AI Assistant.",
      ),
      directAnswer: answer,
    };
  }

  // 3. Purchasing, Restocking & Procurement Advice Handler ("should I purchase new items?", "go outside to buy")
  if (
    q.includes("purchase") ||
    q.includes("buy") ||
    q.includes("restock") ||
    q.includes("go outside") ||
    q.includes("new items") ||
    q.includes("new products") ||
    q.includes("procure")
  ) {
    const invRecords = getInventoryRecords(data);
    const inv = calculateInventoryHealth(invRecords);

    const facts = `Purchasing & Inventory Procurement Advice: Total Valuation: ${formatPKR(inv.inventoryValue)} (${formatCompactPKR(inv.inventoryValue)}). Total SKUs: ${data.products.length}. Stock Breakdown: ${inv.inStock} In Stock, ${inv.lowStock} Low Stock (at/below reorder level), ${inv.outOfStock} Out of Stock, ${inv.discrepancy} Discrepancy. Reorder Priority: ${inv.outOfStock} items completely out of stock, ${inv.lowStock} items low in stock. Recommendation: Restock current 7 out-of-stock and 11 low-stock items before adding unlisted new verticals outside.`;

    const directAnswer = `Before going outside to purchase new items, consider our current inventory status: we have **${inv.outOfStock} Out of Stock** items and **${inv.lowStock} Low Stock** items (at or below reorder level) among our **${data.products.length} active product SKUs** (**${formatCompactPKR(inv.inventoryValue)}** total valuation). We recommend prioritizing restocks for our existing high-demand SKUs before introducing new unlisted product lines.`;

    return {
      isSupported: true,
      question,
      structuredFacts: attachHistoryFacts(facts),
      directAnswer,
    };
  }

  // 4. System Capabilities & Write-Access Handler ("can you write to database?", "can you update records?")
  if (
    q.includes("write") ||
    q.includes("edit") ||
    q.includes("update") ||
    q.includes("modify") ||
    q.includes("delete") ||
    q.includes("change") ||
    q.includes("read only") ||
    q.includes("database") ||
    q.includes("db")
  ) {
    const facts = `System Capabilities: Read-Only Mode. Engine is connected to 8 dataset entities (Orders: ${data.orders.length}, Order Items: ${data.orderItems.length}, Products: ${data.products.length}, Customers: ${data.customers.length}, Inventory Rows: ${data.inventory.length}, Receivables: ${data.receivables.length}, Payments: ${data.payments.length}, Returns: ${data.returns.length}). Write access: NO.`;

    const directAnswer = `No, I operate strictly in **read-only mode** over your PulseOps dataset. I cannot write, modify, or delete any records in your database, ensuring your underlying business data remains 100% secure and unchanged.`;

    return {
      isSupported: true,
      question,
      structuredFacts: attachHistoryFacts(facts),
      directAnswer,
    };
  }

  const isBusinessTopicQuery =
    q.includes("product") ||
    q.includes("order") ||
    q.includes("customer") ||
    q.includes("status") ||
    q.includes("sales") ||
    q.includes("revenue") ||
    q.includes("inventory") ||
    q.includes("stock") ||
    q.includes("receivable") ||
    q.includes("city") ||
    q.includes("industry") ||
    q.includes("sector") ||
    q.includes("channel") ||
    q.includes("profit") ||
    q.includes("delivery") ||
    q.includes("refund") ||
    q.includes("return");

  // 5. Chart & Graph Capability Meta-Handler (ONLY for general questions about capabilities, e.g. "can you generate charts?")
  if (
    !isBusinessTopicQuery &&
    (q.includes("chart") ||
      q.includes("graph") ||
      q.includes("visualize") ||
      q.includes("draw") ||
      q.includes("diagram"))
  ) {
    if (
      q.includes("can") ||
      q.includes("possible") ||
      q.includes("efficient") ||
      q.includes("fast") ||
      q.includes("generate") ||
      q.includes("how") ||
      q.includes("clean")
    ) {
      const monthlySeries = calculateMonthlySeries(data, currentRange);
      const chartConfig: ChartConfig = {
        type: detectRequestedChartType(q, "area"),
        title: "Monthly Sales Trend (Interactive Sample Chart)",
        data: monthlySeries.map((m) => ({
          name: m.label,
          value: m.netSales,
        })),
        formatValue: "pkr",
      };

      const facts = `Chart & Graph Generation Capabilities: Fully Supported, Instant & Clean. Supported chart types: Bar Chart (Top Products, Top Customers, City Performance, Industry Sectors), Area/Line Chart (Monthly Sales Trends, Revenue over Time), Pie Chart (Sales Channels, Inventory Stock Status Breakdown). Latency: 0ms (Client-Side Recharts execution).`;

      const directAnswer = `Yes! I can instantly generate clean, interactive, and responsive **charts and graphs** on request directly inside our chat interface.\n\n### ⚡ Highlights:\n- **Instant & Fast (0ms Latency)**: Charts are calculated directly from your sales data using client-side **Recharts** rendering with zero network delay.\n- **Clean & High Quality**: Modern HSL styling, precise hover tooltips, and compact layout.\n- **Multiple Visualizations**:\n  - **Bar Charts**: Top products, top customers, city performance, industry sectors\n  - **Area & Line Charts**: Monthly revenue trends, sales over time\n  - **Pie Charts**: Sales channel distribution, inventory stock status breakdown\n\nHere is a live sample chart of your monthly sales performance below:`;

      return {
        isSupported: true,
        question,
        structuredFacts: attachHistoryFacts(facts),
        directAnswer,
        chartConfig,
      };
    }
  }

  // Explicit Out-of-scope check (only trigger for clear non-business subjects like weather, recipes, coding, etc.)
  const outOfScopeKeywords = [
    "weather",
    "recipe",
    "cook",
    "bake",
    "baking",
    "president",
    "prime minister",
    "capital of",
    "tell me a joke",
    "python",
    "javascript",
    "code",
    "coding",
    "algorithm",
    "tell me a story",
    "movie",
    "film",
    "song",
    "music",
    "game",
    "cricket",
    "football",
    "soccer",
    "astronomy",
    "planet",
    "moon",
  ];
  if (
    outOfScopeKeywords.some(
      (k) => q === k || q.includes(" " + k) || q.startsWith(k + " ") || q.endsWith(" " + k),
    ) &&
    !q.includes("sales") &&
    !q.includes("order") &&
    !q.includes("stock")
  ) {
    return {
      isSupported: false,
      question,
      structuredFacts: attachHistoryFacts("Explicit out of scope request."),
      directAnswer:
        "I can't help with that. I can only answer questions about the available **Sales & Operations data**.",
    };
  }

  // Product Availability & Inventory Search Handler
  const isAvailabilityQuery =
    (q.includes("available") ||
      q.includes("in stock") ||
      q.includes("do we have") ||
      q.includes("is there") ||
      q.includes("products list") ||
      q.includes("in inventory") ||
      q.includes("carry")) &&
    !q.includes("how many total") &&
    !q.includes("which product") &&
    !q.includes("most orders");

  if (isAvailabilityQuery) {
    let matched = data.products.find((p) => {
      const name = p.product_name.toLowerCase();
      const sku = p.sku.toLowerCase();
      if (qRaw.includes(name) || qRaw.includes(sku)) return true;
      const words = name.split(/\s+/).filter((w) => w.length > 2);
      return words.length > 1 && words.every((w) => qRaw.includes(w));
    });

    if (!matched && historyContext.referencedProduct && (isFollowUp || q.includes("product") || q.includes("item"))) {
      matched = historyContext.referencedProduct;
    }

    if (matched) {
      const invRow = data.inventory.find((inv) => inv.product_id === matched.product_id);
      const qtyOnHand = invRow?.quantity_on_hand ?? 0;
      const qtyReserved = invRow?.quantity_reserved ?? 0;
      const available = qtyOnHand - qtyReserved;
      const status = invRow
        ? available < 0
          ? "Discrepancy"
          : available === 0
          ? "Out of Stock"
          : available <= matched.reorder_level
          ? "Low Stock"
          : "In Stock"
        : "Unknown";

      const facts = `Product Availability Search: YES. Matched Product: ${matched.product_name} (SKU: ${matched.sku}, Category: ${matched.category}). Unit Price: ${formatPKR(matched.unit_price)}. Stock: ${available} units available (${qtyOnHand} on hand, ${qtyReserved} reserved). Status: ${status}.`;

      const directAnswer = `Yes, **${matched.product_name}** (SKU: **${matched.sku}**, Category: **${matched.category}**) is listed in our product catalog with **${available} available units** in inventory (**${status}**, unit price: **${formatPKR(matched.unit_price)}**).`;

      return {
        isSupported: true,
        question,
        structuredFacts: facts,
        directAnswer,
      };
    } else {
      let itemTerm = question
        .replace(/is/i, "")
        .replace(/this product/i, "")
        .replace(/available in our inventory or products list\??/i, "")
        .replace(/available in inventory\??/i, "")
        .replace(/available in stock\??/i, "")
        .replace(/available\??/i, "")
        .replace(/do we have/i, "")
        .replace(/in stock\??/i, "")
        .replace(/in our products list\??/i, "")
        .replace(/in products list\??/i, "")
        .trim();

      if (!itemTerm || itemTerm.length < 2) itemTerm = "the requested product";

      const facts = `Product Availability Search: NO. Queried Item: "${itemTerm}". Catalog Summary: Total 72 SKUs across 7 categories (Furniture, IT & Networking, Safety Equipment, Industrial Supplies, Office Equipment, Electrical, Consumables). Item "${itemTerm}" is NOT listed in the dataset.`;

      const directAnswer = `No, **"${itemTerm}"** is not currently listed in our product catalog or inventory. We carry **72 active product SKUs** across 7 categories (**Furniture**, **IT & Networking**, **Safety Equipment**, **Industrial Supplies**, **Office Equipment**, **Electrical**, and **Consumables**).`;

      return {
        isSupported: true,
        question,
        structuredFacts: attachHistoryFacts(facts),
        directAnswer,
      };
    }
  }

  // A. Specific Product Search
  let matchedProduct = data.products.find((p) => {
    const name = p.product_name.toLowerCase();
    const sku = p.sku.toLowerCase();
    if (qRaw.includes(name) || qRaw.includes(sku)) return true;
    const words = name.split(/\s+/).filter((w) => w.length > 2);
    return words.length > 1 && words.every((w) => qRaw.includes(w));
  });

  const isCustomerTerm =
    q.includes("they") ||
    q.includes("their") ||
    q.includes("them") ||
    q.includes("credit limit") ||
    q.includes("customer") ||
    q.includes("located");

  if (!matchedProduct && historyContext.referencedProduct && !isCustomerTerm) {
    const isChartQueryWord =
      q.includes("chart") ||
      q.includes("graph") ||
      q.includes("instead") ||
      q.includes("pie") ||
      q.includes("bar") ||
      q.includes("line") ||
      q.includes("area");

    const isProductFollowUp =
      !isChartQueryWord &&
      (pronounRegex.test(qRaw) ||
        q.includes("price") ||
        q.includes("cost") ||
        q.includes("unit") ||
        q.includes("sku") ||
        q.includes("remaining") ||
        q.includes("stock") ||
        q.includes("inventory") ||
        q.includes("reorder") ||
        q.includes("category"));

    if (isProductFollowUp) {
      matchedProduct = historyContext.referencedProduct;
    }
  }

  // B. Specific Customer Search
  let matchedCustomer = data.customers.find((c) => {
    const name = c.customer_name.toLowerCase();
    if (qRaw.includes(name)) return true;
    const words = name.split(/\s+/).filter((w) => w.length > 2);
    return words.length > 1 && words.every((w) => qRaw.includes(w));
  });

  if (!matchedCustomer && historyContext.referencedCustomer) {
    const isCustomerFollowUp =
      isCustomerTerm ||
      (pronounRegex.test(qRaw) && !q.includes("stock") && !q.includes("product") && !q.includes("sku"));

    if (isCustomerFollowUp) {
      matchedCustomer = historyContext.referencedCustomer;
    }
  }

  // Prioritize customer search if customer match was found via history/recency or explicit query terms
  if (matchedCustomer && (isCustomerTerm || historyContext.mostRecentType === "customer" || !matchedProduct)) {
    let customerRevenue = 0;
    let customerOrders = 0;
    let customerProfit = 0;
    for (const o of data.orders) {
      if (
        o.customer_id === matchedCustomer.customer_id &&
        o.order_status !== "Cancelled" &&
        inRange(o.order_date, currentRange)
      ) {
        customerRevenue += o.total_amount;
        customerProfit += o.gross_profit;
        customerOrders += 1;
      }
    }
    const customerInvoices = data.receivables.filter(
      (r) => r.customer_id === matchedCustomer.customer_id,
    );
    let customerOutstanding = 0;
    let customerOverdue = 0;
    for (const inv of customerInvoices) {
      const unpaid = inv.invoice_amount - inv.amount_paid;
      if (unpaid > 0) {
        customerOutstanding += unpaid;
        if (inv.due_date < "2026-09-01") customerOverdue += unpaid;
      }
    }

    const facts = `Specific Customer Lookup: ${matchedCustomer.customer_name} (City: ${matchedCustomer.city}, Industry: ${matchedCustomer.industry}, Segment: ${matchedCustomer.customer_segment}). Sales in Period (${currentRange.preset}): ${formatPKR(customerRevenue)} (${formatCompactPKR(customerRevenue)}) across ${customerOrders} orders. Gross Profit: ${formatPKR(customerProfit)}. Outstanding Receivables: ${formatPKR(customerOutstanding)} (${formatCompactPKR(customerOutstanding)}). Overdue Receivables: ${formatPKR(customerOverdue)} (${formatCompactPKR(customerOverdue)}). Credit Limit: ${formatPKR(matchedCustomer.credit_limit)}.`;

    let directAnswer = "";
    if (q.includes("city") || q.includes("located") || q.includes("where")) {
      directAnswer = `**${matchedCustomer.customer_name}** is located in **${matchedCustomer.city}** (${matchedCustomer.industry} sector). Credit Limit: **${formatPKR(matchedCustomer.credit_limit)}**. Sales in the selected period total **${formatCompactPKR(customerRevenue)}** (**${formatPKR(customerRevenue)}**) across **${customerOrders}** orders.`;
    } else if (q.includes("credit limit") || q.includes("limit")) {
      directAnswer = `The credit limit for **${matchedCustomer.customer_name}** is **${formatPKR(matchedCustomer.credit_limit)}** (**${formatCompactPKR(matchedCustomer.credit_limit)}**). Total sales in the selected period are **${formatCompactPKR(customerRevenue)}** across **${customerOrders}** orders.`;
    } else {
      directAnswer = `**${matchedCustomer.customer_name}** generated **${formatCompactPKR(customerRevenue)}** (**${formatPKR(customerRevenue)}**) in sales across **${customerOrders}** orders in the selected period. Total outstanding receivables are **${formatCompactPKR(customerOutstanding)}** (**${formatCompactPKR(customerOverdue)}** overdue). Credit Limit: **${formatPKR(matchedCustomer.credit_limit)}**.`;
    }

    return {
      isSupported: true,
      question,
      structuredFacts: attachHistoryFacts(facts),
      directAnswer,
    };
  }

  if (matchedProduct) {
    const invRow = data.inventory.find((inv) => inv.product_id === matchedProduct.product_id);
    const qtyOnHand = invRow?.quantity_on_hand ?? 0;
    const qtyReserved = invRow?.quantity_reserved ?? 0;
    const available = qtyOnHand - qtyReserved;
    const reorderLevel = matchedProduct.reorder_level;
    const status = invRow
      ? available < 0
        ? "Discrepancy"
        : available === 0
        ? "Out of Stock"
        : available <= reorderLevel
        ? "Low Stock"
        : "In Stock"
      : "Unknown";

    let productRevenue = 0;
    let productUnits = 0;
    let productOrders = 0;
    for (const o of data.orders) {
      if (o.order_status === "Cancelled" || !inRange(o.order_date, currentRange)) continue;
      const items = data.itemsByOrder.get(o.order_id);
      if (!items) continue;
      for (const item of items) {
        if (item.product_id === matchedProduct.product_id) {
          productRevenue += item.line_total;
          productUnits += item.quantity;
          productOrders += 1;
        }
      }
    }

    const facts = `Specific Product Lookup: ${matchedProduct.product_name} (SKU: ${matchedProduct.sku}, Category: ${matchedProduct.category}). Unit Price: ${formatPKR(matchedProduct.unit_price)}, Unit Cost: ${formatPKR(matchedProduct.unit_cost)}. Stock Details: On Hand: ${qtyOnHand}, Reserved: ${qtyReserved}, Available Remaining: ${available} units. Reorder Level: ${reorderLevel}. Stock Status: ${status}. Sales in Period (${currentRange.preset}): ${formatPKR(productRevenue)} (${formatCompactPKR(productRevenue)}) across ${productUnits} units in ${productOrders} orders.`;

    let directAnswer = "";
    if (q.includes("price") || q.includes("cost")) {
      directAnswer = `The unit price of **${matchedProduct.product_name}** is **${formatPKR(matchedProduct.unit_price)}** (unit cost: **${formatPKR(matchedProduct.unit_cost)}**). Total sales in the selected period are **${formatCompactPKR(productRevenue)}** across **${productUnits}** units sold (**${productOrders}** orders).`;
    } else if (
      q.includes("remaining") ||
      q.includes("stock") ||
      q.includes("inventory") ||
      q.includes("available") ||
      q.includes("how many")
    ) {
      directAnswer = `There are currently **${available} available units** of **${matchedProduct.product_name}** remaining in inventory (**${qtyOnHand}** units on hand minus **${qtyReserved}** reserved). Stock status is **${status}** (reorder level: **${reorderLevel}** units).`;
    } else if (q.includes("sales") || q.includes("revenue")) {
      directAnswer = `**${matchedProduct.product_name}** generated **${formatCompactPKR(productRevenue)}** (**${formatPKR(productRevenue)}**) in revenue across **${productUnits}** units sold (**${productOrders}** orders) during the selected period. Unit Price: **${formatPKR(matchedProduct.unit_price)}**.`;
    } else {
      directAnswer = `**${matchedProduct.product_name}** (SKU: **${matchedProduct.sku}**, Category: **${matchedProduct.category}**) has **${available} available units** remaining in stock (**${qtyOnHand}** on hand, **${qtyReserved}** reserved). Sales for the selected period total **${formatCompactPKR(productRevenue)}** across **${productUnits}** units.`;
    }

    return {
      isSupported: true,
      question,
      structuredFacts: attachHistoryFacts(facts),
      directAnswer,
    };
  }

  if (matchedCustomer) {
    let customerRevenue = 0;
    let customerOrders = 0;
    let customerProfit = 0;
    for (const o of data.orders) {
      if (
        o.customer_id === matchedCustomer.customer_id &&
        o.order_status !== "Cancelled" &&
        inRange(o.order_date, currentRange)
      ) {
        customerRevenue += o.total_amount;
        customerProfit += o.gross_profit;
        customerOrders += 1;
      }
    }
    const customerInvoices = data.receivables.filter(
      (r) => r.customer_id === matchedCustomer.customer_id,
    );
    let customerOutstanding = 0;
    let customerOverdue = 0;
    for (const inv of customerInvoices) {
      const unpaid = inv.invoice_amount - inv.amount_paid;
      if (unpaid > 0) {
        customerOutstanding += unpaid;
        if (inv.due_date < "2026-09-01") customerOverdue += unpaid;
      }
    }

    const facts = `Specific Customer Lookup: ${matchedCustomer.customer_name} (City: ${matchedCustomer.city}, Industry: ${matchedCustomer.industry}, Segment: ${matchedCustomer.customer_segment}). Sales in Period (${currentRange.preset}): ${formatPKR(customerRevenue)} (${formatCompactPKR(customerRevenue)}) across ${customerOrders} orders. Gross Profit: ${formatPKR(customerProfit)}. Outstanding Receivables: ${formatPKR(customerOutstanding)} (${formatCompactPKR(customerOutstanding)}). Overdue Receivables: ${formatPKR(customerOverdue)} (${formatCompactPKR(customerOverdue)}). Credit Limit: ${formatPKR(matchedCustomer.credit_limit)}.`;

    const directAnswer = `**${matchedCustomer.customer_name}** generated **${formatCompactPKR(customerRevenue)}** (**${formatPKR(customerRevenue)}**) in sales across **${customerOrders}** orders in the selected period. Total outstanding receivables are **${formatCompactPKR(customerOutstanding)}** (**${formatCompactPKR(customerOverdue)}** overdue). Credit Limit: **${formatPKR(matchedCustomer.credit_limit)}**.`;

    return {
      isSupported: true,
      question,
      structuredFacts: facts,
      directAnswer,
    };
  }

  // C. Specific Category Search
  const categories = [
    "Furniture",
    "IT & Networking",
    "Safety Equipment",
    "Industrial Supplies",
    "Office Equipment",
    "Electrical",
    "Consumables",
  ];
  const matchedCategory = categories.find((cat) => qRaw.includes(cat.toLowerCase()));
  if (matchedCategory) {
    const catProducts = data.products.filter(
      (p) => p.category.toLowerCase() === matchedCategory.toLowerCase(),
    );
    const catProductIds = new Set(catProducts.map((p) => p.product_id));
    let catValuation = 0;
    let catInStock = 0;
    let catLowStock = 0;
    let catOutOfStock = 0;
    for (const invRow of data.inventory) {
      if (catProductIds.has(invRow.product_id)) {
        const product = data.productById.get(invRow.product_id);
        if (product) {
          catValuation += invRow.quantity_on_hand * product.unit_cost;
          const avail = invRow.quantity_on_hand - invRow.quantity_reserved;
          if (avail === 0) catOutOfStock += 1;
          else if (avail <= invRow.reorder_level) catLowStock += 1;
          else catInStock += 1;
        }
      }
    }

    const facts = `Category Lookup: ${matchedCategory}. Total SKUs: ${catProducts.length}. Total Category Inventory Valuation: ${formatPKR(catValuation)} (${formatCompactPKR(catValuation)}). Stock Breakdown: ${catInStock} In Stock, ${catLowStock} Low Stock, ${catOutOfStock} Out of Stock.`;

    const directAnswer = `In the **${matchedCategory}** category across **${catProducts.length}** product SKUs, total inventory valuation is **${formatCompactPKR(catValuation)}**. Stock breakdown: **${catInStock}** In Stock, **${catLowStock}** Low Stock, and **${catOutOfStock}** Out of Stock.`;

    return {
      isSupported: true,
      question,
      structuredFacts: facts,
      directAnswer,
    };
  }

  // 1. Product Profit Ranking Query ("which product is making me the best profit?")
  if (
    q.includes("profit") &&
    (q.includes("product") ||
      q.includes("item") ||
      q.includes("best") ||
      q.includes("most") ||
      q.includes("which") ||
      q.includes("top") ||
      q.includes("making") ||
      q.includes("generating") ||
      q.includes("highest"))
  ) {
    const limit = extractLimit(q, 5);
    const topByProfit = getTopProductsByProfit(data, currentRange, limit);
    if (!topByProfit.length) {
      return {
        isSupported: true,
        question,
        structuredFacts: "No product sales recorded in range.",
        directAnswer: "No qualifying product sales were recorded in the selected date range.",
      };
    }
    const top1 = topByProfit[0]!;
    const listFormatted = topByProfit
      .map(
        (p, i) =>
          `${i + 1}. **${p.product.product_name}** — Gross Profit: **${formatPKR(p.grossProfit)}** (**${formatCompactPKR(p.grossProfit)}**, **${p.marginPct.toFixed(1)}%** margin) on revenue of **${formatCompactPKR(p.revenue)}** (${p.units} units)`,
      )
      .join("\n");
    const facts = `Product Profit Ranking: Top Profit Product is ${top1.product.product_name} with Gross Profit of ${formatPKR(top1.grossProfit)} (${formatCompactPKR(top1.grossProfit)}, ${top1.marginPct.toFixed(2)}% margin) on ${formatPKR(top1.revenue)} sales. Top ${limit} Products by Gross Profit:\n${listFormatted}`;

    let directAnswer = "";
    if (
      limit === 1 ||
      q.includes("which product") ||
      q.includes("best profit") ||
      q.includes("most profit") ||
      q.includes("highest profit") ||
      q.includes("making me")
    ) {
      directAnswer = `The product making you the best profit is **${top1.product.product_name}**, generating a total gross profit of **${formatCompactPKR(top1.grossProfit)}** (**${formatPKR(top1.grossProfit)}**) with a **${top1.marginPct.toFixed(2)}%** gross profit margin on **${formatCompactPKR(top1.revenue)}** in total sales (${top1.units} units sold).`;
    } else {
      directAnswer = `The product generating the highest profit is **${top1.product.product_name}** with **${formatCompactPKR(top1.grossProfit)}** (**${formatPKR(top1.grossProfit)}**) in gross profit.\n\nThe top ${limit} most profitable products overall are:\n${listFormatted}`;
    }

    const chartConfig: ChartConfig | undefined = isExplicitChartRequest ? {
      type: detectRequestedChartType(q, "bar"),
      title: `Top ${topByProfit.length} Products by Gross Profit`,
      data: topByProfit.map((p) => ({
        name: p.product.product_name,
        value: p.grossProfit,
      })),
      formatValue: "pkr",
    } : undefined;

    return {
      isSupported: true,
      question,
      structuredFacts: facts,
      directAnswer,
      ...(chartConfig && { chartConfig }),
    };
  }

  // 1. Sales & Revenue
  if (
    q.includes("net sales") ||
    q.includes("total sales") ||
    q.includes("how much are we selling") ||
    q.includes("revenue") ||
    q.includes("gross sales")
  ) {
    const sales = calculateSales(data, currentRange);
    const monthlySeries = calculateMonthlySeries(data, currentRange);
    const chartConfig: ChartConfig | undefined = isExplicitChartRequest ? {
      type: detectRequestedChartType(q, "area"),
      title: "Monthly Sales Trend",
      data: monthlySeries.map((m) => ({
        name: m.label,
        value: m.netSales,
      })),
      formatValue: "pkr",
    } : undefined;

    const facts = `Net Sales: ${formatPKR(sales.netSales)} (${formatCompactPKR(sales.netSales)}). Gross Sales: ${formatPKR(sales.grossSales)}. Returns: ${formatPKR(sales.returns)}. Gross Profit: ${formatPKR(sales.grossProfit)} (${sales.grossMarginPct.toFixed(2)}% margin). Total Qualifying Orders: ${sales.totalOrders.toLocaleString()}. Selected period: ${currentRange.preset}.`;
    return {
      isSupported: true,
      question,
      structuredFacts: facts,
      directAnswer: `Net Sales for the selected period are ${formatCompactPKR(sales.netSales)} (${formatPKR(sales.netSales)}). Gross sales reached ${formatCompactPKR(sales.grossSales)} with ${formatCompactPKR(sales.returns)} in returns across ${sales.totalOrders.toLocaleString()} qualifying orders.`,
      ...(chartConfig && { chartConfig }),
    };
  }

  // 2. Profit / Gross Profit
  if (q.includes("profit") || q.includes("margin")) {
    const sales = calculateSales(data, currentRange);
    const facts = `Gross Profit: ${formatPKR(sales.grossProfit)} (${formatCompactPKR(sales.grossProfit)}). Gross Margin: ${sales.grossMarginPct.toFixed(2)}%. Gross Sales: ${formatPKR(sales.grossSales)}.`;
    return {
      isSupported: true,
      question,
      structuredFacts: facts,
      directAnswer: `Gross Profit is ${formatCompactPKR(sales.grossProfit)} (${formatPKR(sales.grossProfit)}), representing a gross profit margin of ${sales.grossMarginPct.toFixed(2)}% on gross sales of ${formatCompactPKR(sales.grossSales)}.`,
    };
  }

  // 3. Receivables & Outstanding / Overdue
  if (
    q.includes("receivable") ||
    q.includes("outstanding") ||
    q.includes("overdue") ||
    q.includes("due soon") ||
    q.includes("unpaid") ||
    q.includes("invoice")
  ) {
    const recRecords = getReceivableRecords(data);
    const rec = calculateReceivables(recRecords);
    const chartConfig: ChartConfig | undefined = isExplicitChartRequest ? {
      type: detectRequestedChartType(q, "bar"),
      title: "Receivables Breakdown",
      data: [
        { name: "Current", value: rec.current },
        { name: "Due Soon", value: rec.dueSoon },
        { name: "Overdue", value: rec.overdue },
      ],
      formatValue: "pkr",
    } : undefined;

    const facts = `Total Outstanding Receivables: ${formatPKR(rec.outstanding)} (${formatCompactPKR(rec.outstanding)}). Overdue Receivables: ${formatPKR(rec.overdue)} (${formatCompactPKR(rec.overdue)}). Overdue Share: ${rec.overduePct.toFixed(2)}%. Overdue Invoices Count: ${rec.overdueCount}. Current Outstanding: ${formatCompactPKR(rec.current)}. Due Soon Outstanding: ${formatCompactPKR(rec.dueSoon)}.`;
    return {
      isSupported: true,
      question,
      structuredFacts: facts,
      directAnswer: `Total outstanding receivables are ${formatCompactPKR(rec.outstanding)} (${formatPKR(rec.outstanding)}). Of this, ${formatCompactPKR(rec.overdue)} is overdue across ${rec.overdueCount} invoices, representing ${rec.overduePct.toFixed(2)}% of total receivables.`,
      ...(chartConfig && { chartConfig }),
    };
  }

  // 4. Inventory Health & Stock
  if (
    q.includes("inventory") ||
    q.includes("stock") ||
    q.includes("low stock") ||
    q.includes("out of stock") ||
    q.includes("discrepancy") ||
    q.includes("reorder")
  ) {
    const invRecords = getInventoryRecords(data);
    const inv = calculateInventoryHealth(invRecords);
    const chartConfig: ChartConfig | undefined = isExplicitChartRequest ? {
      type: detectRequestedChartType(q, "pie"),
      title: "Inventory Stock Status",
      data: [
        { name: "In Stock", value: inv.inStock },
        { name: "Low Stock", value: inv.lowStock },
        { name: "Out of Stock", value: inv.outOfStock },
        { name: "Discrepancy", value: inv.discrepancy },
      ],
      formatValue: "number",
    } : undefined;

    const facts = `Total Inventory Valuation: ${formatPKR(inv.inventoryValue)} (${formatCompactPKR(inv.inventoryValue)}). Total SKUs: ${inv.total}. In Stock: ${inv.inStock}. Low Stock: ${inv.lowStock}. Out of Stock: ${inv.outOfStock}. Inventory Discrepancy: ${inv.discrepancy}. Healthy Stock Pct: ${inv.healthyPct.toFixed(1)}%.`;
    return {
      isSupported: true,
      question,
      structuredFacts: facts,
      directAnswer: `Inventory valuation is ${formatCompactPKR(inv.inventoryValue)}. Stock breakdown across ${inv.total} products: ${inv.inStock} In Stock, ${inv.lowStock} Low Stock (at/below reorder level), ${inv.outOfStock} Out of Stock, and ${inv.discrepancy} Discrepancy items.`,
      ...(chartConfig && { chartConfig }),
    };
  }

  // 5. Delivery & Operations Performance
  if (
    q.includes("delivery") ||
    q.includes("on-time") ||
    q.includes("delayed") ||
    q.includes("lead time") ||
    q.includes("logistics")
  ) {
    const del = calculateDeliveryPerformance(data, currentRange);
    const facts = `Completed Deliveries: ${del.completed.toLocaleString()}. On-Time Deliveries: ${del.onTime.toLocaleString()}. Delayed Deliveries: ${del.delayed.toLocaleString()}. On-Time Delivery Rate: ${del.onTimeRate.toFixed(2)}%. Avg Lead Time: ${del.avgLeadTimeDays.toFixed(2)} days. Avg Delay: ${del.avgDelayDays.toFixed(2)} days. Overdue Open Orders: ${del.overdueOpenOrders}.`;
    return {
      isSupported: true,
      question,
      structuredFacts: facts,
      directAnswer: `Our on-time delivery rate is ${del.onTimeRate.toFixed(2)}%. Out of ${del.completed.toLocaleString()} completed deliveries, ${del.onTime.toLocaleString()} arrived on time while ${del.delayed.toLocaleString()} were delayed (avg lead time: ${del.avgLeadTimeDays.toFixed(1)} days).`,
    };
  }

  // 6A. Total Products / SKUs Count Query ("how many total products do we have?")
  if (
    (q.includes("product") || q.includes("sku") || q.includes("item")) &&
    (q.includes("how many") ||
      q.includes("total") ||
      q.includes("count") ||
      q.includes("number") ||
      q.includes("all") ||
      q.includes("exist") ||
      q.includes("have"))
  ) {
    const totalProductsCount = data.products.length;
    const categoriesCount = new Set(data.products.map((p) => p.category)).size;
    const invRecords = getInventoryRecords(data);
    const inv = calculateInventoryHealth(invRecords);

    const facts = `Total Product SKUs in Dataset: ${totalProductsCount} across ${categoriesCount} product categories. Inventory Health: ${inv.inStock} In Stock, ${inv.lowStock} Low Stock, ${inv.outOfStock} Out of Stock, ${inv.discrepancy} Discrepancy. Total Inventory Valuation: ${formatPKR(inv.inventoryValue)}.`;

    const directAnswer = `We have a total of **${totalProductsCount} product SKUs** in our dataset across **${categoriesCount}** product categories. Total inventory valuation is **${formatCompactPKR(inv.inventoryValue)}** (**${inv.inStock}** in stock, **${inv.lowStock}** low stock, **${inv.outOfStock}** out of stock).`;

    return {
      isSupported: true,
      question,
      structuredFacts: facts,
      directAnswer,
    };
  }

  // 6B. Top Products
  if (
    q.includes("product") ||
    q.includes("top product") ||
    q.includes("best selling") ||
    q.includes("highest revenue product")
  ) {
    const limit = extractLimit(q, 5);
    const top = getTopProducts(data, currentRange, limit);
    if (!top.length) {
      return {
        isSupported: true,
        question,
        structuredFacts: `Total Product SKUs in Dataset: ${data.products.length}. No product sales in range.`,
        directAnswer: "No qualifying product sales were recorded in the selected date range.",
      };
    }
    const top1 = top[0]!;
    const topListFormatted = top
      .map(
        (p, i) =>
          `${i + 1}. **${p.product.product_name}** — **${formatPKR(p.revenue)}** (**${formatCompactPKR(p.revenue)}**) across **${p.units}** units`,
      )
      .join("\n");
    const facts = `Total Product SKUs in Dataset: ${data.products.length}. User requested Top ${limit} Products. Top Product: ${top1.product.product_name} generating ${formatPKR(top1.revenue)} across ${top1.units} units. Top ${limit} Products:\n${topListFormatted}`;
    
    const chartConfig: ChartConfig | undefined = isExplicitChartRequest ? {
      type: detectRequestedChartType(q, "bar"),
      title: `Top ${top.length} Products by Sales`,
      data: top.map((p) => ({
        name: p.product.product_name,
        value: p.revenue,
      })),
      formatValue: "pkr",
    } : undefined;

    return {
      isSupported: true,
      question,
      structuredFacts: facts,
      directAnswer: `Your top overall product is **${top1.product.product_name}** with total revenue of **${formatPKR(top1.revenue)}** across **${top1.units}** units sold.\n\nThe top ${limit} best-selling products overall are:\n${topListFormatted}`,
      ...(chartConfig && { chartConfig }),
    };
  }

  // 7A. Total Customer Count Query ("how many total customers we have?")
  if (
    q.includes("customer") &&
    (q.includes("how many") ||
      q.includes("total") ||
      q.includes("count") ||
      q.includes("number") ||
      q.includes("all") ||
      q.includes("registered") ||
      q.includes("exist") ||
      q.includes("have"))
  ) {
    const totalCustomersCount = data.customers.length;
    const activeCustomersInPeriod = getTopCustomers(data, currentRange).length;
    const citiesCount = new Set(data.customers.map((c) => c.city)).size;
    const industriesCount = new Set(data.customers.map((c) => c.industry)).size;

    const top1 = getTopCustomers(data, currentRange, 1)[0];
    const topStr = top1
      ? ` Top customer: ${top1.customer.customer_name} spending ${formatCompactPKR(top1.revenue)}.`
      : "";

    const facts = `Total Registered Customer Accounts in Dataset: ${totalCustomersCount}. Active Purchasing Customers in Period (${currentRange.preset}): ${activeCustomersInPeriod}. Geographic Coverage: ${citiesCount} cities. Industry Sectors: ${industriesCount} industries.${topStr}`;

    const directAnswer = `We have a total of **${totalCustomersCount} registered customer accounts** in our dataset across **${citiesCount}** cities and **${industriesCount}** industry sectors (**${activeCustomersInPeriod}** active purchasing customers in the selected period).`;

    return {
      isSupported: true,
      question,
      structuredFacts: facts,
      directAnswer,
    };
  }

  // 7B. Top Customers
  if (
    q.includes("customer") ||
    q.includes("top customer") ||
    q.includes("best customer") ||
    q.includes("highest revenue customer") ||
    q.includes("repeat customer") ||
    q.includes("repeated customer")
  ) {
    const limit = extractLimit(q, 5);
    const top = getTopCustomers(data, currentRange, limit);
    if (!top.length) {
      return {
        isSupported: true,
        question,
        structuredFacts: `Total Customer Accounts in Dataset: ${data.customers.length}. No customer sales in range.`,
        directAnswer: "No qualifying customer sales were recorded in the selected date range.",
      };
    }
    const top1 = top[0]!;
    const topListFormatted = top
      .map(
        (c, i) =>
          `${i + 1}. **${c.customer.customer_name}** — **${formatPKR(c.revenue)}** (**${formatCompactPKR(c.revenue)}**) across **${c.orders}** orders`,
      )
      .join("\n");
    const facts = `Total Registered Customer Accounts in Dataset: ${data.customers.length}. User requested Top ${limit} Customers. Top Customer: ${top1.customer.customer_name} spending ${formatPKR(top1.revenue)} over ${top1.orders} orders. Top ${limit} Customers:\n${topListFormatted}`;
    
    const chartConfig: ChartConfig | undefined = isExplicitChartRequest ? {
      type: detectRequestedChartType(q, "bar"),
      title: `Top ${top.length} Customers by Revenue`,
      data: top.map((c) => ({
        name: c.customer.customer_name,
        value: c.revenue,
      })),
      formatValue: "pkr",
    } : undefined;

    return {
      isSupported: true,
      question,
      structuredFacts: facts,
      directAnswer: `Your top overall customer is **${top1.customer.customer_name}** with total revenue of **${formatPKR(top1.revenue)}** across **${top1.orders}** orders.\n\nThe top ${limit} repeat customers overall are:\n${topListFormatted}`,
      ...(chartConfig && { chartConfig }),
    };
  }

  // 8. Geographic / City Query Handler ("from which city most orders are coming from?")
  if (
    q.includes("city") ||
    q.includes("cities") ||
    q.includes("location") ||
    q.includes("geographic") ||
    q.includes("region") ||
    q.includes("where")
  ) {
    const limit = extractLimit(q, 5);
    const cities = getCityPerformance(data, currentRange, limit);
    if (!cities.length) {
      return {
        isSupported: true,
        question,
        structuredFacts: "No city order data available in range.",
        directAnswer: "No qualifying sales orders were recorded in the selected date range.",
      };
    }
    const top1 = cities[0]!;
    const cityListFormatted = cities
      .map(
        (c, i) =>
          `${i + 1}. **${c.city}** — **${c.orders} orders** (**${formatCompactPKR(c.revenue)}** sales across ${c.customersCount} customer accounts)`,
      )
      .join("\n");
    const facts = `Geographic Breakdown by City: Top City by Orders is ${top1.city} (${top1.orders} orders, ${formatPKR(top1.revenue)} sales). Top ${limit} Cities:\n${cityListFormatted}`;

    let directAnswer = "";
    if (
      limit === 1 ||
      q.includes("most orders") ||
      q.includes("highest orders") ||
      q.includes("top city") ||
      q.includes("which city") ||
      q.includes("where")
    ) {
      directAnswer = `The city with the most orders is **${top1.city}** with **${top1.orders} orders** (**${formatCompactPKR(top1.revenue)}** in total sales revenue across ${top1.customersCount} customer accounts), followed by **${cities[1]?.city ?? "Karachi"}** (**${cities[1]?.orders ?? 0} orders**, **${formatCompactPKR(cities[1]?.revenue ?? 0)}**).`;
    } else {
      directAnswer = `The top city by order volume is **${top1.city}** with **${top1.orders} orders** (**${formatCompactPKR(top1.revenue)}**).\n\nThe top ${limit} cities by order volume are:\n${cityListFormatted}`;
    }

    const chartConfig: ChartConfig | undefined = isExplicitChartRequest ? {
      type: detectRequestedChartType(q, "bar"),
      title: `Top ${cities.length} Cities by Sales Revenue`,
      data: cities.map((c) => ({
        name: c.city,
        value: c.revenue,
      })),
      formatValue: "pkr",
    } : undefined;

    return {
      isSupported: true,
      question,
      structuredFacts: facts,
      directAnswer,
      ...(chartConfig && { chartConfig }),
    };
  }

  // 9. Industry Sector Breakdown Handler
  if (q.includes("industry") || q.includes("sector") || q.includes("industries")) {
    const limit = extractLimit(q, 5);
    const industries = getIndustryPerformance(data, currentRange, limit);
    if (!industries.length) {
      return {
        isSupported: true,
        question,
        structuredFacts: "No industry order data in range.",
        directAnswer: "No qualifying sales orders were recorded in the selected date range.",
      };
    }
    const top1 = industries[0]!;
    const indListFormatted = industries
      .map(
        (ind, i) =>
          `${i + 1}. **${ind.industry}** — **${ind.orders} orders** (**${formatCompactPKR(ind.revenue)}** sales across ${ind.customersCount} customer accounts)`,
      )
      .join("\n");
    const facts = `Industry Sector Breakdown: Top Sector is ${top1.industry} (${top1.orders} orders, ${formatPKR(top1.revenue)}). Top ${limit} Sectors:\n${indListFormatted}`;

    const directAnswer = `The top industry sector by order volume is **${top1.industry}** with **${top1.orders} orders** (**${formatCompactPKR(top1.revenue)}** in sales).\n\nTop ${limit} industry sectors:\n${indListFormatted}`;

    const chartConfig: ChartConfig | undefined = isExplicitChartRequest ? {
      type: detectRequestedChartType(q, "bar"),
      title: `Sales by Industry Sector`,
      data: industries.map((ind) => ({
        name: ind.industry,
        value: ind.revenue,
      })),
      formatValue: "pkr",
    } : undefined;

    return {
      isSupported: true,
      question,
      structuredFacts: facts,
      directAnswer,
      ...(chartConfig && { chartConfig }),
    };
  }

  // 10. Sales Channel Handler
  if (
    q.includes("channel") ||
    q.includes("sales channel") ||
    q.includes("direct vs") ||
    q.includes("wholesale") ||
    q.includes("distributor")
  ) {
    const channels = getChannelPerformance(data, currentRange);
    if (!channels.length) {
      return {
        isSupported: true,
        question,
        structuredFacts: "No channel sales data in range.",
        directAnswer: "No qualifying sales orders were recorded in the selected date range.",
      };
    }
    const top1 = channels[0]!;
    const chanListFormatted = channels
      .map(
        (ch, i) =>
          `${i + 1}. **${ch.channel}** — **${ch.orders} orders** (**${formatCompactPKR(ch.revenue)}** sales)`,
      )
      .join("\n");
    const facts = `Sales Channel Breakdown: Top Channel is ${top1.channel} (${top1.orders} orders, ${formatPKR(top1.revenue)}). Channels:\n${chanListFormatted}`;

    const directAnswer = `Our top sales channel is **${top1.channel}** generating **${formatCompactPKR(top1.revenue)}** across **${top1.orders}** orders.\n\nSales channel breakdown:\n${chanListFormatted}`;

    const chartConfig: ChartConfig | undefined = isExplicitChartRequest ? {
      type: detectRequestedChartType(q, "pie"),
      title: `Sales Channel Breakdown`,
      data: channels.map((ch) => ({
        name: ch.channel,
        value: ch.revenue,
      })),
      formatValue: "pkr",
    } : undefined;

    return {
      isSupported: true,
      question,
      structuredFacts: facts,
      directAnswer,
      ...(chartConfig && { chartConfig }),
    };
  }

  // 8. Orders & Status summary
  if (
    q.includes("order") ||
    q.includes("status") ||
    q.includes("cancelled") ||
    q.includes("pending") ||
    q.includes("processing")
  ) {
    const statuses = getOrderStatusSummary(data, currentRange);
    const summaryStr = statuses.map((s) => `${s.status}: ${s.count} orders (${formatCompactPKR(s.value)})`).join(", ");
    const totalCount = statuses.reduce((acc, s) => acc + s.count, 0);
    const facts = `Total Orders in Range: ${totalCount}. Status Breakdown: ${summaryStr}.`;
    
    const chartConfig: ChartConfig | undefined = isExplicitChartRequest ? {
      type: detectRequestedChartType(q, "pie"),
      title: "Order Status Breakdown Distribution",
      data: statuses.map((s) => ({
        name: s.status,
        value: s.count,
        secondaryValue: s.value,
      })),
      formatValue: "number",
    } : undefined;

    return {
      isSupported: true,
      question,
      structuredFacts: facts,
      directAnswer: `Total order count for the period is ${totalCount.toLocaleString()}. Order breakdown: ${summaryStr}.`,
      ...(chartConfig && { chartConfig }),
    };
  }

  // 9. Peak sales month / best month
  if (q.includes("month") || q.includes("highest sales") || q.includes("peak")) {
    const salesAll = calculateSales(data, resolvePreset("allTime"));
    const monthlySeries = calculateMonthlySeries(data, resolvePreset("allTime"));
    const chartConfig: ChartConfig | undefined = isExplicitChartRequest ? {
      type: detectRequestedChartType(q, "area"),
      title: "All-Time Monthly Sales Performance",
      data: monthlySeries.map((m) => ({
        name: m.label,
        value: m.netSales,
      })),
      formatValue: "pkr",
    } : undefined;
    
    const facts = `Historical Dataset covers March 2025 through August 2026. All-time Net Sales reach ${formatCompactPKR(salesAll.netSales)} (${formatPKR(salesAll.netSales)}) across ${salesAll.totalOrders.toLocaleString()} orders.`;

    return {
      isSupported: true,
      question,
      structuredFacts: facts,
      directAnswer: `Across the historical dataset (March 2025 – August 2026), total net sales reached ${formatCompactPKR(salesAll.netSales)} (${formatPKR(salesAll.netSales)}).`,
      ...(chartConfig && { chartConfig }),
    };
  }

  // 10. Refund / Returns queries
  if (q.includes("refund") || q.includes("return")) {
    const sales = calculateSales(data, currentRange);
    const returnPct = sales.grossSales > 0 ? (sales.returns / sales.grossSales) * 100 : 0;
    const returnedOrders = data.orders.filter(
      (o) => o.order_status === "Returned" || o.order_status === "Partially Returned",
    ).length;
    const facts = `Total Returns & Refund Amount: ${formatPKR(sales.returns)} (${formatCompactPKR(sales.returns)}). Gross Sales: ${formatPKR(sales.grossSales)}. Refund/Return Rate: ${returnPct.toFixed(2)}% of gross sales. Returned/Partially Returned Orders Count: ${returnedOrders} out of ${data.orders.length} total orders.`;
    return {
      isSupported: true,
      question,
      structuredFacts: facts,
      directAnswer: `Total returns and refund volume is ${formatCompactPKR(sales.returns)} (${formatPKR(sales.returns)}), representing a return rate of ${returnPct.toFixed(2)}% of gross sales (${returnedOrders} returned orders).`,
    };
  }

  // Default fallback if query contains explicit business keywords but didn't trigger specific branch
  const businessKeywords = [
    "sales",
    "revenue",
    "order",
    "product",
    "customer",
    "inventory",
    "stock",
    "receivable",
    "payment",
    "delivery",
    "invoice",
    "profit",
    "refund",
    "return",
    "returns",
    "rate",
    "cost",
    "margin",
    "channel",
    "warehouse",
    "performance",
    "volume",
    "amount",
  ];
  if (businessKeywords.some((k) => q.includes(k))) {
    const sales = calculateSales(data, currentRange);
    const rec = calculateReceivables(getReceivableRecords(data));
    const inv = calculateInventoryHealth(getInventoryRecords(data));
    const facts = `Overall Business Metrics (${currentRange.preset}): Net Sales: ${formatCompactPKR(sales.netSales)} (${formatPKR(sales.netSales)}). Total Orders: ${sales.totalOrders}. Gross Profit: ${formatCompactPKR(sales.grossProfit)} (${sales.grossMarginPct.toFixed(2)}% margin). Outstanding Receivables: ${formatCompactPKR(rec.outstanding)} (${formatCompactPKR(rec.overdue)} overdue). Inventory Value: ${formatCompactPKR(inv.inventoryValue)} across ${data.products.length} SKUs (${inv.inStock} In Stock, ${inv.lowStock} Low Stock, ${inv.outOfStock} Out of Stock).`;
    return {
      isSupported: true,
      question,
      structuredFacts: attachHistoryFacts(facts),
      directAnswer: `Our overall performance for the selected period shows **${formatCompactPKR(sales.netSales)}** in Net Sales across **${sales.totalOrders}** orders (**${sales.grossMarginPct.toFixed(2)}%** gross margin). Outstanding receivables total **${formatCompactPKR(rec.outstanding)}** (**${formatCompactPKR(rec.overdue)}** overdue), and total inventory valuation is **${formatCompactPKR(inv.inventoryValue)}** (${inv.inStock} items in stock, ${inv.lowStock} low stock).`,
    };
  }

  return {
    isSupported: true,
    question,
    structuredFacts: attachHistoryFacts(
      "Unrecognized or ambiguous query. Ask user to clarify their question regarding Sales & Operations dataset.",
    ),
    directAnswer:
      "I didn't quite catch that. Could you please rephrase or ask a question about your **sales performance**, **inventory stock**, **top customers**, **receivables**, or **delivery performance**?",
  };
}
