var ttt = {
  canback: 1,
  //if go back
  remain: 1,
  //the chance to go back.
  cs: "X",
  //clientSymbol
  ss: "O",
  //serverSymbol
  size: 3,
  state: [],
  unPut: [],
  //the boxes that don't have anything;
  init: function(config) {
    if (config && config.toString() === "[object Object]") {
      for (var key in config) {
        this[key] = config[key];
      }
    }
    this.remain = this.canback; //init the remain chance 
    this.state = []; //init the state;
    this.unPut = []; //init the unPut coordinates;
    this.ss = (this.cs === "X" ? "O": "X");
    var tableStr = "<table id=\"control\">";
    for (var i = 0; i < this.size; i++) {
      tableStr += "<tr>";
      this.state.push([]);
      for (var j = 0; j < this.size; j++) {
        tableStr += "<td id=\"" + (i + "" + j) + "\"></td>";
        this.state[i].push(0);
        this.unPut.push(i + "" + j);
      }
      tableStr += "</tr>";
    }
    tableStr += "</table>"
    $("#container").html("").append(tableStr).append("<input type='button' id='restart' value='重新开始'/>");
    //this.bindEvent();
    return this;
  },
  getState: function(id) {
    var arr = id.split("");
    return this.state[id[0]][id[1]];
  },
  setState: function(id, val) {
    this.state[id[0]][id[1]] = val;
    return this;
  },
  bindEvent: function() {
    var that = this;
    $("#restart").live("click", function() {
      that.init();
    })
    $("td").live("mouseover", function() {
      $(this).css("background-color", "red");
    }).live("mouseout", function() {
      $(this).css("background-color", "white")
    }).live("click", function() {
      var id = this.id,
      text = $.trim(this.innerHTML),
      val = 0;
      if (text === that.cs) {
        if (that.remain > 0) {
          this.innerHTML = "";
          val = 0;
          //that.remain--;
          alert("you have " + (--that.remain) + " times to go back");
        }
        else {
          alert("sorry ,you can't go back now;");
          return false;
        }
      }
      else if (text === "") {
        this.innerHTML = that.cs;
        val = 1;
      }
      else { //if ai
        return false;
      }
      that.setState(id, val);
      that.delPut(id);
      if (that.isWin(that.size)) { //客户端的个数相加和  正的size
        alert("cons,you win this game.");
        //that.lock();
        return false;
      }
      setTimeout(function() {
        that.serverOp();
      },
      1000);
    })
  },
  lock: function() {
    $("td").die(); //if win cancel the event of td;
  },
  isWin: function(ref) {
    var beg = 0,
    end = this.size,
    endIndex = this.size - 1,
    sumL = 0,
    //左斜线和
    sumR = 0;
    for (var i = 0; i < end; i++) {
      var sumH = 0,
      //横排和
      sumV = 0; //竖排和
      for (var j = 0; j < end; j++) {
        sumH += this.state[i][j];
        sumV += this.state[j][i];
      }
      if (sumH === ref || sumV === ref) {
        return true;
      }
    }
    while (beg < end && endIndex > - 1) {
      sumR += this.state[beg][endIndex];
      sumL += this.state[beg][beg];
      beg++;
      endIndex--
    }
    if (sumL === ref || sumR === ref) {
      return true;
    }
    return false;
  },
  serverOp: function() {
    var id = this.getServerId(); //temp get the random index from the unPut array.
    $("#" + id).html(this.ss);
    this.setState(id, - 1);
    this.delPut(id);
    if (this.isWin( - 3)) {
      alert("haha,you are lost!!");
      //this.lock();
      return false;
    }
  },
  delPut: function(id) {
    for (var i = 0, len = this.unPut.length; i < len; i++) {
      if (this.unPut[i] === id) {
        this.unPut.splice(i, 1);
        len--; //delete a element therefore the length of the array will change;
      }
    }
  },
  getServerId: function() {
    var enableIds = [];
    for (var i = 0, len = this.unPut.length; i < len; i++) {
      var id = this.unPut[i];
      this.setState(id, 1); //emulate client that put the element to the nuputs;
      if (this.isWin(this.size)) { //first don't let it win;
        this.setState(id, 0);
        return id;
      }
      //have two qunee =2;
      var sumV = 0,
      sumH = 0,
      sumL = 0,
      sumR = 0,
      resultArr = [],
      v = parseInt(id[1], 10),
      h = parseInt(id[0], 10),
      result = this.size - 1;
      for (var j = 0; j < this.size; j++) {
        sumV += this.state[j][v];
        sumH += this.state[h][j];
      }
      if (sumV === result) {
        resultArr.push(sumV);
      }
      if (sumH === result) {
        resultArr.push(sumH);
      }
      var endIndex = this.size - 1,
      beg = 0,
      end = this.size;
      while (beg < end && endIndex > - 1) {
        sumR += this.state[beg][endIndex];
        sumL += this.state[beg][beg];
        beg++;
        endIndex--
      }
      if (v === h && sumL === result) { //equal
        resultArr.push(sumL);

      }
      if ((v + h) === result && sumR === result) { //sum of them is result;
        resultArr.push(sumR);
      }
      if (resultArr.length > 1) {
        this.setState(id, 0);
        enableIds.push(id);
      }
      this.setState(id, 0);
    }
    if (enableIds.length) {
      for (var i = 0; i < enableIds.length; i++) {
        var f = parseInt(enableIds[i][0], 0),
        s = parseInt(enableIds[i][1], 0),
        sum1 = 0,
        sum2 = 0,
        sumR = 0,
        sumL = 0;
        for (var j = 0; j < this.size; j++) {
          sum1 += this.state[f][j];
          sum2 += this.state[j][s];
        }
        var endIndex = this.size - 1,
        beg = 0,
        end = this.size,
        result = - this.size + 1;
        while (beg < end && endIndex > - 1) {
          sumR += this.state[beg][endIndex];
          sumL += this.state[beg][beg];
          beg++;
          endIndex--
        }
        if (sum1 === - 2 || sum2 === - 2) {
          return enableIds[i];
        }
        if (f === s && sumL === - 2) { //equal
          return enableIds[i];

        }
        if ((v + h) === 2 && sumR === - 2) { //sum of them is result;
          return enableIds[i];
        }

        if (sum1 === - 1 || sum2 === - 1) {
          return enableIds[i];
        }
        if (f === s && sumL === - 1) { //equal
          return enableIds[i];

        }
        if ((v + h) === 2 && sumR === - 1) { //sum of them is result;
          return enableIds[i];
        }

      }
    }
    var random = Math.floor(Math.random() * this.unPut.length),
    mid = (this.size - 1) / 2 + "" + (this.size - 1) / 2;
    if (this.getState(mid) === 0) { //if the middle exists,then put it;
      return mid;
    }
    return this.unPut[random]; //last return the random;
  }

}
$(function() {
  ttt.init().bindEvent();
})
