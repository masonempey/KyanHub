import { useState, useEffect } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
  Alert,
  Tooltip,
  IconButton,
} from "@mui/material";
import BookingComparison from "@/app/components/BookingComparison";
import fetchWithAuth from "@/lib/fetchWithAuth";
import EditIcon from "@mui/icons-material/Edit";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import dayjs from "dayjs";

const MonthEndProcessTab = ({ year, month, onSuccess, onError }) => {
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [statusCounts, setStatusCounts] = useState({
    draft: 0,
    ready: 0,
    complete: 0,
  });
  const [statusFilterValue, setStatusFilterValue] = useState("all");
  const [propertyList, setPropertyList] = useState([]);
  const [igmsBookings, setIgmsBookings] = useState([]);
  const [databaseBookings, setDatabaseBookings] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [comparisonDialogOpen, setComparisonDialogOpen] = useState(false);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [batchConfirmDialogOpen, setBatchConfirmDialogOpen] = useState(false);
  const [batchAction, setBatchAction] = useState({ from: "", to: "" });

  // Convert month (0-11) to month number (1-12) for API calls
  const monthNumber = month + 1;

  // Fetch property statuses on initial load
  useEffect(() => {
    const fetchPropertyStatuses = async () => {
      if (!year || !monthNumber) return;

      setLoading(true);
      try {
        const response = await fetchWithAuth(
          `/api/property-month-end/statuses?year=${year}&month=${monthNumber}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch property statuses");
        }

        const data = await response.json();
        setPropertyList(data.properties || []);

        // Calculate status counts
        const counts = {
          draft: 0,
          ready: 0,
          complete: 0,
        };

        data.properties.forEach((prop) => {
          counts[prop.status || "draft"] =
            (counts[prop.status || "draft"] || 0) + 1;
        });

        setStatusCounts(counts);
      } catch (error) {
        console.error("Error fetching property statuses:", error);
        if (onError) onError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPropertyStatuses();
  }, [year, monthNumber, onError]);

  // Filter properties by status
  const filteredProperties =
    statusFilterValue === "all"
      ? propertyList
      : propertyList.filter(
          (prop) => (prop.status || "draft") === statusFilterValue
        );

  // Handle property status click
  const handleStatusClick = (property) => {
    setSelectedProperty(property);
    setStatusDialogOpen(true);
  };

  // Handle status change
  const handleStatusChanged = async (newStatus) => {
    if (!selectedProperty) return;

    setUpdating(true);
    try {
      console.log(`Updating ${selectedProperty.name} status to ${newStatus}`);

      // The month parameter in your component is 0-indexed, but the API expects 1-indexed
      const monthNum = month + 1;

      const response = await fetchWithAuth(`/api/property-month-end/status`, {
        method: "PUT",
        body: JSON.stringify({
          propertyId: selectedProperty.propertyId,
          year: year,
          monthNumber: monthNum, // Add the month number here
          status: newStatus,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update status");
      }

      // Update local state - modify the main propertyList instead of filtered
      setPropertyList((prevList) => {
        return prevList.map((prop) => {
          if (prop.propertyId === selectedProperty.propertyId) {
            return { ...prop, status: newStatus };
          }
          return prop;
        });
      });

      // Update status counts
      const newStatusCounts = { ...statusCounts };
      if (selectedProperty.status) {
        newStatusCounts[selectedProperty.status] = Math.max(
          0,
          (newStatusCounts[selectedProperty.status] || 0) - 1
        );
      }
      newStatusCounts[newStatus] = (newStatusCounts[newStatus] || 0) + 1;
      setStatusCounts(newStatusCounts);

      // Close dialog
      setStatusDialogOpen(false);

      // Success callback
      if (onSuccess) {
        onSuccess(`Status updated to ${newStatus} successfully`);
      }
    } catch (error) {
      console.error("Error updating status:", error);
      if (onError) {
        onError(error.message);
      }
    } finally {
      setUpdating(false);
    }
  };

  // Handle batch status update
  const handleBatchStatusUpdate = async (fromStatus, toStatus) => {
    const propertiesToUpdate = propertyList
      .filter((p) => (p.status || "draft") === fromStatus)
      .map((p) => p.propertyId);

    if (propertiesToUpdate.length === 0) {
      if (onError)
        onError(`No properties with status "${fromStatus}" to update`);
      return;
    }

    setUpdating(true);

    try {
      const response = await fetchWithAuth(
        "/api/property-month-end/status/batch",
        {
          method: "POST",
          body: JSON.stringify({
            propertyIds: propertiesToUpdate,
            year,
            month: monthNumber,
            status: toStatus,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update statuses");
      }

      const data = await response.json();

      // Update local state with results
      let successCount = 0;

      setPropertyList((prev) => {
        const newList = [...prev];

        data.results.forEach((result) => {
          if (result.success) {
            successCount++;
            const index = newList.findIndex(
              (p) => p.propertyId === result.propertyId
            );
            if (index !== -1) {
              newList[index].status = toStatus;
            }
          }
        });

        return newList;
      });

      // Update status counts
      setStatusCounts((prev) => ({
        ...prev,
        [fromStatus]: prev[fromStatus] - successCount,
        [toStatus]: (prev[toStatus] || 0) + successCount,
      }));

      if (onSuccess) {
        onSuccess(
          `Successfully updated ${successCount} properties to ${toStatus}`
        );
      }
    } catch (error) {
      console.error("Error updating statuses:", error);
      if (onError) onError(error.message);
    } finally {
      setUpdating(false);
    }
  };

  // Load booking comparison data
  const handleCompareBookings = async (property) => {
    setSelectedProperty(property);
    setBookingsLoading(true);
    setComparisonDialogOpen(true);

    try {
      // Load IGMS bookings
      const igmsResponse = await fetchWithAuth(
        `/api/igms/bookings?propertyId=${property.propertyId}&year=${year}&month=${monthNumber}`
      );

      if (!igmsResponse.ok) {
        throw new Error("Failed to fetch IGMS bookings");
      }

      // Load database bookings
      const dbResponse = await fetchWithAuth(
        `/api/bookings?propertyId=${property.propertyId}&year=${year}&month=${monthNumber}`
      );

      if (!dbResponse.ok) {
        throw new Error("Failed to fetch database bookings");
      }

      const igmsData = await igmsResponse.json();
      const dbData = await dbResponse.json();

      setIgmsBookings(igmsData.bookings || []);
      setDatabaseBookings(dbData.bookings || []);
    } catch (error) {
      console.error("Error loading booking comparison:", error);
      if (onError) onError(error.message);
    } finally {
      setBookingsLoading(false);
    }
  };

  // Generate Google Sheets report
  const handleGenerateReport = async () => {
    setUpdating(true);
    try {
      const response = await fetchWithAuth(
        `/api/sheets/export-month-end?year=${year}&month=${monthNumber}`,
        { method: "POST" }
      );

      if (!response.ok) {
        throw new Error("Failed to generate report");
      }

      const data = await response.json();

      if (onSuccess) {
        onSuccess(
          `Successfully exported month-end data to Google Sheets${
            data.url ? ": " + data.url : ""
          }`
        );
      }

      // Update statuses to complete for all ready properties
      await handleBatchStatusUpdate("ready", "complete");
    } catch (error) {
      console.error("Error generating report:", error);
      if (onError) onError(error.message);
    } finally {
      setUpdating(false);
    }
  };

  // Status Badge Component
  const StatusBadge = ({ status, onClick }) => {
    const getStatusConfig = (status) => {
      switch (status) {
        case "draft":
          return {
            label: "Draft",
            color: "warning",
            bgcolor: "#FFF8E1",
            textColor: "#F57F17",
          };
        case "ready":
          return {
            label: "Ready",
            color: "info",
            bgcolor: "#E1F5FE",
            textColor: "#0277BD",
          };
        case "complete":
          return {
            label: "Complete",
            color: "success",
            bgcolor: "#E8F5E9",
            textColor: "#2E7D32",
          };
        default:
          return {
            label: status || "Draft",
            color: "default",
            bgcolor: "#EEEEEE",
            textColor: "#616161",
          };
      }
    };

    const config = getStatusConfig(status);

    return (
      <Chip
        label={config.label}
        size="small"
        onClick={onClick}
        sx={{
          fontWeight: 500,
          cursor: onClick ? "pointer" : "default",
          bgcolor: config.bgcolor,
          color: config.textColor,
        }}
      />
    );
  };

  // Status Progress Tracker Component
  const StatusProgressTracker = () => {
    const { draft = 0, ready = 0, complete = 0 } = statusCounts;
    const total = draft + ready + complete;

    if (total === 0) return null;

    const draftPercent = (draft / total) * 100;
    const readyPercent = (ready / total) * 100;
    const completePercent = (complete / total) * 100;

    return (
      <Box sx={{ width: "100%", mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          Month-End Progress
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
          <Box sx={{ width: "100%", mr: 1 }}>
            <Box
              sx={{
                display: "flex",
                height: 10,
                borderRadius: 5,
                overflow: "hidden",
              }}
            >
              <Tooltip title={`Draft: ${draft} properties`}>
                <Box
                  sx={{
                    width: `${draftPercent}%`,
                    bgcolor: "#FFF8E1",
                    height: "100%",
                    borderRight: draft > 0 ? "1px solid white" : "none",
                  }}
                />
              </Tooltip>
              <Tooltip title={`Ready: ${ready} properties`}>
                <Box
                  sx={{
                    width: `${readyPercent}%`,
                    bgcolor: "#E1F5FE",
                    height: "100%",
                    borderRight: ready > 0 ? "1px solid white" : "none",
                  }}
                />
              </Tooltip>
              <Tooltip title={`Complete: ${complete} properties`}>
                <Box
                  sx={{
                    width: `${completePercent}%`,
                    bgcolor: "#E8F5E9",
                    height: "100%",
                  }}
                />
              </Tooltip>
            </Box>
          </Box>
          <Box sx={{ minWidth: 35 }}>
            <Typography variant="body2" color="text.secondary">
              {complete}/{total}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Draft: {draft}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Ready: {ready}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Complete: {complete}
          </Typography>
        </Box>
      </Box>
    );
  };

  // Confirmation for batch status update
  const confirmBatchStatusUpdate = (fromStatus, toStatus) => {
    setBatchAction({ from: fromStatus, to: toStatus });
    setBatchConfirmDialogOpen(true);
  };

  return (
    <div className="mt-6">
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <CircularProgress sx={{ color: "#eccb34" }} />
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <Typography variant="h6" gutterBottom>
              Month-End Process: {dayjs().month(month).format("MMMM")} {year}
            </Typography>

            <StatusProgressTracker />

            <div className="flex flex-wrap gap-2 mb-4">
              <Button
                variant={statusFilterValue === "all" ? "contained" : "outlined"}
                size="small"
                onClick={() => setStatusFilterValue("all")}
                sx={{
                  textTransform: "none",
                  bgcolor:
                    statusFilterValue === "all" ? "#eccb34" : "transparent",
                  color: statusFilterValue === "all" ? "#333" : "#666",
                  borderColor: "#eccb34",
                  "&:hover": {
                    bgcolor:
                      statusFilterValue === "all"
                        ? "#d4b02a"
                        : "rgba(236, 203, 52, 0.1)",
                  },
                }}
              >
                All Properties
              </Button>
              <Button
                variant={
                  statusFilterValue === "draft" ? "contained" : "outlined"
                }
                size="small"
                onClick={() => setStatusFilterValue("draft")}
                sx={{
                  textTransform: "none",
                  color: statusFilterValue === "draft" ? "#fff" : "#f57c00",
                  bgcolor:
                    statusFilterValue === "draft" ? "#f57c00" : "transparent",
                  borderColor: "#f57c00",
                  "&:hover": {
                    bgcolor:
                      statusFilterValue === "draft"
                        ? "#ef6c00"
                        : "rgba(245, 124, 0, 0.1)",
                  },
                }}
              >
                Draft ({statusCounts.draft || 0})
              </Button>
              <Button
                variant={
                  statusFilterValue === "ready" ? "contained" : "outlined"
                }
                size="small"
                onClick={() => setStatusFilterValue("ready")}
                sx={{
                  textTransform: "none",
                  color: statusFilterValue === "ready" ? "#fff" : "#0288d1",
                  bgcolor:
                    statusFilterValue === "ready" ? "#0288d1" : "transparent",
                  borderColor: "#0288d1",
                  "&:hover": {
                    bgcolor:
                      statusFilterValue === "ready"
                        ? "#0277bd"
                        : "rgba(2, 136, 209, 0.1)",
                  },
                }}
              >
                Ready ({statusCounts.ready || 0})
              </Button>
              <Button
                variant={
                  statusFilterValue === "complete" ? "contained" : "outlined"
                }
                size="small"
                onClick={() => setStatusFilterValue("complete")}
                sx={{
                  textTransform: "none",
                  color: statusFilterValue === "complete" ? "#fff" : "#388e3c",
                  bgcolor:
                    statusFilterValue === "complete"
                      ? "#388e3c"
                      : "transparent",
                  borderColor: "#388e3c",
                  "&:hover": {
                    bgcolor:
                      statusFilterValue === "complete"
                        ? "#2e7d32"
                        : "rgba(56, 142, 60, 0.1)",
                  },
                }}
              >
                Complete ({statusCounts.complete || 0})
              </Button>
            </div>

            {statusCounts.draft > 0 && (
              <Box sx={{ mb: 4 }}>
                <Button
                  variant="contained"
                  onClick={() => confirmBatchStatusUpdate("draft", "ready")}
                  disabled={updating}
                  startIcon={<DoneAllIcon />}
                  sx={{
                    bgcolor: "#f57c00",
                    color: "#fff",
                    "&:hover": { bgcolor: "#ef6c00" },
                  }}
                >
                  {updating ? (
                    <CircularProgress size={24} sx={{ color: "#fff" }} />
                  ) : (
                    `Mark All Draft as Ready (${statusCounts.draft})`
                  )}
                </Button>
                <Typography
                  variant="caption"
                  color="textSecondary"
                  sx={{ display: "block", mt: 1 }}
                >
                  This will mark all properties in Draft status as Ready for
                  sheet updates
                </Typography>
              </Box>
            )}

            {statusCounts.ready > 0 && (
              <Box sx={{ mb: 4 }}>
                <Button
                  variant="contained"
                  onClick={handleGenerateReport}
                  disabled={updating}
                  startIcon={<DoneAllIcon />}
                  sx={{
                    bgcolor: "#eccb34",
                    color: "#333",
                    "&:hover": { bgcolor: "#d4b02a" },
                  }}
                >
                  {updating ? (
                    <CircularProgress size={24} sx={{ color: "#333" }} />
                  ) : (
                    "Generate Reports & Complete All Ready Properties"
                  )}
                </Button>
                <Typography
                  variant="caption"
                  color="textSecondary"
                  sx={{ display: "block", mt: 1 }}
                >
                  This will generate reports in Google Sheets and mark all Ready
                  properties as Complete
                </Typography>
              </Box>
            )}

            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead sx={{ backgroundColor: "rgba(236, 203, 52, 0.1)" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold" }}>Property</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Bookings</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Revenue</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>
                      Last Updated
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredProperties.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                        No properties found with{" "}
                        {statusFilterValue === "all"
                          ? "any"
                          : statusFilterValue}{" "}
                        status
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProperties.map((property, index) => (
                      <TableRow key={`${property.propertyId}-${index}`} hover>
                        <TableCell>{property.name}</TableCell>
                        <TableCell>
                          <StatusBadge
                            status={property.status || "draft"}
                            onClick={() => handleStatusClick(property)}
                          />
                        </TableCell>
                        <TableCell>{property.bookingCount || 0}</TableCell>
                        <TableCell>
                          ${(parseFloat(property.revenue) || 0).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {property.lastUpdated
                            ? new Date(
                                property.lastUpdated
                              ).toLocaleDateString()
                            : "Never"}
                        </TableCell>
                        <TableCell>
                          <div className="flex">
                            <Tooltip title="Compare Bookings">
                              <IconButton
                                size="small"
                                onClick={() => handleCompareBookings(property)}
                                sx={{ color: "#0288d1" }}
                              >
                                <CompareArrowsIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>

                            {property.status === "draft" || !property.status ? (
                              <Button
                                size="small"
                                variant="contained"
                                onClick={() => {
                                  setSelectedProperty(property);
                                  handleStatusChanged("ready");
                                }}
                                startIcon={<DoneAllIcon />}
                                sx={{
                                  bgcolor: "#0288d1",
                                  color: "#fff",
                                  "&:hover": { bgcolor: "#0277bd" },
                                  textTransform: "none",
                                  ml: 1,
                                  fontSize: "0.75rem",
                                }}
                              >
                                Mark as Ready
                              </Button>
                            ) : (
                              <Tooltip title="Edit Status">
                                <IconButton
                                  size="small"
                                  onClick={() => handleStatusClick(property)}
                                  sx={{ color: "#eccb34", ml: 1 }}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </div>

          {/* Status Change Dialog */}
          <Dialog
            open={statusDialogOpen}
            onClose={() => setStatusDialogOpen(false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>
              Update Status for {selectedProperty?.name || "Property"}
            </DialogTitle>
            <DialogContent>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Current status:{" "}
                <strong>{selectedProperty?.status || "Draft"}</strong>
              </Typography>

              <Typography variant="body1" sx={{ mt: 2, mb: 1 }}>
                Select new status:
              </Typography>

              <FormControl component="fieldset">
                <RadioGroup
                  value={""}
                  onChange={(e) => handleStatusChanged(e.target.value)}
                >
                  {selectedProperty?.status !== "ready" && (
                    <FormControlLabel
                      value="ready"
                      control={<Radio />}
                      label="Ready"
                    />
                  )}

                  {selectedProperty?.status !== "complete" && (
                    <FormControlLabel
                      value="complete"
                      control={<Radio />}
                      label="Complete"
                    />
                  )}

                  {selectedProperty?.status !== "draft" &&
                    selectedProperty?.status !== undefined && (
                      <FormControlLabel
                        value="draft"
                        control={<Radio />}
                        label="Draft"
                      />
                    )}
                </RadioGroup>
              </FormControl>

              {updating && (
                <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
                  <CircularProgress size={24} sx={{ color: "#eccb34" }} />
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => setStatusDialogOpen(false)}
                sx={{ color: "#666" }}
              >
                Cancel
              </Button>
            </DialogActions>
          </Dialog>

          {/* Booking Comparison Dialog */}
          <Dialog
            open={comparisonDialogOpen}
            onClose={() => setComparisonDialogOpen(false)}
            maxWidth="md"
            fullWidth
          >
            <DialogTitle>
              Booking Comparison: {selectedProperty?.name || "Property"}
            </DialogTitle>
            <DialogContent>
              {bookingsLoading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                  <CircularProgress sx={{ color: "#eccb34" }} />
                </Box>
              ) : (
                <BookingComparison
                  igmsBookings={igmsBookings}
                  databaseBookings={databaseBookings}
                />
              )}
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => setComparisonDialogOpen(false)}
                sx={{ color: "#666" }}
              >
                Close
              </Button>
            </DialogActions>
          </Dialog>

          {/* Batch Status Update Confirmation Dialog */}
          <Dialog
            open={batchConfirmDialogOpen}
            onClose={() => setBatchConfirmDialogOpen(false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>Confirm Status Change</DialogTitle>
            <DialogContent>
              <Alert severity="info" sx={{ mb: 2 }}>
                You are about to change the status of{" "}
                {statusCounts[batchAction.from] || 0} properties from{" "}
                <strong>{batchAction.from}</strong> to{" "}
                <strong>{batchAction.to}</strong>.
              </Alert>
              <Typography variant="body2">
                Are you sure you want to proceed with this batch update?
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => setBatchConfirmDialogOpen(false)}
                sx={{ color: "#666" }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setBatchConfirmDialogOpen(false);
                  handleBatchStatusUpdate(batchAction.from, batchAction.to);
                }}
                variant="contained"
                sx={{
                  bgcolor: "#eccb34",
                  color: "#333",
                  "&:hover": { bgcolor: "#d4b02a" },
                }}
              >
                Confirm
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </div>
  );
};

export default MonthEndProcessTab;
