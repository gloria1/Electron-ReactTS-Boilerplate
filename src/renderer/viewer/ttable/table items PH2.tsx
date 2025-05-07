
import { observable, computed, runInAction, makeObservable, action, override } from 'mobx'
import { Annotation, AnnotationsMap } from 'mobx/dist/internal';

import { KindsI, PHKindsG, PHKindsI } from '../common/commonAll'
import { ConfigRulePihole, DecisionInfoPiholeQuery, DecisionResultsAllowDeny, DomainPatternSpecificity } from '../common/configTypesTypes';
import { TII, TIG } from './table items base'
import { LVG2, LVI2 } from './table items LV2';
import { TTable } from './TTable base Obj'
import { TTablePH2 } from './TTablePH2';
import { commonDomainParts2, mapPMPH2 } from './TTablePH2'
import { PHI2Type, PHIRaw, PHOutcomeType, PHOutcomeTypeAllowed, PHAllowedResolutionType, PHIRawUnion, PHIRawOther, PHIRawQuery, PHIRawRes, PHIOutcome } from '../common/configTypesToolPihole';


var _ = require('lodash')


const cl = console.log

const dnsdohdotRegex = /(dns|doh|dot)/


/// ORDER OF CALCULATION FOR PROPS
//    populated in phiRaw:
//      ifDecision
//      phOutcome: 'allowed' | 'blocked'
//      phOutcomeType: 'reply' | 'cached' | 'gravity blocked' etc - the keyword on the pihole log line
//      resType: 'cname' | 'ipset' | 'allowed but unresolved'
//
//    computed in PHI2Res, base only on phi itself
//      firstPHIRes - chases alias chain to first phi in phg
//      domainIncludesDNSDOHDOT
//      ifDecisionResult - action of most specific rule that applied, undefined if none
//      ifDecisionMostSpecificMatchType - specificity of most specific rule that applied, undefined if none
//      ifDecisionPatternsThatApplied - string, \n joined patterns for all rules that applied
//      ifDecisionObject - string, JSON.stringified ifDecision
//      ndAllowed - boolean, true if allowed by a non-default rule
//      ifNDRulesContradicted - string, \n joined list of contradicted rule patterns
//      ifDecisionResult - result of most specific rule that applied
//      outcomeReason - string
//        FIRST PASS:
//          reason for outcome, but without whether the outcome was allowed or blocked
//          includes annotation if rules contradicted in this phi
//          'ph default' | 'gravity blocked' | '.*' | 'exact' etc. etc.
// 
//    computed in phg
//      phiThatDecided
//      overriddenPHIs
//      (all phi props - aggregated per logic in phGeneric.computeGroupProp)
//        special cases:
//          outcomeReason - phi.outcomeReason from phiThatDecided
//              with annotation for phi's that were overridden
// 
//    computed in phi, with dependency on other children in phg
//      outcomeReason - string
//        as above, but also 
//        annotated if this phi's decision overridden by alias
// 
//      phOutcomeException
// 
//    computed in phg
//      phOutcomeException - for display only, comma-joined list of childrens'
//      showType - union of childrens' excpetions (for now, this is same as phg.phOutcomeException)
//        show filters will be 'includes', so they match substring of showType
//      hideType
// 
//    computed in phi
//      showType - inherit from phg
//      hideType - inherit from phg

// outcomeException, hideType and showType:
//    outcomeException will be computed at phi and phg level
//      return undefined if nothing notable
//      else return a string 
//      phg level will be , joined list of set across children
//    hideType will be computed at phg level, then inherited down to phi
//      so that tests will hide or not hide an entire phg
//      hideType will be categories of phgs we want to hide to reduce noise in view
//        e.g., we want to hide all gravity blocked
//    showType will be computed at phg level, then inherited down to phi
//      based on childrens' exceptions
//      used for show tests (which override hide tests)

export type PHOutcomeException = 'INCONSISTENT' // there is an ifDecision, but phOutcome not consistent with that decision
                                | 'dns/doh/dot domain ndAllowed'
                                | 'dns/doh/dot domain NOT ndAllowed'
                                | 'phi has contradicted non-default deny rule'
                                | 'phi denied by non-default rule but overridden by alias'

export type PHHideType = 'gravity blocked' | 'blocked non .*' | 'blocked .*' | 'allowed non .*' | 'allowed ph default'
// array of PHHideType values and button labels - used for indexing over TTablePH.hideFilters map
// first item of each must correspond to PHHideType values
// we use array so that order dictates the order buttons will appear
export const phHideTypeKeysAndLabels: string[][] = [ 
  [ 'gravity blocked', 'GB' ],
  [ 'blocked non .*', 'BNonD' ],
  [ 'blocked .*', 'BD' ],
  [ 'allowed non .*', 'ANonD' ],
  [ 'allowed ph default', 'AD' ],
  [ 'no data', 'ND Resol']
]

export type PHShowType = PHOutcomeException
// array of PHShowType values and button labels - used for indexing over TTablePH.hideFilters map
// first item of each must correspond to PHShowType values
export const phShowTypeKeysAndLabels: string[][] = [ 
  [ 'INCONSISTENT', 'INC' ],
  [ 'dns/doh/dot domain ndAllowed', 'DoH All.' ],
  [ 'dns/doh/dot domain NOT ndAllowed', 'DoH Not All.' ],
  [ 'phi has contradicted non-default deny rule', 'ND Deny Contra.' ],
  [ 'phi denied by non-default rule but overridden by alias', 'ND Rule Overridden' ],
]









//#region PHI2Base
export class PHI2Base extends LVI2 {
  kind: PHKindsI = 'phI'
  readonly phiType: PHI2Type
  readonly domain: string
  readonly piholeState: string
  readonly phTimestamp: string
  readonly phLogLine: string
  get domainParts(): string[] { return (this.domain === '') ? [] : this.domain.split('.').reverse() }

  constructor(parent: TTablePH2, piholeState: number, phiRaw: PHIRawUnion) {
    super(parent)
    this.phiType = phiRaw.phiType
    this.phTimestamp = phiRaw.phTimestamp
    this.phLogLine = phiRaw.phLogLine
    this.domain = phiRaw.domain
    this.piholeState = piholeState.toString()
    makeObservable(this, {
      domain: observable,
      domainParts: computed({keepAlive: true})
    })
  }
}
//#endregion

export class PHI2Unparseable extends PHI2Base implements PHIRawOther {
  readonly phiType = 'unparseable'
}

export class PHI2Query extends PHI2Base implements PHIRawQuery {
  readonly phiType: 'query' = 'query'

  readonly queryType: string
  readonly fromIp: string

  constructor(parent: TTablePH2, piholeState: number, phiRaw: PHIRawQuery) {
    super(parent, piholeState, phiRaw)
    this.parentTTable = parent
    this.queryType = phiRaw.queryType as string
    this.fromIp = phiRaw.fromIp as string
    makeObservable(this, {
    })
  }
}

export class PHI2Res extends PHI2Base implements PHIRawRes {
  readonly phiType: 'res' = 'res'
  parentTIG: PHG2 | undefined

  // refs to related PHIs
  queries: PHI2Query[] | undefined = undefined
  alias: PHI2Res | undefined = undefined
  canonical: PHI2Res | undefined = undefined

  readonly phOutcome: PHIOutcome
  readonly phOutcomeType: PHOutcomeType
  readonly allowedResType: PHAllowedResolutionType | undefined = undefined
  ipset: string | undefined = undefined   // not readonly because parsing can modify an already existing ipset
  readonly unresolvedResult?: string | undefined = undefined

  // OBSOLETE readonly ifDecisionInforceConfigItemId?: string
  // OBSOLETE readonly ifDecisionResult?: 'allow' | 'deny'
  // OBSOLETE readonly ifDecisionMatchingRegexPattern?: string
  // OBSOLETE readonly ifDecisionMatchType?: DomainPatternSpecificity
  readonly ifDecision?: DecisionInfoPiholeQuery = undefined

  // gets first res in cname chain (returns either this, or chases alias's to get first in chain)
  get firstPHIRes(): PHI2Res {
    var firstph: PHI2Res = this
    while (firstph.alias !== undefined) firstph = firstph.alias
    return firstph
  }

  get queryTypesString(): string | undefined {
    //cl(`computing queryTypesString`)
    const qs = this.firstPHIRes.queries
    if (qs === undefined) return undefined
    else {
      if (qs.length === 0) return undefined
      else {
        const uniqueTypes: {[index: string]: number} = {}
        for (let q of qs) {
          if (uniqueTypes[q.fromIp]) uniqueTypes[q.queryType]++
          else uniqueTypes[q.queryType] = 1
        }
        var result: string = ''
        for (let i in uniqueTypes) result += `${i} (${uniqueTypes[i]}), `
        return result.slice(0, -2)
      }
    }
  }

  get queryIPsString(): string | undefined {
    //cl(`computing queryIPsString`)
    const qs = this.firstPHIRes.queries
    if (qs === undefined) return undefined
    else {
      if (qs.length === 0) return undefined
      else {
        const uniqueIPs: {[index: string]: number} = {}
        for (let q of qs) {
          if (uniqueIPs[q.fromIp]) uniqueIPs[q.fromIp]++
          else uniqueIPs[q.fromIp] = 1
        }
        var result: string = ''
        for (let i in uniqueIPs) result += `${i} (${uniqueIPs[i]}), `
        return result.slice(0, -2)
      }
    }
  }

  get domainIncludesDNSDOHDOT(): 'yes' | 'no' {
    return dnsdohdotRegex.test(this.domain) ? 'yes' : 'no'
  }

  get ifDecisionResult(): DecisionResultsAllowDeny | undefined {
    if ((this.ifDecision) && (this.ifDecision.rulesThatApplied.length > 0)) return this.ifDecision.rulesThatApplied[0].rule.requestAction
    else return undefined
  }

  get ifDecisionMostSpecificMatchType(): DomainPatternSpecificity | undefined {
    if ((this.ifDecision) && (this.ifDecision.rulesThatApplied.length > 0)) return this.ifDecision.rulesThatApplied[0].specificity
    else return undefined
  }

  get ifDecisionPatternsThatApplied(): string | undefined {
    if ((this.ifDecision) && (this.ifDecision.rulesThatApplied.length > 0)) {
      return `(${this.ifDecision.rulesThatApplied.length}) ` + this.ifDecision.rulesThatApplied.map(r => r.rule.domainRegexPattern+'\n').join('')
    }
    else return undefined
  }

  get ifDecisionObject(): string | undefined {
    if (this.ifDecision) return JSON.stringify(this.ifDecision, null, 2) + '\n'
  }

  get ndAllowed(): 'yes' | 'no' {
    if ((this.ifDecision) && (this.ifDecision.result === 'allow')) {
      for (let r of this.ifDecision.rulesThatApplied) {
        if (r.specificity !== '.*') return 'yes'
      }
      return 'no'
    }
    else return 'no'
  }

  get ifNDRulesContradicted(): string  {
    if (this.ifDecision === undefined) return ''
    else {
      return (this.ifDecision.rulesContradicted.filter(r => (r.specificity !== '.*'))).map(r => `${r.rule.requestAction} ${r.rule.domainRegexPattern}`).join('\n')
    }
  }

  get outcomeReason(): string {
    var result: string
    // if pihole standard logic decided, return that result
    switch (this.phOutcomeType) {
      case 'Apple iCloud Private Relay domain': result = 'ph default'; return result
      case 'special domain':                    result = 'ph default'; return result
      case 'config':                            result = 'ph default'; return result
      case '/etc/hosts':                        result = 'ph default'; return result
      case 'gravity blocked':                   result = 'gravity blocked'; return result
      default:   break   // fall through to next logic
    }
    // else check if allowed due to alias decision
    // else check ifDecision
    if ((this.ifDecision) && (this.ifDecision.rulesThatApplied.length > 0)) {
      switch (this.ifDecision.rulesThatApplied[0].specificity) {
        case '.*':              result = '.* rule'; break
        case 'exact':           result = 'exact domain'; break
        case 'leadingdot':      result = 'leading dot domain'; break
        case 'regex':           result = 'regex pattern'; break
        default:                throw new Error(`PHIRes.outcomeReason - UNEXPECTED VALUE FOR ifDecisionMatchType: ${JSON.stringify(this.ifDecision, null, 2)}`)
      }
    }
    else result = 'ph default'
    // annotate if this phi's outcome was overridden
    if (this.parentTIG) if (this.parentTIG.overriddenPHIs.includes(this)) result += ' (overridden by alias)'
    // annotate if this phi had contradicted non-default rules
    if (this.ifNDRulesContradicted !== '') {
      const ndrc = this.ifNDRulesContradicted.split('\n')
      if (ndrc.length > 0) result += ` (contradicted ${ndrc.join(', ')})`
    }

    return result
  }

  get isOverridden(): 'yes' | 'no' {
    if (this.parentTIG === undefined) return 'no'
    else if (this.parentTIG.overriddenPHIs.includes(this)) return 'yes'
    else return 'no'
  }

  get phOutcomeException(): string | undefined {

    // special case:
    // IF A DOMAIN WAS PREVIOUSLY BLOCKED DURING CNAME INSPECTION
    // SUBSEQUENT QUERIES TO THIS DOMAIN WILL GET A SINGLE PHI REPLY 'regex blacklisted', WITHOUT THE CNAME CHAIN
    // (or at least the very next query - maybe this only happens when there is an HTTPS and A query in succession)
    // THIS LOGIC ONLY CHECKS THE IMMEDIATE PRIOR PHG - (AT LEAST FOR NOW) NOT GOING TO LOOK BACK TO OLDER PHGS
    if (this.phOutcomeType === 'regex blacklisted') {
      if (this.prevPHG) {
        if (this.prevPHG.phOutcomeType === 'blocked during CNAME inspection')
          return undefined
      }
    }

    // if there is no ifDecision
    if (this.ifDecision === undefined) {
      if (this.domainIncludesDNSDOHDOT === 'yes') return 'dns/doh/dot domain NOT ndAllowed'
      else return undefined
    }

    else {  // else we do have an ifDecision
      switch (this.phOutcomeType as PHOutcomeType) {
        case 'special domain':
        case 'Apple iCloud Private Relay domain':
        case '/etc/hosts':
        case 'config':
          return undefined

        case 'gravity blocked':
          if (
            (this.ifDecision.result === 'allow')
            && (this.ifDecision.rulesThatApplied.length > 0)
          ) return 'INCONSISTENT'
          else return undefined

        case 'blocked during CNAME inspection':
        case 'regex blacklisted':
        case 'reply':
        case 'cached':
          var result: PHOutcomeException[] = []
          var dnsNDAllowed: boolean = false
          // check if any child domain includes 'doh' or 'dns' or 'dot'
          // flag as dns/doh/dot unless was allowed by non-default allow rule
          if (this.domainIncludesDNSDOHDOT === 'yes') {
            if (this.ndAllowed === 'yes') {
              result.push('dns/doh/dot domain ndAllowed')
              dnsNDAllowed = true
            }
            else result.push('dns/doh/dot domain NOT ndAllowed')
          }
          // check for contradicted or overridden exceptions
          // but do not flag if was a dns/doh/dot and it was ndAllowed
          if ((dnsNDAllowed !== true) && (this.ifDecision.rulesContradicted.length > 0) && (this.ifDecision.rulesContradicted[0].specificity !== '.*')) result.push('phi has contradicted non-default deny rule')
          if ((this.ifDecisionMostSpecificMatchType !== '.*') && (this.isOverridden === 'yes')) result.push('phi denied by non-default rule but overridden by alias')

          // check that phOutcome is consistent with ifDecision.result
          if ( ! ((this.phOutcome === 'allowed') && (this.isOverridden === 'yes'))) {
            if ( ! (
              ((this.phOutcome === 'allowed') && (this.ifDecision.result === 'allow'))
              || ((this.phOutcome === 'blocked') && (this.ifDecision.result === 'deny'))
            ) ) result.push('INCONSISTENT')
          }
          if (result.length === 0) return undefined
          else return result.join(', ')
          
          
        default:
          throw new Error(`PHG consistent logic encountered unexpected pattern`)
      }
    }

  }

  // phi show/hide type = parent phg's value
  // so that all phis in a phg will match the same filtering criteria
  get showType(): string | undefined {
    if (this.parentTIG) return this.parentTIG.showType
    else return undefined
  }
  get hideType(): PHHideType | undefined {
    if (this.parentTIG) return this.parentTIG.hideType
    else return undefined
  }



  constructor(parent: TTablePH2, piholeState: number, phiRaw: PHIRawRes ) {
    super(parent, piholeState, phiRaw)
    this.phOutcomeType = phiRaw.phOutcomeType as PHOutcomeType
    this.phOutcome = phiRaw.phOutcome
    this.allowedResType = phiRaw.allowedResType
    this.ipset = phiRaw.ipset
    this.unresolvedResult = phiRaw.unresolvedResult
    this.ifDecision = phiRaw.ifDecision

    try {
      makeObservable(this, {
        alias: observable,
        canonical: observable,
        firstPHIRes: computed({keepAlive: true}),
        queryTypesString: computed({keepAlive: true}),
        queryIPsString: computed({keepAlive: true}),
        domainIncludesDNSDOHDOT: computed({keepAlive: true}),
        ifDecisionResult: computed({keepAlive: true}),
        ifDecisionMostSpecificMatchType: computed({keepAlive: true}),
        ifDecisionPatternsThatApplied: computed({keepAlive: true}),
        ifDecisionObject: computed({keepAlive: true}),
        ndAllowed: computed({keepAlive: true}),
        ifNDRulesContradicted: computed({keepAlive: true}),
        outcomeReason: computed({keepAlive: true}),
        isOverridden: computed({keepAlive: true}),
        phOutcomeException: computed({keepAlive: true}),
        showType: computed({keepAlive: true}),
        hideType: computed({keepAlive: true}),
      })
    }
    catch {
      cl(`caught error trying PHI2Res constructor makeObservable`)
    }
  }
}


export type PHI2 = PHI2Query | PHI2Res | PHI2Unparseable

export type PH2 = PHI2 | PHG2


export class PHG2 extends LVG2 {
  [index: string]: any
  kind: PHKindsG = 'phG'
  parentTIG: PHG2 | undefined
  prevPHG: PHG2 | undefined
  // test for domain === '' - split on that will return [''] and we want empty array instead
  get domainParts(): string[] { return (this.domain === undefined) ? [] : this.domain.split('.').reverse() }
  children: PH2[] = []

  get tiInfo(): string {
    var result: string = ''
    if (this.children.length > 0) result += ('00000000' + this.children[0].seqNo.toString()).slice(-8)
    if (this.children.length > 1) result += '-' + ('00000000' + this.children[this.children.length - 1].seqNo.toString()).slice(-8)
    return result
  }

  get phiThatDecided(): PHI2Res | undefined {
    // if only one child, that one decided
    // else this is a cname chain - iterate children
    //   if child actively allowed, that one decided
    //   if child actively denied, that one tentatively decided but keep checking for an active allow
    //   if none of the above, first one decided
    if (this.children.length === 0) return undefined
    // return undefined if this is a higher level PHG (e.g., root phg)
    if (this.children[0].group === 'yes') return undefined
    else {
      const childPHIs = this.children as PHI2Res[]
      if (childPHIs.length === 1) return childPHIs[0]
      else {
        var result: PHI2Res = childPHIs[0]  // default result for this case
        for (let c of childPHIs) {
          if ((c.ifDecision) && (c.ifDecision.rulesThatApplied.length > 0)) {
            if ((c.phOutcome === 'allowed') && (c.ifDecision.result === 'allow')) return c
            if ((c.phOutcome === 'blocked') && (c.ifDecision.result === 'deny')) result = c
          }
        }
        return result
      }
    }
  }

  get overriddenPHIs(): PHI2Res[] {
    // return any PHIs that had an active ifDecision but are not phiThatDecided
    const result: PHI2Res[] = []
    for (let c of this.children) {
      if ((c instanceof PHI2Res) && (c !== this.phiThatDecided) && (c.ifDecision) && (c.ifDecision.rulesThatApplied.length > 0))
        if (
          ((c.ifDecision.result === 'allow') && (this.phOutcome === 'blocked'))
          || ((c.ifDecisionResult === 'deny') && (this.phOutcome === 'allowed'))
        )
        result.push(c)
    }
    return result
  }





  constructor(kind: PHKindsG, parentTTable: TTablePH2) {
    super('phG', parentTTable)
    this.kind = kind
    this.parentTTable = parentTTable

    // (same methodology as we have in CRG)
    // build 'annotations' object, to be passed to makeObservable
    // could not just declare type as AnnotationsMap<CRG, never>, 
    // because we also want it to be [index: string]...
    const annotationMap: { [index: string]: Annotation } = { 
      tiInfo: override,
      domainParts: computed({keepAlive: true}),
      phiThatDecided: computed({keepAlive: true}),
      overriddenPHIs: computed({keepAlive: true}),
    }
    

    // for each prop in mapPM... ,
    // define the property as a getter that uses computeGroupProp
    // call makeObservable to make it computed
    for (let p in mapPMPH2) {
      // only do this if prop is not already defined (e.g., tiInfo)
      if (this[p] === undefined) {
        Object.defineProperty(
          this,
          p,
          {
            configurable: true,  // allows mobx to delete this prop, to replace it with computed 
            enumerable: true,
            get: ()=>{return mapPMPH2[p].computeGroupProp(this, this.children, p)}
          }
        )
        annotationMap[p] = computed({keepAlive: true})
      }
    }  
    // it seems we need to force the type of the options object in this case
    makeObservable(this, annotationMap as AnnotationsMap<PHG2, never>)
  }

  addDirectChild(newchild: PH2, position?: number, replaceOrInsert?: 'replace' | 'insert') {
    if ((this.children.length > 0) && (newchild instanceof PHG2)) newchild.prevPHG = this.children[this.children.length - 1] as PHG2
    super.addDirectChild(newchild, position, replaceOrInsert)
  }
}

