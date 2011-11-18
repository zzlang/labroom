var express=require("express");
var app=express.createServer();

//test();
app.use(express.static(__dirname+"/static"));

app.get("/",function(req,res,next){
  res.render("mobile.jade",{layout:false});
});
app.listen(4444);
