
// import blueprint components
import { Button, ButtonGroup, Checkbox, Dialog, Label } from '@blueprintjs/core';

// per https://www.npmjs.com/package/react-splitter-layout
import { SplitterLayout } from '../react-splitter-layout/SplitterLayout'

import { observer } from 'mobx-react'


import '../vwr-App.css';


/*

WHOLE THING IS OBSOLETE

MAY JUST DELETE, BUT KEEP AROUND FOR A LITTLE WHILE IN CASE CODE SNIPPETS ARE USEFUL



import { TTable } from './TTable base Obj'
import { ContentView, ContentViewPropsWithID } from './Pres ContentView'
import { TTPres, TTPresProps } from './Pres TTPres'
import { TTableCRWithDetailView } from './TTableCR';
import { action, runInAction } from 'mobx';
import React, { Component, useState} from 'react';
import { CR } from './table items CR';
import { Test, TestAndGroup } from './test';
import { SizePropsPx } from '../common/commonApp';

var _ = require('lodash');

const cl = console.log;





export interface DetailViewListViewProps {
  items: ContentViewPropsWithID[]
  table: TTableCRWithDetailView
  size: SizePropsPx
}



export const DetailViewItemListView = observer((props: DetailViewListViewProps) => {
  return (
    <div>
      <Button onClick={()=>props.table.detailViewItems=[]}>Clear All</Button>
      {props.items.map((item, i) => {
        return (
          <div
            key={i}
            style={ { 
              padding: '0px', margin: '0px', minHeight: '100px', borderStyle: 'solid', borderWidth: '4px',
              display: 'flex', flexDirection: 'column'
            } }  
          >
            <ContentView propItems={item} size={item.size}/>
          </div>
        )
      })}
    </div>
  )
})




export interface TTPresCRWithDetailProps extends Omit<TTPresProps, 't'> {
  tWithDV: TTableCRWithDetailView
}


export const TTPresCRWithDetail = observer((props: TTPresCRWithDetailProps) => {
    const { tWithDV, ttControlsActions, ttControlsAddedJSX, tableActions, cellCVActions, cellClickAction } = props
    const { size } = props.tWithDV

    const [ hdrNameRegexPattern, updateHdrNameRegexPattern ] = useState('')
    const [ hdrValueRegexPattern, updateHdrValueRegexPattern ] = useState('')

    const splitterViewNonPanePx: number = 15   // provides for splitter bar
    const [ rightPaneWdPx, updateRightPaneWdPx ] = useState(0)
    const [ leftPaneWdPx, updateLeftPaneWdPx ] = useState(size.width.value - splitterViewNonPanePx) 
    const [ rightDivWdPx, updateRightDivWdPx ] = useState(0)
    const [ leftDivWdPx, updateLeftDivWdPx ] = useState(size.width.value - splitterViewNonPanePx)


    ttControlsActions.push({
        type: 'spacer',
      }, {
        type: 'action',
        id: 'ToggleTTableCRHeaderShowControl',
        label: 'Header Name/Value To Show',
        handler: ()=>runInAction(()=>{tWithDV.headersToShowControlOpen = ! tWithDV.headersToShowControlOpen}),
        intent: ()=>'none',
        isActive: ()=>true,
        hotkeys: []
      }
    )


    // NOTE: added Math.random to keys for button groups because
    // for some reason, when vertical splitter bar is moved, new ones are rendered before the old ones are destroyed
    // and react complains about duplicate keys
    ttControlsAddedJSX.push(
 
      <ButtonGroup key={'hdrtypes'+Math.random().toString()}>
        {
          ['original  ', 'added     ', 'removed   ', 'changed   ', 'asoriginal', 'final     '].map(t => 
            <Button 
              key={t} 
              intent={(tWithDV.headerTypesToShow[t])?'primary':'none'} 
              onClick={()=>{runInAction(()=>{tWithDV.headerTypesToShow[t] = !tWithDV.headerTypesToShow[t]})}}>
              {(t === 'asoriginal') ? 'ao' : t.slice(0, 1)}
            </Button>
          )
        }

      </ButtonGroup>,
      <div style={ { width: '30px'}} />,
      <ButtonGroup key={'hidebuttons'+Math.random().toString()} >
        <Button
          key='hidehar'
          onClick={()=>{
            runInAction(()=>{
              const newTAGroup = new TestAndGroup(tWithDV.hideTests, tWithDV.parentDnDApp)
              newTAGroup.addTest(new Test(
                newTAGroup,
                tWithDV.parentDnDApp,
                'kind',
                'Kind',
                true,
                new RegExp('harI'),
                (propValue: string, trueIfEqual: boolean, regex: RegExp, ifChildTIIResultsDisagree: boolean)=>(propValue === 'harI')
              ), 0)
              tWithDV.hideTests.addGroup(newTAGroup, 0)
            })
          }}
        >
          Hide Har
        </Button>
        <Button
          key='hidewebreq'
          onClick={()=>{
            runInAction(()=>{
              const newTAGroup = new TestAndGroup(tWithDV.hideTests, tWithDV.parentDnDApp)
              newTAGroup.addTest(new Test(
                newTAGroup,
                tWithDV.parentDnDApp,
                'kind',
                'Kind',
                true,
                new RegExp('webReqI'),
                (propValue: string, trueIfEqual: boolean, regex: RegExp, ifChildTIIResultsDisagree: boolean)=>(propValue === 'webReqI')
              ), 0)
              tWithDV.hideTests.addGroup(newTAGroup, 0)
              const newTAGroup2 = new TestAndGroup(tWithDV.hideTests, tWithDV.parentDnDApp)
              newTAGroup2.addTest(new Test(
                newTAGroup,
                tWithDV.parentDnDApp,
                'kind',
                'Kind',
                true,
                new RegExp('dNRMatchI'),
                (propValue: string, trueIfEqual: boolean, regex: RegExp, ifChildTIIResultsDisagree: boolean)=>(propValue === 'dNRMatchI')
              ), 0)
              tWithDV.hideTests.addGroup(newTAGroup2, 0)
            })
          }}
        >
          Hide WebReq
        </Button>
        <Button
          key={'hidewebnav'}
          onClick={()=>{
            runInAction(()=>{
              const newTAGroup = new TestAndGroup(tWithDV.hideTests, tWithDV.parentDnDApp)
              newTAGroup.addTest(new Test(
                newTAGroup,
                tWithDV.parentDnDApp,
                'kind',
                'Kind',
                true,
                new RegExp('webNavI'),
                (propValue: string, trueIfEqual: boolean, regex: RegExp, ifChildTIIResultsDisagree: boolean)=>(propValue === 'webNavI')
              ), 0)
              tWithDV.hideTests.addGroup(newTAGroup, 0)
            })
          }}
        >
          Hide WebNav
        </Button>
      </ButtonGroup>,
    )
    tableActions.push(
      {
        type: 'action',
        id: 'HighlightInitiatorUrlGs',
        label: 'Highlight Initiator UrlG (only immediate initiator)',
        handler: ()=>tWithDV.expandAndHighlightInitiatorUrlGs(tWithDV.getSelectedTIIs() as CR[], 3, false),
        isActive: ()=>true,
        intent: ()=>'none',
        hotkeys: [ { key: 'i', shiftKey: false, ctrlKey: false, altKey: false, metaKey: false } ]
      },
      {
        type: 'action',
        id: 'HighlightInitiatorUrlGs',
        label: 'Highlight Initiator UrlGs (full chain)',
        handler: ()=>tWithDV.expandAndHighlightInitiatorUrlGs(tWithDV.getSelectedTIIs() as CR[], 3, true),
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
      >
        <Dialog
          key='headerstoshowdialog'
          isOpen={tWithDV.headersToShowControlOpen}
          className='popupContainer'
          onOpened={()=>runInAction(()=>tWithDV.openComponentsThatShouldSuppressTTableHotkeysAndVisibleMapUpdateCount++)}
          onClosed={()=>runInAction(()=>tWithDV.openComponentsThatShouldSuppressTTableHotkeysAndVisibleMapUpdateCount--)}
        >
          <div
          >
            <div className='contentViewTitleBar'>
              Will show if match either regex or checked header name
              Header Name Rexex:
            </div>
            <input
              key='hdrnameregex'
              id='hdrnameregex'
              style={ { minHeight: '10px', width: '100%'} }
              value={hdrNameRegexPattern}
              type='text'
              placeholder='blank means will not test, else must be valid regex pattern'
              onChange={(ev: React.ChangeEvent<HTMLInputElement>)=>{
                // update the input box
                updateHdrNameRegexPattern(ev.target.value)
                const element: HTMLInputElement = document.getElementById('hdrnameregex') as HTMLInputElement
                try {   // if valid regex pattern, update tttable state
                  const r = new RegExp(ev.target.value)
                  runInAction(()=>{
                    tWithDV.headersToShowNameRegexPattern = ev.target.value
                    if (ev.target.value === '') tWithDV.headersToShowNameRegex = undefined
                    else tWithDV.headersToShowNameRegex = r
                  })
                  if (element !== null) element.setCustomValidity('')
                }
                catch {
                  if (element !== null) element.setCustomValidity('Not a valid regex pattern')
                }
              }}
            />
            <div className='contentViewTitleBar'>
              Header Value Rexex:
            </div>
            <input
              key='hdrvalueregex'
              id='hdrvalueregex'
              style={ { minHeight: '10px', width: '100%'} }
              value={hdrValueRegexPattern}
              type='text'
              placeholder='blank means will not test, else must be valid regex pattern'
              onChange={(ev: React.ChangeEvent<HTMLInputElement>)=>{
                // update the input box
                updateHdrValueRegexPattern(ev.target.value)
                const element: HTMLInputElement = document.getElementById('hdrvalueregex') as HTMLInputElement
                try {   // if valid regex pattern, update tttable state
                  const r = new RegExp(ev.target.value)
                  runInAction(()=>{
                    tWithDV.headersToShowValueRegexPattern = ev.target.value
                    if (ev.target.value === '') tWithDV.headersToShowValueRegex = undefined
                    else tWithDV.headersToShowValueRegex = r
                  })
                  if (element !== null) element.setCustomValidity('')
                }
                catch {
                  if (element !== null) element.setCustomValidity('Not a valid regex pattern')
                }
              }}
            />


            <div key='top'
              className='contentViewTitleBar'
            >
              <div key='a' className='contentViewTitleText'>
                Header Names To Show In Summary
              </div>
              <div key='b' className='contentViewButtonBar'>
                <ButtonGroup className='contentViewButtonGroup'>
                  <Button
                    onClick={()=>{
                      runInAction(()=>tWithDV.headersToShowControlOpen = false)
                    }}
                  >
                    Close
                  </Button>
                </ButtonGroup>
              </div>
            </div>
            <div key='body'
              className='contentViewBody'
              style={ { 
                width: '600px',
                overflow: 'scroll',
              } }
            >
              <div
                key='headersToShowDialogDiv'
                onKeyDown={(ev)=>{
                  if (ev.key === 'Escape') { runInAction(()=>tWithDV.headersToShowControlOpen = false) }
                }} 
              >
                <ButtonGroup key='allnonebuts' className='contentViewButtonGroup'>
                  <Button key='allbut'
                    onClick={()=>runInAction(()=>{
                      for (let h in tWithDV.headerNamesToShow) {
                        tWithDV.headerNamesToShow[h] = true
                      }
                    })}
                  >
                    All
                  </Button>
                  <Button key='nonebut'
                    onClick={()=>runInAction(()=>{
                      for (let h in tWithDV.headerNamesToShow) {
                        tWithDV.headerNamesToShow[h] = false
                      }
                    })}
                  >
                    None
                  </Button>
                </ButtonGroup>
                CATEGORIES
                {Object.getOwnPropertyNames(tWithDV.headerNameCategories).map(c => {
                  let allTrue = true
                  let anyTrue = false
                  for (let h of tWithDV.headerNameCategories[c]) {
                    if (tWithDV.headerNamesToShow[h]) anyTrue = true
                    else allTrue = false
                  }
                  return (
                    <Checkbox
                      key={c}
                      indeterminate={ anyTrue && (!allTrue)}
                      checked = { allTrue }
                      label = { c }
                      onChange={(ev)=> {
                        let allTrue = true
                        let anyTrue = false
                        for (let h of tWithDV.headerNameCategories[c]) {
                          if (tWithDV.headerNamesToShow[h]) anyTrue = true
                          else allTrue = false
                        }
                        runInAction(()=> {for (let h of tWithDV.headerNameCategories[c]) tWithDV.headerNamesToShow[h] = !allTrue})
                      }}
                    />
                  )
                })}
                INDIVIDUAL HEADER NAMES
                {Object.getOwnPropertyNames(tWithDV.headerNamesToShow).sort().map(h => {
                  return (
                    <Checkbox
                      key={h}
                      checked = { tWithDV.headerNamesToShow[h]}
                      label = { h }
                      onChange={(ev)=> { 
                        runInAction(()=>tWithDV.headerNamesToShow[h] = (! tWithDV.headerNamesToShow[h]))
                      }}
                    />
                  )
                })}
              </div>
            </div>
            <div id='botbuttonbar' key='bottom' className='contentViewTitleBar'>
              <div className='contentViewButtonBar'>
                <ButtonGroup key='buttonbar' className='contentViewButtonGroup'>
                  <Button >button</Button>
                </ButtonGroup>
              </div>
            </div>
          </div>

        </Dialog>
        <SplitterLayout
          key='ttprescrsplitterlayout'
          vertical={false}
          percentage={false}
          primaryMinSize={200}
          secondaryInitialSize={rightPaneWdPx} 
          onSecondaryPaneSizeChange={(newSize: number)=> {
            updateRightPaneWdPx(newSize)
            updateRightDivWdPx(newSize)
            updateLeftPaneWdPx(size.width.value - newSize - splitterViewNonPanePx)
            updateLeftDivWdPx(size.width.value - newSize - splitterViewNonPanePx)
            cl(`new widths: leftPane: ${leftPaneWdPx} leftDiv: ${leftDivWdPx} rightPane: ${rightPaneWdPx} rightDiv: ${rightDivWdPx}`)
          }}
        >
          <div
            key={'table'}
            style={ {
              height: `${size.height.value}px`,
              width: `${leftDivWdPx}px`
            } }
          >
            <TTPres 
              key='TTPres'
              t={tWithDV}
              // OBSOLETE size={{
              // OBSOLETE   height: { unit: 'px', constraint: 'fixed', value: tWithDV.size.height.value },
              // OBSOLETE   width: { unit: 'px', constraint: 'fixed', value: leftDivWdPx },
              // OBSOLETE }}
              ttControlsActions={ttControlsActions}
              tableActions={tableActions}
              cellCVActions={cellCVActions}
              cellClickAction={cellClickAction}
              ttControlsAddedJSX={ttControlsAddedJSX}
            />
          </div>
          <div
            key={'detailpane'}
            style={ {
              height: `${size.height.value}px`,
              width: `${rightDivWdPx}px`
            } }
          >
            <DetailViewItemListView 
              items={tWithDV.detailViewItems} 
              table={tWithDV}
              size={{
                height: { unit: 'px', constraint: 'fixed', value: tWithDV.size.height.value },
                width: { unit: 'px', constraint: 'fixed', value: rightDivWdPx },
              }}
            />
          </div> 
        </SplitterLayout>
      </div>
    );
  }
)


*/


