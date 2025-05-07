
import * as React from 'react';
import { observable, action, makeObservable, reaction, override, runInAction, computed } from 'mobx'
import { v4 as uuidv4 } from 'uuid'

import '../vwr-App.css'



import { LVKindsG, WSWMsgOpTypes } from '../common/commonAll'
import { PHHideType, PHI2Query, PHI2Res, PHI2Unparseable, phHideTypeKeysAndLabels, phShowTypeKeysAndLabels } from './table items PH2'
import { regexRestartReload, regexForwarded, regexResolution, regexForwardedResolution, regexQueryForwardedResolution, regexResolutionWithIPOnly, regexResolutionWithIPOrBlockedCNAME, regexPHLogTimestamp, PHOutcomeTypeAllowed, PHOutcomeTypeBlocked, parsePHLogLineRaw, tool_pihole  } from '../common/configTypesToolPihole'
import { CVMode, SizePropsPx } from '../common/commonApp'

import { TIPropFunctions, generic, genericGroupedDeduped, genericGroupedKeepDups } from '../common/propMethods'

import { PH2, PHG2, PHI2 } from './table items PH2'
import { ColData, SortDirs, TTable, TTableBaseConstructorProps } from './TTable base Obj'
import CodeMirrorView from '../common/codemirrorView'
import { ConfigItemRaw, ConfigRulePihole, makeNewConfigItemRaw, tools } from '../common/configTypesTypes'
import { TII } from './table items base';
import { LV2, LVG2 } from './table items LV2';
import { TTableLV2, TTableLVConstructorProps2 } from './TTableLV2';
import { Button, ButtonGroup } from '@blueprintjs/core';
import { getCommaOrNewlineSeparatedList, isDomainWithRequiredLeadingDot } from '../common/configTypesUtility';
import { Test, TestAndGroup, TestOrGroup } from './test';




var _ = require('lodash')

const cl = console.log
const ct = console.table


interface PHPatternMatches {
  exactMatches: ConfigItemRaw[],
  patternMatches: ConfigItemRaw[],
}
// takes a 'domainPatternToTest' and an array of config items
// returns {
//    exactMatches: ConfigItemRaw[]
//    patternMatches: ConfigItemRaw[]
// }
// and tests whether matches any of the config items
// item included in exactMatches if domainPattern exactly matches an item
// item included in patternMatches if domainPattern matches a leadingdot pattern or a regex pattern (including handling 'invert' pattern)
// NOTE: an item could be included in both exact and pattern matches, if the item has multiple patterns and one matches exact and another matches as pattern
export function domainMatchTempItems(domainPatternToTest: string, action: 'allow' | 'deny', items: ConfigItemRaw[]): PHPatternMatches {
  const result: PHPatternMatches = {
    exactMatches: [],
    patternMatches: [],
  }
  for (let i of items) {
    // skip if item action !== argument
    if (i.requestAction !== action) continue
    const patterns = getCommaOrNewlineSeparatedList(i.hostDomainPatterns)
    if (patterns === undefined) continue
    for (let p of patterns) {
      if (p === (domainPatternToTest)) result.exactMatches.push(i)
      else {
        const invert = (/;invert/.test(p))
        const patternWOInvert = invert ? p.slice(0, -7): p
        if (isDomainWithRequiredLeadingDot(p)) {
          if (domainPatternToTest.length < p.length) continue
          else if (domainPatternToTest.slice(domainPatternToTest.length - p.length) === p) result.patternMatches.push(i)
        }
        else {
          const patternRegex = new RegExp(invert ? p.slice(0, -7) : p)
          if (patternRegex.test(domainPatternToTest) !== invert) result.patternMatches.push(i)
        }
      }
    }
  }
  return result
}

// return the common domain parts of a and b (return [] if none)
// skipFirst argument is optional - if provided, will skip first n parts
export function commonDomainParts2(aParts: string[], bParts: string[], skipFirst?: number): string[] {
  const result: string[] = []
  const commonPartCount = Math.min(aParts.length, bParts.length)
  for (let i=(skipFirst === undefined) ? 0 : skipFirst ; i < commonPartCount; i++) {
    if (aParts[i] === bParts[i]) result.push(aParts[i])
    else break
  }
  return result
}

// returns value for Array.sort method, based on part-wise comparison of domainParts
function sortComparerUsingDomainParts2(a: LV2, b: LV2) {
  const minLength = Math.min(a.domainParts.length, b.domainParts.length)
  for (let i = 0; i < minLength; i++) {
    if (a.domainParts[i] < b.domainParts[i]) return -1
    else if (a.domainParts[i] > b.domainParts[i]) return 1
  }
  // if we got this far, everything matches for the segments in both a and b
  // make the less-specific domain appear first
  if (a.domainParts.length = b.domainParts.length) return 0
  if (a.domainParts.length < b.domainParts.length) return -1
  else return 1
}



const phGeneric : TIPropFunctions = {
  hasPropItems: generic.hasPropItems,
  convertOnLoad: generic.convertOnLoad,
  testMethod: generic.testMethod,
  val: generic.val,
  active: generic.active,
  computeGroupProp: (phg: PHG2, children: PHI2Res[], propName: string) => {
    ////cl(`phGeneric.computeGroupProp called for ${propName}`)

    if (children[0] === undefined) return undefined
    else {
      var i: number
      var value: string

      switch(propName) {

        // take value from first phi
        case 'piholeState': 
        case 'domain':
          return children[0][propName]

        // ifDecision - take value from phiThatDecided
        case 'ifDecisionResult':
        case 'ifDecisionMostSpecificMatchType':
        case 'ifDecisionPatternsThatApplied':
        case 'ndAllowed':
          if (phg.phiThatDecided) return phg.phiThatDecided[propName]
          else return undefined

        case 'ifDecisionObject':
          return phg.children.map(c => `${c.domain}\n${c.ifDecisionObject}\n`).join('==================================================\n')

        // if any child is 'yes', return 'yes', else 'no'
        case 'domainIncludesDNSDOHDOT':
        case 'ndAllowed':
        case 'isOverridden':
          for (let c of children) if (c[propName] === 'yes') return 'yes'
          return 'no'

        // take join over children with dups removed
        case 'ifNDRulesContradicted':
        case 'phOutcomeException':
          // .filter((v,i,a)=>(a.indexOf(v)===i))   removes duplicates
          const result = phg.children.filter(c => (c[propName] !== undefined)).map(c => c[propName]).filter((v,i,a)=>(a.indexOf(v)===i)).join('\n')
          if (result === '') {return undefined} else {return result}

        // take value from first phi where outcomeReason not 'phDefault'
        // note if the 'reason' happened on a canonical
        // note if an alias overrode a canonical
        // else return 'ph default'
        case 'outcomeReason':
          var phgOutcomeReason: string = 'ph default'

          phgOutcomeReason = phg.phiThatDecided?.outcomeReason || 'ph default'
          if (phg.overriddenPHIs.length > 0) phgOutcomeReason += ` (overrode ${phg.overriddenPHIs.map(po => `${po.ifDecision?.result} ${po.domain}`).join(', ')})`

          return phgOutcomeReason

        // take value from final phi
        case 'phOutcome':
        case 'phOutcomeType':
        case 'allowedResType':
        case 'ipset':
        case 'unresolvedResult':
        case 'queryTypesString':
        case 'queryIPsString':
              return children[children.length -1][propName]

        // merge values from children
        case 'phLogLine':
          return children.map(c => c[propName]).join(', \n')

        case 'showType':
          // for now, just return phOutcomeException, which will be comma-joined list of childrens' exceptions
          // show filters will be 'includes', so they will match substrings of this prop
          return phg.phOutcomeException

        case 'hideType':
          // determine hide type in priority order
          if (phg.phOutcomeType === 'gravity blocked') return 'gravity blocked'
          else if (phg.phOutcomeType === 'regex blacklisted') {
            if (phg.ifDecisionMostSpecificMatchType === '.*') return 'blocked .*'
            else return 'blocked non .*'
          }
          else if (phg.phOutcome === 'allowed') {
            if (phg.allowedResType === 'allowed but unresolved') return 'no data'
            else if ((phg.ifDecisionMostSpecificMatchType !== undefined) && (phg.ifDecisionMostSpecificMatchType !== '.*')) return 'allowed non .*'
            else return 'allowed ph default'
          }
          else return undefined


        // default - use phg's compute method
        default: return phg[propName]

      }
    }
  },
  singleLineString: generic.singleLineString,
  singleLineJSX: generic.singleLineJSX,
  multiLineString: generic.multiLineString,
  // OBSOLETE   contentViewJSX: generic.contentViewJSX,
  contentViewJSX(ph: PH2, propName: string, includeCount: boolean, cvMode: CVMode, size?: SizePropsPx): JSX.Element {
    if (ph[propName] === undefined) return <div className='ttCellMultiLineJSX'>---</div>

    return (
      <CodeMirrorView
        value={phGeneric.multiLineString(ph, propName, includeCount, cvMode)}
        mode={cvMode}
        // OBSOLETE initialFocus={'matchInput'}
        // OBSOLETE initialMatchPattern=''
        size={ size }
        editable={false}
      />
    )
  },
}



// for the 'domain' prop
// group prop will be the most-common domain name across the children
// singleLineJSX colors based on whether allowed, blocked or some of each
const phDomain2 : TIPropFunctions = {
  hasPropItems: phGeneric.hasPropItems,
  convertOnLoad: phGeneric.convertOnLoad,
  testMethod: phGeneric.testMethod,
  val: phGeneric.val,
  active: phGeneric.active,
  computeGroupProp: phGeneric.computeGroupProp,
  singleLineString: phGeneric.singleLineString,
  singleLineJSX: (propName: string, ph: PHI2, rowIndex: number, colIndex: number) => {

    var color = 
        (ph.phOutcome === 'allowed') ? 'green' : 'red'
    // this is to highlight domains with no dots
    // right now it will also highlight regular tlds like com
    // can fine tune later to focus only on 'suspicious' single segment domains
    // (the 'algorithmic domain names')
    var displayString = phDomain2.singleLineString(propName, ph)
    if ((displayString.search(/\./) === -1) && (/^(com|org|edu|net)$/.test(displayString) === false)) {
      displayString = 'SINGLE DOMAIN ' + displayString
      color = 'blue'
    }

    return (
      // had included 'direction: 'rtl' ' in this style, but that made some domains diplay in wrong orfer (seems to trip up on '-' characters, e.g., for domain 26-courier.push.apple.com)
      // take it out - see if there are any problems
      <div style={ { textAlign: 'right', color: color, backgroundColor: (ph.phiType==='unparseable' ? 'red' : 'white') } }>
        {displayString}
      </div>
    )
  },
  multiLineString: phGeneric.multiLineString,
  contentViewJSX: phGeneric.contentViewJSX
}




export function phActionButtons(ph: PH2, domainPattern: string, tempItems: ConfigItemRaw[], allowLabel: string, denyLabel: string, buttonSize?: 'large' | 'small'): { allowButton: JSX.Element, denyButton: JSX.Element } {
  const allowMatches = domainMatchTempItems(domainPattern, 'allow', tempItems)
  const allowMatchType = (allowMatches.exactMatches.length > 0) ? 'exact' : ((allowMatches.patternMatches.length > 0) ? 'pattern' : 'none')
  const allowIntent = (allowMatchType === 'exact') ? 'success' : ((allowMatchType === 'pattern') ? 'warning' : 'none')
  const denyMatches = domainMatchTempItems(domainPattern, 'deny', tempItems)
  const denyMatchType = (denyMatches.exactMatches.length > 0) ? 'exact' : ((denyMatches.patternMatches.length > 0) ? 'pattern' : 'none')
  const denyIntent = (denyMatchType === 'exact') ? 'success' : ((denyMatchType === 'pattern') ? 'warning' : 'none')
  return {
    allowButton:
      <Button
        key='allow'
        style={{fontSize: 'xx-small', minHeight: 12 }}
        small={(buttonSize === 'small') ? true : false}
        large={(buttonSize === 'large') ? true : false}
        intent={allowIntent}
        text={allowLabel}
        onClick={()=>{
          switch (allowMatchType) {
            case 'exact':
              (ph.parentTTable as TTablePH2).removeTempItems(allowMatches.exactMatches.map(m => m._id))
              break
            case 'pattern':
              (ph.parentTTable as TTablePH2).removeTempItems(allowMatches.patternMatches.map(m => m._id))
              break
            case 'none':
              (ph.parentTTable as TTablePH2).makeTempAllowItemsAndCommit([domainPattern], 'allow', 600)
              break
          }
        }}
      />,
    denyButton:
      <Button
        key='deny'
        style={{fontSize: 'xx-small', minHeight: 12 }}
        small={(buttonSize === 'small') ? true : false}
        large={(buttonSize === 'large') ? true : false}
        intent={denyIntent}
        text={denyLabel}
        onClick={()=>{
          switch (denyMatchType) {
            case 'exact':
              (ph.parentTTable as TTablePH2).removeTempItems(denyMatches.exactMatches.map(m => m._id))
              break
            case 'pattern':
              (ph.parentTTable as TTablePH2).removeTempItems(denyMatches.patternMatches.map(m => m._id))
              break
            case 'none':
              (ph.parentTTable as TTablePH2).makeTempAllowItemsAndCommit([domainPattern], 'deny', 600)
              break
          }
        }}
      />
    }
}


export const phTableActionColumn: TIPropFunctions = {
  hasPropItems: generic.hasPropItems,
  convertOnLoad: generic.convertOnLoad,
  testMethod: generic.testMethod,
  val: generic.val,
  active: generic.active,
  computeGroupProp(phg: PHG2, children: PHI2[], propName: string): string | number | undefined {
    return undefined
  },
  singleLineString: generic.singleLineString,
  singleLineJSX(propName: string, ph: PH2): JSX.Element | string {
    // INCORRECT/OBSOLETE ???   const ifSTemp = ph.parentTTable.parentDnDApp.server.lastServerStateReceived.ifSTemp
    // INCORRECT/OBSOLETE ???   if (ifSTemp === undefined) throw new Error('ph...parentTTable.ifSTemp is undefined')
    // else {
    // OBSOLETE  const allowMatches = domainMatchTempItems(ph.domain, 'allow', (ph.parentTTable as TTablePH2).currentTempItems)
    // OBSOLETE  const allowMatchType = (allowMatches.exactMatches.length > 0) ? 'exact' : ((allowMatches.patternMatches.length > 0) ? 'pattern' : 'none')
    // OBSOLETE  const allowIntent = (allowMatchType === 'exact') ? 'success' : ((allowMatchType === 'pattern') ? 'warning' : 'none')
    // OBSOLETE  const denyMatches = domainMatchTempItems(ph.domain, 'deny', (ph.parentTTable as TTablePH2).currentTempItems)
    // OBSOLETE  const denyMatchType = (denyMatches.exactMatches.length > 0) ? 'exact' : ((denyMatches.patternMatches.length > 0) ? 'pattern' : 'none')
    // OBSOLETE  const denyIntent = (denyMatchType === 'exact') ? 'success' : ((denyMatchType === 'pattern') ? 'warning' : 'none')
    const buttons = phActionButtons(ph, ph.domain, (ph.parentTTable as TTablePH2).currentTempItems, 'Allow Temp', 'Deny Temp', 'small')
    return (
      <div style={ { display: 'flex', flexDirection: 'row', alignItems: 'center' } }>
        {buttons.allowButton}
        {buttons.denyButton}
      </div>
    )
  },
  multiLineString: generic.multiLineString,
  contentViewJSX(ph: PH2, propName: string, includeCount: boolean, cvMode: CVMode): JSX.Element {
    // return div of rows of
    //    temp allow button | temp deny button | domain pattern
    //    rows are partial domains, with and without leading dots
    //    most specific first
    if (ph.domainParts.length === 0) return <div></div>

    const patternArray: string[] = []
    var pattern: string = ''
    for (let dp of ph.domainParts) {
      pattern = '.'+dp + pattern
      patternArray.push(pattern)
    }
    patternArray.pop()  // remove ph.domain with leading dot
    patternArray.push(ph.domain)

    return (
      <div>
        {
          patternArray.reverse().map(p => {
            const buttons = phActionButtons(ph, p, (ph.parentTTable as TTablePH2).currentTempItems, 'Allow Temp', 'Deny Temp', 'small')
            return (
              <div style={ { display: 'flex', flexDirection: 'row', alignItems: 'center' } }>
                {buttons.allowButton}
                {buttons.denyButton}
                <pre key='pre'>    </pre>
                {p}
              </div>
              )
          })
        }
      </div>
    )
  }
}

// TEMPORARY button group code from popup actions column
     //<ButtonGroup key='bg' style={{ paddingLeft: '10px', paddingRight: '10px', alignItems: 'left', backgroundColor: 'inherit'  } }>
      //  {
      //    Object.getOwnPropertyNames(itemTemplates).map(
      //      rt => <PopupActionButton ifBTemp={ifBTemp} itemTemplateName={rt} key={rt} hostname={ph.hostname} notes={'initiator was: '+ph.initiator} tabId={ph.tabId}/>
      //    )
      //  }
      //</ButtonGroup>

export const mapPMPH2: {[index: string]: TIPropFunctions} = {
  tiInfo                            : phGeneric,
  piholeState                       : phGeneric,
  domain                            : phDomain2,
  actions                           : phTableActionColumn,
  queryTypesString                  : phGeneric,
  queryIPsString                    : phGeneric,
  phOutcome                         : phGeneric,
  phOutcomeType                     : phGeneric,
  allowedResType                    : phGeneric,
  ipset                             : phGeneric,
  unresolvedResult                  : phGeneric,
  // OBSOLETE ifDecisionInforceConfigItemId     : phGeneric,
  // OBSOLETE ifDecisionResult                  : phGeneric,
  // OBSOLETE ifDecisionMatchingRegexPattern    : phGeneric,
  // OBSOLETE ifDecisionMatchType               : phGeneric,
  ifDecisionResult                  : phGeneric,
  ifDecisionMostSpecificMatchType   : phGeneric,
  ifDecisionPatternsThatApplied     : phGeneric,
  ifDecisionObject                  : phGeneric,
  domainIncludesDNSDOHDOT           : phGeneric,
  ndAllowed                         : phGeneric,
  ifNDRulesContradicted             : phGeneric,
  outcomeReason                     : phGeneric,
  isOverridden                      : phGeneric,
  phOutcomeException                : phGeneric,
  showType                          : phGeneric,
  hideType                          : phGeneric,
  phLogLine                         : phGeneric,
}

// colData[] for pihole log
const colDataPiholeLog2: ColData[] = [
  ['1', 'tiInfo','Info', 'ttCellPreWrap','', '100', 'desc' , 'none'],
  ['1', 'piholeState','PH State', 'ttCellPreWrap','', '80', 'none' , 'none'],
  ['1', 'domain','Domain', 'ttCellPreWrap','', '400', 'none' , 'none'],
  ['1', 'actions','Actions', 'ttCellPreWrap','', '200', 'none' , 'none'],
  ['1', 'queryTypesString','Query Types', 'ttCellPreWrap','', '100', 'none' , 'none'],
  ['1', 'queryIPsString','Query IPs', 'ttCellPreWrap','', '100', 'none' , 'none'],
  ['1', 'outcomeReason','Outcome Reason', 'ttCellPreWrap','', '80', 'none' , 'none'],
  ['1', 'isOverridden','Overridden?', 'ttCellPreWrap','', '80', 'none' , 'none'],
  ['1', 'phOutcomeException','Exception?', 'ttCellPreWrap','', '80', 'none' , 'none'],
  ['1', 'phOutcome','PH Outcome', 'ttCellPreWrap','', '80', 'none' , 'none'],
  ['1', 'phOutcomeType','PH Outcome Type', 'ttCellPreWrap','', '100', 'none' , 'none'],
  ['1', 'allowedResType','Res. Type', 'ttCellPreWrap','', '200', 'none' , 'none'],
  ['1', 'ipset','IP Set', 'ttCellPreWrap','', '200', 'none' , 'none'],
  ['1', 'unresolvedResult','Unresolved Result', 'ttCellPreWrap','', '200', 'none' , 'none'],
  ['1', 'domainIncludesDNSDOHDOT','dns domain', 'ttCellPreWrap','', '200', 'none' , 'none'],
  ['1', 'ifDecisionResult','Dec. Result', 'ttCellPreWrap','', '200', 'none' , 'none'],
  ['1', 'ifDecisionMostSpecificMatchType','Dec. Specificity', 'ttCellPreWrap','', '200', 'none' , 'none'],
  ['1', 'ifDecisionPatternsThatApplied','Dec. Patt. Applied', 'ttCellPreWrap','', '200', 'none' , 'none'],
  ['1', 'ifDecisionObject','Dec. Object', 'ttCellPreWrap','', '200', 'none' , 'json'],
  ['1', 'ifNDRulesContradicted','Rules Contradicted', 'ttCellPreWrap','', '200', 'none' , 'none'],
  ['1', 'ndAllowed','ND Allowed', 'ttCellPreWrap','', '200', 'none' , 'none'],
  ['1', 'showType','showType', 'ttCellPreWrap','', '200', 'none' , 'none'],
  ['1', 'hideType','hideType', 'ttCellPreWrap','', '200', 'none' , 'none'],
  // OBSOLETE  ['1', 'ifDecisionInforceConfigItemId','Decision Config Id', 'ttCellPreWrap','', '200', 'none' , 'none'],
  // OBSOLETE  ['1', 'ifDecisionResult','Decision Result', 'ttCellPreWrap','', '200', 'none' , 'none'],
  // OBSOLETE  ['1', 'ifDecisionMatchingRegexPattern','Decision Match Pattern', 'ttCellPreWrap','', '200', 'none' , 'none'],
  // OBSOLETE  ['1', 'ifDecisionMatchType','Decision Match Type', 'ttCellPreWrap','', '200', 'none' , 'none'],
  ['1', 'phLogLine','Log Line', 'ttCellPreWrap','', '200', 'none' , 'none'],
].map((v: string[]) => {return new ColData(v[1], v[2], v[4], (v[6]==='asc') ? SortDirs.asc : ((v[6]==='desc') ? SortDirs.desc : SortDirs.none), 0, parseInt(v[5]), v[3], Number.parseInt(v[0]), v[7] as CVMode)})


export interface PHFilter {
  active: boolean
  buttonLabel: string
  testAndGroup: TestAndGroup
}

export interface TTablePHConstructorProps2 extends Omit<TTableLVConstructorProps2, 'tableType' | 'tiPropFunctions' | 'initialColData' | 'changeTrackingSetupEnabled' | 'changeTrackingActiveAtConstruction'> {
  onLogStreamSocketOpenCallback?: ()=>void // optional - parent can provide callback for when logstream socket is open
}

export class TTablePH2 extends TTableLV2 {

  root: PHG2 // to avoid mobx error about changing observable without action   = new PHG2('phG', this)

  piholeState: number = 0  // to populate keys and piholeState prop, for distinguishing across pihole restarts
  // parsing state for multi-line blocks
  // if last line parsed was (or could be) part of multiline block, store refs to it in state
  // so parser can handle next line accordingly
  lastPHIResAdded: PHI2Res | undefined
  lastPHGAdded: PHG2 | undefined
  unmatchedQueryPHIs: Map<string, PHI2Query[]> = new Map()

  get currentTempItems(): ConfigItemRaw[] {
    return this.parentDnDApp.server.lastServerStateReceived.ifSTemp.children
  }

  hideFilters: {[index: string]: PHFilter } = {} // will set up in constructor
  showFilters: {[index: string]: PHFilter } = {} // will set up in constructor

  constructor(props: TTablePHConstructorProps2) {
    super({
      parentDnDApp: props.parentDnDApp,
      // OBSOLETE parentServiceOpHandler: props.parentServiceOpHandler,
      tableName: props.tableName,
      tableType: 'PHLogView',
      rootTIGConstructor: (kind: LVKindsG, parentTTable: TTableLV2)=>{return new PHG2('rootG', parentTTable as TTablePH2)},
      // note: root.parentTTable will be set in TTable constructor
      tiPropFunctions: mapPMPH2,
      initialColData: colDataPiholeLog2,
      columnVisibleLevel: 1,
      showUnsavedChanges: false,
      onLogStreamSocketOpenCallback: props.onLogStreamSocketOpenCallback,
    })

    for (let k of phHideTypeKeysAndLabels) {
      const newTestAndGroup = new TestAndGroup(this.hideTests, this.parentDnDApp)
      const newTest = new Test(
        newTestAndGroup, 
        this.parentDnDApp, 
        'hideType', 
        'Hide Type', 
        true, 
        new RegExp(k[0]),
        (propValue: string, trueIfEqual: boolean, regex: RegExp, ifChildTIIResultsDisagree: boolean)=>(propValue === k[0]) // hides only if exact match
      )
      newTestAndGroup.addTest(newTest, 0)
      this.hideFilters[k[0]] = {
        active: false,
        buttonLabel: k[1],
        testAndGroup: newTestAndGroup,
      }
    }
    for (let k of phShowTypeKeysAndLabels) {
      const newTestAndGroup = new TestAndGroup(this.showTests, this.parentDnDApp)
      const newTest = new Test(
        newTestAndGroup, 
        this.parentDnDApp, 
        'showType', 
        'Show Type', 
        true, 
        new RegExp(k[0]),
        (propValue: string, trueIfEqual: boolean, regex: RegExp, ifChildTIIResultsDisagree: boolean)=>(propValue.includes(k[0]))  // shows if prop includes pattern
      )
      newTestAndGroup.addTest(newTest, 0)
      this.showFilters[k[0]] = {
        active: false,
        buttonLabel: k[1],
        testAndGroup: newTestAndGroup,
      }
    }
    

    makeObservable(this, {
      currentTempItems: computed({keepAlive: true}),
      hideFilters: observable,
      showFilters: observable,
      clearTableContents: override,
      clearTests: override,
      makeTempAllowItemsAndCommit: action.bound,
      removeTempItems: action.bound,
    })

    runInAction(()=>{
      this.root = new PHG2('phG', this)   // do this here in lieu of initializer at declaration
      this.root.expanded = true
    })

    this.sortComparer = this.sortComparer.bind(this)


  }


  // copy of base class implementation
  // two changes:
  //  always sort PHIs in ascending order of seqNo within a PHG
  //  special case handling for domain - sort based on domainParts, by part
  sortComparer(a: PH2, b: PH2): number {
    if (a.group === 'no') {
      if (a.seqNo < b.seqNo) return -1
      else return 1
    }
    // return negative number if a should be before b
    // return 0 if a and be should remain unchanged in order
    // return positive number if b should be before a
    let colProp: string
    // compare using props in sortCols
    for (let i: number = 0; i < this.sortCols.length; i++) {
      colProp = this.sortCols[i].prop
      const aval = a[colProp]
      const bval = b[colProp]
      // always make undefined values go to bottom of list
      if (aval === undefined) return 1
      else if (bval === undefined) return -1
      else if (this.sortCols[i].sortDir === SortDirs.asc) {
        if (colProp === 'domain') return sortComparerUsingDomainParts2(a, b)
        if      (aval < bval) return -1;
        else if (aval > bval) return  1;
      } else {
        if (colProp === 'domain') return sortComparerUsingDomainParts2(b, a)
        if      (aval > bval) return -1;
        else if (aval < bval) return  1; 
      }
    }
    return 0
  }


  resetParsingState() {
    this.lastPHIResAdded = undefined
    this.unmatchedQueryPHIs = new Map()
  }
  clearTableContents() {
    super.clearTableContents()
    this.resetParsingState()
  }

  clearTests() {
    super.clearTests()
    for (let hf in this.hideFilters) this.hideFilters[hf].active = false
    for (let sf in this.showFilters) this.showFilters[sf].active = false
  }

  isRestart(logLine: string) {
    return (regexRestartReload.exec(logLine) !== null)
  }

  // takes an array of domain strings - can have leading dots or not
  // expirationSeconds is the expiration time for each item to create
  async makeTempAllowItemsAndCommit(domains: string[], action: 'allow' | 'deny', expirationSeconds: number) {
    const tempItems: ConfigItemRaw[] = []

    // for each ph, add to tempItems
    for (let d of domains) {
      const exact = (d.slice(0,1) !== '.')
      const dWithoutLeadingDot = exact ? d : d.slice(1)
      const newTempItem: ConfigItemRaw = makeNewConfigItemRaw({
        tool_pihole: true,
        tempItem: true,
        expirationTime: 0,  // value will be replaced by server, based on service op expiration_seconds
        notes: 'temp pihole item from viewer',
        priority: '100',
        requestAction: action,
        // SWITCH TO JUST USING PLAIN DOMAIN OR LEADING DOT hostDomainPatterns: (exact ? '^' : '(\.|^)') + dWithoutLeadingDot + '$',
        hostDomainPatterns: (exact ? '' : '.') + dWithoutLeadingDot
      })

      tempItems.push(newTempItem)
    }

    // commit new temp items to server
    // OBSOLETE const so: ServiceOperationConfigPush = {
    // OBSOLETE   uuid: uuidv4(),
    // OBSOLETE   status: '-1',
    // OBSOLETE   status_text: '',
    // OBSOLETE   can_retry: 'no',
    // OBSOLETE   server_state: '',
// OBSOLETE 
    // OBSOLETE   subject: 'config',
    // OBSOLETE   op_type: 'push',
    // OBSOLETE   push_type: 'temp',
    // OBSOLETE   generate_lsrules: 'false',
    // OBSOLETE   payload: {
    // OBSOLETE     md: {
    // OBSOLETE       id: '',
    // OBSOLETE       timestamp: Date.now(), 
    // OBSOLETE       modified: true, 
    // OBSOLETE       notes: '<temp items from TTableLV>',
    // OBSOLETE       lastIdSaved: '<temp items from TTableLV>'
    // OBSOLETE     },
    // OBSOLETE     children: tempItems,
    // OBSOLETE     timestampLastArrayMod: Date.now()
    // OBSOLETE   },
    // OBSOLETE   expiration_seconds: expirationSeconds.toString()
    // OBSOLETE }
    const op: WSWMsgOpTypes = {
      msgType: 'configop',
      op_type: 'push',
      push_type: 'temp',
      generate_lsrules: 'false',
      payload: {
        md: {
          id: '',
          timestamp: Date.now(), 
          modified: true, 
          notes: '<temp items from TTableLV>',
          lastIdSaved: '<temp items from TTableLV>'
        },
        children: tempItems,
        timestampLastArrayMod: Date.now()
      },
      expiration_seconds: expirationSeconds.toString(),
      trail: [`TTablePH2 makeTempItemsAndCommit`]
    }
    // OBSOLETE const r = await this.parentServiceOpHandler(so)
    this.queueServerOp(op)

    // no need to update table state - that will happen via server state received back
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
      trail: [`TTablePH2 removeTempItems`]
    }
    this.queueServerOp(op)

    // no need to update table state - that will happen via server state received back

  }

  // if ids is empty, remove all temp items
  async tempToNonTemp(ids: string[]) {
    const idsToMove = (ids.length !== 0) ? ids : this.root.children.filter(c => c.tempItem).map(i => i._id)
    const op: WSWMsgOpTypes = {
      msgType: 'configop',
      op_type: 'push',
      push_type: 'temptonontemp',
      generate_lsrules: 'false',
      payload: idsToMove,
      trail: [`TTablePH2 tempToNonTemp`]
    }
    this.queueServerOp(op)

    // no need to update table state - that will happen via server state received back

  }
  /*
    new parsing approach

      **** ALSO SEE NOTES WITH parsePHLogLineRaw FUNCTION ****

      general principles
        ttable will contain one phi per resolution line
          queries will be linked to resolutions (see below)
          each link in a cname chain will be a separate phi, and alias's/canonicals will be linked
        we will parse and add to table every resolution we find
          including 'unparseable' lines
          including 'unresolved' resolutions (e.g., NODATA)
          because we want to have the entire ph log history for inspection if
            we notice new patterns or unexpected results
        for things we might not want to see because they would be clutter,
          parse and add to the ttable
          but also create props and filtering mechanisms to facilitate filtering down to only those 
            we want to see in a compact list for rule-making decisions
        this function has no 'lookahead' capability, i.e., no way of knowing what subsequent log lines are
          so, in one case (so far) (queries linking to res's, cached-forwarded), 
            once we see a line that indicates a previous phi needs to be changed,
            we go back and clean it up


      cases of, and exceptions to, above principles
        exceptions to keeping everything
          'forwarded' lines
            these will not produce phis, they provide no information of any interest
          cached-forwarded pattern
            see notes in body of function about cached-forwarded pattern
            in these cases, we will remove the cached resolution that was followed by forwarded
        queries
          will not be phis in ttable, but will be linked to associated resolutions,
          to facilitate filtering to only phis from one client
          see notes below on assumptions around this
        multiple resolutions for same domain
          can see multiple resolutions for same domain
            e.g., if there was an A query and a AAAA
            will just include these both in phi list - some redundancy, but not worth the trouble to try to consolidate them
            sometimes (often?) one of the resolutions will be an 'unresolved', which we will typically hide in compact views like popup
          which resolution to associate queries with?
            in the case of multiple resolutions, there is no definitive way to know which query
            goes with which resolution
            will just link the queries to the first NON-UNRESOLVED resolution
        'unresolved' resolutions
          e.g., reply .... is NODATA
          will keep these, but have option to filter them out of table view
        multiple queries for same domain
          if there are multiple queries, they may be associated with separate resolutions or the same one
          there is no definitive way to associate each query with one specific resolution
          we will just link queries to the next NON-UNRESOLVED resolution for the same domain
          query lines that come in will temporarily go in this.unmatchedQueryPHIs (a map keyed by domain)
            when a resolution comes in, and unmatched query PHIs for the same domain will be associated with that resolution
              and removed from the unmatched map
            i.e, we assume that any query for a domain is associated with the next resolution for that domain that appears
              ==> THIS COULD BE AN INCORRECT ASSUMPTION - WILL REVISIT IF IT CAUSES PROBLEMS


      how queries are linked to phis
        when a resolution is 'allowed but unresolved'
          often log line sequence will be
            query[A]
            query[AAAA]
            reply .... is NODATA
            reply .... is 1.2.3.4
          i.e., client will issue two queries, one of which results in NODATA
          we want the queries to be linked to both resolutions
          so, if we get to an 'allowed but unresolved' resolution, we put any queries linked to it back into the unmatched map, so they can also be linked to the resolved resolution
        for cname chains
          queries get directly linked to first res in the chain, because that is the one where domain will match the query domain
          canonicals res's in the chain will get queryTypeString nd queryIPString by chasing the cname chain to the first resolution


  */

  

  parseLVIRaw(line: string) {

    // if (/blocked during CNAME/.test(line)) {
    //   //cl(line)
    // }


    const phiRaw = parsePHLogLineRaw(line)

    // for easy viewing of things in debugger
    const rootChildren = this.root.children
    const unmQs = this.unmatchedQueryPHIs
    
    ////cl(`parsing line ${line}`)

    switch(phiRaw.phiType) {
      case 'restart':   // if line indicates a restart/reload, update state and skip this line
        this.piholeState++
        this.resetParsingState()
        break
      case 'query':
        const newQueryPHI = new PHI2Query(this, this.piholeState, phiRaw)
        // remove lastPHIResAdded, if any
        this.lastPHIResAdded = undefined
        // add to unmatched query PHI map
        const unmatchedMapEntry2 = this.unmatchedQueryPHIs.get(phiRaw.domain)
        if (unmatchedMapEntry2) {
          unmatchedMapEntry2.push(newQueryPHI as PHI2Query)
          this.unmatchedQueryPHIs.set(phiRaw.domain, unmatchedMapEntry2)
        }
        else this.unmatchedQueryPHIs.set(phiRaw.domain, [newQueryPHI as PHI2Query])
        break
      case 'forwarded':
        // do nothing with 'forwarded', unless it is part of a cached-forarded pattern
        // cached-forward pattern
        //   what is it?
        //     when a cname chain is cached, each link in the chain may have different ttl's
        //    if the alias is still 'alive' but a canonical is 'dead',
        //      first a 'cached' line will appear in the log
        //      then pihole will realize that it has to forward the whole query upstream
        //      so a forwarded line appears right after it
        //    apparently, the forwarded line will appear right after the first 'cached <domain> is <CNAME>' line,
        //      so, if we see a forwarded, we only need to check back on the immediate last PHIRes added
        //   what to do
        //    we just want to ignore these - there will be a subsequent reply which is what the querying client will see
        //    for any forwarded line, check if immediate prior line was a cached ... is <CNAME> line
        //    if so, remove the previously added PHI from table
        const partsForwarded = regexForwarded.exec(line)
        if (partsForwarded !== null) {
          if (this.lastPHIResAdded) {  
            if (   // only do this if ...
              (this.lastPHIResAdded.phOutcomeType === 'cached')   // last phires was 'cached'
              && (this.lastPHIResAdded.allowedResType === 'cname')     // and last phires was a <CNAME> res
              && (this.lastPHIResAdded.domain === partsForwarded[4])  // and domains match
            ) {
              // PHG for lastPHIResAdded needs to be removed from table
              // probably it is the last item in this.root, but just in case, let's find it by finding last PHG with matching domain

              const li = this.root.children.findLastIndex(phg => (phg.domain === partsForwarded[4]))
              if (li === -1) {
                throw new Error(`tried to find PHG matching domain in cached/forwarded pattern (${partsForwarded[4]}), but not found`)
              }
              //cl(`cached-forwarded pattern - removing PHG for: ${this.root.children[li].phLogLine}`)
              //cl(`related to forwarded phi ${phiRaw.phLogLine}`)
              this.root.children.splice(li, 1)



              // OBSOLETE = FROM WHEN WE DID NOT HAVE PHGs  const i = this.root.children.findIndex(p => (p === this.lastPHIResAdded))
              // OBSOLETE = FROM WHEN WE DID NOT HAVE PHGs  if (i === -1) {
              // OBSOLETE = FROM WHEN WE DID NOT HAVE PHGs    throw new Error(`tried to find lastPHIResAdded in this.root.children, but not found`)
              // OBSOLETE = FROM WHEN WE DID NOT HAVE PHGs  }
              // OBSOLETE = FROM WHEN WE DID NOT HAVE PHGs  //cl(`cached-forwarded pattern - removing PHI for: ${this.root.children[i].phLogLine}`)
              // OBSOLETE = FROM WHEN WE DID NOT HAVE PHGs  //cl(`related to forwarded phi ${phiRaw.phLogLine}`)
              // OBSOLETE = FROM WHEN WE DID NOT HAVE PHGs  this.root.children.splice(i, 1)

              // anything else to clean up?
              //  lastPHIRes should not have any alias or canonical - but check and throw error if so
              if ((this.lastPHIResAdded.alias !== undefined) || (this.lastPHIResAdded.canonical !== undefined)) throw new Error(`cached-forward pattern - trying to delete a cached...CNAME phi and it has alias or canonical - unexpected pattern`)
              //  if lastPHIRes has any queries, put them back in unmatchedMapEntry
              var unmatchedMapEntry = this.unmatchedQueryPHIs.get(this.lastPHIResAdded.domain)
              if (unmatchedMapEntry === undefined) unmatchedMapEntry = []
              if (this.lastPHIResAdded.queries) unmatchedMapEntry.push(...this.lastPHIResAdded.queries)
              this.unmatchedQueryPHIs.set(this.lastPHIResAdded.domain, unmatchedMapEntry)
            }
          }
        }
        else {
          throw new Error(`phiRaw.phiType is 'forwarded' but line does not match regexForwarded`)
        }
        break
      case 'unparseable':
        // remove lastPHIResAdded, if any
        this.lastPHIResAdded = undefined
        this.root.addDirectChild(new PHI2Unparseable(this, this.piholeState, phiRaw))
        break
      case 'res':    
        // first check if this is an ip resolution line
        // if a continuation, update lastPHIAdded
        if ((phiRaw.phiType === 'res')
              && (phiRaw.ipset) //  (regexResolutionWithIPOnly.test(line)
              && (this.lastPHIResAdded) 
              && (this.lastPHIResAdded.phiType === 'res') 
              && (this.lastPHIResAdded.allowedResType === 'ipset')
              && (this.lastPHIResAdded.domain === phiRaw.domain)
        ) this.lastPHIResAdded.ipset += ', ' + phiRaw.ipset
        else {
          var newPHI: PHI2Res | undefined
          switch (phiRaw.phOutcomeType) {
            case 'gravity blocked':
            case 'regex blacklisted':
            case 'Apple iCloud Private Relay domain':
            case 'special domain':
              newPHI = new PHI2Res(this, this.piholeState, phiRaw)
              break
            case 'reply':
            case 'cached':
            case 'config':
            case '/etc/hosts':
              if (phiRaw.allowedResType === 'allowed but unresolved') {
                newPHI = new PHI2Res(this, this.piholeState, phiRaw)
              }
              else if (phiRaw.allowedResType === 'cname') {
                newPHI = new PHI2Res(this, this.piholeState, phiRaw)
              }
              else if ((phiRaw.allowedResType === 'ipset') && phiRaw.ipset) {  // this is an IP reply
                newPHI = new PHI2Res(this, this.piholeState, phiRaw)
              }
              break
            case 'blocked during CNAME inspection':
              newPHI = new PHI2Res(this, this.piholeState, phiRaw)
              break
            default:   // if did not match any case above, leave newPHI undefined
              break
          }
          // add the new PHI
          // crash if line does not fit in any of the above patterns
          if (newPHI === undefined) {
            throw new Error(`TTablePH.parseLVIRaw does not recognize \n  ${line}`)
          }
          else {
            // link canonical and alias phis
            if (
              // (newPHI.phOutcomeBinary === 'allowed')
              //&& 
              // remove above condition - also want to link a prior allowed-cname to a current blocked during CNAME resolution
              (this.lastPHIResAdded)
              && (this.lastPHIResAdded.phOutcome === 'allowed')
              && (this.lastPHIResAdded.allowedResType === 'cname')
            ) {
              this.lastPHIResAdded.canonical = newPHI
              newPHI.alias = this.lastPHIResAdded
            }
            // match PHIQuerys to this resolution
            const unmatchedMapEntry = this.unmatchedQueryPHIs.get(phiRaw.domain)
            if (unmatchedMapEntry) {
              newPHI.queries = unmatchedMapEntry
              this.unmatchedQueryPHIs.delete(phiRaw.domain)
            }
            // if this res is 'allowed but unresolved', put any matched queries back into unmatched map, so they can be linked to a subsequent resolved res
            if (newPHI.allowedResType === 'allowed but unresolved') {
              const qs = newPHI.firstPHIRes.queries
              if (qs !== undefined) {
                this.unmatchedQueryPHIs.set(newPHI.firstPHIRes.domain, qs)
              }
            }
            this.lastPHIResAdded = newPHI

            // if newPHI has an alias, add to last PHG
            // else start a new PHG
            if (newPHI.alias) {
              runInAction(()=>{ this.lastPHGAdded?.addDirectChild(newPHI as PHI2) } )
            }
            else {
              const newPHG = new PHG2('phG', this)
              //newPHG.expanded = true
              runInAction(()=>{
                newPHG.addDirectChild(newPHI as PHI2)
                this.root.addDirectChild(newPHG)
    
              })
              this.lastPHGAdded = newPHG
            }
          }

          // PRIOR CODE - OBSOLETE? - FROM WHEN WE HAD NO HIERARCHY  this.root.addDirectChild(newPHI)
        }
        break
    }

    
  }
}









