// replaced following per https://levelup.gitconnected.com/typescript-and-react-using-create-react-app-a-step-by-step-guide-to-setting-up-your-first-app-6deda70843a4
//import React, { Component } from 'react';
import * as React from 'react';
import { useState } from 'react';

import { v4 as uuidv4 } from 'uuid'
import md5 from 'md5'

// import blueprint components
import { Button, ButtonGroup, ControlGroup, HTMLSelect, Label } from '@blueprintjs/core';
import { Classes, Popover2, Popover2InteractionKind, Tooltip2 } from '@blueprintjs/popover2'
import '@blueprintjs/popover2/lib/css/blueprint-popover2.css'

// enable focus management (glowy blue outlines for focused elements)
import { FocusStyleManager } from '@blueprintjs/core';

import { observable, computed, action, reaction, runInAction, makeObservable, toJS, isObservable, isObservableProp } from 'mobx'
import { Observer, observer } from 'mobx-react'


import './vwr-App.css';

import { ICRIFromMongo, ServerStateRaw, ServerClientInfo, HasIfsConfigState, WSWMsg, WSWMsgCommandToIssueLocal, WSWMsgData, WSWMsgError, WSWMsgCommandTermination, WSWCloseEventCodeMap } from './common/commonAll'
import { DnDApp, SizeProps, SizePropsPx, makeDivSizeStyle } from './common/commonApp'
import { TTPres } from './ttable/Pres TTPres'
import { TTableConfig } from './ttable/TTableConfig';
import { TTPresConfig } from './ttable/Pres TTPresConfig';
import { ActionButton, ActionPlain, ActionPlainOrGroup, ActionPlainOrGroupOrSpacer, ActionSpacer } from './ttable/Pres Action';
import { ConfigItemRaw, ActionAllowDenyNA, tools, DecisionTypeBrowserWebRequest, makeNewConfigItemRaw } from './common/configTypesTypes';
import { CR, CRI } from './ttable/table items CR';
import { SplitterLayout } from './react-splitter-layout/SplitterLayout';
import { TTableRule } from './ttable/TTableRule';
import { ContentView, ContentViewProps, makeContentViewPropsFromTIProp } from './ttable/Pres ContentView';
import { TTableCR } from './ttable/TTableCR';
import { TTPresCR } from './ttable/Pres TTPresCR';
import { TI } from './ttable/table items base';
import { ColData } from './ttable/TTable base Obj';
import { ViewerPane, ViewerPaneProps, ViewerPaneWithSplitter } from './ttable/Pres ViewerPane';
import { WebSocketWrapperBrowser2 } from './common/WebSocketWrapperBrowser';
import { TTableLV2 } from './ttable/TTableLV2';
import { TTablePH2, mapPMPH2 } from './ttable/TTablePH2';
import { PHI2Res, phHideTypeKeysAndLabels, phShowTypeKeysAndLabels } from './ttable/table items PH2';
import { Test, TestAndGroup, TestOrGroup } from './ttable/test';
import { PopupMockupView, pState } from './ttable/Pres Popup Mockup';
// STUBBING OUT FOR TESTING, TO REDUCE NOISE IN LOG import { PopupMockupView, pState } from './ttable/Pres Popup Mockup';


var _ = require('lodash')

// shorthand reference for console.log function
const cl = console.log
const ct = console.table

/*
  PATTERN FOR USE OF observe TO TRACK CHANGES TO ARRAY
*/
/*
interface Child {
  [index: string]: any
  p1: string
  p2: string
}
class Group {
  children: Child[]
  childrenChangeObserver: Lambda   // to store disposer

  constructor() {
    this.children = []
    
    makeObservable(this, {
      children: observable.shallow,
    })

    // observe changes to value of children itself (i.e., if a whole new array is assigned to this.children)
    observe(this, 'children', change => {
      // dispose of prior childrenChangeObserver - in case the prior value of 
      // children is not garbage-disposed because it is still alive somewhere else
      // in the application
      this.childrenChangeObserver()
      // establish observer on new array in this.children
      this.childrenChangeObserver = observe(change.newValue as Child[], change => {
        ct(toJS(this.children)); //cl(change); return
      })
      ct(toJS(this.children)); //cl(change); return
    })
    // observe changes within this.children
    // store the disposer so it can be disposed when this.children is replaced
    this.childrenChangeObserver = observe(this.children, change => {
      ct(toJS(this.children)); //cl(change); return
    })
   
  }
}


const g = new Group()

g.children.push({p1: 'a', p2: 'a'})
g.children.push({p1: 'b', p2: 'b'})
g.children.push({p1: 'c', p2: 'c'})
g.children.pop()
g.children.unshift({ p1: '0', p2: '0'})
g.children.shift()
g.children.slice(0, 1)
g.children.splice(0, 1)
g.children.splice(0, 0, { p1: 'd', p2: 'd'})
g.children.splice(0, 1, { p1: 'e', p2: 'e'})
g.children.sort()
g.children = [ { p1: 'g', p2: 'g'} ]
g.children[0] = { p1: 'h', p2: 'h' }
g.children[1] = { p1:'i', p2: 'i'}

*/

// only show focus highlight when tabbing
FocusStyleManager.onlyShowFocusOnTabs();
// always show focus
// FocusStyleManager.alwaysShowFocus();




export interface WSWControlViewProps {
  size: SizePropsPx
  ws: WebSocketWrapperBrowser2
}

export const WSWControlView = observer((props: WSWControlViewProps) => {
  const { size, ws } = props
  
  const [ command, commandUpdater ] = useState(`tail -f /var/log/pihole/pihole.log`)


  return (
    <ViewerPaneWithSplitter 
      size = {size} 
      primaryMinSizePx={100}
      secondaryMinSizePx={210}
      secondaryInitialSizeFraction={0.75}
      content={(size: SizePropsPx) => 
        <ControlGroup vertical={true}>
          <Button id='clearlog' text='clear log' intent='primary' onClick={()=>{runInAction(()=>{ 
            ws.messageLog.splice(0, ws.messageLog.length)
          }) } } />
          <Button id='connect' text='connect' active={ws.rawWS===undefined} intent={(ws.rawWS===undefined) ? 'primary' : 'none'} onClick={()=>{runInAction(()=>{ 
            ws.wswConnect()
          }) } } />
          <Button id='closenormal' text='close normal' active={ws.rawWS!==undefined} intent={(ws.rawWS!==undefined) ? 'primary' : 'none'} onClick={()=>{runInAction(()=>{ 
            ws.wswClose(4000, 'user closed conn')
          }) } } />
          <Button id='closeerror' text='close error' active={ws.rawWS!==undefined} intent={(ws.rawWS!==undefined) ? 'primary' : 'none'} onClick={()=>{runInAction(()=>{ 
            ws.wswClose(4001, 'user closed due to error')
          }) } } />
          <Button id='destroy' text='destroy raw WebSocket object' active={ws.rawWS!==undefined} intent={(ws.rawWS!==undefined) ? 'primary' : 'none'} onClick={()=>{runInAction(()=>{ 
            ws.rawWS = undefined
          }) } } />
          <Button id='send' text='send' active={ws.rawWS!==undefined} intent={(ws.rawWS!==undefined) ? 'primary' : 'none'} onClick={()=>{runInAction(async ()=>{ 
            const msgResult = ws.wswSendMessage({ msgType: 'data', commandResult: false, body: 'message from viewer', trail: [ 'user clicked Send in gui' ] })
            if (msgResult.unableToSendReason === undefined) runInAction(()=>ws.log(`WSWControlView`, 'message sent'))
              else runInAction(()=>ws.log(`WSWControlView`, 'SEND FAILED: '+msgResult.unableToSendReason))
            }) } } />
          <input
            id='commandinput'
            value={command}
            onChange={(ev)=>runInAction(()=>commandUpdater(ev.target.value))}
          />
          {`commandInProgress?: ${(ws.commandOrOpInProgress === undefined) ? 'NO' : 'YES'}`}
          <Button id='command' text='issue command' active={ws.commandOrOpInProgress === undefined} intent={(ws.commandOrOpInProgress === undefined) ? 'primary' : 'none'} onClick={()=>{runInAction(async ()=>{ 
            const msgObj: WSWMsgCommandToIssueLocal = {
              msgType: 'commandtoissuelocal',
              processLines: 'pihole getDecision',
              command: 'ssh',
              args: [
                '-p',
                '9922',
                'root@lblack2',
                command,
              ],
              trail: [ 'browser gui' ]
            }
            const msgResult = ws.wswSendMessage(msgObj)
            if (msgResult.unableToSendReason === undefined) runInAction(()=>ws.log(`WSWControlView`, 'message sent'))
            else runInAction(()=>ws.log(`WSWControlView`, 'SEND FAILED: '+msgResult.unableToSendReason))
          }) } } />
          <Button id='cancelcommand' text='cancel command' active={ws.commandOrOpInProgress !== undefined} intent={(ws.commandOrOpInProgress !== undefined) ? 'primary' : 'none'} onClick={()=>{runInAction(async ()=>{ 
            const msgResult = ws.wswSendMessage({ msgType: 'commandcancel', trail: [ 'user cancelled command'] })
            if (msgResult.unableToSendReason === undefined) runInAction(()=>ws.log(`WSWControlView`, 'message sent'))
            else runInAction(()=>ws.log(`WSWControlView`, 'SEND FAILED: '+msgResult.unableToSendReason))
          }) } } />
        </ControlGroup>
        
      }
      content2={(size: SizePropsPx) => 
        <div style={ { overflow: 'auto', display: 'flex', flexDirection: 'column-reverse', fontFamily: 'monospace', fontSize: '12px' } }>
          {ws.messageLog.map((m,i) => <div key={i}>{m}</div>)}
        </div>
      }
    />
  )
})



type PaneContentNames = 'config' | 'phlog' | 'cr' | 'detail' | 'none' | 'test'

const localStorageIdPrefixApp = 'viewerapp_'

export class App extends DnDApp {
  [index: string]: any
  // OBSOLETE // sets interval timer to call checkServerStatus - this timer ID will be used to turn it off when App is not focused window (see window.onfocus and window.onblur events belos)
  // OBSOLETE serverStatusIntervalID: NodeJS.Timeout | undefined = undefined

  statusBoxOpen: boolean = false
  statusBoxMessage: JSX.Element = <div></div>

  configTable: TTableConfig
  phLogTable: TTablePH2
  crTable: TTableCR
  ruleTable: TTableRule | undefined = undefined
  ruleTableVisible: boolean = false  // whether to show rule table instead of CR table

  // layout-related props
  // key constants - we declare these here just to keep them local to where they are used
  appControlsHtPx: number = 30    // fixed height we will use for AppControls
  splitterBarSizePx: number = 15 // amount we will deduct in calculation of top+bottom area heights, to provide for splitter view bar
  paneSizeCorrectionForWindowZoom: number = 1 // see notes below in updatePaneDivs()
  minPaneDimPx: number = 50

  verticalStack: boolean = false   // if false, panes will be left/right rather than top/bottom
  pane2pxFromSplitterView: number  // secondary pane size reported by SplitterView
                   // will be set in constructor, and then by handlers for window resize, splitter pane resize and vertical stack change
  get pane2pct(): number {   // this value will be stored/retrieved from browser storage
    return this.verticalStack
      ? this.pane2Size.height.value / (this.paneAreaTotalHeight - this.splitterBarSizePx)
      : this.pane2Size.width.value / this.windowInnerWidth
  }

  get paneAreaTotalHeight(): number { return this.windowInnerHeight - this.appControlsHtPx }
  // total height/width of the two panes, excluding the splitter bars
  get splitterViewTotalPanePx(): number { 
    if (this.verticalStack) return (this.windowInnerHeight - this.appControlsHtPx - this.splitterBarSizePx ) 
    else return ( this.windowInnerWidth - this.splitterBarSizePx )
  }

  // pane dims update immediately on window resize, splitter bar movement
  // div dims will equal pane dims, but updates are throttled to avoid re-rendering div content on every twitch
  pane1Size: SizePropsPx = {
    height: { unit: 'px', constraint: 'fixed', value: this.minPaneDimPx },
    width: { unit: 'px', constraint: 'fixed', value: this.minPaneDimPx },
  }
  pane2Size: SizePropsPx = {
    height: { unit: 'px', constraint: 'fixed', value: this.minPaneDimPx },
    width: { unit: 'px', constraint: 'fixed', value: this.minPaneDimPx },
  }


  div1Size: SizePropsPx = {
    height: { unit: 'px', constraint: 'fixed', value: 10 },
    width: { unit: 'px', constraint: 'fixed', value: 10 },
  }
  div2Size: SizePropsPx = {
    height: { unit: 'px', constraint: 'fixed', value: 10 },
    width: { unit: 'px', constraint: 'fixed', value: 10 },
  }

  pane1ContentName: PaneContentNames = 'config'
  pane2ContentName: PaneContentNames = 'detail'
  
  detailPaneContentViewProps: ContentViewProps | undefined = undefined

  ws1: WebSocketWrapperBrowser2 = new WebSocketWrapperBrowser2(
    { 
      willTryToReconnect: false,
      protocol: 'command', 
      socketInfo: 'app.ws1',
      parentOpenCallback: ()=>{}, //cl(`WSWControlView`, 'parentOpenCallback called'),
      parentDataReceivedCallback: (dataReceived: WSWMsgData) => runInAction(()=>{
        //cl(`WSWControlView`, `commandResult callback called - ${dataReceived.commandResult ? 'COMMAND RESULT' : 'OTHER DATA'}:`)
        const logLines: string[] = dataReceived.body.split('\n')
        logLines.map(l => {}) // cl(`WSWControlView`, l))
      }),
      parentErrorCallback: (error: WSWMsgError) => {
        //cl(`WSWControlView`, `parentErrorCallback received: ${error.code} ${error.message}`)
      },
      parentCloseCallback: (code: number, reason: string) => {
        //cl(`WSWControlView`, `parentCloseCallback received: ${code} ${WSWCloseEventCodeMap[code].description} - ${reason}}`)
      },
      parentCommandResultTerminationCallback: (termMsg: WSWMsgCommandTermination)=>{
        //cl(`WSWControlView`, `parentCommandResultTermination: returnCode: ${termMsg.returnCode} - reason: ${termMsg.reason} - wasClean: ${termMsg.wasClean}`)
      }

    }, 
    this
  )
  wsLog: string = ''


  switchPaneContent(pane1or2: '1' | '2', newContentName: PaneContentNames) {
    // check if new content name is currently in other pane
    // if so, swap them
    // else just assign new content name to pane

    var newPane1ContentName: PaneContentNames = (pane1or2 === '1') ? newContentName : this.pane1ContentName
    var newPane2ContentName: PaneContentNames = (pane1or2 === '2') ? newContentName : this.pane2ContentName

    if (newPane1ContentName === newPane2ContentName) {
      if (pane1or2 === '1') newPane2ContentName = this.pane1ContentName
      else newPane1ContentName = this.pane2ContentName
    }
    this.pane1ContentName = newPane1ContentName
    this.pane2ContentName = newPane2ContentName
    this.storePaneState()
  }

  putCellContentInDetailPane(sourcePaneContentName: PaneContentNames, ti: TI, col: ColData, rowIndex: number) {

    const sourcePane: '1' | '2' = (this.pane1ContentName === sourcePaneContentName) ? '1' : '2'
    const paneToUseForDetail: '1' | '2' = (sourcePane === '1') ? '2' : '1'
    switch (paneToUseForDetail) {
      case '1': if (this.pane1ContentName !== 'detail') this.switchPaneContent(paneToUseForDetail, 'detail'); break
      case '2': if (this.pane2ContentName !== 'detail') this.switchPaneContent(paneToUseForDetail, 'detail'); break
    }

    //const sizeToUse = (paneToUseForDetail === '1') ? this.pane1Size : this.pane2Size
    var titleText = ''
    switch (sourcePaneContentName) {
      case 'config': titleText += 'Config'; break
      case 'cr': titleText += 'CR'; break
      case 'phlog': titleText += 'PHLog'; break
      default: titleText += '??????'; break
    }
    titleText += ` (row ${rowIndex + 1}) - ${col.prop}`
    if (sourcePaneContentName === 'cr') {
      const cr = ti as CR
      switch(cr.kind) {
        case 'urlG':
        case 'harI':
        case 'webReqG':
        case 'webReqI':
        case 'dNRMatchI':
          titleText += ' - URL: ' + cr.url
          break
        default:
          break
      }
    }

    const result = makeContentViewPropsFromTIProp(
      ti,
      col.prop,
      [],  // add actions for detail pane view
      this.pane1Size,  // THIS IS JUST A PLACEHOLDER - WILL BE REPLACED IN getPaneContent BELOW
      col.initialCVMode,
    )
    result.titleText = titleText
    this.detailPaneContentViewProps = result


  }


  getPaneContent(pane1or2: '1' | '2'): (size: SizePropsPx) => JSX.Element { 

    const contentName = (pane1or2 === '1') ? this.pane1ContentName : this.pane2ContentName

    ////cl(`paneContent called ${pane1or2} - ${contentName}`)

    if (contentName === 'config') {
      return (
        (size: SizePropsPx) => 
        <TTPresConfig
          t={this.configTable}
          size={size}
          ttControlsActions={ [] }
          tableActions={ [] } 
          cellCVActions={ [] } 
          ttControlsAddedJSX={[]}
          cellDoubleClickAction={{
            id: 'dummy',
            handler: (ti: TI, col: ColData, rowIndex: number)=>{this.putCellContentInDetailPane('config', ti, col, rowIndex) }
          }}
        />  
      )
    }

    else if (contentName === 'phlog') {
      const replayChoices: {linesArg: number, label: string}[] = [
        { linesArg: 100,  label: 'First 100' },
        { linesArg: 10,   label: 'First 10' },
        { linesArg: 0,    label: 'All' },
        { linesArg: -10,  label: 'Last 10' },
        { linesArg: -100, label: 'Last 100' },
      ]
      const lastNChoices: {linesArg: number}[] = [
        { linesArg: 0,   },
        { linesArg: 10,  },
        { linesArg: 25,  },
        { linesArg: 100, },
      ]
      return (
        (size: SizePropsPx) => 
        <TTPres
          t={this.phLogTable}
          size={size}
          tableActions={[

          ]}
          ttControlsActions={[
            {
              type: 'group',
              label: app.phLogTable.stream ? 'Stream' : 'Onetime',
              children: [
                {
                  type: 'action',
                  id: 'PullPiholeLog',
                  label: 'Stream',
                  handler: ()=>runInAction(()=>app.phLogTable.stream = true),
                  isActive: ()=>true,
                  intent: ()=>'primary',
                  hotkeys: []
                },
                {
                  type: 'action',
                  id: 'PullPiholeLog',
                  label: 'Onetime',
                  handler: ()=>runInAction(()=> app.phLogTable.stream = false),
                  isActive: ()=>true,
                  intent: ()=>'primary',
                  hotkeys: []
                },
        
              ]
            },
            {
              type: 'group',
              label: app.phLogTable.ignoreItemsPriorToLastRestart ? 'Clear On PH Restart' : 'Don\'t Clear on PH Restart',
              children: [
                {
                  type: 'action',
                  id: 'PullPiholeLog',
                  label: 'Clear on PH Restart',
                  handler: ()=>runInAction(()=>app.phLogTable.ignoreItemsPriorToLastRestart = true),
                  isActive: ()=>true,
                  intent: ()=>'primary',
                  hotkeys: []
                },
                {
                  type: 'action',
                  id: 'PullPiholeLog',
                  label: 'Don\'t Clear on PH Restart',
                  handler: ()=>runInAction(()=> app.phLogTable.ignoreItemsPriorToLastRestart = false),
                  isActive: ()=>true,
                  intent: ()=>'primary',
                  hotkeys: []
                },
        
              ]
            },
            {
              type: 'group',
              label: 'Get Incl. Last ' + app.phLogTable.pastLinesToGet,
              children: lastNChoices.map(choice => {
                return {
                  type: 'action',
                  id: 'ClearTTable',
                  label: 'Last ' + choice.linesArg.toString(),
                  handler: ()=>runInAction(()=>app.phLogTable.pastLinesToGet = choice.linesArg),
                  isActive: ()=>true,
                  intent: ()=>'primary',
                  hotkeys: []
                }
              })
            },
            {
              type: 'action',
              id: 'PullPiholeLog',
              label: 'Get',
              handler: ()=>app.phLogTable.getLogLinesStart('live'),
              isActive: ()=>(app.phLogTable.logStreamSocket?.commandOrOpInProgress === undefined),
              intent: ()=>((app.phLogTable.logStreamSocket?.commandOrOpInProgress === undefined) ? 'primary' : 'none'),
              hotkeys: []
            },
            {
              type: 'action',
              id: 'ClearTTable',
              label: 'Stop',
              handler: ()=>app.phLogTable.cancelGetLogLines(),
              isActive: ()=>(app.phLogTable.logStreamSocket?.commandOrOpInProgress !== undefined),
              intent: ()=>((app.phLogTable.logStreamSocket?.commandOrOpInProgress !== undefined) ? 'primary' : 'none'),
              hotkeys: []
            },
            {
              type: 'group',
              label: 'Replay',
              children: replayChoices.map(choice => {
                return {
                  type: 'action',
                  id: 'ClearTTable',
                  label: choice.label,
                  handler: ()=>app.phLogTable.getLogLinesStart('replay', choice.linesArg),
                  isActive: ()=>(app.phLogTable.logStreamSocket?.commandOrOpInProgress === undefined),
                  intent: ()=>((app.phLogTable.logStreamSocket?.commandOrOpInProgress === undefined) ? 'primary' : 'none'),
                  hotkeys: []
                }
              })
            }

          ]}
          cellCVActions={[
          ]}
          cellClickAction={{
            id: 'dummy',
            handler: (ti: TI, col: ColData, rowIndex: number)=>{ 
              if (ti.group === 'yes') runInAction(()=>{ app.phLogTable.extendSelectionToIncludeGroup(ti) })
            }
          }}
          ttControlsAddedJSX={[
            <pre key='pre1'>Hide: </pre>,
            ...(phHideTypeKeysAndLabels.map(ht => 
              <Button
                key={ht[0]}
                text={ht[1]}
                onClick={()=>{
                  runInAction(()=>{
                    const hf = app.phLogTable.hideFilters[ht[0]]
                    // if this filter already exists, do nothing
                    if (hf.active) {
                      app.phLogTable.hideTests.deleteAndGroup(hf.testAndGroup)
                      hf.active = false
                    }
                    else {
                      app.phLogTable.hideTests.addGroup(hf.testAndGroup, 0)
                      hf.active = true
                    }
                  })
                }}
                intent={(app.phLogTable.hideFilters[ht[0]].active) ? 'primary' : 'none'}
              />
            )),
            <pre key='pre2'>Show: </pre>,
            ...(phShowTypeKeysAndLabels.map(st => 
              <Button
                key={st[0]}
                text={st[1]}
                onClick={()=>{
                  runInAction(()=>{
                    const sf = app.phLogTable.showFilters[st[0]]
                    // if this filter already exists, do nothing
                    if (sf.active) {
                      app.phLogTable.showTests.deleteAndGroup(sf.testAndGroup)
                      sf.active = false
                    }
                    else {
                      app.phLogTable.showTests.addGroup(sf.testAndGroup, 0)
                      sf.active = true
                    }
                  })
                }}
                intent={(app.phLogTable.showFilters[st[0]].active) ? 'primary' : 'none'}
              />
            ))
          ]}
        />
      )
    }


    else if (contentName === 'cr') { 
      return (
        (size: SizePropsPx) => 
        <TTPresCR
          t={this.crTable}
          hideHarTestAndGroup={this.crTable.hideHarTestAndGroup}
          hideWebReqTestAndGroup={this.crTable.hideWebReqTestAndGroup}
          hideWebNavTestAndGroup={this.crTable.hideWebNavTestAndGroup}
          size={size}
          ttControlsActions={[]}
          tableActions={ [
            // {
            //   type: 'action',
            //   id: 'AddConfigFromCRsURLCombined',
            //   label: 'New Config - URL - Combined',
            //   handler: () => newConfigsFromCRs('url', true),
            //   isActive: ()=>true,
            //   intent: ()=>'none',
            //   hotkeys: []
            // },
            // {
            //   type: 'action',
            //   id: 'AddConfigFromCRsURLSeparate',
            //   label: 'New Config - URL - Multiple',
            //   handler: () => newConfigsFromCRs('url', false),
            //   isActive: ()=>true,
            //   intent: ()=>'none',
            //   hotkeys: []
            // },
            // {
            //   type: 'action',
            //   id: 'AddConfigFromCRsHostnameCombined',
            //   label: 'New Config - Hostname - Combined',
            //   handler: () => newConfigsFromCRs('hostname', true),
            //   isActive: ()=>true,
            //   intent: ()=>'none',
            //   hotkeys: []
            // },
            // {
            //   type: 'action',
            //   id: 'AddConfigFromCRsHostnameSeparate',
            //   label: 'New Config - Hostname - Multiple',
            //   handler: () => newConfigsFromCRs('hostname', false),
            //   isActive: ()=>true,
            //   intent: ()=>'none',
            //   hotkeys: []
            // },

            // NOW DOING THIS AUTOMATICALLY ON SELECTION CHANGE {
            // NOW DOING THIS AUTOMATICALLY ON SELECTION CHANGE   type: 'spacer',
            // NOW DOING THIS AUTOMATICALLY ON SELECTION CHANGE },
            // NOW DOING THIS AUTOMATICALLY ON SELECTION CHANGE {
            // NOW DOING THIS AUTOMATICALLY ON SELECTION CHANGE     type: 'action',
            // NOW DOING THIS AUTOMATICALLY ON SELECTION CHANGE     id: 'HighlightConfigIsThatMatchThisCR',
            // NOW DOING THIS AUTOMATICALLY ON SELECTION CHANGE     label: `Highlight Configs That Match WebReq`,
            // NOW DOING THIS AUTOMATICALLY ON SELECTION CHANGE     handler: ()=>{
            // NOW DOING THIS AUTOMATICALLY ON SELECTION CHANGE       // only extract webReq items - matching algorithm only works on webReq events
            // NOW DOING THIS AUTOMATICALLY ON SELECTION CHANGE       const selectedCRIs: CRI[] = this.crTable.getSelectedTIIs('webReqI') as CRI[]
            // NOW DOING THIS AUTOMATICALLY ON SELECTION CHANGE       this.configTable.setHighlightMatchFromCRISelection(selectedCRIs)
            // NOW DOING THIS AUTOMATICALLY ON SELECTION CHANGE     },
            // NOW DOING THIS AUTOMATICALLY ON SELECTION CHANGE       isActive: ()=>{
            // NOW DOING THIS AUTOMATICALLY ON SELECTION CHANGE         // inactive if selection does not have any webReqs
            // NOW DOING THIS AUTOMATICALLY ON SELECTION CHANGE         const selectedCRIs: CRI[] = this.crTable.getSelectedTIIs('webReqI') as CRI[]
            // NOW DOING THIS AUTOMATICALLY ON SELECTION CHANGE         return (selectedCRIs.length > 0)
            // NOW DOING THIS AUTOMATICALLY ON SELECTION CHANGE       },
            // NOW DOING THIS AUTOMATICALLY ON SELECTION CHANGE     intent: ()=>'none',
            // NOW DOING THIS AUTOMATICALLY ON SELECTION CHANGE     hotkeys: []
            // NOW DOING THIS AUTOMATICALLY ON SELECTION CHANGE },
          ]}
          cellCVActions={ [ ] }
          cellDoubleClickAction={{
            id: 'dummy',
            handler: (ti: TI, col: ColData, rowIndex: number)=>{this.putCellContentInDetailPane('cr', ti, col, rowIndex) }
          }}
          ttControlsAddedJSX={[]}
        />
      )
    }

    else if (contentName === 'detail') {

      const dcvp = this.detailPaneContentViewProps
      if (dcvp === undefined) return (()=> <div>none</div>)
      else {
        //cl(`getPaneContent for detail content view returning`)
        return (
          (size: SizePropsPx) => 
             <ContentView 
               contentStringGetter={dcvp.contentStringGetter} 
               contentJSXGetter={dcvp.contentJSXGetter} 
               cvModes={dcvp.cvModes} 
               titleText={dcvp.titleText} 
               actions={dcvp.actions} 
               initialCVMode={dcvp.initialCVMode} 
               className={dcvp.className} 
               size={size}
             />
        )
      }

    }
    
    else if (contentName === 'test') {
      // STUB CODE return ( ()=>
      // STUB CODE   <div>stub</div> 
      // STUB CODE )
      return (
        (size: SizePropsPx) =>
          //<div>STUB</div>

          <PopupMockupView size={size} state={pState}
            popupOuterDivStyleProps={{ height: '600px', width: '416px', borderStyle: 'solid', borderWidth: '8px', borderColor: 'green' }}
          />
          //<WSWControlView size={size} ws={this.ws1}/>
      )
    }

    else return (
      (size: SizePropsPx)=>
      <div style = {  { height: `${size.height.value}px`, width: `${size.width.value}px`, backgroundColor: 'gray' } }>
        <div>{`pane2pct: ${this.pane2pct}`}</div>
        <div>{`pane2pxFromSplitterview: ${this.pane2pxFromSplitterView}`}</div>
        <div>----</div>
        <div>{`this..innerHt: ${this.windowInnerHeight}`}</div>
        <div>{`divHt: ${size.height.value}`}</div>
        <div>----</div>
        <div>{`this..innerWd: ${this.windowInnerWidth}`}</div>
        <div>{`divWd: ${size.width.value}`}</div>
      </div>
    )
  }


  constructor() {
    super(localStorageIdPrefixApp)

    const paneStateFromStorage = localStorage.getItem(this.localStorageIdPrefix+'paneState')
     const paneStateObjFromStorage = {
      verticalStack: true,
      pane2pct: 0.5,
      pane1ContentName: 'config',
      pane2ContentName: 'cr'
    }
    if (paneStateFromStorage !== null) Object.assign(paneStateObjFromStorage, JSON.parse(paneStateFromStorage))
    this.verticalStack = paneStateObjFromStorage.verticalStack
    this.pane2pxFromSplitterView = ((this.verticalStack) ? (this.paneAreaTotalHeight * paneStateObjFromStorage.pane2pct) : (this.windowInnerWidth * paneStateObjFromStorage.pane2pct))
    this.pane1ContentName = paneStateObjFromStorage.pane1ContentName as PaneContentNames
    this.pane2ContentName = paneStateObjFromStorage.pane2ContentName as PaneContentNames
    this.updatePaneDims()
    this.updateDivDims()
    

    this.configTable = new TTableConfig({
      parentDnDApp: this, 
      // OBSOLETE parentServiceOpHandler: this.handleServiceOpReturnsPromise,
      serverActive: true,
      browserActive: false,
      tableName: 'config',
      columnVisibleLevel: 1,
      changeTrackingSetupEnabled: true,
      changeTrackingActiveAtConstruction: true,
      showUnsavedChanges: true,
    })
    this.phLogTable = new TTablePH2({
      parentDnDApp: this,
      relatedTTableConfig: this.configTable,
      // OBSOLETE parentServiceOpHandler: this.handleServiceOpReturnsPromise,
      tableName: 'phlogtable',
      columnVisibleLevel: 1,
      showUnsavedChanges: false,
    })
    this.crTable = new TTableCR({
      parentDnDApp: this,
      // OBSOLETE parentServiceOpHandler: this.handleServiceOpReturnsPromise,
      tableName: 'crs',
      columnVisibleLevel: 2,
      changeTrackingSetupEnabled: false,
      changeTrackingActiveAtConstruction: false,
      showUnsavedChanges: false,
      isForPopup: false,
    })
  
    makeObservable(this, {
      // NOW IMPLMEMENTED IN DNDAPP server: observable,
      statusBoxOpen: observable,
      statusBoxMessage: observable,
      testBeingDragged: observable,
      crTable: observable.shallow,
      phLogTable: observable.shallow,
      configTable: observable.shallow,
      ruleTable: observable.shallow,
      ruleTableVisible: observable,
      // OBSOLETE checkServerStatus: action.bound,
      serverHostUpdate: action.bound,
      paneSizeCorrectionForWindowZoom: observable,
      verticalStack: observable,
      pane2pxFromSplitterView: observable,
      pane2pct: computed,
      paneAreaTotalHeight: computed,
      splitterViewTotalPanePx: computed,
      pane1Size: observable,
      pane2Size: observable,
      div1Size: observable,
      div2Size: observable,
      pane1ContentName: observable,
      pane2ContentName: observable,
      detailPaneContentViewProps: observable,
    })

    // NOT NECESSARY (?) - DNDAPP CONSTRUCTOR WILL ATTEMPT TO CONNECT  if (document.hasFocus()) {
    // NOT NECESSARY (?) - DNDAPP CONSTRUCTOR WILL ATTEMPT TO CONNECT    this.attemptServerStateSocketConnect()
    // NOT NECESSARY (?) - DNDAPP CONSTRUCTOR WILL ATTEMPT TO CONNECT  }
    // NOW DOING THIS IN DNDAPP  window.onfocus = () => {
    // NOW DOING THIS IN DNDAPP    ////cl(`window.onfocus, about to call checkServerStatus`)
    // NOW DOING THIS IN DNDAPP    this.attemptServerStateSocketConnect()
    // NOW DOING THIS IN DNDAPP  }
    // NOW DOING THIS IN DNDAPP  window.onblur = () => {
    // NOW DOING THIS IN DNDAPP    ////cl(`window.onblur`)
    // NOW DOING THIS IN DNDAPP    this.serverStateSocket.wswClose(false, 'viewer onblur event')
    // NOW DOING THIS IN DNDAPP  }

    // event listener to update on window resize
    //  update own state
    //  update direct child TTable state
    window.addEventListener(
      'resize',
      (ev: UIEvent)=>{
          if (ev.target !== null) { 
            runInAction(()=>{
              ////cl(`window.resize listener adjusting sizes`)
              const win: Window = ev.target as Window
              this.windowInnerHeight = win.innerHeight
              this.windowInnerWidth = win.innerWidth

            })
          }
      }
    )

    // reactions triggered by SplitterView changes or window resize
    //  update pane dims
    reaction(
      ()=>this.pane2pxFromSplitterView + this.windowInnerHeight + this.windowInnerWidth,
      ()=>{
        ////cl(`update pane dims reaction fired`)
        this.updatePaneDims()
      },
    )
    //  update div dims with throttling 
    reaction(
      ()=>this.pane2pxFromSplitterView + this.windowInnerHeight + this.windowInnerWidth,
      ()=>{
        this.updateDivDims()
      },
      { delay: 100 }  // delay so that we don't re-render on every twitch of the splitter bar
    )

    // update config table highligthing when cr table selection changes
    reaction(
      ()=>this.crTable.selection.selRows.values(),
      ()=>{
        const selectedCRIs: CRI[] = this.crTable.getSelectedTIIs('webReqI') as CRI[]
        this.configTable.setHighlightMatchFromCRISelection(selectedCRIs)
      }
    )
    // update config table highligthing when ph table selection changes
    reaction(
      ()=>this.phLogTable.selection.selRows.values(),
      ()=>{
        const selectedPHIs: PHI2Res[] = this.phLogTable.getSelectedTIIs() as PHI2Res[]
        this.configTable.setHighlightMatchFromPHISelection(selectedPHIs)
      }
    )

    this.downloadFile = this.downloadFile.bind(this)


    // prevent any other props from being assigned to this instance
    // added this for protection in case any code that uses prop names from
    // older versions has not been cleaned up
    Object.seal(this)

    
  }

  
  updatePaneDims() {
    // this calculates pane sizes based on window dimensions
    // idea is to calculate them to the exact pixel height/width available, to completely fill the pane area but without scrollbars
    // however, at some browser window zoom levels, the calculated values can still result in the panes having scrollbars (which should never happen)
    // so (kind of hacky) we have a state variable for 'paneSizecorrectionForWindowZoom'
    // for now, we will change the correction value via a control in AppControls
    // after we test some, we can look up the correciton value based on calculated window zoom %
    // ways to get window zoom %:  https://www.geeksforgeeks.org/how-to-detect-page-zoom-level-in-all-modern-browsers-using-javascript/

    ////cl(`calcd zoom pct: ${Math.round(((window.outerWidth - 10) / window.innerWidth) * 100)}`)
    ////cl(`window.devicePixelRatio: ${Math.round(window.devicePixelRatio * 100)}`)

// INITIAL EXPERIMENTATION SEEMS TO INDICATE A CORRECTION VALUE OF 1 PX MAY BE ALL THAT IS NEEDED
// IF THIS BEARS OUT, THEN MAYBE JUST SCRAP DYNAMIC CORRECTION AND JUST BUILD IN A FIXED CORRECTION OF 1 AT ALL TIMES

    
    this.pane2Size.height.value = this.verticalStack ? (this.pane2pxFromSplitterView) : (this.windowInnerHeight - this.appControlsHtPx)
    this.pane2Size.width.value  = this.verticalStack ? this.windowInnerWidth          : (this.pane2pxFromSplitterView)
    this.pane1Size.height.value = this.verticalStack ? (this.splitterViewTotalPanePx - this.pane2Size.height.value) : (this.windowInnerHeight - this.appControlsHtPx)
    this.pane1Size.width.value  = this.verticalStack ? this.windowInnerWidth          : (this.splitterViewTotalPanePx - this.pane2Size.width.value)

    this.pane1Size.height.value = this.pane1Size.height.value - this.paneSizeCorrectionForWindowZoom
    this.pane1Size.width.value  = this.pane1Size.width.value  - this.paneSizeCorrectionForWindowZoom
    this.pane2Size.height.value = this.pane2Size.height.value - this.paneSizeCorrectionForWindowZoom
    this.pane2Size.width.value  = this.pane2Size.width.value  - this.paneSizeCorrectionForWindowZoom

    this.storePaneState()
  }
  updateDivDims() {
    // copy values, not object ref
    this.div1Size.height.value = this.pane1Size.height.value
    this.div1Size.width.value  = this.pane1Size.width.value 
    this.div2Size.height.value = this.pane2Size.height.value
    this.div2Size.width.value  = this.pane2Size.width.value
  }

  storePaneState() {
    localStorage.setItem(this.localStorageIdPrefix+'paneState', JSON.stringify({ 
      pane2pct: this.pane2pct, 
      verticalStack: this.verticalStack, 
      pane1ContentName: this.pane1ContentName, 
      pane2ContentName: this.pane2ContentName }))
  }



  // function to download file from server
  // url example: https://config.localhost:3001/download/build/svr.js'
  downloadFile(svrFilename: string) {
    const a = document.createElement('a')
    a.href = `https://${this.server.host}:${this.server.port}/download/${svrFilename}`
    a.setAttribute("download", '')
    a.click()
  }


}


let app = new App()


//window.addEventListener(
//  'wheel',
//  (ev)=>{
//    //cl(`window wheel listener`)
//  },
//  { passive: true }
//)
//window.addEventListener(
//  'scroll',
//  (ev)=>{
//    //cl(`window scroll listener`)
//  },
//  { passive: true }
//)





const AppControls = observer((props: {app: App}) => {
  const { server, serverHostUpdate, serverAvailable, paneSizeCorrectionForWindowZoom } = props.app
  const { consolidatedErrorList, consolidatedHasIfS: consolidatedHasIf } = server.lastServerStateReceived
  // ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS  const so: ServiceOperation | undefined = server.latestServiceOpInProgressOrCompleted


  //if (server.available === false) {
  //  //cl(`checking server status because available === false - this should really only be happening when app renders for first time`)
  //  props.app.checkServerStatus()
  //}

  return (
    <div 
      style={ { 
        height: app.appControlsHtPx,
        width: '100%',
        display: 'flex', flexDirection: 'row', overflow: 'auto' ,
        borderStyle: 'solid', borderColor: 'black',
      } }
    >
      <div
        style={ { flex: 'auto', display: 'flex', flexDirection: 'column', whiteSpace: 'nowrap', overflow: 'auto' } }
      >
        <div style={ { display: 'flex', flexDirection: 'row', alignItems: 'center' } }>
          Server:   
          <input
            style={{color: serverAvailable ? 'black' : 'red'}}
            id='serverHost'
            type='text'
            //size={50}
            placeholder='ip or hostname'
            value={server.host}
            onChange={(ev: React.ChangeEvent<HTMLInputElement>)=>serverHostUpdate(ev.target.value)}
          />
          <Popover2
            interactionKind={Popover2InteractionKind.CLICK}
            content={
              <div style={ { borderStyle: 'double', backgroundColor: 'cyan', color: 'black', whiteSpace: 'pre-wrap' } }>
                <div>{JSON.stringify(server.lastServerStateReceived, null, 6)}</div>
              </div>
            }
          >
            <Button
              small={true}
              intent = { serverAvailable ? 'none' : 'danger'}
            >
              {serverAvailable ? 'Show State' : 'Not Responding'}
            </Button>
          </Popover2>
          {
            // ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS  <Tooltip2 
            // ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS    className={Classes.TOOLTIP2_INDICATOR}
            // ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS    content={(so === undefined) ? '<N/A>' : `${so.op_type} ${so.subject} status: ${so.status} ${so.status_text}`}
            // ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS  >
            // ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS    <Button
            // ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS      small={true}
            // ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS      text={
            // ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS        (so === undefined) ? ''
            // ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS        : (so.status === '-1') ? `${server.opsInProgress.toString()} in progress`
            // ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS          : (so.status === '0') ? 'Succeeded' : `Failed: ${so.status.toString()}`
            // ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS      }
            // ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS      intent={
            // ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS        (so === undefined) ? 'none'
            // ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS        : (so.status === '-1') ? 'warning'
            // ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS          : (so.status === '0') ? 'none' : 'danger'
            // ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS      }
            // ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS    />
            // ALL SERVICE OP STUFF IS DEPRECATED - NOW USING WEBSOCKETS  </Tooltip2>
          }
          <Tooltip2 
            className={Classes.TOOLTIP2_INDICATOR}
            content={(consolidatedErrorList as string[]).join('\n')}
          >
            <Button
              small={true}
              text={
                (consolidatedErrorList.length === 0) ? ''
                : ((consolidatedErrorList.length === 1) ? consolidatedErrorList[0].slice(0, 50) + ((consolidatedErrorList[0].length > 50) ? ' ...' : '')
                    : `${consolidatedErrorList.length} Errors!`
                  )
              }
              intent={
                (consolidatedErrorList.length === 0) ? 'none' : 'danger'
              }
            />
          </Tooltip2>
          <Button
              small={true}
              text={ `DS Hosts Have Inforce: ${consolidatedHasIf}` }
            intent={
              (consolidatedHasIf === 'yes') ? 'none' : 'danger'
            }
          />
          <div style={ { width: '15px'}}/>
          <Button
            small={true}
            icon={'pivot-table'}
            onClick={()=>runInAction(()=>{
              app.verticalStack = ! app.verticalStack
              // update pane and div dims immediately (no throttling)
              app.updatePaneDims()
              app.updateDivDims()
            })}
          />
          <pre key='pre1' style= { { fontFamily: 'sans-serif' } }>    Pane 1: </pre>
          <ButtonGroup>
            <Button small={true} text='Config'  onClick={()=>{runInAction(()=>{app.switchPaneContent('1', 'config')})}} intent={(app.pane1ContentName==='config') ? 'primary' : 'none'}/>
            <Button small={true} text='PHLog'   onClick={()=>{runInAction(()=>{app.switchPaneContent('1', 'phlog') })}} intent={(app.pane1ContentName==='phlog') ? 'primary' : 'none'}/>
            <Button small={true} text='CR'      onClick={()=>{runInAction(()=>{app.switchPaneContent('1', 'cr')    })}} intent={(app.pane1ContentName==='cr') ? 'primary' : 'none'}/>
            <Button small={true} text='Detail'  onClick={()=>{runInAction(()=>{app.switchPaneContent('1', 'detail')})}} intent={(app.pane1ContentName==='detail') ? 'primary' : 'none'}/>
            <Button small={true} text='test'    onClick={()=>{runInAction(()=>{app.switchPaneContent('1', 'test')})}}   intent={(app.pane1ContentName==='test') ? 'primary' : 'none'}/>
          </ButtonGroup>
          <pre key='pre2' style= { { fontFamily: 'sans-serif' } }>    Pane 2: </pre>
          <ButtonGroup>
            <Button small={true} text='Config'  onClick={()=>{runInAction(()=>{app.switchPaneContent('2', 'config')})}} intent={(app.pane2ContentName==='config') ? 'primary' : 'none'}/>
            <Button small={true} text='PHLog'   onClick={()=>{runInAction(()=>{app.switchPaneContent('2', 'phlog') })}} intent={(app.pane2ContentName==='phlog') ? 'primary' : 'none'}/>
            <Button small={true} text='CR'      onClick={()=>{runInAction(()=>{app.switchPaneContent('2', 'cr')    })}} intent={(app.pane2ContentName==='cr') ? 'primary' : 'none'}/>
            <Button small={true} text='Detail'  onClick={()=>{runInAction(()=>{app.switchPaneContent('2', 'detail')})}} intent={(app.pane2ContentName==='detail') ? 'primary' : 'none'}/>
            <Button small={true} text='test'    onClick={()=>{runInAction(()=>{app.switchPaneContent('2', 'test')})}}   intent={(app.pane2ContentName==='test') ? 'primary' : 'none'}/>
          </ButtonGroup>
          {`Zoom: ${Math.round(window.devicePixelRatio * 100)}`}
          <input
            id='paneSizeCorr'
            type='text'
            //size={50}
            placeholder='ip or hostname'
            value={paneSizeCorrectionForWindowZoom}
            onChange={(ev: React.ChangeEvent<HTMLInputElement>)=>{
              runInAction(()=>{
                const newValue = parseInt(ev.target.value)
                if (isNaN(newValue) === false) {
                  app.paneSizeCorrectionForWindowZoom = newValue
                  app.updatePaneDims()
                }
              })
            }}
          />
        </div>
      </div>
    </div>
  )
})


function newConfigsFromCRs(type: 'url' | 'hostname', combined: boolean) {
  const selectedCRIs: CRI[] = (app.crTable.getSelectedTIIs()) as CRI[]
  const newConfigs: ConfigItemRaw[] = []

  // get sets of unique url and hostname strings
  const urlStringSet = new Set<string>()
  const hostnameStringSet = new Set<string>()
  for (let c of selectedCRIs) {
    // may fail because url prop is missing - if so, just skip this CRI
    try {
      let urlString = JSON.parse(c['url'])[0]
      let hostname = (new URL(urlString).hostname)
      urlStringSet.add(urlString)
      hostnameStringSet.add(hostname)
    }
    catch {}
  }
  const newConfigProps: {
    [index: string]: any
    tempItem: boolean
    requestAction?: ActionAllowDenyNA
    jsActon?: ActionAllowDenyNA
    urlRegexPattern?: string
    remoteHostDomainRegexPatterns?: string
    tools: string[]
    // OBSOLETE hosts: string[]
  } = {
    tempItem: false,
    tools: ['tool_browser'],
    // OBSOLETE hosts: ['host_mba']
  }
  if (type === 'url') {
    for (let u of Array.from(urlStringSet)) {
      newConfigProps.urlRegexPattern = u
      newConfigs.push(makeNewConfigItemRaw(newConfigProps))
    }
  }
  else {
    if (combined) {
      newConfigProps.hostDomainPatterns = Array.from(hostnameStringSet).join(', ')
      newConfigs.push(makeNewConfigItemRaw(newConfigProps))
    }
    else {
      for (let h of Array.from(hostnameStringSet)) {
        newConfigProps.hostDomainPatterns = h
        newConfigs.push(makeNewConfigItemRaw(newConfigProps))
      }
    }
  }


  app.configTable.addNewItems(newConfigs, false)
}



// wraps components in another observer component
// (i am guessing that) this wrapping component is what makes the props observable
const AppView = observer(() => {
  ////cl(`rendering WrappedApp, topPaneHt: ${app.topPaneHtPx}, botPaneHt: ${app.botPaneHtPx}`)



  return(

    <div
      style={ {
        width: '100vw',
        height: '100vh',
      }}
    >
      <AppControls app={app}/>
      <div
        key='table_area'
        style={ {
          width: '100%',
          height: app.windowInnerHeight - app.appControlsHtPx
        }}
      >
        <SplitterLayout
          vertical={app.verticalStack}
          percentage={false}
          primaryMinSize={ app.minPaneDimPx }
          secondaryMinSize={ app.minPaneDimPx }
          secondaryInitialSize={ app.pane2pxFromSplitterView }
          onSecondaryPaneSizeChange={(newSize: number)=>{
            runInAction(()=>{app.pane2pxFromSplitterView = newSize})
          }}
        >
          <div 
            style={ { ...makeDivSizeStyle(app.pane1Size), overflow: 'clip'} }
          >
            <ViewerPane
              size={app.div1Size}
              content={app.getPaneContent('1')}
            />
          </div>
          <div style={ { ...makeDivSizeStyle(app.pane2Size), overflow: 'clip'} }>
            <ViewerPane
              size={app.div2Size}
              content={app.getPaneContent('2')}
            />
          </div>
        </SplitterLayout>
      </div>

    </div>

  )
})



export default AppView;



