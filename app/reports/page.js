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
  const [confirmedQueue, setConfirmedQueue] = useState([]);
  const [showProcessButton, setShowProcessButton] = useState(false);

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

  const handleUpdateRevenue = () => {
    if (!bookings.length) {
      setErrorMessage("No bookings available to update.");
      setErrorDialogOpen(true);
      return;
    }

    // Important: For single property updates, ensure we're not using
    // the multi-property flow
    const monthIndex = startDate.month();
    const monthName = monthNames[monthIndex];
    const year = startDate.format("YYYY");

    const paddedMonthNum = (monthIndex + 1).toString().padStart(2, "0");
    const unPaddedMonthNum = (monthIndex + 1).toString();

    const monthYearKeyPadded = `${year}-${paddedMonthNum}`;
    const monthYearKeyUnpadded = `${year}-${unPaddedMonthNum}`;

    console.log("Calculating revenue for:", {
      monthName,
      year,
      paddedKey: monthYearKeyPadded,
      unPaddedKey: monthYearKeyUnpadded,
    });

    // Calculate for a SINGLE property, not multi-property
    // Important: filter bookings by the current property ID
    const propertyBookings = propertyId
      ? bookings.filter((b) => !b._propertyId || b._propertyId === propertyId)
      : bookings;

    const totalRevenue = propertyBookings.reduce((sum, booking) => {
      const revenuePadded = booking.revenueByMonth[monthYearKeyPadded] || 0;
      const revenueUnpadded = booking.revenueByMonth[monthYearKeyUnpadded] || 0;
      const revenue = revenuePadded || revenueUnpadded;
      return sum + revenue;
    }, 0);

    const totalCleaning = propertyBookings.reduce((sum, booking) => {
      const cleaningMatch =
        booking.cleaningFeeMonth === monthYearKeyPadded ||
        booking.cleaningFeeMonth === monthYearKeyUnpadded;
      const cleaning = cleaningMatch ? booking.cleaningFee : 0;
      return sum + cleaning;
    }, 0);

    console.log("Calculated totals:", {
      totalRevenue,
      totalCleaning,
    });

    setIsLoading(true);

    const fetchOwnerAndExpenses = async () => {
      try {
        let expensesTotal = 0;
        let expensesMessage = "";
        try {
          const expensesResponse = await fetchWithAuth(`/api/sheets/expenses`, {
            method: "POST",
            body: JSON.stringify({
              propertyId,
              year,
              monthName,
            }),
          });

          if (expensesResponse.ok) {
            const expensesData = await expensesResponse.json();
            if (expensesData.success) {
              expensesTotal = parseFloat(expensesData.expensesTotal) || 0;
              expensesMessage = expensesData.message || "";
            } else {
              console.warn(
                "Expenses fetch returned error:",
                expensesData.error
              );
              expensesMessage = expensesData.error || "Unknown error occurred";
            }
          } else {
            console.warn(`Expenses API returned ${expensesResponse.status}`);
            expensesMessage = `API error (${expensesResponse.status})`;
          }
        } catch (expenseError) {
          console.error("Error fetching expenses:", expenseError);
          expensesMessage = `Failed to fetch expenses: ${expenseError.message}`;
        }

        let ownerInfo = null;
        let ownershipPercentage = 100;

        try {
          console.log(`Fetching owner for property ${propertyId}`);
          const ownerResponse = await fetchWithAuth(
            `/api/properties/${propertyId}/owner`
          );
          console.log(`Owner API response status: ${ownerResponse.status}`);

          if (ownerResponse.ok) {
            const ownerData = await ownerResponse.json();
            console.log("Owner data:", ownerData);

            if (ownerData.success && ownerData.owner) {
              ownerInfo = ownerData.owner;
              ownershipPercentage = ownerData.owner.ownership_percentage || 100;
              console.log(
                `Found owner: ${ownerInfo.name} with ${ownershipPercentage}% ownership`
              );
            } else {
              console.warn(
                "No owner found:",
                ownerData.error || "Unknown reason"
              );
            }
          } else {
            console.warn(`Owner API error: ${ownerResponse.status}`);
          }
        } catch (ownerError) {
          console.error("Error fetching owner:", ownerError);
        }

        // Calculate revenue metrics for this property
        const monthIndex = startDate.month();
        const monthName = monthNames[monthIndex];
        const year = startDate.format("YYYY");

        const paddedMonthNum = (monthIndex + 1).toString().padStart(2, "0");
        const unPaddedMonthNum = (monthIndex + 1).toString();

        const monthYearKeyPadded = `${year}-${paddedMonthNum}`;
        const monthYearKeyUnpadded = `${year}-${unPaddedMonthNum}`;

        // Calculate totalRevenue from property bookings
        const totalRevenue = propertyBookings.reduce((sum, booking) => {
          const revenuePadded =
            booking.revenueByMonth?.[monthYearKeyPadded] || 0;
          const revenueUnpadded =
            booking.revenueByMonth?.[monthYearKeyUnpadded] || 0;
          const revenue = revenuePadded || revenueUnpadded;
          return sum + revenue;
        }, 0);

        // Calculate totalCleaning from property bookings
        const totalCleaning = propertyBookings.reduce((sum, booking) => {
          const cleaningMatch =
            booking.cleaningFeeMonth === monthYearKeyPadded ||
            booking.cleaningFeeMonth === monthYearKeyUnpadded;
          const cleaning = cleaningMatch ? booking.cleaningFee : 0;
          return sum + cleaning;
        }, 0);

        // Now we can calculate netAmount and ownerProfit
        const netAmount = totalRevenue - totalCleaning - expensesTotal;
        const ownerProfit = (netAmount * ownershipPercentage) / 100;

        setRevenueSummary({
          totalRevenue,
          totalCleaning,
          expenses: expensesTotal,
          netAmount,
          ownershipPercentage,
          ownerProfit,
          ownerInfo,
          propertyName: selectedPropertyName,
          month: monthName,
          year,
          bookingCount: bookings.length,
        });

        setConfirmDialogOpen(true);
      } catch (error) {
        console.error("Error preparing revenue data:", error);
        setErrorMessage(`Failed to prepare revenue data: ${error.message}`);
        setErrorDialogOpen(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOwnerAndExpenses();
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

  const handleMultiPropertyUpdate = () => {
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

    // Initialize processing state
    setProcessedProperties([]);
    setProcessingIndex(0);
    setProcessingTotal(selectedProperties.length);
    setIsMultiProcessing(true);

    // Start the process with the first property
    preparePropertyData(0);
  };

  // Step 1: Prepare data for the current property
  const preparePropertyData = async (index) => {
    // Make sure we have a valid index
    if (index < 0 || index >= selectedProperties.length) {
      setIsMultiProcessing(false);
      return;
    }

    const currentPropertyId = selectedProperties[index];

    if (!currentPropertyId) {
      console.error("Invalid property ID at index", index);
      // Skip to next property
      setProcessingIndex(index + 1);
      preparePropertyData(index + 1);
      return;
    }

    const propertyName =
      typeof allProperties[currentPropertyId] === "object"
        ? allProperties[currentPropertyId].name
        : allProperties[currentPropertyId] || "Unknown Property";

    // Filter bookings for current property
    const propertyBookings = bookings.filter(
      (booking) => booking._propertyId === currentPropertyId
    );

    if (propertyBookings.length === 0) {
      // No bookings for this property, mark as processed and move to next
      setProcessedProperties((prev) => [
        ...prev,
        {
          propertyId: currentPropertyId,
          propertyName,
          success: true,
          message: "No bookings to process",
        },
      ]);

      setProcessingIndex(index + 1);
      preparePropertyData(index + 1);
      return;
    }

    // Calculate revenue for this property
    const monthIndex = startDate.month();
    const monthName = monthNames[monthIndex];
    const year = startDate.format("YYYY");

    // Check month-end status first
    try {
      // Validate if we can update revenue, with auto-inventory enabled
      const response = await fetchWithAuth(
        `/api/property-month-end?propertyId=${currentPropertyId}&year=${year}&monthNumber=${
          monthIndex + 1
        }&autoInventory=true`,
        { method: "OPTIONS" }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to validate update status: ${response.statusText}`
        );
      }

      const validation = await response.json();

      // If inventory needs to be created automatically
      if (validation.canUpdate && validation.needsInventory) {
        console.log(`Auto-generating inventory for ${propertyName}`);

        try {
          // Call API to auto-generate inventory
          const inventoryResponse = await fetchWithAuth(
            `/api/inventory/auto-generate`,
            {
              method: "POST",
              body: JSON.stringify({
                propertyId: currentPropertyId,
                propertyName,
                month: monthName,
                year,
                monthNumber: monthIndex + 1,
              }),
            }
          );

          if (!inventoryResponse.ok) {
            throw new Error(
              `Failed to auto-generate inventory: ${await inventoryResponse.text()}`
            );
          }

          console.log(
            `Successfully auto-generated inventory for ${propertyName}`
          );
        } catch (inventoryError) {
          console.error(`Error auto-generating inventory: ${inventoryError}`);
          // Continue anyway - we'll treat this as a non-blocking error
        }
      } else if (!validation.canUpdate) {
        setProcessedProperties((prev) => [
          ...prev,
          {
            propertyId: currentPropertyId,
            propertyName,
            success: false,
            error: validation.message,
          },
        ]);

        setProcessingIndex(index + 1);
        preparePropertyData(index + 1);
        return;
      }
    } catch (error) {
      console.error(
        `Error checking month-end status for ${propertyName}:`,
        error
      );
      setProcessedProperties((prev) => [
        ...prev,
        {
          propertyId: currentPropertyId,
          propertyName,
          success: false,
          error: `Failed to check month-end status: ${error.message}`,
        },
      ]);

      setProcessingIndex(index + 1);
      preparePropertyData(index + 1);
      return;
    }

    // Fetch expenses and owner info
    Promise.all([
      // Get expenses
      fetchWithAuth(`/api/sheets/expenses`, {
        method: "POST",
        body: JSON.stringify({
          propertyId: currentPropertyId,
          year,
          monthName,
        }),
      }).then((res) =>
        res.ok ? res.json() : { success: false, expensesTotal: 0 }
      ),

      // Get owner info
      fetchWithAuth(`/api/properties/${currentPropertyId}/owner`).then((res) =>
        res.ok ? res.json() : { success: false, owner: null }
      ),
    ])
      .then(([expensesData, ownerData]) => {
        // Extract expense data
        const expensesTotal = expensesData.success
          ? parseFloat(expensesData.expensesTotal) || 0
          : 0;

        // Extract owner data
        const ownerInfo =
          ownerData.success && ownerData.owner ? ownerData.owner : null;

        const ownershipPercentage = ownerInfo?.ownership_percentage || 100;

        // Calculate revenue metrics for this property
        const monthIndex = startDate.month();
        const monthName = monthNames[monthIndex];
        const year = startDate.format("YYYY");

        const paddedMonthNum = (monthIndex + 1).toString().padStart(2, "0");
        const unPaddedMonthNum = (monthIndex + 1).toString();

        const monthYearKeyPadded = `${year}-${paddedMonthNum}`;
        const monthYearKeyUnpadded = `${year}-${unPaddedMonthNum}`;

        // Calculate totalRevenue from property bookings
        const totalRevenue = propertyBookings.reduce((sum, booking) => {
          const revenuePadded =
            booking.revenueByMonth?.[monthYearKeyPadded] || 0;
          const revenueUnpadded =
            booking.revenueByMonth?.[monthYearKeyUnpadded] || 0;
          const revenue = revenuePadded || revenueUnpadded;
          return sum + revenue;
        }, 0);

        // Calculate totalCleaning from property bookings
        const totalCleaning = propertyBookings.reduce((sum, booking) => {
          const cleaningMatch =
            booking.cleaningFeeMonth === monthYearKeyPadded ||
            booking.cleaningFeeMonth === monthYearKeyUnpadded;
          const cleaning = cleaningMatch ? booking.cleaningFee : 0;
          return sum + cleaning;
        }, 0);

        // Now we can calculate netAmount and ownerProfit
        const netAmount = totalRevenue - totalCleaning - expensesTotal;
        const ownerProfit = (netAmount * ownershipPercentage) / 100;

        // Prepare revenue summary data
        const summary = {
          totalRevenue,
          totalCleaning,
          expenses: expensesTotal,
          netAmount,
          ownershipPercentage,
          ownerProfit,
          ownerInfo,
          propertyName,
          month: monthName,
          year,
          bookingCount: propertyBookings.length,
          propertyId: currentPropertyId,
          bookings: propertyBookings,
          isMultiProperty: true,
          currentIndex: index,
        };

        // Log what's happening
        console.log(
          `Preparing data for property at index ${index}: ${propertyName}`
        );
        console.log(
          `Found ${propertyBookings.length} bookings for this property`
        );

        // Store bookings on a local variable to make sure they're included
        const bookingsForProperty = [...propertyBookings];

        // When creating the summary object, log it for debugging
        console.log(`Summary prepared for ${propertyName}:`, {
          propertyId: currentPropertyId,
          revenueTotal: totalRevenue,
          bookingsCount: bookingsForProperty.length,
          hasOwner: ownerInfo ? "Yes" : "No",
        });

        // Store the data and show confirmation dialog
        setRevenueSummary(summary);
        setConfirmDialogOpen(true);
      })
      .catch((error) => {
        console.error(`Error preparing data for ${propertyName}:`, error);
        // Record failure and move to next property
        setProcessedProperties((prev) => [
          ...prev,
          {
            propertyId: currentPropertyId,
            propertyName,
            success: false,
            error: `Data preparation failed: ${error.message}`,
          },
        ]);

        setProcessingIndex(index + 1);
        preparePropertyData(index + 1);
      });
  };

  // Step 2: Handle the confirmation for updating a property
  const handleConfirmUpdate = () => {
    setConfirmDialogOpen(false);

    if (!revenueSummary) {
      setErrorMessage("No revenue data available.");
      setErrorDialogOpen(true);
      return;
    }

    // Check explicitly for bookings
    if (!revenueSummary.bookings || !Array.isArray(revenueSummary.bookings)) {
      console.error("Missing bookings data in revenue summary", revenueSummary);
      revenueSummary.bookings = revenueSummary.bookings || [];
    }

    // Log what we're adding to queue
    console.log(`Adding property to queue: ${revenueSummary.propertyName}`);
    console.log(`Has ${revenueSummary.bookings.length} bookings`);

    // Add the confirmed property to queue with spread to ensure deep copy
    const itemToAdd = {
      ...revenueSummary,
      bookings: [...revenueSummary.bookings],
    };

    // Create a copy of current queue to work with
    const updatedQueue = [...confirmedQueue, itemToAdd];
    setConfirmedQueue(updatedQueue);

    // If we're in multi-property mode
    if (revenueSummary.isMultiProperty) {
      const nextIndex = revenueSummary.currentIndex + 1;

      // If this was the last property to confirm
      if (nextIndex >= selectedProperties.length) {
        // Wait a bit longer to ensure state updates, and pass the updated queue directly
        setTimeout(() => {
          console.log(
            `Processing queue with ${updatedQueue.length} properties`
          );
          processConfirmedQueue(updatedQueue); // Pass the queue directly
        }, 500); // Increase delay to 500ms to ensure state updates
      } else {
        // Move to next property for confirmation
        setProcessingIndex(nextIndex);
        preparePropertyData(nextIndex);
      }
    } else {
      // For single property, also auto-process immediately with updated queue
      setTimeout(() => {
        processConfirmedQueue(updatedQueue); // Pass the queue directly
      }, 500);
    }
  };

  // Add a new function to process all confirmed properties
  const processConfirmedQueue = async (queueToProcess = null) => {
    // Use the passed queue or the state queue
    const queue = queueToProcess || confirmedQueue;

    if (!queue.length) {
      console.log("No properties in queue to process");
      return;
    }

    console.log(`QUEUE STATUS: ${queue.length} properties ready to process`);
    console.log(
      "Properties in queue:",
      queue.map((p) => p.propertyName).join(", ")
    );

    // Initialize processing state
    setIsMultiProcessing(true);
    setProcessingTotal(queue.length);
    setProcessingIndex(0);
    setProcessedProperties([]);

    // Make a fresh local copy of the queue
    const localQueue = queue.map((item) => ({ ...item }));
    console.log(`Created local queue with ${localQueue.length} properties`);

    // Process the queue one by one
    for (let i = 0; i < localQueue.length; i++) {
      let currentItem = null; // Define a variable outside the try block

      try {
        setProcessingIndex(i);
        setUpdating(true);

        currentItem = localQueue[i]; // Assign the current item

        // Verify we have all required data before proceeding
        if (
          !currentItem ||
          !currentItem.propertyId ||
          !currentItem.propertyName
        ) {
          console.error(`Invalid item at index ${i}:`, currentItem);
          throw new Error("Invalid property data");
        }

        if (!currentItem.bookings || !Array.isArray(currentItem.bookings)) {
          console.warn(
            `No bookings for ${currentItem.propertyName}, using empty array`
          );
          currentItem.bookings = [];
        }

        console.log(
          `===== PROCESSING PROPERTY ${i + 1}/${localQueue.length} =====`
        );
        console.log(
          `Property: ${currentItem.propertyName} (${currentItem.propertyId})`
        );
        console.log(`Has bookings: ${currentItem.bookings.length}`);
        console.log(`Has owner: ${currentItem.ownerInfo ? "Yes" : "No"}`);

        // Log owner details if available
        if (currentItem.ownerInfo) {
          console.log(
            `Owner: ${currentItem.ownerInfo.name} (ID: ${currentItem.ownerInfo.id})`
          );
        }

        // Proceed with update and email logic
        // Update revenue sheet
        console.log(`Updating revenue sheet for ${currentItem.propertyName}`);
        console.log(
          `Including expenses total: $${currentItem.expenses.toFixed(2)}`
        );

        const response = await fetchWithAuth(`/api/sheets/revenue`, {
          method: "PUT",
          body: JSON.stringify({
            propertyId: currentItem.propertyId,
            propertyName: currentItem.propertyName,
            bookings: currentItem.bookings,
            year: currentItem.year,
            monthName: currentItem.month,
            expensesTotal: currentItem.expenses || 0, // Make sure expenses are included
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to update revenue: ${await response.text()}`);
        }

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || "Failed to update revenue sheet.");
        }

        console.log(
          `✅ Revenue sheet updated successfully for ${currentItem.propertyName}`
        );

        // Handle email if there's an owner
        let emailSuccess = true;
        let emailMessage = "";
        let emailResult = { success: false }; // Initialize with a default value

        if (currentItem.ownerInfo && currentItem.ownerInfo.id) {
          try {
            console.log(
              `Starting email process for ${currentItem.propertyName} to ${currentItem.ownerInfo.name}`
            );

            // Get spreadsheet URL
            console.log(
              `Fetching spreadsheet ID for ${currentItem.propertyId}`
            );
            const sheetResponse = await fetchWithAuth(
              `/api/properties/${currentItem.propertyId}/sheetId`
            );

            console.log(
              `Spreadsheet API response status: ${sheetResponse.status}`
            );

            const sheetData = sheetResponse.ok
              ? await sheetResponse.json()
              : { sheetId: null };
            const sheetId = sheetData.sheetId;

            const spreadsheetUrl = sheetId
              ? `https://docs.google.com/spreadsheets/d/${sheetId}/edit`
              : "";

            console.log(
              `Got spreadsheet URL for ${currentItem.propertyName}: ${
                spreadsheetUrl || "none"
              }`
            );
            console.log(`SENDING EMAIL NOW for ${currentItem.propertyName}`);

            // Add additional debugging for email payload
            const emailPayload = {
              ownerId: currentItem.ownerInfo.id,
              propertyName: currentItem.propertyName,
              propertyId: currentItem.propertyId,
              month: currentItem.month,
              year: currentItem.year,
              totalRevenue: currentItem.totalRevenue,
              totalCleaning: currentItem.totalCleaning,
              expenses: currentItem.expenses,
              profit: currentItem.ownerProfit,
              bookingCount: currentItem.bookingCount,
              spreadsheetUrl,
            };
            console.log(
              "Email payload:",
              JSON.stringify(emailPayload, null, 2)
            );

            // Send email
            const emailResponse = await fetchWithAuth(
              `/api/email/send-owner-report`,
              {
                method: "POST",
                body: JSON.stringify(emailPayload),
              }
            );

            console.log(`Email API response status: ${emailResponse.status}`);

            if (!emailResponse.ok) {
              const errorText = await emailResponse.text();
              console.error(
                `Email API error (${emailResponse.status}): ${errorText}`
              );
              throw new Error(`Email service error: ${errorText}`);
            }

            emailResult = await emailResponse.json(); // Store result in the outer variable
            console.log(`Email result:`, emailResult);

            if (!emailResult.success) {
              console.error(`Email error: ${emailResult.error || "Unknown"}`);
              throw new Error(emailResult.error || "Unknown email error");
            }

            console.log(
              `✅ Email sent successfully for ${currentItem.propertyName}`
            );
          } catch (emailError) {
            console.error(
              `❌ Email failed for ${currentItem.propertyName}:`,
              emailError
            );
            emailSuccess = false;
            emailMessage = emailError.message;
          }
        } else {
          console.log(
            `Skipping email for ${currentItem.propertyName} - no owner info`
          );
        }

        // Record success
        const resultMessage = emailSuccess
          ? `Revenue updated successfully${
              currentItem.ownerInfo
                ? ` and email sent to ${currentItem.ownerInfo.name}`
                : ""
            }`
          : `Revenue updated but email failed: ${emailMessage}`;

        console.log(
          `Recording result for ${currentItem.propertyName}: ${resultMessage}`
        );

        setProcessedProperties((prev) => [
          ...prev,
          {
            propertyId: currentItem.propertyId,
            propertyName: currentItem.propertyName,
            success: true,
            message: resultMessage,
          },
        ]);

        // Record the successful revenue update in the month-end tracking
        await fetchWithAuth(`/api/property-month-end`, {
          method: "POST",
          body: JSON.stringify({
            propertyId: currentItem.propertyId,
            propertyName: currentItem.propertyName,
            year: currentItem.year,
            month: currentItem.month,
            monthNumber:
              monthNames.findIndex((m) => m === currentItem.month) + 1,
            statusType: "revenue",
            statusData: {
              revenueAmount: currentItem.totalRevenue,
              cleaningFeesAmount: currentItem.totalCleaning,
              expensesAmount: currentItem.expenses, // Make sure expenses are included
              netAmount: currentItem.netAmount,
              bookingsCount: currentItem.bookings.length,
              sheetId: data.spreadsheetUrl,
            },
          }),
        });
      } catch (error) {
        // Record failure
        console.error(
          `❌ ERROR processing ${currentItem.propertyName}:`,
          error
        );
        setProcessedProperties((prev) => [
          ...prev,
          {
            propertyId: currentItem.propertyId,
            propertyName: currentItem.propertyName,
            success: false,
            error: error.message,
          },
        ]);
      } finally {
        setUpdating(false);
      }

      // Add a delay between processing regardless of success/failure
      if (i < localQueue.length - 1) {
        console.log(`Waiting 2 seconds before processing next property...`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    console.log(`All ${localQueue.length} properties have been processed.`);

    // Reset the queue after processing
    setConfirmedQueue([]);
    setShowProcessButton(false);
    setIsMultiProcessing(false);
  };

  const ProcessingProgress = () => {
    if (!isMultiProcessing) return null;

    // Calculate progress
    const progress = Math.min(
      Math.round((processingIndex / processingTotal) * 100),
      100
    );

    // Current property name
    let currentPropertyName = "Processing complete";
    if (
      processingIndex < processingTotal &&
      processingIndex < selectedProperties.length
    ) {
      const propertyId = selectedProperties[processingIndex];
      if (propertyId && allProperties[propertyId]) {
        currentPropertyName =
          typeof allProperties[propertyId] === "object"
            ? allProperties[propertyId].name
            : allProperties[propertyId];
      }
    }

    return (
      <div className="mt-4 p-4 bg-secondary/80 rounded-lg border border-primary/10">
        <h3 className="text-lg font-semibold mb-2">Processing Properties</h3>

        <div className="mb-3">
          <div className="flex justify-between mb-1">
            <span>{`Property ${
              processingIndex + 1
            } of ${processingTotal}`}</span>
            <span>{`${progress}%`}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-primary h-2.5 rounded-full"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {processingIndex < processingTotal && (
          <p className="text-dark">
            Currently processing: <strong>{currentPropertyName}</strong>
          </p>
        )}

        {processedProperties.length > 0 && (
          <div className="mt-3">
            <h4 className="font-medium mb-1">Processed Properties:</h4>
            <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
              {processedProperties.map((result, idx) => (
                <div
                  key={idx}
                  className={`p-2 border-b border-gray-100 ${
                    result.success ? "bg-green-50" : "bg-red-50"
                  } ${
                    idx === processedProperties.length - 1 ? "rounded-b-lg" : ""
                  }`}
                >
                  <div className="flex justify-between">
                    <span className="font-medium">{result.propertyName}</span>
                    <span
                      className={
                        result.success ? "text-green-600" : "text-red-600"
                      }
                    >
                      {result.success ? "✓ Success" : "✗ Error"}
                    </span>
                  </div>
                  {!result.success && result.error && (
                    <p className="text-sm text-red-600 mt-1">{result.error}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {processingIndex >= processingTotal && (
          <div className="mt-3 p-2 bg-green-100 rounded-lg text-center">
            <p className="text-green-800 font-medium">Processing complete</p>
          </div>
        )}
      </div>
    );
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
                                "Update Revenue Sheets"
                              )}
                            </Button>

                            {showProcessButton && (
                              <Button
                                variant="contained"
                                onClick={processConfirmedQueue}
                                disabled={updating || isMultiProcessing}
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
                                    Processing...
                                  </span>
                                ) : (
                                  "Process Confirmed Updates"
                                )}
                              </Button>
                            )}
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

                        <ProcessingProgress />

                        {confirmedQueue.length > 0 && !isMultiProcessing && (
                          <div className="mb-4 p-4 bg-white/50 rounded-lg border border-primary/30">
                            <div className="flex justify-between items-center mb-3">
                              <h3 className="text-lg font-semibold text-dark">
                                Confirmed Properties ({confirmedQueue.length})
                              </h3>
                              <Button
                                variant="contained"
                                onClick={processConfirmedQueue}
                                disabled={updating}
                                className="bg-primary hover:bg-secondary hover:text-primary text-dark font-medium py-1 px-4 rounded-lg shadow-md transition-colors duration-300"
                                sx={{
                                  textTransform: "none",
                                  fontSize: "0.9rem",
                                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                                  "&:hover": {
                                    boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                                  },
                                }}
                              >
                                Process All
                              </Button>
                            </div>

                            <div className="max-h-60 overflow-y-auto">
                              {confirmedQueue.map((item, idx) => (
                                <div
                                  key={`${item.propertyId}-${idx}`}
                                  className="bg-white p-3 rounded-lg mb-2 border border-primary/10"
                                >
                                  <div className="flex justify-between items-center">
                                    <span className="font-medium">
                                      {item.propertyName}
                                    </span>
                                    <span className="text-sm bg-yellow-50 text-yellow-700 py-1 px-2 rounded">
                                      Confirmed
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-sm mt-1">
                                    <span>
                                      {item.month} {item.year}
                                    </span>
                                    <span>${item.totalRevenue.toFixed(2)}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
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
                    <EmailTemplates />
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

                  <div className="text-dark text-sm">Cleaning Fees:</div>
                  <div className="text-dark font-medium">
                    ${revenueSummary.totalCleaning.toFixed(2)}
                  </div>

                  <div className="text-dark text-sm">Expenses:</div>
                  <div className="text-dark font-medium">
                    ${revenueSummary.expenses.toFixed(2)}
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
        <DialogActions>
          <Button
            onClick={() => setConfirmDialogOpen(false)}
            color="primary"
            sx={{
              textTransform: "none",
              fontSize: "1rem",
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmUpdate}
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
            Confirm Update
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
    </AdminProtected>
  );
};

export default ReportsPage;
