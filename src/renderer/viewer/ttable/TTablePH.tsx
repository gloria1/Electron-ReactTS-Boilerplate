
// OBSOLETE import * as React from 'react';
// OBSOLETE 
// OBSOLETE import '../vwr-App.css'
// OBSOLETE 
// OBSOLETE 
// OBSOLETE 
// OBSOLETE import { ServiceOperationHandler, ServiceOperationLogPull } from '../common/commonAll'
// OBSOLETE import { makePHIDictKey } from './table items PH'
// OBSOLETE import { CVMode, SizePropsPx } from '../common/commonApp'
// OBSOLETE 
// OBSOLETE import { TIPropFunctions, generic, genericGroupedDeduped, genericGroupedKeepDups } from '../common/propMethods'
// OBSOLETE 
// OBSOLETE import { PH, PHG, PHI } from './table items PH'
// OBSOLETE import { ColData, SortDirs, TTable, TTableBaseConstructorProps } from './TTable base Obj'
// OBSOLETE import { stringifyKey } from 'mobx/dist/internal'
// OBSOLETE import CodeMirrorView from '../common/codemirrorView'
// OBSOLETE import { ConfigItemRaw, ConfigRulePihole, tools } from '../common/configTypesTypes'
// OBSOLETE import { TTableConfig } from './TTableConfig'
// OBSOLETE import { TII } from './table items base';
// OBSOLETE 
// OBSOLETE 
// OBSOLETE 
// OBSOLETE 
// OBSOLETE var _ = require('lodash')
// OBSOLETE 
// OBSOLETE const cl = console.log
// OBSOLETE const ct = console.table
// OBSOLETE 
// OBSOLETE 
// OBSOLETE 
// OBSOLETE 
// OBSOLETE 
// OBSOLETE // return the common domain parts of a and b (return [] if none)
// OBSOLETE // skipFirst argument is optional - if provided, will skip first n parts
// OBSOLETE export function commonDomainParts(aParts: string[], bParts: string[], skipFirst?: number): string[] {
// OBSOLETE   const result: string[] = []
// OBSOLETE   const commonPartCount = Math.min(aParts.length, bParts.length)
// OBSOLETE   for (let i=(skipFirst === undefined) ? 0 : skipFirst ; i < commonPartCount; i++) {
// OBSOLETE     if (aParts[i] === bParts[i]) result.push(aParts[i])
// OBSOLETE     else break
// OBSOLETE   }
// OBSOLETE   return result
// OBSOLETE }
// OBSOLETE 
// OBSOLETE // returns value for Array.sort method, based on part-wise comparison of domainParts
// OBSOLETE function sortComparerUsingDomainParts(a: PH, b: PH) {
// OBSOLETE   const minLength = Math.min(a.domainParts.length, b.domainParts.length)
// OBSOLETE   for (let i = 0; i < minLength; i++) {
// OBSOLETE     if (a.domainParts[i] < b.domainParts[i]) return -1
// OBSOLETE     else if (a.domainParts[i] > b.domainParts[i]) return 1
// OBSOLETE   }
// OBSOLETE   // if we got this far, everything matches for the segments in both a and b
// OBSOLETE   // make the less-specific domain appear first
// OBSOLETE   if (a.domainParts.length = b.domainParts.length) return 0
// OBSOLETE   if (a.domainParts.length < b.domainParts.length) return -1
// OBSOLETE   else return 1
// OBSOLETE }
// OBSOLETE 
// OBSOLETE 
// OBSOLETE // for the 'cnameChains' prop - based on genericGroupedKeepDups
// OBSOLETE // but JSX highlights this ph's domain
// OBSOLETE const phLogCnameChainsString : TIPropFunctions = {
// OBSOLETE   hasPropItems: genericGroupedKeepDups.hasPropItems,
// OBSOLETE   convertOnLoad: genericGroupedKeepDups.convertOnLoad,
// OBSOLETE   testMethod: generic.testMethod,
// OBSOLETE   val: genericGroupedKeepDups.val,
// OBSOLETE   active: genericGroupedKeepDups.active,
// OBSOLETE   computeGroupProp: genericGroupedKeepDups.computeGroupProp,
// OBSOLETE   singleLineString: genericGroupedKeepDups.singleLineString,
// OBSOLETE   singleLineJSX(propName: string, ph: PH): JSX.Element | string {
// OBSOLETE     if (ph[propName] === undefined) return '---'
// OBSOLETE     else {
// OBSOLETE       const counts = ph[propName+'PropItems'].uniqueCount
// OBSOLETE       const items = Object.getOwnPropertyNames(counts.counts).sort()   // we sort here, but not for multiLineString, because ContentView has a 'sorted' mode
// OBSOLETE       const jsxByItem: JSX.Element[] = items.map(l => {
// OBSOLETE         const itemParts: string[] = l.split(ph.domain)
// OBSOLETE         const result: JSX.Element = <span>{itemParts.map((lp, i) => {
// OBSOLETE           return ( <span>{lp}{(i < itemParts.length - 1) ? <span><b>{ph.domain}</b></span> : <span>, </span>}</span> )
// OBSOLETE         })}</span>
// OBSOLETE         return result
// OBSOLETE       })
// OBSOLETE       return <span>{(counts.total > 1) ? (`(${counts.total}t` + ((items.length > 1) ? `/${items.length}u) ` : ') ')) : ''}{jsxByItem.map((jl, i)=>{
// OBSOLETE         return ( <span>{jl}</span> )
// OBSOLETE       })}</span>
// OBSOLETE     }
// OBSOLETE 
// OBSOLETE 
// OBSOLETE 
// OBSOLETE   },
// OBSOLETE   multiLineString: genericGroupedKeepDups.multiLineString,
// OBSOLETE   contentViewJSX(ph: PH, propName: string, includeCount: boolean, cvMode: CVMode, size?: SizePropsPx): JSX.Element {
// OBSOLETE     if (ph[propName] === undefined) return <div className='ttCellMultiLineJSX'>---</div>
// OBSOLETE     //else return <div className='ttCellMultiLineJSX'>{genericGrouped.multiLineString(ti, propName, includeCount, cvMode)}</div>
// OBSOLETE     else return (
// OBSOLETE       <CodeMirrorView
// OBSOLETE         value={genericGroupedKeepDups.multiLineString(ph, propName, includeCount, cvMode)}
// OBSOLETE         mode={cvMode}
// OBSOLETE         // OBSOLETE initialFocus={'matchInput'}
// OBSOLETE         // OBSOLETE initialMatchPattern={ph.domain}
// OBSOLETE         size={ size }
// OBSOLETE         editable={false}
// OBSOLETE       />
// OBSOLETE     )
// OBSOLETE   },
// OBSOLETE }
// OBSOLETE 
// OBSOLETE // for the 'domain' prop
// OBSOLETE // group prop will be the most-common domain name across the children
// OBSOLETE // singleLineJSX colors based on whether allowed, blocked or some of each
// OBSOLETE const phLogDomain : TIPropFunctions = {
// OBSOLETE   hasPropItems: generic.hasPropItems,
// OBSOLETE   convertOnLoad: generic.convertOnLoad,
// OBSOLETE   testMethod: generic.testMethod,
// OBSOLETE   val: generic.val,
// OBSOLETE   active: generic.active,
// OBSOLETE   computeGroupProp: (phg: PHG, children: PH[], propName: string) => {
// OBSOLETE     var result: string[] = []  // this will be the final result if there are no children
// OBSOLETE     if (children.length !== 0) {
// OBSOLETE       result = children[0].domainParts
// OBSOLETE       for (let c of children) {
// OBSOLETE         if ((c instanceof TII) && (c.testResults.hide === true)) continue  // don't include child TIIs that are hidden
// OBSOLETE         result = commonDomainParts(result, c.domainParts)
// OBSOLETE       }
// OBSOLETE     }
// OBSOLETE     // make result into a domain name
// OBSOLETE     return result.reverse().join('.')
// OBSOLETE   },
// OBSOLETE   singleLineString: generic.singleLineString,
// OBSOLETE   singleLineJSX: (propName: string, ph: PH, rowIndex: number, colIndex: number) => {
// OBSOLETE 
// OBSOLETE     var color = 
// OBSOLETE       (ph.anyResolved && !ph.anyBlocked) ? 'green'
// OBSOLETE       : ((ph.anyResolved && ph.anyBlocked) ? 'orange'
// OBSOLETE           : 'red'
// OBSOLETE         )
// OBSOLETE 
// OBSOLETE     // this is to highlight domains with no dots
// OBSOLETE     // right now it will also highlight regular tlds like com
// OBSOLETE     // can fine tune later to focus only on 'suspicious' single segment domains
// OBSOLETE     // (the 'algorithmic domain names')
// OBSOLETE     var displayString = phLogDomain.singleLineString(propName, ph)
// OBSOLETE     if ((displayString.search(/\./) === -1) && (/^(com|org|edu|net)$/.test(displayString) === false)) {
// OBSOLETE       displayString = 'SINGLE DOMAIN ' + displayString
// OBSOLETE       color = 'blue'
// OBSOLETE     }
// OBSOLETE 
// OBSOLETE     return (
// OBSOLETE       <div style={ { textAlign: 'right', direction: 'rtl', color: color } }>
// OBSOLETE         {displayString}
// OBSOLETE       </div>
// OBSOLETE     )
// OBSOLETE   },
// OBSOLETE   multiLineString: generic.multiLineString,
// OBSOLETE   contentViewJSX: generic.contentViewJSX
// OBSOLETE }
// OBSOLETE 
// OBSOLETE export const mapPMPHLog: {[index: string]: TIPropFunctions} = {
// OBSOLETE   tiInfo                : generic,
// OBSOLETE   ruleHostScopesThatAffected  : genericGroupedKeepDups,
// OBSOLETE   piholeState           : genericGroupedDeduped,
// OBSOLETE   domain                : phLogDomain,
// OBSOLETE   queriesString         : genericGroupedKeepDups,
// OBSOLETE   aliasesString         : genericGroupedKeepDups,
// OBSOLETE   canonicalsString       : genericGroupedKeepDups,
// OBSOLETE   finalResolutionTypesString : genericGroupedDeduped,
// OBSOLETE   finalResolutionsString : genericGroupedKeepDups,
// OBSOLETE   cnameChainsString     : phLogCnameChainsString,
// OBSOLETE   reqString             : genericGroupedKeepDups,
// OBSOLETE   resolString           : genericGroupedKeepDups,
// OBSOLETE   logLines              : genericGroupedKeepDups,
// OBSOLETE }
// OBSOLETE 
// OBSOLETE // RegExp's to use for parsing pihole.log lines
// OBSOLETE const c = '^(.{15}) (dnsmasq\\[.*\\]:) '   // common leading information on every pihole.log line
// OBSOLETE const regexRestartReload                  = new RegExp(c + '(read|exiting|started,|compile|using)')
// OBSOLETE const regexForwarded                      = new RegExp(c + '(forwarded) ([^ ]*) (to) ([0-9\\.]+|NODATA.*)')
// OBSOLETE const regexResolution                     = new RegExp(c +                         '(config|.etc.hosts|reply|cached|regex blacklisted|gravity blocked) ([^ ]*) (from|to|is) (<CNAME>|blocked during CNAME inspection|[0-9\\.]+|<HTTPS>|NODATA.*|NXDOMAIN)')
// OBSOLETE const regexForwardedResolution            = new RegExp(c +               '(forwarded|config|.etc.hosts|reply|cached|regex blacklisted|gravity blocked) ([^ ]*) (from|to|is) (<CNAME>|blocked during CNAME inspection|[0-9\\.]+|<HTTPS>|NODATA.*|NXDOMAIN)')
// OBSOLETE const regexQueryForwardedResolution       = new RegExp(c + '(query\\[.*\\]|forwarded|config|.etc.hosts|reply|cached|regex blacklisted|gravity blocked) ([^ ]*) (from|to|is) (<CNAME>|blocked during CNAME inspection|[0-9\\.]+|<HTTPS>|NODATA.*|NXDOMAIN)')
// OBSOLETE const regexResolutionWithIPOnly           = new RegExp(c + '(config|.etc.hosts|reply|cached) ([^ ]*) (is) ([0-9\\.]+|<HTTPS>|NODATA.*|NXDOMAIN)')
// OBSOLETE const regexResolutionWithIPOrBlockedCNAME = new RegExp(c + '(config|.etc.hosts|reply|cached) ([^ ]*) (is) (blocked during CNAME inspection|[0-9\\.]+|<HTTPS>|NODATA.*|NXDOMAIN)')
// OBSOLETE const regexPHLogTimestamp                 = new RegExp(/([\w ]{3}) ([\d ]{2}) ([\d ]{2}):(\d\d):(\d\d).*/)
// OBSOLETE 
// OBSOLETE 
// OBSOLETE export interface TTablePHLogConstructorProps extends Omit<TTableBaseConstructorProps, 'tableType' | 'initialColData' | 'tiConstructor' | 'tiPropFunctions' | 'changeTrackingSetupEnabled' | 'changeTrackingActiveAtConstruction'> {
// OBSOLETE   parentServiceOpHandler: ServiceOperationHandler
// OBSOLETE   relatedTTableConfig?: TTableConfig
// OBSOLETE }
// OBSOLETE 
// OBSOLETE 
// OBSOLETE /*
// OBSOLETE 
// OBSOLETE export class TTablePHLog extends TTable {
// OBSOLETE 
// OBSOLETE   // will keep dictionary of all PHI's,
// OBSOLETE   // key is piholeState+domain
// OBSOLETE   phiDict: Map<string, PHI> = new Map()
// OBSOLETE   hostShownInTable: string = ''
// OBSOLETE   relatedTTableConfig: TTableConfig | undefined = undefined
// OBSOLETE   rulesForLoadedHost: ConfigRulePihole[] | undefined = undefined
// OBSOLETE   latestNSecondsToShow: number | undefined = undefined  // only show latest N seconds worth of log (undefined means no limit)
// OBSOLETE 
// OBSOLETE   constructor(props: TTablePHLogConstructorProps) {
// OBSOLETE     super({
// OBSOLETE       parentDnDApp: props.parentDnDApp,
// OBSOLETE       parentServiceOpHandler: props.parentServiceOpHandler,
// OBSOLETE       tableType: 'PHLogView',
// OBSOLETE       tiConstructor: (parentTTable: TTable)=>{return new PHI(parentTTable as TTablePHLog, '', '')},
// OBSOLETE       tableName: 'Pihole log',
// OBSOLETE       initialColData: [
// OBSOLETE         ['1', 'tiInfo','Info', 'ttCellPreWrap','', '200', 'none'],
// OBSOLETE         ['1', 'ruleHostScopesThatAffected','Rule Scopes', 'ttCellPreWrap','', '200', 'none'],
// OBSOLETE         ['1', 'piholeState','PH State', 'ttCellPreWrap','', '80', 'none'],
// OBSOLETE         ['1', 'domain','Domain', 'ttCellPreWrap','', '200', 'none'],
// OBSOLETE         ['1', 'queriesString','Queries', 'ttCellPreWrap','', '200', 'none'],
// OBSOLETE         ['1', 'aliasesString','Direct Aliases', 'ttCellPreWrap','', '200', 'none'],
// OBSOLETE         ['1', 'canonicalsString','Direct Canonicals', 'ttCellPreWrap','', '200', 'none'],
// OBSOLETE         ['1', 'finalResolutionsString','Final Resolutions', 'ttCellPreWrap','', '200', 'none'],
// OBSOLETE         ['1', 'finalResolutionTypesString','Final Resolutions Types', 'ttCellPreWrap','', '200', 'none'],
// OBSOLETE         ['1', 'cnameChainsString','CNAME Chains', 'ttCellPreWrap','', '200', 'none'],
// OBSOLETE         ['1', 'logLines','Log Lines', 'ttCellPreWrap','', '200', 'none'],
// OBSOLETE       ].map((v: string[]) => {return new ColData(v[1], v[2], v[4], (v[6]==='asc') ? SortDirs.asc : SortDirs.none, 0, parseInt(v[5]), v[3], Number.parseInt(v[0]))}),
// OBSOLETE       tiPropFunctions: mapPMPHLog,
// OBSOLETE       // note: root.parentTTable will be set in TTable constructor
// OBSOLETE       columnVisibleLevel: 1,
// OBSOLETE       changeTrackingSetupEnabled: false,
// OBSOLETE       changeTrackingActiveAtConstruction: false,
// OBSOLETE       showUnsavedChanges: false,
// OBSOLETE       initialHt: props.initialHt,
// OBSOLETE       initialWd: props.initialWd,
// OBSOLETE     })
// OBSOLETE     this.relatedTTableConfig = props.relatedTTableConfig
// OBSOLETE     if (this.relatedTTableConfig !== undefined) {
// OBSOLETE       this.relatedTTableConfig.onTIChangeListeners.push(()=>this.updateRulesForLoadedHost())
// OBSOLETE     }
// OBSOLETE     this.root = new PHG('rootG', this)
// OBSOLETE     makeObservable(this, {
// OBSOLETE       // TEMPORARILY TO NOT MAKE OBSERVABLE, FOR EASIER VIEWING IN DEBUGGER   phiDict: observable,
// OBSOLETE       hostShownInTable: observable,
// OBSOLETE       rulesForLoadedHost: observable,
// OBSOLETE       latestNSecondsToShow: observable,
// OBSOLETE       updateRulesForLoadedHost: action.bound,
// OBSOLETE       pullLogFile: action.bound,
// OBSOLETE       applyLogPullCompletion: action.bound,
// OBSOLETE       phLogUpdate: action.bound,
// OBSOLETE     })
// OBSOLETE 
// OBSOLETE     // need to bind sortComparer to this table instance, so that version here overrides base class implementation
// OBSOLETE     this.sortComparer = this.sortComparer.bind(this)
// OBSOLETE 
// OBSOLETE 
// OBSOLETE     this.root.expanded = true
// OBSOLETE   }
// OBSOLETE 
// OBSOLETE   // copy of base class implementation
// OBSOLETE   // plus special case handling for domain - sort based on domainParts, by part
// OBSOLETE   sortComparer(a: PH, b: PH): number {
// OBSOLETE       // return negative number if a should be before b
// OBSOLETE       // return 0 if a and be should remain unchanged in order
// OBSOLETE       // return positive number if b should be before a
// OBSOLETE       let colProp: string
// OBSOLETE       // compare using props in sortCols
// OBSOLETE       for (let i: number = 0; i < this.sortCols.length; i++) {
// OBSOLETE         colProp = this.sortCols[i].prop
// OBSOLETE         const aval = a[colProp]
// OBSOLETE         const bval = b[colProp]
// OBSOLETE         // always make undefined values go to bottom of list
// OBSOLETE         if (aval === undefined) return 1
// OBSOLETE         else if (bval === undefined) return -1
// OBSOLETE         else if (this.sortCols[i].sortDir === SortDirs.asc) {
// OBSOLETE           if (colProp === 'domain') return sortComparerUsingDomainParts(a, b)
// OBSOLETE           if      (aval < bval) return -1;
// OBSOLETE           else if (aval > bval) return  1;
// OBSOLETE         } else {
// OBSOLETE           if (colProp === 'domain') return sortComparerUsingDomainParts(b, a)
// OBSOLETE           if      (aval > bval) return -1;
// OBSOLETE           else if (aval < bval) return  1; 
// OBSOLETE         }
// OBSOLETE       }
// OBSOLETE       return 0
// OBSOLETE   }
// OBSOLETE   
// OBSOLETE   // updates this.rulesForLoadedHost
// OBSOLETE   // rules will be undefined if hostShownInTable is '', or if relatedTTableConfig is undefined
// OBSOLETE   updateRulesForLoadedHost() {
// OBSOLETE     if (this.relatedTTableConfig === undefined) this.rulesForLoadedHost = undefined
// OBSOLETE     else if (this.hostShownInTable === '') this.rulesForLoadedHost = undefined
// OBSOLETE     else {
// OBSOLETE       const itemList: ConfigItemRaw[] = []
// OBSOLETE       for (let cii of this.relatedTTableConfig.root.children) if (cii[this.hostShownInTable]) itemList.push(cii.export() as ConfigItemRaw)
// OBSOLETE       this.rulesForLoadedHost = tools.tool_pihole.makeRuleListFromConfigItems(itemList, this.hostShownInTable, 'pihole_query', 'both')
// OBSOLETE     }
// OBSOLETE   }
// OBSOLETE 
// OBSOLETE   // if reparse === true, request last log pull result from server
// OBSOLETE   async pullLogFile(reparse: boolean, host: string, tool: string) {
// OBSOLETE     let so: ServiceOperationLogPull = {
// OBSOLETE       uuid: (uuidv4().toString()),
// OBSOLETE       subject: 'log',
// OBSOLETE       repeat_last_pull: reparse ? 'true' : 'false',
// OBSOLETE       host: host,
// OBSOLETE       tool: tool,
// OBSOLETE       last_n_seconds_to_pull: '0',
// OBSOLETE       since_timestamp: '0',
// OBSOLETE 
// OBSOLETE       status: '-1',
// OBSOLETE       status_text: '',
// OBSOLETE 
// OBSOLETE       op_type: 'pull',
// OBSOLETE       can_retry: 'undetermined',
// OBSOLETE       server_state: '',
// OBSOLETE     }
// OBSOLETE 
// OBSOLETE     so = await this.parentServiceOpHandler(so) as ServiceOperationLogPull
// OBSOLETE     if (so.status === '0') this.applyLogPullCompletion(so)      
// OBSOLETE   }
// OBSOLETE 
// OBSOLETE   applyLogPullCompletion(so: ServiceOperationLogPull) {
// OBSOLETE     this.hostShownInTable = so.host
// OBSOLETE     this.updateRulesForLoadedHost()
// OBSOLETE     this.ttControlsInfoString = so.host
// OBSOLETE     this.phLogUpdate(false, (so.payload === undefined) ? '' : so.payload)
// OBSOLETE   }
// OBSOLETE 
// OBSOLETE   phLogUpdate(append: boolean, newLogEntries: string) {
// OBSOLETE 
// OBSOLETE     // RESTORE APPEND FUNCTIONALITY IF/WHEN NEEDED if ( !append ) this.root.children = []    // if append is false, remove prior children
// OBSOLETE     // clear previous PH tree and phiDict
// OBSOLETE     this.root.children = []
// OBSOLETE     this.phiDict.clear()
// OBSOLETE 
// OBSOLETE     // note - adding two \n's at beginning so that line numbers in phi.logLines will match line numbers
// OBSOLETE     // when viewing lastlogpulled in vscode
// OBSOLETE     // (because lastlog pulled will have the host name as first line but that has been removed before being passed in to this function,
// OBSOLETE     // and because vs code shows line numbers 1-based)
// OBSOLETE     const logItems: string[] = ('\n\n'+newLogEntries).split('\n')
// OBSOLETE 
// OBSOLETE // TEMPORARY, FOR EASIER VIEWING IN DEBUGGER
// OBSOLETE const phiDict = this.phiDict
// OBSOLETE const linesParsed: string[] = []
// OBSOLETE const linesNotParsed: string[] = []
// OBSOLETE const linesAfterRemovals: string[] = newLogEntries.split('\n')
// OBSOLETE 
// OBSOLETE     var parts: any   // regex.exec result - see docs - contains both array-indexable values and named props accessible with ., so need to type as 'any'
// OBSOLETE     var currentItemTimestamp: Date
// OBSOLETE     const months: string[] = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']  // month strings as they appear in ph log timestamps
// OBSOLETE     const currentYear = new Date(Date.now()).getFullYear()  // get this value here, since it is not populated in the PH log
// OBSOLETE 
// OBSOLETE     // find first line to process - loop backward from end, stop when reach beginning or entry indicating a restart, then move forward to first 'query' line
// OBSOLETE     var firstLineToParse: number = logItems.length - 1  // declaring outside loop, since we will carry this index forward in future loops
// OBSOLETE     while (logItems[firstLineToParse].length === 0) firstLineToParse--  // skip over any empty lines at end of log file
// OBSOLETE     parts = regexPHLogTimestamp.exec(logItems[firstLineToParse])
// OBSOLETE     const latestTimestamp = new Date(
// OBSOLETE       currentYear, 
// OBSOLETE       months.indexOf(parts[1]), 
// OBSOLETE       Number.parseInt(parts[2]), 
// OBSOLETE       Number.parseInt(parts[3]), 
// OBSOLETE       Number.parseInt(parts[4]), 
// OBSOLETE       Number.parseInt(parts[5])
// OBSOLETE     )
// OBSOLETE 
// OBSOLETE     for (firstLineToParse; firstLineToParse > 0; firstLineToParse--) {
// OBSOLETE 
// OBSOLETE       // if this indicates a restart/reload - break out of loop, this is where we will start searching forward for first query
// OBSOLETE       if (regexRestartReload.exec(logItems[firstLineToParse]) !== null) { firstLineToParse++; break }
// OBSOLETE       parts = regexPHLogTimestamp.exec(logItems[firstLineToParse])
// OBSOLETE       if (parts === null) {
// OBSOLETE         continue
// OBSOLETE       }
// OBSOLETE       currentItemTimestamp = new Date(
// OBSOLETE         currentYear, 
// OBSOLETE         months.indexOf(parts[1]), 
// OBSOLETE         Number.parseInt(parts[2]), 
// OBSOLETE         Number.parseInt(parts[3]), 
// OBSOLETE         Number.parseInt(parts[4]), 
// OBSOLETE         Number.parseInt(parts[5])
// OBSOLETE       )
// OBSOLETE       if (this.latestNSecondsToShow !== undefined) {
// OBSOLETE         if ((latestTimestamp.getTime() - currentItemTimestamp.getTime()) > this.latestNSecondsToShow*1000) break
// OBSOLETE       }
// OBSOLETE     }
// OBSOLETE 
// OBSOLETE 
// OBSOLETE 
// OBSOLETE // WHEN PORTING TO TTABLELV,
// OBSOLETE // MOVE ALL CHECKS FOR INVALID OR SKIPPABLE ENTRIES
// OBSOLETE // TO TOP, BEFORE ANY CHANGES COMMITED TO STATE
// OBSOLETE // ONCE WE START CHANGING STATE, WE NEED TO BE SURE A FULL SET OF VALID CHANGES WILL GO THROUGH
// OBSOLETE 
// OBSOLETE 
// OBSOLETE 
// OBSOLETE 
// OBSOLETE 
// OBSOLETE 
// OBSOLETE     var phiKey: string = ''
// OBSOLETE     var piholeState ='0'   // if we start parsing across restart/reload, will need to make this change when cross such a boundary
// OBSOLETE     var partsNextLine: any   // regex.exec result of next line peeked at
// OBSOLETE     var currPHI: PHI | undefined
// OBSOLETE     // used in reply block processing
// OBSOLETE     var isFirstLineInReplyBlock: boolean
// OBSOLETE     var aliasPHI: PHI | undefined
// OBSOLETE     var aliasResIndex: number
// OBSOLETE     var canonPHI: PHI | undefined
// OBSOLETE 
// OBSOLETE     // main loop - over all lines to parse, handles one query line, forwarded line, or response block per iteration
// OBSOLETE     // (if multiple lines are handled in an iteration, that code will increment li as necessary)
// OBSOLETE     for (var li: number = firstLineToParse; li < logItems.length; li++ ) {
// OBSOLETE       // get parts - skip if not query or result
// OBSOLETE       if ((parts = regexQueryForwardedResolution.exec(logItems[li])) === null) {   
// OBSOLETE         linesNotParsed.push(logItems[li])
// OBSOLETE         linesAfterRemovals[li] = ''
// OBSOLETE         continue      
// OBSOLETE       }
// OBSOLETE 
// OBSOLETE       // if we see a forwarded line, it was not consumed as part of handling an immediately preceding query line - throw error
// OBSOLETE       if (parts[3] === 'forwarded') {
// OBSOLETE         throw new Error('found "forwarded" line not consumed with an immediately preceding query line')
// OBSOLETE       }
// OBSOLETE       
// OBSOLETE       // get existing phi for this domain, or make a new one
// OBSOLETE       // if a new one, put it in dict now
// OBSOLETE       // 'currPHI' is a ref that will change the PHI in the dictionary directly, so we do not need to set it again
// OBSOLETE       phiKey = makePHIDictKey(piholeState, parts[4])
// OBSOLETE       if ((currPHI = this.phiDict.get(phiKey)) === undefined) {   // if not in dict already, create new entry and commit to dict
// OBSOLETE         currPHI = new PHI(this, piholeState, parts[4])
// OBSOLETE         this.phiDict.set(phiKey, currPHI)
// OBSOLETE       }
// OBSOLETE 
// OBSOLETE       // if a query
// OBSOLETE       if (parts[3].slice(0,5) === 'query')  {
// OBSOLETE         currPHI.queries.push( { type: parts[3].slice(6, -1), fromIP: parts[6] } )
// OBSOLETE         currPHI.logLines += `${(li).toString()} ${logItems[li]}\n`
// OBSOLETE         linesParsed.push(logItems[li])
// OBSOLETE         linesAfterRemovals[li] = ''
// OBSOLETE 
// OBSOLETE         // also consume next line if it is 'forwarded'
// OBSOLETE         if (regexForwarded.exec(logItems[li+1]) !== null) {
// OBSOLETE           li++
// OBSOLETE           currPHI.logLines += `${(li).toString()} ${logItems[li]}\n`
// OBSOLETE           linesParsed.push(logItems[li])
// OBSOLETE           linesAfterRemovals[li] = ''
// OBSOLETE         }
// OBSOLETE 
// OBSOLETE         this.phiDict.set(phiKey, currPHI)
// OBSOLETE       }
// OBSOLETE 
// OBSOLETE       // else this is start of a reply block
// OBSOLETE       else {
// OBSOLETE         // re-initialize these at start of every reply block
// OBSOLETE         // so we don't use values left over from last reply block
// OBSOLETE         isFirstLineInReplyBlock = true
// OBSOLETE         aliasPHI = undefined  // used in CNAME block processing
// OBSOLETE         aliasResIndex = -1
// OBSOLETE         canonPHI = undefined
// OBSOLETE 
// OBSOLETE         // loop over lines of reply block
// OBSOLETE         // for gravity/regex blocked, and simple ip replies, this will update currPHI with the resolution and break out rather than continue
// OBSOLETE         // currPHI is then committed to the dictionary after reply block loop exits
// OBSOLETE         // for CNAME chains, need to commit new PHI's inside that code block, one for each item
// OBSOLETE         while(true) {
// OBSOLETE           
// OBSOLETE           currPHI.logLines += `${(li).toString()} ${logItems[li]}\n`
// OBSOLETE 
// OBSOLETE           if ((parts[3] === 'gravity blocked') || (parts[3] === 'regex blacklisted')) {
// OBSOLETE             currPHI.resolutions.push( { trigger: undefined, res: { isFirstLineInReplyBlock: isFirstLineInReplyBlock, resolutionSource: parts[3], type: 'block' } } )
// OBSOLETE             linesParsed.push(logItems[li])
// OBSOLETE             linesAfterRemovals[li] = ''
// OBSOLETE             break   // break out of reply block loop - this is end of reply block
// OBSOLETE           }
// OBSOLETE 
// OBSOLETE           else if ((parts[3]==='reply') || (parts[3]==='cached') || (parts[3] === 'config') || (parts[3] === '/etc/hosts')) {
// OBSOLETE 
// OBSOLETE             if (parts[6] === '<CNAME>') {
// OBSOLETE               // ifFirstLineInReplyBlock, do initial work for a CNAME block:
// OBSOLETE               //    initialize aliasPHI and canonPHI to undefined
// OBSOLETE               //    check for cached->forwarded pattern, and incomplete/invalid blocks
// OBSOLETE               //      look ahead here, as many lines as necessary, to check that this is a full CNAME block (ends in block or ip)
// OBSOLETE               //      if terminated by 'forwarded', just drop it
// OBSOLETE               //      otherwise throw error
// OBSOLETE               //      only need to do this for first line of reply block
// OBSOLETE               // also handle pattern 'reply <domain> is NODATA|NODATA-IPv6
// OBSOLETE               // want to report these in log view
// OBSOLETE               // want to show as separate resolution type
// OBSOLETE               // want to investigate what it means, whether it is a problem
// OBSOLETE               // so, first, report them so i can see them
// OBSOLETE               // if log entry is 'reply ... NODATA|NODATA-IPv6', record a different resolution type
// OBSOLETE               //    in cname chain
// OBSOLETE               //    in non-cname resolution
// OBSOLETE 
// OBSOLETE               var abortCNAMEProcessing: boolean = false
// OBSOLETE               if (isFirstLineInReplyBlock) {
// OBSOLETE                 aliasPHI = undefined
// OBSOLETE                 aliasResIndex = -1
// OBSOLETE                 canonPHI = undefined
// OBSOLETE                 var li2 = li+1
// OBSOLETE                 while (true) {
// OBSOLETE                   if (li2 === logItems.length) throw new Error(`incomplete CNAME chain at end of log`)
// OBSOLETE                   partsNextLine = regexForwardedResolution.exec(logItems[li2])
// OBSOLETE                   if (partsNextLine === null) throw new Error(`unexpected end of CNAME chain at line ${li2}`)  // if not a forwarded or resolution, throw error
// OBSOLETE                   if ((partsNextLine[3] === 'forwarded') && (parts[3]==='cached'))  { // if forwarded and this line was cached, advance li past the forwarded, reverse the log line addition, and break out of reply block loop
// OBSOLETE                     for (let np = li; np <= li2; np++) { linesNotParsed.push(logItems[np]); linesAfterRemovals[np] = '' }
// OBSOLETE                     li = li2
// OBSOLETE                     currPHI.logLines += currPHI.logLines.slice(0, currPHI.logLines.search(/[^\n]*\n$/g))  // trim off the last line added
// OBSOLETE                     abortCNAMEProcessing = true   // need to use this semaphore, because we also need to break out of the reply block loop without doing anything else
// OBSOLETE                     break
// OBSOLETE                   }
// OBSOLETE                   if (partsNextLine[4] === parts[4]) throw new Error(`expected line after <CNAME> to have different domain at line ${li2}`)  // domain on next line should be different (check this after checking for cached->forwarded pattern, because in that case domain will be the same)
// OBSOLETE                   if (regexResolutionWithIPOrBlockedCNAME.exec(logItems[li2]) !== null) break  // we found valid end of reply block, so move on to processing it
// OBSOLETE                   li2++  // advance li2 and iterate
// OBSOLETE                 }
// OBSOLETE               }
// OBSOLETE               if (abortCNAMEProcessing) break
// OBSOLETE               // lookup/create canonPHI
// OBSOLETE               if ((partsNextLine = regexResolution.exec(logItems[li+1])) === null) throw new Error(`line after a CNAME line not a resolution at line ${li+1}`)
// OBSOLETE               var canonPHIKey = makePHIDictKey(piholeState, partsNextLine[4])
// OBSOLETE               canonPHI = this.phiDict.get(canonPHIKey)
// OBSOLETE               if (canonPHI === undefined) {
// OBSOLETE                 canonPHI = new PHI(this, piholeState, partsNextLine[4])
// OBSOLETE                 this.phiDict.set(canonPHIKey, canonPHI)
// OBSOLETE               }
// OBSOLETE               // populate currPHI.resolutions
// OBSOLETE               if ((aliasPHI !== undefined) && (aliasResIndex === -1)) throw new Error(`aliasResIndex not set even though aliasPHI is at line ${li}`)
// OBSOLETE               aliasResIndex = -1 + currPHI.resolutions.push( {  // push returns new length, add -1 to make the index point to this new item
// OBSOLETE                 trigger: (aliasPHI === undefined)
// OBSOLETE                   ? undefined
// OBSOLETE                   : {
// OBSOLETE                       alias: aliasPHI,
// OBSOLETE                       aliasIndex: aliasResIndex
// OBSOLETE                     },
// OBSOLETE                 res: {
// OBSOLETE                   isFirstLineInReplyBlock: isFirstLineInReplyBlock,
// OBSOLETE                   resolutionSource: parts[3],
// OBSOLETE                   type: 'cname', 
// OBSOLETE                   canonical: canonPHI, 
// OBSOLETE                   index: canonPHI.resolutions.length 
// OBSOLETE                 }
// OBSOLETE               })
// OBSOLETE               // prepare to continue the reply block loop: set parts=partsNextLine, update aliasPHI and currPHI for next iteration, increment li
// OBSOLETE               parts = partsNextLine
// OBSOLETE               aliasPHI = currPHI
// OBSOLETE               currPHI = canonPHI
// OBSOLETE               currPHI.logLines += `${(li).toString()} ${logItems[li]}\n`
// OBSOLETE               linesParsed.push(logItems[li])
// OBSOLETE               linesAfterRemovals[li] = ''
// OBSOLETE               li++
// OBSOLETE               isFirstLineInReplyBlock = false
// OBSOLETE               continue
// OBSOLETE             }
// OBSOLETE             else if (parts[6] === 'blocked during CNAME inspection') {
// OBSOLETE               if (aliasPHI === undefined) throw new Error(`saw blocked during CNAME inspection but non aliasPHI at line ${li}`)
// OBSOLETE               // populate the resolution
// OBSOLETE               currPHI.resolutions.push( { 
// OBSOLETE                 trigger: { 
// OBSOLETE                   alias: aliasPHI, 
// OBSOLETE                   aliasIndex: aliasResIndex 
// OBSOLETE                 },
// OBSOLETE                 res: {
// OBSOLETE                   isFirstLineInReplyBlock: isFirstLineInReplyBlock, 
// OBSOLETE                   resolutionSource: 'blocked during CNAME inspection',
// OBSOLETE                   type: 'block', 
// OBSOLETE                 } 
// OBSOLETE               })
// OBSOLETE               currPHI.logLines += `${(li).toString()} ${logItems[li]}\n`
// OBSOLETE               linesParsed.push(logItems[li])
// OBSOLETE               linesAfterRemovals[li] = ''
// OBSOLETE               break   // break out of reply block loop - this is end of reply block
// OBSOLETE             }
// OBSOLETE             else {  // this is an IP reply
// OBSOLETE               // if a NODATA response, add that resolution
// OBSOLETE               if ((parts[6] === 'NODATA') || (parts[6] === 'NODATA-IPv6')) {
// OBSOLETE                 currPHI.resolutions.push( {
// OBSOLETE                   trigger: (aliasPHI === undefined) ? undefined
// OBSOLETE                       : {
// OBSOLETE                         alias: aliasPHI,
// OBSOLETE                         aliasIndex: aliasResIndex
// OBSOLETE                       }, 
// OBSOLETE                   res: { 
// OBSOLETE                     isFirstLineInReplyBlock: isFirstLineInReplyBlock, 
// OBSOLETE                     resolutionSource: parts[3],
// OBSOLETE                     type: 'nodata_or_https', 
// OBSOLETE                     result: parts[6]
// OBSOLETE                   }
// OBSOLETE                 })
// OBSOLETE                 currPHI.logLines += `${(li).toString()} ${logItems[li]}\n`
// OBSOLETE                 linesParsed.push(logItems[li])
// OBSOLETE                 linesAfterRemovals[li] = ''
// OBSOLETE                 }
// OBSOLETE               else {
// OBSOLETE                 var ipSet: string = ''
// OBSOLETE                 var firstLineOfIPSet: boolean = true
// OBSOLETE                 // loop over lines with ip replies
// OBSOLETE                 while (true) {
// OBSOLETE                   linesParsed.push(logItems[li])
// OBSOLETE                   linesAfterRemovals[li] = ''
// OBSOLETE                   if (firstLineOfIPSet) ipSet = parts[6]
// OBSOLETE                   else ipSet = [...ipSet.split(', '), parts[6]].sort((a: string, b: string)=>{ const aparts = a.split('.').map(p => Number.parseInt(p)); const bparts = b.split('.').map(p => Number.parseInt(p)); for (let i = 0; i < 4; i++) { if (aparts[i] < bparts[i]) return -1; else if (aparts[i] > bparts[i]) return 1 } return 0 } ).join(', ')
// OBSOLETE                   // if next line is another IP response AND the domain matches this line AND the ip is not already in requestors, update parts and continue loop
// OBSOLETE                   if (((partsNextLine = regexResolutionWithIPOnly.exec(logItems[li+1])) !== null) 
// OBSOLETE                           && (parts[4] === partsNextLine[4])
// OBSOLETE                           && (ipSet.includes(partsNextLine[6]) === false)
// OBSOLETE                   ) {
// OBSOLETE                       li++; firstLineOfIPSet = false
// OBSOLETE                       currPHI.logLines += `${(li).toString()} ${logItems[li]}\n`
// OBSOLETE                       linesParsed.push(logItems[li])
// OBSOLETE                       linesAfterRemovals[li] = ''
// OBSOLETE                       parts = partsNextLine
// OBSOLETE                       continue
// OBSOLETE                   }
// OBSOLETE                   else break   // break out of ipset while loop (done eating ip lines)
// OBSOLETE                 }
// OBSOLETE                 // if not first line of reply, fix up trigger and alias phi
// OBSOLETE                 // and break out of reply block loop - we are done with this reply block
// OBSOLETE                 currPHI.resolutions.push( { 
// OBSOLETE                   trigger: (aliasPHI === undefined) ? undefined
// OBSOLETE                       : {
// OBSOLETE                         alias: aliasPHI,
// OBSOLETE                         aliasIndex: aliasResIndex
// OBSOLETE                       }, 
// OBSOLETE                   res: { 
// OBSOLETE                     isFirstLineInReplyBlock: isFirstLineInReplyBlock, 
// OBSOLETE                     resolutionSource: parts[3],
// OBSOLETE                     type: 'ipset', 
// OBSOLETE                     ipSet: ipSet 
// OBSOLETE                   } 
// OBSOLETE                 })
// OBSOLETE                 break                
// OBSOLETE               }
// OBSOLETE 
// OBSOLETE             }
// OBSOLETE           }
// OBSOLETE           break   // break out of reply block loop - if we needed to continue eating a CNAME chain, the 'continue' happened inside the block handling <CNAME>
// OBSOLETE         }
// OBSOLETE       } 
// OBSOLETE       const q = 1  // dummy statement so we can set a breakpoint in debugger
// OBSOLETE     }
// OBSOLETE 
// OBSOLETE     // for debugging, together with linesParsed and linesNotParsed declared above
// OBSOLETE     // keep this around, for testing if/when we need to make further changes
// OBSOLETE     const linesAfterRemovalsNonEmptyConcatenated = linesAfterRemovals.reduce((prev, curr, index, array)=>{
// OBSOLETE       return prev + (curr === '') ? '' : (curr + '\n')
// OBSOLETE     })
// OBSOLETE 
// OBSOLETE     for (let [key, value] of this.phiDict) {
// OBSOLETE       // trim off the last \n before committing to table
// OBSOLETE       value.logLines = value.logLines.slice(0, -1)
// OBSOLETE       this.root.addPHI(value)
// OBSOLETE     }
// OBSOLETE 
// OBSOLETE   }
// OBSOLETE 
// OBSOLETE 
// OBSOLETE 
// OBSOLETE 
// OBSOLETE }
// OBSOLETE 
// OBSOLETE 
// OBSOLETE 
// OBSOLETE */

