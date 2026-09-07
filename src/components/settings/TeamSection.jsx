import { useState, useMemo } from "react";
import {
  Modal,
  Input,
  Button,
  Spin,
  Checkbox,
  Select,
  Tag,
  Tooltip,
  Popconfirm,
  Badge,
} from "antd";
import toast from "react-hot-toast";
import {
  FiUsers,
  FiUserPlus,
  FiUser,
  FiMail,
  FiLock,
  FiKey,
  FiEdit2,
  FiTrash2,
  FiCopy,
  FiCheck,
  FiRefreshCw,
  FiShield,
  FiLayers,
  FiShoppingBag,
} from "react-icons/fi";
import {
  useGetTeamUsersQuery,
  useGetTeamRolesQuery,
  useCreateTeamUserMutation,
  useUpdateTeamUserMutation,
  useResetTeamUserPasswordMutation,
  useDeleteTeamUserMutation,
} from "../../Redux/teamApis";
import { useGetBolCredentialsQuery } from "../../Redux/connectionApis";
import { getUser } from "../../utils/session";

const MODULE_DEFINITIONS = [
  { key: "overview", label: "Overview", desc: "Dashboard KPIs & Analytics" },
  { key: "inventory", label: "Inventory Catalog", desc: "Spreadsheet & Products catalog" },
  { key: "needs_review", label: "Needs Review", desc: "Items requiring manual review" },
  { key: "offers", label: "Bol.com Offers", desc: "Live listings & Bol offer sync" },
  { key: "sales", label: "Sales & Orders", desc: "Orders fulfillment & sales tracking" },
  { key: "sourcing", label: "Amazon Sourcing", desc: "Amazon sourcing & product analysis" },
  { key: "rimco", label: "Rimco Logistics", desc: "Rimco shipping & fulfillment" },
  { key: "returns", label: "Return Dashboard", desc: "Amazon returns management" },
];

const ROLE_COLORS = {
  manager: "purple",
  admin: "purple",
  seller: "purple",
  order_processor: "blue",
  order_processor_manager: "geekblue",
  product_lister: "cyan",
  product_lister_manager: "cyan",
  product_research: "orange",
  stock_blacklist_checker: "gold",
  customer_support: "magenta",
};

const TeamSection = () => {
  const currentUser = getUser();
  const { data: teamMembers = [], isLoading: loadingMembers, refetch } = useGetTeamUsersQuery();
  const { data: rolesData, isLoading: loadingRoles } = useGetTeamRolesQuery();
  const { data: bolAccounts = [] } = useGetBolCredentialsQuery();

  const [createTeamUser, { isLoading: creatingUser }] = useCreateTeamUserMutation();
  const [updateTeamUser, { isLoading: updatingUser }] = useUpdateTeamUserMutation();
  const [resetPassword, { isLoading: resettingPw }] = useResetTeamUserPasswordMutation();
  const [deleteTeamUser, { isLoading: deletingUser }] = useDeleteTeamUserMutation();

  // Modals state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [credSuccessModalOpen, setCredSuccessModalOpen] = useState(false);

  // Form states - Add
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addRole, setAddRole] = useState("order_processor");
  const [addPermissions, setAddPermissions] = useState([]);
  const [addAllStores, setAddAllStores] = useState(true);
  const [addStores, setAddStores] = useState([]);
  const [customPasswordMode, setCustomPasswordMode] = useState(false);
  const [addCustomPassword, setAddCustomPassword] = useState("");
  const [addSendEmail, setAddSendEmail] = useState(true);

  // Form states - Edit
  const [editingMember, setEditingMember] = useState(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editPermissions, setEditPermissions] = useState([]);
  const [editAllStores, setEditAllStores] = useState(true);
  const [editStores, setEditStores] = useState([]);
  const [editIsActive, setEditIsActive] = useState(true);

  // Form states - Reset PW
  const [resetMember, setResetMember] = useState(null);
  const [resetCustomPw, setResetCustomPw] = useState("");
  const [resetSendEmail, setResetSendEmail] = useState(true);

  // Recently created credentials to show
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

  const availableRoles = useMemo(() => {
    if (rolesData?.roles?.length) return rolesData.roles;
    return [
      { key: "manager", label: "Manager / Admin", default_permissions: MODULE_DEFINITIONS.map((m) => m.key) },
      { key: "product_research", label: "Product research", default_permissions: ["overview", "sales", "sourcing", "offers"] },
      { key: "product_lister", label: "Product lister", default_permissions: ["overview", "inventory", "needs_review", "offers", "sourcing"] },
      { key: "order_processor", label: "Order processor", default_permissions: MODULE_DEFINITIONS.map((m) => m.key) },
      { key: "order_processor_manager", label: "Order processor manager", default_permissions: MODULE_DEFINITIONS.map((m) => m.key) },
      { key: "product_lister_manager", label: "Product lister manager", default_permissions: ["overview", "inventory", "needs_review", "offers", "sourcing"] },
      { key: "stock_blacklist_checker", label: "Stock / blacklist checker", default_permissions: ["inventory", "needs_review", "offers"] },
      { key: "customer_support", label: "Customer questions / mail handling", default_permissions: ["overview", "sales"] },
    ];
  }, [rolesData]);

  // When opening Add modal, reset and initialize default permissions
  const handleOpenAddModal = () => {
    setAddName("");
    setAddEmail("");
    const defaultRole = "order_processor";
    setAddRole(defaultRole);
    const roleObj = availableRoles.find((r) => r.key === defaultRole);
    setAddPermissions(roleObj ? [...roleObj.default_permissions] : MODULE_DEFINITIONS.map((m) => m.key));
    setAddAllStores(true);
    setAddStores([]);
    setCustomPasswordMode(false);
    setAddCustomPassword("");
    setAddSendEmail(true);
    setAddModalOpen(true);
  };

  // On Role Change in Add Modal, update default permissions
  const handleAddRoleChange = (roleKey) => {
    setAddRole(roleKey);
    const roleObj = availableRoles.find((r) => r.key === roleKey);
    if (roleObj) {
      setAddPermissions([...roleObj.default_permissions]);
    }
  };

  // Submit Add Member
  const handleCreateMember = async () => {
    if (!addName.trim()) {
      toast.error("Please enter the worker's full name");
      return;
    }
    if (!addEmail.trim() || !addEmail.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    try {
      const payload = {
        full_name: addName.trim(),
        email: addEmail.trim(),
        role: addRole,
        permissions: addPermissions,
        assigned_accounts: addAllStores ? ["all"] : addStores,
        send_email: addSendEmail,
      };
      if (customPasswordMode && addCustomPassword.trim()) {
        payload.password = addCustomPassword.trim();
      }

      const res = await createTeamUser(payload).unwrap();
      toast.success(`Team member ${res.full_name} created successfully!`);
      setAddModalOpen(false);

      if (res.temporary_password) {
        setCreatedCredentials({
          name: res.full_name,
          email: res.email,
          role: res.role_label,
          password: res.temporary_password,
        });
        setCredSuccessModalOpen(true);
      }
    } catch (err) {
      toast.error(err?.data?.detail || "Failed to create team member");
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (member) => {
    setEditingMember(member);
    setEditName(member.full_name || "");
    setEditRole(member.role);
    setEditPermissions(member.permissions || []);
    const isAll = !member.assigned_accounts || member.assigned_accounts.includes("all");
    setEditAllStores(isAll);
    setEditStores(isAll ? [] : member.assigned_accounts);
    setEditIsActive(member.is_active ?? true);
    setEditModalOpen(true);
  };

  // Submit Edit Member
  const handleUpdateMember = async () => {
    if (!editingMember) return;
    try {
      await updateTeamUser({
        id: editingMember.id,
        full_name: editName.trim(),
        role: editRole,
        permissions: editPermissions,
        assigned_accounts: editAllStores ? ["all"] : editStores,
        is_active: editIsActive,
      }).unwrap();
      toast.success("Team member updated successfully");
      setEditModalOpen(false);
      setEditingMember(null);
    } catch (err) {
      toast.error(err?.data?.detail || "Failed to update team member");
    }
  };

  // Open Reset Password Modal
  const handleOpenReset = (member) => {
    setResetMember(member);
    setResetCustomPw("");
    setResetSendEmail(true);
    setResetModalOpen(true);
  };

  // Submit Reset Password
  const handleResetPassword = async () => {
    if (!resetMember) return;
    try {
      const payload = {
        id: resetMember.id,
        send_email: resetSendEmail,
      };
      if (resetCustomPw.trim()) {
        payload.new_password = resetCustomPw.trim();
      }
      const res = await resetPassword(payload).unwrap();
      toast.success(res.message || "Password reset successfully");
      setResetModalOpen(false);
      if (res.temporary_password) {
        setCreatedCredentials({
          name: resetMember.full_name,
          email: resetMember.email,
          role: resetMember.role_label,
          password: res.temporary_password,
        });
        setCredSuccessModalOpen(true);
      }
    } catch (err) {
      toast.error(err?.data?.detail || "Failed to reset password");
    }
  };

  // Delete Member
  const handleDeleteMember = async (id, email) => {
    try {
      await deleteTeamUser(id).unwrap();
      toast.success(`User ${email} removed`);
    } catch (err) {
      toast.error(err?.data?.detail || "Failed to delete team member");
    }
  };

  // Copy helper
  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[17px] font-semibold text-gray-900">Team Management</h2>
            <Badge
              count={teamMembers.length}
              style={{ backgroundColor: "#f1f5f9", color: "#475569", fontWeight: 600 }}
            />
          </div>
          <p className="text-[12.5px] text-gray-400 mt-0.5">
            Add colleagues and workers. Assign per-module permissions and store access.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            icon={<FiRefreshCw size={13} className={loadingMembers ? "animate-spin" : ""} />}
            onClick={() => refetch()}
            size="small"
            className="text-gray-500 hover:text-gray-800"
          >
            Refresh
          </Button>
          <Button
            type="primary"
            icon={<FiUserPlus size={14} />}
            onClick={handleOpenAddModal}
            className="bg-gray-900 hover:bg-gray-800 text-white font-medium text-[13px] h-8 rounded"
          >
            Add Member
          </Button>
        </div>
      </div>

      {/* Team Member List */}
      {loadingMembers ? (
        <div className="py-16 flex flex-col items-center justify-center text-gray-400">
          <Spin size="large" />
          <p className="text-xs mt-3">Loading team members...</p>
        </div>
      ) : teamMembers.length === 0 ? (
        <div className="py-12 px-4 rounded-xl border border-dashed border-gray-200 bg-gray-50/50 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
            <FiUsers size={22} />
          </div>
          <h3 className="text-sm font-semibold text-gray-800">No team members added yet</h3>
          <p className="text-xs text-gray-400 max-w-sm mt-1 mb-4">
            Invite colleagues, order processors, or listing specialists to collaborate on your Quovo store.
          </p>
          <Button
            type="primary"
            icon={<FiUserPlus size={14} />}
            onClick={handleOpenAddModal}
            className="bg-gray-900 hover:bg-gray-800 text-white text-xs h-8 rounded"
          >
            Add First Member
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-gray-100 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                <th className="pb-2.5 font-medium">User</th>
                <th className="pb-2.5 font-medium">Role</th>
                <th className="pb-2.5 font-medium">Module Access</th>
                <th className="pb-2.5 font-medium">Store Access</th>
                <th className="pb-2.5 font-medium">Status</th>
                <th className="pb-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {teamMembers.map((member) => {
                const isAllStores =
                  !member.assigned_accounts || member.assigned_accounts.includes("all");
                const assignedCount = member.permissions?.length || 0;
                const totalModules = MODULE_DEFINITIONS.length;

                return (
                  <tr key={member.id} className="hover:bg-gray-50/60 transition-colors group">
                    {/* User Info */}
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-semibold flex items-center justify-center text-xs shrink-0 uppercase">
                          {member.full_name?.slice(0, 2) || member.email?.slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-800 truncate leading-snug">
                            {member.full_name || "Unnamed"}
                          </p>
                          <p className="text-[11.5px] text-gray-400 truncate">{member.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-3 pr-3">
                      <Tag
                        color={ROLE_COLORS[member.role] || "default"}
                        className="text-[11px] font-medium px-2 py-0.5 rounded border-0"
                      >
                        {member.role_label}
                      </Tag>
                    </td>

                    {/* Module Access */}
                    <td className="py-3 pr-3">
                      <Tooltip
                        title={
                          <div className="text-xs space-y-1 py-1">
                            <p className="font-semibold border-b border-gray-600 pb-1 mb-1">
                              Permitted Modules ({assignedCount}/{totalModules})
                            </p>
                            {MODULE_DEFINITIONS.map((mod) => {
                              const has = member.permissions?.includes(mod.key);
                              return (
                                <div
                                  key={mod.key}
                                  className={`flex items-center gap-1.5 ${
                                    has ? "text-emerald-400" : "text-gray-400 line-through opacity-60"
                                  }`}
                                >
                                  <span>{has ? "✓" : "✕"}</span>
                                  <span>{mod.label}</span>
                                </div>
                              );
                            })}
                          </div>
                        }
                      >
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-medium text-xs cursor-pointer hover:bg-gray-200 transition-colors">
                          <FiLayers size={11} className="text-gray-400" />
                          <span>
                            {assignedCount === totalModules
                              ? "All 8 Modules"
                              : `${assignedCount} of ${totalModules}`}
                          </span>
                        </span>
                      </Tooltip>
                    </td>

                    {/* Store Access */}
                    <td className="py-3 pr-3">
                      {isAllStores ? (
                        <span className="text-xs text-gray-600 font-medium bg-slate-50 px-2 py-0.5 rounded border border-gray-100">
                          All Stores
                        </span>
                      ) : (
                        <Tooltip
                          title={member.assigned_accounts?.map((accId) => {
                            const found = bolAccounts.find((b) => b.account_id === accId);
                            return found ? found.account_name : accId;
                          }).join(", ")}
                        >
                          <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded cursor-pointer">
                            {member.assigned_accounts?.length || 0} store(s)
                          </span>
                        </Tooltip>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 pr-3">
                      <span
                        className={`inline-flex items-center gap-1 text-[11.5px] font-medium ${
                          member.is_active ? "text-emerald-600" : "text-gray-400"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            member.is_active ? "bg-emerald-500" : "bg-gray-300"
                          }`}
                        />
                        {member.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Tooltip title="Edit Permissions & Details">
                          <button
                            onClick={() => handleOpenEdit(member)}
                            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                          >
                            <FiEdit2 size={13} />
                          </button>
                        </Tooltip>

                        <Tooltip title="Reset Password & Resend Credentials">
                          <button
                            onClick={() => handleOpenReset(member)}
                            className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                          >
                            <FiKey size={13} />
                          </button>
                        </Tooltip>

                        <Popconfirm
                          title="Remove team member?"
                          description={`Are you sure you want to remove ${member.email}? They will lose access immediately.`}
                          onConfirm={() => handleDeleteMember(member.id, member.email)}
                          okText="Delete"
                          okButtonProps={{ danger: true }}
                        >
                          <Tooltip title="Delete Member">
                            <button className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                              <FiTrash2 size={13} />
                            </button>
                          </Tooltip>
                        </Popconfirm>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          ADD MEMBER MODAL
      ───────────────────────────────────────────────────────────── */}
      <Modal
        title={
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
            <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center">
              <FiUserPlus size={15} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Add Team Member</h3>
              <p className="text-[11.5px] text-gray-400 font-normal">
                Create login access and assign granular module permissions.
              </p>
            </div>
          </div>
        }
        open={addModalOpen}
        onCancel={() => setAddModalOpen(false)}
        footer={null}
        width={620}
        destroyOnClose
      >
        <div className="space-y-4 pt-3 text-[13px]">
          {/* Full Name & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <Input
                prefix={<FiUser className="text-gray-400 mr-1" />}
                placeholder="e.g. John Doe"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <Input
                type="email"
                prefix={<FiMail className="text-gray-400 mr-1" />}
                placeholder="worker@example.com"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Select Role <span className="text-red-500">*</span>
            </label>
            <Select
              className="w-full"
              value={addRole}
              onChange={handleAddRoleChange}
              options={availableRoles.map((r) => ({
                value: r.key,
                label: (
                  <div className="flex items-center justify-between py-0.5">
                    <span className="font-medium text-gray-800">{r.label}</span>
                    <span className="text-[11px] text-gray-400">
                      ({r.default_permissions?.length || 0} modules)
                    </span>
                  </div>
                ),
              }))}
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Selecting a role auto-fills the default permissions below. You can customize any module on or off.
            </p>
          </div>

          {/* Module Permissions Checkboxes */}
          <div className="p-3.5 bg-gray-50/70 rounded-lg border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-800 flex items-center gap-1.5">
                <FiLayers size={13} className="text-gray-500" />
                Module Permissions ({addPermissions.length} selected)
              </span>
              <div className="flex items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => setAddPermissions(MODULE_DEFINITIONS.map((m) => m.key))}
                  className="text-blue-600 hover:underline font-medium"
                >
                  Select All
                </button>
                <span className="text-gray-300">|</span>
                <button
                  type="button"
                  onClick={() => setAddPermissions([])}
                  className="text-gray-400 hover:underline"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {MODULE_DEFINITIONS.map((mod) => {
                const isChecked = addPermissions.includes(mod.key);
                return (
                  <label
                    key={mod.key}
                    className={`flex items-start gap-2 p-2 rounded cursor-pointer transition-colors border ${
                      isChecked
                        ? "bg-white border-blue-200 shadow-sm"
                        : "bg-transparent border-transparent hover:bg-white/60"
                    }`}
                  >
                    <Checkbox
                      checked={isChecked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setAddPermissions([...addPermissions, mod.key]);
                        } else {
                          setAddPermissions(addPermissions.filter((k) => k !== mod.key));
                        }
                      }}
                      className="mt-0.5"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-800 leading-tight">{mod.label}</p>
                      <p className="text-[10.5px] text-gray-400 truncate">{mod.desc}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Store / Account Access */}
          <div className="p-3.5 bg-gray-50/70 rounded-lg border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-800 flex items-center gap-1.5">
                <FiShoppingBag size={13} className="text-gray-500" />
                Bol.com Store Access
              </span>
              <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                <Checkbox
                  checked={addAllStores}
                  onChange={(e) => {
                    setAddAllStores(e.target.checked);
                    if (e.target.checked) setAddStores([]);
                  }}
                />
                <span>All Current & Future Stores</span>
              </label>
            </div>

            {!addAllStores && (
              <div className="pt-2 border-t border-gray-200/60 mt-2 space-y-1.5">
                {bolAccounts.length === 0 ? (
                  <p className="text-xs text-gray-400">No Bol.com accounts connected yet.</p>
                ) : (
                  bolAccounts.map((acc) => (
                    <label
                      key={acc.account_id}
                      className="flex items-center gap-2 p-1.5 rounded hover:bg-white cursor-pointer text-xs"
                    >
                      <Checkbox
                        checked={addStores.includes(acc.account_id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setAddStores([...addStores, acc.account_id]);
                          } else {
                            setAddStores(addStores.filter((id) => id !== acc.account_id));
                          }
                        }}
                      />
                      <span className="font-medium text-gray-800">{acc.account_name}</span>
                      <span className="text-[11px] text-gray-400">({acc.client_id?.slice(0, 8)}...)</span>
                    </label>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Password Options */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-800 flex items-center gap-1.5">
                <FiLock size={13} className="text-gray-500" />
                Credentials & Delivery
              </span>
              <button
                type="button"
                onClick={() => setCustomPasswordMode(!customPasswordMode)}
                className="text-[11.5px] text-blue-600 hover:underline font-medium"
              >
                {customPasswordMode ? "Auto-generate password instead" : "Set custom password"}
              </button>
            </div>

            {customPasswordMode ? (
              <div>
                <Input.Password
                  placeholder="Enter temporary password (min 8 chars)"
                  value={addCustomPassword}
                  onChange={(e) => setAddCustomPassword(e.target.value)}
                />
              </div>
            ) : (
              <p className="text-[11.5px] text-gray-500 leading-snug">
                A secure random password will be auto-generated for this user and displayed to you upon creation.
              </p>
            )}

            <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer pt-1">
              <Checkbox
                checked={addSendEmail}
                onChange={(e) => setAddSendEmail(e.target.checked)}
              />
              <span>Send welcome email with login credentials and direct link</span>
            </label>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
            <Button onClick={() => setAddModalOpen(false)}>Cancel</Button>
            <Button
              type="primary"
              loading={creatingUser}
              onClick={handleCreateMember}
              className="bg-gray-900 hover:bg-gray-800 text-white font-medium"
            >
              Add Member & Send Invite
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
          EDIT MEMBER MODAL
      ───────────────────────────────────────────────────────────── */}
      <Modal
        title={
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center">
              <FiEdit2 size={14} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Edit Team Member</h3>
              <p className="text-[11.5px] text-gray-400 font-normal">
                {editingMember?.email}
              </p>
            </div>
          </div>
        }
        open={editModalOpen}
        onCancel={() => {
          setEditModalOpen(false);
          setEditingMember(null);
        }}
        footer={null}
        width={620}
        destroyOnClose
      >
        <div className="space-y-4 pt-3 text-[13px]">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name</label>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Full Name"
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Role</label>
            <Select
              className="w-full"
              value={editRole}
              onChange={(val) => setEditRole(val)}
              options={availableRoles.map((r) => ({
                value: r.key,
                label: r.label,
              }))}
            />
          </div>

          {/* Module Permissions Checkboxes */}
          <div className="p-3.5 bg-gray-50/70 rounded-lg border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-800">
                Module Permissions ({editPermissions.length} selected)
              </span>
              <div className="flex items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => setEditPermissions(MODULE_DEFINITIONS.map((m) => m.key))}
                  className="text-blue-600 hover:underline font-medium"
                >
                  Select All
                </button>
                <span className="text-gray-300">|</span>
                <button
                  type="button"
                  onClick={() => setEditPermissions([])}
                  className="text-gray-400 hover:underline"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {MODULE_DEFINITIONS.map((mod) => {
                const isChecked = editPermissions.includes(mod.key);
                return (
                  <label
                    key={mod.key}
                    className={`flex items-start gap-2 p-2 rounded cursor-pointer transition-colors border ${
                      isChecked
                        ? "bg-white border-blue-200 shadow-sm"
                        : "bg-transparent border-transparent hover:bg-white/60"
                    }`}
                  >
                    <Checkbox
                      checked={isChecked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setEditPermissions([...editPermissions, mod.key]);
                        } else {
                          setEditPermissions(editPermissions.filter((k) => k !== mod.key));
                        }
                      }}
                      className="mt-0.5"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-800 leading-tight">{mod.label}</p>
                      <p className="text-[10.5px] text-gray-400 truncate">{mod.desc}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Store / Account Access */}
          <div className="p-3.5 bg-gray-50/70 rounded-lg border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-800">Bol.com Store Access</span>
              <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                <Checkbox
                  checked={editAllStores}
                  onChange={(e) => {
                    setEditAllStores(e.target.checked);
                    if (e.target.checked) setEditStores([]);
                  }}
                />
                <span>All Stores</span>
              </label>
            </div>

            {!editAllStores && (
              <div className="pt-2 border-t border-gray-200/60 mt-2 space-y-1.5">
                {bolAccounts.map((acc) => (
                  <label
                    key={acc.account_id}
                    className="flex items-center gap-2 p-1.5 rounded hover:bg-white cursor-pointer text-xs"
                  >
                    <Checkbox
                      checked={editStores.includes(acc.account_id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setEditStores([...editStores, acc.account_id]);
                        } else {
                          setEditStores(editStores.filter((id) => id !== acc.account_id));
                        }
                      }}
                    />
                    <span className="font-medium text-gray-800">{acc.account_name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Account Status Toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
            <div>
              <p className="text-xs font-semibold text-gray-800">Active Status</p>
              <p className="text-[11px] text-gray-400">
                Inactive users cannot sign in to this workspace.
              </p>
            </div>
            <Checkbox
              checked={editIsActive}
              onChange={(e) => setEditIsActive(e.target.checked)}
            >
              <span className="text-xs font-medium text-gray-700">Account Enabled</span>
            </Checkbox>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
            <Button
              onClick={() => {
                setEditModalOpen(false);
                setEditingMember(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="primary"
              loading={updatingUser}
              onClick={handleUpdateMember}
              className="bg-gray-900 hover:bg-gray-800 text-white font-medium"
            >
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
          RESET PASSWORD MODAL
      ───────────────────────────────────────────────────────────── */}
      <Modal
        title="Reset Member Password"
        open={resetModalOpen}
        onCancel={() => {
          setResetModalOpen(false);
          setResetMember(null);
        }}
        footer={null}
        width={440}
        destroyOnClose
      >
        <div className="space-y-4 pt-2 text-[13px]">
          <p className="text-xs text-gray-600">
            Reset password for <strong>{resetMember?.full_name || resetMember?.email}</strong>.
          </p>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              New Password (leave blank to auto-generate)
            </label>
            <Input.Password
              placeholder="Auto-generate secure password"
              value={resetCustomPw}
              onChange={(e) => setResetCustomPw(e.target.value)}
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
            <Checkbox
              checked={resetSendEmail}
              onChange={(e) => setResetSendEmail(e.target.checked)}
            />
            <span>Send new password to {resetMember?.email}</span>
          </label>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
            <Button onClick={() => setResetModalOpen(false)}>Cancel</Button>
            <Button
              type="primary"
              loading={resettingPw}
              onClick={handleResetPassword}
              className="bg-gray-900 hover:bg-gray-800 text-white font-medium"
            >
              Reset Password
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
          CREDENTIALS DISPLAY MODAL (Post-creation / Reset)
      ───────────────────────────────────────────────────────────── */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-emerald-600 font-semibold text-sm">
            <FiCheck size={18} />
            <span>Login Credentials Generated</span>
          </div>
        }
        open={credSuccessModalOpen}
        onCancel={() => setCredSuccessModalOpen(false)}
        footer={[
          <Button
            key="close"
            type="primary"
            onClick={() => setCredSuccessModalOpen(false)}
            className="bg-gray-900 text-white"
          >
            Done
          </Button>,
        ]}
        width={460}
      >
        <div className="space-y-3 pt-2 text-[13px]">
          <p className="text-xs text-gray-500">
            The temporary credentials for <strong>{createdCredentials?.name}</strong> have been created.
            An email with login instructions has been dispatched.
          </p>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 select-none">Login Email:</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-800">{createdCredentials?.email}</span>
                <button
                  onClick={() => handleCopy(createdCredentials?.email, "email")}
                  className="text-gray-400 hover:text-gray-700"
                >
                  {copiedKey === "email" ? <FiCheck size={12} className="text-emerald-500" /> : <FiCopy size={12} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-400 select-none">Password:</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  {createdCredentials?.password}
                </span>
                <button
                  onClick={() => handleCopy(createdCredentials?.password, "pw")}
                  className="text-gray-400 hover:text-gray-700"
                >
                  {copiedKey === "pw" ? <FiCheck size={12} className="text-emerald-500" /> : <FiCopy size={12} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-400 select-none">Role:</span>
              <span className="font-semibold text-slate-800">{createdCredentials?.role}</span>
            </div>
          </div>

          <Button
            block
            icon={<FiCopy size={13} />}
            onClick={() =>
              handleCopy(
                `Login: ${createdCredentials?.email}\nPassword: ${createdCredentials?.password}\nRole: ${createdCredentials?.role}\nURL: ${window.location.origin}/login`,
                "all"
              )
            }
            className="text-xs font-medium"
          >
            {copiedKey === "all" ? "Credentials Copied!" : "Copy Full Login Credentials"}
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default TeamSection;
