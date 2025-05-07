import * as React from 'react';
import { useState, useEffect } from 'react';

import { isObservable, isObservableProp, runInAction } from 'mobx';

import { observer, PropTypes } from 'mobx-react'

import { v4 as uuidv4 } from 'uuid'

import '../vwr-App.css';

import { CellContent } from './Pres CellContent'
import { makeDivSizeStyle, SizePropsPx } from '../common/commonApp';
import { Button } from '@blueprintjs/core';
import { SplitterLayout } from '../react-splitter-layout/SplitterLayout';

var _ = require('lodash');

const cl = console.log;



export interface ViewerPaneProps {
    size: SizePropsPx,
    content: (size: SizePropsPx) => JSX.Element
    addedStyle?: React.CSSProperties
}


export const ViewerPane = observer((props: ViewerPaneProps) => {

    const {size, content, addedStyle } = props

    const divSizeStyle = makeDivSizeStyle(size)

    return (
        <div
            id='viewerPane'
            style= { { ...divSizeStyle, ...addedStyle } }
        >
            {content(size)}
        </div>

    )

})

export interface ViewerPaneWithSplitterProps extends ViewerPaneProps {
    content2: (size: SizePropsPx) => JSX.Element
    // below props will be validated and corrected in component based on size.width
    secondaryInitialSizeFraction?: number   // will default to 0.50 if not provided
    primaryMinSizePx?: number         // will defualt to 10 if not provided
    secondaryMinSizePx?: number       // ditto
}

export const ViewerPaneWithSplitter = observer((props: ViewerPaneWithSplitterProps) => {

    const splitterBarSizePx: number = 15 // amount we will deduct in calculation of top+bottom area heights, to provide for splitter view bar
    const subPaneTotalWidth = props.size.width.value - splitterBarSizePx
    const primaryMinSizePxValid = Math.min(props.primaryMinSizePx || 10, subPaneTotalWidth)
    const secondaryMinSizePxValid = Math.min(props.secondaryMinSizePx || 10, subPaneTotalWidth)
    const secondaryInitialSizePctValid = Math.max(0.0, Math.min(1.0, (props.secondaryInitialSizeFraction || 0.50)))
    const secondaryInitialSizePxValid = Math.max(secondaryMinSizePxValid, Math.min(secondaryInitialSizePctValid * subPaneTotalWidth, subPaneTotalWidth - primaryMinSizePxValid))


    // need state for splitter size
    // so sub-panes can resize when size of whole pane is changed from above
    const [ pane2Width, updatePane2Width] = useState(secondaryInitialSizePxValid)

cl(`secondary initial size pct prop: ${props.secondaryInitialSizeFraction}`)
cl(`seconary initial size pct valid ${secondaryInitialSizePctValid}`)
cl(`secondary initial size px valid: ${secondaryInitialSizePxValid}`)
cl(`pane2width ${pane2Width}`)

    const pane1Size: SizePropsPx = {
        height: { unit: 'px', constraint: 'fixed', value: props.size.height.value},
        width:  { unit: 'px', constraint: 'fixed', value: subPaneTotalWidth - pane2Width }
    }
    const pane2Size: SizePropsPx = {
        height: { unit: 'px', constraint: 'fixed', value: props.size.height.value},
        width:  { unit: 'px', constraint: 'fixed', value: pane2Width }
    }

    //cl(`ViewerPaneWithSplitter returning`)

    return (
        <SplitterLayout
            vertical={false}
            percentage={false}
            primaryMinSize={primaryMinSizePxValid}
            secondaryMinSize={secondaryMinSizePxValid}
            secondaryInitialSize={secondaryInitialSizePxValid}
            onSecondaryPaneSizeChange={(newSize: number) => { runInAction(()=>updatePane2Width(newSize)) } }
        >
            <ViewerPane key='viewerPane1' size={pane1Size} content={ props.content  }/>
            <ViewerPane key='viewerPane2' size={pane2Size} content={ props.content2 }/>
        </SplitterLayout>
    )
})