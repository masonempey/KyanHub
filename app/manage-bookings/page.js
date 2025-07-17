"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/contexts/UserContext";
import { useProperties } from "@/contexts/PropertyContext";
import AdminProtected from "@/app/components/AdminProtected";
import CircularProgress from "@mui/material/CircularProgress";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import ViewBookingsTab from "./ViewBookingsTab";
import ManualBookingEntry from "../property-management/components/ManualBookingEntry";
import fetchWithAuth from "@/lib/fetchWithAuth";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
} from "@mui/material";

export default function ManageBookingsPage() {
  const { user, loading: userLoading } = useUser();
  const { loading: propertiesLoading } = useProperties();

  const [activeTab, setActiveTab] = useState(0);
  const [properties, setProperties] = useState({});
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);

  // Fetch properties for the property selector
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const response = await fetchWithAuth("/api/properties");
        if (!response.ok) {
          throw new Error("Failed to fetch properties");
        }
        const data = await response.json();
        setProperties(data.properties || {});
      } catch (error) {
        console.error("Error fetching properties:", error);
        setErrorMessage("Failed to load properties");
        setShowError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, []);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleSuccess = (message) => {
    setSuccessMessage(message);
    setShowSuccess(true);
  };

  const handleError = (message) => {
    setErrorMessage(message);
    setShowError(true);
  };

  if (userLoading || propertiesLoading || loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <CircularProgress sx={{ color: "#eccb34" }} />
      </div>
    );
  }

  return (
    <AdminProtected>
      <div className="flex flex-col h-full w-full p-6 bg-transparent">
        <div className="bg-secondary/95 rounded-2xl shadow-lg backdrop-blur-sm overflow-hidden border border-primary/10 flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-primary/10">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold text-dark">Manage Bookings</h1>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-primary/10">
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              sx={{
                "& .MuiTab-root": {
                  color: "#333333",
                  textTransform: "none",
                  fontSize: "1rem",
                  fontWeight: 500,
                  "&.Mui-selected": {
                    color: "#eccb34",
                    fontWeight: 600,
                  },
                },
                "& .MuiTabs-indicator": {
                  backgroundColor: "#eccb34",
                },
              }}
            >
              <Tab label="View Bookings" />
              <Tab label="Add Manual Booking" />
            </Tabs>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-auto">
            {activeTab === 0 && (
              <ViewBookingsTab
                properties={properties}
                onSuccess={handleSuccess}
                onError={handleError}
              />
            )}

            {activeTab === 1 && (
              <div className="p-6 bg-white">
                <ManualBookingEntry
                  allProperties={properties}
                  onSuccess={handleSuccess}
                  onError={handleError}
                />
              </div>
            )}
          </div>
        </div>

        {/* Success and Error Notifications */}
        <Snackbar
          open={showSuccess}
          autoHideDuration={6000}
          onClose={() => setShowSuccess(false)}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <Alert
            onClose={() => setShowSuccess(false)}
            severity="success"
            sx={{ width: "100%" }}
          >
            {successMessage}
          </Alert>
        </Snackbar>

        <Snackbar
          open={showError}
          autoHideDuration={6000}
          onClose={() => setShowError(false)}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <Alert
            onClose={() => setShowError(false)}
            severity="error"
            sx={{ width: "100%" }}
          >
            {errorMessage}
          </Alert>
        </Snackbar>
      </div>
    </AdminProtected>
  );
}
