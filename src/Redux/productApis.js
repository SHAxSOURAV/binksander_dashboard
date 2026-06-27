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
  category: it["Product category"] || it["Product notes"] || it.country || "—",
  subcategory: "",
  amazonPrice: parsePrice(it.product_price),
  price: parsePrice(it.PRICE) || parsePrice(it.product_price),
  purchasePrice: parsePrice(it["Purchase price"]),
  deliveryTime: it["DELIVERY TIME"] || "",
  rating: parseFloat(it.product_star_rating) || 0,
  reviews: parseInt(it.product_num_ratings, 10) || 0,
  image: it.product_photo || "",
  productUrl: it.product_url || "",
  ean: it.spreadsheet_ean || "",
  stock: it.STOCK || "",
  status: it.STATUS || "",
  spreadsheetUrl: it.spreadsheet_url || "",
  spreadsheetTitle: it.spreadsheet_title || "",
  sheetId: it.sheet_id || "",
  isValidAmazon: !!it.is_valid_amazon,
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
      query: ({ 
        page = 1, 
        limit = 50, 
        search = "",
        filter_status,
        filter_stock,
        filter_category,
        filter_delivery,
        filter_min_price,
        filter_max_price,
        filter_min_purchase,
        filter_max_purchase,
        filter_is_valid_amazon,
        filter_min_rating,
        filter_max_rating
      } = {}) => {
        const params = new URLSearchParams({ page, limit });
        if (search?.trim()) params.set("search", search.trim());
        if (filter_status?.trim()) params.set("filter_status", filter_status.trim());
        if (filter_stock?.trim()) params.set("filter_stock", filter_stock.trim());
        if (filter_category?.trim()) params.set("filter_category", filter_category.trim());
        if (filter_delivery?.trim()) params.set("filter_delivery", filter_delivery.trim());
        if (filter_min_price) params.set("filter_min_price", filter_min_price);
        if (filter_max_price) params.set("filter_max_price", filter_max_price);
        if (filter_min_purchase) params.set("filter_min_purchase", filter_min_purchase);
        if (filter_max_purchase) params.set("filter_max_purchase", filter_max_purchase);
        if (filter_is_valid_amazon !== undefined && filter_is_valid_amazon !== "") {
            params.set("filter_is_valid_amazon", filter_is_valid_amazon);
        }
        if (filter_min_rating) params.set("filter_min_rating", filter_min_rating);
        if (filter_max_rating) params.set("filter_max_rating", filter_max_rating);
        
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

    getFiltersMeta: builder.query({
      query: () => "/spreadsheet/filters-meta",
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
          originalPrice: d.product_original_price || "",
          rating: d.product_star_rating || "",
          reviews: d.product_num_ratings || 0,
          productUrl: d.product_url || "",
          mainImage: d.product_photo || photos[0] || "",
          photos,
          delivery: d.delivery || d.delivery_time || "",
          isPrime: !!d.is_prime,
          isAmazonChoice: !!d.is_amazon_choice,
          isBestSeller: !!d.is_best_seller,
          specs: d.product_information || d.product_details || {},
          features: Array.isArray(d.about_product) ? d.about_product : [],
          returnPolicy: d.main_buy_box?.return_policy || "",
          buyBox: d.main_buy_box || {},
        };
      },
    }),

    // Get connected spreadsheet info
    getConnection: builder.query({
      query: () => "/spreadsheet/connection",
      providesTags: ["Connection"],
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

    // POST /spreadsheet/sync-asin
    syncAsin: builder.mutation({
      query: ({ asin, country = "NL" }) => ({
        url: `/spreadsheet/sync-asin?asin=${asin}&country=${country}`,
        method: "POST",
      }),
      invalidatesTags: ["Products"],
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

    // GET /bol/drafts/{id}
    getDraft: builder.query({
      query: (draftId) => `/bol/drafts/${draftId}`,
      providesTags: (result, error, id) => [{ type: "Drafts", id }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetConnectionQuery,
  useGetProductsQuery,
  useGetFiltersMetaQuery,
  useGetRawItemsQuery,
  useScrapeAsinQuery,
  useSyncInventoryMutation,
  useSyncAsinMutation,
  useImportOauthMutation,
  useResyncInventoryMutation,
  useCreateDraftFromAmazonMutation,
  usePublishDraftMutation,
  useUpdateDraftMutation,
  useGetDraftsQuery,
  useGetDraftQuery,
} = productApis;

export default productApis;
