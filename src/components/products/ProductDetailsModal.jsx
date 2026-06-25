import { useState, useEffect, useMemo } from "react";
import { Modal, Input, Select, Spin } from "antd";
import toast from "react-hot-toast";
import { FaStar } from "react-icons/fa";
import { FiExternalLink } from "react-icons/fi";
import {
  useCreateDraftFromAmazonMutation,
  usePublishDraftMutation,
  useScrapeAsinQuery,
} from "../../Redux/productApis";

const { TextArea } = Input;

// Parse a price that may use a comma as the decimal separator (e.g. "19,53")
// into a JS number. Returns null when it can't be parsed.
const parsePrice = (val) => {
  if (val == null || val === "") return null;
  const num = parseFloat(
    String(val)
      .replace(/[^\d.,]/g, "")
      .replace(",", "."),
  );
  return Number.isFinite(num) ? num : null;
};

// Format a number as a price string using a "." decimal separator.
const formatPrice = (num) => (num == null ? "" : num.toFixed(2));

const ProductDetailsModal = ({ open, onClose, product }) => {
  const [activeImage, setActiveImage] = useState("");
  const [createDraft, { isLoading: drafting }] =
    useCreateDraftFromAmazonMutation();
  const [publishDraft, { isLoading: publishing }] = usePublishDraftMutation();

  // Live-scrape the full Amazon product (all photos, description) for this ASIN.
  const { data: details, isFetching: loadingDetails } = useScrapeAsinQuery(
    { asin: product?.asin, country: "NL" },
    { skip: !open || !product?.asin },
  );

  // Merge scraped detail over the list-row data; scrape wins when present.
  const view = useMemo(() => {
    const photos =
      details?.photos?.length > 0
        ? details.photos
        : [product?.image].filter(Boolean);
    const amazonNum = parsePrice(details?.price ?? product?.amazonPrice);
    return {
      title: details?.title || product?.title || "",
      brand: details?.brand || product?.brand || "",
      description: details?.description || product?.description || "",
      // Amazon price normalized to a "." decimal string (no comma).
      amazonPrice: formatPrice(amazonNum),
      // Your price is a 2.5x markup over the Amazon price.
      price: amazonNum == null ? "" : formatPrice(amazonNum * 2.5),
      rating: details?.rating || product?.rating || "",
      reviews: details?.reviews || product?.reviews || 0,
      productUrl: details?.productUrl || product?.productUrl || "",
      category: product?.category || "",
      mainImage: details?.mainImage || product?.image || "",
      photos,
    };
  }, [details, product]);

  // Editable "Your Price"; defaults to the 2.5x markup and resets when the
  // computed value changes (new product / scrape result).
  const [yourPrice, setYourPrice] = useState("");
  useEffect(() => {
    setYourPrice(view.price);
  }, [view.price]);

  useEffect(() => {
    if (open) setActiveImage("");
  }, [open, product?.asin]);

  if (!product) return null;

  const mainImage = activeImage || view.mainImage;

  // Create a Bol.com draft from the Amazon ASIN (2.5x markup), then publish it.
  const handlePublish = async () => {
    if (!product.asin) {
      toast.error("This product has no ASIN to publish.");
      return;
    }
    try {
      const draftRes = await createDraft({
        asin: product.asin,
        country: "NL",
      }).unwrap();
      const draftId = draftRes?.data?.id;
      if (!draftId) throw new Error("Draft was not created");
      await publishDraft(draftId).unwrap();
      toast.success("Product published to Bol.com");
      onClose();
    } catch (err) {
      toast.error(
        err?.data?.detail || err?.message || "Failed to publish product",
      );
    }
  };

  const busy = drafting || publishing;

  return (
    <Modal open={open} onCancel={onClose} footer={null} centered width={820}>
      <div className="font-poppins pt-2">
        <h2 className="text-base font-bold text-brand mb-1">Product Details</h2>
        <p className="text-xs text-gray-400 mb-1">ASIN : {product.asin}</p>
        <div className="flex items-center gap-2 mb-5">
          <FaStar className="text-yellow-400" size={13} />
          <span className="text-xs font-medium">{view.rating || "—"}</span>
          <span className="text-xs text-gray-400">
            · {view.reviews} Reviews
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Form */}
          <div className="md:col-span-2 space-y-4">
            <Field label="Product Title">
              <Input value={view.title} readOnly className="h-10 rounded-lg" />
            </Field>
            <Field label="Brand">
              <Input value={view.brand} readOnly className="h-10 rounded-lg" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Amazon Price">
                <Input
                  value={view.amazonPrice ? `€${view.amazonPrice}` : "—"}
                  readOnly
                  className="h-10 rounded-lg"
                />
              </Field>
              <Field label="Your Price">
                <Input
                  value={yourPrice ? `€${yourPrice}` : ""}
                  onChange={(e) =>
                    setYourPrice(e.target.value.replace(/^€/, ""))
                  }
                  className="h-10 rounded-lg"
                />
              </Field>
            </div>
            <Field label="Category">
              <Select
                defaultValue={view.category}
                className="w-full h-10"
                options={[{ value: view.category, label: view.category }]}
              />
            </Field>
            <Field label="Description">
              <TextArea
                value={view.description}
                readOnly
                rows={3}
                className="rounded-lg"
              />
            </Field>
          </div>

          {/* Image + actions */}
          <div>
            <p className="text-xs text-gray-400 mb-2">Product Image</p>
            <div className="bg-[#f7f8fc] rounded-xl p-3 mb-3 relative">
              {loadingDetails && !details && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/60 rounded-xl z-10">
                  <Spin size="small" />
                </div>
              )}
              {mainImage ? (
                <img
                  src={mainImage}
                  alt={view.title}
                  className="w-full h-40 object-contain rounded-lg cursor-zoom-in transition-transform duration-300 ease-out hover:scale-[1.9] hover:relative hover:z-30"
                />
              ) : (
                <div className="w-full h-40 flex items-center justify-center text-gray-300 text-xs">
                  No image
                </div>
              )}
            </div>

            {/* All scraped thumbnails — click to preview */}
            {view.photos.length > 1 && (
              <div className="flex gap-2 mb-5 overflow-x-auto thin-scrollbar pb-1">
                {view.photos.map((src, i) => (
                  <button
                    key={`${src}-${i}`}
                    type="button"
                    onClick={() => setActiveImage(src)}
                    className={`flex-shrink-0 rounded-lg border overflow-hidden ${
                      mainImage === src
                        ? "border-brand ring-1 ring-brand"
                        : "border-gray-100"
                    }`}
                  >
                    <img
                      src={src}
                      alt={`thumb ${i + 1}`}
                      className="w-14 h-14 object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              {view.productUrl && (
                <a
                  href={view.productUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-11 h-11 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200"
                  title="View on Amazon"
                >
                  <FiExternalLink />
                </a>
              )}
              <button
                onClick={handlePublish}
                disabled={busy}
                className="flex-1 h-11 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-black disabled:opacity-60"
              >
                {busy ? "Publishing..." : "Publish to Bol.com"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

const Field = ({ label, children }) => (
  <div>
    <p className="text-xs text-gray-400 mb-1.5">{label}</p>
    {children}
  </div>
);

export default ProductDetailsModal;
