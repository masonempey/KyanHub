"use client";

import { useProperties } from "@/contexts/PropertyContext";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import { useState, useEffect } from "react";
import dayjs from "dayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import BookingCard from "./BookingCard";
import EmailTemplates from "./emailSection";
import fetchWithAuth from "@/lib/fetchWithAuth";
import { useUser } from "@/contexts/UserContext";
import AdminProtected from "@/app/components/AdminProtected";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";

// Define monthNames array
const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const ReportsPage = () => {
  const { user, loading: userLoading } = useUser();
  const {
    properties: allProperties,
    loading: propertiesLoading,
    propertyId,
    selectedPropertyName,
  } = useProperties();
  const [startDate, setStartDate] = useState(dayjs());
  const [endDate, setEndDate] = useState(dayjs());
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateStatus, setUpdateStatus] = useState(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  useEffect(() => {
    if (user && propertyId) {
      fetchBookings(propertyId, startDate, endDate);
    }
  }, [user, propertyId]);

  const fetchBookings = async (propertyId, start, end) => {
    setLoading(true);
    setIsLoading(true);
    try {
      if (!startDate || !end || endDate.isBefore(start)) {
        throw new Error("Invalid date range.");
      }
      if (!propertyId) {
        throw new Error("No property selected.");
      }
      const response = await fetchWithAuth(
        `/api/igms/bookings-with-guests/${propertyId}/${startDate.format(
          "YYYY-MM-DD"
        )}/${endDate.format("YYYY-MM-DD")}`
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch bookings: ${await response.text()}`);
      }
      const data = await response.json();
      console.log("My Booking Test", data);
      if (data.success && data.bookings) {
        setBookings(data.bookings);
      } else {
        setBookings([]);
      }
    } catch (error) {
      console.error("Failed to fetch bookings:", error);
      setErrorMessage(error.message || "Failed to fetch bookings.");
      setErrorDialogOpen(true);
    } finally {
      setLoading(false);
      setIsLoading(false);
    }
  };

  const handleStartDateChange = (newValue) => {
    setStartDate(newValue);
    const newErrors = { ...errors };
    if (newValue && endDate && endDate.isBefore(newValue)) {
      newErrors.dateRange = "End date must be after start date.";
    } else {
      delete newErrors.dateRange;
    }
    setErrors(newErrors);
  };

  const handleEndDateChange = (newValue) => {
    setEndDate(newValue);
    const newErrors = { ...errors };
    if (startDate && newValue && newValue.isBefore(startDate)) {
      newErrors.dateRange = "End date must be after start date.";
    } else {
      delete newErrors.dateRange;
    }
    setErrors(newErrors);
  };

  const handleUpdateRevenue = () => {
    setConfirmDialogOpen(true);
  };

  const handleSearchBookings = () => {
    if (startDate && endDate && !endDate.isBefore(startDate)) {
      fetchBookings(propertyId, startDate, endDate);
    } else {
      const newErrors = { ...errors };
      newErrors.dateRange = "Please select a valid date range.";
      setErrors(newErrors);
    }
  };

  const handleConfirmUpdate = async () => {
    if (!propertyId || !selectedPropertyName || !bookings.length) {
      setErrorMessage("No property or bookings selected.");
      setErrorDialogOpen(true);
      return;
    }

    setUpdating(true);
    setIsLoading(true);
    setConfirmDialogOpen(false);
    try {
      const monthIndex = startDate.month();
      const monthName = monthNames[monthIndex]; // Now defined
      const year = startDate.format("YYYY");

      const propertyName = selectedPropertyName;

      const response = await fetchWithAuth(`/api/sheets/revenue`, {
        method: "PUT",
        body: JSON.stringify({
          propertyId,
          propertyName,
          bookings,
          year,
          monthName,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update revenue: ${await response.text()}`);
      }
      const data = await response.json();
      if (data.success) {
        setUpdateStatus("Revenue sheet updated successfully");
      } else {
        throw new Error(data.error || "Failed to update revenue sheet.");
      }
    } catch (error) {
      console.error("Failed to update revenue sheet:", error);
      setErrorMessage(error.message || "Failed to update revenue sheet.");
      setErrorDialogOpen(true);
    } finally {
      setUpdating(false);
      setIsLoading(false);
    }
  };

  if (userLoading || propertiesLoading || isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <CircularProgress sx={{ color: "#eccb34" }} />
      </div>
    );
  }

  if (!user) {
    return <div>Please log in to access this page.</div>;
  }

  return (
    <AdminProtected>
      <div className="flex flex-col h-full w-full p-6 bg-transparent">
        <div className="flex flex-col lg:flex-row w-full h-full gap-6">
          {/* Main Content Area */}
          <div className="flex-1 bg-secondary/95 rounded-2xl shadow-lg backdrop-blur-sm overflow-hidden border border-primary/10">
            <div className="p-6 flex flex-col h-full">
              {/* Header with tabs */}
              <div className="flex flex-col mb-6">
                <h2 className="text-2xl font-bold text-dark mb-3">
                  KyanHub Management
                </h2>

                {/* Tab Navigation */}
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
                </Tabs>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-hidden">
                {/* Booking Reports Tab */}
                {activeTab === 0 && (
                  <div className="flex flex-col h-full overflow-auto">
                    {/* Date Selection with improved layout */}
                    <div className="mb-6">
                      <div className="grid grid-cols-2 py-3 px-4 bg-primary/10 rounded-t-lg text-dark font-semibold">
                        <span>Date Range</span>
                        <span className="text-right">
                          {selectedPropertyName || "Select a property"}
                        </span>
                      </div>

                      <div className="bg-secondary/80 rounded-b-lg p-4 border border-primary/10">
                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                          {/* Organized date picker section */}
                          <div className="flex flex-col space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-dark mb-1 ml-1">
                                  Start Date
                                </label>
                                <DatePicker
                                  value={startDate}
                                  onChange={handleStartDateChange}
                                  className="bg-white rounded-lg border border-primary/30 w-full"
                                  slotProps={{
                                    textField: {
                                      size: "small",
                                      fullWidth: true,
                                      sx: {
                                        "& .MuiOutlinedInput-root": {
                                          "& fieldset": {
                                            borderColor: "#eccb34",
                                          },
                                          "&:hover fieldset": {
                                            borderColor: "#eccb34",
                                          },
                                          "&.Mui-focused fieldset": {
                                            borderColor: "#eccb34",
                                          },
                                        },
                                      },
                                    },
                                  }}
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-dark mb-1 ml-1">
                                  End Date
                                </label>
                                <DatePicker
                                  value={endDate}
                                  onChange={handleEndDateChange}
                                  className="bg-white rounded-lg border border-primary/30 w-full"
                                  slotProps={{
                                    textField: {
                                      size: "small",
                                      fullWidth: true,
                                      sx: {
                                        "& .MuiOutlinedInput-root": {
                                          "& fieldset": {
                                            borderColor: "#eccb34",
                                          },
                                          "&:hover fieldset": {
                                            borderColor: "#eccb34",
                                          },
                                          "&.Mui-focused fieldset": {
                                            borderColor: "#eccb34",
                                          },
                                        },
                                      },
                                    },
                                  }}
                                />
                              </div>
                            </div>

                            {errors.dateRange && (
                              <p className="text-primary text-sm mt-1">
                                {errors.dateRange}
                              </p>
                            )}

                            <div className="flex justify-end mt-2 gap-2">
                              <Button
                                variant="contained"
                                onClick={handleSearchBookings}
                                disabled={loading || !propertyId}
                                className="bg-primary hover:bg-secondary hover:text-primary text-dark font-medium px-6 py-2 rounded-lg shadow-md transition-colors duration-300"
                                sx={{
                                  textTransform: "none",
                                  fontSize: "1rem",
                                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                                  "&:hover": {
                                    boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                                  },
                                }}
                              >
                                {loading ? (
                                  <span className="flex items-center">
                                    <CircularProgress
                                      size={20}
                                      sx={{ color: "#333333", mr: 1 }}
                                    />
                                    Searching...
                                  </span>
                                ) : (
                                  "Search Bookings"
                                )}
                              </Button>

                              <Button
                                variant="contained"
                                onClick={handleUpdateRevenue}
                                disabled={updating || !bookings.length}
                                className={`bg-primary hover:bg-secondary hover:text-primary text-dark font-medium px-6 py-2 rounded-lg shadow-md transition-colors duration-300 ${
                                  !bookings.length
                                    ? "opacity-50 cursor-not-allowed"
                                    : ""
                                }`}
                                sx={{
                                  textTransform: "none",
                                  fontSize: "1rem",
                                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                                  "&:hover": {
                                    boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                                  },
                                }}
                              >
                                {updating ? (
                                  <span className="flex items-center">
                                    <CircularProgress
                                      size={20}
                                      sx={{ color: "#333333", mr: 1 }}
                                    />
                                    Updating...
                                  </span>
                                ) : (
                                  "Update Revenue Sheet"
                                )}
                              </Button>
                            </div>

                            {/* Status message in its own section */}
                            {updateStatus && (
                              <div
                                className={`mt-4 p-2 rounded-lg border ${
                                  updateStatus.includes("Error")
                                    ? "border-red-500 bg-red-100"
                                    : "border-primary bg-primary/10"
                                }`}
                              >
                                <p
                                  className={
                                    updateStatus.includes("Error")
                                      ? "text-red-600"
                                      : "text-dark"
                                  }
                                >
                                  {updateStatus}
                                </p>
                              </div>
                            )}
                          </div>
                        </LocalizationProvider>
                      </div>
                    </div>

                    {/* Bookings Section */}
                    <div className="grid grid-cols-2 py-3 px-4 bg-primary/10 rounded-t-lg text-dark font-semibold">
                      <span>Bookings</span>
                      <span className="text-right">
                        Total: {bookings.length}
                      </span>
                    </div>

                    <div className="flex-1 overflow-y-auto bg-secondary/80 rounded-b-lg mb-6 border border-primary/10 p-4">
                      {loading ? (
                        <div className="flex items-center justify-center h-40">
                          <CircularProgress sx={{ color: "#eccb34" }} />
                        </div>
                      ) : bookings.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                          {bookings.map((booking) => (
                            <BookingCard
                              key={`${booking.bookingCode}-${booking.guestUid}`}
                              booking={booking}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-40">
                          <p className="text-dark text-lg">No bookings found</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Email Templates Tab */}
                {activeTab === 1 && (
                  <div className="flex-1 h-full overflow-auto">
                    <EmailTemplates />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Dialogs - keep these outside the tabs */}
        <Dialog
          open={confirmDialogOpen}
          onClose={() => setConfirmDialogOpen(false)}
          PaperProps={{
            sx: {
              backgroundColor: "#fafafa",
              color: "#333333",
              borderRadius: "12px",
              border: "1px solid rgba(236, 203, 52, 0.2)",
            },
          }}
        >
          <DialogTitle sx={{ color: "#333333" }}>Confirm Update</DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ color: "#333333" }}>
              Are you sure you want to update the revenue sheet?
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setConfirmDialogOpen(false)}
              className="text-dark hover:bg-primary/5 transition-colors"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmUpdate}
              className="bg-primary text-dark hover:bg-primary/80 transition-colors"
            >
              Confirm
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={errorDialogOpen}
          onClose={() => setErrorDialogOpen(false)}
          PaperProps={{
            sx: {
              backgroundColor: "#fafafa",
              color: "#333333",
              borderRadius: "12px",
              border: "1px solid rgba(236, 203, 52, 0.2)",
            },
          }}
        >
          <DialogTitle sx={{ color: "#333333" }}>Error</DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ color: "#333333" }}>
              {errorMessage}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setErrorDialogOpen(false)}
              className="bg-primary text-dark hover:bg-primary/80 transition-colors"
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    </AdminProtected>
  );
};

export default ReportsPage;
