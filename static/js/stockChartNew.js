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
      initDays:5,
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

    this.stateHeight=25;
    this.currentHeight=135;
    this.timeHeight=20;
    this.volumeHeight=60;
    this.volumeStateHeight=15;
    this.volumeChartHeight=45;
    this.stimeHeight=30;
    this.minibarHeight=40;

    //各个图块的起始坐标。
    this.stateBaseLine=0+0.5;
    this.currentBaseLine=this.stateBaseLine+this.stateHeight;
    this.currentEndLine=this.currentBaseLine+this.currentHeight;
    this.timeBaseLine=this.currentEndLine;
    this.volumeBaseLine=this.timeBaseLine+this.timeHeight;
    this.volumeChartBaseLine=this.volumeBaseLine+this.volumeStateHeight;
    this.volumeEndLine=this.volumeBaseLine+this.volumeHeight;
    this.stimeBaseLine=this.volumeEndLine;
    this.stimeEndLine=this.stimeBaseLine+this.stimeHeight;//stime 选择时间模块
    this.minibarBaseLine=this.stimeEndLine;

    this.grooveBaseLine=this.minibarBaseLine+26;//miniBar底部槽的初始位置。
    this.grooveEndLine=this.grooveBaseLine+14;//槽底部位置。
    this.lineColors=[{color:"#0055a2",isUsed:false},{color:"#9301c3",isUsed:false},{color:"#c3aa01",isUsed:false},{color:"red",isUsed:false}]

    this.isCompare=false;//是否对比状态
    this.compareStocks={};
    this.comparingStocks=[];
    
    this.isInit=true;//mini图是否在初始状态   x2-x1=5   &&  x2=566  从1px开始相当于每天1px;
    
    this.volumeSet=this.paper.set();//所有的volume元素集合

    this.moveInfo={};//拖动或者缩放的时候保存的一些信息。
    this.fontStyle={"fill":"#888888"};
    this.splitLineStyle={"stroke-width":"1","stroke":"#f6f6f6"};


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
      that.init(data);
    })
  }

  SNB.stockChart.prototype={
    getData:function(callback,opt){
      var options=this.options,
          period=this.period,
          opt=opt||{},
          symbol=opt.symbol,
          that=this;

      var stocks;
      if(symbol){
        stocks=that.isCompare&&that.compareStocks[symbol]&&that.compareStocks[symbol][period];
      }else{
        stocks=that.originDatas[period];
      }

      if(stocks){
        handler(stocks,opt);
      }else{
        that.isLoading=true;
        var p=period=="10d"?"30d":period,
            s,
            datas;

        if(symbol){
          s=symbol;
          datas=that.compareStocks[symbol]={};
        }else{
          s=options.symbol;
          datas=that.originDatas;
        }

        $.getJSON(options.dataUrl+"?callback=?",{key:options.apiKey,symbol:s,period:p},function(ret){
          if(ret.message&&ret.message.code=="0"){
            that.isLoading=false;
            if(period=="10d"){
              datas["10d"]=ret.chartlist.slice(-1*ret.chartlist.length/3);
              datas["30d"]=_.filter(ret.chartlist,function(data){//半个小时为基准
                return data.time.indexOf("00:00")>-1||data.time.indexOf("30:00")>-1;
              });
              if(!symbol){
                that.beginTimespanTable.push({"period":"10d",timespan:Date.parse(that.originDatas["10d"][0].time)});
                that.beginTimespanTable.push({period:"30d",timespan:Date.parse(that.originDatas["30d"][0].time)});
              }
              handler(datas["10d"],opt);
            }else{
              datas[p]=ret.chartlist;
              handler(ret.chartlist,opt);
            }
            // 6月的放这里来取了
            $.getJSON(options.dataUrl+"?callback=?",{key:options.apiKey,symbol:options.symbol,period:"6m"},function(ret){
              if(ret.message&&ret.message.code=="0"){
                that.originDatas["6m"]=ret.chartlist;
                that.beginTimespanTable.push({period:"6m",timespan:Date.parse(ret.chartlist[0].time)});
              }
            })
          }
        })
      }

      function handler(datas,opt){//处理接下来需要渲染的数据
        //that.beginTimespanTable[that.period]=Date.parse(datas[0].time);
        var renderData=[],
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
          if(opt&&opt.extra&&opt.duration){
            var bt=opt.duration.bt,
                et=opt.duration.et;

            for(var i=0,len=datas.length;i<len;i++){
              var d=datas[i],
                  t=Date.parse(d.time);



              if(t>=bt&&t<=et){
                renderData.push(d);
                if(t==bt){
                  that.spliceNum=i
                }
                if(t==et){
                  that.currentEndIndex=i;
                }
              }
            }
          }else{
            renderData=datas.slice(options.initDays/10*(-1)*datas.length);
            that.spliceNum=datas.length-renderData.length;
          }
          isSlice=true;
        }
        opt.isSlice=isSlice;
        var dataObj=that.wrapData(renderData,opt);
        callback(dataObj);   
      }
    },
    wrapData:function(dataList,opt){
      var isSlice=opt.isSlice;
      var extra=opt.extra;
      var symbol=opt.symbol;
      var isCompare=!!symbol;//是否对比
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


      var currentYLableInfo=that.getLableY(minCurrent,maxCurrent,this.currentEndLine,this.currentHeight,"current");    
      var volumeYLableInfo=that.getLableY(minVolume,maxVolume,this.volumeEndLine,this.volumeChartHeight,"volume");    

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
      if(extra){
        xGap=this.width/(pCount-1-extra.bExtra-extra.eExtra);
        beginx=0-extra.bExtra*xGap;
      }else{
        xGap=this.width/(pCount-1);
      }
      if(that.preGapPeriod){
        var preGap=that.preGapPeriod.xGap;
        var prePeriod=that.preGapPeriod.period;
      }
      that.xGap=xGap;
      that.preGapPeriod={xGap:that.xGap,period:that.period};
      that.slice=extra;

      var timeInterval=Date.parse(datas[datas.length-1].time)-Date.parse(datas[0].time);
      var dayTimespan=24*60*60*1000;
      var weekTimespan=7*dayTimespan;
      var monthTimespan=22*dayTimespan;
      var yearTimespan=365*dayTimespan;

      var span=0;


      var list=[dayTimespan,weekTimespan,monthTimespan,yearTimespan];
      function formatTime(time){
        var months={
          Jan:"01",
          Feb:"02",
          Mar:"03",
          Apr:"04",
          May:"05",
          Jun:"06",
          Jul:"07",
          Aug:"08",
          Sep:"09",
          Oct:"10",
          Nov:"11",
          Dec:"12"
        };

        var tempArray=time.split(" "),
            timeStr="";
        if(that.period=="6m"||that.period=="10y"){
          timeStr+=tempArray[5]+"-"+months[tempArray[1]]+"-"+tempArray[2];
        }else{
          timeStr+=tempArray[5]+"-"+months[tempArray[1]]+"-"+tempArray[2]+" "+tempArray[3];
        }
        return timeStr;
      }

      for(var i=0,len=list.length;i<len;i++){
        span=list[i];
        if(timeInterval/span<10){
          span=i;
          break;
        }
      }
      var basePoint=datas[0];//计算百分比的基准点
      
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
          point.formatTime=formatTime(point.time);
          point.percentage=point.current/basePoint.current-1;
          point.timespan=Date.parse(point.time);
          point.currentXAxis=beginx+i*xGap;
          point.volumeXAris=beginx+i*xGap;
          point.currentYAxis=that.currentEndLine+that.currentBaseLine-that.range(currentYLableInfo.dataRange,{start:this.currentBaseLine,end:this.currentBaseLine+this.currentHeight})(data.current);
          point.volumeYAxis=that.volumeEndLine+that.volumeChartBaseLine-that.range(volumeYLableInfo.dataRange,{start:this.volumeChartBaseLine,end:this.volumeChartBaseLine+this.volumeChartHeight})(data.volume);
          dataSet.pointsList.push(point);
        }else{
          dataSet.pointsList.push(null);//如果总点数超过当前数据量，后面的点为null,在图上不画出来。
        }    
      }
      return this.comparingStocks[symbol||options.symbol]=dataSet;
    },      //height 图标的高
    getLableY:function(minData,maxData,yStartYAxis,height,dataType){//获取y轴--也就是左侧的间隔文字和坐标
      var dataGap=maxData-minData,
          tempObj=this.convert(dataGap),
          baseNum=Math.ceil(tempObj.mantissa),
          exponent=tempObj.exponent;

      function getTick(baseNum,dataType){
        if(dataType=="current"){
          if(baseNum<4){
            tick=1;
          }else if(baseNum<8){
            tick=2;
          }else{
            tick=3;
          } 
        }else if(dataType=="volume"){
          if(baseNum<3){
            tick=2;
          }else if(baseNum<5){
            tick=3;
          }else{
            tick=5;
          }
        }else if(dataType=="percentage"){
          if(baseNum<5){
            tick=1;
          }else{
            tick=2;
          }
        }
        return tick;
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
          var unit,last,newLabel=this.convert(text),exponent=newLabel.exponent;
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
    init:function(dataObj){
      this.loading=this.paper.set();
      this.loading.push(this.paper.rect(this.width-51.5,1.5,50,this.stateHeight-5,3).attr({fill:"#89bef3",stroke:"white"}));
      this.loading.push(this.paper.text(this.width-47.5,(this.stateHeight-5)/2,"载入中...").attr({fill:"white","text-anchor":"start"}));
      this.loading.hide();
      var stocks=[{symbol:"BIDU",name:"百度"},{symbol:"AAPL",name:"苹果"},{symbol:"SINA",name:"新浪"}];
      this.compareStock(stocks);
      $("#"+this.container).parent().css({"width":this.width+3+"px"});
      this.render(dataObj);
    },
    render:function(dataObj){
      this.dataSet=dataObj;
      this.drawBase();
      this.drawLabel(dataObj);
      this.drawChart(dataObj);
      this.bindMoveEvent();
      this.mousewheel(dataObj);
      this.drawSelectTime();
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
      this.volumeSet.exclude(this.volumeSplitLineSet);
      this.volumeSet.exclude(this.volumeSplitTextSet);
      this.volumeSet.exclude(this.volumeLineSet);
      this.volumeSplitLineSet.remove()
      this.volumeSplitTextSet.remove();
      this.volumeLineSet.remove();
      this.timeStrSet.remove();
      this.timeLineSet.remove();
      if(this.currentLine&&!this.currentLine.removed){
        this.currentLine.remove();
      }
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
          that.reDrawMiniLine(x1,x2);
        }
      }
    },
    drawBase:function(){
      var that=this;
      this.currentRect=this.paper.rect(0.5,0.5,this.width,this.stateHeight+this.currentHeight).attr({"stroke-width":0,"stroke":"#d0d0d0"});
      this.volumeRect=this.paper.rect(0.5,this.volumeBaseLine,this.width,this.volumeHeight).attr({"stroke-width":0,"stroke":"#d0d0d0"});
      this.volumeSet.push(this.volumeRect);
      bindDragEvent(this.currentRect);
      bindDragEvent(this.volumeRect);

      function bindDragEvent($el){
        var tempdx=0;
        $el.drag(function(dx,dy,x,y,e){
          var increase=tempdx=(dx/6)*-1;
          that.x1+=increase;
          that.x2+=increase;

          var opt=that.getMiniTimeInterval();
          if(!that.isCompare){
            that.getData(function(dataObj){
              that.dataSet=dataObj;
              that.reDraw(dataObj,true);
              that.reDrawMiniLine(that.x1,that.x2);
              that.fillTime();
            },opt);
          }else{
            for(var symbol in that.comparingStocks){
              opt.symbol=symbol;
              that.getData(function(dataObj){
                that.drawCompareStock();
                that.reDrawMiniLine(that.x1,that.x2);
                that.fillTime();
              },opt);
            }
          }
          that.x1-=increase;
          that.x2-=increase;
        },function(){
        },function(){
          that.x1+=tempdx;
          that.x2+=tempdx;
        })
      }
      this.paper.path(["M",0.5,this.stateHeight+0.5,"H",this.width]).attr(this.splitLineStyle);
      this.volumeSet.push(this.paper.path(["M",0.5,this.volumeChartBaseLine,"H",this.width]).attr(this.splitLineStyle));
      this.volumeSet.push(this.paper.text(15.5,this.volumeChartBaseLine-7.5,"成交量").attr(this.fontStyle))//成交量
    },
    getMiniTimeInterval:function(){
      var list=this.renderMiniPointList,
          timeInterval=list[1].timespan-list[0].timespan,
          bp,ep;

      for(var i=0,len=list.length;i<len;i++){
        var p=list[i];//开始点结束点.
        if(p.xAxis>=this.x1){
          if(!bp&&i){
            if(p.xAxis==this.x1){
              bp=list[i]
            }else{
              bp=list[i-1];
            }
          }
          if(p.xAxis>=this.x2){
            if(!ep){
              ep=p;
              break;
            }
          }
        }
      }
      //初始化的时候一天对应的1px  
      var bExtra=(this.x1-bp.xAxis)/5;
      var eExtra=(ep.xAxis-this.x2)/5;

      var bt=bp.timespan+timeInterval*bExtra;
      var et=ep.timespan-timeInterval*eExtra;

      
      for(var i=0,len=this.beginTimespanTable.length;i<len;i++){
        var data=this.beginTimespanTable[i];
        if(bt>data.timespan){
          this.period=data.period;
          break
        }
      }
      return {duration:{bt:bt,et:et},extra:{bExtra:bExtra,eExtra:eExtra}};
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

      this.volumeSet.push(this.volumeSplitTextSet);
      this.volumeSet.push(this.volumeSplitLineSet);
      function draw(labels,lineSet,textSet){
        for(var i=0,len=labels.length;i<len;i++){
          var label=labels[i];
          if(i){
            lineSet.push(that.paper.path(["M",0,label.yAxis,"L",that.width,label.yAxis]).attr(that.splitLineStyle));
          }
          textSet.push(that.paper.text(that.width-12,label.yAxis-7,label.text).attr(that.fontStyle));
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
          var path=this.paper.path(["M",point.volumeXAris,point.volumeYAxis,"L",point.volumeXAris,this.volumeBaseLine+this.volumeHeight]).attr({stroke:"#c0c0c0","stroke-width":"1"});
          this.volumeLineSet.push(path);
          if(point.timeStr){
            var time=this.paper.text(point.volumeXAris,this.timeBaseLine+8,point.timeStr).attr(this.fontStyle);
            this.timeStrSet.push(time);
            var timeLine=this.paper.path(["M",point.volumeXAris,this.timeBaseLine,"L",point.volumeXAris,this.currentBaseLine]).attr(this.splitLineStyle);
            this.timeLineSet.push(timeLine);
          }
        }
      }
      this.volumeSet.push(this.volumeLineSet);
      this.currentLine=this.paper.path(pathArray).attr({stroke:"#4572A7","stroke-width":"1"});
    },
    reDrawMiniLine:function(x1,x2){
      if(x2==this.width-1&&x2-x1==5){
        this.isInit=true;
      }else{
        this.isInit=false;
      }
      var vel=this.minibarBaseLine;
      var that=this;
      var grooveBaseLine=this.grooveBaseLine;//miniBar底部槽的初始位置。
      var grooveEndLine=this.grooveEndLine;//槽底部位置。
      this.miniLine.animate({path:["M",0,vel,"L",x1,vel,"L",x1,grooveBaseLine,"L",x2,grooveBaseLine,"L",x2,vel,"L",that.width,vel].concat("")},1);
      this.miniBlock.animate({x:x1,y:grooveBaseLine,width:x2-x1},1);
      this.miniLeftCircle.animate({x:x1-4},1);
      this.miniLeftCircleLines.animate({path:["M",x1-1,vel+10,"L",x1-1,vel+20,"M",x1+1,vel+10,"L",x1+1,vel+20].concat("")});
      this.miniRightCircle.animate({x:x2-4},1);
      this.miniRightCircleLines.animate({path:["M",x2-1,vel+10,"L",x2-1,vel+20,"M",x2+1,vel+10,"L",x2+1,vel+20].concat("")});
    },
    drawSelectTime:function(selectedId,start,end){
      var that=this;
      var html=''
        + '<div class="selectTime">'
          + '<ul id="select">'
            + '<li id="1d">1天</li>'
            + '<li id="5d">5天</li>'
            + '<li id="1m">1月</li>'
            + '<li id="3m">3月</li>'
            + '<li id="6m">6月</li>'
            + '<li id="1y">1年</li>' 
            + '<li id="3y">3年</li>'
            + '<li id="5y">5年</li>'
            + '<li id="10y">10年</li>'
            + '<li id="all">全部</li>'
          + '</ul>'
          + '<div id="timeInterval">'
            + '<span>从&nbsp;<span><input type="text" id="fromDate"/><span>&nbsp;至&nbsp;</span><input type="text" class="datepicker" id="endDate"/>'
          + '</div>'
        + '</div>';  

      var selectTime=$(html);
      var container=$("#"+that.container);
      var el=$("#"+that.container).find("svg");
      var offsetX=0,offsetY=0;
      if(el.length){
        offsetX=container.find("svg").offset().left;
        offsetY=container.find("svg").offset().top;
      }else{
        offsetX=container.find("div").offset().left;
        offsetY=container.find("div").offset().top;
      }
      selectTime.appendTo($("body")).css({left:offsetX+"px",top:offsetY+that.stimeBaseLine+"px"})
      that.fillTime();
      $("#fromDate,#endDate").click(function(e){
        WdatePicker({onpicked:function(e){
          var fromDate=$("#fromDate").val();
          var endDate=$("#endDate").val();
          var beginTimespan=Date.parse(fromDate);
          var endTimespan=Date.parse(endDate);
          if(beginTimespan>endTimespan){
            $("#fromDate").addClass("error");
            $("#fromDate").focus(function(e){
              $(this).removeClass("error");
            })
            return false;
          }
          var miniPointList=that.renderMiniPointList;
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
          that.x1=miniBeginXaris;
          that.x2=miniEndXaris;
          that.reDrawMiniLine(that.x1,that.x2);
          var opt=that.getMiniTimeInterval();
          if(!that.isCompare){
            that.getData(function(dataObj){
              that.dataSet=dataObj;
              that.reDraw(dataObj,true);
              that.fillTime();
            },opt);
          }else{
            for(var symbol in that.comparingStocks){
              opt.symbol=symbol;
              that.getData(function(dataObj){
                that.drawCompareStock();
                that.fillTime();
              },opt);
            }
          }
        }})
      })
    },
    fillTime:function(){
      var points,
          that=this;
      if(that.isCompare){
        points=that.comparingStocks[that.options.symbol]&&that.comparingStocks[that.options.symbol].pointsList;
      }else{
        points=that.dataSet.pointsList
      }

      $("#fromDate").val(points[0].formatTime.split(" ")[0]);
      $("#endDate").val(points[points.length-1].formatTime.split(" ")[0]);
    },
    drawMinibarBase:function(x1,x2){
      //var vel=this.volumeEndLine;
      var vel=this.minibarBaseLine;
      //方便事件交互，把他俩绑定到全局上。
      this.x1=x1;
      this.x2=x2;
      var that=this;
      var grooveBaseLine=this.grooveBaseLine;//miniBar底部槽的初始位置。
      var grooveEndLine=this.grooveEndLine;//槽底部位置。
      
      var dragx=0;
      var leftInterval,rightInterval;
      this.miniLine=this.paper.path(["M",0,grooveBaseLine,"L",0,vel,"L",x1,vel,"L",x1,grooveBaseLine,"L",x2,grooveBaseLine,"L",x2,vel,"L",this.width,vel,"L",this.width,grooveBaseLine]).toFront().attr({stroke:"#d0d0d0"});
      var originX1=x1;
      var originX2=x2;
      //两个拖动按钮

      this.miniLeftCircleLines=this.paper.path(["M",x1-1,vel+10,"L",x1-1,vel+20,"M",x1+1,vel+10,"L",x1+1,vel+20]).attr({fill:"#ffffff",stroke:"black","stroke-width":"1"}).drag(onleftmove,onstart,onleftend);
      this.miniRightCircleLines=this.paper.path(["M",x2-1,vel+10,"L",x2-1,vel+20,"M",x2+1,vel+10,"L",x2+1,vel+20]).attr({fill:"#ffffff",stroke:"black","stroke-width":"1"}).drag(onrightmove,onstart,onrightend);

      //var leftCircle=this.miniLeftCircle=this.paper.circle(x1,vel+15,5).attr({"fill":"red"}).drag(onleftmove,onstart,onleftend);
      var leftCircle=this.miniLeftCircle=this.paper.rect(x1-4,vel+7.5,8,15).attr({r:3,"stroke-width":1,"stroke":"#B9B9B9",fill:"#ffffff",opacity:"0.1"}).drag(onleftmove,onstart,onleftend);//width:8,height:15
      //var rightCircle=this.miniRightCircle=this.paper.circle(x2,vel+15,5).attr({"fill":"red"}).drag(onrightmove,onstart,onrightend);
      var rightCircle=this.miniRightCircle=this.paper.rect(x2-4,vel+7.5,8,15).attr({r:3,"stroke-width":1,"stroke":"#B9B9B9",fill:"#ffffff",opacity:"0.1"}).drag(onrightmove,onstart,onrightend);
      //为了在停止拖动时候变更x1 x2
      var leftdx=0;
      var rightdx=0;

      var minInterval=5;//1d 最小间隔
      function onleftmove(dx,dy,x,y,e){
        if(that.x1+dx>=0&&that.x1+dx<=that.width-1){//不要超过边界。
          leftCircle.animate({x:that.x1+dx-4},1);
          leftdx=dx;
          move(dx,0);
        }
        return false;
      };
      function onrightmove(dx,dy,x,y,e){
        if(that.x2+dx>=0&&that.x2+dx<=that.width-1){
          rightCircle.animate({x:that.x2+dx-4},1);
          rightdx=dx;
          move(0,dx);
        }
        return false;
      }

      function onstart(x,y,e){
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
        if(that.x2==that.width-1&&that.x2==that.x1+5){
          that.isInit=true;
        }else{
          that.isInit=false;
        }

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
            if(that.x1<0){//避免拖出左边。
              that.x1=0;
              that.x2=5;
            }
            move(0,0);
          }
        }
        var opt=that.getMiniTimeInterval();
        if(!that.isCompare){
          that.getData(function(dataObj){
            that.dataSet=dataObj;
            that.reDraw(dataObj,true);
            that.fillTime();
          },opt);
        }else{
          for(var symbol in that.comparingStocks){
            opt.symbol=symbol;
            that.getData(function(dataObj){
              that.drawCompareStock();
              that.fillTime();
            },opt);
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

        return false;
      }
      this.paper.rect(0,grooveBaseLine,this.width,14).attr({fill:"#f3f3f3","stroke-width":1,"stroke":"#d0d0d0"});

      that.miniBlock=this.paper.rect(x1,grooveBaseLine,x2-x1,14).attr({r:2,"stroke-width":1,"stroke":"#B9B9B9",fill:"#CACACA"}).drag(
        function(dx,dy,x,y,e){
          move(dx,dx,true);
          dragx=dx;
        },function(){
        
        },function(){
          that.x1+=dragx;
          that.x2+=dragx;
          if(that.x2==that.width-1&&that.x2==that.x1+5){
            that.isInit=true;
          }else{
            that.isInit=false;
          }
          var opt=that.getMiniTimeInterval();
          if(!that.isCompare){
            that.getData(function(dataObj){
              that.dataSet=dataObj;
              that.reDraw(dataObj,true);
              that.fillTime();
            },opt);
          }else{
            for(var symbol in that.comparingStocks){
              opt.symbol=symbol;
              that.getData(function(dataObj){
                that.drawCompareStock();
                that.fillTime();
              },opt);
            }
          }
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
      $.getJSON(options.dataUrl+"?callback=?",{key:options.apiKey,symbol:options.symbol,period:"all"},function(ret){
        if(ret.message&&ret.message.code=="0"){
          var datas=ret.chartlist;
          //因为要加上当前的最后一个点
          var renderPointNum=that.miniRenderPointNum=565/minBlock;
          var tempDatas=that.originDatas[that.period];//把当前数据的最后一个添加到mini图中去。
          var lastData=tempDatas[tempDatas.length-1];
          var xGap=5;//固定的了
          var startIndex=that.miniStartIndex=datas.length-renderPointNum;//mini图的起始索引。
          var renderDatas=datas.slice((renderPointNum+1)*-1);
          var currentList=_.pluck(renderDatas,"current");
          var maxCurrent=Math.max.apply(null,currentList);//取得current 和volume的最大最小值
          var minCurrent=Math.min.apply(null,currentList);//取得current 和volume的最大最小值
          var endIndex=startIndex+renderPointNum;
          var preYear=1900;
          var time1=lastData.time.split(" ");
          var time2=renderDatas[renderDatas.length-1].time.split(" ");
          var week1=time1[0];
          var week2=time2[0];

          var date1=time1[2];
          var date2=time2[2];
          var extraWidth=0;

          week1="Tue"

          var weekToWidth={Mon:0,Tue:0.2,Wed:0.4,Thu:0.6,Fri:0.8};//计算额外的所占的宽度。
          if(date1!=date2||week1!=week2){
            extraWidth=weekToWidth[week1]*minBlock;
          }


          //需要减去两边槽的宽度
          var pathArray=["M"];
          var len=renderDatas.length;

          that.miniTimeText=that.paper.set();
          that.miniTimeLine=that.paper.set();

          var splitYearList=[];
          var len=renderDatas.length;

          for(var i=0;i<len;i++){
            var miniPoint={};
            var data=renderDatas[i];
            var yAxis=that.grooveBaseLine+that.minibarBaseLine-that.range({start:minCurrent,end:maxCurrent},{start:that.minibarBaseLine+2,end:that.grooveBaseLine-2})(data.current);//减3是为了避免距离变现太近。
            miniPoint.yAxis=yAxis;
            miniPoint.time=data.time;
            miniPoint.current=data.current;
            miniPoint.volume=data.volume;
            var timespan=Date.parse(data.time);
            //坐标和时间对应。
            miniPoint.timespan=timespan;
            if(i){
              pathArray.push("L");
            }
            var xAxis=1+i*xGap-extraWidth;
            miniPoint.xAxis=xAxis;
            pathArray=pathArray.concat(xAxis,yAxis);
            var year=new Date(data.time).getFullYear();
            if(year!=preYear){
              preYear=year;
              splitYearList.push({text:year,x:xAxis});
            }
            that.miniPointList.push(miniPoint);
            that.renderMiniPointList.push(miniPoint);
          }
          if(extraWidth){
            pathArray.push("L")
            var miniPoint={};
            var data=lastData;
            var yAxis=that.grooveBaseLine+that.minibarBaseLine-that.range({start:minCurrent,end:maxCurrent},{start:that.minibarBaseLine+2,end:that.grooveBaseLine-2})(data.current);//减3是为了避免距离变现太近。
            miniPoint.yAxis=yAxis;
            miniPoint.time=data.time;
            miniPoint.current=data.current;
            miniPoint.volume=data.volume;
            var timespan=Date.parse(data.time);
            //坐标和时间对应。
            miniPoint.timespan=timespan;
            miniPoint.xAxis=that.width-1;
            pathArray=pathArray.concat(that.width,yAxis);
            that.renderMiniPointList.push(miniPoint);
          }

          //保证最多只有五条时间线
          var ylen=splitYearList.length;
          var iv=Math.ceil(ylen/5);
          for(var i=0;i<ylen;i+=iv){
            drawYear(splitYearList[i]);
          }
          
          function drawYear(obj){
            var year=obj.text;
            var xAxis=obj.x;
            var line=that.paper.path(["M",xAxis,that.grooveBaseLine,"L",xAxis,that.minibarBaseLine]).attr({stroke:"#f1f1f1"})//时间线
            that.miniTimeLine.push(line);
            var text=that.paper.text(xAxis,that.grooveBaseLine-5,year).attr(that.fontStyle).attr({"text-anchor":"start"});
            that.miniTimeText.push(text);
          }
          that.beginTimespanTable.push({period:"all",timespan:that.miniPointList[0].timespan});
          //that.miniChartLine=that.paper.path(pathArray).attr({stroke:"#4572A7","stroke-width":"1"});
          that.miniChartLine=that.paper.path(pathArray).attr({stroke:"#dddddd","stroke-width":"1"});
          that.drawMinibarBase(that.width-6,that.width-1);
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
      this.currentRect.mousemove(function(e){
        if(that.tempCircleSet&&!that.tempCircleSet.removed){
          that.tempCircleSet.remove();
        }
        that.tempCircleSet=that.paper.set();
        //股票信息集合
        if(that.stockInfoSet&&!that.stockInfoSet.removed){
          that.stockInfoSet.remove();
        }
        that.stockInfoSet=that.paper.set();

        if(that.currentHline&&!that.currentHline.removed){
          that.currentHline.remove();
        }
        var eventX=e.pageX;
        var xAxis=eventX-offsetX;
        var points;
        if(that.isCompare){
          points=that.comparingStocks[that.options.symbol]&&that.comparingStocks[that.options.symbol].pointsList;
        }else{
          points=that.dataSet.pointsList
        }



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
              if(that.isCompare){
                var x=5;//状态栏字符开始坐标
                var y=that.stateHeight/2;
                var i=0;
                for(var symbol in that.comparingStocks){
                  var obj=that.comparingStocks[symbol];
                  var curPoint=obj.pointsList[index];
                  var tempCircle=that.paper.circle(curPoint.currentXAxis,curPoint.perYAxis,3).attr({"stroke-width":"1",stroke:"#fff",fill:obj.color})
                  that.tempCircleSet.push(tempCircle);
                  if(i==0){
                    var timeText=that.paper.text(x,y,point.formatTime).attr({"text-anchor":"start"});
                    x+=timeText.getBBox().width+10;
                  }
                  var preCircle=that.paper.circle(x,y,3).attr({"stroke-width":"1",stroke:"#fff",fill:obj.color});
                  x+=5;
                  var nameText=that.paper.text(x,y,symbol).attr({"text-anchor":"start",fill:obj.color});
                  x+=nameText.getBBox().width+5;
                  var per=curPoint.percentage,
                      c=per>0?"red":(per<0?"green":"black"),
                      perStr=(per*100).toFixed(2)+"%";

                  var currentVolumeText=that.paper.text(x,y,perStr).attr({"text-anchor":"start",fill:c});
                  x+=currentVolumeText.getBBox().width+10;
                  if(i){
                    that.stockInfoSet.push(preCircle,nameText,currentVolumeText);
                  }else{
                    that.stockInfoSet.push(timeText,preCircle,nameText,currentVolumeText);
                  }
                  i++;
                }
              }else{
                var tempCircle=that.paper.circle(point.currentXAxis,point.currentYAxis,3).attr({"stroke-width":"1",stroke:"#fff",fill:"#4572A7"});
                that.tempCircleSet.push(tempCircle);
                var x=5;//状态栏字符开始坐标
                var y=that.stateHeight/2;
                var timeText=that.paper.text(x,y,point.formatTime).attr({"text-anchor":"start"});
                x+=timeText.getBBox().width+10;
                var preCircle=that.paper.circle(x,y,3).attr({"stroke-width":"1",stroke:"#fff",fill:"#4572A7"});
                x+=5;
                var nameText=that.paper.text(x,y,"谷歌").attr({"text-anchor":"start",fill:"#4572A7"});
                x+=nameText.getBBox().width+5;
                var currentVolumeText=that.paper.text(x,y,point.current+" "+point.volume).attr({"text-anchor":"start"});
                that.stockInfoSet.push(timeText,preCircle,nameText,currentVolumeText);
                that.currentHline=that.paper.path(["M",point.currentXAxis,that.currentBaseLine,"L",point.currentXAxis,that.timeBaseLine]).attr({stroke:"#e3e3e3"})
              }
              break;//找到index之后及时退出循环
            }
          }    
        }
      })
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
    //stocks 
    compareStock:function(stocks){
      var that=this;
      var html=""
        + '<div id="compareStock">'
          + '<lable for="stockInput">对比</lable>'
          + '<input id="stockInput" name="stockInput"/>';

      $.each(stocks,function(k,v){
        var id="stock_"+v.symbol;
        html+='<input type="checkbox" data-symbol="'+v.symbol+'" id="'+id+'"/><label for="'+id+'">'+v.name+'</label>';
      })

      html+='<div id="chartOperation"><span id="chartReset">重置</span><span id="chartFullscreen" title="全屏显示">全屏</span></div></div>';
      var container=$("#"+this.container);
      container.before(html);
      $("#compareStock").delegate(":checkbox","click",function(e){
        var isChecked=$(this).is(":checked");
        var symbol=$(this).attr("data-symbol");
        if(isChecked){
          that.isCompare=true;
          if(!that.currentRised){//当前价图是否增高
            that.currentRised=true;
            that.currentEndLine+=that.volumeHeight;
            that.currentHeight+=that.volumeHeight;
            that.timeBaseLine=that.currentEndLine;
            that.volumeSet.forEach(function(set){
              if(!set.removed){
                set.hide();
              }
            })
            if(that.currentHline&&!that.currentHline.removed){
              that.currentHline.remove();
            }
            that.currentRect.animate({height:that.currentHeight+that.stateHeight});
          }
          //添加对比的时候，移除变大的坐标点
          /*
           *if(that.tempCircleSet&&!that.tempCircleSet.removed){
           *  that.tempCircleSet.remove();
           *}
           */
          var opt=that.isInit?{}:that.getMiniTimeInterval();
          opt.symbol=symbol;
          that.loading.show();
          that.getData(function(dataObj){
            that.drawCompareStock();
            that.loading.hide();
          },opt);
        }else{
          delete that.comparingStocks[symbol];
          that.comparingStocksLines.forEach(function(line){
            if(line.data("symbol")==symbol){
              that.comparingStocksLines.exclude(line);
              line.remove();
            }
          })
          if(that.comparingStocksLines.length==1){
            that.isCompare=false;
            var last=that.comparingStocksLines[0];
            last.remove();
            that.comparingStocksLines.exclude(last);
            that.currentRised=false;
            that.currentEndLine-=that.volumeHeight;
            that.currentHeight-=that.volumeHeight;
            that.timeBaseLine=that.currentEndLine;
            _.each(that.volumeSet,function(set){
              if(!set.removed){
                set.show();
              }
            })
            that.currentRect.animate({height:that.currentHeight+that.stateHeight});
            var opt=that.isInit?{}:that.getMiniTimeInterval();
            that.getData(function(dataObj){
              that.reDraw(dataObj,true);
              that.dataSet=dataObj;
            });
          }
        }
      })

      //$(html).before(container);
    },
    drawCompareStock:function(){
      var allPer=[];
      var that=this;
      for(var symbol in this.comparingStocks){
        var obj=this.comparingStocks[symbol],
            per=_.pluck(obj.pointsList,"percentage");
        allPer=allPer.concat(per);
      }
      
      var maxPer=Math.max.apply(null,allPer);
      var minPer=Math.min.apply(null,allPer);
      var labelObj=that.getLableY(minPer,maxPer,this.currentEndLine,this.currentHeight,"percentage");
      var yLabelObjs=labelObj.yLabelObjs;
      var minYLabel=yLabelObjs[yLabelObjs.length-1];//按y坐标来分----这点太混乱了，明天一定重构。
      var maxYLabel=yLabelObjs[0];
      for(var symbol in this.comparingStocks){
        var pointsList=this.comparingStocks[symbol].pointsList;
        _.map(pointsList,function(p,k){
          p.perYAxis=maxYLabel.yAxis+minYLabel.yAxis-that.range({start:maxYLabel.text,end:minYLabel.text},{start:minYLabel.yAxis,end:maxYLabel.yAxis})(p.percentage);
        })
      }
      if(!this.currentLine.removed){
        this.currentLine.remove();
      }
      if(this.comparingStocksLines&&!this.comparingStocksLines.removed){
        this.comparingStocksLines.remove();
        _.map(this.lineColors,function(color){
          color.isUsed=false;
        })
      }
      this.comparingStocksLines=this.paper.set();
      //移除老的时间线
      if(this.timeStrSet&&!this.timeStrSet.removed){
        this.timeStrSet.remove();
      }
      if(this.timeLineSet&&!this.timeLineSet.removed){
        this.timeLineSet.remove();
      }
      if(that.currentSplitLineSet&&!that.currentSplitLineSet.removed){
        that.currentSplitLineSet.remove();
      }
      if(that.currentSplitTextSet&&!that.currentSplitTextSet.removed){
        that.currentSplitTextSet.remove();
      }
      this.currentSplitLineSet=this.paper.set();
      this.currentSplitTextSet=this.paper.set();

      for(var i=0,len=yLabelObjs.length;i<len;i++){
        var label=labelObj.yLabelObjs[i];
        label.text=(label.text*100).toFixed(0)+"%";
        if(i){
          var cr="#e3e3e3";
          if(label.text==0){
            cr="black"; 
          }
          this.currentSplitLineSet.push(that.paper.path(["M",0,label.yAxis,"L",that.width,label.yAxis]).attr(this.splitLineStyle));
        }
        this.currentSplitTextSet.push(that.paper.text(that.width-12,label.yAxis-7,label.text).attr(this.fontStyle));
      }

      this.timeStrSet=this.paper.set();
      this.timeLineSet=this.paper.set();
      var flag=0;
      for(var symbol in this.comparingStocks){
        var points=this.comparingStocks[symbol].pointsList;
        var pathArray=["M"];
        for(var i=0,len=points.length;i<len;i++){
          var point=points[i];
          if(point){
            pathArray=pathArray.concat(point.currentXAxis,point.perYAxis);
            if(!i){
              pathArray.push("L");
            }
            if(point.timeStr&&!flag){
              var time=this.paper.text(point.volumeXAris,this.timeBaseLine+8,point.timeStr).attr(this.fontStyle);
              this.timeStrSet.push(time);
              var timeLine=this.paper.path(["M",point.volumeXAris,this.timeBaseLine,"L",point.volumeXAris,this.currentBaseLine]).attr(this.splitLineStyle);
              this.timeLineSet.push(timeLine);
            }
          }
        }
        var cl;
        for(var i=0,len=this.lineColors.length;i<len;i++){
          var color=this.lineColors[i];
          if(!color.isUsed){
            cl=color.color;
            color.isUsed=true;
            break;
          }
        }
        this.comparingStocks[symbol].color=cl;
        this.comparingStocksLines.push(this.paper.path(pathArray).attr({stroke:cl,"stroke-width":"1"}).data("symbol",symbol));
        flag++;
      }
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
