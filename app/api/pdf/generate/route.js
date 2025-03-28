import { jsPDF } from "jspdf";
import { Buffer } from "buffer";
import googleService from "@/lib/services/googleService";
import PropertyService from "@/lib/services/propertyService";
import InventoryService from "@/lib/services/inventoryService";

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
    const { propertyId, propertyName, monthYear, products, amounts } =
      await request.json();

    // Fetch all product data from database to get prices
    const allProducts = await InventoryService.getAllProducts();

    // Create a lookup map by product name
    const productLookup = {};
    allProducts.forEach((product) => {
      productLookup[product.name] = {
        id: product.id,
        ownerPrice: parseFloat(product.owner_price) || 0,
        realPrice: parseFloat(product.real_price) || 0,
      };
    });

    console.log("Product price lookup created:", productLookup);

    // Create jsPDF document
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "letter",
    });

    try {
      // Header
      doc.setFontSize(14);
      doc.text("KYAN Properties Ltd.", 20, 20);
      doc.setFontSize(12);
      doc.text("1917 10 Ave SW", 20, 25);
      doc.text("Calgary AB T3C 0J8", 20, 30);
      doc.text("Info@kyanproperties.com", 20, 35);

      // Invoice title
      doc.setFontSize(24);
      doc.setTextColor(137, 207, 240); // #89CFF0
      doc.text("INVOICE", 20, 50);

      // Reset color
      doc.setTextColor(0, 0, 0);

      // Bill To
      doc.setFontSize(14);
      doc.text("Bill To:", 20, 60);
      doc.text(propertyName, 20, 65);

      // Property and dates
      doc.setFontSize(18);
      doc.text(propertyName, 20, 80);

      // Right aligned date info
      doc.setFontSize(14);
      doc.text("Date:", 170, 80, { align: "right" });
      doc.text(formatDate(new Date()), 170, 85, { align: "right" });
      doc.text("Due Date:", 170, 95, { align: "right" });
      doc.text(formatDate(getEndOfNextMonth()), 170, 100, { align: "right" });

      // Table header
      const tableTop = 110;

      // Blue header background rectangle
      doc.setFillColor(137, 207, 240); // #89CFF0
      doc.rect(20, tableTop, 170, 8, "F");

      // Header text
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text("Item", 22, tableTop + 5);
      doc.text("Qty", 80, tableTop + 5);
      doc.text("Rate", 120, tableTop + 5);
      doc.text("Amount", 150, tableTop + 5);

      let yPosition = tableTop + 15;
      const rowHeight = 8;
      let totalBalance = 0;

      // Table rows
      if (Array.isArray(products) && Array.isArray(amounts)) {
        products.forEach((product, index) => {
          const productName =
            typeof product === "object" ? product.name : product;
          const amount = amounts[index];

          // Look up the price using the product name
          const productInfo = productLookup[productName] || {};
          const rate = productInfo.ownerPrice || 0; // Use ownerPrice for invoices to property owners

          if (amount && amount !== 0) {
            const rowTotal = amount * rate;
            totalBalance += rowTotal;

            // Row background
            doc.setFillColor(245, 245, 245); // #f5f5f5
            doc.rect(20, yPosition - 5, 170, rowHeight, "F");

            // Row text
            doc.setFontSize(10);
            doc.text(productName || "", 22, yPosition);
            doc.text(amount.toString(), 80, yPosition);
            doc.text(`$${rate.toFixed(2)}`, 120, yPosition);
            doc.text(`$${rowTotal.toFixed(2)}`, 150, yPosition);

            yPosition += rowHeight + 2;
          }
        });

        // Total
        yPosition += 5;
        doc.setFontSize(12);
        doc.text("Total Balance:", 120, yPosition);
        doc.text(`$${totalBalance.toFixed(2)}`, 150, yPosition);
      }

      // Convert the PDF to a buffer
      const pdfOutput = doc.output();
      const pdfBuffer = Buffer.from(pdfOutput, "binary");

      console.log("Uploading PDF for:", propertyName, monthYear);

      const folderId = await PropertyService.getFolderID(propertyId);
      const receiptsFolderId = await googleService.findReceiptsSubfolder(
        folderId,
        monthYear
      );

      const sheetId = await PropertyService.getClientSheetID(propertyId);
      if (!sheetId) {
        const errorMsg = `No Google Sheet ID found for property: ${propertyName} (ID: ${propertyId})`;
        console.error(errorMsg);
        return new Response(
          JSON.stringify({ success: false, error: errorMsg }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      // First upload the PDF to Drive
      const { fileId, webViewLink } = await googleService.uploadPDF(
        pdfBuffer,
        `${propertyName}-invoice.pdf`,
        receiptsFolderId
      );

      // Format products data for Google Sheet
      const productsData = products
        .filter((p, i) => amounts[i] && amounts[i] !== 0)
        .map((product, index) => {
          const productName =
            typeof product === "object" ? product.name : product;
          const amount = amounts[index];
          const productInfo = productLookup[productName] || {};
          const rate = productInfo.ownerPrice || 0;
          return {
            name: productName,
            amount: amount,
            rate: rate,
            total: amount * rate,
          };
        });

      // Extract month from monthYear
      const month = monthYear.replace(/\d+$/, "");

      // Now update the inventory values in Google Sheets with the PDF file ID
      await googleService.uploadInventoryInvoiceValues(sheetId, {
        month: month,
        products: productsData,
        totalCost: totalBalance,
        fileId: fileId,
      });

      return new Response(
        JSON.stringify({
          success: true,
          fileId,
          webViewLink,
          message: "PDF generated and uploaded successfully",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("PDF generation or upload error:", error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("PDF generation error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
