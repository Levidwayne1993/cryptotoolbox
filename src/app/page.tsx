// ============================================================
// PASTE INTO: app/page.tsx (yardshoppers project)
//
// UPDATED: Added .eq("is_shadowbanned", false) to user listings
// query so shadowbanned users' posts are hidden from everyone
// except the shadowbanned user themselves.
// ============================================================

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import ListingCard from "@/components/ListingCard";
import DistanceSelector from "@/components/DistanceSelector";
import JsonLd from "@/components/JsonLd";
import TrendingSection from "@/components/TrendingSection";
import CategoryGrid from "@/components/CategoryGrid";
import { useLocation } from "@/lib/useLocation";
import { useDebounce } from "@/lib/useDebounce";

const supabase = createClient();

const CATEGORIES = [
  "Furniture",
  "Electronics",
  "Clothing",
  "Toys & Games",
  "Tools",
  "Kitchen",
  "Sports",
  "Books",
  "Antiques",
  "Garden",
  "Baby & Kids",
  "Vehicles",
  "Free Stuff",
];

function milesToDeg(miles: number) {
  return miles / 69;
}

/** Haversine distance in miles between two lat/lng points */
function getDistanceMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 3958.8; // Earth radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// HowTo schema — matches the "How YardShoppers Works" section
const howToSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to Find Yard Sales on YardShoppers",
  description:
    "Find amazing deals at yard sales near you in 3 simple steps using YardShoppers.",
  step: [
    {
      "@type": "HowToStep",
      position: 1,
      name: "Search",
      text: "Find yard sales near you by location, category, or keyword.",
      url: "https://www.yardshoppers.com/#how-it-works",
    },
    {
      "@type": "HowToStep",
      position: 2,
      name: "Save",
      text: "Save your favorite listings and plan your yard sale route.",
      url: "https://www.yardshoppers.com/#how-it-works",
    },
    {
      "@type": "HowToStep",
      position: 3,
      name: "Visit",
      text: "Get directions and head out to find amazing deals!",
      url: "https://www.yardshoppers.com/#how-it-works",
    },
  ],
};

// Breadcrumb schema for homepage
const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: "https://www.yardshoppers.com",
    },
  ],
};

export default function HomePage() {
  const {
    city,
    region,
    lat,
    lng,
    loading: locationLoading,
    requestPreciseLocation,
  } = useLocation();

  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [sort, setSort] = useState("nearest");
  const [distance, setDistance] = useState(50);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    async function getUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    }
    getUser();
  }, []);

  function handleDistanceChange(value: number) {
    setDistance(value);
    if (value < 999) {
      requestPreciseLocation();
    }
  }

  function toggleCategory(cat: string) {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  function clearCategories() {
    setSelectedCategories([]);
  }

  useEffect(() => {
    // Wait for location before fetching (unless user chose "Any" distance)
    if (distance < 999 && (!lat || !lng)) return;

    async function fetchListings() {
      setLoading(true);

      // ── Query 1: User-posted listings ──
      let userQuery = supabase.from("listings").select("*, listing_photos(*)");

      // ✅ SHADOWBAN FILTER — hide shadowbanned listings from public view
      userQuery = userQuery.eq("is_shadowbanned", false);

      // ── Query 2: Collected external sales ──
      let extQuery = supabase.from("external_sales").select("*");

      // Apply search filter to BOTH
      if (debouncedSearch.trim()) {
        const term = `%${debouncedSearch.trim()}%`;
        userQuery = userQuery.or(
          `title.ilike.${term},description.ilike.${term},city.ilike.${term}`
        );
        extQuery = extQuery.or(
          `title.ilike.${term},description.ilike.${term},city.ilike.${term}`
        );
      }

      // Apply category filter to BOTH
      if (selectedCategories.length > 0) {
        const orClauses = selectedCategories
          .map((cat) => `category.eq.${cat},categories.cs.{${cat}}`)
          .join(",");
        userQuery = userQuery.or(orClauses);
        extQuery = extQuery.or(orClauses);
      }

      // Apply geographic bounding box to BOTH
      if (distance < 999 && lat && lng) {
        const deg = milesToDeg(distance);
        userQuery = userQuery
          .gte("latitude", lat - deg)
          .lte("latitude", lat + deg)
          .gte("longitude", lng - deg)
          .lte("longitude", lng + deg);
        extQuery = extQuery
          .gte("latitude", lat - deg)
          .lte("latitude", lat + deg)
          .gte("longitude", lng - deg)
          .lte("longitude", lng + deg);
      }

      userQuery = userQuery
        .order("is_boosted", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: sort === "oldest" });

      extQuery = extQuery
        .order("collected_at", { ascending: sort === "oldest" })
        .limit(50);

      userQuery = userQuery.limit(50);

      // Fetch BOTH tables in parallel
      const [userResult, extResult] = await Promise.all([
        userQuery,
        extQuery,
      ]);

      const userListings = userResult.data || [];

      // Normalize external_sales to match listings shape
      const externalListings = (extResult.data || []).map((ext: any) => ({
        ...ext,
        listing_photos: ext.photo_urls
          ? ext.photo_urls.map((url: string) => ({ photo_url: url }))
          : [],
        is_boosted: false,
        is_external: true,
        created_at: ext.collected_at,
      }));

      // Merge: boosted user listings first, then everything else
      let results = [...userListings, ...externalListings];

      // Client-side proximity sort
      if (sort === "nearest" && lat && lng && results.length > 0) {
        const boosted = results.filter((l: any) => l.is_boosted);
        const nonBoosted = results.filter((l: any) => !l.is_boosted);

        const sortByDistance = (a: any, b: any) => {
          const distA =
            a.latitude && a.longitude
              ? getDistanceMiles(lat, lng, a.latitude, a.longitude)
              : Infinity;
          const distB =
            b.latitude && b.longitude
              ? getDistanceMiles(lat, lng, b.latitude, b.longitude)
              : Infinity;
          return distA - distB;
        };

        boosted.sort(sortByDistance);
        nonBoosted.sort(sortByDistance);
        results = [...boosted, ...nonBoosted];
      }

      setListings(results.slice(0, 12));
      setLoading(false);
    }

    fetchListings();
  }, [debouncedSearch, selectedCategories, sort, distance, lat, lng]);

  return (
    <div>
      {/* Inject schemas */}
      <JsonLd data={howToSchema} />
      <JsonLd data={breadcrumbSchema} />

      <section className="relative bg-gradient-to-br from-ys-900 via-ys-800 to-ys-700 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 text-6xl animate-bounce">🏷️</div>
          <div className="absolute top-20 right-20 text-5xl animate-bounce delay-300">🛋️</div>
          <div className="absolute bottom-10 left-1/4 text-4xl animate-bounce delay-700">📦</div>
          <div className="absolute bottom-20 right-1/3 text-5xl animate-bounce delay-500">🎸</div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20 text-center relative z-10">
          <h1 className="text-3xl sm:text-5xl font-extrabold mb-3 leading-tight">
            Discover Yard Sales
            <br />
            <span className="text-ys-300">Near You</span>
          </h1>
          <p className="text-ys-100 text-lg mb-2 max-w-xl mx-auto">
            Find amazing deals in your neighborhood. Browse, save, and visit
            yard sales happening right now.
          </p>
          {(city || region) && (
            <p className="text-ys-300 text-sm mb-8">
              <i className="fa-solid fa-location-dot mr-1" aria-hidden="true" />
              {[city, region].filter(Boolean).join(", ")}
            </p>
          )}

          <div className="max-w-2xl mx-auto flex gap-3">
            <div className="flex-1 relative">
              <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search for furniture, electronics, toys..."
                className="w-full pl-11 pr-4 py-3.5 bg-white text-gray-900 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ys-400 shadow-lg"
              />
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              aria-label="Sort listings"
              className="bg-white text-gray-700 rounded-xl px-4 py-3.5 text-sm font-medium shadow-lg focus:outline-none focus:ring-2 focus:ring-ys-400"
            >
              <option value="nearest">Nearest</option>
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
            </select>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col gap-3 mb-6">
          <DistanceSelector value={distance} onChange={handleDistanceChange} />
          <div className="flex gap-2 overflow-x-auto pb-1 items-center">
            <button
              onClick={clearCategories}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                selectedCategories.length === 0
                  ? "bg-ys-800 text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              All
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                  selectedCategories.includes(cat)
                    ? "bg-ys-800 text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          {selectedCategories.length > 1 && (
            <p className="text-xs text-gray-500">
              Filtering by {selectedCategories.length} categories
            </p>
          )}
        </div>

        {loading || (distance < 999 && locationLoading) ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[4/3] bg-gray-200 rounded-2xl mb-3" />
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <i className="fa-solid fa-magnifying-glass text-3xl text-gray-300" aria-hidden="true" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">No sales found nearby</h2>
            <p className="text-gray-500 mb-6">Try expanding your distance or changing your search.</p>
            <button
              onClick={() => setDistance(999)}
              className="px-6 py-2.5 bg-ys-800 text-white rounded-full font-semibold hover:bg-ys-900 transition"
            >
              Show All Sales
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                currentUserId={currentUserId}
              />
            ))}
          </div>
        )}

        {listings.length > 0 && (
          <div className="text-center mt-10">
            <Link
              href="/browse"
              className="inline-flex items-center gap-2 px-8 py-3 bg-ys-800 hover:bg-ys-900 text-white rounded-full font-semibold transition-all hover:shadow-lg"
            >
              View All Sales
              <i className="fa-solid fa-arrow-right text-sm" aria-hidden="true" />
            </Link>
          </div>
        )}

        {/* Phase 20: Real-Time SEO Signals — Trending, Hot Near You, Price Drops, Popular Searches */}
        <TrendingSection />

        {/* Phase 22: Shop by Category — links to AI-enhanced category pages */}
        <CategoryGrid />

        {/* Route Planner CTA */}
        <section className="mt-12 bg-gradient-to-r from-ys-50 to-emerald-50 border border-ys-200 rounded-3xl p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <div className="w-14 h-14 bg-ys-100 rounded-2xl flex items-center justify-center shrink-0">
              <i className="fa-solid fa-route text-2xl text-ys-700" aria-hidden="true" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-lg font-bold text-gray-900 mb-1">
                Plan Your Route
              </h2>
              <p className="text-sm text-gray-600">
                Hit multiple sales in one trip. Map out the most efficient route
                and never miss a deal on your way.
              </p>
            </div>
            <Link
              href="/route-planner"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-ys-700 hover:bg-ys-800 text-white rounded-full font-semibold text-sm transition-all hover:shadow-lg shrink-0"
            >
              <i className="fa-solid fa-map-location-dot" aria-hidden="true" />
              Open Route Planner
            </Link>
          </div>
        </section>

        <section className="mt-10 bg-gradient-to-br from-ys-50 via-white to-amber-50 border border-ys-200 rounded-3xl p-8 sm:p-10">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">Why Sellers Love YardShoppers</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto mb-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <i className="fa-solid fa-check text-lg text-green-600" aria-hidden="true" />
              </div>
              <h3 className="font-bold text-gray-900 mb-1">Free to Post</h3>
              <p className="text-sm text-gray-500">List your yard sale in under 2 minutes — no fees, no catch.</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <i className="fa-solid fa-rocket text-lg text-amber-600" aria-hidden="true" />
              </div>
              <h3 className="font-bold text-gray-900 mb-1">Boost for More Eyes</h3>
              <p className="text-sm text-gray-500">Get up to 25x more views with optional boost tiers starting at just $1.99.</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <i className="fa-solid fa-map-location-dot text-lg text-blue-600" aria-hidden="true" />
              </div>
              <h3 className="font-bold text-gray-900 mb-1">Route Planner Ready</h3>
              <p className="text-sm text-gray-500">Buyers plan trips around your sale — boosted listings get priority pins.</p>
            </div>
          </div>
          <div className="text-center">
            <Link
              href="/post"
              className="inline-flex items-center gap-2 px-8 py-3 bg-ys-800 hover:bg-ys-900 text-white rounded-full font-bold transition-all hover:shadow-lg"
            >
              <i className="fa-solid fa-plus text-sm" aria-hidden="true" />
              Post Your Yard Sale — Free
            </Link>
          </div>
        </section>

        <section className="mt-16 mb-8" id="how-it-works">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">How YardShoppers Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-3xl mx-auto">
            {[
              { icon: "fa-magnifying-glass", title: "Search", desc: "Find yard sales near you by location, category, or keyword." },
              { icon: "fa-heart", title: "Save", desc: "Save your favorite listings and plan your yard sale route." },
              { icon: "fa-map-location-dot", title: "Visit", desc: "Get directions and head out to find amazing deals!" },
            ].map((step) => (
              <div key={step.title} className="text-center">
                <div className="w-14 h-14 bg-ys-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <i className={`fa-solid ${step.icon} text-xl text-ys-700`} aria-hidden="true" />
                </div>
                <h3 className="font-bold text-gray-900 mb-1">{step.title}</h3>
                <p className="text-sm text-gray-500">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { icon: "fa-dollar-sign", label: "Free to Browse" },
            { icon: "fa-location-crosshairs", label: "Location Based" },
            { icon: "fa-bolt", label: "Instant Posting" },
            { icon: "fa-shield-halved", label: "Secure & Private" },
          ].map((trust) => (
            <div key={trust.label} className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl">
              <div className="w-9 h-9 bg-ys-100 rounded-lg flex items-center justify-center shrink-0">
                <i className={`fa-solid ${trust.icon} text-sm text-ys-700`} aria-hidden="true" />
              </div>
              <span className="text-sm font-semibold text-gray-700">{trust.label}</span>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
