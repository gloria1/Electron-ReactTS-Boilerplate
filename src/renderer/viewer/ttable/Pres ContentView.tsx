import * as React from 'react';
import { useState } from 'react';

// import blueprint components
import { Button, ButtonGroup, HTMLSelect } from '@blueprintjs/core';

import { action, comparer, computed, makeObservable, observable, override, reaction, runInAction, toJS } from "mobx"
import { observer, PropTypes } from 'mobx-react'

import { v4 as uuidv4 } from 'uuid'

import '../vwr-App.css';

import { theClipboard, ActionPlain, ActionPlainGroup, ActionPlainOrGroup, ActionButtonGroup } from './Pres Action'
import { TI } from './table items base'
import { TTableObj } from './TTable base Obj'
import { onClickReporter, onWheelReporter, TTPres } from './Pres TTPres'
import { CVMode, CVModeTransformers, DivSizeStyle, SizePropPx, SizeProps, SizePropsPx, makeDivSizeStyle } from '../common/commonApp';


var _ = require('lodash');

const cl = console.log;



export interface ContentViewProps {
  contentStringGetter: (bm?: string) => string
  // JSX to render in body area
  contentJSXGetter: (bm?: string, size?: SizePropsPx ) => JSX.Element
  cvModes: string[]
  titleText: string
  actions: ActionPlainOrGroup[]
  initialCVMode: string
  className?: string      // if specified, will be applied to outermost div
  size: SizeProps
}

export function makeContentViewPropsFromTI(ti: TI, actions: ActionPlainOrGroup[], size: SizePropsPx): ContentViewProps {
  return {
    contentStringGetter: ((bm: string | undefined)=>''),
    contentJSXGetter: (bm?: string, size?: SizePropsPx)=>{return <TTPres 
      t={new TTableObj({
        parentDnDApp: ti.parentTTable.parentDnDApp,
        objName: 'ti',
        obj: ti,
        columnVisibleLevel: 1,
        showUnsavedChanges: false,
      })}
      size={(size !== undefined) ? size : { height: { unit: 'px', constraint: 'fixed', value: 200}, width: { unit: 'px', constraint: 'fixed', value: 200}}}
      ttControlsActions = { [] }
      tableActions = { [] }
      cellCVActions={ [] }
      cellClickAction={undefined}
      ttControlsAddedJSX={[]}
    />},
    cvModes: [],
    titleText: 'ti',
    actions: actions,
    initialCVMode: 'none',
    className: undefined,
    size: size
  }
}

export function makeContentViewPropsFromTIProp(ti: TI, propName: string, actions: ActionPlainOrGroup[], size: SizeProps, initialCVMode: CVMode ): ContentViewProps {
  return {
    contentStringGetter: (_.curry(ti.parentTTable.tiPropFunctions[propName].multiLineString))(ti, propName, true),
    contentJSXGetter: (_.curry(ti.parentTTable.tiPropFunctions[propName].contentViewJSX))(ti, propName, true),
    cvModes: ['none', 'sorted', 'sortedUrl', 'url', 'httpHeader', 'hostDomainPattern', 'js', 'json', 'html', 'css'],
    titleText: propName,
    actions: actions,
    initialCVMode: initialCVMode,
    className: undefined, 
    size: size
  }
}





export const ContentView = observer((props: ContentViewProps) => {
  const [ cvMode, cvModeUpdater ] = useState(props.initialCVMode)

  const { contentStringGetter, contentJSXGetter, cvModes, titleText, actions, className } = props
  const { size } = props
  // OBSOLETE ??? WAS THIS EVER USED???  const contentString = contentStringGetter(cvMode)

  // constants used in sizing calcs
  const dvBorderOverheadPx = 0 // 8    // provides for border around DetailViewItem
  const verticalOverheadPx = 36 + ((actions.length > 0) ? 48 : 0) + 6 + 6  //  top and bottom button bars - previously 120, not sure what that was based on
  const popupContainerOverheadPx = 8  // border in 'popupContainer'
  
  //cl(`===================`)
  //cl(`ContentView size prop: \n  ${JSON.stringify(size)}`)


  // compute sizing style items for outermost div
  var outerSizeStyle: DivSizeStyle = {}

  // translate into px based size if necessary
  var outerHeightPx: number = 
    (size.height.unit === 'px') 
      ? size.height.value
      : window.innerHeight
  outerHeightPx -= dvBorderOverheadPx
  if (size.height.constraint === 'fixed') outerSizeStyle.height    = `${outerHeightPx}px`
  else                                    outerSizeStyle.maxHeight = `${outerHeightPx}px`
  
  var outerWidthPx: number = 
    (size.width.unit === 'px') 
      ? size.width.value
      : (size.width.value / 100) * window.innerWidth
  outerWidthPx -= dvBorderOverheadPx
  if (size.width.constraint === 'fixed') outerSizeStyle.width    = `${outerWidthPx}px`
  else                                   outerSizeStyle.maxWidth = `${outerWidthPx}px`
  // had been a workaround to always use maxHeight|Width  outerSizeStyle.maxWidth = `${outerWidthPx}px`

  // compute size props to pass to child
  // size passed to contentJSX must be in px units (codemirrorView requires pixel-based sizing, others may not need it, but we can do the translation here)
  function getContentSize(size: SizeProps): SizePropsPx  {
    return {
      height: {
        unit: 'px',
        constraint: size.height.constraint,
        value: outerHeightPx - verticalOverheadPx
      },
      width: {
        unit: 'px',
        constraint: size.width.constraint,
        value: outerWidthPx - popupContainerOverheadPx
      }
    }
  }


  //cl(`ContentView returning`)

  return (
      <div 
        onKeyDown={(ev: React.KeyboardEvent)=>{
          //cl(`ContentView onKeyDown: ev.key: ${ev.key}`)
        }}
        style={ { ...outerSizeStyle, overscrollBehavior: 'none'}}
        className={(className !== undefined) ? className : 'popupContainer' }
        onWheel={(ev: React.WheelEvent)=>{
          // to prevent scroll wheel from affecting other components
          if (ev.cancelable) {
            ev.preventDefault()
            //onWheelReporter(ev, 'ContentView', [])
          }
          ev.stopPropagation()
          //onWheelReporter(ev, 'ContentView', [])
        }}
      >
        <div className='contentViewTitleBar'>
          <div className='contentViewTitleText'>
            {titleText}
          </div>
              <HTMLSelect
                key='viewmodeselect'
                options={ cvModes }
                value={ cvMode }
                onChange={ev => { 
                  const cvm = cvMode
                  const cvms = cvModes
                  cvModeUpdater(ev.currentTarget.value) 
                }}
              />
        </div>
        <div
          className='contentViewBody'
          style={ { overscrollBehavior: 'none' } }
        >
          {contentJSXGetter(cvMode, getContentSize(size))}
        </div>
        { (actions.length !== 0) 
         ?  <div className='contentViewTitleBar'>
              <div className='contentViewButtonBar'>
                <ButtonGroup className='contentViewButtonGroup'>

                  <ActionButtonGroup actions={actions}/>
                </ButtonGroup>
              </div>
            </div>

         : undefined
        }
      </div>
  )
})
