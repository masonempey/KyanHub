"use client";

import { useState, useEffect } from "react";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import InputLabel from "@mui/material/InputLabel";
import Box from "@mui/material/Box";

const PropertyFilterBar = ({
  properties = {},
  loading = false,
  onPropertySelect,
}) => {
  const [property, setProperty] = useState("");
  const [label, setLabel] = useState("Search All Properties");

  useEffect(() => {
    if (!loading && Object.keys(properties).length > 0 && !property) {
      const firstPropertyId = Object.keys(properties)[0];
      const firstPropertyObj = properties[firstPropertyId];
      // Extract name from the property object
      const firstPropertyName =
        typeof firstPropertyObj === "object"
          ? firstPropertyObj.name
          : firstPropertyObj;

      setProperty(firstPropertyId);
      setLabel("Properties");
      if (typeof onPropertySelect === "function") {
        onPropertySelect(firstPropertyId, firstPropertyObj);
      }
    }
  }, [properties, loading, onPropertySelect]);

  const handleChange = (event) => {
    const selectedId = event.target.value;
    const propertyObj = properties[selectedId];
    setProperty(selectedId);
    if (typeof onPropertySelect === "function") {
      onPropertySelect(selectedId, propertyObj);
    }
  };

  return (
    <Box>
      <FormControl fullWidth size="large">
        <InputLabel
          id="property-select-label"
          sx={{
            color: "#333333", // 'dark'
            "&.Mui-focused": { color: "#333333" }, // Keep 'dark' when focused
            "&:hover": { color: "#333333" }, // Keep 'dark' on hover
          }}
        >
          {label}
        </InputLabel>
        <Select
          labelId="property-select-label"
          id="property-select"
          value={property}
          label="Property"
          onChange={handleChange}
          disabled={loading}
          sx={{
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: "#333333", // 'dark'
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: "#333333", // 'dark' on hover
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: "#333333", // 'dark' when focused
            },
            color: "#333333", // 'dark'
            backgroundColor: "white",
            borderRadius: "8px",
          }}
        >
          {Object.entries(properties).map(([uid, propertyData]) => {
            // Extract name safely from the property data
            const displayName =
              typeof propertyData === "object"
                ? propertyData.name
                : propertyData;

            return (
              <MenuItem
                key={uid}
                value={uid}
                sx={{ color: "#333333" }} // 'dark'
              >
                {displayName}
              </MenuItem>
            );
          })}
        </Select>
      </FormControl>
    </Box>
  );
};

export default PropertyFilterBar;
