import { useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import fetchWithAuth from "@/lib/fetchWithAuth";

const AddCompanyDialog = ({ open, onClose, onAddCompany, endpoint }) => {
  const [companyName, setCompanyName] = useState("");
  const [googleFolderId, setGoogleFolderId] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!companyName.trim()) {
      setError("Company name is required");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetchWithAuth(endpoint, {
        method: "POST",
        body: JSON.stringify({
          companyName: companyName.trim(),
          googleFolderId: googleFolderId.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to add company: ${await response.text()}`);
      }

      const data = await response.json();
      onAddCompany(companyName.trim(), googleFolderId.trim());
      handleClose();
    } catch (error) {
      console.error("Error adding company:", error);
      setError(error.message || "Failed to add company");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setCompanyName("");
    setGoogleFolderId(""); // Reset folder ID
    setError("");
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      PaperProps={{
        sx: {
          backgroundColor: "#fafafa",
          color: "#333333",
          borderRadius: "12px",
          border: "1px solid rgba(236, 203, 52, 0.2)",
        },
      }}
    >
      <DialogTitle sx={{ color: "#333333" }}>Add New Company</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Company Name"
          fullWidth
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          error={!!error}
          helperText={error}
          sx={{
            "& .MuiOutlinedInput-root": {
              "& fieldset": { borderColor: "#eccb34" },
              "&:hover fieldset": { borderColor: "#eccb34" },
              "&.Mui-focused fieldset": { borderColor: "#eccb34" },
            },
            "& .MuiInputBase-input": { color: "#333333" },
            "& .MuiFormHelperText-root": { color: "#eccb34" },
            marginBottom: 2,
          }}
        />

        {/* New Google Folder ID input */}
        <TextField
          margin="dense"
          label="Google Folder ID"
          fullWidth
          value={googleFolderId}
          onChange={(e) => setGoogleFolderId(e.target.value)}
          sx={{
            "& .MuiOutlinedInput-root": {
              "& fieldset": { borderColor: "#eccb34" },
              "&:hover fieldset": { borderColor: "#eccb34" },
              "&.Mui-focused fieldset": { borderColor: "#eccb34" },
            },
            "& .MuiInputBase-input": { color: "#333333" },
            "& .MuiFormHelperText-root": { color: "#eccb34" },
          }}
          helperText="Optional: Enter the company's Google Drive Folder ID"
        />
      </DialogContent>
      <DialogActions>
        <Button
          onClick={handleClose}
          className="text-dark hover:bg-primary/5 transition-colors"
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          className="bg-primary text-dark hover:bg-primary/80 transition-colors"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Adding..." : "Add"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddCompanyDialog;
