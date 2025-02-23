const { google } = require("googleapis");

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

console.log("Client ID:", process.env.GOOGLE_CLIENT_ID);
console.log("Client Secret:", process.env.GOOGLE_CLIENT_SECRET);
console.log("Redirect URI:", process.env.GOOGLE_REDIRECT_URI);

const drive = google.drive({ version: "v3", auth: oauth2Client });

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
    const folderName = `${propertyName} - ${monthYear} Receipts`;
    const query = `'${folderName}' in:name mimeType='application/vnd.google-apps.folder'`;
    console.log("Searching Drive with query:", query);
    try {
      const response = await drive.files.list({
        q: query,
        fields: "files(id)",
      });
      console.log("Search response:", response.data);
      if (response.data.files.length > 0) {
        return response.data.files[0].id;
      }
      const folderMetadata = {
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
      };
      const folder = await drive.files.create({
        resource: folderMetadata,
        fields: "id",
      });
      return folder.data.id;
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
      const media = {
        mimeType: "application/pdf",
        body: buffer,
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
};

module.exports = googleService;
