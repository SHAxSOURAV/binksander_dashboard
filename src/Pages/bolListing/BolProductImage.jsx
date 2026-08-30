import { useGetBolProductImageQuery } from "../../Redux/productApis";
import { FiImage } from "react-icons/fi";
import { Spin } from "antd";

/**
 * Bol product image for an EAN.
 *
 * Pass `src` when the parent already resolved the page's images in one batched
 * request — that is the fast path and skips the network entirely. Without it the
 * component falls back to fetching its own image, which is fine for a one-off but
 * costs one connection per card in a grid.
 */
const BolProductImage = ({ ean, src, className = "w-10 h-10" }) => {
  const hasBatchedSrc = src !== undefined;

  const { data, isLoading, isError } = useGetBolProductImageQuery(ean, {
    skip: !ean || hasBatchedSrc,
  });

  const url = hasBatchedSrc ? src : data?.image_url;

  if (!hasBatchedSrc && isLoading) {
    return (
      <div className={`bg-gray-100 rounded flex items-center justify-center ${className}`}>
        <Spin size="small" />
      </div>
    );
  }

  if (!url || (!hasBatchedSrc && isError)) {
    return (
      <div
        className={`bg-gray-100 rounded flex items-center justify-center text-gray-300 ${className}`}
      >
        <FiImage className="w-1/2 h-1/2" />
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={`Product ${ean}`}
      className={`object-contain rounded ${className}`}
      loading="lazy"
    />
  );
};

export default BolProductImage;
