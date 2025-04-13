










/**************************************************
 *   NEEDS TO BE MANUALLY PLACED IN THE node_modules folder for codemirror
 *      goes in:  node_modules/codemirror/addon/mode
 * 
 *  NEEDS TO BE COPIED THERE AGAIN ANY TIME THE PACKAGE IS UPDATED
 * 
 **************************************************/





















// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: https://codemirror.net/LICENSE

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
  "use strict";



    /* Example definition of a simple mode that understands a subset of JavaScript: 

      FROM https://codemirror.net/demo/simplemode.html

    */

    CodeMirror.defineSimpleMode("simplemode", {
      // The start state contains the rules that are initially used
      start: [
        // The regex matches the token, the token property contains the type
        {regex: /"(?:[^\\]|\\.)*?(?:"|$)/, token: "string"},
        // You can match multiple tokens at once. Note that the captured
        // groups must span the whole string in this case
        {regex: /(function)(\s+)([a-z$][\w$]*)/, token: ["keyword", null, "variable-2"]},
        // Rules are matched in the order in which they appear, so there is
        // no ambiguity between this one and the one above
        {regex: /(?:function|var|return|if|for|while|else|do|this)\b/, token: "keyword"},
        {regex: /true|false|null|undefined/, token: "atom"},
        {regex: /0x[a-f\d]+|[-+]?(?:\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/i, token: "number"},
        {regex: /\/\/.*/, token: "comment"},
        {regex: /\/(?:[^\\]|\\.)*?\//, token: "variable-3"},
        // A next property will cause the mode to move to a different state
        {regex: /\/\*/, token: "comment", next: "comment"},
        {regex: /[-+\/*=<>!]+/, token: "operator"},
        // indent and dedent properties guide autoindentation
        {regex: /[\{\[\(]/, indent: true},
        {regex: /[\}\]\)]/, dedent: true},
        {regex: /[a-z$][\w$]*/, token: "variable"},
        // You can embed other modes with the mode property. This rule
        // causes all code between << and >> to be highlighted with the XML
        // mode.
        {regex: /<</, token: "meta", mode: {spec: "xml", end: />>/}}
      ],
      // The multi-line comment state.
      comment: [
        {regex: /.*?\*\//, token: "comment", next: "start"},
        {regex: /.*/, token: "comment"}
      ],
      // The meta property contains global information about the mode. It
      // can contain properties like lineComment, which are supported by
      // all modes, and also directives like dontIndentStates, which are
      // specific to simple modes.
      meta: {
        dontIndentStates: ["comment"],
        lineComment: "//"
      }
    });
  
    CodeMirror.defineSimpleMode('urlworking1', {
      start: [
        { sol: true, regex: /.*\/\//, token: 'keyword', next: 'afterScheme' },
      ],
      afterScheme: [
        { sol: true, next: 'start' },
        {regex: /[^\/]*(\/)?/, token: 'comment', next: 'afterHost' },
      ],
      afterHost: [
        { sol: true, next: 'start' },
        {regex: /[^\/]*(\/)?/, token: 'string', next: 'afterHost' },
      ]
    })
  

    CodeMirror.defineSimpleMode('urlworking2', {
      start: [
        { sol: true, regex: /(.*)(\/\/)/, token: [ 'keyword', 'variable' ], next: 'afterScheme' },
      ],
      afterScheme: [
        { sol: true, next: 'start' },
        { regex: /[\/\?]/, token: 'string', next: 'afterHost' },
        { regex: /[^\/\?]*/, token: 'comment' },
      ],
      afterHost: [
        { sol: true, next: 'start' },
        {regex: /[^\/]*(\/)?/, token: 'atom', next: 'afterHost' },
      ]
    })
    

/*
    notes about state machine operation
      see import 'codemirror/addon/mode/simple.js' for basic documentation
      see details below of how the 'token' prop references css to apply colors to matched tokens
        strings in 'token' map to css classes, which come from the 'theme' (so the colors will be different depending on the theme)
          i used the 'ssms' theme to develop the url mode

      regex is optional
      token is optional
      token can be a string OR string[]
        if string[], each item must correspond to a capture group in the regex
      sol: true - if this prop is present, regex will only match at start of a line
      ^ and $ regex anchors do not work as expected, so don't use them (not sure why)
    questions about how state machine works
      what happens if token but no regex
        => appears to be invalid
      what happens if regex has groups but also pattern outside of group?
        => the pattern outside of the group is also marked with the token
      what happens if regex but no token
        => eats the matched text, leaves it unmarked
      what happens if there is part of the source string that does not match any of the regexes?
        => matching just skips over it
      does the order of the entries matter?
        => the first one that finds a match applies, then state machine starts over

    
    coloring map

      general idea is to use colors as follows
        red - anything exceptional that i want to draw attention to
          any user:password@
          any non-http(s) scheme
          anything that the parser does not anticipate
        blue - host
        black - http(s) scheme, separators, non-url lines
        others (e.g. green and gray) for query paramater names and arguments
 
  */


      
    CodeMirror.defineSimpleMode('url', {
      start: [
        // if scheme is http(s), color black, else color red
        { sol: true, regex: /(https?)(:)/, token: [ 'variable', 'variable' ], next: 'afterScheme' },
        { sol: true, regex: /([^:]+)(:)/, token: [ 'string', 'variable' ], next: 'afterScheme' },
      ],
      afterScheme: [
        // if start of line, move state machine back to start
        { sol: true, next: 'start' },
        // if next is //, eat it, go to host
        { regex: /\/\//, token: 'variable', next: 'host' },
        // else go to path
        { next: 'path' },
      ],
      host: [
        // if start of line, move state machine back to start
        { sol: true, next: 'start' },
        // if userinfo segment, color it red
        { regex: /([^\/\?]*)(\@)/, token: [ 'string', 'variable' ] },
        // eat up to /, ? or #, color it blue
        { regex: /([^\/\?#]*)(\/)/, token: [ 'keyword', 'variable' ], next: 'path' },
        { regex: /([^\/\?#]*)(\?)/, token: [ 'keyword', 'variable' ], next: 'query' },
        { regex: /([^\/\?#]*)(#*)/, token: [ 'keyword', 'variable' ], next: 'rest' },
      ],
      path: [
        // if start of line, move state machine back to start
        { sol: true, next: 'start' },
        // eat segments up to delimeters of /, ? or # 
        // if delim is /, stay in this state, else move to query or hash state
        { regex: /([^\/\?#]*)(\/)/, token: [ 'variable', 'variable' ] },
        { regex: /([^\/\?#]*)(\?)/, token: [ 'variable', 'variable' ], next: 'query' },
        { regex: /([^\/\?#]*)(#)/, token: [ 'variable', 'variable' ], next: 'rest' },
        { regex: /([^\/\?#]*)/,     token: [ 'variable', 'variable' ], next: 'rest' },
      ],
      query: [
        // if start of line, move state machine back to start
        { sol: true, next: 'start' },
        { regex: /(#)/, token: 'variable', next: 'rest' },
        { regex: /([^\&=;]+)(=)([^\&;#]*)([\&;]*)/, token: [ 'comment', 'variable', 'atom', 'variable']},
        { next: 'rest' },
      ],
      rest: [
        // if start of line, move state machine back to start
        { sol: true, next: 'start' },
        // anything else highlight in red - 
        // if anything from the host, path, query sections fell through to here, 
        // need to see it highlighted
        // also any hash section will fall to here - not sure whether i need to pay attention to these,
        // so color red for now, to draw attention to it
        { regex: /(.*)/, token: 'string' },
        { next: 'start' },
      ]
    })


      
    CodeMirror.defineSimpleMode('httpHeaderWithType', {
      start: [
        // make type gray
        { sol: true, regex: /[a-z]+ - /, token: 'atom', next: 'afterType' },
      ],
      afterType: [
        // if start of line, move state machine back to start
        { sol: true, next: 'start' },
        { regex: /[a-z0-9-]+: /, token: 'keyword', next: 'afterName' },
      ],
      afterName: [
        // if start of line, move state machine back to start
        { sol: true, next: 'start' },
        { regex: /.*/, token: 'variable', next: 'start' },
      ],
    })

  
  });
  
  /*
  
  map of token names to colors, based on below
    keyword     blue
    comment     darkgreen
    string      red
    variable    black
    atom        darkgray
  
  copy of theme/ssms.css, for reference  as to class names and colors
  
  .cm-s-ssms span.cm-keyword { color: blue; }
  .cm-s-ssms span.cm-comment { color: darkgreen; }
  .cm-s-ssms span.cm-string { color: red; }
  .cm-s-ssms span.cm-def { color: black; }
  .cm-s-ssms span.cm-variable { color: black; }
  .cm-s-ssms span.cm-variable-2 { color: black; }
  .cm-s-ssms span.cm-atom { color: darkgray; }
  .cm-s-ssms .CodeMirror-linenumber { color: teal; }
  .cm-s-ssms .CodeMirror-activeline-background { background: #ffffff; }
  .cm-s-ssms span.cm-string-2 { color: #FF00FF; }
  .cm-s-ssms span.cm-operator, 
  .cm-s-ssms span.cm-bracket, 
  .cm-s-ssms span.cm-punctuation { color: darkgray; }
  .cm-s-ssms .CodeMirror-gutters { border-right: 3px solid #ffee62; background-color: #ffffff; }
  .cm-s-ssms div.CodeMirror-selected { background: #ADD6FF; }
  
  */
  
  
  
  
  

