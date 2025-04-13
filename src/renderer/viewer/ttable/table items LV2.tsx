
import { observable, computed, runInAction, makeObservable, action, override } from 'mobx'
import { Annotation, AnnotationsMap } from 'mobx/dist/internal';

import { LVKindsG, LVKindsI,  } from '../common/commonAll'
import { TII, TIG } from './table items base'
import { TTable } from './TTable base Obj'
import { mapPMLV2, TTableLV2 } from './TTableLV2';
import { commonDomainParts2, mapPMPH2 } from './TTablePH2'

import * as Mongo from 'mongodb'


var _ = require('lodash')


const cl = console.log




// OBSOLETE export function makePHIDictKey2(piholeState: string, domain: string): string {
// OBSOLETE   return piholeState + ' ' + domain
// OBSOLETE }



// OBSOLETE // classes for raw domain log items - 
// OBSOLETE // props conform to objects stored by logscraper to mongo
// OBSOLETE export class LogLineRaw2 extends TII implements LogLineRecordFromMongo {
// OBSOLETE   seqNo: number
// OBSOLETE   timestampWhenScraped: number
// OBSOLETE   value: string
// OBSOLETE 
// OBSOLETE   constructor(item: LogLineRecordFromMongo, parentTTable: TTableLV2) {
// OBSOLETE     super('lvI', parentTTable)
// OBSOLETE     this._id = item._id
// OBSOLETE     this.seqNo = item.seqNo
// OBSOLETE     this.timestampWhenScraped = item.timestampWhenScraped
// OBSOLETE     this.value = item.value
// OBSOLETE   }
// OBSOLETE }

export class LVGRaw2 extends TIG {

}

export type LV2 = LVI2 | LVG2

export class LVI2 extends TII { 
  [index: string]: any
  kind: LVKindsI = 'lvI'

  seqNo: number
  phLogLine: string | undefined
  
  // override base class tiInfo
  get tiInfo(): string { 
    const result = '00000000' + this.seqNo.toString()
    return result.slice(-8, result.length)
  }


  get lvKey(): string {
    return this._id.toString()
  }



  // OBSOLETE - NOT SURE WHY THIS WAS EVER HERE   // note - if no rules applied, we want to affirmately show 'none'
  // OBSOLETE - NOT SURE WHY THIS WAS EVER HERE   // rather than just returning undefined as we get from getDecision
  // OBSOLETE - NOT SURE WHY THIS WAS EVER HERE   // which shows nothing in the group-level aggregations
  // OBSOLETE - NOT SURE WHY THIS WAS EVER HERE   get ruleHostScopesThatAffected(): RuleHostScopes | 'none' {
// OBSOLETE - NOT SURE WHY THIS WAS EVER HERE   
  // OBSOLETE - NOT SURE WHY THIS WAS EVER HERE     // do getDecision
  // OBSOLETE - NOT SURE WHY THIS WAS EVER HERE     // return rule host scopes that matched
  // OBSOLETE - NOT SURE WHY THIS WAS EVER HERE     const rules = (this.parentTTable as TTableLV2).rulesForLoadedHost
  // OBSOLETE - NOT SURE WHY THIS WAS EVER HERE     if (rules === undefined) return undefined
  // OBSOLETE - NOT SURE WHY THIS WAS EVER HERE     else {
  // OBSOLETE - NOT SURE WHY THIS WAS EVER HERE       const result = tools.tool_pihole.getDecision({ domain: this.domain}, rules, 'pihole_query', 0).ruleHostScopesThatAffected
  // OBSOLETE - NOT SURE WHY THIS WAS EVER HERE       if (result === undefined) return 'none'
  // OBSOLETE - NOT SURE WHY THIS WAS EVER HERE       else return result
  // OBSOLETE - NOT SURE WHY THIS WAS EVER HERE     }
  // OBSOLETE - NOT SURE WHY THIS WAS EVER HERE   }



  // constructor requires arguments for piholeState and domain
  constructor(parentTTable: TTableLV2) {
    super('noneI', parentTTable)

    this.seqNo = parentTTable.nextSeqNo++

    makeObservable(this, {
      tiInfo: computed({keepAlive: true}),
      lvKey: computed({keepAlive: true}),
      seqNo: observable,
    })
  }
}


export class LVG2 extends TIG {
  [index: string]: any
  kind: LVKindsG = 'lvG'

  seqNo: number = 0
  logLine: string = ''

  children: LV2[] = []


  // override base class tiInfo
  get tiInfo(): string { 
    if (this.domain !== undefined) return this.domain.split('.').join('.')
    else return ''
  }



  constructor(kind: LVKindsG, parentTTable: TTable) {
    super('lvG', parentTTable)
    this.kind = kind

    // (same methodology as we have in CRG)
    // build 'annotations' object, to be passed to makeObservable
    // could not just declare type as AnnotationsMap<CRG, never>, 
    // because we also want it to be [index: string]...
    const annotationMap: { [index: string]: Annotation } = { 
      tiInfo: computed({keepAlive: true}),
      addLVI: action.bound,
    }
    
    // for each prop in mapPM... ,
    // define the property as a getter that uses computeGroupProp
    // call makeObservable to make it computed
    for (let p in mapPMLV2) {
      // only do this if prop is not already defined (e.g., tiInfo)
      if (this[p] === undefined) {
        Object.defineProperty(
          this,
          p,
          {
            configurable: true,  // allows mobx to delete this prop, to replace it with computed 
            enumerable: true,
            get: ()=>{return mapPMLV2[p].computeGroupProp(this, this.children, p)}
          }
        )
        annotationMap[p] = computed({keepAlive: true})
      }
    }  
    // it seems we need to force the type of the options object in this case
    makeObservable(this, annotationMap as AnnotationsMap<LVG2, never>)
  }

  // 'optArgs' is optional and typed as any,
  // so that subclasses can do anything they want with it
  addLVI(newLVI: LVI2, optArgs?: any) {
    this.addDirectChild(newLVI)
  }

}
