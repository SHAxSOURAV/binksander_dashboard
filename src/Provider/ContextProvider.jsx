import { createContext, useContext, useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { baseApis } from "../Redux/main/baseApis";
import { useGetConnectionQuery } from "../Redux/productApis";
import { getToken } from "../utils/session";

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

  const hasToken = Boolean(getToken());
  const { data: connectionData } = useGetConnectionQuery(undefined, {
    skip: !hasToken,
  });

  useEffect(() => {
    if (connectionData && Array.isArray(connectionData.connected_sheets)) {
      const sheets = connectionData.connected_sheets;
      if (sheets.length < 2) {
        // If 0 or only 1 spreadsheet is connected, user shouldn't be locked to a stale filter
        if (selectedSpreadsheetUrl !== "all") {
          setSelectedSpreadsheetUrl("all");
        }
      } else if (
        selectedSpreadsheetUrl !== "all" &&
        !sheets.some((s) => s.spreadsheet_url === selectedSpreadsheetUrl)
      ) {
        // Stale URL from a previously disconnected or modified spreadsheet
        setSelectedSpreadsheetUrl("all");
      }
    }
  }, [connectionData, selectedSpreadsheetUrl]);

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
