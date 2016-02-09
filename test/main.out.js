(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/*

 Style HTML
---------------

  Written by Nochum Sossonko, (nsossonko@hotmail.com)

  Based on code initially developed by: Einar Lielmanis, <elfz@laacz.lv>
    http://jsbeautifier.org/


  You are free to use this in any way you want, in case you find this useful or working for you.

  Usage:
    style_html(html_source);

    style_html(html_source, options);

  The options are:
    indent_size (default 4)          — indentation size,
    indent_char (default space)      — character to indent with,
    max_char (default 70)            -  maximum amount of characters per line,
    brace_style (default "collapse") - "collapse" | "expand" | "end-expand"
            put braces on the same line as control statements (default), or put braces on own line (Allman / ANSI style), or just put end braces on own line.
    unformatted (defaults to inline tags) - list of tags, that shouldn't be reformatted
    indent_scripts (default normal)  - "keep"|"separate"|"normal"

    e.g.

    style_html(html_source, {
      'indent_size': 2,
      'indent_char': ' ',
      'max_char': 78,
      'brace_style': 'expand',
      'unformatted': ['a', 'sub', 'sup', 'b', 'i', 'u']
    });
*/

function style_html(html_source, options) {
//Wrapper function to invoke all the necessary constructors and deal with the output.

  var multi_parser,
      indent_size,
      indent_character,
      max_char,
      brace_style,
      unformatted;

  options = options || {};
  indent_size = options.indent_size || 4;
  indent_character = options.indent_char || ' ';
  brace_style = options.brace_style || 'collapse';
  max_char = options.max_char == 0 ? Infinity : options.max_char || 70;
  unformatted = options.unformatted || ['a', 'span', 'bdo', 'em', 'strong', 'dfn', 'code', 'samp', 'kbd', 'var', 'cite', 'abbr', 'acronym', 'q', 'sub', 'sup', 'tt', 'i', 'b', 'big', 'small', 'u', 's', 'strike', 'font', 'ins', 'del', 'pre', 'address', 'dt', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

  function Parser() {

    this.pos = 0; //Parser position
    this.token = '';
    this.current_mode = 'CONTENT'; //reflects the current Parser mode: TAG/CONTENT
    this.tags = { //An object to hold tags, their position, and their parent-tags, initiated with default values
      parent: 'parent1',
      parentcount: 1,
      parent1: ''
    };
    this.tag_type = '';
    this.token_text = this.last_token = this.last_text = this.token_type = '';

    this.Utils = { //Uilities made available to the various functions
      whitespace: "\n\r\t ".split(''),
      single_token: 'br,input,link,meta,!doctype,basefont,base,area,hr,wbr,param,img,isindex,?xml,embed,?php,?,?='.split(','), //all the single tags for HTML
      extra_liners: 'head,body,/html'.split(','), //for tags that need a line of whitespace before them
      in_array: function (what, arr) {
        for (var i=0; i<arr.length; i++) {
          if (what === arr[i]) {
            return true;
          }
        }
        return false;
      }
    }

    this.get_content = function () { //function to capture regular content between tags

      var input_char = '',
          content = [],
          space = false; //if a space is needed

      while (this.input.charAt(this.pos) !== '<') {
        if (this.pos >= this.input.length) {
          return content.length?content.join(''):['', 'TK_EOF'];
        }

        input_char = this.input.charAt(this.pos);
        this.pos++;
        this.line_char_count++;

        if (this.Utils.in_array(input_char, this.Utils.whitespace)) {
          if (content.length) {
            space = true;
          }
          this.line_char_count--;
          continue; //don't want to insert unnecessary space
        }
        else if (space) {
          if (this.line_char_count >= this.max_char) { //insert a line when the max_char is reached
            content.push('\n');
            for (var i=0; i<this.indent_level; i++) {
              content.push(this.indent_string);
            }
            this.line_char_count = 0;
          }
          else{
            content.push(' ');
            this.line_char_count++;
          }
          space = false;
        }
        content.push(input_char); //letter at-a-time (or string) inserted to an array
      }
      return content.length?content.join(''):'';
    }

    this.get_contents_to = function (name) { //get the full content of a script or style to pass to js_beautify
      if (this.pos == this.input.length) {
        return ['', 'TK_EOF'];
      }
      var input_char = '';
      var content = '';
      var reg_match = new RegExp('\<\/' + name + '\\s*\>', 'igm');
      reg_match.lastIndex = this.pos;
      var reg_array = reg_match.exec(this.input);
      var end_script = reg_array?reg_array.index:this.input.length; //absolute end of script
      if(this.pos < end_script) { //get everything in between the script tags
        content = this.input.substring(this.pos, end_script);
        this.pos = end_script;
      }
      return content;
    }

    this.record_tag = function (tag){ //function to record a tag and its parent in this.tags Object
      if (this.tags[tag + 'count']) { //check for the existence of this tag type
        this.tags[tag + 'count']++;
        this.tags[tag + this.tags[tag + 'count']] = this.indent_level; //and record the present indent level
      }
      else { //otherwise initialize this tag type
        this.tags[tag + 'count'] = 1;
        this.tags[tag + this.tags[tag + 'count']] = this.indent_level; //and record the present indent level
      }
      this.tags[tag + this.tags[tag + 'count'] + 'parent'] = this.tags.parent; //set the parent (i.e. in the case of a div this.tags.div1parent)
      this.tags.parent = tag + this.tags[tag + 'count']; //and make this the current parent (i.e. in the case of a div 'div1')
    }

    this.retrieve_tag = function (tag) { //function to retrieve the opening tag to the corresponding closer
      if (this.tags[tag + 'count']) { //if the openener is not in the Object we ignore it
        var temp_parent = this.tags.parent; //check to see if it's a closable tag.
        while (temp_parent) { //till we reach '' (the initial value);
          if (tag + this.tags[tag + 'count'] === temp_parent) { //if this is it use it
            break;
          }
          temp_parent = this.tags[temp_parent + 'parent']; //otherwise keep on climbing up the DOM Tree
        }
        if (temp_parent) { //if we caught something
          this.indent_level = this.tags[tag + this.tags[tag + 'count']]; //set the indent_level accordingly
          this.tags.parent = this.tags[temp_parent + 'parent']; //and set the current parent
        }
        delete this.tags[tag + this.tags[tag + 'count'] + 'parent']; //delete the closed tags parent reference...
        delete this.tags[tag + this.tags[tag + 'count']]; //...and the tag itself
        if (this.tags[tag + 'count'] == 1) {
          delete this.tags[tag + 'count'];
        }
        else {
          this.tags[tag + 'count']--;
        }
      }
    }

    this.get_tag = function () { //function to get a full tag and parse its type
      var input_char = '',
          content = [],
          space = false,
          tag_start, tag_end;

      do {
        if (this.pos >= this.input.length) {
          return content.length?content.join(''):['', 'TK_EOF'];
        }

        input_char = this.input.charAt(this.pos);
        this.pos++;
        this.line_char_count++;

        if (this.Utils.in_array(input_char, this.Utils.whitespace)) { //don't want to insert unnecessary space
          space = true;
          this.line_char_count--;
          continue;
        }

        if (input_char === "'" || input_char === '"') {
          if (!content[1] || content[1] !== '!') { //if we're in a comment strings don't get treated specially
            input_char += this.get_unformatted(input_char);
            space = true;
          }
        }

        if (input_char === '=') { //no space before =
          space = false;
        }

        if (content.length && content[content.length-1] !== '=' && input_char !== '>'
            && space) { //no space after = or before >
          if (this.line_char_count >= this.max_char) {
            this.print_newline(false, content);
            this.line_char_count = 0;
          }
          else {
            content.push(' ');
            this.line_char_count++;
          }
          space = false;
        }
        if (input_char === '<') {
            tag_start = this.pos - 1;
        }
        content.push(input_char); //inserts character at-a-time (or string)
      } while (input_char !== '>');

      var tag_complete = content.join('');
      var tag_index;
      if (tag_complete.indexOf(' ') != -1) { //if there's whitespace, thats where the tag name ends
        tag_index = tag_complete.indexOf(' ');
      }
      else { //otherwise go with the tag ending
        tag_index = tag_complete.indexOf('>');
      }
      var tag_check = tag_complete.substring(1, tag_index).toLowerCase();
      if (tag_complete.charAt(tag_complete.length-2) === '/' ||
          this.Utils.in_array(tag_check, this.Utils.single_token)) { //if this tag name is a single tag type (either in the list or has a closing /)
        this.tag_type = 'SINGLE';
      }
      else if (tag_check === 'script') { //for later script handling
        this.record_tag(tag_check);
        this.tag_type = 'SCRIPT';
      }
      else if (tag_check === 'style') { //for future style handling (for now it justs uses get_content)
        this.record_tag(tag_check);
        this.tag_type = 'STYLE';
      }
      else if (this.Utils.in_array(tag_check, unformatted)) { // do not reformat the "unformatted" tags
        var comment = this.get_unformatted('</'+tag_check+'>', tag_complete); //...delegate to get_unformatted function
        content.push(comment);
        // Preserve collapsed whitespace either before or after this tag.
        if (tag_start > 0 && this.Utils.in_array(this.input.charAt(tag_start - 1), this.Utils.whitespace)){
            content.splice(0, 0, this.input.charAt(tag_start - 1));
        }
        tag_end = this.pos - 1;
        if (this.Utils.in_array(this.input.charAt(tag_end + 1), this.Utils.whitespace)){
            content.push(this.input.charAt(tag_end + 1));
        }
        this.tag_type = 'SINGLE';
      }
      else if (tag_check.charAt(0) === '!') { //peek for <!-- comment
        if (tag_check.indexOf('[if') != -1) { //peek for <!--[if conditional comment
          if (tag_complete.indexOf('!IE') != -1) { //this type needs a closing --> so...
            var comment = this.get_unformatted('-->', tag_complete); //...delegate to get_unformatted
            content.push(comment);
          }
          this.tag_type = 'START';
        }
        else if (tag_check.indexOf('[endif') != -1) {//peek for <!--[endif end conditional comment
          this.tag_type = 'END';
          this.unindent();
        }
        else if (tag_check.indexOf('[cdata[') != -1) { //if it's a <[cdata[ comment...
          var comment = this.get_unformatted(']]>', tag_complete); //...delegate to get_unformatted function
          content.push(comment);
          this.tag_type = 'SINGLE'; //<![CDATA[ comments are treated like single tags
        }
        else {
          var comment = this.get_unformatted('-->', tag_complete);
          content.push(comment);
          this.tag_type = 'SINGLE';
        }
      }
      else {
        if (tag_check.charAt(0) === '/') { //this tag is a double tag so check for tag-ending
          this.retrieve_tag(tag_check.substring(1)); //remove it and all ancestors
          this.tag_type = 'END';
        }
        else { //otherwise it's a start-tag
          this.record_tag(tag_check); //push it on the tag stack
          this.tag_type = 'START';
        }
        if (this.Utils.in_array(tag_check, this.Utils.extra_liners)) { //check if this double needs an extra line
          this.print_newline(true, this.output);
        }
      }
      return content.join(''); //returns fully formatted tag
    }

    this.get_unformatted = function (delimiter, orig_tag) { //function to return unformatted content in its entirety

      if (orig_tag && orig_tag.toLowerCase().indexOf(delimiter) != -1) {
        return '';
      }
      var input_char = '';
      var content = '';
      var space = true;
      do {

        if (this.pos >= this.input.length) {
          return content;
        }

        input_char = this.input.charAt(this.pos);
        this.pos++

        if (this.Utils.in_array(input_char, this.Utils.whitespace)) {
          if (!space) {
            this.line_char_count--;
            continue;
          }
          if (input_char === '\n' || input_char === '\r') {
            content += '\n';
            /*  Don't change tab indention for unformatted blocks.  If using code for html editing, this will greatly affect <pre> tags if they are specified in the 'unformatted array'
            for (var i=0; i<this.indent_level; i++) {
              content += this.indent_string;
            }
            space = false; //...and make sure other indentation is erased
            */
            this.line_char_count = 0;
            continue;
          }
        }
        content += input_char;
        this.line_char_count++;
        space = true;


      } while (content.toLowerCase().indexOf(delimiter) == -1);
      return content;
    }

    this.get_token = function () { //initial handler for token-retrieval
      var token;

      if (this.last_token === 'TK_TAG_SCRIPT' || this.last_token === 'TK_TAG_STYLE') { //check if we need to format javascript
       var type = this.last_token.substr(7)
       token = this.get_contents_to(type);
        if (typeof token !== 'string') {
          return token;
        }
        return [token, 'TK_' + type];
      }
      if (this.current_mode === 'CONTENT') {
        token = this.get_content();
        if (typeof token !== 'string') {
          return token;
        }
        else {
          return [token, 'TK_CONTENT'];
        }
      }

      if (this.current_mode === 'TAG') {
        token = this.get_tag();
        if (typeof token !== 'string') {
          return token;
        }
        else {
          var tag_name_type = 'TK_TAG_' + this.tag_type;
          return [token, tag_name_type];
        }
      }
    }

    this.get_full_indent = function (level) {
      level = this.indent_level + level || 0;
      if (level < 1)
        return '';

      return Array(level + 1).join(this.indent_string);
    }


    this.printer = function (js_source, indent_character, indent_size, max_char, brace_style) { //handles input/output and some other printing functions

      this.input = js_source || ''; //gets the input for the Parser
      this.output = [];
      this.indent_character = indent_character;
      this.indent_string = '';
      this.indent_size = indent_size;
      this.brace_style = brace_style;
      this.indent_level = 0;
      this.max_char = max_char;
      this.line_char_count = 0; //count to see if max_char was exceeded

      for (var i=0; i<this.indent_size; i++) {
        this.indent_string += this.indent_character;
      }

      this.print_newline = function (ignore, arr) {
        this.line_char_count = 0;
        if (!arr || !arr.length) {
          return;
        }
        if (!ignore) { //we might want the extra line
          while (this.Utils.in_array(arr[arr.length-1], this.Utils.whitespace)) {
            arr.pop();
          }
        }
        arr.push('\n');
        for (var i=0; i<this.indent_level; i++) {
          arr.push(this.indent_string);
        }
      }

      this.print_token = function (text) {
        this.output.push(text);
      }

      this.indent = function () {
        this.indent_level++;
      }

      this.unindent = function () {
        if (this.indent_level > 0) {
          this.indent_level--;
        }
      }
    }
    return this;
  }

  /*_____________________--------------------_____________________*/

  multi_parser = new Parser(); //wrapping functions Parser
  multi_parser.printer(html_source, indent_character, indent_size, max_char, brace_style); //initialize starting values

  while (true) {
      var t = multi_parser.get_token();
      multi_parser.token_text = t[0];
      multi_parser.token_type = t[1];

    if (multi_parser.token_type === 'TK_EOF') {
      break;
    }

    switch (multi_parser.token_type) {
      case 'TK_TAG_START':
        multi_parser.print_newline(false, multi_parser.output);
        multi_parser.print_token(multi_parser.token_text);
        multi_parser.indent();
        multi_parser.current_mode = 'CONTENT';
        break;
      case 'TK_TAG_STYLE':
      case 'TK_TAG_SCRIPT':
        multi_parser.print_newline(false, multi_parser.output);
        multi_parser.print_token(multi_parser.token_text);
        multi_parser.current_mode = 'CONTENT';
        break;
      case 'TK_TAG_END':
        //Print new line only if the tag has no content and has child
        if (multi_parser.last_token === 'TK_CONTENT' && multi_parser.last_text === '') {
            var tag_name = multi_parser.token_text.match(/\w+/)[0];
            var tag_extracted_from_last_output = multi_parser.output[multi_parser.output.length -1].match(/<\s*(\w+)/);
            if (tag_extracted_from_last_output === null || tag_extracted_from_last_output[1] !== tag_name)
                multi_parser.print_newline(true, multi_parser.output);
        }
        multi_parser.print_token(multi_parser.token_text);
        multi_parser.current_mode = 'CONTENT';
        break;
      case 'TK_TAG_SINGLE':
        // Don't add a newline before elements that should remain unformatted.
        var tag_check = multi_parser.token_text.match(/^\s*<([a-z]+)/i);
        if (!tag_check || !multi_parser.Utils.in_array(tag_check[1], unformatted)){
            multi_parser.print_newline(false, multi_parser.output);
        }
        multi_parser.print_token(multi_parser.token_text);
        multi_parser.current_mode = 'CONTENT';
        break;
      case 'TK_CONTENT':
        if (multi_parser.token_text !== '') {
          multi_parser.print_token(multi_parser.token_text);
        }
        multi_parser.current_mode = 'TAG';
        break;
      case 'TK_STYLE':
      case 'TK_SCRIPT':
        if (multi_parser.token_text !== '') {
          multi_parser.output.push('\n');
          var text = multi_parser.token_text;
          if (multi_parser.token_type == 'TK_SCRIPT') {
            var _beautifier = typeof js_beautify == 'function' && js_beautify;
          } else if (multi_parser.token_type == 'TK_STYLE') {
            var _beautifier = typeof css_beautify == 'function' && css_beautify;
          }

          if (options.indent_scripts == "keep") {
            var script_indent_level = 0;
          } else if (options.indent_scripts == "separate") {
            var script_indent_level = -multi_parser.indent_level;
          } else {
            var script_indent_level = 1;
          }

          var indentation = multi_parser.get_full_indent(script_indent_level);
          if (_beautifier) {
            // call the Beautifier if avaliable
            text = _beautifier(text.replace(/^\s*/, indentation), options);
          } else {
            // simply indent the string otherwise
            var white = text.match(/^\s*/)[0];
            var _level = white.match(/[^\n\r]*$/)[0].split(multi_parser.indent_string).length - 1;
            var reindent = multi_parser.get_full_indent(script_indent_level -_level);
            text = text.replace(/^\s*/, indentation)
                   .replace(/\r\n|\r|\n/g, '\n' + reindent)
                   .replace(/\s*$/, '');
          }
          if (text) {
            multi_parser.print_token(text);
            multi_parser.print_newline(true, multi_parser.output);
          }
        }
        multi_parser.current_mode = 'TAG';
        break;
    }
    multi_parser.last_token = multi_parser.token_type;
    multi_parser.last_text = multi_parser.token_text;
  }
  return multi_parser.output.join('');
}

module.exports = {
  prettyPrint: style_html
};
},{}],2:[function(require,module,exports){
module.exports = function (chk, match) {
  for (var key in match)
    if (match[key] !== undefined && chk[key] !== match[key])
      return false;
  return true;
};

},{}],3:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _registry = require('./registry');

var _registry2 = _interopRequireDefault(_registry);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Config = function () {
  function Config() {
    var opts = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    _classCallCheck(this, Config);

    this.components = new _registry2.default(opts.components);
    this.helpers = new _registry2.default(opts.helpers);
    this.filters = new _registry2.default(opts.filters);
  }

  _createClass(Config, [{
    key: 'get',
    value: function get(type) {
      if (type) return this[type].get();
      return {
        components: this.components.get(),
        helpers: this.helpers.get(),
        filters: this.filters.get()
      };
    }
  }]);

  return Config;
}();

exports.default = Config;
module.exports = exports['default'];
},{"./registry":4}],4:[function(require,module,exports){
"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Registry = function () {
  function Registry(modules) {
    _classCallCheck(this, Registry);

    this.modules = {};
    this.register(modules);
  }

  _createClass(Registry, [{
    key: "get",
    value: function get(name) {
      return name ? this.modules[name] : this.modules;
    }
  }, {
    key: "register",
    value: function register(name, module) {
      if (arguments.length > 1) {
        this.modules[name] = module;
      } else if (arguments.length === 1) {
        for (var n in name) {
          this.register(n, name[n]);
        }
      }

      return this;
    }
  }, {
    key: "unregister",
    value: function unregister(name) {
      delete this.modules[name];
      return this;
    }
  }]);

  return Registry;
}();

exports.default = Registry;
module.exports = exports['default'];
},{}],5:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = Defined;

var _splitTreeAtElse = require('./splitTreeAtElse');

var _splitTreeAtElse2 = _interopRequireDefault(_splitTreeAtElse);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function Defined(tree, props) {
  var split = (0, _splitTreeAtElse2.default)(tree);
  if (tree.data) {
    if (Array.isArray(tree.data)) {
      if (tree.data.length > 0) return split[0];
    } else if (_typeof(tree.data) === 'object') {
      if (Object.keys(tree.data).length > 0) return split[0];
    } else {
      return split[0];
    }
  }
  return split[1];
};
module.exports = exports['default'];
},{"./splitTreeAtElse":13}],6:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = Each;

var _rogainUtils = require('rogain-utils');

function Each(tree, props) {
  var locals = (0, _rogainUtils.createDefaultLocals)(tree, props);
  if (Array.isArray(tree.data)) {
    return tree.data.map(function (data, index) {
      var frameData = Object.assign({}, locals, {
        '@index': index,
        '@length': tree.data.length
      });
      frameData[tree.attrs.as ? tree.attrs.as : '@item'] = data;
      return (0, _rogainUtils.createFrame)(tree.children, frameData);
    });
  }
};
module.exports = exports['default'];
},{"rogain-utils":30}],7:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = Else;
function Else() {
  return;
}
module.exports = exports['default'];
},{}],8:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = Empty;

var _splitTreeAtElse = require('./splitTreeAtElse');

var _splitTreeAtElse2 = _interopRequireDefault(_splitTreeAtElse);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function Empty(tree, props) {
  var split = (0, _splitTreeAtElse2.default)(tree);
  if (tree.data) {
    if (Array.isArray(tree.data)) {
      if (tree.data.length === 0) return split[0];
    } else if (_typeof(tree.data) === 'object') {
      if (Object.keys(tree.data).length === 0) return split[0];
    } else {
      return split[1];
    }
  }
  return split[1];
};
module.exports = exports['default'];
},{"./splitTreeAtElse":13}],9:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = If;

var _splitTreeAtElse = require('./splitTreeAtElse');

var _splitTreeAtElse2 = _interopRequireDefault(_splitTreeAtElse);

var _Defined = require('./Defined');

var _Defined2 = _interopRequireDefault(_Defined);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function If(tree, props) {
  if (!tree.attrs.value) return (0, _Defined2.default)(tree, props);
  var split = (0, _splitTreeAtElse2.default)(tree);
  if (tree.data == tree.attrs.value) return split[0];
  return split[1];
};
module.exports = exports['default'];
},{"./Defined":5,"./splitTreeAtElse":13}],10:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = Range;

var _splitTreeAtElse = require('./splitTreeAtElse');

var _splitTreeAtElse2 = _interopRequireDefault(_splitTreeAtElse);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function Range(tree, props) {
  var split = (0, _splitTreeAtElse2.default)(tree);
  var data = parseInt(tree.data, 10);
  var min = parseInt(tree.attrs.min, 10);
  var max = parseInt(tree.attrs.max, 10);
  var passing = false;

  if (!isNaN(min) && !isNaN(max)) {
    if (data >= min && data <= max) passing = true;
  } else if (!isNaN(min)) {
    if (data >= min) passing = true;
  } else if (!isNaN(max)) {
    if (data <= max) passing = true;
  }

  if (passing) return split[0];
  return split[1];
};
module.exports = exports['default'];
},{"./splitTreeAtElse":13}],11:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = Unless;

var _splitTreeAtElse = require('./splitTreeAtElse');

var _splitTreeAtElse2 = _interopRequireDefault(_splitTreeAtElse);

var _Empty = require('./Empty');

var _Empty2 = _interopRequireDefault(_Empty);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function Unless(tree, props) {
  if (!tree.attrs.value) return (0, _Empty2.default)(tree, props);
  var split = (0, _splitTreeAtElse2.default)(tree);
  if (tree.data != tree.attrs.value) return split[0];
  return split[1];
};
module.exports = exports['default'];
},{"./Empty":8,"./splitTreeAtElse":13}],12:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _Each = require('./Each');

Object.defineProperty(exports, 'Each', {
  enumerable: true,
  get: function get() {
    return _interopRequireDefault(_Each).default;
  }
});

var _If = require('./If');

Object.defineProperty(exports, 'If', {
  enumerable: true,
  get: function get() {
    return _interopRequireDefault(_If).default;
  }
});

var _Unless = require('./Unless');

Object.defineProperty(exports, 'Unless', {
  enumerable: true,
  get: function get() {
    return _interopRequireDefault(_Unless).default;
  }
});

var _Defined = require('./Defined');

Object.defineProperty(exports, 'Defined', {
  enumerable: true,
  get: function get() {
    return _interopRequireDefault(_Defined).default;
  }
});

var _Empty = require('./Empty');

Object.defineProperty(exports, 'Empty', {
  enumerable: true,
  get: function get() {
    return _interopRequireDefault(_Empty).default;
  }
});

var _Range = require('./Range');

Object.defineProperty(exports, 'Range', {
  enumerable: true,
  get: function get() {
    return _interopRequireDefault(_Range).default;
  }
});

var _Else = require('./Else');

Object.defineProperty(exports, 'Else', {
  enumerable: true,
  get: function get() {
    return _interopRequireDefault(_Else).default;
  }
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
},{"./Defined":5,"./Each":6,"./Else":7,"./Empty":8,"./If":9,"./Range":10,"./Unless":11}],13:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = splitTreeAtElse;

var _rogainTreeUtils = require('rogain-tree-utils');

function splitTreeAtElse(tree) {
  return (0, _rogainTreeUtils.splitTree)(tree.children, { type: 'helper', name: 'Else' });
}
module.exports = exports['default'];
},{"rogain-tree-utils":26}],14:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = createAttributesObject;

var _renderTree = require('./renderTree');

var _renderTree2 = _interopRequireDefault(_renderTree);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function createAttributesObject(attrs, props, config) {
  var obj = {};
  for (var a in attrs) {
    var attr = attrs[a];
    var key = attr.name;
    var value = attr.value;

    if (Array.isArray(attr.name)) key = (0, _renderTree2.default)(attr.name, props, config);
    if (attr.data) {
      if (attr.name == 'data' && attr.data.length === 1 && attr.data[0].type === 'variable') {
        value = (0, _renderTree2.default)(attr.data[0], props, config);
      } else {
        value = (0, _renderTree2.default)(attr.data, props, config);
      }
    }

    obj[key] = value;
  }
  return obj;
}
module.exports = exports['default'];
},{"./renderTree":24}],15:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = renderToString;

var _renderTree = require('./renderTree');

var _renderTree2 = _interopRequireDefault(_renderTree);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function renderToString(tree, props, config) {
  return (0, _renderTree2.default)(tree, props, config);
}
module.exports = exports['default'];
},{"./renderTree":24}],16:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = renderAttributesObject;
function renderAttributesObject(obj) {
  var str = '';
  var rejects = ['tagName'];

  for (var key in obj) {
    if (rejects.indexOf(key) === -1) {
      str += ' ' + key + '="' + obj[key] + '"';
    }
  }

  return str;
}
module.exports = exports['default'];
},{}],17:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = renderBranch;

var _renderTree = require('./renderTree');

var _renderTree2 = _interopRequireDefault(_renderTree);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function renderBranch(children, props, config) {
  return children.map(function (child) {
    return (0, _renderTree2.default)(child, props, config);
  }).join('');
}
module.exports = exports['default'];
},{"./renderTree":24}],18:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = renderComponent;

var _rogainUtils = require('rogain-utils');

var _renderTree = require('./renderTree');

var _renderTree2 = _interopRequireDefault(_renderTree);

var _createAttributesObject = require('./createAttributesObject');

var _createAttributesObject2 = _interopRequireDefault(_createAttributesObject);

var _renderAttributesObject = require('./renderAttributesObject');

var _renderAttributesObject2 = _interopRequireDefault(_renderAttributesObject);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function renderComponent(tree, props, config) {
  var component = config.components.get(tree.name);
  var cattrs = (0, _createAttributesObject2.default)(component.attrs, props, config);
  var attrs = (0, _createAttributesObject2.default)(tree.attrs, props, config);
  var tagName = attrs.tagName || component.tagName;
  var str = '';

  // concat classes
  attrs.class = cattrs.class + ' ' + attrs.class;

  str += '<' + tagName;
  str += (0, _renderAttributesObject2.default)(attrs);

  if (tree.children && tree.children.length > 0) {
    var frame = (0, _rogainUtils.createFrame)(tree.children, (0, _rogainUtils.createDefaultLocals)(tree, props));
    str += '>' + (0, _renderTree2.default)(frame, props, config);
    str += '</' + tagName;
  }

  return str + '>';
}
module.exports = exports['default'];
},{"./createAttributesObject":14,"./renderAttributesObject":16,"./renderTree":24,"rogain-utils":30}],19:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = renderFrame;

var _renderTree = require('./renderTree');

var _renderTree2 = _interopRequireDefault(_renderTree);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function renderFrame(tree, props, config) {
  var locals = Object.assign({}, props, tree.locals);
  return (0, _renderTree2.default)(tree.children, locals, config);
}
module.exports = exports['default'];
},{"./renderTree":24}],20:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = renderHelper;

var _rogainUtils = require('rogain-utils');

var _renderTree = require('./renderTree');

var _renderTree2 = _interopRequireDefault(_renderTree);

var _createAttributesObject = require('./createAttributesObject');

var _createAttributesObject2 = _interopRequireDefault(_createAttributesObject);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function renderHelper(tree, props, config) {
  var attrs = (0, _createAttributesObject2.default)(tree.attrs, props, config);
  var copy = Object.assign({}, tree, {
    data: attrs.data,
    attrs: attrs
  });

  var result = config.helpers.get(tree.name).call(null, copy, props);
  var frame = (0, _rogainUtils.createFrame)(result, (0, _rogainUtils.createDefaultLocals)(copy, props));

  return (0, _renderTree2.default)(frame, props, config);
}
module.exports = exports['default'];
},{"./createAttributesObject":14,"./renderTree":24,"rogain-utils":30}],21:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = renderTag;

var _rogainUtils = require('rogain-utils');

var _renderTree = require('./renderTree');

var _renderTree2 = _interopRequireDefault(_renderTree);

var _createAttributesObject = require('./createAttributesObject');

var _createAttributesObject2 = _interopRequireDefault(_createAttributesObject);

var _renderAttributesObject = require('./renderAttributesObject');

var _renderAttributesObject2 = _interopRequireDefault(_renderAttributesObject);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function renderTag(tree, props, config) {
  var attrs = (0, _createAttributesObject2.default)(tree.attrs, props, config);
  var str = '';

  str += '<' + tree.tagName;
  str += (0, _renderAttributesObject2.default)(attrs);

  if (tree.children && tree.children.length > 0) {
    var frame = (0, _rogainUtils.createFrame)(tree.children, (0, _rogainUtils.createDefaultLocals)(tree, props));
    str += '>' + (0, _renderTree2.default)(frame, props, config);
    str += '</' + tree.tagName;
  }

  return str + '>';
}
module.exports = exports['default'];
},{"./createAttributesObject":14,"./renderAttributesObject":16,"./renderTree":24,"rogain-utils":30}],22:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = renderText;
function renderText(tree, props, config) {
  return tree.value;
}
module.exports = exports['default'];
},{}],23:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = renderTextnode;

var _renderTree = require('./renderTree');

var _renderTree2 = _interopRequireDefault(_renderTree);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function renderTextnode(tree, props, config) {
  if (tree.value) return tree.value;
  return (0, _renderTree2.default)(tree.data, props, config);
}
module.exports = exports['default'];
},{"./renderTree":24}],24:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = renderTree;

var _renderBranch = require('./renderBranch');

var _renderBranch2 = _interopRequireDefault(_renderBranch);

var _renderFrame = require('./renderFrame');

var _renderFrame2 = _interopRequireDefault(_renderFrame);

var _renderTag = require('./renderTag');

var _renderTag2 = _interopRequireDefault(_renderTag);

var _renderComponent = require('./renderComponent');

var _renderComponent2 = _interopRequireDefault(_renderComponent);

var _renderHelper = require('./renderHelper');

var _renderHelper2 = _interopRequireDefault(_renderHelper);

var _renderTextnode = require('./renderTextnode');

var _renderTextnode2 = _interopRequireDefault(_renderTextnode);

var _renderText = require('./renderText');

var _renderText2 = _interopRequireDefault(_renderText);

var _renderVariable = require('./renderVariable');

var _renderVariable2 = _interopRequireDefault(_renderVariable);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function renderTree(tree, props, config) {
  if (tree === undefined) return;

  if (Array.isArray(tree)) {
    return (0, _renderBranch2.default)(tree, props, config);
  }

  switch (tree.type) {
    case 'frame':
      return (0, _renderFrame2.default)(tree, props, config);
    case 'tag':
      return (0, _renderTag2.default)(tree, props, config);
    case 'component':
      return (0, _renderComponent2.default)(tree, props, config);
    case 'helper':
      return (0, _renderHelper2.default)(tree, props, config);
    case 'data':
      return (0, _renderBranch2.default)(tree, props, config);
    case 'textnode':
      return (0, _renderTextnode2.default)(tree, props, config);
    case 'text':
      return (0, _renderText2.default)(tree, props, config);
    case 'variable':
      return (0, _renderVariable2.default)(tree, props, config);
  }
}
module.exports = exports['default'];
},{"./renderBranch":17,"./renderComponent":18,"./renderFrame":19,"./renderHelper":20,"./renderTag":21,"./renderText":22,"./renderTextnode":23,"./renderVariable":25}],25:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = renderVariable;
function renderVariable(tree, props, config) {
  var obj = props;
  var path = tree.path;

  for (var i = 0, path = path.split('.'), len = path.length; i < len; i++) {
    obj = obj[path[i]];
  }

  if (obj === undefined) return;

  if (Array.isArray(obj) || (typeof obj === 'undefined' ? 'undefined' : _typeof(obj)) === 'object') {
    return obj;
  }

  return obj.toString();
}
module.exports = exports['default'];
},{}],26:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _splitTree = require('./splitTree');

Object.defineProperty(exports, 'splitTree', {
  enumerable: true,
  get: function get() {
    return _interopRequireDefault(_splitTree).default;
  }
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
},{"./splitTree":27}],27:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = splitTree;

var _objectContains = require('object-contains');

var _objectContains2 = _interopRequireDefault(_objectContains);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function splitTree(trees, match) {
  if (match === undefined) {
    return trees.map(function (tree) {
      return [tree];
    });
  }

  return trees.reduce(function (memo, tree) {
    if ((0, _objectContains2.default)(tree, match)) {
      if (memo[0].length > 0) memo.push([]);
    } else {
      memo[memo.length - 1].push(tree);
    }

    return memo;
  }, [[]]);
}
module.exports = exports['default'];
},{"object-contains":2}],28:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = createDefaultLocals;
function createDefaultLocals(tree, props) {
  return {
    '@attrs': Object.assign({}, props['@attrs'], tree.attrs),
    '@children': tree.children,
    '@data': tree.data
  };
}
module.exports = exports['default'];
},{}],29:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = createFrame;
function createFrame(tree, locals) {
  return {
    type: 'frame',
    children: tree,
    locals: locals
  };
}
module.exports = exports['default'];
},{}],30:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createFrame = require('./createFrame');

Object.defineProperty(exports, 'createFrame', {
  enumerable: true,
  get: function get() {
    return _interopRequireDefault(_createFrame).default;
  }
});

var _createDefaultLocals = require('./createDefaultLocals');

Object.defineProperty(exports, 'createDefaultLocals', {
  enumerable: true,
  get: function get() {
    return _interopRequireDefault(_createDefaultLocals).default;
  }
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
},{"./createDefaultLocals":28,"./createFrame":29}],31:[function(require,module,exports){
module.exports={"type":"tag","tagName":"h3","attrs":[{"name":"class","value":"heading"}],"children":[{"type":"textnode","data":[{"type":"variable","path":"@children"}]}]}
},{}],32:[function(require,module,exports){
module.exports={"type":"tag","tagName":"a","attrs":[{"name":"href","data":[{"type":"variable","path":"href"}]},{"name":"class","value":"link"}],"children":[{"type":"textnode","data":[{"type":"variable","path":"@children"}]}]}
},{}],33:[function(require,module,exports){
module.exports={"type":"tag","tagName":"div","attrs":[{"name":"id","value":"articles"}],"children":[{"type":"tag","tagName":"p","children":[{"type":"textnode","value":"Second title: "},{"type":"tag","tagName":"span","children":[{"type":"textnode","data":[{"type":"variable","path":"articles.1.title"}]}]}]},{"type":"helper","name":"Defined","attrs":[{"name":"data","data":[{"type":"variable","path":"articles"}]}],"children":[{"type":"helper","name":"Each","attrs":[{"name":"data","data":[{"type":"variable","path":"articles"}]},{"name":"as","value":"@article"}],"children":[{"type":"tag","tagName":"article","attrs":[{"name":"data-key","data":[{"type":"variable","path":"@index"}]}],"children":[{"type":"component","name":"Heading","attrs":[{"name":"tagName","value":"h1"},{"name":"class","value":"heading-small"}],"children":[{"type":"textnode","data":[{"type":"variable","path":"@article.title"}]}]},{"type":"tag","tagName":"div","attrs":[{"name":"class","value":"meta"}],"children":[{"type":"helper","name":"If","attrs":[{"name":"data","data":[{"type":"variable","path":"@index"}]},{"name":"value","value":"0"}],"children":[{"type":"tag","tagName":"small","children":[{"type":"textnode","value":"First"}]},{"type":"helper","name":"Else"},{"type":"tag","tagName":"small","children":[{"type":"textnode","value":"Another"}]}]},{"type":"helper","name":"Unless","attrs":[{"name":"data","data":[{"type":"variable","path":"@index"}]},{"name":"value","value":"2"}],"children":[{"type":"tag","tagName":"p","children":[{"type":"textnode","data":[{"type":"variable","path":"@attrs.data"},{"type":"text","value":" not "},{"type":"variable","path":"@attrs.value"}]}]}]},{"type":"helper","name":"Range","attrs":[{"name":"data","data":[{"type":"variable","path":"@index"}]},{"name":"min","value":"1"},{"name":"max","value":"2"}],"children":[{"type":"tag","tagName":"p","children":[{"type":"textnode","data":[{"type":"variable","path":"@index"},{"type":"text","value":" between "},{"type":"variable","path":"@attrs.min"},{"type":"text","value":" and "},{"type":"variable","path":"@attrs.max"}]}]}]}]},{"type":"tag","tagName":"p","children":[{"type":"textnode","data":[{"type":"variable","path":"@article.contents"}]}]},{"type":"tag","tagName":"a","attrs":[{"name":"href","data":[{"type":"variable","path":"@article.href"}]}],"children":[{"type":"textnode","value":"Read More"}]}]}]}]},{"type":"helper","name":"Empty","attrs":[{"name":"data","data":[{"type":"variable","path":"articles"}]}],"children":[{"type":"tag","tagName":"p","children":[{"type":"textnode","value":"No Articles"}]}]}]}
},{}],34:[function(require,module,exports){
const Config = require('rogain-config');

var config = new Config()
config.helpers.register(require('rogain-core-helpers'));

module.exports = config;
},{"rogain-config":3,"rogain-core-helpers":12}],35:[function(require,module,exports){
module.exports={
  "emptyList": [],
  "articles": [{
    "title": "bread",
    "contents": "Lorem ipsum Incididunt cupidatat laborum.",
    "href": "#/bread"
  }, {
    "title": "evil dish",
    "contents": "Krommally bizol boot red hat strollen bruchwise",
    "href": "#/moooore"
  }, {
    "title": "Corn",
    "contents": "Lorem ipsum Incididunt cupidatat laborum.",
    "href": "#/bread"
  }, {
    "title": "super dish",
    "contents": "Krommally bizol boot red hat strollen bruchwise",
    "href": "#/moooore"
  }]
}
},{}],36:[function(require,module,exports){
const renderToString = require('rogain-render-string');
const html = require('html').prettyPrint;

var config = require('./config/parser.js');
var data = require('./fixtures/data.json');

config.components.register({
  Heading: require('./components/Heading.rogain'),
  Link: require('./components/Link.rogain'),
  Template: require('./components/Template.rogain')
});

var output = renderToString(config.components.get('Template'), data, config);

console.log( html(output, { unformatted: [] }) );
},{"./components/Heading.rogain":31,"./components/Link.rogain":32,"./components/Template.rogain":33,"./config/parser.js":34,"./fixtures/data.json":35,"html":1,"rogain-render-string":15}]},{},[36]);
