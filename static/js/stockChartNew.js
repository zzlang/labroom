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
      width:568,
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
      period:"10d",//chartType
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

    this.grooveBaseLine=this.minibarBaseLine+30;//miniBar底部槽的初始位置。
    this.grooveEndLine=this.grooveBaseLine+14;//槽底部位置。
    //各个图块的高度
    this.stateHeight=20;
    this.currentHeight=200;
    this.timeHeight=15;
    this.volumeHeight=80;
    this.volumeMiniInterval=0;
    this.minibarHeight=40;

    this.width=567;
    this.height=360;
    this.transformPoint={
      "1d":{
        pre:"",
        next:"10d",
        toNext:200,
        toPre:"",
        ratioNext:1/5,
        ratioPre:""
      },
      /*
       *"5d":{
       *  pre:"1d",
       *  next:"10d",
       *  toNext:200,
       *  toPre:40,
       *  ratioNext:5/10,
       *  ratioPre:5/1
       *},
       */
      "10d":{
        pre:"1d",
        next:"30d",
        toNext:400,
        toPre:40,
        ratioNext:10/30,
        ratioPre:10/1
      },
      "30d":{
        pre:"10d",
        next:"6m",
        toNext:420,
        toPre:140,
        ratioNext:30/123,
        ratioPre:30/10
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
    };
    this.beginTimespanTable=[];
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
        var period=that.period=="10d"?"30d":that.period;

        $.getJSON(options.dataUrl+"?callback=?",{key:options.apiKey,symbol:options.symbol,period:period},function(ret){
          if(ret.message&&ret.message.code=="0"){
            that.isLoading=false;
            if(that.period=="10d"){
              that.originDatas[that.period]=ret.chartlist.slice(-1*ret.chartlist.length/3);
              that.originDatas["30d"]=_.filter(ret.chartlist,function(data){//半个小时为基准
                return data.time.indexOf("00:00")>-1||data.time.indexOf("30:00")>-1;
              });
              that.beginTimespanTable.push({"period":"10d",timespan:Date.parse(that.originDatas["10d"][0].time)});
              that.beginTimespanTable.push({period:"30d",timespan:Date.parse(that.originDatas["30d"][0].time)});
              handler(that.originDatas["10d"]);
            }else{
              handler(ret.chartlist);
            }

            $.getJSON(options.dataUrl+"?callback=?",{key:options.apiKey,symbol:options.symbol,period:"6m"},function(ret){
              if(ret.message&&ret.message.code=="0"){
                that.originDatas["6m"]=ret.chartlist;
                that.beginTimespanTable.push({period:"6m",timespan:Date.parse(ret.chartlist[0].time)});
              }
            })
          }
        })

      }

      function handler(datas){//处理接下来需要渲染的数据
        that.originDatas[that.period]=datas;
        //that.beginTimespanTable[that.period]=Date.parse(datas[0].time);
        var renderData,
            wrapCount,
            isSlice=false;//是否截取

        var point=that.transformPoint[that.period];
        if(that.trend){
          if(that.trend==="next"){
            renderData=datas.slice(1/point.ratioPre*datas.length*-1);
            isSlice=true;
          }else{
            renderData=datas
          }
          that.spliceNum=datas.length-renderData.length;
        }else{
          //wrapCount=options["pointsCount_5d_"+options.stockType];
          renderData=datas.slice(options.initDays/10*(-1)*datas.length);
          that.spliceNum=datas.length-renderData.length;
          isSlice=true;
        }

        var dataObj=that.wrapData(renderData,isSlice);
            
        callback(dataObj);   
      }

    },
    wrapData:function(dataList,isSlice,slice){
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
        pCount=options.period==="1d"?options["dayPointsCount_"+options.stockType]:(dataList.length);
      }
      this.pCount=pCount;
      var xGap,
          beginx=0;
      if(slice){
        xGap=this.width/(pCount-1-slice.left-slice.right);
        beginx=0-slice.left*xGap;
      }else{
        xGap=this.width/(pCount-1);
      }
      if(that.preGapPeriod){
        var preGap=that.preGapPeriod.xGap;
        var prePeriod=that.preGapPeriod.period;
      }
      that.xGap=xGap;
      that.preGapPeriod={xGap:that.xGap,period:that.period};
      that.slice=slice;

      var timeInterval=Date.parse(datas[datas.length-1].time)-Date.parse(datas[0].time);
      var dayTimespan=24*60*60*1000;
      var weekTimespan=7*dayTimespan;
      var monthTimespan=22*dayTimespan;
      var yearTimespan=365*dayTimespan;

      var span=0;


      var list=[dayTimespan,weekTimespan,monthTimespan,yearTimespan];

      for(var i=0,len=list.length;i<len;i++){
        span=list[i];
        if(timeInterval/span<10){
          span=i;
          break;
        }
      }
      
      for(var i=0;i<pCount;i++){
        var data=datas[i],
            preData=datas[i-1],
            point=$.extend({},data);

        if(!preData){
          preData=data;
        }
        if(data){
          var stockType=options.stockType;
          if(stockType!=="$Stock"&&options.period==="1d"){
            var deleteTime=stockType==="AStock"?"11:30:00":"12:00:00",
                newDataList=[];
            
            if(data.time.indexOf(deleteTime)>-1){
              continue;
            }
          }else{
            var time=data.time,//[Fri Apr 06 13:00:00 -0400 2012]
                tempArray=time.split(" "),
                preTempArray=preData.time.split(" ");

            if(that.period==="1d"){
              if(tempArray[3].indexOf("00:00")>0){
                point.timeStr=tempArray[3].replace(/:00$/g,function(all){
                  return "";
                });
              }
            }else{
              var timeStr=tempArray[1]+" "+tempArray[2];
              if(span==0){
                if(preTempArray[2]!=tempArray[2]){
                  point.timeStr=timeStr;
                }
              }else if(span==1){
                if((tempArray[0]=="Mon"&&preTempArray[2]!=tempArray[2])||(tempArray[0]=="Tue"&&preTempArray[0]!="Mon"&&preTempArray[2]!=tempArray[2])){
                  point.timeStr=timeStr;
                }
              }else if(span==2){
                if(preTempArray[1]!=tempArray[1]){
                  point.timeStr=timeStr
                }
              }else if(span==3){
                if(preTempArray[5]!=tempArray[5]){
                  point.timeStr=timeStr;
                }
              }
            }
          }
          point.timespan=Date.parse(point.time);
          point.currentXAxis=beginx+i*xGap;
          point.volumeXAris=beginx+i*xGap;
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
    reDraw:function(dataObj,noMini){
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
      this.timeStrSet.remove();
      this.timeLineSet.remove();
      this.currentLine.remove();
      this.drawLabel(dataObj);
      this.drawChart(dataObj);

      if(noMini){
        return false;
      }

      //reDraw minibar
      var points=dataObj.pointsList;
      var len=points.length;
      if(len){
        var beginTimespan=points[0].timespan;
        var endTimespan=points[len-1].timespan;
        var miniPointList=that.miniPointList;
        var miniBeginTimespan,miniEndTimespan,miniBeginXaris,miniEndXaris;

        for(var i=0,len=miniPointList.length;i<len;i++){
          var point=miniPointList[i];
          var key=point.timespan;
          if(key>beginTimespan){
            if(!miniBeginTimespan){
              miniBeginXaris=miniPointList[i-1].xAxis;
              miniBeginTimespan=key;
            }
            if(key>endTimespan){
              if(!miniEndTimespan){
                miniEndXaris=miniPointList[i-1].xAxis;
                miniEndTimespan=key;
                break;
              }
            }
          }
        }

        if(miniBeginTimespan&&!miniEndTimespan&&!miniEndXaris){
          //miniEndTimespan=miniPointList[len-1].timespan;
          miniEndTimespan=endTimespan;
          miniEndXaris=550;
        }
        var x2;
        console.log(that.x2);

        
        var perTimeWidth=(miniEndXaris-miniBeginXaris)/(miniEndTimespan-miniBeginTimespan);
        var x1=miniBeginXaris-perTimeWidth*(miniBeginTimespan-beginTimespan);
        if(miniEndXaris!=550){
          x2=miniEndXaris+perTimeWidth*(endTimespan-miniEndTimespan);
        }
        if(x1||x2){
          if(!x2){
            x2=550;
          }
          that.x1=x1;
          that.x2=x2;
          console.log("last x2:"+that.x2);
          that.reDrawMiniLine(x1,x2);
        }
      }
    },
    drawBase:function(){
      var that=this;
      this.upRect=this.paper.path(["M",0,this.volumeEndLine,"L",0,0,"L",this.width,0,"L",this.width,this.volumeEndLine]).attr({fill:"white"});//上部外框
      var tempdx=0;
      this.upRect.drag(function(dx,dy,x,y,e){
        var increase=tempdx=(dx/6)*-1;
        console.log("origin x1:"+that.x1);
        console.log("origin x2:"+that.x2);
        that.x1+=increase;
        that.x2+=increase;
        //先不管逻辑了，想到哪写到呢，功能实现之后再看逻辑
        //遍历minirender数据，取到时间范围，精确到某一天.
        var renderMiniPointList=that.renderMiniPointList;
        for(var i=0,len=renderMiniPointList.length;i<len;i++){
          var point=renderMiniPointList[i];
          var beginPoint,endPoint;

          if(point.xAxis>=that.x1){
            if(!beginPoint){
              beginPoint=renderMiniPointList[i-1];
            }
            if(point.xAxis>=that.x2){
              if(!endPoint){
                endPoint=point;
                break;
              }
            }
          }
        }
        console.log(beginPoint.time);
        console.log(endPoint.time);

        var miniTimespanInterval=renderMiniPointList[1].timespan-renderMiniPointList[0].timespan;

        var beginTime={timespan:beginPoint.timespan,extra:(that.x1-beginPoint.xAxis)/5};
        var endTime={timespan:endPoint.timespan,extra:(endPoint.xAxis-that.x2)/5};
        var slice={left:beginTime.extra,right:endTime.extra};
        
        for(var i=0,len=that.beginTimespanTable.length;i<len;i++){
          var data=that.beginTimespanTable[i];
          if(beginTime.timespan>data.timespan){
            that.period=data.period;
            break
          }
        }
        if(that.period!=="10y"){
          beginTime.timespan=beginTime.timespan+miniTimespanInterval*beginTime.extra;
          endTime.timespan=endTime.timespan-miniTimespanInterval*endTime.extra;
        }
        that.miniEndTimespan=endTime.timespan;

        var renderDatas=[];
        var currentDatas=that.originDatas[that.period];
        for(var i=0,len=currentDatas.length;i<len;i++){
          var d=currentDatas[i];
          var timespan=Date.parse(d.time);
          if(timespan>=beginTime.timespan&&timespan<=endTime.timespan){
            renderDatas.push(d);
            if(timespan==beginTime.timespan){
              that.spliceNum=i;
            }
            if(timespan==endTime.timespan){
              that.currentEndIndex=i;
            }
          }
        }
        var obj=that.wrapData(renderDatas,true,slice);
        that.dataSet=obj;
        that.reDraw(obj,true);
        that.reDrawMiniLine(that.x1,that.x2);
        console.log(renderDatas);

        console.log(beginTime);
        console.log(endTime);

        that.x1-=increase;
        that.x2-=increase;
      },function(){
      },function(){
        that.x1+=tempdx;
        that.x2+=tempdx;
        console.log("tempdx:"+tempdx);
        console.log(that.x1);
        console.log(that.x2);
      })
      //this.minibarRect=this.paper.rect(0,this.minibarBaseLine,this.width,this.minibarHeight);//minibar外框
      //this.stateRect=this.paper.rect(0,this.stateBaseLine,this.width,this.stateHeight);//状态框
      this.paper.path(["M",0,this.stateHeight,"L",this.width,this.stateHeight]);
      //this.currentRect=this.paper.rect(0,this.currentBaseLine,this.width,this.currentHeight);//current框
      this.paper.path(["M",0,this.timeBaseLine,"L",this.width,this.timeBaseLine]);
      //this.timeRect=this.paper.rect(0,this.timeBaseLine,this.width,this.timeHeight);//time框
      this.paper.path(["M",0,this.volumeBaseLine,"L",this.width,this.volumeBaseLine]);
      //this.volumeRect=this.paper.path("M",0,this.volumeBaseLine,"L",this.width,this.volumeBaseLine,"L",this.width,this.minibarBaseLine);//volume框
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
          if(i){
            lineSet.push(that.paper.path(["M",0,label.yAxis,"L",that.width,label.yAxis]).attr({stroke:"#e3e3e3"}));
          }
          textSet.push(that.paper.text(that.width-12,label.yAxis-7,label.text));
        }
      }
    },
    drawChart:function(dataSet){
      
      var points=dataSet.pointsList;
      var pathArray=["M"];
      this.volumeLineSet=this.paper.set();
      this.timeStrSet=this.paper.set();
      this.timeLineSet=this.paper.set();
      for(var i=0,len=points.length;i<len;i++){
        var point=points[i];
        if(point){
          pathArray=pathArray.concat(point.currentXAxis,point.currentYAxis);
          if(!i){
            pathArray.push("L");
          }
          var path=this.paper.path(["M",point.volumeXAris,point.volumeYAxis,"L",point.volumeXAris,this.volumeBaseLine+this.volumeHeight]).attr({stroke:"#4572A7","stroke-width":"1"});
          this.volumeLineSet.push(path);
          if(point.timeStr){
            var time=this.paper.text(point.volumeXAris,this.timeBaseLine+8,point.timeStr);
            this.timeStrSet.push(time);
            var timeLine=this.paper.path(["M",point.volumeXAris,this.timeBaseLine,"L",point.volumeXAris,this.currentBaseLine]).attr({stroke:"#e3e3e3"});
            this.timeLineSet.push(timeLine);
          }
        }
      }
      this.currentLine=this.paper.path(pathArray).attr({stroke:"#4572A7","stroke-width":"1"});
    },
    reDrawMiniLine:function(x1,x2){
      var vel=this.volumeEndLine;
      var that=this;
      var grooveBaseLine=this.minibarBaseLine+30;//miniBar底部槽的初始位置。
      var grooveEndLine=grooveBaseLine+10;//槽底部位置。
      this.miniLine.animate({path:["M",0,vel,"L",x1,vel,"L",x1,grooveBaseLine,"L",x2,grooveBaseLine,"L",x2,vel,"L",that.width,vel].concat("")},1);
      this.miniBlock.animate({x:x1,y:grooveBaseLine,width:x2-x1},1);
      this.miniLeftCircle.animate({x:x1-4},1);
      this.miniLeftCircleLines.animate({path:["M",x1-1,vel+10,"L",x1-1,vel+20,"M",x1+1,vel+10,"L",x1+1,vel+20].concat("")});
      this.miniRightCircle.animate({x:x2-4},1);
      this.miniRightCircleLines.animate({path:["M",x2-1,vel+10,"L",x2-1,vel+20,"M",x2+1,vel+10,"L",x2+1,vel+20].concat("")});
    },
    drawMinibarBase:function(x1,x2){
      var vel=this.volumeEndLine;
      //方便事件交互，把他俩绑定到全局上。
      this.x1=x1;
      this.x2=x2;
      var that=this;
      var grooveBaseLine=this.minibarBaseLine+30;//miniBar底部槽的初始位置。
      var grooveEndLine=grooveBaseLine+14;//槽底部位置。
      
      var dragx=0;
      var leftInterval,rightInterval;
      this.miniLine=this.paper.path(["M",0,vel,"L",x1,vel,"L",x1,grooveBaseLine,"L",x2,grooveBaseLine,"L",x2,vel,"L",this.width,vel]).toFront().attr({"fill":"white",opacity:"0.3"}).drag(
        function(dx,dy,x,y,e){
          if(that.x1+dx<=10||that.x2+dx>=550){
            return false;
          }
          if((that.miniStartIndex<=0||that.x1+dx>50)&&leftInterval){//index为0活着移出缓动区
            console.log("clear left");
            window.clearInterval(leftInterval);
            leftInterval=0;
          }
          if((that.miniStartIndex+that.miniRenderPointNum>=that.miniPointList.length||that.x2+dx<520)&&rightInterval){
            console.log("clear right");
            window.clearInterval(rightInterval);
            rightInterval=0;
          }
          if(that.x1+dx<=50&&that.miniStartIndex!=0&&!leftInterval){
            console.log("bind");
            console.log(leftInterval);
            console.log(that.miniStartIndex);
            leftInterval=setInterval(function(){
              that.miniStartIndex-=10;
              that.drawMiniChartLine(that.miniStartIndex);
            },100);
          }
          if(that.x2+dx>=520&&that.miniStartIndex+that.miniRenderPointNum<that.miniPointList.length&&!rightInterval){
            console.log("bind right");
            rightInterval=setInterval(function(){
              that.miniStartIndex+=10;
              that.drawMiniChartLine();
            },100);
          }
          move(dx,dx,true);
          dragx=dx;
        },function(){
        
        },function(){
          that.x1+=dragx;
          that.x2+=dragx;
          //先不管逻辑了，想到哪写到呢，功能实现之后再看逻辑
          //遍历minirender数据，取到时间范围，精确到某一天.
          var renderMiniPointList=that.renderMiniPointList;

          var miniTimespanInterval=renderMiniPointList[1].timespan-renderMiniPointList[0].timespan;

          for(var i=0,len=renderMiniPointList.length;i<len;i++){
            var point=renderMiniPointList[i];
            var beginPoint,endPoint;

            if(point.xAxis>=that.x1){
              if(!beginPoint){
                beginPoint=renderMiniPointList[i-1];
              }
              if(point.xAxis>=that.x2){
                if(!endPoint){
                  endPoint=point;
                  break;
                }
              }
            }
          }
          console.log(beginPoint.time);
          console.log(endPoint.time);

          var beginTime={timespan:beginPoint.timespan,extra:(that.x1-beginPoint.xAxis)/5};
          var endTime={timespan:endPoint.timespan,extra:(endPoint.xAxis-that.x2)/5};
          var slice={left:beginTime.extra,right:endTime.extra};

          //取最小的时间
          for(var i=0,len=that.beginTimespanTable.length;i<len;i++){
            var data=that.beginTimespanTable[i];
            if(beginTime.timespan>data.timespan){
              that.period=data.period;
              break
            }
          }

          if(that.period!=="10y"){
            beginTime.timespan=beginTime.timespan+miniTimespanInterval*beginTime.extra;
            endTime.timespan=endTime.timespan-miniTimespanInterval*endTime.extra;
          }
          that.miniEndTimespan=endTime.timespan;

          var renderDatas=[];
          var currentDatas=that.originDatas[that.period];
          var flag=true;
          for(var i=0,len=currentDatas.length;i<len;i++){
            var d=currentDatas[i];
            var timespan=Date.parse(d.time);
            if(timespan>=beginTime.timespan){
              renderDatas.push(d);
              if(flag){
                that.spliceNum=i;
                flag=false;
              }
            }
            if(timespan>=endTime.timespan){
              that.currentEndIndex=i;
              break;
            }
          }
          var obj=that.wrapData(renderDatas,true,slice);
          that.dataSet=obj;
          that.reDraw(obj,true);
          console.log(renderDatas);

          console.log(beginTime);
          console.log(endTime);
        }
      );
      var originX1=x1;
      var originX2=x2;
      //两个拖动按钮
      //var leftCircle=this.miniLeftCircle=this.paper.circle(x1,vel+15,5).attr({"fill":"red"}).drag(onleftmove,onstart,onleftend);
      var leftCircle=this.miniLeftCircle=this.paper.rect(x1-4,vel+7.5,8,15).attr({r:3,"stroke-width":1,"stroke":"#B9B9B9",fill:"#ffffff"}).drag(onleftmove,onstart,onleftend);//width:8,height:15
      //var rightCircle=this.miniRightCircle=this.paper.circle(x2,vel+15,5).attr({"fill":"red"}).drag(onrightmove,onstart,onrightend);
      var rightCircle=this.miniRightCircle=this.paper.rect(x2-4,vel+7.5,8,15).attr({r:3,"stroke-width":1,"stroke":"#B9B9B9",fill:"#ffffff"}).drag(onrightmove,onstart,onrightend);

      this.miniLeftCircleLines=this.paper.path(["M",x1-1,vel+10,"L",x1-1,vel+20,"M",x1+1,vel+10,"L",x1+1,vel+20]).attr({fill:"#ffffff",stroke:"black","stroke-width":"1"});
      this.miniRightCircleLines=this.paper.path(["M",x2-1,vel+10,"L",x2-1,vel+20,"M",x2+1,vel+10,"L",x2+1,vel+20]).attr({fill:"#ffffff",stroke:"black","stroke-width":"1"});
      //为了在停止拖动时候变更x1 x2
      var leftdx=0;
      var rightdx=0;

      var minInterval=5;//1d 最小间隔
      function onleftmove(dx,dy,x,y,e){
        if(that.x1+dx>=10&&that.x1+dx<=550){//不要超过边界。
          leftCircle.animate({x:that.x1+dx-4},1);
          leftdx=dx;
          move(dx,0);
        }
        return false;
      };
      function onrightmove(dx,dy,x,y,e){
        if(that.x2+dx>=10&&that.x2+dx<=550){
          rightCircle.animate({x:that.x2+dx-4},1);
          rightdx=dx;
          move(0,dx);
        }
        return false;
      }

      function onstart(x,y,e){
        console.log(that.x1);
        console.log(that.x2);
        return false;
      }

      function onleftend(dx,dy,x,y,e){
        that.x1+=leftdx;
        leftdx=0;//因为点击事件也会触发拖动。
        endAction();
      }
      function onrightend(dx,dy,x,y,e){
        that.x2+=rightdx;
        rightdx=0;
        endAction();
      }
      function endAction(){//抽象出俩
        if(that.x1>that.x2){
          if(that.x1-that.x2<5){//间距小于5
            that.x1=that.x2;
            that.x2=that.x1+5;
          }else{
            var temp=that.x1;
            that.x1=that.x2;
            that.x2=temp;
          }
          move(0,0);
        }else{
          if(that.x2-that.x1<5){
            that.x1=that.x2-5;
            if(that.x1<10){//避免拖出左边。
              that.x1=10;
              that.x2=15;
            }
            move(0,0);
          }
        }
        return false;
      }
      function move(dx1,dx2,isDragBlock){
        that.miniLine.animate({path:["M",0,vel,"L",that.x1+dx1,vel,"L",that.x1+dx1,grooveBaseLine,"L",that.x2+dx2,grooveBaseLine,"L",that.x2+dx2,vel,"L",that.width,vel].concat("")},1);
        //that.miniBlock.animate({path:["M",that.x1+dx1,grooveBaseLine,"L",that.x2+dx2,that.grooveBaseLine,"L",that.x2+dx2,grooveEndLine,"L",that.x1+dx1,grooveEndLine,"Z"].concat("")},1);
        that.miniBlock.animate({x:that.x1+dx1,y:grooveBaseLine,width:that.x2+dx2-that.x1-dx1},1);
        if(dx1&&dx2){//同时存在说明是点击下边槽的移动
          leftCircle.animate({x:that.x1+dx1-4},1);
          rightCircle.animate({x:that.x2+dx1-4},1);
          if(!isDragBlock){
            that.x1+=dx1;
            that.x2+=dx2;
          }
        }
        if(!dx1&&!dx2){//交叉的情况，两个原点交换位置。
          leftCircle.animate({x:that.x1-4},1)
          rightCircle.animate({x:that.x2-4},1)
        }
        var tx1=that.x1;
        var tx2=that.x2;
        
          tx1+=dx1||0;
          tx2+=dx2||0;
        that.miniLeftCircleLines.animate({path:["M",tx1-1,vel+10,"L",tx1-1,vel+20,"M",tx1+1,vel+10,"L",tx1+1,vel+20].concat("")});
        that.miniRightCircleLines.animate({path:["M",tx2-1,vel+10,"L",tx2-1,vel+20,"M",tx2+1,vel+10,"L",tx2+1,vel+20].concat("")});
        that.moveCurrent();
        return false;
      }
      this.paper.rect(0,grooveBaseLine,this.width,14).attr({fill:"#f5f5f5","stroke-width":1,"stroke":"#ECECEC"});

      //两个移动按钮
      this.paper.rect(0,this.grooveBaseLine,14,14).attr({r:2,"stroke-width":1,"stroke":"#B9B9B9",fill:"#CACACA"}).click(function(e){
        if(that.x1<20){
          move(10-that.x1,10-that.x1);
        }else{
          if(that.x1!=10){
            move(-10,-10);
          }
        }
      });
      this.paper.rect(this.width-14,grooveBaseLine,14,14).attr({r:2,"stroke-width":1,"stroke":"#B9B9B9",fill:"#CACACA"}).click(function(e){
        if(550-that.x2<10){
          move(550-that.x2,550-that.x2);
        }else{
          if(that.x2!=550){
            move(10,10)
          }
        }
        that.miniStartIndex-=10;
        that.drawMiniChartLine();
      });
      //底部的拖动槽
      //this.paper.path(["M",0,grooveBaseLine,"L",this.width-10,grooveBaseLine,"L",this.width-10,grooveEndLine,"L",0,grooveEndLine,"Z"]);
      //滑动块。
      that.miniBlock=this.paper.rect(x1,grooveBaseLine,x2-x1,14).attr({r:2,"stroke-width":1,"stroke":"#B9B9B9",fill:"#CACACA"}).drag(
        function(dx,dy,x,y,e){
          move(dx,dx,true);
          dragx=dx;
        },function(){
        
        },function(){
          that.x1+=dragx;
          that.x2+=dragx;
        }
      );
      //还有左右两块path遮罩层。
    },
    moveCurrent:function(){
      var that=this;
      var x1=that.x1;
      var x2=that.x2;
      var miniPointList=that.miniPointList;
      var beginPoint,endPoint;

      for(var i=0,len=miniPointList.length;i<len;i++){
        var point=miniPointList[i];
        if(point.xAxis>x1){
          if(!beginPoint){
            beginPoint=point;
          }
          if(point.xAxis>x2&&!endPoint){
            endPoint=point;
            break;
          }
        }
      }
      if(!endPoint){
        endPoint=miniPointList[len-1];
      }


    },
    drawMinibar:function(){
      var options=this.options;
      var that=this;
      var minBlock=5;
      that.miniPointList=[];
      that.renderMiniPointList=[];
      $.getJSON(options.dataUrl+"?callback=?",{key:options.apiKey,symbol:options.symbol,period:"5y"},function(ret){
        if(ret.message&&ret.message.code=="0"){
          var datas=ret.chartlist;
          that.originDatas["10y"]=datas;
          var currentList=_.pluck(datas,"current");
          var volumeList=_.pluck(datas,"volume");

          var maxCurrent=Math.max.apply(null,currentList);//取得current 和volume的最大最小值
          var minCurrent=Math.min.apply(null,currentList);//取得current 和volume的最大最小值
          //需要减去两边槽的宽度
          var beginX=10;
          var pathArray=["M"];
          var tempDatas=that.originDatas[that.period];//把当前数据的最后一个添加到mini图中去。
          var lastData=tempDatas[tempDatas.length-1];
          var len=datas.length;
          var lastMiniData=datas[len-1];
          var renderPointNum=that.miniRenderPointNum=540/minBlock+1;
          var startIndex=that.miniStartIndex=datas.length-renderPointNum;//mini图的起始索引。
          var endIndex=startIndex+renderPointNum;
          var xGap=that.miniXGap=(that.width-20)/(renderPointNum-1);
          var preYear=1900;
          var time1=lastData.time.split(" ");
          var time2=lastMiniData.time.split(" ");
          var week1=time1[0];
          var week2=time2[0];

          var date1=time1[2];
          var date2=time2[2];
          var extraWidth=0;

          week1="Tue"

          var weekToWidth={Mon:0,Tue:0.8,Wed:0.6,Thu:0.4,Fri:0.2};//计算额外的所占的宽度。
          if(date1!=date2||week1!=week2){
            extraWidth=weekToWidth[week1]*minBlock;
            datas.push(lastData);
          }


          that.miniTimeText=that.paper.set();
          that.miniTimeLine=that.paper.set();

          for(var i=0;i<len;i++){
            var miniPoint={};
            var data=datas[i];
            var yAxis=that.grooveBaseLine+that.minibarBaseLine-that.range({start:minCurrent,end:maxCurrent},{start:that.minibarBaseLine+3,end:that.grooveBaseLine-3})(data.current);//减3是为了避免距离变现太近。
            miniPoint.yAxis=yAxis;
            miniPoint.time=data.time;
            miniPoint.current=data.current;
            miniPoint.volume=data.volume;
            var timespan=Date.parse(data.time);
            //坐标和时间对应。
            miniPoint.timespan=timespan;
            if(i>=startIndex&&i<=endIndex){
              
              var xAxis=beginX+(i-startIndex)*xGap;
              miniPoint.xAxis=xAxis;
              if(i!=startIndex){
                pathArray.push("L");
              }
              pathArray=pathArray.concat(xAxis,yAxis);
              var year=new Date(data.time).getFullYear();
              if(year!=preYear&&preYear!==1999){
                preYear=year;
                var line=that.paper.path(["M",xAxis,that.grooveBaseLine,"L",xAxis,that.volumeEndLine]).attr({stroke:"#f1f1f1"})//时间线
                that.miniTimeLine.push(line);
                var text=that.paper.text(xAxis+12,that.grooveBaseLine-8,year);
                that.miniTimeText.push(text);

                console.log(xAxis);
              }
              that.renderMiniPointList.push(miniPoint);
            }
            that.miniPointList.push(miniPoint);
          }
          that.beginTimespanTable.push({period:"10y",timespan:that.miniPointList[0].timespan});
          that.miniChartLine=that.paper.path(pathArray).attr({stroke:"#4572A7","stroke-width":"1"});
          that.drawMinibarBase(550-minBlock-extraWidth,550);
        }
      })
    },
    drawMiniChartLine:function(){
      if(this.miniStartIndex==-10){//目前如果是10的话，就表示拉到头了。
        this.miniStartIndex=0;
        return false;
      }
      if(this.miniStartIndex<0){
        this.miniStartIndex=0;
      }
      if(this.miniStartIndex+this.miniRenderPointNum>this.miniPointList.length){
        this.miniStartIndex=this.miniPointList.length-this.miniRenderPointNum;
      }
      var preYear=1999;
      var pathArray=["M"];
      var beginX=10;
      var that=this;
      var startIndex=this.miniStartIndex;
      var endIndex=startIndex+this.miniRenderPointNum;
      that.miniTimeText.remove();
      that.miniTimeLine.remove();
      that.miniTimeText=that.paper.set();
      that.miniTimeLine=that.paper.set();
      that.renderMiniPointList=[];
      for(var i=0,len=this.miniPointList.length;i<len;i++){
        var point=this.miniPointList[i];
        if(i>=startIndex&&i<endIndex){
          var xAxis=beginX+(i-startIndex)*this.miniXGap;
          this.miniPointList[i].xAxis=xAxis;
          if(i!=startIndex){
            pathArray.push("L");
          }
          pathArray=pathArray.concat(xAxis,point.yAxis);
          var year=new Date(point.time).getFullYear();
          if(year!=preYear&&preYear!==1999){
            preYear=year;
            var line=that.paper.path(["M",xAxis,that.grooveBaseLine,"L",xAxis,that.volumeEndLine]).attr({stroke:"#f1f1f1"})//时间线
            var text=that.paper.text(xAxis+12,that.grooveBaseLine-8,year);
            that.miniTimeText.push(text);
            that.miniTimeLine.push(line);
            console.log(xAxis);
          }
          that.renderMiniPointList.push(point);
        }
      }
      that.miniChartLine.animate({path:pathArray.concat(" ")},1);
    },
    bindMoveEvent:function(){
      var that=this;
      var offsetX;
      var el=$("#"+that.container).find("svg");
      if(el.length){
        offsetX=$("#"+that.container).find("svg").offset().left;
      }else{
        offsetX=$("#"+that.container).find("div").offset().left;
      }
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
              break;//找到index之后及时退出循环
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
      var el=$("#"+that.container).find("svg");
      if(!el.length){
        el=$("#"+that.container).find("div");
      }
      el.bind("mousewheel",function(e,delta){
        var offsetY=$(this).offset().top;
        var spliceNum=that.spliceNum;
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
          //最小是一天。
          if(that.xGap/that.width>=5&&flag>0&&that.period=="10y"){
            return false;
          }
          if(that.xGap/that.width>=1&&flag>0&&that.period=="6m"){
            return false;
          }
          if(that.width/that.xGap<=13&&flag>0&&that.period=="30d"){
            return false;
          }
          //判断这点还有些问题。。。
          /*
           *if(that.width/that.xGap<=40&&flag>0&&that.period=="10d"){
           *  return false;
           *}
           */
          if(that.slice){
            var moveTimeRatio=that.width*ratio/that.xGap;
            var timespanInterval=that.dataSet.pointsList[1].timespan-that.dataSet.pointsList[0].timespan;

            var moveTime=moveTimeRatio*timespanInterval;
            var leftBeginTime=that.dataSet.pointsList[0].timespan+timespanInterval*that.slice.left;
            var newLeftBeginTime=leftBeginTime+moveTime*flag;
            var tempnum=(that.dataSet.pointsList[1].timespan-newLeftBeginTime)/timespanInterval;

            var moveNum=Math.ceil(tempnum);
            that.spliceNum=that.spliceNum-(moveNum-1);
            if(that.spliceNum<0){
              that.period=that.transformPoint[that.period].next;
              var currentDatas=that.originDatas[that.period];
              var flag=true;
              for(var i=0,len=currentDatas.length;i<len;i++){
                var d=currentDatas[i];
                var timespan=Date.parse(d.time);
                if(timespan>=leftBeginTime){
                  if(flag){
                    that.spliceNum=i;
                    flag=false;
                  }
                }
                if(timespan>=that.endTimespan){
                  that.currentEndIndex=i;
                  break;
                }
              }
              datas=currentDatas;
            }else{
              that.slice.left=moveNum-tempnum;
            }
            var tempdatas=datas.slice(that.spliceNum,that.currentEndIndex+1);
            that.dataSet=that.wrapData(tempdatas,true,that.slice);
            that.reDraw(that.dataSet);
            return false;
          }
          var increaseNum=that.options.zoomRatio*that.pCount;
          that.spliceNum+=Math.floor(increaseNum*flag);
          var num;
          if(that.currentEndIndex){
            num=that.currentEndIndex-spliceNum;
          }
          var newDatas=num?datas.slice(spliceNum,that.currentEndIndex):datas.slice(spliceNum),
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
