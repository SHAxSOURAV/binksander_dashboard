import { useState } from "react";
import { Modal, Input, Button, Spin } from "antd";
import toast from "react-hot-toast";
import { BsFileEarmarkSpreadsheet } from "react-icons/bs";
import { FiLink2, FiArrowRight } from "react-icons/fi";
import { LuUnplug, LuRefreshCw } from "react-icons/lu";
import { useGoogleLogin } from "@react-oauth/google";
import {
  useGetBlacklistSheetsQuery,
  useImportPublicBlacklistMutation,
  useImportOAuthBlacklistMutation,
  useSyncBlacklistSheetMutation,
  useUnlinkBlacklistSheetMutation,
  useExchangeGoogleCodeMutation,
  useLazyGetSpreadsheetTabsQuery,
} from "../../Redux/connectionApis";

/**
 * BrandBlacklistSection
 * 
 * Manages Google Spreadsheets used for Brand Blacklisting.
 * Matches the exact visual aesthetic of the Inventory Source connection section.
 */
const BrandBlacklistSection = () => {
  const { data: blacklistData, isLoading: loadingSheets, refetch: refetchBlacklist } =
    useGetBlacklistSheetsQuery();
  const [importPublicBlacklist, { isLoading: importingPublic }] =
    useImportPublicBlacklistMutation();
  const [importOAuthBlacklist, { isLoading: importingOAuth }] =
    useImportOAuthBlacklistMutation();
  const [syncBlacklistSheet, { isLoading: syncingSheet }] =
    useSyncBlacklistSheetMutation();
  const [unlinkBlacklistSheet, { isLoading: unlinkingSheet }] =
    useUnlinkBlacklistSheetMutation();

  const [exchangeGoogleCode, { isLoading: exchangingCode }] =
    useExchangeGoogleCodeMutation();
  const [getSpreadsheetTabs, { isFetching: fetchingTabs }] =
    useLazyGetSpreadsheetTabsQuery();

  // Modal states
  const [publicModalOpen, setPublicModalOpen] = useState(false);
  const [publicUrl, setPublicUrl] = useState("");

  const [oauthModalOpen, setOauthModalOpen] = useState(false);
  const [oauthSheetsList, setOauthSheetsList] = useState([]);
  const [oauthToken, setOauthToken] = useState("");
  const [oauthRefreshToken, setOauthRefreshToken] = useState("");
  const [loadingSheetId, setLoadingSheetId] = useState(null);

  const [tabsModalOpen, setTabsModalOpen] = useState(false);
  const [tabsList, setTabsList] = useState([]);
  const [selectedSheetUrl, setSelectedSheetUrl] = useState("");
  const [selectedSheetTitle, setSelectedSheetTitle] = useState("");
  const [isPublicImport, setIsPublicImport] = useState(false);
  const [importingTabId, setImportingTabId] = useState(null);

  const [disconnectModalOpen, setDisconnectModalOpen] = useState(false);
  const [sheetToDisconnect, setSheetToDisconnect] = useState(null);

  const sheets = blacklistData?.sheets || [];
  const isImporting = importingTabId !== null || importingPublic || importingOAuth;

  // Google OAuth Login
  const loginWithGoogle = useGoogleLogin({
    flow: "auth-code",
    prompt: "consent",
    scope: "https://www.googleapis.com/auth/drive.readonly",
    onSuccess: async (codeResponse) => {
      try {
        const res = await exchangeGoogleCode({
          code: codeResponse.code,
          redirect_uri: "postmessage",
        }).unwrap();

        setOauthToken(res.access_token);
        setOauthRefreshToken(res.refresh_token);
        setOauthSheetsList(res.sheets || []);
        setOauthModalOpen(true);
      } catch (err) {
        toast.error(err?.data?.detail || "Failed to authenticate with Google");
      }
    },
    onError: () => {
      toast.error("Google authentication failed or was cancelled");
    },
  });

  // Fetch tabs for public sheet
  const handleFetchPublicTabs = async () => {
    if (!publicUrl.trim()) {
      return toast.error("Please enter a valid Google Spreadsheet URL");
    }
    try {
      const res = await getSpreadsheetTabs({ spreadsheet_url: publicUrl.trim() }).unwrap();
      setTabsList(res.tabs || []);
      setSelectedSheetUrl(publicUrl.trim());
      setSelectedSheetTitle("Brand Blacklist");
      setIsPublicImport(true);
      setPublicModalOpen(false);
      setTabsModalOpen(true);
    } catch (err) {
      toast.error(err?.data?.detail || "Failed to access public spreadsheet. Ensure link sharing is enabled.");
    }
  };

  // Select sheet from OAuth list
  const handleSelectOAuthSheet = async (sheet) => {
    setLoadingSheetId(sheet.id);
    try {
      const res = await getSpreadsheetTabs({
        spreadsheet_url: sheet.webViewLink,
        access_token: oauthToken,
      }).unwrap();

      setTabsList(res.tabs || []);
      setSelectedSheetUrl(sheet.webViewLink);
      setSelectedSheetTitle(sheet.name || "Brand Blacklist");
      setIsPublicImport(false);
      setOauthModalOpen(false);
      setTabsModalOpen(true);
    } catch (err) {
      toast.error(err?.data?.detail || "Failed to fetch tabs for this spreadsheet");
    } finally {
      setLoadingSheetId(null);
    }
  };

  // Import selected tab
  const handleImportTab = async (sheetId) => {
    setImportingTabId(sheetId);
    try {
      if (isPublicImport) {
        const res = await importPublicBlacklist({
          spreadsheet_url: selectedSheetUrl,
          sheet_id: sheetId,
        }).unwrap();
        toast.success(res.message || `Blacklist connected with ${res.brand_count} brands!`);
      } else {
        const res = await importOAuthBlacklist({
          spreadsheet_url: selectedSheetUrl,
          sheet_id: sheetId,
          title: selectedSheetTitle,
          access_token: oauthToken,
          refresh_token: oauthRefreshToken,
        }).unwrap();
        toast.success(res.message || `Blacklist connected with ${res.brand_count} brands!`);
      }
      setTabsModalOpen(false);
      setPublicUrl("");
      refetchBlacklist?.();
    } catch (err) {
      toast.error(err?.data?.detail || "Failed to import blacklist sheet");
    } finally {
      setImportingTabId(null);
    }
  };

  // Sync single sheet
  const handleSyncSheet = async (url) => {
    try {
      const res = await syncBlacklistSheet({ spreadsheet_url: url }).unwrap();
      toast.success(res.message || "Blacklist re-synchronized!");
      refetchBlacklist?.();
    } catch (err) {
      toast.error(err?.data?.detail || "Failed to sync blacklist");
    }
  };

  // Unlink sheet
  const handleConfirmDisconnect = async () => {
    if (!sheetToDisconnect) return;
    try {
      await unlinkBlacklistSheet({ spreadsheet_url: sheetToDisconnect.spreadsheet_url }).unwrap();
      toast.success("Blacklist spreadsheet disconnected");
      setDisconnectModalOpen(false);
      setSheetToDisconnect(null);
      refetchBlacklist?.();
    } catch (err) {
      toast.error(err?.data?.detail || "Failed to disconnect blacklist sheet");
    }
  };

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
          Brand Blacklist Sources
        </p>
        <span className="text-[11px] text-gray-400">
          Prevents matching brands from entering catalog
        </span>
      </div>

      {loadingSheets ? (
        <div className="py-4 text-center">
          <Spin size="small" />
        </div>
      ) : sheets.length === 0 ? (
        <div className="rounded-[4px] border border-dashed border-gray-200 px-4 py-5 text-center text-xs text-gray-400 mb-4">
          No blacklist sheets connected. Add a Google Sheet to automatically block unwanted brands.
        </div>
      ) : (
        <div className="space-y-2 mb-4">
          {sheets.map((s) => {
            const isPublic = s.import_type === "public";
            return (
              <div
                key={s.spreadsheet_url}
                className="rounded-[4px] border border-gray-200 bg-white p-3.5 transition-all hover:border-gray-300"
              >
                <div className="flex items-start gap-3">
                  <span className="w-8 h-8 rounded-[4px] bg-red-50 text-red-600 border border-red-100 flex items-center justify-center flex-shrink-0">
                    <BsFileEarmarkSpreadsheet size={15} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[13px] font-semibold text-gray-900 truncate">
                        {s.title || "Brand Blacklist"} ({s.brand_count} {s.brand_count === 1 ? "brand" : "brands"})
                      </p>

                      {s.is_syncing ? (
                        <span
                          title={
                            isPublic
                              ? "Public Google Sheet: automatically scanned & checked."
                              : "Google Drive OAuth connected: automatically scanned & checked."
                          }
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 flex-shrink-0"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          {isPublic ? "Auto-Syncing (60s)" : "Live Syncing"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[10px] font-medium bg-gray-50 text-gray-500 border border-gray-200 flex-shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                          Paused
                        </span>
                      )}

                      <span className="text-[10px] font-normal text-gray-400 uppercase tracking-wider">
                        {s.import_type === "oauth" ? "OAuth" : "Public Link"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 mt-1.5">
                      <FiLink2 size={11} className="text-gray-400 flex-shrink-0" />
                      <a
                        href={s.spreadsheet_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-gray-500 hover:text-gray-900 truncate underline-offset-2 hover:underline"
                        title={s.spreadsheet_url}
                      >
                        {s.spreadsheet_url}
                      </a>
                    </div>

                    {s.last_error && (
                      <p className="text-[11px] text-red-600 mt-1.5">
                        Sync error: {s.last_error}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => handleSyncSheet(s.spreadsheet_url)}
                      disabled={syncingSheet}
                      title="Re-sync blacklist brands and scan catalog"
                      className="flex items-center justify-center gap-1 text-[11px] font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 px-2.5 py-1.5 rounded-[4px] disabled:opacity-50 transition-colors"
                    >
                      <LuRefreshCw size={12} className={syncingSheet ? "animate-spin" : ""} />
                      Sync
                    </button>
                    <button
                      onClick={() => {
                        setSheetToDisconnect(s);
                        setDisconnectModalOpen(true);
                      }}
                      disabled={unlinkingSheet}
                      className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 hover:text-red-600 hover:border-red-200 px-2.5 py-1.5 rounded-[4px] disabled:opacity-50 transition-colors"
                    >
                      <LuUnplug size={13} /> Disconnect
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Blacklist Buttons */}
      <div className="flex flex-col sm:flex-row gap-2 mb-6">
        <button
          onClick={() => loginWithGoogle()}
          disabled={exchangingCode}
          className="flex-1 bg-white text-gray-700 border border-gray-200 text-xs font-medium py-2.5 rounded-[4px] hover:bg-gray-50 hover:border-gray-300 transition-colors flex items-center justify-center gap-2"
        >
          <img
            src="https://www.svgrepo.com/show/475656/google-color.svg"
            alt="Google"
            className="w-4 h-4"
          />
          {exchangingCode ? "Connecting..." : "Connect with Google"}
        </button>
        <button
          onClick={() => setPublicModalOpen(true)}
          className="flex-1 border border-gray-200 bg-white text-gray-700 text-xs font-medium py-2.5 rounded-[4px] hover:bg-gray-50 hover:border-gray-300 transition-colors flex items-center justify-center"
        >
          Add Public Link
        </button>
      </div>

      {/* Public Link Modal */}
      <Modal
        open={publicModalOpen}
        onCancel={() => setPublicModalOpen(false)}
        title="Import Public Blacklist Spreadsheet"
        footer={null}
        zIndex={1050}
      >
        <div className="py-4">
          <p className="text-sm text-gray-500 mb-2">
            Paste the link to your public Google Spreadsheet containing blacklisted brands.
          </p>
          <p className="text-xs text-gray-400 mb-4">
            Column A should have a header (e.g. &quot;BlackListed&quot; or &quot;Brand&quot;) followed by brand names.
          </p>
          <Input
            placeholder="https://docs.google.com/spreadsheets/d/..."
            value={publicUrl}
            onChange={(e) => setPublicUrl(e.target.value)}
            className="mb-4 h-10 rounded-lg"
          />
          <Button
            type="primary"
            onClick={handleFetchPublicTabs}
            loading={fetchingTabs}
            className="w-full h-10 rounded-lg button-color font-semibold"
          >
            Next
          </Button>
        </div>
      </Modal>

      {/* OAuth Sheets Modal */}
      <Modal
        open={oauthModalOpen}
        onCancel={() => {
          if (!loadingSheetId) setOauthModalOpen(false);
        }}
        closable={!loadingSheetId}
        maskClosable={!loadingSheetId}
        title="Select Blacklist Spreadsheet"
        footer={null}
        zIndex={1050}
      >
        <div className="py-4 max-h-[400px] overflow-y-auto">
          {oauthSheetsList.length === 0 ? (
            <p className="text-sm text-gray-500">No spreadsheets found in your Google Drive.</p>
          ) : (
            <div className="space-y-2">
              {oauthSheetsList.map((sheet) => {
                const isLoading = loadingSheetId === sheet.id;
                return (
                  <button
                    key={sheet.id}
                    onClick={() => handleSelectOAuthSheet(sheet)}
                    disabled={loadingSheetId !== null}
                    className={`w-full text-left p-3 border rounded-lg flex items-center gap-3 transition-colors ${
                      isLoading
                        ? "border-gray-300 bg-gray-50"
                        : "border-gray-100 hover:bg-gray-50"
                    }`}
                  >
                    <BsFileEarmarkSpreadsheet className="text-red-500" size={18} />
                    <span className="text-sm font-medium text-gray-800 truncate">
                      {sheet.name}
                    </span>
                    {isLoading && (
                      <span className="ml-auto flex items-center gap-2 text-xs text-gray-500 shrink-0">
                        Loading tabs
                        <Spin size="small" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </Modal>

      {/* Select Tab Modal */}
      <Modal
        open={tabsModalOpen}
        onCancel={() => {
          if (!isImporting) setTabsModalOpen(false);
        }}
        closable={!isImporting}
        maskClosable={!isImporting}
        title="Select Blacklist Tab"
        footer={null}
        zIndex={1050}
      >
        <div className="py-4">
          <p className="text-sm text-gray-500 mb-4">
            {isImporting
              ? "Importing blacklist brands and quarantining matching catalog products..."
              : "Select the tab containing the blacklisted brands."}
          </p>
          {fetchingTabs ? (
            <div className="space-y-3 animate-pulse py-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-full p-3 border border-gray-200 rounded bg-gray-50 flex items-center justify-between"
                >
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="w-4 h-4 rounded bg-gray-200" />
                </div>
              ))}
            </div>
          ) : tabsList.length === 0 ? (
            <p className="text-sm text-gray-500">No tabs found in this spreadsheet.</p>
          ) : (
            <div className="space-y-2">
              {tabsList.map((tab) => {
                const isThisImporting = importingTabId === tab.sheet_id;
                return (
                  <button
                    key={tab.sheet_id}
                    onClick={() => handleImportTab(tab.sheet_id)}
                    disabled={isImporting}
                    className={`w-full text-left p-3 border rounded-lg flex items-center justify-between gap-3 transition-colors ${
                      isThisImporting
                        ? "border-gray-300 bg-gray-50"
                        : "border-gray-100 hover:bg-gray-50"
                    } ${isImporting && !isThisImporting ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <span className="text-sm font-medium text-gray-800 truncate">
                      {tab.title}
                    </span>
                    {isThisImporting ? (
                      <span className="flex items-center gap-2 text-xs text-gray-500 shrink-0">
                        Importing
                        <Spin size="small" />
                      </span>
                    ) : (
                      <FiArrowRight className="text-gray-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </Modal>

      {/* Disconnect Modal */}
      <Modal
        open={disconnectModalOpen}
        onCancel={() => {
          setDisconnectModalOpen(false);
          setSheetToDisconnect(null);
        }}
        title={<span className="text-red-600">Disconnect Blacklist Sheet</span>}
        okText="Disconnect"
        okButtonProps={{ danger: true, loading: unlinkingSheet }}
        cancelText="Cancel"
        onOk={handleConfirmDisconnect}
        zIndex={1050}
      >
        <div className="py-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to disconnect this blacklist sheet? Brands contained in this sheet will no longer be blocked from entering your inventory catalog.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default BrandBlacklistSection;
