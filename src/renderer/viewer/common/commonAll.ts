

import * as Har from './harFormatExtended'

import { ConfigItemRaw, ConfigRuleBrowserDNR, SetRaw, SetClass, SetMDClass, SetMDRaw, ConfigSetRaw, ItemRaw, ConfigSetClass } from './configTypesTypes'
import { v4 as uuidv4 } from 'uuid'
import { TIMEOUT } from 'dns'

const cl = console.log

// typescript unions and intersections
//  t1 & t2   intersection
//        instances must include all members of both
//  t1 | t2   union
//        instances can be and instance of t1 or t2
//        can only access members common to t1 and t2, unless use switch or if statements that condition on common members
//        (see "Discriminated Unions")







/****************************************************************
 *  TYPES AND UTILITY FUNCTIONS COMMON ACROSS MANY PARTS OF THE FRONT-END APP *AND* SERVER
 *  (separate common.ts file includes stuff that are not needed in server)
 ****************************************************************/




/* 
  my 'WebSocket Wrapper' protocol:

    design principles:
      websocket natively is very simple and stateless
        in particular, a message can contain any kind of content, and websocket natively does not know whether
          a message received is a response to something previously sent, or what
        sockets can close at any time for various reasons - need to handle gracefully
      WSW is meant to be 'lightweight' and cheap
        --> upstream code can/should freely create lots of WSW's, each for its own particular purposes
      WSW supports both 'persistent' and one time sockets
        --> upstream code can designate a socket as 'willTryToReconnect' and WSW will manage reconnection attempts
      WSW in general will only allow one 'command' or 'op' at a time - see notes below on gating/queueing


    class structure:
      WebSocketWrapperGeneric<WSType> is the general implementation
      sub-classes will implememnt details specific to environment where running (browser/mobx/DnDApp, node server, other)
      ==> do everything possible in WSWGeneric so things behave the same everywhere
  
    every connection will have an id (using uuid for now) and 'socketInfo' prop that will be same on client and server side
      so that i can relate events on each side, at least for debugging purposes
      and also so that DSHostConns can be per-socket
    socket setup behaviors:
      'initiator' is the side where upstream code asks to set up a socket (typically the browser)
      other side is the one that responds (typically svr.ts)

      initiator side does:
        upstream code instantiates wrapper object of appropriate type
        isInitiator arg to constructor is true
        wswConnect method will construct a new raw socket instance and connect it
      other side does:
        raw socket will have already been created - passed in as argument to constructor
        wswConnect method will throw error
        on connection, take id, socket info and remoteAddress into state

    socket lifetime
      raw socket lifetime is one connection
      WSW
        at construction, does not try to construct/connect raw socket
          so listeners can be attached before doing the actual connection
        WSW remains in existence after socket closure
          will try to automatically reconnect if willTryToReconnect is true

    there are (at least) these scenarios for socket closure:
      user code closes socket normally (calls wswClose)
      error event fires on socket - i just always close the socket on any error
      server is dead when try to connect
        raw WebSocket constructor will return a new WebSocket instance and try to connect, but connection will fail
          then it fires an error event - my error handler calls wswClose
      url is invalid when try to connect (i.e., hostname prop is not a valid hostname string)
        raw WebSocket constructor will throw error - rawWS not constructed, nothing ever connects, no events fire
      server dies after connection - we just receive a close event
      network connection lost - no event fires, but heartbeat listener times out (see below re: heartbeat)
        handler when times out calls wswClose
      server side, when browser process disappears - close event fires
      server side, when network conn lost <have not tested, but presumably same as browser side, i.e., heartbeat listener times out>



    chain of events/calls when
      user constructs WSWBrowser as initiator
        raw socket remains undefined
        readyState will return -1
      user constructs WSWBrowser as non-initiator
        rawWS is set to the already-open(ing) socket
        readyState will return 0 or 1
      wswConnect
        construct rawWS, which causes it to try connecting
        see above re: failure modes
      onOpenCallback
        call parentOpenCallback
        start heartbeat listener
        if this is initiator, start interval to send heartbeat messages
      wswClose - user initiates close
        call rawClose
        close event will fire, other cleanup happens in onCloseCallback
      onCloseCallback
        detaches listeners from raw socket
        sets rawWS to undefined
        calls parentCloseCallback
        other cleanup

      onErrorCallback
        on any error, we just close the socket....
        calls wswClose (which will trigger onCloseCallback for other cleanup)
        calls parentErrorCallback

      heartbeatListenerTimeout expires
        calls wswClose



    protocol/socket purpose/message types
      (as of this writing) there are two purposes for sockets:  client issuing commands on server side, and requesting/pushing server state
      we want to prevent inappropriate messages from being sent/received on a socket based on its purpose
      instead of sub-classing WSW for different purposes (which would also make the typing of messages more complicated), we will 
        use 'protocol' to indicate the purpose of the socket
        and validate all messages received or requested to be sent vs. the protocol
      if the parent tries to send an invalid message type, or the socket receives and invalid message from the other end
        simply throw error and crash - this would only happen due to a bug in my code

    'commands' and 'serverops'
      commands
        commands are bash shell commands, which may be executed either 
          locally on svr (in a child process), 
          or remotely on a downstream host (via a svr-managed DHHostConn)

          local commands
            for now at least, a 'command' starts a child process (typically a linux shell command) to be run by the receiver, with output back to issuer
            can generate 0 or more 'data' messages with the stdout from the child process
            then will finish with 'termination' message
            output sent back will be three types:
              'output' - regular output from the command child process (e.g., linux stdout)
              'error' - error output from the command child process (e.g., linux stderr)
              'returncode' - return code from the command child process
              there may be zero or more 'output' or 'error' messages
              handler will always send a returncode message as the last message
          remote commands
            submitted as 'DHHostCommand' to one of the server's downstream hosts
            handling of success-path messages similar to local commands
            hadling of failure modes TBD
      serverops
        adapted from service ops, which had been done by http request/response
        similar to commands, except there will be exactly one response, with the entire result (data and status), on either success or failure
        both success and failure modes are sent back in the same WSW message type, but with the 'soStatus' and 'soStatusText' props indicating success or failure
      handleCommandOrOp method should validate whether this instance is able to handle it
        failure mode if cannot:  for now, just throw error - maybe we will want a more graceful, recoverable approach

        
      gating/queueing of ops and commands
        if an op or command is in progress and another one is submitted
        there are generally three possible policies:
          1) reject the newly submitted op/cmd
          2) queue the newly submitted op/cmd
          3) allow them to run concurrently
        there are several levels to the 'stack' that does ops/commands:
          the owning user application code
          WebSocketWrapperBrowser
          WebSocketWrapperGeneric
          WebSocketWrapperServer
          DSHostConns (on server side)
        THE 'DEFAULT POLICY' is to only allow one at a time, and reject attempts to start another while the first is in progress
          and/or throw errors if a second op/cmd tries to start while one in progress
        --> this policy SHOULD BE implemented at multiple levels of the stack
        --> IN PARTICULAR, NEED TO THINK ABOUT LEVELS OF THE STACK WHERE COMMANDS/OPS MAY BE COMING FROM MULTIPLE UPSTREAM INSTANCES
              e.g., config push ops coming to doConfigPushOp from multiple sockets
        NOTE THAT THIS 'DEFAULT POLICY' IS ONLY IMPLEMENTED PER-SOCKET OR PER-DSHOSTCONN IN GENERAL
        IF WE WANT GLOBAL GATING, THAT NEEDS TO BE IMPLEMENTED AT THE APP/SVR LEVEL
        (as is done for pihole updates)
        EXCEPTIONS:
          there are cases where we want to allow multiple ops/cmds to run via a queue, or concurrently
          (as of this writing) these are:
            TTable base - queues ops for serverOpSocket
            WSWS.handleOp - does not keep track of 'op in progress', so effectively allows multiple ops concurrently
              creates a promise for each op that resolves with result of that op and sends a message back
              note that ops are still gated as WSWG level, and gated (with queue) at TTable.serverOpSocket level
            svr doConfigPushOp - gates using global variable for 'piholeUpdateInProgress' and interval timer that checks every 1 second until last op done
              note - this is an older implmementation - could improve it using a queueing appraoch a la TTable.serverOpSocket
              need gating here in case multiple sockets request ops concurrently
            DSHostConn - allows for commands that can run concurrently
              there can be multiple sockets causing commands to dshosts
              and we don't want 'mutating' commands (e.g., pihole changes) to run concurrently
              but we do want 
                some kinds of commands to run concurrently (e.g., multiple tail -f commands to read logs)
                to allow socket B to issue a command while socket A still has a command in progress
              so, 
                don't do gating at socket level
                DSHostConn queues commands
                command issuer indicates whether command can run concurrently
                DSHostConn will execute commands concurrently if issuer said it is OK
                --> IT IS UP TO THE TOP-LEVEL CALLING CODE TO KNOW WHICH COMMANDS ARE SAFE TO RUN CONCURRENTLY
                --> IN MOST CASES, ISSUER WILL SAY canRunConcurrent = false

                
    heartbeat mechanism
        appears to be necessary
          need to make sure each end ALWAYS knows when connection is lost
          at least so that sockets with long-running commands in progress (e.g., tail -f) can kill those oeprations
        there are failure modes where the client and/or server does not get notified that the socket is broken
            see https://www.npmjs.com/package/ws#how-to-detect-and-close-broken-connections
            in many cases where connection drops, each side will fire a 'close' event
            but in at least one case (browser destroys websocket object), other end does not fire any event and thinks connection still open
        the server (using the ws package) has methods to explicitly send a ping or pong, and events for onping and onpong
        and, if the server sends a ping, the browser will send a pong back
        however, the browser client (WebSocket) does not have any way to send or observe ping/pong
        so, we need to implement our own 'heartbeat' mechanism where one side sends on an interval and the other responds,
            and each side closes the socket if no heartbeat within interval



*/
// per https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent/code
// NOTE:  4000-4999 are user-defined, application-specific
//       1000-3999 are defined by protocol
export const WSWCloseEventCodeMap: {[index: string]: {error: boolean, description: string} } = {
  '1000': { error: false, description: 'Normal Closure' },
  '1001': { error: true,  description: 'Going Away (server failure, browser refresh or navigation away from page)' },
  '1002': { error: true,  description: 'Protocol Error' },
  '1003': { error: true,  description: 'Unsupported Data' },
  '1004': { error: true,  description: 'Reserved' },
  '1005': { error: true,  description: 'No Status Rcvd' },
  '1006': { error: true,  description: 'Abnormal Closure' },
  '1007': { error: true,  description: 'Invalid frame payload data' },
  '1008': { error: true,  description: 'Policy Violation' },
  '1009': { error: true,  description: 'Message Too Big' },
  '1010': { error: true,  description: 'Mandatory Ext.' },
  '1011': { error: true,  description: 'Internal Error' },
  '1012': { error: true,  description: 'Service Restart' },
  '1013': { error: true,  description: 'Try Again Later' },
  '1014': { error: true,  description: 'Bad Gateway' },
  '1015': { error: true,  description: 'TLS Handshake' },
  '4000': { error: true,  description: 'Closing Conn - user called wswClose normal' },
  '4001': { error: true,  description: 'Closing Conn - user called wswClose with error' },
  '4002': { error: true,  description: 'Closing Conn - error - heartbeat lost' },
  '4003': { error: false, description: 'Closing Conn - app hostname changed' },
  '4004': { error: false, description: 'OnError callback called' },
}


/* op status and result codes (formerly used in service ops, svr.ts still returns same codes in op results)

  status: string (NOT NUMBER)
    -1    no result yet - still pending
    0     success
    01-09 could not/did not get response from server
      01 - server not available
      02 - NOT USED - USE -1 INSTEAD -another op still in progress
      03 - bad arguments passed
      04 - fetch call failed
      05 - response.json fail
      06 - request POST JSON.stringify failed
    10-19 got response from server (svr.ts or background), but there was a problem in the server
      10 - bad path in url
      11 - adaptCRInSvr failed
      12 - invalid request (e.g., if no middleware matches or can handle it)
    20-29 got response but there was a problem with mongo
      20 - connection to mongo failed
      21 - error returned on mongo operation
    30-39 for ServiceOpCommands, failure modes
      30 - command failed
    40-49 for file operations that fail for reasons other than those above
      40 - requested file does not exist
      41 - failure trying to read file from disk
      42 - failure trying to write file to disk
      43 - not valid json
    50-59 for problems with applying configs to downstream hosts
      51 - failure applying config to pihole
      TBD
    60-60 for problems with issuing op via TTable base
      60 - startNextServerOp tried to wswSendMessage but failed
    99 - server reached final middleware - should not happen, all code paths
          through other middlewares should end by sending response
  statusText: string
    additional info about the successful operation, or about an error

*/

// timeouts in milliseconds
export const WSWHEARTBEATSENDINTERVAL = 5000
export const WSWHEARTBEATLISTENTIMEOUT = 10000
export const WSWRECONNECTTIMEOUT = 1000
export const CHILDPROCESSTIMEOUT =  3600 * 1000   // timeout for child process 
export const WSWCHILDPROCESSRETURNCODE = '99999'    // if child process fails in a way that does not produce a return code, use this value

export type WSWSocketProtocols = 'general' | 'command' | 'statusmonitoring' | 'serverop'   // will be used as raw websocket 'protocol'
export type WSWMsgTypes = // OBSOLETE 'id' | 
              'heartbeat' | 'data' | 'error'
              | 'commandtoissuelocal' | 'commandtoissuedshost' | 'commandreplaylast' | 'commandcancel' | 'commandresulttermination' | 'commandstreamready'
              | 'getserverstate' | 'serverstate' 
              | 'configop' | 'configopresult'
              | 'crop' | 'cropresult'

export interface WSWMsgBase {
  msgType: WSWMsgTypes
  unableToSendReason?: string    // if wswSendMessage cannot send, it will reject promise, after populating this prop with a reason
  trail: string[]   // to trace the flow of messages - every method that creates or touches a message will add its name to this array
}
// OBSOLETE export interface WSWMsgId extends WSWMessageTypeBase {
// OBSOLETE   msgType: 'id'
// OBSOLETE   body: string
// OBSOLETE }
export interface WSWMsgHeartBeat extends WSWMsgBase {
  msgType: 'heartbeat'
  socketInfo?: string
}
export interface WSWMsgData extends WSWMsgBase {
  msgType: 'data'
  commandResult: boolean
  body: string
}
export interface WSWMsgError extends WSWMsgBase {
  msgType: 'error'
  code: string
  message: string
}
export interface WSWMsgCommandToIssueLocal extends WSWMsgBase {
  msgType: 'commandtoissuelocal'
  command: string
  processLines: 'pihole getDecision' | undefined
  args: string[]
}
export interface WSWMsgCommandToIssueDSHost extends WSWMsgBase {
  msgType: 'commandtoissuedshost'
  canRunConcurrent: boolean
  dsHost: string   // if undefined, command will run in child process locally on server
      // if defined, must be a valid dsHost name (in server state.downstreamHosts), and command will be issued through a dsHostConn
  command: string
  processLines: 'pihole getDecision' | undefined
  args: string[]
}
export interface WSWMsgCommandReplayLast extends WSWMsgBase {
  msgType: 'commandreplaylast'
  lines: number // 0 for all lines, positive number -> first n lines, negative number -> last n lines
}
export interface WSWMsgCommandCancel extends WSWMsgBase {
  msgType: 'commandcancel'
}
export interface WSWMsgCommandStreamReady extends WSWMsgBase {  // typically the output of the shell command
  msgType: 'commandstreamready'
}
export interface WSWMsgCommandTermination extends WSWMsgBase {  // typically the output of the shell command
  msgType: 'commandresulttermination'
  returnCode: string
  wasClean: boolean
  reason: string
}
export interface WSWMsgGetServerState extends WSWMsgBase {
  msgType: 'getserverstate'
}
export interface WSWMsgServerState extends WSWMsgBase {
  msgType: 'serverstate'
  body: string   // json-ified server state object
}
export interface WSWMsgConfigOpPull extends WSWMsgBase {
  msgType: 'configop'
  op_type: 'pull'
  source: 'ifs' | 'file' | 'filenames'
  filename?: string  // required if source === 'file'
}
export interface WSWMsgConfigOpPush extends WSWMsgBase {
  msgType: 'configop'
  op_type: 'push'
  push_type: 'commit' | 'save' | 'temp' | 'removetemp' | 'temptonontemp' // OBSOLETE  | 'enable_phbbd' | 'disable_phbbd'
  // enable|disable toggleable will effectively do a new commit for inforce nonTemp
  // setting the tool_pihole property to true or false for any ConfigItem for which priority === '100' and hostDomainPatterns === '.*'
  expiration_seconds?: string  // n/a for commit or save
  // OBSOLETE source: 'inforce' | 'payload'
  // OBSOLETE apply_to_dshosts: 'true' | 'false'
  // OBSOLETE target_host: string  // single host_* value, or '' to apply to all hosts
  generate_lsrules: 'true' | 'false'
  // OBSOLETE - THIS SERVICE OP ALWAYS RESULTS IN SAVE TO DISK  save_to_disk: 'true' | 'false'
  filename_saved?: string   // undefined in request; server returns filename saved if save successful
  prev_filename_to_delete_after_save?: string   // undefined in response
                            // if provided in request, server will delete this filename after saving new file, if save was successful
  // payload is SetRaw for commit, save, temp
  // payload is string[] (list of ids) for removetemp, temptonontemp
  // payload is undefined in the response
  payload: ConfigSetRaw | ConfigItemRaw[] | string[]
}

export interface WSWMsgConfigOpResult extends WSWMsgBase {
  msgType: 'configopresult'
  status: string
  status_text: string
  filename_saved?: string   // undefined in op as submitted; server populates filename saved if save successful
  payload?: SetRaw | string[]  // string[] for pull filenames result
}

export interface WSWMsgCROp extends WSWMsgBase {
  msgType: 'crop'
  op_type: 'push' | 'pull'
  query_params?: string    
      // FOR WSW OPS, SHOULD BE JSON.STRINGIFIED OBJECT WITH PROPS FOR ANY QUERY PARAMETERS
      // used to be query parameters to be included in http request
      // query_params allow user to specify filters for the mongo query
      // svr.ts middleware for http request used express's automatic parsing of http 
      // query strings into the req.query object
      // IF/WHEN WE SUPPORT THIS ON CLIENT SIDE, SHOULD PROBABLY REVAMP INTO AN OBJECT
  payload?: ICRIFromMongo[]
}
export interface WSWMsgCROpResult extends WSWMsgBase {
  msgType: 'cropresult'
  status: string
  status_text: string
  payload?: ICRIFromMongo[]
}

export type WSWMsg = // OBSOLETE  WSWMsgId | 
      WSWMsgHeartBeat | WSWMsgData | WSWMsgError
      | WSWMsgCommandToIssueLocal | WSWMsgCommandToIssueDSHost | WSWMsgCommandReplayLast | WSWMsgCommandCancel |WSWMsgCommandTermination | WSWMsgCommandStreamReady
      | WSWMsgGetServerState | WSWMsgServerState
      | WSWMsgConfigOpPull | WSWMsgConfigOpPush | WSWMsgConfigOpResult
      | WSWMsgCROp | WSWMsgCROpResult

export type WSWMsgConfigOpTypes = WSWMsgConfigOpPull | WSWMsgConfigOpPush
export type WSWMsgCROpTypes = WSWMsgCROp
export type WSWMsgOpTypes = WSWMsgConfigOpTypes |WSWMsgCROpTypes
export type WSWMsgConfigOpResultTypes = WSWMsgConfigOpResult
export type WSWMsgCROpResultTypes = WSWMsgCROpResult
export type WSWMsgOpResultTypes = WSWMsgConfigOpResultTypes | WSWMsgCROpResultTypes

export interface WSWQueuedOp {
  op: WSWMsgOpTypes
  resolver: (result: WSWMsgOpResultTypes) => void
  rejecter: (result: WSWMsgOpResultTypes) => void
  opQueuedTime: number
  opIssuedToSocketTime: number
  opCompletedTime: number
}

/*
generic web socket wrapper
abstracts out aspects that are specific to browser, node server, etc. environments
     websocket APIs
     mobx, etc.
     node child process management
code branches to handle both the case where this side initiates the connection 
  and where this side responds to an incoming connection request

sub-classes must
  1) implement local-specific API calls
     1a) websocket APIs
     1b) mobx, etc.
     1c) node child process management
  2) validate against things that should not be allowed in the local context
       e.g., browser side sockets must be initiators

server-side variations will be
   child process management
     whether one is running
     handle for killing it
     methods/callbacks
   remove instance from global openSockets list on close

*/

export interface WSWConstructorPropsBase { 
  parentOpenCallback?:                     (()=>void)
  parentDataReceivedCallback?:             ((dataReceived: WSWMsgData) => void)
  parentErrorCallback?:                    ((error: WSWMsgError)=>void)
  parentCloseCallback?:                    ((code: number, reason: string)=>void)
  parentCommandStreamReadyCallback?:       (()=>void)
  parentCommandResultTerminationCallback?: ((termMsg: WSWMsgCommandTermination)=>void)
  parentOpResultCallback?:                 ((result: WSWMsgOpResultTypes)=>void)
  parentServerStateCallback?:              ((stateMsg: WSWMsgServerState)=>void)
}

export interface WSWConstructorPropsInitiator<WSType> extends WSWConstructorPropsBase{
  isInitiator: true
  willTryToReconnect: boolean
  protocol: WSWSocketProtocols
  server: ServerClientInfo
  socketInfo: string
  log?: boolean 
}
export interface WSWConstructorPropsNONInitiator<WSType> extends WSWConstructorPropsBase {
  isInitiator: false
  willTryToReconnect: false   // always false for non-initiators
  socket: WSType
  id: string
  socketInfo: string
  remoteAddress: string
  log?: boolean 
}
export type WSWConstructorProps<WSType> = WSWConstructorPropsInitiator<WSType> | WSWConstructorPropsNONInitiator<WSType>

export abstract class WebSocketWrapperGeneric2<WSType, CommandOrOpType> {

  // id - a uuid, so that i can relate the socket object on server side to client side
  id: string = uuidv4()
  remoteAddress: string | undefined  // will only be defined on server side
  // for initiators, must be provided in constructor, and will send with heartbeat messages
  // for non-initiators, set to fixed value in constructor, and copy in value from heartbeat message when received
  socketInfo: string

  // isInitiator controls:
  //   whether socket is provided to constructor, or we initiate connect from this end
  //   whether this end should be sending heartbeats, or only listening for them
  //   whether this end generates the 'id'
  readonly isInitiator: boolean

  private tryToReconnect: boolean = false   // private so that if external code wants to change it, will go through setter
  get willTryToReconnect(): boolean { return this.tryToReconnect }
  set willTryToReconnect(newValue: boolean) {

    // if had been true but new value is false, cancel retry timer
    if ((newValue === false) && (this.reconnectTimeoutID)) clearTimeout(this.reconnectTimeoutID)
    this.tryToReconnect = newValue
  }

  reconnectTimeoutID: NodeJS.Timeout | undefined = undefined


  server: ServerClientInfo | undefined = undefined  // will be undefined for non-initiators
  rawWS: WSType | undefined = undefined     // will be undefined if this is an initiator but connect has not been called yet

  readonly protocol: WSWSocketProtocols

  messageLog: string[] = []
  readonly loggingOn: boolean
  // returns standardized info string - can be overridden to include more specific info
  get infoString(): string {
    // OLDER VERSION  return `${this.id.slice(0,4)} ${this.socketInfo} ${this.protocol} cip: ${this.commandOrOInProgress ? 'YES' : 'NO'} ${this.readyState}`
    return `${this.id.slice(0,4)} ${this.socketInfo} ${(this.remoteAddress) ? this.remoteAddress : ''} - ${this.readyState} cip: ${this.commandOrOpInProgress ? 'YES' : 'NO '}`
  }

  // callbacks to pass open, data, error, close and command results back to parent application code
  // readonly (with one exception) because must be provided in constructor and cannot be changed after that
  // to prevent accidentally stomping on a previously created parent callback
  readonly parentOpenCallback:                     (()=>void)                                                    | undefined
  readonly parentDataReceivedCallback:             ((dataReceived: WSWMsgData) => void)                   | undefined
  readonly parentErrorCallback:                    ((error: WSWMsgError)=>void)                           | undefined
  readonly parentCloseCallback:                    ((code: number, reason: string)=>void)   | undefined
  readonly parentCommandResultTerminationCallback: ((termMsg: WSWMsgCommandTermination)=>void) | undefined
  // next one is not readonly because owner may want to change it after construction
           parentCommandStreamReadyCallback:       (() => void) | undefined
  readonly parentOpResultCallback:                 ((result: WSWMsgOpResultTypes)=>void) | undefined
  readonly parentServerStateCallback:              ((stateMsg: WSWMsgServerState)=>void) | undefined
  // commandOrOpInProgress is typed as CommandType, and undefined indicates that no command is in progress
  //          servers that create child processes will make it the object reference to the child process
  //          so that commandOrOInProgress will always equate to the existence of the child process
  //          clients that issue commands will store a copy of issuecommand message here
  //       having an object assigned to it will be 'truthy' and undefined is 'falsy'
  commandOrOpInProgress: CommandOrOpType | undefined = undefined
  

  // abstracts for local implementation methods which can vary depending on whether we are a browser process, nodejs (server) process, etc.
  //  1) standardizes arguments passed in and return values
  //  2) implementations will do things that are different depending on the local implementation
  abstract rawLog(caller: string, messageString: string): void   // need to wrap this because browser side will use RunInAction
  // local-specific things to do when wrapper is constructed (e.g., makeObservable for browser)
  abstract localConstructorSetup(props: WSWConstructorProps<WSType>): void  
  // wrappers for local raw WebSocket methods
  abstract rawWSConstructor(url: string, protocol: WSWSocketProtocols): boolean  // return value indicates success (could fail if, e.g., hostname invalid)
  abstract rawAddListeners(): void  // separate method from rawWSConstructor, because the raw socket may have already been constructed when our WSW is instantiated
  abstract rawDetachListeners(): void
  abstract rawGetSocketProtocol(): WSWSocketProtocols
  abstract get rawReadyState(): number
  abstract rawSend(message: WSWMsg): void                     
  abstract rawClose(code: number, reason: string): void  // userClosed is true if user called wswClose on this end, false if closing because of error event
  // handle incoming 'command' messages in a local-specific way (e.g., reject them if this side does not handle commands, or execute the command if valid to do so)
  abstract handleCommand(commandMsg: WSWMsgCommandToIssueLocal | WSWMsgCommandToIssueDSHost | WSWMsgCommandReplayLast): void
  abstract handleCommandCancel(cancelMessage: WSWMsgCommandCancel): void
  abstract handleOp(opMsg: WSWMsgOpTypes): void


  get readyState(): number {
    if (this.rawWS) return this.rawReadyState
    else return -1
  }
  get readyStateString() {
    var result = `socket ${this.id.slice(0, 4)}... `
    const ws = this.rawWS
    if (ws === undefined) result += `RAW SOCKET OBJECT UNDEFINED`
    else switch (this.readyState) {
      case -1: result += '-1 NO RAW SOCKET CREATED YET'; break
      case  0: result += '0 CONNECTING'; break
      case  1: result += '1 OPEN'; break
      case  2: result += '2 CLOSING'; break
      case  3: result += '3 CLOSED'; break
      default: result += `${this.rawReadyState} UNEXPECTED readyState VALUE???`; break
    }
    return result
  }
  heartbeatListenerTimeoutID: NodeJS.Timeout | undefined
  heartbeatSenderIntervalID: NodeJS.Timeout | undefined
  timeOfLastHeartbeat: number = Date.now()
  



  constructor(props: WSWConstructorProps<WSType>) {
    this.isInitiator = props.isInitiator
    // OBSOLETE NOW HANDLING VIA TYPING OF PROPS  // validate options
    // OBSOLETE NOW HANDLING VIA TYPING OF PROPS  if (isInitiator) {if (!options.protocol || !options.server || !options.socketIinfo) throw new Error(`WSWWrapper tried to construct as initiator but protocol, server or socketInfo argument missing`) }
    // OBSOLETE NOW HANDLING VIA TYPING OF PROPS  else             if (!options.socket) throw new Error(`WSWrapper tried to construct as NOT initiator but socket argument missing`)

    this.willTryToReconnect = props.willTryToReconnect
    this.loggingOn = props.log || false

    this.parentOpenCallback                     = props.parentOpenCallback
    this.parentDataReceivedCallback             = props.parentDataReceivedCallback
    this.parentErrorCallback                    = props.parentErrorCallback
    this.parentCloseCallback                    = props.parentCloseCallback
    this.parentCommandStreamReadyCallback       = props.parentCommandStreamReadyCallback
    this.parentCommandResultTerminationCallback = props.parentCommandResultTerminationCallback
    this.parentOpResultCallback                 = props.parentOpResultCallback              
    this.parentServerStateCallback              = props.parentServerStateCallback

    if (props.isInitiator === true) {
      this.server = props.server
      this.protocol = props.protocol as WSWSocketProtocols
      this.socketInfo = props.socketInfo
    }
    else {
      this.rawWS = props.socket
      this.rawAddListeners()
      this.resetHeartbeatListenerTimeout()
      this.protocol = this.rawGetSocketProtocol()
      this.id = props.id
      this.remoteAddress = props.remoteAddress
      this.socketInfo = props.socketInfo
      // OBSOLETE - NOW SET BY INITIATOR AT INITIALIZATION AND SENT IN CONNECT URL this.id = uuidv4()
      // OBSOLETE this.wswSendMessage( { msgType: 'id', body: this.id, trail: ['wsw generic constructor'] })
    }

    // do any local-specific constructor setup (e.g., in browser, do makeObservable)
    this.localConstructorSetup(props)

    this.onOpenCallback =    this.onOpenCallback.bind(this)
    this.onMessageCallback = this.onMessageCallback.bind(this)
    this.onErrorCallback =   this.onErrorCallback.bind(this)
    this.onCloseCallback =   this.onCloseCallback.bind(this)

  }

  resetHeartbeatListenerTimeout() {
      if (this.heartbeatListenerTimeoutID !== undefined) clearTimeout(this.heartbeatListenerTimeoutID)
      this.heartbeatListenerTimeoutID = setTimeout(()=>{
          this.wswClose(4001, 'HEARTBEAT LISTENER TIMED OUT')
      }, WSWHEARTBEATLISTENTIMEOUT)
  }

  log(caller: string, messageString: string) { if (this.loggingOn) this.rawLog(caller, messageString) }

  // check msgType and throws error if not valid based on protocol, otherwise just return
  // just throw errors and crash - invalid combos should never happen
  validateMessageTypeForProtocol(msg: WSWMsg) {
    //cl(`VALIDATING MESSAGE - protocol: ${this.protocol} - msgType: ${msg.msgType}`)
    switch(msg.msgType) {
      // OBSOLETE case 'id':
      case 'heartbeat':
      case 'data':
      case 'error':
        return
      case 'commandtoissuelocal':
      case 'commandtoissuedshost':
      case 'commandreplaylast':
      case 'commandcancel':
      case 'commandresulttermination':
      case 'commandstreamready':
        if (this.protocol === 'command') return
        else break
      case 'getserverstate':
      case 'serverstate':
        if (this.protocol === 'statusmonitoring') return
        else break
      case 'configop':
      case 'configopresult':
      case 'crop':
      case 'cropresult':
        if (this.protocol === 'serverop') return
        break
      default:
        break
    }
    // if we fell through to here, message type is invalid for protocol
    throw new Error(`WSW - INVALID MESSAGE TYPE FOR PROTOCOL - protocol: ${this.protocol}, msgType: ${msg.msgType}`)
  }

  onOpenCallback() {
      this.log(`WSWG.onOpenCallback`, ``)
      if (this.parentOpenCallback) this.parentOpenCallback()
      // send heartbeat message right now, to populate socketInfo on non-initiator side
      if (this.isInitiator) this.wswSendMessage({ msgType: 'heartbeat', socketInfo: this.socketInfo, trail: [`WSWG.onOpenCallback - from initiator`]})
      // start the heartbeat listener timeout
      this.resetHeartbeatListenerTimeout()
      // if this is the initiator, start heartbeat sender interval timer
      if (this.isInitiator === true) this.heartbeatSenderIntervalID = setInterval(()=>{
          const msgResult = this.wswSendMessage({ msgType: 'heartbeat', socketInfo: this.socketInfo, trail: [ 'heartbeat sender interval' ] })
          if (msgResult.unableToSendReason) {
            this.log(`WSWG.onOpenCallback`, `SENDING HEARTBEAT MESSAGE FAILED - calling wswClose`)
            this.wswClose(4000, `SENDING HEARTBEAT MESSAGE FAILED`)
          }
      }, WSWHEARTBEATSENDINTERVAL)
  }

  onMessageCallback(msgString: string) {
      var message: WSWMsg
      try { message = JSON.parse(msgString) }
      catch { throw new Error(`could not JSON.parse message object - THIS SHOULD NEVER HAPPEN`) }
      this.validateMessageTypeForProtocol(message)

      message.trail.push('onMessageCallback')
      if (message.msgType !== 'heartbeat') this.log(`WSWG.onMessageCallback`, ` ${message.msgType}`)

      switch (message.msgType) {
        // OBSOLETE case 'id': 
        // OBSOLETE   if (this.isInitiator === false) throw new Error(`this is NOT the initiator but it recevied an id message - THIS SHOULD NEVER HAPPEN`)
        // OBSOLETE   this.id = message.body
        // OBSOLETE   break
        case 'heartbeat': 
          //cl(`${this.id.slice(0,4)} received heartbeat`)
          this.timeOfLastHeartbeat = Date.now()
          // if this is NOT the initiator, send a heartbeat back
          if (this.isInitiator === false) {
            this.socketInfo = message.socketInfo || '<non initiator but no socketInfo in heartbeat>'
            this.wswSendMessage( { msgType: 'heartbeat', trail: [ 'heartbeat responder' ] } )
          }
          this.resetHeartbeatListenerTimeout()
          break
        case 'data':
            if (this.parentDataReceivedCallback) this.parentDataReceivedCallback(message)
          break
        case 'error':
          if (this.parentErrorCallback) this.parentErrorCallback(message)
          this.wswClose(Number.parseInt(message.code), `received error message from other end - code: ${message.code} - message: ${message.message}`)
          break   
        case 'commandtoissuelocal':
        case 'commandtoissuedshost':
        case 'commandreplaylast':
          this.handleCommand(message)   // handleCommand method will validate whether this instance is eligible to handle the command
          break
        case 'commandcancel':
          this.handleCommandCancel(message)
          break
        case 'commandstreamready':
          if (this.parentCommandStreamReadyCallback) this.parentCommandStreamReadyCallback()
          break
        case 'commandresulttermination':
          this.log(`WSWG.onMessageCallback`, `commandresulttermination message received`)
          if (this.parentCommandResultTerminationCallback) this.parentCommandResultTerminationCallback(message)
          this.commandOrOpInProgress = undefined
          break
        case 'configop':
        case 'crop':
          this.handleOp(message)
          break
        case 'configopresult':
        case 'cropresult':
          if (this.parentOpResultCallback) this.parentOpResultCallback(message)
          this.commandOrOpInProgress = undefined
          break
        case 'serverstate':
          if (this.parentServerStateCallback) this.parentServerStateCallback(message)
          break
        // 'getserverstate' and other msgType values should fall to 'default' case and throw error
        // for 'getserverstate' in particular, server side implementation will override onMessageCallback and handle that message type
        default:  throw new Error(`received unknown/unhandled message type ${(message as any).msgType} - THIS SHOULD NEVER HAPPEN`)
      }
  }

  onErrorCallback(name: string, message: string) {
    this.log(`WSWG.onErrorCallback`, ` error event: ${name} - ${message}`)
    // call call wswClose here
    // for some (all?) errors, system will fire close event anyway, but 
    // but we still have onError do wswClose in case it is some other kind of error that would leave the socket open
    this.log(`WSWG.onErrorCallback`, `  calling WGWG.wswClose`)
    this.wswClose(4001, `raw socket fired error event: ${name} - ${message}`)
    if (this.parentErrorCallback) {
      this.log(`WSWG.onErrorCallback`, ` calling parentErrorCallback`)
      this.parentErrorCallback({ msgType: 'error', code: '4004', message: `${name} - ${message}`, trail: ['onErrorCallback'] })
    }
    else this.log(`WSWG.onErrorCallback`, ` would have called parentErrorCallack but it was undefined`)
  }

  onCloseCallback(code: number, reason: string) {  // wasClean: boolean - only provided by browser websocket api so we don't use it
      this.log(`WSWG.onCloseCallback`, ` code: ${code} - reason: ${reason} `)
      //this.log(`WSWG.onCloseCallback`, `    now will detach listeners and set rawWS to undefined`)
      this.rawDetachListeners()
      this.rawWS = undefined
      //this.log(`WSWG.onCloseCallback`, `    rawWS has been set to undefined`)
      if (this.parentCloseCallback) {
        // this.log(`WSWG.onCloseCallback`, `    calling WSWG.parentCloseCallback`)
        this.parentCloseCallback(code, reason)
      }
      // else this.log( `WSWG.onCloseCallback`, `    WSWG.parentCloseCallback undefined`)
      this.commandOrOpInProgress = undefined
      clearInterval(this.heartbeatSenderIntervalID)
      clearTimeout(this.heartbeatListenerTimeoutID)
      if (this.willTryToReconnect) {
        this.log(`WSWG.onCloseCallback`, `setting reconnect timeout`)
        this.setReconnectTimeout()
      }
      this.log(`WSWG.onCloseCallback`, `  onCloseCallback done`)
  
  }


  wswConnect(): boolean {
    this.log(`WSWG.wswConnect`, '')
    if (this.isInitiator === false) throw new Error(`tried to connect from a WSWrapper that is not an initiator`)
    // if there is already a socket defined, throw error - this should never happen and I should fix upstream code
    if (this.rawWS) throw new Error(`wswConnect tried to connect socket, but socket already exists - THIS SHOULD NEVER HAPPEN`)
    if (!this.server) throw new Error(`wswConnect tried to connect but this.server is undefined - THIS SHOULD NEVER HAPPEN`)
    const wsurl = `wss://${this.server.host}:${this.server.port}?id=${this.id}&socketInfo=${this.socketInfo}`
    
    if (this.rawWSConstructor(wsurl, this.protocol) === false) {
      this.log(`WSWG.wswConnect`, `  rawWSConstructor FAILED FOR: ${wsurl} - protocol ${this.protocol}`)
      return false
    }
    else {
      this.log(`WSWG.wswConnect`, `  after rawWSConstructor returned, calling rawAddListeners`)
      this.rawAddListeners()
      return true
    }
  }

  // failure modes:
  //   JSON.stringify fails - crash, i need to fix code upstream that passes the message
  //   socket not defined or not OPEN - return with message.unableToSendReason set - this could be due to transient network problem and upstream code should recover from this
  wswSendMessage(message: WSWMsg): WSWMsg {
    //this.log(`WSWG.wswSendMessage`, `called with message type ${message.msgType}`)
    this.validateMessageTypeForProtocol(message)
    message.trail.push('wswSendMessage')
    if (message.msgType !== 'heartbeat') this.log(`WSWG.wswSendMessage`, ` ${message.msgType}`)
    // test whether can JSON.stringify the message - fail if cannot (should never happen)
    try { JSON.stringify(message) } 
    catch { throw new Error(`WebSocket handler could not JSON.stringify message - THIS SHOULD NEVER HAPPEN`) }

    if (this.rawWS === undefined) { 
      message.unableToSendReason = 'RAW SOCKET DOES NOT EXIST'
      return message
    }
    else if (this.rawReadyState !== 1) { 
      message.unableToSendReason = `SOCKET ${this.id.slice(0,4)} EXISTS BUT STATE IS NOT OPEN`
      return message
    }
    else {
      // if this is a command or op, set commandOrOpInProgress
      switch (message.msgType) {
        case 'commandtoissuelocal': 
        case 'commandtoissuedshost':
        case 'configop':
        case 'crop':
          if (this.commandOrOpInProgress) {
            message.unableToSendReason = 'A COMMAND IS ALREADY IN PROGRESS'
            return message
          }
          else this.commandOrOpInProgress = message as unknown as CommandOrOpType
          break
        default:
          break
      }
      //this.log(`WSWG.wswSendMessage`, `about to call rawSend for ${message.msgType}`)
      try {
        this.rawSend(message)
      }
      catch(err) {
        message.unableToSendReason = `wswSendMessage call to rawSend failed with error: ${JSON.stringify(err)}`
      }
      return message
    }
  }

  wswClose(code: number, reason: string) {   // 'code' indexes WSWEventCodeMap
    this.log(`WSWG.wswClose`, ` - ${code} reason: ${reason}`)
    if ((this.rawWS !== undefined)) {
      this.log('WSWG.wswClose', `   calling WSWB.rawClose`)
      this.rawClose(code, reason)
      this.log('WSWG.wswClose', `   after WSWB.rawClose`)
    }
    else {
      this.log(`WSWG.wswClose`, `doing nothing because rawWS is undefined`)
    }
  }

  // reconnect logic 
  // USE TIMEOUT, NOT INTERVAL - WANT IT TO FIRE ONCE AND BE DONE 
  // WILL START ANOTHER TIMEOUT IF CONNECTION ATTEMPT FAILS 
  // CONNECTION FIALURES 
  //   INVALID HOSTNAME - RAWWSCONSTRUCTOR WILL fail, SO WSWCONNECT STARTS ANOTHER TIMEOUT
  //   CONNECTION FAILS - WILL GET ERROR EVENT THEN CLOSE EVENT, SO ONCLOSE HANDLER CAN DO 
  setReconnectTimeout() {
    if (this.readyState !== -1) throw new Error(`TRIED TO SET RECONNECTTIMEOUT BUT RAWWS IS DEFINED`)
    clearTimeout(this.reconnectTimeoutID)
    this.reconnectTimeoutID = undefined
    if (this.willTryToReconnect) {
      this.log(`WSWG.setReconnectTimeout`, `setting reconnectTimeout`)
      this.reconnectTimeoutID = setTimeout(()=>{
        this.log(`WSWG.setReconnectTimeout`, `timeout fired, will try to wswConnect now`)
        if (this.wswConnect() === false) {  // if wswConnect fails, set a new timeout
          this.log(`WSWG.setReconnectTimeout`, `wswConnect failed, resetting timemout`)
          this.setReconnectTimeout()
        }
        else {
          this.log(`WSWG.setReconnectTimeout`, `wswConnect succeeded`)
        }
      }, WSWRECONNECTTIMEOUT)
    }
  }

}






// OBSOLETE export interface ItemSetMetadata { 
// OBSOLETE   id: string        // will be a uuid
// OBSOLETE         // NOTE: id IS USED TO DETERMINE IF ANYTHING IN A SET HAS CHANGED (IN TTABLE AND ELSEWHERE)
// OBSOLETE         // SO, IT NEEDS TO BE UPDATED ON ANY CHANGE IN THE SET
// OBSOLETE   timestamp: number // will be set on creation, and updated when anything in the set changes
// OBSOLETE   notes: string     // descriptive notes
// OBSOLETE }


export type HasIfsConfigState = 'yes' | 'noOrUnknown' | 'updateInProgress'

// information about a single host
// will be props of a Hosts object, keyed by hostnames
export interface HostInfo {
  [index: string]: any
  ip?: string    // only needed for hosts that will be administered via ssh from server
  sshConnStatus: 'connected' | 'not connected'
  sshConnError: string
  tools: {
    [index: string]: {      // index will be ToolNames
      hasIfS: HasIfsConfigState
      error: string       // will be '' or error string
    }
  }
}

export interface Hosts {
  [index: string]: HostInfo   // propnames will be HostNames
}




export interface ServerClientInfo {
  host: string
  port: number
  // OBSOLETE available: boolean
  opsInProgress: number
  lastServerStateReceived: ServerStateRaw
  // ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS  latestServiceOpInProgressOrCompleted: ServiceOperation | undefined  // last serviceOp to be submitted/completed by the handleServiceOpReturnsPromise function
  // THIS SHOULD NOT BE MODIFIED BY ANY CODE OTHER THAN THE handleServiceOp FUNCTION
  // when handleServiceOp is called, if server is not available or another serviceOp is in progress,
  // we do NOT update this prop
  // otherwise, we update it when the serviceOp starts to be handled (will display as pending)
  // and update it again on completion (whether on success path or failure path)

}




// SEE NOTES IN svr.ts FOR IMPLEMENTATION DETAILS
export interface ServerStateRaw {
  serverTime: string   // string valued result of Date.now() = milliseconds since epoch
  // SEE NOTES IN svr.ts RE: HOW STATE IS MANAGED BETWEEN SERVER AND DOWNSTREAM HOSTS
  // REMOVE ANY NOTION THAT SERVER DOES ANYTHING FOR UPSTREAM HOSTS  upstreamHosts: Hosts        // hosts that are 'upstream' of the server
  // REMOVE ANY NOTION THAT SERVER DOES ANYTHING FOR UPSTREAM HOSTS                              // e.g., browser extensions and little snitch
  // REMOVE ANY NOTION THAT SERVER DOES ANYTHING FOR UPSTREAM HOSTS                              // these are not managed by the server, but we keep them in state
  // REMOVE ANY NOTION THAT SERVER DOES ANYTHING FOR UPSTREAM HOSTS                              // so that other clients have the information
  downstreamHosts: Hosts      // hosts that are 'downstream' of server
                              // e.g., piholes, etc
                              // for which configs are applied by server
  phbbdState: 'enabled' | 'disabled'  // computed by server based on scanning inforce non temp items
                                // will be 'disabled' if no relevant items exist
  ifSNonTempMD: SetMDRaw
  ifSTemp: ConfigSetRaw
  // error messages - '' (emply string) indicates successful operation
  // consolidated* - in svr.ts, will be computed when finalize response
  consolidatedErrorList: string[] // array of any non-'' errors
  consolidatedHasIfS: HasIfsConfigState  // 'updateInProgress' if any of those, else 'noOrUnknown' if any of those, else 'yes'
  // OBSOLETE downstreamHostControlErrors: string | (()=>string)  
  mongoErrorHeartbeat: string // error message only for heartbeat failures - '' if heartbeat succeeds
  mongoErrorOther: string // for any mongo operation, including loss of heartbeat
  fsError: string    // for any filesystem operation
  otherRequestError: string // for any http request handled, errors other than mongo or fs errors
}


export interface ServerStateWithClasses extends Omit<ServerStateRaw, 'ifSNonTempMD' | 'ifSTemp'> {
  ifSNonTempMD: SetMDClass
  ifSTemp: ConfigSetClass
}

export function exportServerStateWithClassesToRaw(stateWClasses: ServerStateWithClasses): ServerStateRaw {
  const result: ServerStateRaw = {} as ServerStateRaw
  Object.assign(result, stateWClasses)

  // convert class props from source to raw form
  result.ifSNonTempMD = stateWClasses.ifSNonTempMD.exportMDRaw()
  result.ifSTemp = SetClass.exportSetRaw(stateWClasses.ifSTemp, 'temp', i=>(i as ConfigItemRaw)) as ConfigSetRaw

  return result

}


// type alias for intersection of all webNavigation callback details
// these are all the elements that may be passed to webNavigation
// callbacks in the 'details' object
// see @types/chrome/index.d.ts
export type AllWebNavigationCallbackDetails =
chrome.webNavigation.WebNavigationCallbackDetails
& chrome.webNavigation.WebNavigationUrlCallbackDetails
& chrome.webNavigation.WebNavigationReplacementCallbackDetails
& chrome.webNavigation.WebNavigationFramedCallbackDetails
& chrome.webNavigation.WebNavigationFramedErrorCallbackDetails
& chrome.webNavigation.WebNavigationSourceCallbackDetails
& chrome.webNavigation.WebNavigationParentedCallbackDetails
& chrome.webNavigation.WebNavigationTransitionCallbackDetails


// type alias for intersection of all webRequest callback details
// these are all the elements that may be passed to webRequest
// callbacks in the 'details' object
// see @types/chrome/index.d.ts
export type AllWebRequestCallbackDetails =
chrome.webRequest.WebRequestDetails
& chrome.webRequest.WebRequestHeadersDetails
& chrome.webRequest.WebRequestBodyDetails
& chrome.webRequest.WebRequestFullDetails
& chrome.webRequest.WebResponseDetails
& chrome.webRequest.WebResponseHeadersDetails
& chrome.webRequest.WebResponseCacheDetails
& chrome.webRequest.WebRedirectionResponseDetails
& chrome.webRequest.WebAuthenticationChallengeDetails
& chrome.webRequest.WebResponseErrorDetails




// =======
// =====================================

// interfaces for
//   capture records that come from extension background script
//   capture records to/from mongo
//   individual capture records in ttable
//   capture record groups in ttable

// these will be used in a parallel set of class implementations in viewer


// base for all kinds of TTable item (individual and group)
export interface ITIBase {
  kind: Kinds
}

export interface HarEntryAndResponseContent {
  tabId: number
  harEntry: {
    entry: Har.Entry
    responseContent?: string
    responseContentEncoding?: string
  }
}



/*

  correspondence of props from dnr rule matched vs. webRequest

    props in cr as received by event handler

      dNR MatchedRuleInfoDebug        webRequest

      rule: chrome.dnr.Rule

      request.frameId: number         frameId: number
      request.initiator?: string      initiator?: string
      request.method: string          method: string
      
      // note apparent typo in dnr typedef - what is actually returned from api?
      request.partentFrameId: number   parentFrameId: number

      request.requestId: string       requestId: string
      request.tabId: number           tabId: number
      request.type: ResourceType      type: ResourceType
      request.url: string             url: string

      ==> looks like dnr request props map 1-1 to webRequest, no translation required

*/

// this is the object that will be posted from the 
// chrome.dnr.onRuleMatchedDebug handler - it is a 'sourceCR'
export interface DNRRuleMatchedInfo {

  // props from request part of chrome.dnr.MatchedRuleInfoDebug
  requestId: string   // stored as string in CRs, so we will make it string here
  tabId: number
  url: string
  type: string
  frameId: number
  initiator?: string
  method: string
  parentFrameId: number

  dNRRule: ConfigRuleBrowserDNR
}


// typing for CRs as they come from browser event callbacks
export type SourceCRTypes = AllWebRequestCallbackDetails & AllWebNavigationCallbackDetails & HarEntryAndResponseContent & DNRRuleMatchedInfo

// extends SourceCRTypes to include props that may be added while handling in extension
export interface SourceCRTypesWithAddedProps extends SourceCRTypes {
  reqBodyInfo?: string
  reqBody?: string
  postDataInfo?: string
  postData?: string
}




// interfaces for CRs received from extension
export interface ICRIFromExt extends ITIBase {
  [index: string]: any
  kind: CRKindsI
  event: string | undefined // every CRI will have a value for event and machine,
  machine: string | undefined  // but allow undefined because CRG getters may return undefined
                            // (if, say, CRG has no children yet)
  // OBSOLETE run: string       // value to distinguish "runs" of CRs
  // OBSOLETE                   // for browser events, these will be separately maintained per tabId
  // OBSOLETE                   // and incremented each time the user creates a new tab with that tabId
  // OBSOLETE                   // and also incremented when user clicks a button in the extension panel
  tabIdInit: string  // tabId + initiator if tabId===-1
  sourceCR: SourceCRTypesWithAddedProps
}

// base for all kinds of CRI after they are adapted by the adaptCRInSvr function
// ONLY NEED TO DEFINE HERE THE ADDITIONAL PROPS THAT ARE CREATED IN SERVER
// includes union of props computed in extension (e.g., event), svr, and mongo (_id)
// (union of those specific to webReq, webNav, har)
export interface ICRIFromSvr extends ICRIFromExt {
  [index: string]: any
  timeStampMin: number
  timeStampMax: number
  // OBSOLETE domain2: string

  statsGetContentSize?: string
  statsRequestBodyRawSize?: string
  statsHarPostDataTextSize?: string

  // for webNav
  transitionTypeString?: string
  transitionQualifiersString?: string

  // for webReq
  challengerObject?: chrome.webRequest.WebAuthChallenger
  challengerString?: string

  // for webReq and har
  resourceTypeString?: string
  //reqHeadersObject?: chrome.webRequest.HttpHeader[] | Har.Header[]
  reqHeaders?: string
  // OBSOLETE reqHeadersHaveBinaryData?: 'yes' | 'no'  // 'yes' if any req header has a binary data property in this CR or
                                      // any of its children
                                      // used a string rather than boolean, because computeGroupProp is 
                                      // defined to return a string value
  //resHeadersObject?: chrome.webRequest.HttpHeader[] | Har.Header[]
  resHeaders?: string
  // OBSOLETE resHeadersHaveBinaryData?: 'yes' | 'no'  // analogous to reqHeadersHaveBinaryData

  //reqBodyObject?: chrome.webRequest.WebRequestBody | Har.PostData
  reqBody?: chrome.webRequest.WebRequestBody | Har.PostData | 'LOADING FROM MONGO'

  resStatusCode?: string
  resStatusLine?: string


  // for har
  url?: string
  //queryStringObject?: Har.QueryString[]
  queryString?: string
  //initiatorObject?: Har._initiator
  connection?: string
  cache?: string
  reqHttpVersion?: string
  reqHeadersSize?: string
  reqCookies?: string
  reqBodySize?: string
  resHttpVersion?: string
  resHeadersSize?: string
  resBodySize?: string
  res_transferSize?: string

  mimeType?: string
  //contentObject?: Har.Content
  content?: string
  getContent?: string    // will be undefined when created by server, and then
                                  // poulated on demand by viewer
  getContentEncoding?: string

}

// base for all kinds of CRI as they will come from mongo
export interface ICRIFromMongo extends ICRIFromSvr {
  [index: string]: any
  _id: string
}






























// type aliases for kinds for all TTable types
// using types with fixed set of strings, rather than enums, because
// the kind field (at least for CRs) will be generated by the extension background script, which is
// not a typescript script
export type KindsI = OKindsI | CRKindsI | WLKindsI | ConfigKindsI | LVKindsI | PHKindsI | RUKindsI
export type KindsG = OKindsG | CRKindsG | WLKindsG | ConfigKindsG | LVKindsG | PHKindsG | RUKindsG
export type Kinds  = OKinds  | CRKinds  | WLKinds  | ConfigKinds  | LVKinds  | PHKinds  | RUKinds


// type aliases for kinds of TTable for objects
export type OKindsG = 'noneG' | 'objectG' | 'arrayG' | 'rootG' | 'NOTHANDLEDYET'
export type OKindsI = 'noneI' | 'undefined' | 'null' | 'boolean' | 'number' | 'string' | 'bigint' | 'symbol' | 'function' | 'NOTHANDLEDYET'
export type OKinds = OKindsG | OKindsI

// type aliases for kinds of TTable for capture records
//  CRKindsI   = kinds for individual CR's
//  CRKindsG   = kinds for all groups
//  CRKinds    = all kinds
export type CRKindsG = 'noneG' | 'rootG' | 'blobG' | 'tabG' | 
                      // obsolete 'runG'  | 
                      'hostnameG' | 'urlG' | 'dnshttpG'
                        | 'webReqG' | 'webNavG' | 'squidG' | 'pcapG'
export type CRKindsI   = 'noneI' | 'webReqI' | 'harI' | 'dNRMatchI' | 'webNavI' | 'squidI' | 'pcapI'
export type CRKinds  = CRKindsG | CRKindsI

export type WLKindsG = 'noneG' | 'rootG' | 'whitelistG'
export type WLKindsI = 'noneI' | 'whitelistI'
export type WLKinds  = WLKindsG | WLKindsI

export type ConfigKindsG = 'noneG' | 'rootG' | 'configG'
export type ConfigKindsI = 'noneI' | 'configI'
export type ConfigKinds  = ConfigKindsG | ConfigKindsI

export type PHKindsG = 'noneG' | 'rootG' | 'phG'
export type PHKindsI = 'noneI' | 'phI'
export type PHKinds = PHKindsG | PHKindsI

export type LVKindsG = 'noneG' | 'rootG' | 'lvG' | 'lvRawG' | PHKindsG
export type LVKindsI = 'noneI' | 'lvI' | 'lvRawI' | PHKindsI
export type LVKinds = LVKindsG | LVKindsI

export type RUKindsG = 'noneG' | 'rootG' | 'ruG'
export type RUKindsI = 'noneI' | 'ruI'
export type RUKinds = RUKindsG | RUKindsI


// reqPostDataString and resContentString will be truncated at this length
// so that only the truncated versions will be loaded by viewer
// viewer will load the un-truncated versions on demand if and when the user wants to see them
export const bodyTruncationLimit: number = 50



export function breakLines(s: string | undefined): string {
  const maxLine = 60
  let result: string = ''
  if (s === undefined) return result
  for (let i = 0; i < s.length; i+= maxLine) result += s.slice(i, i+maxLine)+'\n'
  return result
}
  
export function jsonStringifyClean(obj: Object): string {
  // remove quotes and commas
      // quotes at start of json strings:           regex = ( ")   - replace with ' '
      //    note: escaped " embedded in the string will be preceded by \, so this regex will not catch them
      // quotes at end of json identifier:          regex = (":)   - replace with ':'
      // ", at end of line (may be no comma):       regex = (",*$)   - replace with ''
  // regex must be global (g) to replace all occurrences
  // regex must be multiline (m) so that the $ marker in the comma replacer catches each line, not just the end of the string overall
  return JSON.stringify(obj, null, 2).replace(/ "/g,' ').replace(/":/g,":").replace(/",*$/gm,'')
}



// scan top level prop names for . - replace any . with 'DOT'
// recursively scan children
// (this utility is needed because mongo will not accept objects with prop names that include a literal .)
export function cleanPropNamesWithDots(obj: {[index: string]: any}): void {
  for (let p in obj) {
    // recursively call on object-valued props
    // do this before changing obj[p]'s name itself, so that ref to obj[p] is still valid
    if ((typeof obj[p]) === 'object') {
      cleanPropNamesWithDots(obj[p])
    }
    if (/\./.test(p)) {
      const newPropName = p.replace('.', 'DOT')
      obj[newPropName] = obj[p]
      delete obj[p]
      console.log(`replaced prop named "${p}" with prop named "${newPropName}`)
    }
  }
}


// walks up a Har initiator stack and returns a flat array of the url strings
//   'x' argument is object which could be
//      the 'stack' prop from the top level of an _initator object
//      the callFrames, parent and description arguments from an _initiatorParent object
//   'includeParentDescrs' argument - if true, include an item with the 'description' property of each parent encountered
//        (string will be prefixed with 'parent.description: ')
// if a callFrame encountered has no url, will insert 'undefined' as a string in the array
export function initFlattenURLs(x: {description?: string, callFrames: Har._initiatorCallFrame[], parent?: Har._initiatorParent}, includeParentDescrs: boolean): string[] {
  const result: string[] = []
  if (includeParentDescrs && (x.description !== undefined)) result.push('parent.description: '+x.description)
  for (let cf of x.callFrames) {
    if (cf.url === undefined) result.push('undefined')
    else result.push(cf.url)
  }
  if (x.parent !== undefined) result.push(...initFlattenURLs({description: x.parent.description, callFrames: x.parent.callFrames, parent: x.parent.parent}, includeParentDescrs))
  return result
}








/*

  how service ops are translated to/from http requests
    op_type controls whether this will be an HTTP GET or POST
    subject controls what the path will be in the url
    when making an http request, all ServiceOp props are converted to headers
      EXCEPT FOR any payload property
        there should only be a payload for a POST
        the entire ServiceOp will also be JSON.stringified into the request body for a POST
      using the 'makeHttpHeadersFromServiceOp' method (in this module)
      prepends 'svcop-' to each propname
      this is necessary because GETs cannot have a request body
    when server receives a request, headers with 'svcop-' are transferred into res.locals.serviceOp
      for POSTs, req.body is also passed through the json middleware, so that req.body.payload is present
    when server responds
      response body will be a JSON.stringified ServiceOp object
      including the payload
      code that generates response needs to construct it properly
      with all necessary props

    note:  all prop names are lowercase because they are converted to and from http header names
       which are case insensitive, and which are converted to lower case by http
    note: all prop values (other than payload) are strings - since these will be passed as http headers
       when serviceOps are passed via http
*/







// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS export interface ServiceOperationBase {
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS   [index: string]: any
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS   uuid: string
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS   status: string
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS   status_text: string
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS 
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS   op_type: 'pull' | 'push'  // OBSOLETE (NEVER USED?) | 'status'
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS   query_params?: string    // query parameters to be included in http request
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS                           // do NOT include the leading ? here
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS 
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS   can_retry: 'yes' | 'no' | 'undetermined'
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS   // OBSOLETE server_state: '' | ServerStateRaw
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS }
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS 
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS // OBSOLETE export interface ServiceOperationStatus extends ServiceOperationBase {
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS // OBSOLETE   subject: 'status'
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS // OBSOLETE }
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS 
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS // gets a ConfigSet from server, either the inforce set or a file from disk
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS export interface ServiceOperationConfigPull extends ServiceOperationBase {
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS   subject: 'config'
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS   op_type: 'pull'
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS   source: 'ifs' | 'file'
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS   filename?: string  // required if source === 'file'
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS   payload?: SetRaw  // undefined in the request
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS }
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS 
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS // push a ConfigSet to server, to be saved on disk OR committed and applied to ds hosts)
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS export interface ServiceOperationConfigPush extends ServiceOperationBase {
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS   subject: 'config'
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS   op_type: 'push'
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS   push_type: 'commit' | 'save' | 'temp' | 'removetemp' | 'temptonontemp' | 'enable_phbbd' | 'disable_phbbd'
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS   // enable|disable toggleable will effectively do a new commit for inforce nonTemp
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS   // setting the tool_pihole property to true or false for any ConfigItem for which priority === '100' and hostDomainPatterns === '.*'
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS   expiration_seconds?: string  // n/a for commit or save
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS   // OBSOLETE source: 'inforce' | 'payload'
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS   // OBSOLETE apply_to_dshosts: 'true' | 'false'
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS   // OBSOLETE target_host: string  // single host_* value, or '' to apply to all hosts
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS   generate_lsrules: 'true' | 'false'
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS   // OBSOLETE - THIS SERVICE OP ALWAYS RESULTS IN SAVE TO DISK  save_to_disk: 'true' | 'false'
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS   filename_saved?: string   // undefined in request; server returns filename saved if save successful
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS   prev_filename_to_delete_after_save?: string   // undefined in response
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS                             // if provided in request, server will delete this filename after saving new file, if save was successful
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS   // payload is SetRaw for commit, save, temp
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS   // payload is string[] (list of ids) for removetemp, temptonontemp
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS   // payload is undefined in the response
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS   payload: SetRaw | ConfigItemRaw[] | string[]
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS }
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS 
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS export interface ServiceOperationGetConfigFileNames extends ServiceOperationBase {
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS   subject: 'configfilenames'
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS   op_type: 'pull'
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS   payload?: string[]  // undefined in the request
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS }
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS 
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS // COMMENT OUT FOR NOW - NOT IMPLEMENTED YET   export interface ServiceOperationDownload extends ServiceOperationBase {
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS // COMMENT OUT FOR NOW - NOT IMPLEMENTED YET     subject: 'download'
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS // COMMENT OUT FOR NOW - NOT IMPLEMENTED YET     op_type: 'pull'
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS // COMMENT OUT FOR NOW - NOT IMPLEMENTED YET     filename: string  // filename to download (including path relative to server's main file directory)
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS // COMMENT OUT FOR NOW - NOT IMPLEMENTED YET   }
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS 
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS export type ServiceOperationConfig = ServiceOperationConfigPull | ServiceOperationConfigPush | ServiceOperationGetConfigFileNames  //  | ServiceOperationDownload
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS 
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS 
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS 
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS // STILL NEEDED?
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS export interface ServiceOperationGenerateLsrules extends ServiceOperationBase {
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS   subject: 'genlsrules'
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS   source: 'payload' | 'ifs'
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS   payload?: SetRaw
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS }
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS 
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS 
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS 
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS export interface ServiceOperationCR extends ServiceOperationBase {
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS   subject: 'crs'
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS   payload?: ICRIFromMongo[]
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS }
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS 
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS export interface ServiceOperationCommand extends ServiceOperationBase {
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS   subject: 'command'
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS   payload: any  // will vary depending on what the command is
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS             // in the request, payload may/will be arguments/data to be used with the command
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS             // in the response, payload may/will include data returned from execution
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS             //   of command, and/or result messages (e.g., from executing a shell command)
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS             // MAYBE WILL IMPLEMENT SPECIALIZED VERSIONS OF THIS TYPE
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS             // WITH MORE SPECIFIC TYPINGS FOR THE PAYLOADS
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS }
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS 
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS 
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS export type ServiceOperation = ServiceOperationConfig | ServiceOperationGenerateLsrules | ServiceOperationCR | ServiceOperationCommand
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS 
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS export type ServiceOperationHandler = (op: ServiceOperation) => Promise<ServiceOperation>
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS 
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS 
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS // returns object that can be included in 'headers' prop of fetch 'init' argument
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS export function makeHttpHeadersFromServiceOp(op: ServiceOperation) {
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS   const result: {[index: string]: string} = {}
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS   for (let p in op) {
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS     if (p !== 'payload') {
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS       result['svcop-'+p] = op[p].toString()
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS     }
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS   }
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS   return result
// ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS }

