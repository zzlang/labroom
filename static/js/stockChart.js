var SNB={};
(function($,undefined){
  window.SNB=SNB||{};
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
        quoteBlanks:7,
        pathAttr:{"stroke":"#000","stroke-width":"0.5px"}
      },
      volume:{
        volumeWidth:517,
        volumeHeight:76,
        volumeBlanks:4,
        pathAttr:{"stroke":"#000","stroke-width":"0.5px"}
      },
      quote_volume_space:10,//the space of quote and volume rect.
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
      stockType:"$Stock",//stock type --a-stock||hk-stock||$stock
      symbol:"GOOG",
      period:"1d",//chartType
      apiKey:"47bce5c74f",
      dayPointsCount_AStock:30*4-2,//a-stock open time: 9:30AM-11:30AM 1:00PM-3:00PM  total 4hours,delete the same point 11:30AM and 1:00PM ,then 4*30-1.
      dayPointsCount_HKStock:30*5-2,//hk-stock open time :9:30AM-12:00AM 1:30PM-4:00PM
      dayPointsCount_$Stock:30*6.5//$-stock open time: 9:30AM-4:00PM
    }

    this.options=options=$.extend(defaultOptions,options);
    this.canvas=new Raphael(options.container,options.width,options.height);

    var that=this;
    this.getData(function(data){
      that.render(data);
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
          options=this.options,
          lg=options.leftGutter,
          tg=options.topGutter,
          qw=options.quote.quoteWidth,
          qh=options.quote.quoteHeight,
          vw=options.volume.volumeWidth,
          vh=options.volume.volumeHeight,
          that=this;

      dataObj.dataList=dataList;

      var xAxes=[],pCount;//range time ba

      if(options.period==="1d"){
        pCount=dataObj.pCount=options["dayPointsCount_"+options.stockType];
        var xGap=qw/pCount;
        for(var i=0;i<pCount;i++){
          xAxes.push(lg+i*xGap);
        }
      }else{
        //range the timeList
      }

      xAxes.push(lg+qw);


      function reflectData(dataType,start,end){//dataType--current||volume
        var datas=_.pluck(dataList,dataType),
            maxData=+Math.max.apply(Math,datas),
            minData=+Math.min.apply(Math,datas),
            dataGap=maxData-minData,
            tempObj=that.convert(dataGap),
            baseNum=Math.ceil(tempObj.mantissa),
            exponent=tempObj.exponent;
            
        var tick=getTick(baseNum)*Math.pow(10,exponent),    
            dataStart=Math.floor(minData/tick)*tick,
            dataEnd=Math.ceil(maxData/tick)*tick+tick;

        var yLabels=[dataStart],
            tempStart=dataStart,
            isQuote;  

        while(tempStart<dataEnd){
          tempStart+=tick;
          yLabels.push(tempStart);

        }
        var yLabelTick,yStartYAxis;
        
        if(dataType=="current"){
          yLabelTick=qh/(yLabels.length-1);
          yStartYAxis=tg+qh;
          isQuote=true;
        }else{
          yLabelTick=vh/(yLabels.length-1);
          yStartYAxis=tg+qh+options.quote_volume_space+vh;
        }
        yLabelObjs=[];
        for(var i=0,ii=yLabels.length;i<ii;i++){
          var text;
          if(dataType=="volume"){
            var unit,last,newLabel=that.convert(yLabels[i]),exponent=newLabel.exponent;
            if(exponent>=9){
              unit="B";
              last=exponent-9;
            }else if(exponent>=6){
              unit="M";
              last=exponent-6;
            }else if(exponent>=3){
              unit="K";
              last=exponent-3;
            }else{
              unit=""
              last=0;
            }
            text=newLabel.mantissa*Math.pow(10,last)+unit;
          }else{
            text=yLabels[i];
          }
          yLabelObjs.push({yAxis:yStartYAxis-i*yLabelTick,text:text});
        }    

        var yAxes=that.range({start:dataStart,end:dataEnd},{start:start,end:end},isQuote)(datas);
        return {xAxes:xAxes,yAxes:yAxes,yLabels:yLabelObjs,datas:datas};
      }    

      dataObj.times=_.pluck(dataList,"time");
      function getTick(baseNum){
        if(baseNum<4){
          tick=0.5;
        }else if(baseNum<8){
          tick=1;
        }else{
          tick=2;
        }
        return tick;
      }    

      dataObj.quote=reflectData("current",tg,tg+qh);
      dataObj.volume=reflectData("volume",0,vh);
      return dataObj;
    },
    range:function(source,target,isQuote){//reflect one range of nums to others
      var sStart=source.start||0,
          sEnd=source.end||100,
          tStart=target.start||0,
          tEnd=target.end||1000,
          options=this.options;

      var newArray=[],
          total;
      
      if(isQuote){
        total=options.topGutter+options.quote.quoteHeight+1;
      }else{
        total=options.topGutter+options.quote.quoteHeight+options.quote_volume_space+options.volume.volumeHeight;
      }   

      return function(array){

        if(Object.prototype.toString.call(array)==="[object Array]"){
 
          for(var i=0,ii=array.length;i<ii;i++){
            newArray[i]=total-((array[i]-sStart)*(tEnd-tStart)/(sEnd-sStart)+tStart);
          }
          return newArray;
        }else{
          return total-((array-sStart)*(tEnd-tStart)/(sEnd-sStart)+tStart);
        }
      }   
    },
    convert:function(decimal){
      if(decimal==0){
        return {mantissa:0,exponent:0};
      }
      var CorrectAnswer=parseFloat(decimal);
      var CorrectExponent;
      var CorrectMantissa;
      CorrectExponent=Math.floor(Math.log(CorrectAnswer)/Math.LN10);
      CorrectMantissa=CorrectAnswer/Math.pow(10,CorrectExponent);
      return {mantissa:CorrectMantissa,exponent:CorrectExponent};
    },
    render:function(dataObj){
      var r=this.canvas;
      this.drawOutRect();
      this.drawYLab(dataObj.quote.yLabels);
      this.drawYLab(dataObj.volume.yLabels);
      var path=this.generateQuotePath(dataObj.quote.xAxes,dataObj.quote.yAxes);
      this.drawQuoteLine(path);
      this.drawVolumeLine(dataObj);
      this.addEvent(dataObj);
    },
    drawVolumeLine:function(dataObj){
      var xAxes=dataObj.volume.xAxes,
          yAxes=dataObj.volume.yAxes,
          datas=dataObj.volume.data,
          options=this.options,
          quote=this.options.quote,
          volume=this.options.volume,
          endYAxis=options.topGutter+quote.quoteHeight+options.quote_volume_space+volume.volumeHeight,
          path=[];

      for(var i=0,ii=xAxes.length;i<ii;i++){
        var xAxis=xAxes[i],
            yAxis=yAxes[i];

        path=path.concat(["M",xAxis,yAxis,"L",xAxis,endYAxis]);
      }    
      this.canvas.path(path);
    },
    drawOutRect:function(){
      var options=this.options,
          r=this.canvas,
          lg=options.leftGutter,
          tg=options.topGutter,
          qw=options.quote.quoteWidth,
          qh=options.quote.quoteHeight,
          vw=options.volume.volumeWidth,
          vh=options.volume.volumeHeight,
          qAttr=options.quote.pathAttr,
          vAttr=options.volume.pathAttr,
          qm=options.quote_volume_space,
          volumeYAxis=tg+qh+qm;
          quoteRectPath=["M",lg,tg,"L",lg+qw,tg,lg+qw,tg+qh,lg,tg+qh,"Z"],
          volumeRectPath=["M",lg,volumeYAxis,"L",lg+vw,,volumeYAxis,lg+vw,volumeYAxis+vh,lg,volumeYAxis+vh,"Z"];
              
      r.path(quoteRectPath).attr(qAttr);
      r.path(volumeRectPath).attr(vAttr);
    },
    generateQuotePath:function(dataX,dataY){
      var path={},
          stockPath=["M"],
          bgPath=["M"],
          options=this.options,
          tg=options.topGutter,
          lg=options.leftGutter,
          qh=options.quote.quoteHeight;

      for(var i=0,ii=dataX.length;i<ii;i++){
        if(i){
          stockPath=stockPath.concat([dataX[i],dataY[i]]);
          bgPath=bgPath.concat([dataX[i],dataY[i]]);
          if(i==dataY.length-1){
            bgPath=bgPath.concat([dataX[i],tg+qh,lg,tg+qh,"Z"])
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
    drawYLab:function(ylabs){
      var options=this.options,
          r=this.canvas;
      for(var i=0,ii=ylabs.length;i<ii-1;i++){
        var labY=ylabs[i],text;
        if(typeof labY.text=="number"){
          text=labY.text.toFixed(2);
        }else{
          text=labY.text;
        }
        r.text(options.leftGutter-22,labY.yAxis,text).attr({font: '12px Helvetica, Arial', fill: "#666",color:"#666"});
        if(i){
          r.path(["M",options.leftGutter,labY.yAxis,"L",options.leftGutter+options.quote.quoteWidth,labY.yAxis]).attr({"stroke-dasharray":".",stroke:"#e3e3e3"});
        }
      }
    },
    drawQuoteLine:function(path){
      var r=this.canvas;
      stockLine=r.path(path.stockPath).attr({stroke:"#4572A7","stroke-width":"2"});
      bgLine=r.path(path.bgPath).attr({stroke: "none", fill: "#f4f4ff",opacity:".7"});
    },
    drawTimeLine:function(){
      
    },
    addEvent:function(dataObj){
      var r=this.canvas,
          options=this.options,
          quote=options.quote,
          pCount=dataObj.pCount,
          tg=options.topGutter,
          qvs=options.quote_volume_space,
          vh=options.volume.volumeHeight,
          qh=quote.quoteHeight;
        //draw rect to emit event
      for(var i=0;i<pCount;i++){
        var orignX=dataObj.quote.xAxes[i],
            orignY=dataObj.quote.yAxes[i],
            vx=dataObj.volume.xAxes[i],
            vy=dataObj.volume.yAxes[i],
            data=dataObj.dataList[i],

            rectWidth=quote.quoteWidth/pCount,
            x=orignX-rectWidth/2,
            rect=r.rect(x,tg,rectWidth,qh+qvs+vh).attr({"stroke":"none",fill:"#fff",opacity:0});

        var tempLine,
            tempCircle,
            tempRect,
            tempText,
            tempVRect,
            tempVText;

        (function(orignX,orignY,vx,vy,data){
          rect.hover(function(){
            tempLine=r.path(["M",orignX,tg,"L",orignX,qh+qvs+vh]).attr({"stroke":"#c0c0c0"});
            tempCircle=r.circle(orignX,orignY,"3").attr({"stroke-width":"1",stroke:"#fff",fill:"#4572A7"});
            var tipWidth=50,
                tipHeight=20,
                rectX,
                rectY;

            if(options.quote.quoteWidth+options.leftGutter-orignX<tipWidth+2){
              rectX=orignX-5-tipWidth;
            }else{
              rectX=orignX+5;
            } 
            rectY=orignY-5;

            tempRect=r.rect(rectX,rectY,50,20,3).attr({"stroke-width":"1",stroke:"#4572A7"});
            tempVRect=r.rect(rectX,vy-5,50,20,3).attr({"stroke-width":"1",stroke:"#4572A7"});
            tempText=r.text(rectX+20,rectY+7,data.current).attr({font: '10px Helvetica, Arial', fill: "#666",color:"#666"});
            tempVText=r.text(rectX+20,vy+7,data.volume).attr({font: '10px Helvetica, Arial', fill: "#666",color:"#666"});
          },function(){
            if(tempLine){
              tempLine.remove();
              tempCircle.remove();
              tempRect.remove();
              tempText.remove();
              tempVText.remove();
              tempVRect.remove();
            }
          })

        })(orignX,orignY,vx,vy,data)
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