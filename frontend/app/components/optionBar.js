import { useState } from "react";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import InputLabel from "@mui/material/InputLabel";
import Box from "@mui/material/Box";

const OptionBar = ({ placeholder, options, label: initialLabel, onSelect }) => {
  const [selectedOption, setSelectedOption] = useState("");
  const [labelText, setLabelText] = useState("");

  const handleChange = (event) => {
    setSelectedOption(event.target.value);
    setLabelText(initialLabel);
    if (onSelect) {
      onSelect(event.target.value);
    }
  };

  const handleFocus = () => {
    setLabelText(initialLabel);
  };

  const handleBlur = () => {
    if (!selectedOption) {
      setLabelText(""); // Reset to empty if no option is selected
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
          {labelText}
        </InputLabel>
        <Select
          labelId="option-select-label"
          id="option-select"
          value={selectedOption}
          label={labelText}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          sx={{ borderRadius: "8px", color: "#2b2b2b", opacity: 0.9 }}
          displayEmpty
        >
          <MenuItem value="" disabled>
            {placeholder}
          </MenuItem>
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
