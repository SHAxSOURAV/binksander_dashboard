import { useState, useEffect, useRef } from "react";
import { Modal, Input, Form, Button, Spin, Checkbox } from "antd";
import toast from "react-hot-toast";
import {
  FiUser,
  FiLink2,
  FiShield,
  FiLock,
  FiArrowRight,
  FiArrowLeft,
  FiCamera,
  FiEdit2,
} from "react-icons/fi";
import BolAccountsSection from "./BolAccountsSection";
import { BsFileEarmarkSpreadsheet } from "react-icons/bs";
import { LuUnplug, LuRefreshCw } from "react-icons/lu";
import { useUI } from "../../Provider/ContextProvider";
import { getUser, setUser } from "../../utils/session";
import {
  useGetProfileQuery,
  useUpdateProfileMutation,
} from "../../Redux/profileApis";
import { useChangePasswordMutation } from "../../Redux/authApis";
import {
  useGetConnectedSheetsQuery,
  useUnlinkSheetMutation,
  useGetBolCredentialsQuery,
  useSaveBolCredentialsMutation,
  useDeleteBolCredentialsMutation,
  useImportPublicSheetMutation,
  useImportOAuthSheetMutation,
  useLazyGetListUserSheetsQuery,
  useLazyGetSpreadsheetTabsQuery,
  useExchangeGoogleCodeMutation,
} from "../../Redux/connectionApis";
import { useResyncInventoryMutation } from "../../Redux/productApis";
import { useGoogleLogin } from "@react-oauth/google";

const tabs = [
  { key: "account", label: "Account", icon: <FiUser size={16} /> },
  { key: "connection", label: "Connection", icon: <FiLink2 size={16} /> },
  { key: "privacy", label: "Privacy & Security", icon: <FiShield size={16} /> },
];

/**
 * The account's price multiplier, editable in place.
 *
 * Reads as a plain "×2.5" chip until clicked, then becomes a small number input. Saves
 * through the dedicated PATCH endpoint so no client secret is needed — the full edit form
 * requires one, which makes it the wrong tool for nudging a markup.
 */
const SettingsModal = () => {
  const { settingsOpen, setSettingsOpen, settingsTab, setSettingsTab } = useUI();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [bolEditOpen, setBolEditOpen] = useState(false);

  const { data: profile, isLoading: loadingProfile } = useGetProfileQuery(
    undefined,
    { skip: !settingsOpen },
  );
  const { data: connected, isLoading: loadingSheets } =
    useGetConnectedSheetsQuery(undefined, { skip: !settingsOpen });
  const { data: bolCreds = [] } = useGetBolCredentialsQuery(undefined, {
    skip: !settingsOpen,
  });

  const [unlinkSheet, { isLoading: unlinking }] = useUnlinkSheetMutation();
  const [resyncInventory, { isLoading: resyncing }] = useResyncInventoryMutation();
  const [saveBolCredentials, { isLoading: savingCreds }] =
    useSaveBolCredentialsMutation();
  const [deleteBolCredentials, { isLoading: deletingCreds }] =
    useDeleteBolCredentialsMutation();
  const [changePassword, { isLoading: changingPw }] = useChangePasswordMutation();
  const [updateProfile, { isLoading: savingProfile }] =
    useUpdateProfileMutation();

  const [bolForm] = Form.useForm();

  // New states for Spreadsheet connection
  const [publicLinkModalOpen, setPublicLinkModalOpen] = useState(false);
  const [publicLinkUrl, setPublicLinkUrl] = useState("");
  
  const [oauthSheetsModalOpen, setOauthSheetsModalOpen] = useState(false);
  const [oauthSheetsList, setOauthSheetsList] = useState([]);
  const [oauthToken, setOauthToken] = useState("");
  const [oauthRefreshToken, setOauthRefreshToken] = useState("");
  
  const [tabsModalOpen, setTabsModalOpen] = useState(false);
  const [tabsList, setTabsList] = useState([]);
  const [selectedSheetUrl, setSelectedSheetUrl] = useState("");
  const [isPublicTabSelect, setIsPublicTabSelect] = useState(false); // To know if we should call importPublic or importOAuth
  const [importingTabId, setImportingTabId] = useState(null); // tab row currently being imported
  const [loadingSheetId, setLoadingSheetId] = useState(null); // spreadsheet row currently fetching its tabs

  const [disconnectModalOpen, setDisconnectModalOpen] = useState(false);
  const [disconnectSheetUrl, setDisconnectSheetUrl] = useState("");
  const [disconnectDeleteData, setDisconnectDeleteData] = useState(false);
  const [disconnectItemCount, setDisconnectItemCount] = useState(0);

  const [importPublicSheet, { isLoading: importingPublic }] = useImportPublicSheetMutation();
  const [importOAuthSheet, { isLoading: importingOAuth }] = useImportOAuthSheetMutation();
  const [exchangeGoogleCode, { isLoading: exchangingCode }] = useExchangeGoogleCodeMutation();
  const [getListUserSheets, { isFetching: fetchingUserSheets }] = useLazyGetListUserSheetsQuery();
  const [getSpreadsheetTabs, { isFetching: fetchingTabs }] = useLazyGetSpreadsheetTabsQuery();

  // Account edit (full name + avatar)
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const avatarInputRef = useRef(null);

  useEffect(() => {
    if (!settingsOpen) {
      setShowChangePassword(false);
      setBolEditOpen(false);
      setEditingName(false);
    }
  }, [settingsOpen]);

  const sheets = connected?.connected_sheets || [];
  const importingTab = importingTabId !== null || importingPublic || importingOAuth;
  const loadingSheetTabs = loadingSheetId !== null;
  const account = profile || getUser() || {};

  // Persist any profile change and keep localStorage (navbar) in sync.
  const persistProfile = async (body, successMsg) => {
    try {
      const updated = await updateProfile(body).unwrap();
      setUser(updated);
      toast.success(successMsg);
      return true;
    } catch (err) {
      toast.error(err?.data?.detail || "Failed to update profile");
      return false;
    }
  };

  const onSaveName = async () => {
    const name = nameDraft.trim();
    if (!name) {
      toast.error("Full name cannot be empty");
      return;
    }
    if (name === account.full_name) {
      setEditingName(false);
      return;
    }
    if (await persistProfile({ full_name: name }, "Name updated")) {
      setEditingName(false);
    }
  };

  const onPickAvatar = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Image must be under 20MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      persistProfile({ profile_picture: reader.result }, "Photo updated");
    reader.onerror = () => toast.error("Could not read that image");
    reader.readAsDataURL(file);
  };

  const handleOpenUnlink = (spreadsheet_url, itemCount) => {
    setDisconnectSheetUrl(spreadsheet_url);
    setDisconnectItemCount(itemCount || 0);
    setDisconnectDeleteData(false);
    setDisconnectModalOpen(true);
  };

  const executeUnlink = async () => {
    try {
      const res = await unlinkSheet({
        spreadsheet_url: disconnectSheetUrl,
        delete_data: disconnectDeleteData,
      }).unwrap();
      toast.success(res.message || "Spreadsheet disconnected");
      setDisconnectModalOpen(false);
    } catch (err) {
      toast.error(err?.data?.detail || "Failed to disconnect");
    }
  };

  const onSaveBol = async (values) => {
    try {
      await saveBolCredentials({
        account_id: values.account_id,
        account_name: values.account_name,
        client_id: values.client_id,
        client_secret: values.client_secret,
        manufacturer_name: values.manufacturer_name,
        manufacturer_email: values.manufacturer_email,
        manufacturer_address: values.manufacturer_address,
        // These three were collected by the form but never submitted, so the advanced
        // overrides silently reverted to whatever Bol auto-discovery returned.
        economic_operator_id: values.economic_operator_id,
        fulfilment_profile_id: values.fulfilment_profile_id,
        price_multiplier: values.price_multiplier
          ? Number(values.price_multiplier)
          : undefined,
      }).unwrap();
      toast.success("Bol.com credentials saved");
      setBolEditOpen(false);
      bolForm.resetFields();
    } catch (err) {
      toast.error(err?.data?.detail || "Failed to save Bol credentials");
    }
  };

  const handleDeleteBol = (accountId) => {
    Modal.confirm({
      title: "Are you sure?",
      content: "Do you really want to delete your Bol.com credentials? This action cannot be undone.",
      okText: "Delete",
      okType: "danger",
      cancelText: "Cancel",
      onOk: async () => {
        try {
          await deleteBolCredentials(accountId).unwrap();
          toast.success("Bol.com credentials deleted");
        } catch (err) {
          toast.error(err?.data?.detail || "Failed to delete Bol credentials");
        }
      },
    });
  };

  const onChangePassword = async (values) => {
    try {
      await changePassword({
        current_password: values.currentPassword,
        new_password: values.newPassword,
      }).unwrap();
      toast.success("Password changed successfully");
      setShowChangePassword(false);
    } catch (err) {
      toast.error(err?.data?.detail || "Failed to change password");
    }
  };

  const loginWithGoogle = useGoogleLogin({
    flow: "auth-code",
    prompt: "consent",
    onSuccess: async (codeResponse) => {
      console.log("Got OAuth code:", codeResponse.code);
      try {
        const res = await exchangeGoogleCode({
          code: codeResponse.code,
          redirect_uri: "postmessage"
        }).unwrap();
        
        console.log("exchangeGoogleCode response:", res);
        setOauthToken(res.access_token);
        setOauthRefreshToken(res.refresh_token);
        setOauthSheetsList(res.sheets || []);
        setOauthSheetsModalOpen(true);
      } catch (err) {
        console.error("exchangeGoogleCode error:", err);
        toast.error(err?.data?.detail || "Failed to authenticate with Google");
      }
    },
    scope: "https://www.googleapis.com/auth/drive.readonly",
  });

  const handleFetchPublicTabs = async () => {
    if (!publicLinkUrl) return toast.error("Please enter a link");
    try {
      const res = await getSpreadsheetTabs({ spreadsheet_url: publicLinkUrl }).unwrap();
      setTabsList(res.tabs || []);
      setSelectedSheetUrl(publicLinkUrl);
      setIsPublicTabSelect(true);
      setPublicLinkModalOpen(false);
      setTabsModalOpen(true);
    } catch (err) {
      toast.error(err?.data?.detail || "Failed to fetch tabs");
    }
  };

  const handleSelectOauthSheet = async (sheet) => {
    const sheetUrl = sheet.webViewLink;
    setLoadingSheetId(sheet.id);
    try {
      const res = await getSpreadsheetTabs({ spreadsheet_url: sheetUrl, access_token: oauthToken }).unwrap();
      setTabsList(res.tabs || []);
      setSelectedSheetUrl(sheetUrl);
      setIsPublicTabSelect(false);
      setOauthSheetsModalOpen(false);
      setTabsModalOpen(true);
    } catch (err) {
      toast.error("Failed to fetch tabs for this sheet");
    } finally {
      setLoadingSheetId(null);
    }
  };

  const handleImportSheet = async (sheetId) => {
    setImportingTabId(sheetId);
    try {
      if (isPublicTabSelect) {
        await importPublicSheet({ spreadsheet_url: selectedSheetUrl, sheet_id: sheetId }).unwrap();
        toast.success("Public Spreadsheet Imported!");
      } else {
        await importOAuthSheet({ spreadsheet_url: selectedSheetUrl, sheet_id: sheetId, access_token: oauthToken, refresh_token: oauthRefreshToken }).unwrap();
        toast.success("OAuth Spreadsheet Imported!");
      }
      setTabsModalOpen(false);
      setPublicLinkUrl("");
    } catch (err) {
      toast.error(err?.data?.detail || "Failed to import sheet");
    } finally {
      setImportingTabId(null);
    }
  };

  return (
    <>
    <Modal
      open={settingsOpen}
      onCancel={() => setSettingsOpen(false)}
      footer={null}
      centered
      width={800}
      title={<span className="text-base font-semibold text-gray-900">Settings</span>}
      className="settings-modal-premium"
      styles={{
        content: { padding: '20px 24px', borderRadius: '8px', boxShadow: '0 16px 40px -12px rgba(0, 0, 0, 0.18)' },
        header: { marginBottom: '12px' }
      }}
    >
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 font-poppins mt-1 min-h-[420px]">
        {/* Tabs */}
        <div className="sm:w-44 flex sm:flex-col gap-0.5 flex-wrap mb-3 sm:mb-0">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setSettingsTab(t.key);
                setShowChangePassword(false);
              }}
              className={`flex items-center gap-2.5 px-3 py-2 rounded text-[13px] font-medium transition-colors text-left ${
                settingsTab === t.key
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
              }`}
            >
              <span className={settingsTab === t.key ? "text-gray-700" : "text-gray-400"}>
                {t.icon}
              </span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 sm:border-l sm:border-gray-100 sm:pl-6">
          {/* Account */}
          {settingsTab === "account" && (
            <div className="animate-fade-in">
              <h3 className="text-sm font-semibold text-gray-900">Your Account</h3>
              <p className="text-xs text-gray-500 mb-5">
                Manage your personal information and preferences.
              </p>
              {loadingProfile && !account.email ? (
                <div className="flex justify-center py-10"><Spin /></div>
              ) : (
                <div className="space-y-4">
                  {/* Avatar */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="relative">
                      <img
                        src={account.profile_picture || "/Deafult Profile/profile.webp"}
                        alt="avatar"
                        className="w-16 h-16 rounded-full object-cover border border-gray-100"
                      />
                      <button
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        disabled={savingProfile}
                        title="Change photo"
                        className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full button-color flex items-center justify-center disabled:opacity-60"
                      >
                        <FiCamera size={13} />
                      </button>
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/*"
                        onChange={onPickAvatar}
                        className="hidden"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {account.full_name || "—"}
                      </p>
                      <p className="text-xs text-gray-400">
                        JPG or PNG, up to 20MB
                      </p>
                    </div>
                  </div>

                  {/* Full name */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white border border-gray-200 rounded px-4 py-3">
                    <div className="flex-1 min-w-0 mb-3 sm:mb-0">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Full Name</p>
                      {editingName ? (
                        <div className="flex items-center gap-2">
                          <Input
                            autoFocus
                            value={nameDraft}
                            onChange={(e) => setNameDraft(e.target.value)}
                            onPressEnter={onSaveName}
                            className="h-9 rounded-lg max-w-xs"
                            placeholder="Your name"
                          />
                          <button
                            onClick={onSaveName}
                            disabled={savingProfile}
                            className="h-9 px-4 rounded-lg button-color text-sm font-semibold disabled:opacity-60"
                          >
                            {savingProfile ? "Saving..." : "Save"}
                          </button>
                          <button
                            onClick={() => setEditingName(false)}
                            className="h-9 px-3 rounded-lg border border-gray-200 text-sm text-gray-600"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <p className="text-sm font-medium">
                          {account.full_name || "—"}
                        </p>
                      )}
                    </div>
                    {!editingName && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold text-gray-600 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded capitalize">
                          {account.role || "seller"}
                        </span>
                        <button
                          onClick={() => {
                            setNameDraft(account.full_name || "");
                            setEditingName(true);
                          }}
                          title="Edit name"
                          className="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                        >
                          <FiEdit2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between bg-white border border-gray-200 rounded px-4 py-3">
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Email</p>
                      <p className="text-sm font-medium text-gray-800">{account.email || "—"}</p>
                    </div>
                    <span className="text-gray-300">
                      <FiLock size={15} />
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Connection */}
          {settingsTab === "connection" && (
            <div className="animate-fade-in">
              <h3 className="text-sm font-semibold text-gray-900">Integrations</h3>
              <p className="text-xs text-gray-500 mb-5">
                Manage your inventory sources and Bol.com connection.
              </p>

              {/* Inventory sheets */}
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Inventory Source
              </p>

              {loadingSheets ? (
                <Spin />
              ) : sheets.length === 0 ? (
                <div className="rounded-[4px] border border-dashed border-gray-200 px-4 py-5 text-center text-xs text-gray-400 mb-4">
                  No spreadsheet connected. Please add one below.
                </div>
              ) : (
                <div className="space-y-2 mb-4">
                  {sheets.map((s) => {
                    const isAuthExpired = s.status === "EXPIRED_AUTH";
                    const isPublic = s.import_type === "public" || s.sync_mode === "auto_polling_60s";

                    return (
                      <div
                        key={s.spreadsheet_url}
                        className="rounded-[4px] border border-gray-200 bg-white p-3.5 transition-all hover:border-gray-300"
                      >
                        <div className="flex items-start gap-3">
                          <span className="w-8 h-8 rounded-[4px] bg-gray-50 text-gray-600 border border-gray-200 flex items-center justify-center flex-shrink-0">
                            <BsFileEarmarkSpreadsheet size={15} />
                          </span>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-[13px] font-semibold text-gray-900 truncate">
                                {s.title || "Inventory Sheet"} ({s.item_count} {s.item_count === 1 ? "item" : "items"})
                              </p>

                              {isAuthExpired ? (
                                <span
                                  title={s.last_error || "Google OAuth authorization expired. Please reconnect."}
                                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 flex-shrink-0"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                  Auth Expired
                                </span>
                              ) : s.is_syncing ? (
                                <span
                                  title={isPublic ? "Public Google Sheet: changes automatically sync every 60 seconds." : "Google Drive push notifications actively streaming changes."}
                                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 flex-shrink-0"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  {isPublic ? "Auto-Syncing (60s)" : "Live Syncing"}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[10px] font-medium bg-gray-50 text-gray-500 border border-gray-200 flex-shrink-0">
                                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                                  Disconnected
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

                            {isAuthExpired && (
                              <p className="text-[11px] text-amber-600 mt-1.5">
                                Google authorization expired. Click Reconnect below to restore synchronization.
                              </p>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {isAuthExpired ? (
                              <button
                                onClick={() => loginWithGoogle()}
                                className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-white bg-blue-600 hover:bg-blue-700 px-2.5 py-1.5 rounded-[4px] transition-colors shadow-xs"
                              >
                                <LuRefreshCw size={12} /> Reconnect
                              </button>
                            ) : s.is_syncing ? (
                              <button
                                onClick={() => {
                                  Modal.confirm({
                                    title: "Disconnect Syncing?",
                                    content: "Your products will remain in the dashboard, but will no longer automatically sync from Google Sheets.",
                                    okText: "Disconnect",
                                    okType: "danger",
                                    onOk: async () => {
                                      try {
                                        await unlinkSheet({ spreadsheet_url: s.spreadsheet_url, delete_data: false }).unwrap();
                                        toast.success("Disconnected from Google Sheet");
                                      } catch (err) {
                                        toast.error(err?.data?.detail || "Failed to disconnect");
                                      }
                                    }
                                  });
                                }}
                                disabled={unlinking}
                                className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 hover:text-red-600 hover:border-red-200 px-2.5 py-1.5 rounded-[4px] flex-shrink-0 disabled:opacity-50 transition-colors"
                              >
                                <LuUnplug size={13} /> Disconnect
                              </button>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => {
                                    Modal.confirm({
                                      title: "Delete All Data?",
                                      content: "Are you sure you want to delete all products imported from this sheet? This action cannot be undone.",
                                      okText: "Delete",
                                      okType: "danger",
                                      onOk: async () => {
                                        try {
                                          await unlinkSheet({ spreadsheet_url: s.spreadsheet_url, delete_data: true }).unwrap();
                                          toast.success("Sheet and products deleted");
                                        } catch (err) {
                                          toast.error(err?.data?.detail || "Failed to delete sheet data");
                                        }
                                      }
                                    });
                                  }}
                                  disabled={unlinking}
                                  className="flex items-center justify-center text-[11px] font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 hover:text-red-600 hover:border-red-200 px-2.5 py-1.5 rounded-[4px] flex-shrink-0 disabled:opacity-50 transition-colors"
                                >
                                  Delete
                                </button>
                                <button
                                  onClick={async () => {
                                    try {
                                      await resyncInventory().unwrap();
                                      toast.success("Successfully connected and synced");
                                    } catch (err) {
                                      toast.error(err?.data?.detail || "Failed to sync");
                                    }
                                  }}
                                  disabled={resyncing}
                                  className="flex items-center justify-center text-[11px] font-medium text-gray-900 border border-gray-300 hover:bg-gray-50 px-2.5 py-1.5 rounded-[4px] flex-shrink-0 disabled:opacity-50 transition-colors"
                                >
                                  Sync
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add Spreadsheet Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 mb-6">
                <button
                  onClick={() => loginWithGoogle()}
                  className="flex-1 bg-white text-gray-700 border border-gray-200 text-xs font-medium py-2.5 rounded-[4px] hover:bg-gray-50 hover:border-gray-300 transition-colors flex items-center justify-center gap-2"
                >
                  <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-4 h-4" />
                  Connect with Google
                </button>
                <button
                  onClick={() => setPublicLinkModalOpen(true)}
                  className="flex-1 border border-gray-200 bg-white text-gray-700 text-xs font-medium py-2.5 rounded-[4px] hover:bg-gray-50 hover:border-gray-300 transition-colors flex items-center justify-center"
                >
                  Add Public Link
                </button>
              </div>

              <BolAccountsSection
                accounts={bolCreds}
                form={bolForm}
                editOpen={bolEditOpen}
                setEditOpen={setBolEditOpen}
                onSave={onSaveBol}
                onDelete={handleDeleteBol}
                saving={savingCreds}
                deleting={deletingCreds}
              />

            </div>
          )}

          {/* Privacy & Security */}
          {settingsTab === "privacy" && !showChangePassword && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Privacy &amp; Security</h3>
              <p className="text-xs text-gray-500 mb-5">Manage your security</p>
              <button
                onClick={() => setShowChangePassword(true)}
                className="w-full flex items-center justify-between border border-gray-200 rounded px-4 py-3 text-[13px] font-medium text-gray-800 hover:bg-gray-50 transition-colors"
              >
                Change Password <FiArrowRight />
              </button>
            </div>
          )}

          {/* Change Password */}
          {settingsTab === "privacy" && showChangePassword && (
            <div>
              <h3 className="text-base font-bold">Change Password</h3>
              <button
                onClick={() => setShowChangePassword(false)}
                className="text-gray-400 mb-4 mt-1"
              >
                <FiArrowLeft />
              </button>
              <Form layout="vertical" onFinish={onChangePassword}>
                <Form.Item
                  name="currentPassword"
                  label="Current Password"
                  rules={[{ required: true, message: "Required" }]}
                >
                  <Input.Password className="h-11 rounded-lg" placeholder="••••••••" />
                </Form.Item>
                <Form.Item
                  name="newPassword"
                  label="New Password"
                  rules={[
                    { required: true, min: 8, message: "Min 8 characters" },
                    {
                      pattern: /^(?=.*[A-Za-z])(?=.*\d).+$/,
                      message: "Must include a letter and a number.",
                    },
                  ]}
                >
                  <Input.Password className="h-11 rounded-lg" placeholder="••••••••" />
                </Form.Item>
                <Form.Item
                  name="confirmPassword"
                  label="Confirm Password"
                  dependencies={["newPassword"]}
                  rules={[
                    { required: true, message: "Required" },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue("newPassword") === value)
                          return Promise.resolve();
                        return Promise.reject(new Error("Passwords do not match!"));
                      },
                    }),
                  ]}
                >
                  <Input.Password className="h-11 rounded-lg" placeholder="••••••••" />
                </Form.Item>
                <Button
                  htmlType="submit"
                  type="primary"
                  loading={changingPw}
                  className="w-full h-11 rounded-lg button-color font-semibold"
                >
                  Change Password
                </Button>
              </Form>
            </div>
          )}
        </div>
      </div>
    </Modal>

    {/* Public Link Modal */}
    <Modal
      open={publicLinkModalOpen}
      onCancel={() => setPublicLinkModalOpen(false)}
      title="Import Public Spreadsheet"
      footer={null}
      zIndex={1050}
    >
      <div className="py-4">
        <p className="text-sm text-gray-500 mb-4">Paste the link to your public Google Spreadsheet.</p>
        <Input 
          placeholder="https://docs.google.com/spreadsheets/d/..." 
          value={publicLinkUrl} 
          onChange={e => setPublicLinkUrl(e.target.value)} 
          className="mb-4 h-10 rounded-lg"
        />
        <Button type="primary" onClick={handleFetchPublicTabs} loading={fetchingTabs} className="w-full h-10 rounded-lg button-color font-semibold">
          Next
        </Button>
      </div>
    </Modal>

    {/* OAuth Sheets Modal */}
    <Modal
      open={oauthSheetsModalOpen}
      onCancel={() => { if (!loadingSheetTabs) setOauthSheetsModalOpen(false); }}
      closable={!loadingSheetTabs}
      maskClosable={!loadingSheetTabs}
      title="Select Spreadsheet"
      footer={null}
      zIndex={1050}
    >
      <div className="py-4 max-h-[400px] overflow-y-auto">
        {fetchingUserSheets ? (
          <div className="space-y-3 animate-pulse py-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-full p-3 border border-gray-200 rounded bg-gray-50 flex items-center gap-3">
                <div className="w-5 h-5 rounded bg-gray-200"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : oauthSheetsList.length === 0 ? (
          <p className="text-sm text-gray-500">No spreadsheets found.</p>
        ) : (
          <div className="space-y-2">
            {oauthSheetsList.map(sheet => {
              const isLoading = loadingSheetId === sheet.id;
              return (
                <button 
                  key={sheet.id}
                  onClick={() => handleSelectOauthSheet(sheet)}
                  disabled={loadingSheetTabs}
                  className={`w-full text-left p-3 border rounded-lg flex items-center gap-3 transition-colors ${
                    isLoading ? "border-gray-300 bg-gray-50" : "border-gray-100 hover:bg-gray-50"
                  } ${loadingSheetTabs && !isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <BsFileEarmarkSpreadsheet className="text-green-600" size={18} />
                  <span className="text-sm font-medium text-gray-800 truncate">{sheet.name}</span>
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

    {/* Sheet Tabs Modal */}
    <Modal
      open={tabsModalOpen}
      onCancel={() => { if (!importingTab) setTabsModalOpen(false); }}
      closable={!importingTab}
      maskClosable={!importingTab}
      title="Select Tab"
      footer={null}
      zIndex={1050}
    >
      <div className="py-4">
        <p className="text-sm text-gray-500 mb-4">
          {importingTab
            ? "Importing your products. Large sheets can take a moment — please keep this window open."
            : "Select the specific tab to import from the spreadsheet."}
        </p>
        {fetchingTabs ? (
          <div className="space-y-3 animate-pulse py-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-full p-3 border border-gray-200 rounded bg-gray-50 flex items-center justify-between">
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="w-4 h-4 rounded bg-gray-200"></div>
              </div>
            ))}
          </div>
        ) : tabsList.length === 0 ? (
          <p className="text-sm text-gray-500">No tabs found.</p>
        ) : (
          <div className="space-y-2">
            {tabsList.map(tab => {
              const isImporting = importingTabId === tab.sheet_id;
              return (
                <button 
                  key={tab.sheet_id}
                  onClick={() => handleImportSheet(tab.sheet_id)}
                  disabled={importingTab}
                  className={`w-full text-left p-3 border rounded-lg flex items-center justify-between gap-3 transition-colors ${
                    isImporting ? "border-gray-300 bg-gray-50" : "border-gray-100 hover:bg-gray-50"
                  } ${importingTab && !isImporting ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <span className="text-sm font-medium text-gray-800 truncate">{tab.title}</span>
                  {isImporting ? (
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
      onCancel={() => setDisconnectModalOpen(false)}
      title={<span className="text-red-600">Disconnect Spreadsheet</span>}
      okText="Disconnect"
      okButtonProps={{ danger: true, loading: unlinking }}
      cancelText="Cancel"
      onOk={executeUnlink}
      zIndex={1050}
    >
      <div className="py-4">
        <p className="text-sm text-gray-600 mb-4">
          This will remove the connection to this spreadsheet. It will no longer sync automatically.
        </p>
        <Checkbox 
          checked={disconnectDeleteData} 
          onChange={e => setDisconnectDeleteData(e.target.checked)}
        >
          Also delete all <span className="font-semibold">{disconnectItemCount}</span> imported products from this sheet
        </Checkbox>
      </div>
    </Modal>
    </>
  );
};

export default SettingsModal;
