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

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;

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

  const handleEdit = async (property, e) => {
    e.stopPropagation();
    setSelectedProperty(property);

    // Show loading indicator
    setIsLoading(true);

    try {
      // Fetch full property details directly from API when editing
      const response = await fetchWithAuth(`/api/properties/${property.id}`);

      if (!response.ok) {
        throw new Error(
          `Failed to fetch property details: ${await response.text()}`
        );
      }

      const fullPropertyData = await response.json();
      console.log("Fetched property details:", fullPropertyData);

      // Set form data with fields from API response - note the snake_case to camelCase conversion
      setEditFormData({
        name: property.name || "",
        address: property.address || "",
        bedrooms: property.Bedrooms || fullPropertyData.bedrooms || "",
        bathrooms: property.Bathrooms || fullPropertyData.bathrooms || "",
        sqft: property.sqft || fullPropertyData.sqft || "",
        propertyType: fullPropertyData.property_type || "",
        GoogleSheetId: fullPropertyData.google_sheet_id || "",
        GoogleFolderId: fullPropertyData.google_folder_id || "",
      });
    } catch (error) {
      console.error("Failed to fetch property details:", error);
      // Fall back to what we have in the context (which might be incomplete)
      const propertyWithDetails = getPropertyWithDetails(property.id) || {};

      setEditFormData({
        name: property.name || "",
        address: property.address || "",
        bedrooms: property.Bedrooms || "",
        bathrooms: property.Bathrooms || "",
        sqft: property.sqft || "",
        GoogleSheetId: propertyWithDetails?.GoogleSheetId || "",
        GoogleFolderId: propertyWithDetails?.GoogleFolderId || "",
      });

      onError && onError("Failed to load complete property details");
    } finally {
      setIsLoading(false);
      setEditDialogOpen(true);
    }
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
            propertyType: editFormData.propertyType,
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

  // Update MenuProps to prevent auto-closing on clicks within the menu
  const MenuProps = {
    PaperProps: {
      style: {
        maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
        width: 250,
        backgroundColor: "#fafafa",
        color: "#333333",
        boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
        border: "1px solid rgba(236, 203, 52, 0.3)",
        borderRadius: "8px",
      },
    },
    // This will help prevent menu closing when clicking buttons
    anchorOrigin: {
      vertical: "bottom",
      horizontal: "left",
    },
    transformOrigin: {
      vertical: "top",
      horizontal: "left",
    },
    getContentAnchorEl: null,
  };

  // Update the button click handlers to prevent propagation
  const handleSelectAll = (event) => {
    event.stopPropagation(); // Prevent dropdown from closing
    if (onChange) {
      const allPropertyIds = propertyArray.map((property) => property.id);
      onChange(allPropertyIds);
    }
  };

  const handleClearAll = (event) => {
    event.stopPropagation(); // Prevent dropdown from closing
    if (onChange) {
      onChange([]);
    }
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
            MenuProps={MenuProps}
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

                <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
                  <InputLabel id="property-type-edit-label">
                    Property Type
                  </InputLabel>
                  <Select
                    labelId="property-type-edit-label"
                    id="property-type-edit"
                    name="propertyType"
                    value={editFormData.propertyType || ""}
                    onChange={handleInputChange}
                    label="Property Type"
                    sx={{
                      "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
                        {
                          borderColor: "#eccb34",
                        },
                      "& .MuiInputLabel-root.Mui-focused": {
                        color: "#eccb34",
                      },
                    }}
                  >
                    <MenuItem value="">
                      <em>Select a type</em>
                    </MenuItem>
                    <MenuItem value="studio">Studio</MenuItem>
                    <MenuItem value="1_bedroom">1 Bedroom</MenuItem>
                    <MenuItem value="2_bedroom">2 Bedroom</MenuItem>
                    <MenuItem value="3_bedroom">3 Bedroom</MenuItem>
                    <MenuItem value="townhome">Townhome</MenuItem>
                    <MenuItem value="invermere">Invermere</MenuItem>
                    <MenuItem value="kelowna">Kelowna</MenuItem>
                  </Select>
                </FormControl>

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
