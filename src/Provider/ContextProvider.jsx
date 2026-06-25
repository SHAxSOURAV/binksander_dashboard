import { createContext, useContext, useState } from "react";

const UIContext = createContext(null);

export const UIProvider = ({ children }) => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState("account");
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

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
      }}
    >
      {children}
    </UIContext.Provider>
  );
};

export const useUI = () => useContext(UIContext);

export default UIProvider;
