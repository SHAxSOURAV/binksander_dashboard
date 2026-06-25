import { Button, Form } from "antd";
import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import Logo from "../../components/shared/Logo";
import {
  useVerifyEmailMutation,
  useResendOtpMutation,
} from "../../Redux/authApis";
import { saveSession } from "../../utils/session";

const OTP_LENGTH = 6;

const VerifyCode = () => {
  const navigate = useNavigate();
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(""));
  const inputRefs = useRef([]);
  const [verifyEmail, { isLoading }] = useVerifyEmailMutation();
  const [resendOtp, { isLoading: isResending }] = useResendOtpMutation();

  const email = sessionStorage.getItem("authEmail") || "";
  const purpose = sessionStorage.getItem("otpPurpose") || "verify_email";

  const handleChange = (index, e) => {
    const value = e.target.value.replace(/\D/g, "");
    if (!value) return;
    const newOtp = [...otp];
    newOtp[index] = value[0];
    setOtp(newOtp);
    if (index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace") {
      const newOtp = [...otp];
      if (otp[index]) {
        newOtp[index] = "";
        setOtp(newOtp);
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
        newOtp[index - 1] = "";
        setOtp(newOtp);
      }
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const paste = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!paste) return;
    const arr = paste.split("").slice(0, OTP_LENGTH);
    const newOtp = Array(OTP_LENGTH).fill("");
    arr.forEach((c, i) => (newOtp[i] = c));
    setOtp(newOtp);
    setTimeout(
      () => inputRefs.current[Math.min(arr.length, OTP_LENGTH - 1)]?.focus(),
      0,
    );
  };

  const onFinish = async () => {
    const enteredOtp = otp.join("");
    if (enteredOtp.length < OTP_LENGTH) {
      toast.error("Please enter the full OTP");
      return;
    }

    if (purpose === "reset_password") {
      // No backend verify step for reset — carry the OTP to the reset screen.
      sessionStorage.setItem("resetOtp", enteredOtp);
      navigate("/reset-password");
      return;
    }

    // verify_email → backend verifies and signs the user in.
    try {
      const res = await verifyEmail({ email, otp: enteredOtp }).unwrap();
      saveSession(res);
      sessionStorage.removeItem("authEmail");
      sessionStorage.removeItem("otpPurpose");
      toast.success("Email verified! You are now signed in.");
      navigate("/");
    } catch (err) {
      toast.error(err?.data?.detail || "Invalid or expired OTP");
    }
  };

  const handleResend = async () => {
    if (!email) {
      toast.error("Email not found. Please go back.");
      return;
    }
    try {
      await resendOtp({ email, purpose }).unwrap();
      toast.success("A new code has been sent to your email.");
    } catch (err) {
      toast.error(err?.data?.detail || "Failed to resend OTP");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center font-poppins p-4 bg-[#f5f6fa]">
      <div className="w-full max-w-[420px] bg-white rounded-2xl card-shadow px-8 py-10">
        <div className="text-center mb-6">
          <Logo size="text-2xl" />
          <h1 className="text-lg font-bold mt-3">
            {purpose === "reset_password" ? "Forgot Password" : "Verify Email"}
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Enter the code we&apos;ve sent to{" "}
            <span className="font-medium text-gray-600">
              {email || "your mail"}
            </span>
          </p>
        </div>

        <Form layout="vertical" onFinish={onFinish}>
          <div
            className="flex gap-2 sm:gap-3 justify-center mb-5"
            onPaste={handlePaste}
          >
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                value={digit}
                onChange={(e) => handleChange(index, e)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                maxLength={1}
                inputMode="numeric"
                className="w-11 h-12 sm:w-12 sm:h-12 bg-[#f5f6fa] border border-gray-200 rounded-lg text-center text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-brand"
              />
            ))}
          </div>

          <Form.Item className="mb-3">
            <Button
              type="primary"
              htmlType="submit"
              loading={isLoading}
              className="w-full h-[46px] rounded-lg text-sm font-semibold button-color"
            >
              Verify
            </Button>
          </Form.Item>
        </Form>

        <p className="text-center text-xs text-gray-400">
          Haven&apos;t Received The OTP?{" "}
          <button
            type="button"
            onClick={handleResend}
            disabled={isResending}
            className="text-brand font-semibold disabled:opacity-50"
          >
            {isResending ? "Sending..." : "Resend OTP"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default VerifyCode;
