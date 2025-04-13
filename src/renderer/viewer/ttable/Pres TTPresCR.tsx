
// import blueprint components
import { Alignment, Button, ButtonGroup, Checkbox, ControlGroup, Dialog, DialogBody, Label } from '@blueprintjs/core';

// per https://www.npmjs.com/package/react-splitter-layout
import { SplitterLayout } from '../react-splitter-layout/SplitterLayout'

import { observer } from 'mobx-react'


import '../vwr-App.css';



import { TTable } from './TTable base Obj'
import { ContentView } from './Pres ContentView'
import { TTPres, TTPresProps } from './Pres TTPres'
import { TTableCR } from './TTableCR';
import { action, runInAction } from 'mobx';
import React, { Component, useState} from 'react';
import { CR } from './table items CR';
import { Test, TestAndGroup } from './test';
import { SizePropsPx } from '../common/commonApp';
import { run } from 'node:test';

var _ = require('lodash');

const cl = console.log;





export interface TTPresCRProps extends Omit<TTPresProps, 't'> {
    t: TTableCR
    // making these top-level props so ttcontrols will re-render when they change
    hideHarTestAndGroup: TestAndGroup | undefined
    hideWebReqTestAndGroup: TestAndGroup | undefined
    hideWebNavTestAndGroup: TestAndGroup | undefined
  }
  
interface HdrDialogPos {
  right?: string
  left?: string
}

export const TTPresCR = observer((props: TTPresCRProps) => {
    const { t, hideHarTestAndGroup, hideWebReqTestAndGroup, hideWebNavTestAndGroup, size, ttControlsActions, ttControlsAddedJSX, tableActions, cellCVActions, cellClickAction, cellDoubleClickAction } = props

    const [ hdrShowNameRegexPattern, updateHdrShowNameRegexPattern ] = useState('')
    const [ hdrShowValueRegexPattern, updateHdrShowValueRegexPattern ] = useState('')
    const [ hdrHideNameRegexPattern, updateHdrHideNameRegexPattern ] = useState('')
    const [ hdrHideValueRegexPattern, updateHdrHideValueRegexPattern ] = useState('')
    const [ hdrDialogPos, updateHdrDialogPos ] = useState<HdrDialogPos>({left: '20px'})

    const splitterViewNonPanePx: number = 15   // provides for splitter bar
    const [ rightPaneWdPx, updateRightPaneWdPx ] = useState(0)
    const [ leftPaneWdPx, updateLeftPaneWdPx ] = useState(size.width.value - splitterViewNonPanePx) 
    const [ rightDivWdPx, updateRightDivWdPx ] = useState(0)
    const [ leftDivWdPx, updateLeftDivWdPx ] = useState(size.width.value - splitterViewNonPanePx)


    ttControlsActions.push(
      {
        type: 'action',
        id: 'LoadAllCRs',
        label: 'Load All',
        handler: t.requestLoadFromParentApp,
        isActive: ()=>true,
        intent: ()=>'none',
        hotkeys: []
      },
      {
        type: 'spacer',
      }, {
        type: 'action',
        id: 'ToggleTTableCRHeaderShowControl',
        label: 'Header Name/Value To Show',
        handler: ()=>runInAction(()=>{t.headersToShowControlOpen = ! t.headersToShowControlOpen}),
        intent: ()=>'none',
        isActive: ()=>true,
        hotkeys: []
      }
    )


    // NOTE: added Math.random to keys for button groups because
    // for some reason, when vertical splitter bar is moved, new ones are rendered before the old ones are destroyed
    // and react complains about duplicate keys
    ttControlsAddedJSX.push(
 
 
      <div key='duh' style={ { width: '30px'}} />,
      <ButtonGroup key={'hidebuttons'+Math.random().toString()} >
        <Button
          key='hidehar'
          intent={(hideHarTestAndGroup !== undefined) ? 'primary' : 'none'}
          onClick={()=>{
            runInAction(()=>{
              if (hideHarTestAndGroup) {
                hideHarTestAndGroup.deleteThisGroup()
                t.hideHarTestAndGroup = undefined
              }
              else {
                t.hideHarTestAndGroup = new TestAndGroup(t.hideTests, t.parentDnDApp)
                t.hideHarTestAndGroup.addTest(new Test(
                  t.hideHarTestAndGroup,
                  t.parentDnDApp,
                  'kind',
                  'Kind',
                  true,
                  new RegExp('harI'),
                  (propValue: string, trueIfEqual: boolean, regex: RegExp, ifChildTIIResultsDisagree: boolean)=>(propValue === 'harI')
                ), 0)
                t.hideTests.addGroup(t.hideHarTestAndGroup, 0)
              }
            })
          }}
        >
          {`${t.hideHarTestAndGroup ? 'Hiding' : 'Hide'} Har`}
        </Button>
        <Button
          key='hidewebreq'
          intent={hideWebReqTestAndGroup ? 'primary' : 'none'}
          onClick={()=>{
            runInAction(()=>{
              if (t.hideWebReqTestAndGroup) {
                t.hideWebReqTestAndGroup.deleteThisGroup()
                if (t.hideDNRTestAndGroup) t.hideDNRTestAndGroup.deleteThisGroup()
                t.hideWebReqTestAndGroup = undefined
                t.hideDNRTestAndGroup = undefined
              }
              else {
                t.hideWebReqTestAndGroup = new TestAndGroup(t.hideTests, t.parentDnDApp)
                t.hideWebReqTestAndGroup.addTest(new Test(
                  t.hideWebReqTestAndGroup,
                  t.parentDnDApp,
                  'kind',
                  'Kind',
                  true,
                  new RegExp('webReqI'),
                  (propValue: string, trueIfEqual: boolean, regex: RegExp, ifChildTIIResultsDisagree: boolean)=>(propValue === 'webReqI')
                ), 0)
                t.hideTests.addGroup(t.hideWebReqTestAndGroup, 0)
                t.hideDNRTestAndGroup = new TestAndGroup(t.hideTests, t.parentDnDApp)
                t.hideDNRTestAndGroup.addTest(new Test(
                  t.hideDNRTestAndGroup,
                  t.parentDnDApp,
                  'kind',
                  'Kind',
                  true,
                  new RegExp('dNRMatchI'),
                  (propValue: string, trueIfEqual: boolean, regex: RegExp, ifChildTIIResultsDisagree: boolean)=>(propValue === 'dNRMatchI')
                ), 0)
                t.hideTests.addGroup(t.hideDNRTestAndGroup, 0)
              }
            })
          }}
        >
          {`${t.hideWebReqTestAndGroup ? 'Hiding' : 'Hide'} WebReq`}
        </Button>
        <Button
          key={'hidewebnav'}
          intent={t.hideWebNavTestAndGroup ? 'primary' : 'none'}
          onClick={()=>{
            runInAction(()=>{
              if (t.hideWebNavTestAndGroup) {
                t.hideWebNavTestAndGroup.deleteThisGroup()
                t.hideWebNavTestAndGroup = undefined
              }
              else {
                t.hideWebNavTestAndGroup = new TestAndGroup(t.hideTests, t.parentDnDApp)
                t.hideWebNavTestAndGroup.addTest(new Test(
                  t.hideWebNavTestAndGroup,
                  t.parentDnDApp,
                  'kind',
                  'Kind',
                  true,
                  new RegExp('webNavI'),
                  (propValue: string, trueIfEqual: boolean, regex: RegExp, ifChildTIIResultsDisagree: boolean)=>(propValue === 'webNavI')
                ), 0)
                t.hideTests.addGroup(t.hideWebNavTestAndGroup, 0)
              }
            })
          }}
        >
          {`${t.hideWebNavTestAndGroup ? 'Hiding' : 'Hide'} WebNav`}
        </Button>
      </ButtonGroup>,
    )
    tableActions.push(
        
 
          {
            type: 'spacer',
          },
          {
            type: 'action',
            id: 'ToDV', 
            label: 'Selection to Detail View', 
            handler: ()=>{},  // stub until we implement new detail view
            isActive: ()=>true,
            intent: ()=>'none',
            hotkeys: [] 
          },
      {
        type: 'action',
        id: 'HighlightInitiatorUrlGs',
        label: 'Highlight Initiator UrlG (only immediate initiator)',
        handler: ()=>t.expandAndHighlightInitiatorUrlGs(t.getSelectedTIIs() as CR[], 3, false),
        isActive: ()=>true,
        intent: ()=>'none',
        hotkeys: [ { key: 'i', shiftKey: false, ctrlKey: false, altKey: false, metaKey: false } ]
      },
      {
        type: 'action',
        id: 'HighlightInitiatorUrlGs',
        label: 'Highlight Initiator UrlGs (full chain)',
        handler: ()=>t.expandAndHighlightInitiatorUrlGs(t.getSelectedTIIs() as CR[], 3, true),
        isActive: ()=>true,
        intent: ()=>'none',
        hotkeys: [ { key: 'I', shiftKey: true, ctrlKey: false, altKey: false, metaKey: false } ]
      }
  
    )

    return (
      <div
        style={ {
          height: `${size.height.value}px`,
          width:  `${size.width.value}px`,
        }}
        onKeyDown={(ev)=>{
          if(ev.key === 'ArrowLeft')  updateHdrDialogPos({left:  '20px'})
          if(ev.key === 'ArrowRight') updateHdrDialogPos({right: '20px'})
        }}
        >
        <Dialog
          key='headerstoshowdialog'
          isOpen={t.headersToShowControlOpen}
          canEscapeKeyClose={true}
          enforceFocus={false}
          style={{position: 'absolute', ...hdrDialogPos, top: '20px', height: `${size.height.value * 0.9}px`}}
          canOutsideClickClose={false}
          usePortal={false}
          className='popupContainer'
          onClose={(()=>runInAction(()=>t.headersToShowControlOpen=false))}
          onOpened={()=>runInAction(()=>t.openComponentsThatShouldSuppressTTableHotkeysAndVisibleMapUpdateCount++)}
          onClosed={()=>runInAction(()=>t.openComponentsThatShouldSuppressTTableHotkeysAndVisibleMapUpdateCount--)}
          title={<div>
                  <ButtonGroup key={'hdrtypes'+Math.random().toString()}>
                    {
                      ['original  ', 'added     ', 'notInFinal', 'changed   ', 'asoriginal', 'final     '].map(h => 
                        <Button 
                          key={h} 
                          intent={(t.headerTypesToShow[h])?'primary':'none'} 
                          onClick={()=>{runInAction(()=>{t.headerTypesToShow[h] = !t.headerTypesToShow[h]})}}>
                          {h}
                        </Button>
                      )
                    }
                  </ButtonGroup>
                  <div key='hsnrtitle' className='contentViewTitleBar'>
                    Will show if match either regex or checked header name
                    Header Name Rexex:
                  </div>
                  <input
                    key='hdrshownameregex'
                    id='hdrshownameregex'
                    style={ { minHeight: '10px', width: '100%'} }
                    value={hdrShowNameRegexPattern}
                    type='text'
                    placeholder='blank means will not test, else must be valid regex pattern'
                    onChange={(ev: React.ChangeEvent<HTMLInputElement>)=>{
                      // update the input box
                      updateHdrShowNameRegexPattern(ev.target.value)
                      const element: HTMLInputElement = document.getElementById('hdrnameregex') as HTMLInputElement
                      try {   // if valid regex pattern, update tttable state
                        const r = new RegExp(ev.target.value)
                        runInAction(()=>{
                          t.headersToShowNameRegexPattern = ev.target.value
                          if (ev.target.value === '') t.headersToShowNameRegex = undefined
                          else t.headersToShowNameRegex = r
                        })
                        if (element !== null) element.setCustomValidity('')
                      }
                      catch {
                        if (element !== null) element.setCustomValidity('Not a valid regex pattern')
                      }
                    }}
                  />
                  <div key='hsvrtitle' className='contentViewTitleBar'>
                    Header Value Rexex:
                  </div>
                  <input
                    key='hdrshowvalueregex'
                    id='hdrshowvalueregex'
                    style={ { minHeight: '10px', width: '100%'} }
                    value={hdrShowValueRegexPattern}
                    type='text'
                    placeholder='blank means will not test, else must be valid regex pattern'
                    onChange={(ev: React.ChangeEvent<HTMLInputElement>)=>{
                      // update the input box
                      updateHdrShowValueRegexPattern(ev.target.value)
                      const element: HTMLInputElement = document.getElementById('hdrvalueregex') as HTMLInputElement
                      try {   // if valid regex pattern, update tttable state
                        const r = new RegExp(ev.target.value)
                        runInAction(()=>{
                          t.headersToShowValueRegexPattern = ev.target.value
                          if (ev.target.value === '') t.headersToShowValueRegex = undefined
                          else t.headersToShowValueRegex = r
                        })
                        if (element !== null) element.setCustomValidity('')
                      }
                      catch {
                        if (element !== null) element.setCustomValidity('Not a valid regex pattern')
                      }
                    }}
                  />
                  <div key='hhnrtitle' className='contentViewTitleBar'>
                    Will hide if match regex (overrides checked boxes)
                    Header Name Rexex:
                  </div>
                  <input
                    key='hdrhidenameregex'
                    id='hdrhidenameregex'
                    style={ { minHeight: '10px', width: '100%'} }
                    value={hdrHideNameRegexPattern}
                    type='text'
                    placeholder='blank means will not test, else must be valid regex pattern'
                    onChange={(ev: React.ChangeEvent<HTMLInputElement>)=>{
                      // update the input box
                      updateHdrHideNameRegexPattern(ev.target.value)
                      const element: HTMLInputElement = document.getElementById('hdrnameregex') as HTMLInputElement
                      try {   // if valid regex pattern, update tttable state
                        const r = new RegExp(ev.target.value)
                        runInAction(()=>{
                          t.headersToHideNameRegexPattern = ev.target.value
                          if (ev.target.value === '') t.headersToHideNameRegex = undefined
                          else t.headersToHideNameRegex = r
                        })
                        if (element !== null) element.setCustomValidity('')
                      }
                      catch {
                        if (element !== null) element.setCustomValidity('Not a valid regex pattern')
                      }
                    }}
                  />
                  <div key='hhvrtitle' className='contentViewTitleBar'>
                    Header Value Rexex:
                  </div>
                  <input
                    key='hdrhidevalueregex'
                    id='hdrhidevalueregex'
                    style={ { minHeight: '10px', width: '100%'} }
                    value={hdrHideValueRegexPattern}
                    type='text'
                    placeholder='blank means will not test, else must be valid regex pattern'
                    onChange={(ev: React.ChangeEvent<HTMLInputElement>)=>{
                      // update the input box
                      updateHdrHideValueRegexPattern(ev.target.value)
                      const element: HTMLInputElement = document.getElementById('hdrvalueregex') as HTMLInputElement
                      try {   // if valid regex pattern, update tttable state
                        const r = new RegExp(ev.target.value)
                        runInAction(()=>{
                          t.headersToHideValueRegexPattern = ev.target.value
                          if (ev.target.value === '') t.headersToHideValueRegex = undefined
                          else t.headersToHideValueRegex = r
                        })
                        if (element !== null) element.setCustomValidity('')
                      }
                      catch {
                        if (element !== null) element.setCustomValidity('Not a valid regex pattern')
                      }
                    }}
                  />
                </div>}
        >
          <DialogBody
          >

              <div
                key='headersToShowDialogDiv'
              >
                <ButtonGroup key='allnonebuts' className='contentViewButtonGroup'>
                  <Button key='showallbut'
                    onClick={()=>runInAction(()=>{
                      for (let h in t.headerNamesToShow) {
                        t.headerNamesToShow[h] = true
                      }
                    })}
                  >
                    Show All
                  </Button>
                  <Button key='shownonebut'
                    onClick={()=>runInAction(()=>{
                      for (let h in t.headerNamesToShow) {
                        t.headerNamesToShow[h] = false
                      }
                    })}
                  >
                    Show None
                  </Button>
                </ButtonGroup>

                <div key='categ'>CATEGORIES</div>
                {Object.getOwnPropertyNames(t.headerNameCategories).map(c => {
                  let showAllTrue = true
                  let showAnyTrue = false
                  for (let h of t.headerNameCategories[c]) {
                    if (t.headerNamesToShow[h]) showAnyTrue = true
                    else showAllTrue = false
                  }
                  return (
                    <ControlGroup
                      vertical={false}
                      style={{}}
                    >
                      <Button
                        key={'showonly'}
                        style={{ transform: 'scale(0.7)'}}
                        onClick={()=>{
                          for (let hh in t.headerNamesToShow) t.headerNamesToShow[hh] = (t.headerNameCategories[c].includes(hh))
                        }}
                      >
                        Show Only
                      </Button>
                      <Checkbox
                        key={'show'}
                        style={{}}
                        indeterminate={ showAnyTrue && (!showAllTrue)}
                        checked = { showAllTrue }
                        label = { 'Show   ' + c }
                        onChange={(ev)=> {
                          let allTrue = true
                          let anyTrue = false
                          for (let h of t.headerNameCategories[c]) {
                            if (t.headerNamesToShow[h]) anyTrue = true
                            else allTrue = false
                          }
                          runInAction(()=> {for (let h of t.headerNameCategories[c]) t.headerNamesToShow[h] = !allTrue})
                        }}
                      />
                    </ControlGroup>
                  )
                })}
                INDIVIDUAL HEADER NAMES
                {Object.getOwnPropertyNames(t.headerNamesToShow).sort().map(h => {
                  return (
                    <ControlGroup vertical={false}>
                      <Button
                        key={'showonly'}
                        style={{ transform: 'scale(0.7)'}}
                        onClick={()=>{
                          runInAction(()=>{
                            for (let hh in t.headerNamesToShow) t.headerNamesToShow[hh] = (h === hh)
                          })
                        }}
                      >
                        Show Only
                      </Button>
                      <Checkbox
                        key={'show'}
                        checked = { t.headerNamesToShow[h]}
                        label = { 'Show   ' + h }
                        onChange={(ev)=> { 
                          runInAction(()=>t.headerNamesToShow[h] = (! t.headerNamesToShow[h]))
                        }}
                      />
                    </ControlGroup>
                  )
                })}
              </div>
          </DialogBody>

        </Dialog>

        <div
            key={'table'}
            style={ {
                height: `${size.height.value}px`,
                width: `${size.width.value}px`
            } }
        >
          <TTPres 
            key='TTPres'
            t={t}
            size={size}
            // OBSOLETE size={{
            // OBSOLETE   height: { unit: 'px', constraint: 'fixed', value: t.size.height.value },
            // OBSOLETE   width: { unit: 'px', constraint: 'fixed', value: leftDivWdPx },
            // OBSOLETE }}
            ttControlsActions={ttControlsActions}
            tableActions={tableActions}
            cellCVActions={cellCVActions}
            cellClickAction={cellClickAction}
            cellDoubleClickAction={cellDoubleClickAction}
            ttControlsAddedJSX={ttControlsAddedJSX}
          />
        </div>

      </div>
    );
  }
)


