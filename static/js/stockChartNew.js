var SNB={};
(function($,undefined){
  window.SNB=SNB||{};
  if(!SNB.Models){
    SNB.Models={};
  }


  SNB.stockChart=function(options){
    if(!options.container){
      return;//must have a container to render
    }
    var defaultOptions={
      width:570,
      height:360,
      volumeChartHeight:80,
      dragBarHeight:40,
      timeLineHeight:15,
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
    this.paper=new Raphael(options.container,options.width,options.height);
    this.container=options.container;
    // if(window.location.hash){
    //   this.options.symbol=window.location.hash.substr(1);
    // }
    this.options.stockType=this.getStockType(this.options.symbol).stockType;
    this.periodIndex=this.options.periodIndex;
    this.periodSeries=this.options.periodSeries;
    this.period=this.options.period;
    this.isLoading=true;
    //各个图块的起始坐标。
    this.stateBaseLine=0;
    this.currentBaseLine=20;
    this.timeBaseLine=220;
    this.volumeBaseLine=235;
    this.volumeEndLine=315;
    this.minibarBaseLine=315;
    //各个图块的高度
    this.stateHeight=20;
    this.currentHeight=200;
    this.timeHeight=15;
    this.volumeHeight=80;
    this.volumeMiniInterval=0;
    this.minibarHeight=40;

    this.width=560;
    this.height=360;
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
        that.originDatas[that.period]=datas;
        var renderData,
            wrapCount,
            isSlice=false;//是否截取

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
          isSlice=true;
        }

        var dataObj=that.wrapData(renderData,isSlice);
            
        callback(dataObj);   
      }

    },
    wrapData:function(dataList,isSlice){
      var that=this;
      var datas=_.reject(dataList,function(data){//剔除错误的数据
        return data.current==0;
      });
      var dataSet={};//最终返回的数据集合
      var options=this.options;

      var currentList=_.pluck(dataList,"current");
      var volumeList=_.pluck(dataList,"volume");

      var maxCurrent=Math.max.apply(null,currentList),//取得current 和volume的最大最小值
          minCurrent=Math.min.apply(null,currentList),
          maxVolume=Math.max.apply(null,volumeList),
          minVolume=Math.min.apply(null,volumeList);


      var currentYLableInfo=getLableY(minCurrent,maxCurrent,this.timeBaseLine,this.currentHeight,"current");    
      var volumeYLableInfo=getLableY(minVolume,maxVolume,this.volumeEndLine,this.volumeHeight,"volume");    

      dataSet.currentYLablesObj=currentYLableInfo.yLabelObjs;
      dataSet.volumeYLablesObj=volumeYLableInfo.yLabelObjs;
      dataSet.pointsList=[];
      var pCount=0;//图上的总点数。天图如果刚开盘得考虑当天后续的点。

      if(this.period==="5d"){
        if(isSlice){
          pCount=dataList.length;
        }else{
          pCount=options["pointsCount_5d_"+options.stockType];
        }
      }else{
        pCount=options.period==="1d"?options["dayPointsCount_"+options.stockType]:(dataList.length-1);
      }
      this.pCount=pCount;
      var xGap=this.width/pCount;
      for(var i=0;i<pCount;i++){
        var data=datas[i],
            point=$.extend({},data);

        if(data){
          var stockType=options.stockType;
          if(stockType!=="$Stock"&&options.period==="1d"){
            var deleteTime=stockType==="AStock"?"11:30:00":"12:00:00",
                newDataList=[];
            
            if(data.time.indexOf(deleteTime)>-1){
              continue;
            }
          }else{
            var time=data.time,
                tempArray=time.split(" ");
            //处理坐标上的时间显示 
            switch(options.periodToTime[that.period]){
              case "date":
                point.date=new Date(time).getDate();
                point.dateStr=tempArray[1]+" "+tempArray[2];
                break;
              case "month":
                point.month=new Date(time).getMonth()+1;
                point.monthStr=tempArray[1]+" "+tempArray[2];
                break;
              case "year":
                point.year=new Date(time).getFullYear();
                break;    
            }
          }
          point.currentXAxis=i*xGap;
          point.volumeXAris=i*xGap;
          point.currentYAxis=that.timeBaseLine+that.currentBaseLine-that.range(currentYLableInfo.dataRange,{start:this.currentBaseLine,end:this.currentBaseLine+this.currentHeight})(data.current);
          point.volumeYAxis=that.minibarBaseLine+that.volumeBaseLine-that.volumeMiniInterval-that.range(volumeYLableInfo.dataRange,{start:this.volumeBaseLine,end:this.volumeBaseLine+this.volumeHeight})(data.volume);
          dataSet.pointsList.push(point);
        }else{
          dataSet.pointsList.push(null);//如果总点数超过当前数据量，后面的点为null,在图上不画出来。
        }    
      }

      //height 图标的高
      function getLableY(minData,maxData,yStartYAxis,height,dataType){//获取y轴--也就是左侧的间隔文字和坐标
        var dataGap=maxData-minData,
            tempObj=that.convert(dataGap),
            baseNum=Math.ceil(tempObj.mantissa),
            exponent=tempObj.exponent;

        if(baseNum===10){//由于baseNum取的是cell
          baseNum=1;
          exponent++;
        }    
            
        var tick=getTick(baseNum,dataType)*Math.pow(10,exponent),    
            dataStart=Math.floor(minData/tick)*tick,
            dataEnd=Math.ceil(maxData/tick)*tick+tick;

        //计算出间隔数量
        var len=Math.ceil((dataEnd-dataStart)/tick);

        var tempStart=dataStart,
            isQuote,  
            yLabelTick=height/len,
            yLabelObjs=[];

        for(var i=0;i<len;i++){
          var text = tempStart+i*tick;
          if(dataType=="volume"){
            var unit,last,newLabel=that.convert(text),exponent=newLabel.exponent;
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
          }
          yLabelObjs.push({yAxis:yStartYAxis-i*yLabelTick,text:text});
        }
        return {yLabelObjs:yLabelObjs,dataRange:{start:dataStart,end:dataEnd}};//把开始和结束数据返回，散列的时候要用到。
      }

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

      return dataSet;
    },
    range:function(source,target,isQuote){//reflect one range of nums to others
      var sStart=source.start||0,
          sEnd=source.end||100,
          tStart=target.start||0,
          tEnd=target.end||1000,
          options=this.options;

      var newArray=[],
          total;
      
      return function(array){

        if(Object.prototype.toString.call(array)==="[object Array]"){
 
          for(var i=0,ii=array.length;i<ii;i++){
            newArray[i]=((array[i]-sStart)*(tEnd-tStart)/(sEnd-sStart)+tStart);
          }
          return newArray;
        }else{
          return ((array-sStart)*(tEnd-tStart)/(sEnd-sStart)+tStart);
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
      this.dataSet=dataObj;
      this.drawBase();
      this.drawLabel(dataObj);
      this.drawChart(dataObj);
      this.bindMoveEvent();
      this.mousewheel(dataObj);
      this.drawMinibar();
    },
    reDraw:function(dataObj){
      var that=this;
      if(that.tempCircle&&!that.tempCircle.removed){
        that.tempCircle.remove();
      }
      if(that.stockInfo&&!that.stockInfo.removed){
        that.stockInfo.remove();
      }
      if(that.currentHline&&!that.currentHline.removed){
        that.currentHline.remove();
      }
      this.currentSplitLineSet.remove();
      this.currentSplitTextSet.remove();
      this.volumeSplitLineSet.remove();
      this.volumeSplitTextSet.remove();
      this.volumeLineSet.remove();
      this.currentLine.remove();
      this.drawLabel(dataObj);
      this.drawChart(dataObj);
    },
    drawBase:function(){
      this.upRect=this.paper.path(["M",0,0,"L",this.width,0,"L",this.width,this.volumeEndLine,"L",0,this.volumeEndLine,"Z"]).attr({fill:"white"}).toFront();//上部外框
      //this.minibarRect=this.paper.rect(0,this.minibarBaseLine,this.width,this.minibarHeight);//minibar外框
      this.stateRect=this.paper.rect(0,this.stateBaseLine,this.width,this.stateHeight);//状态框
      this.currentRect=this.paper.rect(0,this.currentBaseLine,this.width,this.currentHeight);//current框
      this.timeRect=this.paper.rect(0,this.timeBaseLine,this.width,this.timeHeight);//time框
      this.volumeRect=this.paper.rect(0,this.volumeBaseLine,this.width,this.volumeHeight);//volume框
    },
    drawLabel:function(dataSet){
      var that=this;
      var currentYLables=dataSet.currentYLablesObj;
      var volumeYLables=dataSet.volumeYLablesObj;
      this.currentSplitLineSet=this.paper.set();
      this.currentSplitTextSet=this.paper.set();
      this.volumeSplitLineSet=this.paper.set();
      this.volumeSplitTextSet=this.paper.set();
      draw(currentYLables,this.currentSplitLineSet,this.currentSplitTextSet);
      draw(volumeYLables,this.volumeSplitLineSet,this.volumeSplitTextSet);

      function draw(labels,lineSet,textSet){
        for(var i=0,len=labels.length;i<len;i++){
          var label=labels[i];
          lineSet.push(that.paper.path(["M",0,label.yAxis,"L",that.width,label.yAxis]).attr({stroke:"#e3e3e3"}));
          textSet.push(that.paper.text(that.width-12,label.yAxis-7,label.text));
        }
      }
    },
    drawChart:function(dataSet){
      
      var points=dataSet.pointsList;
      var pathArray=["M"];
      this.volumeLineSet=this.paper.set();
      for(var i=0,len=points.length;i<len;i++){
        var point=points[i];
        if(point){
          pathArray=pathArray.concat(point.currentXAxis,point.currentYAxis);
          if(!i){
            pathArray.push("L");
          }
          var path=this.paper.path(["M",point.volumeXAris,point.volumeYAxis,"L",point.volumeXAris,this.volumeBaseLine+this.volumeHeight]).attr({stroke:"#4572A7","stroke-width":"1"});
          this.volumeLineSet.push(path);
        }
      }
      this.currentLine=this.paper.path(pathArray).attr({stroke:"#4572A7","stroke-width":"1"});
    },
    drawMinibar:function(){
      var vel=this.volumeEndLine;
      this.paper.path(["M",0,vel,"L",200,vel,"L",200,vel+30,"L",240,vel+30,"L",240,vel,"L",this.width,vel])
      //两个拖动按钮
      this.paper.circle(200,vel+15,5).attr({"fill":"red"});;
      this.paper.circle(240,vel+15,5).attr({"fill":"red"});;
      //两个移动按钮
      this.paper.rect(0,this.minibarBaseLine+30,10,10).attr({"fill":"green"});
      this.paper.rect(this.width-10,this.minibarBaseLine+30,10,10).attr({"fill":"green"});
      //底部的拖动槽
      this.paper.path(["M",0,this.minibarBaseLine+30,"L",this.width-10,this.minibarBaseLine+30,"L",this.width-10,this.minibarBaseLine+40,"L",0,this.minibarBaseLine+40,"Z"]);
      //滑动块。
      this.paper.path(["M",200,this.minibarBaseLine+30,"L",240,this.minibarBaseLine+30,"L",240,this.minibarBaseLine+40,"L",200,this.minibarBaseLine+40,"Z"]).attr({"fill":"#f1f1f1"});
      //还有左右两块path遮罩层。


      
    },
    bindMoveEvent:function(){
      var that=this;
      var offsetX=$("#"+that.container).find("svg").offset().left;
      this.upRect.mousemove(function(e){
        if(that.tempCircle&&!that.tempCircle.removed){
          that.tempCircle.remove();
        }
        if(that.stockInfo&&!that.stockInfo.removed){
          that.stockInfo.remove();
        }
        if(that.currentHline&&!that.currentHline.removed){
          that.currentHline.remove();
        }
        var eventX=e.pageX;
        var xAxis=eventX-offsetX;
        var points=that.dataSet.pointsList;

        var gap=(points[1].currentXAxis-points[0].currentXAxis)/2;
        for(var i=0,len=points.length;i<len;i++){
          var point=points[i],
              index=0;
          if(point){
            if(xAxis>point.currentXAxis&&xAxis<=point.currentXAxis+gap){
              index=i;
            }
            if(xAxis<point.currentXAxis&&xAxis>=point.currentXAxis-gap){
              index=i;
            }
            if(index){
              that.tempCircle=that.paper.circle(point.currentXAxis,point.currentYAxis,3).attr({"stroke-width":"1",stroke:"#fff",fill:"#4572A7"});
              var text="time:"+point.time+"  current:"+point.current+"  volume:"+point.volume;
              that.stockInfo=that.paper.text(150,that.stateHeight/2,text);
              that.currentHline=that.paper.path(["M",point.currentXAxis,that.currentBaseLine,"L",point.currentXAxis,that.timeBaseLine]).attr({stroke:"#e3e3e3"})
            }
          }    
        }
      })
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
    mousewheel:function(){
      var that=this,
          base=0,
          spliceNum=that.spliceNum;
      $("#"+this.options.container).find("svg").bind("mousewheel",function(e,delta){
        var offsetY=$(this).offset().top;
        if(e.pageY-offsetY<that.volumeEndLine){
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

          var datas=that.originDatas[that.period];
          var increaseNum=that.options.zoomRatio*that.pCount;
          spliceNum+=increaseNum*flag;
          var newDatas=datas.slice(spliceNum),
              point=that.transformPoint[that.period];
          if(flag<0){
            that.trend="next";// 变幻的趋势，向下走 增大
            if(point.toNext&&spliceNum<increaseNum){
              that.period=point.next;
              that.getData(function(dataObj){
                that.dataSet=dataObj;
                that.reDraw(dataObj);
                spliceNum=that.spliceNum;
              })
            }else{
              that.dataSet=that.wrapData(newDatas,true);
              that.reDraw(that.dataSet);
            }
          }else{
            that.trend="pre";
            if(point.toPre&&newDatas.length<point.toPre){
              that.period=point.pre;
              that.getData(function(dataObj){
                that.reDraw(dataObj);
                that.dataSet=dataObj;
                spliceNum=that.spliceNum;
              });
            }else{
              if(point.toPre){
                that.dataSet=that.wrapData(newDatas,true);
                that.reDraw(that.dataSet);
              }else{
                return false;
              }
            }
          }
        
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
