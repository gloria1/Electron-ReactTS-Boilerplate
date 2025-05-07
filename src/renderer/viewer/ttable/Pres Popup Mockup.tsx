import * as React from 'react';
import { useState } from 'react';

// import blueprint components
import { Button, Icon } from '@blueprintjs/core';

import { action, comparer, computed, makeObservable, observable, override, reaction, runInAction, toJS } from "mobx"
import { observer } from 'mobx-react'

import '../vwr-App.css';

import { DnDApp, SizeProps } from '../common/commonApp';
import { WebSocketWrapperBrowser2 } from '../common/WebSocketWrapperBrowser';
import { TTablePH2, phActionButtons } from './TTablePH2';
import { PH2, PHG2, PHI2Res, phHideTypeKeysAndLabels } from './table items PH2';
import { ConfigItemRaw } from '../common/configTypesTypes';
import { SortDirs } from './TTable base Obj';



const cl = console.log;


const localStorageIdPrefixPopup = 'popup_'

export interface PopupStateVarsToStore {
  liveOrReplay: 'live' | 'replay'   // whether we will do live or replay ph log on startup
  // no longer using this - host will be DnDApp's server.host property  host: string
  hideFilterState: {[index: string]: boolean}
  showFilterState: {[index: string]: boolean}
  // other settings variables will go here

}

export class PopupState extends DnDApp {

  phTable: TTablePH2
  liveOrReplay: 'live' | 'replay'

  constructor(initialState: PopupStateVarsToStore) {

    super(localStorageIdPrefixPopup)

    var phtTemp: TTablePH2 | undefined = undefined
    runInAction(()=>{phtTemp = new TTablePH2({
      parentDnDApp: this,
      relatedTTableConfig: undefined,
      // OBSOLETE parentServiceOpHandler: this.handleServiceOpReturnsPromise,
      tableName: 'phlogtable',
      columnVisibleLevel: 1,
      showUnsavedChanges: false,
      onLogStreamSocketOpenCallback: ()=>{ 
        cl(`POPUP log stream socket on open callback called`)
        this.updatePHLog(this.liveOrReplay) 
      }
    })})
    this.phTable = phtTemp as unknown as TTablePH2

  // SET STATE VARIABLES FROM INITIALSTATE HERE
    this.liveOrReplay = (initState.liveOrReplay === undefined) ? 'replay' : initState.liveOrReplay
    if (initialState.hideFilterState) {
      for (let p in initialState.hideFilterState) {
        this.phTable.hideFilters[p].active = initialState.hideFilterState[p]
        if (this.phTable.hideFilters[p].active) this.phTable.hideTests.addGroup(this.phTable.hideFilters[p].testAndGroup, 0)
      }
    }
    if (initialState.showFilterState) {
      for (let p in initialState.showFilterState) {
        this.phTable.showFilters[p].active = initialState.showFilterState[p]
        if (this.phTable.showFilters[p].active) this.phTable.hideTests.addGroup(this.phTable.showFilters[p].testAndGroup, 0)
      }
    }


    // store state (in case initialState was populated with defaults because it did not exist in storage)
    this.storeStateVars()


    // force sort order to descending order of tiInfo (seqNo)
    runInAction(()=> {
      for (let c of this.phTable.cols) {
        if (c.prop === 'tiInfo') {
          c.sortLevel = 1
          c.sortDir = SortDirs.desc
        }
        else {
          c.sortLevel = 0
          c.sortDir = SortDirs.none
        }
      }
    })

    makeObservable(this, {
      liveOrReplay: observable,
      // NOT SURE THIS IS NECESSARY, DON'T REMMEBER WHY I PUT IT IN  phTable: observable,
      phTableFilterActives: computed({keepAlive: true}),
    })

    reaction(
      ()=>this.phTableFilterActives,
      ()=>{this.storeStateVars()}
    )
    reaction(
      ()=>this.liveOrReplay,
      ()=>{this.storeStateVars()}
    )


  }

  updatePHLog(mode: 'live' | 'replay') {
    this.phTable.clearTableContents()
    this.phTable.stream = false
    this.phTable.pastLinesToGet = 250
    switch (mode) {
      case 'live':
        this.phTable.getLogLinesStart('live')
        break
      case 'replay':
        this.phTable.getLogLinesStart('replay', -250)
        break
    }
  }

  get phTableFilterActives(): {
    hfactives: {[index: string]: boolean},
    sfactives: {[index: string]: boolean},
  } {
    const result: {
      hfactives: {[index: string]: boolean},
      sfactives: {[index: string]: boolean},
    } = { hfactives: {}, sfactives: {}}
    for (let p in this.phTable.hideFilters) result.hfactives[p] = this.phTable.hideFilters[p].active
    for (let p in this.phTable.showFilters) result.sfactives[p] = this.phTable.showFilters[p].active

    return result
  }
  storeStateVars() {
    const actives = this.phTableFilterActives
    const toStore: PopupStateVarsToStore = {
      liveOrReplay: this.liveOrReplay,
      hideFilterState: actives.hfactives,
      showFilterState: actives.sfactives,
    }
    localStorage.setItem(this.localStorageIdPrefix+'popup.state', JSON.stringify(toStore))
  }

  serverHostUpdate(newserverHost: string) {
    super.serverHostUpdate(newserverHost)
    this.storeStateVars()
  }

}


const initStateString = localStorage.getItem(localStorageIdPrefixPopup+'popup.state')
cl(`initState loaded from localStorage:`)
cl(initStateString)
const initState = 
  (initStateString === null) 
  ? { }
  : JSON.parse(initStateString)
  
cl(`initState being passed to PopupState constructor:`)
cl(initState)  
export const pState = new PopupState(initState)



export interface PopupMockupViewProps {
  state: PopupState
  size: SizeProps
  popupOuterDivStyleProps: object // injected as prop, so we can have different values for viewer (for testing) vs. extension popup
}


export const PopupMockupView = observer((props: PopupMockupViewProps) => {

  const { state } = props

  const [ contentPanel, updateContentPanel ] = useState<'phg' | 'rules' | 'settings'>('phg')

  //cl(`PopupMockupView render called - last server state time: ${state.server.lastServerStateReceived.serverTime.toString()}`)

  return (

      <div 
        style={ { 
          display: 'flex', flexDirection: 'column',
          ...props.popupOuterDivStyleProps
        } }
      >
        <div
          key='top'
          style={ { flex: '0', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'fill', width: '100%', borderBottom: 'solid' } }
        >
            <div
              key='phg'
              style={ { flex: 'auto', borderRight: 'solid', borderWidth: '2px', textAlign: 'center', alignContent: 'center', height: '30px', color: (contentPanel==='phg' ? 'white':'black'), backgroundColor: (contentPanel==='phg' ? 'blue':'white') } }
              onClick={()=>updateContentPanel('phg')}
            >
              Log
            </div>
            <div
              key='rules'
              style={ { flex: 'auto', textAlign: 'center', alignContent: 'center', height: '30px', color: (contentPanel==='rules' ? 'white':'black'), backgroundColor: (contentPanel==='rules' ? 'blue':'white') } }
              onClick={()=>updateContentPanel('rules')}
            >
              {`Temp Rules (${state.server.lastServerStateReceived.ifSTemp.children.length})`}
            </div>
            <div
              key='settings'
              style={ { flex: 'auto', borderLeft: 'solid', borderWidth: '2px', textAlign: 'center', alignContent: 'center', height: '30px', color: (contentPanel==='settings' ? 'white':'black'), backgroundColor: (contentPanel==='settings' ? 'blue':'white') } }
              onClick={()=>updateContentPanel('settings')}
            >
              <span>Settings</span>
            </div>
        </div>
        <div
          key='socketinfo'
          style={ { flex: '0', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'fill', width: '100%', borderBottom: 'solid' } }
        >
            <div
              key='phg'
              style={ { flex: 'auto', textAlign: 'center', justifyItems: 'space-around', alignContent: 'center', height: '30px', color: 'white', backgroundColor: (state.serverStateSocket?.readyState === 1) ? 'blue' : 'red' } }
            >
              {`state socket ${state.serverStateSocket?.id.slice(0,4)} - readyState ${state.serverStateSocket?.readyState}`}
              <Button
                key='shortcut'
                onClick={()=>{
                  //const hdrs: Headers = new Headers()
                  //hdrs.append('Access-Control-Allow-Origin', '*')
                  //
                  //const reqInit: RequestInit = {
                  //  headers: hdrs,
                  //  mode: 'no-cors',
                  //}
                  //const req: Request = new Request('https://motherfuckingwebsite.com/', reqInit)

                  const req = new Request('shortcuts://run-shortcut?name=ToggleAirplaneMode')

                  fetch(req).then(response => {
                    cl('got response to fetch')
                  })
                }}
              >
                SC
              </Button>
              {
                (state.phTable.logStreamSocket?.commandOrOpInProgress === undefined)
                ?
                  <Button
                    key='reload'
                    onClick={()=>{
                      state.phTable.clearTableContents()
                      runInAction(()=>{ 
                        state.phTable.stream = true
                        state.phTable.pastLinesToGet = 0
                        state.phTable.ignoreItemsPriorToLastRestart = true
                      })
                      // want to not do the reload until we know the logstream has started
                      state.phTable.logStreamSocket.parentCommandStreamReadyCallback = ()=> {
                        cl(`POPUP log stream ready callback called, about to reload tab`)

                        // chrome.tabs object does not exist outside of extension context
                        if (chrome.tabs) chrome.tabs.reload({bypassCache: true})
                      }
                      state.phTable.getLogLinesStart('live', 0)

                    }}
                  >
                    Reload
                  </Button>
                :
                  <Button
                    key='cancelreload'
                    onClick={()=>state.phTable.cancelGetLogLines()}
                  >
                    Cancel Log Stream
                  </Button>
              }
            </div>
        </div>
        {(contentPanel === 'phg')
            ? <div
                key='hidefilters'
                style={ { flex: '0', display: 'flex', flexDirection: 'row', alignItems: 'stretch', justifyContent: 'fill', width: '100%', borderBottom: 'solid' } }
              >
                  <div
                    key='phg'
                    style={ { flex: 'auto', textAlign: 'center', justifyContent: 'space-between', height: '30px' } }
                  >
                    {phHideTypeKeysAndLabels.map(ht => 
                      <Button
                        //style={ { width: '70px' } }
                        key={ht[0]}
                        text={ht[1]}
                        onClick={()=>{
                          runInAction(()=>{
                            const hf = state.phTable.hideFilters[ht[0]]
                            // if this filter already exists, do nothing
                            if (hf.active) {
                              state.phTable.hideTests.deleteAndGroup(hf.testAndGroup)
                              hf.active = false
                            }
                            else {
                              state.phTable.hideTests.addGroup(hf.testAndGroup, 0)
                              hf.active = true
                            }
                          })
                        }}
                        intent={(state.phTable.hideFilters[ht[0]].active) ? 'primary' : 'none'}
                      />
                    )}
                  </div>
              </div>
            : <div/>        
        }
        <div
          key='content'
          style={ { flex: 'auto', width: '100%', overflowY: 'auto', overflowWrap: 'anywhere' } } //, height: '100%', width: '100%' } } // ,  overflowY: 'auto' }}
        >
          {
            (contentPanel === 'phg') ? <PopupPHGPanel state={state}/>
              : ((contentPanel === 'rules') ? <PopupRulesPanel state={state}/>
                  : <PopupSettingsPanel state={state}/>
                )
          }
        </div>
      </div>
  )

})

const PopupPHGPanel = observer((props: { state: PopupState }) => {

  const { state } = props

  return (
    <div
    >
      {state.phTable.visibleSortedExpandedMap.map((ph, i) => <PopupPHGItem key={i} state={state} ph={ph as PH2}/>)}
      <div
      style = { { width: '100%', borderTop: 'solid', borderWidth: '1px',
        display: 'flex', flexDirection: 'row'
      } }
      ></div>

    </div>
  )
})

const PopupPHGItem = observer((props: { state: PopupState, ph: PH2}) => {

  const { state, ph } = props

  const phgButtonsDomain = phActionButtons(ph, ph.domain, state.server.lastServerStateReceived.ifSTemp.children, 'A', 'D', 'large')

  const patternArray: string[] = []
  var pattern: string = ''
  for (let dp of ph.domainParts) {
    pattern = '.'+dp + pattern
    patternArray.unshift(pattern)
  }
  patternArray.shift()  // remove ph.domain with leading dot
  const phgButtonsParents = patternArray.map(p => phActionButtons(ph, p, state.server.lastServerStateReceived.ifSTemp.children, 'A', 'D', 'large'))

  return (
    <div>
      <div key={`phg ${ph.seqNo}`} style = { { display: 'flex', flexDirection: 'row', alignItems: 'stretch', alignContent: 'stretch', justifyItems: 'stretch', justifyContent: 'stretch',
          width: '100%', borderTop: 'solid', borderWidth: '1px', paddingRight: '5px',
        } }
      >
        <div key='caret' style={ { flex: '0', display: 'flex' } } onClick={()=>{runInAction(()=>{ph.expanded = !ph.expanded})}}>
          <div key='caretdiv' style={ { width: '30px', display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center' } }>
            <span>{ph.expanded ? 'V' : '>'}</span>
          </div>
        </div>

        <div key='phg1' style={ { flex: '1 1 auto', display: 'flex', flexDirection: 'column' } }>
          <div key='phgdombut' style={ { display: 'flex', flexDirection: 'column' } }>
            <div key='phgbutton+domain' style={ { display: 'flex', flexDirection: 'row', alignItems: 'center', minHeight: '30px' } }>
              <div style={ { flex: 'none', display: 'flex', flexDirection: 'row' } }>
                {phgButtonsDomain.allowButton}
                {phgButtonsDomain.denyButton}
              </div>
              <div style={ { flex: 'auto', display: 'flex', flexDirection: 'column', justifyContent: 'end' } }>
                <div style={ { alignContent: 'end', whiteSpace: 'pre-wrap', textAlign: 'right', color: (ph.phOutcome === 'allowed') ? 'green' : 'red' } }>
                  {ph.domain}
                </div>
                <div style={ { alignContent: 'end', whiteSpace: 'pre-wrap', textAlign: 'right' } }>
                  {`${ph.phOutcomeType}${(ph.allowedResType === undefined) ? '' : ' - '+ph.allowedResType}`}
                </div>
              </div>
            </div>
            {((ph.group === 'no') || (ph.expanded === false))
              ?
                <div style={ { alignContent: 'end', whiteSpace: 'pre-wrap', textAlign: 'left', color: 'red' } }>
                  {ph.phOutcomeException}
                </div>
              :
                patternArray.map((p, i)=>
                  <div key={`phgbutton+domain${i}`} style={ { display: 'flex', flexDirection: 'row', alignItems: 'center', minHeight: '30px' } }>
                    <div style={ { flex: 'none', display: 'flex', flexDirection: 'row' } }>
                      {phgButtonsParents[i].allowButton}
                      {phgButtonsParents[i].denyButton}
                    </div>
                    <div style={ { flex: 'auto', display: 'flex', justifyContent: 'end', textAlign: 'right' } }>
                      {p}
                    </div>
                  </div>
                )
            }
          </div>
          {((ph.group === 'no') || (ph.expanded === false)) ? <div/> : 
            <div key='phis' style={ { display: 'flex', flexDirection: 'column' } }>
              {(ph.children as PHI2Res[]).map((c,i)=>
                <div key={`phi${i}`} style={ { display: 'flex', flexDirection: 'column', justifyItems: 'fill', alignItems: 'fill', borderTop: 'dashed', borderWidth: '1px' } }>
                  <div style={ { alignContent: 'end', whiteSpace: 'pre-wrap', textAlign: 'left', color: 'blue' } }>
                    {c.domain}
                  </div>
                  {(c.ifDecision === undefined) ? <div>NO DECISION</div> :
                    <div style={ { flex: 'auto', display: 'flex', flexDirection: 'row', justifyContent: 'space-between' } }>
                      <div style={ { whiteSpace: 'nowrap', paddingRight: '4px'} }>{`${c.ifDecisionResult} ${c.ifDecisionMostSpecificMatchType}`}</div>
                      <div style={ { whiteSpace: 'pre-line' } }>{c.ifDecision.rulesThatApplied.map(r => r.rule.domainRegexPattern).join('\n')}</div>
                    </div>
                  }
                  <div style={ { alignContent: 'end', whiteSpace: 'pre-wrap', textAlign: 'left', color: 'red' } }>
                    {c.phOutcomeException}
                  </div>
                </div>
              )}
              {(ph.ipset === undefined) ? <div/> :
                <div style={ { alignContent: 'end', whiteSpace: 'pre-wrap', textAlign: 'left', borderTop: 'dashed', borderWidth: '1px' } }>
                  {ph.ipset}
                </div>
              }
              {(ph.unresolvedResult === undefined) ? <div/> :
                <div style={ { alignContent: 'end', whiteSpace: 'pre-wrap', textAlign: 'left', borderTop: 'dashed', borderWidth: '1px' } }>
                  {ph.unresolvedResult}
                </div>
              }

            </div>
          }
        </div>

      </div>
    </div>
  )



})



const PopupRulesPanel = observer((props: { state: PopupState }) => {

  const { state } = props
  
  return (
    <div
    >
      {`${state.server.lastServerStateReceived.ifSTemp.children.length.toString()} temp rules`}
      {state.server.lastServerStateReceived.ifSTemp.children.map((r, i)=> <PopupRuleItem key={i} state={state} rule={r}/>)}
      <div
      style = { { width: '100%', borderTop: 'solid', borderWidth: '1px',
        display: 'flex', flexDirection: 'row'
      } }
      ></div>

    </div>
  )
})


const PopupRuleItem = observer((props: { state: PopupState, rule: ConfigItemRaw}) => {

  const { state, rule } = props

  return (
    <div
    style = { { width: '100%', borderTop: 'solid', borderWidth: '1px',
      display: 'flex', flexDirection: 'row'
    } }
  >
    <div
      key='button1'
      style = { { minHeight: '30px', width: '30px', flex: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center' } }
    >
      <Icon icon='chevron-right'/>
    </div>
    <div
      key='buttons'
      style={ { flex: 'none', minWidth: '200px', display: 'flex', flexDirection: 'row', justifyContent: 'space-around' } }
   >
      <Button
        key='allow'
        style={{fontSize: 'small', minHeight: 12 }}
        intent={'primary'}
        text={'Remove'}
        onClick={()=>{
          state.phTable.removeTempItems([rule._id])
        }}
      />
      <Button
        key='makenontemp'
        style={{fontSize: 'small', minHeight: 12 }}
        intent={'primary'}
        text={'-> NonTemp'}
        onClick={()=>{
          state.phTable.tempToNonTemp([rule._id])
        }}
      />

    </div>
    <div
      key='content'
      style = { { flex: 'auto' } }
    >
      {rule.requestAction}
      <br/>
      {rule.hostDomainPatterns}
    </div>

  </div>

  )

})




const PopupSettingsPanel = observer((props: { state: PopupState }) => {

  const { state } = props

  return (
    <div
    >
      {state.server.host}
      <br/>
      {(new Date(Number.parseInt(state.server.lastServerStateReceived.serverTime))).toISOString()}
      <br/>
      {state.serverAvailable.toString()}
      <br/>
      Server Hostname or IP:<br/>
      <input
        style={{color: state.serverAvailable ? 'black' : 'red'}}
        id='serverHost'
        type='text'
        //size={50}
        placeholder='ip or hostname'
        value={state.server.host}
        onChange={(ev: React.ChangeEvent<HTMLInputElement>)=>{
          state.serverHostUpdate(ev.target.value)
        }}
      />
      <Button
        disabled={state.serverAvailable}
        onClick={()=>{
          // NOT NECESSARY - DNDAPP TRIES RECONNECT AUTOMATICALLY   state.attemptServerStateSocketConnect()
          state.updatePHLog(state.liveOrReplay)
        }}
      >
        Update PH Log
      </Button>
      <br/>
      <br/>
      <Button
        key={'setlive'}
        intent={(state.liveOrReplay === 'live') ? 'primary' : 'none' }
        onClick={()=>runInAction(()=>{ state.liveOrReplay = 'live' })}
      >
        Live
      </Button>
      <Button
        key={'setreplay'}
        intent={(state.liveOrReplay === 'replay') ? 'primary' : 'none' }
        onClick={()=>runInAction(()=>{ state.liveOrReplay = 'replay' })}
      >
        Replay
      </Button>
    </div>
  )
})