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

  // Add useEffect to set default property
  useEffect(() => {
    if (!loading && Object.keys(properties).length > 0 && !property) {
      const firstPropertyId = Object.keys(properties)[0];
      const firstPropertyName = properties[firstPropertyId];
      setProperty(firstPropertyId);
      setLabel("Properties");
      if (typeof onPropertySelect === "function") {
        onPropertySelect(firstPropertyId, firstPropertyName);
      }
    }
  }, [properties, loading, onPropertySelect]);

  const handleChange = (event) => {
    const selectedId = event.target.value;
    const propertyName = properties[selectedId];
    console.log("Selected:", { id: selectedId, name: propertyName });

    setProperty(selectedId);
    if (typeof onPropertySelect === "function") {
      onPropertySelect(selectedId, propertyName);
    }
  };

  const handleFocus = () => {
    setLabel("Properties");
  };

  const handleBlur = () => {
    if (!property) {
      setLabel("Search All Properties");
    }
  };

  return (
    <Box>
      <FormControl
        sx={{
          m: 1,
          minWidth: 300,
          color: "#2b2b2b",
          opacity: 0.9,
          borderColor: "#eccb34",
        }}
        size="large"
      >
        <InputLabel
          id="property-select-label"
          sx={{ borderRadius: "8px", color: "#2b2b2b", opacity: 0.9 }}
        >
          {label}
        </InputLabel>
        <Select
          labelId="property-select-label"
          id="property-select"
          value={property}
          label="Property"
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={loading}
          sx={{ borderRadius: "8px", color: "#2b2b2b", opacity: 0.9 }}
        >
          {Object.entries(properties).map(([uid, name]) => (
            <MenuItem key={uid} value={uid}>
              {name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};

export default PropertyFilterBar;
