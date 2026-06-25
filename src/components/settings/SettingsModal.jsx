import { useState, useEffect, useRef } from "react";
import { Modal, Input, Form, Button, Spin } from "antd";
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
  useGetAmazonCredentialsQuery,
  useSaveAmazonCredentialsMutation,
} from "../../Redux/connectionApis";
import { useRegisterBolWebhookMutation } from "../../Redux/fulfillmentApis";

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
  const [saveBolCredentials, { isLoading: savingCreds }] =
    useSaveBolCredentialsMutation();
  const [saveAmazonCredentials, { isLoading: savingAmazon }] =
    useSaveAmazonCredentialsMutation();
  const [registerWebhook, { isLoading: registering }] =
    useRegisterBolWebhookMutation();
  const [changePassword, { isLoading: changingPw }] = useChangePasswordMutation();
  const [updateProfile, { isLoading: savingProfile }] =
    useUpdateProfileMutation();

  const [bolForm] = Form.useForm();
  const [amazonForm] = Form.useForm();

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

  const handleUnlink = (spreadsheet_url, itemCount) => {
    Modal.confirm({
      title: "Disconnect this spreadsheet?",
      content: `This removes the connection and its ${
        itemCount ?? ""
      } imported products. You can reconnect the sheet again later.`,
      okText: "Disconnect",
      okButtonProps: { danger: true },
      cancelText: "Cancel",
      onOk: async () => {
        try {
          // delete_data: true — the "connected" state is derived from imported
          // items, so they must be removed for the sheet to actually disconnect.
          await unlinkSheet({ spreadsheet_url, delete_data: true }).unwrap();
          toast.success("Spreadsheet disconnected");
        } catch (err) {
          toast.error(err?.data?.detail || "Failed to disconnect");
        }
      },
    });
  };

  const onSaveBol = async (values) => {
    try {
      await saveBolCredentials(values).unwrap();
      toast.success("Bol.com credentials saved");
      bolForm.resetFields();
      setBolEditOpen(false);
    } catch (err) {
      toast.error(err?.data?.detail || "Failed to save credentials");
    }
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

  return (
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
                      {account.profile_picture ? (
                        <img
                          src={account.profile_picture}
                          alt="avatar"
                          className="w-16 h-16 rounded-full object-cover border border-gray-100"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-[#f0f0fd] text-brand flex items-center justify-center text-xl font-bold">
                          {(account.full_name || account.email || "?")
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                      )}
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
              <p className="text-xs font-semibold text-gray-500 mb-2">
                Inventory (Google Spreadsheet)
              </p>
              {loadingSheets ? (
                <Spin />
              ) : sheets.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 px-4 py-5 text-center text-xs text-gray-400 mb-5">
                  No spreadsheet connected. Use the Products page to connect one.
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
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full flex-shrink-0">
                              <FiCheckCircle size={11} /> Connected
                            </span>
                          </div>
                          <div className="flex items-center gap-2 bg-[#f7f8fc] rounded-lg px-3 py-1.5 mt-2">
                            <FiLink2 size={12} className="text-gray-400 flex-shrink-0" />
                            <span className="text-xs text-gray-500 truncate">
                              {s.spreadsheet_url}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleUnlink(s.spreadsheet_url, s.item_count)}
                          disabled={unlinking}
                          className="flex items-center gap-1.5 text-xs font-medium text-red-500 border border-red-200 hover:bg-red-50 px-3 py-2 rounded-lg flex-shrink-0 disabled:opacity-50"
                        >
                          <LuUnplug size={13} /> Disconnect
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

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
                    <button
                      onClick={() => setBolEditOpen(true)}
                      className="text-xs font-medium text-brand border border-brand/30 hover:bg-[#f0f0fd] px-3 py-2 rounded-lg flex-shrink-0"
                    >
                      {bolCreds?.is_secret_set ? "Update" : "Set up"}
                    </button>
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
  );
};

export default SettingsModal;
