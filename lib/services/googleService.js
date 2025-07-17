import googleLimiter from "../utils/googleApiLimiter";

const { google } = require("googleapis");
const { Readable } = require("stream");
const crypto = require("crypto");
const UserService = require("@/lib/services/userService");

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

  getAuthUrl: (includeAllScopes = false) => {
    const baseScopes = [
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/spreadsheets",
    ];

    const emailScopes = [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/gmail.compose",
    ];

    const scopes = includeAllScopes
      ? [...baseScopes, ...emailScopes]
      : baseScopes;

    // Always use the environment variable for redirect URI
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    return oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
      prompt: "consent",
      redirect_uri: redirectUri,
    });
  },

  getTokens: async (code) => {
    // Always use the environment variable for redirect URI
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    // Pass the redirectUri when exchanging code for tokens
    const { tokens } = await oauth2Client.getToken({
      code,
      redirect_uri: redirectUri,
    });

    oauth2Client.setCredentials(tokens);
    return tokens;
  },

  getRedirectUri: () => {
    // Check if this is a Vercel preview deployment
    const isVercelPreview =
      process.env.VERCEL && process.env.VERCEL_ENV === "preview";
    const vercelUrl = process.env.VERCEL_URL;

    if (isVercelPreview && vercelUrl) {
      return `https://${vercelUrl}/api/google/callback`;
    }

    return process.env.NODE_ENV === "production"
      ? "https://kyanhub.vercel.app/api/google/callback"
      : "http://localhost:3000/api/google/callback";
  },

  setCredentials: (tokens) => {
    oauth2Client.setCredentials(tokens);
    console.log("Credentials set:", tokens);
  },

  getOAuth2Client: () => oauth2Client,

  init: async (forceAuth = false) => {
    try {
      // Try to load tokens from user settings
      let tokens = null;

      try {
        // First try to get system-wide settings
        const systemSettings = await UserService.getSystemSettings();

        if (systemSettings?.google_refresh_token) {
          tokens = {
            access_token: systemSettings.google_access_token,
            refresh_token: systemSettings.google_refresh_token,
            scope: systemSettings.google_token_scope || "",
            token_type: "Bearer",
            expiry_date: parseInt(systemSettings.google_token_expiry || "0"),
          };
          console.log("Loaded tokens from system settings");
        }
      } catch (dbError) {
        console.error("Error loading tokens from user service:", dbError);
        // Fall back to environment variables
      }

      // If no tokens from user service, fall back to environment variables
      if (!tokens) {
        tokens = {
          access_token: process.env.GOOGLE_ACCESS_TOKEN,
          refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
          scope: process.env.GOOGLE_TOKEN_SCOPE || "",
          token_type: "Bearer",
          expiry_date: process.env.GOOGLE_TOKEN_EXPIRY
            ? parseInt(process.env.GOOGLE_TOKEN_EXPIRY)
            : null,
        };
      }

      // Check if we need authorization
      if (!tokens.access_token || !tokens.refresh_token || forceAuth) {
        return {
          isAuthorized: false,
          authUrl: googleService.getAuthUrl(true),
          message: "Google API authorization required",
        };
      }

      // Check if Gmail scopes are included
      const hasGmailScopes =
        tokens.scope &&
        (tokens.scope.includes("https://www.googleapis.com/auth/gmail.send") ||
          tokens.scope.includes(
            "https://www.googleapis.com/auth/gmail.compose"
          ));

      if (!hasGmailScopes) {
        console.warn(
          "Gmail scopes not found in token. Email functionality may not work."
        );
        return {
          isAuthorized: false,
          authUrl: googleService.getAuthUrl(true),
          message: "Gmail API authorization required",
        };
      }

      // Try to use existing tokens
      oauth2Client.setCredentials(tokens);

      // Check token expiry and refresh if needed
      const now = Date.now();
      if (!tokens.expiry_date || now > tokens.expiry_date - 60000) {
        // 1 minute buffer
        try {
          console.log("Refreshing access token...");
          const refreshed = await oauth2Client.refreshAccessToken();
          oauth2Client.setCredentials(refreshed.credentials);
          console.log("Token refreshed successfully");
        } catch (refreshError) {
          console.error("Token refresh failed:", refreshError);
          // If refresh fails, we need re-authorization
          return {
            isAuthorized: false,
            authUrl: googleService.getAuthUrl(true),
            message: "Token refresh failed, re-authorization required",
          };
        }
      }

      console.log("Google API initialized with valid credentials");
      return { isAuthorized: true };
    } catch (error) {
      console.error("Error during Google API initialization:", error);
      return {
        isAuthorized: false,
        authUrl: googleService.getAuthUrl(true),
        message: error.message,
      };
    }
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

  findReceiptsSubfolder: async (parentFolderId, monthYear) => {
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

  uploadInventoryInvoiceValues: async (
    sheetId,
    { month, products, totalCost, fileId }
  ) => {
    try {
      // Check if the Inventory sheet exists using spreadsheet metadata
      const spreadsheet = await sheets.spreadsheets.get({
        spreadsheetId: sheetId,
      });
      const sheetsList = spreadsheet.data.sheets;
      const inventorySheet = sheetsList.find(
        (sheet) => sheet.properties.title.trim().toLowerCase() === "expenses"
      );

      if (!inventorySheet) {
        console.log("Inventory sheet not found, creating it");
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: sheetId,
          resource: {
            requests: [
              {
                addSheet: {
                  properties: {
                    title: "Inventory",
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
        await googleService.updateRangeValues(sheetId, "Expenses", "A1:D1", [
          ["Month", "Products", "Total Cost", "Receipt"],
        ]);
        console.log("Created Inventory sheet with headers");
      } else {
        console.log(
          "Found existing Inventory sheet:",
          inventorySheet.properties.title
        );
      }

      // Use the actual sheet name
      const sheetName = "Expenses";

      // Get ONLY column A data to find first empty row
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `${sheetName}!A1:A1000`, // Only get column A
      });

      // Find next available row - look for first empty cell in column A
      let nextRow = 2; // Default: start after headers

      if (response.data.values && response.data.values.length > 0) {
        // Check each row in column A
        let foundEmpty = false;

        for (let i = 1; i < response.data.values.length; i++) {
          // Start at row 2 (index 1)
          const cellValue =
            response.data.values[i] && response.data.values[i][0];

          if (!cellValue) {
            // If the cell is empty, undefined, or null
            nextRow = i + 1; // +1 because arrays are 0-indexed but rows start at 1
            foundEmpty = true;
            console.log(`Found empty row at position ${nextRow} in column A`);
            break;
          }
        }

        // If no empty rows were found, add to the end
        if (!foundEmpty) {
          nextRow = response.data.values.length + 1;
          console.log(`No empty rows found, using row ${nextRow}`);
        }
      }

      // Format all products into a single string
      const productNames = products.map((p) => p.name).join(", ");
      const productsString = `Inventory: ${productNames}`;

      // Create a single row with all the data
      const rowData = [
        month,
        productsString,
        totalCost.toFixed(2),
        fileId
          ? `=HYPERLINK("https://drive.google.com/file/d/${fileId}/view", "View Invoice")`
          : "",
      ];

      // Add single row with all product data
      await googleService.updateRangeValues(
        sheetId,
        sheetName,
        `A${nextRow}:D${nextRow}`,
        [rowData]
      );

      console.log(`Added inventory row at position ${nextRow}`);

      return {
        success: true,
        sheetId,
        month,
        products: productsString,
        totalCost,
        fileId,
        row: nextRow,
      };
    } catch (error) {
      console.error("Error uploading inventory invoice values:", error);
      throw new Error(`Failed to upload inventory values: ${error.message}`);
    }
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

  async createStaticSheetCopy(sourceSheetId, propertyName, month, year) {
    try {
      console.log(
        `Creating static copy of sheet ${sourceSheetId} for ${propertyName} (${month} ${year})`
      );

      // Extract just the ID if a full URL was passed
      let sheetId = sourceSheetId;
      if (sourceSheetId.includes("/")) {
        const matches = sourceSheetId.match(/\/d\/([a-zA-Z0-9-_]{20,44})/);
        if (matches && matches[1]) {
          sheetId = matches[1];
          console.log(`Extracted sheet ID: ${sheetId} from URL`);
        }
      }

      // First, create a copy of the original sheet
      const copyTitle = `${propertyName} Revenue - ${month} ${year} (Owner Copy)`;

      // Use Drive API to create a copy
      const copyResponse = await this.drive.files.copy({
        fileId: sheetId, // Use the extracted ID, not the full URL
        requestBody: {
          name: copyTitle,
        },
      });

      const copyId = copyResponse.data.id;
      console.log(`Created copy with ID: ${copyId}`);

      // Set permission to "anyone with link can view"
      await this.drive.permissions.create({
        fileId: copyId,
        requestBody: {
          role: "reader",
          type: "anyone",
          allowFileDiscovery: false,
        },
      });

      // Return the copy details
      return {
        fileId: copyId,
        webViewLink: `https://docs.google.com/spreadsheets/d/${copyId}/edit?usp=sharing`,
        name: copyTitle,
      };
    } catch (error) {
      console.error("Error creating static sheet copy:", error);
      throw new Error(`Failed to create sheet copy: ${error.message}`);
    }
  },

  // Implement or fix the exportSheetAsExcel function

  async exportSheetAsExcel(sheetId, propertyName, month, year) {
    try {
      console.log(`Starting export of sheet ${sheetId} as Excel`);

      // Validate the sheet ID first
      if (!sheetId || typeof sheetId !== "string" || sheetId.includes("http")) {
        throw new Error(`Invalid sheet ID: ${sheetId}`);
      }

      // Request the spreadsheet as an Excel file
      try {
        const response = await this.drive.files.export(
          {
            fileId: sheetId,
            mimeType:
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          },
          {
            responseType: "arraybuffer",
          }
        );

        console.log(
          `Received response from Google API, data size: ${response.data.byteLength} bytes`
        );

        // Get the binary data
        const content = Buffer.from(response.data);
        console.log(`Created buffer of size: ${content.length} bytes`);

        const result = {
          fileName: `${propertyName} - Revenue ${month} ${year}.xlsx`,
          content: content.toString("base64"), // Convert to base64 string
          mimeType:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        };

        console.log(`Returning Excel file: ${result.fileName}`);
        return result;
      } catch (exportError) {
        // Check if this is a permissions issue
        if (exportError.code === 403) {
          console.error(
            "Permission denied exporting sheet. Sheet may not be accessible."
          );
          throw new Error(
            "Permission denied accessing spreadsheet. Make sure you have permission to access this document."
          );
        } else {
          throw exportError; // Re-throw other errors
        }
      }
    } catch (error) {
      console.error("Error exporting sheet as Excel:", error);
      throw new Error(`Failed to export sheet: ${error.message}`);
    }
  },

  // Example of how to use the limiter with your existing Google API calls
  async updateSheet(sheetId, data) {
    // Instead of calling the API directly:
    // const result = await sheets.spreadsheets.values.update({...});

    // Use the limiter to schedule the API call:
    return googleLimiter.schedule(async () => {
      // Your existing Google Sheets API code
      const result = await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: "Sheet1!A1:Z100",
        valueInputOption: "USER_ENTERED",
        resource: { values: data },
      });

      return result;
    });
  },
};

module.exports = googleService;
