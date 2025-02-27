import nodemailer from "nodemailer";

// 📧 Function to send verification email
const sendEmail = (email, uniqueString) => {
  console.log("uniqueString:", uniqueString);
  console.log("SMTP_USER:", process.env.SMTP_USER); // Debug
  console.log("EMAIL_FROM:", process.env.EMAIL_FROM); // Debug

  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_PORT === "465", // Use SSL if port is 465
    auth: {
      user: process.env.SMTP_USER, // AWS SES SMTP Username
      pass: process.env.SMTP_PASSWORD, // AWS SES SMTP Password
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_FROM, // ✔️ Must be verified in SES
    to: email,
    subject: "This is your verification email",
    html: `
      <div style="display: flex; justify-content: center; align-items: center;">
        <div>
          <button style="text-align: center; font-size: 10px;">
            Click <a style="color:blue;" href="http://localhost:5173/verify-email/${uniqueString}">here</a> to verify email
          </button>
        </div>
      </div>
    `,
  };

  transport.verify((err, success) => {
    if (err) {
      console.error("SMTP Connection Error:", err); // SMTP connection issues
    } else {
      console.log("✅ SMTP Server is ready to send emails");
    }
  });

  transport.sendMail(mailOptions, (error, response) => {
    if (error) {
      console.error("❌ Email sending error:", error); // Detailed error logging
    } else {
      console.log("✅ Message Sent:", response);
    }
  });
};

// 🧾 Function to send order confirmation email
const sendOrderConfirmationEmail = async (email, orderId) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_PORT === "465", // Use SSL if port is 465
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "Order Confirmation",
    text: `Your order has been placed successfully. Your order ID is ${orderId}.`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("✅ Order confirmation email sent successfully");
  } catch (error) {
    console.error("❌ Failed to send order confirmation email:", error);
  }
};

// 📢 Function to send vendor approval email
const sendApprovalEmail = async (email) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_PORT === "465",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "Vendor Approval Notification",
    html: `<p>Congratulations! Your vendor account has been approved. You can now access your dashboard and start selling.</p>`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("✅ Vendor approval email sent successfully");
  } catch (error) {
    console.error("❌ Failed to send vendor approval email:", error);
  }
};

// ❌ Function to send vendor rejection email
const sendRejectionEmail = async (email) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_PORT === "465",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "Vendor Rejection Notification",
    html: `<p>We regret to inform you that your vendor application has been rejected. If you have any questions, please contact support.</p>`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("✅ Vendor rejection email sent successfully");
  } catch (error) {
    console.error("❌ Failed to send vendor rejection email:", error);
  }
};

// ✅ Function to send product approval email
const sendProductApprovalEmail = async (email, productName) => {
  if (!email) {
    console.error(`❌ Missing recipient email for product: ${productName}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_PORT === "465", // Secure for port 465
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "Product Approval Notification",
    html: `<p>Congratulations! Your product <strong>${productName}</strong> has been approved and is now live on the marketplace.</p>`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Product approval email sent for ${productName} to ${email}`);
  } catch (error) {
    console.error(`❌ Failed to send product approval email for ${productName}:`, error);
  }
};

// ❌ Function to send product rejection email
const sendProductRejectionEmail = async (email, productName) => {
  if (!email) {
    console.error(`❌ Missing recipient email for product: ${productName}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_PORT === "465",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "Product Rejection Notification",
    html: `<p>Unfortunately, your product <strong>${productName}</strong> has been rejected.</p>`
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Product rejection email sent for ${productName} to ${email}`);
  } catch (error) {
    console.error(`❌ Failed to send product rejection email for ${productName}:`, error);
  }
};

// 📧 Function to send review approval email
const sendReviewApprovalEmail = async (email, reviewContent) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_PORT === "465",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "Review Approved",
    html: `<p>Congratulations! Your review has been approved and is now visible.</p>
           <p><strong>Review:</strong> "${reviewContent}"</p>`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Review approval email sent to ${email}`);
  } catch (error) {
    console.error(`❌ Failed to send review approval email:`, error);
  }
};

// ❌ Function to send review rejection email
const sendReviewRejectionEmail = async (email, reviewContent, reason) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_PORT === "465",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "Review Rejected",
    html: `<p>Unfortunately, your review has been rejected.</p>
           <p><strong>Review:</strong> "${reviewContent}"</p>
           <p><strong>Reason:</strong> ${reason}</p>`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Review rejection email sent to ${email}`);
  } catch (error) {
    console.error(`❌ Failed to send review rejection email:`, error);
  }
};
const sendCommentApprovalEmail = async (email, commentContent) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_PORT === "465",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "Comment Approved",
    html: `<p>Your comment has been approved and is now visible.</p>
           <p><strong>Comment:</strong> "${commentContent}"</p>`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Comment approval email sent to ${email}`);
  } catch (error) {
    console.error(`❌ Failed to send comment approval email:`, error);
  }
};

// ❌ Function to send comment rejection email
const sendCommentRejectionEmail = async (email, commentContent, reason) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_PORT === "465",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "Comment Rejected",
    html: `<p>Unfortunately, your comment has been rejected.</p>
           <p><strong>Comment:</strong> "${commentContent}"</p>
           <p><strong>Reason:</strong> ${reason}</p>`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Comment rejection email sent to ${email}`);
  } catch (error) {
    console.error(`❌ Failed to send comment rejection email:`, error);
  }
};

export {
  sendEmail,
  sendOrderConfirmationEmail,
  sendApprovalEmail,
  sendRejectionEmail,
  sendProductApprovalEmail,
  sendProductRejectionEmail,
  sendReviewApprovalEmail,
  sendReviewRejectionEmail,
  sendCommentApprovalEmail,
  sendCommentRejectionEmail
};
