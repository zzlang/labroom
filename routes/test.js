var jsp = require("uglify-js").parser;
var pro = require("uglify-js").uglify;

var orig_code = "$LAB.use('www.js').wait(function(){console.log(1)})";
var ast = jsp.parse(orig_code); // parse code and get the initial AST
console.dir(ast);
ast = pro.ast_mangle(ast); // get a new AST with mangled names
console.dir(ast);
ast = pro.ast_squeeze(ast); // get an AST with compression optimizations
console.dir(ast);
var final_code = pro.gen_code(ast); // compressed code here
console.log(final_code);
