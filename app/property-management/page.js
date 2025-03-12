"use client";

import { useState } from "react";
import { useProperties } from "@/contexts/PropertyContext";
import MaintenanceSection from "./MaintenanceSection";
import InventorySection from "./InventorySection";
import ViewMaintenanceSection from "./ViewMaintenanceSection";
import ViewCleaningSection from "./ViewCleaningSection";
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

  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
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
          {/* Left column - Inventory Section - now 1/2 width */}
          <div className="w-1/2 bg-secondary/95 rounded-2xl shadow-lg backdrop-blur-sm border border-primary/10 flex flex-col">
            <div className="p-4 border-b border-primary/20">
              <h2 className="text-xl font-bold text-dark">Inventory</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              <InventorySection
                propertyId={propertyId}
                selectedPropertyName={selectedPropertyName}
              />
            </div>
          </div>

          {/* Right column - Tabbed Maintenance Section - now 1/2 width */}
          <div className="w-1/2 bg-secondary/95 rounded-2xl shadow-lg backdrop-blur-sm border border-primary/10 flex flex-col">
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
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
              <Tab label="View Maintenance" />
              <Tab label="View Cleaning" />
            </Tabs>
            <div className="flex-1 overflow-y-auto">
              {activeTab === 0 && (
                <MaintenanceSection
                  propertyId={propertyId}
                  selectedPropertyName={selectedPropertyName}
                />
              )}
              {activeTab === 1 && (
                <CleaningSection
                  propertyId={propertyId}
                  selectedPropertyName={selectedPropertyName}
                />
              )}
              {activeTab === 2 && (
                <ViewMaintenanceSection
                  propertyId={propertyId}
                  selectedPropertyName={selectedPropertyName}
                />
              )}
              {activeTab === 3 && (
                <ViewCleaningSection
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
