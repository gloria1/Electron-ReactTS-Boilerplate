
// OBSOLETE import { observable, computed, runInAction, makeObservable, action, override } from 'mobx'
// OBSOLETE import { Annotation, AnnotationsMap } from 'mobx/dist/internal';
// OBSOLETE 
// OBSOLETE import { PHKindsG, PHKindsI } from '../common/commonAll'
// OBSOLETE import { RuleHostScopes, tools } from '../common/configTypesTypes';
// OBSOLETE import { TII, TIG } from './table items base'
// OBSOLETE import { LVG, LVI } from './table items LV';
// OBSOLETE import { TTable } from './TTable base Obj'
// OBSOLETE import { TTableLVPH } from './TTableLV';
// OBSOLETE import { commonDomainParts, mapPMLVPH } from './TTableLV'
// OBSOLETE 
// OBSOLETE 
// OBSOLETE var _ = require('lodash')
// OBSOLETE 
// OBSOLETE 
// OBSOLETE const cl = console.log
// OBSOLETE 
// OBSOLETE 
// OBSOLETE /*
// OBSOLETE   PHI req/res structure patterns
// OBSOLETE 
// OBSOLETE   every PHI has
// OBSOLETE     queries: PHReqQuery[]
// OBSOLETE     resolutions: PHResolution[]
// OBSOLETE     
// OBSOLETE   PHResolution
// OBSOLETE     trigger: PHReqCNAME | undefined
// OBSOLETE     res: PHRes
// OBSOLETE 
// OBSOLETE   PHReqCNAME
// OBSOLETE     alias: PHI
// OBSOLETE     aliasIndex: number
// OBSOLETE 
// OBSOLETE   PHResolution
// OBSOLETE     resolutionSource: 'gravity blocked', 'reply', 'cached', etc
// OBSOLETE     trigger: PHReqCNAME | undefined
// OBSOLETE     type: 'ipset' | 'nodata_or_https' | 'block' | 'cname'
// OBSOLETE 
// OBSOLETE     if 'ipset'
// OBSOLETE       ipSet: string (', ') delimited list of ips)
// OBSOLETE 
// OBSOLETE     if 'noData_or_https'
// OBSOLETE       result - NODATA, etc
// OBSOLETE 
// OBSOLETE     if 'block' - no additional props
// OBSOLETE 
// OBSOLETE     if 'cname'
// OBSOLETE       canonical: PHI | undefined
// OBSOLETE       index: number - index into canonical PHI's resolutions
// OBSOLETE 
// OBSOLETE 
// OBSOLETE example of result from fully parsed cname chain with three lines:
// OBSOLETE   source log lines
// OBSOLETE     reply d1 is <CNAME>
// OBSOLETE     reply d2 is <CNAME>
// OBSOLETE     reply d3 is IP
// OBSOLETE     reply d3 is IP
// OBSOLETE 
// OBSOLETE   final result:
// OBSOLETE     PHI for d1
// OBSOLETE       resolutions[x]: {
// OBSOLETE         trigger: undefined
// OBSOLETE         resolutionSource: 'cname'
// OBSOLETE         type: 'cname'
// OBSOLETE         canonical: d2
// OBSOLETE         index: y
// OBSOLETE       }
// OBSOLETE     PHI for d2
// OBSOLETE       resolutions[y]: {
// OBSOLETE         trigger: {
// OBSOLETE           alias: d1
// OBSOLETE           aliasIndex: x
// OBSOLETE         }
// OBSOLETE         resolutionSource: 'cname'
// OBSOLETE         type: 'cname'
// OBSOLETE         canonical: d3
// OBSOLETE         index: z
// OBSOLETE       }
// OBSOLETE     PHI for d3
// OBSOLETE       resolutions[z]: {
// OBSOLETE         trigger: {
// OBSOLETE           alias: d2
// OBSOLETE           aliasIndex: y
// OBSOLETE         }
// OBSOLETE         resolutionSource: 'reply'
// OBSOLETE         type: 'ipset'
// OBSOLETE         ipSet: '<ip1>, <ip2>'
// OBSOLETE       }
// OBSOLETE 
// OBSOLETE example of partially parsed cname chain
// OBSOLETE   after parsing first line
// OBSOLETE 
// OBSOLETE   after parsing middle line
// OBSOLETE 
// OBSOLETE 
// OBSOLETE 
// OBSOLETE */
// OBSOLETE 
// OBSOLETE 
// OBSOLETE export interface PHReqQuery {
// OBSOLETE   type: string   // the text in brackets after query, e.g., query[A] -> 'A'
// OBSOLETE   fromIP: string
// OBSOLETE }
// OBSOLETE export interface PHReqCNAME {
// OBSOLETE   alias: PHI   // the alias domain PHI
// OBSOLETE   aliasIndex: number   // index in the alias PHI.resolutions of the PHResolution that led to this resolution
// OBSOLETE }
// OBSOLETE 
// OBSOLETE 
// OBSOLETE export interface PHResBase {
// OBSOLETE   resolutionSource: 'gravity blocked' | 'regex blacklisted' | 'blocked during CNAME inspection' | 'reply' | 'cached' | 'config' | '/etc/hosts'  // the keyword from the log response line
// OBSOLETE                           // indicates the source of the resolution ('reply' means upstream DNS server replied,
// OBSOLETE                           // 'cached' means pihole cache replied, 'config' means pihole config settings 'replied',
// OBSOLETE                           // '/etc/hosts' means pihole system's /etc/hosts file )
// OBSOLETE   trigger: PHReqCNAME | undefined   // the alias PHI and res that led to this resolution
// OBSOLETE }
// OBSOLETE export interface PHResIPSet extends PHResBase {
// OBSOLETE   type: 'ipset'
// OBSOLETE   ipSet: string
// OBSOLETE }
// OBSOLETE export interface PHResNODATA extends PHResBase {  // this will be used if log line says 'reply' but result is NODATA or NODATA-IPv6 or <HTTPS>
// OBSOLETE   type: 'nodata_or_https'
// OBSOLETE   result: string
// OBSOLETE }
// OBSOLETE export interface PHResBlock extends PHResBase {
// OBSOLETE   type: 'block'
// OBSOLETE }
// OBSOLETE export interface PHResCNAME extends PHResBase {
// OBSOLETE   type: 'cname'
// OBSOLETE   canonical: PHI | undefined  // the canonical domain PHI that this reply line refers to
// OBSOLETE                           // can be undefined if log line with the resolution has not been parsed yet
// OBSOLETE   index: number   // index in canonical PHI's resolution list of the further resolution of this chain
// OBSOLETE }
// OBSOLETE export type PHResolution = PHResIPSet | PHResNODATA | PHResBlock | PHResCNAME
// OBSOLETE 
// OBSOLETE /* OBSOLETE
// OBSOLETE export interface PHResolution {
// OBSOLETE   trigger: PHReqCNAME | undefined
// OBSOLETE   res: PHRes
// OBSOLETE }
// OBSOLETE */
// OBSOLETE 
// OBSOLETE 
// OBSOLETE export function makePHIDictKey(piholeState: string, domain: string): string {
// OBSOLETE   return piholeState + ' ' + domain
// OBSOLETE }
// OBSOLETE 
// OBSOLETE 
// OBSOLETE 
// OBSOLETE 
// OBSOLETE 
// OBSOLETE export type PH = PHI | PHG
// OBSOLETE 
// OBSOLETE export class PHI extends LVI { 
// OBSOLETE   [index: string]: any
// OBSOLETE   kind: PHKindsI = 'phI'
// OBSOLETE   
// OBSOLETE 
// OBSOLETE // need to revise propMethods, or create new propMethods, for
// OBSOLETE // (or just drop)
// OBSOLETE //  piholeState
// OBSOLETE //  queries / queriesString
// OBSOLETE //  aliasesString
// OBSOLETE //  canonicalsString
// OBSOLETE //  finalResolutionsString
// OBSOLETE //  cnameChainsString
// OBSOLETE //  logLines (in LVI)
// OBSOLETE 
// OBSOLETE // should probably (maybe?) revise the backing props here to conform to PropItems type
// OBSOLETE // 
// OBSOLETE 
// OBSOLETE 
// OBSOLETE   piholeState: string  // set in constructor
// OBSOLETE   domain: string   // set in constructor
// OBSOLETE   get domainParts(): string[] { return (this.domain === '') ? [] : this.domain.split('.').reverse() }
// OBSOLETE   queries: PHReqQuery[] = []
// OBSOLETE   resolutions: PHResolution[] = []
// OBSOLETE   
// OBSOLETE   
// OBSOLETE   
// OBSOLETE 
// OBSOLETE   // override base class tiInfo
// OBSOLETE   get tiInfo(): string { 
// OBSOLETE     let result = ''
// OBSOLETE 
// OBSOLETE     return  result
// OBSOLETE   }
// OBSOLETE 
// OBSOLETE 
// OBSOLETE   get lvKey(): string {
// OBSOLETE     return this.piholeState + ' ' + this.domain
// OBSOLETE   }
// OBSOLETE 
// OBSOLETE   // note - if no rules applied, we want to affirmately show 'none'
// OBSOLETE   // rather than just returning undefined as we get from getDecision
// OBSOLETE   // which shows nothing in the group-level aggregations
// OBSOLETE   get ruleHostScopesThatAffected(): RuleHostScopes | 'none' {
// OBSOLETE 
// OBSOLETE     // do getDecision
// OBSOLETE     // return rule host scopes that matched
// OBSOLETE     const rules = (this.parentTTable as TTableLVPH).rulesForLoadedHost
// OBSOLETE     if (rules === undefined) return undefined
// OBSOLETE     else {
// OBSOLETE       const result = tools.tool_pihole.getDecision({ domain: this.domain}, rules, 'pihole_query', 0).ruleHostScopesThatAffected
// OBSOLETE       if (result === undefined) return 'none'
// OBSOLETE       else return result
// OBSOLETE     }
// OBSOLETE   }
// OBSOLETE 
// OBSOLETE   get queriesString(): string | undefined {
// OBSOLETE     var result: string = ''
// OBSOLETE     for (let q of this.queries) {
// OBSOLETE       result += `${q.fromIP}[${q.type}]\n`
// OBSOLETE     }
// OBSOLETE     return (result === '') ? undefined : result.slice(0, -1)
// OBSOLETE   }
// OBSOLETE 
// OBSOLETE   get aliasesString(): string | undefined {
// OBSOLETE     var result: string = ''
// OBSOLETE     for (let r of this.resolutions) {
// OBSOLETE       if (r.trigger !== undefined) result += r.trigger.alias.domain + '\n'
// OBSOLETE     }
// OBSOLETE     return (result === '') ? undefined :result.slice(0, -1)
// OBSOLETE   }
// OBSOLETE 
// OBSOLETE   get canonicalsString(): string | undefined {
// OBSOLETE     var result: string = ''
// OBSOLETE     for (let r of this.resolutions) {
// OBSOLETE       if (r.type === 'cname') result += (r.canonical === undefined) ? '<not parsed yet>' : r.canonical.domain + '\n'
// OBSOLETE     }
// OBSOLETE     return (result === '') ? undefined :result.slice(0, -1)
// OBSOLETE   }
// OBSOLETE 
// OBSOLETE   get finalResolutionsString(): string | undefined {
// OBSOLETE     var result: string = ''
// OBSOLETE     for (let r of this.resolutions) {
// OBSOLETE       // chase any cname's to final resolution
// OBSOLETE       var finalRes: PHResolution = r
// OBSOLETE       while (finalRes.type === 'cname') {
// OBSOLETE         if (finalRes.canonical === undefined) break
// OBSOLETE         else finalRes = finalRes.canonical.resolutions[finalRes.index]
// OBSOLETE       }
// OBSOLETE       switch(finalRes.type) {
// OBSOLETE         case 'cname':
// OBSOLETE           result += '<not parsed yet>\n'
// OBSOLETE           break
// OBSOLETE         case 'block':
// OBSOLETE 
// OBSOLETE // need handle if was blocked during cname inspection
// OBSOLETE //  in that case, 'resolutionSource' will be 'reply'  (this was taken from parts[3])
// OBSOLETE // -> better will be to set resolutionSource correctly in parsing, i think
// OBSOLETE 
// OBSOLETE 
// OBSOLETE           result += finalRes.resolutionSource + '\n'
// OBSOLETE           break
// OBSOLETE         case 'nodata_or_https':
// OBSOLETE           result += finalRes.result + '\n'
// OBSOLETE           break
// OBSOLETE         case 'ipset':
// OBSOLETE           result += finalRes.ipSet + '\n'
// OBSOLETE           break
// OBSOLETE         default:
// OBSOLETE           throw new Error(`ERROR FINDING FINAL RESOLUTION IN 'finalResolutionString' COMPUTATION FOR DOMAIN ${this.domain}` + '\n')
// OBSOLETE       }
// OBSOLETE     }
// OBSOLETE     return (result === '') ? undefined :result.slice(0, -1)
// OBSOLETE   }
// OBSOLETE 
// OBSOLETE   get finalResolutionTypesString(): string | undefined {
// OBSOLETE     var result: string[] = []
// OBSOLETE     for (let r of this.resolutions) {
// OBSOLETE       // chase any cname's to final resolution
// OBSOLETE       var finalRes: PHResolution = r
// OBSOLETE       while (finalRes.type === 'cname') {
// OBSOLETE         if (finalRes.canonical === undefined) break
// OBSOLETE         else finalRes = finalRes.canonical.resolutions[finalRes.index]
// OBSOLETE       }
// OBSOLETE       switch(finalRes.type) {
// OBSOLETE         case 'cname':
// OBSOLETE           result.push('<not parsed yet>')
// OBSOLETE           break
// OBSOLETE         case 'block':
// OBSOLETE           result.push('blocked')
// OBSOLETE           break
// OBSOLETE         case 'nodata_or_https':
// OBSOLETE           result.push(finalRes.result)
// OBSOLETE           break
// OBSOLETE         case 'ipset':
// OBSOLETE           result.push('RESOLVED')
// OBSOLETE           break
// OBSOLETE         default:
// OBSOLETE           throw new Error(`ERROR FINDING FINAL RESOLUTION IN 'finalResolutionString' COMPUTATION FOR DOMAIN ${this.domain}` + '\n')
// OBSOLETE       }
// OBSOLETE     }
// OBSOLETE     return (result.length === 0) ? undefined : Object.getOwnPropertyNames(_.countBy(result)).join('\n')
// OBSOLETE   }
// OBSOLETE 
// OBSOLETE   get cnameChainsString(): string | undefined {
// OBSOLETE     var result: string = ''
// OBSOLETE     for (let r of this.resolutions) {
// OBSOLETE       var chain: string = ''
// OBSOLETE       var res: PHResolution = r
// OBSOLETE       while (res.trigger !== undefined) {
// OBSOLETE         chain = res.trigger.alias.domain + ' -> ' + chain
// OBSOLETE         res = res.trigger.alias.resolutions[res.trigger.aliasIndex]
// OBSOLETE       }
// OBSOLETE       chain += this.domain
// OBSOLETE       res = r
// OBSOLETE       while (res.type === 'cname') {
// OBSOLETE         if (res.canonical === undefined) {
// OBSOLETE           chain += ' -> <not parsed yet>'
// OBSOLETE           break
// OBSOLETE         }
// OBSOLETE         else {
// OBSOLETE           chain += ' -> ' + res.canonical.domain
// OBSOLETE           res = res.canonical.resolutions[res.index]
// OBSOLETE         }
// OBSOLETE       }
// OBSOLETE 
// OBSOLETE       if (chain !== '') result += chain + '\n'
// OBSOLETE     }
// OBSOLETE 
// OBSOLETE     return (result === '') ? undefined :result.slice(0, -1)
// OBSOLETE   }
// OBSOLETE 
// OBSOLETE   get anyBlocked(): boolean {
// OBSOLETE     for (let r of this.resolutions) {
// OBSOLETE       // chase any cname's to final resolution
// OBSOLETE       var finalRes: PHResolution = r
// OBSOLETE       while (finalRes.type === 'cname') {
// OBSOLETE         if (finalRes.canonical === undefined) break
// OBSOLETE         else finalRes = finalRes.canonical.resolutions[finalRes.index]
// OBSOLETE       }
// OBSOLETE       if (finalRes.type === 'cname') break
// OBSOLETE       switch(finalRes.type) {
// OBSOLETE         case 'block': return true
// OBSOLETE         case 'ipset': continue
// OBSOLETE         case 'nodata_or_https': continue
// OBSOLETE         default:
// OBSOLETE           throw new Error(`ERROR FINDING FINAL RESOLUTION IN 'anyBlocked' COMPUTATION FOR DOMAIN ${this.domain}` + '\n')
// OBSOLETE       }
// OBSOLETE     }
// OBSOLETE     return false
// OBSOLETE   }
// OBSOLETE   
// OBSOLETE   get anyResolved(): boolean {
// OBSOLETE     for (let r of this.resolutions) {
// OBSOLETE       // chase any cname's to final resolution
// OBSOLETE       var finalRes: PHResolution = r
// OBSOLETE       while (finalRes.type === 'cname') {
// OBSOLETE         if (finalRes.canonical === undefined) break
// OBSOLETE         else finalRes = finalRes.canonical.resolutions[finalRes.index]
// OBSOLETE       }
// OBSOLETE       if (finalRes.type === 'cname') break
// OBSOLETE       switch(finalRes.type) {
// OBSOLETE         case 'block': continue
// OBSOLETE         case 'nodata_or_https': continue
// OBSOLETE         case 'ipset': return true
// OBSOLETE         default:
// OBSOLETE           throw new Error(`ERROR FINDING FINAL RESOLUTION IN 'anyResolved' COMPUTATION FOR DOMAIN ${this.domain}` + '\n')
// OBSOLETE       }
// OBSOLETE     }
// OBSOLETE     return false
// OBSOLETE   }
// OBSOLETE 
// OBSOLETE   // constructor requires arguments for piholeState and domain
// OBSOLETE   constructor(parentTTable: TTableLVPH, piholeState: string, domain: string) {
// OBSOLETE     super(parentTTable)
// OBSOLETE     this.piholeState = piholeState
// OBSOLETE     this.domain = domain
// OBSOLETE 
// OBSOLETE     makeObservable(this, {
// OBSOLETE       tiInfo: override,
// OBSOLETE       lvKey: override,
// OBSOLETE       ruleHostScopesThatAffected: override,
// OBSOLETE       domain: observable,
// OBSOLETE       queries: observable,
// OBSOLETE       resolutions: observable,
// OBSOLETE       domainParts: computed({keepAlive: true}),
// OBSOLETE       queriesString: computed({keepAlive: true}),
// OBSOLETE       aliasesString: computed({keepAlive: true}),
// OBSOLETE       canonicalsString: computed({keepAlive: true}),
// OBSOLETE       finalResolutionsString: computed({keepAlive: true}),
// OBSOLETE       finalResolutionTypesString: computed({keepAlive: true}),
// OBSOLETE       cnameChainsString: computed({keepAlive: true}),
// OBSOLETE       anyBlocked: computed({keepAlive: true}),
// OBSOLETE       anyResolved: computed({keepAlive: true}),
// OBSOLETE     })
// OBSOLETE   }
// OBSOLETE }
// OBSOLETE 
// OBSOLETE 
// OBSOLETE export class PHG extends LVG {
// OBSOLETE   [index: string]: any
// OBSOLETE   kind: PHKindsG = 'phG'
// OBSOLETE   // test for domain === '' - split on that will return [''] and we want empty array instead
// OBSOLETE   get domainParts(): string[] { return (this.domain === undefined) ? [] : this.domain.split('.').reverse() }
// OBSOLETE   children: PH[] = []
// OBSOLETE 
// OBSOLETE 
// OBSOLETE   // override base class tiInfo
// OBSOLETE   get tiInfo(): string { 
// OBSOLETE     if (this.domain !== undefined) return this.domain.split('.').join('.')
// OBSOLETE     else return ''
// OBSOLETE   }
// OBSOLETE 
// OBSOLETE 
// OBSOLETE   get anyResolved(): boolean {
// OBSOLETE     for (let c of this.children) if (c.anyResolved) return true
// OBSOLETE     return false
// OBSOLETE   }
// OBSOLETE   get anyBlocked(): boolean {
// OBSOLETE     for (let c of this.children) if (c.anyBlocked) return true
// OBSOLETE     return false
// OBSOLETE   }
// OBSOLETE 
// OBSOLETE   constructor(kind: PHKindsG, parentTTable: TTable) {
// OBSOLETE     super('phG', parentTTable)
// OBSOLETE     this.kind = kind
// OBSOLETE 
// OBSOLETE     // (same methodology as we have in CRG)
// OBSOLETE     // build 'annotations' object, to be passed to makeObservable
// OBSOLETE     // could not just declare type as AnnotationsMap<CRG, never>, 
// OBSOLETE     // because we also want it to be [index: string]...
// OBSOLETE     const annotationMap: { [index: string]: Annotation } = { 
// OBSOLETE       tiInfo: override,
// OBSOLETE       domainParts: computed({keepAlive: true}),
// OBSOLETE       anyBlocked: computed({keepAlive: true}),
// OBSOLETE       anyResolved: computed({keepAlive: true}),
// OBSOLETE       addDirectChild: override,
// OBSOLETE       addLVI: override,
// OBSOLETE     }
// OBSOLETE     
// OBSOLETE     // for each prop in mapPM... ,
// OBSOLETE     // define the property as a getter that uses computeGroupProp
// OBSOLETE     // call makeObservable to make it computed
// OBSOLETE     for (let p in mapPMLVPH) {
// OBSOLETE       // only do this if prop is not already defined (e.g., tiInfo)
// OBSOLETE       if (this[p] === undefined) {
// OBSOLETE         Object.defineProperty(
// OBSOLETE           this,
// OBSOLETE           p,
// OBSOLETE           {
// OBSOLETE             configurable: true,  // allows mobx to delete this prop, to replace it with computed 
// OBSOLETE             enumerable: true,
// OBSOLETE             get: ()=>{return mapPMLVPH[p].computeGroupProp(this, this.children, p)}
// OBSOLETE           }
// OBSOLETE         )
// OBSOLETE         annotationMap[p] = computed({keepAlive: true})
// OBSOLETE       }
// OBSOLETE     }  
// OBSOLETE     // it seems we need to force the type of the options object in this case
// OBSOLETE     makeObservable(this, annotationMap as AnnotationsMap<PHG, never>)
// OBSOLETE   }
// OBSOLETE 
// OBSOLETE 
// OBSOLETE   addDirectChild(newchild: PH, position?: number, replaceOrInsert?: 'replace' | 'insert') {
// OBSOLETE     super.addDirectChild(newchild, position, replaceOrInsert)
// OBSOLETE     // validate that common domain parts match, or else this is rootG in which case it matches any PHI
// OBSOLETE     if ((this.kind !== 'rootG') && (commonDomainParts(this.domainParts, newchild.domainParts).length === 0)) throw new Error('ERROR: tried to add PH child to PHG and domain parts do not match - this should never happen')
// OBSOLETE 
// OBSOLETE     // expand group if (1) was already expanded or (2) added child is a group
// OBSOLETE     // point is to not expand lowest-level groups where children are all PHI's (which, i think, will all have same domain, by construction)
// OBSOLETE     this.expanded = (this.expanded || (newchild.group === 'yes'))
// OBSOLETE   }
// OBSOLETE 
// OBSOLETE   // adds a PHI
// OBSOLETE   // function named 'addLVI' to override base class method
// OBSOLETE   // recursively searches children to find existing parent
// OBSOLETE   // creates intermediate PHGs as necessary
// OBSOLETE   addLVI(newItem: PHI, optArgs?: any) {
// OBSOLETE     const ignoreFirstNParts = optArgs
// OBSOLETE     // validate that common domain parts match, or else this is rootG in which case it matches any PHI
// OBSOLETE     if ((this.kind !== 'rootG') && (commonDomainParts(this.domainParts, newItem.domainParts).length === 0)) throw new Error('ERROR: tried to add PH child to PHG and domain parts do not match - this should never happen')
// OBSOLETE 
// OBSOLETE     // at this point we know that this and newItem have common domain parts
// OBSOLETE     // therefore newItem belongs under this somewhere
// OBSOLETE     // cases:
// OBSOLETE     //   newItem has common domain parts with a child
// OBSOLETE     //      child is a PHI -> replace child with a new PHG containing it plus newItem
// OBSOLETE     //      child is a PHG
// OBSOLETE     //        newItem matches child exactly -> add newItem as direct child of child
// OBSOLETE     //        newItem domain is more specific than child -> do child.addPHI(newItem)
// OBSOLETE     //        newItem domain is less specific than child -> replace child with new PHG containing it plus newItem
// OBSOLETE     //      else loop finishes with added still === false
// OBSOLETE     //        no child matches newItem -> add newItem as direct child
// OBSOLETE 
// OBSOLETE     var added: boolean = false   // set to true in loop if newItem is added somewhere
// OBSOLETE     for (let i = 0; i < this.children.length; i++) {
// OBSOLETE       const c = this.children[i]
// OBSOLETE       const commonParts = commonDomainParts(c.domainParts, newItem.domainParts, ignoreFirstNParts)
// OBSOLETE       if (commonParts.length > 0) {
// OBSOLETE         if (c.group === 'no') {  // replace c with a PHG containing both
// OBSOLETE                               // also check for other child PHIs that match and put them in the new PHG
// OBSOLETE           const newPHG = new PHG('phG', c.parentTTable)
// OBSOLETE           newPHG.addDirectChild(c)
// OBSOLETE           newPHG.addDirectChild(newItem)
// OBSOLETE           // check for other matching PHI's, add them to new PHG and remove from this.children
// OBSOLETE           for (let ri = this.children.length-1; ri > i; ri--) {
// OBSOLETE             const rc = this.children[ri]
// OBSOLETE             if (rc.group === 'no') {
// OBSOLETE               if (commonDomainParts(rc.domainParts, newItem.domainParts, ignoreFirstNParts).length > 0) {
// OBSOLETE                 newPHG.addDirectChild(rc)
// OBSOLETE                 this.children.splice(ri, 1)
// OBSOLETE               }
// OBSOLETE             }
// OBSOLETE           }
// OBSOLETE           // replace c with the new PHG
// OBSOLETE           this.addDirectChild(newPHG, i, 'replace')
// OBSOLETE         }
// OBSOLETE         else {
// OBSOLETE           if (c.domainParts.length === newItem.domainParts.length) {  // PHG domain matches new PHI -> add newItem as direct child
// OBSOLETE             c.addDirectChild(newItem)
// OBSOLETE           }
// OBSOLETE           else if (c.domainParts.length < newItem.domainParts.length) { // PHG domain more general than newItem -> add PHI to c
// OBSOLETE             c.addLVI(newItem, c.domainParts.length)
// OBSOLETE           }
// OBSOLETE           else {  // PHG domain more specific than newItem -> make new PHG containing c and newItem
// OBSOLETE             const newPHG = new PHG('phG', c.parentTTable)
// OBSOLETE             newPHG.addDirectChild(c)
// OBSOLETE             newPHG.addDirectChild(newItem)
// OBSOLETE             this.addDirectChild(newPHG, i, 'replace')
// OBSOLETE           }
// OBSOLETE         }
// OBSOLETE         added = true
// OBSOLETE         break
// OBSOLETE       }
// OBSOLETE     }
// OBSOLETE     if (added === false) this.addDirectChild(newItem)
// OBSOLETE 
// OBSOLETE   }
// OBSOLETE 
// OBSOLETE 
// OBSOLETE 
// OBSOLETE 
// OBSOLETE }

