"use client";

import { useProperties } from "@/contexts/PropertyContext";
import PropertyStatusIndicator from "./PropertyStatusIndicator";
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
import MultiPropertySelector from "../components/MultiPropertySelector";
import MonthEndStatus from "../components/MonthEndStatus";
import DownloadIcon from "@mui/icons-material/Download";
import SendIcon from "@mui/icons-material/Send";
import ClientOnly from "@/app/components/ClientOnly";
import googleLimiter from "@/lib/utils/googleApiLimiter";
import MonthEndProcessTab from "./MonthEndProcessTab";

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
  const [successMessage, setSuccessMessage] = useState("");
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [updateStatus, setUpdateStatus] = useState(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [revenueSummary, setRevenueSummary] = useState(null);
  const [emailSent, setEmailSent] = useState(false);

  const [selectedProperties, setSelectedProperties] = useState([]);
  const [processingIndex, setProcessingIndex] = useState(-1);
  const [processingTotal, setProcessingTotal] = useState(0);
  const [processedProperties, setProcessedProperties] = useState([]);
  const [isMultiProcessing, setIsMultiProcessing] = useState(false);
  const [showProcessButton, setShowProcessButton] = useState(false);
  const [consolidatedSummary, setConsolidatedSummary] = useState([]);
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);

  // Add these new state variables at the top
  const [completedReports, setCompletedReports] = useState([]);
  const [reportsMonth, setReportsMonth] = useState(dayjs());
  const [loadingReports, setLoadingReports] = useState(false);

  // Add this to your state variables
  const [processedSummary, setProcessedSummary] = useState([]);

  // New state for invoice generation
  const [invoiceMonth, setInvoiceMonth] = useState(dayjs());
  const [selectedPropertyForInvoice, setSelectedPropertyForInvoice] =
    useState(null);
  const [invoiceResult, setInvoiceResult] = useState(null);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);

  // Add this state at the top with your other state variables
  const [isDryRun, setIsDryRun] = useState(false);

  // Add this state variable with your other state variables at the top of your component
  const [selectedPropertyStatus, setSelectedPropertyStatus] = useState(null);

  // Add this state variable with your other state variables
  const [notReadyProperties, setNotReadyProperties] = useState([]);
  const [notReadyDialogOpen, setNotReadyDialogOpen] = useState(false);

  const [monthEndSubTab, setMonthEndSubTab] = useState(0); // New state for sub-tab

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handlePropertiesChange = (selectedIds) => {
    setSelectedProperties(selectedIds);
  };

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

  const fetchBookingsForMultipleProperties = async () => {
    if (!selectedProperties.length) {
      setErrorMessage("Please select at least one property.");
      setErrorDialogOpen(true);
      return;
    }

    setLoading(true);
    setIsLoading(true);
    setBookings([]);

    try {
      const allBookings = [];

      // For each property, we'll need to fetch both IGMS and manual bookings
      const fetchPromises = selectedProperties.map(async (propId) => {
        // Create array to hold both types of bookings for this property
        const propertyBookings = [];

        // 1. Fetch IGMS bookings
        try {
          const igmsResponse = await fetchWithAuth(
            `/api/igms/bookings-with-guests/${propId}/${startDate.format(
              "YYYY-MM-DD"
            )}/${endDate.format("YYYY-MM-DD")}`
          );

          if (igmsResponse.ok) {
            const igmsData = await igmsResponse.json();
            if (igmsData.success && igmsData.bookings) {
              const propertyName =
                typeof allProperties[propId] === "object"
                  ? allProperties[propId].name
                  : allProperties[propId] || "Unknown Property";

              // Add property name to each booking
              const igmsBookingsWithProperty = igmsData.bookings.map(
                (booking) => ({
                  ...booking,
                  propertyName,
                  _propertyId: propId,
                  source: "igms", // Add source flag for debugging
                })
              );

              propertyBookings.push(...igmsBookingsWithProperty);
            }
          }
        } catch (igmsError) {
          console.error(
            `Error fetching IGMS bookings for property ${propId}:`,
            igmsError
          );
        }

        // 2. Fetch manual bookings from database
        try {
          const manualResponse = await fetchWithAuth(
            `/api/bookings?propertyId=${propId}&startDate=${startDate.format(
              "YYYY-MM-DD"
            )}&endDate=${endDate.format("YYYY-MM-DD")}&pageSize=100`
          );

          if (manualResponse.ok) {
            const manualData = await manualResponse.json();
            if (manualData.success && manualData.bookings) {
              // Filter to only include manual bookings (to avoid duplicates with IGMS)
              const manualBookings = manualData.bookings.filter(
                (booking) =>
                  booking.platform === "manual" || booking.platform === "direct"
              );

              const propertyName =
                typeof allProperties[propId] === "object"
                  ? allProperties[propId].name
                  : allProperties[propId] || "Unknown Property";

              // Add property name to each booking
              const manualBookingsWithProperty = manualBookings.map(
                (booking) => ({
                  ...booking,
                  propertyName,
                  _propertyId: propId,
                  source: "manual", // Add source flag for debugging
                })
              );

              propertyBookings.push(...manualBookingsWithProperty);
            }
          }
        } catch (manualError) {
          console.error(
            `Error fetching manual bookings for property ${propId}:`,
            manualError
          );
        }

        return propertyBookings;
      });

      // Wait for all property bookings to be fetched
      const results = await Promise.all(fetchPromises);

      // Flatten the array of arrays into a single array of bookings
      results.forEach((propertyBookings) => {
        allBookings.push(...propertyBookings);
      });

      // Remove duplicates (same booking code)
      const uniqueBookings = [];
      const bookingCodes = new Set();

      allBookings.forEach((booking) => {
        if (!bookingCodes.has(booking.bookingCode)) {
          bookingCodes.add(booking.bookingCode);
          uniqueBookings.push(booking);
        }
      });

      setBookings(uniqueBookings);

      console.log(
        `Found ${uniqueBookings.length} total bookings (${
          uniqueBookings.filter((b) => b.source === "manual").length
        } manual, ${
          uniqueBookings.filter((b) => b.source === "igms").length
        } IGMS)`
      );
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

  const handleSearchBookings = () => {
    if (startDate && endDate && !endDate.isBefore(startDate)) {
      fetchBookingsForMultipleProperties();
    } else {
      const newErrors = { ...errors };
      newErrors.dateRange = "Please select a valid date range.";
      setErrors(newErrors);
    }
  };

  // Modified handleMultiPropertyUpdate function - replaces existing version
  const handleMultiPropertyUpdate = async () => {
    if (!selectedProperties.length) {
      setErrorMessage("Please select at least one property.");
      setErrorDialogOpen(true);
      return;
    }

    if (!bookings.length) {
      setErrorMessage("No bookings available to update.");
      setErrorDialogOpen(true);
      return;
    }

    if (selectedProperties.length === 1 && selectedPropertyStatus !== "draft") {
      setErrorMessage(
        selectedPropertyStatus === "ready"
          ? "This property's revenue has already been updated. Cannot update again."
          : "This property is already complete. Cannot update again."
      );
      setErrorDialogOpen(true);
      return;
    }

    console.log("Starting property data collection...");

    // Reset processing state
    setConsolidatedSummary([]);
    setProcessedProperties([]);
    setProcessedSummary([]);
    setSummaryDialogOpen(false);
    setIsMultiProcessing(true);
    setProcessingTotal(selectedProperties.length);
    setProcessingIndex(0);

    try {
      // Prepare data for all properties at once
      const allPropertyData = [];
      let index = 0;

      for (const propertyId of selectedProperties) {
        setProcessingIndex(index++);

        try {
          const propertyData = await preparePropertyDataForProcessing(
            propertyId
          );
          allPropertyData.push(propertyData);

          // Update the consolidated summary as we go
          setConsolidatedSummary((prev) => [...prev, propertyData]);
        } catch (error) {
          console.error(
            `Error preparing data for property ${propertyId}:`,
            error
          );

          const propertyName =
            typeof allProperties[propertyId] === "object"
              ? allProperties[propertyId].name
              : allProperties[propertyId] || "Unknown Property";

          // Add error to summary
          setConsolidatedSummary((prev) => [
            ...prev,
            {
              propertyId,
              propertyName,
              error: error.message,
              hasError: true,
            },
          ]);
        }
      }

      // Show summary dialog for confirmation
      setTimeout(() => {
        setSummaryDialogOpen(true);
      }, 500);
    } catch (error) {
      console.error("Error collecting property data:", error);
      setErrorMessage(error.message);
      setErrorDialogOpen(true);
      setIsMultiProcessing(false);
    }
  };

  // Helper function to prepare property data
  const preparePropertyDataForProcessing = async (propertyId) => {
    const propertyName =
      typeof allProperties[propertyId] === "object"
        ? allProperties[propertyId].name
        : allProperties[propertyId] || "Unknown Property";

    // Filter bookings for current property
    const propertyBookings = bookings.filter(
      (booking) => booking._propertyId === propertyId
    );

    console.log(
      `Processing ${propertyName}: Found ${propertyBookings.length} bookings (${
        propertyBookings.filter((b) => b.source === "manual").length
      } manual, ${
        propertyBookings.filter((b) => b.source !== "manual").length
      } IGMS)`
    );

    if (propertyBookings.length === 0) {
      // No bookings for this property
      return {
        propertyId,
        propertyName,
        totalRevenue: 0,
        totalCleaning: 0,
        expenses: 0,
        netAmount: 0,
        bookingCount: 0,
        month: monthNames[startDate.month()],
        year: startDate.format("YYYY"),
        bookings: [],
      };
    }

    // Calculate revenue metrics
    const monthIndex = startDate.month();
    const monthName = monthNames[monthIndex];
    const year = startDate.format("YYYY");

    // Get expenses and owner info
    const [expensesResponse, ownerResponse] = await Promise.all([
      fetchWithAuth(`/api/sheets/expenses`, {
        method: "POST",
        body: JSON.stringify({
          propertyId,
          year,
          monthName,
        }),
      }),
      fetchWithAuth(`/api/properties/${propertyId}/owner`),
    ]);

    // Extract expense data
    const expensesData = await expensesResponse.json();
    const expensesTotal =
      expensesResponse.ok && expensesData.success
        ? parseFloat(expensesData.expensesTotal) || 0
        : 0;

    // Extract owner data
    const ownerData = await ownerResponse.json();
    let ownerInfo = null;
    let ownershipPercentage = 100;

    if (ownerResponse.ok && ownerData.success) {
      ownerInfo = ownerData.owner;
      if (ownerInfo) {
        ownershipPercentage = ownerInfo.ownership_percentage || 100;
      }
    }

    // Revenue calculation
    const paddedMonthNum = (monthIndex + 1).toString().padStart(2, "0");
    const unPadedMonthNum = (monthIndex + 1).toString();

    const monthYearKeyPadded = `${year}-${paddedMonthNum}`;
    const monthYearKeyUnpadded = `${year}-${unPadedMonthNum}`;

    // Enhanced calculation that works with both IGMS and manual bookings
    const totalRevenue = propertyBookings.reduce((sum, booking) => {
      // Handle different formats of revenueByMonth data
      let revenue = 0;

      if (booking.revenueByMonth) {
        // Try both padded and unpadded month keys
        revenue =
          booking.revenueByMonth[monthYearKeyPadded] ||
          booking.revenueByMonth[monthYearKeyUnpadded] ||
          0;
      } else if (booking.totalAmount && booking.month === monthName) {
        // Fallback for manual bookings that might store revenue differently
        revenue = parseFloat(booking.totalAmount);
      }

      return sum + parseFloat(revenue);
    }, 0);

    // Enhanced cleaning fee calculation
    const totalCleaning = propertyBookings.reduce((sum, booking) => {
      let cleaningFee = 0;

      if (booking.cleaningFee) {
        const cleaningMatch =
          booking.cleaningFeeMonth === monthYearKeyPadded ||
          booking.cleaningFeeMonth === monthYearKeyUnpadded ||
          booking.month === monthName;

        cleaningFee = cleaningMatch ? parseFloat(booking.cleaningFee) : 0;
      }

      return sum + cleaningFee;
    }, 0);

    // Fixed the calculation as discussed
    const netAmount = totalRevenue - totalCleaning;
    const ownerGrossAmount = (netAmount * ownershipPercentage) / 100;
    const ownerProfit = ownerGrossAmount - expensesTotal;

    return {
      propertyId,
      propertyName,
      totalRevenue,
      totalCleaning,
      expenses: expensesTotal,
      netAmount,
      ownershipPercentage,
      ownerProfit,
      ownerInfo,
      month: monthName,
      year,
      bookingCount: propertyBookings.length,
      bookings: propertyBookings,
    };
  };

  const processAllProperties = async () => {
    setSummaryDialogOpen(false);
    setUpdating(true);

    try {
      // Check if any properties are not ready before processing
      const notReady = [];

      for (const property of consolidatedSummary.filter((p) => !p.hasError)) {
        try {
          const monthNum =
            monthNames.findIndex((m) => m === property.month) + 1;
          const response = await fetchWithAuth(
            `/api/property-month-end?propertyId=${property.propertyId}&year=${property.year}&monthNumber=${monthNum}`
          );

          if (response.ok) {
            const statusData = await response.json();
            const status = statusData.data?.status || "draft";

            if (status !== "ready" && status !== "complete") {
              notReady.push({
                ...property,
                currentStatus: status,
              });
            }
          }
        } catch (error) {
          console.error(
            `Error checking status for ${property.propertyName}:`,
            error
          );
        }
      }

      // If we found properties that aren't ready, show dialog instead of proceeding
      if (notReady.length > 0) {
        setNotReadyProperties(notReady);
        setNotReadyDialogOpen(true);
        setUpdating(false);
        return;
      }

      // Continue with the existing processing code...
      // Filter valid properties (no errors)
      const propertiesToProcess = consolidatedSummary.filter(
        (prop) => !prop.hasError
      );

      // Add tracking arrays for success and failure
      const successfullyProcessed = [];
      const failedProperties = [];

      const BATCH_SIZE = 5; // Process 5 properties at a time
      const BATCH_PAUSE = 60000; // 60 second pause between batches

      // Calculate total batches for progress display
      const totalBatches = Math.ceil(propertiesToProcess.length / BATCH_SIZE);

      // Process in batches
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        // Get the current batch of properties
        const startIdx = batchIndex * BATCH_SIZE;
        const endIdx = Math.min(
          startIdx + BATCH_SIZE,
          propertiesToProcess.length
        );
        const currentBatch = propertiesToProcess.slice(startIdx, endIdx);

        // Add batch header to processed properties
        setProcessedProperties((prev) => [
          ...prev,
          {
            propertyId: "batch-header",
            propertyName: `Processing Batch ${
              batchIndex + 1
            } of ${totalBatches}`,
            success: true,
            isBatchHeader: true,
          },
        ]);

        // For each property in the current batch
        for (let i = 0; i < currentBatch.length; i++) {
          const property = currentBatch[i];
          const overallIndex = startIdx + i;
          setProcessingIndex(overallIndex);

          try {
            console.log(
              `Processing property: ${property.propertyName} (${
                overallIndex + 1
              }/${propertiesToProcess.length})`
            );

            // Check if inventory exists first - NOW INSIDE THE PROPERTY LOOP
            if (!isDryRun) {
              const statusResponse = await fetchWithAuth(
                `/api/property-month-end?propertyId=${
                  property.propertyId
                }&year=${property.year}&monthNumber=${
                  monthNames.findIndex((m) => m === property.month) + 1
                }`
              );

              if (statusResponse.ok) {
                const statusData = await statusResponse.json();
                if (!statusData.data?.inventory_invoice_generated) {
                  // Generate inventory automatically if missing
                  console.log(
                    `Auto-generating inventory for ${property.propertyName}`
                  );

                  const inventoryResponse = await fetchWithAuth(
                    `/api/inventory/generate-auto`,
                    {
                      method: "POST",
                      body: JSON.stringify({
                        propertyId: property.propertyId,
                        propertyName: property.propertyName,
                        month: property.month,
                        year: property.year,
                        monthNumber:
                          monthNames.findIndex((m) => m === property.month) + 1,
                      }),
                    }
                  );

                  if (!inventoryResponse.ok) {
                    console.warn(
                      `Warning: Could not auto-generate inventory for ${property.propertyName}`
                    );
                  } else {
                    console.log(
                      `Successfully auto-generated inventory for ${property.propertyName}`
                    );
                  }
                }
              }
            }

            let result;

            if (isDryRun) {
              // Simulate successful API call without making actual changes
              console.log(`DRY RUN: Would update ${property.propertyName}`);
              result = {
                success: true,
                message: "Dry run - no changes made",
                spreadsheetUrl: "dry-run-id",
              };
            } else {
              result = await googleLimiter.schedule(async () => {
                // Update revenue sheet
                const response = await fetchWithAuth(`/api/sheets/revenue`, {
                  method: "PUT",
                  body: JSON.stringify({
                    propertyId: property.propertyId,
                    propertyName: property.propertyName,
                    bookings: property.bookings || [],
                    year: property.year,
                    monthName: property.month,
                    expensesTotal: property.expenses || 0,
                  }),
                });

                if (!response.ok) {
                  throw new Error(
                    `Failed to update revenue sheet: ${await response.text()}`
                  );
                }

                return await response.json();
              });
            }

            if (!result.success) {
              throw new Error(result.error || "Failed to update revenue sheet");
            }

            // Record the successful update in the month-end tracking
            await fetchWithAuth(`/api/property-month-end`, {
              method: "POST",
              body: JSON.stringify({
                propertyId: property.propertyId,
                propertyName: property.propertyName,
                year: property.year,
                month: property.month,
                monthNumber:
                  monthNames.findIndex((m) => m === property.month) + 1,
                statusType: "revenue",
                statusData: {
                  revenueAmount: property.totalRevenue || 0,
                  cleaningFeesAmount: property.totalCleaning || 0,
                  expensesAmount: property.expenses || 0,
                  netAmount: property.netAmount || 0,
                  bookingsCount: property.bookings?.length || 0,
                  sheetId: result?.spreadsheetUrl || "",
                  ownerPercentage: property.ownershipPercentage || 100,
                  ownerId: property.ownerInfo?.id || null,
                  ownerName: property.ownerInfo?.name || null,
                  ownerProfit: property.ownerProfit || 0,
                },
              }),
            });

            successfullyProcessed.push(property);

            // Update processing status
            setProcessedProperties((prev) => [
              ...prev,
              {
                propertyId: property.propertyId,
                propertyName: property.propertyName,
                success: true,
                message: isDryRun
                  ? "Dry run - no changes made"
                  : "Revenue updated and marked as Ready",
              },
            ]);
          } catch (error) {
            console.error(`Error processing ${property.propertyName}:`, error);
            // Add to failed list
            failedProperties.push({
              propertyName: property.propertyName,
              propertyId: property.propertyId,
              error: error.message,
            });

            setProcessedProperties((prev) => [
              ...prev,
              {
                propertyId: property.propertyId,
                propertyName: property.propertyName,
                success: false,
                error: error.message,
              },
            ]);
          }
        }

        // If this isn't the last batch, add a pause before the next batch
        if (batchIndex < totalBatches - 1) {
          // Add a status message about the pause
          setProcessedProperties((prev) => [
            ...prev,
            {
              propertyId: "pause-indicator",
              propertyName: `Pausing for ${
                BATCH_PAUSE / 1000
              } seconds before next batch...`,
              success: true,
              isPause: true,
            },
          ]);

          // Wait between batches to avoid hitting API limits
          await new Promise((resolve) => setTimeout(resolve, BATCH_PAUSE));
        }
      }

      // Show completion message
      setProcessedProperties((prev) => [
        ...prev,
        {
          propertyId: "complete",
          propertyName: "✅ ALL PROPERTIES PROCESSED ✅",
          success: true,
          message: "All properties have been processed successfully.",
        },
      ]);

      // Log the failures summary if any
      if (failedProperties.length > 0) {
        console.error("=== FAILED PROPERTIES SUMMARY ===");
        console.error(
          `${failedProperties.length} properties failed to process:`
        );
        failedProperties.forEach((prop, index) => {
          console.error(`${index + 1}. ${prop.propertyName}: ${prop.error}`);
        });
        console.error("=====================================");

        // Add a summary to the processed properties list
        setProcessedProperties((prev) => [
          ...prev,
          {
            propertyId: "failed-summary",
            propertyName: `⚠️ ${failedProperties.length} properties failed to process`,
            success: false,
            error: "See console for details",
          },
        ]);
      } else {
        console.log("✅ All properties processed successfully!");
      }

      // Update processedSummary
      setProcessedSummary(successfullyProcessed);
    } catch (error) {
      console.error("Error in processAllProperties:", error);
      setErrorMessage(`Error: ${error.message}`);
      setErrorDialogOpen(true);
    } finally {
      setUpdating(false);
      setIsMultiProcessing(false);
    }
  };

  // Move fetchCompletedReports outside the useEffect to make it available throughout the component
  const fetchCompletedReports = async (month, year) => {
    setLoadingReports(true);
    try {
      console.log(`Fetching reports for ${month} ${year}`);

      // Use the /completed endpoint
      const response = await fetchWithAuth(
        `/api/property-month-end/completed?month=${encodeURIComponent(
          month
        )}&year=${encodeURIComponent(year)}`
      );

      console.log(`Response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error Response:", errorText);
        throw new Error(`Failed to fetch reports (${response.status})`);
      }

      const data = await response.json();
      console.log(`Successfully fetched ${data.reports?.length || 0} reports`);
      setCompletedReports(data.reports || []);
    } catch (error) {
      console.error("Failed to fetch completed reports:", error);
      setErrorMessage(error.message || "Failed to fetch reports.");
      setErrorDialogOpen(true);
      setCompletedReports([]); // Set empty array on error
    } finally {
      setLoadingReports(false);
    }
  };

  // Then modify the useEffect to use this function
  useEffect(() => {
    if (activeTab === 2) {
      const month = reportsMonth.format("MMMM");
      const year = reportsMonth.format("YYYY");
      fetchCompletedReports(month, year);
    }
  }, [activeTab, reportsMonth]);

  const handleSummaryDialogClose = () => {
    setSummaryDialogOpen(false);
    setIsMultiProcessing(false);
  };

  /// Modify this function to simplify the CSV output
  const downloadSummaryCSV = (properties) => {
    if (!properties || properties.length === 0) return;

    // Simplified CSV content with just property name and owner payment
    let csvContent = "Property Name,Owner Payment\n";

    properties.forEach((property) => {
      if (!property.hasError) {
        csvContent += `"${property.propertyName}",${(
          property.ownerProfit || 0
        ).toFixed(2)}\n`;
      }
    });

    // Create download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `month-end-summary-${startDate.format("MMMM-YYYY")}.csv`
    );
    document.body.appendChild(link);

    // Download it
    link.click();

    // Clean up
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  };

  // 2. Add email functionality to the Month End Tab
  const sendOwnerEmails = async () => {
    if (!completedReports.length) return;

    setUpdating(true);
    let successCount = 0;
    let errorCount = 0;
    let noOwnerCount = 0;
    let ownerMap = new Map(); // Cache for looked-up owners

    try {
      for (const report of completedReports) {
        try {
          // Skip already sent emails
          if (report.owner_email_sent) {
            continue;
          }

          // Try to get owner ID from report or look it up
          let ownerId = report.owner_id;

          if (!ownerId) {
            // Try to fetch the owner directly if not cached
            if (!ownerMap.has(report.property_id)) {
              try {
                const ownerResponse = await fetchWithAuth(
                  `/api/properties/${report.property_id}/owner`
                );
                if (ownerResponse.ok) {
                  const ownerData = await ownerResponse.json();
                  if (
                    ownerData.success &&
                    ownerData.owner &&
                    ownerData.owner.id
                  ) {
                    ownerMap.set(report.property_id, ownerData.owner.id);
                    ownerId = ownerData.owner.id;
                    console.log(
                      `Found owner ID ${ownerId} for property ${report.property_name}`
                    );
                  } else {
                    ownerMap.set(report.property_id, null);
                  }
                }
              } catch (lookupError) {
                console.error("Failed to lookup owner:", lookupError);
              }
            } else {
              ownerId = ownerMap.get(report.property_id);
            }
          }

          if (!ownerId) {
            console.warn(`No owner ID for property: ${report.property_name}`);
            noOwnerCount++;
            continue;
          }

          console.log(
            `Sending email for property: ${report.property_name}, owner ID: ${ownerId}`
          );

          const response = await fetchWithAuth(`/api/email/send-owner-report`, {
            method: "POST",
            body: JSON.stringify({
              ownerId: ownerId,
              propertyId: report.property_id,
              propertyName: report.property_name,
              month: report.month,
              year: report.year,
              totalRevenue: parseFloat(report.revenue_amount || 0),
              totalCleaning: parseFloat(report.cleaning_fees_amount || 0),
              expenses: parseFloat(report.expenses_amount || 0),
              profit: parseFloat(report.owner_profit || 0),
              bookingCount: report.bookings_count || 0,
              spreadsheetUrl: report.sheet_id
                ? `https://docs.google.com/spreadsheets/d/${report.sheet_id}/edit`
                : "",
            }),
          });

          if (response.ok) {
            successCount++;
            // Update owner_email_sent status
            await fetchWithAuth(`/api/property-month-end`, {
              method: "POST",
              body: JSON.stringify({
                propertyId: report.property_id,
                year: report.year,
                monthNumber: report.month_number,
                statusType: "email",
                statusData: {
                  ownerName: report.owner_name,
                  ownerProfit: report.owner_profit,
                },
              }),
            });
          } else {
            errorCount++;
            console.error(`Failed to send email for ${report.property_name}`);
          }
        } catch (err) {
          errorCount++;
          console.error(
            `Error sending email for ${report.property_name}:`,
            err
          );
        }
      }

      // Updated result message to include properties with no owner
      setErrorMessage(
        `Email sending complete. Success: ${successCount}, Failed: ${errorCount}${
          noOwnerCount > 0 ? `, Properties with no owner: ${noOwnerCount}` : ""
        }`
      );
      setErrorDialogOpen(true);

      // Refresh reports
      const month = reportsMonth.format("MMMM");
      const year = reportsMonth.format("YYYY");
      fetchCompletedReports(month, year);
    } catch (error) {
      console.error("Error sending owner emails:", error);
      setErrorMessage("Failed to send owner emails: " + error.message);
      setErrorDialogOpen(true);
    } finally {
      setUpdating(false);
    }
  };

  // Add this function at the top of your file with the other useEffect hooks
  useEffect(() => {
    if (activeTab === 2) {
      const month = reportsMonth.format("MMMM");
      const year = reportsMonth.format("YYYY");
      fetchCompletedReports(month, year);
    }
  }, [activeTab, reportsMonth]);

  // Also add the missing downloadReportsSpreadsheet function
  const downloadReportsSpreadsheet = () => {
    if (!completedReports.length) return;

    // Create CSV content
    let csvContent =
      "Property Name,Revenue,Cleaning Fees,Expenses,Net Amount,Owner %,Owner Payment\n";

    completedReports.forEach((report) => {
      csvContent += `"${report.property_name}",${parseFloat(
        report.revenue_amount || 0
      ).toFixed(2)},${parseFloat(report.cleaning_fees_amount || 0).toFixed(
        2
      )},${parseFloat(report.expenses_amount || 0).toFixed(2)},${parseFloat(
        report.net_amount || 0
      ).toFixed(2)},${report.owner_percentage || 100},${parseFloat(
        report.owner_profit || 0
      ).toFixed(2)}\n`;
    });

    // Create download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `month-end-reports-${reportsMonth.format("MMMM-YYYY")}.csv`
    );
    document.body.appendChild(link);

    // Download it
    link.click();

    // Clean up
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  };

  const sendSingleOwnerEmail = async (report) => {
    try {
      setUpdating(true);

      // Check if status is appropriate before sending
      const statusCheckResponse = await fetchWithAuth(
        `/api/property-month-end/options?propertyId=${report.property_id}&year=${report.year}&monthNumber=${report.month_number}&checkEmail=true`
      );

      if (!statusCheckResponse.ok) {
        throw new Error("Failed to validate property status");
      }

      const statusCheck = await statusCheckResponse.json();

      if (!statusCheck.canSendEmail) {
        setErrorMessage(
          statusCheck.message || "Cannot send email: Property not ready"
        );
        setErrorDialogOpen(true);
        return;
      }

      console.log(
        `Sending email for property: ${report.property_name}, owner ID: ${ownerId}`
      );

      // Create a static copy of the spreadsheet for this report
      let spreadsheetUrl = "";
      if (report.sheet_id) {
        try {
          // Call the API to create a static copy
          const response = await fetchWithAuth(
            "/api/sheets/create-static-copy",
            {
              method: "POST",
              body: JSON.stringify({
                sourceSheetId: report.sheet_id,
                propertyName: report.property_name,
                month: report.month,
                year: report.year,
              }),
            }
          );

          if (response.ok) {
            const result = await response.json();
            if (result.success && result.sheetUrl) {
              spreadsheetUrl = result.sheetUrl;
              console.log(`Created static sheet copy: ${spreadsheetUrl}`);
            }
          }
        } catch (error) {
          console.error("Error creating static sheet copy:", error);
          // Fall back to original sheet if copy fails
          spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${report.sheet_id}/edit?usp=sharing`;
        }
      }

      const response = await fetchWithAuth(`/api/email/send-owner-report`, {
        method: "POST",
        body: JSON.stringify({
          ownerId: ownerId,
          propertyId: report.property_id,
          propertyName: report.property_name,
          month: report.month,
          year: report.year,
          totalRevenue: parseFloat(report.revenue_amount || 0),
          totalCleaning: parseFloat(report.cleaning_fees_amount || 0),
          expenses: parseFloat(report.expenses_amount || 0),
          profit: parseFloat(report.owner_profit || 0),
          bookingCount: report.bookings_count || 0,
          spreadsheetUrl:
            spreadsheetUrl ||
            `https://docs.google.com/spreadsheets/d/${report.sheet_id}/edit?usp=sharing`,
        }),
      });

      if (response.ok) {
        // Update the owner_email_sent status in the database
        await fetchWithAuth(`/api/property-month-end`, {
          method: "POST",
          body: JSON.stringify({
            propertyId: report.property_id,
            year: report.year,
            monthNumber: report.month_number,
            statusType: "email",
            statusData: {
              ownerName: report.owner_name,
              ownerProfit: report.owner_profit,
            },
          }),
        });

        // Show success message
        setErrorMessage(`Email sent successfully for ${report.property_name}`);
        setErrorDialogOpen(true);

        // Refresh the reports to show updated email status
        const month = reportsMonth.format("MMMM");
        const year = reportsMonth.format("YYYY");
        fetchCompletedReports(month, year);
      } else {
        throw new Error(`Failed to send email: ${await response.text()}`);
      }
    } catch (error) {
      console.error(`Error sending email for ${report.property_name}:`, error);
      setErrorMessage(`Failed to send email: ${error.message}`);
      setErrorDialogOpen(true);
    } finally {
      setUpdating(false);
    }
  };

  // Add near your other useEffect hooks
  useEffect(() => {
    const fetchPropertyStatus = async () => {
      if (selectedProperties.length === 1 && startDate) {
        try {
          const response = await fetchWithAuth(
            `/api/property-month-end?propertyId=${
              selectedProperties[0]
            }&year=${startDate.format("YYYY")}&monthNumber=${
              startDate.month() + 1
            }`
          );

          if (response.ok) {
            const data = await response.json();
            setSelectedPropertyStatus(data.data?.status || "draft");
            console.log(`Property status: ${data.data?.status || "draft"}`);
          } else {
            setSelectedPropertyStatus("draft");
          }
        } catch (error) {
          console.error("Error fetching property status:", error);
          setSelectedPropertyStatus("draft");
        }
      } else {
        setSelectedPropertyStatus(null);
      }
    };

    fetchPropertyStatus();
  }, [selectedProperties, startDate]);

  // Add this function right after processAllProperties or with your other functions
  const markPropertiesAsReady = async () => {
    // Show confirmation dialog instead of using undefined confirmDialog function
    setReadyConfirmMessage(
      "This will mark properties as Ready but will NOT update the sheets. Use with caution."
    );
    setReadyConfirmDialogOpen(true);
  };

  // New state for ready confirmation dialog
  const [readyConfirmDialogOpen, setReadyConfirmDialogOpen] = useState(false);
  const [readyConfirmMessage, setReadyConfirmMessage] = useState("");

  // New function to handle the confirmation
  const handleReadyConfirmation = async () => {
    setReadyConfirmDialogOpen(false);
    setUpdating(true);
    const results = [];

    try {
      for (const property of notReadyProperties) {
        try {
          const monthNum =
            monthNames.findIndex((m) => m === property.month) + 1;
          console.log(`Marking property as ready: ${property.propertyName}`);

          const response = await fetchWithAuth(
            `/api/property-month-end/status`,
            {
              method: "PUT",
              body: JSON.stringify({
                propertyId: property.propertyId,
                year: property.year,
                monthNumber: monthNum,
                status: "ready",
              }),
            }
          );

          if (response.ok) {
            results.push({
              propertyName: property.propertyName,
              success: true,
            });
          } else {
            results.push({
              propertyName: property.propertyName,
              success: false,
              error: "Failed to update status",
            });
          }
        } catch (error) {
          console.error(
            `Error updating status for ${property.propertyName}:`,
            error
          );
          results.push({
            propertyName: property.propertyName,
            success: false,
            error: error.message,
          });
        }
      }

      // Close the dialog
      setNotReadyDialogOpen(false);

      // Show results
      const successful = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;

      if (failed === 0) {
        setProcessedProperties((prev) => [
          ...prev,
          {
            propertyId: "status-update",
            propertyName: `Successfully marked ${successful} properties as ready`,
            success: true,
          },
        ]);

        // Continue with processing if all were successful
        processAllProperties();
      } else {
        setErrorMessage(
          `Marked ${successful} properties as ready, but ${failed} failed. Please try again.`
        );
        setErrorDialogOpen(true);
      }
    } catch (error) {
      console.error("Error marking properties as ready:", error);
      setErrorMessage(`Failed to mark properties as ready: ${error.message}`);
      setErrorDialogOpen(true);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <AdminProtected>
      <div className="flex flex-col h-full w-full p-6 bg-transparent">
        <div className="flex flex-col lg:flex-row w-full h-full gap-6">
          <div className="flex-1 bg-secondary/95 rounded-2xl shadow-lg backdrop-blur-sm overflow-hidden border border-primary/10">
            <div className="p-6 flex flex-col h-full">
              {/* Page header content */}
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
                  <div className="flex flex-col h-full overflow-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                      {/* Left Column */}
                      <div className="lg:col-span-1">
                        <div className="bg-white/50 rounded-xl shadow-sm border border-primary/10 p-4 mb-4">
                          <h3 className="text-lg font-semibold mb-3 text-dark">
                            Search Criteria
                          </h3>

                          {/* Property Selector */}
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-dark mb-1 ml-1">
                              Properties
                            </label>
                            <MultiPropertySelector
                              properties={allProperties}
                              selectedProperties={selectedProperties}
                              onChange={handlePropertiesChange}
                              loading={loading || propertiesLoading}
                              label="Select Properties"
                            />
                          </div>

                          {/* Date Range Selector */}
                          <LocalizationProvider dateAdapter={AdapterDayjs}>
                            <div className="space-y-4">
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

                              {errors.dateRange && (
                                <p className="text-primary text-sm">
                                  {errors.dateRange}
                                </p>
                              )}
                            </div>
                          </LocalizationProvider>

                          {/* Action Buttons */}
                          <div className="flex flex-col gap-2 mt-4">
                            <Button
                              variant="contained"
                              onClick={handleSearchBookings}
                              disabled={loading || !selectedProperties.length}
                              fullWidth
                              className="bg-primary hover:bg-secondary hover:text-primary text-dark font-medium py-2 rounded-lg shadow-md transition-colors duration-300"
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
                                <span className="flex items-center justify-center">
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
                              onClick={handleMultiPropertyUpdate}
                              disabled={
                                updating ||
                                !bookings.length ||
                                isMultiProcessing
                              }
                              fullWidth
                              className="bg-primary hover:bg-secondary hover:text-primary text-dark font-medium py-2 rounded-lg shadow-md transition-colors duration-300"
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
                                <span className="flex items-center justify-center">
                                  <CircularProgress
                                    size={20}
                                    sx={{ color: "#333333", mr: 1 }}
                                  />
                                  Updating...
                                </span>
                              ) : (
                                <>
                                  {selectedProperties.length === 1 &&
                                  selectedPropertyStatus === "ready"
                                    ? "Update Revenue Sheet"
                                    : selectedProperties.length === 1 &&
                                      selectedPropertyStatus === "complete"
                                    ? "Revenue Already Updated"
                                    : "Calculate Month End"}
                                </>
                              )}
                            </Button>

                            {/* Add this toggle button near your other action buttons */}
                            <Button
                              variant="outlined"
                              onClick={() => setIsDryRun(!isDryRun)}
                              sx={{
                                textTransform: "none",
                                borderColor: isDryRun ? "#4caf50" : "#f44336",
                                color: isDryRun ? "#4caf50" : "#f44336",
                                marginBottom: 2,
                              }}
                            >
                              {isDryRun ? "Dry Run: ON" : "Dry Run: OFF"}
                            </Button>
                          </div>
                        </div>

                        {/* Month-End Status */}
                        <div className="mb-4">
                          <h3 className="text-lg font-semibold mb-2 text-dark">
                            Month-End Status
                          </h3>
                          {selectedProperties.length === 1 && startDate && (
                            <MonthEndStatus
                              propertyId={selectedProperties[0]}
                              propertyName={
                                typeof allProperties[selectedProperties[0]] ===
                                "object"
                                  ? allProperties[selectedProperties[0]].name
                                  : allProperties[selectedProperties[0]]
                              }
                              year={startDate.format("YYYY")}
                              month={monthNames[startDate.month()]}
                              monthNumber={startDate.month() + 1}
                              onGenerateInventory={() => {
                                // Navigate to inventory section or open inventory modal
                                navigate("/inventory/generate", {
                                  state: {
                                    propertyId: selectedProperties[0],
                                    month: startDate.format("MMMM"),
                                    year: startDate.format("YYYY"),
                                  },
                                });
                              }}
                            />
                          )}
                          {selectedProperties.length > 1 && (
                            <p className="text-sm text-gray-500">
                              Select a single property to view month-end status
                            </p>
                          )}
                        </div>

                        {/* Status and Progress */}
                        {updateStatus && (
                          <div
                            className={`mb-4 p-3 rounded-lg border ${
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

                      {/* Right Column - Bookings */}
                      <div className="lg:col-span-2">
                        <div className="bg-white/50 rounded-xl shadow-sm border border-primary/10 h-full flex flex-col">
                          <div className="py-3 px-4 bg-primary/10 rounded-t-xl flex justify-between items-center">
                            <h3 className="font-semibold text-dark">
                              Bookings
                            </h3>
                            <span className="text-dark">
                              Total: {bookings.length}
                            </span>
                          </div>

                          <div className="flex-1 overflow-y-auto p-4">
                            {loading ? (
                              <div className="flex items-center justify-center h-40">
                                <CircularProgress sx={{ color: "#eccb34" }} />
                              </div>
                            ) : bookings.length > 0 ? (
                              <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
                                {bookings.map((booking) => (
                                  <BookingCard
                                    key={`${booking.bookingCode}-${booking.guestUid}`}
                                    booking={booking}
                                  />
                                ))}
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center h-40">
                                <p className="text-dark text-lg">
                                  No bookings found
                                </p>
                                <p className="text-dark/60 mt-2">
                                  Select properties and date range, then click
                                  &quot;Search Bookings&quot;
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
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
                  <div className="flex-1 h-full overflow-auto p-4">
                    <ClientOnly
                      fallback={
                        <div className="p-4">Loading month-end reports...</div>
                      }
                    >
                      {/* Add a tab sub-system within the Month-End Reports */}
                      <Box sx={{ width: "100%", mb: 3 }}>
                        <Tabs
                          value={monthEndSubTab}
                          onChange={(e, newValue) =>
                            setMonthEndSubTab(newValue)
                          }
                          sx={{
                            mb: 2,
                            borderBottom: "1px solid rgba(236, 203, 52, 0.2)",
                            "& .MuiTab-root": {
                              textTransform: "none",
                              minWidth: 100,
                            },
                            "& .Mui-selected": {
                              color: "#eccb34",
                            },
                            "& .MuiTabs-indicator": {
                              backgroundColor: "#eccb34",
                            },
                          }}
                        >
                          <Tab label="Reports" />
                          <Tab label="Process Management" />
                        </Tabs>
                      </Box>

                      {monthEndSubTab === 0 ? (
                        // Current Month-End Reports implementation
                        <div className="bg-white/50 rounded-xl shadow-sm border border-primary/10 p-6">
                          <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-semibold text-dark">
                              Month-End Reports
                            </h3>

                            <div className="flex gap-4 items-center">
                              <LocalizationProvider dateAdapter={AdapterDayjs}>
                                <DatePicker
                                  value={reportsMonth}
                                  onChange={setReportsMonth}
                                  views={["month", "year"]}
                                  className="bg-white rounded-lg border border-primary/30"
                                  slotProps={{
                                    textField: {
                                      size: "small",
                                      sx: {
                                        "& .MuiOutlinedInput-root": {
                                          borderColor: "#eccb34",
                                        },
                                      },
                                    },
                                  }}
                                />
                              </LocalizationProvider>

                              <Button
                                variant="contained"
                                onClick={downloadReportsSpreadsheet}
                                disabled={!completedReports.length}
                                className="bg-primary hover:bg-secondary hover:text-primary text-dark"
                                sx={{
                                  textTransform: "none",
                                  backgroundColor: "#eccb34",
                                  "&:hover": {
                                    backgroundColor: "#d4b02a",
                                  },
                                }}
                              >
                                Download Spreadsheet
                              </Button>

                              {/* New Email Button */}
                              <Button
                                variant="contained"
                                onClick={sendOwnerEmails}
                                disabled={!completedReports.length}
                                startIcon={
                                  updating ? (
                                    <CircularProgress
                                      size={20}
                                      sx={{ color: "white" }}
                                    />
                                  ) : (
                                    <SendIcon />
                                  )
                                }
                                className="bg-primary hover:bg-secondary hover:text-primary text-dark"
                                sx={{
                                  textTransform: "none",
                                  backgroundColor:
                                    completedReports.length > 0
                                      ? "#3f51b5"
                                      : "#9e9e9e",
                                  color: "white",
                                  "&:hover": {
                                    backgroundColor:
                                      completedReports.length > 0
                                        ? "#303f9f"
                                        : "#9e9e9e",
                                  },
                                }}
                              >
                                {completedReports.length > 0
                                  ? `Send Owner Emails (${completedReports.length})`
                                  : "No Properties Ready for Emails"}
                              </Button>
                            </div>
                          </div>

                          {loadingReports ? (
                            <div className="flex justify-center py-8">
                              <CircularProgress sx={{ color: "#eccb34" }} />
                            </div>
                          ) : completedReports.length > 0 ? (
                            <div className="overflow-auto">
                              {/* Status Statistics */}
                              <div className="bg-white/80 rounded-xl shadow-sm border border-primary/10 p-4 mb-6">
                                <h3 className="text-lg font-semibold mb-3 text-dark">
                                  Month-End Status
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                    <h4 className="text-sm font-semibold text-orange-700 mb-1">
                                      Draft
                                    </h4>
                                    <div className="flex items-center justify-between">
                                      <span className="text-2xl font-bold text-orange-600">
                                        {
                                          completedReports.filter(
                                            (r) =>
                                              !r.status || r.status === "draft"
                                          ).length
                                        }
                                      </span>
                                      <span className="text-xs text-orange-500">
                                        Need to update revenue
                                      </span>
                                    </div>
                                  </div>

                                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <h4 className="text-sm font-semibold text-blue-700 mb-1">
                                      Ready
                                    </h4>
                                    <div className="flex items-center justify-between">
                                      <span className="text-2xl font-bold text-blue-600">
                                        {
                                          completedReports.filter(
                                            (r) => r.status === "ready"
                                          ).length
                                        }
                                      </span>
                                      <span className="text-xs text-blue-500">
                                        Ready for owner emails
                                      </span>
                                    </div>
                                  </div>

                                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <h4 className="text-sm font-semibold text-green-700 mb-1">
                                      Complete
                                    </h4>
                                    <div className="flex items-center justify-between">
                                      <span className="text-2xl font-bold text-green-600">
                                        {
                                          completedReports.filter(
                                            (r) => r.status === "complete"
                                          ).length
                                        }
                                      </span>
                                      <span className="text-xs text-green-500">
                                        All done!
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {completedReports.filter(
                                  (r) => r.status === "ready"
                                ).length > 0 && (
                                  <div className="bg-blue-100 border border-blue-300 rounded p-3 text-blue-800">
                                    <strong>Ready for Emails:</strong>{" "}
                                    {
                                      completedReports.filter(
                                        (r) => r.status === "ready"
                                      ).length
                                    }{" "}
                                    properties are ready to send owner emails.
                                  </div>
                                )}
                              </div>

                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-primary/10">
                                  <tr>
                                    <th
                                      scope="col"
                                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                    >
                                      Property
                                    </th>
                                    <th
                                      scope="col"
                                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                    >
                                      Revenue
                                    </th>
                                    <th
                                      scope="col"
                                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                    >
                                      Net Amount
                                    </th>
                                    <th
                                      scope="col"
                                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                    >
                                      Owner %
                                    </th>
                                    <th
                                      scope="col"
                                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                    >
                                      Owner Payment
                                    </th>
                                    <th
                                      scope="col"
                                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                    >
                                      Status
                                    </th>
                                    <th
                                      scope="col"
                                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                    >
                                      Actions
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {completedReports.map((report) => (
                                    <tr
                                      key={report.property_id}
                                      className="hover:bg-gray-50"
                                    >
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="font-medium text-gray-900">
                                          {report.property_name}
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        $
                                        {parseFloat(
                                          report.revenue_amount || 0
                                        ).toFixed(2)}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        $
                                        {parseFloat(
                                          report.net_amount || 0
                                        ).toFixed(2)}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        {report.owner_percentage || 100}%
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap font-medium text-green-600">
                                        $
                                        {parseFloat(
                                          report.owner_profit || 0
                                        ).toFixed(2)}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <PropertyStatusIndicator
                                          status={report.status || "draft"}
                                        />
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <Button
                                          variant="contained"
                                          onClick={() =>
                                            sendSingleOwnerEmail(report)
                                          }
                                          disabled={
                                            updating || report.owner_email_sent
                                          }
                                          startIcon={<SendIcon />}
                                          size="small"
                                          sx={{
                                            textTransform: "none",
                                            backgroundColor:
                                              report.owner_email_sent
                                                ? "#cccccc"
                                                : "#3f51b5",
                                            color: "white",
                                            "&:hover": {
                                              backgroundColor:
                                                report.owner_email_sent
                                                  ? "#cccccc"
                                                  : "#303f9f",
                                            },
                                            fontSize: "0.75rem",
                                            padding: "2px 8px",
                                          }}
                                        >
                                          {report.owner_email_sent
                                            ? "Sent"
                                            : "Email"}
                                        </Button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="text-center py-8 text-gray-500">
                              No completed month-end reports found for{" "}
                              {reportsMonth.format("MMMM YYYY")}
                            </div>
                          )}
                        </div>
                      ) : (
                        // New Process Management tab
                        <MonthEndProcessTab
                          year={reportsMonth.format("YYYY")}
                          month={reportsMonth.month()}
                          onSuccess={(message) => {
                            setSuccessMessage(message);
                            setSuccessDialogOpen(true); // Open the dialog to show the message
                            // Refresh reports after successful status changes
                            fetchCompletedReports(
                              reportsMonth.format("MMMM"),
                              reportsMonth.format("YYYY")
                            );
                          }}
                          onError={setErrorMessage}
                        />
                      )}
                    </ClientOnly>
                  </div>
                )}

                {activeTab === 3 && (
                  <div className="flex-1 h-full overflow-auto p-4">
                    <ClientOnly
                      fallback={
                        <div className="p-4">Loading inventory invoices...</div>
                      }
                    >
                      <div className="bg-white/50 rounded-xl shadow-sm border border-primary/10 p-6">
                        <div className="flex justify-between items-center mb-6">
                          <h3 className="text-xl font-semibold text-dark">
                            Inventory Invoices
                          </h3>

                          <div className="flex gap-4 items-center">
                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                              <DatePicker
                                value={invoiceMonth}
                                onChange={setInvoiceMonth}
                                views={["month", "year"]}
                                className="bg-white rounded-lg border border-primary/30"
                                slotProps={{
                                  textField: {
                                    size: "small",
                                    sx: {
                                      "& .MuiOutlinedInput-root": {
                                        borderColor: "#eccb34",
                                      },
                                    },
                                  },
                                }}
                              />
                            </LocalizationProvider>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                          {/* Property Selection Column */}
                          <div className="lg:col-span-1">
                            <div className="bg-white/80 rounded-xl shadow-sm border border-primary/10 p-4">
                              <h4 className="text-lg font-semibold mb-3 text-dark">
                                Select Property
                              </h4>

                              <div className="mb-4">
                                <MultiPropertySelector
                                  properties={allProperties}
                                  selectedProperties={
                                    selectedPropertyForInvoice
                                      ? [selectedPropertyForInvoice]
                                      : []
                                  }
                                  onChange={(ids) =>
                                    setSelectedPropertyForInvoice(
                                      ids.length > 0 ? ids[0] : null
                                    )
                                  }
                                  loading={loading || propertiesLoading}
                                  label="Select Property"
                                  singleSelection={true}
                                />
                              </div>

                              <Button
                                variant="contained"
                                onClick={generateInventoryInvoice}
                                disabled={
                                  !selectedPropertyForInvoice ||
                                  generatingInvoice
                                }
                                fullWidth
                                className="bg-primary hover:bg-secondary hover:text-primary text-dark font-medium py-2 rounded-lg shadow-md transition-colors duration-300"
                                sx={{
                                  textTransform: "none",
                                  fontSize: "1rem",
                                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                                  "&:hover": {
                                    boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                                  },
                                }}
                              >
                                {generatingInvoice ? (
                                  <span className="flex items-center justify-center">
                                    <CircularProgress
                                      size={20}
                                      sx={{ color: "#333333", mr: 1 }}
                                    />
                                    Generating...
                                  </span>
                                ) : (
                                  "Generate Inventory Invoice"
                                )}
                              </Button>
                            </div>

                            {/* Month End Status for Selected Property */}
                            {selectedPropertyForInvoice && (
                              <div className="mt-4">
                                <MonthEndStatus
                                  propertyId={selectedPropertyForInvoice}
                                  propertyName={
                                    typeof allProperties[
                                      selectedPropertyForInvoice
                                    ] === "object"
                                      ? allProperties[
                                          selectedPropertyForInvoice
                                        ].name
                                      : allProperties[
                                          selectedPropertyForInvoice
                                        ]
                                  }
                                  year={invoiceMonth.format("YYYY")}
                                  month={invoiceMonth.format("MMMM")}
                                  monthNumber={invoiceMonth.month() + 1}
                                />
                              </div>
                            )}
                          </div>

                          {/* Invoice Results Column */}
                          <div className="lg:col-span-2">
                            <div className="bg-white/80 rounded-xl shadow-sm border border-primary/10 p-4 h-full">
                              <h4 className="text-lg font-semibold mb-3 text-dark">
                                Invoice Result
                              </h4>

                              {invoiceResult ? (
                                <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
                                  <div className="flex items-center mb-3">
                                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mr-3">
                                      <span className="text-primary font-bold">
                                        ✓
                                      </span>
                                    </div>
                                    <h5 className="text-lg font-semibold text-dark">
                                      Invoice Generated Successfully
                                    </h5>
                                  </div>

                                  <div className="grid grid-cols-2 gap-4 mt-4">
                                    <div>
                                      <p className="text-sm text-gray-500">
                                        Property
                                      </p>
                                      <p className="font-medium">
                                        {invoiceResult.propertyName}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-gray-500">
                                        Period
                                      </p>
                                      <p className="font-medium">
                                        {invoiceResult.month}{" "}
                                        {invoiceResult.year}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-gray-500">
                                        Status
                                      </p>
                                      <p className="font-medium">
                                        {invoiceResult.noItemsFound
                                          ? "No Items Found"
                                          : "Invoice Created"}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-gray-500">
                                        Total Amount
                                      </p>
                                      <p className="font-medium">
                                        $
                                        {parseFloat(
                                          invoiceResult.totalAmount || 0
                                        ).toFixed(2)}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center justify-center h-[300px] text-gray-500">
                                  Select a property and click &quot;Generate
                                  Inventory Invoice&quot; to create an invoice
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </ClientOnly>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        PaperProps={{
          sx: {
            backgroundColor: "#fafafa",
            color: "#333333",
            borderRadius: "12px",
            border: "1px solid rgba(236, 203, 52, 0.2)",
            maxWidth: "500px",
            width: "100%",
          },
        }}
      >
        <DialogTitle
          sx={{
            color: "#333333",
            borderBottom: "1px solid #eee",
            paddingBottom: 1,
          }}
        >
          {revenueSummary?.isMultiProperty
            ? `Confirm Update for ${revenueSummary.propertyName} (${
                processingIndex + 1
              }/${processingTotal})`
            : "Confirm Revenue Update"}
        </DialogTitle>
        <DialogContent>
          {revenueSummary && (
            <Box sx={{ mt: 2 }}>
              <div className="bg-white border border-primary/10 rounded-lg p-4 mb-3">
                <h3 className="text-lg font-semibold mb-2 text-dark">
                  Revenue Summary
                </h3>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <div className="text-dark text-sm">Property:</div>
                  <div className="text-dark font-medium">
                    {revenueSummary.propertyName}
                  </div>

                  <div className="text-dark text-sm">Period:</div>
                  <div className="text-dark font-medium">
                    {revenueSummary.month} {revenueSummary.year}
                  </div>

                  <div className="text-dark text-sm">Total Revenue:</div>
                  <div className="text-dark font-medium">
                    ${revenueSummary.totalRevenue.toFixed(2)}
                  </div>

                  <div className="text-dark text-sm">Net Amount:</div>
                  <div className="text-dark font-medium">
                    ${revenueSummary.netAmount.toFixed(2)}
                  </div>

                  <div className="text-dark text-sm">Bookings:</div>
                  <div className="text-dark font-medium">
                    {revenueSummary.bookingCount}
                  </div>

                  {revenueSummary.ownerInfo && (
                    <>
                      <div className="text-dark text-sm">Owner:</div>
                      <div className="text-dark font-medium">
                        {revenueSummary.ownerInfo.name}
                      </div>

                      <div className="text-dark text-sm">Ownership %:</div>
                      <div className="text-dark font-medium">
                        {revenueSummary.ownershipPercentage}%
                      </div>

                      <div className="text-dark text-sm">Owner Profit:</div>
                      <div className="text-dark font-medium font-bold text-green-700">
                        ${revenueSummary.ownerProfit.toFixed(2)}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <DialogContentText>
                Are you sure you want to update the revenue sheet and{" "}
                {revenueSummary.ownerInfo ? "send owner report" : "process"} for
                this property?
              </DialogContentText>
            </Box>
          )}
        </DialogContent>
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
        <DialogTitle>Error</DialogTitle>
        <DialogContent>
          <DialogContentText>{errorMessage}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setErrorDialogOpen(false)}
            color="primary"
            sx={{
              textTransform: "none",
              fontSize: "1rem",
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Month End Summary Dialog */}
      <Dialog
        open={summaryDialogOpen}
        onClose={handleSummaryDialogClose} // Use the new handler
        PaperProps={{
          sx: {
            backgroundColor: "#fafafa",
            color: "#333333",
            borderRadius: "12px",
            border: "1px solid rgba(236, 203, 52, 0.2)",
            maxWidth: "800px",
            width: "100%",
          },
        }}
      >
        <DialogTitle
          sx={{
            color: "#333333",
            borderBottom: "1px solid #eee",
            paddingBottom: 1,
          }}
        >
          {isDryRun ? "DRY RUN - " : ""}Month End Summary - Confirm All Updates
        </DialogTitle>
        <DialogContent>
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-3">
              {startDate.format("MMMM YYYY")} Month End Summary
            </h3>

            {/* Fix: Check consolidatedSummary if processedSummary is empty */}
            {processedSummary.length > 0 || consolidatedSummary.length > 0 ? (
              <div className="flex flex-col gap-4">
                <div className="flex justify-end mb-2">
                  <Button
                    variant="outlined"
                    onClick={() =>
                      downloadSummaryCSV(
                        processedSummary.length > 0
                          ? processedSummary
                          : consolidatedSummary
                      )
                    }
                    startIcon={<DownloadIcon />}
                    sx={{
                      textTransform: "none",
                      borderColor: "#eccb34",
                      color: "#333333",
                      "&:hover": {
                        borderColor: "#d4b02a",
                        backgroundColor: "rgba(236, 203, 52, 0.1)",
                      },
                    }}
                  >
                    Download CSV
                  </Button>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-primary/10">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Property
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Revenue
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cleaning
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Expenses
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Net
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Owner %
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Owner Payment
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {/* Use whichever data source has content */}
                      {(processedSummary.length > 0
                        ? processedSummary
                        : consolidatedSummary
                      ).map((property, index) => (
                        <tr
                          key={`${property.propertyId || "unknown"}-${index}`}
                          className={property.hasError ? "bg-red-50" : ""}
                        >
                          <td className="px-4 py-2 whitespace-nowrap">
                            <div className="font-medium text-gray-900">
                              {property.propertyName}
                            </div>
                            {property.hasError && (
                              <div className="text-xs text-red-600">
                                Error: {property.error}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            {!property.hasError &&
                              `$${parseFloat(
                                property.totalRevenue || 0
                              ).toFixed(2)}`}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            {!property.hasError &&
                              `$${parseFloat(
                                property.totalCleaning || 0
                              ).toFixed(2)}`}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            {!property.hasError &&
                              `$${parseFloat(property.expenses || 0).toFixed(
                                2
                              )}`}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            {!property.hasError &&
                              `$${parseFloat(property.netAmount || 0).toFixed(
                                2
                              )}`}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            {!property.hasError &&
                              `${parseFloat(
                                property.ownershipPercentage || 100
                              ).toFixed(0)}%`}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap font-medium text-green-600">
                            {!property.hasError &&
                              `$${parseFloat(property.ownerProfit || 0).toFixed(
                                2
                              )}`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40">
                <CircularProgress sx={{ color: "#eccb34" }} />
                <p className="mt-4 text-gray-500">Loading summary data...</p>
              </div>
            )}

            {isDryRun && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800">
                  <strong>Dry Run Mode:</strong> This will simulate processing
                  all properties but won&apos;t make any actual changes to
                  sheets, send emails, or create invoices.
                </p>
              </div>
            )}

            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-dark">
                <strong>Important:</strong> This will update revenue sheets,
                generate inventory invoices, and send owner reports for all
                properties above. Continue?
              </p>
            </div>
          </div>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleSummaryDialogClose}
            color="primary"
            sx={{
              textTransform: "none",
              fontSize: "1rem",
            }}
          >
            Close
          </Button>
          <Button
            onClick={processAllProperties}
            color="primary"
            variant="contained"
            sx={{
              textTransform: "none",
              fontSize: "1rem",
              backgroundColor: "#eccb34",
              "&:hover": {
                backgroundColor: "#d4b02a",
              },
            }}
          >
            Confirm & Process All
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={notReadyDialogOpen}
        onClose={() => setNotReadyDialogOpen(false)}
        PaperProps={{
          sx: {
            backgroundColor: "#fafafa",
            color: "#333333",
            borderRadius: "12px",
            border: "1px solid rgba(236, 203, 52, 0.2)",
            maxWidth: "500px",
            width: "100%",
          },
        }}
      >
        <DialogTitle>Properties Not Ready</DialogTitle>
        <DialogContent>
          <DialogContentText>
            The following properties are not ready for processing. Please update
            their status to &quot;Ready&quot; before proceeding with the
            month-end processing.
          </DialogContentText>

          <div className="mt-4">
            <h4 className="text-lg font-semibold mb-2">Not Ready Properties</h4>

            <ul className="list-disc list-inside">
              {notReadyProperties.map((property) => (
                <li key={property.propertyId} className="text-dark">
                  {property.propertyName} - Current Status:{" "}
                  <span className="font-semibold">
                    {property.currentStatus}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setNotReadyDialogOpen(false)}
            color="primary"
            sx={{
              textTransform: "none",
              fontSize: "1rem",
            }}
          >
            Close
          </Button>
          <Button
            onClick={markPropertiesAsReady}
            color="primary"
            variant="contained"
            sx={{
              textTransform: "none",
              fontSize: "1rem",
              backgroundColor: "#eccb34",
              "&:hover": {
                backgroundColor: "#d4b02a",
              },
            }}
          >
            Mark as Ready
          </Button>
        </DialogActions>
      </Dialog>

      <div className="p-4 bg-white rounded-lg shadow-md border border-primary/10 mt-6">
        <h3 className="text-lg font-semibold mb-4 text-dark">
          Processed Properties
        </h3>

        {processedProperties.length === 0 ? (
          <p className="text-gray-500 text-sm">
            No properties have been processed yet.
          </p>
        ) : (
          processedProperties.map((item, index) => (
            <div
              key={`${item.propertyId}-${index}`}
              className={`p-3 mb-2 rounded-lg ${
                item.isBatchHeader
                  ? "bg-blue-100 border border-blue-300 font-semibold"
                  : item.isPause
                  ? "bg-gray-100 border border-gray-300 italic"
                  : item.success
                  ? "bg-green-50 border border-green-200"
                  : "bg-red-50 border border-red-200"
              }`}
            >
              <div className="flex items-center">
                {item.isBatchHeader ? (
                  <div className="w-6 h-6 rounded-full bg-blue-200 flex items-center justify-center mr-3">
                    <span className="text-blue-800">⚙️</span>
                  </div>
                ) : item.isPause ? (
                  <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                    <span className="text-gray-800">⏱️</span>
                  </div>
                ) : item.success ? (
                  <div className="w-6 h-6 rounded-full bg-green-200 flex items-center justify-center mr-3">
                    <span className="text-green-800">✓</span>
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full bg-red-200 flex items-center justify-center mr-3">
                    <span className="text-red-800">✗</span>
                  </div>
                )}
                <div>
                  <p
                    className={`${item.success ? "text-dark" : "text-red-600"}`}
                  >
                    {item.propertyName}
                  </p>
                  {!item.isBatchHeader && !item.isPause && (
                    <p className="text-sm text-gray-500">
                      {item.success ? item.message : `Error: ${item.error}`}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Success Dialog */}
      <Dialog
        open={successDialogOpen}
        onClose={() => setSuccessDialogOpen(false)}
        PaperProps={{
          sx: {
            backgroundColor: "#fafafa",
            color: "#333333",
            borderRadius: "12px",
            border: "1px solid rgba(236, 203, 52, 0.2)",
          },
        }}
      >
        <DialogTitle>Success</DialogTitle>
        <DialogContent>
          <DialogContentText>{successMessage}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setSuccessDialogOpen(false)}
            color="primary"
            sx={{
              textTransform: "none",
              fontSize: "1rem",
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Ready Confirmation Dialog */}
      <Dialog
        open={readyConfirmDialogOpen}
        onClose={() => setReadyConfirmDialogOpen(false)}
        PaperProps={{
          sx: {
            backgroundColor: "#fafafa",
            color: "#333333",
            borderRadius: "12px",
            border: "1px solid rgba(236, 203, 52, 0.2)",
          },
        }}
      >
        <DialogTitle>Confirm Action</DialogTitle>
        <DialogContent>
          <DialogContentText>{readyConfirmMessage}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setReadyConfirmDialogOpen(false)}
            color="primary"
            sx={{
              textTransform: "none",
              fontSize: "1rem",
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleReadyConfirmation}
            color="primary"
            variant="contained"
            sx={{
              textTransform: "none",
              fontSize: "1rem",
              backgroundColor: "#eccb34",
              "&:hover": {
                backgroundColor: "#d4b02a",
              },
            }}
          >
            Proceed
          </Button>
        </DialogActions>
      </Dialog>
    </AdminProtected>
  );
};

export default ReportsPage;
