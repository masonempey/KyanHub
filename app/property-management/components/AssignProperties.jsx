"use client";

import { useState, useEffect } from "react";
import {
  CircularProgress,
  Typography,
  Card,
  CardContent,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import fetchWithAuth from "@/lib/fetchWithAuth";
import { useProperties } from "@/contexts/PropertyContext";

const AssignProperties = ({ ownerId }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.down("md"));

  const { properties } = useProperties();
  const [owner, setOwner] = useState(null);
  const [ownerProperties, setOwnerProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState("");
  const [ownershipPercentage, setOwnershipPercentage] = useState(80);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch owner details
        const ownerResponse = await fetchWithAuth(`/api/owners/${ownerId}`);
        if (!ownerResponse.ok) {
          throw new Error(
            `Failed to fetch owner: ${await ownerResponse.text()}`
          );
        }
        const ownerData = await ownerResponse.json();
        setOwner(ownerData.owner);

        // Fetch associated properties
        const propsResponse = await fetchWithAuth(
          `/api/owners/${ownerId}/properties`
        );
        if (!propsResponse.ok) {
          throw new Error(
            `Failed to fetch owner properties: ${await propsResponse.text()}`
          );
        }
        const propsData = await propsResponse.json();
        setOwnerProperties(propsData.properties);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [ownerId]);

  const addProperty = async () => {
    if (!selectedProperty) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetchWithAuth(
        `/api/owners/${ownerId}/properties`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            property_uid: selectedProperty,
            ownership_percentage: ownershipPercentage,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to assign property: ${await response.text()}`);
      }

      const data = await response.json();
      setOwnerProperties([...ownerProperties, data.property]);
      setSelectedProperty("");
      setOwnershipPercentage(80);
      setSuccess("Property assigned successfully");

      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      console.error("Error assigning property:", err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const removeProperty = async (propertyUid) => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetchWithAuth(
        `/api/owners/${ownerId}/properties/${propertyUid}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to remove property: ${await response.text()}`);
      }

      setOwnerProperties(
        ownerProperties.filter((p) => p.property_uid !== propertyUid)
      );
      setSuccess("Property removed successfully");

      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      console.error("Error removing property:", err);
      setError(err.message);
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

  if (!owner) {
    return (
      <div className="text-red-500 p-4 bg-red-50 rounded-lg">
        Error: Owner not found
      </div>
    );
  }

  // Create array of property objects from the properties context
  const propertyOptions = Object.entries(properties)
    .map(([id, propData]) => ({
      id,
      name: typeof propData === "object" ? propData.name : propData,
    }))
    .filter(
      // Filter out properties that are already assigned
      (prop) => !ownerProperties.find((p) => p.property_uid === prop.id)
    );

  return (
    <div className="w-full max-w-full sm:max-w-4xl mx-auto px-2 sm:px-4">
      <Typography
        variant={isMobile ? "h5" : "h4"}
        component="h2"
        gutterBottom
        sx={{
          fontSize: { xs: "1.25rem", sm: "1.5rem", md: "2rem" },
          wordBreak: "break-word",
          mb: 2,
        }}
      >
        Property Assignments for {owner.name}
      </Typography>

      {error && (
        <Box
          sx={{
            p: { xs: 1.5, sm: 2 },
            mb: 2,
            bgcolor: "#fdeded",
            color: "#5f2120",
            borderRadius: 1,
            fontSize: { xs: "0.875rem", sm: "1rem" },
          }}
        >
          {error}
        </Box>
      )}

      {success && (
        <Box
          sx={{
            p: { xs: 1.5, sm: 2 },
            mb: 2,
            bgcolor: "#edf7ed",
            color: "#1e4620",
            borderRadius: 1,
            fontSize: { xs: "0.875rem", sm: "1rem" },
          }}
        >
          {success}
        </Box>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {/* Assign new property */}
        <Card sx={{ mb: { xs: 2, md: 0 } }}>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ fontSize: { xs: "1rem", sm: "1.25rem" } }}
            >
              Assign New Property
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="property-select-label">
                Select Property
              </InputLabel>
              <Select
                labelId="property-select-label"
                value={selectedProperty}
                onChange={(e) => setSelectedProperty(e.target.value)}
                label="Select Property"
                sx={{
                  "& .MuiOutlinedInput-notchedOutline": {
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
                  fontSize: { xs: "0.875rem", sm: "1rem" },
                }}
              >
                <MenuItem value="">
                  <em>Select a property</em>
                </MenuItem>
                {propertyOptions.map((property) => (
                  <MenuItem key={property.id} value={property.id}>
                    {property.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Revenue Split"
              type="number"
              inputProps={{ min: 1, max: 100 }}
              value={ownershipPercentage}
              onChange={(e) => setOwnershipPercentage(e.target.value)}
              fullWidth
              sx={{
                mb: 2,
                "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
                  {
                    borderColor: "#eccb34",
                  },
                "& .MuiInputLabel-root.Mui-focused": {
                  color: "#eccb34",
                },
                "& .MuiInputBase-input": {
                  fontSize: { xs: "0.875rem", sm: "1rem" },
                },
              }}
            />

            <Button
              variant="contained"
              onClick={addProperty}
              disabled={!selectedProperty || saving}
              sx={{
                bgcolor: "#eccb34",
                color: "#333333",
                "&:hover": { bgcolor: "#d9b92f" },
                "&.Mui-disabled": { bgcolor: "#f0f0f0", color: "#999" },
                fontSize: { xs: "0.75rem", sm: "0.875rem" },
                py: { xs: 1, sm: 1.5 },
                width: { xs: "100%", sm: "auto" },
              }}
            >
              {saving ? "Assigning..." : "Assign Property"}
            </Button>
          </CardContent>
        </Card>

        {/* Current properties */}
        <Card>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ fontSize: { xs: "1rem", sm: "1.25rem" } }}
            >
              Assigned Properties
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {ownerProperties.length === 0 ? (
              <Typography
                variant="body1"
                color="textSecondary"
                sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}
              >
                No properties assigned to this owner yet.
              </Typography>
            ) : (
              <List
                disablePadding
                sx={{
                  maxHeight: { xs: "300px", sm: "400px" },
                  overflow: "auto",
                }}
              >
                {ownerProperties.map((prop) => {
                  const propertyName = properties[prop.property_uid]
                    ? typeof properties[prop.property_uid] === "object"
                      ? properties[prop.property_uid].name
                      : properties[prop.property_uid]
                    : prop.property_uid;

                  return (
                    <ListItem
                      key={prop.property_uid}
                      divider
                      sx={{
                        flexDirection: { xs: "column", sm: "row" },
                        alignItems: { xs: "flex-start", sm: "center" },
                        py: { xs: 2, sm: 1 },
                      }}
                    >
                      <ListItemText
                        primary={
                          <Typography
                            sx={{
                              fontSize: { xs: "0.875rem", sm: "1rem" },
                              fontWeight: "medium",
                              mb: { xs: 1, sm: 0 },
                            }}
                          >
                            {propertyName}
                          </Typography>
                        }
                        secondary={
                          <Box
                            sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
                          >
                            <span>{prop.ownership_percentage}% ownership</span>
                            <br />
                            <span>
                              Since:{" "}
                              {new Date(
                                prop.ownership_date
                              ).toLocaleDateString()}
                            </span>
                          </Box>
                        }
                        sx={{
                          mr: { xs: 0, sm: 2 },
                          mb: { xs: 1, sm: 0 },
                          width: "100%",
                        }}
                      />
                      <Box
                        sx={{
                          width: { xs: "100%", sm: "auto" },
                          display: "flex",
                          justifyContent: { xs: "flex-end", sm: "flex-end" },
                        }}
                      >
                        <Button
                          variant="outlined"
                          size="small"
                          color="error"
                          onClick={() => removeProperty(prop.property_uid)}
                          disabled={saving}
                          sx={{
                            mt: { xs: 1, sm: 0 },
                            fontSize: { xs: "0.75rem", sm: "0.75rem" },
                          }}
                        >
                          Remove
                        </Button>
                      </Box>
                    </ListItem>
                  );
                })}
              </List>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AssignProperties;
