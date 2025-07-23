import { useState, useEffect } from "react";
import {
  CircularProgress,
  Typography,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  Divider,
  Box,
  Tab,
  Tabs,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import fetchWithAuth from "@/lib/fetchWithAuth";

const PropertyDetails = ({ propertyId, onError, onSuccess }) => {
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detailsTab, setDetailsTab] = useState(0);

  useEffect(() => {
    const fetchPropertyDetails = async () => {
      setLoading(true);
      try {
        const response = await fetchWithAuth(`/api/properties/${propertyId}`);

        if (!response.ok) {
          throw new Error("Failed to fetch property details");
        }

        const data = await response.json();
        setProperty(data);
      } catch (error) {
        onError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPropertyDetails();
  }, [propertyId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProperty((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetchWithAuth(`/api/properties/${propertyId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(property),
      });

      if (!response.ok) {
        throw new Error("Failed to update property");
      }

      onSuccess();
    } catch (error) {
      onError(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <CircularProgress sx={{ color: "#eccb34" }} />
      </div>
    );
  }

  return (
    <div className="overflow-auto pb-6 px-2 sm:px-4">
      {property && (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <Typography
              variant="h4"
              component="h2"
              sx={{
                fontSize: { xs: "1.5rem", sm: "2rem" },
              }}
            >
              {property.name}
            </Typography>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={saving}
              sx={{
                bgcolor: "#eccb34",
                color: "#333333",
                whiteSpace: "nowrap",
                "&:hover": {
                  bgcolor: "#d9b92f",
                },
              }}
            >
              {saving ? <CircularProgress size={24} /> : "Save Changes"}
            </Button>
          </div>

          <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
            <Tabs
              value={detailsTab}
              onChange={(e, val) => setDetailsTab(val)}
              variant="scrollable" // Add this for small screens
              scrollButtons="auto" // Add this for small screens
              allowScrollButtonsMobile // Add this for small screens
              sx={{
                "& .MuiTab-root": {
                  color: "#333333",
                  "&.Mui-selected": { color: "#eccb34" },
                  fontSize: { xs: "0.8rem", sm: "0.875rem" },
                  padding: { xs: "6px 12px", sm: "12px 16px" },
                },
                "& .MuiTabs-indicator": { backgroundColor: "#eccb34" },
              }}
            >
              <Tab label="Basic Information" />
              <Tab label="Financial Details" />
              <Tab label="Contacts" />
            </Tabs>
          </Box>

          {detailsTab === 0 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Property Information
                    </Typography>
                    <Divider className="mb-4" />
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <TextField
                          label="Property Name"
                          name="name"
                          value={property.name || ""}
                          onChange={handleInputChange}
                          fullWidth
                          variant="outlined"
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          label="Address"
                          name="address"
                          value={property.address || ""}
                          onChange={handleInputChange}
                          fullWidth
                          variant="outlined"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="City"
                          name="city"
                          value={property.city || ""}
                          onChange={handleInputChange}
                          fullWidth
                          variant="outlined"
                        />
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <TextField
                          label="State"
                          name="state"
                          value={property.state || ""}
                          onChange={handleInputChange}
                          fullWidth
                          variant="outlined"
                        />
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <TextField
                          label="Zip Code"
                          name="zipCode"
                          value={property.zipCode || ""}
                          onChange={handleInputChange}
                          fullWidth
                          variant="outlined"
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* Second card adjustments similar to above */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Property Details
                    </Typography>
                    <Divider className="mb-4" />
                    <Grid container spacing={2}>
                      <Grid item xs={4}>
                        <TextField
                          label="Bedrooms"
                          name="bedrooms"
                          type="number"
                          value={property.bedrooms || ""}
                          onChange={handleInputChange}
                          fullWidth
                          variant="outlined"
                        />
                      </Grid>
                      <Grid item xs={4}>
                        <TextField
                          label="Bathrooms"
                          name="bathrooms"
                          type="number"
                          value={property.bathrooms || ""}
                          onChange={handleInputChange}
                          fullWidth
                          variant="outlined"
                        />
                      </Grid>
                      <Grid item xs={4}>
                        <TextField
                          label="Sq Ft"
                          name="sqft"
                          type="number"
                          value={property.sqft || ""}
                          onChange={handleInputChange}
                          fullWidth
                          variant="outlined"
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          label="Property Description"
                          name="description"
                          value={property.description || ""}
                          onChange={handleInputChange}
                          multiline
                          rows={4}
                          fullWidth
                          variant="outlined"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth variant="outlined">
                          <InputLabel id="property-type-label">
                            Property Type
                          </InputLabel>
                          <Select
                            labelId="property-type-label"
                            id="property-type"
                            name="propertyType"
                            value={property.propertyType || ""}
                            onChange={handleInputChange}
                            label="Property Type"
                          >
                            <MenuItem value="">
                              <em>Select a type</em>
                            </MenuItem>
                            <MenuItem value="studio">Studio</MenuItem>
                            <MenuItem value="1_bedroom">1 Bedroom</MenuItem>
                            <MenuItem value="2_bedroom">2 Bedroom</MenuItem>
                            <MenuItem value="3_bedroom">3 Bedroom</MenuItem>
                            <MenuItem value="townhome">Townhome</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </>
      )}
    </div>
  );
};

export default PropertyDetails;
