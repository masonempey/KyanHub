import { useState } from "react";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import InputLabel from "@mui/material/InputLabel";
import Box from "@mui/material/Box";

const OptionBar = ({ placeholder, options }) => {
  const [selectedOption, setSelectedOption] = useState("");
  const [label, setLabel] = useState(placeholder);

  const handleChange = (event) => {
    setSelectedOption(event.target.value);
  };

  const handleFocus = () => {
    setLabel("Properties");
  };

  const handleBlur = () => {
    if (!selectedOption) {
      setLabel(placeholder);
    }
  };

  return (
    <Box>
      <FormControl
        sx={{ m: 1, minWidth: 300, color: "#2b2b2b", opacity: 0.9 }}
        size="large"
      >
        <InputLabel
          id="option-select-label"
          sx={{ borderRadius: "8px", color: "#2b2b2b", opacity: 0.9 }}
        >
          {label}
        </InputLabel>
        <Select
          labelId="option-select-label"
          id="option-select"
          value={selectedOption}
          label="Option"
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          sx={{ borderRadius: "8px", color: "#2b2b2b", opacity: 0.9 }}
        >
          {options.map((option, index) => (
            <MenuItem key={index} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};

export default OptionBar;
