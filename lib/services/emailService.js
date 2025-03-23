const { Resend } = require("resend");

class EmailService {
  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
    this.defaultSender = "info@kyanproperties.com";
  }

  /**
   * Send a basic email
   * @param {Object} options Email options
   * @param {string} options.to Recipient email
   * @param {string} options.subject Email subject
   * @param {string} options.message Email content (can be HTML)
   * @param {string} options.buttonText Optional CTA button text
   * @param {string} options.buttonUrl Optional CTA button URL
   * @returns {Promise<Object>} Response from Resend
   */
  async sendEmail({ to, subject, message, buttonText, buttonUrl }) {
    try {
      if (!process.env.RESEND_API_KEY) {
        console.error("RESEND_API_KEY is not defined in environment variables");
        return { success: false, error: "API key missing" };
      }

      const htmlContent = this.generateBasicTemplate({
        subject,
        message,
        buttonText,
        buttonUrl,
      });

      const response = await this.resend.emails.send({
        from: this.defaultSender,
        to: [to],
        subject: subject,
        html: htmlContent,
      });

      if (!response || !response.id) {
        console.error("Email API returned empty response:", response);
        return { success: false, error: "Invalid API response" };
      }

      console.log(`Email sent to ${to}, ID: ${response.id}`);
      return { success: true, messageId: response.id };
    } catch (error) {
      console.error("Failed to send email:", error);
      return { success: false, error: error.message, details: error };
    }
  }

  /**
   * Generate a simple HTML email template
   */
  generateBasicTemplate({ subject, message, buttonText, buttonUrl }) {
    const buttonHtml =
      buttonText && buttonUrl
        ? `<a href="${buttonUrl}" style="display: inline-block; background-color: #eccb34; color: #333; text-decoration: none; padding: 10px 20px; border-radius: 4px; margin-top: 20px;">${buttonText}</a>`
        : "";

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${subject}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #eccb34; padding: 20px; text-align: center;">
              <h1 style="margin: 0; color: #333;">Kyan Properties</h1>
            </div>
            
            <div style="padding: 20px; background-color: #fff; border: 1px solid #e1e1e1;">
              <h2 style="color: #333;">${subject}</h2>
              <div>${message}</div>
              
              ${buttonHtml}
            </div>
            
            <div style="text-align: center; padding: 20px; font-size: 12px; color: #888;">
              <p>&copy; ${new Date().getFullYear()} Kyan Properties. All rights reserved.</p>
              <p>1917 10 Ave SW, Calgary AB T3C 0J8</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}

// Create and export a singleton instance
const emailService = new EmailService();
module.exports = emailService;
