import * as React from 'react'

import { Table2, Region } from '@blueprintjs/table'

import { observable, computed, action, reaction, toJS, IReactionDisposer, comparer, makeObservable, makeAutoObservable, IObjectDidChange, IArrayDidChange, runInAction } from 'mobx'
import { v4 as uuidv4 } from 'uuid'

import '../vwr-App.css'

import { KindsI, WSWMsgOpResultTypes, WSWMsgOpTypes, WSWQueuedOp } from '../common/commonAll'
import { CVMode, CVModeTransformers, DnDApp, SizePropsPx } from '../common/commonApp'

import { TI, TIG, TII } from './table items base'
import { mapPMViewerObj, TIPropFunctionMap, TIPropFunctions } from '../common/propMethods'
import { Test, TestAndGroup, TestOrGroup } from './test'
import { OI, OIG, OII } from './table items OI'
import { CellContentCVStates } from './Pres CellContent'
import { RowIndices } from '@blueprintjs/table/lib/esm/common/grid'
import { WebSocketWrapperBrowser2 } from '../common/WebSocketWrapperBrowser'




var _ = require('lodash')

const cl = console.log
const ct = console.table



//================================
// interfaces and classes for main objects of ttable

export type TestGroupTypes = 'Highlight' | 'Show' | 'Hide' | 'Inactive'

export enum SortDirs { asc, desc, none }  // valid sort directions for a column

// column fields to be stored in browser storage
// and to be used in declaration of default column settings
export class ColData {
  [index: string]: any
  prop: string
  title: string
  tooltip: string
  sortDir:  SortDirs
  sortLevel: number
  width: number
  cellCss: string
  visibilityLevel: number  // 1, 2, 3
  initialCVMode: CVMode

  constructor(prop: string, title: string, tooltip: string, sortDir: SortDirs, sortLevel: number, width: number, css: string, visibilityLevel: number, initialCVMode: CVMode) {
    this.prop = prop
    this.title = title
    this.tooltip = tooltip
    this.sortDir = sortDir
    this.sortLevel = sortLevel
    this.width = width
    this.cellCss = css
    this.visibilityLevel = visibilityLevel
    this.initialCVMode = initialCVMode
    makeAutoObservable(this)
  }
}

const MAX_UNDO_STACK_SIZE = 100

export interface TableSelection {
  selRows: Set<number>
  lastSelAnchor: number | undefined
  lastSelEndpoint: number | undefined
}

export interface TIDeltaBase {
  priorItemId: string
  // obsolete - set id is now computed priorSetId: string
  newItemId: string
  // obsolete - set id is now computed newSetId: string
  currentFocusElement: Element | null  // where focus was when this delta happened
  currentTableSelection: TableSelection  // table selection when this delta happened
}

// TIDelta* interfaces
// each should contain sufficient information to both
// undo the change, or apply the change to another instance which is being kept in sync
export interface TIDeltaPropChange<T> extends TIDeltaBase {
  type: 'propChange',
  priorTimestamp: number
  priorModified: boolean
  priorProps: T
  newProps: T
}

export interface TIDeltaArraySplice<T> extends TIDeltaBase {
  type: 'arrayChangeSplice',
  priorTimestampLastArrayMod: number
  index: number
  added: T[]
  addedCount: number
  removed: T[] 
  removedCount: number
}

export interface TIDeltaArrayReplaced<T> extends TIDeltaBase {
  type: 'arrayChangeReplace'
  priorTimestampLastArrayMod: number
  priorChildren: T[]
  newChildren: T[]
}

export type TIDelta<T> = TIDeltaPropChange<T> | TIDeltaArraySplice<T> | TIDeltaArrayReplaced<T>

export interface CellContentCVInfo {
  updateCVState: ()=>void,
  cvState: CellContentCVStates
}



export interface TTableBaseConstructorProps {
  parentDnDApp: DnDApp,
  // OBSOLETE parentServiceOpHandler?: ServiceOperationHandler,
  tableType: 'CRView' | 'CRViewWithDetailView' | 'ObjectView' | 'ConfigView' | 'LogView' | 'PHLogView' | 'RulesBrowser' | 'RulesPihole',
  tiConstructor: (parentTTable: TTable)=>TI,
  tableName: string, 
  initialColData: ColData[],
  tiPropFunctions: TIPropFunctionMap,
  changeTrackingSetupEnabled: boolean,
  changeTrackingActiveAtConstruction: boolean,
  showUnsavedChanges: boolean,
  columnVisibleLevel: number
}

export abstract class TTable {

  parentDnDApp: DnDApp
  // OBSOLETE parentServiceOpHandler: ServiceOperationHandler
  bpTableRef: Table2 | undefined = undefined
  tableType: 'CRView'| 'CRViewWithDetailView' | 'ObjectView' | 'WhiteListView' | 'ConfigView' | 'LogView'| 'PHLogView' | 'RulesBrowser' | 'RulesPihole'
  tableName: string  // used to index into parent's 'tables' object
  get ttControlsInfoString(): string { return `stub`}
  tiPropFunctions: TIPropFunctionMap
  get colStorageKey(): string {return `${this.parentDnDApp.localStorageIdPrefix}${this.tableType}-${this.tableName}`}

  // need this state in backing object for programmatic control of scrolling
  rowHeight: number = 20

  highlightTests: TestOrGroup = new TestOrGroup(this)
  showTests: TestOrGroup = new TestOrGroup(this)
  hideTests: TestOrGroup = new TestOrGroup(this)
  inactiveTests: TestOrGroup = new TestOrGroup(this)

  // root is the root of the TIG tree contained in this TTable - assigned in constructor
  root: TIG = new TIG('rootG', this) // this 'dummy' TIG will be replaced by sub-class constructor with apprpriate TIG kind (e.g., CRG or ConfigG)
  tiConstructor: (parentTTable: TTable)=>TI
  cols: ColData[] = []  // this is an array, not just an object, because the array order encodes the display order
  numFrozenCols: number = 1
  // experiment - to see if changing Table2 numFrozenRows will make it re-render
  numFrozenRows: number = 0

  readonly columnVisibleLevel: number  // set at construction, cannot be changed after that
  viewScale: number = 1.0
  showHierarchy: boolean = true   // if true (a) shows expanded TIGs and (b) sorts children under parents before other sort criteria
  get sortCols(): ColData[] {
    const newSortCols: ColData[] = this.cols.filter((c: ColData) => c.sortLevel !== 0);
    newSortCols.sort((a: ColData, b: ColData) => a.sortLevel - b.sortLevel);
    return newSortCols
  }
  // SEE CELLCONTENT.TSX MOUSEENTERHANDLER FUNCTION
  mouseLeaveCellCallbacks: (()=>void)[] = []
  cellPopoverStateUpdaters: Map<string, CellContentCVInfo> = new Map()
  
  // note: we manage table selection 'manually'
  // table selection needs to be managed by me (blueprint calls this 'controlled mode')
  // so that i can change the row selection on events like expand/collapse a TIG, or cut/copy/paste
  selection: TableSelection = {
    selRows: new Set<number>(),
    lastSelAnchor: undefined,
    lastSelEndpoint: undefined
  }
  get currentSelectionForBlueprint(): Region[] {
    const selArray: number[] = Array.from(this.selection.selRows).sort((a,b)=>(a-b))
    const result: Region[] = []
    let lastRows: [number, number] | undefined
    for (let s of selArray) {
      if (lastRows === undefined) {
        lastRows = [ s, s ]
      }
      else {
        if ( s === lastRows[1]+1) {
          lastRows[1]++
        }
        else {
          result.push( { rows: [ lastRows[0], lastRows[1] ], cols: null } )  // don't just push lastRows, that would push a ref to it, and we are going to assign a new value to it
          lastRows = [ s, s ]
        }
      }
    }
    if (lastRows !== undefined) result.push( { rows: lastRows, cols: null } )
    if (this.selection.lastSelAnchor !== undefined) {  // extra highlight on current selection range
      if (this.selection.lastSelEndpoint !== undefined) {
        result.push( { rows: [ Math.min(this.selection.lastSelAnchor, this.selection.lastSelEndpoint), Math.max(this.selection.lastSelAnchor, this.selection.lastSelEndpoint) ], cols: null } )
        result.push( { rows: [ this.selection.lastSelAnchor, this.selection.lastSelAnchor ], cols: null } )  // additional highlight on anchor, so we can see where another shift-click will anchor from
      }
      else result.push( { rows: [ this.selection.lastSelAnchor, this.selection.lastSelAnchor ], cols: null } )
    }
    return result
  }
  visibleRows: RowIndices | undefined   // populated from Table2 onVisibleCellsChange

  // toggle value to force blueprint Table to re-render
  // this is set as a cellRendererDependencies item in TTPres <Table2>
  // need to use this in cases where table contents change but total number of rows remains the same
  // because Table2 will not automatically re-render when that happens
  renderForceToggle: boolean = false

  changeTrackingSetupEnabled: boolean   // whether to establish reactions/observe callbacks on TI's, to capture changes in tiDeltas
  changeTrackingActive: boolean    // whether onTIDetected should post changes to tiDeltas (so we can disable change recording on undo or load operations, for example)
  showUnsavedChanges: boolean

  // OBSOLETE - NOW USING root.children.md  // nonTempSetMD: 
  // OBSOLETE - NOW USING root.children.md  // this is intended to be a more general id property for the table contents as a whole,
  // OBSOLETE - NOW USING root.children.md  // for comparison to item sets in other places (e.g., inforce on server or in extension background, 
  // OBSOLETE - NOW USING root.children.md  // or in other table instances)
  // OBSOLETE - NOW USING root.children.md  // as of this writing, it is only used for the set of nonTemp items in a TTableConfig
  // OBSOLETE - NOW USING root.children.md  // so it is named 'nonTempSetMD' so that the name reminds me that it is for nonTemp items only
  // OBSOLETE - NOW USING root.children.md  // however, the logic that updates it is in the base TIDelta and TII/TIG types
  // OBSOLETE - NOW USING root.children.md  // maybe in future we will subclass editable TTables from base TTable, 
  // OBSOLETE - NOW USING root.children.md  // and/or move the TIDelta/setMD logic from the base classes to  TTableConfig-specific classes...
  // OBSOLETE - NOW USING root.children.md  nonTempSetMD: SetMDObj = new SetMDObj({ notes: `<at ttable construction>` })
  // adaptation of class method for ConfigSet
   // OBSOLETE - NOW USING root.children.md  updateOwnMD(setModified: boolean) {
   // OBSOLETE - NOW USING root.children.md    this.nonTempSetMD = this.nonTempSetMD.generateUpdatedSetMDObj(this.root.children as unknown as ConfigItemRaw[], setModified)
   // OBSOLETE - NOW USING root.children.md  }
  tiDeltas: TIDelta<TI>[] = []
  onTIChangeListeners: ( (tiDelta: TIDelta<any>, isUndo: boolean) => void )[] = []

  // keeps track of whether there are any cell popover ContentView or Dialog components open in a TTable, so that 
  //    hotkeys that reach the TTable are ignored
  //    visibleSortedExpandedMap will not update itself
  // NOTE: it is up to the editable components themselves to adjust this prop
  // any value greater than zero will result in hotkeys being ignored by TTPres
  openComponentsThatShouldSuppressTTableHotkeysAndVisibleMapUpdateCount: number = 0
  // getter for visibleSortedExpandedMap saves a ref to it's last result, so that 
  // if is triggered again but should not recompute (yet) because a popover is open, it can just return the last result
  lastVisibleSortedExpandedMap: TI[] = []
  changesSinceLastSaveOrAutosave: boolean = false

  serverOpSocket: WebSocketWrapperBrowser2
  serverOpInProgress: WSWQueuedOp | undefined = undefined
  serverOpQueue: WSWQueuedOp[] = []

  constructor(props: TTableBaseConstructorProps) {
    // set TTable properties
    this.parentDnDApp = props.parentDnDApp
    // if no serviceOpHandler provided, put in a dummy one
    // OBSOLETE this.parentServiceOpHandler = (props.parentServiceOpHandler === undefined) ? async (so)=>so : props.parentServiceOpHandler
    this.tableType = props.tableType
    this.tableName = props.tableName
    this.tiConstructor = props.tiConstructor

    this.tiPropFunctions = props.tiPropFunctions
    // moved to initializer above    this.root = new TIG('rootG', this) // this 'dummy' TIG will be replaced by sub-class constructor with apprpriate TIG kind (e.g., CRG or ConfigG)
    this.root.expanded = true
    this.root.parentTTable = this
    this.columnVisibleLevel = props.columnVisibleLevel
    this.changeTrackingSetupEnabled = props.changeTrackingSetupEnabled
    this.changeTrackingActive = props.changeTrackingActiveAtConstruction
    this.showUnsavedChanges = props.showUnsavedChanges


    

    // populate columns
    const colsRawFromStorage: string | null = localStorage.getItem(this.colStorageKey)
    const colsFromStorage: ColData[] = (colsRawFromStorage === null) ? [] : JSON.parse(colsRawFromStorage)
    const colsToPopulate: ColData[] = []
    // use information in colsFromStorage to modify
    //    column order
    //    widths
    //    sort settings
    // algorithm 
    //   iterate over cols from storage
    //     if found in initialCols and col visibility level is <= table col vis level
    //      append to colsToPopulate
    //      override width and sort settings with value from storage
    //     else continue (will just ignore the stored column)
    //   iterate over initialCols
    //    if not in colsFromStorage, just append on to end of initialCols
    let newCol: ColData
    let colIndex: number
    runInAction(()=>{
      for (let cs of colsFromStorage) {
        colIndex = props.initialColData.findIndex(c => (c.prop === cs.prop))
        if ((colIndex !== -1) && (props.initialColData[colIndex].visibilityLevel <= this.columnVisibleLevel)) {
          newCol = props.initialColData[colIndex]
          newCol.width = cs.width
          newCol.sortDir = cs.sortDir
          newCol.sortLevel = cs.sortLevel
          colsToPopulate.push(newCol)
        }
      }
      for (let ci of props.initialColData) {
        colIndex = colsFromStorage.findIndex(c => (c.prop === ci.prop))
        if ((colIndex === -1) &&(ci.visibilityLevel <= this.columnVisibleLevel)) colsToPopulate.push(ci)
      }
      this.cols = colsToPopulate
  
    })

    // need to bind sortComparer to TTable instance so it can access sortCols
    this.sortComparer = this.sortComparer.bind(this)
    this.serverOpResultCallback = this.serverOpResultCallback.bind(this)

    
    this.serverOpSocket = new WebSocketWrapperBrowser2(
      {
        willTryToReconnect: true,
        protocol: 'serverop',
        socketInfo: `${this.parentDnDApp.localStorageIdPrefix} ${this.tableType} ${this.tableName} serverOpSocket`,
        log: true,
        parentOpResultCallback: this.serverOpResultCallback,
      },
      this.parentDnDApp
    )
    this.serverOpSocket.onOpenCallback = ()=>{ this.startNextServerOp() }  // if an op was queued before socket connected, start it now

// what should happen on error or close events?
// first just notify about error but don't do anything - should also get a close event
// on close, resolve all ops with failure

//    this.serverOpSocket.onErrorCallback = 
//    this.serverOpSocket.onCloseCallback = 

    this.serverOpSocket.wswConnect()

    makeObservable(this, {
      tableType: observable,
      tableName: observable,
      ttControlsInfoString: computed({keepAlive: true}),
      // SHOULD NOT BE OBSERVABLE??  tiPropFunctions: observable,
      colStorageKey: computed,
      highlightTests: observable,
      showTests: observable,
      hideTests: observable,
      inactiveTests: observable,
      root: observable.deep,
      cols: observable,
      numFrozenCols: observable,
      numFrozenRows: observable,
      viewScale: observable,
      showHierarchy: observable,
      openComponentsThatShouldSuppressTTableHotkeysAndVisibleMapUpdateCount: observable,
      // use computed.struct for sortCols, so that when cols changes in some way
      // that does not affect sorting, mobx will see that there is no change
      // in the resulting sortCols
      sortCols: computed.struct,
      selection: observable,
      renderForceToggle: observable,
       // OBSOLETE - NOW USING root.children.md  nonTempSetMD: observable,
      currentSelectionForBlueprint: computed,
      newSelectionFromTIList: action.bound,
      visibleSortedExpandedMap: computed,
      setBpTableRef: action.bound,
      colReorder: action.bound,
      colSort: action.bound,
      clearTableContents: action.bound,
      clearTests: action.bound,
      toggleShowHierarchy: action.bound,
      sortReset: action.bound,
      colFrozenUpdate: action.bound,
      setColWidth: action.bound,
      cellTestCreate: action.bound,
      expandTI: action.bound,
      collapseTIG: action.bound,
      // don't make keyDown an action - instead, any observable-changing effects should be wrapped in action downstream
      //keyDown: action.bound,
      onTIChangeDetected: action.bound,
      // OBSOLETE clearUnsavedOnChildren: action.bound,
      // don't make undoDelta an action - the observable-changing effects will be wrapped in runInAction inside of it
      //undoDelta: action.bound,
      clearHighlightLevelMatchings: action.bound,

    })

    // declare reactions here
    //  1) storeCols - reacts to changes in any property on cols, and reacts to changes in column order
    reaction(
      () => {
        //cl(`in storeCols comparer`)
        // maps cols array to 'data' result - so that reaction will detect re-ordering of columns
        return this.cols.map(c => [c.prop, c.title, c.sortDir, c.sortLevel, c.width, c.cellCss]) 
      },
      () => { localStorage.setItem(this.colStorageKey, JSON.stringify(toJS(this.cols))) },
      { equals: comparer.structural }
    )

    // adjust selection if visibleSortedExpandedMap changes
    reaction(
      () => {
        //cl(`reaction checking if visibleSortedExpandedMap changed`)
        return this.visibleSortedExpandedMap.map(i => i._id).join()
      },
      () => {
        //cl(`reaction to adjust selection on visibleSortedExpandedMap change triggered`)
        const selTIs = this.getSelectedTIs()
        this.newSelectionFromTIList(selTIs, true)
      }
    )

  }



  queueServerOp(op: WSWMsgOpTypes): Promise<WSWMsgOpResultTypes> {
    return new Promise((resolve, reject) => {
      const newOp: WSWQueuedOp = {
        op: op,
        resolver: resolve,
        rejecter: reject,
        opQueuedTime: (Date.now() - this.parentDnDApp.startTime)/1000,
        opIssuedToSocketTime: -1,
        opCompletedTime: -1
      }
      this.serverOpQueue.push(newOp)
      cl(`${newOp.opQueuedTime.toFixed(2)}s - ${this.colStorageKey} - op queued - new queue length ${this.serverOpQueue.length}`)
      this.startNextServerOp()
    })
  }

  startNextServerOp() {
    // if op in progress, do nothing
    if (this.serverOpInProgress) return
    // else if queue not empty, start the next op (if there is one) and take it off the queue
    else {
      this.serverOpInProgress = this.serverOpQueue.shift()
      if (this.serverOpInProgress === undefined) return
      else {
        // update opIssuedToSocketTime
        this.serverOpInProgress.opIssuedToSocketTime = (Date.now() - this.parentDnDApp.startTime)/1000
        cl(`${this.serverOpInProgress.opIssuedToSocketTime.toFixed(2)}s - ${this.colStorageKey} - op issued to socket`)
        const sendResult = this.serverOpSocket.wswSendMessage(this.serverOpInProgress.op)
        // if send message failed, behave like other failures, as if received a failure result from the other end (via serverOpResultCallback)
        if (sendResult.unableToSendReason) this.serverOpResultCallback({
          msgType: 'configopresult',
          status: '60',
          status_text: `startNextServerOp tried to send message but failed - ${sendResult.unableToSendReason}`,
          trail: []
        })
      }
    }
  }

  serverOpResultCallback(result: WSWMsgOpResultTypes) {
    const op = this.serverOpInProgress
    if (op === undefined) throw new Error(`serverOpResultCallback called but this.serverOpInProgress was undefined`)
    op.opCompletedTime = (Date.now() - this.parentDnDApp.startTime)/1000  // update opCompletedTime
    // display timings
    cl(`${op.opCompletedTime.toFixed(2)}s - ${this.colStorageKey} - op completed, remaining ops in queue: ${this.serverOpQueue.length}`)
    op.resolver(result)  // call resolver for op in progress
    // (no need to use rejecter - serverOps always 'resolve', if there was an error, the 'unableToSendReason' is populated and caller can handle that)
    this.serverOpInProgress = undefined // clear op in progress
    this.startNextServerOp()  // call startNextServerOp
  }

  // note: needs to have this bound to the TTable in constructor
  // so it can access sortCols
  sortComparer(a: TI, b: TI): number {
    // return negative number if a should be before b
    // return 0 if a and be should remain unchanged in order
    // return positive number if b should be before a
    let colProp: string
    // compare using props in sortCols
    for (let i: number = 0; i < this.sortCols.length; i++) {
      colProp = this.sortCols[i].prop
      const aval = a[colProp]
      const bval = b[colProp]
      // always make undefined values go to bottom of list
      if (aval === undefined) return 1
      else if (bval === undefined) return -1
      else if (this.sortCols[i].sortDir === SortDirs.asc) {
        if      (aval < bval) return -1;
        else if (aval > bval) return  1;
      } else {
        if      (aval > bval) return -1;
        else if (aval < bval) return  1; 
      }
    }
    return 0
  }

  // returns flat list of TIs, including this TIG if it is a TIG, and recurses down through all children if it is expanded
  // sorts children within each TIG, so children will always be immediately after their parent TIG
  // 'excludeThisTI' argument is so that the initial call can tell this method to exclude the root TIG
  getFlatSortedVisibleTIsWithHierarchy(ti: TI, excludeThisTI: boolean): TI[] {
    const result: TI[] = []

    // do not include the root TIG
    if (((ti.testResults.show === true) || (ti.testResults.hide === false)) && (excludeThisTI === false)) result.push(ti)
    // PRIOR CODE - OLD - NOT SURE IF THIS WAS EVERY FULLY TESTED - DOES NOT SEEM TO SUPPORT SHOW OVERRIDING HIDE  if ((ti.testResults.hide === false) && (excludeThisTI === false)) result.push(ti)
      if ((ti.group === 'yes') && (ti.expanded)) {
      // make copy of list of children to be sorted, because sort modifies array in place and we do not want to modify the actual ti.children array
      const sortedChildren = ti.children.concat().sort(this.sortComparer)
      for (let c of sortedChildren) {
        result.push(...this.getFlatSortedVisibleTIsWithHierarchy(c, false))
      }
    }
    return result
  }

  // returns flat list of visible TIs, excluding this TIG if it is a TIG and it is expanded
  // sorts the flat list at the end, therefore TIs will not be grouped by their TIG
  getFlatSortedVisibleTIsNoHierarchy(ti: TI): TI[] {
    const result: TI[] = []

    if (ti.testResults.hide === true) return result
    else{
      if ((ti.group === 'no') || (ti.expanded === false)) result.push(ti)
      else for (let c of ti.children) {
        result.push(...this.getFlatSortedVisibleTIsNoHierarchy(c))
      }
    }
    result.sort(this.sortComparer)
    return result
  }


  get visibleSortedExpandedMap(): TI[] {
    //cl(`visibleSortedExpandedMap getter called`)

    // do not re-compute while any popovers/dialogs are open
    // note that the dependency on openComponents... will automatically make this recompute when the components close
    if (this.openComponentsThatShouldSuppressTTableHotkeysAndVisibleMapUpdateCount) return this.lastVisibleSortedExpandedMap

    let result: TI[] = []

    if (this.showHierarchy) {
      result = this.getFlatSortedVisibleTIsWithHierarchy(this.root, true)
    }
    else {
      result = this.getFlatSortedVisibleTIsNoHierarchy(this.root)
    }

    // update tableRow props
    this.root.resetTableRows()
    result.forEach((t, index) => {t.tableRow = index})

    this.lastVisibleSortedExpandedMap = result


    return result
  }


  setBpTableRef(ref: Table2) {
    //cl(`setBpTableRef, ref is new? ${ref !== this.bpTableRef}`)
    this.bpTableRef = ref
  }

  colReorder(oldIndex: number, newIndex: number) {
    // if newIndex is NaN, it means we dragged the column outside the table
    // just ignore this action
    // note cannot just test newIndex === NaN, since NaN === NaN returns false
    if (Number.isNaN(newIndex)) return;
    // newIndex could be < 0 if user dragged a column into the "control columns" area of the table
    // just ignore the action if that is the case
    if (newIndex < 0) return;
    if (newIndex > this.cols.length-1) return

    if (newIndex < oldIndex) this.cols = [
      ...this.cols.slice(0, newIndex),
      this.cols[oldIndex],
      ...this.cols.slice(newIndex, oldIndex),
      ...this.cols.slice(oldIndex+1)
    ]
    else this.cols = [
      ...this.cols.slice(0, oldIndex),
      ...this.cols.slice(oldIndex+1, newIndex+1),
      this.cols[oldIndex],
      ...this.cols.slice(newIndex+1)
    ]
  }

  colSort(colIndex: number, ascdesc: SortDirs) {
    if (colIndex < 0) return
    if (colIndex > this.cols.length-1) return

    const selTIs = this.getSelectedTIs()
    const prevSortLevel: number = this.cols[colIndex].sortLevel;

    this.cols.forEach((c: ColData, i: number) => {
      if (i === colIndex) {
        c.sortDir = ascdesc
        c.sortLevel = 1
      }
      else if (c.sortLevel > 0) {
        if ((prevSortLevel === 0) || (c.sortLevel < prevSortLevel))
          c.sortLevel++
      }
    })
    // if showHierarchy, sort root tree in place, down to level of expanded children
    // OBSOLETE if (this.showHierarchy) this.sortTIG(this.root)

    this.newSelectionFromTIList(selTIs, false)
    this.renderForceToggle = ! this.renderForceToggle

  }

  clearTableContents() {   // may be overridden by subclass if clearing contents involves more than just removing root.children
    this.root.children = []
    this.root.md.lastIdSaved = this.root.md.id
  }

  clearTests() {
    this.showTests = new TestOrGroup(this)
    this.hideTests = new TestOrGroup(this)
    this.highlightTests = new TestOrGroup(this)
    this.inactiveTests = new TestOrGroup(this)
  }

  toggleShowHierarchy() {
    this.showHierarchy = !this.showHierarchy
    // if showHierarchy is now on, update sort of tree
    // if showHierarchy, sort root tree in place, down to level of expanded children
    // OBSOLETE if (this.showHierarchy) this.sortTIG(this.root)
  }

  sortReset() {
    this.cols.forEach((c: ColData, i: number) => {
      c.sortDir = SortDirs.none
      c.sortLevel = 0
    })
    // OBSOLETE this.sortTIG(this.root)

    this.renderForceToggle = ! this.renderForceToggle

  }

  colFrozenUpdate(freezeThrough: number) {
    if ((freezeThrough < 1) || (freezeThrough >= this.cols.length)) return
    else this.numFrozenCols = freezeThrough
  }

  setColWidth(colIndex: number, width: number) {
    if (colIndex < 0) return
    if (colIndex > this.cols.length-1) return
    this.cols[colIndex].width = width
  }

  cellTestCreate(
    col: ColData,
    equal: boolean,
    regexes: RegExp[],
    effect: TestGroupTypes,
    andOr: 'and' | 'or'  // if and, creates one TestAndGroup 
                        // if or, for each item in regexes, creates on TestAndGroup (effectively or-ing them)
  ) {
    let testGroup: TestOrGroup
    switch(effect) {
      case 'Highlight': testGroup = this.highlightTests; break
      case 'Show':      testGroup = this.showTests; break
      case 'Hide':      testGroup = this.hideTests; break
      case 'Inactive':  testGroup = this.inactiveTests; break
      default:          testGroup = this.inactiveTests
    }

    if (andOr === 'and') {  // create one new and group
      const newAndGroup: TestAndGroup = new TestAndGroup(testGroup, this.parentDnDApp)
      for (let regex of regexes) {
        newAndGroup.addTest(new Test(newAndGroup, this.parentDnDApp, col.prop, col.title, equal, regex, this.tiPropFunctions[col.prop].testMethod), 0)
      }
      testGroup.addGroup(newAndGroup, testGroup.groups.length)
    }
    else {
      for (let regex of regexes) {  // create a separate and group for each regex
        const newAndGroup: TestAndGroup = new TestAndGroup(testGroup, this.parentDnDApp)
        newAndGroup.addTest(new Test(newAndGroup, this.parentDnDApp, col.prop, col.title, equal, regex, this.tiPropFunctions[col.prop].testMethod), 0)
        testGroup.addGroup(newAndGroup, testGroup.groups.length)
      }
    }
  }

  expandTI(ti: TI) {
    if (ti.group === 'yes') {
      const thisTIGIsSelected = this.selection.selRows.has(ti.tableRow)
      let selTIs = this.getSelectedTIs()
      ti.expanded = true
      // update selection so that same TIs are selected after expansion
      this.newSelectionFromTIList(selTIs, true)
      // if this TIG had been selected, now also include its children
      if (thisTIGIsSelected) {
        for (let c of ti.children) this.selection.selRows.add(c.tableRow)
        this.selection.lastSelAnchor = ti.tableRow
      }
    }
  }

  // if ti is a tig, add visible children to selection
  // if ti is a tii, add parent and its visible children to selection
  extendSelectionToIncludeGroup(ti: TI) {
    if ((ti.group === 'yes') && (ti.expanded === true)) {
      for (let c of ti.children) if (c.tableRow !== -1) this.selection.selRows.add(c.tableRow)
    }
    else if (ti.group === 'no') {
      if ((ti.parentTIG) && (ti.parentTIG !== this.root)) {
        this.selection.selRows.add(ti.parentTIG.tableRow)
        for (let c of ti.parentTIG.children) if (c.tableRow !== -1) this.selection.selRows.add(c.tableRow)
      }
    }
    // else do nothing

  }
  removeChildrenFromSelection(tig: TIG) {
    for (let c of tig.children) {
      this.selection.selRows.delete(c.tableRow)
      if (c.group === 'yes') this.removeChildrenFromSelection(c)
    }
  }

  collapseTIG(tig: TIG) {
    // if tig is root, do not collapse!
    if (tig === this.root) return

    // remove any children from selection (including indirect children)
    this.removeChildrenFromSelection(tig)
    let selTIs = this.getSelectedTIs()
    tig.expanded = false
    // update selection so that same TIs are selected after expansion
    this.newSelectionFromTIList(selTIs, false)
    // make this tig part of the selection, and make it the new anchor
    this.selection.selRows.add(tig.tableRow)
    this.selection.lastSelAnchor = tig.tableRow
  }

  // returns array of TIs in current selection
  // if one of them is a TIG, just return it, not its children (unless a child is separately in the selection)
  getSelectedTIs(): TI[] {
    return (Array.from(this.selection.selRows).map(i => this.visibleSortedExpandedMap[i]))
  }

  // returns array of TIIs in current selection
  // if kind argument provided, include only TII's with that kind
  // if row in selection is a TIG, this will return the bottom-level TIIs underneath it
  getSelectedTIIs(kind?: KindsI): TII[] {
    let resultSet: Set<TII> = new Set()
    let currentTI: TI

    for (let i of this.selection.selRows) {
      currentTI = this.visibleSortedExpandedMap[i]
      if (currentTI instanceof TII) resultSet.add(currentTI)
      else for (let t of currentTI.getTIIs()) resultSet.add(t)
    }
    const resultArray = Array.from(resultSet)
    if (kind === undefined) return resultArray
    else return resultArray.filter(ti => (ti.kind === kind))
  }

  // clears current selection
  clearSelection() {
    this.selection.selRows.clear()
    this.selection.lastSelAnchor = undefined
    this.selection.lastSelEndpoint = undefined 
  }

  // clears current selection
  // updates TI tableRow (by forcing update to visibleSortedExpandedMap)
  // sets selection to list of TIs passed in (can be empty)
  // extends selection to include tis' groups
  // preserves lastSelAnchor|Endpoint, if defined
  newSelectionFromTIList(tis: TI[], includeGroups: boolean) {
    const lastSelAnchorTI: TI | undefined = this.selection.lastSelAnchor ? this.visibleSortedExpandedMap[this.selection.lastSelAnchor] : undefined
    const lastSelEndpointTI: TI | undefined = this.selection.lastSelEndpoint ? this.visibleSortedExpandedMap[this.selection.lastSelEndpoint] : undefined
    // force update to tableRow props
    const map = this.visibleSortedExpandedMap
    // clear existing selection
    this.clearSelection()
    // set selection to ti list passed in
    for (let ti of tis) {

      // SOMETIMES tableRow IS UNDEFINED WHEN THIS METHOD IS CALLED
      // NOT SURE WHY - PROBABLY SHOULD DEBUG
      // IN THE MEANTIME, JUST TEST FOR THEM AND SKIP
      if (ti.tableRow === undefined) continue
      
      if (ti.tableRow !== -1) {
        this.selection.selRows.add(ti.tableRow)
        if (includeGroups) this.extendSelectionToIncludeGroup(ti)
      }
    }
    this.selection.lastSelAnchor = lastSelAnchorTI?.tableRow
    this.selection.lastSelEndpoint = lastSelEndpointTI?.tableRow

  }

  
  // OBSOLETE clearUnsavedOnChildren(ti: TI) {
  // OBSOLETE   if (ti instanceof TII) ti.// OBSOLETE unsavedChanges = false
  // OBSOLETE   else {
  // OBSOLETE     ti.unsavedChangesToChildrenArray = // OBSOLETE false
  // OBSOLETE     for (let c of ti.children) this.clearUnsavedOnChildren(c)
  // OBSOLETE   }
  // OBSOLETE }

  onTIChangeDetected(ti: TI, newDelta: TIDelta<any>) {

    //cl(`onTIChangedDetected - newDelta is:`)
    //cl(newDelta)

    this.changesSinceLastSaveOrAutosave = true
    this.tiDeltas.push(newDelta)
    //this.setMD = newDelta.newSetMD
    // trim stack if exceeds max size
    if (this.tiDeltas.length > MAX_UNDO_STACK_SIZE) {
      this.tiDeltas = this.tiDeltas.slice(1)
    }
    // notify listeners
    for (let listener of this.onTIChangeListeners) {
      listener(newDelta, false)
    }
  }




  // CONSIDER MERGING applyDelta AND undoDelta, with an 'isUndo: boolean' ARGUMENT
  // apply a TIDelta
  // 'track' and 'notifyListeners' determine whether the delta should be handled by tracking and notification
  applyDelta(tiDelta: TIDelta<any>, track: boolean, notifyListeners: boolean) {
    let tiToScrollTo: TI | undefined = undefined

    const priorChangeTracking = this.changeTrackingActive
    this.changeTrackingActive = track
    runInAction(()=> {
      const tiLocation = this.root.findTI(tiDelta.priorItemId)
      // for deltaPropChange, the TI must exist
      if ( tiLocation === undefined ) return // NOTE return is from runInAction
      switch (tiDelta.type) {
        case 'propChange':
          // tiLocation must not be root
          if ( tiLocation.parent === undefined) return // NOTE return is from runInAction
          // note: cannot use populate method because cannot makeObservable on props that are already observable
          const ti = tiLocation.parent.children[tiLocation.index]
          for (let p in tiDelta.priorProps) ti[p] = tiDelta.newProps[p]
          ti._id = tiDelta.newItemId
          tiToScrollTo = ti
          break
        case 'arrayChangeSplice':
          const tigToSplice = (tiLocation.parent === undefined) ? this.root : tiLocation.parent.children[tiLocation.index]
          tigToSplice.children.splice(
            tiDelta.index,
            tiDelta.removedCount,
            ...tiDelta.added.map(i => {
              const newTI = this.tiConstructor(this)
              newTI.populate(i)
              // need to manually set parentTIG, because we are not adding this TI via TIG.addDirectChild
              newTI.parentTIG = tigToSplice as TIG
              return newTI
            })
          )
          tigToSplice._id = tiDelta.newItemId
          break
        case 'arrayChangeReplace':
          const tigToReplaceChildren = (tiLocation.parent === undefined) ? this.root : tiLocation.parent.children[tiLocation.index]
          tigToReplaceChildren.children = tiDelta.newChildren.map(i => {
            const newTI = this.tiConstructor(this)
            newTI.populate(i)
            newTI.parentTIG = tigToReplaceChildren as TIG
            return newTI
          })
          tigToReplaceChildren._id = tiDelta.newItemId
          break
      }

    })
    this.changeTrackingActive = priorChangeTracking
    
    // notify listeners
    if (notifyListeners) {
      for (let listener of this.onTIChangeListeners) {
        listener(tiDelta, true)
      }
    }

  }




  // un-does the last item in tiDelta stack
  // validates that it can be un-done  (not sure if there will be a valid situation where a delta in the stack cannot be un-done)
  // removes item, regardless of whether it can be un-done or not
  // NOTE - THIS IS NOT DESIGNATED AN 'ACTION' IN constructor.makeObservable
  // BECAUSE we need to turn off changeTracking before applying the undo, then turn it on again
  // and if we turned it on within an action, the observe's would not be called until it was back on
  undoDelta(notifyListeners: boolean) {
    //cl(`undoDelta called`)

    if (this.tiDeltas.length === 0) return
    const lastDelta: TIDelta<any> = this.tiDeltas.pop() as TIDelta<any>  // pop() returns TIDelta | undefined, so need to assert it is a TIDelta

    //cl(`lastDelta is:`)
    //cl(lastDelta)

    let tiToScrollTo: TI | undefined = undefined

    const priorChangeTracking = this.changeTrackingActive
    this.changeTrackingActive = false
    runInAction(()=> {
      const tiLocation = this.root.findTI(lastDelta.newItemId)
      // for deltaPropChange, the TI must exist
      if ( tiLocation === undefined ) return // NOTE return is from runInAction
      switch (lastDelta.type) {
        case 'propChange':
          // tiLocation must not be root
          if ( tiLocation.parent === undefined) return // NOTE return is from runInAction
          // note: cannot use populate method because cannot makeObservable on props that are already observable
          const ti = tiLocation.parent.children[tiLocation.index]
          for (let p in lastDelta.priorProps) ti[p] = lastDelta.priorProps[p]
          ti._id = lastDelta.priorItemId
          ti.timestamp = lastDelta.priorTimestamp
          ti.modified = lastDelta.priorModified
          tiToScrollTo = ti
          break
        case 'arrayChangeSplice':
          const tigToSplice = (tiLocation.parent === undefined) ? this.root : tiLocation.parent.children[tiLocation.index]
          tigToSplice.children.splice(
            lastDelta.index,
            lastDelta.addedCount,
            ...lastDelta.removed.map(i => {
              const newTI = this.tiConstructor(this)
              newTI.populate(i)
              // need to manually set parentTIG, because we are not adding this TI via TIG.addDirectChild
              newTI.parentTIG = tigToSplice as TIG
              return newTI
            })
          )
          tigToSplice._id = lastDelta.priorItemId
          this.root.timestampLastArrayMod = lastDelta.priorTimestampLastArrayMod
          break
        case 'arrayChangeReplace':
          const tigToReplaceChildren = (tiLocation.parent === undefined) ? this.root : tiLocation.parent.children[tiLocation.index]
          tigToReplaceChildren.children = lastDelta.priorChildren.map(i => {
            const newTI = this.tiConstructor(this)
            newTI.populate(i)
            newTI.parentTIG = tigToReplaceChildren as TIG
            return newTI
          })
          tigToReplaceChildren._id = lastDelta.priorItemId
          this.root.timestampLastArrayMod = lastDelta.priorTimestampLastArrayMod
          break
      }

      // set selection and focus to where they were when the last delta happened
      this.selection = _.clone(lastDelta.currentTableSelection)
      if ((lastDelta.currentFocusElement !== null) && (lastDelta.currentFocusElement instanceof HTMLElement)) lastDelta.currentFocusElement.focus()

    })
    this.changeTrackingActive = priorChangeTracking

    // notify listeners
    if (notifyListeners) {
      for (let listener of this.onTIChangeListeners) {
        listener(lastDelta, true)
      }
    }
    
    // EXIT IF TITOSCROLLTO UNDEFINED - THAT MEANS THAT NOTHING WAS UNDONE

    // scroll table view so un-done cell is shown - call bpTableRef.scrollToRegion
    // highligh un-done cell (how? - just make it the selection?)
  }

  clearHighlightLevelMatchings(ti: TI) {
    if (ti.group === 'no') ti.highlightLevelMatching = 0
    else {
      for (let c of ti.children) this.clearHighlightLevelMatchings(c)
    }
  }

}





export const testobj = {
  prop1: 'prop1value',
  prop2: 'prop2value',
  childObject: {
    childObjProp1: 1,
    childObjProp2: 'childObjProp2Value'
  },
  childArray: [
    1,
    2,
    true,
    {
      p1: 'aop1',
      p2: 'aop2'
    },
    undefined,
    5
  ],
  function: (a: number)=>{ const b: number = a+1; return b }
}


export interface TTableObjConstructorProps extends Omit<TTableBaseConstructorProps, 'tableType' | 'tiConstructor' | 'tableName' | 'initialColData' | 'tiPropFunctions' | 'changeTrackingSetupEnabled' | 'changeTrackingActiveAtConstruction'> {
  objName: string,
  obj: Object
}

// NOTE:  TTableObj  NEEDS TO BE DECLARED IN SAME FILE AS TTable BASE CLASS
// BECAUSE THEY EACH DEPEND ON THE OTHER
// SINCE DETAILVIEWS AND/OR CONTENTVIEWS CAN BE ASKED TO CREATE TTableObj's
export class TTableObj extends TTable {
  // constrain types of TTable properties to only allow for OI
  name: string = ''
  // define 'level' property (used by OIGs)
  level: number = 0   // level is referenced by children to determine nesting level of each node
  parents: string = ''

  constructor(props: TTableObjConstructorProps) {
    super({
      parentDnDApp: props.parentDnDApp,
      tableType: 'ObjectView',
      tiConstructor: (parentTTable: TTable)=>{return new OII(parentTTable)},
      tableName: props.objName,
      initialColData: [
        ['1', 'tiInfo','Controls', 'ttCellPreWrap','', '100', 'none', 'none'],
        ['1', 'nameValueString', 'Property', 'ttCellPreWrap','', '500', 'asc', 'none'],
        ['1', 'kind', 'Type', 'ttCellPreWrap','', '150', 'none', 'none'],
      ].map((v: string[]) => {return new ColData(v[1], v[2], v[4], (v[6]==='asc') ? SortDirs.asc : SortDirs.none, 0, parseInt(v[5]), v[3], Number.parseInt(v[0]), v[6] as CVMode)}),
      tiPropFunctions: mapPMViewerObj,
      columnVisibleLevel: 1,
      changeTrackingSetupEnabled: false,
      changeTrackingActiveAtConstruction: false,
      showUnsavedChanges: false,
    })
    this.root = new OIG(props.objName, props.obj, this)
    
    this.root.expanded = true
  }


}


