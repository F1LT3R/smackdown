#!/usr/bin/env node

var Promise   = require('bluebird')
  , fs        = require('fs')
  , _         = require('underscore')
  , minimatch = require('minimatch')
  , less      = require('less')
  , terminal  = require('node-terminal')
  , marked    = require('marked')
  , jsdom     = require('jsdom')
  , request   = require('request')
  , config    = require('../package').config
  , flags     = require('commander')
  ;


var  GitHubStyle = __dirname+'/less/github.less';

flags
  .version(config.version)
  .option('-i, --input [type]', 'Input dir [input]', './')
  .option('-o, --output [type]', 'Output dir [output]', './')
  .option('-s, --less [type]', 'Path to Less styles [less]', GitHubStyle)
  .parse(process.argv);
  ;



// GLOBAL VARS
var input_dir       = flags.input
  , html_output_dir = flags.output
  , less_stylesheet = flags.less
  , extension       = ".md"
  ;




// process.argv.forEach(function (val, index, array) {
//   if
//   // console.log(index + ': ' + val);
// });



//  Global resolve/reject (for debugging)
  function rej (err) {
    return new Promise(function (resolve, reject) {
      terminal.color('red').write('\n____[ PROMISE REJECTED ]________________________________________\n');
      terminal.color('red').write(err);
      terminal.color('red').write('\n----------------------------------------------------------------\n');
      terminal.color('grey').write('');
      return reject(new Error(err));
    })
  }

  function res (data) {
    return new Promise(function (resolve, reject) {
      terminal.color('green').write('\n____[ PROMISE RESOLVED ]________________________________________\n');
      console.log(data);
      terminal.color('green').write('\n----------------------------------------------------------------\n');
      terminal.color('grey').write('');
      resolve(data);
    });
  }



  // Returns string 'file' or 'dir' (based on lstat)
  function isFileOrDir (pathAndFile) {
    var stats = fs.lstatSync(pathAndFile);
    
    if (stats.isFile()) {
      return 'file';
    } else if (stats.isDirectory()) {
      return 'dir';
    }
  }



  // Returns a nested array of all files (recursive)
  function collectFiles (dirList) {
    
    var files = {'.':[]}
      , path = dirList.path
      , type
      , file
      ;

    dirList.files.forEach(function (filename) {

      file = path+'/'+filename
      type = isFileOrDir(file);

      switch (type) {
        
        case 'dir':
          files[file] = collectFiles(listDir(file)); 
          break;

        case 'file':
          if (file.indexOf(extension)>-1) 
            files['.'].push(file);
          break;

      }
    });

    return files;
  }



  // Lists dir files and sub-dirs (exludes . & .. )
  function listDir (dir) {
    return {
      path: dir,
      files: fs.readdirSync(dir)
    };
  }      



  // Flattens a nested file array by an extension type
  function flatten (ary) {
    return _.flatten(ary);
  }



  function renderLessToCSS (less_css) {
    return new Promise(function (resolve, reject) {
      less.render(less_css, function (err, vanilla_css) {
        if(err !== null) return reject(err);
        resolve(vanilla_css);
      });
    });
  }



  // Reads a file as UTF8 and returns data
  function readFile (file) {
    return new Promise(function (resolve, reject) {
      fs.readFile(file, 'utf8', function (err, data) {
        if(err!==null) return reject(err);
        resolve(data);
      });
    });
  }



  function typeOf (item) {
    var type = Object.prototype.toString.call(item).split(' ')[1];
    return type.substr(0, type.length-1).toLowerCase();
  }



  function flattenTree (branch, list) {
    var list = list || []
      , path
      , item
      ;

    for (path in branch) {
      item = branch[path];
      
      switch (typeOf(item)) {
        
        case 'array':
        case 'object':
          list.concat(flattenTree(item, list));
          break;

        case 'string':
          list.push(item);
          break;
      }
    }

    return list;
  }



  function buildHTML (markdown) {
    var html = '';

    html += '<!DOCTYPE html>';
    html += '<head>';
    html += '<meta http-equiv="Content-type" content="text/html; charset=utf-8" />';
    html += '</head>';
    html += '<body>';
    html += '<article>';
    
    html += marked(markdown);
    
    html += '</article>';
    html += '</body>';

    return html;
  }



  // Writes a file as UTF8 and returns filename
  function writeFile (html, filename) {
    return new Promise(function (resolve, reject) {

    filename = filename.split(extension)[0]+'.html';
  
    fs.writeFile(filename, html, function (err, data) {
      if(err!==null) return reject(err);
      resolve(data);
    });

    });
  }




  function requestStyles (url) {
    return new Promise(function (resolve, reject) {
    
      request(url, function (err, response, body) {
        if (err!==null) return resolve(err);

        if (!err && response.statusCode == 200) {
          resolve(body);
        }
      });

    });
  };



  function exportToHTML (files) {

    // var exportList = [];

    readFile(less_stylesheet)
    // requestStyles(less_stylesheet)
    // requestStyles(less_stylesheet)
    .then(renderLessToCSS)
    .then(function (css) {
      return new Promise(function (resolve, reject){

        files.forEach(function (filename) {
          readFile(filename)
            .then(buildHTML)
            .then(updateLinks)
            .then(function (html){ return appendCSS(html, css); })
            .then(function (html){ writeFile(html, filename); })
            .catch(rej)
            ;
        });
      
        resolve(true);
      })
    })
    .then(res)
    .catch(rej)
    ;
  }

  function appendCSS (html, css) {
    return new Promise(function (resolve, reject) {

      jsdom.env(html,
        ["http://code.jquery.com/jquery.js"],
          function (err, window) {
            if (err!==null) return reject(err);
            var $ = window.$;

            $("head").append( '<style>'+css.css+'</style>');
            $("script").remove();

            resolve($('html').html());
        }
      );


    });    
  }

  function updateLinks (html) {
    return new Promise(function (resolve, reject) {

      jsdom.env(html, ["http://code.jquery.com/jquery.js"], function (err, window) {
        if (err!==null) return reject(err);
        var $ = window.$;
        $("a").each(function () {
          var $link = $(this)
            , href  = $link.attr('href')
            , http  = href.substr(0,4) === 'http'
            , hash  = href.substr(0,1) === '#'
            ;

          //$link.attr('href', href.substr(0, href.lastIndexOf('.'))+'.html');
          console.log(href, http);

          if(!http && !hash){
            $link.attr('href', href+'.html');
          }
        });
        resolve($('html').html());
      });

    });
  }


  function smackDown (dir) {  
    Promise.resolve(listDir(dir))
    .then(collectFiles)
    .then(flattenTree)
    .then(exportToHTML)
    .then(res, rej)
    .catch(rej);
    ;
  }

  smackDown(input_dir);
