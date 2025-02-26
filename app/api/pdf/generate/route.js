// app/api/pdf/generate/route.js
import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";
import { Buffer } from "buffer";
import googleService from "@/lib/services/googleService";

const formatDate = (date) => {
  const options = { month: "long", day: "numeric", year: "numeric" };
  return new Date(date).toLocaleDateString("en-US", options);
};

const getEndOfNextMonth = () => {
  const today = new Date();
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 2, 0);
  return formatDate(lastDay);
};

export async function POST(request) {
  try {
    await googleService.init();
    const { propertyName, monthYear, products, amounts } = await request.json();

    console.log("Generating PDF for:", propertyName, monthYear);

    const rates = products.map((product) => parseFloat(product.price));
    const doc = new PDFDocument();
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));

    return new Promise((resolve) => {
      doc.on("end", async () => {
        try {
          const pdfBuffer = Buffer.concat(chunks);
          console.log("Uploading PDF for:", propertyName, monthYear);

          const receiptsFolderId = await googleService.findReceiptsFolder(
            propertyName,
            monthYear
          );
          const { fileId, webViewLink } = await googleService.uploadPDF(
            pdfBuffer,
            `${propertyName}-invoice.pdf`,
            receiptsFolderId
          );

          resolve(
            new Response(
              JSON.stringify({
                success: true,
                fileId,
                webViewLink,
                message: "PDF generated and uploaded successfully",
              }),
              { status: 200, headers: { "Content-Type": "application/json" } }
            )
          );
        } catch (error) {
          console.error("PDF upload error:", error);
          resolve(
            new Response(
              JSON.stringify({ success: false, error: error.message }),
              { status: 500, headers: { "Content-Type": "application/json" } }
            )
          );
        }
      });

      try {
        const logoPath = path.resolve(process.cwd(), "public/logo.png"); // Adjust path for Next.js public folder
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, 450, 30, { fit: [100, 100], align: "right" });
        }

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
          .fillColor("#89CFF0")
          .text("INVOICE", 50)
          .moveDown(1)
          .fillColor("black")
          .font("Helvetica-Bold")
          .fontSize(14)
          .text("Bill To:", 50)
          .moveDown(0.5)
          .font("Helvetica")
          .fontSize(14)
          .text(propertyName, 50)
          .moveDown(2);

        const propertyY = doc.y;
        doc.font("Helvetica-Bold").fontSize(18).text(propertyName, 50);

        doc
          .font("Helvetica-Bold")
          .fontSize(14)
          .text("Date:", 300, propertyY, { align: "right", width: 250 })
          .font("Helvetica")
          .text(formatDate(new Date()), 300, propertyY + 20, {
            align: "right",
            width: 250,
          })
          .font("Helvetica-Bold")
          .text("Due Date:", 300, propertyY + 40, {
            align: "right",
            width: 250,
          })
          .font("Helvetica")
          .text(formatDate(getEndOfNextMonth()), 300, propertyY + 60, {
            align: "right",
            width: 250,
          });

        doc.moveDown(3);
        const tableTop = doc.y + 20;

        doc
          .fillColor("#89CFF0")
          .rect(50, tableTop - 20, 500, 25)
          .fill();

        doc
          .fillColor("black")
          .font("Helvetica-Bold")
          .fontSize(12)
          .text("Item", 60, tableTop - 15)
          .text("Qty", 210, tableTop - 15)
          .text("Rate", 360, tableTop - 15)
          .text("Amount", 460, tableTop - 15);

        let yPosition = tableTop + 10;
        const rowHeight = 20;
        let totalBalance = 0;

        if (Array.isArray(products) && Array.isArray(amounts)) {
          products.forEach((product, index) => {
            const amount = amounts[index];
            const rate = parseFloat(rates[index]) || 0;

            if (amount && amount !== 0) {
              const rowTotal = amount * rate;
              totalBalance += rowTotal;

              doc
                .fillColor("#f5f5f5")
                .rect(50, yPosition - 5, 500, rowHeight)
                .fill();
              doc
                .fillColor("black")
                .font("Helvetica")
                .fontSize(10)
                .text(product.name || "", 60, yPosition)
                .text(amount.toString(), 210, yPosition)
                .text(`$${rate.toFixed(2)}`, 360, yPosition)
                .text(`$${rowTotal.toFixed(2)}`, 460, yPosition);

              yPosition += rowHeight;
            }
          });

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
        resolve(
          new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          )
        );
      }
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
