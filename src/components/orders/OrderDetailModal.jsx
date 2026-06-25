import { Modal } from "antd";
import TrackingStepper from "../tracking/TrackingStepper";
import { orderDetail } from "../../assets/mockData";

const AVATAR =
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&q=80";

/**
 * @param {boolean} showTracking - render the tracking stepper.
 * @param {"bol"|"amazon"|"rimco"} source - tracking pipeline + heading color.
 */
const OrderDetailModal = ({
  open,
  onClose,
  order,
  showTracking = false,
  source = "bol",
  activeStep = 1,
}) => {
  if (!order) return null;
  const detail = orderDetail;

  const headingColor = {
    bol: "#1B17E0",
    amazon: "#F59E0B",
    rimco: "#EF4444",
  }[source];

  return (
    <Modal open={open} onCancel={onClose} footer={null} centered width={760}>
      <div className="font-poppins pt-2">
        <h2 className="text-base font-bold" style={{ color: headingColor }}>
          Order <span className="text-gray-700">{order.id}</span>
        </h2>
        <p className="text-xs text-gray-400 mb-4">{detail.date}</p>

        {showTracking && (
          <div className="mb-5">
            <TrackingStepper source={source} activeStep={activeStep} />
          </div>
        )}

        {/* Product details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          {detail.products.map((p, i) => (
            <div key={i}>
              <p className="text-xs font-semibold text-gray-500 mb-2">
                Product Details
              </p>
              <div className="flex gap-3">
                <div className="w-12 h-12 rounded-lg bg-[#f7f8fc] flex items-center justify-center text-lg">
                  ☕
                </div>
                <div className="text-xs text-gray-500 leading-relaxed">
                  <p className="font-medium text-gray-700">{p.name}</p>
                  <p>Unit Price (€) {p.unitPrice}</p>
                  <p>1 × {p.qty}</p>
                  <p className="font-medium text-gray-700">€{p.total}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Addresses */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <Address title="Billing Address" data={detail.billing} />
          <Address title="Delivery Address" data={detail.delivery} />
        </div>

        {/* Customer */}
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-2">
            Customer Details
          </p>
          <div className="flex items-center gap-3">
            <img src={AVATAR} alt="" className="w-10 h-10 rounded-full object-cover" />
            <div className="text-xs text-gray-500">
              <p className="font-medium text-gray-700">{detail.customer.name}</p>
              <p>{detail.customer.email}</p>
              <p>{detail.customer.phone}</p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

const Address = ({ title, data }) => (
  <div>
    <p className="text-xs font-semibold text-gray-500 mb-2">{title}</p>
    <div className="text-xs text-gray-500 space-y-1">
      <Line k="Name" v={data.name} />
      <Line k="email" v={data.email} />
      <Line k="Address" v={data.address} />
      <Line k="Postal Code" v={data.postalCode} />
      <Line k="City" v={data.city} />
    </div>
  </div>
);

const Line = ({ k, v }) => (
  <div className="flex gap-2">
    <span className="w-20 text-gray-400 flex-shrink-0">{k}</span>
    <span className="text-gray-600">{v}</span>
  </div>
);

export default OrderDetailModal;
