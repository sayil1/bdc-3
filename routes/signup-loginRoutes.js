const router = require("express").Router();
const User = require("../models/regSchema");
const HTML = require("./emailTemplates/welcomeMail");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
var emailCheck = require("email-check");
var firebase = require("firebase/app");
const path = require("path");
var nodemailer = require("nodemailer");
// var API_KEY = '2a09f0f07096a8c0b6fb2b22822798bf-fa6e84b7-ca6f6381';
// var DOMAIN = 'sandbox156cf45ca52d4277885283dc0d14b163.mailgun.org';
// var mailgun = require('mailgun-js')({apiKey: API_KEY, domain: DOMAIN,  host: "api.eu.mailgun.net",});
var addDays = require("../routes/utility");
var removeDays = require("../routes/utility");
const activity = require("../models/activitymodels");

// for uploading images
var multipart = require("connect-multiparty");
var multipartMiddleware = multipart();

var multer = require("multer");
// set storage
var storage = multer.diskStorage({
  destination: "uploads/",
});

var upload = multer({
  storage: storage,
});

const cloudinary = require("cloudinary");
cloudinary.config({
  cloud_name: "sayil",
  api_key: "443611676341187",
  api_secret: "wAPlHaXu39fxiKuBr9ZN4Gp6IxA",
});

router.get("/", (req, res) => {
  console.log("signup works");
  res.send("working");
});
// this is just for testing

router.post("/register", (req, res) => {
  let errors = [];
  if (Object.keys(req.body).length === 0) {
    console.log("sorry u didnt send any data");
    res.send("you didnt send any data");
  } else {
    // console.log(req.body, 'is the body')
    if (!req.body.password || req.body.password.length < 4) {
      errors.push("Password must not be less than four characters");
      res.status(404).json({
        status: "error",
        message: errors,
      });
      console.log(errors);
    }
    if (!req.body.email) {
      errors.push("no email");
      res.status(404).json({
        status: "error",
        message: errors,
      });
      console.log(errors);
    }

    if (errors.length > 0) {
      res.send(errors);
      console.log(errors);
    } else {
      User.findOne({
        $or: [
          {
            email: req.body.email,
          },
          {
            phone: req.body.phone,
          },
        ],
      }).then((user) => {
        console.log(user);
        if (user) {
          errors.push(
            "either phone or email is already registered with another account"
          );
          res.json({
            devMessage: errors,
          });
          console.log("this account exists");
        } else if (user == null) {
          const newUser = new User({
            fname: req.body.fname,
            lname: req.body.lname,
            userName: req.body.userName,
            address: req.body.address,
            Dob: req.body.Dob,
            phone: req.body.phone,
            email: req.body.email,
            password: req.body.password,
            acctType: req.body.acctType,
            rcNumber: req.body.rcNumber,
            busPhoneNum: req.body.busPhoneNumber,
            busEmail: req.body.busEmail,
            aboutMe: req.body.aboutMe,
          });

          bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(newUser.password, salt, (err, hash) => {
              if (err) throw error;
              else {
                newUser.password = hash;
                newUser
                  .save()
                  .then((user) => {
                    var transporter = nodemailer.createTransport({
                      service: "hotmail",
                      auth: {
                        user: "bdccustomercare@hotmail.com",
                        pass: "@Babura2020",
                      },
                    });

                    // instanciating class for html
                    var tt = new HTML.A(
                      newUser.fname,
                      newUser.lname,
                      newUser._id
                    );
                    var mailOptions = {
                      from: "bdccustomercare@hotmail.com",
                      to: user.email,
                      subject: "Welcome to 313BDC, Activation of account",
                      html: tt.getMail(),
                    };
                    transporter.sendMail(mailOptions, function (error, info) {
                      if (error) {
                        console.log(error);
                        // res.send(error)
                      } else {
                        console.log("Email sent: " + info.response);
                        // res.send('Email sent, Thank You!! ');
                        res.json({
                          message: "The link has been sent to your Email",
                          data: user,
                        });
                      }
                    });

                    console.log("success");
                  })
                  .catch((err) => {
                    console.log(err);
                  });
                // console.log(newUser);
              }
            });
          });
        }
      });
    }
  }
});

router.post("/image/:id", multipartMiddleware, async (req, res) => {
  console.log(req.body, req.files, req.params.id);
  let x = await cloudinary.v2.uploader.upload(
    req.files.image.path,
    {
      width: 700,
      gravity: "south",
      y: 80,
      color: "white",
    },
    function (error, result) {
      if (error) {
        console.log("error here");
      }
      // res.json({
      //   data: result
      // });
      imagePath = {
        data: result.secure_url,
      };
      console.log(imagePath.data, "is the image path");

      User.findByIdAndUpdate(
        req.params.id,
        {
          image: imagePath.data,
        },
        {
          new: true,
          upsert: true,
        },
        (err, result) => {
          if (err) {
            console.log(err);
          } else {
            res.json({
              message: "Successfully updated",
              //  authData
              result,
            });
          }
        }
      );
    }
  );
});

router.get("/users", (req, res) => {
  console.log(req.query);
  let start = "";
  let end = "";
  if (!req.query.startDate || !req.query.endDate) {
    (start = removeDays(new Date(), 30)), (end = new Date());
  } else {
    (start = req.query.startDate), (end = addDays(req.query.endDate, 1));
  }
  filter = req.query;
  filter["created_date"] = {
    $gte: start,
    $lte: end,
  };
  delete filter.startDate;
  delete filter.endDate;
  console.log(filter);
  console.log(filter);
  User.find(filter, (err, result) => {
    if (err) res.send(err);
    res.send({
      result: result,
    });
  });
});

router.post("/addBank/:id", (req, res) => {
  let newdet = new User({
    bank: [
      {
        accountNumber: req.body.accountNumber,
        accountName: req.body.accountName,
        bankName: req.body.bankName,
        currencyType: req.body.currencyType,
      },
    ],
  });
  User.findByIdAndUpdate(
    req.params.id,
    {
      $push: {
        bank: newdet.bank,
      },
    },
    function (err, doc) {
      if (err) {
        console.log(err);
        res.send("error occured");
      } else {
        console.log(newdet);
        res.status(200).send({
          message: "added successful",
        });
        let act = new activity({
          activity: "USER - ADD NEW BANK",
          userId: req.params.id,
        });
        act.save();
      }
    }
  );
});

router.get("/activate-account/:id", (req, res) => {
  User.findByIdAndUpdate(
    req.params.id,
    {
      active: true,
    },
    {
      new: true,
      upsert: true,
    },
    function (err, doc) {
      if (err) {
        console.log(err);
        res.send("error occured");
      } else {
        res.sendFile(path.join(__dirname + "/activatedAcount.html"));
      }
    }
  );
});

// to get a single user
router.get("/user/:id", (req, res) => {
  User.findById(req.params.id, (err, result) => {
    if (err) {
      res.send("An Error Occured!");
      console.log("error:");
    } else {
      res.send(result);
      console.log(req.params.id);
    }
  });
});

// filter user to get banks
router.get("/user-banks/:id", (req, res) => {
  console.log(req.params.id);
  User.findById(req.params.id, (err, result) => {
    if (err) {
      res.send("An Error Occured!");
      console.log("error:");
    
    } else if(!result){
       res.send("No banks found for user!")
    } else {
      res.send(result.bank);
      console.log(req.params.id);
    }
  });
});

// delete a users bank
router.get("/delUser-bank/:id/:bankId", (req, res) => {
  User.update(
    {
      _id: req.params.id,
    },
    {
      $pull: {
        bank: {
          _id: req.params.bankId,
        },
      },
    },
    function (err) {
      if (err) {
        res.send("theres an error");
        console.log(err);
      } else {
        res.send("deleted");
        console.log("done");
      }
    }
  );
});

// router.post("/facebook", (req,res)=>{

// // Build Firebase credential with the Facebook access token.
// var credential = firebase.auth.FacebookAuthProvider.credential(access_token);

// // Sign in with credential from the Google user.
// firebase.auth().signInWithCredential(credential).catch(function(error) {
//   // Handle Errors here.
//   var errorCode = error.code;
//   var errorMessage = error.message;
//   // The email of the user's account used.
//   var email = error.email;
//   // The firebase.auth.AuthCredential type that was used.
//   var credential = error.credential;
//   // ...
// });

// })
router.get("/logout/:id", async (req, res) => {
  let x = await User.findByIdAndUpdate(
    req.params.id,
    {
      logged_in: false,
      logout_time: await new Date(),
    },
    {
      new: true,
    },
    (err, doc) => {
      console.log(doc);
    }
  );
  res.send({
    message: "session terminated",
  });
});

router.post("/login", async (req, res, next) => {
  if (Object.keys(req.body).length === 0) {
    console.log("sorry u didnt send any data");
    res.status(400).send("you didnt send any data");
  } else {
    await User.findOne({
      $or: [
        {
          email: req.body.emailOrPhone,
        },
        {
          phone: req.body.emailOrPhone,
        },
      ],
      active: true,
    }).then((user) => {
      console.log(req.body);
      if (user == null) {
        res.status(400).json({
          message: "wrong login details or account not yet activated",
          devMessage: "this user wasnt found",
        });
        console.log("not seen");
      } else {
        bcrypt.compare(
          req.body.password,
          user.password,
          async (err, isMatch) => {
            if (err) throw err;
            if (isMatch) {
              // res.status(200).send("ok");
              console.log(user);
              const token = jwt.sign(
                {
                  user,
                },
                "my_secret"
              );
              let x = await User.findByIdAndUpdate(
                user._id,
                {
                  logged_in: true,
                  login_time: await new Date(),
                },
                {
                  new: true,
                  upsert: true,
                },
                (err, doc) => {
                  console.log(doc);
                }
              );
              res.send({
                token: token,
                user: user,
              });
            } else {
              res.status(400).json({
                message: "wrong login details",
                devMessage: "passwords didnt match",
              });
              console.log("failed password didnt match");
              console.log(req.body);
            }
          }
        );
      }

      // console.log(req.body.password);
      // console.log(req.body.email);
    });
  }
});

router.get("/resetPass", (req, res) => {
  res.sendFile(path.join(__dirname + "/forgotPass.html"));
});

router.get("/resetPass2", (req, res) => {
  res.sendFile(path.join(__dirname + "/forgotPass2.html"));
});

router.post("/fpass", async (req, res) => {
  if (Object.keys(req.body).length === 0) {
    res.json({
      message: "please enter email",
    });
  } else {
    await User.findOne({
      email: req.body.email,
    }).then((user) => {
      console.log(req.body);
      if (user == null) {
        res.json({
          message: "Email address is not associated with any account",
          devMessage: "no user has registered with the email",
        });
        console.log("not seen");
      } else {
        const token = jwt.sign(
          {
            exp: Math.floor(Date.now() / 1000) + 60 * 60,
            user,
          },
          "my_secret"
        );

        var transporter = nodemailer.createTransport({
          service: "hotmail",
          auth: {
            user: "bdccustomercare@hotmail.com",
            pass: "@Babura2020",
          },
        });
        var mailOptions = {
          from: "bcd ",
          to: user.email,
          subject: "313bdc Password reset",
          html: ` 
          <h2>313BDC</h2>
          <div> 313BDC <br>
          Dear ${user.fname}, <br><br>
          </div>        
          Follow this  <a href="reset313.herokuapp.com/reg/resetPass2/?e=${user._id}&q=${token}">link</a> to reset your password,  this link expires after an hour. <br> if you did not make this request, or you believe that an unauthorised person has accessed your account, kindly log into your account without delay to review and update your security settings.<br><br>
          Sincerely, <br><br>
          313BDC Support <br><br>
          08031230313, 08099936398, 07058890313`,
        };
        transporter.sendMail(mailOptions, function (error, info) {
          if (error) {
            console.log(error);
            // res.send(error)
          } else {
            console.log("Email sent: " + info.response);
            // res.send('Email sent, Thank You!! ');
            res.json({
              message: "The link has been sent to your Email",
              data: user,
            });
          }
        });
      }
    });
  }
});

// to update a user with its ID
router.put("/update-user/:id", (req, res) => {
  // var newInfo = req.body
  let newInfo = req.body;
  console.log(newInfo);
  User.findByIdAndUpdate(
    req.params.id,
    newInfo,
    {
      upsert: true,
      new: true,
    },
    (err, result) => {
      if (err) {
        console.log(err);
      } else {
        res.json({
          message: "Successfully updated",
          //  authData
          result: result,
        });
      }
    }
  );
});

// to update a user with its ID
router.get("/search", (req, res) => {
  // var newInfo = req.body
  User.find({
    $text: {
      $search: req.query.search,
    },
  }).exec(function (err, docs) {
    res.send({
      doc: docs,
      err,
    });
  });
});

router.post("/changePass/:id", async (req, res, next) => {
  if (Object.keys(req.body).length === 0) {
    console.log("sorry u didnt send any data");
    res.status(400).send("you didnt send any data");
  } else {
    await User.findOne({
      $or: [
        {
          email: req.body.emailOrPhone,
        },
        {
          phone: req.body.emailOrPhone,
        },
      ],
    }).then((user) => {
      console.log(req.body);
      if (user == null) {
        res.status(400).json({
          message: "wrong login details",
          devMessage: "this user wasnt found",
        });
        console.log("not seen");
      }

      bcrypt.compare(req.body.password, user.password, (err, isMatch) => {
        // if (err) throw err;
        if (isMatch) {
          // res.status(200).send("ok");

          bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(req.body.newPassWord, salt, (err, hash) => {
              if (err) throw error;
              else {
                let newPass = {
                  password: hash,
                };

                User.findByIdAndUpdate(
                  req.params.id,
                  newPass,
                  {
                    upsert: true,
                    new: true,
                  },
                  (err, result) => {
                    if (err) {
                      console.log(err);
                    } else {
                      res.json({
                        message: "Successfully updated",
                        //  authData
                        result: result,
                      });

                      let act = new activity({
                        activity: "USER - UPDATE PASSWORD",
                        userId: req.params.id,
                      });
                      act.save();
                    }
                  }
                );
              }
            });
          });
        } else {
          res.status(400).json({
            message: "wrong login details",
            devMessage: "passwords didnt match",
          });
          console.log("failed password didnt match");
          console.log(req.body);
        }
      });

      // console.log(req.body.password);
      // console.log(req.body.email);
    });
  }
});

router.post("/reset-pass/:id/:token", (req, res) => {
  // console.log(req.params.token)

  // i verify the token here
  jwt.verify(req.params.token, "my_secret", (err, authData) => {
    if (err) {
      console.log("errorror");
      res.json({
        message: "sorry, this link has expired",
      });
    } else {
      let newInfo = req.body;
      if (req.body.password == "") {
        res.json({
          message: "please send password",
          //  authData
        });
      } else {
        console.log(newInfo.password);
        bcrypt.genSalt(10, (err, salt) => {
          bcrypt.hash(newInfo.password, salt, (err, hash) => {
            if (err) throw error;
            else {
              newInfo.password = hash;
              User.findByIdAndUpdate(
                req.params.id,
                newInfo,
                {
                  upsert: true,
                  new: true,
                },
                (err, result) => {
                  if (err) {
                    console.log(err);
                  } else {
                    res.json({
                      message: "Successfully updated",
                      //  authData
                      result: result,
                    });

                    let act = new activity({
                      activity: "USER - RESET PASSWORD",
                      userId: req.params.id,
                    });
                    act.save();
                  }
                }
              );
              // console.log(newUser);
            }
          });
        });
        console.log("success", newInfo);
      }
    }
  });
});

function verifyToken(req, res, next) {
  //get auth bearer
  const bearerHeader = req.headers["authorization"];
  //check if bearer header is undefined
  if (typeof bearerHeader !== "undefined") {
    // split at space
    const bearer = bearerHeader.split(" ");
    // get token from array
    const bearerToken = bearer[1];
    //set token
    req.token = bearerToken;
    // call next middleware
    next();
  } else {
    res.send("invalid");
  }
}

module.exports = router;
