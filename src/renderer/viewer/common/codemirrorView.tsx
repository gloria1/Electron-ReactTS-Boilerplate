import React, { Ref, useCallback, useEffect, useRef, useState } from 'react';

import { observer } from 'mobx-react'

import { ControlGroup } from '@blueprintjs/core'

import { CVMode, CVModeTransformers, SizePropsPx } from './commonApp'


import { EditorView  } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { undo } from '@codemirror/commands'

// based on inspecting element at bottom of https://codemirror.net/examples/lang-package/
import { styleTags, tags as lezerTags } from '@lezer/highlight'
import { LRLanguage, LanguageSupport } from '@codemirror/language'
import { javascript } from '@codemirror/lang-javascript'
import { html } from '@codemirror/lang-html'
import { css } from '@codemirror/lang-css'
import { json } from '@codemirror/lang-json'

import CodeMirror, { ReactCodeMirrorRef } from '@uiw/react-codemirror'
import { useCodeMirror } from '@uiw/react-codemirror'

// to generate the *_parser files
//  https://codemirror.net/examples/lang-package/
//  https://lezer.codemirror.net/docs/guide/
//  https://lezer.codemirror.net/docs/guide/#building-a-grammar
//    start by creating a .grammar file
//    do (on command line, or as part of yarn command in package.json)
//      node node_modules/@lezer/generator/dist/lezer-generator.cjs <.grammar file> -o <.js file to create>
import { parser as header_parser } from './header_parser'
import { parser as pattern_parser } from './hostDomainPattern_parser'
import { parser as url_parser } from './URL_parser'
import { ViewerPane } from '../ttable/Pres ViewerPane';




// define highlighting
// see 
//  https://codemirror.net/examples/lang-package/
//  https://lezer.codemirror.net/docs/ref/#highlight
// typeName - green
// variableName - black
// string - darker red
// escape - medium red
// comment - 
// name - black
// labelName - purplish blue
// url - royal blue
// link - black w/ underscore
// strong - black w/ bold
// heading1 - black w/ bold and underscore
// emphasis - black w/ italic


var parserWithHighlightingURL = url_parser.configure({
  props: [
    styleTags({
      HeaderLine: lezerTags.variableName,
      Scheme: lezerTags.escape,
      Host: lezerTags.variableName,
      Path: lezerTags.typeName,
      Args: lezerTags.labelName,
    })
  ]
})

var parserLanguageURL = LRLanguage.define({
  parser: parserWithHighlightingURL,
  languageData: {}
})

function parserFunctionURL() {
  return new LanguageSupport(parserLanguageURL)
}


var parserWithHighlightingHeader = header_parser.configure({
  props: [
    styleTags({
      Type: lezerTags.labelName,
      Name: lezerTags.name,
      Value: lezerTags.typeName,
    })
  ]
})

var parserLanguageHeader = LRLanguage.define({
  parser: parserWithHighlightingHeader,
  languageData: {}
})

function parserFunctionHeader() {
  return new LanguageSupport(parserLanguageHeader)
}

var parserWithHighlightingPattern = pattern_parser.configure({
  props: [
    styleTags({
      Comma: lezerTags.variableName,
      Host: lezerTags.labelName,
      Domain: lezerTags.escape,
      Regex: lezerTags.heading1,
      Comment: lezerTags.typeName,
    })
  ]
})

var parserLanguagePattern = LRLanguage.define({
  parser: parserWithHighlightingPattern,
  languageData: {}
})

function parserFunctionPattern() {
  return new LanguageSupport(parserLanguagePattern)
}


const mapCVModeToCMExtension: { [index: string]: any  } = {
  none: undefined,
  url: parserFunctionURL(),
  sortedUrl: parserFunctionURL(),
  httpHeader: parserFunctionHeader(),
  hostDomainPattern: parserFunctionPattern(),
  js: javascript({ jsx: true}),
  json: json(),
  html: html(),
  css: css(),
  sorted: undefined
}



const cl = console.log
const ct = console.table



export interface CodeMirrorViewProps {
  value: string,
  mode: CVMode
  size?: SizePropsPx        // sizing for component INCLUDING the match bar above the actual CodeMirror component
                            // if these are missing, will use default values for height, width
  editable: boolean
  lineWrapping?: boolean    // passed as option to codemirror - if omitted, will be false
  // function that will be called on every change event
  onChangeHandler?: (newValue: string)=>void                          
}




const CodeMirrorView = observer((props: CodeMirrorViewProps)=>{
  const { size } = props
  const [ contentDims, updateContentDims ] = useState( { lines: 0, maxLen: 0 } )

  // default px value to use for sizing, if suitable props not provided
  const defaultSizePx = 200  // value to use for height/width if no other basis present in props

  // various constants used in sizing calculations
  // codemirror element dimensions observed using devtools element inspector:
  //                              zoom 100%     zoom 80%
  //                              (all dims in pixels)
  //  top/bottom margin             ~4            ~4
  //  search panel                565h/51.67w   565h/49.79h
  //  scrollbars                    ~15           ~15
  //  gutter
  //    line number width          8+charWd     8+charWd
  //    fold marker                 10.43         10.43
  //  character width                8.41         8.41
  //  line height                   19.59         19.6

  // note for future:
  //   if we need to tweak for browser zoom level, it is possible to detect zoom level by calculating
  //      window.outerWidth / window.innerWidth
  //cl(`apparent browser zoom level: ${window.outerWidth / window.innerWidth}`)  // would subtract from outerWidth to account for scrollbar, if there was one
  //   this is apparently not 'official' behavior, and the result it returns is subject to numerical fuzz because it divides integer pixel numbers


  const verticalMargin = 8
  const cmCharWdPx = 8.41  // varies with browser zoom %
  const scrollBarSizePx = 15
  const lineNumberFixedWd = 18
  const foldMarkerWd = 10.43
  // will only provide for fold markers in codemirror modes that will have fold markers
  const hasFoldMarkers = (props.mode === 'js') || (props.mode === 'html') || (props.mode === 'css') || (props.mode === 'json')
  const cmLineHtPx = 19.6   // varies with browser zoom % 
  const cmSearchPanelHtPx = 52  // determined by inspecting element
  const cmSearchPanelWdPx = 565 // determined by inspecting element 
  const cmTopBottomMargin = 8

  // this will be the size of the match bar + the CodeMirror instance
  // initializes to default values, will be overridden if size prop provided
  const finalSize: { totalHeightPx: number, totalWidthPx: number } = { totalHeightPx: defaultSizePx, totalWidthPx: defaultSizePx }
  const finalSize2: SizePropsPx = { height: { unit: 'px', constraint: 'fixed', value: defaultSizePx }, width: { unit: 'px', constraint: 'fixed', value: defaultSizePx } }


  // local copies of Codemirror state and view
  // will be populated by myRef useCallback
  // NOTE react-codemirror github page shows example that does something similar, but with useEffect - 
  // I tried it and it doesn't work for some reason, but this seems to work
  var cmEditor: any | undefined  // don't know what the right typing is for this - maybe HTMLDivElement? - figure it out if we need to use it for something
  var cmState: EditorState | undefined
  var cmView: EditorView | undefined
 
  const myRef = useCallback((node: any) => {
    if (node !== null) {
      cmEditor = node.editor
      cmState = node.state
      cmView = node.view
    }
  }, [])

  // example of scrolling view to specific position   // test example: force selection to position 5 and scroll it into view
  // example of scrolling view to specific position   if (cmView !== undefined) {
  // example of scrolling view to specific position     cmView.dispatch(
  // example of scrolling view to specific position       {
  // example of scrolling view to specific position         selection: { anchor: 5 },
  // example of scrolling view to specific position         scrollIntoView: true,
  // example of scrolling view to specific position       }
  // example of scrolling view to specific position     )      
  // example of scrolling view to specific position   }

  const onChange = React.useCallback((value: any, viewUpdate: any) => {
    if (props.editable) {
      if (props.onChangeHandler !== undefined) {
        props.onChangeHandler(value)
      }
    }
    else {
      // undo change in editor
      // THIS DOESN'T WORK - DON'T KNOW WHY
      // if ((cmState !== undefined) && (cmView !== undefined)) undo( { state: cmState, dispatch: cmView.dispatch } )
    }



  }, [])

  useEffect(()=>{
    const contentLines = props.value.split('\n')
    var contentMaxLineLength = 0
    contentLines.forEach((l: string) => {
      contentMaxLineLength = Math.max(contentMaxLineLength, l.length)
    })
    //cl(`content lines, max len: ${contentLines.length} ${contentMaxLineLength}`)
    updateContentDims({ lines: contentLines.length, maxLen: contentMaxLineLength })


  }, [ props.value ])

  /*
    how CodeMirrorView sizing works (see testers/cra-tester-mobx-codemirror for a testing environment)
    (this was written based on Codemirror v5, have not checked if still accurate for Codemirror v6)
      if CodeMirror is given sizing in %, then 
        if the immediate parent is sized in absolute units, codemirror fits itself properly
        otherwise (i.e., if parent is sized based on its children), codemirror will size itself based on its entire content, 
          and even if an indirect parent clips the overflow, codemirror's scrollbars will be out of view,
          and also codemirror will render spans for all of its lines, which gets (very) slow for large content

      so, giving the direct parent a fixed size always works

      however, to also have CodeMirror auto-shrink to something smaller, for small content
        the parent needs to check the size of the content (line count and max line length)
        and size itself accordingly
        including that parent can simply omit sizing parameters and thus get its sizing from however codemirror sizes itself

  */

  //cl(`CodeMirrorView size prop:\n  ${JSON.stringify(size)}`)

  // if sizing prop provided...
  if (size !== undefined) {
    const gutterWdPx = contentDims.lines.toString().length * cmCharWdPx + lineNumberFixedWd + (hasFoldMarkers ? foldMarkerWd : 0)
    // general algorithm
    //  first take default value
    //  compute unconstrained size = content size + fixed gui parts
    //  handle height
    //      if prop.constraint is fixed, just use the value
    //      else need to see if actual size based on content+fixed gui parts is smaller
    //        measure size of content on this dimension, plus provision for fixed gui parts (match bar, gutters, etc)
    //        if measured size is less, use that
    //      if finalsize < unconstrained size, set willBe***Scrollbar
    //  handle width
    //    as above, including provision for vert scroll bar if present
    //  revise height/width if scrollbars
    var willBeVertScrollbar = false
    var willBeHorzScrollbar = false
    var htPx
    var wdPx
    var unConstrainedHtPx = (contentDims.lines  * cmLineHtPx) + verticalMargin + scrollBarSizePx
    // add provision for search panel, only if content is not vary small
    if ((contentDims.lines > 10) || (contentDims.maxLen > 80)) unConstrainedHtPx += cmSearchPanelHtPx 
    var unConstrainedWdPx = (contentDims.maxLen * cmCharWdPx) + gutterWdPx     + scrollBarSizePx // will provide for search panel width below
    // handle height (assuming no horz scrollbar - will adjust for that after doing width)
    if (size.height.constraint === 'fixed') htPx = size.height.value
    else {
      if (unConstrainedHtPx < size.height.value) htPx = unConstrainedHtPx
      else {
        willBeVertScrollbar = true
        htPx = size.height.value
      }
    }
    // handle width
    if (size.width.constraint === 'fixed') wdPx = size.width.value
    else {
      if (unConstrainedWdPx < size.width.value) wdPx = unConstrainedWdPx
      else {
        willBeHorzScrollbar = true
        wdPx = size.width.value
      }
    }
    // go back and adjust height/width if there are scroll bars
    if (willBeVertScrollbar) {
      // if width without scrollbars + scrollbar size > width prop, set willBeHorzScrollBar to true (may have already been true)
      if ((wdPx + scrollBarSizePx) > size.width.value) willBeHorzScrollbar = true 
      wdPx = Math.min(wdPx + scrollBarSizePx, size.width.value)
    }
    if (willBeHorzScrollbar) {
      // if height without scrollbar + scrollbar size > height prop, set willBeVertScrollBar to true (may have already been true)
      if ((htPx + scrollBarSizePx) > size.height.value) willBeVertScrollbar = true
      htPx = Math.min(htPx + scrollBarSizePx, size.height.value)
    }
    // need to check for vert scroll bar again - may have been false at the first check
    if (willBeVertScrollbar) {
      wdPx = Math.min(wdPx + scrollBarSizePx, size.width.value)
    }

    finalSize2.height.value = htPx
    finalSize2.width.value  = wdPx
    // make sure wide enough for search bar - only if size prop for width is 'max' and content is not small
    if (size.width.constraint === 'max') 
      if ((contentDims.lines > 10) || (contentDims.maxLen > 80)) finalSize2.width.value = Math.max(wdPx, cmSearchPanelWdPx)
    

  }

  //cl(`CodeMirroView contentDims:\n ${JSON.stringify(contentDims)}`)
  //cl(`  contentDims implies total size of height: ${contentDims.lines * cmLineHtPx}, width: ${contentDims.maxLen * cmCharWdPx}`)

  //cl(`CodeMirrorView returning`)


  return (
    <ViewerPane
      size={finalSize2}
      content={
        (size: SizePropsPx) => 
        <CodeMirror
          ref={myRef as unknown as Ref<ReactCodeMirrorRef> | undefined}
          height={`${finalSize2.height.value}px`}
          width={`${finalSize2.width.value}px`}
          value={props.value}
          onChange={onChange}
          extensions={ (mapCVModeToCMExtension[props.mode] === undefined) ? [] : [mapCVModeToCMExtension[props.mode]]}
          autoFocus={true}
          // DON'T DO THIS - LEAVE AT DEFAULT WHICH IS EDITABLE, BECAUSE THAT ENABLES AUTOFOCUS, BRACKET MATCHING, SEARCH PANEL      editable={props.editable}
          basicSetup={{
            searchKeymap: true
          }}
        />
      }
    />
// OBSOLETE    <div>
// OBSOLETE      <div
// OBSOLETE        style={ {
// OBSOLETE            height: `${finalSize2.height.value}px`,
// OBSOLETE            width:  `${finalSize2.width.value}px`
// OBSOLETE        } }
// OBSOLETE      >
// OBSOLETE
// OBSOLETE        <div
// OBSOLETE        >
// OBSOLETE          <CodeMirror
// OBSOLETE            ref={myRef as unknown as Ref<ReactCodeMirrorRef> | undefined}
// OBSOLETE            height={`${finalSize2.height.value}px`}
// OBSOLETE            width={`${finalSize2.width.value}px`}
// OBSOLETE            value={props.value}
// OBSOLETE            onChange={onChange}
// OBSOLETE            extensions={ (mapCVModeToCMExtension[props.mode] === undefined) ? [] : [mapCVModeToCMExtension[props.mode]]}
// OBSOLETE            autoFocus={true}
// OBSOLETE            // DON'T DO THIS - LEAVE AT DEFAULT WHICH IS EDITABLE, BECAUSE THAT ENABLES AUTOFOCUS, BRACKET MATCHING, SEARCH PANEL      editable={props.editable}
// OBSOLETE            basicSetup={{
// OBSOLETE            }}
// OBSOLETE          />
// OBSOLETE        </div>
// OBSOLETE      </div>
// OBSOLETE    </div>
  )
})


export default CodeMirrorView




/*
OLDER STUFF FROM CODEMIRROR 5 IMPLEMENTATION


// OBSOLETE ??? // this is the type for a Codemirror class instance
// OBSOLETE ??? // based on typing for class ReactCodeMirror in node_modules/@uiw/react-codemirror/typings/index.d.ts
// OBSOLETE ??? // previously we had just used the 'CodeMirror' imported from @uiw/react-codemirror above
// OBSOLETE ??? // to be the  CodeMirror class
// OBSOLETE ??? // however, when i set up the extension3 project from a different boilerplate,
// OBSOLETE ??? // i got typescript compile errors complaining about CodeMirror being used as both a namespace and a class
// OBSOLETE ??? // i am not sure exactly what the nature of the problem is or what the 'correct' solution to the problem would be
// OBSOLETE ??? // so, as a workaround, i am just creating my own interface definition here
// OBSOLETE ??? // (the 'CodeMirror' imported above is still used in my code below as a React component declaration)
// OBSOLETE ??? interface MyReactCodemirror extends React.Component<IReactCodemirror> {
// OBSOLETE ???   editor: Editor;
// OBSOLETE ???   //static defaultProps: IReactCodemirror;
// OBSOLETE ???   render(): JSX.Element;
// OBSOLETE ??? }



***************************************************************
**  FOR PROTOTYPE, SEE testers/cra-tester-mobx/codemirror  ****
***************************************************************
***************************************************************************************
**  need to manually update files in node_modules/codemirror:  ************************
**      /addon/search/myCMsearch.js                            ************************
**      /addon/mode/mySimple.js                                ************************
**  this needs to be done any time the package is updated (e.g., by yarn upgrade)  ****
***************************************************************************************

  using https://uiwjs.github.io/react-codemirror/


  NOTES ON USAGE OF CODEMIRROR
    imports need to specify .js files (at least in some cases)
    some features have additional dependencies (e.g., fold gutters also require /addon/fold/brace-fold.js to auto detect brace pairs )
      unfortunately, when a dependency is missing, there is no error message, the feature just doesn't work...
      ==> codemirror documentation notes dependencies, but need to read REALLY CAREFULLY to find them
      ==>    and in some cases, the doc does not mention a dependency
      ==> can discover these in comments in index.d.ts files in @types/codemirror project
      ==> maybe just blanket import all sub-components for any addon/mode/etc we want to use
    codemirror has 'commands' and other methods we can call
      'commands' are methods with no parameters, that can be attached to keyMaps
        to call them outside of a keymap, use cm.editor.execCommand('commandname')
      other methods are called by cm.<methodname> or cm.editor.<methodname>
      i can create my own commands by extending the codemirror source files (e.g., the command i added to search)
    implementing codemirror command to search from pattern as parameter (rather than using a dialog)
      created a new codemirror 'command', which can be called with editor.execCommand()
      the value for the serach pattern is a state variable on the codemirror instance
        called 'mySearchPattern'
        updated via a useEffect that reacts when the enclosing component's pattern changes

      cloned codemirror/addon/search/search.js
        --> new file called 'myCMsearch.js'
        --> in node_modules - tried placing it in my project src folder, but it would not import properly from there
        ==> will need to update it manually when re-installing/upgrading codemirror
      myCMsearch.js modifications from the codemirror version 
        revised Codemirror.commands definitions at bottom 
          commented out the ones from the source
          created CodeMirror.commands.myCMfind
            replicates what the base 'find' command does, 
              except taking the search pattern from cm.mySearchPattern, rather than from a dialog
              and sets the position for the 'findNext' call to the beginning of the current selection rather than the end
                (so that if updated pattern encompasses the previously highlighted match, findNext will land on the same match again)
      extended the Editor typescript interface to also have a prop called 'mySearchPattern'
        this is defined in this source file
        called 'EditorWithMySearchPattern'
        methods that use a cm instance and need to declare that the cm reference is 'as EditorWithMySearchPattern' to avoid typescript compilation errors

    code folding
      also need foldgutter (see this example for imports and prop settings in CodeMirror component)
      adds method to codemirror:
        foldCode(pos [, options])
          pos is a codemirror Pos:  { line: number, ch: number }
          options is an object {
            rangeFinder:  [function that finds foldable ranges - defaults to CodeMirror.fold.auto - see doc for more details]
            widget: string | Element | fn(...see doc for details) - widget to show for folded ranges
            scanUp: boolean - when true, foldCode will scan upwards from line in pos argument to find a valid folding point
            minFoldSize: integer - minimum number of lines that must be spanned to do a fold (default is 0)
          }
      adds these commands (i.e., things that can be tied to a keyMap entry, or called with cm.editor.execCommand) to codemirror:
        fold - folds at line where cursor is
        unfold - unfolds at line where cursor is
        foldAll
        unfoldAll
        toggleFold

    syntax highlighting for urls
          craeted a new 'mode' for urls
          codemirror has two ways to create a new mode:
            full-blown
              see https://codemirror.net/doc/manual.html#modeapi
            'simple'
              see https://codemirror.net/demo/simplemode.html
          simple mode has a much simpler api, with correspondinly less power to parse complex stuctures
          simple mode is sufficient to parse urls (and probably headers, cookies, maybe initiators)
          procedure to implement a new 'simple' mode
            create a new script (i called is 'mySimple.js')
            place in node_modules/codemirror/addon/mode/
            started with copy of code shown in box in https://codemirror.net/demo/simplemode.html
            created my own CodeMirror.defineSimpleMode call
            added import 'codemirror/addon/mode/simple.js' - to incorporate the 'defineSimpleMode' method
            added import 'codemirror/addon/mode/mySimple.js' - to generate my new mode
            then can use my new mode in my codemirror instance
            see mySimple.js for more notes on how to use the api




type FocusAreas = 'matchInput' | 'content' | 'no'


const CodeMirrorView = observer((props: {
    value: string,
    mode: CVMode
    // OBSOLETE initialFocus: FocusAreas  // whether to force focus to match input or content on opening
    // OBSOLETE initialMatchPattern: string
    size?: SizePropsPx                 // sizing for component INCLUDING the match bar above the actual CodeMirror component
                              // if these are missing, will use default values for height, width
    // OBSOLETE table?: TTable         // used to reference TTable size props, if size has Pct values
    // OBSOLETE                       // this is a prop for this component, so this component can observe changes in the table pane/div dimensions and re-render 
    editable: boolean
    lineWrapping?: boolean    // passed as option to codemirror - if omitted, will be false
    // function that will be called on every change event
    onChangeHandler?: (newValue: string)=>void                          
})=>{
  // OBSOLETE const cmInstance = useRef<MyReactCodemirror>(null)
  // OBSOLETE const [ cmmode, updatecmmode ] = useState(props.mode)
  // OBSOLETE const [ matchPattern, updateMatchPattern ] = useState('');
  const [ contentDims, updateContentDims ] = useState( { lines: 0, maxLen: 0 } )
  // OBSOLETE const [ currentFocus, updateCurrentFocus ] = useState<FocusAreas>( props.initialFocus )
  // default px value to use for sizing, if suitable props not provided
  const defaultSizePx = 1000  // value to use for height/width if no other basis present in props
  // various constants used in sizing calculations
  // OBSOLETE const nonContentHtPx = 21.53  // determined by observation of the rendered match bar in devtools.Elements
  // OBSOLETE const detailViewBorderProvisionPx = 16+16  // subtract from div width when width is a %, to provide for the borders and possible scrollbar that exist on ContentViews in a DetailView
  // OBSOLETE const cmExtraPx = 28  // amount to add to height/width for extra in codemirror
  const scrollBarSizePx = 20  // set in App.css (overriding default codemirror values)
  const gutterFixedWdChars = 3 // in char count, provision for fixed portion of gutter width (fold markers and divider line)
  const cmLineHtPx = 18   // varies with browser zoom % - i observed range from 16.5 to 18
  const cmCharWdPx = 8.4  // varies with browser zoom % - seemed to always be very close to 8.4

  // this will be the size of the match bar + the CodeMirror instance
  // initializes to default values, will be overridden if size prop provided
  const finalSize: { totalHeightPx: number, totalWidthPx: number } = { totalHeightPx: defaultSizePx, totalWidthPx: defaultSizePx }

  //cl(`CodeMirrowView  function called - size prop passed in (height, then width):`)
  //ct(props.size?.height)
  //ct(props.size?.width)


  
  /*
    how CodeMirror sizing works (see testers/cra-tester-mobx-codemirror for a testing environment)
      if CodeMirror is given sizing in %, then 
        if the immediate parent is sized in absolute units, codemirror fits itself properly
        otherwise (i.e., if parent is sized based on its children), codemirror will size itself based on its entire content, 
          and even if an indirect parent clips the overflow, codemirror's scrollbars will be out of view,
          and also codemirror will render spans for all of its lines, which gets (very) slow for large content

      so, giving the direct parent a fixed size always works

      however, to also have CodeMirror auto-shrink to something smaller, for small content
        the parent needs to check the size of the content (line count and max line length)
        and size itself accordingly
        including that parent can simply omit sizing parameters and thus get its sizing from however codemirror sizes itself

  

  // if sizing prop provided...
  if (props.size !== undefined) {
    const gutterWdPx = (contentDims.lines.toString().length + gutterFixedWdChars) * cmCharWdPx
    // general algorithm
    //  first take default value
    //  compute unconstrained size = content size + fixed gui parts
    //  handle height
    //      if prop.constraint is fixed, just use the value
    //      else need to see if actual size based on content+fixed gui parts is smaller
    //        measure size of content on this dimension, plus provision for fixed gui parts (match bar, gutters, etc)
    //        if measured size is less, use that
    //      if finalsize < unconstrained size, set willBe***Scrollbar
    //  handle width
    //    as above, including provision for vert scroll bar if present
    //  revise height if horizontal scrollbar
    var willBeVertScrollbar = true // OBSOLETE - (for now at least) scrollbar will always be visible false
    var willBeHorzScrollbar = true // OBSOLETE - (for now at least) scrollbar will always be visible false
    var htPx
    var wdPx
    const unConstrainedHtPx = contentDims.lines  * cmLineHtPx 
    const unConstrainedWdPx = contentDims.maxLen * cmCharWdPx + gutterWdPx
    // handle height (assuming no horz scrollbar - will adjust for that after doing width)
    if (props.size.height.constraint === 'fixed') htPx = props.size.height.value
    else {
      if (unConstrainedHtPx < props.size.height.value) htPx = unConstrainedHtPx
      else {
        willBeVertScrollbar = true
        htPx = props.size.height.value
      }
    }
    // handle width
    if (props.size.width.constraint === 'fixed') wdPx = props.size.width.value
    else {
      if (unConstrainedWdPx < props.size.width.value) wdPx = unConstrainedWdPx
      else {
        willBeHorzScrollbar = true
        wdPx = props.size.width.value
      }
    }
    // go back and adjust height/width if there are scroll bars
    if (willBeVertScrollbar) {
      // if width without scrollbars + scrollbar size > width prop, set willBeHorzScrollBar to true (may have already been true)
      if ((wdPx + scrollBarSizePx) > props.size.width.value) willBeHorzScrollbar = true 
      wdPx = Math.min(wdPx + scrollBarSizePx, props.size.width.value)
    }
    if (willBeHorzScrollbar) {
      // if height without scrollbar + scrollbar size > height prop, set willBeVertScrollBar to true (may have already been true)
      if ((htPx + scrollBarSizePx) > props.size.height.value) willBeVertScrollbar = true
      htPx = Math.min(htPx + scrollBarSizePx, props.size.height.value)
    }
    // need to check for vert scroll bar again - may have been false at the first check
    if (willBeVertScrollbar) {
      wdPx = Math.min(wdPx + scrollBarSizePx, props.size.width.value)
    }
// OBSOLETE 
    finalSize.totalHeightPx = htPx
    finalSize.totalWidthPx = wdPx
  }


    


  // OBSOLETE // add effect on mount to populate initial match pattern and sizing style
  // OBSOLETE useEffect(()=>{
  // OBSOLETE   updateMatchPattern(props.initialMatchPattern)
  // OBSOLETE }, [props.initialMatchPattern])    // note - second argument list is dependency list - making it empty means this will only run after initial mount

  // OBSOLETE // add effect on mount to focus element based on initial focus prop
  // OBSOLETE useEffect(()=>{
  // OBSOLETE   if (cmInstance.current !== null) {
  // OBSOLETE     if (cmInstance.current.editor !== undefined) {
  // OBSOLETE       switch(currentFocus) {
  // OBSOLETE         case 'content':
  // OBSOLETE           cmInstance.current.editor.focus()
  // OBSOLETE           break
  // OBSOLETE         case 'matchInput':
  // OBSOLETE           const element: HTMLInputElement = document.getElementById('patternInput') as HTMLInputElement
  // OBSOLETE           if (element !== null) element.focus()
  // OBSOLETE           break
  // OBSOLETE         case 'no':
  // OBSOLETE           // do nothing in this case
  // OBSOLETE           break
  // OBSOLETE       }
  // OBSOLETE     }
  // OBSOLETE   }
  // OBSOLETE }, [currentFocus, cmInstance.current])    // note - second argument list is dependency list - making it empty means this will only run after initial mount

  useEffect(()=>{
    const contentLines = props.value.split('\n')
    var contentMaxLineLength = 0
    contentLines.forEach((l: string) => {
      contentMaxLineLength = Math.max(contentMaxLineLength, l.length)
    })
    //cl(`content lines, max len: ${contentLines.length} ${contentMaxLineLength}`)
    updateContentDims({ lines: contentLines.length, maxLen: contentMaxLineLength })

    // OBSOLETE // call execCommand('myCMfind') to scroll editor to match
    // OBSOLETE // this need to be done because after changing props.value, the state of matches to the srach pattern is reset
    // OBSOLETE const cm: MyReactCodemirror = cmInstance.current as MyReactCodemirror
    // OBSOLETE if (cm !== null) {
    // OBSOLETE   const ed = cm.editor as EditorWithMySearchPattern
    // OBSOLETE   if (ed !== undefined) {
    // OBSOLETE     ed.mySearchPattern = matchPattern
    // OBSOLETE     ed.execCommand('myCMfind')
    // OBSOLETE   }
    // OBSOLETE } 

  }, [ props.value, /* OBSOLETE matchPattern  ])


  // OBSOLETE // useEffect to update codemirror search when matchPattern changes
  // OBSOLETE useEffect(()=>{
  // OBSOLETE   const cm: MyReactCodemirror = cmInstance.current as MyReactCodemirror
  // OBSOLETE   if (cm !== null) {
  // OBSOLETE     const ed = cm.editor as EditorWithMySearchPattern
  // OBSOLETE     if (ed !== undefined) {
  // OBSOLETE       ed.mySearchPattern = matchPattern
  // OBSOLETE       ed.execCommand('myCMfind')
  // OBSOLETE       //if (matchPattern === '') {  // removes selection range if pattern is empty (don't want to still show last match as selected)
  // OBSOLETE       //  ed.setSelection(ed.listSelections()[0].anchor)
  // OBSOLETE       //}
  // OBSOLETE     }
  // OBSOLETE   } 
  // OBSOLETE }, [matchPattern])  // note - second argument list is dependency list

  const onChange = React.useCallback((value: any, viewUpdate: any) => {
    console.log('value:', value);
  }, [])
  
  return (
    <div>
      <div
        style={ {
            height: `${finalSize.totalHeightPx}px`,
            width:  `${finalSize.totalWidthPx}px`
        } }
        // OBSOLETE onKeyDown={(ev)=>{
        // OBSOLETE   // if editable, do not respond to codemirror hotkeys
        // OBSOLETE   if (props.editable) return
        // OBSOLETE   // if focus is in match pattern box, do not respond to the hotkeys
        // OBSOLETE   if (currentFocus === 'matchInput') return
        // OBSOLETE   const cm = cmInstance.current
        // OBSOLETE   if (cm !== null) {
        // OBSOLETE     let handled = true
        // OBSOLETE     switch (ev.key) {
        // OBSOLETE       case '<':
        // OBSOLETE         cm.editor.execCommand('findPrev')
        // OBSOLETE         break
        // OBSOLETE       case '>':
        // OBSOLETE         cm.editor.execCommand('findNext')
        // OBSOLETE         break
        // OBSOLETE       case '-':
        // OBSOLETE         cm.editor.foldCode(
        // OBSOLETE           cm.editor.getCursor(), 
        // OBSOLETE           { scanUp: true }   // if this line is not a fold point, scans up to find one and folds there
        // OBSOLETE         )
        // OBSOLETE         break
        // OBSOLETE       case '=':
        // OBSOLETE         cm.editor.execCommand('unfold')
        // OBSOLETE         break
        // OBSOLETE       case '_':
        // OBSOLETE         cm.editor.execCommand('foldAll')
        // OBSOLETE         break
        // OBSOLETE       case '+':
        // OBSOLETE         cm.editor.execCommand('unfoldAll')
        // OBSOLETE         break
        // OBSOLETE       default:
        // OBSOLETE         handled = false
        // OBSOLETE         break
        // OBSOLETE     }
        // OBSOLETE     if (handled) {
        // OBSOLETE       ev.preventDefault()
        // OBSOLETE       ev.stopPropagation()
        // OBSOLETE     }
        // OBSOLETE   }
        // OBSOLETE }}
      >
        {/* OBSOLETE 
        <ControlGroup id='cmMatch' style={ { backgroundColor: 'lightgray', flex: 'none' } } key={'z'} fill={false} vertical={false}>
          <span>Match: </span>
          <input
            id={'patternInput'}
            style={ { minHeight: '10px', width: `${finalSize.totalWidthPx - 60}px` } } // had tried width: 100% but that overflowed because 
                                                                          // it uses 100% of the parent div, which when added to the 'Match: ' span is too wide
                                                                          // this seems hack-y, but it seems to work for both large and small views
            value={matchPattern}
            type='text'
            onFocus={()=>updateCurrentFocus('matchInput')}
            onChange={(ev: React.ChangeEvent<HTMLInputElement>)=>{
              // update the input box
              updateMatchPattern(ev.target.value)
              const element: HTMLInputElement = document.getElementById('patternInput') as HTMLInputElement
              // if a valid regex pattern, 'setCustomValidity' to valid, update lines.regexPattern (lines.updateMatches will do the rest)
              try {
                const r = new RegExp(ev.target.value)
                if (element !== null) element.setCustomValidity('')
              }
              // if not a valid regex pattern, 'setCustomValidity' to invalid
              catch {
                if (element !== null) element.setCustomValidity('not a valid regex pattern')
              }
            }}
          />
        </ControlGroup>
        }
        <div
        >
          <CodeMirror
            // OBSOLETE ref={cmInstance}
            height={`${finalSize.totalHeightPx /* OBSOLETE -nonContentHtPx }px`}
            width={`${finalSize.totalWidthPx}px`}
            value={props.value}
            // OBSOLETE onFocus={()=>updateCurrentFocus('content')}
            // OBSOLETE onChange={(instance: Editor)=>{  //  had used second argument for 'change', but the typing as any[] caused compile errors, and now we don't need that argument so just commenting out ---  , change: any[])=>{
            // OBSOLETE   //cl(`codemirror onChange, instance.getValue is:`)
            // OBSOLETE   //cl(instance.getValue())
            // OBSOLETE   if (props.onChangeHandler !== undefined) {
            // OBSOLETE     props.onChangeHandler(instance.getValue())
            // OBSOLETE   }
            // OBSOLETE }}
            onChange={onChange}
            extensions={ [javascript({ jsx: true })]}
            autoFocus={true}
            // DON'T DO THIS LEAVE AT DEFAULT WHICH IS EDITABLE, BECAUSE THAT ENABLES AUTOFOCUS, BRACKET MATCHING 
            editable={props.editable}
            basicSetup={{
            }}
            // OBSOLETE options={{
            // OBSOLETE   lineNumbers: true,
            // OBSOLETE   lineWrapping: (props.lineWrapping === undefined) ? false : props.lineWrapping,
            // OBSOLETE   mode: mapCVModeToCMMode[props.mode],
            // OBSOLETE   theme:  'ssms',
            // OBSOLETE   readOnly: !props.editable,
            // OBSOLETE   autoCloseBrackets: true,
            // OBSOLETE   autoCloseTags: true,
            // OBSOLETE   matchBrackets: true,
            // OBSOLETE   smartIndent: false,
            // OBSOLETE   cursorScrollMargin: 150,
            // OBSOLETE   tabSize: 1,
            // OBSOLETE   styleActiveLine: true,
            // OBSOLETE   scrollbarStyle: 'simple',
            // OBSOLETE   foldGutter: true,
            // OBSOLETE   gutters: [ 'CodeMirror-linenumbers', 'CodeMirror-foldgutter' ],
            // OBSOLETE   highlightSelectionMatches: {
            // OBSOLETE     showToken: /\w/,
            // OBSOLETE     annotateScrollbar: true
            // OBSOLETE   }
            // OBSOLETE }}
          />
        </div>
      </div>
    </div>
  )
})

*/