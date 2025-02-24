const googleService = require("./src/services/googleService");

(async () => {
  try {
    const code =
      "0ASVgi3Iy89lP1Asep_ETdOeV4OT3AW6jVuVat_JQJfbm1S8eTzSLKmvv0a8cRD_EgSBwMw";

    const tokens = await googleService.getTokens(code);
    console.log("Tokens:", tokens);
  } catch (error) {
    console.error("Error getting tokens:", error);
  }
})();
