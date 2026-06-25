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
  const { data: bolCreds } = useGetBolCredentialsQuery(undefined, {
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
    if (file.size > 1024 * 1024) {
      toast.error("Image must be under 1MB");
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
        client_id: values.client_id,
        client_secret: values.client_secret,
      }).unwrap();
      toast.success("Bol.com credentials saved");
      setBolEditOpen(false);
    } catch (err) {
      toast.error(err?.data?.detail || "Failed to save Bol credentials");
    }
  };

  const handleDeleteBol = () => {
    Modal.confirm({
      title: "Are you sure?",
      content: "Do you really want to delete your Bol.com credentials? This action cannot be undone.",
      okText: "Delete",
      okType: "danger",
      cancelText: "Cancel",
      onOk: async () => {
        try {
          await deleteBolCredentials().unwrap();
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
      width={760}
      title={<span className="text-lg font-bold">Settings</span>}
    >
      <div className="flex flex-col sm:flex-row gap-6 font-poppins mt-4 min-h-[360px]">
        {/* Tabs */}
        <div className="sm:w-48 flex sm:flex-col gap-1 flex-wrap">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setSettingsTab(t.key);
                setShowChangePassword(false);
              }}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                settingsTab === t.key
                  ? "bg-primary text-white"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 border-l border-gray-100 sm:pl-6">
          {/* Account */}
          {settingsTab === "account" && (
            <div>
              <h3 className="text-base font-bold">Your Account</h3>
              <p className="text-xs text-gray-400 mb-5">
                Manage your account information.
              </p>
              {loadingProfile && !account.email ? (
                <Spin />
              ) : (
                <>
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
                        JPG or PNG, up to 1MB
                      </p>
                    </div>
                  </div>

                  {/* Full name */}
                  <div className="flex items-center justify-between bg-[#f7f8fc] rounded-xl px-4 py-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-400 mb-0.5">Full Name</p>
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
                        <button
                          onClick={() => {
                            setNameDraft(account.full_name || "");
                            setEditingName(true);
                          }}
                          title="Edit name"
                          className="text-gray-400 hover:text-brand"
                        >
                          <FiEdit2 size={15} />
                        </button>
                        <span className="text-[11px] font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full capitalize">
                          {account.role || "seller"}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between bg-[#f7f8fc] rounded-xl px-4 py-3">
                    <div>
                      <p className="text-xs text-gray-400">Email</p>
                      <p className="text-sm font-medium">{account.email || "—"}</p>
                    </div>
                    <span className="button-color w-9 h-9 rounded-lg flex items-center justify-center">
                      <FiLock size={14} />
                    </span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Connection */}
          {settingsTab === "connection" && (
            <div>
              <h3 className="text-base font-bold">Connection</h3>
              <p className="text-xs text-gray-400 mb-5">
                Manage your inventory &amp; Bol.com API connection.
              </p>

              {/* Inventory sheets */}
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-500">
                  Inventory (Google Spreadsheet)
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
              <div className="flex gap-3 mb-5">
                <button
                  onClick={() => setPublicLinkModalOpen(true)}
                  className="flex-1 border border-gray-200 bg-white text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-50"
                >
                  Add Public Link
                </button>
                <button
                  onClick={() => loginWithGoogle()}
                  className="flex-1 bg-blue-50 text-blue-600 border border-blue-200 text-sm font-medium py-2 rounded-lg hover:bg-blue-100 flex items-center justify-center gap-2"
                >
                  Connect with Google
                </button>
              </div>

              {/* Bol.com credentials */}
              <p className="text-xs font-semibold text-gray-500 mb-2">
                Bol.com API
              </p>
              {!bolEditOpen ? (
                <div className="rounded-2xl border border-gray-100 bg-white p-4">
                  <div className="flex items-start gap-3">
                    <span
                      className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bol-logo text-sm"
                      style={{ backgroundColor: "#1B17E014", color: "#1B17E0" }}
                    >
                      bol.
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-800 truncate">
                          API Credentials
                        </p>
                        {bolCreds?.is_secret_set ? (
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
                        Client ID:{" "}
                        <span className="text-gray-600">
                          {bolCreds?.client_id || "—"}
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {bolCreds?.is_secret_set && (
                        <button
                          onClick={handleDeleteBol}
                          disabled={deletingCreds}
                          className="text-xs font-medium text-red-500 border border-red-200 hover:bg-red-50 px-3 py-2 rounded-lg"
                        >
                          Delete
                        </button>
                      )}
                      <button
                        onClick={() => setBolEditOpen(true)}
                        className="text-xs font-medium text-brand border border-brand/30 hover:bg-[#f0f0fd] px-3 py-2 rounded-lg"
                      >
                        {bolCreds?.is_secret_set ? "Update" : "Set up"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <Form
                  form={bolForm}
                  layout="vertical"
                  onFinish={onSaveBol}
                  className="rounded-2xl border border-gray-100 bg-white p-4"
                >
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
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setBolEditOpen(false)}
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
              <p className="text-xs font-semibold text-gray-500 mb-2 mt-5">
                amazon.nl (Fulfillment)
              </p>
              {!amazonEditOpen ? (
                <div className="rounded-2xl border border-gray-100 bg-white p-4">
                  <div className="flex items-start gap-3">
                    <span
                      className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: "#FF990014", color: "#FF9900" }}
                    >
                      <TbBrandAmazon size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-800 truncate">
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
                    <button
                      onClick={() => setAmazonEditOpen(true)}
                      className="text-xs font-medium text-brand border border-brand/30 hover:bg-[#f0f0fd] px-3 py-2 rounded-lg flex-shrink-0"
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
              <button
                onClick={onRegisterWebhook}
                disabled={registering}
                className="w-full mt-4 flex items-center justify-center gap-2 bg-[#f0f0fd] text-brand text-sm font-semibold rounded-xl px-4 py-3 hover:bg-[#e6e6fb] disabled:opacity-60"
              >
                <FiLink2 size={14} />
                {registering ? "Registering..." : "Register Bol Order Webhook"}
              </button>
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
          <div className="flex justify-center py-4"><Spin /></div>
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
          <div className="flex justify-center py-4"><Spin /></div>
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
