import { useState } from "react";
import { useProperties } from "@/contexts/PropertyContext";
import PropertyList from "./components/PropertyList";
import PropertyDetails from "./components/PropertyDetails";
import OwnerManagementSection from "./OwnerManagementSection";
import { CircularProgress, Tabs, Tab, Box, Button, Alert } from "@mui/material";

const ManagePropertySection = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);

  const {
    properties,
    loading: propertiesLoading,
    mutate,
    propertyDetails,
  } = useProperties();

  // Tab handling
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Property selection
  const handlePropertySelect = (id) => {
    setSelectedPropertyId(id);
    setActiveTab(0); // Keep on properties tab
  };

  // Handle notifications
  const handleNotification = (message) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 5000);
  };

  return (
    <div className="flex flex-col h-full bg-secondary/5 rounded-2xl p-6 overflow-hidden">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-dark">Property Management</h1>
      </div>
      {notification && (
        <Alert
          severity="info"
          onClose={() => setNotification(null)}
          sx={{ mb: 3 }}
        >
          {notification}
        </Alert>
      )}

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          sx={{
            "& .MuiTab-root": {
              color: "#333333",
              "&.Mui-selected": { color: "#eccb34" },
            },
            "& .MuiTabs-indicator": { backgroundColor: "#eccb34" },
          }}
        >
          <Tab label="Properties" />
          <Tab label="Owner Management" />
        </Tabs>
      </Box>

      <div className="flex-1 overflow-hidden mt-4">
        {propertiesLoading ? (
          <div className="flex h-full items-center justify-center">
            <CircularProgress sx={{ color: "#eccb34" }} />
          </div>
        ) : (
          <>
            {activeTab === 0 && (
              <PropertyList
                properties={properties}
                propertyDetails={propertyDetails}
                onSelect={handlePropertySelect}
                onError={setError}
                onSuccess={() => {
                  mutate();
                  handleNotification("Property saved successfully");
                }}
              />
            )}
            {activeTab === 1 && <OwnerManagementSection />}
          </>
        )}
      </div>
    </div>
  );
};

export default ManagePropertySection;
