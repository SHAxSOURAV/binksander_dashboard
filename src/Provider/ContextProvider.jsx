import { createContext, useContext, useState } from "react";
import { useDispatch } from "react-redux";
import { baseApis } from "../Redux/main/baseApis";

const UIContext = createContext(null);

export const UIProvider = ({ children }) => {
  const dispatch = useDispatch();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState("account");
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

  const [activeBolAccountId, setActiveBolAccountIdState] = useState(() => {
    return localStorage.getItem("activeBolAccountId") || null;
  });

  const setActiveBolAccountId = (id) => {
    if (id === activeBolAccountId) return;

    setActiveBolAccountIdState(id);
    if (id) localStorage.setItem("activeBolAccountId", id);
    else localStorage.removeItem("activeBolAccountId");

    // The selected account travels as the X-Bol-Account-ID header, which RTK Query
    // does not include in its cache key - so without this every screen would keep
    // showing the previous account's KPIs, offers and orders until a tag happened to
    // be invalidated. Dropping the whole cache forces a clean refetch per account.
    dispatch(baseApis.util.resetApiState());
  };

  const [selectedSpreadsheetUrl, setSelectedSpreadsheetUrlState] = useState(() => {
    return localStorage.getItem("selectedSpreadsheetUrl") || "all";
  });

  const setSelectedSpreadsheetUrl = (url) => {
    const val = url || "all";
    setSelectedSpreadsheetUrlState(val);
    if (val && val !== "all") {
      localStorage.setItem("selectedSpreadsheetUrl", val);
    } else {
      localStorage.removeItem("selectedSpreadsheetUrl");
    }
  };

  const openSettings = (tab = "account") => {
    setSettingsTab(tab);
    setSettingsOpen(true);
  };

  return (
    <UIContext.Provider
      value={{
        settingsOpen,
        setSettingsOpen,
        settingsTab,
        setSettingsTab,
        openSettings,
        logoutOpen,
        setLogoutOpen,
        supportOpen,
        setSupportOpen,
        activeBolAccountId,
        setActiveBolAccountId,
        selectedSpreadsheetUrl,
        setSelectedSpreadsheetUrl,
      }}
    >
      {children}
    </UIContext.Provider>
  );
};

export const useUI = () => useContext(UIContext);

export default UIProvider;
