var http = require("http"),
    querystring = require("querystring"),
    request = require("./request");

var snowball = function(cookie, host, port, timeout) {
  var self = this;
  
  this.Request = function(path, query, fn) {
    if (query) {
      path += "?" + querystring.stringify(query);
    }
    console.log(path);
    var time1 = new Date();
    request({
      url: path,
      // headers: req.headers
      timeout: timeout||10000,
      encoding: 'utf8',
      pool: {
        maxSockets: 100000
      },
      headers: {
        cookie: cookie
      }
    }, function(error, response, body) {
      var time2 = new Date();
      if (error) {
        fn(error, body);
        return;
      }
      if (response.statusCode > 200) {
        console.log(path);
        fn(response.statusCode, body);
        return;
      }

      fn(null, body, response.headers);
    })
  };

  this.debug = true;

}

var s = module.exports = function(cookie, host, port, timeout) {
  return new snowball(cookie, host, port, timeout);
}
