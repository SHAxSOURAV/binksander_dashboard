import { useState, useEffect } from "react";
import { Modal, Input, Spin } from "antd";
import toast from "react-hot-toast";
import { FiLink2, FiSearch } from "react-icons/fi";
import { BsFileEarmarkSpreadsheet } from "react-icons/bs";
import { FcGoogle } from "react-icons/fc";
import {
  useSyncInventoryMutation,
  useImportOauthMutation,
} from "../../Redux/productApis";
import {
  requestGoogleAccessToken,
  listSpreadsheets,
  spreadsheetUrl,
} from "../../utils/googleDrive";

const ConnectInventoryModal = ({ open, onClose }) => {
  const [mode, setMode] = useState("google"); // "google" | "link"

  // Google OAuth flow state
  const [token, setToken] = useState("");
  const [sheets, setSheets] = useState([]);
  const [loadingSheets, setLoadingSheets] = useState(false);
  const [search, setSearch] = useState("");

  // Public link flow state
  const [sheetUrl, setSheetUrl] = useState("");
  const [sheetId, setSheetId] = useState("");

  const [syncInventory, { isLoading: importingPublic }] =
    useSyncInventoryMutation();
  const [importOauth, { isLoading: importingOauth }] = useImportOauthMutation();

  // Reset everything when the modal closes.
  useEffect(() => {
    if (!open) {
      setMode("google");
      setToken("");
      setSheets([]);
      setSearch("");
      setSheetUrl("");
      setSheetId("");
    }
  }, [open]);

  const handleGoogleConnect = async () => {
    setLoadingSheets(true);
    try {
      const accessToken = await requestGoogleAccessToken();
      setToken(accessToken);
      const files = await listSpreadsheets(accessToken);
      setSheets(files);
      if (files.length === 0) {
        toast("No spreadsheets found in this Google account.", { icon: "📄" });
      }
    } catch (err) {
      toast.error(err?.message || "Google sign-in failed");
    } finally {
      setLoadingSheets(false);
    }
  };

  const handleSelectSheet = async (file) => {
    try {
      const res = await importOauth({
        spreadsheet_url: spreadsheetUrl(file.id),
        access_token: token,
      }).unwrap();
      toast.success(res?.message || `Connected “${file.name}”.`);
      onClose();
    } catch (err) {
      toast.error(err?.data?.detail || "Failed to import this spreadsheet");
    }
  };

  const handleConnectPublic = async () => {
    if (!sheetUrl.trim()) {
      toast.error("Please paste your Google Spreadsheet link");
      return;
    }
    try {
      const res = await syncInventory({
        spreadsheet_url: sheetUrl.trim(),
        sheet_id: sheetId.trim() || undefined,
      }).unwrap();
      toast.success(res?.message || "Inventory connected and imported.");
      onClose();
    } catch (err) {
      toast.error(err?.data?.detail || "Failed to connect inventory");
    }
  };

  const filteredSheets = sheets.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Modal open={open} onCancel={onClose} footer={null} centered width={480}>
      <div className="font-poppins pt-2">
        <div className="flex items-center gap-2 mb-1">
          <FiLink2 className="text-brand" />
          <h2 className="text-base font-bold text-brand">
            Connect Your Inventory
          </h2>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          Sign in with Google to pick one of your own spreadsheets — no need to
          make it public.
        </p>

        {/* Mode switch */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-5 text-xs font-medium">
          <button
            onClick={() => setMode("google")}
            className={`flex-1 py-2 rounded-md transition ${
              mode === "google" ? "bg-white text-brand shadow-sm" : "text-gray-500"
            }`}
          >
            Google Account
          </button>
          <button
            onClick={() => setMode("link")}
            className={`flex-1 py-2 rounded-md transition ${
              mode === "link" ? "bg-white text-brand shadow-sm" : "text-gray-500"
            }`}
          >
            Public Link
          </button>
        </div>

        {/* ── Google OAuth mode ── */}
        {mode === "google" &&
          (sheets.length === 0 ? (
            <div className="text-center py-4">
              <button
                onClick={handleGoogleConnect}
                disabled={loadingSheets}
                className="inline-flex items-center gap-3 h-11 px-6 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                {loadingSheets ? (
                  <Spin size="small" />
                ) : (
                  <FcGoogle size={20} />
                )}
                {loadingSheets ? "Connecting..." : "Sign in with Google"}
              </button>
              <p className="text-[11px] text-gray-400 mt-3">
                We only request read-only access to your Google Sheets.
              </p>
            </div>
          ) : (
            <div>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                prefix={<FiSearch className="text-gray-400 mr-1" />}
                placeholder="Search your spreadsheets"
                className="h-10 rounded-lg mb-3"
              />
              <div className="max-h-72 overflow-y-auto thin-scrollbar space-y-2 pr-1">
                {filteredSheets.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => handleSelectSheet(f)}
                    disabled={importingOauth}
                    className="w-full flex items-center gap-3 text-left rounded-xl border border-gray-100 hover:border-brand/40 hover:bg-[#f7f8fc] px-3 py-2.5 transition disabled:opacity-60"
                  >
                    <span
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: "#16A34A14", color: "#16A34A" }}
                    >
                      <BsFileEarmarkSpreadsheet size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-gray-800 truncate">
                        {f.name}
                      </span>
                      {f.modifiedTime && (
                        <span className="block text-[11px] text-gray-400">
                          Edited{" "}
                          {new Date(f.modifiedTime).toLocaleDateString()}
                        </span>
                      )}
                    </span>
                  </button>
                ))}
                {filteredSheets.length === 0 && (
                  <p className="text-center text-xs text-gray-400 py-6">
                    No spreadsheets match “{search}”.
                  </p>
                )}
              </div>
              {importingOauth && (
                <p className="text-center text-xs text-brand mt-3">
                  Importing… this can take a moment.
                </p>
              )}
            </div>
          ))}

        {/* ── Public link mode ── */}
        {mode === "link" && (
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">
              Spreadsheet Link
            </label>
            <Input
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="h-11 rounded-lg mb-3"
            />
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">
              Sheet/Tab ID <span className="text-gray-300">(optional · gid)</span>
            </label>
            <Input
              value={sheetId}
              onChange={(e) => setSheetId(e.target.value)}
              placeholder="e.g. 0"
              className="h-11 rounded-lg mb-5"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="h-10 px-5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConnectPublic}
                disabled={importingPublic}
                className="button-color h-10 px-6 rounded-lg text-sm font-semibold disabled:opacity-60"
              >
                {importingPublic ? "Connecting..." : "Connect"}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ConnectInventoryModal;
