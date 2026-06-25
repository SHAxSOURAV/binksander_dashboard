import { useRouteError, useNavigate } from "react-router-dom";

const ErrorBoundary = () => {
  const error = useRouteError();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center font-poppins p-4 bg-[#f5f6fa]">
      <div className="bg-white rounded-2xl card-shadow p-10 max-w-[480px] text-center">
        <h1 className="bol-logo text-4xl mb-2">bol.</h1>
        <h2 className="text-lg font-semibold mb-1">Something went wrong</h2>
        <p className="text-sm text-gray-500 mb-6">
          {error?.statusText || error?.message || "An unexpected error occurred."}
        </p>
        <button
          onClick={() => navigate("/")}
          className="button-color px-6 py-2.5 rounded-lg text-sm font-medium"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default ErrorBoundary;
