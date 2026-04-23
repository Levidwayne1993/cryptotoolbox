// ============================================================
// PASTE INTO: app/dashboard/page.tsx (yardshoppers project)
//
// UPDATED: Added Shadowban + Coupon admin tabs.
//   - Imported ShadowbanDashboard and CouponDashboard components
//   - Extended activeTab type to include "shadowban" | "coupons"
//   - Added two new tab buttons (ghost + ticket icons)
//   - Added conditional renders for both new tabs
// ============================================================

"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import BoostModal from "@/components/BoostModal";
import TrafficDashboard from "@/components/admin/TrafficDashboard";
import BoostDashboard from "@/components/admin/BoostDashboard";
import ShadowbanDashboard from "@/components/admin/ShadowbanDashboard";
import CouponDashboard from "@/components/admin/CouponDashboard";

const ADMIN_EMAIL = "erwin-levi@outlook.com";

interface Listing {
  id: string;
  title: string;
  city: string;
  state: string;
  sale_date: string;
  is_boosted: boolean;
  created_at: string;
  user_id: string;
  listing_photos?: { id: string; photo_url: string }[];
}

interface Report {
  id: string;
  reason: string;
  details: string | null;
  created_at: string;
  listing_id: string;
  reporter_id: string;
  listings?: {
    id: string;
    title: string;
    city: string;
    state: string;
    user_id: string;
    listing_photos?: { id: string; photo_url: string }[];
  };
}

export default function DashboardPage() {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [boostTarget, setBoostTarget] = useState<Listing | null>(null);
  const [activeTab, setActiveTab] = useState<
    "analytics" | "boosts" | "listings" | "reports" | "coverage" | "shadowban" | "coupons"
  >("analytics");

  const [selectedState, setSelectedState] = useState<string>("all");
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    mode: string;
    label: string;
    count: number;
    state?: string;
    city?: string;
  } | null>(null);
  const [deleteResult, setDeleteResult] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const {
        data: { user: u },
      } = await supabase.auth.getUser();

      if (!u) {
        router.push("/login");
        return;
      }

      setUser(u);
      const admin = u.email?.toLowerCase() === ADMIN_EMAIL;
      setIsAdmin(admin);

      let query = supabase
        .from("listings")
        .select("*, listing_photos(*)")
        .order("created_at", { ascending: false });

      if (!admin) {
        query = query.eq("user_id", u.id);
      }

      const { data: listingsData } = await query;
      setListings(listingsData || []);

      if (admin) {
        const { data: reportsData } = await supabase
          .from("reported_listings")
          .select(
            "*, listings(id, title, city, state, user_id, listing_photos(*))"
          )
          .eq("resolved", false)
          .order("created_at", { ascending: false });

        setReports(reportsData || []);
      }

      setLoading(false);
    }
    load();
  }, []);

  const stateMap = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    listings.forEach((l) => {
      const st = (l.state || "Unknown").toUpperCase().trim();
      const ct = (l.city || "Unknown").trim();
      if (!map[st]) map[st] = {};
      map[st][ct] = (map[st][ct] || 0) + 1;
    });
    return map;
  }, [listings]);

  const sortedStates = useMemo(() => {
    return Object.keys(stateMap).sort((a, b) => {
      const countA = Object.values(stateMap[a]).reduce((s, v) => s + v, 0);
      const countB = Object.values(stateMap[b]).reduce((s, v) => s + v, 0);
      return countB - countA;
    });
  }, [stateMap]);

  const citiesForSelectedState = useMemo(() => {
    if (selectedState === "all") return [];
    const cityMap = stateMap[selectedState] || {};
    return Object.entries(cityMap).sort((a, b) => b[1] - a[1]);
  }, [selectedState, stateMap]);

  const filteredListings = useMemo(() => {
    let result = listings;
    if (selectedState !== "all") {
      result = result.filter(
        (l) => (l.state || "").toUpperCase().trim() === selectedState
      );
    }
    if (selectedCity !== "all") {
      result = result.filter((l) => (l.city || "").trim() === selectedCity);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          (l.city || "").toLowerCase().includes(q) ||
          (l.state || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [listings, selectedState, selectedCity, searchQuery]);

  const adminOwnListings = useMemo(() => {
    if (!user) return [];
    return listings.filter((l) => l.user_id === user.id);
  }, [listings, user]);

  const adminFilteredOwn = useMemo(() => {
    if (!user) return [];
    return filteredListings.filter((l) => l.user_id === user.id);
  }, [filteredListings, user]);

  const expiredListings = useMemo(() => {
    if (!user) return [];
    const today = new Date().toISOString().split("T")[0];
    return adminOwnListings.filter(
      (l) => l.sale_date && l.sale_date < today
    );
  }, [adminOwnListings]);

  const lowCoverageCities = useMemo(() => {
    const result: { state: string; city: string; count: number }[] = [];
    Object.entries(stateMap).forEach(([state, cityMap]) => {
      Object.entries(cityMap).forEach(([city, count]) => {
        if (count < 3) {
          result.push({ state, city, count });
        }
      });
    });
    return result.sort((a, b) => a.count - b.count);
  }, [stateMap]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllFiltered() {
    setSelectedIds(new Set(adminFilteredOwn.map((l) => l.id)));
  }

  function deselectAll() {
    setSelectedIds(new Set());
  }

  function promptDelete(
    mode: string,
    label: string,
    count: number,
    state?: string,
    city?: string
  ) {
    setDeleteConfirm({ mode, label, count, state, city });
  }

  async function executeDelete() {
    if (!deleteConfirm) return;
    setIsDeleting(true);
    setDeleteResult(null);

    try {
      const payload: any = { mode: deleteConfirm.mode };
      if (deleteConfirm.mode === "selected") {
        payload.ids = Array.from(selectedIds);
      }
      if (deleteConfirm.state) payload.state = deleteConfirm.state;
      if (deleteConfirm.city) payload.city = deleteConfirm.city;

      const res = await fetch("/api/admin/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        setDeleteResult(
          `✅ ${data.deleted} listing${data.deleted !== 1 ? "s" : ""} deleted`
        );
        if (deleteConfirm.mode === "selected") {
          setListings((prev) =>
            prev.filter((l) => !selectedIds.has(l.id))
          );
          setSelectedIds(new Set());
        } else {
          const { data: fresh } = await supabase
            .from("listings")
            .select("*, listing_photos(*)")
            .order("created_at", { ascending: false });
          setListings(fresh || []);
          setSelectedIds(new Set());
        }
      } else {
        setDeleteResult(`❌ Error: ${data.error}`);
      }
    } catch (err: any) {
      setDeleteResult(`❌ Failed: ${err.message}`);
    }

    setIsDeleting(false);
    setDeleteConfirm(null);
    setTimeout(() => setDeleteResult(null), 4000);
  }

  async function handleDelete(listingId: string) {
    const listing = listings.find((l) => l.id === listingId);
    if (!listing || listing.user_id !== user?.id) {
      alert("You can only delete your own listings.");
      return;
    }
    const confirmed = confirm(
      "Are you sure you want to delete this listing? This cannot be undone."
    );
    if (!confirmed) return;

    try {
      await supabase
        .from("listing_photos")
        .delete()
        .eq("listing_id", listingId);
      await supabase.from("listings").delete().eq("id", listingId);
      setListings((prev) => prev.filter((l) => l.id !== listingId));
      setReports((prev) => prev.filter((r) => r.listing_id !== listingId));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(listingId);
        return next;
      });
    } catch (err) {
      alert("Failed to delete listing.");
    }
  }

  async function handleDismissReport(reportId: string) {
    await supabase
      .from("reported_listings")
      .update({ resolved: true })
      .eq("id", reportId);
    setReports((prev) => prev.filter((r) => r.id !== reportId));
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  function handleStateChange(state: string) {
    setSelectedState(state);
    setSelectedCity("all");
    setSelectedIds(new Set());
  }

  function clearFilters() {
    setSelectedState("all");
    setSelectedCity("all");
    setSearchQuery("");
    setSelectedIds(new Set());
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <i className="fa-solid fa-spinner fa-spin" />
          Loading your dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">My Account</h1>
            {isAdmin && (
              <span className="bg-red-100 text-red-700 text-xs font-bold px-2.5 py-1 rounded-full">
                Admin
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">{user?.email}</p>
        </div>
      </div>

      {/* QUICK LINKS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <Link
          href="/saved"
          className="flex items-center gap-3 p-4 bg-white border border-gray-100 rounded-2xl hover:border-ys-300 hover:shadow-sm transition group"
        >
          <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
            <i className="fa-solid fa-heart text-red-400 text-sm" />
          </div>
          <span className="text-sm font-semibold text-gray-700 group-hover:text-ys-800">
            Saved
          </span>
        </Link>
        <Link
          href="/browse"
          className="flex items-center gap-3 p-4 bg-white border border-gray-100 rounded-2xl hover:border-ys-300 hover:shadow-sm transition group"
        >
          <div className="w-10 h-10 bg-ys-50 rounded-xl flex items-center justify-center">
            <i className="fa-solid fa-magnifying-glass text-ys-600 text-sm" />
          </div>
          <span className="text-sm font-semibold text-gray-700 group-hover:text-ys-800">
            Browse
          </span>
        </Link>
        <Link
          href="/post"
          className="flex items-center gap-3 p-4 bg-white border border-gray-100 rounded-2xl hover:border-ys-300 hover:shadow-sm transition group"
        >
          <div className="w-10 h-10 bg-ys-50 rounded-xl flex items-center justify-center">
            <i className="fa-solid fa-plus text-ys-600 text-sm" />
          </div>
          <span className="text-sm font-semibold text-gray-700 group-hover:text-ys-800">
            Post a Sale
          </span>
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 p-4 bg-white border border-gray-100 rounded-2xl hover:border-red-200 hover:shadow-sm transition group"
        >
          <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
            <i className="fa-solid fa-right-from-bracket text-gray-400 text-sm" />
          </div>
          <span className="text-sm font-semibold text-gray-700 group-hover:text-red-500">
            Log out
          </span>
        </button>
      </div>

      {/* ADMIN TABS */}
      {isAdmin && (
        <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit flex-wrap">
          <button
            onClick={() => setActiveTab("analytics")}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${
              activeTab === "analytics"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <i className="fa-solid fa-chart-line mr-2 text-xs" />
            Analytics
          </button>
          <button
            onClick={() => setActiveTab("boosts")}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${
              activeTab === "boosts"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <i className="fa-solid fa-rocket mr-2 text-xs" />
            Boosts
          </button>
          <button
            onClick={() => setActiveTab("listings")}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${
              activeTab === "listings"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <i className="fa-solid fa-grid-2 mr-2 text-xs" />
            All Listings ({listings.length})
          </button>
          <button
            onClick={() => setActiveTab("coverage")}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${
              activeTab === "coverage"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <i className="fa-solid fa-map mr-2 text-xs" />
            Coverage
            {lowCoverageCities.length > 0 && (
              <span className="ml-2 bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {lowCoverageCities.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("reports")}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${
              activeTab === "reports"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <i className="fa-solid fa-flag mr-2 text-xs" />
            Reports
            {reports.length > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {reports.length}
              </span>
            )}
          </button>
          {/* NEW: Shadowban tab */}
          <button
            onClick={() => setActiveTab("shadowban")}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${
              activeTab === "shadowban"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <i className="fa-solid fa-ghost mr-2 text-xs" />
            Shadowban
          </button>
          {/* NEW: Coupons tab */}
          <button
            onClick={() => setActiveTab("coupons")}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${
              activeTab === "coupons"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <i className="fa-solid fa-ticket mr-2 text-xs" />
            Coupons
          </button>
        </div>
      )}

      {/* DELETE RESULT TOAST */}
      {deleteResult && (
        <div
          className={`mb-6 px-5 py-3 rounded-xl text-sm font-semibold ${
            deleteResult.startsWith("✅")
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {deleteResult}
        </div>
      )}

      {/* ===== ANALYTICS TAB ===== */}
      {activeTab === "analytics" && isAdmin && (
        <TrafficDashboard />
      )}

      {/* ===== BOOSTS TAB ===== */}
      {activeTab === "boosts" && isAdmin && (
        <BoostDashboard />
      )}

      {/* ===== LISTINGS TAB ===== */}
      {activeTab === "listings" && (
        <>
          {/* ADMIN FILTER BAR */}
          {isAdmin && (
            <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search listings..."
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ys-300 focus:border-ys-400 transition"
                  />
                </div>
                <select
                  value={selectedState}
                  onChange={(e) => handleStateChange(e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-ys-300 min-w-[160px]"
                >
                  <option value="all">All States ({listings.length})</option>
                  {sortedStates.map((st) => {
                    const count = Object.values(stateMap[st]).reduce(
                      (s, v) => s + v,
                      0
                    );
                    return (
                      <option key={st} value={st}>
                        {st} ({count})
                      </option>
                    );
                  })}
                </select>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  disabled={selectedState === "all"}
                  className={`bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-ys-300 min-w-[180px] ${
                    selectedState === "all"
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                >
                  <option value="all">
                    {selectedState === "all"
                      ? "Select a state first"
                      : `All Cities in ${selectedState} (${Object.values(
                          stateMap[selectedState] || {}
                        ).reduce((s, v) => s + v, 0)})`}
                  </option>
                  {citiesForSelectedState.map(([city, count]) => (
                    <option key={city} value={city}>
                      {city} ({count})
                    </option>
                  ))}
                </select>
              </div>

              {(selectedState !== "all" ||
                selectedCity !== "all" ||
                searchQuery) && (
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <p className="text-sm text-gray-500">
                    Showing {filteredListings.length} of {listings.length}{" "}
                    listings
                    {selectedState !== "all" && (
                      <span className="ml-1 inline-flex items-center gap-1 bg-ys-50 text-ys-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                        {selectedState}
                        {selectedCity !== "all" && ` / ${selectedCity}`}
                      </span>
                    )}
                  </p>
                  <button
                    onClick={clearFilters}
                    className="text-sm text-ys-700 hover:text-ys-900 font-semibold transition"
                  >
                    <i className="fa-solid fa-xmark mr-1 text-xs" />
                    Clear filters
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ADMIN BULK ACTION TOOLBAR */}
          {isAdmin && (
            <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <i className="fa-solid fa-toolbox text-ys-600 text-xs" />
                  Admin Tools
                </h3>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="bg-ys-50 text-ys-800 font-bold px-2 py-0.5 rounded-full">
                    {adminOwnListings.length} your listings
                  </span>
                  {expiredListings.length > 0 && (
                    <span className="bg-red-50 text-red-700 font-bold px-2 py-0.5 rounded-full">
                      {expiredListings.length} expired
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                <button
                  onClick={selectAllFiltered}
                  className="flex items-center gap-1.5 px-3 py-2 bg-ys-50 hover:bg-ys-100 text-ys-800 rounded-xl text-xs font-semibold transition"
                >
                  <i className="fa-regular fa-square-check text-xs" />
                  Select All Visible ({adminFilteredOwn.length})
                </button>
                {selectedIds.size > 0 && (
                  <button
                    onClick={deselectAll}
                    className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition"
                  >
                    <i className="fa-regular fa-square text-xs" />
                    Deselect All
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  disabled={selectedIds.size === 0}
                  onClick={() =>
                    promptDelete(
                      "selected",
                      `${selectedIds.size} selected listing${selectedIds.size !== 1 ? "s" : ""}`,
                      selectedIds.size
                    )
                  }
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
                    selectedIds.size > 0
                      ? "bg-red-500 hover:bg-red-600 text-white"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  <i className="fa-solid fa-trash text-[10px]" />
                  Delete Selected ({selectedIds.size})
                </button>

                {selectedState !== "all" && (
                  <button
                    onClick={() => {
                      const count = adminFilteredOwn.length;
                      if (count === 0) return;
                      promptDelete(
                        selectedCity !== "all" ? "city" : "state",
                        selectedCity !== "all"
                          ? `all your listings in ${selectedCity}, ${selectedState}`
                          : `all your listings in ${selectedState}`,
                        count,
                        selectedState,
                        selectedCity !== "all" ? selectedCity : undefined
                      );
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition"
                  >
                    <i className="fa-solid fa-location-dot text-[10px]" />
                    Delete All in{" "}
                    {selectedCity !== "all"
                      ? `${selectedCity}`
                      : `${selectedState}`}{" "}
                    ({adminFilteredOwn.length})
                  </button>
                )}

                {expiredListings.length > 0 && (
                  <button
                    onClick={() =>
                      promptDelete(
                        "expired",
                        `${expiredListings.length} expired listing${expiredListings.length !== 1 ? "s" : ""} (past sale date)`,
                        expiredListings.length
                      )
                    }
                    className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition"
                  >
                    <i className="fa-regular fa-calendar-xmark text-[10px]" />
                    Delete Expired ({expiredListings.length})
                  </button>
                )}

                <button
                  onClick={() =>
                    promptDelete(
                      "all",
                      `ALL ${adminOwnListings.length} of your listings across every state and city`,
                      adminOwnListings.length
                    )
                  }
                  className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-bold transition"
                >
                  <i className="fa-solid fa-skull-crossbones text-[10px]" />
                  Delete ALL My Listings ({adminOwnListings.length})
                </button>
              </div>
            </div>
          )}

          {/* LISTING HEADING */}
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            {isAdmin ? "All Listings" : "My Listings"}{" "}
            <span className="text-gray-400 font-normal">
              ({filteredListings.length})
            </span>
          </h2>

          {/* LISTING GRID */}
          {filteredListings.length === 0 ? (
            <div className="text-center py-16 bg-white border border-gray-100 rounded-2xl">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fa-solid fa-tag text-2xl text-gray-300" />
              </div>
              <p className="text-gray-500 mb-4">
                {selectedState !== "all" ||
                selectedCity !== "all" ||
                searchQuery
                  ? "No listings match your filters."
                  : isAdmin
                  ? "No listings yet."
                  : "You haven't posted any sales yet."}
              </p>
              {selectedState !== "all" ||
              selectedCity !== "all" ||
              searchQuery ? (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-2 bg-ys-800 hover:bg-ys-900 text-white px-6 py-2.5 rounded-full font-semibold transition"
                >
                  <i className="fa-solid fa-xmark text-xs" />
                  Clear Filters
                </button>
              ) : (
                <Link
                  href="/post"
                  className="inline-flex items-center gap-2 bg-ys-800 hover:bg-ys-900 text-white px-6 py-2.5 rounded-full font-semibold transition"
                >
                  <i className="fa-solid fa-plus text-xs" />
                  Post Your First Sale
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredListings.map((listing) => {
                const photo = listing.listing_photos?.[0]?.photo_url;
                const isOwner = listing.user_id === user?.id;
                const isSelected = selectedIds.has(listing.id);
                const isExpired =
                  listing.sale_date &&
                  listing.sale_date < new Date().toISOString().split("T")[0];

                return (
                  <div
                    key={listing.id}
                    className={`bg-white rounded-2xl overflow-hidden border transition-all hover:shadow-md relative ${
                      isSelected
                        ? "border-red-400 ring-2 ring-red-200"
                        : listing.is_boosted
                        ? "border-amber-200 shadow-sm"
                        : "border-gray-100"
                    }`}
                  >
                    {isAdmin && isOwner && (
                      <button
                        onClick={() => toggleSelect(listing.id)}
                        className={`absolute top-3 right-3 z-10 w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                          isSelected
                            ? "bg-red-500 text-white shadow-md"
                            : "bg-white/90 text-gray-400 hover:text-red-500 border border-gray-200 shadow-sm"
                        }`}
                      >
                        <i
                          className={`fa-solid ${
                            isSelected ? "fa-check" : "fa-square"
                          } text-xs`}
                        />
                      </button>
                    )}

                    {isExpired && isAdmin && (
                      <div className="absolute top-3 left-3 z-10 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Expired
                      </div>
                    )}

                    <Link
                      href={`/listing/${listing.id}`}
                      className="block relative aspect-[4/3] bg-gray-100"
                    >
                      {photo ? (
                        <Image
                          src={photo}
                          alt={listing.title}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 33vw"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full bg-ys-50">
                          <i className="fa-solid fa-tag text-3xl text-ys-300" />
                        </div>
                      )}
                      {listing.is_boosted && (
                        <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-amber-400 text-amber-900 text-xs font-bold px-2.5 py-1 rounded-full">
                          <i className="fa-solid fa-rocket text-[10px]" />
                          Boosted
                        </div>
                      )}
                    </Link>

                    <div className="p-4">
                      <Link href={`/listing/${listing.id}`}>
                        <h3 className="font-bold text-gray-900 hover:text-ys-800 transition truncate">
                          {listing.title}
                        </h3>
                      </Link>
                      <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                        <i className="fa-solid fa-location-dot text-[10px] text-ys-500" />
                        {listing.city}, {listing.state}
                      </p>
                      {listing.sale_date && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          <i className="fa-regular fa-calendar text-[10px] mr-1" />
                          {new Date(
                            listing.sale_date + "T00:00:00"
                          ).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      )}

                      {isOwner && (
                        <div className="mt-3 flex gap-2">
                          {!listing.is_boosted ? (
                            <button
                              onClick={() => setBoostTarget(listing)}
                              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-amber-900 py-2 rounded-xl text-sm font-bold transition-all"
                            >
                              <i className="fa-solid fa-rocket text-xs" />
                              Boost
                            </button>
                          ) : (
                            <div className="flex-1 flex items-center justify-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 py-2 rounded-xl text-sm font-semibold">
                              <i className="fa-solid fa-check-circle text-xs" />
                              Boosted
                            </div>
                          )}

                          <button
                            onClick={() => handleDelete(listing.id)}
                            className="flex items-center justify-center gap-1.5 px-4 py-2 border border-red-200 text-red-500 hover:bg-red-50 rounded-xl text-sm font-semibold transition"
                          >
                            <i className="fa-solid fa-trash text-xs" />
                            Delete
                          </button>
                        </div>
                      )}

                      {!isOwner && isAdmin && (
                        <div className="mt-3">
                          <Link
                            href={`/listing/${listing.id}`}
                            className="w-full flex items-center justify-center gap-2 border border-gray-200 hover:bg-gray-50 text-gray-600 py-2 rounded-xl text-sm font-semibold transition"
                          >
                            <i className="fa-solid fa-eye text-xs" />
                            View Listing
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ===== COVERAGE TAB ===== */}
      {activeTab === "coverage" && isAdmin && (
        <>
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            Coverage Overview
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-white border border-gray-100 rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">
                {listings.length}
              </p>
              <p className="text-xs text-gray-500 mt-1">Total Listings</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">
                {sortedStates.length}
              </p>
              <p className="text-xs text-gray-500 mt-1">States Covered</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">
                {Object.values(stateMap).reduce(
                  (total, cityMap) => total + Object.keys(cityMap).length,
                  0
                )}
              </p>
              <p className="text-xs text-gray-500 mt-1">Cities Covered</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-4 text-center">
              <p
                className={`text-2xl font-bold ${
                  lowCoverageCities.length > 0
                    ? "text-amber-600"
                    : "text-green-600"
                }`}
              >
                {lowCoverageCities.length}
              </p>
              <p className="text-xs text-gray-500 mt-1">Low Coverage</p>
            </div>
          </div>

          {lowCoverageCities.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-bold text-amber-800 mb-3 flex items-center gap-2">
                <i className="fa-solid fa-triangle-exclamation text-amber-500" />
                Cities Needing More Listings (fewer than 3)
              </h3>
              <div className="bg-amber-50 border border-amber-200 rounded-2xl divide-y divide-amber-100">
                {lowCoverageCities.map(({ state, city, count }) => (
                  <div
                    key={`${state}-${city}`}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div className="flex items-center gap-2">
                      <i className="fa-solid fa-location-dot text-amber-500 text-xs" />
                      <span className="text-sm font-semibold text-gray-900">
                        {city}, {state}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          count === 0
                            ? "bg-red-100 text-red-700"
                            : count === 1
                            ? "bg-amber-100 text-amber-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {count} listing{count !== 1 ? "s" : ""}
                      </span>
                      <button
                        onClick={() => {
                          setSelectedState(state);
                          setSelectedCity(city);
                          setActiveTab("listings");
                        }}
                        className="text-xs text-ys-700 hover:text-ys-900 font-semibold"
                      >
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <h3 className="text-sm font-bold text-gray-700 mb-3">
            Listings by State
          </h3>
          <div className="space-y-3">
            {sortedStates.map((state) => {
              const cityMap = stateMap[state];
              const totalForState = Object.values(cityMap).reduce(
                (s, v) => s + v,
                0
              );
              const sortedCities = Object.entries(cityMap).sort(
                (a, b) => b[1] - a[1]
              );

              return (
                <div
                  key={state}
                  className="bg-white border border-gray-100 rounded-2xl overflow-hidden"
                >
                  <button
                    onClick={() => {
                      setSelectedState(
                        selectedState === state ? "all" : state
                      );
                      setSelectedCity("all");
                    }}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-ys-50 rounded-xl flex items-center justify-center">
                        <span className="text-sm font-bold text-ys-800">
                          {state}
                        </span>
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-gray-900">
                          {totalForState} listing
                          {totalForState !== 1 ? "s" : ""}
                        </p>
                        <p className="text-xs text-gray-500">
                          {sortedCities.length} cit
                          {sortedCities.length !== 1 ? "ies" : "y"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="hidden sm:block w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-ys-500 rounded-full"
                          style={{
                            width: `${Math.min(
                              100,
                              (totalForState /
                                Math.max(
                                  ...sortedStates.map((s) =>
                                    Object.values(stateMap[s]).reduce(
                                      (a, b) => a + b,
                                      0
                                    )
                                  )
                                )) *
                                100
                            )}%`,
                          }}
                        />
                      </div>
                      <i
                        className={`fa-solid fa-chevron-down text-gray-400 text-xs transition-transform ${
                          selectedState === state ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </button>

                  {selectedState === state && (
                    <div className="border-t border-gray-100 px-5 py-3 bg-gray-50">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {sortedCities.map(([city, count]) => (
                          <button
                            key={city}
                            onClick={() => {
                              setSelectedCity(city);
                              setActiveTab("listings");
                            }}
                            className="flex items-center justify-between px-3 py-2 bg-white rounded-xl border border-gray-100 hover:border-ys-300 hover:shadow-sm transition text-left"
                          >
                            <span className="text-sm text-gray-700">
                              {city}
                            </span>
                            <span
                              className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                count >= 5
                                  ? "bg-green-100 text-green-700"
                                  : count >= 3
                                  ? "bg-ys-50 text-ys-800"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {count}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ===== REPORTS TAB ===== */}
      {activeTab === "reports" && isAdmin && (
        <>
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            Reported Listings{" "}
            <span className="text-gray-400 font-normal">
              ({reports.length})
            </span>
          </h2>

          {reports.length === 0 ? (
            <div className="text-center py-16 bg-white border border-gray-100 rounded-2xl">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fa-solid fa-check text-2xl text-green-500" />
              </div>
              <p className="text-gray-500">
                No reported listings to review. All clear!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => {
                const reportedListing = report.listings;
                const reportPhoto =
                  reportedListing?.listing_photos?.[0]?.photo_url;

                return (
                  <div
                    key={report.id}
                    className="bg-white border border-red-100 rounded-2xl p-5 hover:shadow-md transition"
                  >
                    <div className="flex flex-col sm:flex-row gap-4">
                      {reportedListing && (
                        <Link
                          href={`/listing/${reportedListing.id}`}
                          className="shrink-0 w-full sm:w-32 h-24 relative rounded-xl overflow-hidden bg-gray-100"
                        >
                          {reportPhoto ? (
                            <Image
                              src={reportPhoto}
                              alt={reportedListing.title}
                              fill
                              className="object-cover"
                              sizes="128px"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full bg-ys-50">
                              <i className="fa-solid fa-tag text-xl text-ys-300" />
                            </div>
                          )}
                        </Link>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-bold text-gray-900">
                              {reportedListing?.title || "Deleted Listing"}
                            </h3>
                            {reportedListing && (
                              <p className="text-sm text-gray-500 mt-0.5">
                                <i className="fa-solid fa-location-dot text-[10px] mr-1" />
                                {reportedListing.city},{" "}
                                {reportedListing.state}
                              </p>
                            )}
                          </div>
                          <span className="shrink-0 bg-red-100 text-red-700 text-xs font-bold px-2.5 py-1 rounded-full">
                            <i className="fa-solid fa-flag text-[10px] mr-1" />
                            Reported
                          </span>
                        </div>

                        <div className="mt-3 p-3 bg-red-50 rounded-xl">
                          <p className="text-sm font-semibold text-red-800">
                            {report.reason}
                          </p>
                          {report.details && (
                            <p className="text-sm text-red-600 mt-1">
                              {report.details}
                            </p>
                          )}
                        </div>

                        <p className="text-xs text-gray-400 mt-2">
                          Reported{" "}
                          {new Date(report.created_at).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            }
                          )}
                        </p>

                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => {
                              if (reportedListing) {
                                handleDelete(reportedListing.id);
                              }
                            }}
                            className="flex items-center gap-1.5 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition"
                          >
                            <i className="fa-solid fa-trash text-[10px]" />
                            Delete Listing
                          </button>
                          <button
                            onClick={() => handleDismissReport(report.id)}
                            className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl text-xs font-semibold transition"
                          >
                            <i className="fa-solid fa-xmark text-[10px]" />
                            Dismiss
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ===== SHADOWBAN TAB (NEW) ===== */}
      {activeTab === "shadowban" && isAdmin && (
        <ShadowbanDashboard />
      )}

      {/* ===== COUPONS TAB (NEW) ===== */}
      {activeTab === "coupons" && isAdmin && (
        <CouponDashboard />
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Confirm Delete
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete{" "}
              <span className="font-bold text-red-600">
                {deleteConfirm.label}
              </span>
              ? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={executeDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition disabled:opacity-50"
              >
                {isDeleting ? (
                  <span className="flex items-center justify-center gap-2">
                    <i className="fa-solid fa-spinner fa-spin text-xs" />
                    Deleting...
                  </span>
                ) : (
                  `Delete ${deleteConfirm.count} listing${deleteConfirm.count !== 1 ? "s" : ""}`
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOOST MODAL */}
      {boostTarget && (
        <BoostModal
          listing={boostTarget}
          onClose={() => setBoostTarget(null)}
        />
      )}
    </div>
  );
}
