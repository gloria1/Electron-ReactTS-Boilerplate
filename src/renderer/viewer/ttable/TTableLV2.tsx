
import * as React from 'react';

import { observable, action, makeObservable, reaction, override, runInAction } from 'mobx'
import { v4 as uuidv4 } from 'uuid'

import '../vwr-App.css'

import { LVKindsG, WSWMsgCommandReplayLast, WSWMsgCommandTermination, WSWMsgCommandToIssueDSHost, WSWMsgCommandToIssueLocal, WSWMsgData, WSWMsgError } from '../common/commonAll'
import { PH2, PHG2, PHI2 } from './table items PH2'
import { CVMode, SizePropsPx } from '../common/commonApp'

import { TIPropFunctions, generic, genericGroupedDeduped, genericGroupedKeepDups, TIPropFunctionMap } from '../common/propMethods'

import { LV2, LVG2, LVI2 } from './table items LV2'
import { ColData, SortDirs, TTable, TTableBaseConstructorProps } from './TTable base Obj'
import CodeMirrorView from '../common/codemirrorView'
import { ConfigItemRaw, ConfigRulePihole, makeNewConfigItemRaw, makeNewSetRaw, tools } from '../common/configTypesTypes'
import { TTableConfig } from './TTableConfig'
import { TII } from './table items base';
import { WebSocketWrapperBrowser2 } from '../common/WebSocketWrapperBrowser';




var _ = require('lodash')

const cl = console.log
const ct = console.table






export const mapPMLV2: {[index: string]: TIPropFunctions} = {
  tiInfo                : generic,
  logLine               : generic,
}


const colDataLVRaw2: ColData[] = [
  ['1', 'tiInfo','Info', 'ttCellPreWrap','', '100', 'desc' , 'none'],
  ['1', 'logLine','Log Line', 'ttCellPreWrap','', '12000', 'none' , 'none'],
].map((v: string[]) => {return new ColData(v[1], v[2], v[4], (v[6]==='asc') ? SortDirs.asc : ((v[6]==='desc') ? SortDirs.desc : SortDirs.none), 0, parseInt(v[5]), v[3], Number.parseInt(v[0]), v[7] as CVMode)})



export interface TTableLVConstructorProps2 extends Omit<TTableBaseConstructorProps, 'tiConstructor' | 'changeTrackingSetupEnabled' | 'changeTrackingActiveAtConstruction'> {
  // OBSOLETE parentServiceOpHandler: ServiceOperationHandler
  relatedTTableConfig?: TTableConfig
  rootTIGConstructor?: (kind: LVKindsG, parentTTable: TTableLV2) => LVG2  // subclass can optionally pass in a more-specific constructor for this.root
  onLogStreamSocketOpenCallback?: ()=>void // optional - parent can provide callback for when logstream socket is open
}

export class TTableLV2 extends TTable {

  root: LVG2 = new LVG2('lvG', this)

  colDataForList: ColData[] = colDataLVRaw2  // ColData[] to be used for 'list' viewMode - will be set by subclass
  colDataForHier: ColData[] = colDataLVRaw2  // ColData[] to be used for 'hierarchy' viewMode - will be set by subclass
  tiPropFunctionsForList: TIPropFunctionMap = mapPMLV2
  tiPropFunctionsForHier: TIPropFunctionMap = mapPMLV2


  relatedTTableConfig: TTableConfig | undefined = undefined
  rulesForLoadedHost: ConfigRulePihole[] | undefined = undefined

  // state for log pulling
  nextSeqNo: number = 0
  ignoreItemsPriorToLastRestart: boolean = false
  logStreamSocket: WebSocketWrapperBrowser2
  // OBSOLETE liveOrReplay: 'live' | 'replay' = 'live'
  // OBSOLETE replayLines: number = 0
  pastLinesToGet: number = 0
  stream: boolean = true
  partialLineReceived: string = ''
  parsedLineCount: number = 0
  lastFullLogLineReceived: string = '<none yet>'
  parentLogStreamSocketOpenCallback: (()=>void) | undefined

  constructor(props: TTableLVConstructorProps2) {
    super({
      parentDnDApp: props.parentDnDApp,
      // OBSOLETE parentServiceOpHandler: props.parentServiceOpHandler,
      tableType: props.tableType,
      tiConstructor: (parentTTable: TTable)=>{return new LVI2(parentTTable as TTableLV2)},
      tableName: props.tableName,
      initialColData: props.initialColData,
      tiPropFunctions: props.tiPropFunctions,
      // note: root.parentTTable will be set in TTable constructor
      columnVisibleLevel: 1,
      changeTrackingSetupEnabled: false,
      changeTrackingActiveAtConstruction: false,
      showUnsavedChanges: false,
    })
    this.relatedTTableConfig = props.relatedTTableConfig
    if (this.relatedTTableConfig !== undefined) {
      this.relatedTTableConfig.onTIChangeListeners.push(()=>this.updateRulesForLoadedHost())
    }
    this.parentLogStreamSocketOpenCallback = props.onLogStreamSocketOpenCallback

    // need to bind callbacks to this table instance
    this.sortComparer = this.sortComparer.bind(this)
    this.onLogStreamSocketOpen = this.onLogStreamSocketOpen.bind(this)
    this.onLogStreamDataReceived = this.onLogStreamDataReceived.bind(this)
    this.onLogStreamSocketError = this.onLogStreamSocketError.bind(this)
    this.onLogStreamSocketClose = this.onLogStreamSocketClose.bind(this)
    this.onLogStreamCommandResultTermination = this.onLogStreamCommandResultTermination.bind(this)
    this.logStreamSocket = new WebSocketWrapperBrowser2(
      { 
        willTryToReconnect: true, 
        protocol: 'command', 
        socketInfo: this.parentDnDApp.localStorageIdPrefix + ' ttlv logStreamSocket', 
        log: false,
        parentOpenCallback: this.onLogStreamSocketOpen,
        parentDataReceivedCallback: this.onLogStreamDataReceived,
        parentErrorCallback: this.onLogStreamSocketError,
        parentCloseCallback: this.onLogStreamSocketClose,
        parentCommandResultTerminationCallback: this.onLogStreamCommandResultTermination,
      }, 
      this.parentDnDApp
    )

    makeObservable(this, {
      ignoreItemsPriorToLastRestart: observable,
      rulesForLoadedHost: observable,
      pastLinesToGet: observable,
      stream: observable,
      logStreamSocket: observable,
      lastFullLogLineReceived: observable,
      updateRulesForLoadedHost: action.bound,
      // causes problems?  logUpdate: action.bound,
      parseLVIRaw: action.bound,
      clearTableContents: override,
    })


    runInAction(()=>{
      if (props.rootTIGConstructor === undefined) this.root = new LVG2('rootG', this)
      else this.root = props.rootTIGConstructor('rootG', this)
      this.root.expanded = true
    })

    this.logStreamSocket.wswConnect()
  }


  clearTableContents() {
    super.clearTableContents()
    this.nextSeqNo = 0
    this.parsedLineCount = 0
  }


  // updates this.rulesForLoadedHost
  // rules will be undefined if hostShownInTable is '', or if relatedTTableConfig is undefined
  updateRulesForLoadedHost() {
    if (this.relatedTTableConfig === undefined) this.rulesForLoadedHost = undefined
    else {
      const itemList: ConfigItemRaw[] = []
      for (let cii of this.relatedTTableConfig.root.children) itemList.push(cii.export() as ConfigItemRaw)
      this.rulesForLoadedHost = tools.tool_pihole.makeRuleListFromConfigItems(itemList, 'pihole_query', 'both')
    }
  }


  getLogLinesStart(liveOrReplay: 'live' | 'replay', replayLines: number = 0) {

      // if command already in progress, do nothing
      if (this.logStreamSocket?.commandOrOpInProgress) return

      // OBSOLETE this.liveOrReplay = liveOrReplay
      // OBSOLETE this.replayLines = replayLines

      // issue command
      var cmdMsg: WSWMsgCommandToIssueLocal | WSWMsgCommandToIssueDSHost | WSWMsgCommandReplayLast
      if (this.logStreamSocket === undefined) throw new Error(`this.logStreamSocket undefined - why?`)
      if (liveOrReplay === 'live') {
        const remoteCmd = `tail ${this.stream ? '-f' : ''} -n ${this.pastLinesToGet.toString()} /var/log/pihole/pihole.log`
        cmdMsg = {
          msgType: 'commandtoissuedshost',
          canRunConcurrent: true,
          dsHost: 'host_lp1_lblack2_pihole_1',
          processLines: 'pihole getDecision',
          command: remoteCmd,
          args: [],
          trail: [ 'TTableLV gui' ]
        }
      }
      else {
        cmdMsg = {
          msgType: 'commandreplaylast',
          lines: replayLines,
          trail: [ 'TTableLV gui']
        }
      }
      //cl(`${(Date.now() - this.parentDnDApp.startTime)/1000}s - sending command message to run on lblack2:`)
      //cl(JSON.stringify(cmdMsg, null, 2))
      runInAction(()=>{this.logStreamSocket.wswSendMessage(cmdMsg)})  // runInAction because it changes commandOrOpInProgress
      // if (cmdMsg.unableToSendReason) cl(`WAS UNABLE TO SEND BECAUSE ${cmdMsg.unableToSendReason}`)
  }


  cancelGetLogLines() {
    // send cancel command message
    this.logStreamSocket?.wswSendMessage({
      msgType: 'commandcancel',
      trail: [ 'TTableLV.cancelGetLogLines']
    })
  }

  onLogStreamSocketOpen() {
    if (this.parentLogStreamSocketOpenCallback) this.parentLogStreamSocketOpenCallback()
  }

  onLogStreamDataReceived(message: WSWMsgData) {
    ////cl(`TTableLV got from socket:\n${message.body}`)

    //cl(`${(Date.now() - this.parentDnDApp.startTime)/1000} - log table data received`)
    ////cl(message.body)

    // originally, server could send partial lines, but
    // server now sends only full lines, but we will keep the partial line handling code here
    // because it does no harm
    const data = this.partialLineReceived + message.body
    this.partialLineReceived = ''
    if (data.length > 0) {
      const lines = data.split('\n')
      ////cl(`data received last character: "${data.slice(-1, data.length)}"`)
      if (data.slice(-1, data.length) === '\n') {
        lines.splice(lines.length-1, 1)
      }
      else {
        this.partialLineReceived = lines[lines.length-1]
        lines.splice(lines.length-1, 1)
      }
      if (lines.length > 0) runInAction(()=>this.lastFullLogLineReceived = lines[lines.length - 1])
      //lines.map((l,i) => //cl(`rcvd line ${i}: "${l}"`))
      this.logUpdate(true, lines)
    }
  }
  onLogStreamSocketError(error: WSWMsgError) {
    //cl(`TTableLV onLogWSError`)
  }
  onLogStreamSocketClose(code: number, reason: string) {
  }
  onLogStreamCommandResultTermination(termMsg: WSWMsgCommandTermination) {
    //cl(`TTableLV onLogCommandResultTermination`)
  }



  // OVERALL PARSING STACK:
  //    logUpdate - in base class
  //      skips empty lines
  //      if a line indicates a restart, calls clearTableContents
  //      calls parseLVIRaw
  //    parseLVIRaw - class-specific
  //      creates/modifies LVIs from new items in logLinesRaw
  //      updates latestSeqNoSeen on LVI's
  //      calls base class methods for
  //        adding the new LVIs to state
  //    base class methods - factor things that are the same across subclasses out to base class methods, to make consistent handling easier
  //        e.g., adding new LVIs to state

  logUpdate(append: boolean, newLines: string[]) {

    var selTIs = this.getSelectedTIs()

    // if not appending, clear existing lvi*
    if (append === false) this.clearTableContents()
    this.parsedLineCount += newLines.length

    // detect empty entries (value === '') and throw them out
    // if we see a restart and state is to ignore prior to restart, clear lviRaw
    for (let line of newLines) {
      if (line === '') continue   // skip empty lines
      else {
        if (this.ignoreItemsPriorToLastRestart && this.isRestart(line)) this.clearTableContents()
        this.parseLVIRaw(line)
      }
    }

    // sometimes some of the selTIs will have been wiped out by parseLVIRaw (e.g., if clear on ph restart is true)
    selTIs = selTIs.filter(ti => (ti !== undefined))

    this.newSelectionFromTIList(selTIs, false)
    ////cl(`parsed total of ${this.parsedLineCount} lines, ${newLines.length} in this batch`)
  }

  // parsing function will be specialized in subclasses
  // responsibilities of this function:
  //    2) if finds invalid/unexpected log line patterns, throw error to console (means we need to upgrade parsing to handle the new pattern)
  //    4) update LVI.latestSeqNoSeen
  //    5) update this.lastLogLineRawParsed
  // can directly modify existing LVIs and add new ones
  // but should only add new LVI's to state using base class 'addLVI...' function
  // and remove LVIs with base class 'removeLVI...'
  // iterates on LVILogLinesRaw until cannot find anything more to parse
  parseLVIRaw(line: string) {
    const newLVI = new LVI2(this)
    newLVI.phLogLine = line
    this.root.addDirectChild(newLVI)
  }

  // stub method - will be specialized in subclass to detect whether 'line' is a restart for the tool
  isRestart(line: string) {
    return false
  }
}



