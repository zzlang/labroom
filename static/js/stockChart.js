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
      quote_volume_space:0,//the space of quote and volume rect.
      dataUrl:"/stock/forchart/stocklist.json",
      chartType:{
        "1d":"rifenshitu",
        "5d":"5tian",
        "10d":"10tian",
        "3m":"3yue",
        "6m":"6yue",
        "1y":"1nian",
        "3y":"3nian",
        "5y":"5nian",
        "10y":"10nian"
      },//1d 5d 1m
      stockType:"$Stock",//stock type --a-stock||hk-stock||$stock
      symbol:"BIDU",
      period:"5d",//chartType
      periodIndex:1,//period indexOf periodSeries
      initDays:3,
      apiKey:"47bce5c74f",
      dayPointsCount_AStock:30*4,//a-stock open time: 9:30AM-11:30AM 1:00PM-3:00PM  total 4hours,delete the same point 11:30AM and 1:00PM ,then 4*30-1.
      dayPointsCount_HKStock:30*5.5,//hk-stock open time :9:30AM-12:00AM 1:00PM-4:00PM
      dayPointsCount_$Stock:30*6.5,//$-stock open time: 9:30AM-4:00PM
      pointsCount_5d_AStock:125,
      pointsCount_5d_HKStock:175,
      pointsCount_5d_$Stock:200,
      zoomRatio:0.05,//缩放比例，固定宽度，占图总宽的百分比
      periodToTime:{
        "5d":"date",
        "10d":"date",
        "1m":"date",
        "3m":"month",
        "6m":"month",
        "1y":"month",
        "3y":"year",
        "5y":"year",
        "10y":"year"
      },
      periodSeries:["1d","5d","10d","1m","3m","6m","1y","3y","5y","10y"]
    }
    this.options=options=$.extend(defaultOptions,options);
    this.canvas=new Raphael(options.container,options.width,options.height);
    // if(window.location.hash){
    //   this.options.symbol=window.location.hash.substr(1);
    // }
    this.options.stockType=this.getStockType(this.options.symbol).stockType;
    this.periodIndex=this.options.periodIndex;
    this.periodSeries=this.options.periodSeries;
    this.period=this.options.period;
    this.isLoading=true;
    this.transformPoint={
      "1d":{
        pre:"",
        next:"5d",
        toNext:200,
        toPre:"",
        ratioNext:1/5,
        ratioPre:""

      },
      "5d":{
        pre:"1d",
        next:"10d",
        toNext:200,
        toPre:40,
        ratioNext:5/10,
        ratioPre:5/1
      },
      "10d":{
        pre:"5d",
        next:"1m",
        toNext:200,
        toPre:100,
        ratioNext:10/23,
        ratioPre:10/5
      },
      "1m":{
        pre:"10d",
        next:"6m",
        toNext:200,
        toPre:100,
        ratioNext:1/6,
        ratioPre:23/10
      },
      "6m":{
        pre:"1m",
        next:"10y",
        toNext:123,
        toPre:21,
        ratioNext:1/20,
        ratioPre:6/1
      },
      "10y":{
        pre:"6m",
        next:"",
        toNext:"",
        toPre:23,
        ratioNext:"",
        ratioPre:20/1
      }
    }
    this.originDatas={};
    var that=this;
    this.getData(function(data){
      that.render(data);
    })
  }

  SNB.stockChart.prototype={
    getData:function(callback){
      var options=this.options,
          that=this;

      if(that.originDatas[that.period]){
        handler(that.originDatas[that.period]);
      }else{
        that.isLoading=true;
        $.getJSON(options.dataUrl+"?callback=?",{key:options.apiKey,symbol:options.symbol,period:that.period},function(ret){
          if(ret.message&&ret.message.code=="0"){
            that.isLoading=false;
            handler(ret.chartlist);
          }
        })
      }

      function handler(datas){//处理接下来需要渲染的数据
        var renderData,
            wrapCount;

        var point=that.transformPoint[that.period];
        if(that.trend){
          if(that.trend==="next"){
            renderData=datas.slice(1/point.ratioPre*datas.length*-1);
          }else{
            renderData=datas
          }
          that.spliceNum=datas.length-renderData.length;
        }else{
          wrapCount=options["pointsCount_5d_"+options.stockType];
          renderData=datas.slice(options.initDays/5*(-1)*datas.length);
          that.spliceNum=wrapCount-renderData.length;
        }

        var dataObj=that.wrapData(renderData,true);
            
        that.originDatas[that.period]=datas;
        callback(dataObj);   
      }

    },
    wrapData:function(dataList,isSlice){
      var dataObj={},
          options=this.options,
          lg=options.leftGutter,
          tg=options.topGutter,
          qw=options.quote.quoteWidth,
          qh=options.quote.quoteHeight,
          vw=options.volume.volumeWidth,
          vh=options.volume.volumeHeight,
          that=this;



      var xAxes=[],pCount;//range time ba
      if(options.period==="5d"){
        if(isSlice){
          pCount=dataObj.pCount=dataList.length;
        }else{
          pCount=dataObj.pCount=options["pointsCount_5d_"+options.stockType];
        }
      }else{
        pCount=dataObj.pCount=options.period==="1d"?options["dayPointsCount_"+options.stockType]:(dataList.length-1);
      }

      var xGap=qw/pCount;
      for(var i=0;i<pCount;i++){
        xAxes.push(lg+i*xGap);
      }

      xAxes.push(lg+qw);

      function processData(dataList){// remove the repeating point
        var stockType=options.stockType;
        if(stockType!=="$Stock"&&options.period==="1d"){
          var deleteTime=stockType==="AStock"?"11:30:00":"12:00:00",
              newDataList=[];

          return _.reject(dataList,function(data){
            return data.time.indexOf(deleteTime)>-1;
          })    
        }else{
          $.map(dataList,function(data){
            var tempArray=data.time.split(" ");
            switch(options.periodToTime[options.period]){
              case "date":
                data.date=new Date(data.time).getDate();
                data.dateStr=tempArray[1]+" "+tempArray[2];
                break;
              case "month":
                data.month=new Date(data.time).getMonth()+1;
                data.monthStr=tempArray[1]+" "+tempArray[2];
                break;
              case "year":
                data.year=new Date(data.time).getFullYear();
                break;    
            }
            return data;
          })
          return dataList;
        }
      }

      dataList=processData(dataList);
      dataObj.dataList=dataList;


      function reflectData(dataType,start,end){//dataType--current||volume
        var datas=_.pluck(dataList,dataType),
            delete0datas=_.reject(datas,function(data){
              return data==0;
            }),
            maxData=+Math.max.apply(Math,delete0datas),
            minData=+Math.min.apply(Math,delete0datas),
            dataGap=maxData-minData,
            tempObj=that.convert(dataGap),
            baseNum=Math.ceil(tempObj.mantissa),
            exponent=tempObj.exponent;

        if(baseNum===10){
          baseNum=1;
          exponent++;
        }    
            
        var tick=getTick(baseNum,dataType)*Math.pow(10,exponent),    
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
      function getTick(baseNum,dataType){
        if(dataType=="current"){
          if(baseNum<4){
            tick=0.5;
          }else if(baseNum<8){
            tick=1;
          }else{
            tick=2;
          } 
        }else{
          if(baseNum<3){
            tick=0.5;
          }else if(baseNum<5){
            tick=1;
          }else{
            tick=2;
          }
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
      this.drawTimeLine(dataObj);
      var path=this.generateQuotePath(dataObj.quote.xAxes,dataObj.quote.yAxes,dataObj);
      this.drawQuoteLine(path);
      this.drawVolumeLine(dataObj);
      this.addEvent(dataObj);
      this.mousewheel(dataObj);
    },
    drawVolumeLine:function(dataObj){
      var xAxes=dataObj.volume.xAxes,
          yAxes=dataObj.volume.yAxes,
          datas=dataObj.volume.data,
          options=this.options,
          quote=this.options.quote,
          volume=this.options.volume,
          endYAxis=options.topGutter+quote.quoteHeight+volume.volumeHeight,
          path=[];

      for(var i=0,ii=xAxes.length;i<ii;i++){
        var xAxis=xAxes[i],
            yAxis=yAxes[i];

        path=path.concat(["M",xAxis,yAxis,"L",xAxis,endYAxis]);
      }    
      this.volumeLine=this.canvas.path(path);
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
          volumeYAxis=tg+qh;
          quoteRectPath=["M",lg,tg,"L",lg+qw,tg,lg+qw,tg+qh,lg,tg+qh,"Z"],
          volumeRectPath=["M",lg,volumeYAxis,"L",lg+vw,,volumeYAxis,lg+vw,volumeYAxis+vh,lg,volumeYAxis+vh,"Z"];
              
      r.path(quoteRectPath).attr(qAttr);
      r.path(volumeRectPath).attr(vAttr);
    },
    generateQuotePath:function(dataX,dataY,dataObj){
      var path={},
          stockPath=["M"],
          bgPath=["M"],
          options=this.options,
          tg=options.topGutter,
          lg=options.leftGutter,
          qh=options.quote.quoteHeight,
          datas=dataObj.quote.datas;

      for(var i=0,ii=dataY.length;i<ii;i++){
        if(datas[i]==0){
          continue;
        }
        if(i){
          stockPath=stockPath.concat([dataX[i],dataY[i]]);
          bgPath=bgPath.concat([dataX[i],dataY[i]]);
          if(i==dataY.length-1){
            bgPath=bgPath.concat([dataX[i],tg+qh,stockPath[1],tg+qh,"Z"])
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
          r=this.canvas,
          quoteYLabTextSet=r.set(),
          quoteYLabLineSet=r.set();
      for(var i=0,ii=ylabs.length;i<ii-1;i++){
        var labY=ylabs[i],text;
        if(typeof labY.text=="number"){
          text=labY.text.toFixed(2);
        }else{
          text=labY.text;
        }
        var text=r.text(options.leftGutter-22,labY.yAxis,text).attr({font: '12px Helvetica, Arial', fill: "#666",color:"#666"});
        quoteYLabTextSet.push(text);
        if(i){
          var path=r.path(["M",options.leftGutter,labY.yAxis,"L",options.leftGutter+options.quote.quoteWidth,labY.yAxis]).attr({"stroke-dasharray":".",stroke:"#e3e3e3"});
          quoteYLabLineSet.push(path);
        }
      }
      this.quoteYLabTextSet=quoteYLabTextSet;
      this.quoteYLabLineSet=quoteYLabLineSet;
    },
    drawQuoteLine:function(path){
      var r=this.canvas;
      stockLine=r.path(path.stockPath).attr({stroke:"#4572A7","stroke-width":"2"});
      bgLine=r.path(path.bgPath).attr({stroke: "none", fill: "#f4f4ff",opacity:".7"});
      this.quoteLine=stockLine;
      this.bgLine=bgLine;
    },
    drawTimeLine:function(dataObj){
      var options=this.options,
          r=this.canvas,
          begeinX=options.leftGutter,
          begeinY=options.topGutter+options.quote.quoteHeight+options.quote_volume_space+options.volume.volumeHeight+10,

          times=dataObj.times,
          timeBlockCount,
          width=options.quote.quoteWidth,
          timeTable,
          timeTextSet=timeLineSet=r.set();

      if(options.period==="1d"){
        var time=times[0];
        if(time){
          time=time.split(" ");
          time=time[2]+" "+time[1];
        }

        r.text(begeinX,begeinY,time).attr({font: '12px Helvetica, Arial', fill: "#666",color:"#666"});


        if(options.stockType==="AStock"){
          timeBlockCount=8;
          timeTable=["","10:00","","11:00","13:00","","14:00","","15:00"];
          
        }else if(options.stockType==="HKStock"){
          timeBlockCount=10;
          timeTable=["","","","11:00","","12:00","14:00","","15:00","","16:00"];
          
        }else if(options.stockType==="$Stock"){
          timeBlockCount=13;
          timeTable=["","10:00","","11:00","","12:00","","13:00","","14:00","","15:00","","16:00"];
        }
        var timeTick=width/timeBlockCount;

        for(var i=0,ii=timeTable.length;i<ii;i++){
          var text=timeTable[i];
          if(text){
            var x=begeinX+timeTick*i;
            var text=r.text(x,begeinY,text).attr({font: '12px Helvetica, Arial', fill: "#666",color:"#666"});
            timeTextSet.push(text);
            var y=begeinY-10;
            var path=r.path(["M",x,y,"L",x,options.topGutter]).attr({"stroke-dasharray":".",stroke:"#e3e3e3"});
            timeLineSet.push(path);
          }
        }    
        this.timeLineSet=timeLineSet;
        this.timeTextSet=timeTextSet;
      }else{
        
      }    


          
      
    },
    addEvent:function(dataObj){
      var r=this.canvas,
          that=this,
          options=this.options,
          quote=options.quote,
          pCount=dataObj.quote.yAxes.length,
          tg=options.topGutter,
          qvs=options.quote_volume_space,
          vh=options.volume.volumeHeight,
          qh=quote.quoteHeight,
          period=options.period,
          subTimeCount=1;
        //draw rect to emit event
      for(var i=0;i<pCount;i++){
        var orignX=dataObj.quote.xAxes[i],
            orignY=dataObj.quote.yAxes[i],
            vx=dataObj.volume.xAxes[i],
            vy=dataObj.volume.yAxes[i],
            data=dataObj.dataList[i],
            preData=dataObj.dataList[i-1]||{},
            rectWidth=quote.quoteWidth/pCount,
            x=orignX-rectWidth/2,
            rect=r.rect(x,tg,rectWidth,qh+qvs+vh).attr({"stroke":"none",fill:"#fff",opacity:0}),
            eventRectSet=r.set();

        
        eventRectSet.push(rect);
        this.eventRectSet=eventRectSet;
        //draw time line except 1d
        if(period!=="1d"){
          var intervalName=options.periodToTime[period],
              preSubTime=preData[intervalName]||"",
              subTime=data[intervalName],
              subTimeStr=data[intervalName+"Str"];

          if(subTime!==preSubTime){
            
            var begeinY=tg+qh+qvs+vh+10;
            r.path(["M",orignX,begeinY-10,"L",orignX,tg]).attr({"stroke-dasharray":".",stroke:"#e3e3e3"});
            subTimeCount++;
            if(preSubTime){
              if(period==="1m"&&subTimeCount%4!==0){//每隔4天一个点
                // continue;
              }else if(period==="1y"&&subTimeCount%2!==0){//每隔俩月一个点
                // continue;
              }else{
                r.text(orignX,begeinY,subTimeStr||subTime);
              }
            }
          }                  
        }
            

        var tempLine,
            tempCircle,
            tempRect,
            tempText,
            tempVRect,
            tempVText;

        (function(orignX,orignY,vx,vy,data){
          rect.click(function(){
            if(tempCircle){
              tempCircle.animate({fill:"red"},1000);
            }
          })
          rect.hover(function(){
            //tempLine=r.path(["M",orignX,tg,"L",orignX,qh+qvs+vh]).attr({"stroke":"#c0c0c0"});
            tempLine=r.path(["M",orignX,tg,"L",orignX,qh]).attr({"stroke":"#c0c0c0"});
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
            //tempVRect=r.rect(rectX,vy-5,50,20,3).attr({"stroke-width":"1",stroke:"#4572A7"});
            tempText=r.text(rectX+20,rectY+7,data.current).attr({font: '10px Helvetica, Arial', fill: "#666",color:"#666"});
            //tempVText=r.text(rectX+20,vy+7,data.volume).attr({font: '10px Helvetica, Arial', fill: "#666",color:"#666"});
          },function(){
            if(tempLine){
              tempLine.remove();
              tempCircle.remove();
              tempRect.remove();
              tempText.remove();
              //tempVText.remove();
              //tempVRect.remove();
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
    },
    mousewheel:function(dataObj){
      var that=this,
          base=0,
          spliceNum=that.spliceNum;
      $("#"+this.options.container).bind("mousewheel",function(e,delta){
        var zoomOut,zoomIn,ratio,flag;
        if(that.isLoading){
          return false;
        }
        if(delta>0){
          zoomIn=true;
          base++;
          flag=1;
        }else{
          zoomOut=true;
          base--;
          flag=-1;
        }

        if(flag>0){
          if(!that.transformPoint[that.period].toPre){
            return false;
          }
        }
        ratio=that.options.zoomRatio;
        if(!that.quoteLine.removed){
          that.quoteLine.remove();
        }
        if(!that.bgLine.removed){
          that.bgLine.remove();
        }
        if(!that.volumeLine.removed){
          that.volumeLine.remove();
        }
        if(!that.quoteYLabTextSet.removed){
          that.quoteYLabTextSet.remove();
        }
        if(!that.quoteYLabLineSet.removed){
          that.quoteYLabLineSet.remove();
        }
        if(!that.timeTextSet.removed){
          that.timeTextSet.rmeove();
        }
        if(!that.timeLineSet.removed){
          that.timeLineSet.remove()
        }
        var datas=that.originDatas[that.period];
        var increaseNum=that.options.zoomRatio*dataObj.pCount;
        spliceNum+=increaseNum*flag;
        var newDatas=datas.slice(spliceNum),
            point=that.transformPoint[that.period];
        if(flag<0){
          that.trend="next";// 变幻的趋势，向下走 增大
          if(point.toNext&&spliceNum<increaseNum){
            that.period=point.next;
            that.getData(function(dataObj){
              draw(dataObj);
              spliceNum=that.spliceNum;
            })
          }else{
            dataObj=that.wrapData(newDatas,true);
            draw(dataObj);
          }
        }else{
          that.trend="pre";
          if(point.toPre&&newDatas.length<point.toPre){
            that.period=point.pre;
            that.getData(function(dataObj){
              draw(dataObj);
              spliceNum=that.spliceNum;
            });
          }else{
            if(point.toPre){
              dataObj=that.wrapData(newDatas,true);
              draw(dataObj);
            }else{
              return false;
            }
          }
        }
        function draw(dataObj){
          var path=that.generateQuotePath(dataObj.quote.xAxes,dataObj.quote.yAxes,dataObj);
          that.drawQuoteLine(path);
          that.drawVolumeLine(dataObj);
          that.drawYLab(dataObj.quote.yLabels);
          that.drawYLab(dataObj.volume.yLabels);
          that.drawTimeLine(dataObj);
        }
        return false;
      })
    },
    getStockType:function(stockid){
      var specialHKStocks={
          HKHSI:1,
          HKHSF:1,
          HKHSU:1,
          HKHSP:1,
          HKHSC:1,
          HKVHSI:1,
          HKHSCEI:1,
          HKHSCCI:1,
          HKGEM:1,
          HKHKL:1
        },
        USIndexes={
          DJI30:1,
          NASDAQ:1,
          SP500:1,
          ICS30:1
        };
      if(/^S[HZ]\d+$/.test(stockid)){
        if(/^SZ200/.test(stockid)){//SH900||SZ200为HK$B股
          return {money:"HK$",market:"深B",bigType:"沪深",stockType:"AStock"}
        }else if(/^SH900/.test(stockid)){
          return {money:"$",market:"沪B",bigType:"沪深",stockType:"AStock"};
        }else if(/^(SH00|SZ399)/.test(stockid)){//指数
          return {money:"",market:"",bigType:"指数",stockType:"AStock"};
        }
        return {money:"￥",market:"A股",bigType:"沪深",stockType:"AStock"};
      }else if(/^\d+$/.test(stockid)){
        return {money:"HK$",market:"港股",bigType:"港股",stockType:"HKStock"};
      }else if(specialHKStocks[stockid]){//指数
        return {money:"",market:"",bigType:"指数",stockType:"HKStock"};
      }else if(USIndexes[stockid]){
        return {money:"",market:"",bigType:"指数",stockType:"$Stock"};
      }
      return {money:"$",market:"美股",bigType:"美股",stockType:"$Stock"};
    },
    fixPoint:function(points){
      
    }
  }
}($))
