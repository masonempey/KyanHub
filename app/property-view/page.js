"use client";

import { useState, useEffect } from "react";
import { useMaintenanceData } from "@/hooks/useMaintenanceData";
import { useCleaningData } from "@/hooks/useCleaningData";
import { useProperties } from "@/contexts/PropertyContext";
import { useUser } from "@/contexts/UserContext";
import CircularProgress from "@mui/material/CircularProgress";
import DeleteIcon from "@mui/icons-material/Delete";
import IconButton from "@mui/material/IconButton";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Button from "@mui/material/Button";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Chip from "@mui/material/Chip";
import fetchWithAuth from "@/lib/fetchWithAuth";
import AdminProtected from "../components/AdminProtected";

const PropertyViewPage = () => {
  // Context and data hooks
  const { loading: userLoading } = useUser();
  const {
    propertyId,
    selectedPropertyName,
    loading: propertiesLoading,
    currentMonth,
  } = useProperties();
  const {
    maintenanceData,
    isLoading: maintenanceLoading,
    error: maintenanceError,
    mutate: mutateMaintenance,
  } = useMaintenanceData(propertyId);
  const {
    cleaningData,
    isLoading: cleaningLoading,
    error: cleaningError,
    mutate: mutateCleaning,
  } = useCleaningData(propertyId);

  // Local state
  const [viewMode, setViewMode] = useState("combined");
  const [activeTab, setActiveTab] = useState(0);
  const [sortOrder, setSortOrder] = useState("date-desc");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [itemTypeToDelete, setItemTypeToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [combinedData, setCombinedData] = useState([]);

  // Remove filterByMonth toggle - we'll always filter by currentMonth

  // Combine and sort data when either dataset changes
  useEffect(() => {
    if (!maintenanceLoading && !cleaningLoading) {
      // Map maintenance data with type
      const mappedMaintenance = maintenanceData.map((item) => ({
        ...item,
        type: "maintenance",
        recordName: item.category,
        date: new Date(item.date),
      }));

      // Map cleaning data with type
      const mappedCleaning = cleaningData.map((item) => ({
        ...item,
        type: "cleaning",
        recordName: item.company,
        date: new Date(item.date),
      }));

      // Combine and sort
      let combined = [...mappedMaintenance, ...mappedCleaning];

      // Sort combined data
      if (sortOrder === "date-desc") {
        combined = combined.sort((a, b) => b.date - a.date);
      } else if (sortOrder === "date-asc") {
        combined = combined.sort((a, b) => a.date - b.date);
      } else if (sortOrder === "cost-desc") {
        combined = combined.sort(
          (a, b) => parseFloat(b.cost) - parseFloat(a.cost)
        );
      } else if (sortOrder === "cost-asc") {
        combined = combined.sort(
          (a, b) => parseFloat(a.cost) - parseFloat(b.cost)
        );
      }

      setCombinedData(combined);
    }
  }, [
    maintenanceData,
    cleaningData,
    maintenanceLoading,
    cleaningLoading,
    sortOrder,
  ]);

  const isCurrentMonth = (date) => {
    const monthMap = {
      January: 0,
      February: 1,
      March: 2,
      April: 3,
      May: 4,
      June: 5,
      July: 6,
      August: 7,
      September: 8,
      October: 9,
      November: 10,
      December: 11,
    };

    const currentMonthIndex = monthMap[currentMonth];
    return date && date.getMonth() === currentMonthIndex;
  };

  // Tab change handler
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    if (newValue === 0) setViewMode("combined");
    if (newValue === 1) setViewMode("maintenance");
    if (newValue === 2) setViewMode("cleaning");
  };

  // Sort change handler
  const handleSortChange = (newSortOrder) => {
    setSortOrder(newSortOrder);
  };

  // Delete handlers
  const handleDelete = (item) => {
    setItemToDelete(item);
    setItemTypeToDelete(item.type);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;

    setIsDeleting(true);
    try {
      const endpoint =
        itemTypeToDelete === "maintenance"
          ? `/api/maintenance?id=${itemToDelete.id}`
          : `/api/cleaning?id=${itemToDelete.id}`;

      const response = await fetchWithAuth(endpoint, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`Failed to delete item: ${await response.text()}`);
      }

      // Refresh the appropriate data
      if (itemTypeToDelete === "maintenance") {
        await mutateMaintenance();
      } else {
        await mutateCleaning();
      }
    } catch (error) {
      console.error("Error deleting item:", error);
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setItemToDelete(null);
      setItemTypeToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setItemToDelete(null);
    setItemTypeToDelete(null);
  };

  // Loading and error handling
  if (
    userLoading ||
    propertiesLoading ||
    (maintenanceLoading && cleaningLoading)
  ) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <CircularProgress sx={{ color: "#eccb34" }} />
      </div>
    );
  }

  const hasError = maintenanceError || cleaningError;
  if (hasError) {
    return (
      <div className="p-6">
        <p className="text-red-500">
          Error: {maintenanceError || cleaningError}
        </p>
      </div>
    );
  }

  // Render function for an individual record card
  const renderRecordCard = (item) => {
    return (
      <div
        key={`${item.type}-${item.id}`}
        className="bg-white p-4 rounded-lg border border-primary/10 shadow-sm hover:shadow-md transition-all duration-200"
      >
        {/* Header with record type and delete icon */}
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center">
            <span className="font-bold text-dark text-lg">
              {item.type === "maintenance" ? item.category : item.company}
            </span>
            <Chip
              label={item.type === "maintenance" ? "Maintenance" : "Cleaning"}
              size="small"
              sx={{
                ml: 1,
                bgcolor:
                  item.type === "maintenance"
                    ? "rgba(236, 203, 52, 0.2)"
                    : "rgba(52, 152, 219, 0.2)",
                color: item.type === "maintenance" ? "#eccb34" : "#3498db",
                fontWeight: 600,
                borderRadius: "4px",
                height: "20px",
              }}
            />
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-primary font-medium">
              ${parseFloat(item.cost).toFixed(2)}
            </span>
            <IconButton
              aria-label="delete"
              size="small"
              onClick={() => handleDelete(item)}
              className="text-dark/70 hover:text-primary transition-colors"
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </div>
        </div>

        {/* Card content */}
        <div className="text-sm text-dark/70">
          <div className="flex justify-between mb-2">
            <span>
              {item.type === "maintenance" ? item.company : "Cleaner"}
            </span>
            <span>{item.date.toLocaleDateString()}</span>
          </div>
          {item.description && (
            <p className="mt-2 bg-primary/5 p-2 rounded-lg">
              {item.description}
            </p>
          )}

          {/* Pay button */}
          <div className="mt-3 flex justify-end">
            <Button
              variant="contained"
              size="small"
              className="bg-primary hover:bg-secondary hover:text-primary text-dark font-medium rounded-lg shadow-md transition-colors duration-300"
              sx={{
                textTransform: "none",
                fontSize: "0.875rem",
                bgcolor: "#eccb34",
                color: "#333333",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                width: "100px",
                "&:hover": {
                  bgcolor: "#f9f9f9",
                  color: "#eccb34",
                  boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                },
              }}
            >
              Pay Now
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // Apply filters to records - first by type, then by month automatically
  const recordsToDisplay = combinedData
    .filter((item) => {
      if (viewMode === "combined") return true;
      return item.type === viewMode;
    })
    .filter((item) => {
      // Always filter by currentMonth
      return isCurrentMonth(item.date);
    });

  return (
    <AdminProtected>
      <div className="flex flex-col h-full w-full p-6 bg-transparent">
        <div className="bg-secondary/95 rounded-2xl shadow-lg backdrop-blur-sm overflow-hidden border border-primary/10 flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-primary/10">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold text-dark">Property Records</h1>
              <div className="text-xl text-primary font-medium">
                {selectedPropertyName || "Select a Property"} - {currentMonth}
              </div>
            </div>
          </div>

          {/* Tabs and Sorting Controls */}
          <div className="flex justify-between items-center px-6 py-3 border-b border-primary/10 bg-white/50">
            <div className="flex items-center">
              <Tabs
                value={activeTab}
                onChange={handleTabChange}
                sx={{
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
                <Tab label="All Records" />
                <Tab label="Maintenance" />
                <Tab label="Cleaning" />
              </Tabs>

              {/* Filter button removed - filtering is automatic based on currentMonth */}
            </div>

            <div className="flex gap-2">
              <Button
                size="small"
                variant={sortOrder === "date-desc" ? "contained" : "outlined"}
                onClick={() => handleSortChange("date-desc")}
                sx={{
                  textTransform: "none",
                  fontSize: "0.875rem",
                  bgcolor:
                    sortOrder === "date-desc" ? "#eccb34" : "transparent",
                  color: sortOrder === "date-desc" ? "#333333" : "#eccb34",
                  borderColor: "#eccb34",
                  "&:hover": {
                    bgcolor:
                      sortOrder === "date-desc"
                        ? "#d9b92f"
                        : "rgba(236, 203, 52, 0.1)",
                    borderColor: "#eccb34",
                  },
                }}
              >
                Newest First
              </Button>
              <Button
                size="small"
                variant={sortOrder === "date-asc" ? "contained" : "outlined"}
                onClick={() => handleSortChange("date-asc")}
                sx={{
                  textTransform: "none",
                  fontSize: "0.875rem",
                  bgcolor: sortOrder === "date-asc" ? "#eccb34" : "transparent",
                  color: sortOrder === "date-asc" ? "#333333" : "#eccb34",
                  borderColor: "#eccb34",
                  "&:hover": {
                    bgcolor:
                      sortOrder === "date-asc"
                        ? "#d9b92f"
                        : "rgba(236, 203, 52, 0.1)",
                    borderColor: "#eccb34",
                  },
                }}
              >
                Oldest First
              </Button>
              <Button
                size="small"
                variant={sortOrder === "cost-desc" ? "contained" : "outlined"}
                onClick={() => handleSortChange("cost-desc")}
                sx={{
                  textTransform: "none",
                  fontSize: "0.875rem",
                  bgcolor:
                    sortOrder === "cost-desc" ? "#eccb34" : "transparent",
                  color: sortOrder === "cost-desc" ? "#333333" : "#eccb34",
                  borderColor: "#eccb34",
                  "&:hover": {
                    bgcolor:
                      sortOrder === "cost-desc"
                        ? "#d9b92f"
                        : "rgba(236, 203, 52, 0.1)",
                    borderColor: "#eccb34",
                  },
                }}
              >
                Highest Cost
              </Button>
            </div>
          </div>

          {/* Records Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {recordsToDisplay.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-dark/70">
                <p className="text-xl">No records found.</p>
                <p className="mt-2">No records found for {currentMonth}.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {recordsToDisplay.map(renderRecordCard)}
              </div>
            )}
          </div>

          {/* Summary Statistics Footer */}
          <div className="p-4 bg-secondary/80 border-t border-primary/10 flex justify-between">
            <div>
              <span className="font-medium text-dark">
                {currentMonth} Records:
              </span>{" "}
              <span className="text-primary">{recordsToDisplay.length}</span>
            </div>
            <div>
              <span className="font-medium text-dark">
                {currentMonth} Cost:
              </span>{" "}
              <span className="text-primary">
                $
                {recordsToDisplay
                  .reduce((sum, item) => sum + parseFloat(item.cost || 0), 0)
                  .toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={handleDeleteCancel}
          PaperProps={{
            sx: {
              backgroundColor: "#fafafa",
              color: "#333333",
              borderRadius: "12px",
              border: "1px solid rgba(236, 203, 52, 0.2)",
            },
          }}
        >
          <DialogTitle sx={{ color: "#333333" }}>Confirm Deletion</DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ color: "#333333" }}>
              Are you sure you want to delete this {itemTypeToDelete} record
              {itemToDelete && itemToDelete.recordName
                ? ` for ${itemToDelete.recordName}`
                : ""}
              ? This action cannot be undone.
            </DialogContentText>

            {itemToDelete && (
              <div className="mt-4 p-3 bg-primary/5 rounded-lg text-sm">
                {itemTypeToDelete === "maintenance" && (
                  <p>
                    <strong>Category:</strong> {itemToDelete.category}
                  </p>
                )}
                <p>
                  <strong>Company:</strong> {itemToDelete.company}
                </p>
                <p>
                  <strong>Cost:</strong> $
                  {parseFloat(itemToDelete.cost).toFixed(2)}
                </p>
                <p>
                  <strong>Date:</strong>{" "}
                  {itemToDelete.date.toLocaleDateString()}
                </p>
              </div>
            )}
          </DialogContent>
          <DialogTitle sx={{ color: "#333333" }}>
            Make sure to delete invoice from the drive if applicable
          </DialogTitle>
          <DialogActions>
            <Button
              onClick={handleDeleteCancel}
              className="text-dark hover:bg-primary/5 transition-colors"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-primary text-dark hover:bg-primary/80 transition-colors"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    </AdminProtected>
  );
};

export default PropertyViewPage;
