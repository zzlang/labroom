var fs=require("fs"),
    path=require("path");

module.exports=function(app){
	app.get("/demo/:id",function(req,res,next){
    var fileName=req.params.id+".html"; 
    fs.createReadStream(path.resolve(__dirname,"../demo")+"/"+fileName, {
      'flags': 'r',
      'encoding': 'binary',
      'mode': 0666,
      'bufferSize': 4 * 1024
    }).addListener("data", function(data) {
      res.write(data, "binary");
    }).addListener("end", function() {
      res.end();
    })
  })
}