
import { observable, computed, runInAction, makeObservable, action, override } from 'mobx'
import { Annotation, AnnotationsMap } from 'mobx/dist/internal';

import { RUKindsG, RUKindsI } from '../common/commonAll'
import { TII, TIG } from './table items base'
import { TTable } from './TTable base Obj'
import { TTableRule } from './TTableRule'


var _ = require('lodash')


const cl = console.log






export type RU = RUI | RUG

export class RUI extends TII { 
  [index: string]: any
  kind: RUKindsI = 'ruI'
  
  
  
  

  // override base class tiInfo
  get tiInfo(): string { 
    let result = ''

    return  result
  }

  // constructor requires arguments for piholeState and domain
  constructor(parentTTable: TTableRule) {
    super('noneI', parentTTable)

    makeObservable(this, {
      tiInfo: computed({keepAlive: true}),
    })
  }
}


export class RUG extends TIG {
  [index: string]: any
  kind: RUKindsG = 'ruG'
  // test for domain === '' - split on that will return [''] and we want empty array instead
  get domainParts(): string[] { return (this.domain === undefined) ? [] : this.domain.split('.').reverse() }
  children: RU[] = []


  // override base class tiInfo
  get tiInfo(): string { 
    if (this.domain !== undefined) return this.domain.split('.').join('.')
    else return ''
  }

  constructor(kind: RUKindsG, parentTTable: TTableRule) {
    super('ruG', parentTTable)
    this.kind = kind

    // (same methodology as we have in CRG)
    // build 'annotations' object, to be passed to makeObservable
    // could not just declare type as AnnotationsMap<CRG, never>, 
    // because we also want it to be [index: string]...
    const annotationMap: { [index: string]: Annotation } = { 
      tiInfo: computed({keepAlive: true}),
      addDirectChild: override,
    }
    
    // for each prop in mapPM... ,
    // define the property as a getter that uses computeGroupProp
    // call makeObservable to make it computed
    for (let p in parentTTable.tiPropFunctions) {
      // only do this if prop is not already defined (e.g., tiInfo)
      if (this[p] === undefined) {
        Object.defineProperty(
          this,
          p,
          {
            configurable: true,  // allows mobx to delete this prop, to replace it with computed 
            enumerable: true,
            get: ()=>{return parentTTable.tiPropFunctions[p].computeGroupProp(this, this.children, p)}
          }
        )
        annotationMap[p] = computed({keepAlive: true})
      }
    }  
    // it seems we need to force the type of the options object in this case
    makeObservable(this, annotationMap as AnnotationsMap<RUG, never>)
  }


  addDirectChild(newchild: RU, position?: number, replaceOrInsert?: 'replace' | 'insert') {
    super.addDirectChild(newchild, position, replaceOrInsert)

    // expand group if (1) was already expanded or (2) added child is a group
    // point is to not expand lowest-level groups where children are all PHI's (which, i think, will all have same domain, by construction)
    this.expanded = (this.expanded || (newchild.group === 'yes'))
  }





}
