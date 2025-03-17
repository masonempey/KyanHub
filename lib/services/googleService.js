const { google } = require("googleapis");
const { Readable } = require("stream");
const { pool } = require("@/lib/db");

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

console.log("Client ID:", process.env.GOOGLE_CLIENT_ID);
console.log("Client Secret:", process.env.GOOGLE_CLIENT_SECRET);
console.log("Redirect URI:", process.env.GOOGLE_REDIRECT_URI);

const drive = google.drive({ version: "v3", auth: oauth2Client });
const sheets = google.sheets({ version: "v4", auth: oauth2Client });
const gmail = google.gmail({ version: "v1", auth: oauth2Client });

const googleService = {
  drive,
  sheets,
  gmail,

  getAuthUrl: () => {
    const scopes = [
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/gmail.compose",
    ];
    return oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
    });
  },

  getTokens: async (code) => {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    return tokens;
  },

  setCredentials: (tokens) => {
    oauth2Client.setCredentials(tokens);
    console.log("Credentials set:", tokens);
  },

  getOAuth2Client: () => oauth2Client,

  init: async () => {
    const tokens = {
      access_token: process.env.GOOGLE_ACCESS_TOKEN,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      scope:
        "https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.compose",
      token_type: "Bearer",
      expiry_date: process.env.GOOGLE_TOKEN_EXPIRY
        ? parseInt(process.env.GOOGLE_TOKEN_EXPIRY)
        : null,
    };
    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error("Google Drive credentials missing. Authenticate first.");
    }
    oauth2Client.setCredentials(tokens);
    try {
      const refreshed = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(refreshed.res.data);
      console.log("Refreshed token:", refreshed.res.data);
    } catch (error) {
      throw new Error(`Token refresh failed: ${error.message}`);
    }
    console.log("Google Drive and Sheets initialized with credentials");
  },

  listFolderFiles: async (folderId) => {
    try {
      const response = await drive.files.list({
        q: `'${folderId}' in parents`,
        fields:
          "files(id, name, mimeType, createdTime, modifiedTime, webViewLink)",
        orderBy: "createdTime desc",
      });

      return response.data.files;
    } catch (error) {
      console.error("Error listing folder files:", error);
      throw error;
    }
  },

  async findReceiptsFolder(folderId, monthYear) {
    try {
      // Use files.get instead of files.list when you have the exact folder ID
      const folderResponse = await drive.files.get({
        fileId: folderId,
        fields: "id,name,mimeType",
      });

      console.log("Parent folder found:", folderResponse.data);
      const parentFolderId = folderResponse.data.id;

      // Step 2: Find or create the monthYear subfolder inside the parent folder
      const monthYearFolderName = monthYear;
      const monthYearQuery = `'${parentFolderId}' in parents and name = '${monthYearFolderName.replace(
        /'/g,
        "\\'"
      )}' and mimeType = 'application/vnd.google-apps.folder'`;
      console.log("Searching Drive with query:", monthYearQuery);

      const monthYearResponse = await drive.files.list({
        q: monthYearQuery,
        fields: "files(id)",
      });

      if (!monthYearResponse?.data?.files) {
        throw new Error("Invalid Drive response for month-year folder search");
      }

      let monthYearFolderId;
      if (monthYearResponse.data.files.length > 0) {
        monthYearFolderId = monthYearResponse.data.files[0].id;
        console.log(
          `Found existing subfolder '${monthYear}' with ID: ${monthYearFolderId}`
        );
      } else {
        const monthYearFolderMetadata = {
          name: monthYearFolderName,
          mimeType: "application/vnd.google-apps.folder",
          parents: [parentFolderId],
        };

        const monthYearFolder = await drive.files.create({
          resource: monthYearFolderMetadata,
          fields: "id",
        });

        monthYearFolderId = monthYearFolder.data.id;
        console.log(
          `Created new subfolder '${monthYear}' with ID: ${monthYearFolderId}`
        );
      }

      return monthYearFolderId;
    } catch (error) {
      // Better error handling
      if (error.response && error.response.status === 404) {
        throw new Error(`No folder found with ID: ${folderId}`);
      }
      console.error("Error in findReceiptsFolder:", error);
      throw error;
    }
  },

  findKyanReceiptsSubfolder: async (parentFolderId, monthYear) => {
    // Search for the monthYear subfolder within the parent Kyan Receipts folder
    const subfolderQuery = `'${parentFolderId}' in parents AND name = '${monthYear.replace(
      /'/g,
      "\\'"
    )}' and mimeType = 'application/vnd.google-apps.folder'`;
    console.log("Searching Drive for subfolder with query:", subfolderQuery);

    const subfolderResponse = await drive.files.list({
      q: subfolderQuery,
      fields: "files(id)",
    });

    if (!subfolderResponse?.data?.files) {
      throw new Error("Invalid Drive response for monthYear subfolder search");
    }

    let monthYearFolderId;
    if (subfolderResponse.data.files.length > 0) {
      monthYearFolderId = subfolderResponse.data.files[0].id;
      console.log(
        `Found existing subfolder '${monthYear}' with ID: ${monthYearFolderId}`
      );
    } else {
      const monthYearFolderMetadata = {
        name: monthYear,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parentFolderId],
      };
      const newSubfolder = await drive.files.create({
        resource: monthYearFolderMetadata,
        fields: "id",
      });
      monthYearFolderId = newSubfolder.data.id;
      console.log(
        `Created new subfolder '${monthYear}' with ID: ${monthYearFolderId}`
      );
    }

    return monthYearFolderId;
  },

  findKyanFinanceSheet: async (kyanFinancialsSheet) => {
    const sheetQuery = `name = '${kyanFinancialsSheet.replace(
      /'/g,
      "\\'"
    )}' and mimeType = 'application/vnd.google-apps.spreadsheet'`;
    console.log("Searching Drive with query:", sheetQuery);

    const kyanSheetResponse = await drive.files.list({
      q: sheetQuery,
      fields: "files(id)",
    });

    if (!kyanSheetResponse?.data?.files) {
      throw new Error(
        "Invalid Drive response for Kyan financials sheet search"
      );
    }

    let kyanSheetId;
    if (kyanSheetResponse.data.files.length > 0) {
      kyanSheetId = kyanSheetResponse.data.files[0].id;
      console.log(
        `Found existing sheet '${kyanFinancialsSheet}' with ID: ${kyanSheetId}`
      );
    } else {
      const kyanSheetMetadata = {
        name: kyanFinancialsSheet,
        mimeType: "application/vnd.google-apps.spreadsheet",
      };
      const newSheet = await drive.files.create({
        resource: kyanSheetMetadata,
        fields: "id",
      });
      kyanSheetId = newSheet.data.id;
      console.log(
        `Created new sheet '${kyanFinancialsSheet}' with ID: ${kyanSheetId}`
      );
    }

    return kyanSheetId;
  },

  findKyanFinanceFolder: async (kyanReceiptsFolder) => {
    // Search for the Kyan Receipts folder
    const folderQuery = `name = '${kyanReceiptsFolder.replace(
      /'/g,
      "\\'"
    )}' and mimeType = 'application/vnd.google-apps.folder'`;
    console.log("Searching Drive with query:", folderQuery);

    const kyanReceiptsResponse = await drive.files.list({
      q: folderQuery,
      fields: "files(id)",
    });

    if (!kyanReceiptsResponse?.data?.files) {
      throw new Error("Invalid Drive response for Kyan receipts folder search");
    }

    let kyanReceiptsFolderId;
    if (kyanReceiptsResponse.data.files.length > 0) {
      kyanReceiptsFolderId = kyanReceiptsResponse.data.files[0].id;
      console.log(
        `Found existing folder '${kyanReceiptsFolder}' with ID: ${kyanReceiptsFolderId}`
      );
    } else {
      const kyanReceiptsFolderMetadata = {
        name: kyanReceiptsFolder,
        mimeType: "application/vnd.google-apps.folder",
      };
      const newFolder = await drive.files.create({
        resource: kyanReceiptsFolderMetadata,
        fields: "id",
      });
      kyanReceiptsFolderId = newFolder.data.id;
      console.log(
        `Created new folder '${kyanReceiptsFolder}' with ID: ${kyanReceiptsFolderId}`
      );
    }

    return kyanReceiptsFolderId;
  },

  uploadKyanFinanceValues: async (
    sheetId,
    { month, year, cost, store, description, fileId }
  ) => {
    try {
      // Check if the Expenses sheet exists using spreadsheet metadata
      const spreadsheet = await sheets.spreadsheets.get({
        spreadsheetId: sheetId,
      });
      const sheetsList = spreadsheet.data.sheets;
      const expensesSheet = sheetsList.find(
        (sheet) => sheet.properties.title.trim().toLowerCase() === "expenses"
      );

      if (!expensesSheet) {
        console.log("Expenses sheet not found, creating it");
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: sheetId,
          resource: {
            requests: [
              {
                addSheet: {
                  properties: {
                    title: "Expenses", // Create with no spaces for consistency
                    gridProperties: {
                      rowCount: 1000,
                      columnCount: 10,
                    },
                  },
                },
              },
            ],
          },
        });

        // Add headers to the new sheet
        await googleService.updateRangeValues(sheetId, "Expenses", "B6:F6", [
          ["Category", "Date", "Description", "Amount", "Receipt"],
        ]);

        console.log("Created Expenses sheet with headers");
      } else {
        console.log(
          "Found existing Expenses sheet:",
          expensesSheet.properties.title
        );
      }

      // Use the exact sheet name from metadata
      const sheetName = expensesSheet
        ? expensesSheet.properties.title
        : "Expenses";

      // Fetch the current sheet data
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `${sheetName}!A1:F1000`, // Use dynamic sheet name
        valueRenderOption: "UNFORMATTED_VALUE",
      });

      console.log("--- FULL SHEET DATA ---");
      if (response.data.values && response.data.values.length > 0) {
        console.log(`Sheet has ${response.data.values.length} rows`);
        const numRowsToPrint = Math.min(5, response.data.values.length);
        for (let i = 0; i < numRowsToPrint; i++) {
          console.log(
            `Row ${i + 1}: ${JSON.stringify(response.data.values[i])}`
          );
        }
        console.log("...");
        const midPoint = Math.min(130, response.data.values.length);
        for (let i = midPoint - 3; i < midPoint + 3; i++) {
          if (i >= 0 && i < response.data.values.length) {
            console.log(
              `Row ${i + 1}: ${JSON.stringify(response.data.values[i])}`
            );
          }
        }
        if (response.data.values.length > 10) {
          console.log("...");
          console.log(
            `Last row ${response.data.values.length}: ${JSON.stringify(
              response.data.values[response.data.values.length - 1]
            )}`
          );
        }
      } else {
        console.log("Sheet appears to be empty (no values returned)");
      }
      console.log("--- END SHEET DATA ---");

      // Determine the next available row
      let nextRow = 7; // Start after headers (B6:F6)
      if (response.data.values && response.data.values.length > 0) {
        for (let i = response.data.values.length - 1; i >= 6; i--) {
          const row = response.data.values[i];
          if (
            row &&
            row.some(
              (cell) => cell !== "" && cell !== undefined && cell !== null
            )
          ) {
            nextRow = i + 2;
            break;
          }
        }
        if (nextRow < 7) nextRow = 7;
      }
      console.log(`Calculated nextRow: ${nextRow}`);
      const targetRow = nextRow;

      // Format the data for the new row
      const formattedMonth = `${month} ${year}`;
      const formattedDescription = `${store}${
        description ? ` - ${description}` : ""
      }`;
      const formattedCost = parseFloat(cost).toFixed(2);

      const rowValues = [
        ["Supplies", formattedMonth, formattedDescription, formattedCost],
      ];

      console.log(
        `Writing to row ${targetRow}, values: ${JSON.stringify(rowValues)}`
      );

      // Update the sheet with the new row data
      const updateResult = await googleService.updateRangeValues(
        sheetId,
        sheetName, // Use dynamic sheet name
        `B${targetRow}:E${targetRow}`,
        rowValues
      );

      // Verify the data was written
      const verification = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `${sheetName}!B${targetRow}:E${targetRow}`, // Use dynamic sheet name
      });

      console.log(
        `Verification - row ${targetRow} now contains: ${JSON.stringify(
          verification.data.values
        )}`
      );

      // Add hyperlink if fileId exists
      if (fileId) {
        const hyperlink = `=HYPERLINK("https://drive.google.com/file/d/${fileId}/view", "View Receipt")`;
        await googleService.updateRangeValues(
          sheetId,
          sheetName, // Use dynamic sheet name
          `F${targetRow}:F${targetRow}`,
          [[hyperlink]]
        );
        console.log(`Added receipt link in cell F${targetRow}`);
      }

      return {
        success: true,
        row: targetRow,
        data: {
          category: "Supplies",
          date: formattedMonth,
          description: formattedDescription,
          amount: formattedCost,
          receipt: fileId ? true : false,
        },
      };
    } catch (error) {
      console.error("Error uploading Kyan finance values:", error);
      throw new Error(`Failed to upload finance values: ${error.message}`);
    }
  },

  updateRangeValues: async (sheetId, sheetName, range, values) => {
    try {
      console.log(
        `Updating ${sheetName}!${range} with: ${JSON.stringify(values)}`
      );

      const result = await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `${sheetName}!${range}`, // Ensure range uses the correct sheet name
        valueInputOption: "USER_ENTERED",
        resource: { values },
      });

      console.log(
        `Updated ${result.data.updatedCells} cells in range ${sheetName}!${range}`
      );

      return result.data;
    } catch (error) {
      console.error(`Error updating range ${sheetName}!${range}:`, error);
      throw error;
    }
  },

  getSheetData: async (sheetId, range) => {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range,
    });
    return response.data.values || [];
  },

  uploadPDF: async (buffer, fileName, parentFolderId) => {
    const fileMetadata = {
      name: fileName,
      parents: [parentFolderId],
    };
    const bufferStream = new Readable();
    bufferStream.push(buffer);
    bufferStream.push(null);

    const media = {
      mimeType: "application/pdf",
      body: bufferStream,
    };

    const response = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: "id, webViewLink",
    });
    return {
      fileId: response.data.id,
      webViewLink: response.data.webViewLink,
    };
  },

  updateRangeValues: async (sheetId, sheetName, range, values) => {
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${sheetName}!${range}`,
      valueInputOption: "USER_ENTERED",
      resource: { values },
    });
  },

  async insertInvoiceToSheet(invoiceData, sheetId) {
    try {
      const sheetName = "Expenses";

      // 1. Get current data to find first empty row
      const currentData = await this.getSheetData(sheetId, `${sheetName}!A:C`);

      // 2. Find the first empty row (one past the last row with data)
      let nextRow = 1;
      if (currentData && currentData.length > 0) {
        // Look for the last non-empty row
        for (let i = currentData.length - 1; i >= 0; i--) {
          const row = currentData[i];
          if (
            row &&
            row.some(
              (cell) => cell !== null && cell !== undefined && cell !== ""
            )
          ) {
            nextRow = i + 2; // +2 because i is 0-indexed and we want one row after
            break;
          }
        }
      }

      console.log(`Inserting at row ${nextRow}`);

      // 3. Extract month from monthYear
      let month = invoiceData.monthYear;
      // If in format "March2025", extract just "March"
      if (/^[A-Za-z]+\d+$/.test(invoiceData.monthYear)) {
        month = invoiceData.monthYear.replace(/\d+$/, "");
      }

      // 4. Format the description field
      const description = invoiceData.description
        ? `${invoiceData.company} - ${invoiceData.description}`
        : invoiceData.company;

      // 5. Format the cost (ensure it's a number with 2 decimal places)
      const cost = parseFloat(invoiceData.cost).toFixed(2);

      // 6. Create the data array and update the sheet
      const values = [[month, description, cost]];
      const range = `A${nextRow}:C${nextRow}`;

      await this.updateRangeValues(sheetId, sheetName, range, values);

      console.log(
        `Invoice data inserted into sheet at row ${nextRow}:`,
        values
      );

      return {
        success: true,
        row: nextRow,
        data: {
          month,
          description,
          cost,
        },
      };
    } catch (error) {
      console.error("Error inserting invoice data:", error);
      throw new Error(`Failed to insert invoice data: ${error.message}`);
    }
  },
};

module.exports = googleService;
