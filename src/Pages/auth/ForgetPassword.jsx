import { Button, Form, Input } from "antd";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Logo from "../../components/shared/Logo";
import { useForgetPasswordMutation } from "../../Redux/authApis";

const ForgetPassword = () => {
  const navigate = useNavigate();
  const [forgetPassword, { isLoading }] = useForgetPasswordMutation();

  const onFinish = async (values) => {
    try {
      await forgetPassword({ email: values.email }).unwrap();
      sessionStorage.setItem("authEmail", values.email);
      sessionStorage.setItem("otpPurpose", "reset_password");
      toast.success("If this email is registered, a reset code has been sent.");
      navigate("/verify-code");
    } catch (err) {
      toast.error(err?.data?.detail || "Failed to send code. Try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center font-poppins p-4 bg-[#f5f6fa]">
      <div className="w-full max-w-[420px] bg-white rounded-2xl card-shadow px-8 py-10">
        <div className="text-center mb-6">
          <Logo size="text-2xl" />
          <h1 className="text-lg font-bold mt-3">Forgot Password</h1>
        </div>

        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item
            name="email"
            rules={[
              { required: true, message: "Email is required" },
              { type: "email", message: "Please enter a valid email!" },
            ]}
            className="mb-4"
          >
            <Input
              placeholder="Email"
              className="h-[46px] px-4 rounded-lg text-sm"
            />
          </Form.Item>

          <Form.Item className="mb-0">
            <Button
              type="primary"
              htmlType="submit"
              loading={isLoading}
              className="w-full h-[46px] rounded-lg text-sm font-semibold button-color"
            >
              Get OTP
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
};

export default ForgetPassword;
