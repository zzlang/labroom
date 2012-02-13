$(function(){
  var width=570,
      height=306,
      leftgutter=40,
      topgutter=2,
      topHeiht=206,
      title="NTES",
      pCount=50;

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
      var newArray=[];
      for(var i=0,ii=array.length;i<ii;i++){
        newArray[i]=(array[i]-sStart)*(tEnd-tStart)/(sEnd-sStart)+tStart;
      }
      return newArray;
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
      xLength=518/pCount;
  for(var i=0;i<pCount;i++){
    dataX.push(41+i*xLength);
  }



  //rect
  r.path("M40 2L557 2 557 208 40 208Z").attr({"stroke":"#000","stroke-width":"0.5px"});
  r.path("M40 215L557 215 557 291 40 291Z").attr({"stroke":"#000","stroke-width":"0.5px"});
  //quote line
  var stockPath=["M"],
      bgPath=["M"],
      rects=[],
      rectWidth=517/pCount;
  for(var i=0;i<pCount;i++){
    if(i){
      stockPath=stockPath.concat([dataX[i],dataY[i]]);
      bgPath=bgPath.concat([dataX[i],dataY[i]]);
      if(i==pCount-1){
        console.log(dataX[i]);
        bgPath=bgPath.concat([dataX[i],"208","40","208","Z"])
      }

    }else{
      stockPath=stockPath.concat([dataX[i],dataY[i]]);
      stockPath.push("L");
      bgPath=bgPath.concat([dataX[i],dataY[i]]);
      bgPath.push("L");
    }
    var x=dataX[i]-rectWidth/2;
    var rect=r.rect(x,topgutter,rectWidth,topHeiht);
    rect.x=x;
    var tempLine;
    rect.hover(function(){
      //alert("123");
      var x=this.x;
      console.log(x);
      tempLine=r.path(["M",x,topgutter,"L",x,topHeiht]);
    },function(){
      if(tempLine){
        tempLine.remove();
      }
    })
    rects.push[rect];
  }
  //stockPath.push("Z");
  r.path(stockPath);
  r.path(bgPath).attr({stroke: "none", opacity: .3, fill: "green"});
  var yTick=topHeiht/7;
  //y-lab
  for(var i=0;i<dataRowCount;i++){
    var dataLine=(dataStart+i*dataTick).toFixed(2);

    var labY=(topgutter+topHeiht-1)-yTick*i;

    r.text(leftgutter-20,labY,dataLine).attr({font: '12px Helvetica, Arial', fill: "#000"});
    r.path(["M",leftgutter,labY,"L",leftgutter+5,labY]);
  }
  //tip on quote line



  //r.path("M90 90L200 200").attr("stroke-dasharray","--..");   
})