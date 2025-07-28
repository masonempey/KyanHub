import { useState, useEffect } from "react";
import { useProperties } from "@/contexts/PropertyContext";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import MultiPropertySelector from "@/app/components/MultiPropertySelector";
import BookingCard from "./BookingCard";
import MonthEndStatus from "@/app/components/MonthEndStatus";
import fetchWithAuth from "@/lib/fetchWithAuth";
import dayjs from "dayjs";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Paper,
  Typography,
  Box,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import TextField from "@mui/material/TextField";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import Autocomplete from "@mui/material/Autocomplete";

const theme = createTheme({
  palette: {
    primary: {
      main: "#eccb34",
    },
    secondary: {
      main: "#333333",
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: "4px",
        },
        containedPrimary: {
          backgroundColor: "#eccb34",
          color: "#333333",
          "&:hover": {
            backgroundColor: "#d4b02a",
          },
        },
        outlinedPrimary: {
          borderColor: "#eccb34",
          color: "#333333",
          "&:hover": {
            borderColor: "#d4b02a",
            backgroundColor: "rgba(236, 203, 52, 0.04)",
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: "8px",
        },
      },
    },
  },
});

const BookingReportsTab = ({
  setProcessedProperties,
  setErrorMessage,
  setErrorDialogOpen,
}) => {
  const { properties: allProperties, loading: propertiesLoading } =
    useProperties();
  const [startDate, setStartDate] = useState(dayjs());
  const [endDate, setEndDate] = useState(dayjs());
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [errors, setErrors] = useState({});
  const [selectedProperties, setSelectedProperties] = useState([]);
  const [updateStatus, setUpdateStatus] = useState(null);
  const [isDryRun, setIsDryRun] = useState(false);
  const [selectedPropertyStatus, setSelectedPropertyStatus] = useState(null);
  const [isMultiProcessing, setIsMultiProcessing] = useState(false);
  const [consolidatedSummary, setConsolidatedSummary] = useState([]);
  const [monthNames] = useState([
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
  ]);
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [errorDialogVisible, setErrorDialogVisible] = useState(false);
  const [processedData, setProcessedData] = useState([]);

  // Handle errors locally first, then propagate up if needed
  const handleError = (message) => {
    setErrorMsg(message);
    setErrorDialogVisible(true);
    // Also notify parent component
    if (setErrorMessage) setErrorMessage(message);
    if (setErrorDialogOpen) setErrorDialogOpen(true);
  };

  // Handle start date change with validation
  const handleStartDateChange = (newValue) => {
    setStartDate(newValue);
    const newErrors = { ...errors };
    if (newValue && endDate && endDate.isBefore(newValue)) {
      newErrors.dateRange = "End date cannot be before start date";
    } else {
      delete newErrors.dateRange;
    }
    setErrors(newErrors);
  };

  // Handle end date change with validation
  const handleEndDateChange = (newValue) => {
    setEndDate(newValue);
    const newErrors = { ...errors };
    if (startDate && newValue && newValue.isBefore(startDate)) {
      newErrors.dateRange = "End date cannot be before start date";
    } else {
      delete newErrors.dateRange;
    }
    setErrors(newErrors);
  };

  // Fetch bookings for multiple properties - consolidated function
  const handleSearchBookings = async () => {
    if (!selectedProperties.length) {
      handleError("Please select at least one property");
      return;
    }

    if (startDate && endDate && !endDate.isBefore(startDate)) {
      setLoading(true);
      setBookings([]);

      try {
        const allBookings = [];

        // Process each property ID separately
        for (const propertyId of selectedProperties) {
          console.log(`Fetching bookings for property: ${propertyId}`);

          // Use the correct IGMS endpoint with path parameters
          const response = await fetchWithAuth(
            `/api/igms/bookings-with-guests/${propertyId}/${startDate.format(
              "YYYY-MM-DD"
            )}/${endDate.format("YYYY-MM-DD")}`
          );

          if (!response.ok) {
            console.error(
              `Error fetching bookings for property ${propertyId}:`,
              await response.text()
            );
            continue; // Skip this property but continue with others
          }

          const data = await response.json();
          console.log(
            `Received ${
              data.bookings?.length || 0
            } bookings for property ${propertyId}`
          );

          if (data.bookings && data.bookings.length > 0) {
            // Add property information to each booking for display purposes
            const propertyName =
              typeof allProperties[propertyId] === "object"
                ? allProperties[propertyId].name
                : allProperties[propertyId];

            const bookingsWithProperty = data.bookings.map((booking) => ({
              ...booking,
              propertyName: propertyName || `Property ${propertyId}`,
            }));

            allBookings.push(...bookingsWithProperty);
          }
        }

        // Sort all bookings by check-in date (most recent first)
        allBookings.sort((a, b) => new Date(b.checkIn) - new Date(a.checkIn));

        console.log(
          `Total bookings found across all properties: ${allBookings.length}`
        );

        // Force bookings to have content by cloning the array
        const bookingsCopy = [...allBookings];
        setBookings(bookingsCopy);

        // Force an update to the UI to reflect the new bookings
        setTimeout(() => {
          if (bookingsCopy.length > 0) {
            console.log(
              "Forcing UI update with bookings:",
              bookingsCopy.length
            );
            setUpdateStatus(`Found ${bookingsCopy.length} bookings`);
          }
        }, 100);
      } catch (error) {
        console.error("Error fetching bookings:", error);
        handleError(`Failed to fetch bookings: ${error.message}`);
      } finally {
        setLoading(false);
      }
    } else {
      const newErrors = { ...errors };
      newErrors.dateRange = "Please select valid date range";
      setErrors(newErrors);
    }
  };

  // Process properties for month-end calculations
  const handleMultiPropertyUpdate = async () => {
    if (!selectedProperties.length) {
      handleError("Please select at least one property");
      return;
    }

    if (!bookings.length) {
      handleError("No bookings found. Please search for bookings first.");
      return;
    }

    setUpdating(true);

    try {
      // const missingInventory = [];
      const month = startDate.month() + 1;
      const year = startDate.format("YYYY");

      for (const propertyId of selectedProperties) {
        const propertyName =
          typeof allProperties[propertyId] === "object"
            ? allProperties[propertyId].name
            : allProperties[propertyId];

        const response = await fetchWithAuth(
          `/api/property-month-end/options?propertyId=${propertyId}&year=${year}&monthNumber=${month}`
        );

        if (!response.ok) {
          console.error(
            `Failed to check inventory status for ${propertyName} (API error)`
          );
          continue;
        }

        const data = await response.json();

        if (!data.inventoryReady) {
          missingInventory.push(propertyName);
        }
      }

      if (missingInventory.length > 0) {
        handleError(
          `The following properties need inventory invoices before processing: ${missingInventory.join(
            ", "
          )}`
        );
        setUpdating(false);
        return;
      }

      const summaryResults = [];

      for (const propertyId of selectedProperties) {
        const propertyName =
          typeof allProperties[propertyId] === "object"
            ? allProperties[propertyId].name
            : allProperties[propertyId];

        const propertyBookings = bookings.filter(
          (b) => b.propertyId === propertyId || b.propertyUid === propertyId
        );

        if (propertyBookings.length === 0) {
          summaryResults.push({
            propertyId,
            propertyName,
            status: "No bookings found",
          });
          continue;
        }

        const response = await fetchWithAuth(
          `/api/property-month-end/calculate`,
          {
            method: "POST",
            body: JSON.stringify({
              propertyId,
              propertyName,
              year,
              month: monthNames[month - 1],
              monthNumber: month,
              bookings: propertyBookings,
              dryRun: false,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const result = await response.json();
        const apiData = result.data || result;

        summaryResults.push({
          propertyId,
          propertyName,
          year,
          month: monthNames[month - 1],
          monthNumber: month,
          bookingCount: propertyBookings.length,
          totalRevenue: parseFloat(apiData.revenue_amount || 0),
          totalCleaning: parseFloat(apiData.cleaning_fees_amount || 0),
          expenses: parseFloat(apiData.expenses_amount || 0),
          netAmount: parseFloat(apiData.net_amount || 0),
          ownershipPercentage: parseFloat(apiData.owner_percentage || 100),
          ownerProfit: parseFloat(apiData.owner_profit || 0),
          status: apiData.status || "draft",
        });
      }

      // Save the processed data to state
      setProcessedData(summaryResults);

      // Optionally, show a summary dialog
      setConsolidatedSummary(summaryResults);
      setSummaryDialogOpen(true);
    } catch (error) {
      console.error("Error processing properties:", error);
      handleError(`Error: ${error.message}`);
    } finally {
      setUpdating(false);
    }
  };

  // Download CSV of calculation results
  const downloadSummaryCSV = (data) => {
    // Create CSV content with all fields
    let csvContent =
      "Property,Month,Year,Bookings,Revenue,Cleaning,Expenses,Net,Owner %,Owner Payout,Status\n";

    data.forEach((item) => {
      if (item.hasError) {
        csvContent += `"${item.propertyName}","${item.month || ""}","${
          item.year || ""
        }",0,0.00,0.00,0.00,0.00,0,0.00,"Error: ${item.errorMessage}"\n`;
      } else {
        csvContent += `"${item.propertyName}","${item.month}","${item.year}",${
          item.bookingCount || 0
        },${(item.totalRevenue || 0).toFixed(2)},${(
          item.totalCleaning || 0
        ).toFixed(2)},${(item.expenses || 0).toFixed(2)},${(
          item.netAmount || 0
        ).toFixed(2)},${item.ownershipPercentage || 100},${(
          item.ownerProfit || 0
        ).toFixed(2)},"${item.status || "draft"}"\n`;
      }
    });

    // Create download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `month-end-summary-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle final processing
  const processAllProperties = async () => {
    try {
      setUpdating(true);
      setUpdateStatus("Processing Month-End...");

      // Use the processed data from handleMultiPropertyUpdate
      const requestData = processedData.map((property) => {
        // Filter bookings for the current property
        const propertyBookings = bookings.filter(
          (b) =>
            b.propertyId === property.propertyId ||
            b.propertyUid === property.propertyId
        );

        return {
          propertyId: property.propertyId,
          propertyName: property.propertyName,
          year: property.year,
          monthName: property.month,
          monthNumber: property.monthNumber,
          totalRevenue: property.totalRevenue,
          totalCleaning: property.totalCleaning,
          expensesTotal: property.expenses,
          netAmount: property.netAmount,
          ownershipPercentage: property.ownershipPercentage,
          ownerProfit: property.ownerProfit,
          bookings: propertyBookings,
          dryRun: isDryRun,
        };
      });

      // Send the data to the backend
      const response = await fetchWithAuth("/api/sheets/revenue", {
        method: "PUT",
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error("Failed to process month-end");
      }

      // Refetch updated data from the database
      const month = startDate.format("MMMM");
      const year = startDate.format("YYYY");
      const updatedResponse = await fetchWithAuth(
        `/api/property-month-end/completed?month=${encodeURIComponent(
          month
        )}&year=${encodeURIComponent(year)}`
      );

      if (!updatedResponse.ok) {
        throw new Error("Failed to fetch updated reports");
      }

      // Close the summary dialog and show a success message
      setSummaryDialogOpen(false);
      setUpdateStatus("Update Completed Successfully!");
    } catch (error) {
      console.error("Error processing month-end:", error);
      setUpdateStatus(`Error: ${error.message}`);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <div className="p-4" style={{ height: "100%", overflowY: "auto" }}>
        <Box sx={{ mb: 4 }}>
          <Grid container spacing={3}>
            {/* Property selector - simplified implementation */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500 }}>
                Select Properties
              </Typography>

              {/* Replace this Autocomplete component */}
              <MultiPropertySelector
                properties={allProperties || {}}
                selectedProperties={selectedProperties}
                onChange={(newSelected) => setSelectedProperties(newSelected)}
                loading={propertiesLoading}
                label="Select Properties"
              />

              {/* Adding a visual indicator of how many properties are selected */}
              {selectedProperties.length > 0 && (
                <Typography
                  variant="caption"
                  sx={{
                    mt: 1,
                    display: "block",
                    color: "text.secondary",
                  }}
                >
                  {selectedProperties.length}{" "}
                  {selectedProperties.length === 1 ? "property" : "properties"}{" "}
                  selected
                </Typography>
              )}
            </Grid>

            {/* Date range controls */}
            <Grid item xs={12} md={8}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500 }}>
                Date Range
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: { xs: "column", sm: "row" },
                  alignItems: { xs: "stretch", sm: "center" },
                  gap: 2,
                }}
              >
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DatePicker
                    label="Start Date"
                    value={startDate}
                    onChange={handleStartDateChange}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        size: "small",
                      },
                    }}
                  />
                </LocalizationProvider>

                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: { xs: "100%", sm: "auto" },
                  }}
                >
                  <Box
                    sx={{
                      height: "1px",
                      width: { xs: "100%", sm: "20px" },
                      bgcolor: "#ddd",
                    }}
                  />
                </Box>

                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DatePicker
                    label="End Date"
                    value={endDate}
                    onChange={handleEndDateChange}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        size: "small",
                      },
                    }}
                  />
                </LocalizationProvider>
              </Box>

              {errors.dateRange && (
                <Typography
                  color="error"
                  variant="caption"
                  sx={{
                    mt: 1,
                    display: "block",
                  }}
                >
                  {errors.dateRange}
                </Typography>
              )}
            </Grid>

            {/* Search button */}
            <Grid
              item
              xs={12}
              md={4}
              sx={{
                display: "flex",
                alignItems: { xs: "stretch", md: "flex-end" },
                justifyContent: { xs: "center", md: "flex-end" },
              }}
            >
              <Button
                variant="contained"
                color="primary"
                onClick={handleSearchBookings}
                disabled={loading}
                fullWidth
                sx={{
                  height: "40px",
                  fontWeight: 500,
                }}
                startIcon={
                  loading ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : null
                }
              >
                {loading ? "Searching..." : "Search Bookings"}
              </Button>
            </Grid>
          </Grid>
        </Box>

        {/* Bookings list */}
        <div>
          {bookings.length === 0 && !loading && (
            <div className="text-center text-gray-500 py-4">
              No bookings found for the selected properties and date range.
            </div>
          )}
          {bookings.map((booking, index) => (
            <BookingCard
              key={
                booking.id ? `booking-${booking.id}` : `booking-index-${index}`
              }
              booking={booking}
              properties={allProperties}
              onUpdateStatus={setUpdateStatus}
              updating={updating}
            />
          ))}
        </div>

        {/* Month-end processing section */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Month-End Processing</h2>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
            <div className="flex items-center">
              <Button
                variant="contained"
                color="primary"
                onClick={handleMultiPropertyUpdate}
                disabled={updating || loading}
                className="mr-4"
              >
                {updating ? (
                  <CircularProgress size={24} />
                ) : (
                  "Process Month-End"
                )}
              </Button>
              <Button
                variant="outlined"
                onClick={() => setIsDryRun(!isDryRun)}
                disabled={updating || loading}
              >
                {isDryRun ? "Disable Dry Run" : "Enable Dry Run"}
              </Button>
            </div>
          </div>
        </div>

        {/* Month-end status summary */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Processing Summary</h2>
          {updateStatus && (
            <Typography variant="body1" className="mb-4 font-medium">
              {updateStatus}
            </Typography>
          )}
          {consolidatedSummary.length === 0 && (
            <div className="text-center text-gray-500 py-4">
              No processing summary available yet.
            </div>
          )}
          {consolidatedSummary.length > 0 && (
            <div>
              <div className="grid grid-cols-9 gap-4 font-semibold text-gray-700 bg-gray-100 p-4 rounded-t-lg">
                <div>Property</div>
                <div className="text-center">Month</div>
                <div className="text-center">Year</div>
                <div className="text-center">Bookings</div>
                <div className="text-center">Revenue</div>
                <div className="text-center">Cleaning</div>
                <div className="text-center">Expenses</div>
                <div className="text-center">Net</div>
                <div className="text-center">Status</div>
              </div>
              {consolidatedSummary.map((item) => (
                <div
                  key={item.propertyId}
                  className={`grid grid-cols-9 gap-4 p-4 border-b ${
                    item.hasError ? "bg-red-50" : ""
                  }`}
                >
                  <div>{item.propertyName}</div>
                  <div className="text-center">{item.month}</div>
                  <div className="text-center">{item.year}</div>
                  <div className="text-center">{item.bookingCount || 0}</div>
                  <div className="text-center">
                    ${(item.totalRevenue || 0).toFixed(2)}
                  </div>
                  <div className="text-center">
                    ${(item.totalCleaning || 0).toFixed(2)}
                  </div>
                  <div className="text-center">
                    ${(item.expenses || 0).toFixed(2)}
                  </div>
                  <div className="text-center">
                    ${(item.netAmount || 0).toFixed(2)}
                  </div>
                  <div className="text-center">
                    {item.hasError ? (
                      <span className="text-red-500">Error</span>
                    ) : item.status === "draft" ? (
                      <span className="text-yellow-500">Pending</span>
                    ) : item.status === "ready" ? (
                      <span className="text-green-500">Ready</span>
                    ) : item.status === "complete" ? (
                      <span className="text-blue-500">Complete</span>
                    ) : (
                      <span className="text-gray-500">{item.status}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Improved Summary dialog with all financial details */}
        <Dialog
          open={summaryDialogOpen}
          onClose={() => setSummaryDialogOpen(false)}
          maxWidth="lg"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: "8px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
            },
          }}
        >
          {/* Fix the heading hierarchy issue by using div components */}
          <DialogTitle>Month-End Processing Summary</DialogTitle>
          <Box sx={{ px: 3, mt: -2, mb: 2 }}>
            <Typography variant="subtitle1" color="text.secondary">
              {startDate.format("MMMM YYYY")}
            </Typography>
          </Box>
          <DialogContent>
            {consolidatedSummary.length === 0 && (
              <div className="text-center text-gray-500 py-4">
                No processing summary available yet.
              </div>
            )}
            {consolidatedSummary.length > 0 && (
              <div>
                <div className="grid grid-cols-9 gap-4 font-semibold text-gray-700 bg-gray-100 p-4 rounded-t-lg">
                  <div>Property</div>
                  <div className="text-center">Month</div>
                  <div className="text-center">Year</div>
                  <div className="text-center">Bookings</div>
                  <div className="text-center">Revenue</div>
                  <div className="text-center">Cleaning</div>
                  <div className="text-center">Expenses</div>
                  <div className="text-center">Net</div>
                  <div className="text-center">Status</div>
                </div>
                {consolidatedSummary.map((item) => (
                  <div
                    key={item.propertyId}
                    className={`grid grid-cols-9 gap-4 p-4 border-b ${
                      item.hasError ? "bg-red-50" : ""
                    }`}
                  >
                    <div>{item.propertyName}</div>
                    <div className="text-center">{item.month}</div>
                    <div className="text-center">{item.year}</div>
                    <div className="text-center">{item.bookingCount || 0}</div>
                    <div className="text-center">
                      ${(item.totalRevenue || 0).toFixed(2)}
                    </div>
                    <div className="text-center">
                      ${(item.totalCleaning || 0).toFixed(2)}
                    </div>
                    <div className="text-center">
                      ${(item.expenses || 0).toFixed(2)}
                    </div>
                    <div className="text-center">
                      ${(item.netAmount || 0).toFixed(2)}
                    </div>
                    <div className="text-center">
                      {item.hasError ? (
                        <span className="text-red-500">Error</span>
                      ) : item.status === "draft" ? (
                        <span className="text-yellow-500">Pending</span>
                      ) : item.status === "ready" ? (
                        <span className="text-green-500">Ready</span>
                      ) : item.status === "complete" ? (
                        <span className="text-blue-500">Complete</span>
                      ) : (
                        <span className="text-gray-500">{item.status}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSummaryDialogOpen(false)} color="primary">
              Close
            </Button>
            <Button
              onClick={() => downloadSummaryCSV(consolidatedSummary)}
              color="primary"
              startIcon={<DownloadIcon />}
            >
              Download CSV
            </Button>
            <Button
              onClick={processAllProperties}
              color="primary"
              variant="contained"
              disabled={updating}
              startIcon={
                updating ? <CircularProgress size={20} color="inherit" /> : null
              }
              sx={{
                bgcolor: "#eccb34",
                color: "#333",
                "&:hover": { bgcolor: "#d4b02a" },
              }}
            >
              {updating ? "Updating..." : "Update Sheets"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Fixed error dialog */}
        <Dialog
          open={errorDialogVisible}
          onClose={() => setErrorDialogVisible(false)}
        >
          <DialogTitle>Error</DialogTitle>
          <DialogContent>
            <div>{errorMsg}</div>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setErrorDialogVisible(false)}
              color="primary"
              sx={{ color: "#333" }}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    </ThemeProvider>
  );
};

export default BookingReportsTab;
