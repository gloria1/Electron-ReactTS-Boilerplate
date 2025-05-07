


import { computed, makeObservable, observable, reaction, runInAction } from "mobx"
import { ServerClientInfo, WSWMsg, WSWMsgCommandToIssueLocal, WSWMsgCommandCancel, WSWSocketProtocols, WebSocketWrapperGeneric2, WSWMsgCommandReplayLast, WSWMsgOpTypes, WSWConstructorProps, WSWConstructorPropsInitiator } from "./commonAll"
import { v4 as uuidv4 } from 'uuid'
import { DnDApp } from "./commonApp"

const cl = console.log
const ct = console.table


/*
  browser-specific wrapper for generic socket

  0) wraps raw browser WebSocket API calls
  1) has prop for parentDnDApp
      WSWBrowsers 'register' themseleves with parent DnD app
        so that parent app will have a list of all existing sockets
        and can close all sockets when server.host changes
  2) localConstructorSetup makes some props observable to gui will react
  // OBSOLETE - NO LONGER DE-REGISTER ON CLOSE BECUASE WSW CAN RECONNECT 3)  onCloseCallback are overridden here - they also deregister WSW from parent app registered
  // OBSOLETE - NO LONGER DE-REGISTER ON CLOSE BECUASE WSW CAN RECONNECT     DnDApp parent close callbacks don't need to do deregistration
  4) wraps some things in RunInAction
*/

export class WebSocketWrapperBrowser2 extends WebSocketWrapperGeneric2<WebSocket, WSWMsgCommandToIssueLocal | WSWMsgOpTypes> {

  // override remoteAddress - will always be undefined for WSWB
  remoteAddress: undefined

  parentDnDApp: DnDApp
  // declare raw listeners as variables, so we can detach them
  rawOpenListener = this.onOpenCallback
  rawErrorListener = (event: Event) => this.onErrorCallback('raw WebSocket error', `${JSON.stringify(event)}`)
  rawCloseListener = (event: CloseEvent) => {runInAction(()=>this.onCloseCallback(event.code, event.reason))}
  rawMessageListener = (event: MessageEvent<any>) => this.onMessageCallback(event.data.toString())

  // override base class infoString to include time since app start
  get infoString(): string {
    // OLDER VERSIONreturn `${(Date.now() - this.parentDnDApp.startTime)/1000}s ${this.id.slice(0,4)} ${this.socketInfo} ${this.protocol} cip: ${this.commandOrOInProgress ? 'YES' : 'NO'} ${this.readyState}`
    return `${((Date.now() - this.parentDnDApp.startTime)/1000).toFixed(2)}s ${this.id.slice(0,4)} ${this.readyState} cip: ${this.commandOrOpInProgress ? 'YES' : 'NO '} `
  }

  // override generic constructor to
  //    restrict valid argument type
  //    take additional parameter for parentDnDApp and use that for server
  //    register with parentDnDApp
  constructor(props: Omit<WSWConstructorPropsInitiator<WebSocket>, 'isInitiator' | 'server'>, parentDnDApp: DnDApp) {
    super({
      willTryToReconnect: props.willTryToReconnect,
      isInitiator: true,
      protocol: props.protocol,
      server: parentDnDApp.server,
      socketInfo: props.socketInfo,
      log: props.log,
      parentOpenCallback: props.parentOpenCallback,
      parentDataReceivedCallback: props.parentDataReceivedCallback,
      parentErrorCallback: props.parentErrorCallback,
      parentCloseCallback: props.parentCloseCallback,
      parentCommandStreamReadyCallback: props.parentCommandStreamReadyCallback,
      parentCommandResultTerminationCallback: props.parentCommandResultTerminationCallback,
      parentOpResultCallback: props.parentOpResultCallback,   
      parentServerStateCallback: props.parentServerStateCallback,
    })

    this.parentDnDApp = parentDnDApp
    this.parentDnDApp.registeredSockets.push(this)

    makeObservable(this, {
    })

  }

  // implmement abstract methods

  rawLog(caller: string, message: string) {
      runInAction(()=>{
          if (this.messageLog.length > 1000) this.messageLog.splice(0, this.messageLog.length)   // just to keep it from growing indefinitely
          var logEntry = ''
          logEntry += `${this.infoString} - ${caller} - ${message.slice(0, 180)}`
          if (message.length > 120) logEntry += ` ... (${message.length - 120} more chars)`
      // ONLY DO CONSOLE LOGGING FOR NOW    this.messageLog.unshift(logEntry)  // unshift rather than push - together with styling on output wrapper div ({ overflow: 'auto', display: 'flex', flexDirection: 'column-reverse' }), this makes text view scroll to bottom on every update
          //cl(logEntry)
      })
  }

  localConstructorSetup(props: WSWConstructorPropsInitiator<WebSocket>): void {
    // OBSOLETE - NOW WE HANDLE BY TYPING OF PROPS  // validate that we are not trying to set up a non-initiator (i.e., a responder) on the browser side
    // OBSOLETE - NOW WE HANDLE BY TYPING OF PROPS  if (!isInitiator) throw new Error(`TRIED TO CREATE SOCKET WRAPPER AS NON-INITIATOR - CANNOT DO THIS IN BROWSER CONTEXT`)

    makeObservable(this, {
        // NOT SURE IF THIS EVER NEEDED TO BE OBSERVABLE, AND IT CAUSES PROBLEMS WHEN IT GETS CHANGES OUTSIDE OF RUNINACTION   rawWS: observable,
        commandOrOpInProgress: observable,
        messageLog: observable,
      })
  }

  rawWSConstructor(url: string, protocol: WSWSocketProtocols): boolean {
    var result: boolean = false
    runInAction(()=>{

// REVISE THIS:
// it apears that if url is invalid, WebSocket constructor still returns a WebSocket instance
// which will immediately fire error event
// so,
//    rawWS does get assigned
//    when the error event listener is attached, it will get called
// DON'T KNOW WHAT CIRCUMSTANCES MIGHT CAUSE THE WebSocket CONSTRUCTOR TO FAIL, BUT SHOULD STILL TRY/CATCH JUST IN CASE

      try {
        this.rawWS = new WebSocket(url, protocol)
        this.log('WSWB.rawWSConstructor', `constructed rawWS`)
        result = true
      }
      catch(err) {
        this.log('WSWB.rawWSConstructor', `CAUGHT ERROR TRYING TO CONSTRUCT RAW WebSocket - err: ${err}`)
        result = false
      }
    })
    return result
  }

  rawAddListeners(): void {
    this.log('WSWB.rawAddListeners', `called`)
    if (!this.rawWS) throw new Error(`called rawAddListeners but this.ws is undefined`)
    else {
        this.rawWS.addEventListener('open', this.rawOpenListener)
        this.rawWS.addEventListener('error', this.rawErrorListener)
        this.rawWS.addEventListener('close', this.rawCloseListener)
        this.rawWS.addEventListener('message', this.rawMessageListener)
    }
  }

  rawDetachListeners(): void {
    this.log('WSWB.rawDetachListeners', `called`)
    if (!this.rawWS) throw new Error(`called rawDetachListeners but this.ws is undefined`)
    else {
    //    see https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/removeEventListener
  ///   see https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/removeEventListener#matching_event_listeners_for_removal
      this.rawWS.removeEventListener('open', this.rawOpenListener)
      this.rawWS.removeEventListener('error', this.rawErrorListener)
      this.rawWS.removeEventListener('close', this.rawCloseListener)
      this.rawWS.removeEventListener('message', this.rawMessageListener)
}

  }

  rawGetSocketProtocol(): WSWSocketProtocols {
      if (!this.rawWS) throw new Error(`tried to get protocol from this.ws but this.ws is undefined`)
      else return this.rawWS.protocol as WSWSocketProtocols
  }

  get rawReadyState(): number {
      if (this.rawWS) return this.rawWS.readyState
      else throw new Error(`called rawReadyState but this.ws is undefined`)
  }

  rawSend(message: WSWMsg) {
      message.trail.push('browser.rawSend')
      if (message.msgType !== 'heartbeat') this.log('WSWB.rawSend', `${message.msgType}`)
      if (!this.rawWS) throw new Error(`rawSend called but this.ws undefined`)
      else this.rawWS.send(JSON.stringify(message))
  }

  rawClose(code: number, reason: string) {
    this.log('WSWB.rawClose', `called`)
    if ((this.rawWS !== undefined)) {
      this.log('WSWB.rawClose', `   calling rawWS.close`)
      this.rawWS.close(code, reason)
      this.log('WSWB.rawClose', `   after rawWS.close`)
    }
    else {
      this.log(`WSWB.rawClose`, `doing nothing because rawWS is undefined`)
    }
  }

  handleCommand(commandMsg: WSWMsgCommandToIssueLocal | WSWMsgCommandReplayLast): void {
    commandMsg.trail.push('browser.handleCommand')
    this.log(`WSWB.handleCommand`, '')
    throw new Error(`WSWBrowser handleCommand method called - THIS SHOULD NEVER HAPPEN`)
  }
  handleOp(opMsg: WSWMsgOpTypes): void {
    opMsg.trail.push('browser.handleOp')
    this.log(`WSWB.handleOp`, `msgType: ${opMsg.msgType} - opType: ${opMsg.op_type}`)
    throw new Error(`WSWBrowser handleOp method called - THIS SHOULD NEVER HAPPEN`)
  }

  handleCommandCancel(message: WSWMsgCommandCancel): void {
    message.trail.push('browser.handleCommandCancel')
    this.log(`WSWB.handleCommandCancel`, '')
    throw new Error(`WSWBrowser handleCommandCancel method called - THIS SHOULD NEVER HAPPEN`)
    
  }

  // OBSOLETE - NO LONGER DE-REGISTERING ON CLOSE BECAUSE WSW CAN TRY TO RECONNECT // override onCloseCallback to also de-register socket from parentDnDapp
// OBSOLETE - NO LONGER DE-REGISTERING ON CLOSE BECAUSE WSW CAN TRY TO RECONNECT 
  // OBSOLETE - NO LONGER DE-REGISTERING ON CLOSE BECAUSE WSW CAN TRY TO RECONNECT onCloseCallback(code: number, reason: string) {
  // OBSOLETE - NO LONGER DE-REGISTERING ON CLOSE BECAUSE WSW CAN TRY TO RECONNECT   this.log(`WSWB.onCloseCallback`, `${code} reason: ${reason}`)
  // OBSOLETE - NO LONGER DE-REGISTERING ON CLOSE BECAUSE WSW CAN TRY TO RECONNECT   this.log(`WSWB.onCloseCallback`, `   de-registering socket from parentDnDApp`)
  // OBSOLETE - NO LONGER DE-REGISTERING ON CLOSE BECAUSE WSW CAN TRY TO RECONNECT   this.parentDnDApp.registeredSockets = this.parentDnDApp.registeredSockets.filter(s => (s !== this))
  // OBSOLETE - NO LONGER DE-REGISTERING ON CLOSE BECAUSE WSW CAN TRY TO RECONNECT   this.log(`WSWB.onCloseCallback`, `   calling WSWG.onCloseCallback`)
  // OBSOLETE - NO LONGER DE-REGISTERING ON CLOSE BECAUSE WSW CAN TRY TO RECONNECT   super.onCloseCallback(code, reason)
  // OBSOLETE - NO LONGER DE-REGISTERING ON CLOSE BECAUSE WSW CAN TRY TO RECONNECT }
  
}

