"use client";

import { useState } from "react";
import { useProperties } from "@/contexts/PropertyContext";
import MaintenanceSection from "./MaintenanceSection";
import InventorySection from "./InventorySection";
import RestockSection from "./RestockSection";
import CleaningSection from "./CleaningSection";
import { useUser } from "@/contexts/UserContext";
import CircularProgress from "@mui/material/CircularProgress";
import AdminProtected from "@/app/components/AdminProtected";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";

const PropertyManagementPage = () => {
  const { user, loading: userLoading } = useUser();
  const {
    loading: propertiesLoading,
    propertyId,
    selectedPropertyName,
  } = useProperties();

  const [rightActiveTab, setRightActiveTab] = useState(0);
  const [leftActiveTab, setLeftActiveTab] = useState(0);

  const handleRightTabChange = (event, newValue) => {
    setRightActiveTab(newValue);
  };

  const handleLeftTabChange = (event, newValue) => {
    setLeftActiveTab(newValue);
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
        {/* Two-column layout with equal widths */}
        <div className="flex gap-6 h-full">
          {/* Left column - Now with tabs for Inventory and Restock */}
          <div className="w-1/2 bg-secondary/95 rounded-2xl shadow-lg backdrop-blur-sm border border-primary/10 flex flex-col">
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
            </Tabs>
            <div className="flex-1 overflow-y-auto">
              {leftActiveTab === 0 && (
                <InventorySection
                  propertyId={propertyId}
                  selectedPropertyName={selectedPropertyName}
                />
              )}
              {leftActiveTab === 1 && <RestockSection />}
            </div>
          </div>

          {/* Right column - Tabbed Maintenance Section - now with 4 tabs */}
          <div className="w-1/2 bg-secondary/95 rounded-2xl shadow-lg backdrop-blur-sm border border-primary/10 flex flex-col">
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
      </div>
    </AdminProtected>
  );
};

export default PropertyManagementPage;
