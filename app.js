var express=require("express");
var app=express.createServer();


//test();
app.use("/static",express.static(__dirname+"/static"));
app.set('views', __dirname + '/views');
app.register(".html", require("stache"));

app.get("/",function(req,res,next){
  app.set("view engine",'jade');
  res.render("mobile.jade",{layout:false});
});
app.get("/video",function(req,res,next){
  app.set("view engine",'mustache');
  res.render("video.html",{layout:false});
})
app.get("/test",function(req,res,next){
  res.redirect("http://www.baidu.com");
  console.log("redirect to baidu");
})
require("./routes/demo.js")(app);
require("./routes/stockapi.js")(app);
app.listen(4444);
console.log("Listen on http://127.0.0.1:4444");
