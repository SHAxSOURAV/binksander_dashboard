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
  FiCheckCircle,
  FiXCircle,
  FiCamera,
  FiEdit2,
} from "react-icons/fi";
import { BsFileEarmarkSpreadsheet } from "react-icons/bs";
import { TbBrandAmazon } from "react-icons/tb";
import { LuUnplug } from "react-icons/lu";
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
  useGetAmazonCredentialsQuery,
  useSaveAmazonCredentialsMutation,
  useImportPublicSheetMutation,
  useImportOAuthSheetMutation,
  useLazyGetListUserSheetsQuery,
  useLazyGetSpreadsheetTabsQuery,
  useExchangeGoogleCodeMutation,
} from "../../Redux/connectionApis";
import { useResyncInventoryMutation } from "../../Redux/productApis";
import { useRegisterBolWebhookMutation } from "../../Redux/fulfillmentApis";
import { useGoogleLogin } from "@react-oauth/google";

const tabs = [
  { key: "account", label: "Account", icon: <FiUser size={16} /> },
  { key: "connection", label: "Connection", icon: <FiLink2 size={16} /> },
  { key: "privacy", label: "Privacy & Security", icon: <FiShield size={16} /> },
];

const SettingsModal = () => {
  const { settingsOpen, setSettingsOpen, settingsTab, setSettingsTab } = useUI();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [bolEditOpen, setBolEditOpen] = useState(false);
  const [amazonEditOpen, setAmazonEditOpen] = useState(false);

  const { data: profile, isLoading: loadingProfile } = useGetProfileQuery(
    undefined,
    { skip: !settingsOpen },
  );
  const { data: connected, isLoading: loadingSheets } =
    useGetConnectedSheetsQuery(undefined, { skip: !settingsOpen });
  const { data: bolCreds = [] } = useGetBolCredentialsQuery(undefined, {
    skip: !settingsOpen,
  });
  const { data: amazonCreds } = useGetAmazonCredentialsQuery(undefined, {
    skip: !settingsOpen,
  });

  const [unlinkSheet, { isLoading: unlinking }] = useUnlinkSheetMutation();
  const [resyncInventory, { isLoading: resyncing }] = useResyncInventoryMutation();
  const [saveBolCredentials, { isLoading: savingCreds }] =
    useSaveBolCredentialsMutation();
  const [deleteBolCredentials, { isLoading: deletingCreds }] =
    useDeleteBolCredentialsMutation();
  const [saveAmazonCredentials, { isLoading: savingAmazon }] =
    useSaveAmazonCredentialsMutation();
  const [registerWebhook, { isLoading: registering }] =
    useRegisterBolWebhookMutation();
  const [changePassword, { isLoading: changingPw }] = useChangePasswordMutation();
  const [updateProfile, { isLoading: savingProfile }] =
    useUpdateProfileMutation();

  const [bolForm] = Form.useForm();
  const [amazonForm] = Form.useForm();

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
      setAmazonEditOpen(false);
      setEditingName(false);
    }
  }, [settingsOpen]);

  const sheets = connected?.connected_sheets || [];
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
        boip_code: values.boip_code,
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

  const onSaveAmazon = async (values) => {
    try {
      await saveAmazonCredentials(values).unwrap();
      toast.success("amazon.nl credentials saved");
      amazonForm.resetFields();
      setAmazonEditOpen(false);
    } catch (err) {
      toast.error(err?.data?.detail || "Failed to save credentials");
    }
  };

  const onRegisterWebhook = async () => {
    try {
      const res = await registerWebhook().unwrap();
      toast.success(res?.message || "Bol order webhook registered");
    } catch (err) {
      toast.error(err?.data?.detail || "Failed to register webhook");
    }
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
    try {
      const res = await getSpreadsheetTabs({ spreadsheet_url: sheetUrl, access_token: oauthToken }).unwrap();
      setTabsList(res.tabs || []);
      setSelectedSheetUrl(sheetUrl);
      setIsPublicTabSelect(false);
      setOauthSheetsModalOpen(false);
      setTabsModalOpen(true);
    } catch (err) {
      toast.error("Failed to fetch tabs for this sheet");
    }
  };

  const handleImportSheet = async (sheetId) => {
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
      title={<span className="text-xl font-bold text-gray-800 tracking-tight">Settings</span>}
      className="settings-modal-premium"
      styles={{
        content: { padding: '24px 32px', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)' },
        header: { marginBottom: '16px' }
      }}
    >
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-8 font-poppins mt-2 min-h-[400px]">
        {/* Tabs */}
        <div className="sm:w-56 flex sm:flex-col gap-2 flex-wrap mb-4 sm:mb-0">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setSettingsTab(t.key);
                setShowChangePassword(false);
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                settingsTab === t.key
                  ? "bg-gradient-to-r from-brand/10 to-brand/5 text-brand shadow-sm border border-brand/20"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-700 border border-transparent"
              }`}
            >
              <span className={`${settingsTab === t.key ? 'text-brand' : 'text-gray-400'}`}>
                {t.icon}
              </span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 sm:border-l sm:border-gray-100 sm:pl-8">
          {/* Account */}
          {settingsTab === "account" && (
            <div className="animate-fade-in">
              <h3 className="text-lg font-bold text-gray-800">Your Account</h3>
              <p className="text-sm text-gray-500 mb-6">
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
                        className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full button-color flex items-center justify-center shadow disabled:opacity-60"
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
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white border border-gray-100 rounded-2xl px-5 py-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex-1 min-w-0 mb-3 sm:mb-0">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Full Name</p>
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
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-bold text-brand bg-brand/10 px-3 py-1.5 rounded-full capitalize">
                          {account.role || "seller"}
                        </span>
                        <button
                          onClick={() => {
                            setNameDraft(account.full_name || "");
                            setEditingName(true);
                          }}
                          title="Edit name"
                          className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:text-brand hover:bg-brand/10 transition-colors"
                        >
                          <FiEdit2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between bg-white border border-gray-100 rounded-2xl px-5 py-4 shadow-sm hover:shadow-md transition-shadow">
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Email</p>
                      <p className="text-base font-medium text-gray-800">{account.email || "—"}</p>
                    </div>
                    <span className="bg-gray-50 text-gray-400 w-10 h-10 rounded-full flex items-center justify-center shadow-inner">
                      <FiLock size={16} />
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Connection */}
          {settingsTab === "connection" && (
            <div className="animate-fade-in">
              <h3 className="text-lg font-bold text-gray-800">Integrations</h3>
              <p className="text-sm text-gray-500 mb-6">
                Manage your inventory sources and Bol.com connection.
              </p>

              {/* Inventory sheets */}
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-gray-700">
                  Inventory Source
                </p>
              </div>

              {loadingSheets ? (
                <Spin />
              ) : sheets.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 px-4 py-5 text-center text-xs text-gray-400 mb-5">
                  No spreadsheet connected. Please add one below.
                </div>
              ) : (
                <div className="space-y-3 mb-5">
                  {sheets.map((s) => (
                    <div
                      key={s.spreadsheet_url}
                      className="rounded-2xl border border-gray-100 bg-white p-4"
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: "#16A34A14", color: "#16A34A" }}
                        >
                          <BsFileEarmarkSpreadsheet size={18} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-gray-800 truncate">
                              Inventory ({s.item_count} items)
                            </p>
                            {s.is_syncing ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full flex-shrink-0">
                                <FiCheckCircle size={11} /> Connected & Syncing
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full flex-shrink-0">
                                <FiXCircle size={11} /> Disconnected
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 bg-[#f7f8fc] rounded-lg px-3 py-1.5 mt-2">
                            <FiLink2 size={12} className="text-gray-400 flex-shrink-0" />
                            <span className="text-xs text-gray-500 truncate">
                              {s.spreadsheet_url}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          {s.is_syncing ? (
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
                              className="flex items-center justify-center gap-1.5 text-xs font-medium text-red-500 border border-red-200 hover:bg-red-50 px-3 py-2 rounded-lg flex-shrink-0 disabled:opacity-50"
                            >
                              <LuUnplug size={13} /> Disconnect
                            </button>
                          ) : (
                            <div className="flex gap-2">
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
                                className="flex items-center justify-center text-xs font-medium text-red-500 border border-red-200 hover:bg-red-50 px-3 py-2 rounded-lg flex-shrink-0 disabled:opacity-50"
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
                                className="flex items-center justify-center text-xs font-medium text-brand border border-brand/30 hover:bg-[#f0f0fd] px-3 py-2 rounded-lg flex-shrink-0 disabled:opacity-50"
                              >
                                Connect
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Spreadsheet Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 mb-8">
                <button
                  onClick={() => loginWithGoogle()}
                  className="flex-1 bg-white text-gray-700 border border-gray-200 text-sm font-semibold py-3 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
                  Connect with Google
                </button>
                <button
                  onClick={() => setPublicLinkModalOpen(true)}
                  className="flex-1 border border-gray-200 bg-white text-gray-700 text-sm font-medium py-3 rounded-xl hover:bg-gray-50 transition-all shadow-sm flex items-center justify-center"
                >
                  Add Public Link
                </button>
              </div>

              {/* Bol.com credentials */}
              <div className="flex items-center justify-between mb-3 pt-4 border-t border-gray-100">
                <p className="text-sm font-bold text-gray-700">
                  Bol.com API Accounts
                </p>
                {!bolEditOpen && (
                  <button
                    onClick={() => {
                      bolForm.resetFields();
                      setBolEditOpen(true);
                    }}
                    className="text-sm font-semibold text-brand bg-brand/10 hover:bg-brand/20 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    + Add Account
                  </button>
                )}
              </div>
              
              <div className="space-y-3 mb-4">
                  {bolCreds.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-400 bg-gray-50/50">
                      No Bol accounts connected.
                    </div>
                  ) : (
                    bolCreds.map((cred) => (
                      <div key={cred.account_id} className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 shadow-sm hover:shadow-md transition-all group">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <span
                              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bol-logo text-sm font-bold shadow-inner"
                              style={{ backgroundColor: "#1B17E010", color: "#1B17E0" }}
                            >
                              bol.
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-base font-bold text-gray-800 truncate">
                                  {cred.account_name}
                                </p>
                                {cred.is_secret_set ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                    <FiCheckCircle size={10} /> Active
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                    <FiXCircle size={10} /> Incomplete
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                                <p>Client ID: <span className="font-mono text-gray-500">{cred.client_id || "—"}</span></p>
                                {cred.boip_code && (
                                  <p className="bg-brand/5 border border-brand/20 text-brand px-2 py-0.5 rounded font-mono text-[11px] font-semibold">
                                    BOIP: {cred.boip_code}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => {
                                bolForm.setFieldsValue({
                                  account_id: cred.account_id,
                                  account_name: cred.account_name,
                                  client_id: cred.client_id,
                                  boip_code: cred.boip_code,
                                });
                                setBolEditOpen(true);
                              }}
                              className="text-xs font-semibold text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-4 py-2 rounded-lg transition-colors"
                            >
                              Update
                            </button>
                            <button
                              onClick={() => handleDeleteBol(cred.account_id)}
                              disabled={deletingCreds}
                              className="text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 px-4 py-2 rounded-lg transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

              {bolEditOpen && (
                <Form
                  form={bolForm}
                  layout="vertical"
                  onFinish={onSaveBol}
                  className="rounded-2xl border border-gray-100 bg-white p-4"
                >
                  <Form.Item name="account_id" hidden>
                    <Input />
                  </Form.Item>
                  <Form.Item
                    name="account_name"
                    label="Account Name"
                    rules={[{ required: true, message: "Required" }]}
                    className="mb-3"
                  >
                    <Input className="h-10 rounded-lg" placeholder="e.g. Main Account" />
                  </Form.Item>
                  <Form.Item
                    name="client_id"
                    label="Client ID"
                    rules={[{ required: true, message: "Required" }]}
                    className="mb-3"
                  >
                    <Input className="h-10 rounded-lg" placeholder="Bol.com Client ID" />
                  </Form.Item>
                  <Form.Item
                    name="client_secret"
                    label="Client Secret"
                    rules={[{ required: true, message: "Required" }]}
                    className="mb-3"
                  >
                    <Input.Password
                      className="h-10 rounded-lg"
                      placeholder="Bol.com Client Secret"
                    />
                  </Form.Item>
                  <Form.Item
                    name="boip_code"
                    label="BOIP Brand Authorization Code"
                    tooltip="Benelux Office for Intellectual Property reference code used for Bol.com brand authorization & duplicate checks."
                    className="mb-3"
                  >
                    <Input className="h-10 rounded-lg font-mono" placeholder="e.g. PJS_J23DAPH3" />
                  </Form.Item>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setBolEditOpen(false);
                        bolForm.resetFields();
                      }}
                      className="h-9 px-4 rounded-lg border border-gray-200 text-sm text-gray-600"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingCreds}
                      className="h-9 px-5 rounded-lg button-color text-sm font-semibold disabled:opacity-60"
                    >
                      {savingCreds ? "Saving..." : "Save"}
                    </button>
                  </div>
                </Form>
              )}

              {/* Amazon.nl fulfillment account */}
              <div className="pt-8 pb-2">
                <p className="text-sm font-bold text-gray-700">
                  Amazon Fulfillment <span className="text-xs font-normal text-gray-400 ml-1">(Dropshipping)</span>
                </p>
              </div>
              
              {!amazonEditOpen ? (
                <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <span
                        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner"
                        style={{ backgroundColor: "#FF990010", color: "#FF9900" }}
                      >
                        <TbBrandAmazon size={24} />
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-base font-bold text-gray-800 truncate">
                            Buying Account
                          </p>
                        {amazonCreds?.is_secret_set ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                            <FiCheckCircle size={11} /> Connected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                            <FiXCircle size={11} /> Not Set
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1">
                        Email:{" "}
                        <span className="text-gray-600">
                          {amazonCreds?.email || "—"}
                        </span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setAmazonEditOpen(true)}
                    className="text-xs font-semibold text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-4 py-2 rounded-lg transition-colors flex-shrink-0"
                    >
                      {amazonCreds?.is_secret_set ? "Update" : "Set up"}
                    </button>
                  </div>
                </div>
              ) : (
                <Form
                  form={amazonForm}
                  layout="vertical"
                  onFinish={onSaveAmazon}
                  className="rounded-2xl border border-gray-100 bg-white p-4"
                >
                  <Form.Item
                    name="email"
                    label="amazon.nl Email"
                    rules={[{ required: true, message: "Required" }]}
                    className="mb-3"
                  >
                    <Input className="h-10 rounded-lg" placeholder="you@email.com" />
                  </Form.Item>
                  <Form.Item
                    name="password"
                    label="Password"
                    rules={[{ required: true, message: "Required" }]}
                    className="mb-3"
                  >
                    <Input.Password className="h-10 rounded-lg" placeholder="••••••••" />
                  </Form.Item>
                  <Form.Item
                    name="totp_secret"
                    label="TOTP Secret (optional, for 2FA)"
                    className="mb-3"
                  >
                    <Input className="h-10 rounded-lg" placeholder="Base32 secret" />
                  </Form.Item>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setAmazonEditOpen(false)}
                      className="h-9 px-4 rounded-lg border border-gray-200 text-sm text-gray-600"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingAmazon}
                      className="h-9 px-5 rounded-lg button-color text-sm font-semibold disabled:opacity-60"
                    >
                      {savingAmazon ? "Saving..." : "Save"}
                    </button>
                  </div>
                </Form>
              )}

              {/* Register Bol order webhook */}
              <div className="mt-8 pt-6 border-t border-gray-100">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-5 border border-blue-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-gray-800">Bol.com Order Webhook</h4>
                    <p className="text-xs text-gray-500 mt-1 max-w-sm">Registers your backend to receive instant real-time order notifications directly from Bol.com.</p>
                  </div>
                  <button
                    onClick={onRegisterWebhook}
                    disabled={registering}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-brand hover:border-brand/30 shadow-sm text-sm font-semibold rounded-xl px-5 py-2.5 transition-all disabled:opacity-60 whitespace-nowrap"
                  >
                    <FiLink2 size={16} />
                    {registering ? "Registering..." : "Sync Webhook"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Privacy & Security */}
          {settingsTab === "privacy" && !showChangePassword && (
            <div>
              <h3 className="text-base font-bold">Privacy &amp; Security</h3>
              <p className="text-xs text-gray-400 mb-5">Manage your security</p>
              <button
                onClick={() => setShowChangePassword(true)}
                className="w-full flex items-center justify-between bg-[#f7f8fc] rounded-xl px-4 py-4 text-sm font-medium hover:bg-gray-100"
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
      onCancel={() => setOauthSheetsModalOpen(false)}
      title="Select Spreadsheet"
      footer={null}
      zIndex={1050}
    >
      <div className="py-4 max-h-[400px] overflow-y-auto">
        {fetchingUserSheets ? (
          <div className="space-y-3 animate-pulse py-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-full p-4 border border-gray-100 rounded-xl bg-gray-50 flex items-center gap-3">
                <div className="w-5 h-5 rounded bg-gray-200"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : oauthSheetsList.length === 0 ? (
          <p className="text-sm text-gray-500">No spreadsheets found.</p>
        ) : (
          <div className="space-y-2">
            {oauthSheetsList.map(sheet => (
              <button 
                key={sheet.id}
                onClick={() => handleSelectOauthSheet(sheet)}
                className="w-full text-left p-3 border border-gray-100 rounded-lg hover:bg-gray-50 flex items-center gap-3"
              >
                <BsFileEarmarkSpreadsheet className="text-green-600" size={18} />
                <span className="text-sm font-medium text-gray-800 truncate">{sheet.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>

    {/* Sheet Tabs Modal */}
    <Modal
      open={tabsModalOpen}
      onCancel={() => setTabsModalOpen(false)}
      title="Select Tab"
      footer={null}
      zIndex={1050}
    >
      <div className="py-4">
        <p className="text-sm text-gray-500 mb-4">Select the specific tab to import from the spreadsheet.</p>
        {fetchingTabs ? (
          <div className="space-y-3 animate-pulse py-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-full p-4 border border-gray-100 rounded-xl bg-gray-50 flex items-center justify-between">
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="w-4 h-4 rounded bg-gray-200"></div>
              </div>
            ))}
          </div>
        ) : tabsList.length === 0 ? (
          <p className="text-sm text-gray-500">No tabs found.</p>
        ) : (
          <div className="space-y-2">
            {tabsList.map(tab => (
              <button 
                key={tab.sheet_id}
                onClick={() => handleImportSheet(tab.sheet_id)}
                disabled={importingPublic || importingOAuth}
                className="w-full text-left p-3 border border-gray-100 rounded-lg hover:bg-gray-50 flex items-center justify-between"
              >
                <span className="text-sm font-medium text-gray-800">{tab.title}</span>
                <FiArrowRight className="text-gray-400" />
              </button>
            ))}
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
