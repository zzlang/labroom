module.exports=function(app){
  var io=require("socket.io").listen(app),
      snowball=require("./../lib/snowball.js");

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
  app.get("/stock/forchart/stocklist.json",function(req,res,next){
    var xqRequest=snowball(req.headers.cookie,"api.xueqiu.com"),
        callback=req.query.callback,
        period=req.query.period;

    if(period==="10d"){
      req.query.period="1m";
    }

    delete req.query.callback;
    xqRequest.Request("http://api.xueqiu.com/stock/forchart/stocklist.json",req.query,function(error,data){
      if(error){
        console.log(error);
        return;
      }
      if(period==="10d"||period==="1m"){
        try{
          var obj=JSON.parse(data),
              ret=[],
              num=period==="10d"?20:10,
              list=period==="10d"?obj.chartlist.slice(-10):obj.chartlist,
              loop=period==="10d"?10:list.length;

          for(var i=0;i<loop;i++){
            ret=ret.concat(generateExtraQuote(list[i],num-1));
          }    
          console.log(data);
          obj.chartlist=ret;
          res.send(callback+"("+JSON.stringify(obj)+")");


          function generateExtraQuote(base,num){
            var tempArray=[base],
                time=base.time,
                current=base.current,
                volume=base.volume;

            for(var i=0;i<num;i++){
              var obj={time:time};
                  random=parseFloat(Math.random().toFixed(2)),
                  flag=0;

              if(random>0.5){
                flag=1;
              }else{
                flag=-1;
              }
              if(current==0){
                current="139";
                volume="11000";
              }

              obj.current=(parseFloat(current)+random*flag).toFixed(2);
              obj.volume=(parseFloat(volume)+volume*random*flag).toFixed(2);
              tempArray.push(obj);
            }
            return tempArray;
          }
        }
        catch(e){
          console.log(e.stock||e.message);
        }
      
      }else{
        if(period==="30d"){
          try{
            var obj=JSON.parse(data);
            var list=obj.chartlist;

            for(var i=0,len=list.length;i<len;i++){
              var data=list[i];
              if(data.volume==0){
                var volume="11000";
                var current=data.current;
                var random=Math.random(),flag=0;
                if(random>0.5){
                  flag=1;
                }else{
                  flag=-1;
                }
                data.current=(parseFloat(current)+random*flag).toFixed(2);
                data.volume=(parseFloat(volume)+volume*random*flag).toFixed(2);
              }
            }    
            res.send(callback+"("+JSON.stringify(obj)+")");
          }
          catch(e){
            console.log(e.stock||e.message);
          }
        }
        res.send(callback+"("+data+")");
      }
    })
  })
}
