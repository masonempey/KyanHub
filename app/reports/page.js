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
import MultiPropertySelector from "../components/MultiPropertySelector";
import MonthEndStatus from "../components/MonthEndStatus";
import DownloadIcon from "@mui/icons-material/Download";
import SendIcon from "@mui/icons-material/Send";
import ClientOnly from "@/app/components/ClientOnly";

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

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handlePropertiesChange = (selectedIds) => {
    setSelectedProperties(selectedIds);
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

      const fetchPromises = selectedProperties.map((propId) =>
        fetchWithAuth(
          `/api/igms/bookings-with-guests/${propId}/${startDate.format(
            "YYYY-MM-DD"
          )}/${endDate.format("YYYY-MM-DD")}`
        )
          .then((response) => {
            if (!response.ok) {
              throw new Error(
                `Failed to fetch bookings for property ${propId}: ${response.statusText}`
              );
            }
            return response.json();
          })
          .then((data) => {
            if (data.success && data.bookings) {
              const propertyName =
                typeof allProperties[propId] === "object"
                  ? allProperties[propId].name
                  : allProperties[propId];

              const bookingsWithProperty = data.bookings.map((booking) => ({
                ...booking,
                propertyName,
                _propertyId: propId, // Make sure this is set correctly
              }));

              return bookingsWithProperty;
            }
            return [];
          })
      );

      const results = await Promise.allSettled(fetchPromises);

      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          allBookings.push(...result.value);
        } else {
          console.error(
            `Error fetching bookings for property ${selectedProperties[index]}:`,
            result.reason
          );
        }
      });

      setBookings(allBookings);
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

    // Calculate revenue
    const totalRevenue = propertyBookings.reduce((sum, booking) => {
      const revenuePadded = booking.revenueByMonth?.[monthYearKeyPadded] || 0;
      const revenueUnpadded =
        booking.revenueByMonth?.[monthYearKeyUnpadded] || 0;
      const revenue = revenuePadded || revenueUnpadded;
      return sum + revenue;
    }, 0);

    // Calculate cleaning fees - using fixed fees by property type
    const totalCleaning = propertyBookings.reduce((sum, booking) => {
      const cleaningMatch =
        booking.cleaningFeeMonth === monthYearKeyPadded ||
        booking.cleaningFeeMonth === monthYearKeyUnpadded;
      const cleaning = cleaningMatch ? booking.cleaningFee : 0;
      return sum + cleaning;
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
      console.log("CONSOLIDATED SUMMARY DATA:", consolidatedSummary);

      // Filter valid properties (no errors)
      const propertiesToProcess = consolidatedSummary.filter(
        (prop) => !prop.hasError
      );
      console.log(
        `Found ${propertiesToProcess.length} valid properties to process`
      );

      // Add tracking arrays for success and failure
      const successfullyProcessed = [];
      const failedProperties = [];

      const BATCH_SIZE = 5; // Process 10 properties at a time
      const BATCH_PAUSE = 60000; // 30 second pause between batches

      // Calculate total batches for progress display
      const totalBatches = Math.ceil(propertiesToProcess.length / BATCH_SIZE);

      // Process in batches of 10
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        // Get the current batch of properties
        const startIdx = batchIndex * BATCH_SIZE;
        const endIdx = Math.min(
          startIdx + BATCH_SIZE,
          propertiesToProcess.length
        );
        const currentBatch = propertiesToProcess.slice(startIdx, endIdx);

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
              // Use the executeWithQuotaBackoff wrapper
              result = await executeWithQuotaBackoff(async () => {
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

            // If successful, add to success list
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
                  : "Revenue updated successfully",
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

      // If no owner_id exists, try to fetch it directly
      let ownerId = report.owner_id;

      if (!ownerId) {
        // Try to fetch the owner directly from the property
        try {
          const ownerResponse = await fetchWithAuth(
            `/api/properties/${report.property_id}/owner`
          );
          if (ownerResponse.ok) {
            const ownerData = await ownerResponse.json();
            if (ownerData.success && ownerData.owner && ownerData.owner.id) {
              ownerId = ownerData.owner.id;
              console.log(
                `Found owner ID ${ownerId} for property ${report.property_name}`
              );
            }
          }
        } catch (lookupError) {
          console.error("Failed to lookup owner:", lookupError);
        }
      }

      if (!ownerId) {
        setErrorMessage(
          `Cannot send email: No owner assigned to ${report.property_name}`
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

  // Add this function to generate an inventory invoice
  const generateInventoryInvoice = async () => {
    if (!selectedPropertyForInvoice) {
      setErrorMessage("Please select a property.");
      setErrorDialogOpen(true);
      return;
    }

    const propertyName =
      typeof allProperties[selectedPropertyForInvoice] === "object"
        ? allProperties[selectedPropertyForInvoice].name
        : allProperties[selectedPropertyForInvoice] || "Unknown Property";

    const month = invoiceMonth.format("MMMM");
    const year = invoiceMonth.format("YYYY");
    const monthNumber = invoiceMonth.month() + 1;

    setGeneratingInvoice(true);
    setInvoiceResult(null);

    try {
      const response = await fetchWithAuth("/api/inventory/auto-generate", {
        method: "POST",
        body: JSON.stringify({
          propertyId: selectedPropertyForInvoice,
          propertyName,
          month,
          year,
          monthNumber,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate invoice: ${await response.text()}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to generate inventory invoice");
      }

      // Set the result for display
      setInvoiceResult({
        propertyId: selectedPropertyForInvoice,
        propertyName,
        month,
        year,
        totalAmount: result.data?.totalAmount || 0,
        noItemsFound: result.data?.noItemsFound || false,
      });

      // Update the month-end status for this property
      await fetchWithAuth(`/api/property-month-end`, {
        method: "POST",
        body: JSON.stringify({
          propertyId: selectedPropertyForInvoice,
          year,
          month,
          monthNumber,
          statusType: "inventory",
          statusData: {
            totalAmount: result.data?.totalAmount || 0,
            noItemsFound: result.data?.noItemsFound || false,
          },
        }),
      });
    } catch (error) {
      console.error("Error generating inventory invoice:", error);
      setErrorMessage(`Failed to generate inventory invoice: ${error.message}`);
      setErrorDialogOpen(true);
    } finally {
      setGeneratingInvoice(false);
    }
  };

  // Add this function to your component

  const executeWithQuotaBackoff = async (apiCall, maxRetries = 5) => {
    let retries = 0;

    while (retries <= maxRetries) {
      try {
        return await apiCall();
      } catch (error) {
        // Check if it's a quota error
        if (
          error.message?.includes("Quota exceeded") ||
          error.message?.includes("rate limit")
        ) {
          retries++;

          if (retries > maxRetries) {
            throw new Error(
              `Max retries (${maxRetries}) exceeded: ${error.message}`
            );
          }

          // Exponential backoff: 5s, 10s, 20s, 40s, 80s
          const delay = 5000 * Math.pow(2, retries - 1);
          console.log(
            `Quota exceeded. Waiting ${
              delay / 1000
            }s before retry ${retries}/${maxRetries}`
          );

          // Add to processed properties log
          setProcessedProperties((prev) => [
            ...prev,
            {
              propertyId: "quota-pause",
              propertyName: `⚠️ API Quota limit hit. Pausing for ${
                delay / 1000
              }s before retry ${retries}/${maxRetries}...`,
              isPause: true,
              success: true,
            },
          ]);

          // Wait for the backoff period
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          // If it's not a quota error, just throw it
          throw error;
        }
      }
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
                                "Calculate Month End"
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
                              <div className="flex items-center justify-center h-40">
                                <p className="text-dark text-lg">
                                  No bookings found
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
                              startIcon={<SendIcon />}
                              className="bg-primary hover:bg-secondary hover:text-primary text-dark"
                              sx={{
                                textTransform: "none",
                                backgroundColor: "#3f51b5",
                                color: "white",
                                "&:hover": {
                                  backgroundColor: "#303f9f",
                                },
                              }}
                            >
                              Send Owner Emails
                            </Button>
                          </div>
                        </div>

                        {loadingReports ? (
                          <div className="flex justify-center py-8">
                            <CircularProgress sx={{ color: "#eccb34" }} />
                          </div>
                        ) : completedReports.length > 0 ? (
                          <div className="overflow-auto">
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
                              `$${property.totalRevenue.toFixed(2)}`}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            {!property.hasError &&
                              `$${property.totalCleaning.toFixed(2)}`}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            {!property.hasError &&
                              `$${property.expenses.toFixed(2)}`}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            {!property.hasError &&
                              `$${property.netAmount.toFixed(2)}`}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            {!property.hasError &&
                              `${property.ownershipPercentage || 100}%`}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap font-medium text-green-600">
                            {!property.hasError &&
                              `$${(property.ownerProfit || 0).toFixed(2)}`}
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
    </AdminProtected>
  );
};

export default ReportsPage;
