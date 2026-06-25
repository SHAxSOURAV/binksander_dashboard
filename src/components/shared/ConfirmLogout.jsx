import { Modal } from "antd";
import { useNavigate } from "react-router-dom";
import { FiAlertTriangle } from "react-icons/fi";
import { useUI } from "../../Provider/ContextProvider";
import { useLogoutMutation } from "../../Redux/authApis";
import { clearSession } from "../../utils/session";

const ConfirmLogout = () => {
  const { logoutOpen, setLogoutOpen } = useUI();
  const navigate = useNavigate();
  const [logout, { isLoading }] = useLogoutMutation();

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem("refreshToken");
    try {
      if (refreshToken) await logout({ refresh_token: refreshToken }).unwrap();
    } catch {
      /* ignore network errors on logout */
    }
    clearSession();
    setLogoutOpen(false);
    navigate("/login");
  };

  return (
    <Modal
      open={logoutOpen}
      onCancel={() => setLogoutOpen(false)}
      footer={null}
      centered
      width={360}
      closable={false}
    >
      <div className="flex flex-col items-center text-center py-4 font-poppins">
        <div className="w-14 h-14 rounded-full border-2 border-dashed border-orange-400 flex items-center justify-center mb-4">
          <FiAlertTriangle size={26} className="text-orange-500" />
        </div>
        <h2 className="text-lg font-bold mb-1">Confirm Logout</h2>
        <p className="text-sm text-gray-400 mb-6">
          Are you sure you want to log out of your account?
        </p>
        <div className="flex gap-3 w-full">
          <button
            onClick={() => setLogoutOpen(false)}
            className="flex-1 h-11 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleLogout}
            disabled={isLoading}
            className="flex-1 h-11 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-black disabled:opacity-60"
          >
            {isLoading ? "Logging out..." : "Logout"}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmLogout;
