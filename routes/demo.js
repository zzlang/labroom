var fs=require("fs"),
    path=require("path");

module.exports=function(app){
	app.get("/demo/:id",function(req,res,next){
    var fileName=req.params.id+".html"; 
    fs.readFile(path.resolve(__dirname,"../demo")+"/"+fileName,function(error,data){
      if(error){
        console.log(error);
        res.send(500);
      }else{
        res.write(data);
      }
    })
  })
}