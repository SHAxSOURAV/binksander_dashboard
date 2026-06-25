import { Modal, Form, Input, Select } from "antd";
import toast from "react-hot-toast";
import {
  FiMail,
  FiPhone,
  FiMessageSquare,
  FiHeadphones,
} from "react-icons/fi";
import { useUI } from "../../Provider/ContextProvider";
import { useSubmitSupportTicketMutation } from "../../Redux/supportApis";

const { TextArea } = Input;

const channels = [
  { icon: <FiMail size={16} />, label: "Email", value: "support@bol.com" },
  { icon: <FiPhone size={16} />, label: "Phone", value: "+31 20 555 0309" },
  { icon: <FiMessageSquare size={16} />, label: "Live Chat", value: "9am – 6pm CET" },
];

const ContactSupportModal = () => {
  const { supportOpen, setSupportOpen } = useUI();
  const [form] = Form.useForm();
  const [submitTicket, { isLoading }] = useSubmitSupportTicketMutation();

  const onFinish = async (values) => {
    try {
      const res = await submitTicket({
        subject: values.subject,
        priority: values.priority || "normal",
        email: values.email,
        message: values.message,
      }).unwrap();
      toast.success(res?.message || "Your message has been sent. We'll reply shortly.");
      form.resetFields();
      setSupportOpen(false);
    } catch (err) {
      toast.error(err?.data?.detail || "Couldn't send your message. Please try again.");
    }
  };

  return (
    <Modal
      open={supportOpen}
      onCancel={() => setSupportOpen(false)}
      footer={null}
      centered
      width={760}
    >
      <div className="font-poppins grid grid-cols-1 md:grid-cols-5 gap-6 pt-2">
        {/* Left — info panel */}
        <div className="md:col-span-2 rounded-2xl bg-gradient-to-br from-[#1B17E0] to-[#4B45F0] text-white p-6 flex flex-col">
          <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center mb-4">
            <FiHeadphones size={22} />
          </div>
          <h2 className="text-lg font-bold leading-tight">
            Contact Support
          </h2>
          <p className="text-xs text-white/70 mt-1 mb-6">
            Need help? Reach our team through any channel below or send us a
            message.
          </p>

          <div className="space-y-3 mt-auto">
            {channels.map((c) => (
              <div key={c.label} className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                  {c.icon}
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] text-white/60">{c.label}</p>
                  <p className="text-xs font-medium truncate">{c.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — form */}
        <div className="md:col-span-3">
          <h3 className="text-base font-bold mb-1">Send us a message</h3>
          <p className="text-xs text-gray-400 mb-5">
            We typically respond within a few hours.
          </p>

          <Form form={form} layout="vertical" onFinish={onFinish}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Form.Item
                name="subject"
                label="Subject"
                rules={[{ required: true, message: "Required" }]}
                className="mb-3"
              >
                <Input placeholder="What's it about?" className="h-10 rounded-lg" />
              </Form.Item>
              <Form.Item
                name="priority"
                label="Priority"
                initialValue="normal"
                className="mb-3"
              >
                <Select
                  className="h-10"
                  options={[
                    { value: "low", label: "Low" },
                    { value: "normal", label: "Normal" },
                    { value: "high", label: "High" },
                  ]}
                />
              </Form.Item>
            </div>

            <Form.Item
              name="email"
              label="Your Email"
              rules={[
                { required: true, message: "Required" },
                { type: "email", message: "Enter a valid email" },
              ]}
              className="mb-3"
            >
              <Input placeholder="you@email.com" className="h-10 rounded-lg" />
            </Form.Item>

            <Form.Item
              name="message"
              label="Message"
              rules={[{ required: true, message: "Required" }]}
              className="mb-4"
            >
              <TextArea
                rows={4}
                placeholder="Describe your issue..."
                className="rounded-lg"
              />
            </Form.Item>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setSupportOpen(false)}
                className="h-10 px-5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="h-10 px-6 rounded-lg button-color text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? "Sending..." : "Send Message"}
              </button>
            </div>
          </Form>
        </div>
      </div>
    </Modal>
  );
};

export default ContactSupportModal;
