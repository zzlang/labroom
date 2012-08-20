var SNB={};
(function($,undefined){
  window.SNB=SNB||{};
  var colors=["#F4D526","#AFDB26","#3E8BDC"];
  function insertItem(arr,index,item){
    //var array = arr.slice(0,arr.length - 1);
    if(index < 0 ) return;
    if(index > array.length) return;
    for(var i = array.length - 1 ; i >= index ; i --)
      array[i + 1] = array[i];
    array[index] = item;
    return array;
  }

  SNB.holdStockChart=function(options){
    if(!options.container||!options.dataSet){
      return;
    }
    var defaultOptions={
      width:300,
      height:200
    }

    var opt=$.extend(defaultOptions,options);
    this.init(opt);
  }
  SNB.holdStockChart.prototype={
    init:function(opt){
      this.paper=new Raphael(opt.container,opt.width,opt.height); 
      this.width=opt.width;
      this.height=opt.height;
      this.drawBase(opt);
      var list=opt.dataSet;
      dataObj=this.wrapData(list);
      drawChart(dataObj);
    },
    wrapData:function(list){
      // 先遍历，找出最长数组的key  然后补全其他的数组
      // 以最长的数组为基准

      var maxKey="",
          keys=_.sortBy(_.keys(list),function(key){
            return list[key].length;
          }),
          maxKey=keys.shift(),
          maxLength=list[maxKey].length,
          xGap=this.width/(maxLength-1),
          originYArix=[];

      /*
       *for(var key in list){
       *  if(!maxKey){
       *    maxKey=key;
       *  }
       *  if(list[maxKey].length<list[key].length){
       *    maxKey=key;
       *  }
       *}
       */
      
      _.each(list[maxKey],function(item,index){
        var xAxis=index*xGap; 
        item.xAxis=xAxis;
        var yAxis=item.yAxis=item.value;
        originYArix.push(yAxis);
        _.each(keys,function(key){
          var curList=list[key],
              curItem=curList[index];
          
          if(item.date!=curItem.date){
            var tempItem=$.extend({},item);
            tempItem.value=0;
            tempItem.yAxis=yAxis;

            insertItem(curList,index,tempItem);
          }else{
            yAxis=curItem.yAxis=yAxis+curItem.value;
            curItem.xAxis=xAxis;

            originYArix.push(yAxis);
          }
        })
      })
    },
    drawBase:function(opt){
    
    },
    drawChart:function(dataObj){
    
    },
    bindEvent:function(){
    
    }
  }
}($))
