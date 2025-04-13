
import React from "react"

import { Button, ButtonGroup, ControlGroup, Intent } from "@blueprintjs/core"

import '@blueprintjs/popover2/lib/css/blueprint-popover2.css'

import { v4 as uuidv4 } from 'uuid'

import { action, computed, makeObservable, observable, runInAction, toJS } from "mobx"



import { ICRIFromMongo, WSWQueuedOp, WSWMsgOpTypes, WSWMsgOpResultTypes, WSWMsgConfigOpTypes, WSWMsgConfigOpResultTypes } from "../common/commonAll"
import { CVMode, CVModeTransformers, SizePropsPx,  } from "../common/commonApp"
import { generic, TIPropFunctionMap, TIPropFunctions } from "../common/propMethods"
import { Config, ConfigI, ConfigG } from "./table items Config"
import { ColData, SortDirs, TTable, TTableBaseConstructorProps } from "./TTable base Obj"
import { ConfigItemRaw,  tools, ActionAllowDenyNA, CRPropsToTestVsRuleBrowser, PHPropsToTestVsRulePihole, SetMDRaw, SetRaw, makeNewSetRaw, makeNewConfigItemRaw, ConfigRuleBrowserDNR, DecisionInfoPiholeQuery, ConfigSetRaw } from "../common/configTypesTypes"
import { configItemUpdates, configSetUpdates, addRemoveConfigItemRaw, dNRRequestMethodStrings, dNRResourceTypeStrings } from '../common/configTypesUtility'
import { TI, TII } from "./table items base"
import { CRI } from "./table items CR"

import CodeMirrorView from "../common/codemirrorView"
import { Tooltip2 } from "@blueprintjs/popover2"
import { RenderMode } from "@blueprintjs/table"
import { PHI2Res } from "./table items PH2"
import { WebSocketWrapperBrowser2 } from "../common/WebSocketWrapperBrowser"



const cl = console.log
const ct = console.table





// generic functions for config properties

// general rules for how 'active' and 'val' are determined
//  REWRITE THESE - AND MAKE THEM TIE BACK TO DOC IN CONFIGTYPES.TS


// includes a generic validation method
const configGeneric : TIPropFunctions = {
  hasPropItems: generic.hasPropItems,
  // conversion to apply on loading from mongo into TTable
  convertOnLoad(cr: ICRIFromMongo, propName: string): void { return },
  testMethod: generic.testMethod,
  val(ti: ConfigI, propName: string): number {
    let result = 0
    for (let toolname in tools) {
      if (ti[toolname]) result |= tools[toolname].props[propName].val(ti[propName]) ? 0 : tools[toolname].mask
    }
    return result
  },
  active(ti: ConfigI, propName: string): boolean {
    for (let toolname in tools) if (tools[toolname].props[propName].active(ti)) return true
    return false
  },
  computeGroupProp(tig: ConfigG, children: ConfigI[], propName: string) : string | number | undefined { return undefined },
  singleLineString(propName: string, ti: ConfigI): string {
      if (ti[propName] === undefined) return '---'
      else return ti[propName].toString()
  },
  singleLineJSX(propName: string, ti: ConfigI, rowIndex: number, colIndex: number): JSX.Element | string {
    if (ti[propName] === '') return ''
    else {
      let color: string
      if (propName === 'tiInfo') color = 'black'
      else if (ti.tempItem === true) color = 'orange'
      else if (mapPMViewerConfig[propName].active(ti, propName) === false) color = 'lightgray'
      else if (ti.addedPropVals[propName] !== 0) color = 'red'
      else color = 'black'
      return (
        <span
          style={ {
            // DOESN'T WORK backgroundColor: hasFocus ? 'yellow' : 'inherit',
            width: '100%', color: color
          } }
        >
          {configGeneric.singleLineString(propName, ti)}
        </span>
      )
    }
  },
  multiLineString(ti: ConfigI, propName: string, includeCount: boolean, beautifier: CVMode): string {
    if (ti[propName] === undefined) return ''
    else return CVModeTransformers[beautifier](ti[propName].toString())
  },
  contentViewJSX(ti: ConfigI, propName: string, includeCount: boolean, beautifier: CVMode): JSX.Element {
    if (ti[propName] === undefined) return <div className='ttCellMultiLineJSX'>---</div>
    else return <div className='ttCellMultiLineJSX'>{CVModeTransformers[beautifier](ti[propName].toString())}</div>
  },

}








const configExpirationTime : TIPropFunctions = {
  hasPropItems: generic.hasPropItems,
  convertOnLoad: configGeneric.convertOnLoad,
  testMethod: generic.testMethod,
  val(ti: ConfigI, propName: string) { return 0 },
  active: configGeneric.active,  
  computeGroupProp: configGeneric.computeGroupProp,
  singleLineString: configGeneric.singleLineString,
  singleLineJSX(propName: string, ti: ConfigI): JSX.Element | string {
    if ((ti.tempItem === false) || (ti.tool_pihole === false)) return ''
    else {
      const secondsRemaining = (ti.expirationTime - Number.parseInt(ti.parentTTable.parentDnDApp.server.lastServerStateReceived.serverTime)) / 1000
      // double tilde (~~) does two bitwise nots, which has the same effect as integer floor
      const minutesRemaining = ~~(secondsRemaining / 60)
      const secondsToShow = ~~(secondsRemaining - minutesRemaining * 60)
      const displayString = minutesRemaining.toString() + ':' + ((secondsToShow >= 10) ? '' : '0') + secondsToShow.toString()
      return <div style={ { display: 'flex', flexDirection: 'row', justifyContent: 'left', alignItems: 'center', color: 'white', backgroundColor: 'red' } }>
          <pre key='pre1'>  </pre>
          {`${displayString}`}
          <pre key='pre2'>  </pre>
          <Button
                key='removebutton'
                style={{ fontSize: 'xx-small', minHeight: 12 }}
                small={true}
                text='X'
                onClick={()=>ti.parentTTable.removeTempItems([ti._id])}
          />
          <pre key='pre3'>  </pre>
          <Button
                key='makenontempbutton'
                style={{ fontSize: 'xx-small', minHeight: 12 }}
                small={true}
                text='-> NonTemp'
                onClick={()=>ti.parentTTable.tempToNonTemp([ti._id])}
          />
        </div>      
    }
  },
  multiLineString: configGeneric.multiLineString,
  contentViewJSX: configGeneric.contentViewJSX,
}




const configValResultForItem : TIPropFunctions = {
  hasPropItems: generic.hasPropItems,
  convertOnLoad: configGeneric.convertOnLoad,
  testMethod: generic.testMethod,
  val(ti: ConfigI, propName: string) { return 0 },
  active: configGeneric.active,  
  computeGroupProp: configGeneric.computeGroupProp,
  singleLineString: configGeneric.singleLineString,
  singleLineJSX(propName: string, ti: ConfigI): JSX.Element | string {
    const s = configValResultForItem.singleLineString(propName, ti)
    // if s is empty, return s, so that CellContent will wrap it in div with whitespace, so it will be click-able
    if (s === '') return s
    else return <div style={ { alignItems: 'center', color: 'white', backgroundColor: 'red' } }>{ti[propName]}</div>
  },
  multiLineString(ti: ConfigI, propName: string, includeCount: boolean, beautifier: CVMode): string {
    if (ti.parentTTable === undefined) return ''
    else return ti.addedPropValDetails.join('\n')
  },
  contentViewJSX(ti: ConfigI, propName: string, includeCount: boolean, beautifier: CVMode): JSX.Element {
    if (ti[propName] === undefined) return <div className='ttCellMultiLineJSX'>---</div>
    else return <div className='ttCellMultiLineJSX'>{configValResultForItem.multiLineString(ti, propName, includeCount, beautifier)}</div>
  },
}



// for the tools column, which shows a series of buttons, one for each tool
const configToolStatus : TIPropFunctions = {
  hasPropItems: generic.hasPropItems,
  convertOnLoad: configGeneric.convertOnLoad,
  testMethod: generic.testMethod,
  computeGroupProp: configGeneric.computeGroupProp,
  val(ti: ConfigI, propName: string): number {
    // returns max over active tools
    let result: number = 0
    if (ti.parentTTable !== undefined) {
      for (let t in tools) {
        if (ti[t] === true) result |= ti.addedPropVals[t]
      }
    }
    return result
  },
  active: configGeneric.active,  
  singleLineString(propName: string, ti: ConfigI): string {
    if (ti.parentTTable === undefined) return ''
    else return Object.keys(tools).map(t => `${t}: ${ti[t].toString()}`).join(', ')
  },
  singleLineJSX(propName: string, ti: ConfigI, rowIndex: number, colIndex: number): JSX.Element | string {
    if (ti.parentTTable === undefined) return ''
    else return (
      // Buttons now depend on ti.toolStatus, so each Button will now observe changes in associated tool_ prop
      <ControlGroup fill={false} vertical={false}>
        {Object.keys(tools).map(t => 
          <Tooltip2 content={t} key={t}>
            <Button intent={((ti.toolStatus & tools[t].mask) !== 0) ? 'primary' : 'none'} small={true} text={t.slice(5,6)} style={{fontSize: 'xx-small', width: '20px', minWidth: '20px'}}
                onClick={(ev: React.MouseEvent)=>{
                  if (ti.tempItem === true) return  // disallow changes to temp items      

                  const hi: string[] = []
                  // only stopPropagation if this is a plain click
                  // only change the prop if this is a plain click
                  if ((ev.shiftKey || ev.metaKey || ev.ctrlKey) === false) {
                    const newValue = ! ti[t]
                    hi.push(`changing prop val for this row to ${!ti[t]}`)
                    runInAction(()=>{ ti[t] = newValue })
                    if (ti.parentTTable.selection.selRows.has(rowIndex)) {
                      hi.push(`changing prop values for all rows in selection`)
                      for (let i of Array.from(ti.parentTTable.selection.selRows)) ti.parentTTable.visibleSortedExpandedMap[i][t] = newValue
                    }
                    ev.stopPropagation()
                    ev.preventDefault()
                  }            
                  //onClickReporter(ev, 'configTools cell', hi)
                }
            }/>
          </Tooltip2>
        )}
      </ControlGroup>
    )
  },
  multiLineString(ti: ConfigI, propName: string, includeCount: boolean, beautifier: CVMode): string {
    if (ti.parentTTable === undefined) return ''
    else return Object.keys(tools).map(t => `${t}: ${ti[t].toString()}`).join('\n')
  },
  contentViewJSX(ti: ConfigI, propName: string, includeCount: boolean, beautifier: CVMode): JSX.Element {
    if (ti.parentTTable === undefined) return <div><pre> </pre></div>
    else return (
      <ControlGroup fill={false} vertical={true}>
        {Object.keys(tools).map(t => 
          // see notes on singleLineJSX re: using Button intead of Checkbox
          <Button intent={ti[t] ? 'primary' : 'none'} text={t}
            key={t}
            onClick={(ev: React.MouseEvent)=>{
              if (ti.tempItem === true) return  // disallow changes to temp items      

              //cl(`prior val: ${ti[t]}`)
              ti[t] = ! ti[t]
              ev.stopPropagation()
              //cl(`new val: ${ti[t]}`)
              ev.preventDefault()
            }
          }/>

        )}
      </ControlGroup>
    )
  },
}


// NOTE - STILL NEED THIS FOR THE val AND active methods,
// EVEN THOUGH WE ARE NOT RENDERING A COLUMN FOR EACH TOOL ANY MORE
// methods for control of whether a tool is active
// OBSOLETE - host_ IS NO LONGER PART OF CONFIGITEM // validation returns 1 if tool is active but no hosts are active with that tool
const configBooleanTool : TIPropFunctions = {
  hasPropItems: generic.hasPropItems,
  convertOnLoad: configGeneric.convertOnLoad,
  testMethod: generic.testMethod,
  val(ti: ConfigI, propName: string): number {
    // OBSOLETE if (ti[propName] === false) return 0    // always return 0 if tool not active
    // OBSOLETE else {
    // OBSOLETE   for (let h in (ti.parentTTable as TTableConfig).hosts) {
    // OBSOLETE     let hostEntry = ti.parentTTable.parentDnDApp.server.lastServerStateReceived.downstreamHosts[h]
    // OBSOLETE     if (hostEntry === undefined) hostEntry = ti.parentTTable.parentDnDApp.server.lastServerStateReceived.upstreamHosts[h]
    // OBSOLETE     if (
    // OBSOLETE       ti[h]
    // OBSOLETE       && (hostEntry.tools[propName] !== undefined)
    // OBSOLETE     )
    // OBSOLETE       return 0
    // OBSOLETE   }
    // OBSOLETE }
    // OBSOLETE return 1
    return 0
  },
  active: configGeneric.active,
  computeGroupProp: configGeneric.computeGroupProp,
  singleLineString: configGeneric.singleLineString,
  singleLineJSX: configGeneric.singleLineJSX,
  multiLineString: configGeneric.multiLineString,
  contentViewJSX: configGeneric.contentViewJSX,
}


// generates methods for a prop presented as a set of buttons
// argument passed in is array of values for each button, the button text for the gui, and the underlying prop value
function configButtonGroup(butInfo: {buttonText: string, value: string, intentIfSelected: Intent}[]): TIPropFunctions {
  return {
    hasPropItems: generic.hasPropItems,
    convertOnLoad: configGeneric.convertOnLoad,
    testMethod: generic.testMethod,
    val: configGeneric.val,
    active: configGeneric.active,
    computeGroupProp: configGeneric.computeGroupProp,
    singleLineString: configGeneric.singleLineString,
    singleLineJSX(propName: string, ti: ConfigI, rowIndex: number, colIndex: number): JSX.Element | string {
      return ( 
        <ButtonGroup style={{ paddingLeft: '10px', paddingRight: '10px', alignItems: 'left', backgroundColor: 'inherit'  } }>
          {butInfo.map(b => {
            return (
              <Button key={b.buttonText} style={{fontSize: 'xx-small', minHeight: 12 }}  text={b.buttonText} 
                                disabled={ mapPMViewerConfig[propName].active(ti, propName) == false}
                                intent={
                                 // (mapPMViewerConfig[propName].active(ti, propName))
                                    ti[propName]===b.value ? b.intentIfSelected : 'none' 
                                 //   : 'none'
                                } 
                                onClick={(ev: React.MouseEvent)=>{ 
                                  if (ti.tempItem === true) return  // disallow changes to temp items      

                                  const hi: string[] = []
                                  // only stopPropagation if this is a plain click
                                  // only change the prop if this is a plain click
                                  if ((ev.shiftKey || ev.metaKey || ev.ctrlKey) === false) {
                                    const newValue = b.value
                                    hi.push(`changing prop val for this row to ${newValue}`)
                                    ti[propName] = newValue
                                    if (ti.parentTTable.selection.selRows.has(rowIndex)) {
                                      hi.push(`changing prop values for all rows in selection`)
                                      for (let i of Array.from(ti.parentTTable.selection.selRows)) ti.parentTTable.visibleSortedExpandedMap[i][propName] = newValue
                                    }
                                    ev.stopPropagation()
                                    ev.preventDefault()
                                  }            
                                  //onClickReporter(ev, 'configBoolean cell', hi)
                                }}
                            />
            )
          })}
        </ButtonGroup>
      )
    },
    multiLineString: configGeneric.multiLineString,
    contentViewJSX: configGeneric.contentViewJSX,
  
  }
}



// methods for text input props
const configInputViaPopover : TIPropFunctions = {
  hasPropItems: generic.hasPropItems,
  convertOnLoad: configGeneric.convertOnLoad,
  testMethod: generic.testMethod,
  val: configGeneric.val,
  active: configGeneric.active,
  computeGroupProp: configGeneric.computeGroupProp,
  singleLineString: configGeneric.singleLineString,
  singleLineJSX: configGeneric.singleLineJSX,
  multiLineString: configGeneric.multiLineString,
  contentViewJSX: (ti: ConfigI, propName: string, includeCount: boolean, beautifier: CVMode, size?: SizePropsPx)=>{
    return (
      <CodeMirrorView
        value={ti[propName]}
        mode={beautifier}
        // OBSOLETE initialFocus={'content'}
        // OBSOLETE initialMatchPattern={''}
        editable={ti.tempItem === false}
        lineWrapping={true}
        size={ size }
        onChangeHandler={(newValue: string)=>runInAction(()=> {
          ti[propName] = newValue
        } )}
        // not working properly - fix and then reinstate  size={size}
      />
    )
  },
}
   

export const mapPMViewerConfig: TIPropFunctionMap = {
  tiInfo                : configGeneric,
  valStringForItem      : configValResultForItem,
  modified              : configGeneric,
  timestamp             : configGeneric,
  tempItem              : configGeneric,
  expirationTime        : configExpirationTime,
  _id                   : configInputViaPopover,
  notes                 : configInputViaPopover,  // trying to go without editing in-cell   configTextInput,
  priority              : configInputViaPopover,
  // OBSOLETE hosts                 : configHosts,
  toolStatus            : configToolStatus,
  requestAction         : configButtonGroup([
    {buttonText: 'Allow', value: 'allow', intentIfSelected: 'success'},
    {buttonText: 'Deny',  value: 'deny',  intentIfSelected: 'danger'}, 
    {buttonText: 'NA',    value: 'NA',  intentIfSelected: 'none'}, 
  ]),
  jsAction              : configButtonGroup([
    {buttonText: 'Deny',  value: 'deny',  intentIfSelected: 'danger'},
    {buttonText: 'NA',    value: 'NA',  intentIfSelected: 'none'}, 
  ]),
  reqHdrAction              : configButtonGroup([
    {buttonText: 'Mod',  value: 'modify',  intentIfSelected: 'danger'},
    {buttonText: 'NA',    value: 'NA',  intentIfSelected: 'none'}, 
  ]),
  resHdrAction              : configButtonGroup([
    {buttonText: 'Mod',  value: 'modify',  intentIfSelected: 'danger'},
    {buttonText: 'NA',    value: 'NA',  intentIfSelected: 'none'}, 
  ]),
  sslbumpAction         : configButtonGroup([
    {buttonText: 'Bump',   value: 'bump',      intentIfSelected: 'success'}, 
    {buttonText: 'Splice', value: 'splice',    intentIfSelected: 'warning'}, 
    {buttonText: 'Term.',  value: 'terminate', intentIfSelected: 'danger'}
  ]),
  reqHdrMods            : configInputViaPopover,  
  resHdrMods            : configInputViaPopover,  
  hostDomainPatterns    : configInputViaPopover,  
  urlRegexPattern       : configInputViaPopover,  
  initiatorDomains      : configInputViaPopover,  
  excludedInitiatorDomains : configInputViaPopover,  
  excludedRequestDomains: configInputViaPopover,
  requestMethods        : configInputViaPopover,
  excludedRequestMethods: configInputViaPopover,
  resourceTypes         : configInputViaPopover,
  excludedResourceTypes : configInputViaPopover,
  tabIds                : configInputViaPopover,
  excludedTabIds        : configInputViaPopover,
  remoteAddresses       : configInputViaPopover,  
  lsprocess             : configInputViaPopover,  
  lsvia                 : configInputViaPopover,  
  lsremote              : configInputViaPopover,  
  lsdirection           : configButtonGroup([
    {buttonText: 'Incoming', value: 'incoming', intentIfSelected: 'primary'}, 
    {buttonText: 'Outgoing', value: 'outgoing', intentIfSelected: 'primary'}
  ]),
  lsdisabled            : configInputViaPopover ,
  lsports               : configInputViaPopover,  
  lsprotocol            : configInputViaPopover,  
}


// declare default ColData array for table columns
const defaultColsViewerConfig: ColData[] = [

  ['1', 'tiInfo',                        'Item Info',      'ttCellPreWrap','', '70' , 'none'],
  ['1', 'valStringForItem',              'Invalid For',    'ttCellPreWrap','', '80' , 'none'],
  ['1', 'expirationTime',                'Expir. Time',    'ttCellPreWrap','', '120' , 'none'],
  
  ['1', '_id',                           'ID',             'ttCellPreWrap','', '80' , 'none'],
  // OBSOLETE  ['1', 'hosts',                         'Hosts',          'ttCellPreWrap','', '80' , 'none'],
  ['1', 'toolStatus',                         'Tools',          'ttCellPreWrap','', '100' , 'none'],
  ['1', 'priority',                      'Priority',       'ttCellPreWrap',`Positive integer
  Higher values take precedence

  Input values must be multiple of 10
  
  For browser rules, header mod dNR rules will get input priority + 1,
  since header mod rules with same priority as matching allow rule are ignored (contra the spec)
  For pihole, all rules must have same priority (100) (since pihole has no priority mechanism)
  For little snitch, can only be 100=regular or 200=high

  STANDARD POLICY SCHEME:
    1) default deny request - priority 100 - can apply to browser, pihole, other tools
    2) deny JS - priority 200 (becomes priority 201 in dNR)
    3) modify headers - priority 300 (becomes priority 301 in dNR)
    4) deny post, put requests - priority 400
  OVERRIDES (non-temp):
    1) allow request - priority 110 - so overrides default deny, but not header mod or deny post rules
    2) allow JS - priority 210 - so overrides default deny and deny JS
    3) allow JS no header mods - priority 310
    4) allow full - priority 410
  TEMP OVERRIDES (created from popup)
    0) tabId criterion limits to one tab
    1) deny request - priority 1100
    2) allow request, deny JS, standard header mods - priority 1210 - excludes requestMethods post, put
    3) allow request, standard header mods - priority 1310 - excludes requestMethods post, put
    4) allow full - priority 1410


  `, '70' , 'none'],
  ['1', 'requestAction',                 'Req Action',     'ttCellPreWrap','', '140' , 'none'],
  ['1', 'jsAction',                      'JS Action',      'ttCellPreWrap','', '90' , 'none'],
  ['1', 'notes',                         'Notes',          'ttCellPreWrap',
`Cannot include any kind of quote
    \' \` or \"`, '120' , 'none'],
  ['1', 'hostDomainPatterns', 'Host/Domain Regex Patterns',          'ttCellPreWrap',  
`Note: , and \\n are delimiters, spaces are stripped, # at start of item means comment

Three forms:
  (1) a.b - If valid as plain domain, will only match entire hostname exactly
  (2) .a.b - If leading dot followed by domain, will also match sub-domains
  (3) Else will be treated as regex pattern to be tested against ONLY THE HOSTNAME

How translated for tools (unless using ;invert - see below for that):
  For (1) and (2) 
    for browser (dNR), becomes a regexFilter (for 1) or requestDomain (for 2)
    for pihole, . replaced with \\., then becomes a regex for whitelist/blacklist
    for little snitch, becomes a remote-hosts or remote-domains entry
  For (3)
    for browser, becomes a regexFilter
    for pihole, . replaced with \\. becomes a regex for whitelist/blacklist
    for little snitch, considered invalid

Inversion
  If ;invert is at end of pattern, then result of pattern match will be inverted
  i.e., if pattern IS found in request, rule will NOT apply
  This is implemented as:
    For browser, considered invalid
    For pihole, regex sent to pihole has the ;invert at the end - see pihole docs
    For little snitch, considered invalid
    For squid, TBD
`, '150' , 'hostDomainPattern'],
['1', 'excludedRequestDomains', 'Ex. Domains',          'ttCellPreWrap',  `Browser only

Must enter valid domains with leading dots
since declarativeNetRequest will also match subdomains

Can co-exist with affirmative domain criteria, but this one will take precedence
Rule will NOT MATCH if request has any of these

Note: , and \\n are delimiters, spaces are stripped, # at start of item means comment`, '100' , 'none'],
['1', 'requestMethods', 'Request Methods',          'ttCellPreWrap',  `Browser only

Cannot co-exist with excludedRequestMethods
If any specified, this rule will NOT match any non-http(s) requests

Valid values are:\n'${dNRRequestMethodStrings.join('\'\n\'')}'

Note: , and \\n are delimiters, spaces are stripped, # at start of item means comment`, '100' , 'none'],
['1', 'urlRegexPattern',              'URL Regex Pattern',            'ttCellPreWrap',`Browser only

Tests against entire URL

Single value only - whatever is entered is treated as part of regex pattern

Follows RE2 syntax (subset of Javascript regex) - see https://github.com/google/re2/wiki/Syntax

BUT REGEX IS ONLY VALIDATED AS A JAVASCRIPT REGEX - IF IT IS NOT VALID AS RE2,
IT WILL FAIL ON ATTEMPTING TO COMMIT TO DECLARATIVENETREQUEST API

`, '200' , 'none'],
['1', 'resourceTypes', 'Resource Types',          'ttCellPreWrap',  `Browser only

OPEN QUESTION: DOC SAYS IF NEITHER resourceTypes NOR excludedResourceTypes ARE SPECIFIED,
"ALL RESOURCE TYPES EXCEPT "main_frame" ARE BLOCKED - NOT SURE WHAT THIS MEANS

*** SO, WE REQUIRE AT LEAST ONE VALUE HERE FOR BROWSER ***

Cannot co-exist with excludedResourceTypes

Valid values are:
<any> (will be converted to array of all dNR resource types for browser rule, also acceptable for pihole)
'${dNRResourceTypeStrings.join('\'\n\'')}'

Note: , and \\n are delimiters, spaces are stripped, # at start of item means comment`, '100' , 'none'],
['1', 'excludedResourceTypes', 'Ex. Resource Types',          'ttCellPreWrap',  `Browser only

OPEN QUESTION: DOC SAYS IF NEITHER resourceTypes NOR excludedResourceTypes ARE SPECIFIED,
"ALL RESOURCE TYPES EXCEPT "main_frame" ARE BLOCKED - NOT SURE WHAT THIS MEANS


Rule will NOT MATCH if request has any of these
Cannot co-exist with resourceTypes

Valid values are:
<any> (will be converted to array of all dNR resource types for browser rule)
'${dNRResourceTypeStrings.join('\'\n\'')}'

Note: , and \\n are delimiters, spaces are stripped, # at start of item means comment`, '200' , 'none'],
['1', 'initiatorDomains',         'Initiator Domains',      'ttCellPreWrap',`Browser only
Must enter valid domains with leading dots
since declarativeNetRequest will also match subdomains

Note: , and \\n are delimiters, spaces are stripped, # at start of item means comment`, '150' , 'none'],
['1', 'excludedInitiatorDomains',         'Excl. Init. Domains',      'ttCellPreWrap',`Browser only

Must enter valid domains with leading dots
since declarativeNetRequest will also match subdomains\nRule will NOT MATCH if request has any of these

Can co-exist with initiatorDomains - this will take precedence

Note: , and \\n are delimiters, spaces are stripped, # at start of item means comment`, '150' , 'none'],
['1', 'excludedRequestMethods', 'Ex. Request Methods',          'ttCellPreWrap',  `Browser only

Rule will NOT MATCH if request has any of these
Cannot co-exist with requestMethods

Valid values are:\n'${dNRRequestMethodStrings.join('\'\n\'')}'

Note: , and \\n are delimiters, spaces are stripped, # at start of item means comment`, '200' , 'none'],

['1', 'tabIds', 'Tab Ids',          'ttCellPreWrap',  'Browser only\n\nNote: , and \\n are delimiters, spaces are stripped, # at start of item means comment', '80' , 'none'],
  ['1', 'excludedTabIds', 'Ex. TabIds',          'ttCellPreWrap',  'Browser only\nRule will NOT MATCH if request has any of these\n\nNote: , and \\n are delimiters, spaces are stripped, # at start of item means comment', '80' , 'none'],
  ['1', 'reqHdrAction',                      'Req Hdr Action',      'ttCellPreWrap','', '90' , 'none'],
  ['1', 'resHdrAction',                      'Res Hdr Action',      'ttCellPreWrap','', '90' , 'none'],
  ['1', 'reqHdrMods',                      'Req Hdr Mods',      'ttCellPreWrap',`
  Note: \\n is delimiter (NOT COMMA, that can be part of header value)
  # at start of line means comment
  
  Three operations:
  SET name: value
  REM name
  (request header mods cannot append)

  `, '240' , 'none'],
  ['1', 'resHdrMods',                      'Res Hdr Mods',      'ttCellPreWrap',`
  Note: \\n is delimiter (NOT COMMA, that can be part of header value)
  # at start of line means comment
  
  Three operations:
  SET name: value
  APP name: value
  REM name

  `, '240' , 'none'],
  ['1', 'sslbumpAction',                 'sslbump Action', 'ttCellPreWrap','Squid only', '160' , 'none'],
  ['1', 'remoteAddresses',               'Addresses',      'ttCellPreWrap','Little Snitch only\n\nNote: , and \\n are delimiters, spaces are stripped, # at start of item means comment', '100' , 'none'],
  ['1', 'lsprocess',                     'ls Process',      'ttCellPreWrap','Little Snitch only\nADD NOTES ON VALID VALUES (HOW TO GET PROCESS IDENTIFIER?)', '70' , 'none'],
  ['1', 'lsvia',                         'ls Via',      'ttCellPreWrap','Little Snitch only', '70' , 'none'],
  ['1', 'lsremote',                      'ls Remote',      'ttCellPreWrap','Little Snitch only\nADD NOTES ON VALID VALUES', '70' , 'none'],
  ['1', 'lsdirection',                   'ls Direction',      'ttCellPreWrap','Little Snitch only\nADD NOTES ON VALID VALUES', '120' , 'none'],
  ['1', 'lsdisabled',                    'ls Disabled',      'ttCellPreWrap','Little Snitch only', '70' , 'none'],
  ['1', 'lsports',                       'ls Ports',      'ttCellPreWrap','Little Snitch only\n\nNote: , and \\n are delimiters, spaces are stripped, # at start of item means comment', '70' , 'none'],
  ['1', 'lsprotocol',                    'ls Protocol',      'ttCellPreWrap','Little Snitch only\nADD NOTES ON VALID VALUES', '70' , 'none'],
].map((v: string[]) => {return new ColData(v[1], v[2], v[4], SortDirs.none, 0, parseInt(v[5]), v[3], Number.parseInt(v[0]), v[6] as CVMode)})




export interface TTableConfigConstructorProps extends Omit<TTableBaseConstructorProps, 'tableType' | 'tiConstructor' | 'initialColData' | 'tiPropFunctions'> {
  // OBSOLETE parentServiceOpHandler: ServiceOperationHandler
  serverActive: boolean
  browserActive: boolean
}

export class TTableConfig extends TTable {
    serverActive: boolean
    browserActive: boolean
    // constraining type of root to ConfigG
    root: ConfigG = new ConfigG(this)
    pasteBuffer: {
      isCopy: boolean  // if true, this is a copy of items still in main table, therefore, on paste we need to assign new _id props
      items: ConfigItemRaw[]
    } = {isCopy: false, items: [] }
    lastNonTempMDPulledFromOrPushedToIfS: SetMDRaw = { id: 'TTableConfig default init', timestamp: 0, modified: true, notes: 'TTableConfig default init', lastIdSaved: 'TTableConfig default init' }
    lastNonTempMDPulledFromOrPushedToIfB: SetMDRaw = { id: 'TTableConfig default init', timestamp: 0, modified: true, notes: 'TTableConfig default init', lastIdSaved: 'TTableConfig default init' }
    // DON'T NEED THIS, OR MAKE IT COMPUTED (DERIVE BASED ON TEMPITEM AND TOOL_ PROPS) tempIdsServer: string[] = []
    // DON'T NEED THIS, OR MAKE IT COMPUTED (DERIVE BASED ON TEMPITEM AND TOOL_ PROPS) tempIdsBrowser: string[] = []
    configFilenameDialogOpen: boolean = false
    // function for config filename dialog to call on enter/cancel
    // resolves promise created when dialog is opened, with value equal to index in this.configFilenameList of selected filename (or -1 if canceled)
    // typing of function argument matches type of resolve in Promise<number> (see doConfigPickerDialog function below)
    configFilenameDialogResolve: ((value: number | PromiseLike<number>) => void) | undefined = undefined
    configFilenameList: string[] = []
    // OBSOLETE configFileNotes: string = ''
    configLastAutosaveFilename: string | undefined = undefined
    configSaveNotesDialogOpen: boolean = false
    configSaveNotesDialogResolve: ((value: string | undefined | PromiseLike<string | undefined>) => void) | undefined = undefined
    phLogDetailViewItemID: string | undefined = undefined


    // OBSOLETE // convenience prop - contains union of all Hosts in app...lastServerStateReceived (upstream and downstream)
    // OBSOLETE // NOTE: PROP NAMES INCLUDE THE 'host_' PREFIX
    // OBSOLETE // populated and updated by calling updateHosts()
    // OBSOLETE // function(s) in App/extApp that receive new host information from server must manually call updateHosts() to populate this
    // OBSOLETE // (note: had tried to implement the update as a reaction, but the reaction was not detecting changes in extApp.tsx, could not figure out why...
    // OBSOLETE // - manual calling of updateHosts is very un-mobx, but seems OK because there is really only one place (per App) that ever changes the hosts
    // OBSOLETE hosts: Hosts = {}

    get selectionIncludesTempItem(): boolean {
      for (let i of this.selection.selRows) if (this.root.children[i].tempItem) return true
      return false
    }

    get valResultForTable(): number {
      let result = 0
      const idset = new Set<string>()
      for (let c of this.root.children) {
        result |= c.valResultForItem
        // check for uniqueness of _id
        if (idset.has(c._id)) result |= 255  // blunt force - not clear which part of bitmap to set, so set all of them
        else idset.add(c._id)
      }
      for (let t in tools) {
        // note - we cast ConfigI to ConfigItemRaw - this is OK because the props of ConfigItemRaw are populated in ConfigI with the same prop name and type
        result |= (tools[t].valAcrossItems(this.root.children as unknown as ConfigItemRaw[])) ? 0 : tools[t].mask
      }
      return result
    }
    
    ifButtonState(thisMD: SetMDRaw, svrIfMD: SetMDRaw, lastPushPullMD: SetMDRaw):  'table has inforce' | 'table ahead of inforce' | 'inforce changed since last pull/commit' | 'both changed since last pull/commit' {
      if (thisMD.id === svrIfMD.id) return 'table has inforce'
      else if ((svrIfMD.id === lastPushPullMD.id) && (thisMD.timestamp > svrIfMD.timestamp)) return 'table ahead of inforce'
      else if ((thisMD.id === lastPushPullMD.id) && (svrIfMD.timestamp > lastPushPullMD.timestamp)) return 'inforce changed since last pull/commit'
      return 'both changed since last pull/commit'
    }
    get ifSButtonState(): 'table has inforce' | 'table ahead of inforce' | 'inforce changed since last pull/commit' | 'both changed since last pull/commit' {
      return this.ifButtonState(this.root.md, this.parentDnDApp.server.lastServerStateReceived.ifSNonTempMD, this.lastNonTempMDPulledFromOrPushedToIfS)
    }
    get ifBButtonState(): 'table has inforce' | 'table ahead of inforce' | 'inforce changed since last pull/commit' | 'both changed since last pull/commit' {
      return this.ifButtonState(this.root.md, this.parentDnDApp.extensionIfBNonTempMD, this.lastNonTempMDPulledFromOrPushedToIfB)
    }
  
  

    constructor(props: TTableConfigConstructorProps) {
      super({
        parentDnDApp: props.parentDnDApp,
        // OBSOLETE parentServiceOpHandler: props.parentServiceOpHandler,
        tableType: 'ConfigView',
        tiConstructor: (parentTTable: TTable)=>{return new ConfigI(parentTTable as TTableConfig)},
        tableName: props.tableName,
        initialColData: defaultColsViewerConfig,
        tiPropFunctions: mapPMViewerConfig,
        columnVisibleLevel: 1,
        changeTrackingSetupEnabled: props.changeTrackingSetupEnabled,
        changeTrackingActiveAtConstruction: props.changeTrackingActiveAtConstruction,
        showUnsavedChanges: true,
      })
      this.serverActive = props.serverActive
      this.browserActive = props.browserActive
      this.numFrozenCols = 2    // so that valString column will be frozen
      
      runInAction(()=>{
        this.root = new ConfigG(this)
        this.root.resetModified()
        this.root.expanded = true
      })

      // populate entries for tools into mapPMViewerConfig
      for (let t in tools) mapPMViewerConfig[t] = configBooleanTool


      makeObservable(this, {
        // OBSOLETE currentNonTempConfigSetId: observable,
        lastNonTempMDPulledFromOrPushedToIfS: observable,
        lastNonTempMDPulledFromOrPushedToIfB: observable,
        configFilenameDialogOpen: observable,
        configSaveNotesDialogOpen: observable,
        // OBSOLETE hosts: observable,
        selectionIncludesTempItem: computed({keepAlive: true}),
        valResultForTable: computed({keepAlive: true}),
        ifSButtonState: computed,
        ifBButtonState: computed,
        // OBSOLETE updateHosts: action.bound,
        selectConfigFileAndLoad: action.bound,
        pullIfSNonTemp: action.bound,
        applyConfigSetFromServerOp: action.bound,
        // OBSOLETE selectConfigFileAndLoadUsingPromiseChain: action.bound,
        saveConfigFile: action.bound,
        commitToIfS: action.bound,
        applyConfigFileSaveCompletion: action.bound,
        replaceConfigSets: action.bound,
        // OBSOLETE  applyConfigToPiholes: action.bound,
        addNewEmptyItem: action.bound,
        addNewItems: action.bound,
        deleteItem: action.bound,
        removeTempItems: action.bound,
        addRemoveFromThisRoot: action.bound,
        setHighlightMatchFromPHISelection: action.bound,
        setHighlightMatchFromCRISelection: action.bound,
        pasteConfigIs: action.bound,
        duplicateSelection: action.bound,
        mergeSelection: action.bound,
      })

      // OBSOLETE - REDUNDANT WITH SETTING EXPANDED ABOVE   this.root.expanded = true

      this.deleteSelection = this.deleteSelection.bind(this)

      this.parentDnDApp.onIfSTempConfigChangeHandler = ()=>{
          // do not change 'modified' state - replaceConfigSets will trigger observers that will set modified, so we need to undo this effect after the table update
          const modifiedBeforeUpdatingTemp = this.root.modified
          this.changeTrackingActive = false
          this.replaceConfigSets(undefined, this.parentDnDApp.server.lastServerStateReceived.ifSTemp, undefined)
          this.changeTrackingActive = true
          if (modifiedBeforeUpdatingTemp === false) this.root.resetModified()
          ////cl(`ttableconfig temp items after addRemoveItems:`)
          ////cl(this.root.children.filter(i => i.tempItem))
      }

      this.parentDnDApp.onIfBTempConfigChangeHandler = (addedItems: ConfigItemRaw[], removedItems: ConfigItemRaw[]) =>{
        if (this.browserActive) {
          // do not change 'modified' state - replaceConfigSets will trigger observers that will set modified, so we need to undo this effect after the table update
          const modifiedBeforeUpdatingTemp = this.root.modified
          this.changeTrackingActive = false
          // will add at position 0
          this.addRemoveFromThisRoot(addedItems, removedItems.map(i => i._id))
          this.changeTrackingActive = true
          if (modifiedBeforeUpdatingTemp === false) this.root.resetModified()
        }
      }
      

      // set timer to autosave every x milliseconds if this.changesSinceLastSave is true
      setInterval(()=>{
        if (this.changesSinceLastSaveOrAutosave) {
          // if table is now empty, don't autosave, and reset changesSince... flag
          if (this.root.children.length === 0) this.changesSinceLastSaveOrAutosave = false
          else this.saveConfigFile('autosave')
        }
      }, 60000)
    }

    highlightConfigIsThatMatchThisDomain(ti: TI, col: ColData, rowIndex: number) {
      //cl(`handling cell click action`)
    }


    // opens config file picker dialog
    // returns promise that resolves with index of selected file (or -1 if dialog cancelled)
    // (promise never rejects, there are no errors to handle)
    async doConfigPickerDialog(): Promise<number> {
      return new Promise( (resolve, reject) => {
        runInAction(()=>{
          this.configFilenameDialogResolve = resolve
          this.configFilenameDialogOpen = true  
        })
      })
    }


    async selectConfigFileAndLoad() {
      // create new serviceOp and populate it
      // OBSOLETE let so: ServiceOperation = {
      // OBSOLETE   uuid: (uuidv4().toString()),
      // OBSOLETE   subject: 'configfilenames',
// OBSOLETE 
      // OBSOLETE   status: '-1',
      // OBSOLETE   status_text: '',
// OBSOLETE 
      // OBSOLETE   op_type: 'pull',
      // OBSOLETE   can_retry: 'undetermined',
      // OBSOLETE   server_state: '',
      // OBSOLETE }

      const op1: WSWMsgOpTypes = {
        msgType: 'configop',
        op_type: 'pull',
        source: 'filenames',
        trail: [`TTableConfig get config file names`]
      }

      const op1Result = await this.queueServerOp(op1)
      //cl(`TTableConfig get file names returned op value:`)
      //cl(op1Result)
      // OBSOLETE this.parentServiceOpHandler(so) as ServiceOperation

      if (op1Result.status !== '0') return   // if op did not complete for whatever reason (error, or another one is in progress) just discontinue the operation
                            // better would be to give user a message that operation was aborted, or to retry after a delay
      // sort filenames by recency - most recent first
      (op1Result.payload as string[]).sort((a, b)=>{  // return -1 if a should be before b
        if (a.split('_')[0] > b.split('_')[0]) return -1
        else return 1
      })


      this.configFilenameList = op1Result.payload as string[]

      const selFileIndex = await this.doConfigPickerDialog()
      if (selFileIndex === -1) return   // discontinue if user cancelled dialog




      // create new serviceOp and populate it
      // OBSOLETE so = {
      // OBSOLETE   uuid: (uuidv4().toString()),
      // OBSOLETE   subject: 'config',
      // OBSOLETE   source: 'file',
      // OBSOLETE   filename: this.configFilenameList[selFileIndex],
// OBSOLETE 
      // OBSOLETE   status: '-1',
      // OBSOLETE   status_text: '',
// OBSOLETE 
      // OBSOLETE   op_type: 'pull',
      // OBSOLETE   can_retry: 'undetermined',
      // OBSOLETE   server_state: '',
      // OBSOLETE }
      const op2: WSWMsgOpTypes = {
        msgType: 'configop',
        op_type: 'pull',
        source: 'file',
        filename: this.configFilenameList[selFileIndex],
        trail: [`TTableConfig pull file ${this.configFilenameList[selFileIndex]}`]
      }
      const op2Result: WSWMsgOpResultTypes = await this.queueServerOp(op2)
      // OBSOLETE so = await this.parentServiceOpHandler(so) as ServiceOperationConfigPull
      if (op2Result.status === '0') {
        // OBSOLETE this.configFileNotes = this.configFilenameList[selFileIndex].split('_')[3]
        this.changeTrackingActive = false
        this.applyConfigSetFromServerOp(op2Result)
        this.changeTrackingActive = true

      }


    }

    async pullIfSNonTemp() {
      // pull inforce non-temp config from server
      // OBSOLETE let so: ServiceOperationConfigPull = {
      // OBSOLETE   uuid: uuidv4(),
      // OBSOLETE   subject: 'config',
      // OBSOLETE   source: 'ifs',
// OBSOLETE 
      // OBSOLETE   status: '-1',
      // OBSOLETE   status_text: '',
// OBSOLETE 
      // OBSOLETE   op_type: 'pull',
      // OBSOLETE   can_retry: 'undetermined',
      // OBSOLETE   server_state: '',
      // OBSOLETE }
      const op: WSWMsgOpTypes = {
        msgType: 'configop',
        op_type: 'pull',
        source: 'ifs',
        trail: [`TTableConfig pullIfSNonTemp`]
      }
      // OBSOLETE so = await this.parentServiceOpHandler(so) as ServiceOperationConfigPull
      const opResult = await this.queueServerOp(op)

      if (opResult.status === '0') {


        runInAction(()=> {
          if (opResult.payload !== undefined) this.lastNonTempMDPulledFromOrPushedToIfS = (opResult.payload as SetRaw).md
        })
        // this.currentNonTempConfigSetId will be set in applyConfigSetFromServiceOp

        // NOTE: NEED TO TURN CHANGETRACKING OFF HERE,
        // BECAUSE applyConfigSetFromServiceOp is made an action in constructor, so observers triggered
        // by changes will fire after function returns
        this.changeTrackingActive = false
        this.applyConfigSetFromServerOp(opResult)
        this.changeTrackingActive = true
      }
    }


    // NOTE: this function is marked as an action in constructor, 
    // so any observers will fire after return from this function
    applyConfigSetFromServerOp(opResult: WSWMsgOpResultTypes) {

      const changeTrackingActiveAtEntry = this.changeTrackingActive
      this.changeTrackingActive = false


      if (opResult.status === '0') {
        if (opResult.payload === undefined) this.replaceConfigSets(
          makeNewSetRaw('<new config set made because service op returned no payload>', true),
           undefined, undefined)
        else {
          configSetUpdates(opResult.payload)
          for (let i of (opResult.payload as SetRaw).children) configItemUpdates(i as ConfigItemRaw)
          this.replaceConfigSets(opResult.payload as SetRaw, undefined, undefined)
        }
      }

      this.changeTrackingActive = changeTrackingActiveAtEntry



    }

    requestPullIfBConfigSets(clearCRTable: boolean) {
      this.parentDnDApp.requestPullIfBConfigSets(clearCRTable)
    }

    newIfBConfigSetsHandler(newNonTempSet: SetRaw, newTempSet: SetRaw) {

      this.replaceConfigSets(newNonTempSet, undefined, newTempSet)
      // update table state
      runInAction(()=>{
        this.lastNonTempMDPulledFromOrPushedToIfB = newNonTempSet.md
      })
    }

    commitIfBConfigSet(clearCRTable: boolean) {
      this.parentDnDApp.commitIfBNonTempConfigSet(this.root.exportSetRaw('nonTemp'), clearCRTable)
      runInAction(()=>this.lastNonTempMDPulledFromOrPushedToIfB = this.root.md.exportMDRaw())
    }


    // removes existing temp|nonTemp items and replaces with new set(s)
    // NOTE: this function is marked as an action in constructor, 
    // so any observers will fire after return from this function
    replaceConfigSets(newNonTempConfigSet: SetRaw | undefined, newSTempConfigSet: SetRaw | undefined, newBTempConfigSet: SetRaw | undefined) {
      
      const changeTrackingAtEntry = this.changeTrackingActive

      ////cl(`replaceConfigSets entry - first item id: ${(this.root.children.length === 0) ? '<none>' : this.root.children[0]._id}`)
      //cl(`replaceConfigSets - changeTrackingActive at entry: ${this.changeTrackingActive}`)
      this.changeTrackingActive = false
      // clear undo history
      this.tiDeltas = []

      if (newNonTempConfigSet !== undefined) {
        // determine addPosition so nonTemp goes after all temp items
        const addPosition = this.root.children.filter(ci => (ci.tempItem === true)).length
        this.addRemoveFromThisRoot(newNonTempConfigSet.children as ConfigItemRaw[], this.root.children.filter(ci => (ci.tempItem === false)).map(ci => ci._id), { addPosition: addPosition })
        this.root.md.notes = newNonTempConfigSet.md.notes
        this.root.md.lastIdSaved = newNonTempConfigSet.md.lastIdSaved
        this.root.timestampLastArrayMod = newNonTempConfigSet.md.timestamp
        this.changesSinceLastSaveOrAutosave = false
      }
      if (newSTempConfigSet !== undefined) {
        // determine addPosition so server temp appear after browser temp
        const addPosition = this.root.children.filter(ci => ((ci.tempItem === true) && (ci.tool_browser === true))).length
        this.changeTrackingActive = false
        this.addRemoveFromThisRoot(newSTempConfigSet.children as ConfigItemRaw[], this.root.children.filter(ci => ((ci.tempItem === true) && (ci.tool_pihole === true))).map(ci => ci._id), { addPosition: addPosition })
        this.changeTrackingActive = true
        //cl(`temp item domain patterns after STemp update:`)
        this.root.children.filter(ci => (ci.tempItem === true)).map(ci => {
          //cl(`  ${ci.hostDomainPatterns}`)
        })
      }
      if (newBTempConfigSet !== undefined) {
        this.changeTrackingActive = false
        this.addRemoveFromThisRoot(newBTempConfigSet.children as ConfigItemRaw[], this.root.children.filter(ci => ((ci.tempItem === true) && (ci.tool_browser === true))).map(ci => ci._id))
        this.changeTrackingActive = true
      }

      this.changeTrackingActive = changeTrackingAtEntry

      ////cl(`replaceConfigSets exit  - first item id: ${(this.root.children.length === 0) ? '<none>' : this.root.children[0]._id}`)

    }

    // override base class method, so that we only clear non-temp items
    clearTableContents() {
      this.replaceConfigSets(makeNewSetRaw('<new config set after clearing table>', true),
        undefined, undefined)
      this.root.md.lastIdSaved = this.root.md.id
    }

    // opens save file notes dialog
    // returns undefined if user cancelled
    async doSaveNotesDialog(): Promise<string | undefined> {
      return new Promise( ( resolve, reject) => {
        this.configSaveNotesDialogResolve = resolve
        this.configSaveNotesDialogOpen = true
      })
    }

    async saveConfigFile(saveType: 'usingNotesDialog' | 'autosave' | 'notesAsArgument', notesArg?: string) {
      let notes: string | undefined = undefined

      var savedSetNotes = this.root.md.notes

      switch(saveType) {
        case 'usingNotesDialog':
          // do notes dialog
          const notesFromDialog = await this.doSaveNotesDialog()
          if (notesFromDialog === undefined) return   // dialog will return undefined if user cancelled dialog
          else savedSetNotes = notesFromDialog
          break
        case 'autosave':
          savedSetNotes = 'autosave'
          break
        case 'notesAsArgument':
          savedSetNotes = (notesArg === undefined) ? '' : notesArg
          break
      }

      if (saveType !== 'autosave') this.root.md.notes = savedSetNotes
      const payload = this.root.exportSetRaw('nonTemp') as ConfigSetRaw
      payload.md.notes = savedSetNotes

      // OBSOLETE let so: ServiceOperationConfigPush = {
      // OBSOLETE   uuid: (uuidv4().toString()),
      // OBSOLETE   subject: 'config',
      // OBSOLETE   push_type: 'save',
// OBSOLETE 
      // OBSOLETE   // OBSOLETE source: 'payload',
        // OBSOLETE apply_to_dshosts: 'false',
        // OBSOLETE target_host: '',
      // OBSOLETE   generate_lsrules: 'false',
      // OBSOLETE   // OBSOLETE save_to_disk: 'true',
      // OBSOLETE   payload: payload,
// OBSOLETE 
      // OBSOLETE   status: '-1',
      // OBSOLETE   status_text: '',
// OBSOLETE 
      // OBSOLETE   op_type: 'push',
      // OBSOLETE   can_retry: 'undetermined',
      // OBSOLETE   server_state: '',
      // OBSOLETE }

      const op: WSWMsgConfigOpTypes = {
        msgType: 'configop',
        op_type: 'push',
        push_type: 'save',
        generate_lsrules: 'false',
        payload: payload,
        trail: [`TTableConfig saveConfigfile`]
      }

      // populate previous filename to delete, if there is one
      if (this.configLastAutosaveFilename !== undefined) {
        op.prev_filename_to_delete_after_save = this.configLastAutosaveFilename
        this.configLastAutosaveFilename = undefined
      }

      // OBSOLETE so = await this.parentServiceOpHandler(so) as ServiceOperationConfigPush
      const opResult = await this.queueServerOp(op) as WSWMsgConfigOpResultTypes
      if (opResult.status === '0') {
        this.changesSinceLastSaveOrAutosave = false
        if (saveType === 'autosave') this.configLastAutosaveFilename = opResult.filename_saved
        if (saveType !== 'autosave') {
          this.root.md.notes = savedSetNotes
          this.applyConfigFileSaveCompletion(opResult)
        }
      }
    }

    async commitToIfS() {
      // do commit operation
      // OBSOLETE let so: ServiceOperationConfigPush = {
      // OBSOLETE   uuid: uuidv4(),
      // OBSOLETE   subject: 'config',
      // OBSOLETE   push_type: 'commit',
// OBSOLETE 
      // OBSOLETE   // OBSOLETE source: 'payload',
      // OBSOLETE   // OBSOLETE apply_to_dshosts: 'false',
      // OBSOLETE   // OBSOLETE target_host: '',
      // OBSOLETE   generate_lsrules: 'false',
      // OBSOLETE   // OBSOLETE save_to_disk: 'true',
      // OBSOLETE   payload: this.root.exportSetRaw('nonTemp'),
// OBSOLETE 
      // OBSOLETE   status: '-1',
      // OBSOLETE   status_text: '',
// OBSOLETE 
      // OBSOLETE   op_type: 'push',
      // OBSOLETE   can_retry: 'undetermined',
      // OBSOLETE   server_state: '',
      // OBSOLETE }
      const op: WSWMsgOpTypes = {
        msgType: 'configop',
        op_type: 'push',
        push_type: 'commit',
        generate_lsrules: 'false',
        payload: this.root.exportSetRaw('nonTemp') as ConfigSetRaw,
        trail: [`TTableConfig commitToIfS`]
      }
      const soStartTime = Date.now()
      const opResult: WSWMsgOpResultTypes = await this.queueServerOp(op)
      // OBSOLETE so = await this.parentServiceOpHandler(so) as ServiceOperationConfigPush
      //cl(`commitToIfS so responded after ${(Date.now()-soStartTime)/1000} secs`)

      if (opResult.status === '0') {
        runInAction(()=>this.lastNonTempMDPulledFromOrPushedToIfS = this.root.md.exportMDRaw())
      }
      // rest of state should update automatically(?????)
      // so nothing further to do here
    }


    // update table state after completion of a config file push operation
    // if it was successful, update unsaved state
    applyConfigFileSaveCompletion(opResult: WSWMsgOpResultTypes) {
      if (opResult.status === '0') {
        this.root.resetModified()
      }
    }

    // REVISE USING SERVER OPS // illustration - alternate version of (part of) selectConfigFileAndLoad
    // (not used in production, but keep as an example)
    // written explicitly as promise chain
    // 'local' constant defined at top of function body is available inside the .then handlers (contrary to my previous, incorrect, understanding...)
    // REVISE USING SERVER OPS // note that 'this' is bound correctly inside the .then handlers (also contrary to my previous, incorrect, understanding....)
    // REVISE USING SERVER OPS selectConfigFileAndLoadUsingPromiseChain() {
    // REVISE USING SERVER OPS   const local = 1
    // REVISE USING SERVER OPS   let so: ServiceOperationConfig = {
    // REVISE USING SERVER OPS     uuid: (uuidv4().toString()),
    // REVISE USING SERVER OPS     subject: 'configfilenames',
// REVISE USING SERVER OPS 
    // REVISE USING SERVER OPS     status: '-1',
    // REVISE USING SERVER OPS     status_text: '',
// REVISE USING SERVER OPS 
    // REVISE USING SERVER OPS     op_type: 'pull',
    // REVISE USING SERVER OPS     can_retry: 'undetermined',
    // REVISE USING SERVER OPS     server_state: '',
    // REVISE USING SERVER OPS   }
// REVISE USING SERVER OPS 
    // REVISE USING SERVER OPS   this.parentServiceOpHandler(so)
    // REVISE USING SERVER OPS   .then(soWithFilenames => {
    // REVISE USING SERVER OPS     //cl(`local is: ${local}`)
    // REVISE USING SERVER OPS     so = soWithFilenames as ServiceOperationConfig
    // REVISE USING SERVER OPS     this.configFilenameList = soWithFilenames.payload
    // REVISE USING SERVER OPS     return this.doConfigPickerDialog()  // result of this function call is a promise - need to return it so it is the subject of the next .then
    // REVISE USING SERVER OPS   })
    // REVISE USING SERVER OPS   .then(selFileIndex=>{
    // REVISE USING SERVER OPS     //cl(`local is: ${local}`)
    // REVISE USING SERVER OPS     //cl(`filepicker dialog closed, selFileIndex is: ${selFileIndex}`)
    // REVISE USING SERVER OPS   })
// REVISE USING SERVER OPS 
    // REVISE USING SERVER OPS   //cl('after promise chain established')  // this will execute after the above promise chain is established, but before they are resolved
    // REVISE USING SERVER OPS }



    testButtonHandler() {
      /*
        cases to test
          remove at start
          remove in middle
          remove at end

          add at start
          add in middle
          add at end

          remove and add...

      */



    }


    addNewEmptyItem() {
      const newItem = makeNewConfigItemRaw({})
      this.addNewItems([newItem], false)
    }

    addNewItems(newItems: ConfigItemRaw[], clearTIDeltas: boolean) {
      const newConfigIs: ConfigI[] = []
        for (let i = 0; i < newItems.length; i++) {

          // update items saved in older versions of extension
          configItemUpdates(newItems[i])

          newConfigIs[i] = new ConfigI(this)
          newConfigIs[i].highlightLevelMatching = 0
          // OBSOLETE // modify item to have valid host_ props
          // OBSOLETE this.cleanHostsOnItem(newItems[i])

          newConfigIs[i].populate(newItems[i])
        }
    // OBSOLETE with above obsolete block  }
      // append to root.children
      for (let i of newConfigIs) {
        // temp items go at start of children array, other go at end
        if (i.tempItem === true) this.root.addDirectChild(i, 0)
        else this.root.addDirectChild(i)
      }

      // update tiDeltas, per arguments
      if (clearTIDeltas) {
        this.tiDeltas = []
      }
    }

    // if ids is empty, remove all temp items
    async removeTempItems(ids: string[]) {
      const idsToRemove = (ids.length !== 0) ? ids : this.root.children.filter(c => c.tempItem).map(i => i._id)
      const op: WSWMsgOpTypes = {
        msgType: 'configop',
        op_type: 'push',
        push_type: 'removetemp',
        generate_lsrules: 'false',
        payload: idsToRemove,
        trail: [`TTableConfig removeTempItems`]
      }
      const soStartTime = Date.now()
      this.queueServerOp(op)

      // no need to update table state - that will happen via server state received back

    }

    // does temptonontemp config op
    // NOTE: this will change inforce config on server
    // BUT NOT CONFIG HERE - USER WILL NEED TO PULL CONFIG TO GET NEW INFORCE

// to fix this behavior:
//  export ConfigItemRaws of ids
//  await server op
//  on success, do this.addNewItems

    // if ids is empty, move all temp items
    async tempToNonTemp(ids: string[]) {
      const idsToMove = (ids.length !== 0) ? ids : this.root.children.filter(c => c.tempItem).map(i => i._id)
      const op: WSWMsgOpTypes = {
        msgType: 'configop',
        op_type: 'push',
        push_type: 'temptonontemp',
        generate_lsrules: 'false',
        payload: idsToMove,
        trail: [`TTableConfig tempToNonTemp`]
      }
      const soStartTime = Date.now()
      this.queueServerOp(op)
      // no need to update table state - that will happen via server state received back

    }


    // wraps the configTypes addRemoveItems method to operate on ConfigI, not ConfigItemRaw
    // relies on the fact that props of ConfigItemRaw all exist in a ConfigI for purpose of checking whether addedItems or removedItems exist in main item list
    // turns off change tracking

    // algorithm moves items around by Object.assigning props from source to destination
    // we do this because Table2 will not re-render if the total number of rows stays the same
    // so to handle the case where number of rows does not change, need to assign revised prop values
    // to ConfigI's in place, to make the cells re-render
    // based on simple testing, ConfigI.export is very fast, but Object.assign(ConfigI, ConfigItemRaw) take 1-2 ms per call
    // not too bad for ConfigTable as of now (~40 items), but will not scale well
    // we do check whether the new item in a slot has same _id as existing and skip if they do,
    // which will help, especially with the case where a new temp config set comes in with expiration time changed
    // ==> IF PERFORMANCE BECOMES A PROBLEM, MAY HAVE TO RE-CONSIDER THIS ALGORITHM
    addRemoveFromThisRoot(addedItems: ConfigItemRaw[], removedItemIds: string[], options?: { addPosition?: number, keepChangeTrackingOn?: boolean }): string | undefined {

      ////cl(`addRemoveFromThisRoot entry - first item id: ${(this.root.children.length === 0) ? '<none>' : this.root.children[0]._id}`)


      const changeTrackingAtEntry = this.changeTrackingActive

      if (options?.keepChangeTrackingOn !== true) {
        ////cl(`leaving changeTrackingActive on`)
        this.changeTrackingActive = false
      }

      // reset any highlighting as row numbers (may) change
      this.root.resetHighlightLevelMatching()

      const priorLength = this.root.children.length
      const newLength = this.root.children.length + addedItems.length - removedItemIds.length
      const addPosition = (options?.addPosition === undefined) ? 0 : options.addPosition

      // export existing items
      const newItems = this.root.children.map(ci => ci.export()) as unknown as ConfigItemRaw[]
      // OBSOLETE NOW USE ADDREMOVECONFIGITEMRAW // splice in addedItems
      // OBSOLETE NOW USE ADDREMOVECONFIGITEMRAW newItems.splice(addPosition, 0, addedItems)      
      // OBSOLETE NOW USE ADDREMOVECONFIGITEMRAW // splice out removedItems
      // OBSOLETE NOW USE ADDREMOVECONFIGITEMRAW for (let i = 0; i < newItems.length; i++) {
      // OBSOLETE NOW USE ADDREMOVECONFIGITEMRAW   if (removedItemIds.findIndex(ri => (ri._id === newItems[i]._id)) !== -1) {
      // OBSOLETE NOW USE ADDREMOVECONFIGITEMRAW     newItems.splice(i, 1)
      // OBSOLETE NOW USE ADDREMOVECONFIGITEMRAW     i--  // decrement counter - loop control will increment it again, so loop will continue at same position
      // OBSOLETE NOW USE ADDREMOVECONFIGITEMRAW   }
      // OBSOLETE NOW USE ADDREMOVECONFIGITEMRAW }

      const q1 = this.root.md.id
      const result = addRemoveConfigItemRaw(newItems, addedItems, removedItemIds, {addPosition: addPosition})
      const q2 = this.root.md.id

      // adjust length of this.root.children
      if (newLength < priorLength) this.root.children.splice(newLength, priorLength-newLength)
      if (newLength > priorLength) for (let i = 0; i < (newLength-priorLength); i++) this.addNewEmptyItem()
      
      // Object.assign back into this.root.children (skipping if _id's match)
      for (let i = 0; i < newLength; i++) {
        if (newItems[i]._id !== this.root.children[i]._id) {
          Object.assign(this.root.children[i], newItems[i])
        }
      }

      this.changeTrackingActive = changeTrackingAtEntry

      return result

    }

    deleteItem(table: TTable, ti: TI) {
      // if not parentTIG, do nothing
      if (ti.parentTIG === undefined) return
      // find ti in its parentTIG
      const parentIndex: number = ti.parentTIG.children.indexOf(ti)
      // remove it
      ti.parentTIG.children.splice(parentIndex, 1)
    }

    deleteSelection() {
      // move this to TTable base???? - no, leave it here for now, would need to handle TIGs
      runInAction(()=>{
        // delete 'currentSelection' in table
        const newChildren: ConfigI[] = []
        for (let i = 0; i < this.root.children.length; i++) {
          if ( ! this.selection.selRows.has(i)) newChildren.push(this.root.children[i])
        }
        this.root.children = newChildren
        this.newSelectionFromTIList([], false)
      })
    }

    cutSelection() {
      this.pasteBuffer = {
        isCopy: false,
        items: (this.getSelectedTIs() as ConfigI[]).map(i => i.export()) as ConfigItemRaw[]
      }
      this.deleteSelection()
    }

    copySelection() {
      this.pasteBuffer = {
        isCopy: true,
        items: (this.getSelectedTIs() as ConfigI[]).map(i => {
          // OBSOLETE THIS SHOULD NEVER HAVE BEEN HERE i._id = uuidv4()
          const item = i.export()
          if (item.tempItem) { // if any item copied is a tempItem, change it to non-temp and remove tabIds criterion - if we paste it, it must be a non-temp itemß
            item.tempItem = false
            item.tabIds = ''
          }
          return item
        }) as ConfigItemRaw[]
      }
    }

    // paste after last row in current selection
    pasteConfigIs() {
      // need to create new instances (with new _id values) if we are pasting a copy
      if (this.pasteBuffer.isCopy) {
        let newPasteBuffer: { isCopy: boolean, items: ConfigItemRaw[] } = { isCopy: true, items: []}
        for (let i of this.pasteBuffer.items) {
          // call ConfigItemRaw constructor so that item to paste will have a new _id
          // note - hosts and tools arguments are empty, since any host/tool values will be copied in from i
          newPasteBuffer.items.push(makeNewConfigItemRaw(i.export()))
        }
        this.pasteBuffer = newPasteBuffer
      }
      // set isCopy to true, since after pasting, the buffer may be pasted again, in which case it will be a copy
      this.pasteBuffer.isCopy = true
      const pasteIndex = Array.from(this.selection.selRows).sort((a,b)=>(a-b)).pop()
      if (pasteIndex === undefined) return  // do nothing if there is no selection
      const newConfigIs = this.pasteBuffer.items.map(i => {
        const newCI = new ConfigI(this)
        newCI.populate(i)
        newCI.parentTIG = this.root
        return newCI
      })
      this.root.children.splice(pasteIndex+1, 0, ...newConfigIs)

      // set selection to newly pasted items
      this.newSelectionFromTIList(newConfigIs, false)
    }

    // duplicates all ConfigI's in selection
    // changes selection to the newly created duplicates
    duplicateSelection() {
      const sourceConfigIs: ConfigI[] = (Array.from(this.selection.selRows)).map(i => this.visibleSortedExpandedMap[i]) as ConfigI[]
      const newConfigIs: ConfigI[] = []
      // iterate through set in current selection
      for (let sti of sourceConfigIs) {
        // create a duplicate
        let newConfigI = sti.duplicate()
        newConfigIs.push(newConfigI)
        let stiIndex = sti.parentTIGdef.children.findIndex(c => (c===sti))
        // addDirectChild to parentTIG immediately after the source TI
        sti.parentTIGdef.addDirectChild(newConfigI, stiIndex+1)
      }
      this.newSelectionFromTIList(newConfigIs, false)
    }


    // determine if selected items can be merged
    // a single temp item can be 'merged'
    // else all props must match except
    //  tempItem
    //  _id
    //  expirationTime
    //  notes
    //  tabId
    //  hostDomainPatterns
    //  priority of temp items is ignored (but any nontemp priorities must match)
    canMergeSelection() {

      function canMergeItems(item1: {[index: string]: any}, item2: {[index: string]: any}): boolean {
        // get union of prop names in each item
        const propNames: Set<string> = new Set()
        for (let n of Object.getOwnPropertyNames(item1)) propNames.add(n)
        for (let n of Object.getOwnPropertyNames(item2)) propNames.add(n)
        // remove prop names not to be compared
        propNames.delete('tempItem')
        propNames.delete('_id')
        propNames.delete('timestamp')
        propNames.delete('modified')
        propNames.delete('expirationTime')
        propNames.delete('notes')
        propNames.delete('tabIds')
        propNames.delete('hostDomainPatterns')
        // compare props to be compared
        for (let n of Array.from(propNames)) {
          // if prop is priority and either item is temp, do not compare
          if ((n === 'priority') && ((item1.tempItem) || (item2.tempItem))) continue
          if (item1[n] !== item2[n]) {
            return false
          }
        }

        return true
      }

      const selItems = this.getSelectedTIIs()
      if (selItems.length === 0) return false
      // if only one item selected and it is temp, return true - we can 'merge' it to become a nontemp
      else if (selItems.length === 1) return (selItems[0].tempItem === true)

      else for (let i = 1; i < selItems.length; i++) {
        if (canMergeItems(selItems[0].export(), selItems[i].export()) === false) {
          return false
        }
      }

      return true
    }

    // merge selected items into a single NONTEMP item
    // if all selected items are temp, makes a new nontemp item
    // else merges into first nontemp item in selection
    // temp items in selection are left in
    // nontemp items in selection are removed (replaced by the new nontemp item)
    // result is a new nonTemp item
    // result placed in same row as first nontemp item of selection, or as first nontemp item if selection was only temp items
    // expirationTime, tabIds are set to default values
    // notes are set to value from first nonTemp item if there is one, or ''
    // hostDomainPatterns is union'ed
    // priority
    //  priorities of any temp items are ignored
    //  if there is one or more non-temp items, use their priority
    //  else set priority to 100 - user will have to edit as appropriate
    mergeSelection() {
      // check that can merge - if not, throw error (command should be disabled if did not pass canMerge... test or selection is empty)
      if (this.canMergeSelection() === false) throw new Error(`TRIED TO MERGE SELECTION BUT SELECTION CANNOT BE MERGED - THIS SHOULD NEVER HAPPEN`)
      const selItems = this.getSelectedTIIs() as ConfigI[]
      if (selItems.length === 0) throw new Error(`TRIED TO MERGE SELECTION BUT SELECTION IS EMPTY - THIS SHOULD NEVER HAPPEN`)


      // visibleSortedExpandedMap is TI[] of items in root TIG
      // will need to add/remove rows based on indices into this.root.children

      // array of indices of selected items in this.root.children
      const selItemIndicesInThisRoot = selItems.map(i => this.root.children.findIndex(rci => (rci._id === i._id))).sort((a,b)=>(a-b))
      
      // determine position to add new item
      // default value is 0
      // if there is a matching nontemp item, new item will replace the first one
      // otherwise will add to end of table
      var addPosition = 0   
      // scan for first nontemp item - adjust add position to that if one is found
      var firstNonTempItem: ConfigI | undefined = undefined
      for (addPosition; addPosition < this.root.children.length; addPosition++) {
        if ((this.root.children[addPosition].tempItem === false) && (selItems.includes(this.root.children[addPosition])) ){
          firstNonTempItem = this.root.children[addPosition]
          break
        }
      }
      // if any of the selected items is nontemp, set the add position to its position in this.root.children
      // (stop at first one found)
      for (let i = 0; i < selItemIndicesInThisRoot.length; i++) {
        if (this.root.children[selItemIndicesInThisRoot[i]].tempItem === false) {
          addPosition = selItemIndicesInThisRoot[i]
          break
        }
      }


      // make new merged item
      const newItem = makeNewConfigItemRaw(selItems[0].export())
      // make it nonTemp, assign new _id
      Object.assign(newItem, { _id: uuidv4(), modified: true, timestamp: Date.now(), tempItem: false } )
      // set hostDomainPAtterns, notes, expirationTime, tabIds to default values
      Object.assign(newItem, { hostDomainPatterns: '', notes: '', expirationTime: 0, tabIds: '' } )
      // set priority to 100 (will be replaced by nonTemp priority in selItems, if there is a nonTemp item)
      Object.assign(newItem, { priority: '100' } )
      // scan selItems - 
      //    assembel arrays of nontemp and temp hostdomain patterns (will want new item to have the non-temp ones first, follwed by the temp, in order than items were in table before merge)
      //    set priority to that of first nonTemp item found
      // OBSOLETE var newPriority = '100'
      const newNonTempHostDomainPatterns: string[] = []
      const newTempHostDomainPatterns: string[] = []
      for (let si of selItems) {
        if (si.hostDomainPatterns !== '') {
          if (si.tempItem) newTempHostDomainPatterns.push(si.hostDomainPatterns)
          else newNonTempHostDomainPatterns.push(si.hostDomainPatterns)
        }
      }

      Object.assign(newItem, { 
        priority: (firstNonTempItem !== undefined) ? firstNonTempItem.priority : '100', 
        hostDomainPatterns: newNonTempHostDomainPatterns.concat(newTempHostDomainPatterns).join('\n'),  // will return '' if both arrays empty
        notes: (firstNonTempItem !== undefined) ? firstNonTempItem.notes : '',
      } )


      // only remove the non-temp items that were merged
      this.addRemoveFromThisRoot([newItem], selItems.filter(si => (si.tempItem == false)).map(si => si._id), { addPosition: addPosition, keepChangeTrackingOn: true } )

      // set new selection to merged item
      const newTI = this.root.children.find(i => (i._id === newItem._id))
      if (newTI !== undefined) {
        this.clearSelection()
        this.newSelectionFromTIList([newTI], false)
      }

    }




    // takes an array of PHIs as an argument (that will have been passed from parentApp)
    // (can be multiple PHI's, and if there was a CRG in the selection, CALLER MUST expand it to a list of the ultimate child CRI's)
    // and sets TI.highlightLevelMatching to:
    //  (max over these if multiple tis match)
    //   level 1 for any ConfigI that matches this PHI but is inactive
    //   level 2 for any ConfigI that matches this PHI but is active
    //   level 4 for the ConfigI that will make the decision
    setHighlightMatchFromPHISelection(phis: PHI2Res[] ) {
      let matchingCI: ConfigI | undefined
      // reset highlight levels
      this.root.resetHighlightLevelMatching()

      // make list of pihole rules from current content of table
      const itemList: ConfigItemRaw[] = []
      for (let cii of this.root.children) itemList.push(cii.export() as ConfigItemRaw)
      const ruleListAll = tools.tool_pihole.makeRuleListFromConfigItems(itemList, 'pihole_query', 'both')
      if (ruleListAll === undefined) return
      // for each TI
      let tiProps: PHPropsToTestVsRulePihole
      for (let phi of phis) {
        tiProps = { domain: phi.domain }
        // we will set three levels of highlighting
        //   4 - on all that actively affect this PHI
        //   2 - if match the PHI and are active, but not affecting (because of insufficient priority)

        // for each rule, if rule applies, find ConfigI that matches PHI and set highlight level to 2 (unless it is already higher)
        for (let r of ruleListAll) {
          if (tools.tool_pihole.doesRuleApplyToTI(tiProps, r)) {
            matchingCI = this.root.children.find(c => (c._id === r.configItemId))
            if (matchingCI !== undefined) matchingCI.highlightLevelMatching = Math.max(matchingCI.highlightLevelMatching, 1)
          }
        }

        // skip getDecision call if phi.outcomeReason includes 'overridden'
        if (phi.outcomeReason.includes('overridden')) continue

        // call getDecision, using active rule list only - find ConfigIs that will affect and set highlight level to 4
        let decision: DecisionInfoPiholeQuery = tools.tool_pihole.getDecision(tiProps, ruleListAll, 'pihole_query', 0)

        for (let r of decision.rulesContradicted) {
          matchingCI = this.root.children.find(c => (c._id === r.rule.configItemId))
          if (matchingCI !== undefined) matchingCI.highlightLevelMatching = 3
        }
        for (let r of decision.rulesThatApplied) {
          matchingCI = this.root.children.find(c => (c._id === r.rule.configItemId))
          if (matchingCI !== undefined) matchingCI.highlightLevelMatching = 5
        }
      }

    }


    // takes an array of webReq CRIs as an argument (that will have been passed from parentApp)
    // CALLER SHOULD ONLY PASS IN WEBREQI'S - THIS FUNCTION THROWS ERROR IF CRI IS NOT A WEBREQI
    // decisionType can be 'all' - if so, this will call itself for each decisionType and set highlights, so that the final
    // highlight level is the max of the result for each decisionType
    // (can be multiple CRI's, and if there was a CRG in the selection, CALLER MUST expand it to a list of the ultimate child CRI's)
    // and sets ConfigI.highlightLevelMatching to:
    //  (max over these if multiple cri's match)
    //   level 2 for any ConfigI that matches this CR (including those that do not affect because priority too low)
    //   level 4 for the ConfigI that will affect the CR
    setHighlightMatchFromCRISelection(cris: CRI[]) {

      // reset highlight levels
      this.root.resetHighlightLevelMatching()

      // make list of browser rules from current content of table
      const itemList: ConfigItemRaw[] = []
      for (let cii of this.root.children) itemList.push(cii.export() as ConfigItemRaw)
      let ruleList: ConfigRuleBrowserDNR[] | undefined = undefined
      ruleList = tools.tool_browser.makeRuleListFromConfigItems(itemList, 'browser', 'both')

      for (let cri of cris) {
        if (cri.kind !== 'webReqI') throw new Error('TTableConfig.setHighlightMatchFromCRISelection only handles webReqIs')
        let criProps: CRPropsToTestVsRuleBrowser
        try {
          let crURL = (cri['url'] === undefined) ? '' : cri['url']
          // temp for testing - so we can catch invalid URLs at this level in the call stack
          // may want to keep this here
          //    do we want to allow this method to pass non-webReqs to the matcher?
          //    what kinds of values in the 'url' prop cannot be handled by URL constructor?
          //          data: urls
          //          what else?
          let u = new URL(crURL) 

          let crInitiator = (cri['initiator'] === undefined) ? '' : cri['initiator']
          let crTabId = (cri['tabId'] === undefined) ? '' : cri['tabId']
          let crResourceType = (cri['resourceType'] === undefined) ? '' : cri['resourceType']
          let crMethod = (cri['method'] === undefined) ? '' : cri['method']
          criProps = { url: crURL, initiator: crInitiator, resourceType: crResourceType, method: crMethod, tabId: crTabId}
        }
        catch (error) {
          throw new Error(`caught error in setHighlightMatch - url prop is ${cri['url']}`)
        }

        // determine minimum priority to test for non-request rules (which depends on the priority of the decisive request rule)
        // if no request rules, or if getDecision for request rules returns undefined, use 0
        // else get request decision and use priority of rule that decided
        const requestDecisionRulePriority = (ruleList === undefined) ? 0 : tools.tool_browser.getDecision(criProps, ruleList, 'browser', 0).minPriorityOfRuleThatWasTestedAndMatched
        const minPriorityToTest = (requestDecisionRulePriority === undefined) ? 0 : requestDecisionRulePriority
        this.setHighlightMatchForCRI(criProps, ruleList, minPriorityToTest)
      }
    }

    setHighlightMatchForCRI(criProps: CRPropsToTestVsRuleBrowser, ruleList: ConfigRuleBrowserDNR[] | undefined, minPriorityToTest: number) {
      let matchingCI: ConfigI | undefined
      if (ruleList === undefined) return 0
      for (let r of ruleList) {
        if (tools.tool_browser.doesRuleApplyToTI(criProps, r)) {
          matchingCI = this.root.children.find(c => (c._id === r.configItemId))
          if ((matchingCI !== undefined) && (matchingCI.highlightLevelMatching < 1)) matchingCI.highlightLevelMatching = 1
        }
      }
      // call getDecision - find ConfigIs that will affect the CR and set highlight level to 3
      // STUBBING OUT FOR NOW - WILL REVISE TO USE NEW GETDECISION - MIRROR LOGIC IN HIGHLIGHT PHI METHOD ABOVE   let decision = tools.tool_browser.getDecision(criProps, ruleList, 'browser', minPriorityToTest)
      // STUBBING OUT FOR NOW - WILL REVISE TO USE NEW GETDECISION - MIRROR LOGIC IN HIGHLIGHT PHI METHOD ABOVE   if (decision.configItemsThatAffected !== undefined) {
      // STUBBING OUT FOR NOW - WILL REVISE TO USE NEW GETDECISION - MIRROR LOGIC IN HIGHLIGHT PHI METHOD ABOVE     const cids = decision.configItemsThatAffected.split('\n')
      // STUBBING OUT FOR NOW - WILL REVISE TO USE NEW GETDECISION - MIRROR LOGIC IN HIGHLIGHT PHI METHOD ABOVE     for (let cid of cids) {
      // STUBBING OUT FOR NOW - WILL REVISE TO USE NEW GETDECISION - MIRROR LOGIC IN HIGHLIGHT PHI METHOD ABOVE       matchingCI = this.root.children.find(c => (c._id === cid))
      // STUBBING OUT FOR NOW - WILL REVISE TO USE NEW GETDECISION - MIRROR LOGIC IN HIGHLIGHT PHI METHOD ABOVE       if ((matchingCI !== undefined) && (matchingCI.highlightLevelMatching < 3)) matchingCI.highlightLevelMatching = 3
      // STUBBING OUT FOR NOW - WILL REVISE TO USE NEW GETDECISION - MIRROR LOGIC IN HIGHLIGHT PHI METHOD ABOVE     }
      // STUBBING OUT FOR NOW - WILL REVISE TO USE NEW GETDECISION - MIRROR LOGIC IN HIGHLIGHT PHI METHOD ABOVE   }
    }
}
//#endregion