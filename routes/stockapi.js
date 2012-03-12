module.exports=function(app){
  var io=require("socket.io").listen(app);
  io.sockets.on("connection",function(socket){
    socket.emit('news',{hello:'world'});
    socket.on('my other event',function(data){
      console.log(data);
    })
  })

  app.get("/stockapi",function(req,res,next){
    app.set("view engine","jade");
    res.render("index",{layout:false}); 
  })
  app.post("/toPng",function(req,res,next){
    //res.writeHead(200, {'Content-Type': 'image/png'});
    var svgStr=req.body.html;
    console.log(svgStr);
    var convert=require('child_process').spawn("convert",["svg:","png:-"]);
    var chunk="";
    convert.stdout.on('data',function(data){
      chunk+=data;
    })
    convert.stdout.on('end',function(data){
      res.send(chunk);
      var fs=require("fs");
      fs.writeFile("./test.png",chunk,function(err){
        if(err) throw err;
        console.log("saved");
      })
    })
    convert.stdin.write(svgStr);
    convert.stdin.end();
  })
}
