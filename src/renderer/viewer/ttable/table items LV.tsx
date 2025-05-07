
// OBSOLETE import { observable, computed, runInAction, makeObservable, action, override } from 'mobx'
// OBSOLETE import { Annotation, AnnotationsMap } from 'mobx/dist/internal';
// OBSOLETE 
// OBSOLETE import { LVKindsG, LVKindsI, PHKindsG, PHKindsI, LogLineRecordFromMongo } from '../common/commonAll'
// OBSOLETE import { RuleHostScopes, tools } from '../common/configTypesTypes';
// OBSOLETE import { TII, TIG } from './table items base'
// OBSOLETE import { TTable } from './TTable base Obj'
// OBSOLETE import { mapPMLV, TTableLV } from './TTableLV';
// OBSOLETE import { commonDomainParts, mapPMPHLog } from './TTablePH'
// OBSOLETE 
// OBSOLETE import * as Mongo from 'mongodb'
// OBSOLETE 
// OBSOLETE 
// OBSOLETE var _ = require('lodash')
// OBSOLETE 
// OBSOLETE 
// OBSOLETE const cl = console.log


// OBSOLETE 
// OBSOLETE 
// OBSOLETE export function makePHIDictKey(piholeState: string, domain: string): string {
// OBSOLETE  return piholeState + ' ' + domain
// OBSOLETE }
// OBSOLETE 
// OBSOLETE 
// OBSOLETE 
// OBSOLETE // classes for raw domain log items - 
// OBSOLETE // props conform to objects stored by logscraper to mongo
// OBSOLETE export class LogLineRaw extends TII implements LogLineRecordFromMongo {
// OBSOLETE   seqNo: number
// OBSOLETE   timestampWhenScraped: number
// OBSOLETE   value: string
// OBSOLETE 
// OBSOLETE   constructor(item: LogLineRecordFromMongo, parentTTable: TTableLV) {
// OBSOLETE     super('lvI', parentTTable)
// OBSOLETE     this._id = item._id
// OBSOLETE     this.seqNo = item.seqNo
// OBSOLETE     this.timestampWhenScraped = item.timestampWhenScraped
// OBSOLETE     this.value = item.value
// OBSOLETE   }
// OBSOLETE }
// OBSOLETE 
// OBSOLETE export class LVGRaw extends TIG {
// OBSOLETE 
// OBSOLETE }
// OBSOLETE 
// OBSOLETE export type LV = LVI | LVG
// OBSOLETE 
// OBSOLETE export class LVI extends TII { 
// OBSOLETE   [index: string]: any
// OBSOLETE   kind: LVKindsI = 'lvI'
// OBSOLETE   
// OBSOLETE   latestSeqNoSeen: number = 0   // seqNo of the latest raw log line for this LVI
// OBSOLETE   latestTimestampSeen: string = ''
// OBSOLETE   logLines: LogLineRaw[] = []
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
// OBSOLETE     return this._id.toString()
// OBSOLETE   }
// OBSOLETE 
// OBSOLETE   // note - if no rules applied, we want to affirmately show 'none'
// OBSOLETE   // rather than just returning undefined as we get from getDecision
// OBSOLETE   // which shows nothing in the group-level aggregations
// OBSOLETE   get ruleHostScopesThatAffected(): RuleHostScopes | 'none' {
// OBSOLETE 
// OBSOLETE     // do getDecision
// OBSOLETE     // return rule host scopes that matched
// OBSOLETE     const rules = (this.parentTTable as TTableLV).rulesForLoadedHost
// OBSOLETE     if (rules === undefined) return undefined
// OBSOLETE     else {
// OBSOLETE       const result = tools.tool_pihole.getDecision({ domain: this.domain}, rules, 'pihole_query', 0).ruleHostScopesThatAffected
// OBSOLETE       if (result === undefined) return 'none'
// OBSOLETE       else return result
// OBSOLETE     }
// OBSOLETE   }
// OBSOLETE 
// OBSOLETE 
// OBSOLETE 
// OBSOLETE   // constructor requires arguments for piholeState and domain
// OBSOLETE   constructor(parentTTable: TTableLV) {
// OBSOLETE     super('noneI', parentTTable)
// OBSOLETE 
// OBSOLETE     makeObservable(this, {
// OBSOLETE       tiInfo: computed({keepAlive: true}),
// OBSOLETE       lvKey: computed({keepAlive: true}),
// OBSOLETE       ruleHostScopesThatAffected: computed({keepAlive: true}),
// OBSOLETE       latestSeqNoSeen: observable,
// OBSOLETE       latestTimestampSeen: observable,
// OBSOLETE       logLines: observable,
// OBSOLETE     })
// OBSOLETE   }
// OBSOLETE }
// OBSOLETE 
// OBSOLETE 
// OBSOLETE export class LVG extends TIG {
// OBSOLETE   [index: string]: any
// OBSOLETE   kind: LVKindsG = 'lvG'
// OBSOLETE   get latestSeqNoSeen(): number     { return this.children.reduce((prev, curr)=>Math.max(prev, curr.latestSeqNoSeen), 0)}
// OBSOLETE   get latestTimestampSeen(): string { return this.children.reduce((prev, curr)=>((prev > curr.latestTimestampSeen) ? prev : curr.latestTimestampSeen), '')}
// OBSOLETE   children: LV[] = []
// OBSOLETE 
// OBSOLETE 
// OBSOLETE   // override base class tiInfo
// OBSOLETE   get tiInfo(): string { 
// OBSOLETE     if (this.domain !== undefined) return this.domain.split('.').join('.')
// OBSOLETE     else return ''
// OBSOLETE   }
// OBSOLETE 
// OBSOLETE 
// OBSOLETE 
// OBSOLETE   constructor(kind: LVKindsG, parentTTable: TTable) {
// OBSOLETE     super('lvG', parentTTable)
// OBSOLETE     this.kind = kind
// OBSOLETE 
// OBSOLETE     // (same methodology as we have in CRG)
// OBSOLETE     // build 'annotations' object, to be passed to makeObservable
// OBSOLETE     // could not just declare type as AnnotationsMap<CRG, never>, 
// OBSOLETE     // because we also want it to be [index: string]...
// OBSOLETE     const annotationMap: { [index: string]: Annotation } = { 
// OBSOLETE       tiInfo: computed({keepAlive: true}),
// OBSOLETE       latestSeqNoSeen: computed({keepAlive: true}),
// OBSOLETE       latestTimestampSeen: computed({keepAlive: true}),
// OBSOLETE       addLVI: action.bound,
// OBSOLETE     }
// OBSOLETE     
// OBSOLETE     // for each prop in mapPM... ,
// OBSOLETE     // define the property as a getter that uses computeGroupProp
// OBSOLETE     // call makeObservable to make it computed
// OBSOLETE     for (let p in mapPMLV) {
// OBSOLETE       // only do this if prop is not already defined (e.g., tiInfo)
// OBSOLETE       if (this[p] === undefined) {
// OBSOLETE         Object.defineProperty(
// OBSOLETE           this,
// OBSOLETE           p,
// OBSOLETE           {
// OBSOLETE             configurable: true,  // allows mobx to delete this prop, to replace it with computed 
// OBSOLETE             enumerable: true,
// OBSOLETE             get: ()=>{return mapPMLV[p].computeGroupProp(this, this.children, p)}
// OBSOLETE           }
// OBSOLETE         )
// OBSOLETE         annotationMap[p] = computed({keepAlive: true})
// OBSOLETE       }
// OBSOLETE     }  
// OBSOLETE     // it seems we need to force the type of the options object in this case
// OBSOLETE     makeObservable(this, annotationMap as AnnotationsMap<LVG, never>)
// OBSOLETE   }
// OBSOLETE 
// OBSOLETE   // 'optArgs' is optional and typed as any,
// OBSOLETE   // so that subclasses can do anything they want with it
// OBSOLETE   addLVI(newLVI: LVI, optArgs?: any) {
// OBSOLETE     this.addDirectChild(newLVI)
// OBSOLETE   }
// OBSOLETE 
// OBSOLETE }
// OBSOLETE 