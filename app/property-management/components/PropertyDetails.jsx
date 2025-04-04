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
                  fontSize: { xs: "0.8rem", sm: "0.875rem" }, // Responsive font size
                  padding: { xs: "6px 12px", sm: "12px 16px" }, // Responsive padding
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
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* For other tabs */}
          {detailsTab === 1 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  {/* Similar adjustments to the grid items for financial section */}
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Financial Overview
                    </Typography>
                    <Divider className="mb-4" />
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Purchase Price"
                          name="purchasePrice"
                          type="number"
                          value={property.purchasePrice || ""}
                          onChange={handleInputChange}
                          fullWidth
                          variant="outlined"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Current Value"
                          name="currentValue"
                          type="number"
                          value={property.currentValue || ""}
                          onChange={handleInputChange}
                          fullWidth
                          variant="outlined"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Monthly Rental Income"
                          name="rentalIncome"
                          type="number"
                          value={property.rentalIncome || ""}
                          onChange={handleInputChange}
                          fullWidth
                          variant="outlined"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Monthly Expenses"
                          name="monthlyExpenses"
                          type="number"
                          value={property.monthlyExpenses || ""}
                          onChange={handleInputChange}
                          fullWidth
                          variant="outlined"
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Mortgage Information
                    </Typography>
                    <Divider className="mb-4" />
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Mortgage Amount"
                          name="mortgageAmount"
                          type="number"
                          value={property.mortgageAmount || ""}
                          onChange={handleInputChange}
                          fullWidth
                          variant="outlined"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Interest Rate"
                          name="interestRate"
                          type="number"
                          value={property.interestRate || ""}
                          onChange={handleInputChange}
                          fullWidth
                          variant="outlined"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Loan Term (years)"
                          name="loanTerm"
                          type="number"
                          value={property.loanTerm || ""}
                          onChange={handleInputChange}
                          fullWidth
                          variant="outlined"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Monthly Payment"
                          name="monthlyPayment"
                          type="number"
                          value={property.monthlyPayment || ""}
                          onChange={handleInputChange}
                          fullWidth
                          variant="outlined"
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {detailsTab === 2 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Important Contacts
                    </Typography>
                    <Divider className="mb-4" />
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Property Manager"
                          name="propertyManager"
                          value={property.propertyManager || ""}
                          onChange={handleInputChange}
                          fullWidth
                          variant="outlined"
                          className="mb-2"
                        />
                        <TextField
                          label="Property Manager Phone"
                          name="propertyManagerPhone"
                          value={property.propertyManagerPhone || ""}
                          onChange={handleInputChange}
                          fullWidth
                          variant="outlined"
                          className="mb-2"
                        />
                        <TextField
                          label="Property Manager Email"
                          name="propertyManagerEmail"
                          value={property.propertyManagerEmail || ""}
                          onChange={handleInputChange}
                          fullWidth
                          variant="outlined"
                        />
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Maintenance Contact"
                          name="maintenanceContact"
                          value={property.maintenanceContact || ""}
                          onChange={handleInputChange}
                          fullWidth
                          variant="outlined"
                          className="mb-2"
                        />
                        <TextField
                          label="Maintenance Phone"
                          name="maintenancePhone"
                          value={property.maintenancePhone || ""}
                          onChange={handleInputChange}
                          fullWidth
                          variant="outlined"
                          className="mb-2"
                        />
                        <TextField
                          label="Maintenance Email"
                          name="maintenanceEmail"
                          value={property.maintenanceEmail || ""}
                          onChange={handleInputChange}
                          fullWidth
                          variant="outlined"
                        />
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
