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

const googleService = {
  getAuthUrl: () => {
    const scopes = [
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/spreadsheets",
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

  // Initialize the service with stored credentials (if any)
  init: async () => {
    const tokens = {
      access_token: process.env.GOOGLE_ACCESS_TOKEN,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      scope:
        "https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets",
      token_type: "Bearer",
      expiry_date: process.env.GOOGLE_TOKEN_EXPIRY,
    };
    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error(
        "No Google Drive credentials available. Please authenticate first."
      );
    }
    oauth2Client.setCredentials(tokens);
    const refreshed = await oauth2Client.getAccessToken();
    console.log("Refreshed token:", refreshed);
    console.log("Google Drive initialized with credentials");
  },

  // Find or create a receipts folder for the property and month
  findReceiptsFolder: async (propertyName, monthYear) => {
    const propertyFolderName = `${propertyName} - Receipts`;
    const propertyQuery = `name='${propertyFolderName}' and mimeType='application/vnd.google-apps.folder'`;
    console.log("Searching Drive with query:", propertyQuery);
    try {
      const propertyResponse = await drive.files.list({
        q: propertyQuery,
        fields: "files(id)",
      });
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
      const monthYearQuery = `'${propertyFolderId}' in parents and name='${monthYearFolderName}' and mimeType='application/vnd.google-apps.folder'`;
      console.log("Searching Drive with query:", monthYearQuery);
      const monthYearResponse = await drive.files.list({
        q: monthYearQuery,
        fields: "files(id)",
      });
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
    } catch (error) {
      console.error(
        "Error finding/creating folder:",
        error.response?.data || error
      );
      throw error;
    }
  },

  // Upload a PDF file to the specified folder
  uploadPDF: async (buffer, fileName, parentFolderId) => {
    try {
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
    } catch (error) {
      console.error("Error uploading PDF:", error);
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

  updateSheetValues: async (sheetId, sheetName, updates) => {
    for (const { range, value } of updates) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `${sheetName}!${range}`,
        valueInputOption: "RAW",
        resource: { values: [[value]] },
      });
    }
  },

  updateRangeValues: async (sheetId, sheetName, range, values) => {
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${sheetName}!${range}`,
      valueInputOption: "RAW",
      resource: { values },
    });
  },
};

module.exports = googleService;
