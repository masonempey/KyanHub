"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/contexts/UserContext";
import { useProperties } from "@/contexts/PropertyContext";
import AdminProtected from "@/app/components/AdminProtected";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import ClientOnly from "@/app/components/ClientOnly";
import dayjs from "dayjs";
import BookingReportsTab from "./components/BookingReportsTab";
import EmailTemplates from "./components/emailSection";
import MonthEndReportsTab from "./components/MonthEndReportsTab";
import InventoryInvoicesTab from "./components/InventoryInvoicesTab";
import ReportDialogs from "./components/ReportDialogs";
import ProcessedPropertiesLog from "./components/ProcessedPropertiesLog";
import BookingCard from "./components/BookingCard";
import PropertyStatusIndicator from "./components/PropertyStatusIndicator";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";

const ReportsPage = () => {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState(0);
  const [successMessage, setSuccessMessage] = useState("");
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [processedProperties, setProcessedProperties] = useState([]);
  const [reportsMonth, setReportsMonth] = useState(dayjs());
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedProperty, setSelectedProperty] = useState("");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [bookingCode, setBookingCode] = useState("");
  const [guestName, setGuestName] = useState("");

  // Handle tab changes
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Search bookings function
  const searchBookings = async () => {
    // Add debug logging
    console.log("Search button clicked");
    console.log("Selected property:", selectedProperty);
    console.log(
      "Date range:",
      startDate?.format("YYYY-MM-DD"),
      "to",
      endDate?.format("YYYY-MM-DD")
    );

    setLoading(true);
    try {
      // Build query params
      const params = new URLSearchParams();
      if (selectedProperty) params.append("propertyId", selectedProperty);
      if (startDate) params.append("startDate", startDate.format("YYYY-MM-DD"));
      if (endDate) params.append("endDate", endDate.format("YYYY-MM-DD"));
      if (bookingCode) params.append("bookingCode", bookingCode);
      if (guestName) params.append("guestName", guestName);

      // Add pagination params
      params.append("page", page + 1); // API uses 1-based indexing
      params.append("pageSize", rowsPerPage);

      console.log("Sending request with params:", params.toString());

      const response = await fetchWithAuth(
        `/api/bookings?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch bookings: ${await response.text()}`);
      }

      const data = await response.json();
      console.log("Received bookings:", data.bookings?.length || 0);
      setBookings(data.bookings || []);
      setTotalCount(data.totalCount || 0);
    } catch (error) {
      console.error("Error searching bookings:", error);
      if (onError) onError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminProtected>
      <div className="flex flex-col h-full w-full p-6 bg-transparent">
        <div className="flex flex-col lg:flex-row w-full h-full gap-6">
          <div className="flex-1 bg-secondary/95 rounded-2xl shadow-lg backdrop-blur-sm overflow-hidden border border-primary/10">
            <div className="p-6 flex flex-col h-full">
              <div className="flex flex-col mb-4">
                <h2 className="text-2xl font-bold text-dark mb-3">
                  KyanHub Management
                </h2>
                <Tabs
                  value={activeTab}
                  onChange={handleTabChange}
                  className="border-b border-primary/20"
                  TabIndicatorProps={{
                    style: {
                      backgroundColor: "#eccb34",
                      height: "3px",
                    },
                  }}
                  sx={{
                    "& .MuiTab-root": {
                      color: "#555",
                      textTransform: "none",
                      fontSize: "1rem",
                      fontWeight: 500,
                      "&.Mui-selected": {
                        color: "#333",
                        fontWeight: 600,
                      },
                    },
                  }}
                >
                  <Tab label="Booking Reports" />
                  <Tab label="Email Templates" />
                  <Tab label="Month-End Reports" />
                  <Tab label="Inventory Invoices" />
                </Tabs>
              </div>

              <div className="flex-1 overflow-hidden">
                {activeTab === 0 && (
                  <BookingReportsTab
                    setProcessedProperties={setProcessedProperties}
                    setErrorMessage={setErrorMessage}
                    setErrorDialogOpen={setErrorDialogOpen}
                  />
                )}

                {activeTab === 1 && (
                  <div className="flex-1 h-full overflow-auto">
                    <ClientOnly
                      fallback={
                        <div className="p-4">Loading email templates...</div>
                      }
                    >
                      <EmailTemplates />
                    </ClientOnly>
                  </div>
                )}

                {activeTab === 2 && (
                  <MonthEndReportsTab
                    reportsMonth={reportsMonth}
                    setReportsMonth={setReportsMonth}
                    setSuccessMessage={setSuccessMessage}
                    setSuccessDialogOpen={setSuccessDialogOpen}
                    setErrorMessage={setErrorMessage}
                    setErrorDialogOpen={setErrorDialogOpen}
                  />
                )}

                {activeTab === 3 && (
                  <InventoryInvoicesTab
                    setErrorMessage={setErrorMessage}
                    setErrorDialogOpen={setErrorDialogOpen}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ProcessedPropertiesLog processedProperties={processedProperties} />

      <ReportDialogs
        successDialogOpen={successDialogOpen}
        setSuccessDialogOpen={setSuccessDialogOpen}
        successMessage={successMessage}
        errorDialogOpen={errorDialogOpen}
        setErrorDialogOpen={setErrorDialogOpen}
        errorMessage={errorMessage}
      />
    </AdminProtected>
  );
};

export default ReportsPage;
