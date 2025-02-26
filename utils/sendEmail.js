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
      user: process.env.SMTP_USER, // AWS SES SMTP Username
      pass: process.env.SMTP_PASSWORD, // AWS SES SMTP Password
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_FROM, // ✔️ Must be verified in SES
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

export { sendEmail, sendOrderConfirmationEmail };
