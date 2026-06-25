import { baseApis } from "./main/baseApis";

// Parse "€1,199.00" / "1199" → 1199 (number)
const parsePrice = (v) => {
  if (v == null) return 0;
  const n = parseFloat(String(v).replace(/[^\d.,-]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

// Map a backend scrape-items row into the shape the product UI expects.
const mapItem = (it, i) => ({
  id: it.asin || `item-${i}`,
  asin: it.asin || "",
  // Items whose live scrape failed come back without a title; show the ASIN
  // as a stand-in and flag them so the card can render a "syncing" state.
  title: it.product_title || (it.asin ? `ASIN ${it.asin}` : "Syncing…"),
  brand: it.brand || "",
  category: it["Product notes"] || it.country || "—",
  subcategory: "",
  amazonPrice: parsePrice(it.product_price),
  price: parsePrice(it.product_price),
  rating: parseFloat(it.product_star_rating) || 0,
  reviews: parseInt(it.product_num_ratings, 10) || 0,
  image: it.product_photo || "",
  productUrl: it.product_url || "",
  ean: it.spreadsheet_ean || "",
  stock: it.STOCK || "",
  status: it.STATUS || "",
  lastUpdated: "",
  published: false,
  description: it["Product notes"] || "",
  scrapePending: !!it.scrape_pending,
});

const productApis = baseApis.injectEndpoints({
  endpoints: (builder) => ({
    // GET /spreadsheet/scrape-items?page&limit&search  → { status, total, data: [...] }
    // Live-scrapes Amazon for display data; `search` filters server-side via the cache.
    getProducts: builder.query({
      query: ({ page = 1, limit = 50, search = "" } = {}) => {
        const params = new URLSearchParams({ page, limit });
        if (search.trim()) params.set("search", search.trim());
        return `/spreadsheet/scrape-items?${params.toString()}`;
      },
      transformResponse: (res, _meta, arg) => ({
        page: arg?.page || 1,
        limit: arg?.limit || 50,
        total: res?.total || 0,
        items: (res?.data || []).map(mapItem),
      }),
      providesTags: ["Products"],
    }),

    // GET /spreadsheet/items?page&limit  → raw spreadsheet rows (fast, no scrape)
    getRawItems: builder.query({
      query: ({ page = 1, limit = 50 } = {}) =>
        `/spreadsheet/items?page=${page}&limit=${limit}`,
      providesTags: ["Products"],
    }),

    // GET /spreadsheet/scrape-asin?asin&country  → full Amazon product details
    // (all photos, full description, price, rating) for a single product.
    scrapeAsin: builder.query({
      query: ({ asin, country = "NL" }) =>
        `/spreadsheet/scrape-asin?asin=${encodeURIComponent(asin)}&country=${country}`,
      transformResponse: (res) => {
        const d = res?.data || {};
        const photos = Array.isArray(d.product_photos)
          ? d.product_photos.filter(Boolean)
          : [];
        // Fall back to the single main photo if the array is missing.
        if (photos.length === 0 && d.product_photo) photos.push(d.product_photo);
        return {
          title: d.product_title || "",
          brand: d.product_byline || d.brand || "",
          description:
            d.product_description ||
            (Array.isArray(d.about_product) ? d.about_product.join("\n") : "") ||
            "",
          price: d.product_price || "",
          rating: d.product_star_rating || "",
          reviews: d.product_num_ratings || 0,
          productUrl: d.product_url || "",
          mainImage: d.product_photo || photos[0] || "",
          photos,
        };
      },
    }),

    // Connect inventory — products are imported from a public Google Spreadsheet.
    // POST /spreadsheet/import-public  { spreadsheet_url, sheet_id? }
    syncInventory: builder.mutation({
      query: ({ spreadsheet_url, sheet_id }) => ({
        url: "/spreadsheet/import-public",
        method: "POST",
        body: { spreadsheet_url, sheet_id },
      }),
      invalidatesTags: ["Products", "Connection"],
    }),

    // Connect a PRIVATE Google Spreadsheet the user picks after signing in with
    // Google (no need to make the sheet public).
    // POST /spreadsheet/import-oauth  { spreadsheet_url, access_token, sheet_id?, refresh_token? }
    importOauth: builder.mutation({
      query: ({ spreadsheet_url, access_token, sheet_id, refresh_token }) => ({
        url: "/spreadsheet/import-oauth",
        method: "POST",
        body: { spreadsheet_url, access_token, sheet_id, refresh_token },
      }),
      invalidatesTags: ["Products", "Connection"],
    }),

    // POST /spreadsheet/sync-spreadsheet  (re-pull the last connected sheet)
    resyncInventory: builder.mutation({
      query: () => ({ url: "/spreadsheet/sync-spreadsheet", method: "POST" }),
      invalidatesTags: ["Products", "Connection"],
    }),

    // Create a Bol.com draft from an Amazon ASIN (2.5x markup) → used before publishing.
    // POST /bol/drafts/from-amazon  { asin, country?, stock_amount? }
    createDraftFromAmazon: builder.mutation({
      query: (data) => ({
        url: "/bol/drafts/from-amazon",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Drafts"],
    }),

    // POST /bol/drafts/{id}/publish
    publishDraft: builder.mutation({
      query: (draftId) => ({
        url: `/bol/drafts/${draftId}/publish`,
        method: "POST",
      }),
      invalidatesTags: ["Drafts", "Products"],
    }),

    // PATCH /bol/drafts/{id}
    updateDraft: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/bol/drafts/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["Drafts"],
    }),

    // GET /bol/drafts
    getDrafts: builder.query({
      query: () => "/bol/drafts",
      providesTags: ["Drafts"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetProductsQuery,
  useGetRawItemsQuery,
  useScrapeAsinQuery,
  useSyncInventoryMutation,
  useImportOauthMutation,
  useResyncInventoryMutation,
  useCreateDraftFromAmazonMutation,
  usePublishDraftMutation,
  useUpdateDraftMutation,
  useGetDraftsQuery,
} = productApis;

export default productApis;
