const nodemailer = require("nodemailer");

console.log(`🚀 Email Service Module Loaded`);
console.log(`📅 Service initialized at: ${new Date().toLocaleString()}`);

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

// Log initial email configuration status
console.log(`📧 Email Configuration Status:`);
emailConfigs.forEach((config, index) => {
  const status = {
    index: index + 1,
    email: config.email
      ? config.email.replace(/(.{3}).*(@.*)/, "$1***$2")
      : "Not configured",
    hasPassword: !!config.password,
    isConfigured: !!(config.email && config.password),
  };
  console.log(`  Email ${index + 1}:`, status);
});

const configuredEmails = emailConfigs.filter(
  (config) => config.email && config.password
).length;
console.log(
  `✅ ${configuredEmails}/${emailConfigs.length} email accounts configured`
);

let currentEmailIndex = 0;

// Reset usage counters daily
const resetUsageCounters = () => {
  console.log(`🔄 Daily email usage counter reset initiated`);
  console.log(`📊 Previous usage stats:`);
  emailConfigs.forEach((config, index) => {
    console.log(
      `  Email ${index + 1}: ${config.currentUsage}/${config.dailyLimit} (${
        config.email
          ? config.email.replace(/(.{3}).*(@.*)/, "$1***$2")
          : "Not configured"
      })`
    );
    config.currentUsage = 0;
  });
  console.log(`✅ All email usage counters reset to 0`);
  console.log(
    `📅 Next reset scheduled for: ${new Date(
      Date.now() + 24 * 60 * 60 * 1000
    ).toLocaleString()}`
  );
};

// Schedule daily reset at midnight
console.log(`⏰ Scheduling daily email usage reset every 24 hours`);
console.log(
  `📅 First reset scheduled for: ${new Date(
    Date.now() + 24 * 60 * 60 * 1000
  ).toLocaleString()}`
);
setInterval(resetUsageCounters, 24 * 60 * 60 * 1000);

// Get next available email configuration
const getAvailableEmailConfig = () => {
  console.log(
    `🔍 Looking for available email config. Current index: ${currentEmailIndex}`
  );

  // Try to find an email with available quota
  for (let i = 0; i < emailConfigs.length; i++) {
    const config = emailConfigs[(currentEmailIndex + i) % emailConfigs.length];
    const configIndex = (currentEmailIndex + i) % emailConfigs.length;

    console.log(`📧 Checking email config ${configIndex + 1}:`, {
      email: config.email
        ? config.email.replace(/(.{3}).*(@.*)/, "$1***$2")
        : "Not configured",
      hasPassword: !!config.password,
      currentUsage: config.currentUsage,
      dailyLimit: config.dailyLimit,
      available: config.currentUsage < config.dailyLimit,
    });

    if (
      config.email &&
      config.password &&
      config.currentUsage < config.dailyLimit
    ) {
      currentEmailIndex = (currentEmailIndex + i) % emailConfigs.length;
      console.log(
        `✅ Selected email config ${currentEmailIndex + 1} for sending`
      );
      return config;
    }
  }

  // If all emails are at limit, use the first one anyway (will handle error gracefully)
  console.warn("⚠️ All email accounts have reached their daily limit");
  const fallbackConfig =
    emailConfigs.find((config) => config.email && config.password) ||
    emailConfigs[0];
  console.log(`🔄 Using fallback email config:`, {
    email: fallbackConfig.email
      ? fallbackConfig.email.replace(/(.{3}).*(@.*)/, "$1***$2")
      : "Not configured",
    hasPassword: !!fallbackConfig.password,
    currentUsage: fallbackConfig.currentUsage,
    dailyLimit: fallbackConfig.dailyLimit,
  });
  return fallbackConfig;
};

// Create transporter for the selected email
const createTransporter = (config) => {
  console.log(
    `🚀 Creating transporter for email: ${
      config.email
        ? config.email.replace(/(.{3}).*(@.*)/, "$1***$2")
        : "Not configured"
    }`
  );

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: config.email,
        pass: config.password,
      },
    });

    console.log(`✅ Transporter created successfully`);
    return transporter;
  } catch (error) {
    console.error(`❌ Error creating transporter:`, error.message);
    throw error;
  }
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
  console.log(`📨 Starting registration confirmation email process`);
  console.log(`📧 Recipient: ${registrationData.userEmail}`);
  console.log(`🆔 Registration ID: ${registrationData.registrationId}`);
  console.log(`💰 Payment Amount: ₹${registrationData.paymentDetails.amount}`);

  try {
    const emailConfig = getAvailableEmailConfig();

    if (!emailConfig.email || !emailConfig.password) {
      console.error("❌ No email configuration available");
      return { success: false, error: "Email service not configured" };
    }

    console.log(
      `🔧 Using email config for sending: ${emailConfig.email.replace(
        /(.{3}).*(@.*)/,
        "$1***$2"
      )}`
    );

    const transporter = createTransporter(emailConfig);

    console.log(`📝 Generating email template...`);
    logEmailTemplateInfo(registrationData, events, workshops);
    const htmlContent = generateRegistrationEmailTemplate(
      registrationData,
      events,
      workshops
    );
    console.log(
      `✅ Email template generated successfully (${htmlContent.length} characters)`
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

    console.log(`📤 Sending email...`);
    console.log(`Mail options:`, {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject,
      hasHtml: !!mailOptions.html,
      hasText: !!mailOptions.text,
    });

    const info = await transporter.sendMail(mailOptions);

    // Increment usage counter
    emailConfig.currentUsage++;

    // Move to next email for the next send
    currentEmailIndex = (currentEmailIndex + 1) % emailConfigs.length;

    console.log(`✅ Registration email sent successfully!`);
    console.log(`📧 Sent to: ${registrationData.userEmail}`);
    console.log(`🆔 Message ID: ${info.messageId}`);
    console.log(`📊 Email usage stats:`, {
      usedEmail: emailConfig.email.replace(/(.{3}).*(@.*)/, "$1***$2"),
      currentUsage: emailConfig.currentUsage,
      dailyLimit: emailConfig.dailyLimit,
      nextEmailIndex: currentEmailIndex,
    });

    return {
      success: true,
      messageId: info.messageId,
      usedEmail: emailConfig.email,
      currentUsage: emailConfig.currentUsage,
    };
  } catch (error) {
    console.error("❌ Error sending registration email:", error);
    console.error("Error details:", {
      code: error.code,
      message: error.message,
      stack: error.stack,
    });

    // If current email failed, try the next one
    if (error.code === "EAUTH" || error.code === "ELIMIT") {
      console.log("🔄 Trying next email configuration...");
      currentEmailIndex = (currentEmailIndex + 1) % emailConfigs.length;

      // Recursive retry with next email (only once to avoid infinite loop)
      if (currentEmailIndex !== 0) {
        console.log(
          `🔁 Retrying with next email config (index: ${currentEmailIndex})`
        );
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
  console.log(`📨 Starting notification email process`);
  console.log(`📧 Recipient: ${to}`);
  console.log(`📝 Subject: ${subject}`);

  try {
    const emailConfig = getAvailableEmailConfig();

    if (!emailConfig.email || !emailConfig.password) {
      console.error("❌ No email configuration available");
      return { success: false, error: "Email service not configured" };
    }

    console.log(
      `🔧 Using email config: ${emailConfig.email.replace(
        /(.{3}).*(@.*)/,
        "$1***$2"
      )}`
    );

    const transporter = createTransporter(emailConfig);

    const mailOptions = {
      from: `"${emailConfig.name}" <${emailConfig.email}>`,
      to: to,
      subject: subject,
      html: htmlContent,
      text: textContent,
    };

    console.log(`📤 Sending notification email...`);
    console.log(`Mail options:`, {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject,
      hasHtml: !!mailOptions.html,
      hasText: !!mailOptions.text,
    });

    const info = await transporter.sendMail(mailOptions);
    emailConfig.currentUsage++;
    currentEmailIndex = (currentEmailIndex + 1) % emailConfigs.length;

    console.log(`✅ Notification email sent successfully!`);
    console.log(`📧 Sent to: ${to}`);
    console.log(`🆔 Message ID: ${info.messageId}`);
    console.log(`📊 Email usage stats:`, {
      usedEmail: emailConfig.email.replace(/(.{3}).*(@.*)/, "$1***$2"),
      currentUsage: emailConfig.currentUsage,
      dailyLimit: emailConfig.dailyLimit,
      nextEmailIndex: currentEmailIndex,
    });

    return {
      success: true,
      messageId: info.messageId,
      usedEmail: emailConfig.email,
    };
  } catch (error) {
    console.error("❌ Error sending notification email:", error);
    console.error("Error details:", {
      code: error.code,
      message: error.message,
      stack: error.stack,
    });
    return { success: false, error: error.message };
  }
};

// Get email service status
const getEmailServiceStatus = () => {
  console.log(`📊 Email service status requested`);
  const status = emailConfigs.map((config, index) => ({
    index: index + 1,
    email: config.email
      ? config.email.replace(/(.{3}).*(@.*)/, "$1***$2")
      : "Not configured",
    isConfigured: !!(config.email && config.password),
    currentUsage: config.currentUsage,
    dailyLimit: config.dailyLimit,
    isActive: index === currentEmailIndex,
  }));

  console.log(`📈 Current email service status:`, status);
  console.log(`🎯 Active email index: ${currentEmailIndex + 1}`);

  return status;
};

// Test email connectivity for all configured accounts
const testEmailConnectivity = async () => {
  console.log(`🔧 Testing email connectivity for all configured accounts...`);
  const results = [];

  for (let i = 0; i < emailConfigs.length; i++) {
    const config = emailConfigs[i];

    if (!config.email || !config.password) {
      console.log(`⚠️ Email ${i + 1}: Not configured`);
      results.push({
        index: i + 1,
        email: "Not configured",
        status: "skipped",
        error: "Missing email or password",
      });
      continue;
    }

    console.log(
      `🔍 Testing email ${i + 1}: ${config.email.replace(
        /(.{3}).*(@.*)/,
        "$1***$2"
      )}`
    );

    try {
      const transporter = createTransporter(config);

      // Verify the connection
      await transporter.verify();

      console.log(`✅ Email ${i + 1}: Connection successful`);
      results.push({
        index: i + 1,
        email: config.email.replace(/(.{3}).*(@.*)/, "$1***$2"),
        status: "success",
        message: "Connection verified",
      });
    } catch (error) {
      console.error(`❌ Email ${i + 1}: Connection failed -`, error.message);
      results.push({
        index: i + 1,
        email: config.email.replace(/(.{3}).*(@.*)/, "$1***$2"),
        status: "failed",
        error: error.message,
        code: error.code,
      });
    }
  }

  console.log(`🏁 Email connectivity test completed`);
  console.table(results);

  return results;
};

// Log detailed email template information
const logEmailTemplateInfo = (registrationData, events, workshops) => {
  console.log(`📋 Email Template Information:`);
  console.log(`  Registration ID: ${registrationData.registrationId}`);
  console.log(`  User Email: ${registrationData.userEmail}`);
  console.log(
    `  Is CIT Student: ${registrationData.userEmail?.endsWith(
      "@citchennai.net"
    )}`
  );
  console.log(`  Payment Amount: ₹${registrationData.paymentDetails?.amount}`);
  console.log(`  Payment ID: ${registrationData.paymentDetails?.paymentId}`);
  console.log(`  Selected Pass: ${registrationData.selectedPass || "None"}`);
  console.log(
    `  Selected Events: ${registrationData.selectedEvents?.length || 0} events`
  );
  console.log(
    `  Selected Workshops: ${
      registrationData.selectedWorkshops?.length || 0
    } workshops`
  );
  console.log(
    `  Selected Non-Tech Events: ${
      registrationData.selectedNonTechEvents?.length || 0
    } events`
  );

  if (events?.length > 0) {
    console.log(`  Available Events: ${events.length}`);
    events.forEach((event) => {
      console.log(`    - ${event.title} (ID: ${event.id})`);
    });
  }

  if (workshops?.length > 0) {
    console.log(`  Available Workshops: ${workshops.length}`);
    workshops.forEach((workshop) => {
      console.log(`    - ${workshop.title} (ID: ${workshop.id})`);
    });
  }
};

module.exports = {
  sendRegistrationConfirmationEmail,
  sendNotificationEmail,
  getEmailServiceStatus,
  resetUsageCounters,
  testEmailConnectivity,
  logEmailTemplateInfo,
};
