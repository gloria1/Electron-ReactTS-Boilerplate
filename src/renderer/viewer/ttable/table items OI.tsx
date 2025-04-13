
import { computed, autorun, makeObservable } from 'mobx'
import { COMPUTED_STRUCT } from 'mobx/dist/internal';

import { OKindsG, OKindsI } from '../common/commonAll'
import { TII, TIG } from './table items base'
import { TTable, TTableObj } from './TTable base Obj'

const cl = console.log;




//================================================================================
//================================================================================

/*
  OII/OIG and CRI/CRG specialize TI* as follows
    tiInfo property specialized
    kind property type restricted
    children property type restricted
    constructors populate properties specific to these kinds
    declare computed properties specific to these kinds
*/
//================================================================================
//================================================================================

export type OI = OII | OIG

export class OII extends TII {
  [index: string]: any
  kind: OKindsI = 'noneI'
  name: string = ''
  value: any
  get type() {
    cl(`getting OII.kind`)
    return this.kind 
  }
  get size() { 
    cl(`getting OII.size`)
    if (typeof this.value === 'string') return this.value.length 
    else return 0 
  }
  get parents(): string {
    cl(`getting OII.parents`)
    if (this.parentTIG === undefined) return ''
    else return this.parentTIG.parents + '.' + this.parentTIG.name 
  }
  // show nothing (so only control buttons visible in this column)
  get tiInfo(): string { return ''}
  
  // compute both the "no children" and full version, to be parallel to OIG
  get nameValueString(): string {
    var result: string = ''
    if (!this.parentTTable.showHierarchy) {
      result += this.parents + '.'
    }
    else {
      result += '  '.repeat(this.level)
    }
    result += this.name + ': '
    if (this.value === undefined) result += '<undefined>'
    else if ((typeof this.value) === 'string') result += '"' + this.value + '"'
    else if ((typeof this.value) === 'symbol') result += '`' + this.value.toString() + '`'
    else if ((typeof this.value) === 'boolean') result += '<' + this.value.toString + '>'
    else result += this.value.toString()

    return result

  }


  constructor(parentTTable: TTable) {
    super('string', parentTTable)
    makeObservable(this, {
      tiInfo: computed({keepAlive: true}),
      parents: computed({keepAlive: true}),
      nameValueString: computed({keepAlive: true}),
    })
  }

  populate(item: {name: string, value: any}) {
    switch (typeof item.value) {
      // typeof null returns 'object', treat it as a primitive value
      case 'object': this.kind = 'null'; break;
      case 'string': this.kind = 'string'; break;
      case 'number': this.kind = 'number'; break;
      case 'boolean': this.kind = 'boolean'; break;
      case 'bigint': this.kind = 'bigint'; break;
      case 'symbol': this.kind = 'symbol'; break;
      case 'undefined': this.kind = 'undefined'; break;
      case 'function': this.kind = 'function'; break;
      default: this.kind ='NOTHANDLEDYET'; break;
    }
    this.name = item.name
    try {
      this.value = item.value
    }
    catch(error) {
      this.value = `error accessing prop: ${error}`
    }

  }


}




export class OIG extends TIG {
  [index: string]: any
  kind: OKindsG
  name: string
  value: any
  parentTTable: TTableObj
  get type() { return this.kind }
  get size() { return this.children.length }
  get parents(): string {
    if (this.parentTIG === undefined) return ''
    else return this.parentTIG.parents + '.' + this.parentTIG.name 
  }
  children: OI[] = []

  // show nothing (so only control buttons visible in this column)
  get tiInfo(): string { return ''}

  // compute one line name: value (do not show children)
  get nameValueString(): string {
    var result: string = ''
    if (!this.parentTTable.showHierarchy) {
      result += this.parents + '.'
    }
    else {
      result += '  '.repeat(this.level)
    }
    result += this.name + ': '
    if ((typeof this.value) === 'object') {
      // typeof null returns 'object'
      if (this.value === null) result += '<null>'
      else if (Array.isArray(this.value)) result += `Array [${this.value.length}]`
      else result += `Object {${Object.getOwnPropertyNames(this.value).length}}`
    }
    return result
  }

  constructor(name: string, obj: {[index: string]:any}, parentTTable: TTableObj) {
    super('objectG', parentTTable)
    this.kind = 'objectG'
    this.name = name
    this.parentTTable = parentTTable
    try {
      this.value = obj
    }
    catch(error) {
      this.value = `error accessing prop: ${error}`
    }
    makeObservable(this, {
      tiInfo: computed({keepAlive: true}),
      parents: computed({keepAlive: true}),
      nameValueString: computed({keepAlive: true}),
    })


    this.populateOnExpanded = autorun(()=>{
      // populates direct children 
      // does not recurse down through children of children, to avoid loops where
      // a child references the parent of this object
      if (this.expanded && (this.children.length === 0)) {
        switch (typeof this.value) {
          case 'object': 
            // typeof null returns 'object' - i think we can handle this as an OIG value by just not adding any children
            if (this.value === null) break;
            if (Array.isArray(this.value)) {
              this.kind = 'arrayG'
              for (let i: number = 0; i < this.value.length; i++) {
                switch(typeof this.value[i]) {
                  case 'object':
                    this.addDirectChild(new OIG(i.toString(), this.value[i], this.parentTTable))
                    break
                  default:
                    const nc: OII = new OII(this.parentTTable)
                    nc.populate({name: i.toString(), value: this.value[i]})
                    this.addDirectChild(nc)
                    break
                }
              }
            }
            else {
              for (let p of Object.getOwnPropertyNames(this.value)) {
                //cl(`p: ${p}`)
                switch(typeof this.value[p]) {
                  case 'object':
                    this.addDirectChild(new OIG(p, this.value[p], this.parentTTable))
                    break
                  default:
                    const nc: OII = new OII(this.parentTTable)
                    nc.populate({name: p, value: this.value[p]})
                    this.addDirectChild(nc)
                    break
                }
              }
            }
            break;
          default:
            this.kind = 'NOTHANDLEDYET'
        }
        // OBSOLETE this.parentTTable.sortTIG(this.parentTTable.root)
      }
    })
  }
}

