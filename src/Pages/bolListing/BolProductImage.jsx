import React from "react";
import { useGetBolProductImageQuery } from "../../Redux/productApis";
import { FiImage } from "react-icons/fi";
import { Spin } from "antd";

const BolProductImage = ({ ean, className = "w-10 h-10" }) => {
  const { data, isLoading, isError } = useGetBolProductImageQuery(ean, {
    skip: !ean,
  });

  if (isLoading) {
    return (
      <div className={`bg-gray-100 rounded-lg flex items-center justify-center ${className}`}>
        <Spin size="small" />
      </div>
    );
  }

  if (isError || !data?.image_url) {
    return (
      <div className={`bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 ${className}`}>
        <FiImage className="w-1/2 h-1/2 opacity-50" />
      </div>
    );
  }

  return (
    <img
      src={data.image_url}
      alt={`Product ${ean}`}
      className={`object-cover rounded-lg ${className}`}
      loading="lazy"
    />
  );
};

export default BolProductImage;
