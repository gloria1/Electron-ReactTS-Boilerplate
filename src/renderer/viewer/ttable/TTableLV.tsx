
// OBSOLETE  import * as React from 'react';
// OBSOLETE  
// OBSOLETE  import { observable, action, makeObservable, reaction, override, runInAction } from 'mobx'
// OBSOLETE  import { v4 as uuidv4 } from 'uuid'
// OBSOLETE  
// OBSOLETE  import '../vwr-App.css'
// OBSOLETE  
// OBSOLETE  import { LogLineRecordFromMongo, LVKindsG, ServiceOperationConfigPush, ServiceOperationHandler, ServiceOperationLogPull } from '../common/commonAll'
// OBSOLETE  import { makePHIDictKey, PH, PHG, PHI, PHReqCNAME, PHResIPSet, PHResolution } from './table items PH'
// OBSOLETE  import { CVMode, SizePropsPx } from '../common/commonApp'
// OBSOLETE  
// OBSOLETE  import { TIPropFunctions, generic, genericGroupedDeduped, genericGroupedKeepDups, TIPropFunctionMap } from '../common/propMethods'
// OBSOLETE  
// OBSOLETE  import { LV, LVG, LVI, LogLineRaw } from './table items LV'
// OBSOLETE  import { ColData, SortDirs, TTable, TTableBaseConstructorProps } from './TTable base Obj'
// OBSOLETE  import CodeMirrorView from '../common/codemirrorView'
// OBSOLETE  import { ConfigItemRaw, ConfigRulePihole, makeNewConfigItemRaw, makeNewSetRaw, tools } from '../common/configTypesTypes'
// OBSOLETE  import { TTableConfig } from './TTableConfig'
// OBSOLETE  import { TII } from './table items base';
// OBSOLETE  
// OBSOLETE  
// OBSOLETE  
// OBSOLETE  
// OBSOLETE  var _ = require('lodash')
// OBSOLETE  
// OBSOLETE  const cl = console.log
// OBSOLETE  const ct = console.table
// OBSOLETE  
// OBSOLETE  
// OBSOLETE  
// OBSOLETE  
// OBSOLETE  
// OBSOLETE  // return the common domain parts of a and b (return [] if none)
// OBSOLETE  // skipFirst argument is optional - if provided, will skip first n parts
// OBSOLETE  export function commonDomainParts(aParts: string[], bParts: string[], skipFirst?: number): string[] {
// OBSOLETE    const result: string[] = []
// OBSOLETE    const commonPartCount = Math.min(aParts.length, bParts.length)
// OBSOLETE    for (let i=(skipFirst === undefined) ? 0 : skipFirst ; i < commonPartCount; i++) {
// OBSOLETE      if (aParts[i] === bParts[i]) result.push(aParts[i])
// OBSOLETE      else break
// OBSOLETE    }
// OBSOLETE    return result
// OBSOLETE  }
// OBSOLETE  
// OBSOLETE  // returns value for Array.sort method, based on part-wise comparison of domainParts
// OBSOLETE  function sortComparerUsingDomainParts(a: LV, b: LV) {
// OBSOLETE    const minLength = Math.min(a.domainParts.length, b.domainParts.length)
// OBSOLETE    for (let i = 0; i < minLength; i++) {
// OBSOLETE      if (a.domainParts[i] < b.domainParts[i]) return -1
// OBSOLETE      else if (a.domainParts[i] > b.domainParts[i]) return 1
// OBSOLETE    }
// OBSOLETE    // if we got this far, everything matches for the segments in both a and b
// OBSOLETE    // make the less-specific domain appear first
// OBSOLETE    if (a.domainParts.length = b.domainParts.length) return 0
// OBSOLETE    if (a.domainParts.length < b.domainParts.length) return -1
// OBSOLETE    else return 1
// OBSOLETE  }
// OBSOLETE  
// OBSOLETE  
// OBSOLETE  
// OBSOLETE  
// OBSOLETE  // for the 'cnameChains' prop - based on genericGroupedKeepDups
// OBSOLETE  // but JSX highlights this ph's domain
// OBSOLETE  const lvPiholeCnameChainsString : TIPropFunctions = {
// OBSOLETE    hasPropItems: genericGroupedKeepDups.hasPropItems,
// OBSOLETE    convertOnLoad: genericGroupedKeepDups.convertOnLoad,
// OBSOLETE    testMethod: generic.testMethod,
// OBSOLETE    val: genericGroupedKeepDups.val,
// OBSOLETE    active: genericGroupedKeepDups.active,
// OBSOLETE    computeGroupProp: genericGroupedKeepDups.computeGroupProp,
// OBSOLETE    singleLineString: genericGroupedKeepDups.singleLineString,
// OBSOLETE    singleLineJSX(propName: string, ph: LV): JSX.Element | string {
// OBSOLETE      if (ph[propName] === undefined) return '---'
// OBSOLETE      else {
// OBSOLETE        const counts = ph[propName+'PropItems'].uniqueCount
// OBSOLETE        const items = Object.getOwnPropertyNames(counts.counts).sort()   // we sort here, but not for multiLineString, because ContentView has a 'sorted' mode
// OBSOLETE        const jsxByItem: JSX.Element[] = items.map(l => {
// OBSOLETE          const itemParts: string[] = l.split(ph.domain)
// OBSOLETE          const result: JSX.Element = <span>{itemParts.map((lp, i) => {
// OBSOLETE            return ( <span>{lp}{(i < itemParts.length - 1) ? <span><b>{ph.domain}</b></span> : <span>, </span>}</span> )
// OBSOLETE          })}</span>
// OBSOLETE          return result
// OBSOLETE        })
// OBSOLETE        return <span>{(counts.total > 1) ? (`(${counts.total}t` + ((items.length > 1) ? `/${items.length}u) ` : ') ')) : ''}{jsxByItem.map((jl, i)=>{
// OBSOLETE          return ( <span>{jl}</span> )
// OBSOLETE        })}</span>
// OBSOLETE      }
// OBSOLETE  
// OBSOLETE  
// OBSOLETE  
// OBSOLETE    },
// OBSOLETE    multiLineString: genericGroupedKeepDups.multiLineString,
// OBSOLETE    contentViewJSX(ph: LV, propName: string, includeCount: boolean, cvMode: CVMode, size?: SizePropsPx): JSX.Element {
// OBSOLETE      if (ph[propName] === undefined) return <div className='ttCellMultiLineJSX'>---</div>
// OBSOLETE      //else return <div className='ttCellMultiLineJSX'>{genericGrouped.multiLineString(ti, propName, includeCount, cvMode)}</div>
// OBSOLETE      else return (
// OBSOLETE        <CodeMirrorView
// OBSOLETE          value={genericGroupedKeepDups.multiLineString(ph, propName, includeCount, cvMode)}
// OBSOLETE          mode={cvMode}
// OBSOLETE          // OBSOLETE initialFocus={'matchInput'}
// OBSOLETE          // OBSOLETE initialMatchPattern={ph.domain}
// OBSOLETE          size={ size }
// OBSOLETE          editable={false}
// OBSOLETE        />
// OBSOLETE      )
// OBSOLETE    },
// OBSOLETE  }
// OBSOLETE  
// OBSOLETE  // for the 'domain' prop
// OBSOLETE  // group prop will be the most-common domain name across the children
// OBSOLETE  // singleLineJSX colors based on whether allowed, blocked or some of each
// OBSOLETE  const lvDomain : TIPropFunctions = {
// OBSOLETE    hasPropItems: generic.hasPropItems,
// OBSOLETE    convertOnLoad: generic.convertOnLoad,
// OBSOLETE    testMethod: generic.testMethod,
// OBSOLETE    val: generic.val,
// OBSOLETE    active: generic.active,
// OBSOLETE    computeGroupProp: (phg: LVG, children: LV[], propName: string) => {
// OBSOLETE      var result: string[] = []  // this will be the final result if there are no children
// OBSOLETE      if (children.length !== 0) {
// OBSOLETE        result = children[0].domainParts
// OBSOLETE        for (let c of children) {
// OBSOLETE          if ((c instanceof TII) && (c.testResults.hide === true)) continue  // don't include child TIIs that are hidden
// OBSOLETE          result = commonDomainParts(result, c.domainParts)
// OBSOLETE        }
// OBSOLETE      }
// OBSOLETE      // make result into a domain name
// OBSOLETE      return result.reverse().join('.')
// OBSOLETE    },
// OBSOLETE    singleLineString: generic.singleLineString,
// OBSOLETE    singleLineJSX: (propName: string, ph: LV, rowIndex: number, colIndex: number) => {
// OBSOLETE  
// OBSOLETE      var color = 
// OBSOLETE        (ph.anyResolved && !ph.anyBlocked) ? 'green'
// OBSOLETE        : ((ph.anyResolved && ph.anyBlocked) ? 'orange'
// OBSOLETE            : 'red'
// OBSOLETE          )
// OBSOLETE  
// OBSOLETE      // this is to highlight domains with no dots
// OBSOLETE      // right now it will also highlight regular tlds like com
// OBSOLETE      // can fine tune later to focus only on 'suspicious' single segment domains
// OBSOLETE      // (the 'algorithmic domain names')
// OBSOLETE      var displayString = lvDomain.singleLineString(propName, ph)
// OBSOLETE      if ((displayString.search(/\./) === -1) && (/^(com|org|edu|net)$/.test(displayString) === false)) {
// OBSOLETE        displayString = 'SINGLE DOMAIN ' + displayString
// OBSOLETE        color = 'blue'
// OBSOLETE      }
// OBSOLETE  
// OBSOLETE      return (
// OBSOLETE        <div style={ { textAlign: 'right', direction: 'rtl', color: color } }>
// OBSOLETE          {displayString}
// OBSOLETE        </div>
// OBSOLETE      )
// OBSOLETE    },
// OBSOLETE    multiLineString: generic.multiLineString,
// OBSOLETE    contentViewJSX: generic.contentViewJSX
// OBSOLETE  }
// OBSOLETE  
// OBSOLETE  
// OBSOLETE  
// OBSOLETE  export const mapPMLV: {[index: string]: TIPropFunctions} = {
// OBSOLETE    tiInfo                : generic,
// OBSOLETE    seqNo             : generic,
// OBSOLETE    timestampString   : generic,
// OBSOLETE    latestSeqNoSeen   : generic,
// OBSOLETE    value                 : generic,
// OBSOLETE  }
// OBSOLETE  
// OBSOLETE  
// OBSOLETE  const colDataLVRaw: ColData[] = [
// OBSOLETE    ['1', 'tiInfo','Info', 'ttCellPreWrap','', '200', 'none' , 'none'],
// OBSOLETE    ['1', 'seqNo','seqNo', 'ttCellPreWrap','', '200', 'none' , 'none'],
// OBSOLETE    ['1', 'timestampString','Timestamp String', 'ttCellPreWrap','', '200', 'none' , 'none'],
// OBSOLETE    ['1', 'latestSeqNoSeen','Latest seqNo', 'ttCellPreWrap','', '200', 'none' , 'none'],
// OBSOLETE    ['1', 'value','Value', 'ttCellPreWrap','', '600', 'none' , 'none'],
// OBSOLETE  ].map((v: string[]) => {return new ColData(v[1], v[2], v[4], (v[6]==='asc') ? SortDirs.asc : SortDirs.none, 0, parseInt(v[5]), v[3], Number.parseInt(v[0]), v[6] as CVMode)})
// OBSOLETE  
// OBSOLETE  
// OBSOLETE  export type LVViewModes = 'raw' | 'list' | 'hierarchy'
// OBSOLETE  
// OBSOLETE  export interface TTableLVConstructorProps extends Omit<TTableBaseConstructorProps,'tableType' | 'tiConstructor' | 'initialColData' | 'tiPropFunctions' | 'changeTrackingSetupEnabled' | 'changeTrackingActiveAtConstruction'> {
// OBSOLETE    parentServiceOpHandler: ServiceOperationHandler
// OBSOLETE    relatedTTableConfig?: TTableConfig
// OBSOLETE    rootTIGConstructor?: (kind: LVKindsG, parentTTable: TTableLV) => LVG  // subclass can optionally pass in a more-specific constructor for this.root
// OBSOLETE  }
// OBSOLETE  
// OBSOLETE  export class TTableLV extends TTable {
// OBSOLETE  
// OBSOLETE    // state for log items
// OBSOLETE    // four versions of the same underlying data
// OBSOLETE    // (yes this is redundant state, but don't want to re-generate on every change (may reconsider this strategy if it gets problematic...))
// OBSOLETE    // SO, we will addition/deletion of items into separate methods, to make sure changes stay in sync
// OBSOLETE    logLinesRaw: LogLineRaw[] = []   // the raw items as received from server
// OBSOLETE    lviList: LVI[] = []   // flat list of LVIs for 'domainList' view mode
// OBSOLETE    lviDict: Map<string, LVI> = new Map()  // 
// OBSOLETE    lviHier: LVG = new LVG('rootG', this)  // will be assigned to this.root if viewMode is domainHierarchy
// OBSOLETE  
// OBSOLETE    colDataForList: ColData[] = colDataLVRaw  // ColData[] to be used for 'list' viewMode - will be set by subclass
// OBSOLETE    colDataForHier: ColData[] = colDataLVRaw  // ColData[] to be used for 'hierarchy' viewMode - will be set by subclass
// OBSOLETE    tiPropFunctionsForList: TIPropFunctionMap = mapPMLV
// OBSOLETE    tiPropFunctionsForHier: TIPropFunctionMap = mapPMLV
// OBSOLETE  
// OBSOLETE    // OBSOLETE hostShownInTable: string = ''
// OBSOLETE    viewMode: LVViewModes = 'raw'
// OBSOLETE    ignoreItemsPriorToLastRestart: boolean = true
// OBSOLETE    lastSeqNoReceived: number = -1
// OBSOLETE    lastLogLineRawParsed: number = -1
// OBSOLETE    autoUpdate: boolean = false
// OBSOLETE    latestNSecondsToPull: number | 'no limit' = 300  // when pulling a log, only pull latest N seconds worth of log (undefined means no limit)
// OBSOLETE  
// OBSOLETE    relatedTTableConfig: TTableConfig | undefined = undefined
// OBSOLETE    rulesForLoadedHost: ConfigRulePihole[] | undefined = undefined
// OBSOLETE  
// OBSOLETE    constructor(props: TTableLVConstructorProps) {
// OBSOLETE      super({
// OBSOLETE        parentDnDApp: props.parentDnDApp,
// OBSOLETE        parentServiceOpHandler: props.parentServiceOpHandler,
// OBSOLETE        tableType: 'LogView',
// OBSOLETE        tiConstructor: (parentTTable: TTable)=>{return new LVI(parentTTable as TTableLV)},
// OBSOLETE        tableName: 'generic domain log',
// OBSOLETE        initialColData: colDataLVRaw,
// OBSOLETE        tiPropFunctions: mapPMLV,
// OBSOLETE        // note: root.parentTTable will be set in TTable constructor
// OBSOLETE        columnVisibleLevel: 1,
// OBSOLETE        changeTrackingSetupEnabled: false,
// OBSOLETE        changeTrackingActiveAtConstruction: false,
// OBSOLETE        showUnsavedChanges: false,
// OBSOLETE      })
// OBSOLETE      this.relatedTTableConfig = props.relatedTTableConfig
// OBSOLETE      if (this.relatedTTableConfig !== undefined) {
// OBSOLETE        this.relatedTTableConfig.onTIChangeListeners.push(()=>this.updateRulesForLoadedHost())
// OBSOLETE      }
// OBSOLETE      makeObservable(this, {
// OBSOLETE        logLinesRaw: observable,
// OBSOLETE        lviList: observable,
// OBSOLETE        lviHier: observable,
// OBSOLETE        // OBSOLETE hostShownInTable: observable,
// OBSOLETE        viewMode: observable,
// OBSOLETE        ignoreItemsPriorToLastRestart: observable,
// OBSOLETE        lastSeqNoReceived: observable,
// OBSOLETE        autoUpdate: observable,
// OBSOLETE        latestNSecondsToPull: observable,
// OBSOLETE        rulesForLoadedHost: observable,
// OBSOLETE        updateForViewMode: action.bound,
// OBSOLETE        updateRulesForLoadedHost: action.bound,
// OBSOLETE        pullLogFile: action.bound,
// OBSOLETE        applyLogPullCompletion: action.bound,
// OBSOLETE        logUpdate: action.bound,
// OBSOLETE        parseLVIRaw: action.bound,
// OBSOLETE        clearTableContents: override,
// OBSOLETE        addLVIToState: action.bound,
// OBSOLETE        removeLVIFromState: action.bound,
// OBSOLETE      })
// OBSOLETE  
// OBSOLETE      // need to bind sortComparer to this table instance, so that version here overrides base class implementation
// OBSOLETE      this.sortComparer = this.sortComparer.bind(this)
// OBSOLETE  
// OBSOLETE      runInAction(()=>{
// OBSOLETE        if (props.rootTIGConstructor === undefined) this.root = new LVG('rootG', this)
// OBSOLETE        else this.root = props.rootTIGConstructor('rootG', this)
// OBSOLETE        this.root.expanded = true
// OBSOLETE        this.lviHier.expanded = true
// OBSOLETE      })
// OBSOLETE      this.updateForViewMode(this.viewMode)
// OBSOLETE  
// OBSOLETE      reaction(
// OBSOLETE        ()=>this.viewMode,
// OBSOLETE        (newMode) => this.updateForViewMode(newMode)
// OBSOLETE      )
// OBSOLETE  
// OBSOLETE      reaction(
// OBSOLETE        ()=>this.autoUpdate,
// OBSOLETE        (newAutoUpdate) => {
// OBSOLETE  
// OBSOLETE        }
// OBSOLETE      )
// OBSOLETE    }
// OBSOLETE  
// OBSOLETE    updateForViewMode(newMode: LVViewModes) {
// OBSOLETE      switch (newMode) {
// OBSOLETE        case 'raw':
// OBSOLETE          this.root.expanded = true
// OBSOLETE          this.root.children = this.logLinesRaw
// OBSOLETE          this.cols = colDataLVRaw
// OBSOLETE          this.tiPropFunctions = mapPMLV
// OBSOLETE          break
// OBSOLETE        case 'list':
// OBSOLETE          this.root.expanded = true
// OBSOLETE          this.root.children = this.lviList
// OBSOLETE          this.cols = this.colDataForList
// OBSOLETE          this.tiPropFunctions = this.tiPropFunctionsForList
// OBSOLETE          break
// OBSOLETE        case 'hierarchy':
// OBSOLETE          this.root.children = this.lviHier.children
// OBSOLETE          this.cols = this.colDataForHier
// OBSOLETE          this.tiPropFunctions = this.tiPropFunctionsForHier
// OBSOLETE          break
// OBSOLETE      }
// OBSOLETE  
// OBSOLETE    }
// OBSOLETE    // copy of base class implementation
// OBSOLETE    // plus special case handling for domain - sort based on domainParts, by part
// OBSOLETE    sortComparer(a: LV, b: LV): number {
// OBSOLETE        // return negative number if a should be before b
// OBSOLETE        // return 0 if a and be should remain unchanged in order
// OBSOLETE        // return positive number if b should be before a
// OBSOLETE        let colProp: string
// OBSOLETE        // compare using props in sortCols
// OBSOLETE        for (let i: number = 0; i < this.sortCols.length; i++) {
// OBSOLETE          colProp = this.sortCols[i].prop
// OBSOLETE          const aval = a[colProp]
// OBSOLETE          const bval = b[colProp]
// OBSOLETE          // always make undefined values go to bottom of list
// OBSOLETE          if (aval === undefined) return 1
// OBSOLETE          else if (bval === undefined) return -1
// OBSOLETE          else if (this.sortCols[i].sortDir === SortDirs.asc) {
// OBSOLETE            if (colProp === 'domain') return sortComparerUsingDomainParts(a, b)
// OBSOLETE            if      (aval < bval) return -1;
// OBSOLETE            else if (aval > bval) return  1;
// OBSOLETE          } else {
// OBSOLETE            if (colProp === 'domain') return sortComparerUsingDomainParts(b, a)
// OBSOLETE            if      (aval > bval) return -1;
// OBSOLETE            else if (aval < bval) return  1; 
// OBSOLETE          }
// OBSOLETE        }
// OBSOLETE        return 0
// OBSOLETE    }
// OBSOLETE    
// OBSOLETE    // updates this.rulesForLoadedHost
// OBSOLETE    // rules will be undefined if hostShownInTable is '', or if relatedTTableConfig is undefined
// OBSOLETE    updateRulesForLoadedHost() {
// OBSOLETE      if (this.relatedTTableConfig === undefined) this.rulesForLoadedHost = undefined
// OBSOLETE      // OBSOLETE else if (this.hostShownInTable === '') this.rulesForLoadedHost = undefined
// OBSOLETE      else {
// OBSOLETE        const itemList: ConfigItemRaw[] = []
// OBSOLETE        for (let cii of this.relatedTTableConfig.root.children) /* OBSOLETE if (cii[this.hostShownInTable]) */ itemList.push(cii.export() as ConfigItemRaw)
// OBSOLETE        this.rulesForLoadedHost = tools.tool_pihole.makeRuleListFromConfigItems(itemList, /* OBSOLETE this.hostShownInTable, */ 'pihole_query', 'both')
// OBSOLETE      }
// OBSOLETE    }
// OBSOLETE  
// OBSOLETE  
// OBSOLETE  
// OBSOLETE    // if reparse === true, request last log pull result from server
// OBSOLETE    async pullLogFile(file_to_load: string, host: string, tool: string, append: boolean) {
// OBSOLETE      if (append === false) this.clearTableContents()
// OBSOLETE  
// OBSOLETE      let so: ServiceOperationLogPull = {
// OBSOLETE        uuid: (uuidv4().toString()),
// OBSOLETE        subject: 'log',
// OBSOLETE        load_from_filename: file_to_load,
// OBSOLETE        host: host,
// OBSOLETE        tool: tool,
// OBSOLETE        last_n_seconds_to_pull: this.latestNSecondsToPull.toString(),
// OBSOLETE        since_seqno: this.lastSeqNoReceived.toString(),
// OBSOLETE  
// OBSOLETE        status: '-1',
// OBSOLETE        status_text: '',
// OBSOLETE  
// OBSOLETE        op_type: 'pull',
// OBSOLETE        can_retry: 'undetermined',
// OBSOLETE        server_state: '',
// OBSOLETE      }
// OBSOLETE  
// OBSOLETE      so = await this.parentServiceOpHandler(so) as ServiceOperationLogPull
// OBSOLETE      if (so.status === '0') this.applyLogPullCompletion(so, append)      
// OBSOLETE    }
// OBSOLETE  
// OBSOLETE    applyLogPullCompletion(so: ServiceOperationLogPull, append: boolean) {
// OBSOLETE      // OBSOLETE this.hostShownInTable = so.host
// OBSOLETE      this.updateRulesForLoadedHost()
// OBSOLETE      let lines: LogLineRecordFromMongo[] = (so.payload === undefined) ? [] : so.payload
// OBSOLETE  //lines = lines.slice(0, 20)  // artifically limit log lines pulled to 20
// OBSOLETE      this.logUpdate(append, lines)
// OBSOLETE    }
// OBSOLETE  
// OBSOLETE  
// OBSOLETE    // OVERALL PARSING STACK:
// OBSOLETE    //    logUpdate - in base class
// OBSOLETE    //      populates new items from server into logLinesRaw
// OBSOLETE    //      calls parseNewLogLines
// OBSOLETE    //    parseLVIRaw - class-specific
// OBSOLETE    //      creates/modifies LVIs from new items in logLinesRaw
// OBSOLETE    //      updates latestSeqNoSeen on LVI's
// OBSOLETE    //      calls base class methods for
// OBSOLETE    //        adding the new LVIs to state
// OBSOLETE    //    base class methods - factor things that are the same across subclasses out to base class methods, to make consistent handling easier
// OBSOLETE    //        e.g., adding new LVIs to state
// OBSOLETE  
// OBSOLETE    logUpdate(append: boolean, newLogEntries: LogLineRecordFromMongo[]) {  
// OBSOLETE  
// OBSOLETE      // if not appending, clear existing lvi*
// OBSOLETE      if (append === false) this.clearTableContents()
// OBSOLETE  
// OBSOLETE      // populate lviRaw
// OBSOLETE      // detect empty entries (value === '') and throw them out
// OBSOLETE      // if we see a restart and state is to ignore prior to restart, clear lviRaw
// OBSOLETE      for (let rawItem of newLogEntries) {
// OBSOLETE        if (rawItem.value === '') continue   // skip empty lines - these can occur due to stray \n in stream captured by logscraper
// OBSOLETE        if (this.ignoreItemsPriorToLastRestart && this.isRestart(rawItem)) this.clearTableContents()
// OBSOLETE        const newItem = new LogLineRaw(rawItem, this)
// OBSOLETE        newItem.parentTIG = this.root
// OBSOLETE        this.logLinesRaw.push(newItem)
// OBSOLETE        this.lastSeqNoReceived = rawItem.seqNo
// OBSOLETE      }
// OBSOLETE      this.parseLVIRaw()
// OBSOLETE    }
// OBSOLETE  
// OBSOLETE    // parsing function will be specialized in subclasses
// OBSOLETE    // responsibilities of this function:
// OBSOLETE    //    2) if finds invalid/unexpected log line patterns, throw error to console (means we need to upgrade parsing to handle the new pattern)
// OBSOLETE    //    4) update LVI.latestSeqNoSeen
// OBSOLETE    //    5) update this.lastLogLineRawParsed
// OBSOLETE    // can directly modify existing LVIs and add new ones
// OBSOLETE    // but should only add new LVI's to state using base class 'addLVI...' function
// OBSOLETE    // and remove LVIs with base class 'removeLVI...'
// OBSOLETE    // iterates on LVILogLinesRaw until cannot find anything more to parse
// OBSOLETE    parseLVIRaw() {
// OBSOLETE      // parse lines starting at this.lastLogLineParsed+1
// OBSOLETE      while ((this.lastLogLineRawParsed+1) < this.logLinesRaw.length) {
// OBSOLETE  
// OBSOLETE        // confirm log line is valid, and if a multi-line block, that we have a complete block
// OBSOLETE        // if block is incomplete, check that we are at end of logLinesRaw, else throw an error for that
// OBSOLETE  
// OBSOLETE        
// OBSOLETE  
// OBSOLETE        // if LVI already exists in lviDict, use that
// OBSOLETE        // else construct new LVI
// OBSOLETE        const workingLogLine = this.logLinesRaw[this.lastLogLineRawParsed+1]
// OBSOLETE        const workingLogLineKey = this.getLVIKeyFromLogLineRaw(workingLogLine)
// OBSOLETE        let workingLVI = this.lviDict.get(workingLogLineKey)
// OBSOLETE        if (workingLVI === undefined) {
// OBSOLETE          workingLVI = new LVI(this)
// OBSOLETE        }
// OBSOLETE        // update LVI.latestSeqNoSeen
// OBSOLETE        workingLVI.latestSeqNoSeen = workingLogLine.seqNo
// OBSOLETE        workingLVI.latestTimestampSeen = workingLogLine.timestampString
// OBSOLETE        // populate/update LVI props
// OBSOLETE        workingLVI.value = workingLogLine.value
// OBSOLETE        // if LVI is new, add it to state
// OBSOLETE        if (this.lviDict.get(workingLogLineKey) === undefined) this.addLVIToState(workingLVI)
// OBSOLETE        // advance this.lastLogLineRawParsed
// OBSOLETE        this.lastLogLineRawParsed++
// OBSOLETE      }
// OBSOLETE    }
// OBSOLETE  
// OBSOLETE  
// OBSOLETE    // returns key to use for lviDict
// OBSOLETE    // for base class method, just return mongo id, which will be unique
// OBSOLETE    // subclasses will specialize this
// OBSOLETE    // argument is typed as 'any' because different subclasses may need to pass in differently typed arguments for key construction
// OBSOLETE    getLVIKeyFromLogLineRaw(item: LogLineRaw): string {
// OBSOLETE      return item._id.toString()  
// OBSOLETE    }
// OBSOLETE  
// OBSOLETE  
// OBSOLETE    // factoring out lvi state changes into separate functions
// OBSOLETE    // to make sure all the redundant parts of lvi state stay in sync
// OBSOLETE    clearTableContents() {
// OBSOLETE      // use Array.length=0, rather than assigning new [], in case this.root.children has ref to existing
// OBSOLETE      this.lastSeqNoReceived = 0
// OBSOLETE      this.logLinesRaw.length = 0  
// OBSOLETE      this.lviList.length = 0
// OBSOLETE      this.lviDict.clear()
// OBSOLETE      this.lviHier.children.length = 0
// OBSOLETE      this.lastLogLineRawParsed = -1
// OBSOLETE    }
// OBSOLETE    addLVIToState(newLVI: LVI) {
// OBSOLETE      // make sure this LVI has a key that is not present in dictionary - if not, throw error
// OBSOLETE      if (this.lviDict.get(newLVI.lvKey) !== undefined) throw new Error(`tried to add new LVI but found one with same key already in this.lviDict`)
// OBSOLETE      this.lviList.push(newLVI)
// OBSOLETE      this.lviDict.set(newLVI.lvKey, newLVI)
// OBSOLETE      this.lviHier.addLVI(newLVI)
// OBSOLETE    }
// OBSOLETE  
// OBSOLETE    removeLVIFromState(lviToRemove: LVI) {
// OBSOLETE      try {
// OBSOLETE        this.lviDict.delete(lviToRemove.lvKey)
// OBSOLETE        this.lviList.splice(this.lviList.findIndex(lviInList => (lviInList === lviToRemove)), 1)
// OBSOLETE        const childrenOfParent = lviToRemove.parentTIGdef.children
// OBSOLETE        childrenOfParent.splice(childrenOfParent.findIndex(lviInParent => (lviToRemove === lviInParent)), 1)
// OBSOLETE      }
// OBSOLETE      catch {
// OBSOLETE        throw new Error(`tried to remove LVI but it is not in state`)
// OBSOLETE      }
// OBSOLETE      
// OBSOLETE  
// OBSOLETE    }
// OBSOLETE  
// OBSOLETE    // stub method - will be specialized in subclass to detect whether 'item' is a restart for the tool
// OBSOLETE    isRestart(item: LogLineRecordFromMongo) {
// OBSOLETE      return false
// OBSOLETE    }
// OBSOLETE  }
// OBSOLETE  
// OBSOLETE  
// OBSOLETE  export const mapPMLVPH: {[index: string]: TIPropFunctions} = {
// OBSOLETE    tiInfo                : generic,
// OBSOLETE    latestSeqNoSeen   : generic,
// OBSOLETE    latestTimestampSeen   : generic,
// OBSOLETE    ruleHostScopesThatAffected  : genericGroupedKeepDups,
// OBSOLETE    piholeState           : genericGroupedDeduped,
// OBSOLETE    domain                : lvDomain,
// OBSOLETE    queriesString         : genericGroupedKeepDups,
// OBSOLETE    aliasesString         : genericGroupedKeepDups,
// OBSOLETE    canonicalsString       : genericGroupedKeepDups,
// OBSOLETE    finalResolutionTypesString : genericGroupedDeduped,
// OBSOLETE    finalResolutionsString : genericGroupedKeepDups,
// OBSOLETE    cnameChainsString     : lvPiholeCnameChainsString,
// OBSOLETE    reqString             : genericGroupedKeepDups,
// OBSOLETE    resolString           : genericGroupedKeepDups,
// OBSOLETE    logLines              : genericGroupedKeepDups,
// OBSOLETE  }
// OBSOLETE  
// OBSOLETE  // colData[] for pihole log
// OBSOLETE  const colDataPiholeLog: ColData[] = [
// OBSOLETE    ['1', 'tiInfo','Info', 'ttCellPreWrap','', '200', 'none' , 'none'],
// OBSOLETE    ['1', 'latestSeqNoSeen','Latest seqNo', 'ttCellPreWrap','', '200', 'none' , 'none'],
// OBSOLETE    ['1', 'latestTimestampSeen','Latest Timestamp', 'ttCellPreWrap','', '200', 'none' , 'none'],
// OBSOLETE    ['1', 'ruleHostScopesThatAffected','Rule Scopes', 'ttCellPreWrap','', '200', 'none' , 'none'],
// OBSOLETE    ['1', 'piholeState','PH State', 'ttCellPreWrap','', '80', 'none' , 'none'],
// OBSOLETE    ['1', 'domain','Domain', 'ttCellPreWrap','', '200', 'none' , 'none'],
// OBSOLETE    ['1', 'queriesString','Queries', 'ttCellPreWrap','', '200', 'none' , 'none'],
// OBSOLETE    ['1', 'aliasesString','Direct Aliases', 'ttCellPreWrap','', '200', 'none' , 'none'],
// OBSOLETE    ['1', 'canonicalsString','Direct Canonicals', 'ttCellPreWrap','', '200', 'none' , 'none'],
// OBSOLETE    ['1', 'finalResolutionsString','Final Resolutions', 'ttCellPreWrap','', '200', 'none' , 'none'],
// OBSOLETE    ['1', 'finalResolutionTypesString','Final Resolutions Types', 'ttCellPreWrap','', '200', 'none' , 'none'],
// OBSOLETE    ['1', 'cnameChainsString','CNAME Chains', 'ttCellPreWrap','', '200', 'none' , 'none'],
// OBSOLETE    ['1', 'logLines','Log Lines', 'ttCellPreWrap','', '200', 'none' , 'none'],
// OBSOLETE  ].map((v: string[]) => {return new ColData(v[1], v[2], v[4], (v[6]==='asc') ? SortDirs.asc : SortDirs.none, 0, parseInt(v[5]), v[3], Number.parseInt(v[0]), v[6] as CVMode)})
// OBSOLETE  
// OBSOLETE  // RegExp's to use for parsing pihole.log lines
// OBSOLETE  const c = '^(.{15}) (dnsmasq\\[.*\\]:) '   // common leading information on every pihole.log line
// OBSOLETE  const regexRestartReload                  = new RegExp(c + '(read|exiting|started,|compile|using)')
// OBSOLETE  const regexForwarded                      = new RegExp(c + '(forwarded) ([^ ]*) (to) ([0-9\\.]+|NODATA.*)')
// OBSOLETE  const regexResolution                     = new RegExp(c +                         '(config|.etc.hosts|reply|cached|regex blacklisted|gravity blocked) ([^ ]*) (from|to|is) (<CNAME>|blocked during CNAME inspection|[0-9\\.]+|<HTTPS>|NODATA.*|NXDOMAIN)')
// OBSOLETE  const regexForwardedResolution            = new RegExp(c +               '(forwarded|config|.etc.hosts|reply|cached|regex blacklisted|gravity blocked) ([^ ]*) (from|to|is) (<CNAME>|blocked during CNAME inspection|[0-9\\.]+|<HTTPS>|NODATA.*|NXDOMAIN)')
// OBSOLETE  const regexQueryForwardedResolution       = new RegExp(c + '(query\\[.*\\]|forwarded|config|.etc.hosts|reply|cached|regex blacklisted|gravity blocked) ([^ ]*) (from|to|is) (<CNAME>|blocked during CNAME inspection|[0-9\\.]+|<HTTPS>|NODATA.*|NXDOMAIN)')
// OBSOLETE  const regexResolutionWithIPOnly           = new RegExp(c + '(config|.etc.hosts|reply|cached) ([^ ]*) (is) ([0-9\\.]+|<HTTPS>|NODATA.*|NXDOMAIN)')
// OBSOLETE  const regexResolutionWithIPOrBlockedCNAME = new RegExp(c + '(config|.etc.hosts|reply|cached) ([^ ]*) (is) (blocked during CNAME inspection|[0-9\\.]+|<HTTPS>|NODATA.*|NXDOMAIN)')
// OBSOLETE  const regexPHLogTimestamp                 = new RegExp(/([\w ]{3}) ([\d ]{2}) ([\d ]{2}):(\d\d):(\d\d).*/)
// OBSOLETE  
// OBSOLETE  
// OBSOLETE  
// OBSOLETE  export interface TTableLVPHConstructorProps extends Omit<TTableLVConstructorProps, 'tableType' | 'changeTrackingSetupEnabled' | 'changeTrackingActiveAtConstruction'> {
// OBSOLETE  }
// OBSOLETE  
// OBSOLETE  export class TTableLVPH extends TTableLV {
// OBSOLETE  
// OBSOLETE    piholeState: string = '0'  // to populate keys and piholeState prop, for distinguishing across pihole restarts
// OBSOLETE  
// OBSOLETE    // parsing state for multi-line blocks
// OBSOLETE    // if last line parsed was (or could be) part of multiline block, store refs to it in state
// OBSOLETE    // so parser can handle next line accordingly
// OBSOLETE    lviForIPSetFromLastLineParsed: {
// OBSOLETE      lvi: PHI
// OBSOLETE      resIndexForIPSet: number
// OBSOLETE    } | undefined = undefined
// OBSOLETE    lvisForCNAMEChainFromLastLinesParsed: {
// OBSOLETE      lvi: PHI
// OBSOLETE      resIndex: number  // index in lvi.resolutions of the canonical resolution
// OBSOLETE    } [] = []
// OBSOLETE  
// OBSOLETE  
// OBSOLETE    constructor(props: TTableLVPHConstructorProps) {
// OBSOLETE      super({
// OBSOLETE        parentDnDApp: props.parentDnDApp,
// OBSOLETE        parentServiceOpHandler: props.parentServiceOpHandler,
// OBSOLETE        tableName: 'pihole domain log',
// OBSOLETE        rootTIGConstructor: (kind: LVKindsG, parentTTable: TTableLV)=>{return new PHG('rootG', parentTTable)},
// OBSOLETE        // note: root.parentTTable will be set in TTable constructor
// OBSOLETE        columnVisibleLevel: 1,
// OBSOLETE        showUnsavedChanges: false,
// OBSOLETE      })
// OBSOLETE      this.tableType = 'PHLogView'
// OBSOLETE      
// OBSOLETE      // need to replace root with a PHG (will be an LVG coming from base class constructor)
// OBSOLETE      runInAction(()=>{
// OBSOLETE        this.root = new PHG('rootG', this)   // need to make  root and lviHier PHG objects, so those subclass method will be called
// OBSOLETE        this.lviHier = new PHG('rootG', this)
// OBSOLETE        this.root.expanded = true
// OBSOLETE        this.lviHier.expanded = true
// OBSOLETE      })
// OBSOLETE  
// OBSOLETE      runInAction(()=>{this.root.children = this.logLinesRaw})
// OBSOLETE  
// OBSOLETE      this.colDataForHier = colDataPiholeLog
// OBSOLETE      this.colDataForList = colDataPiholeLog
// OBSOLETE      this.tiPropFunctionsForList = mapPMLVPH
// OBSOLETE      this.tiPropFunctionsForHier = mapPMLVPH
// OBSOLETE      runInAction(()=>{this.viewMode = 'list'})
// OBSOLETE      this.updateForViewMode(this.viewMode)
// OBSOLETE  
// OBSOLETE  
// OBSOLETE      makeObservable(this, {
// OBSOLETE        clearTableContents: override,
// OBSOLETE        makeTempAllowItemsAndCommit: action.bound,
// OBSOLETE      })
// OBSOLETE    }
// OBSOLETE  
// OBSOLETE    // override TTableLV to also reset this.piholeState
// OBSOLETE    clearTableContents() {
// OBSOLETE      super.clearTableContents()
// OBSOLETE      this.piholeState = '0'
// OBSOLETE      // reset parsing state
// OBSOLETE      this.lviForIPSetFromLastLineParsed = undefined
// OBSOLETE      this.lvisForCNAMEChainFromLastLinesParsed = []
// OBSOLETE    }
// OBSOLETE  
// OBSOLETE    getLVIKeyFromLogLineRaw(item: LogLineRaw): string {
// OBSOLETE      const parts: any = regexQueryForwardedResolution.exec(item.value)
// OBSOLETE      if (parts === null) throw new Error(`tried to build LVI key using ${item} but not valid pattern`)
// OBSOLETE      return this.piholeState + ' ' + parts[4]
// OBSOLETE    }
// OBSOLETE  
// OBSOLETE    isRestart(item: LogLineRecordFromMongo) {
// OBSOLETE      return (regexRestartReload.exec(item.value) !== null)
// OBSOLETE  
// OBSOLETE    }
// OBSOLETE  
// OBSOLETE    // 'exact' - true means make regex to match domain prop of each PH exactly, false means make regex to also match subdomains
// OBSOLETE    // expirationSeconds is the expiration time for each item to create
// OBSOLETE    makeTempAllowItemsAndCommit(phs: PH[], exact: boolean, expirationSeconds: number) {
// OBSOLETE      // OBSOLETE const tempItemTemplate: ConfigItemRaw = {
// OBSOLETE      // OBSOLETE   tool_browser: false,
// OBSOLETE      // OBSOLETE   tool_lsnitch: false,
// OBSOLETE      // OBSOLETE   tool_pihole: true,
// OBSOLETE      // OBSOLETE   tool_squid: false,
// OBSOLETE      // OBSOLETE   host_ded_desktop_browser_edge: false,
// OBSOLETE      // OBSOLETE   host_lp1_lblack2_pihole_1: true,
// OBSOLETE      // OBSOLETE   tempItem: true,
// OBSOLETE      // OBSOLETE   expirationTime: 0,  // value will be replaced by server, based on service op expiration_seconds
// OBSOLETE      // OBSOLETE   _id: 'template_replace_me',
// OBSOLETE      // OBSOLETE   notes: 'template_replace_me',
// OBSOLETE      // OBSOLETE   priority: '5',
// OBSOLETE      // OBSOLETE   requestAction: 'allow',
// OBSOLETE      // OBSOLETE   jsAction: 'NA',
// OBSOLETE      // OBSOLETE   reqHdrAction: 'NA',
// OBSOLETE      // OBSOLETE   reqHdrMods: '',
// OBSOLETE      // OBSOLETE   resHdrAction: 'NA',
// OBSOLETE      // OBSOLETE   resHdrMods: '',
// OBSOLETE      // OBSOLETE   sslbumpAction: "bump",
// OBSOLETE      // OBSOLETE   urlRegexPattern: "",
// OBSOLETE      // OBSOLETE   hostDomainPatterns: 'template_replace_me',
// OBSOLETE      // OBSOLETE   initiatorRegexPattern: "",
// OBSOLETE      // OBSOLETE   excludedDomains: "",
// OBSOLETE      // OBSOLETE   requestMethods: "",
// OBSOLETE      // OBSOLETE   excludedRequestMethods: "",
// OBSOLETE      // OBSOLETE   resourceTypes: "",
// OBSOLETE      // OBSOLETE   excludedResourceTypes: "",
// OBSOLETE      // OBSOLETE   tabIds: '',
// OBSOLETE      // OBSOLETE   excludedTabIds: "",
// OBSOLETE      // OBSOLETE   remoteAddresses: "",
// OBSOLETE      // OBSOLETE   lsprocess: "",
// OBSOLETE      // OBSOLETE   lsvia: "",
// OBSOLETE      // OBSOLETE   lsremote: "any",
// OBSOLETE      // OBSOLETE   lsdirection: "outgoing",
// OBSOLETE      // OBSOLETE   lsdisabled: false,
// OBSOLETE      // OBSOLETE   lsports: "",
// OBSOLETE      // OBSOLETE   lsprotocol: "any"
// OBSOLETE      // OBSOLETE }
// OBSOLETE      const tempItems: ConfigItemRaw[] = []
// OBSOLETE  
// OBSOLETE      // for each ph, add to tempItems
// OBSOLETE      for (let ph of phs) {
// OBSOLETE        const newTempItem: ConfigItemRaw = makeNewConfigItemRaw({
// OBSOLETE          tool_browser: false,
// OBSOLETE          tool_lsnitch: false,
// OBSOLETE          tool_pihole: true,
// OBSOLETE          tool_squid: false,
// OBSOLETE          tempItem: true,
// OBSOLETE          expirationTime: 0,  // value will be replaced by server, based on service op expiration_seconds
// OBSOLETE          _id: 'template_replace_me',
// OBSOLETE          notes: 'template_replace_me',
// OBSOLETE          priority: '100',
// OBSOLETE          requestAction: 'allow',
// OBSOLETE          jsAction: 'NA',
// OBSOLETE          reqHdrAction: 'NA',
// OBSOLETE          reqHdrMods: '',
// OBSOLETE          resHdrAction: 'NA',
// OBSOLETE          resHdrMods: '',
// OBSOLETE          sslbumpAction: "bump",
// OBSOLETE          urlRegexPattern: "",
// OBSOLETE          hostDomainPatterns: ((exact) ? '^' : '(\.|^)') + ph.domain + '$',
// OBSOLETE          initiatorDomains: "",
// OBSOLETE          excludedInitiatorDomains: "",
// OBSOLETE          excludedRequestDomains: "",
// OBSOLETE          requestMethods: "",
// OBSOLETE          excludedRequestMethods: "",
// OBSOLETE          resourceTypes: "",
// OBSOLETE          excludedResourceTypes: "",
// OBSOLETE          tabIds: '',
// OBSOLETE          excludedTabIds: "",
// OBSOLETE          remoteAddresses: "",
// OBSOLETE          lsprocess: "",
// OBSOLETE          lsvia: "",
// OBSOLETE          lsremote: "any",
// OBSOLETE          lsdirection: "outgoing",
// OBSOLETE          lsdisabled: false,
// OBSOLETE          lsports: "",
// OBSOLETE          lsprotocol: "any"
// OBSOLETE        // OBSOLETE }, {
// OBSOLETE        // OBSOLETE   host_ded_desktop_browser_edge: false,
// OBSOLETE        // OBSOLETE   host_lp1_lblack2_pihole_1: true
// OBSOLETE        })
// OBSOLETE        //OBSOLETE  = _.clone(tempItemTemplate)
// OBSOLETE        //OBSOLETE newTempItem._id = uuidv4()
// OBSOLETE        //OBSOLETE newTempItem.notes = 'WILL REPLACE ON SERVER SIDE'
// OBSOLETE        //OBSOLETE newTempItem.hostDomainPatterns = ((exact) ? '^' : '(\.|^)') + ph.domain + '$'
// OBSOLETE        tempItems.push(newTempItem)
// OBSOLETE      }
// OBSOLETE  
// OBSOLETE      // commit new temp items to server
// OBSOLETE      const so: ServiceOperationConfigPush = {
// OBSOLETE        uuid: uuidv4(),
// OBSOLETE        status: '-1',
// OBSOLETE        status_text: '',
// OBSOLETE        can_retry: 'no',
// OBSOLETE        server_state: '',
// OBSOLETE  
// OBSOLETE        subject: 'config',
// OBSOLETE        op_type: 'push',
// OBSOLETE        push_type: 'temp',
// OBSOLETE        generate_lsrules: 'false',
// OBSOLETE        payload: {
// OBSOLETE          md: {
// OBSOLETE            id: '',
// OBSOLETE            timestamp: Date.now(), 
// OBSOLETE            modified: true, 
// OBSOLETE            notes: '<temp items from TTableLV>',
// OBSOLETE            lastIdSaved: '<temp items from TTableLV>'
// OBSOLETE          },
// OBSOLETE          children: tempItems,
// OBSOLETE          timestampLastArrayMod: Date.now()
// OBSOLETE        },
// OBSOLETE        expiration_seconds: expirationSeconds.toString()
// OBSOLETE      }
// OBSOLETE      this.parentServiceOpHandler(so)
// OBSOLETE  
// OBSOLETE      // no need to update table state - that will happen via server state received back
// OBSOLETE    }
// OBSOLETE  
// OBSOLETE  
// OBSOLETE    /*
// OBSOLETE      new parsing approach
// OBSOLETE  
// OBSOLETE        parse one line at a time
// OBSOLETE        (as before) if any unexpected pattern is detected, simply throw error to console
// OBSOLETE          by definition, an unexpected pattern means we need to upgrade the parsing logic to handle it
// OBSOLETE        if the line is, or could be, involved in a multi-line block (e.g., ip sets or CNAME chains)
// OBSOLETE          maintain state of multi-line block in progress
// OBSOLETE            keep this state at TTable level, since it needs to persist across calls to parsing function
// OBSOLETE          if PHI cannot be fully populated based on current line (e.g., if it is is 'reply ... is <CNAME>, we don't know the canonical yet because it will be on next line)
// OBSOLETE            populate an 'undefined' or similar value as a placeholder
// OBSOLETE          if multi-line block could possibly continue on next line, keep the necessary info in state to be able to continue parsing the block with next line
// OBSOLETE            ipsets - keep the ipset so far
// OBSOLETE            cname chains - keep the whole chain of PHIs so far
// OBSOLETE        parsing loop is responsible for
// OBSOLETE          checking whether a multiline block was in progress as of the previous line
// OBSOLETE          if so,
// OBSOLETE            if current line continues it, handle accordingly
// OBSOLETE            else clean up previous block and clear multiline block info from state
// OBSOLETE        note that in some cases, a multiline block might be started and then be determined to be something
// OBSOLETE        that needs to be ignored based on a later line, e.g., CNAME cached/forwarded pattern
// OBSOLETE          in these cases, parsing function needs to remove any PHI's/resolutions that have been created so far        
// OBSOLETE  
// OBSOLETE  
// OBSOLETE    */
// OBSOLETE  
// OBSOLETE    
// OBSOLETE  
// OBSOLETE    parseLVIRaw() {
// OBSOLETE  
// OBSOLETE      // making local variable refs to state, for convenient viewing in debugger without having to expand 'this'
// OBSOLETE      const logLinesRaw = this.logLinesRaw
// OBSOLETE      const lviList = this.lviList
// OBSOLETE      const lviDict = this.lviDict
// OBSOLETE      const lviHier = this.lviHier
// OBSOLETE  
// OBSOLETE      var currLogLine: LogLineRaw
// OBSOLETE      var currPHI: PHI
// OBSOLETE      var triggerForCurrPHI: PHReqCNAME | undefined
// OBSOLETE  
// OBSOLETE  
// OBSOLETE      while ((this.lastLogLineRawParsed+1) < this.logLinesRaw.length) {
// OBSOLETE        this.lastLogLineRawParsed++
// OBSOLETE        currLogLine = this.logLinesRaw[this.lastLogLineRawParsed]
// OBSOLETE        triggerForCurrPHI = undefined  // will be set if this line is continuation of CNAME chain
// OBSOLETE  
// OBSOLETE        // convenience copies for easy viewing in debugger
// OBSOLETE        const currLogLineValue = currLogLine.value
// OBSOLETE        const lviForIPSetFromLastLineParsed = this.lviForIPSetFromLastLineParsed
// OBSOLETE        const lvisForCNAMEChainFromLastLinesParsed = this.lvisForCNAMEChainFromLastLinesParsed
// OBSOLETE    
// OBSOLETE  
// OBSOLETE        // set initial value of piholeState, only if we are at first line of logLinesRaw
// OBSOLETE        if (this.lastLogLineRawParsed === 0) this.piholeState = currLogLine.seqNo.toString()
// OBSOLETE  
// OBSOLETE        var parts: RegExpExecArray | null   // will hold regex.exec result - see docs - will be null if no match
// OBSOLETE        var phiKey: string = ''
// OBSOLETE      
// OBSOLETE        // if line indicates a restart/reload, update state and skip this line
// OBSOLETE        if (this.isRestart(currLogLine)) {
// OBSOLETE          this.piholeState = currLogLine.seqNo.toString()
// OBSOLETE          this.lviForIPSetFromLastLineParsed = undefined
// OBSOLETE          this.lvisForCNAMEChainFromLastLinesParsed = []
// OBSOLETE          continue
// OBSOLETE        }
// OBSOLETE        
// OBSOLETE        // get parts - if not a query, forwarded or resolution, skip this line
// OBSOLETE        if ((parts = regexQueryForwardedResolution.exec(currLogLine.value)) === null) continue
// OBSOLETE        
// OBSOLETE        // get existing phi for this domain, or make a new one
// OBSOLETE        // if a new one, put it in state now
// OBSOLETE        // 'currPHI' is a ref that will change the PHI in state directly, so we do not need to set it again
// OBSOLETE        phiKey = this.getLVIKeyFromLogLineRaw(currLogLine)
// OBSOLETE        if (this.lviDict.has(phiKey)) currPHI = this.lviDict.get(phiKey) as PHI
// OBSOLETE        else {
// OBSOLETE          currPHI = new PHI(this, this.piholeState, parts[4])
// OBSOLETE          this.addLVIToState(currPHI)
// OBSOLETE        }
// OBSOLETE  
// OBSOLETE        // convenience copies for easy viewing in debugger
// OBSOLETE        const currPHIResolutions = currPHI.resolutions
// OBSOLETE  
// OBSOLETE        // update latestSeqNoSeen and phi.logLines
// OBSOLETE        currPHI.latestSeqNoSeen = currLogLine.seqNo
// OBSOLETE        currPHI.latestTimestampSeen = currLogLine.timestampString
// OBSOLETE        currPHI.logLines.push(currLogLine)
// OBSOLETE  
// OBSOLETE        // check if multiline block was in progress at last line, and this line is continuation or not
// OBSOLETE        // all we will do here is 
// OBSOLETE        //    adjust PHIs from prior lines in block
// OBSOLETE        //    and adjust state of line block in progress
// OBSOLETE        //    or, throw errors if this is not a recognized pattern of lines
// OBSOLETE        // processing of the current line will happen below
// OBSOLETE        if (this.lviForIPSetFromLastLineParsed !== undefined) {
// OBSOLETE          if (currPHI === this.lviForIPSetFromLastLineParsed.lvi) {
// OBSOLETE            // add to ip set and continue loop
// OBSOLETE            const res: PHResIPSet = this.lviForIPSetFromLastLineParsed.lvi.resolutions[this.lviForIPSetFromLastLineParsed.resIndexForIPSet] as PHResIPSet
// OBSOLETE            res.ipSet = [...res.ipSet.split(', '), parts[6]].sort((a: string, b: string)=>{ const aparts = a.split('.').map(p => Number.parseInt(p)); const bparts = b.split('.').map(p => Number.parseInt(p)); for (let i = 0; i < 4; i++) { if (aparts[i] < bparts[i]) return -1; else if (aparts[i] > bparts[i]) return 1 } return 0 } ).join(', ')
// OBSOLETE            continue
// OBSOLETE          }
// OBSOLETE          // else reset parsing state and just fall through to code below to handle this as a non-continuation line
// OBSOLETE          else this.lviForIPSetFromLastLineParsed = undefined
// OBSOLETE        }
// OBSOLETE        if (this.lvisForCNAMEChainFromLastLinesParsed.length !== 0) {
// OBSOLETE          // if this is NOT a valid continuation, throw error
// OBSOLETE          if (regexForwardedResolution.exec(currLogLine.value) === null) {
// OBSOLETE            throw new Error(`unexpected end of CNAME chain at line ${this.lastLogLineRawParsed}`)  // if not a forwarded or resolution, throw error
// OBSOLETE          }
// OBSOLETE  
// OBSOLETE  /*
// OBSOLETE          2022-07-21
// OBSOLETE          may need to amend this to also handle pattern of
// OBSOLETE              query[HTTPS] domain1 ...
// OBSOLETE              cached domain1 is <CNAME>
// OBSOLETE              query[A] domain1 ....
// OBSOLETE              cached domain1 is <CNAME>
// OBSOLETE              ...rest of cached reply block
// OBSOLETE              ==> need to roll back the first cached response started
// OBSOLETE  */
// OBSOLETE          // if this is 'forwarded' and previous lines were 'cached', reverse all state updates that had been made for this chain
// OBSOLETE          if ((parts[3] === 'forwarded') && (this.lvisForCNAMEChainFromLastLinesParsed[0].lvi.resolutions[this.lvisForCNAMEChainFromLastLinesParsed[0].resIndex].resolutionSource === 'cached')) {
// OBSOLETE            // remove resolutions from prior PHI's
// OBSOLETE            for (let e of this.lvisForCNAMEChainFromLastLinesParsed) {
// OBSOLETE              e.lvi.resolutions.splice(e.resIndex, 1)
// OBSOLETE              // and remove prior PHI's entirely if they have no other queries or resolutions
// OBSOLETE              if ((e.lvi.queries.length === 0) && (e.lvi.resolutions.length === 0)) {
// OBSOLETE                this.removeLVIFromState(e.lvi)
// OBSOLETE              }
// OBSOLETE            }
// OBSOLETE  
// OBSOLETE            // reset lvisForCNAMEChain....
// OBSOLETE            this.lvisForCNAMEChainFromLastLinesParsed = []
// OBSOLETE  
// OBSOLETE            // remove this PHI from state if it has no other queries or resolutions
// OBSOLETE            if ((currPHI.queries.length === 0) && (currPHI.resolutions.length === 0)) {
// OBSOLETE              this.removeLVIFromState(currPHI)
// OBSOLETE              continue  // continue loop, we will not do anything else with current line
// OBSOLETE            }
// OBSOLETE          }
// OBSOLETE          else {
// OBSOLETE            if (currPHI.domain === this.lvisForCNAMEChainFromLastLinesParsed[this.lvisForCNAMEChainFromLastLinesParsed.length-1].lvi.domain) {
// OBSOLETE              throw new Error(`expected line after <CNAME> to have different domain at line ${this.lastLogLineRawParsed}`)  // domain on next line should be different (check this after checking for cached->forwarded pattern, because in that case domain will be the same)
// OBSOLETE            }
// OBSOLETE            triggerForCurrPHI = {
// OBSOLETE              alias:      this.lvisForCNAMEChainFromLastLinesParsed[this.lvisForCNAMEChainFromLastLinesParsed.length - 1].lvi,
// OBSOLETE              aliasIndex: this.lvisForCNAMEChainFromLastLinesParsed[this.lvisForCNAMEChainFromLastLinesParsed.length - 1].resIndex
// OBSOLETE            }
// OBSOLETE            // adjust canonical ref in prior PHI
// OBSOLETE            const aliasEntry = this.lvisForCNAMEChainFromLastLinesParsed[this.lvisForCNAMEChainFromLastLinesParsed.length - 1]
// OBSOLETE            const aliasResolution = aliasEntry.lvi.resolutions[aliasEntry.resIndex]
// OBSOLETE            if (aliasResolution.type !== 'cname') throw new Error(`trying to set canonical ref but resolution is not cname type`)
// OBSOLETE            else {
// OBSOLETE              aliasResolution.canonical = currPHI
// OBSOLETE              aliasResolution.index = currPHI.resolutions.length   // will be adding a resolution to currPHI below so this index value will be correct
// OBSOLETE            }
// OBSOLETE            // if this line is another CNAME link, add this PHI to lvisForCNAMEChain...
// OBSOLETE            if (parts[6] === '<CNAME>') this.lvisForCNAMEChainFromLastLinesParsed.push({ lvi: currPHI, resIndex: currPHI.resolutions.length } )
// OBSOLETE            // else reset lvisForCNAMEChain - will handle this and subsequent log lines below
// OBSOLETE            else this.lvisForCNAMEChainFromLastLinesParsed = []
// OBSOLETE          }
// OBSOLETE        }
// OBSOLETE  
// OBSOLETE        // now handle line itself
// OBSOLETE  
// OBSOLETE        // if a query
// OBSOLETE        if (parts[3].slice(0,5) === 'query')  {
// OBSOLETE          currPHI.queries.push( { type: parts[3].slice(6, -1), fromIP: parts[6] } )
// OBSOLETE        }
// OBSOLETE  
// OBSOLETE        // else this is start of a reply block (continuations of blocks from previous lines will have been handled above)
// OBSOLETE        else {
// OBSOLETE            if ((parts[3] === 'gravity blocked') || (parts[3] === 'regex blacklisted')) {
// OBSOLETE              currPHI.resolutions.push( { trigger: triggerForCurrPHI, resolutionSource: parts[3], type: 'block' } )
// OBSOLETE            }
// OBSOLETE  
// OBSOLETE            else if ((parts[3]==='reply') || (parts[3]==='cached') || (parts[3] === 'config') || (parts[3] === '/etc/hosts')) {
// OBSOLETE  
// OBSOLETE              if (parts[6] === '<CNAME>') {
// OBSOLETE                
// OBSOLETE                // populate currPHI.resolutions
// OBSOLETE                const currResIndex = -1 + currPHI.resolutions.push( {  // push returns new length, add -1 to make the index point to this new item
// OBSOLETE                  trigger: triggerForCurrPHI,
// OBSOLETE                  resolutionSource: parts[3],
// OBSOLETE                  type: 'cname', 
// OBSOLETE                  canonical: undefined, 
// OBSOLETE                  index: -1 
// OBSOLETE                })
// OBSOLETE                // prepare to continue the reply block loop: set parts=partsNextLine, update aliasPHI and currPHI for next iteration, increment li
// OBSOLETE                this.lvisForCNAMEChainFromLastLinesParsed.push({
// OBSOLETE                  lvi: currPHI,
// OBSOLETE                  resIndex: currResIndex
// OBSOLETE                })
// OBSOLETE              }
// OBSOLETE              else {  // this is an IP reply
// OBSOLETE                // if a CNAME block had been in progress, reset that state
// OBSOLETE                this.lvisForCNAMEChainFromLastLinesParsed = []
// OBSOLETE  
// OBSOLETE                // if a NODATA response, add that resolution
// OBSOLETE                if ((parts[6] === 'NODATA') || (parts[6] === 'NODATA-IPv6')) {
// OBSOLETE                  currPHI.resolutions.push( {
// OBSOLETE                    trigger: triggerForCurrPHI,
// OBSOLETE                    resolutionSource: parts[3],
// OBSOLETE                    type: 'nodata_or_https', 
// OBSOLETE                    result: parts[6]
// OBSOLETE                  })
// OBSOLETE                }
// OBSOLETE                // else add ipSet resolution
// OBSOLETE                else {
// OBSOLETE                  const newRes: PHResolution = { 
// OBSOLETE                    trigger: triggerForCurrPHI,
// OBSOLETE                    resolutionSource: parts[3],
// OBSOLETE                    type: 'ipset', 
// OBSOLETE                    ipSet: parts[6]
// OBSOLETE                  }
// OBSOLETE                  const newResIndex = -1 + currPHI.resolutions.push(newRes)
// OBSOLETE                  // establish lviForIPSet....
// OBSOLETE                  this.lviForIPSetFromLastLineParsed = {
// OBSOLETE                    lvi: currPHI,
// OBSOLETE                    resIndexForIPSet: newResIndex
// OBSOLETE                }
// OBSOLETE              }
// OBSOLETE            }
// OBSOLETE        }
// OBSOLETE        
// OBSOLETE        
// OBSOLETE        
// OBSOLETE  
// OBSOLETE      }
// OBSOLETE  
// OBSOLETE    }
// OBSOLETE  }
// OBSOLETE  
// OBSOLETE  
// OBSOLETE  
// OBSOLETE  }



/*



  parsing problems/things still to test
    need to review overall result against a full capture
      handling cname cached/forwarded correctly?
      showing cname chains correctly?
    handle restarts correctly
      if clearing on restart
      if not clearing
    handle 'only pull last N seconds'  (not implemented yet????)


  steps

    logscraper also save seqNo of last restart in separate Collection
    log pull serviceOp include option to only pull since last restart
    server use that to establish minimum _id if pulling only since restart


    PROBLEMS TO CLEAR UP
      server
        clear inforceTempConfigSet on startup - may be left over if there was a temp item in force when svr quit/crashed
        ServerState.*Hosts.tools is not propertly populated
          interface definition has 'hasInforceConfig' but it is not in stored state
          stored state has "lastConfigApplied" but it is not in interface definition
      changes in temp rules trigger "unsaved changes" indicator in TTControls
      TTConfig Controls - when table shown is inforce, button shows 'Already Inforce' but it is red unless the config was pulled from server first

    temp rule changes automatically update viewer, but nontemp changes require a pull/push
      i think it's ok - temp items are different: non-editable, info-only items
      ==> push/pull buttons should be more clear that they are working on non-temp only


    TTablePH method to push temp allow rule to server
      variations
        exact match vs also match subdomains
        expiration - 1 minute, 10 minutes


    server config push handling
      add notes on what happens on each of 'commit', 'save', 'temp'
        what is saved to disk
        where is it saved
        what is applied to dshosts
        what happens to nonTemp state
        what happens to Temp state
      review conditional logic flow
        any errors?
        can it be cleaned up?


    test status indicators
      kill mongo
      make a pihole application fail (after we un-stub new commit logic)


    TTPresLV
      viewmode etc - remove labels and make them tooltips instead

      
    logscraper daemon
      see how big mongo db gets
      WHAT DOES IT DO IF MONGO GOES DOWN?  OK TO JUST DROP MESSAGES
      then implement clean up every ~24 hours

    learn how to edit pihole config with sqlite3
      what appears in log when make a change?
      can i make changes while pihole is "live"?
      does pihole need to be restarted or reloaded on every change?

    columns cleanup
      tiInfo shows domain as now shown in domain column
        grouping indicators on the right
          and only shown if viewMode is hierarchy
      column order - better default order, sizing

    think about end-state infrastructure
        if a config commit fails....
          fails to be stored on server - return error
          committed on server but fails to commit on ds host
            reflect in server state
        server state indicates current committed config, so all viewers (and eventually ios clients?) can determine if what they are showing is committed
          each ConfigSet includes a uuid
          TTableConfig state includes
            the uuid of the table shown
            the last 'committed' uuid returned from server state
        temp config rules
          <spell this out similar to how it works in extension>
          <find where we put notes on why we keep temp and non-temp config items and rules
             in same data structure - they are handled combined in some ways and separately in others
             - they are handled combined for doing getDecision in extension
             - they are shown combined in TTPresConfig
             - they are handled differently by
                - load/save/commit operations





    implement autoUpdates
      first implement append triggered by manual button
        button
        logUpdate handles append=true
      state
      ui controls - blueprint <Switch> to control
      log pull, log update 'append' argument
      get updates on timer
        ONLY DO IF TAB IS 'ACTIVE' - DON'T WANT THIS SUCKING BATTERY WHEN NOT ACTIVE
        MAYBE ALSO SAY AFTER X FAILURES, BACK OFF TO 10 MINUTE TIMER???
      clear older items
        on timer - how frequent?
        what is limit?  same as 'lastNSeconds' ???



    problems
      revise propMethods for
        logLines -> turn it back into a groupedAsListKeepDups
      what was ruleHostScopesThatAffected?
        fix it, or take it out


    change/add filter test creation
      use blueprint <MultiSelect> component on column header?
      basic idea is
        enter a filter string (allow regex, or just plain string?)
        on accept, hide not including filter string
        how to allow additional shows?
          if already have a 'hide not' test, additional tests are 'show'? (seems gross)
          or, on adding first test, add a 'hide all' test, then filter tests are each 'show'?
      implement in general for TTable, even though it may be unwieldy for some columns


    test PHLogState behavior across restarts

    then implement other parts of PHI/PHG


*/
