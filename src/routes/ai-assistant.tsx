import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useDashboard } from "@/context/DashboardContext";
import { loadDataset, type Dataset } from "@/lib/dataset";
import { queryAiEngine, type ChartConfig } from "@/services/aiEngine";
import { queryGeminiServerFn } from "@/services/aiServer";
import { formatPKR, formatChartAxisTick } from "@/services/metrics";
import { resolvePreset } from "@/services/dateRange";
import {
  Sparkles,
  Send,
  Bot,
  User,
  Copy,
  Trash2,
  Check,
  ShieldCheck,
  HelpCircle,
  BarChart3,
  Maximize2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
} from "recharts";

export const Route = createFileRoute("/ai-assistant")({
  component: AiAssistantPage,
});

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  sourceTag?: string;
  isError?: boolean;
  timestamp: string;
  chartConfig?: ChartConfig | undefined;
}

const CHART_COLORS = [
  "hsl(158, 64%, 40%)", // Primary emerald
  "hsl(175, 70%, 41%)", // Teal
  "hsl(199, 89%, 48%)", // Sky
  "hsl(38, 92%, 50%)",  // Amber
  "hsl(262, 83%, 58%)", // Violet
  "hsl(340, 82%, 52%)", // Rose
];

function CustomChartTooltip({ active, payload, label, formatValue }: any) {
  if (active && payload && payload.length) {
    const dataItem = payload[0];
    const val = dataItem.value;
    const formatted =
      formatValue === "pkr"
        ? formatPKR(val)
        : formatValue === "pct"
        ? `${val.toFixed(1)}%`
        : val.toLocaleString();

    return (
      <div className="bg-popover/95 border border-border/80 px-2.5 py-1.5 rounded-xl shadow-lg backdrop-blur-md text-xs">
        <p className="font-semibold text-popover-foreground">{label || dataItem.name}</p>
        <p className="text-primary font-mono font-bold mt-0.5">{formatted}</p>
      </div>
    );
  }
  return null;
}

function InlineChatChart({ config }: { config: ChartConfig }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  if (!config || !config.data || config.data.length === 0) return null;

  const { type, title, data, formatValue = "pkr" } = config;

  return (
    <div className="mt-2.5 pt-2.5 border-t border-slate-200/50 dark:border-slate-700/50 w-full">
      <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
        <h4 className="text-[11px] font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-1.5 shrink-0">
          <BarChart3 className="h-3.5 w-3.5 text-blue-600 dark:text-sky-400 shrink-0" />
          {title}
        </h4>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-mono text-slate-500 uppercase px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700">
            {type} chart
          </span>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1 text-[10px] font-semibold text-blue-600 dark:text-sky-400 bg-blue-50 dark:bg-sky-950/60 hover:bg-blue-100 dark:hover:bg-sky-900/60 px-2 py-0.5 rounded-md border border-blue-200/60 dark:border-sky-800/50 transition-all cursor-pointer shadow-xs"
            title="Preview Fullscreen Chart"
          >
            <Maximize2 className="h-3 w-3" />
            Expand
          </button>
        </div>
      </div>

      <div className="w-full h-60 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2 shadow-xs">
        <ResponsiveContainer width="100%" height="100%">
          {type === "line" ? (
            <LineChart data={data} margin={{ top: 12, right: 12, left: 6, bottom: 28 }}>
              <XAxis
                dataKey="name"
                stroke="#888888"
                fontSize={9}
                tickLine={false}
                axisLine={false}
                interval={0}
                angle={-20}
                textAnchor="end"
                height={32}
                tickFormatter={(str) => (typeof str === "string" && str.length > 14 ? `${str.substring(0, 12)}...` : str)}
              />
              <YAxis
                stroke="#888888"
                fontSize={9}
                width={48}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => formatChartAxisTick(v, formatValue)}
              />
              <Tooltip content={<CustomChartTooltip formatValue={formatValue} />} />
              <Line
                type="monotone"
                dataKey="value"
                stroke="hsl(158, 64%, 40%)"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "hsl(158, 64%, 40%)" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          ) : type === "area" ? (
            <AreaChart data={data} margin={{ top: 12, right: 12, left: 6, bottom: 28 }}>
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(158, 64%, 40%)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(158, 64%, 40%)" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="name"
                stroke="#888888"
                fontSize={9}
                tickLine={false}
                axisLine={false}
                interval={0}
                angle={-20}
                textAnchor="end"
                height={32}
                tickFormatter={(str) => (typeof str === "string" && str.length > 14 ? `${str.substring(0, 12)}...` : str)}
              />
              <YAxis
                stroke="#888888"
                fontSize={9}
                width={48}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => formatChartAxisTick(v, formatValue)}
              />
              <Tooltip content={<CustomChartTooltip formatValue={formatValue} />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="hsl(158, 64%, 40%)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#chartGrad)"
              />
            </AreaChart>
          ) : type === "pie" ? (
            <PieChart>
              <Tooltip content={<CustomChartTooltip formatValue={formatValue} />} />
              <Legend wrapperStyle={{ fontSize: "10px", paddingTop: "4px" }} />
              <Pie
                data={data}
                cx="50%"
                cy="42%"
                innerRadius={28}
                outerRadius={55}
                paddingAngle={4}
                dataKey="value"
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          ) : (
            <BarChart data={data} margin={{ top: 12, right: 12, left: 6, bottom: 28 }}>
              <XAxis
                dataKey="name"
                stroke="#888888"
                fontSize={9}
                tickLine={false}
                axisLine={false}
                interval={0}
                angle={-20}
                textAnchor="end"
                height={32}
                tickFormatter={(str) => (typeof str === "string" && str.length > 14 ? `${str.substring(0, 12)}...` : str)}
              />
              <YAxis
                stroke="#888888"
                fontSize={9}
                width={48}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => formatChartAxisTick(v, formatValue)}
              />
              <Tooltip content={<CustomChartTooltip formatValue={formatValue} />} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={45}>
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 sm:p-6 w-[95vw] sm:w-full max-w-4xl max-h-[92vh] flex flex-col gap-3 animate-in zoom-in-95 duration-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5 shrink-0">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600 dark:text-sky-400 shrink-0" />
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 truncate max-w-[200px] sm:max-w-md">{title}</h3>
                <Badge variant="outline" className="text-[10px] sm:text-xs uppercase font-mono bg-slate-100 dark:bg-slate-800 shrink-0">
                  {type} chart
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsModalOpen(false)}
                className="h-8 w-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="w-full h-[320px] sm:h-[450px] pt-1">
              <ResponsiveContainer width="100%" height="100%">
                {type === "line" ? (
                  <LineChart data={data} margin={{ top: 15, right: 20, left: 10, bottom: 45 }}>
                    <XAxis
                      dataKey="name"
                      stroke="#888888"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                      angle={-25}
                      textAnchor="end"
                      height={45}
                      tickFormatter={(str) => (typeof str === "string" && str.length > 18 ? `${str.substring(0, 16)}...` : str)}
                    />
                    <YAxis
                      stroke="#888888"
                      fontSize={10}
                      width={55}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => formatChartAxisTick(v, formatValue)}
                    />
                    <Tooltip content={<CustomChartTooltip formatValue={formatValue} />} />
                    <Legend wrapperStyle={{ paddingTop: "10px", fontSize: "11px" }} />
                    <Line
                      type="monotone"
                      dataKey="value"
                      name={title}
                      stroke="hsl(158, 64%, 40%)"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "hsl(158, 64%, 40%)" }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                ) : type === "area" ? (
                  <AreaChart data={data} margin={{ top: 15, right: 20, left: 10, bottom: 45 }}>
                    <defs>
                      <linearGradient id="chartGradModal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(158, 64%, 40%)" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="hsl(158, 64%, 40%)" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="name"
                      stroke="#888888"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                      angle={-25}
                      textAnchor="end"
                      height={45}
                      tickFormatter={(str) => (typeof str === "string" && str.length > 18 ? `${str.substring(0, 16)}...` : str)}
                    />
                    <YAxis
                      stroke="#888888"
                      fontSize={10}
                      width={55}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => formatChartAxisTick(v, formatValue)}
                    />
                    <Tooltip content={<CustomChartTooltip formatValue={formatValue} />} />
                    <Legend wrapperStyle={{ paddingTop: "10px", fontSize: "11px" }} />
                    <Area
                      type="monotone"
                      dataKey="value"
                      name={title}
                      stroke="hsl(158, 64%, 40%)"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#chartGradModal)"
                    />
                  </AreaChart>
                ) : type === "pie" ? (
                  <PieChart>
                    <Tooltip content={<CustomChartTooltip formatValue={formatValue} />} />
                    <Legend wrapperStyle={{ paddingTop: "14px", fontSize: "11px" }} />
                    <Pie
                      data={data}
                      cx="50%"
                      cy="42%"
                      innerRadius={50}
                      outerRadius={105}
                      paddingAngle={6}
                      dataKey="value"
                      label={({ name, percent }) => `${typeof name === "string" && name.length > 12 ? name.substring(0, 10) + "..." : name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {data.map((_, index) => (
                        <Cell key={`modal-cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                ) : (
                  <BarChart data={data} margin={{ top: 15, right: 20, left: 10, bottom: 45 }}>
                    <XAxis
                      dataKey="name"
                      stroke="#888888"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                      angle={-25}
                      textAnchor="end"
                      height={45}
                      tickFormatter={(str) => (typeof str === "string" && str.length > 18 ? `${str.substring(0, 16)}...` : str)}
                    />
                    <YAxis
                      stroke="#888888"
                      fontSize={10}
                      width={55}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => formatChartAxisTick(v, formatValue)}
                    />
                    <Tooltip content={<CustomChartTooltip formatValue={formatValue} />} />
                    <Legend wrapperStyle={{ paddingTop: "10px", fontSize: "11px" }} />
                    <Bar dataKey="value" name={title} radius={[6, 6, 0, 0]} maxBarSize={60}>
                      {data.map((_, index) => (
                        <Cell key={`modal-cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const SUGGESTIONS = [
  "What were our total sales this year?",
  "Which products generated the most revenue?",
  "Which customers purchased the most?",
  "How much is currently outstanding?",
  "How much receivables are overdue?",
  "Which products are low in stock?",
  "What is our on-time delivery rate?",
  "Which month had the highest sales?",
  "How many orders were cancelled?",
];

function FormattedMarkdown({ text }: { text: string }) {
  const lines = text.split("\n");

  return (
    <div className="space-y-1">
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim();

        if (!trimmed) {
          return <div key={lineIdx} className="h-1" />;
        }

        const parseBold = (str: string) => {
          const parts = str.split(/(\*\*.*?\*\*)/g);
          return parts.map((part, pIdx) => {
            if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
              return (
                <strong key={pIdx} className="font-bold text-slate-900 dark:text-slate-100">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            return part;
          });
        };

        const numMatch = trimmed.match(/^(\d+)[\.\)]\s+(.*)/);
        if (numMatch) {
          return (
            <div key={lineIdx} className="flex items-start gap-1.5 pl-0.5 my-0.5">
              <span className="font-bold text-blue-600 dark:text-sky-400 shrink-0">{numMatch[1]}.</span>
              <div>{parseBold(numMatch[2]!)}</div>
            </div>
          );
        }

        const bulletMatch = trimmed.match(/^[\-\*]\s+(.*)/);
        if (bulletMatch) {
          return (
            <div key={lineIdx} className="flex items-start gap-1.5 pl-1.5 my-0.5">
              <span className="text-blue-600 dark:text-sky-400 font-bold shrink-0">•</span>
              <div>{parseBold(bulletMatch[1]!)}</div>
            </div>
          );
        }

        return <p key={lineIdx}>{parseBold(line)}</p>;
      })}
    </div>
  );
}

function AiAssistantPage() {
  const { dateRange: contextRange } = useDashboard();
  const [dataset, setDataset] = useState<Dataset | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "ai",
      text: "Hello! I am your VisionPulse Sales & Operations Intelligence Assistant. Ask me anything about your sales performance, inventory status, receivables, customer rankings, or logistics performance.",
      sourceTag: "VisionPulse Data Engine",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    loadDataset().then((data) => {
      if (isMounted) setDataset(data);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Always use allTime for AI Assistant since date filter is hidden
  const dateRange = resolvePreset("allTime");

  // Smooth internal scroll to bottom of chat without page jumping
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, loading]);

  const handleSend = async (questionText?: string) => {
    const q = (questionText || input).trim();
    if (!q || !dataset || loading) return;

    setInput("");

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: "user",
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    // Prepare chat history payload for contextual follow-up resolution
    const chatHistoryPayload = messages
      .filter((m) => m.id !== "welcome" && m.text)
      .slice(-10)
      .map((m) => ({
        sender: m.sender,
        text: m.text,
      }));

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      // 1. Run deterministic query engine locally over dataset with history context
      const localResult = queryAiEngine(q, dataset, dateRange, chatHistoryPayload);

      // 2. Call secure server function queryGeminiServerFn (which holds process.env.GEMINI_API_KEY)
      let aiText = localResult.directAnswer;
      let sourceTag = "VisionPulse Data Engine";

      if (localResult.isSupported) {
        try {
          const res = await queryGeminiServerFn({
            data: {
              question: q,
              structuredFacts: localResult.structuredFacts,
              isSupported: localResult.isSupported,
              fallbackAnswer: localResult.directAnswer,
              chatHistory: chatHistoryPayload,
            },
          });
          if (res?.answer) aiText = res.answer;
          if (res?.source) sourceTag = res.source;
        } catch {
          // Fallback to local engine text on network failure
          aiText = localResult.directAnswer;
          sourceTag = "VisionPulse Data Engine";
        }
      }

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        text: aiText,
        sourceTag,
        isError: !localResult.isSupported,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        ...(localResult.chartConfig ? { chartConfig: localResult.chartConfig } : {}),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: "ai",
          text: "I encountered an issue processing that query over the dataset.",
          sourceTag: "System Error",
          isError: true,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <DashboardLayout
      title="AI Business Intelligence Assistant"
      hideDateFilter={true}
    >
      <div className="w-full h-[calc(100vh-8rem)] sm:h-[calc(100vh-9rem)] md:h-[calc(100vh-10rem)] flex flex-col min-h-0 overflow-hidden">
        {/* Outer Bento Container taking 100% available space */}
        <div className="bento-card flex-1 flex flex-col min-h-0 overflow-hidden p-2 sm:p-3.5 md:p-5 shadow-sm">
          {/* Header (Fixed at top inside container) */}
          <div className="flex flex-col gap-2.5 shrink-0 border-b border-slate-200/60 dark:border-slate-800/60 pb-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    {/* <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-sky-400 animate-pulse shrink-0" /> */} AI Assistant 
                  </h1>
                  <Badge variant="outline" className="text-[9px] sm:text-[10px] font-mono border-blue-200 dark:border-sky-800 text-blue-600 dark:text-sky-400 bg-blue-50 dark:bg-sky-950/60 px-1.5 py-0.5 rounded-full shrink-0">
                    Gemini 3.5
                  </Badge>
                </div>
                <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                  Dataset-backed intelligence powered by Gemini 3.5 & VisionPulse
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setMessages([
                    {
                      id: "welcome",
                      sender: "ai",
                      text: "Hello! I am your VisionPulse Sales & Operations Intelligence Assistant. Ask me anything about your sales performance, inventory status, receivables, customer rankings, or logistics performance.",
                      sourceTag: "VisionPulse Data Engine",
                      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                    },
                  ])
                }
                className="h-7 sm:h-8 text-[9px] sm:text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 gap-1 rounded-lg border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0 px-2 sm:px-3"
              >
                <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> 
                <span className="hidden sm:inline">Clear</span>
              </Button>
            </div>
          </div>

          {/* Messages Internal Scroll Area */}
          <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-y-auto py-2.5 sm:py-3 pr-1.5 sm:pr-2 space-y-2.5 sm:space-y-3.5">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start gap-1.5 sm:gap-2.5 ${msg.sender === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                <div
                  className={`flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg sm:rounded-xl shrink-0 shadow-xs ${
                    msg.sender === "user"
                      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-bold text-[10px] sm:text-xs"
                      : "bg-blue-50 dark:bg-sky-950/60 border border-blue-200/60 dark:border-sky-800/60 text-blue-600 dark:text-sky-400"
                  }`}
                >
                  {msg.sender === "user" ? <User className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> : <Bot className="h-3 w-3 sm:h-3.5 sm:w-3.5" />}
                </div>

                <div
                  className={`group relative max-w-[90%] sm:max-w-[80%] md:max-w-[70%] rounded-xl sm:rounded-2xl px-2.5 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm leading-relaxed sm:leading-relaxed shadow-xs ${
                    msg.sender === "user"
                      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-tr-sm sm:rounded-tr-xs"
                      : msg.isError
                      ? "bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-tl-sm sm:rounded-tl-xs"
                      : "bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800/60 rounded-tl-sm sm:rounded-tl-xs text-slate-800 dark:text-slate-100"
                  }`}
                >
                  <FormattedMarkdown text={msg.text} />
                  {msg.chartConfig && <InlineChatChart config={msg.chartConfig} />}

                  {/* Footer metadata bar with copy icon at bottom-right */}
                  <div className="mt-1.5 sm:mt-2 pt-1.5 sm:pt-2 border-t border-slate-200/40 dark:border-slate-700/40 flex items-center justify-between text-[9px] sm:text-[11px] font-mono gap-1.5 sm:gap-2.5">
                    <div className="flex items-center gap-0.5 sm:gap-1.5 opacity-75 text-[9px] sm:text-[10px]">
                      <span>{msg.timestamp}</span>
                      {msg.sourceTag && (
                        <span className="hidden sm:flex items-center gap-1 font-sans font-medium text-blue-600 dark:text-sky-400 text-[9px] sm:text-[10px]">
                          <ShieldCheck className="h-3 w-3" /> {msg.sourceTag}
                        </span>
                      )}
                    </div>

                    {/* Copy icon button in footer bar */}
                    <button
                      onClick={() => handleCopy(msg.id, msg.text)}
                      className={`p-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-all duration-200 ${
                        msg.sender === "user"
                          ? "hover:bg-white/20 text-white/80 hover:text-white"
                          : "hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                      }`}
                      title="Copy message"
                    >
                      {copiedId === msg.id ? (
                        <Check className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-start gap-1.5 sm:gap-2.5">
                <div className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg sm:rounded-xl bg-blue-50 dark:bg-sky-950/60 border border-blue-200/60 dark:border-sky-800/60 text-blue-600 dark:text-sky-400 shrink-0">
                  <Bot className="h-3 w-3 sm:h-3.5 sm:w-3.5 animate-pulse" />
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800/60 rounded-xl sm:rounded-2xl rounded-tl-sm sm:rounded-tl-xs px-2.5 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-slate-500 flex items-center gap-1.5 sm:gap-2 shadow-xs">
                  <span className="animate-pulse font-medium">Analyzing dataset...</span>
                </div>
              </div>
            )}
          </div>

          {/* Pinned Bottom Area: Prompt Suggestions & Input Bar */}
          <div className="shrink-0 pt-2 sm:pt-2.5 border-t border-slate-200/60 dark:border-slate-800/60 space-y-2">
            {/* Prompt Suggestions - Hidden on mobile, grid on tablet+ */}
            {messages.length < 5 && (
              <div className="hidden sm:flex sm:flex-col sm:space-y-1.5">
                <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                  <HelpCircle className="h-3 w-3 text-blue-500 shrink-0" />
                  <span>Suggested:</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-1">
                  {SUGGESTIONS.slice(0, 6).map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(s)}
                      className="px-2 py-1 text-[10px] font-medium rounded-md border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-sky-950/50 hover:border-blue-300 dark:hover:border-sky-700 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-sky-400 transition-all text-left shadow-xs line-clamp-2"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Fixed Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-1.5 sm:gap-2"
            >
              <Input
                placeholder="Ask about sales, orders, inventory..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
                className="h-9 sm:h-10 text-xs sm:text-sm rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 px-3 sm:px-4 shadow-xs focus-visible:ring-blue-500 placeholder:text-xs"
              />
              <Button
                type="submit"
                disabled={!input.trim() || loading}
                className="h-9 sm:h-10 px-3 sm:px-4 rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 font-semibold text-xs gap-1 shadow-xs shrink-0"
              >
                <Send className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Send</span>
              </Button>
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
