const express = require("express");
const router = express.Router();
const PDFDocument = require("pdfkit");
const path = require("path");
const fs = require("fs");
const { Buffer } = require("buffer");
const googleService = require("../services/googleService");

const formatDate = (date) => {
  const options = { month: "long", day: "numeric", year: "numeric" };
  return new Date(date).toLocaleDateString("en-US", options);
};

const getEndOfNextMonth = () => {
  const today = new Date();
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 2, 0);
  return formatDate(lastDay);
};

router.post("/generate", async (req, res) => {
  try {
    await googleService.init();
    const { propertyName, monthYear, products, amounts, rates } = req.body;

    const doc = new PDFDocument();
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));

    // Handle PDF completion
    doc.on("end", async () => {
      try {
        const pdfBuffer = Buffer.concat(chunks);

        const receiptsFolderId = await googleService.findReceiptsFolder(
          propertyName,
          monthYear
        );

        const { fileId, webViewLink } = await googleService.uploadPDF(
          pdfBuffer,
          `${propertyName}-invoice.pdf`,
          receiptsFolderId
        );

        res.json({
          success: true,
          fileId,
          webViewLink,
          message: "PDF generated and uploaded successfully",
        });
      } catch (error) {
        console.error("PDF upload error:", error);
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

    try {
      // Add logo on right
      const logoPath = path.resolve(__dirname, "../../assets/logo.png");
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 450, 30, {
          fit: [100, 100],
          align: "right",
        });
      }

      // Add company details on left
      doc
        .font("Helvetica-Bold")
        .fontSize(14)
        .text("KYAN Properties Ltd.", 50, 30)
        .font("Helvetica")
        .fontSize(12)
        .text("1917 10 Ave SW", 50)
        .text("Calgary AB T3C 0J8", 50)
        .text("Info@kyanproperties.com", 50);

      doc
        .moveDown(2)
        .fontSize(24)
        .fillColor("#89CFF0") // Baby blue
        .text("INVOICE", 50)
        .moveDown(1)
        .fillColor("black")
        .font("Helvetica-Bold")
        .fontSize(14)
        .text("Bill To:", 50)
        .moveDown(0.5)
        .font("Helvetica")
        .fontSize(14)
        .text(ownersName, 50)
        .text(propertyName, 50)
        .moveDown(2);

      const propertyY = doc.y;
      doc.font("Helvetica-Bold").fontSize(18).text(propertyName, 50);

      doc
        .font("Helvetica-Bold")
        .fontSize(14)
        .text(`Date:`, 300, propertyY, { align: "right", width: 250 })
        .font("Helvetica")
        .text(formatDate(new Date()), 300, propertyY + 20, {
          align: "right",
          width: 250,
        })
        .font("Helvetica-Bold")
        .text("Due Date:", 300, propertyY + 40, { align: "right", width: 250 })
        .font("Helvetica")
        .text(formatDate(getEndOfNextMonth()), 300, propertyY + 60, {
          align: "right",
          width: 250,
        });

      // Add extra space before table
      doc.moveDown(3);

      const tableTop = doc.y + 20;

      doc
        .fillColor("#89CFF0") // Baby blue
        .rect(50, tableTop - 20, 500, 25)
        .fill();

      // Add header text
      doc
        .fillColor("black")
        .font("Helvetica-Bold")
        .fontSize(12)
        .text("Item", 60, tableTop - 15)
        .text("Qty", 210, tableTop - 15)
        .text("Rate", 360, tableTop - 15)
        .text("Amount", 460, tableTop - 15);

      // Add table content
      let yPosition = tableTop + 10;
      const rowHeight = 20;
      let totalBalance = 0;

      if (Array.isArray(products) && Array.isArray(amounts)) {
        products.forEach((product, index) => {
          const amount = amounts[index];
          const rate = parseFloat(rates[index]) || 0;

          console.log("Row data:", {
            product,
            amount,
            rate,
            index,
          });

          if (amount && amount !== 0) {
            const rowTotal = amount * rate;
            totalBalance += rowTotal;

            // Add light grey background
            doc
              .fillColor("#f5f5f5")
              .rect(50, yPosition - 5, 500, rowHeight)
              .fill();

            // Add text content
            doc
              .fillColor("black")
              .font("Helvetica")
              .fontSize(10)
              .text(product || "", 60, yPosition)
              .text(amount.toString(), 210, yPosition)
              .text(`$${rate.toFixed(2)}`, 360, yPosition)
              .text(`$${rowTotal.toFixed(2)}`, 460, yPosition);

            yPosition += rowHeight;
          }
        });

        // Add total section
        yPosition += 20;
        doc
          .font("Helvetica-Bold")
          .fontSize(12)
          .text("Total Balance:", 360, yPosition)
          .text(`$${totalBalance.toFixed(2)}`, 460, yPosition);
      }

      doc.end();
    } catch (error) {
      console.error("PDF generation error:", error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    }
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
});

module.exports = router;
