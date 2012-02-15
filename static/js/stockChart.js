(function($,undefined){
  if(!SNB){
    SNB={};
  }

  if(!SNB.Models){
    SNB.Models={};
  }

/*  SNB.Models.stockPoint=Backbone.Model.extend({
    initialize:function(){
      var datetime=this.get("time");
      this.set("timespan",Date.parse(datetime));
    }
  });*/

  SNB.stockChart=function(options){
    if(!options.container){
      return;//must have a container to render
    }
    var defaultOptions={
      width:570,
      height:360,
      leftGutter:40,
      topGutter:2,
      quote:{
        quoteHeight:206,
        quoteWidth:517,
        quoteBlanks:7
      },
      volume:{
        volumeWidth:517,
        volumeHeight:76,
        volumeBlanks:4
      }
      dataUrl:"http://api.xueqiu.com/stock/forchart/stocklist.json",
      chartType:{
        "1d":"rifenshitu",
        "5d":"5tian",
        "3m":"3yue",
        "6m":"6yue",
        "1y":"1nian",
        "3y":"3nian",
        "5y":"5nian",
        "10y":"10nian"
      },//1d 5d 1m
      stockType:"",//stock type --a-stock||hk-stock||$stock
      symbol:"",
      period:"",//chartType
      apiKey:"47bce5c74f",
      dayPointsCount_AStock:30*4-2//a-stock open time: 9:30AM-11:30AM 1:00PM-3:00PM  total 4hours,delete the same point 11:30AM and 1:00PM ,then 4*30-1.
      dayPointsCount_HKStock:30*5-2//hk-stock open time :9:30AM-12:00AM 1:30PM-4:00PM
      dayPointsCount_$Stock:30*6.5-1//$-stock open time: 9:30AM-4:00PM
    }

    this.options=options=$.extend(defaultOptions,options);
    this.canvas=new Raphael(options.container,options.width,options.height);

    var that=this;
    this.getData(function(data){
      that.render();
    })
  }

  SNB.stockChart.prototype={
    getData:function(callback){
      var options=this.options,
          that=this;
      $.getJSON(options.dataUrl+"?callback=?",{key:options.apiKey,symbol:options.symbol,period:options.chartType},function(ret){
        if(ret.message&&ret.message.code=="0"){
          var datas=ret.chartlist,
              dataObj=that.wrapData(datas);

          callback(dataObj);    
        }
      })
    },
    wrapData:function(dataList){
      var dataObj={},
          options=this.options;

      dataObj.dataList=dataList;
      dataObj.datas=_.pluck(dataList,"current");
      dataObj.times=_.pluck(dataList,"time");
      dataObj.volumes=_.pluck(dataList,"volume");
      dataObj.maxData=+Math.max.apply(Math,dataObj.datas);
      dataObj.minData=+Math.min.apply(Math,dataObj.datas);

      dataObj.maxColumn=+Math.max.apply(Math,dataObj.columns);
      dataObj.minColumn=+Math.min.apply(Math,dataObj.columns); 

      var dataGap=(dataObj.maxData-dataObj.minData),
          tempObj=convert(dataGap),
          baseNum=Math.ceil(tempObj.mantissa),
          exponent=tempObj.exponent;

      var tick;

      if(baseNum<4){
        tick=0.5;
      }else if(baseNum<8){
        tick=1;
      }else{
        tick=2;
      }

      tick=tick*Math.pow(10,exponent);

      var dataStart=Math.floor(minData/tick)*tick;
      var dataEnd=Math.ceil(maxData/tick)*tick;

      var xAxes=[],pCount;//range time ba


      if(options.period==="1d"){
        pCount=options["dayPointsCount_"+options.stockType];
        xGap=options.quote.quoteWidth/pCount;
        for(var i=0;i<pCount;i++){
          xAxes.push(options.leftGutter+i*xGap);
        }
      }else{
        //range the timeList
      }

      dataObj.quoteXAxes=xAxes;
      dataObj.quoteYAxes=this.range({start:dataStart,end:dataEnd},{start:options.topGutter,end:topGutter+quoteHeight})(dataObj.datas);
      return dataObj;
    },
    range:function(source,target){//reflect one range of nums to others
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
    },
    convert:function(decimal){
      var correctanswer=parsefloat(decimal);
      var correctexponent;
      var correctmantissa;
      correctexponent=math.floor(math.log(correctanswer)/math.ln10);
      correctmantissa=correctanswer/math.pow(10,correctexponent);

      return {mantissa:correctmantissa,exponent:correctexponent};
    },
    render:function(dataObj){
      
    },
    drawOutRect:function(){
      var options=this.options,
          r=this.canvas;

      r.path("M40 2L557 2 557 208 40 208Z").attr({"stroke":"#000","stroke-width":"0.5px"});
      r.path("M40 215L557 215 557 291 40 291Z").attr({"stroke":"#000","stroke-width":"0.5px"});
    },
    generatePath:function(dataX,dataY){
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
    },
    drawYLab:function(){
      var yTick=topHeiht/7;
      for(var i=0;i<dataRowCount;i++){
        var dataLine=(dataStart+i*dataTick).toFixed(2);

        var labY=(topgutter+topHeiht-1)-yTick*i;

        r.text(leftgutter-20,labY,dataLine).attr({font: '12px Helvetica, Arial', fill: "#666",color:"#666"});
        if(i){
          r.path(["M",leftgutter,labY,"L",leftgutter+517,labY]).attr({"stroke-dasharray":".",stroke:"#e3e3e3"});
        }
      }
    },
    drawQuoteLine:function(path){
      stockLine=r.path(path.stockPath).attr({stroke:"#4572A7","stroke-width":"2"});
      bgLine=r.path(path.bgPath).attr({stroke: "none", fill: "#f4f4ff",opacity:".7"});
    },
    addEvent:function(){
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
    },
    addPoint:function(){
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
  }
}($))