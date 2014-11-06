
// REQUIRE
var //Promise   = require("bluebird")
    Promise   = require("bluebird")
  , fs        = require('fs')
  , _         = require('underscore')
  , minimatch = require('minimatch')
  , less      = require('less')
  , terminal  = require('node-terminal')
  , marked    = require('marked')
  , config    = require('../package').config
  ;


// GLOBAL VARS
var input_dir       = config.input_dir
  , html_output_dir = config.html_output_dir
  , less_stylesheet = config.less_stylesheet
  , extension       = ".md"
  ;



  // Global resolve/reject (for debugging)
  function rej (err) {
    return new Promise(function (resolve, reject){
      terminal.color('red').write('PROMISE REJECTED :(\n');
      terminal.color('grey').write(err);
      return reject(new Error(err));
    })
  }

  function res (data) {
    return new Promise(function (resolve, reject){
      terminal.color('green').write('PROMISE RESOLVED :)\n');
      terminal.color('grey').write('');
      console.log(data)
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






  function exportToHTML (markdownList) {

    var savedFiles = [];


    markdownList.forEach(function (post) {


    //     // fs.readFile(post.file, 'utf8', function (err,data) {
    //     //   if (err) { return console.log(err); }
        
    //     //   var page = '';
    //     //   page += '<!DOCTYPE html>';
    //     //   page += '<head>';
    //     //   page += css_styles;
    //     //   page += '</head>';
    //     //   page += '<body>';
    //     //   page += '<article>';
    //     //   page += marked(data);
    //     //   page += '</article>';
    //     //   page += '</body>';

    //     //   // fs.writeFile(html+'/posts/'+post.title+'.html', page, function(err) {
    //     //   //     if(err) {
    //     //   //         console.log(err);
    //     //   //     } else {
    //     //   //       saved.push(post.title);
    //     //   //         console.log("The file '"+post.title+"' was saved!");
    //     //   //     }
    //     //   //  }); 
        
    //     // });

    //   }); 

    });
    
    
    return savedFiles;
  }




  function renderLessToCSS (less_css) {
    return new Promise(function (resolve, reject) {
      less.render(less_css, function (err, vanilla_css) {
        if(err !== null) return reject(err);
        resolve(vanilla_css);
      });
    });
  }

  function getStyleBlock (less_stylesheet) {
    // return new Promise(function (resolve, reject) {
      // resolve(readFile(less_stylesheet));
        // resolve('<style>'+renderLessToCSS(css)+'</style>');
    // });
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

  // function flattenTree (tree) {

  //   return flatten(tree);
  // }


  function renderBlog (dir) {  

    // getStyleBlock(less_stylesheet).then(reject, resolve);
    // var styleBlock = readFile(less_stylesheet)
    //   .then(renderLessToCSS)
    //   .then(function(data){
    //     // console.log(data);
    //     return data;
    //   }, _rej);

    // console.log(styleBlock);

    Promise.resolve(listDir(dir))
    .then(collectFiles)
    .then(flattenTree)
    // .then(exportToHTML)
    .then(res)
    .catch(rej);
    ;
    
    
  }

  renderBlog(input_dir);