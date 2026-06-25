import { Form, Input, Button } from "antd";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import Logo from "../../components/shared/Logo";
import { useResetPasswordMutation } from "../../Redux/authApis";
import { saveSession } from "../../utils/session";

const CreateNewPassword = () => {
  const navigate = useNavigate();
  const [resetPassword, { isLoading }] = useResetPasswordMutation();

  const onFinish = async (values) => {
    const email = sessionStorage.getItem("authEmail");
    const otp = sessionStorage.getItem("resetOtp");
    if (!email || !otp) {
      toast.error("Reset session expired. Please start again.");
      navigate("/forget-password");
      return;
    }
    try {
      const res = await resetPassword({
        email,
        otp,
        new_password: values.password,
      }).unwrap();
      saveSession(res);
      sessionStorage.removeItem("authEmail");
      sessionStorage.removeItem("otpPurpose");
      sessionStorage.removeItem("resetOtp");
      toast.success("Password reset! You are now signed in.");
      navigate("/");
    } catch (err) {
      toast.error(err?.data?.detail || "Failed to reset password. Try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center font-poppins p-4 bg-[#f5f6fa]">
      <div className="w-full max-w-[480px] bg-white rounded-2xl card-shadow px-8 py-10 sm:px-12">
        <div className="text-center mb-7">
          <Logo />
          <h1 className="text-xl font-bold mt-4">Create New Password</h1>
        </div>

        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item
            name="password"
            rules={[
              { required: true, message: "Please enter your new password!" },
              { min: 8, message: "Password must be at least 8 characters!" },
              {
                pattern: /^(?=.*[A-Za-z])(?=.*\d).+$/,
                message: "Must include a letter and a number.",
              },
            ]}
            className="mb-4"
          >
            <Input.Password
              placeholder="Enter New Password"
              className="h-[52px] px-4 rounded-lg text-sm"
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            dependencies={["password"]}
            rules={[
              { required: true, message: "Please confirm your new password!" },
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
              className="h-[52px] px-4 rounded-lg text-sm"
            />
          </Form.Item>

          <Form.Item className="mb-0">
            <Button
              type="primary"
              htmlType="submit"
              loading={isLoading}
              className="w-full h-[52px] rounded-lg text-sm font-semibold button-color"
            >
              Change Password
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
};

export default CreateNewPassword;
