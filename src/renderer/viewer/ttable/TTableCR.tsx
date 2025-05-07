import * as React from 'react'

import { observable, computed, action, reaction, toJS, IReactionDisposer, comparer, makeObservable, makeAutoObservable, IObjectDidChange, IArrayDidChange, runInAction } from 'mobx'
import { v4 as uuidv4 } from 'uuid'

import '../vwr-App.css'

import { ICRIFromMongo, KindsG, WSWMsgCROpTypes } from '../common/commonAll'
import { CVMode, DnDApp } from '../common/commonApp'

import { TI, TIG, TII } from './table items base'
import { TIHG } from './table items TIH'
import { CR, CRI, CRG } from './table items CR'
import { TIPropFunctionMap, mapPMViewerObj, mapPMViewerCR } from '../common/propMethods'
import { ColData, SortDirs, TTable, TTableBaseConstructorProps } from "./TTable base Obj"
import { ContentViewProps, makeContentViewPropsFromTI, makeContentViewPropsFromTIProp } from './Pres ContentView'
import { ActionPlainOrGroup } from './Pres Action'
import { ConfigItemRaw } from '../common/configTypesTypes'
import { TTableConfig } from './TTableConfig'
import { TestAndGroup } from './test'




var _ = require('lodash')

const cl = console.log
const ct = console.table



// declare default ColData array for navreq table columns
export const defaultColsViewerMain: ColData[] = [

// items in array:
//  0 - visibility level
//        vis level in effect is determined at TTable construction
//        general usage:
//           1 - always show
//           2 - only shown where want 'more detail' - for TTableCR, only show in viewer, not extension
//           3 - never shown - but we keep the code and declarations for future use
//  1 - propname
//  2 - column header label
//  3 - css classname for cell
//  4 - tooltip for column header
//  5 - default column width
//  6 - initial CVMode

// first argument is visibility level

  ['1', 'tiInfo','CR Info', 'ttCellPreWrap','', '250', 'none'],
  ['1', 'crInfo2','CR Info2', 'ttCellPreWrap','', '250', 'none'],
  
  ['1', 'event','Event', 'ttCellPreWrap','', '150', 'none'],
  ['1', 'domain2','Domain2', 'ttCellNoWrap','', '200', 'none'],
  ['1', 'hostname','Hostname', 'ttCellNoWrap','', '200', 'none'],

  ['1', 'reqHeaders','Request Headers', 'ttCellPreWrap','', '150', 'httpHeader'],
  ['1', 'resHeaders','Response Headers', 'ttCellPreWrap','', '150', 'httpHeader'],
  ['1', 'queryParams','Query Params', 'ttCellPreWrap','', '150', 'none'],

  // OBSOLETE OR WILL BE ADAPTED ['1', 'reqHeadersSummary', 'Req Headers Summary', 'ttCellPreWrap', '', '200', 'none'],
  // OBSOLETE OR WILL BE ADAPTED['1', 'resHeadersSummary', 'Res Headers Summary', 'ttCellPreWrap', '', '200', 'none'],
  // OBSOLETE OR WILL BE ADAPTED['1', 'reqHdrModOutcome','Req Hdr Mod Outcome', 'ttCellPreWrap','', '100', 'none'],
  // OBSOLETE OR WILL BE ADAPTED['1', 'resHdrModOutcome','Res Hdr Mod Outcome', 'ttCellPreWrap','', '100', 'none'],

  ['1', 'dNRRuleDisplay','dNR Rule', 'ttCellPreWrap',`
  
  NOTE: if matched an allow rule and some header mods rules,
  the allow rule does not fire an onRuleMatchedDebug event,
  so it will not appear here
  
  `, '150', 'none'],
  ['1', 'ip','IP Addr', 'ttCellPreWrap','', '150', 'none'],
  ['1', 'method','Method', 'ttCellPreWrap','', '75', 'none'],
  ['1', 'resourceType','Resource Type', 'ttCellPreWrap','', '75', 'none'],
  ['1', 'error','Error', 'ttCellPreWrap','', '100', 'none'],
  ['1', 'outcomeSummary','Outcome Summary', 'ttCellPreWrap','', '100', 'none'],
  ['1', 'reqOutcome','Req Outcome', 'ttCellPreWrap','', '100', 'none'],
  ['1', 'jsOutcome','JS Outcome', 'ttCellPreWrap','', '100', 'none'],
  ['1', 'tabId','TabId', 'ttCellPreWrap','', '75', 'none'],
  ['1', 'reqBodyInfo','reqBody info', 'ttCellPreWrap','', '150', 'none'],
  ['1', 'reqBody','reqBody', 'ttCellPreWrap','', '150', 'none'],
  ['1', 'postDataInfo','postData info', 'ttCellPreWrap','', '150', 'none'],
  ['1', 'postData','postData', 'ttCellPreWrap','', '150', 'none'],
  ['1', 'url','URL', 'ttCellNoWrap','', '250', 'url'],
  ['1', 'crExceptions','Exceptions', 'ttCellPreWrap','', '250', 'none'],
  // OBSOLETE OR WILL ADAPT ['1', 'reqWasTested', 'Req Was Tested', 'ttCellPreWrap', '', '100', 'none'],
  // OBSOLETE OR WILL ADAPT ['1', 'reqDecisionResult', 'Req Decision', 'ttCellPreWrap', 'Result of testing vs rules in effect\nIf not tested or no matching rule, default outcome is to allow', '100', 'none'],
  // OBSOLETE OR WILL ADAPT ['1', 'reqRuleTypesThatAffected', 'Req Rule Types That Affected', 'ttCellPreWrap', '', '100', 'none'],
  // OBSOLETE OR WILL ADAPT ['1', 'jsWasTested', 'JS Was Tested', 'ttCellPreWrap', '', '100', 'none'],
  // OBSOLETE OR WILL ADAPT ['1', 'jsDecisionResult', 'JS Decision', 'ttCellPreWrap', 'Result of testing vs rules in effect\nIf not tested or no matching rule, default outcome is \'allow\', i.e., no JS blocking header mod', '100', 'none'],
  // OBSOLETE OR WILL ADAPT ['1', 'jsRuleTypesThatAffected', 'JS Rule Types That Affected', 'ttCellPreWrap', '', '100', 'none'],
  ['1', 'resStatusCode','Res Status Code', 'ttCellPreWrap','', '75', 'none'],
  // OBSOLETE ['1', 'configItemsThatAffectedReqInBrowser', 'Req - Config IDs That Affected', 'ttCellPreWrap', '', '100', 'none'],
  // OBSOLETE ['1', 'configItemsThatAffectedJSInBrowser', 'JS - Config IDs That Affected', 'ttCellPreWrap', '', '100', 'none'],
  ['1', 'harParserInitJSOutcome','Parser Init JS Outcome', 'ttCellPreWrap','', '250', 'none'],
  ['1', 'initiator','Initiator', 'ttCellNoWrap','', '150', 'none'],
  // OBSOLETE OR WILL ADAPT ['1', 'initURLs','Init URLs', 'ttCellNoWrap','', '150', 'none'],
  // OBSOLETE ['1', 'crInfo','CR Info', 'ttCellPreWrap','', '250', 'none'],
  ['1', 'resStatusLine','Res Status Line', 'ttCellPreWrap','', '150', 'none'],
  ['1', 'reqCookiesSummary', 'Req Cookie Summary', 'ttCellPreWrap', '', '200', 'none'],
  ['1', 'resCookiesSummary', 'Res Cookie Summary', 'ttCellPreWrap', '', '200', 'none'],
  // OBSOLETE OR WILL ADAPT ['2', 'initOrigins','Init Origins', 'ttCellNoWrap','', '150', 'none'],
  ['2', 'mimeType','mime Type', 'ttCellPreWrap','', '150', 'none'],
  ['1', 'getContent','getContent string', 'ttCellPreWrap','', '150', 'js'],
  ['2', 'resContent','Res Content String', 'ttCellPreWrap','har entry.response.content\n(not the result from getContent)', '150', 'none'],
  // OBSOLETE ['1', 'run', 'run #', 'ttCellPreWrap','', '100', 'none'],
  ['3', 'requestOriginHeader','Origin Header', 'ttCellNoWrap','', '150', 'none'],
  ['3', 'tabIdInit','TabId/Initiator', 'ttCellPreWrap','', '75', 'none'],
  ['1', 'transitionType','Transition Type', 'ttCellPreWrap','', '150', 'none'],
  ['1', 'transitionQualifiers','Transition Qualifiers', 'ttCellPreWrap','', '150', 'none'],
  ['3', 'urlWOFrag','URL w/o Fragment', 'ttCellNoWrap','', '150', 'none'],
  ['3', 'urlFrag','URL Fragment', 'ttCellNoWrap','', '150', 'none'],
  // OBSOLETE OR WILL ADAPT  ['3', 'initOriginMostLocal','Init Orig Most Local', 'ttCellNoWrap','', '150', 'none'],
  // OBSOLETE OR WILL ADAPT  ['3', 'initOriginMostGlobal','Init Orig Most Global', 'ttCellNoWrap','', '150', 'none'],
  // OBSOLETE OR WILL ADAPT  ['3', 'initAnyNonURLs','Init Any Non-URLs', 'ttCellNoWrap','', '150', 'none'],
  ['3', 'processId','Process ID', 'ttCellPreWrap','', '150', 'none'],
  ['3', 'sourceTabId','Source Tab ID', 'ttCellPreWrap','', '150', 'none'],
  ['3', 'sourceProcessId','Source Process ID', 'ttCellPreWrap','', '150', 'none'],
  ['3', 'sourceFrameId','Source Frame ID', 'ttCellPreWrap','', '150', 'none'],
  ['3', 'replacedTabId','Replaced Tab ID', 'ttCellPreWrap','', '150', 'none'],
  ['3', 'frameId','Frame ID', 'ttCellPreWrap','', '150', 'none'],
  ['3', 'parentFrameId','Parent Frame ID', 'ttCellPreWrap','', '150', 'none'],
  ['3', 'res_transferSize','Res _transferSize', 'ttCellPreWrap','', '150', 'none'],  // TEMPORARY WHILE WE EXAMINE REQBODY RAW AND POSTDATA 
  ['3', 'getContentLength','getContent length', 'ttCellPreWrap','', '150', 'none'],  // TEMPORARY WHILE WE EXAMINE REQBODY RAW AND POSTDATA 
  ['3', 'getContentEncoding','getContent encoding', 'ttCellPreWrap','', '150', 'none'],  // TEMPORARY WHILE WE EXAMINE REQBODY RAW AND POSTDATA 
  ['3', 'kind', 'CR Kind', 'ttCellPreWrap','', '100', 'none'],
  ['3', 'machine','Machine ID', 'ttCellPreWrap','', '100', 'none'],
  // OBSOLETE ['1', 'run','Nav Run', 'ttCellPreWrap','', '75', 'none'],
  ['3', 'timeStampMin','Timestamp Min', 'ttCellNoWrap','', '150', 'none'],
  ['3', 'timeStampMax','Timestamp Max', 'ttCellNoWrap','', '150', 'none'],
  ['3', 'requestId','Request ID', 'ttCellPreWrap','', '100', 'none'],
  ['3', 'scheme','Scheme', 'ttCellPreWrap','', '150', 'none'],
  ['3', 'realm','Realm', 'ttCellPreWrap','', '150', 'none'],
  ['3', 'challenger','Challenger', 'ttCellPreWrap','', '150', 'none'],
  ['3', 'isProxy','isProxy', 'ttCellPreWrap','', '150', 'none'],
  ['3', 'cache','Cache Info', 'ttCellPreWrap','webReqI.fromCache\nharI.entry.cache', '150', 'none'],
  ['3', 'redirectUrl','Redirect URL', 'ttCellPreWrap','', '150', 'none'],
  ['2', 'reqBody','Request Body', 'ttCellPreWrap','', '150', 'none'],
  ['3', 'connection','Connection', 'ttCellPreWrap','', '150', 'none'],
  ['3', 'reqHttpVersion','Req Http Version', 'ttCellPreWrap','', '150', 'none'],
  ['3', 'reqHeadersSize','Req Headers Size', 'ttCellPreWrap','', '150', 'none'],
  ['3', 'reqBodySize','Req Body Size', 'ttCellPreWrap','', '150', 'none'],
  ['3', 'queryString','Query String', 'ttCellPreWrap','', '150', 'none'],
  ['3', 'reqCookies','Req Cookies', 'ttCellPreWrap','', '150', 'none'],
  ['3', 'resHttpVersion','Res Http Version', 'ttCellPreWrap','', '150', 'none'],
  ['3', 'resHeadersSize','Res Headers Size', 'ttCellPreWrap','', '150', 'none'],
  ['3', 'resBodySize','Res Body Size', 'ttCellPreWrap','', '150', 'none'],
  ['3', 'resCookies','Res Cookies', 'ttCellPreWrap','', '150', 'none'],
  ['3', '_id', 'Mongo ID', 'ttCellPreWrap','', '150', 'none'],
].map((v: string[]) => {
  return new ColData(v[1], v[2], v[4], SortDirs.none, 0, parseInt(v[5]), v[3], Number.parseInt(v[0]), v[6] as CVMode)
})
  
  
export interface TTableCRConstuctorProps extends Omit<TTableBaseConstructorProps, 'tableType' | 'tiConstructor' | 'tiPropFunctions' | 'initialColData'> {
  // OSBOLETE parentServiceOpHandler: ServiceOperationHandler,
  defaultCols?: ColData[],
  mapPMOverride?: TIPropFunctionMap
  isForPopup: boolean
  ifBTemp?: ConfigItemRaw[]
}

export class TTableCR extends TTable {
  // constrain types of TTable properties to only allow for CR
  isForPopup: boolean

  // used for cr tables in popup and extApp - will be a reference to the local copy of ifBTemp
  ifBTemp: ConfigItemRaw[] | undefined

  // state of which headers to show in req|resHeadersSummary
  // keyed by http header names
  //  keys are all in lower case
  //  A HEADER NAME CAN BE IN MULTIPLE CATETORIES
  //  WHEN HEADERNAMESTO[SHOW|HIDE] IS CONSTRUCTED, DUPLICATES ARE ELIMINATED
  //  '__other' will be used for any header that does not have an entry in this dictionary
  headerNameCategories: { [index: string]: string[]} = {
    'Authentication': [
      'www-authenticate',
      'authorization',
      'proxy-authenticate',
      'proxy-authorization',
    ],
    '<BENIGN>': [
      'age',
      'x-timer',
      'x-origin-time',
      'x-cache-hits',
      'expires',
      'cache-control',
      'date',
      'content-length',
      'etag',
      'last-modified',
    ],
    'onion': [
      'onion-location',
    ],
    'x-goog': [  // see https://cloud.google.com/storage/docs/xml-api/reference-headers for list
      'x-goog-acl',
      'x-goog-allowed-resources',
      'x-goog-api-version',
      'x-goog-bucket-retention-period',
      'x-goog-content-length-range',
      'x-goog-content-sha256',
      'x-goog-copy-source',
      'x-goog-copy-source-generation',
      'x-goog-copy-source-if-generation-match',
      'x-goog-copy-source-if-match',
      'x-goog-copy-source-if-metageneration-match',
      'x-goog-copy-source-if-modified-since',
      'x-goog-copy-source-if-none-match',
      'x-goog-copy-source-if-unmodified-since',
      'x-goog-custom-audit-KEY',
      'x-goog-date',
      'x-goog-encryption-key',
      'x-goog-encryption-kms-key-name',
      'x-goog-if-generation-match',
      'x-goog-if-metageneration-match',
      'x-goog-metadata-directive',
      'x-goog-project-id',
      'x-goog-resumable',
      'x-goog-user-project',
      'x-goog-component-count',
      'x-goog-expiration',
      'x-goog-generation',
      'x-goog-metageneration',
      'x-goog-stored-content-encoding',
      'x-goog-stored-content-length',
      'x-guploader-uploadid',
      'x-goog-custom-time',
      'x-goog-encryption-algorithm',
      'x-goog-encryption-key-sha256',
      'x-goog-hash',
      'x-goog-meta-KEY',
      'x-goog-storage-class',
    ],
    'Caching': [
      'age',
      'cache-control',
      'clear-site-data',
      'expires',
      'pragma',
      'warning'
    ],
    'Client Hints': [
      'accept-ch',
      'accept-ch-lifetime',
      'content-dpr',
      'device-memory',
      'dpr',
      'viewport-width',
      'width',
      'downlink',
      'ect',
      'rtt',
      'save-data'
    ],
    'Conditionals': [
      'last-modified',
      'etag',
      'if-match',
      'if-none-match',
      'if-modified-since',
      'if-unmodified-since',
      'vary',
    ],
    'Connection Management': [
      'connection',
      'keep-alive'
    ],
    'Content Negotiation': [
      'user-agent',
      'accept',
      'accept-ch',
      'accept-ch-lifetime',
      'critical-ch',
      'accept-encoding',
      'accept-language',
      'vary',
      'sec-ch-ua',
      'sec-ch-ua-arch',
      'sec-ch-ua-bitness',
      'sec-ch-ua-full-version',
      'sec-ch-ua-full-version-list',
      'sec-ch-ua-mobile',
      'sec-ch-ua-model',
      'sec-ch-ua-platform',
      'sec-ch-ua-platform-version',
      'sec-ch-ua-prefers-color-scheme',
      'sec-ch-ua-prefers-reduced-motion',
      'sec-ch-ua-wow64',
      'content-dpr',
      'device-memory',
      'dpr',
      'viewport-width',
      'width',
      'downlink',
      'ect',
      'rtt',
      'save-data',
    ],
    'Controls': [
      'expect',
      'max-forwards',
    ],
    'Cookies': [
      'cookie',
      'set-cookie',
      'cookie2',
      'set-cookie2'
    ],
    'CORS': [
      'access-control-allow-origin',
      'access-control-allow-credentials',
      'access-control-allow-headers',
      'access-control-allow-methods',
      'access-control-expose-headers',
      'access-control-max-age',
      'access-control-request-headers',
      'access-control-request-method',
      'origin',
      'timing-allow-origin'
    ],
    'Downloads': [
      'content-disposition'
    ],
    'Message Body Information': [
      'content-length',
      'content-type',
      'content-encoding',
      'content-language',
      'content-location',
    ],
    'Proxies': [
      'forwarded',
      'x-forwarded-for',
      'x-forwarded-host',
      'x-forwarded-proto',
      'via'
    ],
    'Redirects': [
      'location'
    ],
    'Request Context': [
      'from',
      'host',
      'referer',
      'referrer-policy',
      'user-agent',
    ],
    'Response Context': [
      'allow',
      'server'
    ],
    'Range Requests': [
      'accept-range',
      'range',
      'if-range',
      'content-range'
    ],
    'Security': [
      'cross-origin-embedder-policy',
      'cross-origin-opener-policy',
      'cross-origin-resource-policy',
      'content-security-policy',
      'content-security-policy-report-only',
      'expect-ct',
      'feature-policy',
      'origin-isolation',
      'strict-transport-security',
      'upgrade-insecure-requests',
      'x-content-type-options',
      'x-download-options',
      'x-frame-options',
      'x-permitted-cross-domain-policies',
      'x-powered-by',
      'x-xss-protection',
      'public-key-pins',
      'public-key-pins-report-only',
      'sec-fetch-site',
      'sec-fetch-mode',
      'sec-fetch-user',
      'sec-fetch-dest'
    ],
    'Server-Sent Events': [
      'last-event-id',
      'nel',
      'ping-from',
      'ping-to',
      'report-to',
    ],
    'Transfer Coding': [
      'transfer-encoding',
      'te',
      'trailer'
    ],
    'WebSockets': [
      'sec-websocket-key',
      'sec-websocket-extensions',
      'sec-websocket-accept',
      'sec-websocket-protocol',
      'sec-websocket-version'
    ],
  }
  headerNamesToShow: { [index: string]: boolean } = {
    '__other': true
  } // rest gets populated in constructor
  headerTypesToShow: { [index: string]: boolean } = {
    'original  ': true,
    'added     ': true, 
    'notInFinal': true,
    'changed   ': true,
    'asoriginal': true,
    'final     ': true
  }
  hideHarTestAndGroup: TestAndGroup | undefined = undefined
  hideWebReqTestAndGroup: TestAndGroup | undefined = undefined
  hideDNRTestAndGroup: TestAndGroup | undefined = undefined
  hideWebNavTestAndGroup: TestAndGroup | undefined = undefined
  headersToShowNameRegexPattern: string = ''  // will be updated by headers to show dialog 
  headersToShowNameRegex: RegExp | undefined = undefined // will be updated by headers to show dialog - undefined if pattern is ''
  headersToShowValueRegexPattern: string = ''  // will be updated by headers to show dialog 
  headersToShowValueRegex: RegExp | undefined = undefined // will be updated by headers to show dialog - undefined if pattern is ''
  headersToHideNameRegexPattern: string = ''  // will be updated by headers to show dialog 
  headersToHideNameRegex: RegExp | undefined = undefined // will be updated by headers to show dialog - undefined if pattern is ''
  headersToHideValueRegexPattern: string = ''  // will be updated by headers to show dialog 
  headersToHideValueRegex: RegExp | undefined = undefined // will be updated by headers to show dialog - undefined if pattern is ''

  headersToShowControlOpen: boolean = false

  harIsByurlWOFragDict: { [index: string]: CRI[] } = {}
  
  constructor(props: TTableCRConstuctorProps) {
    super({
      parentDnDApp: props.parentDnDApp,
      // OBSOLETE parentServiceOpHandler: props.parentServiceOpHandler,
      tableType: 'CRView',
      tiConstructor: (parentTTable: TTable)=>{return new CRI(parentTTable as TTableCR)},
      tableName: props.tableName,
      initialColData: (props.defaultCols !== undefined) ? props.defaultCols : defaultColsViewerMain,
      tiPropFunctions: (props.mapPMOverride !== undefined) ? props.mapPMOverride : mapPMViewerCR,
      // note: root.parentTTable will be set in TTable constructor
      columnVisibleLevel: props.columnVisibleLevel,
      changeTrackingSetupEnabled: props.changeTrackingSetupEnabled,
      changeTrackingActiveAtConstruction: props.changeTrackingActiveAtConstruction,
      showUnsavedChanges: false,
    })
    this.isForPopup = props.isForPopup
    for (let c in this.headerNameCategories) {
      for (let h of this.headerNameCategories[c]) {
        this.headerNamesToShow[h] = (h === 'content-security-policy') ? true : false
      }
    }
    this.ifBTemp = props.ifBTemp
    runInAction(()=>{
      this.root = new CRG('rootG', this)
      this.root.expanded = true
    })
    
    makeObservable(this, {
      ifBTemp: observable,
      hideHarTestAndGroup: observable,
      hideWebReqTestAndGroup: observable,
      hideDNRTestAndGroup: observable,
      hideWebNavTestAndGroup: observable,
      headerNamesToShow: observable,
      headerTypesToShow: observable,
      headersToShowNameRegexPattern: observable,
      headersToShowNameRegex: observable,
      headersToShowValueRegexPattern: observable,
      headersToShowValueRegex: observable,
      headersToHideNameRegexPattern: observable,
      headersToHideNameRegex: observable,
      headersToHideValueRegexPattern: observable,
      headersToHideValueRegex: observable,
      headersToShowControlOpen: observable,
      harIsByurlWOFragDict: observable,
      requestLoadFromParentApp: action.bound,
      crdataUpdate: action.bound,
      expandAndHighlightInitiatorUrlGs: action.bound,
    })



  }
  
  async requestLoadFromParentApp() {
    this.root.children = []

    // OBSOLETE let so: ServiceOperationCR = {
    // OBSOLETE   uuid: uuidv4().toString(),
    // OBSOLETE   subject: 'crs',
    // OBSOLETE   query_params: `projectionItems=${JSON.stringify({harEntry: 0, requestBody: 0})}`,
// OBSOLETE 
    // OBSOLETE   status: '-1',
    // OBSOLETE   status_text: '',
// OBSOLETE 
    // OBSOLETE   op_type: 'pull',
    // OBSOLETE   can_retry: 'undetermined',
    // OBSOLETE   server_state: '',
    // OBSOLETE }
    const op: WSWMsgCROpTypes = {
      msgType: 'crop',
      op_type: 'pull',
      trail: [`TTableCR requestLoadFromParentApp`]
    }
    // OBSOLETE so = (await this.parentServiceOpHandler(so)) as ServiceOperationCR
    const opResult = await this.queueServerOp(op)
    if (opResult.status === '0') this.crdataUpdate('all', (opResult.payload === undefined) ? [] : opResult.payload as ICRIFromMongo[])
  }

  // appends new capture records, or replaces crdata, depending on argument
  // extends or replaces sortMap array
  // returns reference to first CRI that was added (implement to support extApp saving refs to webReqs with pending decisions, not sure if/how will need this elsewhere)
  crdataUpdate(noa: 'new' | 'all', newCRdata: ICRIFromMongo[]) {
    // if operation is 'all', replace old crdata
    if (noa === 'all') {
      this.root.children = []
    }
    for (let cr of newCRdata) {
      for (let p in cr) if (p in mapPMViewerCR) mapPMViewerCR[p].convertOnLoad(cr, p)
      const newCRI: CRI = new CRI(this)
      newCRI.populate(cr)
      // NEED TO CAST CRG CONSTRUCTOR AS GENERIC TIG CONSTRUCTOR, TO AVOID TYPESCRIPT ERRORS
      this.root.addChildOrMerge(newCRI, CRG as new(kind: KindsG, parentTTable: TTableCR | undefined, changeTracking: boolean)=>TIHG)
      if (newCRI.kind === 'harI') {
        if (this.harIsByurlWOFragDict[newCRI.urlWOFrag] === undefined) {
          this.harIsByurlWOFragDict[newCRI.urlWOFrag] = [newCRI]
        }
        else this.harIsByurlWOFragDict[newCRI.urlWOFrag].push(newCRI)
      }
    }
    // update sorting of tree
    // if showHierarchy, sort root tree in place, down to level of expanded children
    // OBSOLETE if (this.showHierarchy) this.sortTIG(this.root)

  }

  expandAndHighlightInitiatorUrlGs(selectedCRs: CR[], highlightLevel: number, followChain: boolean) {
    const highlightInitiatorUrlG = (harI: CRI, highlightLevel: number, followChain: boolean) => {
      if (harI.initURLs === undefined) return
      for (let i of harI.initURLs.split('\n')) {
        const crgs = this.harIsByurlWOFragDict[i]

        for (let crg of crgs) {
          for (let c of crg.children) {
            if (c.kind === 'harI') {
              // c may have already been highlighted, so set new highlight level to max(current, new one)
              c.highlightLevelMatching = Math.max(highlightLevel, c.highlightLevelMatching)
              if (followChain && (highlightLevel > 1)) highlightInitiatorUrlG(c, highlightLevel - 1, followChain)
            }
          }
        }
      }
    }

    this.clearHighlightLevelMatchings(this.root)

    for (let cr of selectedCRs) {
      if (cr.kind === 'harI') {
        highlightInitiatorUrlG(cr, highlightLevel, followChain)
        //var par = crg.parentTIGdef
        //while (par.kind !== 'rootG') {
        //  par.expanded = true
        //  par = par.parentTIGdef
        //}
      }
    }
  }


}


/* NOW ALL OBSOLETE BUT KEEP IN CASE CODE SNIPPETS ARE USEFUL

export class TTableCRWithDetailView extends TTableCR {

  // moved to TTPresCRWithDetail  // obsolete now extends totalHt: number   // set in constructor
  // moved to TTPresCRWithDetail  // obsolete now extends totalWd: number   // set in constructor
  // moved to TTPresCRWithDetail  splitterViewNonPanePx: number = 15   // provides for splitter bar
  // moved to TTPresCRWithDetail  get splitterViewTotalPaneWdPx(): number { return this.totalWd - this.splitterViewNonPanePx }
  // moved to TTPresCRWithDetail  rightPaneWdPx: number   // will be set in constructor, when props update, and by splitter pane resize
  // moved to TTPresCRWithDetail  get leftPaneWdPx(): number { 
  // moved to TTPresCRWithDetail    return this.splitterViewTotalPaneWdPx - this.rightPaneWdPx 
  // moved to TTPresCRWithDetail  }
  // moved to TTPresCRWithDetail  rightDivWdPx: number  // in general, will equal the pane sizes, but updated with throttling via a reaction
  // moved to TTPresCRWithDetail  leftDivWdPx: number    // these are initialized in constructor

  // obsoloete now extends crTable: TTableCR
  detailViewItems: ContentViewProps[] = []

  constructor(props: TTableCRConstuctorProps) {
    super(props)
    // moved to TTPresCRWithDetail  this.totalHt = props.initialHt
    // moved to TTPresCRWithDetail  this.totalWd = props.initialWd
    // moved to TTPresCRWithDetail  this.rightPaneWdPx = this.rightDivWdPx = 0
    // moved to TTPresCRWithDetail  this.leftDivWdPx = this.leftPaneWdPx

    // obsolete now extends this.crTable = new TTableCR({
    // obsolete now extends   parentDnDApp: props.parentDnDApp,
    // obsolete now extends   parentServiceOpHandler: props.parentServiceOpHandler,
    // obsolete now extends   tableName: 'main cr table',
    // obsolete now extends   columnVisibleLevel: 1,
    // obsolete now extends   changeTrackingSetupEnabled: props.changeTrackingSetupEnabled,
    // obsolete now extends   changeTrackingActiveAtConstruction: props.changeTrackingActiveAtConstruction,
    // obsolete now extends   showUnsavedChanges: false,
    // obsolete now extends   initialHt: props.initialHt,
    // obsolete now extends   initialWd: this.leftDivWdPx,
    // obsolete now extends   isForPopup: false
    // obsolete now extends })

    makeObservable(this, {
      // obsolete now extends totalHt: observable,
      // obsolete now extends totalWd: observable,
      // moved to TTPresCRWithDetail  rightPaneWdPx: observable,
      // moved to TTPresCRWithDetail  leftPaneWdPx: computed,
      // moved to TTPresCRWithDetail  rightDivWdPx: observable,
      // moved to TTPresCRWithDetail  leftDivWdPx: observable,
      // obsolete now extends crTable: observable,
      detailViewItems: observable,
      addContentViewToDetailView: action.bound,
      makeContentViewPropsFromTISelectionAndAddToDV: action.bound,
      makeContentViewPropsFromTIPropAndAddToDV: action.bound,
      removeDetailViewItem: action.bound,
    })

  // moved to TTPresCRWithDetail  // reactions to update div heights and widths, with delay so that TTPres doesn't re-render on every twitch of the  splitter bar
  // moved to TTPresCRWithDetail  reaction(
  // moved to TTPresCRWithDetail    ()=>this.totalHt,
  // moved to TTPresCRWithDetail    (newHt)=>{ 
  // moved to TTPresCRWithDetail      // need to also update direct child object instances
  // moved to TTPresCRWithDetail      this.totalHt = newHt
  // moved to TTPresCRWithDetail    },
  // moved to TTPresCRWithDetail    { delay: 1000 }
  // moved to TTPresCRWithDetail  )
  // moved to TTPresCRWithDetail  reaction(
  // moved to TTPresCRWithDetail    ()=>this.leftPaneWdPx,
  // moved to TTPresCRWithDetail    (newWd)=>{ 
  // moved to TTPresCRWithDetail      this.leftDivWdPx = newWd
  // moved to TTPresCRWithDetail      // need to also update direct child object instances
  // moved to TTPresCRWithDetail      this.totalWd = newWd
  // moved to TTPresCRWithDetail    },
  // moved to TTPresCRWithDetail    { delay: 1000 }
  // moved to TTPresCRWithDetail  )
  // moved to TTPresCRWithDetail  reaction(
  // moved to TTPresCRWithDetail    ()=>this.rightPaneWdPx,
  // moved to TTPresCRWithDetail    (newWd)=>{ 
  // moved to TTPresCRWithDetail      this.rightDivWdPx = newWd
  // moved to TTPresCRWithDetail    },
  // moved to TTPresCRWithDetail    { delay: 1000 }
  // moved to TTPresCRWithDetail  )

  }

    
  removeToDVActions(actions: ActionPlainOrGroup[]): ActionPlainOrGroup[] {
    const result: ActionPlainOrGroup[] = []
    for (let a of actions) {
      if (a.type === 'action') {
        if (a.id !== 'ToDV') result.push(a)
      }
      else result.push(
        {
          type: 'group',
          label: a.label,
          children: this.removeToDVActions(a.children)
        }
      )
    }
    return result
  }

  addContentViewToDetailView(cv: ContentViewPropsWithID) {
    // remove any 'add to Detail View' actions
    const newActions: ActionPlainOrGroup[] = this.removeToDVActions(cv.actions)
    // add a 'remove' action
    newActions.push( { 
      type: 'action',
      id: 'RemoveDV',
      label: 'Remove',
      handler: ()=>this.removeDetailViewItem(cv.itemID),
      isActive: ()=>true,
      intent: ()=>'none',
      hotkeys: []
    } )
    cv.actions = newActions
    // change the size prop to be appropriate for the detail view pane
    cv.size = { 
      height: { unit: 'px', constraint: 'max',   value: this.size.height.value-150       }, 
      width:  { unit: '%', constraint: 'fixed', value: 100 }
    }

    this.detailViewItems.splice(0, 0, cv)
  }

  makeContentViewPropsFromTISelectionAndAddToDV() {
    for (let i of Array.from(this.selection.selRows)) {
      this.addContentViewToDetailView(
        makeContentViewPropsFromTI(
          this.visibleSortedExpandedMap[i], 
          [],
          {
            height: { unit: 'px', constraint: 'max',   value: this.size.height.value-150       }, 
            width:  { unit: 'px',  constraint: 'fixed', value: this.size.width.value }
          }
        )
      )
    }
  }

  makeContentViewPropsFromTIPropAndAddToDV(table: TTable, ti: TI, col: ColData, actions: ActionPlainOrGroup[]) {
    this.addContentViewToDetailView(makeContentViewPropsFromTIProp(
      ti, 
      col.prop, 
      actions, 
      { 
        height: { unit: 'px', constraint: 'max',   value: this.size.height.value-150       }, 
        width:  { unit: '%', constraint: 'fixed', value: 100 }
      },
      col.initialCVMode
    ))
  }



  // itemID argument is the itemID of the content view to remove (its uuid)
  removeDetailViewItem(itemID: string) {
    const i = this.detailViewItems.findIndex(dvi => (itemID === dvi.itemID))
    this.detailViewItems.splice(i, 1)
  }

}

*/
