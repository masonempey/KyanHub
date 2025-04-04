"use client";

import { useState } from "react";
import { useProperties } from "@/contexts/PropertyContext";
import MaintenanceSection from "./MaintenanceSection";
import InventorySection from "./InventorySection";
import RestockSection from "./RestockSection";
import ViewStockSection from "./ViewStockSection";
import CleaningSection from "./CleaningSection";
import ManagePropertySection from "./ManagePropertySection";
import { useUser } from "@/contexts/UserContext";
import CircularProgress from "@mui/material/CircularProgress";
import AdminProtected from "@/app/components/AdminProtected";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Button from "@mui/material/Button";
import SettingsIcon from "@mui/icons-material/Settings";
import HomeWorkIcon from "@mui/icons-material/HomeWork";

const PropertyManagementPage = () => {
  const { user, loading: userLoading } = useUser();
  const {
    loading: propertiesLoading,
    propertyId,
    selectedPropertyName,
  } = useProperties();

  const [rightActiveTab, setRightActiveTab] = useState(0);
  const [leftActiveTab, setLeftActiveTab] = useState(0);
  const [mainView, setMainView] = useState("operations"); // "operations" or "management"

  const handleRightTabChange = (event, newValue) => {
    setRightActiveTab(newValue);
  };

  const handleLeftTabChange = (event, newValue) => {
    setLeftActiveTab(newValue);
  };

  const handleMainViewChange = (view) => {
    setMainView(view);
  };

  if (userLoading || propertiesLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <CircularProgress sx={{ color: "#eccb34" }} />
      </div>
    );
  }

  return (
    <AdminProtected>
      <div className="flex flex-col h-full w-full p-6 bg-transparent">
        {/* Top level view switcher */}
        <div className="flex justify-center mb-4">
          <div className="bg-white/80 backdrop-blur-md rounded-lg shadow-sm p-1 flex">
            <Button
              variant={mainView === "operations" ? "contained" : "text"}
              onClick={() => handleMainViewChange("operations")}
              startIcon={<HomeWorkIcon />}
              sx={{
                px: 3,
                py: 1,
                mx: 1,
                textTransform: "none",
                borderRadius: "8px",
                bgcolor: mainView === "operations" ? "#eccb34" : "transparent",
                color: mainView === "operations" ? "#333333" : "#333333",
                "&:hover": {
                  bgcolor:
                    mainView === "operations"
                      ? "#eccb34"
                      : "rgba(236, 203, 52, 0.1)",
                },
              }}
            >
              Property Operations
            </Button>
            <Button
              variant={mainView === "management" ? "contained" : "text"}
              onClick={() => handleMainViewChange("management")}
              startIcon={<SettingsIcon />}
              sx={{
                px: 3,
                py: 1,
                mx: 1,
                textTransform: "none",
                borderRadius: "8px",
                bgcolor: mainView === "management" ? "#eccb34" : "transparent",
                color: mainView === "management" ? "#333333" : "#333333",
                "&:hover": {
                  bgcolor:
                    mainView === "management"
                      ? "#eccb34"
                      : "rgba(236, 203, 52, 0.1)",
                },
              }}
            >
              Property Management
            </Button>
          </div>
        </div>

        {mainView === "operations" ? (
          // Operations View - Original two-column layout
          <div className="flex flex-col lg:flex-row gap-6 h-full">
            {/* Left column - Now responsive */}
            <div className="w-full lg:w-1/2 bg-secondary/95 rounded-2xl shadow-lg backdrop-blur-sm border border-primary/10 flex flex-col mb-6 lg:mb-0">
              <Tabs
                value={leftActiveTab}
                onChange={handleLeftTabChange}
                sx={{
                  borderBottom: "1px solid rgba(236, 203, 52, 0.2)",
                  "& .MuiTab-root": {
                    color: "#333333",
                    "&.Mui-selected": {
                      color: "#eccb34",
                    },
                  },
                  "& .MuiTabs-indicator": {
                    backgroundColor: "#eccb34",
                  },
                }}
              >
                <Tab label="Inventory" />
                <Tab label="Restock" />
                <Tab label="View Stock" />
              </Tabs>
              <div className="flex-1 overflow-y-auto">
                {leftActiveTab === 0 && (
                  <InventorySection
                    propertyId={propertyId}
                    selectedPropertyName={selectedPropertyName}
                  />
                )}
                {leftActiveTab === 1 && <RestockSection />}
                {leftActiveTab === 2 && <ViewStockSection />}
              </div>
            </div>

            {/* Right column - Now responsive */}
            <div className="w-full lg:w-1/2 bg-secondary/95 rounded-2xl shadow-lg backdrop-blur-sm border border-primary/10 flex flex-col">
              <Tabs
                value={rightActiveTab}
                onChange={handleRightTabChange}
                sx={{
                  borderBottom: "1px solid rgba(236, 203, 52, 0.2)",
                  "& .MuiTab-root": {
                    color: "#333333",
                    "&.Mui-selected": {
                      color: "#eccb34",
                    },
                  },
                  "& .MuiTabs-indicator": {
                    backgroundColor: "#eccb34",
                  },
                }}
              >
                <Tab label="Add Maintenance" />
                <Tab label="Add Cleaning" />
              </Tabs>
              <div className="flex-1 overflow-y-auto">
                {rightActiveTab === 0 && (
                  <MaintenanceSection
                    propertyId={propertyId}
                    selectedPropertyName={selectedPropertyName}
                  />
                )}
                {rightActiveTab === 1 && (
                  <CleaningSection
                    propertyId={propertyId}
                    selectedPropertyName={selectedPropertyName}
                  />
                )}
              </div>
            </div>
          </div>
        ) : (
          // Management View - New ManagePropertySection
          <div className="h-full">
            <ManagePropertySection />
          </div>
        )}
      </div>
    </AdminProtected>
  );
};

export default PropertyManagementPage;
