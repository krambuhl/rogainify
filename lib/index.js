import parser from 'rogain-parser';
import through from 'through2';

export default function Rogainify(filename) {
  var template = '';

  if(!(/\.rogain$/).test(filename)) return through();

  return through(function(buf, enc, next) {
    template += buf;
    next(null);    
  }, function(done) {
    parser(template)
      .then(tree => { 
        this.push("module.exports = " + JSON.stringify(tree) + ";");
        done(null);
      })
      .catch(err => done(err))
  });
}