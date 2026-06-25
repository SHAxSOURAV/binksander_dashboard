import { Form, Input, Button } from "antd";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Logo from "../../components/shared/Logo";
import { useSignupMutation } from "../../Redux/authApis";

const Signup = () => {
  const navigate = useNavigate();
  const [signup, { isLoading }] = useSignupMutation();

  const onFinish = async (values) => {
    try {
      await signup({
        email: values.email,
        password: values.password,
        full_name: values.name,
      }).unwrap();
      // Email verification required next.
      sessionStorage.setItem("authEmail", values.email);
      sessionStorage.setItem("otpPurpose", "verify_email");
      toast.success("Account created! Check your email for the code.");
      navigate("/verify-code");
    } catch (err) {
      toast.error(err?.data?.detail || "Signup failed. Try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center font-poppins p-4 bg-[#f5f6fa]">
      <div className="w-full max-w-[440px] bg-white rounded-2xl card-shadow px-8 py-10 sm:px-10">
        <div className="text-center mb-6">
          <Logo />
          <h1 className="text-xl font-bold mt-4">Signup</h1>
        </div>

        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item
            name="name"
            rules={[{ required: true, message: "Please enter your name!" }]}
            className="mb-4"
          >
            <Input
              placeholder="Enter Your Name"
              className="h-[48px] px-4 rounded-lg text-sm"
            />
          </Form.Item>

          <Form.Item
            name="email"
            rules={[
              { required: true, message: "Please enter your email!" },
              { type: "email", message: "Please enter a valid email!" },
            ]}
            className="mb-4"
          >
            <Input
              placeholder="Enter Email Address"
              className="h-[48px] px-4 rounded-lg text-sm"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: "Please enter a password!" },
              { min: 8, message: "Password must be at least 8 characters!" },
              {
                pattern: /^(?=.*[A-Za-z])(?=.*\d).+$/,
                message: "Must include a letter and a number.",
              },
            ]}
            className="mb-4"
          >
            <Input.Password
              placeholder="Enter Password"
              className="h-[48px] px-4 rounded-lg text-sm"
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            dependencies={["password"]}
            rules={[
              { required: true, message: "Please confirm your password!" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("password") === value)
                    return Promise.resolve();
                  return Promise.reject(new Error("Passwords do not match!"));
                },
              }),
            ]}
            className="mb-5"
          >
            <Input.Password
              placeholder="Confirm Password"
              className="h-[48px] px-4 rounded-lg text-sm"
            />
          </Form.Item>

          <Form.Item className="mb-0">
            <Button
              type="primary"
              htmlType="submit"
              loading={isLoading}
              className="w-full h-[48px] rounded-lg text-sm font-semibold button-color"
            >
              Signup
            </Button>
          </Form.Item>
        </Form>

        <div className="text-center mt-6">
          <p className="text-xs text-gray-400">Already Have An Account</p>
          <Link to="/login" className="text-brand font-semibold text-sm">
            Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;
