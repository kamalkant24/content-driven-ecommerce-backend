import nodemailer from "nodemailer";

const sendEmail = (email, uniqueString) => {
  console.log("uniqueString", uniqueString);
  let transport = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "rajatambedker06@gmail.com",
      pass: "pawj mmks hkuz laxu",
    },
  });

  let mailOptions;
  let sender = "Rajat@yopmail.com";

  mailOptions = {
    from: sender,
    to: email,
    subject: "This is your verification email",
    html: `
<div style="display: flex; justify-content: center; align-items: center;">
    <div>
        <button style=" text-align: center; font-size:10px" >Click <a style="color:blue;" href=http://localhost:5173/realestate/verify-email/${uniqueString}>here </a> to verify email</button>
    </div>
</div>`,
  };

  transport.sendMail(mailOptions, function (error, response) {
    if (error) {
      console.log({ EEEE: error });
    } else {
      console.log("Message Sent");
    }
  });
};
export default sendEmail;
