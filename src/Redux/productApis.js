import { baseApis } from "./main/baseApis";

// Parse "€1,199.00" / "1199" → 1199 (number)
const parsePrice = (v) => {
  if (v == null) return 0;
  const n = parseFloat(String(v).replace(/[^\d.,-]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

const parseStockQuantity = (it) => {
  if (typeof it.stock_quantity === "number") return it.stock_quantity;
  if (!it.STOCK) return null;
  const str = String(it.STOCK).trim().toLowerCase();
  if (str.includes("out of stock") || str.includes("unavailable") || str.includes("cant sell")) return 0;
  const match = str.match(/\d+/);
  if (match) return parseInt(match[0], 10);
  return null;
};

// Map a backend scrape-items row into the shape the product UI expects.
const mapItem = (it, i) => ({
  id: it.asin || it.item_id || it._id || `item-${i}`,
  itemId: it.item_id || it._id || null,
  asin: it.asin || "",
  // Items whose live scrape failed come back without a title; show the ASIN
  // as a stand-in and flag them so the card can render a "syncing" state.
  title: it.product_title || (it.asin ? `ASIN ${it.asin}` : "Syncing…"),
  brand: it.brand || it.product_brand || "",
  product_brand: it.product_brand || it.brand || "",
  // The backend normalises every spelling of the sheet's category column into
  // "Product category". Deliberately no `it.country` fallback — that is what made every
  // card show "NL" as its category when the column wasn't being read.
  category:
    it["Product category"] ||
    it["PRODUCT CATEGORY"] ||
    it.category ||
    "",
  subcategory: "",
  amazonPrice: parsePrice(it.product_price) || parsePrice(it.PRICE) || parsePrice(it["Purchase price"]),
  // The backend computes this with the selected Bol account's own multiplier, so the
  // catalog price tracks whatever that account is set to. The local formula is only a
  // fallback for responses predating that field — it assumes the default 2.5x.
  price: (() => {
    if (typeof it.selling_price === "number" && it.selling_price > 0) {
      return it.selling_price;
    }
    const rawP = parsePrice(it.product_price) || parsePrice(it.PRICE) || parsePrice(it["Purchase price"]);
    if (!rawP || rawP <= 0) return 39.95;
    const baseP = rawP * 2.5;
    const roundedP = Math.floor(baseP / 10) * 10 + 9.95;
    return Math.max(39.95, Math.round(roundedP * 100) / 100);
  })(),
  priceMultiplier: it.price_multiplier ?? 2.5,
  purchasePrice: parsePrice(it["Purchase price"]),
  deliveryTime: it["DELIVERY TIME"] || "",
  rating: parseFloat(it.product_star_rating) || 0,
  reviews: parseInt(it.product_num_ratings, 10) || 0,
  image: it.product_photo || "",
  // Small S3 companion object for list views; falls back to the full-size photo for
  // products scraped before thumbnails existed.
  thumbnail: it.product_photo_thumb || it.product_photo || "",
  productUrl: it.product_url || "",
  ean: it.spreadsheet_ean || "",
  stock: it.STOCK || "",
  stockQuantity: parseStockQuantity(it),
  stockSellerName: it.stock_seller_name || "",
  stockSyncedAt: it.stock_synced_at || "",
  status: it.STATUS || "",
  spreadsheetUrl: it.spreadsheet_url || "",
  spreadsheetTitle: it.spreadsheet_title || "",
  sheetId: it.sheet_id || "",
  isValidAmazon: !!it.is_valid_amazon,
  lastUpdated: "",
  syncedAt: it.synced_at || "",
  published: false,
  publishStatus: it.publish_status || "unpublished",
  publishError: it.publish_error || "",
  description: it["Product notes"] || "",
  scrapePending: !!it.scrape_pending,
  bol_offer_id: it.bol_offer_id || "",
  bol_on_hold: !!it.bol_on_hold,
  bol_stock: it.bol_stock || 0,
  pending_process_id: it.pending_process_id || "",
  pending_action: it.pending_action || "",
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
        sync_date_range,
        title_source,
        filter_status,
        filter_stock,
        filter_category,
        filter_delivery,
        filter_brand,
        filter_return_rate,
        multiplier = 2.5,
        filter_min_price,
        filter_max_price,
        filter_min_purchase,
        filter_max_purchase,
        filter_is_valid_amazon,
        filter_min_rating,
        filter_max_rating,
        sortBy,
        sortOrder
      } = {}) => {
        const query = new URLSearchParams();
        query.append("page", page);
        query.append("limit", limit);
        if (search) query.append("search", search);
        if (sync_date_range) query.append("sync_date_range", sync_date_range);
        if (title_source) query.append("title_source", title_source);
        if (filter_status) query.append("filter_status", filter_status);
        if (filter_stock) query.append("filter_stock", filter_stock);
        if (filter_category) query.append("filter_category", filter_category);
        if (filter_delivery) query.append("filter_delivery", filter_delivery);
        if (filter_brand) query.append("filter_brand", filter_brand);
        if (filter_return_rate) query.append("filter_return_rate", filter_return_rate);
        if (multiplier) query.append("multiplier", multiplier);
        if (filter_min_price) query.append("filter_min_price", filter_min_price);
        if (filter_max_price) query.append("filter_max_price", filter_max_price);
        if (filter_min_purchase) query.append("filter_min_purchase", filter_min_purchase);
        if (filter_max_purchase) query.append("filter_max_purchase", filter_max_purchase);
        if (filter_is_valid_amazon !== undefined) query.append("filter_is_valid_amazon", filter_is_valid_amazon);
        if (filter_min_rating) query.append("filter_min_rating", filter_min_rating);
        if (filter_max_rating) query.append("filter_max_rating", filter_max_rating);
        if (sortBy) query.append("sort_by", sortBy);
        if (sortOrder) query.append("sort_order", sortOrder);
        
        return `/spreadsheet/scrape-items?${query.toString()}`;
      },
      transformResponse: (res, _meta, arg) => ({
        page: arg?.page || 1,
        limit: arg?.limit || 50,
        total: res?.total || 0,
        has_any_items: res?.has_any_items || false,
        items: (res?.data || []).map(mapItem),
      }),
      providesTags: ["Products"],
      keepUnusedDataFor: 300, // 5 minutes cache
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

    // GET /spreadsheet/needs-review?page&limit&filter_brand&filter_reason&search
    getNeedsReviewItems: builder.query({
      query: ({ page = 1, limit = 50, filter_brand, filter_reason, search } = {}) => {
        let url = `/spreadsheet/needs-review?page=${page}&limit=${limit}`;
        if (filter_brand) {
          url += `&filter_brand=${encodeURIComponent(filter_brand)}`;
        }
        if (filter_reason) {
          url += `&filter_reason=${encodeURIComponent(filter_reason)}`;
        }
        if (search) {
          url += `&search=${encodeURIComponent(search)}`;
        }
        return url;
      },
      providesTags: ["Products"],
      keepUnusedDataFor: 120, // 2 minutes cache for instant tab-switching
    }),

    deleteNeedsReviewItem: builder.mutation({
      query: (itemId) => ({
        url: `/spreadsheet/needs-review/${itemId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Products"],
    }),

    deleteNeedsReviewBulk: builder.mutation({
      query: (itemIds) => ({
        url: "/spreadsheet/needs-review/bulk-delete",
        method: "POST",
        body: { item_ids: itemIds },
      }),
      invalidatesTags: ["Products"],
    }),

    revalidateItem: builder.mutation({
      query: (itemId) => ({
        url: `/spreadsheet/revalidate-item/${itemId}`,
        method: "POST",
      }),
      invalidatesTags: ["Products"],
    }),

    revalidateAll: builder.mutation({
      query: () => ({
        url: "/spreadsheet/revalidate-all",
        method: "POST",
      }),
      invalidatesTags: ["Products"],
    }),

    syncConnectedSheet: builder.mutation({
      query: () => ({
        url: "/spreadsheet/sync-connected-sheet",
        method: "POST",
      }),
      invalidatesTags: ["Products"],
    }),

    forcePassItem: builder.mutation({
      query: (itemId) => ({
        url: `/spreadsheet/force-pass/${itemId}`,
        method: "POST",
      }),
      invalidatesTags: ["Products"],
    }),

    forcePassBulk: builder.mutation({
      query: (itemIds) => ({
        url: "/spreadsheet/force-pass-bulk",
        method: "POST",
        body: { item_ids: itemIds },
      }),
      invalidatesTags: ["Products"],
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
      query: () => "/spreadsheet/connected",
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

    // POST /bol/drafts/{id}/translate-images
    translateDraftImages: builder.mutation({
      query: ({ draftId, bolAccountId }) => ({
        url: `/bol/drafts/${draftId}/translate-images`,
        method: "POST",
        headers: bolAccountId ? { "X-Bol-Account-Id": bolAccountId } : {},
      }),
      invalidatesTags: ["Drafts"],
    }),

    // POST /bol/drafts/bulk-translate-images
    bulkTranslateDraftImages: builder.mutation({
      query: (args) => {
        const ids = args?.draftIds || args?.draft_ids || [];
        const accountId = args?.bolAccountId || args?.account_id;
        return {
          url: `/bol/drafts/bulk-translate-images`,
          method: "POST",
          headers: accountId ? { "X-Bol-Account-Id": accountId } : {},
          body: { draft_ids: ids },
        };
      },
      invalidatesTags: ["Drafts"],
    }),

    // POST /bol/drafts/{id}/translate-image
    translateSingleImage: builder.mutation({
      query: ({ draftId, bolAccountId, photoIndex }) => ({
        url: `/bol/drafts/${draftId}/translate-image`,
        method: "POST",
        headers: bolAccountId ? { "X-Bol-Account-Id": bolAccountId } : {},
        body: { photo_index: photoIndex }
      }),
      // Do NOT invalidate "Drafts" here so we don't reset DraftEditModal's unsaved form state.
    }),

    // POST /bol/drafts/{id}/revert-image
    revertSingleImage: builder.mutation({
      query: ({ draftId, bolAccountId, photoIndex }) => ({
        url: `/bol/drafts/${draftId}/revert-image`,
        method: "POST",
        headers: bolAccountId ? { "X-Bol-Account-Id": bolAccountId } : {},
        body: { photo_index: photoIndex }
      }),
    }),

    // POST /spreadsheet/resync-stock
    resyncStock: builder.mutation({
      query: ({ asin, country = "NL" }) => ({
        url: `/spreadsheet/resync-stock`,
        method: "POST",
        body: { asin, country }
      }),
      invalidatesTags: ["Products", "StockAlerts"],
      async onQueryStarted({ asin }, { dispatch, queryFulfilled, getState }) {
        try {
          const { data: result } = await queryFulfilled;
          if (result?.success && result?.data) {
            const newStock = result.data.stock;
            const sellerName = result.data.seller_name || "";
            // Update every active getProducts cache entry to reflect the new stock
            const queries = getState().adminApis?.queries || {};
            Object.keys(queries).forEach((key) => {
              if (key.startsWith("getProducts(")) {
                const originalArgs = queries[key]?.originalArgs;
                if (originalArgs) {
                  dispatch(
                    productApis.util.updateQueryData("getProducts", originalArgs, (draft) => {
                      if (draft?.items) {
                        const product = draft.items.find((p) => p.asin === asin);
                        if (product) {
                          product.stockQuantity = newStock != null ? newStock : product.stockQuantity;
                          product.stock = newStock > 0 ? `${newStock} in stock` : "Out of stock";
                          if (sellerName) product.stockSellerName = sellerName;
                        }
                      }
                    })
                  );
                }
              }
            });
          }
        } catch {
          // Mutation failed – invalidatesTags will still refetch
        }
      },
    }),

    // GET /spreadsheet/low-stock-alerts?page=&limit=&search=
    getLowStockAlerts: builder.query({
      query: ({ page = 1, limit = 100, search = "" } = {}) => {
        const params = new URLSearchParams({ page, limit });
        if (search) params.set("search", search);
        return `/spreadsheet/low-stock-alerts?${params.toString()}`;
      },
      providesTags: ["StockAlerts"],
    }),

    // POST /spreadsheet/low-stock-alerts/dismiss
    dismissLowStockAlert: builder.mutation({
      query: ({ asin }) => ({
        url: `/spreadsheet/low-stock-alerts/dismiss`,
        method: "POST",
        body: { asin }
      }),
      invalidatesTags: ["StockAlerts"],
    }),

    // POST /bol/drafts/{id}/publish
    publishDraft: builder.mutation({
      query: ({ draftId, bolAccountId }) => ({
        url: `/bol/drafts/${draftId}/publish`,
        method: "POST",
        headers: bolAccountId ? { "X-Bol-Account-Id": bolAccountId } : {},
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

    // GET /bol/offers
    getBolOffers: builder.query({
      query: (paramsObj = {}) => {
        const { page = 1, limit = 50, search = "", refresh = false, ...filters } = paramsObj;
        const params = new URLSearchParams();
        if (page) params.append("page", page);
        if (limit) params.append("limit", limit);
        if (search) params.append("search", search);
        if (refresh) params.append("refresh", "true");
        
        // Append all active filters
        Object.entries(filters).forEach(([key, val]) => {
          if (val !== undefined && val !== null && val !== "") {
            params.append(key, val);
          }
        });
        
        return `/bol/offers?${params.toString()}`;
      },
      providesTags: ["BolOffers"],
      keepUnusedDataFor: 300, // 5 minutes cache
    }),

    // GET /bol/offers?refresh=true (Forced Sync)
    syncBolOffers: builder.mutation({
      query: () => ({
        url: "/bol/offers?refresh=true",
        method: "GET",
      }),
      invalidatesTags: ["BolOffers"],
    }),

    // GET /bol/product-image/{ean}
    getBolProductImage: builder.query({
      query: (ean) => `/bol/product-image/${ean}`,
      // 1 hour cache time for images
      keepUnusedDataFor: 3600,
    }),

    // POST /bol/product-images/batch → { ean: url } for a whole page in one request.
    getBolProductImagesBatch: builder.query({
      query: (eans) => ({
        url: "/bol/product-images/batch",
        method: "POST",
        body: { eans },
      }),
      keepUnusedDataFor: 3600,
    }),

    // POST /bol/offer-insights/batch → { offerId: insights } for a whole page.
    getBolOfferInsightsBatch: builder.query({
      query: (offers) => ({
        url: "/bol/offer-insights/batch",
        method: "POST",
        body: { offers },
      }),
      keepUnusedDataFor: 3600,
    }),

    // GET /bol/offer-insights/{offerId} → buy box, visits, rating, commission.
    // Fetched lazily per card; the backend caches per (account, offer) for 6h.
    getBolOfferInsights: builder.query({
      query: ({ offerId, ean, price }) => {
        const params = new URLSearchParams();
        if (ean) params.set("ean", ean);
        if (price) params.set("price", price);
        const qs = params.toString();
        return `/bol/offer-insights/${offerId}${qs ? `?${qs}` : ""}`;
      },
      keepUnusedDataFor: 3600,
    }),

    // GET /bol/product-assets/{ean}
    getBolProductAssets: builder.query({
      query: (ean) => `/bol/product-assets/${ean}`,
      keepUnusedDataFor: 3600,
    }),

    // PUT /bol/offers/{offerId}/status
    updateBolOfferStatus: builder.mutation({
      query: ({ offerId, onHoldByRetailer }) => ({
        url: `/bol/offers/${offerId}/status`,
        method: "PUT",
        body: { onHoldByRetailer },
      }),
      async onQueryStarted({ offerId, onHoldByRetailer }, { dispatch, queryFulfilled, getState }) {
        const patches = [];
        const queries = getState().productApis?.queries || {};
        Object.keys(queries).forEach((key) => {
          if (key.startsWith('getBolOffers(')) {
             const originalArgs = queries[key].originalArgs;
             patches.push(
               dispatch(
                 productApis.util.updateQueryData('getBolOffers', originalArgs, (draft) => {
                   if (draft?.data) {
                     const offer = draft.data.find(o => o.offerId === offerId);
                     if (offer) offer.onHoldByRetailer = onHoldByRetailer;
                   }
                 })
               )
             );
          }
        });
        try { await queryFulfilled; } catch { patches.forEach(p => p.undo()); }
      },
    }),

    // PUT /bol/offers/{offerId}/stock
    updateBolOfferStock: builder.mutation({
      query: ({ offerId, amount }) => ({
        url: `/bol/offers/${offerId}/stock`,
        method: "PUT",
        body: { amount },
      }),
      async onQueryStarted({ offerId, amount }, { dispatch, queryFulfilled, getState }) {
        const patches = [];
        const queries = getState().productApis?.queries || {};
        Object.keys(queries).forEach((key) => {
          if (key.startsWith('getBolOffers(')) {
             const originalArgs = queries[key].originalArgs;
             patches.push(
               dispatch(
                 productApis.util.updateQueryData('getBolOffers', originalArgs, (draft) => {
                   if (draft?.data) {
                     const offer = draft.data.find(o => o.offerId === offerId);
                     if (offer) {
                       if (!offer.stock) offer.stock = {};
                       offer.stock.amount = amount;
                     }
                   }
                 })
               )
             );
          }
        });
        try { await queryFulfilled; } catch { patches.forEach(p => p.undo()); }
      },
    }),

    // DELETE /bol/offers/{offerId}
    deleteBolOffer: builder.mutation({
      query: (offerId) => ({
        url: `/bol/offers/${offerId}`,
        method: "DELETE",
      }),
      async onQueryStarted(offerId, { dispatch, queryFulfilled, getState }) {
        const patches = [];
        const queries = getState().productApis?.queries || {};
        Object.keys(queries).forEach((key) => {
          if (key.startsWith('getBolOffers(')) {
             const originalArgs = queries[key].originalArgs;
             patches.push(
               dispatch(
                 productApis.util.updateQueryData('getBolOffers', originalArgs, (draft) => {
                   if (draft?.data) {
                     const offer = draft.data.find(o => o.offerId === offerId);
                     if (offer) {
                       offer.pending_action = "DELETING";
                     }
                   }
                 })
               )
             );
          }
        });
        try { await queryFulfilled; } catch { patches.forEach(p => p.undo()); }
      },
    }),

    // POST /bol/offers/bulk-delete
    bulkDeleteBolOffers: builder.mutation({
      query: ({ offer_ids }) => ({
        url: "/bol/offers/bulk-delete",
        method: "POST",
        body: { offer_ids },
      }),
      invalidatesTags: ["BolOffers"],
    }),

    // POST /bol/offers/bulk-stock
    bulkUpdateBolOfferStock: builder.mutation({
      query: ({ offer_ids, amount }) => ({
        url: "/bol/offers/bulk-stock",
        method: "POST",
        body: { offer_ids, amount },
      }),
      invalidatesTags: ["BolOffers"],
    }),

    // POST /bol/offers/bulk-status
    bulkUpdateBolOfferStatus: builder.mutation({
      query: ({ offer_ids, onHoldByRetailer }) => ({
        url: "/bol/offers/bulk-status",
        method: "POST",
        body: { offer_ids, onHoldByRetailer },
      }),
      invalidatesTags: ["BolOffers"],
    }),

    // GET /amazon/gtin-to-asin/{ean}
    getGtinToAsin: builder.query({
      query: (ean) => `/amazon/gtin-to-asin/${ean}?country=NL`,
      providesTags: ["Products"],
    }),

    // GET /bol/process-status/{processId}
    getBolProcessStatus: builder.query({
      query: (processId) => `/bol/process-status/${processId}`,
    }),

    // GET /spreadsheet/products/{asin}/live-delivery
    getLiveDelivery: builder.query({
      query: (asin) => `/spreadsheet/products/${asin}/live-delivery`,
    }),

    // GET /bol/content-report/{ean}
    getBolContentReport: builder.query({
      query: ({ ean, accountId }) => ({
        url: `/bol/content-report/${ean}`,
        headers: accountId ? { "x-bol-account-id": accountId } : {},
      }),
      providesTags: ["BolOffers"],
    }),

    // POST /bol/products/revalidate-content
    revalidateProductsContent: builder.mutation({
      query: ({ accountId, draftIds, eans, asins }) => ({
        url: "/bol/products/revalidate-content",
        method: "POST",
        headers: accountId ? { "x-bol-account-id": accountId } : {},
        body: { account_id: accountId, draft_ids: draftIds, eans, asins },
      }),
      invalidatesTags: ["Products", "Drafts", "BolOffers"],
    }),

    // POST /spreadsheet/revalidate-items (Quality validation check for Inventory Catalog)
    revalidateInventoryItems: builder.mutation({
      query: ({ item_ids, asins, eans, all_items } = {}) => ({
        url: "/spreadsheet/revalidate-items",
        method: "POST",
        body: { item_ids, asins, eans, all_items },
      }),
      invalidatesTags: ["Products", "NeedsReview"],
    }),

    // POST /bol/drafts/{draft_id}/enrich-attributes (AI Mandatory Field Enrichment)
    enrichDraftAttributes: builder.mutation({
      query: ({ draftId, bolAccountId }) => ({
        url: `/bol/drafts/${draftId}/enrich-attributes`,
        method: "POST",
        headers: bolAccountId ? { "x-bol-account-id": bolAccountId } : {},
      }),
      invalidatesTags: ["Drafts"],
    }),

    // GET /bol/drafts/{draft_id}/bol-payload-preview (Exact Bol Data Model & Payload Preview)
    getDraftBolPayloadPreview: builder.query({
      query: ({ draftId, bolAccountId }) => ({
        url: `/bol/drafts/${draftId}/bol-payload-preview`,
        method: "GET",
        headers: bolAccountId ? { "x-bol-account-id": bolAccountId } : {},
      }),
      providesTags: ["Drafts"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetConnectionQuery,
  useGetProductsQuery,
  useGetFiltersMetaQuery,
  useGetRawItemsQuery,
  useGetNeedsReviewItemsQuery,
  useDeleteNeedsReviewItemMutation,
  useDeleteNeedsReviewBulkMutation,
  useRevalidateItemMutation,
  useRevalidateAllMutation,
  useSyncConnectedSheetMutation,
  useForcePassItemMutation,
  useForcePassBulkMutation,
  useScrapeAsinQuery,
  useSyncInventoryMutation,
  useSyncAsinMutation,
  useImportOauthMutation,
  useResyncInventoryMutation,
  useCreateDraftFromAmazonMutation,
  useTranslateDraftImagesMutation,
  useBulkTranslateDraftImagesMutation,
  useTranslateSingleImageMutation,
  useRevertSingleImageMutation,
  useResyncStockMutation,
  useGetLowStockAlertsQuery,
  useDismissLowStockAlertMutation,
  usePublishDraftMutation,
  useUpdateDraftMutation,
  useGetDraftsQuery,
  useGetDraftQuery,
  useGetBolOffersQuery,
  useSyncBolOffersMutation,
  useGetBolProductImageQuery,
  useGetBolOfferInsightsQuery,
  useGetBolProductImagesBatchQuery,
  useGetBolOfferInsightsBatchQuery,
  useGetBolProductAssetsQuery,
  useGetGtinToAsinQuery,
  useUpdateBolOfferStatusMutation,
  useUpdateBolOfferStockMutation,
  useDeleteBolOfferMutation,
  useBulkDeleteBolOffersMutation,
  useBulkUpdateBolOfferStockMutation,
  useBulkUpdateBolOfferStatusMutation,
  useGetBolProcessStatusQuery,
  useGetLiveDeliveryQuery,
  useGetBolContentReportQuery,
  useLazyGetBolContentReportQuery,
  useRevalidateProductsContentMutation,
  useRevalidateInventoryItemsMutation,
  useEnrichDraftAttributesMutation,
  useGetDraftBolPayloadPreviewQuery,
} = productApis;

export default productApis;
