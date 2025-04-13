import * as React from 'react';
import { useState, useEffect } from 'react';

// import blueprint components
import { Button, Classes, Colors, ControlGroup, HotkeysProvider, Label, Menu, PopoverInteractionKind, PopoverPosition, Switch } from '@blueprintjs/core';
import { Popover2, MenuItem2, Popover2InteractionKind, Tooltip2 } from '@blueprintjs/popover2';
import { Table2, Column, ColumnHeaderCell2, Cell, RenderMode, Region } from '@blueprintjs/table';


import { observer, PropTypes } from 'mobx-react'

import { v4 as uuidv4 } from 'uuid'

import '../vwr-App.css';

import { TTable, ColData, SortDirs } from './TTable base Obj'
import { TI, TIG } from './table items base'
import { ActionCV, ActionPlain, ActionPlainOrGroup, ActionCVOrGroup, ActionPlainGroup, ActionCVGroup, ActionButtonGroup, ActionCellClick, ActionPlainOrGroupOrSpacer } from './Pres Action'
import { TestOrGroupBox } from './Pres Test'
import { DialogDataItem, EditDialog, EditDialogRadio } from './Pres Dialogs'
import { CellContent } from './Pres CellContent'
import { TTableConfig } from './TTableConfig';
import { TTableCR } from './TTableCR';
import { runInAction } from 'mobx';
import { ColumnIndices, RowIndices } from '@blueprintjs/table/lib/esm/common/grid';
import { makeDivSizeStyle, SizePropsPx } from '../common/commonApp';
import { TestOrGroup } from './test';

var _ = require('lodash');

const cl = console.log;




/*

  add catch-all handlers in TTPres for anything that bubbles back up to it

  
*/


// onXXXReporter functions
// arguments
//    ev - the event object passed to the event handler
//    location - string, should identify the component where this event was caught
//    handlingInfo - string[], 0, 1 or more strings with information about what the handler did
// reporters will
//    always show the event name and location
//    if handlingInfo not empty
//        show details of ev object (e.g., keys pressed, button clicked)
//        show handlingInfo strings
//    indicate whether the event has been preventDefault'ed and/or stopPropagation'ed

export function onWheelReporter(ev: React.WheelEvent, location: string, handlingInfo: string[]) {
  //cl(`onWheel - ${location} - cancelable: ${ev.cancelable ? 'true' : 'false'}${ev.isDefaultPrevented() ? ' - preventDefault called' : ''}${ev.isPropagationStopped() ? ' - stopPropagation called' : ''}`)
  if (handlingInfo.length !== 0) {
    //cl(`\tev: ${ev.ctrlKey?'ctrl-':''}${ev.shiftKey?'shift-':''}${ev.altKey?'alt-':''}${ev.metaKey?'meta-':''}`)
    handlingInfo.map(h => cl(`\t\t${h}`))
  }
}

export function onKeyDownReporter(ev: React.KeyboardEvent, location: string, handlingInfo: string[]) {
  //cl(`onKeyDown - ${location}`)
  if (handlingInfo.length !== 0) {
    //cl(`\tev: ${ev.ctrlKey?'ctrl-':''}${ev.shiftKey?'shift-':''}${ev.altKey?'alt-':''}${ev.metaKey?'meta-':''}${ev.key}`)
    handlingInfo.map(h => cl(`\t\t${h}`))
  }
  //if (ev.isDefaultPrevented()) cl(`\t\tpreventDefault() called`)
  //if (ev.isPropagationStopped()) cl(`\t\tstopPropagation() called`)
}

export function onClickReporter(ev: React.MouseEvent, location: string, handlingInfo: string[]) {
  //cl(`onClick - ${location}`)
  if (handlingInfo.length !== 0) {
    //cl(`\tev: ${ev.ctrlKey?'ctrl-':''}${ev.shiftKey?'shift-':''}${ev.altKey?'alt-':''}${ev.metaKey?'meta-':''} button: ${ev.button}`)
    handlingInfo.map(h => cl(`\t\t${h}`))
  }
  //if (ev.isDefaultPrevented()) cl(`\t\tpreventDefault() called`)
  //if (ev.isPropagationStopped()) cl(`\t\tstopPropagation() called`)
}

export function onContextMenuReporter(ev: React.MouseEvent, location: string, handlingInfo: string[]) {
  //cl(`onContextMenu - ${location}`)
  if (handlingInfo.length !== 0) {
    //cl(`\tev: ${ev.ctrlKey?'ctrl-':''}${ev.shiftKey?'shift-':''}${ev.altKey?'alt-':''}${ev.metaKey?'meta-':''} button: ${ev.button}`)
    handlingInfo.map(h => cl(`\t\t${h}`))
  }
  //if (ev.isDefaultPrevented()) cl(`\t\tpreventDefault() called`)
  //if (ev.isPropagationStopped()) cl(`\t\tstopPropagation() called`)
}

export function onInteractionReporter(nextOpenState: boolean, location: string, handlingInfo: string[]) {
  //cl(`onInteraction - ${location}`)
  if (handlingInfo.length !== 0) {
    //cl(`\tnextOpenState: ${nextOpenState}`)
    handlingInfo.map(h => cl(`\t\t${h}`))
  }
}


export interface ColHeaderMenuContentProps {
  col: ColData
  colIndex: number
  colFreezeFunction: (colIndex: number)=>void
}

export const ColHeaderMenuContent = (props: ColHeaderMenuContentProps) => {
  let { col, colIndex, colFreezeFunction } = props
  return (
    <div 
      className='popupContainer'
      //onWheel={(ev: React.WheelEvent)=>{
      //  console.log(`onWheel inside CellPopoverContent`)
      //  ev.preventDefault()
      //  ev.stopPropagation()
      //}}
    >
      <div>
        <div>{col.title}</div>
      </div>
      <div style={{whiteSpace: 'pre-wrap'}} >
        propname: {col.prop}
        <br/><br/>
        {col.tooltip}
      </div>
        <div>
          <Button 
            onClick={()=>{colFreezeFunction(colIndex+1)}}
          >
            Freeze Through This Column
          </Button>
        </div>
    </div>
  )
}







const TTControls = observer((props: {t: TTable, height: number, width: number, actions: ActionPlainOrGroupOrSpacer[], addedJSX: JSX.Element[]}) => {
  const { t, height, width, actions, addedJSX } = props
  const { showHierarchy, toggleShowHierarchy, sortReset /* OBSOLETE , colReset */ } = props.t
  return (
    <div 
      style={ { height: `${height}px`, width: `${width}px`, flex: 'none', display: 'flex', flexDirection: 'row', alignItems: 'center' } }
    >
      <Switch key='showhier' checked={showHierarchy}      label='Show Hierarchy'        innerLabel='off' innerLabelChecked='on' onChange={()=>toggleShowHierarchy()} />
      <ActionButtonGroup key='abg' actions={[
        {
          type: 'action',
          id: 'ResetSort',
          label: 'Reset Sort',
          handler: ()=>runInAction(()=>sortReset()),
          isActive: ()=>true,
          intent: ()=>'none',
          hotkeys: []
        },
        {
          type: 'action',
          id: 'ClearTTable',
          label: 'Clear Table',
          handler: t.clearTableContents,
          isActive: ()=>(t.root.children.length !== 0),
          intent: ()=>'none',
          hotkeys: []
        },
        {
          type: 'action',
          id: 'ClearTTable',
          label: 'Clear Tests',
          handler: ()=>{runInAction(()=>t.clearTests())},
          isActive: ()=>((t.showTests.groups.length !== 0) || (t.hideTests.groups.length !== 0) || (t.highlightTests.groups.length !== 0)),
          intent: ()=>'none',
          hotkeys: []
        },
        ...actions
      ]}/>
      <pre key='pre1'>   </pre>
      <div
        key='unsavedchanges'
        style={ { backgroundColor: 'orange' } }
      >
        <pre key='unsavedChangesChild'>
          { ( t.showUnsavedChanges &&  t.root.modified )
                ? ' MODIFIED'
                : ''
          }
        </pre>
      </div>
      <div key='addedJSX' style = { { display: 'flex', flexDirection: 'row' } }>{addedJSX}</div>
      <pre key='pre2'>  </pre>
      <div
        key='invalid'
        style={ { backgroundColor: 'red' } }
      >
        { ( t instanceof TTableConfig )
            ? ( ( t.valResultForTable !== 0 )
                ? ' INVALID'
                : ''
              )
            : undefined
        }
      </div>
    </div>
  )
})

export interface TTPresProps {
  t: TTable,
  size: SizePropsPx,
  tableActions: ActionPlainOrGroupOrSpacer[],
  ttControlsActions: ActionPlainOrGroupOrSpacer[],
  cellCVActions: ActionCVOrGroup[],
  cellClickAction?: ActionCellClick,  // can only be one
  cellDoubleClickAction?: ActionCellClick,  // can only be one
  ttControlsAddedJSX: JSX.Element[]
}

export const TTPres = observer((props: TTPresProps) => {

  const { t, size, tableActions, cellCVActions, ttControlsActions, cellClickAction, cellDoubleClickAction } = props
  const { tableName, highlightTests, showTests, hideTests, inactiveTests,
            visibleSortedExpandedMap, cols, numFrozenCols, colFrozenUpdate, colReorder, colSort, setColWidth,
        } = t
  let testboxSizingStyle: React.CSSProperties = {}
  let numTestBoxesVisible: number = 0

  

  const showHighlightTests = highlightTests.groups.length !== 0;  if (showHighlightTests) numTestBoxesVisible++
  const showShowTests      = showTests.groups.length !== 0;  if (showShowTests) numTestBoxesVisible++
  const showHideTests      = hideTests.groups.length !== 0;  if (showHideTests) numTestBoxesVisible++
  const showInactiveTests  = showHighlightTests || showShowTests || showHideTests;  if (showInactiveTests) numTestBoxesVisible++
  const testsVisible = showHighlightTests || showShowTests || showHideTests || showInactiveTests


  const ttControlsHeightPx: number = 50
  const testDivHeightPx: number = 50
  const tableDivSize: SizePropsPx = _.cloneDeep(size)
  tableDivSize.height.value = size.height.value - ttControlsHeightPx - (testsVisible ? testDivHeightPx : 0)

  // local state
  const [ testCreateDialogOpen, testCreateDialogOpenUpdater ] = useState(false)
  const [ testCreateDialogInitialData, testCreateDialogInitialDataUpdater ] = useState<DialogDataItem[]>([])
  const [ testCreateDialogCol, testCreateDialogColUpdater ] = useState(props.t.cols[0])

  //cl(`rendering TTable ${props.t.tableName}`)
  //cl(`size is:`)
  //cl(props.t.size)

  const openTestCreateDialog = (table: TTable, ti: TI, col: ColData) => {
      runInAction(()=>t.openComponentsThatShouldSuppressTTableHotkeysAndVisibleMapUpdateCount++)
      cl(`new TTable.openComponentThatShould... ${t.openComponentsThatShouldSuppressTTableHotkeysAndVisibleMapUpdateCount}`)
      testCreateDialogOpenUpdater(true)
      testCreateDialogInitialDataUpdater([{label: '0', value: ti.parentTTable.tiPropFunctions[col.prop].multiLineString(ti, col.prop, false, 'none')}])
      testCreateDialogColUpdater(col)
  }

  const testDialogCloseHandler = (accepted: boolean, radios: EditDialogRadio[], regexPatterns: DialogDataItem[]) => {
    runInAction(()=>t.openComponentsThatShouldSuppressTTableHotkeysAndVisibleMapUpdateCount--)
    cl(`new TTable.openComponentThatShould... ${t.openComponentsThatShouldSuppressTTableHotkeysAndVisibleMapUpdateCount}`)

    // if accepted, create new tests
    if (accepted) {
      var regExps: RegExp[] = []
      for (let p of regexPatterns) if (p.value !== '') regExps.push(new RegExp(p.value))
      props.t.cellTestCreate(
        testCreateDialogCol,
        (radios[2].chosenValue === 'is') || (radios[2].chosenValue==='including'),
        regExps,
        radios[0].chosenValue,
        radios[1].chosenValue
      )
    }
    testCreateDialogOpenUpdater(false)
  }

  // builds cellCVActions to pass to CellContent's in Table
  // as the cellCVActions passed in with props, plus an action to open the test create dialog
  // previously, had assembled this in the CellContent declaration below
  // but that was causing excessive re-rendering of CellContents - apparently every CellContent was re-rendering
  // every time TTPres re-rendered, presumably because javascript was creating a new array object each
  // time, which CellContent detected as a change in its props, even though the values in the array did not change
  // so now, the assembled cellCVActions are calculated as a local state variable
  const [ cellCVActionsWithCreateTests, cellCVAWCTUpdater ] = useState([...props.cellCVActions, { type: 'action', id: 'OpenTestDialog', label: 'Create Tests', handler: openTestCreateDialog } as ActionCV])


  // create event listeners during capture phase
  useEffect(()=>{
    const el = document.getElementById(t.tableName+'OuterDiv')
    //if (el !== null) el.addEventListener('click', ()=>cl(`======================\nclick - during capture phase`), true)
  }, [])  // note - second argument list is dependency list - making it empty means this will only run after initial mount
  useEffect(()=>{
    const el = document.getElementById(t.tableName+'OuterDiv')
    //if (el !== null) el.addEventListener('keydown', ()=>cl(`======================\nkeydown - during capture phase`), true)
  }, [])  // note - second argument list is dependency list - making it empty means this will only run after initial mount
  useEffect(()=>{
    const el = document.getElementById(t.tableName+'OuterDiv')
    //if (el !== null) el.addEventListener('contextmenu', ()=>cl(`======================\ncontextmenu - during capture phase`), true)
  }, [])  // note - second argument list is dependency list - making it empty means this will only run after initial mount



  function getTableActionsFlat(ag: ActionPlainOrGroupOrSpacer[]): ActionPlain[] {
    const result: ActionPlain[] = []
    for (let c of ag) {
      if (c.type === 'action') result.push(c)
      else if (c.type === 'group') result.push(...getTableActionsFlat(c.children))
      // else ignore it because it is a spacer
    }
    return result
  }

  const tableActionsAmended: ActionPlainOrGroupOrSpacer[] = [...tableActions, 
    {
      type: 'action',
      id: 'SelectAll',
      label: 'Select All Rows',
      handler: ()=>{
        t.selection = {
          selRows: new Set(Array.from(Array(t.visibleSortedExpandedMap.length).keys())),
          lastSelAnchor: undefined,
          lastSelEndpoint: undefined,
        }
      },
      isActive: ()=>true,
      intent: ()=>'none',
      hotkeys: [{ key: 'A', shiftKey: true, ctrlKey: false, altKey: false, metaKey: false }],
    },
    {
      type: 'action',
      id: 'ClearHighlightLevelMatching',
      label: 'Clear Matching Highlights',
      handler: ()=>t.clearHighlightLevelMatchings(t.root),
      isActive: ()=>true,
      intent: ()=>'none',
      hotkeys: [ { key: 'C', shiftKey: true, ctrlKey: false, altKey: false, metaKey: false } ]
    },
  ]
  const tableActionsFlat: ActionPlain[] = getTableActionsFlat(tableActionsAmended)


  //cl(`rendering TTPres (${tableName})`);

  if (t.bpTableRef !== undefined) t.bpTableRef.render()


  return (
    <div 
      id={t.tableName+'OuterDiv'}
      style={ makeDivSizeStyle(size) }
      onKeyDown={(ev: React.KeyboardEvent)=>{

        //cl(`TTPres onKeyDown: ev.key: ${ev.key}`)


        // ignore if an editable component is open, unless it is undo key
        if (t.openComponentsThatShouldSuppressTTableHotkeysAndVisibleMapUpdateCount > 0) {
          // test for whether undo key - if so, do NOT return, we want to handle this at the TTable level
          if ((ev.ctrlKey === false) && (ev.key !== 'z')) return
        }
        // then need to reset the typing in variable in propmethod onChangedHandler

        switch (ev.key) {
          case 'ArrowRight':
            var rowToExpand = t.selection.lastSelAnchor
            if (rowToExpand === undefined) if (t.selection.selRows.size > 0) rowToExpand = Array.from(t.selection.selRows.values()).reduce((prev, curr)=>Math.min(prev, curr), 0)
            if ((rowToExpand !== undefined) && (t.visibleSortedExpandedMap[rowToExpand].group === 'yes')) {
              t.expandTI(t.visibleSortedExpandedMap[rowToExpand])
            }
            break
          case 'ArrowLeft':
            var rowToCollapse = t.selection.lastSelAnchor
            if (rowToCollapse === undefined) if (t.selection.selRows.size > 0) rowToCollapse = Array.from(t.selection.selRows.values()).reduce((prev, curr)=>Math.min(prev, curr), 0)
            if (rowToCollapse !== undefined) {
              const tiToCollapse = t.visibleSortedExpandedMap[rowToCollapse]
              if ((tiToCollapse.group === 'yes') && (tiToCollapse.expanded === true)) {
                t.collapseTIG(t.visibleSortedExpandedMap[rowToCollapse] as TIG)
              }
              else {
                const p = t.visibleSortedExpandedMap[rowToCollapse].parentTIG
                if (p !== undefined) t.collapseTIG(p)
              }
            }


            break
          case 'ArrowDown':
            var rowToMoveFrom = t.selection.lastSelAnchor
            if (rowToMoveFrom === undefined) if (t.selection.selRows.size > 0) rowToMoveFrom = Array.from(t.selection.selRows.values()).reduce((prev, curr)=>Math.min(prev, curr), 0)
            if ((rowToMoveFrom !== undefined) && (t.visibleSortedExpandedMap.length > 1)) {
              // if already on last row, just select last row (clear any previous selected range)
              var rowToMoveTo = Math.min(rowToMoveFrom + 1, t.visibleSortedExpandedMap.length - 1)
 
              t.newSelectionFromTIList([t.visibleSortedExpandedMap[rowToMoveTo]], true)
              runInAction(()=>t.selection.lastSelAnchor = rowToMoveTo)
              // scrollToRegion always moves first row of selection jump to top of viewport
              // don't like this behavior, would rather
              //    don't scroll at all if new selection is in viewport already
              //    have the table scroll just enough that the new selection is in viewport
              //t.bpTableRef?.scrollToRegion(t.currentSelectionForBlueprint[0])

              // instead we use scrollByOffset
              // determine if need to scroll based on whether we are close to edge of viewport
              // this is an approximation since 'visibleRows' (which comes from Table.onVisibleCellsChange) 
              // is actually the rows rendered by blueprint, including rows outside the viewport
              // offset added to visibleRows.rowIndexEnd is based on experimentation, and does not always work exactly right
              const needToScroll = (t.visibleRows !== undefined) && (rowToMoveTo > t.visibleRows.rowIndexEnd - 7)
              if (needToScroll) t.bpTableRef?.scrollByOffset({left: 0, top: t.rowHeight})


              // NOTE: TABLE2 HAS OTHER METHODS THAT LOOK LIKE THEY COULD BE USED TO DETERMINE
              // ROWS CURRENTLY VISIBLE
              // E.G., t.bpTableRef?.locator?.convertPointToRow
              // BUT I AM NOT SURE HOW THEY WORK EXACTLY - MAYBE NOT FULLY SUPPORTED YET?  THEY ARE NOT IN THE WEBSITE DOCUMENTATION
              //cl( t.bpTableRef?.locator?.convertPointToRow(115) )

            }

            break
          case 'ArrowUp':
            var rowToMoveFrom = t.selection.lastSelAnchor
            if (rowToMoveFrom === undefined) if (t.selection.selRows.size > 0) rowToMoveFrom = Array.from(t.selection.selRows.values()).reduce((prev, curr)=>Math.min(prev, curr), 0)
            if ((rowToMoveFrom !== undefined) && (t.visibleSortedExpandedMap.length > 1)) {
              // if already on last row, just select last row (clear any previous selected range)
              var rowToMoveTo = Math.max(rowToMoveFrom - 1, 0)
  
              t.newSelectionFromTIList([t.visibleSortedExpandedMap[rowToMoveTo]], true)
              runInAction(()=>t.selection.lastSelAnchor = rowToMoveTo)
              // see notes above in ArrowDown handler
              const needToScroll = (t.visibleRows !== undefined) && (rowToMoveTo < t.visibleRows.rowIndexStart + 3)
              if (needToScroll) t.bpTableRef?.scrollByOffset({left: 0, top: -t.rowHeight})
            }
  
            break
  
          default:
            const currFocusElement: Element | null = document.activeElement
            //if ((currFocusElement !== null) && (currFocusElement instanceof HTMLElement)) currFocusElement.focus()
            let actionId = ''
            let hi: string[] = []
            for (let action of tableActionsFlat) {
              for (let hotkey of action.hotkeys) {
                if (hotkey.key !== ev.key) continue
                if (hotkey.shiftKey !== ev.shiftKey) continue
                if (hotkey.ctrlKey !== ev.ctrlKey) continue
                if (hotkey.altKey !== ev.altKey) continue
                if (hotkey.metaKey !== ev.metaKey) continue
                //cl(`calling handler for action: ${action.id}`)
                actionId = action.id
                action.handler()
                hi.push(`called handler for action: ${actionId}`)
              }
            }
            break
        }


        // REMOVE THIS CRUFT?  onKeyDownReporter(ev, 'TTPres', hi)
      }}
      onClick={(ev: React.MouseEvent)=>{
        // REMOVE THIS CRUFT?  onClickReporter(ev, 'TTPres', [])
      }}
      onContextMenu={(ev: React.MouseEvent)=>{
        // REMOVE THIS CRUFT?  onContextMenuReporter(ev, 'TTPres', [])
      }}
    >
      <TTControls t={t} height={ttControlsHeightPx} width={size.width.value} actions={ttControlsActions} addedJSX={props.ttControlsAddedJSX}/>
      {showHighlightTests ? <TestOrGroupBox testGroup={highlightTests} title='Highlight' sizingStyle={testboxSizingStyle}/> : ' ' }
      {showShowTests      ? <TestOrGroupBox testGroup={showTests}      title='Show'      sizingStyle={testboxSizingStyle}/> : ' ' }
      {showHideTests      ? <TestOrGroupBox testGroup={hideTests}      title='Hide'      sizingStyle={testboxSizingStyle}/> : ' ' }
      {showInactiveTests  ? <TestOrGroupBox testGroup={inactiveTests}  title='Inactive'  sizingStyle={testboxSizingStyle}/> : ' ' }

      <EditDialog
        open={testCreateDialogOpen}
        initialMultiMode={'single'}
        initialRegexMode={'plain'}
        autoConvertToRegex={true}
        optionsRadios={ [
          { options: [ 
            { value: 'Show', label: 'Show' },
            { value: 'Hide', label: 'Hide' },
            { value: 'Highlight', label: 'Highlight' },
          ], chosenValue: 'Show',  eventValueConverter: x => x },
          { options: [ 
            { value: 'and', label: 'And' },
            { value: 'or', label: 'Or' },
          ], chosenValue: 'and',  eventValueConverter: x => x },
          { options: [ 
            { value: 'is', label: 'Is' },
            { value: 'isNot', label: 'Is Not' },
            { value: 'including', label: 'Including' },
            { value: 'notIncluding', label: 'Not Including' },
          ], chosenValue: 'is',  eventValueConverter: x => x },
        ] }
        initialData={testCreateDialogInitialData}
        commitButtonText='Create Test(s)'
        closeHandlerFromParent={testDialogCloseHandler}
      />
      <div
          id={t.tableName+'TableDiv'}
          style={ makeDivSizeStyle(tableDivSize) }
      >
        <HotkeysProvider>
          <Table2 
              cellRendererDependencies={[t.renderForceToggle]}  // see TTable class - code an toggle this prop to force Table2 to re-render when it otherwise would not (e.g., if rows change but total number of rows remains the same, e.g., when changing sort)
              forceRerenderOnSelectionChange = {true}
              renderMode = {RenderMode.NONE}
              numRows={visibleSortedExpandedMap.length}
              numFrozenRows={t.numFrozenRows}
              numFrozenColumns={numFrozenCols}
              columnWidths={cols.map((c: ColData) => c.width)}
              onColumnWidthChanged={(index: number, size: number) => {setColWidth(index, size)}}
              enableColumnReordering={true}
              onColumnsReordered={(oldIndex: number, newIndex: number) => {
                // suppress re-order on frozen column(s)
                if (oldIndex <= numFrozenCols-1) return
                colReorder(oldIndex, newIndex)}
              }
              enableRowResizing = { false }
              defaultRowHeight = { t.rowHeight }
              onVisibleCellsChange={(rowIndices: RowIndices, columnIndices: ColumnIndices)=>{
                // note that this what Table gives us here is the rows/columns that it has rendered
                // including those rendered outside the viewport (which may or may not be the entire visibleSortedExpandedMap)
                // if table has no rows, it tells us rowIndexStart = 0, rowIndexEnd = -1
                //cl(`onVisibleCellChange - rows ${rowIndices.rowIndexStart} - ${rowIndices.rowIndexEnd}`)
                t.visibleRows = rowIndices
              }}
              // stores reference to this Table object, so we can call Table instance methods like scrollToRegion
              // NOT COMPATIBLE WITH TABLE2?? - STILL SEEMS TO WORK WITH BLUEPRINT V4+TABLE2 - NOT SURE IF ACTUALLY OFFICIALLY SUPPORTED
              ref={(ref)=>{ if (ref !== null) t.setBpTableRef(ref)}}

              // note: we manage table selection 'manually'
              // table selection needs to be managed by me (blueprint calls this 'controlled mode')
              // so that i can change the row selection on events like expand/collapse a TIG, or cut/copy/paste
              selectedRegions={t.currentSelectionForBlueprint}
              /* convert each selection to select the whole row */ 
              selectedRegionTransform={(reg: Region) => {reg.cols = null; return reg}}
            >
              { cols.map((col: ColData, colIndex: number) => 
                  <Column 
                    key={col.title}
                    columnHeaderCellRenderer={() => 
                      <ColumnHeaderCell2
                        style={{whiteSpace: 'pre'}}
                        name={col.title}
                        enableColumnReordering={true}
                        menuIcon={'chevron-down'}
                        menuRenderer={(index?: number) => <ColHeaderMenuContent
                          col={col}
                          colIndex={colIndex}
                          colFreezeFunction={colFrozenUpdate}
                        />}
                      >
                        <Button key='asc' style={ { transform: 'scale(0.75)' } } onClick={() => colSort(colIndex, SortDirs.asc)}>
                          {`A${((col.sortDir === SortDirs.asc) && (col.sortLevel > 0)) ? ` ${col.sortLevel}` : ''}`}
                        </Button>
                        <Button key='desc' style={ { transform: 'scale(0.75)' } } onClick={() => colSort(colIndex, SortDirs.desc)}>
                          {`D${((col.sortDir === SortDirs.desc) && (col.sortLevel > 0)) ? ` ${col.sortLevel}` : ''}`}
                        </Button>
                      </ColumnHeaderCell2>
                    }
                    cellRenderer={
                      (rowIndex: number, colIndex: number) =>
                        <Cell
                          key={visibleSortedExpandedMap[rowIndex].toString()+col.prop}
                        >
                          <CellContent 
                            table={t}
                            ti={visibleSortedExpandedMap[rowIndex]}
                            col={col}
                            rowIndex={rowIndex}
                            colIndex={colIndex}
                            tableActions={tableActionsAmended}
                            cellCVActions={ cellCVActionsWithCreateTests}
                            cellClickAction={cellClickAction}
                            cellDoubleClickAction={cellDoubleClickAction}
                          />
                        </Cell>
                    }
                  />
                )
              }
            </Table2>
        </HotkeysProvider>
      </div>


    </div>
  )
})
















