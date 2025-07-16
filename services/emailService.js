const nodemailer = require("nodemailer");

// Email configuration with rotation
const emailConfigs = [
  {
    email: process.env.EMAIL_1,
    password: process.env.EMAIL_1_PASSWORD,
    name: "Tech Fiesta Team",
    currentUsage: 0,
    dailyLimit: 500, // Gmail's daily limit
  },
  {
    email: process.env.EMAIL_2,
    password: process.env.EMAIL_2_PASSWORD,
    name: "Tech Fiesta Team",
    currentUsage: 0,
    dailyLimit: 500,
  },
  {
    email: process.env.EMAIL_3,
    password: process.env.EMAIL_3_PASSWORD,
    name: "Tech Fiesta Team",
    currentUsage: 0,
    dailyLimit: 500,
  },
  {
    email: process.env.EMAIL_4,
    password: process.env.EMAIL_4_PASSWORD,
    name: "Tech Fiesta Team",
    currentUsage: 0,
    dailyLimit: 500,
  },
  {
    email: process.env.EMAIL_5,
    password: process.env.EMAIL_5_PASSWORD,
    name: "Tech Fiesta Team",
    currentUsage: 0,
    dailyLimit: 500,
  },
];

let currentEmailIndex = 0;

// Reset usage counters daily
const resetUsageCounters = () => {
  emailConfigs.forEach((config) => {
    config.currentUsage = 0;
  });
  console.log("Email usage counters reset");
};

// Schedule daily reset at midnight
setInterval(resetUsageCounters, 24 * 60 * 60 * 1000);

// Get next available email configuration
const getAvailableEmailConfig = () => {
  // Try to find an email with available quota
  for (let i = 0; i < emailConfigs.length; i++) {
    const config = emailConfigs[(currentEmailIndex + i) % emailConfigs.length];
    if (
      config.email &&
      config.password &&
      config.currentUsage < config.dailyLimit
    ) {
      currentEmailIndex = (currentEmailIndex + i) % emailConfigs.length;
      return config;
    }
  }

  // If all emails are at limit, use the first one anyway (will handle error gracefully)
  console.warn("All email accounts have reached their daily limit");
  return (
    emailConfigs.find((config) => config.email && config.password) ||
    emailConfigs[0]
  );
};

// Create transporter for the selected email
const createTransporter = (config) => {
  return nodemailer.createTransporter({
    service: "gmail",
    auth: {
      user: config.email,
      pass: config.password,
    },
  });
};

// Generate email template for registration confirmation
const generateRegistrationEmailTemplate = (
  registrationData,
  events,
  workshops
) => {
  const { registrationId, userEmail, paymentDetails, selectedPass } =
    registrationData;

  // Get event details
  const selectedEventDetails = events
    ? events.filter((event) =>
        registrationData.selectedEvents?.includes(event.id)
      )
    : [];

  // Get workshop details
  const selectedWorkshopDetails = workshops
    ? workshops.filter((workshop) =>
        registrationData.selectedWorkshops?.includes(workshop.id)
      )
    : [];

  const isCIT = userEmail && userEmail.endsWith("@citchennai.net");

  return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .registration-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
        .event-list { background: white; padding: 20px; border-radius: 8px; margin: 10px 0; }
        .event-item { padding: 10px; border-bottom: 1px solid #eee; }
        .event-item:last-child { border-bottom: none; }
        .amount { font-size: 24px; font-weight: bold; color: #667eea; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        .qr-info { background: #e8f4f8; padding: 15px; border-radius: 8px; margin: 15px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Registration Confirmed!</h1>
            <h2>Tech Fiesta 2025</h2>
        </div>
        
        <div class="content">
            <div class="registration-details">
                <h3>Registration Details</h3>
                <p><strong>Registration ID:</strong> ${registrationId}</p>
                <p><strong>Email:</strong> ${userEmail}</p>
                <p><strong>Student Type:</strong> ${
                  isCIT ? "CIT Student" : "Regular Student"
                }</p>
                <p><strong>Payment ID:</strong> ${paymentDetails.paymentId}</p>
                <p><strong>Amount Paid:</strong> <span class="amount">₹${
                  paymentDetails.amount
                }</span></p>
                <p><strong>Payment Status:</strong> ✅ Verified</p>
            </div>

            ${
              selectedPass
                ? `
            <div class="event-list">
                <h3>🎫 Selected Pass</h3>
                <div class="event-item">
                    <strong>Pass ID:</strong> ${selectedPass}
                </div>
            </div>
            `
                : ""
            }

            ${
              selectedEventDetails.length > 0
                ? `
            <div class="event-list">
                <h3>🎯 Registered Tech Events</h3>
                ${selectedEventDetails
                  .map(
                    (event) => `
                <div class="event-item">
                    <strong>${event.title}</strong><br>
                    <small>📅 ${event.date} | 🕒 ${event.time} | 📍 ${event.venue}</small>
                </div>
                `
                  )
                  .join("")}
            </div>
            `
                : ""
            }

            ${
              selectedWorkshopDetails.length > 0
                ? `
            <div class="event-list">
                <h3>🛠️ Registered Workshops</h3>
                ${selectedWorkshopDetails
                  .map(
                    (workshop) => `
                <div class="event-item">
                    <strong>${workshop.title}</strong><br>
                    <small>📅 ${workshop.date} | 🕒 ${workshop.time} | 📍 ${workshop.venue}</small>
                </div>
                `
                  )
                  .join("")}
            </div>
            `
                : ""
            }

            ${
              registrationData.selectedNonTechEvents?.length > 0
                ? `
            <div class="event-list">
                <h3>🎨 Non-Tech Events (Pay on Arrival)</h3>
                ${registrationData.selectedNonTechEvents
                  .map(
                    (eventId) => `
                <div class="event-item">
                    <strong>Event ID:</strong> ${eventId}<br>
                    <small>💰 Payment required at venue</small>
                </div>
                `
                  )
                  .join("")}
            </div>
            `
                : ""
            }

            <div class="qr-info">
                <h3>📱 QR Codes</h3>
                <p>QR codes for your registered events will be available in your dashboard. Please bring them to the respective events for quick check-in.</p>
                <p><strong>Dashboard Link:</strong> <a href="${
                  process.env.FRONTEND_URL || "https://techfiesta2025.com"
                }/dashboard">View Dashboard</a></p>
            </div>

            <div class="registration-details">
                <h3>📋 Important Instructions</h3>
                <ul>
                    <li>Save this email for your records</li>
                    <li>Bring a valid ID card to all events</li>
                    <li>QR codes are required for event entry</li>
                    <li>Non-tech events require payment at the venue</li>
                    <li>Follow event-specific guidelines</li>
                </ul>
            </div>
        </div>
        
        <div class="footer">
            <p>For any queries, contact us at techfiesta@citchennai.net</p>
            <p>© 2025 Tech Fiesta - Chennai Institute of Technology</p>
        </div>
    </div>
</body>
</html>
  `;
};

// Send registration confirmation email
const sendRegistrationConfirmationEmail = async (
  registrationData,
  events = [],
  workshops = []
) => {
  try {
    const emailConfig = getAvailableEmailConfig();

    if (!emailConfig.email || !emailConfig.password) {
      console.error("No email configuration available");
      return { success: false, error: "Email service not configured" };
    }

    const transporter = createTransporter(emailConfig);

    const htmlContent = generateRegistrationEmailTemplate(
      registrationData,
      events,
      workshops
    );

    const mailOptions = {
      from: `"${emailConfig.name}" <${emailConfig.email}>`,
      to: registrationData.userEmail,
      subject: `🎉 Tech Fiesta 2025 - Registration Confirmed (${registrationData.registrationId})`,
      html: htmlContent,
      text: `
Tech Fiesta 2025 - Registration Confirmed

Registration ID: ${registrationData.registrationId}
Email: ${registrationData.userEmail}
Amount Paid: ₹${registrationData.paymentDetails.amount}
Payment ID: ${registrationData.paymentDetails.paymentId}

Your registration has been confirmed successfully!
Visit your dashboard for QR codes and more details.

For queries, contact: techfiesta@citchennai.net
      `,
    };

    const info = await transporter.sendMail(mailOptions);

    // Increment usage counter
    emailConfig.currentUsage++;

    // Move to next email for the next send
    currentEmailIndex = (currentEmailIndex + 1) % emailConfigs.length;

    console.log(
      `Registration email sent successfully to ${registrationData.userEmail} using ${emailConfig.email}`
    );
    console.log(
      `Current usage for ${emailConfig.email}: ${emailConfig.currentUsage}/${emailConfig.dailyLimit}`
    );

    return {
      success: true,
      messageId: info.messageId,
      usedEmail: emailConfig.email,
      currentUsage: emailConfig.currentUsage,
    };
  } catch (error) {
    console.error("Error sending registration email:", error);

    // If current email failed, try the next one
    if (error.code === "EAUTH" || error.code === "ELIMIT") {
      console.log("Trying next email configuration...");
      currentEmailIndex = (currentEmailIndex + 1) % emailConfigs.length;

      // Recursive retry with next email (only once to avoid infinite loop)
      if (currentEmailIndex !== 0) {
        return await sendRegistrationConfirmationEmail(
          registrationData,
          events,
          workshops
        );
      }
    }

    return {
      success: false,
      error: error.message,
      code: error.code,
    };
  }
};

// Send general notification email
const sendNotificationEmail = async (to, subject, htmlContent, textContent) => {
  try {
    const emailConfig = getAvailableEmailConfig();

    if (!emailConfig.email || !emailConfig.password) {
      console.error("No email configuration available");
      return { success: false, error: "Email service not configured" };
    }

    const transporter = createTransporter(emailConfig);

    const mailOptions = {
      from: `"${emailConfig.name}" <${emailConfig.email}>`,
      to: to,
      subject: subject,
      html: htmlContent,
      text: textContent,
    };

    const info = await transporter.sendMail(mailOptions);
    emailConfig.currentUsage++;
    currentEmailIndex = (currentEmailIndex + 1) % emailConfigs.length;

    console.log(`Email sent successfully to ${to} using ${emailConfig.email}`);

    return {
      success: true,
      messageId: info.messageId,
      usedEmail: emailConfig.email,
    };
  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, error: error.message };
  }
};

// Get email service status
const getEmailServiceStatus = () => {
  return emailConfigs.map((config, index) => ({
    index: index + 1,
    email: config.email
      ? config.email.replace(/(.{3}).*(@.*)/, "$1***$2")
      : "Not configured",
    isConfigured: !!(config.email && config.password),
    currentUsage: config.currentUsage,
    dailyLimit: config.dailyLimit,
    isActive: index === currentEmailIndex,
  }));
};

module.exports = {
  sendRegistrationConfirmationEmail,
  sendNotificationEmail,
  getEmailServiceStatus,
  resetUsageCounters,
};
