import * as React from 'react';
import { SyntheticEvent, useState } from 'react';

// import blueprint components
import { Icon, PopoverInteractionKind, Popover } from '@blueprintjs/core';

import { observable, runInAction } from 'mobx';
import { observer } from 'mobx-react'

import '../vwr-App.css';

import { TTable, ColData, CellContentCVInfo } from './TTable base Obj'
import { TIG, TI } from './table items base'
import { ActionCellClick, ActionCV, ActionCVOrGroup, ActionMenu, ActionPlain, ActionPlainOrGroup, ActionPlainOrGroupOrSpacer } from './Pres Action'
import { ContentView, ContentViewProps, makeContentViewPropsFromTIProp } from './Pres ContentView'
import { onClickReporter, onContextMenuReporter, onInteractionReporter, onKeyDownReporter } from './Pres TTPres';
import { TTableCR } from './TTableCR';

var _ = require('lodash');

const cl = console.log;

// for blueprint color schemes, see https://blueprintjs.com/docs/#core/colors.sequential-color-schemes
// that page has a picker to adjust the steepness of the color gradation
const highlightMatchColors = ['white', "#B1ECB5", "#8DCD8F", "#6AAE6A", "#469047", "#1D7324"]


function convertActionCVToPlain(acvs: ActionCVOrGroup[], table: TTable, ti: TI, col: ColData): ActionPlainOrGroup[] {
  const result: ActionPlainOrGroup[] = []

  for (let acv of acvs) {
    if (acv.type === 'action') {
      const ah = acv.handler
      result.push(
        {
          type: acv.type,
          id: acv.id,
          label: acv.label,
          handler: ()=>ah(table, ti, col, result),
          isActive: ()=>true,
          intent: ()=>'none',
          hotkeys: []
        }
      )
    }
    else {
      result.push(
        {
          type: 'group',
          label: acv.label,
          children: convertActionCVToPlain(acv.children, table, ti, col)
        }
      )
    }
  }

  return result
}

// Cell Content component
// this is a stateful class component
// it is made this way so the component with cell contents can maintain local state
// as to whether the mouse is in the cell and whether the popup is open
// this is so that the expensive rendering of the TruncatedFormat, Popover 
// and Tooltip elements is only done for the cell being acted upon,
// rather than for all cells all the time
// notes on performance:  (MAY BE WORTH UPDATING THE PERFORMANCE TESTS AS MY COMPONENTS EVOLVE...)
//   rendering a screenful of cells with the full popover/tooltip stuff
//   was getting noticably slow, around 4 seconds, compared to only 1-2 seconds
//   when rendering a simple string in each cell
//   also, replacing the content of the popover and tooltip with a simple
//   string did not help much
//   ==> it appears that the main expense is in creating the 
//   blueprint Cell, TruncatedFormat, Popover and Tooltip elements themselves,
//   not my components or their content (e.g., CellPopupContent)
//   ==> when this component responds to a mobx dependency, updates seem to be very quick
//   ==> so we try to update the gui by updating CellContent components without triggering re-render of the TTable itself
//   ==> i keep a local state variable for whether the mouse is inside
//   this element, and only render the heavy stuff when the mouse is inside
// state and state changes
//    'cvState' is state of icon and associated ContentView
//      four possible states:
//        closedNoIcon
//        closedWithIcon
//        open - ContentView is open, but will close if mouse leaves cell
//        pinnedOpen - ContentView is open, and stays open wherever mouse goes
//      transitions:
//        mouse enters cell: if was closedNoIcon -> closedWithIcon
//        mouse leaves cell: if not pinned -> closedNoIcon
//        escape key
//        hover on icon: -> open
//        click on icon: if not pinnedOpen -> pinnedOpen, else -> closedWithIcon
//    'cmState' is state of context menu
//      boolean: true means open
//      transitions:
//        right-click: -> open
//        escape key: -> closedWithIcon
// selection behavior
//    to be written
//    



export type CellContentProps = {
  table: TTable, 
  ti: TI, 
  col: ColData, 
  rowIndex: number, 
  colIndex: number,
  tableActions: ActionPlainOrGroupOrSpacer[],  // used for context menu that pops over a cell
  cellCVActions: ActionCVOrGroup[],       // passed to ContentView for a cell
  cellClickAction?: ActionCellClick
  cellDoubleClickAction?: ActionCellClick
}

export type CellContentCVStates = 'closedNoIcon' | 'closedWithIcon' | 'open' | 'pinnedOpen'

export const CellContent = observer((props: CellContentProps) => {
  const { table, ti, col, rowIndex, colIndex, tableActions, cellCVActions, cellClickAction, cellDoubleClickAction } = props
  const { prop } = col

  // ContentView state (whether icon visible, CV open and CV pinned)
  const [ cvState, cvStateUpdater ] = useState<CellContentCVStates>('closedNoIcon')
  // context menu state - open===true
  const [ cmOpen, cmOpenUpdater ] = useState(false)


  // NOTES ON cvState MANAGEMENT
  // TTable now includes a Map that stores the cvState and a handler to update the cvState for this CellContent
  // the key for the map is col.prop+rowIndex.toString()
  // the purpose is so that onMouseEnter, we can update the cvState's
  // of any other CellContents that had their icon/popover open
  // ==> upshot:  any part of CellContent that changes cvState needs
  //   to call myUpdateCVState (rather than the hook updater directly)
  //   so that the table.cellPopoverStateUpdaters can also be updated
  // this is a more elaborate approach than previously (where mouseEnterHandler would just push a ref to mouseLeaveHandler onto a stack stored in TTable, and call any existing ones on the stack when entering a new cell)
  // because that previous approach didn't work reliably - for some reason when mouseLeaveHandler was called because it was popped off the stock, it did not see the correct value for cvState, so it would always close the popover, even if the state was 'pinnedOpen'
  // (never did figure out why that didn't work properly)

  // wrapper for cvStateUpdater
  // which also updates the 'cellPopoverStateUpdaters' in the TTable
  const myUpdateCVState = (newCVState: CellContentCVStates) => runInAction(()=>{
    if (((newCVState === 'open') || (newCVState === 'pinnedOpen'))
        && ((cvState === 'closedNoIcon') || (cvState === 'closedWithIcon'))) {
          //cl(`new open hotkey-supressors count is: ${table.openComponentsThatShouldSuppressTTableHotkeysCount + 1}`)
          table.openComponentsThatShouldSuppressTTableHotkeysAndVisibleMapUpdateCount++
        }
    if (((newCVState === 'closedNoIcon') || (newCVState === 'closedWithIcon'))
        && ((cvState === 'open') || (cvState === 'pinnedOpen'))) {
          //cl(`new open hotkey-supressors count is: ${table.openComponentsThatShouldSuppressTTableHotkeysCount - 1}`)
          table.openComponentsThatShouldSuppressTTableHotkeysAndVisibleMapUpdateCount--
        }

    const key = col.prop+rowIndex.toString()
    var entry: CellContentCVInfo | undefined
    if ((entry = table.cellPopoverStateUpdaters.get(key)) === undefined) {
      table.cellPopoverStateUpdaters.set(key, {
        updateCVState: ()=>{},
        cvState: newCVState
      })
    }
    else {
      entry.cvState = newCVState
      table.cellPopoverStateUpdaters.set(key, entry)
    }
    cvStateUpdater(newCVState)
  })

  const mouseEnterHandler = () => { 
    runInAction(()=> {
      // previous approach
      // for some reason, when the callback is called, it is not seeing the previous value of cvState,
      // even though mouseLeaveHandler DOES see the correct value of cvState when it is called from the div below
      //cl(`starting mouseEnterHandler`)
      //cl(`   callbacks in stack: ${table.mouseLeaveCellCallbacks.length}`)
      //let callback: (()=>void) | undefined
      //while ((callback = table.mouseLeaveCellCallbacks.pop()) !== undefined) {
      //  cl(`   MOUSEENTER HANDLER CALLING CACHED CALLBACK`)
      //  cl(`   callbacks in stack after popping: ${table.mouseLeaveCellCallbacks.length}`)
      //  callback()
      //}
      //table.mouseLeaveCellCallbacks.push(()=>mouseLeaveHandler())

      //cl(`mouseEnter - size of cellPopverStateUpdaters: ${table.cellPopoverStateUpdaters.size}`)
      if (cvState === 'closedNoIcon') {
        const key = col.prop+rowIndex.toString()
        table.cellPopoverStateUpdaters.set(key, {
          updateCVState: ()=>myUpdateCVState('closedNoIcon'),
          cvState: 'closedWithIcon'
        })
        for (let [k, v] of table.cellPopoverStateUpdaters) {
          if ((k !== key) && (v.cvState !== 'pinnedOpen')) {
            v.updateCVState()
            table.cellPopoverStateUpdaters.delete(k)
          }
        }
        cvStateUpdater('closedWithIcon')
      } 
    })
  }

  // leaving this active, even though mouseEnterHandler also calls mouseLeaveCellCallbacks,
  // so that we clean up when mouse leaves table cell area entirely
  // it's still not perfect - if the mouse moves quickly enough, it seems we don't get a mouseLeave event
  const mouseLeaveHandler = () => {
    //cl(`mouseLeaveHandler function ${col.prop} ${rowIndex} cvState: ${cvState}`)
    if (cvState !== 'pinnedOpen') {
      // clean up table.cellPopoverClosers
      const key = col.prop+rowIndex.toString()
      table.cellPopoverStateUpdaters.delete(key)
      myUpdateCVState('closedNoIcon')
    }
  }

  const cellClickHandler = (ev: React.MouseEvent, row: number) => {
    runInAction(()=>{
      if ((table.selection.lastSelAnchor === undefined) || ( ! ev.shiftKey )) {  // just set selection to this row
        table.selection.selRows = new Set<number>( [ row ] )
        table.selection.lastSelAnchor = row
        table.selection.lastSelEndpoint = undefined
      }
      else {  // shift key is pressed and lastSelAnchor is defined
        if (table.selection.lastSelEndpoint !== undefined) { // remove from lastSelAnchor through lastSelEndpoint
          for (let r = Math.min(table.selection.lastSelAnchor, table.selection.lastSelEndpoint); r <= Math.max(table.selection.lastSelAnchor, table.selection.lastSelEndpoint); r++ ) table.selection.selRows.delete(r)
        }
        // extend selection from lastSelAnchor through this, inclusive
        for (let r = Math.min(table.selection.lastSelAnchor, row); r <= Math.max(table.selection.lastSelAnchor, row); r++ ) table.selection.selRows.add(r)
        table.selection.lastSelEndpoint = row
      }
    })
    if (cellClickAction !== undefined) cellClickAction.handler(ti, col, rowIndex)
  }

  const cellDoubleClickHandler = (ev: React.MouseEvent, row: number) => {
    if (cellDoubleClickAction !== undefined) {
      cl(`about to call cellDoubleclickAction.handler`)
      cellDoubleClickAction.handler(ti, col, rowIndex)
    }
  }

  const cellContextMenuHandler = (ev: React.MouseEvent, row: number) => {
    runInAction(()=>{
      if (ev.ctrlKey) {  // if ctrlKey, change selection
        if (table.selection.selRows.has(row)) {   // if this row in selection, remove it
          table.selection.selRows.delete(row)
          table.selection.lastSelAnchor = undefined
          table.selection.lastSelEndpoint = undefined
        }
        else {       // else add this row to selection
          table.selection.selRows.add(row)
          table.selection.lastSelAnchor = row
          table.selection.lastSelEndpoint = undefined
        }
      }
      else if (table.selection.selRows.has(row) === false ) {  // else if this row not in selection, change selection to this row
        table.selection.selRows = new Set<number>( [ row ] )
        table.selection.lastSelAnchor = row
        table.selection.lastSelEndpoint = undefined
      }
    })
    if (cellClickAction !== undefined) cellClickAction?.handler(ti, col, rowIndex)


    // RECONSIDER THIS - IN WHICH CASES DO WE WANT TO PREVDEFAULT/STOPPROP?
    // E.G., STOPPROP ON CTRL-CLICK PREVENTS cellClickAction FROM FIRING (E.G., HIGHLIGHT CONFIGS THAT MATCH A PH)
    // prevent browser or other parts of DOM from handling this click
    // this is inside the if block, because we do NOT want to eat this event if it was not a ctrl-click
    ev.preventDefault()
    ev.stopPropagation()
  }
  
  //cl(`rendering CellContent - cvState: ${cvState}`)
  //cl(`rendering CellContent for col: ${col.prop}, row: ${row}`)
  //cl(`cellContent state is:`)
  //cl(this.state)


  // get cellSpecificJSX from prop methods
  // if it is a string
  //   if length is zero, replace with div that will render non-empty (because passing an empty div to Cell results in rendering something that seems to have zero size and/or does not respond to clicks)
  //   else wrap the string in a div with overflow hidden and ellipsis

// temporary for debugging - putting this in a try/catch block
let cellSpecificJSX: JSX.Element | string
try {
  cellSpecificJSX = ti.parentTTable.tiPropFunctions[prop].singleLineJSX(prop, ti, rowIndex, colIndex)
}
catch(err) {
  //cl(`error getting cellSpecificJSX in CellContent`)
  cellSpecificJSX = <div key='csj'>{`CellContent ERROR geting singleLineJSX: ${err}`}</div>
}
  const cellStyle = {overflow: 'hidden', textOverflow: 'ellipsis' }
  // additional styling to apply only if this is for an extension popup view
  // need to do extra styling for popup because normal browser zoom does not work in popups
  // and just doing a blanket 'transform: scale(x.x) on the popup <body> or parent <div> does not work
  // and the normal cell styling produces a font that is too big, and the CellContent spills over the cell borders a little bit
  const popupStyle = ((ti.parentTTable instanceof TTableCR) && (ti.parentTTable.isForPopup === true)) ?  { fontSize: '10px', height: '16px' } : {}
  if (typeof(cellSpecificJSX) === 'string') {
    if (cellSpecificJSX.length === 0) cellSpecificJSX = <div key='csj' style={{whiteSpace: 'pre'}}> </div>
    cellSpecificJSX = <div key='csj' style={{...cellStyle, ...popupStyle}}>{cellSpecificJSX}</div>
  }
  // for testing purposes - cellSpecificJSX = <div>{cvState}</div>

  // special case - for tiInfo, wrap cellSpecificJSX in div with expand/collapse buttons
  if (prop === 'tiInfo') {

      const q = ti.level

      // determine collapse button behavior
      const tigToCollapse: TIG = 
        ((ti.parentTTable.showHierarchy) && (ti.group==='yes'))
          ? ti
          : ti.parentTIGdef
      const collapseEnabled: boolean = 
        (ti.parentTTable.showHierarchy)
          ? ti.expanded
          : ti.parentTIGdef.expanded

          
      // determine child markers
      const thisRowParents: TIG[] = []
      var t: TI = ti
      while (t.parentTIG !== undefined) { thisRowParents.push(t.parentTIG); t = t.parentTIG }
      thisRowParents.reverse()
      const nextRowParents: TIG[] = []
      if (rowIndex < table.visibleSortedExpandedMap.length - 1) {
        t = table.visibleSortedExpandedMap[rowIndex + 1]
        while (t.parentTIG !== undefined) { nextRowParents.push(t.parentTIG); t = t.parentTIG }
      }
      nextRowParents.reverse()

      // unicode characters:  (see https://jrgraphix.net/r/Unicode/2500-257F)
      //    vertical line:   \u2502
      //    'ell' angle:     \u2514
      //    horiz line:      \u2500
      var groupMarkers = ''
      for (let i = 1; i < thisRowParents.length; i++) {   // note: start index at 1 - the first item in array is always the root, and we don't need to show markers for that
        if (ti.expanded) groupMarkers += ' \u2502 '
        else if (nextRowParents[i] === undefined) groupMarkers += ' \u2514\u2500'
        else if (nextRowParents[i] !== thisRowParents[i]) groupMarkers += ' \u2514\u2500'
        else groupMarkers += ' \u2502 '
      }
// jsx for previous indentation:   {'   '.repeat(ti.level-1)}
      cellSpecificJSX = 
        <div key='csj' style={ { display: 'flex', flexDirection: 'row', alignItems: 'center', backgroundColor: 'inherit', ...popupStyle} }>
          <div key='1' style={{flex: 'none', backgroundColor: 'inherit' }}><pre>{groupMarkers}</pre></div>
          <div key='2' style={{flex: 'none'}}>
            {(ti instanceof TIG)
              ? (ti.expanded 
                ? <Icon 
                    icon='caret-down'
                    key='collapse'
                    onClick={(ev: React.MouseEvent)=>{
                      table.collapseTIG(tigToCollapse)
                      // prevent selection update 
                      ev.stopPropagation()
                    }}
                  />
                : <Icon 
                    icon='caret-right'
                    key='expand'
                    onClick={(ev: React.MouseEvent)=>{
                      runInAction(()=>{
                        // update selection to include this row, before expansion, so that expanded rows will be selected
                        table.selection.selRows.add(rowIndex)
                        table.expandTI(ti)
                      })
                      // prevent selection update 
                      ev.stopPropagation()
                    }}
                  />
              )
              : ''
            }
          </div>
          {cellSpecificJSX}  
        </div>

  }



  // if icon, ContentView or context menu should be active
  if ((cvState==='closedWithIcon')||(cvState==='open')||(cvState==='pinnedOpen')||(cmOpen)) {
    // convert cellCVActions to generic actions, by pre-loading the handlers with arguments including an argument that is a ref to these generic actions, so that the actions can be passed through to ContentViews created
    const actionsCVConvertedToPlain: ActionPlainOrGroup[] = convertActionCVToPlain(cellCVActions, table, ti, col)

    var cvProps: ContentViewProps
    cvProps = makeContentViewPropsFromTIProp(
      ti,
      prop,
      [
        ...actionsCVConvertedToPlain,
        {
          type: 'action',
          id: 'ClosePopover',
          label: 'Close',
          handler: ()=>myUpdateCVState('closedNoIcon'),
          isActive: ()=>true,
          intent: ()=>'none',
          hotkeys: [],
        }
        // could add more actions here
      ],
      { 
        height: { unit: 'px', constraint: 'max', value: 0.7 * window.innerHeight }, // CHANGED FROM BASING ON TTABLE SIZE TO USE WINDOW SIZE  ti.parentTTable.totalHt },
        width:  { unit: 'px', constraint: 'max', value: 0.7 * window.innerWidth  }, // CHANGED FROM BASING ON TTABLE SIZE TO USE WINDOW SIZE  ti.parentTTable.totalWd }
      },
      col.initialCVMode
    )

    cellSpecificJSX =
      <div key='csj'
        style={ { display: 'flex', flexWrap: 'nowrap', flexDirection: 'row', backgroundColor: 'inherit' }}
      >
        <div key='1' style={ { width: '50%', flex: 'auto', overflow: 'hidden', backgroundColor: 'inherit' } }>
          <Popover
            isOpen={cmOpen}
            interactionKind={PopoverInteractionKind.CLICK}
            hoverOpenDelay={0}
            hoverCloseDelay={300}
            modifiers={ { arrow: {enabled: false} } }
            onInteraction={(nextOpenState, ev)=>{
              //cl(`${col.prop} ${rowIndex} cell body popover Interaction`)
              if (cmOpen ) cmOpenUpdater(nextOpenState)
            }}
            
            content={
              <ActionMenu group={tableActions}/>
            }
          >
            <div style={ { flex: 'auto', overflow: 'hidden', backgroundColor: 'inherit' } }
              onContextMenu={
                (ev)=>{
                  //cl(`${col.prop} ${rowIndex} cell body ContextMenu`)
                  if ((ev.button === 2) && (tableActions.length > 0)) {    // also conditioned on tableActions not being empty - if empty, don't even open a menu
                    cmOpenUpdater(true)
                    ev.preventDefault()
                  }
                }
              }
            >
              {cellSpecificJSX}
            </div>          
          </Popover>
        </div>
        <div key='2' style={ { flex: 'none', backgroundColor: 'inherit' } }
          // note: handler needs to stop mouse click propagation here, so that click on popover does not trigger effects on Table
          onClick={ (ev: React.MouseEvent) => {
            ev.stopPropagation()
          }}
          onKeyDown={(ev: React.KeyboardEvent)=>{
            // close popover on Escape key
            if (ev.key==='Escape') {
              //cl(`${col.prop} ${rowIndex} icon popover container div KeyDown Escape`)
              myUpdateCVState('closedWithIcon')
              ev.preventDefault()
            }
          }}
        >
          <Popover
            isOpen={(cvState==='open')||(cvState==='pinnedOpen')}
            autoFocus={true}
            //enforceFocus={true}
            placement={'auto'}   // it seems popover will automatically switch to 'top' if it won't fit below the icon
            interactionKind={ PopoverInteractionKind.HOVER }
            hoverOpenDelay={300}  // non-zero so that popups don't open as i move mouse quickly over table
            hoverCloseDelay={300}  // non-zero so that popup doesn't close in the time it takes to move mouse from icon into the popup
            minimal={true}  // removes space between popover target and the popover window - this way, cell does not see mouseLeave when move mouse into ContentView, avoiding having the popover close
            onInteraction={
              (nextOpenState: boolean, ev: SyntheticEvent<HTMLElement, Event> | undefined)=>{
                //cl(`${col.prop} ${rowIndex} icon Interaction (nextOpenState: ${nextOpenState})`)
                if (cvState !== 'pinnedOpen') {    // if pinned open, ignore this event
                  myUpdateCVState(nextOpenState ? 'open' : 'closedWithIcon')
                }
              }
            }
            content={ <ContentView contentStringGetter={cvProps.contentStringGetter} contentJSXGetter={cvProps.contentJSXGetter} cvModes={cvProps.cvModes} titleText={cvProps.titleText} actions={cvProps.actions} initialCVMode={cvProps.initialCVMode} className={cvProps.className} size={cvProps.size} /> }
          >
            <div style={{backgroundColor: 'rgb(19, 124, 189)'}}>
              <Icon
                onMouseLeave={()=>{
                  // tbd - add a timer here to suppress mouseLeave events on the cell for x milliseconds, to give time for mouse to move from icon into the ContentView
                  // without changing the cvState to 'closed...'  (to avoid my workaround of setting minimal={true} above)
                }}
                onClick={(ev)=>{
                  //cl(`${col.prop} ${rowIndex} icon Click`)
                  if (cvState !== 'pinnedOpen') {
                    myUpdateCVState('pinnedOpen')
                  }
                  else {
                    myUpdateCVState('closedWithIcon')
                  }
                }}
                style={ { flex: 'none' } } className='scale_0p7' color='white' icon='menu'
              />
            </div>
          </Popover>
        </div>
      </div>

  }

  //cl(`CellContent returning`)
  return (
    <div 
      style={ {
        backgroundColor: highlightMatchColors[ti.highlightLevelMatching],
        borderLeftStyle: (ti.testResults.highlight && ( ti.group==='no' || ti.expanded===false)) ? 'groove' : 'none' ,
        borderColor: 'palegreen'
      } }
      id={`${col.prop}${rowIndex}`}
      onMouseEnter={()=>{ /*cl(`${col.prop} ${rowIndex} main div MouseEnter`);*/ mouseEnterHandler()} }
      onMouseLeave={()=>{ /*cl(`${col.prop} ${rowIndex} main div MouseLeave`);*/ mouseLeaveHandler()} }
      onClick={(ev: React.MouseEvent)=> cellClickHandler(ev, rowIndex)}
      onDoubleClick={(ev: React.MouseEvent)=> { 
        cl(`cell onDoubleClick`)
        cellDoubleClickHandler(ev, rowIndex)}}
      onContextMenu={(ev)=>{ cellContextMenuHandler(ev, rowIndex) }}
    >
      {cellSpecificJSX}
    </div>
  )


})

  
  

