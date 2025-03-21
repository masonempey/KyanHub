import { useState, useEffect } from "react";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import fetchWithAuth from "@/lib/fetchWithAuth";

const EditCompanyDialog = ({ open, onClose, company, onEditSuccess }) => {
  const [googleFolderId, setGoogleFolderId] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open && company) {
      setGoogleFolderId(company.googleFolderId || "");
    }
  }, [open, company]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetchWithAuth("/api/cleaning/add-company", {
        method: "PATCH",
        body: JSON.stringify({
          companyName: company.value,
          googleFolderId: googleFolderId.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update company: ${await response.text()}`);
      }

      onEditSuccess(company.value, googleFolderId.trim());
      handleClose();
    } catch (error) {
      console.error("Error updating company:", error);
      setError(error.message || "Failed to update company");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setGoogleFolderId("");
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
      <DialogTitle sx={{ color: "#333333" }}>Edit Company</DialogTitle>
      <DialogContent>
        <TextField
          margin="dense"
          label="Company Name"
          fullWidth
          value={company?.value || ""}
          disabled
          sx={{
            "& .MuiOutlinedInput-root": {
              "& fieldset": { borderColor: "#eccb34" },
              "&:hover fieldset": { borderColor: "#eccb34" },
              "&.Mui-focused fieldset": { borderColor: "#eccb34" },
            },
            "& .MuiInputBase-input": { color: "#333333" },
            marginBottom: 2,
          }}
        />

        <TextField
          margin="dense"
          label="Google Folder ID"
          fullWidth
          value={googleFolderId}
          onChange={(e) => setGoogleFolderId(e.target.value)}
          error={!!error}
          helperText={error || "Enter the company's Google Drive Folder ID"}
          sx={{
            "& .MuiOutlinedInput-root": {
              "& fieldset": { borderColor: "#eccb34" },
              "&:hover fieldset": { borderColor: "#eccb34" },
              "&.Mui-focused fieldset": { borderColor: "#eccb34" },
            },
            "& .MuiInputBase-input": { color: "#333333" },
            "& .MuiFormHelperText-root": { color: error ? "#f44336" : "#666" },
          }}
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
          {isSubmitting ? "Updating..." : "Update"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditCompanyDialog;
