
import { ServerClientInfo, Kinds, KindsG, KindsI, WSWMsgServerState, WSWMsgError } from './commonAll'
import { Test } from '../ttable/test'

import { v4 as uuidv4 } from 'uuid'
import _ from 'lodash'
import { computed, makeObservable, observable, reaction, runInAction, toJS } from 'mobx'
import { ConfigItemRaw, SetRaw, makeNewSetRaw, SetMDRaw, ConfigSetRaw } from './configTypesTypes'
import { WebSocketWrapperBrowser2 } from './WebSocketWrapperBrowser'
//import { clearInterval } from 'timers'

var beautifyJs = require('js-beautify').js
var beautifyHtml = require('js-beautify').html
var beautifyCss = require('js-beautify').css
var beautifyJSON = require('js-beautify').json

const cl = console.log
const ct = console.table


/****************************************************************
 *  TYPES AND UTILITY FUNCTIONS COMMON ACROSS MANY PARTS OF THE FRONT-END APP
 *  (separate common.ts file includes stuff that also supports server)
 ****************************************************************/





// ContentView mode utility
export type CVMode = 'none' | 'sorted' | 'url' | 'sortedUrl' | 'httpHeader' | 'hostDomainPattern' | 'js' | 'json' | 'html' | 'css'

export const CVModeTransformers: { [index: string]: (content: string)=>string } = {
  'none': (c: string) => c,
  'sorted': (c: string) => { 
    return c // now sorting in multiLineString  return c.split('\n').sort().join('\n') 
  },
  'url': (c: string) => c,
  'sortedUrl': (c: string) => {
    // now sorting in multiLineString   const lines = c.split('\n')
    // now sorting in multiLineString   const headerLines = lines.splice(0, 2)
    return c // now sorting in multiLineString  return [...headerLines, ...lines.sort()].join('\n') 
  },
  'httpHeader': (c: string) => c,
  'hostDomainPattern': (c: string) => c,
  'js':   (c: string) => {
    try {  // try/catch in case c is not valid for beautify function
      return beautifyJs( c, {} )
    }
    catch {
      return c
    }
  },
  'json':   (c: string) => {
    try {  // try/catch in case c is not valid for beautify function
      return beautifyJSON( c, {} )
    }
    catch {
      return c
    }
  },  // had been using beautifyJs
  'html': (c: string) => {
    try {  // try/catch in case c is not valid for beautify function
      return beautifyHtml( c, {  // option settings observed to work well in beautifier.io website
        "indent_size": "4",
        "indent_char": " ",
        "max_preserve_newlines": "5",
        "preserve_newlines": true,
        "keep_array_indentation": true,
        "break_chained_methods": true,
        "indent_scripts": "normal",
        "brace_style": "collapse",
        "space_before_conditional": true,
        "unescape_strings": false,
        "jslint_happy": false,
        "end_with_newline": false,
        "wrap_line_length": "0",
        "indent_inner_html": true,
        "comma_first": false,
        "e4x": false,
        "indent_empty_lines": true,
      })
    }
    catch {
      return c
    }
  },
  'css':  (c: string) => {
    try {  // try/catch in case c is not valid for beautify function
      return beautifyCss( c, {} )
    }
    catch {
      return c
    }
  },
}


// interface to standardize how sizing props are provided to components
// for percentage-based sizes, must provide a ref to the TTable used as a basis
// note - done by reference so that mobx will create dependency of layout size on the parent TTable state
export interface SizePropPx {
  unit: 'px'
  constraint: 'fixed' | 'max'
  value: number
}


export interface SizePropPct {
  unit: '%'
  // OBSOLETE reference: 'window' | 'parent'       // if provided, will translate to px units based on referenced TTable (and left/right div if TTableCRWithDetailView)
  constraint: 'fixed' | 'max'
  value: number   // note - percent values are on a 0-100 scale, a la css values
}

export interface SizePropsPx {   // must be px
  height: SizePropPx
  width: SizePropPx
}
export interface SizePropsPct {   // must be pct
  height: SizePropPct
  width: SizePropPct
}
export interface SizeProps {   // can be px or pct
  height: SizePropPct | SizePropPx
  width: SizePropPct | SizePropPx
}

export interface DivSizeStyle {
  height?: string,
  maxHeight?: string,
  width?: string,
  maxWidth?: string
}

export function makeDivSizeStyle(size: SizeProps): DivSizeStyle {
  const result: DivSizeStyle = {}

  const heightValue: number = (size.height.unit === 'px') ? size.height.value : (window.innerHeight * size.height.value)
  const widthValue: number  = (size.width.unit === 'px')  ? size.width.value  : (window.innerWidth  * size.width.value)
  if (size.height.constraint === 'max') result.maxHeight = `${heightValue}px`
  else result.height = `${heightValue}px`
  if (size.width.constraint === 'max') result.maxWidth = `${widthValue}px`
  else result.width = `${widthValue}px`

  return result

}


// interface to be implemented by any App that will contain a TTable
// (currently vwr-App and ext-App)
export class DnDApp {
  localStorageIdPrefix: string  // pre-pended to key names for all items in localStorage
  // see drag and drop doc in TTPres source file
  testBeingDragged: null | Test = null
  
  // server connection management
  server: ServerClientInfo
  serverStateSocket: WebSocketWrapperBrowser2 | undefined = undefined
  // OBSOLETE serverStateSocketOnCloseCallback: ()=>void
  get serverAvailable(): boolean {
    //////cl(`serverAvailable called - ${(this.serverStateSocket === undefined) ? 'serverStateSocket undefined' : 'readyState = ' + this.serverStateSocket.readyState.toString()}`)
    if (this.serverStateSocket === undefined) return false
    if (this.serverStateSocket.readyState !== 1) return false
    else return true
  }
  // OBSOLETE NOW HANDLING IN WSW ITSELF serverStateConnectRetryInterval: NodeJS.Timeout | undefined
  onBlurCloseStateSocketTimeout: NodeJS.Timeout | undefined = undefined
  // list of all sockets created - so that when server.host changes or server state socket dies, we can close all other sockets
  // WSWBrowser registers itself to this list, and removes itself from this list on closing
  registeredSockets: WebSocketWrapperBrowser2[] = []

  windowInnerHeight: number  // will set in constructor, and update with event handler for window.resize
  windowInnerWidth: number
  get extensionIfBNonTempMD(): SetMDRaw { return {id: 'DnDApp default init', timestamp: 0, modified: true, notes: 'DnDApp default init', lastIdSaved: 'DnDApp default init' } }  // dummy methods - will be overridden in extApp
  get extensionIfBTempId(): SetMDRaw { return {id: 'DnDApp default init', timestamp: 0, modified: true, notes: 'DnDApp default init', lastIdSaved: 'DnDApp default init' } }  // dummy methods - will be overridden in extApp
  onIfSTempConfigChangeHandler: (()=>void) | undefined   // one child can register a handler that is called when reaction detects change in temp config
  onIfBTempConfigChangeHandler: ((addedItems: ConfigItemRaw[], removedItems: ConfigItemRaw[])=>void) | undefined   // one child can register a handler that is called when reaction detects change in temp config
  onIfBNewConfigHandler:  ((newNonTempSet: SetRaw, newTempSet: SetRaw)=>void) | undefined 

  startTime = Date.now()

  constructor(localStorageId: string, host?: string) {
    this.localStorageIdPrefix = localStorageId
    // OBSOLETE this.serverStateSocketOnCloseCallback = serverStateSocketOnCloseCallback
    var hostToUse: string | null
    if (host) {
      hostToUse = host
      localStorage.setItem(this.localStorageIdPrefix+'serverHost', host)
    }
    else {
      hostToUse = localStorage.getItem(this.localStorageIdPrefix+'serverHost')
      //cl(`DnDApp constructor got serverHost ${hostToUse} from localStorage`)
      if (hostToUse === null) hostToUse = 'trafficcontrol'
    }

    this.server = {
      host: hostToUse,
      port: 3001,
      // OBSOLETE available: false,
      opsInProgress: 0,      
      // ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS  latestServiceOpInProgressOrCompleted: undefined,
      lastServerStateReceived:  {  // will be populated on successful 
        serverTime: "0",
        downstreamHosts: {},
        phbbdState: 'disabled',
        ifSNonTempMD:  {id: 'DnDApp default init', timestamp: 0, modified: true, notes: 'DnDApp default init', lastIdSaved: 'DnDApp default init' },
        ifSTemp: makeNewSetRaw('DnDApp default init', true) as ConfigSetRaw,
        consolidatedErrorList: [],
        consolidatedHasIfS: 'noOrUnknown',
        // OBSOLETE downstreamHostControlErrors: '',
        fsError: '',
        mongoErrorHeartbeat: '',
        mongoErrorOther: '',
        otherRequestError: ''
      }
    }
    this.windowInnerHeight = window.innerHeight
    this.windowInnerWidth  = window.innerWidth

    // NO LONGER NECESSARY - WILL HAPPEN WHEN CALL ATTEMPTSERVERSTATESOCKETCONNCT this.serverStateSocket = this.serverStateSocketSetup()

    makeObservable(this, {
      server: observable,
      serverStateSocket: observable,
      windowInnerHeight: observable,
      windowInnerWidth: observable,
      // we make these observable in subclass, not here, because they are overridden extensionIfBNonTempId: computed,
      // we make these observable in subclass, not here, because they are overridden extensionIfBTempId: computed,
      // (can only make them observable in one place, base class or subclass, and if we make them observable here,
      // mobx observes these, and NOT the subclass overrides)
    })

    window.onfocus = () => {
      //cl(`window.onfocus`)
      if (this.onBlurCloseStateSocketTimeout) {
        clearTimeout(this.onBlurCloseStateSocketTimeout)
        this.onBlurCloseStateSocketTimeout = undefined
      }
      this.serverStateSocket!.willTryToReconnect = true
      if (this.serverStateSocket?.readyState === -1) {
        //cl(`serverStateSocket closed, , about to call attemptServerStateConnect`)
        this.serverStateSocket!.wswConnect()
      }
    }
    window.onblur = () => {
      //cl(`window.onblur`)
      this.onBlurCloseStateSocketTimeout = setTimeout(()=>{
        if (this.serverStateSocket) {
          this.serverStateSocket.willTryToReconnect = false
          this.serverStateSocket.wswClose(4000, 'viewer onblur event')
        }
      }, 10 * 60 * 1000 )  // keep state socket open for 10 minutes after blur event
    }

    // OBSOLETE  // initial start of interval timer to connect
    // OBSOLETE  this.attemptServerSocketsConnect(true)
    this.makeNewServerSockets()
    this.serverStateSocket!.wswConnect()
    
// OBSOLETE     this.handleServiceOpReturnsPromise = this.handleServiceOpReturnsPromise.bind(this)
  }

  
  serverHostUpdate(newserverHost: string) {
    runInAction(()=>{
      this.server.host = newserverHost
      // OBSOLETE - NEW EXISTINGN SOCKETS WILL JUST TRY TO RECONNECT AFTER CLOSING // make a new server state socket with the new host name
      // OBSOLETE - NEW EXISTINGN SOCKETS WILL JUST TRY TO RECONNECT AFTER CLOSING this.makeNewServerSockets()
    })
    localStorage.setItem(this.localStorageIdPrefix+'serverHost', newserverHost)

    // close all registered sockets - those that will try to reconnect will do so
    //cl(`DnDApp calling wswClose on registered sockets`)
    for (let rs of this.registeredSockets) rs.wswClose(4003, `server host name changed from ${this.server.host} to ${newserverHost}`)
  }

  // server Socket management:
  //  DnDApp will attempt to connect at end of constructor
  //  attempt...Connect method will re-try every 1 second (for now)
  //  on successful connection, cancel the retry timer
  //  on close or error events, call attempt...Connect again
  // attempt...Connect method does nothing if
  //  server.available is true (already connected)
  //  document.hasFocus() === false - to keep this process 'quiet' if not in focus
  // listen for window.onfocus and .onblur - attempt...Connect onfocus, close socket onblur
  makeNewServerSockets() {
    ////cl(`serverStateSocketSetup called for ${this.localStorageIdPrefix} - server host: ${this.server.host}`)
    this.serverStateSocket = new WebSocketWrapperBrowser2(
      {
        willTryToReconnect: true,
        protocol: 'statusmonitoring',
        socketInfo: this.localStorageIdPrefix+'DnDApp.serverStateSocket',
        log: false,
        parentOpenCallback: ()=>{
          //cl(`${(Date.now() - this.startTime)/1000} - commonApp.serverStateSocket open`)
          // send initial request for state
          this.serverStateSocket!.wswSendMessage({
            msgType: 'getserverstate',
            trail: ['DnDApp.serverStateSocket parentOpenCallback']
          })
        },
        parentServerStateCallback: (stateMsg: WSWMsgServerState)=>{
          ////cl(`DnDApp.parentServerStateCallback called`)
          this.logSocketState()
          // update this.server.last state received
          // assume there has been a change - server will only send if something changed (although as of now, server sends every second when serverTime changes)
          const newServerState = JSON.parse(stateMsg.body)
          const ifSTempConfigChanged: boolean = (newServerState.ifSTemp.md.id !== this.server.lastServerStateReceived.ifSTemp.md.id)
          runInAction(()=>{
            Object.assign(this.server.lastServerStateReceived, newServerState)
            if (ifSTempConfigChanged) if (this.onIfSTempConfigChangeHandler !== undefined) this.onIfSTempConfigChangeHandler()
          })
        },
        parentCloseCallback: (code: number, reason: string)=>{
          // if (this.serverStateSocket) cl(`${this.serverStateSocket!.infoString} - commonApp.parentCloseCallback called - rawWS defined? ${this.serverStateSocket!.rawWS !== undefined} - readyState: ${this.serverStateSocket!.readyState}`)
          // else cl(`commonApp.parentCloseCallback called - SERVERSTATESOCKET UNDEFINED`)

          // HACK-Y - make change that will trigger parent to update gui to reflect that server no longer availalbe
          this.server.lastServerStateReceived.serverTime = this.server.lastServerStateReceived.serverTime + 1
        },
        parentErrorCallback: (error: WSWMsgError)=>{
          // if (this.serverStateSocket) cl(`${this.serverStateSocket!.infoString} - commonApp.parentErrorCallback called - rawWS defined? ${this.serverStateSocket!.rawWS !== undefined} - readyState: ${this.serverStateSocket!.readyState}`)
          // else cl(`commonApp.parentErrorCallback called - SERVERSTATESOCKET UNDEFINED`)
        },
      },
      this
    )
  }


  logSocketState() {
    // //cl(`====== DNDAPP SOCKET STATE (${this.localStorageIdPrefix}) =====`)
    // //cl(`  serverStateSocket:`)
    // if (this.serverStateSocket === undefined) //cl(`    UNDEFINED`)
    // else //cl(`${this.serverStateSocket.id} - readyState: ${this.serverStateSocket.readyState} - isClosing: ${this.serverStateSocket.isClosing} - didClose: ${this.serverStateSocket.didClose}`)
    // //cl(`  registered sockets:`)
    // for (let s of this.registeredSockets) //cl(`${s.id} - protocol: ${s.protocol} - readyState: ${s.readyState} - isClosing: ${s.isClosing} - didClose: ${s.didClose}`)
    // //cl(`===========`)
  }

  requestPullIfBConfigSets(clearCRTable: boolean) {
    // in extApp, will override with method that 
    // sends message to background to request inforce

  }

  commitIfBNonTempConfigSet(setToCommit: SetRaw, clearCRTable: boolean) {
    // in extApp, will override with method that 
  }
    
// OBSOLETE   // see notes in common.ts re: basics of how ServiceOps are translated to/from http requests
  // since this is called from TTableConfig, 'this' needs to be bound to DnDApp (in constructor)
  // being an async function, it returns a promise
  //     the 'return result' statements inside will wrap result in a Promise, which the caller must then handle using await or by calling .then on the returned promise
// OBSOLETE   async handleServiceOpReturnsPromise(serviceOp: ServiceOperation) {
// OBSOLETE 
// OBSOLETE     // need to do for each possible chain of events
// OBSOLETE     //    set loadingState at start of attempt
// OBSOLETE     //    before returning
// OBSOLETE     // OBSOLETE //      set serverAvailable if appropriate
// OBSOLETE     // OBSOLETE //      update app.server.opsInProgress
// OBSOLETE     // OBSOLETE //      update app.server.latestServiceOpInProgressOrCompleted  (see notes in App class declaration for how this prop is managed)
// OBSOLETE     //      update the serviceOp (which may be the serviceOp passed in if server did not respond,
// OBSOLETE     //        or the serviceOp returned from the server if it did respond)
// OBSOLETE     // OBSOLETE //      update app.server.serverState - either with copy of server_state in response from server, or something else to reflect error
// OBSOLETE     //      return serviceOp - either the one passed in, or the one returned from the server
// OBSOLETE     
// OBSOLETE     ////cl(`starting handleServiceOp`)
// OBSOLETE     
// OBSOLETE     let httpResponse: Response
// OBSOLETE 
// OBSOLETE     // if server not available, fail the request (unless this is a status check in which case we want to try anyway)
// OBSOLETE     if ((this.serverStateSocket) && (this.serverStateSocket.readyState !== 1)) {
// OBSOLETE       //cl(`aborting, server not available`) 
// OBSOLETE       serviceOp.status = '1'
// OBSOLETE       serviceOp.can_retry = 'yes'
// OBSOLETE       return serviceOp
// OBSOLETE     }
// OBSOLETE     runInAction(()=>{
// OBSOLETE       this.server.opsInProgress++
// OBSOLETE       this.server.latestServiceOpInProgressOrCompleted = serviceOp  // do not do this for status check ops that are started or succeed
// OBSOLETE     })
// OBSOLETE 
// OBSOLETE     // try the fetch call
// OBSOLETE     // if it fails, set serviceOp props and return
// OBSOLETE     try {
// OBSOLETE       const queryString = (serviceOp.query_params === undefined) ? '' : `?${serviceOp.query_params}`
// OBSOLETE       let requestPath
// OBSOLETE       switch (serviceOp.subject) {
// OBSOLETE         case 'config': requestPath = '/config'; break
// OBSOLETE         case 'configfilenames': requestPath = '/configgetfilenames'; break
// OBSOLETE         case 'crs':    requestPath = '/crs'   ; break
// OBSOLETE         default:       
// OBSOLETE           ct(serviceOp)
// OBSOLETE           requestPath = ''       ; 
// OBSOLETE           break
// OBSOLETE       }
// OBSOLETE       const fetchRequestInit: RequestInit = (serviceOp.op_type === 'push')
// OBSOLETE         ? {
// OBSOLETE             method: 'POST', 
// OBSOLETE             headers: { 'Content-Type': 'application/json', ...makeHttpHeadersFromServiceOp(serviceOp) },
// OBSOLETE             body: JSON.stringify(serviceOp)
// OBSOLETE           }
// OBSOLETE         : {
// OBSOLETE             method: 'GET',
// OBSOLETE             headers: { 'Accept': 'application/json', ...makeHttpHeadersFromServiceOp(serviceOp) }
// OBSOLETE           }
// OBSOLETE       ////cl(`about to await fetch`)
// OBSOLETE       httpResponse = await fetch(
// OBSOLETE         `https://${this.server.host}:${this.server.port}${requestPath}${queryString}`,
// OBSOLETE         fetchRequestInit
// OBSOLETE       )
// OBSOLETE       ////cl(`got response from fetch call`)
// OBSOLETE       // OBSOLETE runInAction(()=>{this.server.available = true})
// OBSOLETE     }
// OBSOLETE     catch(reason) {
// OBSOLETE       serviceOp.status = '4'
// OBSOLETE       serviceOp.status_text = `fetch call failed, reason: ${reason}`
// OBSOLETE 
// OBSOLETE       runInAction(()=>{
// OBSOLETE         this.server.opsInProgress--
// OBSOLETE         this.server.latestServiceOpInProgressOrCompleted = serviceOp
// OBSOLETE       })
// OBSOLETE       return serviceOp
// OBSOLETE     }
// OBSOLETE 
// OBSOLETE     // try converting response body to json
// OBSOLETE     // if it succeeds, set props on serviceOpResponse and return that
// OBSOLETE     // if it fails, set serviceOp props and return
// OBSOLETE     try {
// OBSOLETE       // need to await because httpResponse.json() returns a promise
// OBSOLETE       // guessing json() needs to be asynchronous because
// OBSOLETE       // response may be a stream that cannot be resolved
// OBSOLETE       // until the full stream is received
// OBSOLETE       // i am vague on how this works at the moment
// OBSOLETE 
// OBSOLETE       serviceOp = await httpResponse.json()  // replaces serviceOp passed in to this method with serviceOp returned from server
// OBSOLETE       
// OBSOLETE       // OBSOLETE - WE LEAVE THESE IN RAW FORM IN SERVICE OPS  // FIX UP SERVICE OP SO THAT MD'S ARE INSTANCES OF SETMDOBJ
// OBSOLETE       // OBSOLETE - WE LEAVE THESE IN RAW FORM IN SERVICE OPS  //    server_state.ifSNonTempMD
// OBSOLETE       // OBSOLETE - WE LEAVE THESE IN RAW FORM IN SERVICE OPS  //    server_state.ifSTemp.md
// OBSOLETE       // OBSOLETE - WE LEAVE THESE IN RAW FORM IN SERVICE OPS  if (serviceOpReceived.server_state !== '') {
// OBSOLETE       // OBSOLETE - WE LEAVE THESE IN RAW FORM IN SERVICE OPS    serviceOpReceived.server_state.ifSNonTempMD = new SetMDObj(serviceOpReceived.server_state.ifSNonTempMD)
// OBSOLETE       // OBSOLETE - WE LEAVE THESE IN RAW FORM IN SERVICE OPS    serviceOpReceived.server_state.ifSTemp.md   = new SetMDObj(serviceOpReceived.server_state.ifSTemp.md)
// OBSOLETE       // OBSOLETE - WE LEAVE THESE IN RAW FORM IN SERVICE OPS  }
// OBSOLETE 
// OBSOLETE       // OBSOLETE - NOW HANDLED BY SERVERSTATESOCKET  runInAction(()=>{
// OBSOLETE       // OBSOLETE - NOW HANDLED BY SERVERSTATESOCKET    var newServerVars = {
// OBSOLETE       // OBSOLETE - NOW HANDLED BY SERVERSTATESOCKET      // OBSOLETE available: true,
// OBSOLETE       // OBSOLETE - NOW HANDLED BY SERVERSTATESOCKET      lastServerStateReceived: serviceOpReceived.server_state,
// OBSOLETE       // OBSOLETE - NOW HANDLED BY SERVERSTATESOCKET      opsInProgress: this.server.opsInProgress - 1,
// OBSOLETE       // OBSOLETE - NOW HANDLED BY SERVERSTATESOCKET    }
// OBSOLETE       // OBSOLETE - NOW HANDLED BY SERVERSTATESOCKET    if (serviceOp.subject !== 'status') Object.assign(newServerVars, { latestServiceOpInProgressOrCompleted: serviceOpReceived } )  // do not do this for status check ops that succeed
// OBSOLETE       // OBSOLETE - NOW HANDLED BY SERVERSTATESOCKET    // update this.server OBSOLETE: and call configTable.updateHosts if values have changed
// OBSOLETE       // OBSOLETE - NOW HANDLED BY SERVERSTATESOCKET    // ONLY do this if values have changed - for some reason, all CellContents re-render when this.server.available and/or this.server.lastServerStateReceived change
// OBSOLETE       // OBSOLETE - NOW HANDLED BY SERVERSTATESOCKET    // not sure what the dependency is (except that config table 'Hosts' column depends on host values)
// OBSOLETE       // OBSOLETE - NOW HANDLED BY SERVERSTATESOCKET    // note: use JSON.stringify(toJS(...)) to get values, to compare by value with mobx wrapping removed
// OBSOLETE       // OBSOLETE - NOW HANDLED BY SERVERSTATESOCKET    // (there is probably a better way to do this, but i want to move on to other things now....)
// OBSOLETE       // OBSOLETE - NOW HANDLED BY SERVERSTATESOCKET    if ((this.server.available !== newServerVars.available) || (JSON.stringify(toJS(this.server.lastServerStateReceived)) !== JSON.stringify(newServerVars.lastServerStateReceived))) {
// OBSOLETE       // OBSOLETE - NOW HANDLED BY SERVERSTATESOCKET      Object.assign(this.server, newServerVars)
// OBSOLETE       // OBSOLETE - NOW HANDLED BY SERVERSTATESOCKET      // OBSOLETE app.configTable.updateHosts()  // see notes in TTableConfig - need to force update to the table's hosts prop
// OBSOLETE       // OBSOLETE - NOW HANDLED BY SERVERSTATESOCKET    }
// OBSOLETE       // OBSOLETE - NOW HANDLED BY SERVERSTATESOCKET  
// OBSOLETE       // OBSOLETE - NOW HANDLED BY SERVERSTATESOCKET    // do not set status or statusText, we will use the values received from server
// OBSOLETE       // OBSOLETE - NOW HANDLED BY SERVERSTATESOCKET  })
// OBSOLETE       // OBSOLETE - NOW HANDLED BY SERVERSTATESOCKET  if (this.server.lastServerStateReceived.ifSTemp.md.id !== priorTempConfigSetMD.id) {
// OBSOLETE       // OBSOLETE - NOW HANDLED BY SERVERSTATESOCKET    if (this.onIfSTempConfigChangeHandler !== undefined) this.onIfSTempConfigChangeHandler()
// OBSOLETE       // OBSOLETE - NOW HANDLED BY SERVERSTATESOCKET  }
// OBSOLETE     }
// OBSOLETE     catch(reason) {
// OBSOLETE       serviceOp.status = '5'
// OBSOLETE       serviceOp.status_text = `response.json failed, reason: ${reason}`
// OBSOLETE       serviceOp.can_retry = 'no'
// OBSOLETE     }
// OBSOLETE     runInAction(()=> {
// OBSOLETE       this.server.opsInProgress--
// OBSOLETE       this.server.latestServiceOpInProgressOrCompleted = serviceOp
// OBSOLETE     })
// OBSOLETE     return serviceOp  // will be the so returned from server if successful, or the so passed in (with status updated in catch block above) if failure
// OBSOLETE   }
// OBSOLETE 
 }
  



interface HierarchyNodeG {
  kind: KindsG
  // discriminant property for use in utility functions below
  group: 'yes'
  //  uniqueProps - props that must match across all direct children to form a group of this kind
  uniqueProps: string[]
  children: HierarchyNode[]
}

interface HierarchyNodeI {
  kind: KindsI
  // discriminant property for use in utility functions below
  group: 'no'
}

type HierarchyNode = HierarchyNodeG | HierarchyNodeI

// object that encodes canonical hierarchy of grouping for CRs
// MUST HAVE A MEMBER FOR EACH VALID VALUE OF CRKinds
// EACH CRKind CAN APPEAR ONLY ONCE IN TREE (WILL BE ENFORCED BY generateHierFlat)
const crHierarchyFull: HierarchyNodeG = {
  kind: 'rootG', group: 'yes', uniqueProps: [], children: [
    { kind: 'tabG', group: 'yes', uniqueProps: ['tabIdInit', 'machine'], children: [
        // OBSOLETE { kind: 'runG', group: 'yes', uniqueProps: ['run'], children: [
          { kind: 'hostnameG', group: 'yes', uniqueProps: ['hostname'], children: [

            // decided to go back to just grouping on urlWOFrag  { kind: 'urlG', group: 'yes', uniqueProps: ['urlGKey'], children: [
            { kind: 'urlG', group: 'yes', uniqueProps: ['urlWOFrag'], children: [

              { kind: 'webReqG', group: 'yes', uniqueProps: ['requestId', 'frameId','url'], children: [
                  { kind: 'webReqI', group: 'no', },
                  { kind: 'dNRMatchI', group: 'no' }
              ]},
              { kind: 'webNavG', group: 'yes', uniqueProps: ['url', 'frameId'], children: [
                  { kind: 'webNavI', group: 'no', }
              ]},
              { kind: 'harI', group: 'no' }
            ]}
            
          ]}        
        
        // OBSOLETE ]}
    ]},
    { kind: 'dnshttpG', group: 'yes', uniqueProps: [], children: [
        { kind: 'squidG', group: 'yes', uniqueProps: [], children: [
            { kind: 'squidI', group: 'no', }
        ]},
        { kind: 'pcapG', group: 'yes', uniqueProps: [], children: [
            { kind: 'pcapI', group: 'no', }
        ]}
    ]}
  ]
}

const crHierarchyPopup: HierarchyNodeG = {
  kind: 'rootG', group: 'yes', uniqueProps: [], children: [
    { kind: 'hostnameG', group: 'yes', uniqueProps: ['hostname'], children: [
      { kind: 'webReqG', group: 'yes', uniqueProps: ['requestId', 'frameId','url'], children: [
        { kind: 'webReqI', group: 'no' },
        { kind: 'dNRMatchI', group: 'no' }
      ]},
    ]}        
  ]
}



// interfaces and function to produce flattened version of hierarchy
// doing this rather than just declaring the flat version directly, because
// declaring it first as a tree makes it easier for me to be sure the tree
// is actually valid
// strictly speaking, the flat structure is redundant to the tree, 
// but the flat structure makes it easier to look up values
// based on a kind, without having to do a tree search every time
export interface HierFlatItem {
  parentKind: KindsG | undefined
  childKinds: Kinds[]
  uniqueProps: string[]
  uniquePropChain: string[]
  group: 'yes' | 'no'
}

// adds entries to hierFlat object from the 'node' tree
// recursively calls itself for each child of 'node'
export function generateHierFlat(hierFlat: {[index: string]: HierFlatItem}, node: HierarchyNode, parentKind: KindsG | undefined) {
  if (hierFlat.hasOwnProperty(node.kind)) throw new Error(`hierarchy HAS A KIND THAT APPEARS MORE THAN ONCE`)
  hierFlat[node.kind] = {
    parentKind: parentKind,
    childKinds: (node.group==='no') ? [] : node.children.map(n => n.kind),
    uniqueProps: (node.group==='no') ? [] : node.uniqueProps,
    // this is populated below, after item has been added, since getUniquePropChain refers to this item
    uniquePropChain: [],
    group: node.group
  }
  hierFlat[node.kind].uniquePropChain = (hierFlat[node.kind].group==='no') ? [] : getCRUniquePropChain(hierFlat, node.kind)
  if (node.group==='yes') node.children.forEach(n => generateHierFlat(hierFlat, n, node.kind))
}

// declare and fill out the crHierFlat object
export interface HierFlat {
  [index: string]: HierFlatItem
}

// generate global constants for hierarchies we use
export const crHierFlatFull: HierFlat = {}
export const crHierFlatPopup: HierFlat = {}
generateHierFlat(crHierFlatFull, crHierarchyFull, undefined)
generateHierFlat(crHierFlatPopup, crHierarchyPopup, undefined)



// return array of uniqueProps for kind and all nodes above it in tree
export function getCRUniquePropChain(hier: HierFlat, kind: Kinds): string[] {
  let result: string[] = [...hier[kind].uniqueProps]  // make a copy, so we don't modify uniqueProps in  crHierFlat
  const pk = hier[kind].parentKind
  if(pk !== undefined) result.push(...getCRUniquePropChain(hier, pk))
  return result
}

// return array of kinds in hierarchy order between highest and lowest
// inclusive of highest and lowest
// i.e., returns chain of owners from highest to lowest
// if no such chain exists (because highest and lowest are not in same branch or lowest is higher than highest)
// return []
export function getCRKindChain(hier: HierFlat, highest: KindsG, lowest: Kinds): Kinds[] {
  let result: Kinds[] = [lowest]
  let nextParentKind: KindsG | undefined 
  while (result[0] !== highest) {
    nextParentKind = hier[result[0]].parentKind
    // if reached top of tree without finding highest, return [] to indicate no valid chain exists
    if (nextParentKind === undefined) return []
    else result.splice(0, 0, nextParentKind)
  }

  return result
}

