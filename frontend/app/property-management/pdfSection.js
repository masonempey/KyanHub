import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { useState } from "react";
import dayjs from "dayjs";
import fetchWithAuth from "../utils/fetchWithAuth";

const PdfSection = ({
  selectedPropertyName,
  products,
  amounts,
  rates,
  monthYear,
}) => {
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [pdfLink, setPdfLink] = useState("");

  const handleGeneratePDF = async () => {
    if (!selectedPropertyName) {
      setErrorMessage("Please select a property before generating PDF.");
      setErrorDialogOpen(true);
      return;
    }

    const PDFMonthYear = dayjs(monthYear).format("MMMMYYYY");

    try {
      const response = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/pdf/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            propertyName: selectedPropertyName,
            products,
            amounts: amounts.map(Number),
            rates,
            monthYear: PDFMonthYear,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setPdfLink(data.webViewLink);
        setSuccessDialogOpen(true);
      } else {
        throw new Error(data.error || "Failed to upload PDF");
      }
    } catch (error) {
      console.error("PDF generation failed:", error.message);
      setErrorMessage(error.message || "Failed to generate and upload PDF.");
      setErrorDialogOpen(true);
    }
  };

  return (
    <div>
      <Button
        variant="outlined"
        sx={{
          color: "#eccb34",
          borderColor: "#eccb34",
          "&:hover": { borderColor: "#eccb34" },
        }}
        onClick={handleGeneratePDF}
      >
        Send PDF's to Drive
      </Button>
      <Dialog
        open={successDialogOpen}
        onClose={() => setSuccessDialogOpen(false)}
        PaperProps={{
          sx: {
            backgroundColor: "#eccb34",
            color: "#fafafa",
            borderRadius: "8px",
          },
        }}
      >
        <DialogTitle sx={{ color: "#fafafa" }}>Success</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: "#fafafa" }}>
            PDF uploaded successfully to Drive!{" "}
            <a href={pdfLink} target="_blank" style={{ color: "#fafafa" }}>
              View Link
            </a>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setSuccessDialogOpen(false)}
            sx={{
              color: "#fafafa",
              "&:hover": { backgroundColor: "rgba(250, 250, 250, 0.1)" },
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={errorDialogOpen}
        onClose={() => setErrorDialogOpen(false)}
        PaperProps={{
          sx: {
            backgroundColor: "#eccb34",
            color: "#fafafa",
            borderRadius: "8px",
          },
        }}
      >
        <DialogTitle sx={{ color: "#fafafa" }}>Error</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: "#fafafa" }}>
            {errorMessage}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setErrorDialogOpen(false)}
            sx={{
              color: "#fafafa",
              "&:hover": { backgroundColor: "rgba(250, 250, 250, 0.1)" },
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default PdfSection;
