//importing fs,express,multer
const fs = require("fs"); //file system in node
const express = require("express"); //start express server
const multer = require("multer"); //to upload files
const OAuth2Data = require("./credentials.json");  //to save credentials
var name,pic

const { google } = require("googleapis"); //extract api modules

const app = express(); //instance of express

//store the data in variables, fetching from credentials.json
const CLIENT_ID = OAuth2Data.web.client_id;
const CLIENT_SECRET = OAuth2Data.web.client_secret;
const REDIRECT_URL = OAuth2Data.web.redirect_uris[0];

//make a client object and pass the three variables in it
const oAuth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URL
);

var authed = false; //assume that user isn't authenticated

// 
const SCOPES =
  "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile";

app.set("view engine", "ejs"); //setting the template engine

var Storage = multer.diskStorage({ //defining storagge object
  destination: function (req, file, callback) {
    callback(null, "./files");  //creating a file directory taking the file and storing it in files directory
  },
  filename: function (req, file, callback) { //allot filename to the uploaded file 
    callback(null,file.originalname); //when this do this, return 
  },
});

var upload = multer({
  storage: Storage, //storage property
}).single("file"); //accept single file with the fieldname

app.get("/", (req, res) => { //checking the authntication
  if (!authed) { //does authentication
    // Generate an OAuth URL and redirect there
    var url = oAuth2Client.generateAuthUrl({ 
      access_type: "offline", //offline access gives the refresh token (ablity to get users data)
      scope: SCOPES,
    });
    console.log(url);
    res.render("index", { url: url }); //sending to index.ejs
  } else { //directly leads you inside, i.e if logged in, takes you to the upload page
      var oauth2 = google.oauth2({
      auth: oAuth2Client,
      version: "v2",
        });


        oauth2.userinfo.get(function (err, response) { //getting user info, for the left column
          if (err) {
            console.log(err);
            } else {
            console.log(response.data);
            name = response.data.name
            pic = response.data.picture
            res.render("success", { //sendinf it to the template file
            name: response.data.name,
            pic: response.data.picture,
          success:false
        });
      }
    });
  }
});

//uploading file
app.post("/upload", (req, res) => { 
  upload(req, res, function (err) {
    if (err) {
      console.log(err);
      return res.end("Something went wrong");
    } else {
      console.log(req.file.path);
      const drive = google.drive({ version: "v3",auth:oAuth2Client  }); //defining drive
      const fileMetadata = {
        name: req.file.filename, //taking the file name
      };
      const media = {
        mimeType: req.file.mimetype, //stores extension
        body: fs.createReadStream(req.file.path), //since its a large data
      };


      //creating a drive file
      drive.files.create(
        {
          resource: fileMetadata,
          media: media,
          fields: "id",
        },
        (err, file) => {
          if (err) {
            // Handle error
            console.error(err);
          } else {
            fs.unlinkSync(req.file.path) //delete file 
            res.render("success",{name:name,pic:pic,success:true})
          }

        }
      );
    }
  });
});

app.get('/logout',(req,res) => {
    authed = false
    res.redirect('/')
})

app.get("/google/callback", function (req, res) { 
  const code = req.query.code; 
  if (code) {
    // Get an access token based on our OAuth code
    oAuth2Client.getToken(code, function (err, tokens) {
      if (err) {
        console.log("Error authenticating");
        console.log(err);
      } else {
        console.log("Successfully authenticated");
        console.log(tokens)
        oAuth2Client.setCredentials(tokens); //setting  the credential;s

        authed = true; //here authantication is made true
        res.redirect("/"); //back to homepage
      }
    });
  }
});


app.listen(5000, () => {
  console.log("App is listening on Port 5000");
}); 