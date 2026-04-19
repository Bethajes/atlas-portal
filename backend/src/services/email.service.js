const nodemailer = require('nodemailer');

// Create transporter (using Gmail for testing)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Send password reset email
 */
const sendPasswordResetEmail = async (to, resetToken, name) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
  
  const mailOptions = {
    from: `"Atlas Health College" <${process.env.EMAIL_USER}>`,
    to: to,
    subject: 'Password Reset Request - Atlas Portal',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0066cc;">Password Reset Request</h2>
        <p>Hello ${name},</p>
        <p>We received a request to reset your Atlas Portal password.</p>
        <p>Click the button below to reset your password (valid for 1 hour):</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #0066cc; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 6px; font-weight: bold;">
            Reset Password
          </a>
        </div>
        <p>Or copy this link: ${resetUrl}</p>
        <p>If you didn't request this, please ignore this email.</p>
        <hr style="border: 1px solid #eee; margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
          Atlas Health College Portal<br>
          This link will expire in 1 hour.
        </p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
};

/**
 * Send welcome email
 */
const sendWelcomeEmail = async (to, name) => {
  const mailOptions = {
    from: `"Atlas Health College" <${process.env.EMAIL_USER}>`,
    to: to,
    subject: 'Welcome to Atlas Health College Portal',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0066cc;">Welcome to Atlas Portal!</h2>
        <p>Hello ${name},</p>
        <p>Your account has been created successfully.</p>
        <p>You can now access the student portal to:</p>
        <ul>
          <li>View your courses and schedule</li>
          <li>Check grades and GPA</li>
          <li>Submit assignments</li>
          <li>Access course materials</li>
        </ul>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/login" 
             style="background-color: #0066cc; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 6px; font-weight: bold;">
            Go to Portal
          </a>
        </div>
        <hr style="border: 1px solid #eee; margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
          Atlas Health College Portal
        </p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
};

module.exports = {
  sendPasswordResetEmail,
  sendWelcomeEmail,
};
