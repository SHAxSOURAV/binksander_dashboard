/**
 * Safely constructs a valid Amazon external URL from a supplier link, ASIN, or country code.
 * Prevents invalid relative link navigation (e.g. href="Title text...") which causes React 404 router errors.
 */
export const getSafeAmazonUrl = (supplierLink, asin, country = "NL") => {
  if (supplierLink && typeof supplierLink === "string") {
    const trimmed = supplierLink.trim();
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return trimmed;
    }
    if (trimmed.startsWith("www.amazon.") || trimmed.startsWith("amazon.")) {
      return `https://${trimmed}`;
    }
  }

  // If supplierLink is non-URL text or missing, but we have an ASIN, construct a clean Amazon URL
  if (asin && typeof asin === "string" && asin.trim()) {
    const cleanAsin = asin.trim().toUpperCase();
    const countryUpper = (country || "NL").toUpperCase();
    let tld = "nl";
    if (countryUpper === "DE") tld = "de";
    else if (countryUpper === "GB" || countryUpper === "UK") tld = "co.uk";
    else if (countryUpper === "US") tld = "com";
    else if (countryUpper === "FR") tld = "fr";
    else if (countryUpper === "IT") tld = "it";
    else if (countryUpper === "ES") tld = "es";
    
    return `https://www.amazon.${tld}/dp/${cleanAsin}`;
  }

  return null;
};
