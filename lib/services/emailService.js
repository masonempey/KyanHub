const googleService = require("./googleService");
const { Buffer } = require("buffer");

class EmailService {
  constructor() {
    this.defaultSender = "info@kyanproperties.com";
  }

  /**
   * Send a basic email using Gmail API
   * @param {Object} options Email options
   * @param {string} options.to Recipient email
   * @param {string} options.subject Email subject
   * @param {string} options.message Email content (can be HTML)
   * @param {string} options.buttonText Optional CTA button text
   * @param {string} options.buttonUrl Optional CTA button URL
   * @returns {Promise<Object>} Response from Gmail API
   */
  async sendEmail({ to, subject, message, buttonText, buttonUrl }) {
    try {
      // Ensure Google service is initialized
      await googleService.init();

      // Create email HTML content
      const htmlContent = this.generateBasicTemplate({
        subject,
        message,
        buttonText,
        buttonUrl,
      });

      // Create email in RFC 2822 format
      const email = [
        `From: "Kyan Properties" <${this.defaultSender}>`,
        `To: ${to}`,
        "Content-Type: text/html; charset=utf-8",
        "MIME-Version: 1.0",
        `Subject: ${subject}`,
        "",
        htmlContent,
      ].join("\r\n");

      // Encode the email as base64url
      const encodedEmail = Buffer.from(email)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      // Send the email using Gmail API
      const response = await googleService.gmail.users.messages.send({
        userId: "me",
        requestBody: {
          raw: encodedEmail,
        },
      });

      console.log(`Email sent to ${to}, ID: ${response.data.id}`);
      return { success: true, messageId: response.data.id };
    } catch (error) {
      console.error("Failed to send email:", error);
      return {
        success: false,
        error: error.message,
        details: error,
      };
    }
  }

  /**
   * Send an email using a template from the database
   * @param {Object} options
   * @param {string} options.to Recipient email
   * @param {number} options.templateId ID of the template to use
   * @param {Object} options.variables Variables to replace in template
   */
  async sendTemplateEmail({ to, templateId, variables }) {
    try {
      // Import EmailTemplateService dynamically to avoid circular dependencies
      const EmailTemplateService = require("./emailTemplateService");

      // Get the template from database
      const template = await EmailTemplateService.getTemplateById(templateId);
      if (!template) {
        throw new Error(`Template with ID ${templateId} not found`);
      }

      // Replace variables in template content
      let { subject, message, button_text, button_url } = template;

      if (variables) {
        // Replace {{variable}} placeholders in subject, content, etc.
        for (const [key, value] of Object.entries(variables)) {
          const regex = new RegExp(`{{${key}}}`, "g");
          subject = subject.replace(regex, value);
          message = message.replace(regex, value);
          if (button_text) button_text = button_text.replace(regex, value);
          if (button_url) button_url = button_url.replace(regex, value);
        }
      }

      // Send the email
      return this.sendEmail({
        to,
        subject,
        message,
        buttonText: button_text,
        buttonUrl: button_url,
      });
    } catch (error) {
      console.error("Failed to send template email:", error);
      return { success: false, error: error.message };
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
