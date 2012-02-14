$(function(){
  var width=570,
      height=306,
      leftgutter=40,
      topgutter=2,
      topHeiht=206,
      title="NTES",
      pCount=50,
      chartWidth=517,
      timeCount=100;

  var r=new Raphael("stock",width,height); 
  function generateData(currentBase,timeBase,columnBase,num){
    var dataList=[];
    for(var i=0;i<num;i++){
      var current=parseFloat((currentBase+parseFloat(Math.random()*2)).toFixed(2));
      var column=parseFloat((columnBase+parseFloat(Math.random()*1000)).toFixed(2));
      dataList.push({current:current,time:timeBase+i*1000,column:column});
    }
    return dataList;
  }

  function range(source,target){
    var sStart=source.start||0,
        sEnd=source.end||100,
        tStart=target.start||0,
        tEnd=target.end||1000;

    return function(array){
      if(Object.prototype.toString.call(array)==="[object Array]"){
        var newArray=[];
        for(var i=0,ii=array.length;i<ii;i++){
          newArray[i]=(array[i]-sStart)*(tEnd-tStart)/(sEnd-sStart)+tStart;
        }
        return newArray;
      }else{
        return (array-sStart)*(tEnd-tStart)/(sEnd-sStart)+tStart; 
      }
    }    
  }

  var dataList=generateData(40,Date.now(),2000,pCount);
  var datas=_.pluck(dataList,"current");
  var times=_.pluck(dataList,"time");
  var columns=_.pluck(dataList,"column");
  var maxData=Math.max.apply(Math,datas);
  var minData=Math.min.apply(Math,datas);

  var maxTime=Math.max.apply(Math,times);
  var minTime=Math.min.apply(Math,times);

  var maxColumn=Math.max.apply(Math,columns);
  var minColumn=Math.min.apply(Math,columns);

  var dataRowCount=7,
      dataBase=5;

  var dataTick=(maxData-minData)/5;
  
  var dataStart=minData-dataTick;
  var dataEnd=maxData+dataTick;   
  
  var dataY= range({start:dataStart,end:dataEnd},{start:topgutter,end:topgutter+topHeiht})(datas);
  var dataX=[],
      xLength=518/timeCount;
  for(var i=0;i<pCount;i++){
    dataX.push(41+i*xLength);
  }



  //rect
  function drawOutRect(){
    r.path("M40 2L557 2 557 208 40 208Z").attr({"stroke":"#000","stroke-width":"0.5px"});
    r.path("M40 215L557 215 557 291 40 291Z").attr({"stroke":"#000","stroke-width":"0.5px"});
  }
  drawOutRect();

  var isAmendY=false;
  //quote line

  function generatePath(dataX,dataY){
    var path={};
    var stockPath=["M"],
    bgPath=["M"],
    rects=[];
    for(var i=0,ii=dataX.length;i<ii;i++){
      if(!isAmendY){
        dataY[i]=topHeiht+topgutter+1-dataY[i];
        isAmendY=true;
      }
      if(i){
        stockPath=stockPath.concat([dataX[i],dataY[i]]);
        bgPath=bgPath.concat([dataX[i],dataY[i]]);
        if(i==dataY.length-1){
          bgPath=bgPath.concat([dataX[i],"208","40","208","Z"])
        }

      }else{
        stockPath=stockPath.concat([dataX[i],dataY[i]]);
        stockPath.push("L");
        bgPath=bgPath.concat([dataX[i],dataY[i]]);
        bgPath.push("L");
      }
    }
    path.stockPath=stockPath;
    path.bgPath=bgPath;
    return path;
  }



        //y-lab
  var yTick=topHeiht/7;
  for(var i=0;i<dataRowCount;i++){
    var dataLine=(dataStart+i*dataTick).toFixed(2);

    var labY=(topgutter+topHeiht-1)-yTick*i;

    r.text(leftgutter-20,labY,dataLine).attr({font: '12px Helvetica, Arial', fill: "#666",color:"#666"});
    if(i){
      r.path(["M",leftgutter,labY,"L",leftgutter+517,labY]).attr({"stroke-dasharray":".",stroke:"#e3e3e3"});
    }
  }

  //draw the quote line and background line
  var path=generatePath(dataX,dataY);

  drawQuoteLine(path);



  //draw rect to emit event
  for(var i=0;i<pCount;i++){
    var orignX=dataX[i];
    var orignY=dataY[i];
    var data=dataList[i];

    hoverEvent(orignX,orignY,data,r);
  }
  function hoverEvent(orignX,orignY,data,r){
    var rectWidth=517/timeCount;
    var x=orignX-rectWidth/2;
    var rect=r.rect(x,topgutter,rectWidth,topHeiht).attr({"stroke":"none",fill:"#fff",opacity:0});
    rect.toFront();
    var tempLine,
        tempCircle,
        tempRect,
        tempText;

    (function(orignX,orignY,data){
      rect.hover(function(){
        tempLine=r.path(["M",orignX,topgutter,"L",orignX,topHeiht]).attr({"stroke":"#c0c0c0"});
        tempCircle=r.circle(orignX,orignY,"3").attr({"stroke-width":"1",stroke:"#fff",fill:"#4572A7"});
        var tipWidth=50,
            tipHeight=20,
            rectX,
            rectY;

        if(chartWidth+leftgutter-orignX<tipWidth+2){
          rectX=orignX-5-tipWidth;
        }else{
          rectX=orignX+5;
        } 
        rectY=orignY-5;
        tempRect=r.rect(rectX,rectY,50,20,3).attr({"stroke-width":"1",stroke:"#4572A7"});
        tempText=r.text(rectX+14,rectY+7,data.current).attr({font: '10px Helvetica, Arial', fill: "#666",color:"#666"});
      },function(){
        if(tempLine){
          tempLine.remove();
          tempCircle.remove();
          tempRect.remove();
          tempText.remove();
        }
      })

    })(orignX,orignY,data)
  }

  var stockLine,
      bgLine;
  function drawQuoteLine(path){
    stockLine=r.path(path.stockPath).attr({stroke:"#4572A7","stroke-width":"2"});
    bgLine=r.path(path.bgPath).attr({stroke: "none", fill: "#f4f4ff",opacity:".7"});
  }

  function addPoint(){
    var newPoint=generateData(40,Date.now(),2000,1)[0];
    dataY.push(range({start:dataStart,end:dataEnd},{start:topgutter,end:topgutter+topHeiht})(newPoint.current));
    dataX.push(41+dataX.length*xLength);
    path=generatePath(dataX,dataY);

    var tempShineCircle=r.circle(dataX[dataX.length-1],dataY[dataY.length-1],"2").attr({"stroke":"#4572A7","fill":"#4572A7"}).toFront();
    var anim=stockLine.animate({path:path.stockPath},1000,function(){
      tempShineCircle.remove();
      bgLine.animate({path:path.bgPath},0);
    });
    hoverEvent(dataX[dataX.length-1],dataY[dataY.length-1],newPoint,r);
  }

  setInterval(addPoint,5000);

  function drawTimeLine(){
    

  }


  //tip on quote line



  //r.path("M90 90L200 200").attr("stroke-dasharray","--..");   
})