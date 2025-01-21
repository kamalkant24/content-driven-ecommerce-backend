const mailBody = (type, email, uniqueString) => {
  const html = {
    verifyEmail: `
    <!DOCTYPE html>
<html>
<head>
<title>Verify Email</title>
</head>
<script>
    
      function getQueryParameters() {


        }
    

</script>
<body>
<div style="display: flex; justify-content: center; align-items: center;">
    <div>
        <!-- <h1 style=" text-align: center;" >Your Email is verified</h1> -->
        
        
        <button style="color:blue; text-align: center;">Click to Verify Your Email</button>
    </div>
</div>
    
</body>
</html>`,
  };

  return html[type];
};

export default mailBody;