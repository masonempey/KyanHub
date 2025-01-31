import Button from "@mui/material/Button";

const PdfSection = ({
  selectedPropertyName,
  products,
  amounts,
  ownersName,
  rates,
}) => {
  const handleGeneratePDF = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/pdf/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownersName,
          propertyName: selectedPropertyName,
          products,
          amounts,
          rates,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert(`PDF uploaded successfully to Drive!\nLink: ${data.webViewLink}`);
      } else {
        throw new Error(data.error || "Failed to upload PDF");
      }
    } catch (error) {
      console.error("PDF generation failed:", error);
      alert("Failed to generate and upload PDF");
    }
  };

  return (
    <div>
      <Button
        variant="outlined"
        sx={{ color: "#eccb34", borderColor: "#eccb34" }}
        onClick={handleGeneratePDF}
      >
        Send PDF's to Drive
      </Button>
    </div>
  );
};

export default PdfSection;
