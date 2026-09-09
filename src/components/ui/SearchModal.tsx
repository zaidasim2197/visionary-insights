import React, { useState, useEffect } from "react";
import { Search as SearchIcon, X, Package, Users, ShoppingBag, FileText, ArrowRight } from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";
import { dashboardService } from "@/services/dashboardService";
import type { SearchHit } from "@/lib/shared-types";
import { useNavigate } from "@tanstack/react-router";

export const SearchModal: React.FC = () => {
  const { isSearchOpen, setIsSearchOpen, role, openDrillDown } = useDashboard();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setHits([]);
      return;
    }
    setLoading(true);
    const timer = setTimeout(() => {
      dashboardService.search(query, role).then((res) => {
        setHits(res.data);
        setLoading(false);
      });
    }, 200);

    return () => clearTimeout(timer);
  }, [query, role]);

  if (!isSearchOpen) return null;

  const handleSelect = (hit: SearchHit) => {
    setIsSearchOpen(false);
    setQuery("");

    if (hit.type === "Product") {
      openDrillDown("lowstock", `Product: ${hit.title}`, hit.id);
    } else if (hit.type === "Order") {
      openDrillDown("orders", `Order: ${hit.id}`, hit.id);
    } else if (hit.type === "Customer") {
      openDrillDown("customer", `Customer: ${hit.title}`, hit.id);
    } else if (hit.type === "Invoice") {
      openDrillDown("outstanding", `Invoice: ${hit.id}`, hit.id);
    }
  };

  const getIcon = (type: SearchHit["type"]) => {
    switch (type) {
      case "Product":
        return <Package className="w-4 h-4 text-blue-500" />;
      case "Customer":
        return <Users className="w-4 h-4 text-emerald-500" />;
      case "Order":
        return <ShoppingBag className="w-4 h-4 text-purple-500" />;
      case "Invoice":
        return <FileText className="w-4 h-4 text-amber-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-sm flex items-start justify-center pt-20 px-4 animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Search Bar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center space-x-3">
          <SearchIcon className="w-5 h-5 text-slate-400" />
          <input
            type="text"
            autoFocus
            placeholder="Search products, customers, orders, invoices... (Cmd+K)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-slate-100 focus:outline-none placeholder:text-slate-400"
          />
          <button
            onClick={() => setIsSearchOpen(false)}
            className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results Body */}
        <div className="max-h-96 overflow-y-auto p-2">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">Searching dataset...</div>
          ) : query.length >= 2 && hits.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No matching dataset entities found for "{query}".
            </div>
          ) : hits.length > 0 ? (
            <div className="space-y-1">
              {hits.map((hit, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelect(hit)}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                      {getIcon(hit.type)}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {hit.title}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {hit.subtitle}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 text-[11px] font-medium text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200">
                    <span>{hit.type}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-slate-400">
              Type at least 2 characters to search across Products, Customers, Orders, and Receivables.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
