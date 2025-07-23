import { useState, useEffect } from "react";
import { useProperties } from "@/contexts/PropertyContext";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import CircularProgress from "@mui/material/CircularProgress";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import ReceiptIcon from "@mui/icons-material/Receipt";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import ClientOnly from "@/app/components/ClientOnly";
import fetchWithAuth from "@/lib/fetchWithAuth";
import dayjs from "dayjs";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";

const InventoryInvoicesTab = ({ setErrorMessage, setErrorDialogOpen }) => {
  const { properties, loading: propertiesLoading } = useProperties();
  const [invoiceMonth, setInvoiceMonth] = useState(dayjs());
  const [selectedProperties, setSelectedProperties] = useState([]);
  const [propertyStatuses, setPropertyStatuses] = useState({});
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);
  const [filterOption, setFilterOption] = useState("all");
  const [invoiceSummary, setInvoiceSummary] = useState({
    total: 0,
    generated: 0,
    failed: 0,
  });
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [propertyToReset, setPropertyToReset] = useState(null);
  const [resetting, setResetting] = useState(false);

  // Fetch invoice status for all properties for the selected month
  useEffect(() => {
    const fetchInvoiceStatuses = async () => {
      if (!properties || Object.keys(properties).length === 0) return;

      setLoading(true);
      try {
        const response = await fetchWithAuth(
          `/api/inventory/status?month=${
            invoiceMonth.month() + 1
          }&year=${invoiceMonth.year()}`
        );

        if (response.ok) {
          const data = await response.json();
          const statusMap = {};

          data.statuses.forEach((status) => {
            statusMap[status.propertyId] = {
              generated: status.invoiceGenerated,
              date: status.generatedDate,
              amount: status.invoiceAmount || 0,
            };
          });

          setPropertyStatuses(statusMap);
        } else {
          console.error("Failed to fetch invoice statuses");
        }
      } catch (error) {
        console.error("Error fetching invoice statuses:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoiceStatuses();
  }, [properties, invoiceMonth]);

  // Add this function near your other function declarations, before generateInvoices
  const fetchInvoiceStatuses = async () => {
    try {
      const response = await fetchWithAuth(
        `/api/inventory/status?month=${
          invoiceMonth.month() + 1
        }&year=${invoiceMonth.year()}`
      );

      if (response.ok) {
        const data = await response.json();
        const statusMap = {};

        data.statuses.forEach((status) => {
          statusMap[status.propertyId] = {
            generated: status.invoiceGenerated,
            date: status.generatedDate,
            amount: status.invoiceAmount || 0,
          };
        });

        setPropertyStatuses(statusMap);
      }
    } catch (error) {
      console.error("Error refreshing invoice statuses:", error);
    }
  };

  // Handle property selection
  const handlePropertySelect = (propertyId) => {
    setSelectedProperties((prev) => {
      if (prev.includes(propertyId)) {
        return prev.filter((id) => id !== propertyId);
      } else {
        return [...prev, propertyId];
      }
    });
  };

  // Select/deselect all visible properties
  const handleSelectAll = (select) => {
    if (select) {
      const visibleProperties = getFilteredProperties().map((prop) => prop.id);
      setSelectedProperties(visibleProperties);
    } else {
      setSelectedProperties([]);
    }
  };

  // Filter properties based on search and filter option
  const getFilteredProperties = () => {
    if (!properties) return [];

    const propertiesArray = Object.entries(properties).map(
      ([id, property]) => ({
        id,
        name: typeof property === "object" ? property.name : property,
        status: propertyStatuses[id] || { generated: false, amount: 0 },
      })
    );

    return propertiesArray
      .filter((property) => {
        // Search filter
        const matchesSearch = property.name
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

        // Status filter
        let matchesStatus = true;
        if (filterOption === "generated") {
          matchesStatus = property.status.generated;
        } else if (filterOption === "notGenerated") {
          matchesStatus = !property.status.generated;
        }

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  // Generate invoice for selected properties
  const generateInvoices = async () => {
    if (selectedProperties.length === 0) return;

    setGeneratingInvoice(true);
    const results = {
      total: selectedProperties.length,
      generated: 0,
      failed: 0,
      properties: {},
    };

    try {
      for (const propertyId of selectedProperties) {
        // Skip properties that already have invoices
        if (propertyStatuses[propertyId]?.generated) {
          results.properties[propertyId] = {
            success: false,
            skipped: true,
            message: "Invoice already generated",
          };
          continue;
        }

        try {
          const propertyName =
            typeof properties[propertyId] === "object"
              ? properties[propertyId].name
              : properties[propertyId] || `Property ${propertyId}`;

          const monthName = new Date(0, invoiceMonth.month()).toLocaleString(
            "default",
            { month: "long" }
          );

          const response = await fetchWithAuth(`/api/inventory/auto-generate`, {
            method: "POST",
            body: JSON.stringify({
              propertyId,
              propertyName, // Added missing parameter
              month: monthName, // Use the full month name
              year: invoiceMonth.year(),
              monthNumber: invoiceMonth.month() + 1, // Added missing parameter (same as month)
            }),
          });

          if (response.ok) {
            const data = await response.json();
            console.log("Auto-generate response data:", data);
            results.generated++;
            results.properties[propertyId] = {
              success: true,
              invoiceId: data.inventoryId,
              amount: data.totalAmount || 0,
            };

            // Update local status with the correct amount
            setPropertyStatuses((prev) => ({
              ...prev,
              [propertyId]: {
                generated: true,
                date: new Date().toISOString(),
                amount: data.totalAmount || 0,
              },
            }));
          } else {
            results.failed++;
            const error = await response.text();
            results.properties[propertyId] = {
              success: false,
              error,
            };
          }
        } catch (error) {
          results.failed++;
          results.properties[propertyId] = {
            success: false,
            error: error.message,
          };
        }
      }

      // Update summary
      setInvoiceSummary({
        total: results.total,
        generated: results.generated,
        failed: results.failed,
      });

      // Show summary message
      setErrorMessage(
        `Invoice generation complete: ${results.generated} generated, ${
          results.failed
        } failed${
          results.total - results.generated - results.failed > 0
            ? `, ${
                results.total - results.generated - results.failed
              } skipped (already generated)`
            : ""
        }`
      );
      setErrorDialogOpen(true);

      // Clear selection after generation
      setSelectedProperties([]);

      // Refresh invoice statuses to get updated amounts
      await fetchInvoiceStatuses();
    } catch (error) {
      console.error("Error generating invoices:", error);
      setErrorMessage(`Failed to generate invoices: ${error.message}`);
      setErrorDialogOpen(true);
    } finally {
      setGeneratingInvoice(false);
    }
  };

  // Open filter menu
  const handleFilterClick = (event) => {
    setFilterAnchorEl(event.currentTarget);
  };

  // Close filter menu
  const handleFilterClose = () => {
    setFilterAnchorEl(null);
  };

  // Set filter option
  const handleFilterOptionSelect = (option) => {
    setFilterOption(option);
    handleFilterClose();
  };

  const filteredProperties = getFilteredProperties();
  const allSelected =
    filteredProperties.length > 0 &&
    filteredProperties.every((prop) => selectedProperties.includes(prop.id));

  // Add these functions for handling reset
  const handleResetInvoice = (propertyId, propertyName) => {
    setPropertyToReset({ id: propertyId, name: propertyName });
    setResetDialogOpen(true);
  };

  const confirmResetInvoice = async () => {
    if (!propertyToReset) return;

    setResetting(true);
    try {
      const response = await fetchWithAuth(`/api/inventory/reset-status`, {
        method: "POST",
        body: JSON.stringify({
          propertyId: propertyToReset.id,
          month: invoiceMonth.month() + 1,
          year: invoiceMonth.year(),
        }),
      });

      if (response.ok) {
        const result = await response.json();

        // Update local state
        setPropertyStatuses((prev) => ({
          ...prev,
          [propertyToReset.id]: {
            generated: false,
            date: null,
            amount: 0,
          },
        }));

        // More descriptive success message
        setErrorMessage(
          `Successfully reset invoice status for ${propertyToReset.name}. ${
            result.cleanup?.driveDeleted ? "✓ File deleted from Drive. " : ""
          }${
            result.cleanup?.sheetEntryRemoved
              ? "✓ Entry removed from Sheet."
              : result.cleanup?.sheetError?.includes("not found")
              ? "⚠️ Sheet not found (possibly deleted)."
              : "⚠️ Could not update Sheet."
          }`
        );
        setErrorDialogOpen(true);
      } else {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to reset invoice status");
      }
    } catch (error) {
      console.error("Error resetting invoice status:", error);
      setErrorMessage(`Failed to reset invoice status: ${error.message}`);
      setErrorDialogOpen(true);
    } finally {
      setResetting(false);
      setResetDialogOpen(false);
      setPropertyToReset(null);
    }
  };

  return (
    <div className="flex-1 h-full overflow-auto p-4">
      <ClientOnly
        fallback={<div className="p-4">Loading inventory invoices...</div>}
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
                  onChange={(newValue) => {
                    setInvoiceMonth(newValue);
                    setSelectedProperties([]); // Clear selection when month changes
                  }}
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

          {/* Invoice Summary */}
          {invoiceSummary.total > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-700 mb-1">
                  Total Properties
                </h4>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-blue-600">
                    {invoiceSummary.total}
                  </span>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-green-700 mb-1">
                  Invoices Generated
                </h4>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-green-600">
                    {invoiceSummary.generated}
                  </span>
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-red-700 mb-1">
                  Failed
                </h4>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-red-600">
                    {invoiceSummary.failed}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Property Selection and Actions */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-4 mb-4">
              <TextField
                placeholder="Search properties..."
                variant="outlined"
                size="small"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon className="mr-2 text-gray-400" />,
                }}
                className="flex-grow max-w-md"
              />

              <Button
                variant="outlined"
                onClick={handleFilterClick}
                startIcon={<FilterListIcon />}
                size="small"
                sx={{
                  textTransform: "none",
                  borderColor: "#eccb34",
                  color: "#333",
                  "&:hover": {
                    borderColor: "#d4b02a",
                    backgroundColor: "rgba(236, 203, 52, 0.1)",
                  },
                }}
              >
                {filterOption === "all"
                  ? "All Properties"
                  : filterOption === "generated"
                  ? "Generated Only"
                  : "Not Generated Only"}
              </Button>

              <Menu
                anchorEl={filterAnchorEl}
                open={Boolean(filterAnchorEl)}
                onClose={handleFilterClose}
              >
                <MenuItem onClick={() => handleFilterOptionSelect("all")}>
                  <ListItemIcon>
                    {filterOption === "all" && (
                      <CheckCircleIcon fontSize="small" />
                    )}
                  </ListItemIcon>
                  <ListItemText>All Properties</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => handleFilterOptionSelect("generated")}>
                  <ListItemIcon>
                    {filterOption === "generated" && (
                      <CheckCircleIcon fontSize="small" />
                    )}
                  </ListItemIcon>
                  <ListItemText>Generated Only</ListItemText>
                </MenuItem>
                <MenuItem
                  onClick={() => handleFilterOptionSelect("notGenerated")}
                >
                  <ListItemIcon>
                    {filterOption === "notGenerated" && (
                      <CheckCircleIcon fontSize="small" />
                    )}
                  </ListItemIcon>
                  <ListItemText>Not Generated Only</ListItemText>
                </MenuItem>
              </Menu>

              <Button
                variant="contained"
                onClick={() => handleSelectAll(!allSelected)}
                size="small"
                sx={{
                  textTransform: "none",
                  bgcolor: "#eccb34",
                  color: "#333",
                  "&:hover": {
                    bgcolor: "#d4b02a",
                  },
                }}
              >
                {allSelected ? "Deselect All" : "Select All"}
              </Button>

              <Button
                variant="contained"
                onClick={generateInvoices}
                disabled={selectedProperties.length === 0 || generatingInvoice}
                startIcon={
                  generatingInvoice ? (
                    <CircularProgress size={20} sx={{ color: "#333" }} />
                  ) : (
                    <ReceiptIcon />
                  )
                }
                sx={{
                  textTransform: "none",
                  bgcolor: "#3f51b5",
                  color: "white",
                  "&:hover": {
                    bgcolor: "#303f9f",
                  },
                  "&.Mui-disabled": {
                    bgcolor: "#e0e0e0",
                    color: "#9e9e9e",
                  },
                }}
              >
                {generatingInvoice
                  ? "Generating..."
                  : `Generate Invoices (${selectedProperties.length})`}
              </Button>
            </div>

            {/* Properties Table */}
            <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={allSelected}
                        indeterminate={
                          selectedProperties.length > 0 && !allSelected
                        }
                        onChange={(e) => handleSelectAll(e.target.checked)}
                      />
                    </TableCell>
                    <TableCell>Property</TableCell>
                    <TableCell align="center">Status</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell align="right">Generated Date</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                        <CircularProgress sx={{ color: "#eccb34" }} />
                      </TableCell>
                    </TableRow>
                  ) : filteredProperties.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                        No properties found matching your criteria
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProperties.map((property) => {
                      const isGenerated = property.status.generated;
                      return (
                        <TableRow
                          key={property.id}
                          hover
                          sx={{
                            backgroundColor: isGenerated
                              ? "rgba(236, 203, 52, 0.05)"
                              : "inherit",
                            "&.Mui-selected": {
                              backgroundColor: "rgba(236, 203, 52, 0.2)",
                            },
                            "&.Mui-selected:hover": {
                              backgroundColor: "rgba(236, 203, 52, 0.25)",
                            },
                          }}
                          selected={selectedProperties.includes(property.id)}
                        >
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={selectedProperties.includes(property.id)}
                              onChange={() => handlePropertySelect(property.id)}
                              disabled={isGenerated}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{property.name}</div>
                          </TableCell>
                          <TableCell align="center">
                            {isGenerated ? (
                              <Chip
                                icon={<CheckCircleIcon />}
                                label="Generated"
                                size="small"
                                color="success"
                                variant="outlined"
                              />
                            ) : (
                              <Chip
                                icon={<ErrorIcon />}
                                label="Not Generated"
                                size="small"
                                color="default"
                                variant="outlined"
                              />
                            )}
                          </TableCell>
                          <TableCell align="right">
                            {isGenerated
                              ? `$${parseFloat(
                                  property.status.amount || 0
                                ).toFixed(2)}`
                              : "-"}
                          </TableCell>
                          <TableCell align="right">
                            {isGenerated && property.status.date
                              ? new Date(
                                  property.status.date
                                ).toLocaleDateString()
                              : "-"}
                          </TableCell>
                          <TableCell align="center">
                            {isGenerated ? (
                              <div className="flex justify-center space-x-2">
                                <Tooltip title="View Invoice">
                                  <IconButton
                                    size="small"
                                    onClick={() => {
                                      window.open(
                                        `/inventory/invoice/${
                                          property.id
                                        }?month=${
                                          invoiceMonth.month() + 1
                                        }&year=${invoiceMonth.year()}`,
                                        "_blank"
                                      );
                                    }}
                                  >
                                    <ReceiptIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Reset Invoice Status">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() =>
                                      handleResetInvoice(
                                        property.id,
                                        property.name
                                      )
                                    }
                                  >
                                    <RestartAltIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </div>
                            ) : (
                              <Tooltip title="Generate Invoice">
                                <span>
                                  <IconButton
                                    size="small"
                                    disabled={generatingInvoice}
                                    onClick={() => {
                                      setSelectedProperties([property.id]);
                                      generateInvoices();
                                    }}
                                  >
                                    <ReceiptIcon fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </div>
        </div>
      </ClientOnly>

      {/* Reset Invoice Status Dialog */}
      <Dialog
        open={resetDialogOpen}
        onClose={() => setResetDialogOpen(false)}
        aria-labelledby="reset-invoice-dialog-title"
        aria-describedby="reset-invoice-dialog-description"
      >
        <DialogTitle id="reset-invoice-dialog-title">
          Reset Invoice Status
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="reset-invoice-dialog-description">
            {resetting ? (
              "Resetting invoice status..."
            ) : (
              <>
                Are you sure you want to reset the invoice status for{" "}
                <strong>{propertyToReset?.name}</strong>? This action cannot be
                undone.
              </>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setResetDialogOpen(false)}
            color="primary"
            disabled={resetting}
          >
            Cancel
          </Button>
          <Button
            onClick={confirmResetInvoice}
            color="secondary"
            disabled={resetting}
            autoFocus
          >
            {resetting ? <CircularProgress size={24} /> : "Confirm Reset"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default InventoryInvoicesTab;
