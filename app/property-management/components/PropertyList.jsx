import { useState } from "react";
import {
  Grid,
  Card,
  CardContent,
  Typography,
  CardActions,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CardHeader,
  Avatar,
  CircularProgress,
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
} from "@mui/material";
import ApartmentIcon from "@mui/icons-material/Apartment";
import EditIcon from "@mui/icons-material/Edit";
import fetchWithAuth from "@/lib/fetchWithAuth";
import { useProperties } from "@/contexts/PropertyContext";

const PropertyList = ({
  properties = {},
  propertyDetails: propDetails,
  onPropertySelect,
  onSuccess,
  onError,
}) => {
  const contextValues = useProperties();
  const propertyDetails = propDetails || contextValues.propertyDetails;
  const getPropertyWithDetails = contextValues.getPropertyWithDetails;

  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [displayCount, setDisplayCount] = useState(12);

  // Transform properties to array of objects with id and name
  const propertyItems = Array.isArray(properties)
    ? properties
    : Object.entries(properties).map(([id, propertyData]) => {
        // Check if propertyData is an object with name/address properties
        if (typeof propertyData === "object" && propertyData !== null) {
          return {
            id,
            name: propertyData.name || "Unnamed Property",
            address: propertyData.address || "",
          };
        } else {
          // Handle legacy format where propertyData might be just a string name
          return {
            id,
            name: propertyData || "Unnamed Property",
            address: "",
          };
        }
      });

  console.log(propertyItems);

  // Total number of properties
  const totalProperties = propertyItems.length;

  const handleViewDetails = (property) => {
    setSelectedProperty(property);
    setViewDialogOpen(true);
  };

  const handleEdit = (property, e) => {
    e.stopPropagation();
    setSelectedProperty(property);

    const propertyWithDetails = getPropertyWithDetails(property.id) || {};

    setEditFormData({
      name: property.name || "",
      address: property.address || "",
      bedrooms: property.bedrooms || "",
      bathrooms: property.bathrooms || "",
      sqft: property.sqft || "",
      GoogleSheetId: propertyWithDetails?.GoogleSheetId || "",
      GoogleFolderId: propertyWithDetails?.GoogleFolderId || "",
    });

    console.log("Edit property with details:", propertyWithDetails);
    setEditDialogOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveEdit = async () => {
    if (!selectedProperty) return;

    setIsLoading(true);
    try {
      const response = await fetchWithAuth(
        `/api/properties/${selectedProperty.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: editFormData.name,
            address: editFormData.address,
            bedrooms: editFormData.bedrooms,
            bathrooms: editFormData.bathrooms,
            sqft: editFormData.sqft,
            GoogleSheetId: editFormData.GoogleSheetId,
            GoogleFolderId: editFormData.GoogleFolderId,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to update property: ${await response.text()}`);
      }

      const updatedProperty = await response.json();
      setEditDialogOpen(false);
      onSuccess && onSuccess("Property updated successfully");

      // Update the selected property with new data
      setSelectedProperty({ ...updatedProperty });
    } catch (error) {
      onError && onError(error.message || "Error updating property");
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowMore = () => {
    setDisplayCount(Math.min(displayCount + 12, totalProperties));
  };

  const handleDisplayCountChange = (event) => {
    setDisplayCount(event.target.value);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Controls for pagination/display */}
      <div className="flex justify-between items-center mb-4">
        <div className="text-dark">
          Showing {Math.min(displayCount, totalProperties)} of {totalProperties}{" "}
          properties
        </div>

        <FormControl sx={{ width: 120 }}>
          <Select
            value={displayCount}
            onChange={handleDisplayCountChange}
            displayEmpty
            renderValue={(value) =>
              `Show: ${value === totalProperties ? "All" : value}`
            }
            sx={{
              height: "40px",
              ".MuiOutlinedInput-notchedOutline": {
                borderColor: "rgba(236, 203, 52, 0.5)",
              },
              "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                borderColor: "#eccb34",
              },
              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: "#eccb34",
              },
              ".MuiSvgIcon-root": {
                color: "#eccb34",
              },
            }}
          >
            <MenuItem value={12}>Show: 12</MenuItem>
            <MenuItem value={24}>Show: 24</MenuItem>
            <MenuItem value={48}>Show: 48</MenuItem>
            <MenuItem value={totalProperties}>Show: All</MenuItem>
          </Select>
        </FormControl>
      </div>

      {/* Scrollable container for properties */}
      <div
        className="flex-1 overflow-y-auto pr-1 pb-4"
        style={{ maxHeight: "calc(100vh - 250px)" }}
      >
        <Grid container spacing={3}>
          {propertyItems.length > 0 ? (
            propertyItems.slice(0, displayCount).map((property) => (
              <Grid item xs={12} sm={6} md={4} key={property.id}>
                <Card
                  className="h-full flex flex-col hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => onPropertySelect && onPropertySelect(property)}
                >
                  <CardHeader
                    avatar={
                      <Avatar sx={{ bgcolor: "#eccb34" }}>
                        <ApartmentIcon />
                      </Avatar>
                    }
                    title={property.name || "Unnamed Property"}
                    action={
                      <Button
                        size="small"
                        startIcon={<EditIcon />}
                        onClick={(e) => handleEdit(property, e)}
                        sx={{
                          color: "#333333",
                          "&:hover": {
                            backgroundColor: "rgba(51, 51, 51, 0.05)",
                          },
                        }}
                      >
                        Edit
                      </Button>
                    }
                  />
                  <CardContent className="flex-1 flex items-center justify-center">
                    <Typography
                      variant="body1"
                      className="text-center text-dark"
                    >
                      {property.name}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button
                      size="small"
                      fullWidth
                      variant="outlined"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewDetails(property);
                      }}
                      sx={{
                        color: "#eccb34",
                        borderColor: "#eccb34",
                        "&:hover": {
                          backgroundColor: "rgba(236, 203, 52, 0.1)",
                          borderColor: "#eccb34",
                        },
                      }}
                    >
                      View Details
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))
          ) : (
            <Grid item xs={12}>
              <div className="bg-white p-8 rounded-lg text-center">
                <Typography variant="h6" className="text-dark/70 mb-2">
                  No properties found
                </Typography>
                <Typography variant="body2" className="text-dark/50">
                  Properties must be added to the system first
                </Typography>
              </div>
            </Grid>
          )}
        </Grid>
      </div>

      {/* Show More button if not showing all properties */}
      {displayCount < totalProperties && (
        <div className="flex justify-center mt-4">
          <Button
            variant="outlined"
            onClick={handleShowMore}
            sx={{
              color: "#eccb34",
              borderColor: "#eccb34",
              "&:hover": {
                backgroundColor: "rgba(236, 203, 52, 0.1)",
                borderColor: "#eccb34",
              },
            }}
          >
            Show More Properties
          </Button>
        </div>
      )}

      {/* View Details Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: "#fafafa",
            color: "#333333",
            borderRadius: "12px",
            border: "1px solid rgba(236, 203, 52, 0.2)",
          },
        }}
      >
        {/* Dialog content remains unchanged */}
        {selectedProperty && (
          <>
            <DialogTitle
              sx={{ borderBottom: "1px solid rgba(236, 203, 52, 0.2)", pb: 2 }}
            >
              {selectedProperty.name || "Property Details"}
            </DialogTitle>
            <DialogContent sx={{ pt: 3 }}>
              {/* Rest of the view dialog content */}
              <Box className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Existing property details */}
                <div>
                  <Typography variant="subtitle2" color="text.secondary">
                    Property ID
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedProperty.id}
                  </Typography>
                </div>
                <div>
                  <Typography variant="subtitle2" color="text.secondary">
                    Address
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedProperty.address || "No address available"}
                  </Typography>
                </div>
                <div>
                  <Typography variant="subtitle2" color="text.secondary">
                    Bedrooms
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedProperty.bedrooms || "N/A"}
                  </Typography>
                </div>
                <div>
                  <Typography variant="subtitle2" color="text.secondary">
                    Bathrooms
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedProperty.bathrooms || "N/A"}
                  </Typography>
                </div>
                <div>
                  <Typography variant="subtitle2" color="text.secondary">
                    Square Footage
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedProperty.sqft || "N/A"}
                  </Typography>
                </div>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() =>
                  handleEdit(selectedProperty, { stopPropagation: () => {} })
                }
                sx={{ color: "#eccb34" }}
              >
                Edit Details
              </Button>
              <Button
                onClick={() => setViewDialogOpen(false)}
                sx={{ color: "#333" }}
              >
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Edit Property Dialog remains unchanged */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: "#fafafa",
            color: "#333333",
            borderRadius: "12px",
            border: "1px solid rgba(236, 203, 52, 0.2)",
          },
        }}
      >
        {selectedProperty && (
          <>
            <DialogTitle
              sx={{ borderBottom: "1px solid rgba(236, 203, 52, 0.2)", pb: 2 }}
            >
              Edit {selectedProperty.name || "Property"}
            </DialogTitle>
            <DialogContent sx={{ pt: 3 }}>
              <Box className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <TextField
                  label="Property Name"
                  name="name"
                  value={editFormData.name}
                  onChange={handleInputChange}
                  variant="outlined"
                  fullWidth
                  required
                  sx={{
                    "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
                      {
                        borderColor: "#eccb34",
                      },
                    "& .MuiInputLabel-root.Mui-focused": {
                      color: "#eccb34",
                    },
                  }}
                />

                <TextField
                  label="Address"
                  name="address"
                  value={editFormData.address}
                  onChange={handleInputChange}
                  variant="outlined"
                  fullWidth
                  sx={{
                    "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
                      {
                        borderColor: "#eccb34",
                      },
                    "& .MuiInputLabel-root.Mui-focused": {
                      color: "#eccb34",
                    },
                  }}
                />

                <TextField
                  label="Bedrooms"
                  name="bedrooms"
                  value={editFormData.bedrooms}
                  onChange={handleInputChange}
                  variant="outlined"
                  type="number"
                  inputProps={{ min: "0", step: "1" }}
                  fullWidth
                  sx={{
                    "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
                      {
                        borderColor: "#eccb34",
                      },
                    "& .MuiInputLabel-root.Mui-focused": {
                      color: "#eccb34",
                    },
                  }}
                />

                <TextField
                  label="Bathrooms"
                  name="bathrooms"
                  value={editFormData.bathrooms}
                  onChange={handleInputChange}
                  variant="outlined"
                  type="number"
                  inputProps={{ min: "0", step: "0.5" }}
                  fullWidth
                  sx={{
                    "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
                      {
                        borderColor: "#eccb34",
                      },
                    "& .MuiInputLabel-root.Mui-focused": {
                      color: "#eccb34",
                    },
                  }}
                />

                <TextField
                  label="Square Footage"
                  name="sqft"
                  value={editFormData.sqft}
                  onChange={handleInputChange}
                  variant="outlined"
                  type="number"
                  inputProps={{ min: "0" }}
                  fullWidth
                  sx={{
                    "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
                      {
                        borderColor: "#eccb34",
                      },
                    "& .MuiInputLabel-root.Mui-focused": {
                      color: "#eccb34",
                    },
                  }}
                />
                <TextField
                  label="Google Sheet ID"
                  name="GoogleSheetId"
                  value={editFormData.GoogleSheetId || ""}
                  onChange={handleInputChange}
                  variant="outlined"
                  fullWidth
                  multiline
                  rows={1}
                  className="md:col-span-2"
                  sx={{
                    "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
                      {
                        borderColor: "#eccb34",
                      },
                    "& .MuiInputLabel-root.Mui-focused": {
                      color: "#eccb34",
                    },
                  }}
                />
                <TextField
                  label="Google Folder ID"
                  name="GoogleFolderId"
                  value={editFormData.GoogleFolderId || ""}
                  onChange={handleInputChange}
                  variant="outlined"
                  fullWidth
                  multiline
                  rows={1}
                  className="md:col-span-2"
                  sx={{
                    "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
                      {
                        borderColor: "#eccb34",
                      },
                    "& .MuiInputLabel-root.Mui-focused": {
                      color: "#eccb34",
                    },
                  }}
                />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => setEditDialogOpen(false)}
                sx={{ color: "#333" }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                variant="contained"
                disabled={isLoading}
                sx={{
                  textTransform: "none",
                  bgcolor: "#eccb34",
                  color: "#333333",
                  "&:hover": { bgcolor: "#d9b92f" },
                }}
              >
                {isLoading ? (
                  <CircularProgress size={24} sx={{ color: "#333" }} />
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </div>
  );
};

export default PropertyList;
