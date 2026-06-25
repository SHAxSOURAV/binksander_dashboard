import { Form, Input, Button, Checkbox } from "antd";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Logo from "../../components/shared/Logo";
import { useLoginMutation, useResendOtpMutation } from "../../Redux/authApis";
import { saveSession } from "../../utils/session";

const Login = () => {
  const navigate = useNavigate();
  const [login, { isLoading }] = useLoginMutation();
  const [resendOtp] = useResendOtpMutation();
  const [form] = Form.useForm();

  const onFinish = async (values) => {
    try {
      const res = await login(values).unwrap();
      saveSession(res, values.remember);
      toast.success("Login successful!");
      navigate("/");
    } catch (err) {
      const detail = err?.data?.detail || "";
      // Backend returns 403 when the email isn't verified yet.
      if (err?.status === 403 && /verif/i.test(detail)) {
        sessionStorage.setItem("authEmail", values.email);
        sessionStorage.setItem("otpPurpose", "verify_email");
        try {
          await resendOtp({
            email: values.email,
            purpose: "verify_email",
          }).unwrap();
        } catch {
          /* ignore */
        }
        toast("Please verify your email. We sent you a new code.", { icon: "✉️" });
        navigate("/verify-code");
        return;
      }
      toast.error(detail || "Invalid email or password");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center font-poppins p-4 bg-[#f5f6fa]">
      <div className="w-full max-w-[440px] bg-white rounded-2xl card-shadow px-8 py-10 sm:px-10">
        <div className="text-center mb-6">
          <Logo />
          <h1 className="text-xl font-bold mt-4">Admin Login</h1>
        </div>

        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item
            name="email"
            rules={[
              { required: true, message: "Please enter your email!" },
              { type: "email", message: "Please enter a valid email!" },
            ]}
            className="mb-4"
          >
            <Input
              placeholder="Email"
              className="h-[48px] px-4 rounded-lg text-sm"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: "Please enter your password!" }]}
            className="mb-4"
          >
            <Input.Password
              placeholder="Password"
              className="h-[48px] px-4 rounded-lg text-sm"
            />
          </Form.Item>

          <Form.Item className="mb-3">
            <Button
              type="primary"
              htmlType="submit"
              loading={isLoading}
              className="w-full h-[48px] rounded-lg text-sm font-semibold button-color"
            >
              Login
            </Button>
          </Form.Item>

          <div className="flex items-center justify-between text-sm">
            <Form.Item name="remember" valuePropName="checked" className="mb-0">
              <Checkbox className="text-gray-500">Remember</Checkbox>
            </Form.Item>
            <Link
              to="/forget-password"
              className="text-gray-500 hover:text-brand font-medium"
            >
              Forget Password?
            </Link>
          </div>
        </Form>

        <div className="text-center mt-6">
          <p className="text-xs text-gray-400">Don&apos;t Have An Account</p>
          <Link to="/signup" className="text-brand font-semibold text-sm">
            Signup
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
