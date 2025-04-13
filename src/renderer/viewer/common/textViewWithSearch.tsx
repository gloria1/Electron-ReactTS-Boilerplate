import React, { useEffect, useState } from 'react';

import { observable,  action, makeObservable, reaction } from 'mobx'
import { observer } from 'mobx-react'

import { v4 as uuidv4 } from 'uuid'
import { Button, ControlGroup } from '@blueprintjs/core'
import '@blueprintjs/core/lib/css/blueprint.css'


const cl = console.log
const ct = console.table



/* GENERAL DOCUMENTATION

  key idea is that gui highlights for matches are rendered as separate spans that are overlaid on the main text
    component logic determines which matches are in the visible area, and only renders those
    updates automatically on scroll
    this is for scalability - there can be O(1000) or more matches, and rendering them all gets expensive

  state is not stored in the component, but rather in separate Lines and Match objects
    so that key dependencies can be mobx observables
    Match instances include text of match, and index into the master Lines list
      this is somewhat redundant state, but it makes code that starts from a match simpler - don't have to look up the match in the master list all the time
    
  line numbering
    we will stick with 0-based line numbering
      both in the storage mechanism (array of lines)
      and in presentation 
        line number display on left
        line number navigation control


  general rules for handling input changes (validation and acting on changes)

      invalid state is indicated by red background, via the .input:invalid class (see css file), which reacts to the the html <input>'s validation state
      so if the input is invalid, we need to tell html that it is invalid

      activeMatchIndex is validated via the built-in <input> constraints for input type="number"
      regexPattern - <input> allows any string, we manually validate whether it is a valid regex pattern and set invalid state if it is not
      line,col - <input> allows any string, <input> pattern validation tests whether it is a valid line[,col] pattern and shows invalid state if not

      when inputs change, if they are invalid we only update the input gui, but to not otherwise act on it
      if they are valid, we update the backing lines object, scroll the view, etc.


   layout approach
      sourceText is laid out as one big child of the div
      highlights are laid out as individual <span> in the same div
      we let html position sourceText based on the designated fontFamily, fontSize and lineHeight style attributes
      we position the <span> elements explicitly, based on their line and column locations

key pieces to puzzle
  parent within which we will do 'absolute' positioning must, itself, have a style attribute of position='relative'
    this is just because the children are positioned relative to the first ancestor that has a positioning attribute
    making the parent position='relative' has no effect on it, it just needs to be there so the children have the right positioning context
  trying to mix auto positioning of sourceText with pixel-specified positioning of spans
    system apparently not meant to mix these methods and have alignment be perfect all the time
    need to determine correct units of measure (char height and width) of autolayout stuff, so that positions can be calculated
      --> used fixed width font
      --> explicitly set lineHeight to round number  - seems to help when browser zoom % changes
  effect of browser zoom - 
    everything tries to scale with browser zoom
    however, sometimes it glitches if browser zoom percentage times (some key value, not sure what) does not come out to (some level of precision...)


   these constants seem to work well with most browser zoom %'s
      fontFamily: 'courier'
      fontSize: '16px'
      lineHeight: '20px'
    (seems to work better with browser zoom if 
       fontSize produces a lineHeight such that (lineHeight * browser zoom %) is an integer for various zoom %s in increments of 25%
       we set lineHeight explicitly in parent div style (if we don't browser computes a lineHeight of, e.g., 20.357 for a font size of 16)


*/



/* BUILDS BIG STRING FOR TESTING
const multiLineString = '\
line\
l\
li\
lin\
line\
il\
lili\
illin\
linehttpafshttpfas;ldjfalsjfa;ldfj;lsdjf;adlfj;alsfj;aljfasd;lfja;lfjads;lajf;jlas;flaj;falsjdfa;sljfa;lfj\
httpline\
http\
linhttpe\n'

let multiLineStringLong = 'start\n\n'
for (let i = 0; i < 100; i++) {
  multiLineStringLong += multiLineString
  multiLineStringLong += `AFTER adding ${i}`
}
*/





interface Match {
  lineNo: number
  colNo: number
  matchText: string
  matchIndexInFullList: number   // used in component render to determine if this match is activeMatch
}

export class Lines {
  regexPattern: string
  sourceText: string
  lineNumberText: string
  lines: string[]  // source text, split on \n characters - we need this so that we can determine line numbers of matches
  maxLineLength: number
  matches: Match[]
  activeMatchIndex: number = -1

  constructor(sourceText: string) {
    this.regexPattern = ''
    this.sourceText = sourceText
    this.maxLineLength = 0
    this.lines = sourceText.split('\n')
    const maxLineNumberLength = (this.lines.length-1).toString().length
    const lineNumberStringsTemp: string[] = []
    this.lines.map((l,i)=>{
      this.maxLineLength = Math.max(this.maxLineLength, l.length)
      lineNumberStringsTemp.push(i.toString().padStart(maxLineNumberLength+1, ' '))
    })
    this.lineNumberText = lineNumberStringsTemp.join('\n')

    this.matches = []
    makeObservable(this, {
      regexPattern: observable,
      matches: observable,
      activeMatchIndex: observable,
      updateMatches: action.bound,
    })
    // do not run updateMatches in constructor
    // we not longer provide for an initial match pattern in constructor
    // instead, the React component that wraps this takes an initialRegexPattern prop, and assigns it if not empty, which triggers updateMatches via the reaction below
    //this.updateMatches()

    reaction(
      ()=>this.regexPattern,
      (newRegexPattern, prevRegexPattern)=> {
        this.updateMatches(prevRegexPattern)
      }
    )
  }

  // takes argument for previous regex pattern, so we can compare new pattern to see if it is broader or narrower
  // the new pattern should already be in this.regexPattern (which it will be if this was called by the reaction to a change in this.regexPattern)
  updateMatches(prevRegexPattern: string) {
    // need to get location of prior activeMatch (if there is one) in terms of line number and col offset
    // this is where logic below will start searching for the new activeMatch to highlight
    const priorActiveMatchLocation = { 
      lineNo: (this.activeMatchIndex === -1) ? 0 : this.matches[this.activeMatchIndex].lineNo,
      colNo:  (this.activeMatchIndex === -1) ? 0 : this.matches[this.activeMatchIndex].colNo,
    }

    // regex for matchall needs to be global
    const regex = new RegExp(this.regexPattern, 'g')
    let overallMatchIndex = 0
    let lineMatches
    this.matches = []
    
    // generate new this.matches
    // skip if regex pattern is '' - RegExp from '' will match everything
    // otherwise, build new this.matches array
    if (this.regexPattern !== '') this.lines.forEach((line, lineIndex)=>{
      lineMatches = [...line.matchAll(regex)]
      for (let m of lineMatches) if (m.index !== undefined) {
        this.matches.push({ lineNo: lineIndex, colNo: m.index, matchText: m[0], matchIndexInFullList: overallMatchIndex++ })
      }
    })


    // updating activeMatchIndex
    // cases:
    // if there is no match, activeMatchIndex = -1
    if (this.matches.length === 0) this.activeMatchIndex = -1
    // else if new pattern includes old one, or vice versa, find next match, starting at line number of current match prior to update (or starting at 0 if there was not prior match)
    //                            activeMatch = new match number
    else if (this.regexPattern.includes(prevRegexPattern) || prevRegexPattern.includes(this.regexPattern)) {
      // find first match that includes the start of the prior active match
      for (let m of this.matches) {
        // if we are in the same line...
        if (m.lineNo === priorActiveMatchLocation.lineNo) {
          // and if  m.colNo <= prior colNo and (m.colNo+m.matchText.length)> prior colNo, then we are done
          if ((m.colNo <= priorActiveMatchLocation.colNo) && ((m.colNo+m.matchText.length) > priorActiveMatchLocation.colNo)) {
            // set new activeMatchIndex and break out of loop
            this.activeMatchIndex = m.matchIndexInFullList
            break
          }
        }
        // if we are past the prior active match lineNo, just take the next available match
        if (m.lineNo > priorActiveMatchLocation.lineNo) {
          this.activeMatchIndex = m.matchIndexInFullList
          break
        }
      }
    }
    // otherwise - activeMatch = first match
    else this.activeMatchIndex = 0
  }
}

// global constant used to generate unique keys for items in component children lists
// this is a react thing, not an html thing (below i use them in plain html lists too, so that is probably unecessary??)
// (this is a hacky way to do it, may need to do better method at some point....)  see https://reactjs.org/docs/lists-and-keys.html#keys
let key = 0



export const TextWithSearchBoxView = observer((props: {
  lines: Lines
  initialRegexPattern?: string
  initialLineAndCol?: {
    lineNo: number
    colNo: number
  }
}) => {

  // local state for the value in these two <input> boxes
  // we have local state for these, in case the user enters something in the box that is not valid to be acted upon (either updating lines.regexPattern, or scrolling to a line/col)
  // when valid input is provided for either of these things, the Lines object will be updated
  // note:  we don't have a local state for the activeMatch input, because <input> constraints for this box (being type='number') prevent the user from even entering an invalid value
  const [ lineAndColText, lineAndColTextUpdater ] = useState('')
  const [ regexPatternInput, regexPatternInputUpdater ] = useState('')
  const [ boxElId ] = useState(uuidv4().toString())
  // highlightsToRender is part of state, so that highlights re-render correctly whenever component scrolls or pattern changes (see where updateHighlightsToRender is called below)
  const [ highlightsToRender, updateHighlightsToRender ] = useState<Match[]>([])
  const [ renderTrigger, updateRenderTrigger ] = useState(false)

  // add effect on mount to either (a) apply initial match pattern and scroll to first match or (b) scroll to initial line,col
  useEffect(()=>{
    if (props.initialRegexPattern !== undefined) {
      // populate input box
      regexPatternInputUpdater(props.initialRegexPattern)
      // if valid regex, set it as the match pattern
      // if regex constructor fails (because the pattern is not a valid regex), simply do nothing
      try {
        const r = new RegExp(props.initialRegexPattern)
        props.lines.regexPattern = props.initialRegexPattern
        // assigning to props.lines.regexPattern causes lines.matches to update via the reaction in Lines
        if (props.lines.matches.length > 0) {
          props.lines.activeMatchIndex = 0
          scrollToMatch(0)
        }
      }
      catch {}
    }
    else if (props.initialLineAndCol !== undefined) {
      const lineNo = Math.min(props.initialLineAndCol.lineNo, props.lines.lines.length - 1)
      const colNo = Math.min(props.initialLineAndCol.colNo, props.lines.lines[lineNo].length)
      lineAndColTextUpdater(`${lineNo.toString()},${colNo.toString()}`)
      scrollToLineAndCol(lineNo, colNo)
    }
    recalcHighlightsToRender()
  }, [])  // note - second argument list is dependency list - making it empty means this will only run after initial mount

  const recalcHighlightsToRender = () => {
      // determine first and last visible line and column numbers
      let firstLineNumberToRender = 0
      let lastLineNumberToRender = 0
      let firstColNumberToRender = 0
      let lastColNumberToRender = 0

      const boxEl = document.getElementById(boxElId)
      if (boxEl !== null) {
        const totalHt = boxEl.scrollHeight
        const visTop = boxEl.scrollTop
        const visBottom = boxEl.clientHeight + visTop
        firstLineNumberToRender = Math.max(0,                            props.lines.lines.length * visTop    / totalHt - 1)
        lastLineNumberToRender  = Math.min(props.lines.lines.length - 1, props.lines.lines.length * visBottom / totalHt + 1)
        const totalWd = boxEl.scrollWidth
        const visLeft = boxEl.scrollLeft
        const visRight = boxEl.clientWidth + visLeft
        firstColNumberToRender = Math.max(0,                             props.lines.maxLineLength * visLeft   / totalWd - 1)
        lastColNumberToRender  = Math.min(props.lines.maxLineLength - 1, props.lines.maxLineLength * visRight  / totalWd + 1)
      }
      const result: Match[] = []
      props.lines.matches.forEach(m => {
        // add m to highlightsToRender if its line number and column range are within the visible area
        if ((m.lineNo >= firstLineNumberToRender) 
              && (m.lineNo <= lastLineNumberToRender)
              && (m.colNo < lastColNumberToRender)
              && ((m.colNo + m.matchText.length) > firstColNumberToRender)
        ) result.push(m)
      })
      updateHighlightsToRender(result)
  }

  const scrollToMatch = (matchIndex: number) => {
    const boxEl = document.getElementById(boxElId)
    if ((matchIndex < 0) || (matchIndex > props.lines.matches.length)) cl(`tried to scroll to matchIndex ${matchIndex} but that is out of range of lines.matches`)
    else if (boxEl !== null) {
      const pctOfNextMatchVert = props.lines.matches[matchIndex].lineNo / props.lines.lines.length 
      const totalHt = boxEl.scrollHeight
      const visHt = boxEl.clientHeight
      let newTop = Math.floor( totalHt * pctOfNextMatchVert - visHt / 2 )
      const pctOfNextMatchHoriz = props.lines.matches[matchIndex].colNo / props.lines.maxLineLength
      const totalWd = boxEl.scrollWidth
      const visWd = boxEl.clientWidth
      let newLeft = Math.floor( totalWd * pctOfNextMatchHoriz - visWd / 2 )
      boxEl.scrollTo( { top: newTop, left: newLeft, behavior: 'smooth' } )
    }
  }
  const scrollToLineAndCol = (lineNo: number, colNo: number) => {
    // constrain lineNo and ColNo to valid values
    // this will have already been done in the GoTo button handler,
    // but we will also do it here in case we are handling values that were passed in as props
    lineNo = Math.min(lineNo, props.lines.lines.length - 1)
    colNo = Math.min(colNo, props.lines.lines[lineNo].length)
    const boxEl = document.getElementById(boxElId)
    if (boxEl !== null) {
      const pctOfLineNo = lineNo / props.lines.lines.length 
      const totalHt = boxEl.scrollHeight
      const visHt = boxEl.clientHeight
      let newTop = Math.floor( totalHt * pctOfLineNo - visHt / 2 )
      const pctOfColNo = colNo / props.lines.maxLineLength
      const totalWd = boxEl.scrollWidth
      const visWd = boxEl.clientWidth
      let newLeft = Math.floor( totalWd * pctOfColNo - visWd / 2 )
      boxEl.scrollTo( { top: newTop, left: newLeft, behavior: 'smooth' } )
    }
  }


  cl(`rendering TextWithSearchBoxView`)


  // constants used for calculating positions of highlights - see notes above in general documentation
  const fontSize = 16
  const lineHeight = fontSize+4
  const charWidth = 9.602   // derived by examination of the rendered width of a single character line - seems to work well for fontSize=16, lineHeight=20
  const lineNoWidth = charWidth * ((props.lines.lines.length-1).toString().length + 1) 

  return (
    <div
      style = { { 
        flex: 'auto', 
        height: '100%', 
        maxHeight: '800px', // using a maxHeight in % does not seem to work properly...even though a maxwidth in % does seem to work...
        width: '100%', 
        maxWidth: '100%', 
        display: 'flex', flexDirection: 'column' 
      } }
    >
      <ControlGroup style={ { backgroundColor: 'lightgray', flex: 'none' } } key={'z'} fill={false} vertical={false}>
        <span key={'a'} style={{whiteSpace: 'pre'}}>Match: </span>
        <input
          id={boxElId+'patternInput'}
          key={'b'}
          style={ { minHeight: '10px' } }
          value={regexPatternInput}
          type='text'
          onChange={(ev: React.ChangeEvent<HTMLInputElement>)=>{
            // update the input box
            regexPatternInputUpdater(ev.target.value)
            const element: HTMLInputElement = document.getElementById(boxElId+'patternInput') as HTMLInputElement
            // if a valid regex pattern, 'setCustomValidity' to valid, update lines.regexPattern (lines.updateMatches will do the rest)
            try {
              const r = new RegExp(ev.target.value)
              if (element !== null) element.setCustomValidity('')
              props.lines.regexPattern = ev.target.value
              scrollToMatch(props.lines.activeMatchIndex)
              recalcHighlightsToRender()
            }
            // if not a valid regex pattern, 'setCustomValidity' to invalid
            catch {
              if (element !== null) element.setCustomValidity('not a valid regex pattern')
            }
          }}
        />
        <Button key={'c'} className='textViewButton' tabIndex={-1} onClick={()=>{ if (props.lines.matches.length > 0) { props.lines.activeMatchIndex = 0; scrollToMatch(0) }}} >{'<<'}</Button>
        <Button key={'d'} className='textViewButton' tabIndex={-1} onClick={()=>{ if (props.lines.matches.length > 0) { let nextMatch = props.lines.activeMatchIndex-1; if (nextMatch < 0) {nextMatch = props.lines.matches.length-1}; props.lines.activeMatchIndex = nextMatch; scrollToMatch(nextMatch) }}}>{'<'}</Button>
        <span key={'e'} style={{whiteSpace: 'pre'}}> </span>
        <input
          id={boxElId+'matchNumberInput'}
          key={'f'}
          type='number'
          style={ { minHeight: '10px', width: '70px' } }
          value={(props.lines.activeMatchIndex === -1) ? '' : props.lines.activeMatchIndex+1}
          min={1}
          max={props.lines.matches.length}
          step='1'
          onChange={(ev: React.ChangeEvent<HTMLInputElement>)=>{
            try {
              const newMatch = parseInt(ev.target.value) - 1
              props.lines.activeMatchIndex = newMatch
              const spanEl = document.getElementById(boxElId+`${newMatch}`)
              if (spanEl !== null) spanEl.style.backgroundColor='purple'
              scrollToMatch(newMatch)
            }
            catch {
              props.lines.activeMatchIndex = -1
            }
          }}
        />
        <span key={'g'} style={{whiteSpace: 'pre'}}> /{props.lines.matches.length} </span>
        <Button key={'h'} className='textViewButton' tabIndex={-1} onClick={()=>{ if (props.lines.matches.length > 0) { let nextMatch = props.lines.activeMatchIndex+1; if (nextMatch === props.lines.matches.length) {nextMatch = 0}; props.lines.activeMatchIndex = nextMatch; scrollToMatch(nextMatch) }}}>{'>'}</Button>
        <Button key={'i'} className='textViewButton' tabIndex={-1} onClick={()=>{ if (props.lines.matches.length > 0) { props.lines.activeMatchIndex = props.lines.matches.length - 1; scrollToMatch(props.lines.matches.length - 1) }}}>{'>>'}</Button>
      </ControlGroup>
      <ControlGroup style={ { backgroundColor: 'lightgray', flex: 'none' } } key={'z'} fill={false} vertical={false}>
        <span key={'j'} style={{whiteSpace: 'pre'}}>        Line[,Col]: </span>
        <input
          id={boxElId+'lineAndColInput'}
          key={'k'}
          type='text'
          style={ { minHeight: '10px', width: '120px' } }
          value={lineAndColText}
          pattern='^\d+(,\d+)?$'  // automatically validates that this is a line[,col] value, but does not validate if it is out of range (this is ok, the GoTo button handler will automatically 'clip' the values to be in range)
          onChange={(ev: React.ChangeEvent<HTMLInputElement>)=>{
            // note - this will only update the display in the input box - the only time
            // we act on the new value is when we click the "GoTo" button
            lineAndColTextUpdater(ev.target.value)
          }}
        />
        <Button 
          key={'l'} tabIndex={-1} 
          className='textViewButton'
          onClick={()=>{
            const element: HTMLInputElement = document.getElementById(boxElId+'lineAndColInput') as HTMLInputElement
            if (element !== null) {
              // if lineAndCol valid, scroll to lineAndCol
              // note - also need to check that lineAndColText is not '' - '' will pass validity check even though it does not match regex pattern
              if (element.checkValidity() && (lineAndColText !== '')) {
                const parts = lineAndColText.split(',')
                let newLine = parseInt(parts[0])
                let newCol = (parts[1] === undefined) ? 0 : parseInt(parts[1])
                // restrict line to max line number
                // restrict col to max col in that line
                newLine = Math.min(newLine, props.lines.lines.length - 1)
                newCol = Math.min(newCol, props.lines.lines[newLine].length)
                lineAndColTextUpdater(`${newLine},${newCol}`)
                scrollToLineAndCol(newLine, newCol)
              }
            }
          }}
        >
          GoTo
        </Button>
      </ControlGroup>
      <div
        id={boxElId}
        key={'y'}
        style = { { 
          position: 'relative',
          flex: 'auto',
          maxHeight: '100%',
          display: 'flex', flexDirection: 'row', 
          overflow: 'scroll', 
          whiteSpace: 'nowrap',
          fontFamily: 'courier', fontSize: `${fontSize}px`, lineHeight: `${lineHeight}px`
        } }
        onScroll={()=>recalcHighlightsToRender()}
        //onScroll={(ev: React.UIEvent<HTMLDivElement, UIEvent>)=>{
        //  updateRenderTrigger(!renderTrigger)
        //  ev.stopPropagation()
        //  ev.preventDefault()
        //}}
        //onWheel={(ev)=>{
        //  cl(`textViewWithSearch onWheel handler called`)
        //  if (ev.cancelable) {
        //    ev.preventDefault()
        //    ev.stopPropagation()
        //  }
        //}}
      >
        <div key={'a'} style={ { flex: 'none', whiteSpace: 'pre', backgroundColor: 'lightgrey', height: `${props.lines.lines.length * lineHeight}px` } }>
          {props.lines.lineNumberText}
        </div>
        <div key={'b'} style={ { flex: 'auto', whiteSpace: 'pre',  } }>
          {highlightsToRender.map((m, i)=>{ return (
              <span id={boxElId+`${i}`} key={i} style={ { position: 'absolute', top: `${0+lineHeight*m.lineNo}px`, left: `${lineNoWidth+charWidth*m.colNo}px`, zIndex: 1 , backgroundColor: (m.matchIndexInFullList === props.lines.activeMatchIndex) ? 'green' : 'yellow' } }>
                {m.matchText}
              </span>
            )
          })}
          {props.lines.sourceText}
        </div>
      </div>
    </div>
  )
})


