const { google } = require("googleapis");
const { Readable } = require("stream");
const crypto = require("crypto");

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

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

  //Method to start watching our google drive folder
  //Takes in a folderId (comes from the CleaningService) and a webhookUrl (our webhook api endpoint)
  startFolderWatch: async (folderId, webhookUrl) => {
    try {
      // First, check if we already have an active watch for this folder
      const { pool } = require("@/lib/database");
      const client = await pool.connect();

      try {
        // Look for unexpired watches
        const existingWatch = await client.query(
          `SELECT * FROM drive_watches 
           WHERE folder_id = $1 AND expires_at > NOW()`,
          [folderId]
        );

        // If we already have an active watch, return it
        if (existingWatch.rows.length > 0) {
          const watch = existingWatch.rows[0];
          console.log(`Using existing watch for folder ${folderId}`);
          return {
            channelId: watch.channel_id,
            resourceId: watch.resource_id,
            expiration: watch.expires_at.getTime().toString(),
          };
        }

        // No active watch exists, create a new one
        const channelId = crypto.randomUUID();
        const expiration = Date.now() + 30 * 24 * 60 * 60 * 1000;

        const watchResponse = await drive.files.watch({
          fileId: folderId,
          requestBody: {
            id: channelId,
            type: "web_hook",
            address: webhookUrl,
            expiration: expiration,
          },
        });

        console.log("New watch started:", watchResponse.data);

        await client.query(
          `INSERT INTO drive_watches 
           (channel_id, resource_id, folder_id, expires_at) 
           VALUES ($1, $2, $3, $4)`,
          [
            watchResponse.data.id,
            watchResponse.data.resourceId,
            folderId,
            new Date(parseInt(watchResponse.data.expiration)),
          ]
        );

        return {
          channelId: watchResponse.data.id,
          resourceId: watchResponse.data.resourceId,
          expiration: watchResponse.data.expiration,
        };
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error starting folder watch:", error);
      throw new Error(`Failed to start folder watch: ${error.message}`);
    }
  },

  //Method to stop watching our google drive folder
  //Takes in a channelId and a resourceId
  stopFolderWatch: async (channelId, resourceId) => {
    try {
      await drive.channels.stop({
        //sends a request body with the channelId and resourceId
        requestBody: {
          id: channelId,
          resourceId: resourceId,
        },
      });
      console.log(`Stopped watching channel ${channelId}`);
    } catch (error) {
      console.error("Error stopping folder watch:", error);
      throw new Error(`Failed to stop folder watch: ${error.message}`);
    }
  },

  //Method to list all files in a folder
  listFolderFiles: async (folderId) => {
    try {
      //uses the drive.files.list method to list all files in the folder with the given folderId
      const response = await drive.files.list({
        //sends a query to filter the files to only those in the folder with the given folderId
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

  //Downloads invoice files from Google Drive
  downloadFileAsBuffer: async (fileId) => {
    try {
      console.log(`Downloading file ${fileId} from Google Drive`);
      await googleService.init();

      // First verify the file exists and is accessible
      const fileMetadata = await drive.files.get({
        fileId,
        fields: "name,mimeType,size",
      });

      console.log(
        `File metadata: ${fileMetadata.data.name}, ${fileMetadata.data.mimeType}, ${fileMetadata.data.size} bytes`
      );

      // Download the file content
      const fileResponse = await drive.files.get(
        {
          fileId,
          alt: "media",
        },
        {
          responseType: "arraybuffer",
        }
      );

      const fileBuffer = Buffer.from(fileResponse.data);
      console.log(
        `Downloaded file successfully, size: ${fileBuffer.length} bytes`
      );

      return {
        buffer: fileBuffer,
        name: fileMetadata.data.name,
        mimeType: fileMetadata.data.mimeType,
      };
    } catch (error) {
      console.error("Error downloading file from Drive:", error);
      throw new Error(`Failed to download file: ${error.message}`);
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

  getSheetData: async (sheetId, range) => {
    try {
      // Handle case where the range includes a sheet name with spaces
      let formattedRange = range;
      if (range.includes("!")) {
        const [sheetName, rangeNotation] = range.split("!");
        // Format sheet name if it contains spaces or special characters
        const formattedSheetName =
          sheetName.includes(" ") ||
          sheetName.includes("-") ||
          sheetName.includes("'")
            ? `'${sheetName.trim().replace(/'/g, "''")}'`
            : sheetName;
        formattedRange = `${formattedSheetName}!${rangeNotation}`;
      }

      console.log(`Getting data from range: ${formattedRange}`);

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: formattedRange,
        valueRenderOption: "UNFORMATTED_VALUE",
      });

      return response.data.values || [];
    } catch (error) {
      console.error(`Error getting sheet data (${range}):`, error);
      throw error;
    }
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

  // Add this method to googleService.js
  updateRangeValues: async (sheetId, sheetName, range, values) => {
    try {
      // Debug the sheet name
      console.log(`Sheet name: "${sheetName}"`);
      console.log(`Sheet name length: ${sheetName.length}`);
      console.log(
        `Character codes: ${[...sheetName].map((c) =>
          c.charCodeAt(0).toString(16)
        )}`
      );

      // Only add quotes if truly necessary - a simple name like "Expenses" should NOT have quotes
      const needsQuotes = sheetName.includes(" ") || sheetName.includes("-");

      // Use the sheet name directly for simple names
      const formattedRange = needsQuotes
        ? `'${sheetName.replace(/'/g, "''")}'!${range}`
        : `${sheetName}!${range}`;

      console.log(
        `Updating range: ${formattedRange} with: ${JSON.stringify(values)}`
      );

      const result = await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: formattedRange,
        valueInputOption: "USER_ENTERED",
        resource: { values },
      });

      console.log(
        `Updated ${result.data.updatedCells} cells in range ${formattedRange}`
      );
      return result.data;
    } catch (error) {
      console.error(`Error updating range ${sheetName}!${range}:`, error);
      throw error;
    }
  },

  updateSheetValues: async (sheetId, sheetName, updates) => {
    try {
      console.log(`Updating multiple values in sheet ${sheetId}`);

      // Only add quotes if the sheet name actually has spaces or special characters
      const needsQuotes = sheetName.includes(" ") || sheetName.includes("-");

      const formattedSheetName = needsQuotes
        ? `'${sheetName.trim().replace(/'/g, "''")}'`
        : sheetName;

      // Create properly formatted requests
      const requests = updates.map(({ range, value }) => ({
        spreadsheetId: sheetId,
        range: `${formattedSheetName}!${range}`,
        valueInputOption: "USER_ENTERED",
        resource: { values: [[value]] },
      }));

      // Process updates in parallel for better performance
      const results = await Promise.all(
        requests.map((request) => sheets.spreadsheets.values.update(request))
      );

      console.log(`Updated ${results.length} cells in ${sheetName}`);
      return results.map((r) => r.data);
    } catch (error) {
      console.error(`Error updating values in ${sheetName}:`, error);
      throw error;
    }
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
