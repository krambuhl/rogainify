import Parser from 'rogain-parser';
import through from 'through2';

export default function Rogainify(filename, options = {}) {
  var parser = new Parser(options.config || { });
  var template = '';

  if(!(/\.rogain$/).test(filename)) return through();

  return through(function(buf, enc, next) {
    template += buf;
    next();    
  }, function(done) {
    parser.parse(template)
      .then(tree => { 
        this.push(createModule(tree));
        done();
      })
      .catch(err => console.error(err))
  });
}

function createModule(tree) {
  return "module.exports=" + JSON.stringify(tree)
}