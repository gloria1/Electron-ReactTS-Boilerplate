import * as React from 'react';
import { useState } from 'react';

// import blueprint components
import { Button, ButtonGroup, HTMLSelect } from '@blueprintjs/core';

import { action, comparer, computed, makeObservable, observable, override, reaction, runInAction, toJS } from "mobx"
import { observer, PropTypes } from 'mobx-react'


import '../vwr-App.css';

import { CVMode, CVModeTransformers, DivSizeStyle, SizePropPx, SizeProps, SizePropsPx, makeDivSizeStyle } from '../common/commonApp';
import { CR } from './table items CR';
import CodeMirrorView from '../common/codemirrorView';
import { PropItemsCRIItem, genericGroupedKeepDups } from '../common/propMethods';
import { HARInitiator, _initiatorOther, _initiatorParser, _initiatorScript } from '../common/harFormatExtended';
import { _initiatorCallFrame } from '../common/harFormatExtended';
import { _initiatorParent } from '../common/harFormatExtended';
import { TTableCR } from './TTableCR';

import { v4 as uuidv4 } from 'uuid'

var _ = require('lodash');

const cl = console.log;




function jsonStringifyAndTruncLines(obj: Object, linesToShow: number): string {
    var lines = JSON.stringify(obj, null, 2).split('\n')
    if (lines.length > linesToShow) {
        lines = lines.slice(0,linesToShow)
        lines.push('...')
    }
    return lines.join('\n')
}


interface CallFrameWithType extends _initiatorCallFrame {
    type: 'callframe'
}
interface ParentWithType extends _initiatorParent {
    type: 'parent'
}
interface InitPartDivider {
    type: 'divider'
    value: string
}

type HarInitPart = HARInitiator | CallFrameWithType | ParentWithType | InitPartDivider

// flattens initiator structure into a list of 'parts'
// where each 'part' is either a single callframe or a divider that indicates the level
// of the next set of parts in the list
function flattenInitIntoParts(part: HarInitPart): HarInitPart[] {
    const parts: HarInitPart[] = []

    switch (part.type) {
        case 'other':
        case 'parser':
        case 'callframe':
            parts.push(part)
            break
        case 'script':
            parts.push( { type: 'divider', value: 'script'})
            if (part.stack !== undefined) {
                for (let cf of part.stack.callFrames) { const cft = cf as CallFrameWithType; cft.type = 'callframe'; parts.push(cft) }
                if (part.stack.parent !== undefined) { const pt = part.stack.parent as ParentWithType; pt.type = 'parent'; parts.push(...flattenInitIntoParts(pt)) }
            }
            break
        case 'parent':
            parts.push( { type: 'divider', value: `parent (${part.description})` } )
            for (let cf of part.callFrames) { const cft = cf as CallFrameWithType; cft.type = 'callframe'; parts.push(cft) }
            if (part.parent !== undefined) { const pt = part.parent as ParentWithType; pt.type = 'parent'; parts.push(...flattenInitIntoParts(pt)) }
            break
    }



    return parts


}

interface HarInitEnriched {
    initObj: HARInitiator
    snippet: string
    parts: HarInitPart[]
}

interface SourceLoc {
    line: number,
    col: number,
    tag: string
}
interface InitSourceWithLocs {
    sourceRaw: string
    sourceBeaut: string
    locsRaw:   SourceLoc[]
    locsBeaut: SourceLoc[]
}

export interface InitViewProps {
    cr: CR
    cvMode: CVMode
    size?: SizePropsPx
}

export const InitView = observer((props: InitViewProps) => {

    const { cr, cvMode, size } = props


    // extract the har initiator objects
    // filter out webReq initiator objects (identified by existence of 'webReq_initiator' prop, as created in propMethods-server)
    const harInitObjects: HarInitEnriched[] = 
        ((cr['initiatorPropItems'].criItems as PropItemsCRIItem[])
            .map(i => i.object)                                         // extract the initiator objects
            .filter((i: any) => (i['webReq_initiator'] === undefined)) as HARInitiator[])   // filter out any webReq initiators
            .map(hi => { return {
                initObj: hi,
                snippet: jsonStringifyAndTruncLines(hi, 3),
                parts: flattenInitIntoParts(hi),
            }})
        
    const ttable: TTableCR = props.cr.parentTTable as TTableCR


    const initSources: Map<string, InitSourceWithLocs> = new Map()
    // BROKEN???for (let hio of harInitObjects) {
    // BROKEN???    if (hio.initObj.type !== 'other') {
    // BROKEN???        for (let part of hio.parts) {
    // BROKEN???            switch (part.type) {
    // BROKEN???                case 'other':
    // BROKEN???                case 'divider':
    // BROKEN???                case 'script':
    // BROKEN???                case 'parent':
    // BROKEN???                    break
    // BROKEN???                case 'parser':
    // BROKEN???                case 'callframe':
    // BROKEN???                    var source: InitSourceWithLocs
    // BROKEN???                    if (ttable.harIsByurlWOFragDict[part.url].length === 0) {
    // BROKEN???                        source = {
    // BROKEN???                            sourceRaw: 'no harI for this URL',
    // BROKEN???                            sourceBeaut: 'no harI for this URL',
    // BROKEN???                            locsRaw: [],
    // BROKEN???                            locsBeaut: []
    // BROKEN???                        }
    // BROKEN???                        break
    // BROKEN???                    }
    // BROKEN???                    else if (ttable.harIsByurlWOFragDict[part.url].length > 1) {
    // BROKEN???                        // check if they all have the same getContent value
    // BROKEN???                        // (ignore getContent that is '' or undefined)
    // BROKEN???                        // if so, we can just use the first of them so fall through to next block
    // BROKEN???                        const urlContentSet = new Set(ttable.harIsByurlWOFragDict[part.url].map(h => h['getContent']).filter(gc => ((gc !== '' && (gc !== undefined)))))
    // BROKEN???                        if (urlContentSet.size > 1) {
    // BROKEN???                            source = {
    // BROKEN???                                sourceRaw:   'multiple harIs with this URL',
    // BROKEN???                                sourceBeaut: 'multiple harIs with this URL',
    // BROKEN???                                locsRaw: [],
    // BROKEN???                                locsBeaut: []
    // BROKEN???                            }
    // BROKEN???                            break
    // BROKEN???                        }
    // BROKEN???                    }
    // BROKEN???                    source = initSources.get(part.url) || { 
    // BROKEN???                        sourceRaw: ttable.harIsByurlWOFragDict[part.url][0]['getContent'],
    // BROKEN???                        sourceBeaut: '',   // will be set later
    // BROKEN???                        locsRaw: [],
    // BROKEN???                        locsBeaut: []
    // BROKEN???                    }
    // BROKEN???                    // now we can add loc informatino for this part to source
    // BROKEN???                    part.tag = `/* initiator location tag: ${uuidv4()} */`
    // BROKEN???                    if (part.type === 'parser') source.locsRaw.push( { line: part.lineNumber || 0, col: 0, tag: part.tag } )
    // BROKEN???                    else source.locsRaw.push( { line: part.lineNumber, col: part.columnNumber, tag: part.tag } )
    // BROKEN???                    // put source in map
    // BROKEN???                    initSources.set(part.url, source)
// BROKEN???
    // BROKEN???                    break
    // BROKEN???            }
    // BROKEN???            
    // BROKEN???
    // BROKEN???        }
    // BROKEN???        
    // BROKEN???    }
    // BROKEN???}

    // NOW PROCESS LOCS
    //    SORT
    //    INSERT TAGS
    //    BEAUTIFY
    //    FIND TAGS, POPULATE LOCSBEAUT, DELETE TAGS



/*
    build out dictionary of initiators here
    need to walk through callFrame parts
            get their content
            calculate beautified locations (see steps.txt)
            resulting structure needs to be:
                map, key is url (which then points to a harI getContent)
                map items are:
                    array of locations
                    sorted 
                    each 'location' is
                        {
                            rawLoc:   { lineNo: number, colNo: number },   // 0-based, as from har
                            beautLoc: { lineNo: number, colNo: number },   // 0-based
                            locTag: string    // will be /* <uuid>
                        }
                build by
                    iterate parts and build map
                    iterate map
                        sort each location array by location
                        calculate beautLoc
                            insert tags
                            beautify
                            split into array of lines
                            find tags - in reverse order
                                populate locTag - how?
                                remove tag

    change single init view so that
            left div = parts
            right div = detail for selected part

    codemirror highlighting not appearing for any cmview (at least on mmnini512)


*/





    // will be called with size 'max' for popup
    // and size 'fixed' for detail pane
    // convert 'max' to 'fixed' for width - for popup, just make it take max size without checking if the contents would fit in a smaller size
    const sizeToUse: SizePropsPx = (size === undefined)
      ? { height: { unit: 'px', constraint: 'fixed',                value: window.innerHeight * 0.8 }, width: { unit: 'px', constraint: 'fixed', value: window.innerWidth * 0.8 } }
      : { height: { unit: 'px', constraint: size.height.constraint, value: size.height.value }, width: { unit: 'px', constraint: 'fixed', value: size.width.value } }
    const leftSize: SizePropsPx = _.cloneDeep(sizeToUse)
    leftSize.width.value = leftSize.width.value * 0.3
    const rightSize: SizePropsPx = _.cloneDeep(sizeToUse)
    rightSize.width.value = sizeToUse.width.value - leftSize.width.value
    var leftDiv: JSX.Element = <div>stub1</div>
    var rightDiv: JSX.Element = <div>stub2</div>

    var leftDivItems: JSX.Element[] = []
    const [ selectedItem, updateSelectedItem ] = useState(0)   // index into leftDivItems, or -1 if nothing selected

    const leftDivHeaderStyle = { width: '100%', borderStyle: 'none', borderWidth: '1' , borderColor: 'gray', backgroundColor: 'blue', color: 'white' }
    const leftDivItemStyle   = { width: '100%', borderStyle: 'solid', borderWidth: '1' , borderColor: 'gray' }

     
    /*
      fix up basic views for single and multiple
        single - flatten init obj into list of items (truncated) - selected item in full right pane
            implement splitting init into parts
            FOR TESTING - MAKE VIEW INIT OBJ ON LEFT, VSTACK OF PARTS IN DIVS ON RIGHT
        
            make left div scrollable
            fix bordering on left div
                why double borders?
                borders on items should be on full item, not 
            revise single display to populate left and right divs
            styling - dividers background color blue
        DONE multi - flatten list of inits into list of truncated inits - selected item in full right pane


    */

    if (harInitObjects.length === 1) {
        const initObj = harInitObjects[0]

        leftDivItems = [ <div>{JSON.stringify(initObj, null, 2)}</div>]
        leftDiv = <div>{leftDivItems}</div>

        rightDiv = 
            <div>
                {initObj.parts.map(p => 
                    <div style = {leftDivItemStyle}>{JSON.stringify(p, null, 2)}</div>
                )}
            </div>


      
    
  
    }
    else {
        leftDivItems = [ 
            <div style = { leftDivHeaderStyle }>
                {`${harInitObjects.length} har initiators`}
            </div>
        ]
        leftDivItems.push(...(harInitObjects.map((hi, i) => { return (
            <div 
                key={i}
                style = { { ...leftDivItemStyle, backgroundColor: (i === selectedItem) ? 'lightblue' : 'white' } }
                onClick={()=>updateSelectedItem(i)}
            >
                {harInitObjects[i].snippet}
            </div>
        )})))

        leftDiv = 
            <div>
                {leftDivItems}
            </div>

        rightDiv =
            <CodeMirrorView
                value={
                    ((selectedItem >= 0) && (selectedItem < harInitObjects.length))
                        ? JSON.stringify(harInitObjects[selectedItem].initObj, null, 2)
                        : 'none'
                }
                mode={cvMode}
                size={ rightSize }
                editable={false}
            />
    }



    return (
      <div 
        style={ { 
          display: 'flex',
          flexDirection: 'row',
          width: `${window.innerWidth * 0.9}px` 
        } }
      >
        <div
          style={ {...makeDivSizeStyle(leftSize), borderStyle: 'double', borderWidth: '8px',  overflow: 'auto' } }
          >
          {leftDiv}
        </div>
        <div
          style={ { ...makeDivSizeStyle(rightSize), overflow: 'auto' } }
          >
          {rightDiv}
        </div>
      </div>
    )


})

