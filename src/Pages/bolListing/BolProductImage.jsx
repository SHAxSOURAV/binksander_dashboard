import { useState } from "react";
import { useGetBolProductImageQuery } from "../../Redux/productApis";
import { FiImage } from "react-icons/fi";

/**
 * Bol product image for an EAN.
 *
 * Fast path: uses `src` passed directly from offer.image_url (zero network requests).
 */
const BolProductImage = ({ ean, src, className = "w-10 h-10", disableQuery = false }) => {
  const [imgError, setImgError] = useState(false);
  const isManagedByParent = disableQuery || src !== undefined;

  const { data, isLoading, isError } = useGetBolProductImageQuery(ean, {
    skip: !ean || isManagedByParent,
  });

  const url = isManagedByParent ? src : data?.image_url;

  // While parent is fetching (src is undefined) or individual query is loading:
  if (!url && ((isManagedByParent && src === undefined) || (!isManagedByParent && isLoading))) {
    return (
      <div className={`bg-gray-100 rounded flex items-center justify-center animate-pulse ${className}`}>
        <FiImage className="w-1/2 h-1/2 text-gray-300" />
      </div>
    );
  }

  if (!url || imgError || (!isManagedByParent && isError)) {
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
      onError={() => setImgError(true)}
    />
  );
};

export default BolProductImage;
