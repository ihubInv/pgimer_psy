const nodemailer = require('nodemailer');
const { sanitizeUserName, sanitizeOTP } = require('../utils/emailSanitizer');

// Create reusable transporter object using SMTP transport
const createTransporter = () => {
  const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
  
  // Validate that credentials are provided
  if (!smtpUser || !smtpPass) {
    throw new Error('SMTP credentials are not configured. Please set SMTP_USER and SMTP_PASS environment variables.');
  }
  
  const config = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: smtpUser,
      pass: smtpPass
    },
    tls: {
      rejectUnauthorized: false
    }
  };
  
  // If port is 465, use secure connection
  if (config.port === 465) {
    config.secure = true;
  }
  
  return nodemailer.createTransport(config);
};

// Email templates
const emailTemplates = {
  passwordResetOTP: ({ userName, otp }) => {
    // SECURITY FIX #13: Sanitize user input to prevent HTML injection
    const safeUserName = sanitizeUserName(userName);
    const safeOTP = sanitizeOTP(otp);
    
    return {
      subject: 'PGIMER EMR System - Password Reset OTP',
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1e40af, #3b82f6); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">PGIMER EMR System</h1>
          <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 16px;">Postgraduate Institute of Medical Education & Research</p>
        </div>
        
        <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0;">Password Reset Request</h2>
          
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            Hello <strong>${safeUserName}</strong>,
          </p>
          
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            We received a request to reset your password for your PGIMER EMR System account. 
            Please use the following One-Time Password (OTP) to verify your identity:
          </p>
          
          <div style="background: #f3f4f6; border: 2px solid #3b82f6; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
            <h3 style="color: #1f2937; margin: 0 0 10px 0; font-size: 18px;">Your OTP Code</h3>
            <div style="background: white; border: 1px solid #d1d5db; border-radius: 6px; padding: 15px; margin: 10px 0;">
              <span style="font-size: 32px; font-weight: bold; color: #3b82f6; letter-spacing: 5px;">${safeOTP}</span>
            </div>
          </div>
          
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            <strong>Important:</strong>
          </p>
          <ul style="color: #4b5563; font-size: 14px; line-height: 1.6; padding-left: 20px;">
            <li>This OTP is valid for <strong>15 minutes</strong> only</li>
            <li>Do not share this OTP with anyone</li>
            <li>If you didn't request this password reset, please ignore this email</li>
            <li>For security reasons, this OTP can only be used once</li>
          </ul>
          
          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="color: #92400e; margin: 0; font-size: 14px;">
              <strong>Security Notice:</strong> If you suspect any unauthorized access to your account, 
              please contact the IT support team immediately.
            </p>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            Best regards,<br>
            <strong>PGIMER IT Support Team</strong><br>
            Postgraduate Institute of Medical Education & Research, Chandigarh
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; padding: 15px; background: #f9fafb; border-radius: 6px;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      </div>
    `,
    text: `
PGIMER EMR System - Password Reset OTP

Hello ${safeUserName},

We received a request to reset your password for your PGIMER EMR System account.

Your OTP Code: ${safeOTP}

This OTP is valid for 15 minutes only.
Do not share this OTP with anyone.

If you didn't request this password reset, please ignore this email.

Best regards,
PGIMER IT Support Team
Postgraduate Institute of Medical Education & Research, Chandigarh
    `
    };
  },

  passwordResetSuccess: ({ userName }) => {
    // SECURITY FIX #13: Sanitize user input
    const safeUserName = sanitizeUserName(userName);
    
    return {
    subject: 'PGIMER EMR System - Password Reset Successful',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">PGIMER EMR System</h1>
          <p style="color: #d1fae5; margin: 10px 0 0 0; font-size: 16px;">Postgraduate Institute of Medical Education & Research</p>
        </div>
        
        <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="background: #d1fae5; width: 60px; height: 60px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
              <span style="color: #059669; font-size: 30px;">✓</span>
            </div>
            <h2 style="color: #1f2937; margin: 0;">Password Reset Successful</h2>
          </div>
          
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            Hello <strong>${safeUserName}</strong>,
          </p>
          
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            Your password has been successfully reset. You can now log in to your PGIMER EMR System account 
            using your new password.
          </p>
          
          <div style="background: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; padding: 20px; margin: 30px 0;">
            <h3 style="color: #065f46; margin: 0 0 10px 0; font-size: 16px;">Next Steps:</h3>
            <ul style="color: #065f46; font-size: 14px; line-height: 1.6; margin: 0; padding-left: 20px;">
              <li>Log in to your account with your new password</li>
              <li>Consider enabling two-factor authentication for added security</li>
              <li>Update your password regularly for better security</li>
            </ul>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            Best regards,<br>
            <strong>PGIMER IT Support Team</strong><br>
            Postgraduate Institute of Medical Education & Research, Chandigarh
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; padding: 15px; background: #f9fafb; border-radius: 6px;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      </div>
    `,
    text: `
PGIMER EMR System - Password Reset Successful

Hello ${safeUserName},

Your password has been successfully reset. You can now log in to your PGIMER EMR System account using your new password.

Next Steps:
- Log in to your account with your new password
- Consider enabling two-factor authentication for added security
- Update your password regularly for better security

Best regards,
PGIMER IT Support Team
Postgraduate Institute of Medical Education & Research, Chandigarh
    `
    };
  },

  // Password setup email template (for new user onboarding)
  passwordSetup: ({ userName, setupLink, expiresIn }) => {
    // SECURITY FIX #13: Sanitize user input
    const safeUserName = sanitizeUserName(userName);
    // setupLink is already a URL, but we'll validate it's safe
    const safeLink = setupLink && typeof setupLink === 'string' ? setupLink.replace(/[<>"]/g, '') : setupLink;
    
    return {
      subject: 'PGIMER EMR System - Set Up Your Account Password',
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1e40af, #3b82f6); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">PGIMER EMR System</h1>
          <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 16px;">Postgraduate Institute of Medical Education & Research</p>
        </div>
        
        <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0;">Welcome to PGIMER EMR System</h2>
          
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            Hello <strong>${safeUserName}</strong>,
          </p>
          
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            Your account has been created in the PGIMER Electronic Medical Record System. 
            To complete your account setup, please set your password using the secure link below.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${safeLink}" 
               style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              Set Up Your Password
            </a>
          </div>
          
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            <strong>Important:</strong>
          </p>
          <ul style="color: #4b5563; font-size: 14px; line-height: 1.6; padding-left: 20px;">
            <li>This link is valid for <strong>${expiresIn || '24 hours'}</strong> only</li>
            <li>Do not share this link with anyone</li>
            <li>You will be required to set a strong password (minimum 8 characters with uppercase, lowercase, number, and special character)</li>
            <li>After setting your password, you can log in to the system</li>
          </ul>
          
          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="color: #92400e; margin: 0; font-size: 14px;">
              <strong>Security Notice:</strong> If you did not expect this email or suspect any unauthorized access, 
              please contact the IT support team immediately.
            </p>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            If the button above doesn't work, copy and paste this link into your browser:<br>
            <span style="color: #3b82f6; word-break: break-all;">${safeLink}</span>
          </p>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            Best regards,<br>
            <strong>PGIMER IT Support Team</strong><br>
            Postgraduate Institute of Medical Education & Research, Chandigarh
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; padding: 15px; background: #f9fafb; border-radius: 6px;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      </div>
    `,
    text: `
PGIMER EMR System - Set Up Your Account Password

Hello ${safeUserName},

Your account has been created in the PGIMER Electronic Medical Record System. 
To complete your account setup, please set your password using the secure link below.

Set Up Your Password: ${safeLink}

Important:
- This link is valid for ${expiresIn || '24 hours'} only
- Do not share this link with anyone
- You will be required to set a strong password (minimum 8 characters with uppercase, lowercase, number, and special character)
- After setting your password, you can log in to the system

If you did not expect this email or suspect any unauthorized access, please contact the IT support team immediately.

Best regards,
PGIMER IT Support Team
Postgraduate Institute of Medical Education & Research, Chandigarh
    `
    };
  },

  // Login OTP email template
  loginOTP: ({ userName, otp }) => {
    // SECURITY FIX #13: Sanitize user input to prevent HTML injection
    const safeUserName = sanitizeUserName(userName);
    const safeOTP = sanitizeOTP(otp);
    
    return {
    subject: 'PGIMER EMR System - Login Verification Code',
    html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px; font-weight: bold;">
            🔐 Login Verification
          </h1>
          <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 16px;">
            PGIMER EMR System
          </p>
        </div>
        
        <div style="padding: 30px; background: #ffffff; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 20px;">
            Hello ${safeUserName},
          </h2>
          
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
            You have successfully entered your credentials. To complete your login to the PGIMER EMR System, 
            please use the verification code below:
          </p>
          
          <div style="background: #f3f4f6; border: 2px dashed #d1d5db; padding: 25px; text-align: center; margin: 25px 0; border-radius: 8px;">
            <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0; font-weight: 500;">
              Your Login Verification Code:
            </p>
            <div style="background: #1e40af; color: white; font-size: 32px; font-weight: bold; padding: 15px 25px; border-radius: 6px; letter-spacing: 8px; display: inline-block; font-family: 'Courier New', monospace;">
              ${safeOTP}
            </div>
          </div>
          
          <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
            <strong>Important:</strong>
          </p>
          <ul style="color: #4b5563; font-size: 14px; line-height: 1.6; padding-left: 20px;">
            <li>This verification code is valid for <strong>5 minutes</strong> only</li>
            <li>Do not share this code with anyone</li>
            <li>If you didn't attempt to login, please contact IT support immediately</li>
            <li>For security reasons, this code can only be used once</li>
          </ul>
          
          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="color: #92400e; margin: 0; font-size: 14px;">
              <strong>Security Notice:</strong> If you suspect any unauthorized access to your account, 
              please contact the IT support team immediately at 0172-2746018.
            </p>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            Best regards,<br>
            <strong>PGIMER IT Support Team</strong><br>
            Postgraduate Institute of Medical Education & Research, Chandigarh
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; padding: 15px; background: #f9fafb; border-radius: 6px;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      </div>
    `,
    text: `
PGIMER EMR System - Login Verification Code

Hello ${safeUserName},

You have successfully entered your credentials. To complete your login to the PGIMER EMR System, 
please use the verification code below:

Your Login Verification Code: ${safeOTP}

This verification code is valid for 5 minutes only.
Do not share this code with anyone.

If you didn't attempt to login, please contact IT support immediately.

Best regards,
PGIMER IT Support Team
Postgraduate Institute of Medical Education & Research, Chandigarh
    `
    };
  }
};

// Email sending functions
const sendEmail = async (to, template, data = {}) => {
  try {
    const transporter = createTransporter();
    const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;

    const emailContent = emailTemplates[template](data);

    const mailOptions = {
      from: `"PGIMER EMR System" <${smtpUser}>`,
      to: to,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html
    };

    // Set a timeout for email sending (10 seconds)
    const emailPromise = transporter.sendMail(mailOptions);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Email timeout')), 10000)
    );

    try {
      const result = await Promise.race([emailPromise, timeoutPromise]);
      console.log('Email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (timeoutError) {
      // Log timeout but don't fail in development mode
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️  Email timeout (Development Mode - continuing anyway)');
        console.log('📧 Email would have been sent to:', to);
        console.log('📧 Template:', template);
        console.log('📧 Data:', data);

        // In development, log the OTP to console for testing
        if (data.otp) {
          console.log('\n🔐 ======================');
          console.log('🔐 OTP for testing:', data.otp);
          console.log('🔐 ======================\n');
        }

        return { success: true, messageId: 'dev-mode-no-email', development: true };
      }
      throw timeoutError;
    }

  } catch (error) {
    console.error('Email sending failed:', error);

    // Check for specific authentication errors
    if (error.code === 'EENVELOPE' || error.responseCode === 530 || error.message.includes('Authentication required')) {
      console.error('❌ SMTP Authentication Error: Please check your SMTP credentials (SMTP_USER and SMTP_PASS)');
      throw new Error('SMTP authentication failed. Please check email server configuration.');
    }

    // Check for missing credentials
    if (error.message.includes('SMTP credentials are not configured')) {
      console.error('❌ SMTP Configuration Error: Missing email credentials');
      throw new Error('Email service is not configured. Please contact system administrator.');
    }

    // In development mode, log the error but continue
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️  Email error (Development Mode - continuing anyway)');
      console.log('📧 Email would have been sent to:', to);
      console.log('📧 Template:', template);
      console.log('📧 Data:', data);

      // In development, log the OTP to console for testing
      if (data.otp) {
        console.log('\n🔐 ======================');
        console.log('🔐 OTP for testing:', data.otp);
        console.log('🔐 ======================\n');
      }

      return { success: true, messageId: 'dev-mode-no-email', development: true };
    }

    throw new Error(`Failed to send email: ${error.message}`);
  }
};

module.exports = {
  sendEmail,
  emailTemplates
};
