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
    setProperty(selectedId);
    if (typeof onPropertySelect === "function") {
      onPropertySelect(selectedId, propertyName);
    }
  };

  return (
    <Box>
      <FormControl
        fullWidth
        size="large"
        className="border border-primary rounded-lg"
      >
        <InputLabel id="property-select-label" className="text-dark">
          {label}
        </InputLabel>

        <Select
          labelId="property-select-label"
          id="property-select"
          value={property}
          label="Property"
          onChange={handleChange}
          disabled={loading}
          className="rounded-lg text-dark bg-white border-primary"
        >
          {Object.entries(properties).map(([uid, name]) => (
            <MenuItem key={uid} value={uid} className="text-dark">
              {name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};

export default PropertyFilterBar;
