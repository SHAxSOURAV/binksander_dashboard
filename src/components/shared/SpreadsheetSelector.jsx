import React, { useMemo } from "react";
import { Select, Tooltip } from "antd";
import { BsFileEarmarkSpreadsheet } from "react-icons/bs";
import { useGetConnectionQuery } from "../../Redux/productApis";
import { useUI } from "../../Provider/ContextProvider";

/**
 * SpreadsheetSelector
 * 
 * Sleek, clean dropdown selector shown in the catalog and review toolbars
 * whenever 2 or more spreadsheets are connected to the user's account.
 * Allows filtering products by an individual spreadsheet or viewing all.
 * 
 * @param {Object} props
 * @param {Function} [props.onSelectChange] - Callback invoked when the user selects a sheet (e.g. to reset pagination).
 * @param {string} [props.className] - Optional additional CSS classes.
 */
const SpreadsheetSelector = ({ onSelectChange, className = "" }) => {
  const { data: connectionData, isLoading, isError } = useGetConnectionQuery();
  const { selectedSpreadsheetUrl, setSelectedSpreadsheetUrl } = useUI();

  const connectedSheets = useMemo(() => {
    if (!connectionData?.connected_sheets || !Array.isArray(connectionData.connected_sheets)) {
      return [];
    }
    return connectionData.connected_sheets;
  }, [connectionData]);

  // Requirement: Only display the dropdown if the user has connected 2 or more spreadsheets.
  if (isLoading || isError || connectedSheets.length < 2) {
    return null;
  }

  // Calculate sum of items across all sheets for the "All Spreadsheets" option label
  const totalAllItems = connectedSheets.reduce((acc, sheet) => acc + (sheet.item_count || 0), 0);

  // Validate that the currently selected URL is still valid in the connected sheets list
  const isSelectedValid =
    selectedSpreadsheetUrl === "all" ||
    connectedSheets.some((sheet) => sheet.spreadsheet_url === selectedSpreadsheetUrl);

  const activeValue = isSelectedValid ? selectedSpreadsheetUrl : "all";

  // Build select options
  const options = [
    {
      value: "all",
      label: (
        <div className="flex items-center justify-between gap-2 w-full py-0.5">
          <div className="flex items-center gap-1.5 truncate">
            <BsFileEarmarkSpreadsheet size={13} className="text-gray-400 shrink-0" />
            <span className="font-medium text-gray-800 truncate text-[12px]">All Spreadsheets</span>
          </div>
          <span className="text-[10px] font-semibold text-gray-400 tabular-nums bg-gray-100 px-1.5 py-0.5 rounded-[3px] shrink-0">
            {totalAllItems.toLocaleString()}
          </span>
        </div>
      ),
      searchValue: "All Spreadsheets",
    },
    ...connectedSheets.map((sheet, index) => {
      const title = sheet.title?.trim() || `Spreadsheet ${index + 1}`;
      const count = sheet.item_count || 0;
      const isAuthExpired = sheet.status === "EXPIRED_AUTH";

      return {
        value: sheet.spreadsheet_url,
        label: (
          <Tooltip title={title} placement="right" mouseEnterDelay={0.5}>
            <div className="flex items-center justify-between gap-2 w-full py-0.5">
              <div className="flex items-center gap-1.5 truncate">
                <BsFileEarmarkSpreadsheet
                  size={13}
                  className={`shrink-0 ${isAuthExpired ? "text-amber-500" : "text-emerald-600"}`}
                />
                <span className="text-gray-800 truncate text-[12px]">{title}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {isAuthExpired && (
                  <span className="text-[9px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-1 rounded-[2px]">
                    Expired
                  </span>
                )}
                <span className="text-[10px] font-medium text-gray-400 tabular-nums bg-gray-50 border border-gray-200/60 px-1.5 py-0.5 rounded-[3px]">
                  {count.toLocaleString()}
                </span>
              </div>
            </div>
          </Tooltip>
        ),
        searchValue: title,
      };
    }),
  ];

  const handleChange = (newUrl) => {
    setSelectedSpreadsheetUrl(newUrl);
    if (onSelectChange) {
      onSelectChange(newUrl);
    }
  };

  // Find currently active sheet title for collapsed select display
  const currentSheet = connectedSheets.find((s) => s.spreadsheet_url === activeValue);
  const displayLabel =
    activeValue === "all"
      ? "All Spreadsheets"
      : currentSheet?.title?.trim() || "Selected Sheet";

  return (
    <div className={`relative flex items-center ${className}`}>
      <Select
        value={activeValue}
        onChange={handleChange}
        options={options}
        popupMatchSelectWidth={false}
        dropdownStyle={{ minWidth: 260, maxWidth: 360, borderRadius: 4, padding: "4px" }}
        className="h-9 w-44 sm:w-56 custom-select rounded-[4px] text-[12px]"
        optionLabelProp="searchValue"
        showSearch={false}
        dropdownAlign={{ offset: [0, 4] }}
      />
    </div>
  );
};

export default SpreadsheetSelector;
