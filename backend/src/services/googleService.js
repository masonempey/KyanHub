const { google } = require("googleapis");
const { OAuth2Client } = require("google-auth-library");
const fs = require("fs").promises;
const path = require("path");
const { Readable } = require("stream");

const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/drive",
];

class GoogleService {
  constructor() {
    this.oAuth2Client = null;
    this.sheets = null;
    this.drive = null;
  }

  async init() {
    this.drive = google.drive({ version: "v3", auth: this.oAuth2Client });
    const credentials = JSON.parse(
      await fs.readFile(path.join(__dirname, "../../credentials.json"))
    );

    // Use web credentials format
    this.oAuth2Client = new OAuth2Client(
      credentials.web.client_id,
      credentials.web.client_secret,
      credentials.web.redirect_uris[0]
    );

    try {
      const tokenPath = path.join(__dirname, "../../token.json");

      // Check if token exists
      try {
        await fs.access(tokenPath);
      } catch (err) {
        throw new Error("No token found - please authenticate first");
      }

      const token = JSON.parse(await fs.readFile(tokenPath));

      if (!token.access_token) {
        throw new Error("Invalid token - please reauthenticate");
      }

      this.oAuth2Client.setCredentials(token);
      this.sheets = google.sheets({ version: "v4", auth: this.oAuth2Client });
    } catch (error) {
      console.error("Auth error:", error.message);
      throw new Error("Please visit /api/google to authenticate");
    }
  }

  async generateAuthUrl() {
    const credentials = JSON.parse(
      await fs.readFile(path.join(__dirname, "../../credentials.json"))
    );

    // Use web credentials format here too
    this.oAuth2Client = new OAuth2Client(
      credentials.web.client_id,
      credentials.web.client_secret,
      credentials.web.redirect_uris[0]
    );

    return this.oAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
      prompt: "consent",
      redirect_uri: "http://localhost:5000/api/google/callback",
    });
  }

  async handleCallback(code) {
    const { tokens } = await this.oAuth2Client.getToken(code);
    await fs.writeFile(
      path.join(__dirname, "../../token.json"),
      JSON.stringify(tokens)
    );
    return tokens;
  }

  async getSheetData(spreadsheetId, range) {
    if (!this.sheets) await this.init();

    try {
      console.log("Fetching sheet data:", { spreadsheetId, range });
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
        valueRenderOption: "UNFORMATTED_VALUE",
      });

      return response.data.values;
    } catch (error) {
      console.error("Sheet error:", error.response?.data || error);
      throw new Error(`Failed to fetch sheet data: ${error.message}`);
    }
  }

  async getColumnValues(
    spreadsheetId,
    sheetName,
    columnIndex,
    startRow,
    endRow
  ) {
    const columnLetter = String.fromCharCode(65 + columnIndex);
    const range = `${sheetName}!${columnLetter}${startRow}:${columnLetter}${endRow}`;

    const values = await this.getSheetData(spreadsheetId, range);
    return values?.map((row) => row[0] || "") || [];
  }

  async updateColumnValues(
    spreadsheetId,
    sheetName,
    columnIndex,
    startRow,
    values
  ) {
    if (!this.sheets) await this.init();

    const columnLetter = String.fromCharCode(65 + columnIndex);
    const range = `${sheetName}!${columnLetter}${startRow}:${columnLetter}${
      startRow + values.length - 1
    }`;

    try {
      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: "RAW",
        resource: {
          values: values.map((value) => [value]),
        },
      });
    } catch (error) {
      console.error("Update error:", error);
      throw new Error(`Failed to update sheet: ${error.message}`);
    }
  }

  async updateNonZeroValues(
    spreadsheetId,
    sheetName,
    columnIndex,
    startRow,
    nonZeroUpdates
  ) {
    const columnLetter = String.fromCharCode(65 + columnIndex);

    // Process each non-zero update individually
    for (const update of nonZeroUpdates) {
      const row = startRow + update.index;
      const range = `${sheetName}!${columnLetter}${row}`;

      console.log(`Updating range: ${range} with value: ${update.value}`);

      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: "RAW",
        resource: {
          values: [[update.value]],
        },
      });
    }
  }

  async updateSheetValues(spreadsheetId, sheetName, updates) {
    if (!this.sheets) await this.init();

    try {
      // Process each update
      for (const update of updates) {
        await this.sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${sheetName}!${update.range}`,
          valueInputOption: "USER_ENTERED",
          resource: {
            values: [[update.value]],
          },
        });
      }
    } catch (error) {
      console.error("Update error:", error);
      throw new Error(`Failed to update sheet: ${error.message}`);
    }
  }

  async updateRangeValues(spreadsheetId, sheetName, range, values) {
    if (!this.sheets) await this.init();

    try {
      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!${range}`,
        valueInputOption: "USER_ENTERED",
        resource: { values },
      });
    } catch (error) {
      console.error("Range update error:", error);
      throw new Error(`Failed to update range: ${error.message}`);
    }
  }

  async findReceiptsFolder(propertyName, monthYear) {
    try {
      console.log(
        `Searching for a folder containing '${propertyName}' and 'Receipts'`
      );

      const query = [
        `mimeType='application/vnd.google-apps.folder'`,
        `name contains '${propertyName}'`,
        `name contains 'Receipts'`,
      ].join(" and ");

      console.log("Search query:", query);

      const response = await this.drive.files.list({
        q: query,
        fields: "files(id, name)",
        spaces: "drive",
      });

      if (response.data.files.length === 0) {
        throw new Error(
          `No folder found containing '${propertyName}' and 'Receipts'`
        );
      }

      const receiptsFolder = response.data.files[0];
      console.log(
        `Found Receipts folder: ${receiptsFolder.name} (ID: ${receiptsFolder.id})`
      );

      // Now, search for the monthYear folder inside the Receipts folder
      console.log(
        `Searching for subfolder '${monthYear}' inside '${receiptsFolder.name}'`
      );

      const subfolderQuery = [
        `mimeType='application/vnd.google-apps.folder'`,
        `'${receiptsFolder.id}' in parents`,
        `name = '${monthYear}'`,
      ].join(" and ");

      const subfolderResponse = await this.drive.files.list({
        q: subfolderQuery,
        fields: "files(id, name)",
        spaces: "drive",
      });

      if (subfolderResponse.data.files.length === 0) {
        throw new Error(
          `No subfolder found named '${monthYear}' inside '${receiptsFolder.name}'`
        );
      }

      const monthYearFolder = subfolderResponse.data.files[0];
      console.log(
        `Found Month-Year folder: ${monthYearFolder.name} (ID: ${monthYearFolder.id})`
      );

      return monthYearFolder.id;
    } catch (error) {
      console.error("Error finding receipts subfolder:", error);
      throw error;
    }
  }

  async uploadPDF(pdfBuffer, fileName, folderId) {
    try {
      if (!this.drive) await this.init();
      console.log(`Starting PDF upload to folder: ${folderId}`);

      const fileMetadata = {
        name: fileName,
        parents: [folderId],
        mimeType: "application/pdf",
      };

      // Verify folder exists before upload
      await this.drive.files.get({
        fileId: folderId,
        fields: "name",
      });

      const bufferStream = new Readable();
      bufferStream.push(pdfBuffer);
      bufferStream.push(null);

      const media = {
        mimeType: "application/pdf",
        body: bufferStream,
      };

      console.log("Creating file in Drive...");
      const file = await this.drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: "id, webViewLink, name",
        supportsAllDrives: true,
      });

      console.log(`PDF uploaded successfully: ${file.data.name}`);
      return {
        fileId: file.data.id,
        webViewLink: file.data.webViewLink,
      };
    } catch (error) {
      console.error("PDF upload error details:", {
        error: error.message,
        code: error.code,
        folder: folderId,
        fileName,
      });
      throw new Error(`Failed to upload PDF: ${error.message}`);
    }
  }
}

const googleService = new GoogleService();
module.exports = googleService;
