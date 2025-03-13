const { google } = require("googleapis");
const { Readable } = require("stream");

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

  findReceiptsFolder: async (propertyName, monthYear) => {
    const propertyFolderName = `${propertyName} - Receipts`;
    const propertyQuery = `name = '${propertyFolderName.replace(
      /'/g,
      "\\'"
    )}' and mimeType = 'application/vnd.google-apps.folder'`;
    console.log("Searching Drive with query:", propertyQuery);
    const propertyResponse = await drive.files.list({
      q: propertyQuery,
      fields: "files(id)",
    });
    if (!propertyResponse?.data?.files) {
      throw new Error("Invalid Drive response for property folder search");
    }
    console.log("Property search response:", propertyResponse.data);
    let propertyFolderId;
    if (propertyResponse.data.files.length > 0) {
      propertyFolderId = propertyResponse.data.files[0].id;
    } else {
      const propertyFolderMetadata = {
        name: propertyFolderName,
        mimeType: "application/vnd.google-apps.folder",
      };
      const propertyFolder = await drive.files.create({
        resource: propertyFolderMetadata,
        fields: "id",
      });
      propertyFolderId = propertyFolder.data.id;
    }

    const monthYearFolderName = monthYear;
    const monthYearQuery = `'${propertyFolderId}' in parents and name = '${monthYearFolderName.replace(
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
    console.log("Month-Year search response:", monthYearResponse.data);
    let monthYearFolderId;
    if (monthYearResponse.data.files.length > 0) {
      monthYearFolderId = monthYearResponse.data.files[0].id;
    } else {
      const monthYearFolderMetadata = {
        name: monthYearFolderName,
        mimeType: "application/vnd.google-apps.folder",
        parents: [propertyFolderId],
      };
      const monthYearFolder = await drive.files.create({
        resource: monthYearFolderMetadata,
        fields: "id",
      });
      monthYearFolderId = monthYearFolder.data.id;
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

  uploadKyanFinanceValues: async (
    sheetId,
    { month, year, cost, store, description, fileId }
  ) => {
    try {
      // First check if the Expenses sheet exists, if not create it
      try {
        // Try to get data from the Expenses sheet - if it fails, we'll create the sheet
        await googleService.getSheetData(sheetId, "Expenses!A:A");
        console.log("Found existing Expenses sheet");
      } catch (error) {
        // The sheet doesn't exist, so create it
        console.log("Creating Expenses sheet");
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: sheetId,
          resource: {
            requests: [
              {
                addSheet: {
                  properties: {
                    title: "Expenses",
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
      }

      // Now get the data to find the next empty row
      const expensesData = await googleService.getSheetData(
        sheetId,
        "Expenses!B6:E" // Start from row 6 where the headers are
      );

      // Find the first empty row (row 7 is first data row)
      let nextRow = 7;
      if (expensesData && expensesData.length > 0) {
        nextRow = 6 + expensesData.length;
      }

      // Format the data for the new row
      const formattedMonth = `${month} ${year}`;
      const formattedDescription = `${store}${
        description ? ` - ${description}` : ""
      }`;
      const formattedCost = parseFloat(cost).toFixed(2);

      // Values for the row - always select "Supplies" from dropdown
      const rowValues = [
        ["Supplies", formattedMonth, formattedDescription, formattedCost],
      ];

      // Update the sheet with the new row data
      await googleService.updateRangeValues(
        sheetId,
        "Expenses",
        `B${nextRow}:E${nextRow}`,
        rowValues
      );

      console.log(`Added expense data to row ${nextRow} in the Expenses sheet`);

      // If there's a fileId, add a hyperlink to the receipt
      if (fileId) {
        // Create a hyperlink to the Google Drive file
        const hyperlink = `=HYPERLINK("https://drive.google.com/file/d/${fileId}/view", "View Receipt")`;

        // Add the hyperlink in column F
        await googleService.updateRangeValues(
          sheetId,
          "Expenses",
          `F${nextRow}:F${nextRow}`,
          [[hyperlink]]
        );

        console.log(`Added receipt link in cell F${nextRow}`);
      }

      return {
        success: true,
        row: nextRow,
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

  getSheetData: async (sheetId, range) => {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range,
    });
    return response.data.values || [];
  },

  updateSheetValues: async (sheetId, sheetName, updates) => {
    for (const { range, value } of updates) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `${sheetName}!${range}`,
        valueInputOption: "USER_ENTERED",
        resource: { values: [[value]] },
      });
    }
  },

  updateRangeValues: async (sheetId, sheetName, range, values) => {
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${sheetName}!${range}`,
      valueInputOption: "USER_ENTERED",
      resource: { values },
    });
  },
};

module.exports = googleService;
