"use client";

import { useState } from "react";
import { useProperties } from "@/contexts/PropertyContext";
import CircularProgress from "@mui/material/CircularProgress";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import OwnerList from "./components/OwnerList";
import OwnerDetails from "./components/OwnerDetails";
import AssignProperties from "./components/AssignProperties";

const OwnerManagementSection = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { loading: propertiesLoading } = useProperties();

  const [activeTab, setActiveTab] = useState(0);
  const [selectedOwnerId, setSelectedOwnerId] = useState(null);
  const [showAddOwner, setShowAddOwner] = useState(false);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleOwnerSelect = (id) => {
    setSelectedOwnerId(id);
    setActiveTab(1); // Switch to details tab
  };

  if (propertiesLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <CircularProgress sx={{ color: "#eccb34" }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-transparent p-2 sm:p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 sm:mb-6 gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-dark">
          Owner Management
        </h1>
        <Button
          variant="contained"
          onClick={() => setShowAddOwner(true)}
          sx={{
            bgcolor: "#eccb34",
            color: "#333333",
            "&:hover": {
              bgcolor: "#d9b92f",
            },
            textTransform: "none",
            fontWeight: 500,
            fontSize: { xs: "0.75rem", sm: "0.875rem" },
            py: { xs: 1, sm: 1.5 },
            width: { xs: "100%", sm: "auto" },
          }}
        >
          Add New Owner
        </Button>
      </div>

      <div className="bg-white/80 rounded-lg overflow-hidden flex flex-col h-full">
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant={isMobile ? "fullWidth" : "standard"}
            sx={{
              borderBottom: "1px solid rgba(236, 203, 52, 0.2)",
              "& .MuiTab-root": {
                color: "#333333",
                "&.Mui-selected": {
                  color: "#eccb34",
                },
                fontSize: { xs: "0.75rem", sm: "0.875rem" },
                py: { xs: 1, sm: 1.5 },
                minWidth: { xs: "auto", sm: 120 },
              },
              "& .MuiTabs-indicator": {
                backgroundColor: "#eccb34",
              },
            }}
          >
            <Tab label="All Owners" />
            {selectedOwnerId && <Tab label="Owner Details" />}
            {selectedOwnerId && <Tab label="Assign Properties" />}
          </Tabs>
        </Box>

        <div className="flex-1 overflow-auto p-2 sm:p-4">
          {activeTab === 0 && (
            <OwnerList
              onSelectOwner={handleOwnerSelect}
              showAddDialog={showAddOwner}
              onCloseAddDialog={() => setShowAddOwner(false)}
            />
          )}
          {activeTab === 1 && selectedOwnerId && (
            <OwnerDetails ownerId={selectedOwnerId} />
          )}
          {activeTab === 2 && selectedOwnerId && (
            <AssignProperties ownerId={selectedOwnerId} />
          )}
        </div>
      </div>
    </div>
  );
};

export default OwnerManagementSection;
