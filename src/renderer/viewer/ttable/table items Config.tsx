

import { computed, makeObservable, AnnotationsMap } from 'mobx'
import { Annotation } from 'mobx/dist/internal'

import { ConfigKindsG, ConfigKindsI } from '../common/commonAll'
import { TII, TIG } from './table items base'
import { ActionAllowDenyNA, ActionDenyNA, ActionModifyNA, ActionSquidSSL, ConfigItemRaw, makeNewConfigItemRaw, tools } from '../common/configTypesTypes'
import { mapPMViewerConfig, TTableConfig } from './TTableConfig'

const cl = console.log
const ct = console.table




//================================================================================
//================================================================================

/*
  ConfigI/ConfigG specialize TII/TIG as follows
    tiInfo property specialized
    kind property type restricted
    children property type restricted
    constructors populate properties specific to these kinds
    declare computed properties specific to these kinds

    constructor/populate/export methods
      constructors create empty objects
      populate adds props for any host present in parent TTable but missing from item to be added

*/
//================================================================================
//================================================================================

export type Config = ConfigI | ConfigG

export class ConfigI extends TII implements ConfigItemRaw {
  [index: string]: any
  kind: ConfigKindsI = 'configI'
  parentTTable: TTableConfig
  addedProps: string[] = []
  addedPropVals:    { [index: string]: number   } = {}  // 'val' functions for addedProps - will be made as computed's in populate method
  addedPropValDetails: string[] = []

  // IMPLEMENTING PROPS OF CONFIGITEMRAW
  // _id, modified, timestamp, tempItem are already implemented in base class
  // default values below will be replaced when this.populate called in constructor
  tool_browser: boolean = false
  tool_browser_webRequest: boolean = false
  tool_lsnitch: boolean = false
  tool_pihole: boolean = false
  tool_squid: boolean = false
  expirationTime: number = 0
  readonly notes: string = ''  // user defined notes
  readonly priority: string ='100' // store as string, so that gui components can handle it like other properties that are all string-valued
  readonly requestAction: ActionAllowDenyNA = 'deny'  // whether to block or allow request
  readonly jsAction: ActionDenyNA = 'NA' // whether to block javascript execution - note that 'allow' is not an option here
  readonly reqHdrAction: ActionModifyNA = 'NA'
  readonly resHdrAction: ActionModifyNA = 'NA'
  readonly sslbumpAction: ActionSquidSSL = 'bump'
  readonly reqHdrMods: string = ''
  readonly resHdrMods: string = ''
  readonly urlRegexPattern: string = ''  // regex tested against full URL
  readonly hostDomainPatterns: string = ''  // patterns tested against hostname part of URL
  readonly initiatorDomains: string = ''  
  readonly excludedInitiatorDomains: string = ''
  readonly excludedRequestDomains: string = ''   // for browser - zero, one or more domains - if request matches one, rule will NOT match -
  readonly requestMethods: string = '' // can be one or more of RequestMethods
  readonly excludedRequestMethods: string = ''
  readonly resourceTypes: string = '' // can be one or more of ResourceTypes
  readonly excludedResourceTypes: string = ''
  readonly tabIds: string = ''  // one or more tabIds
  readonly excludedTabIds: string = ''
  readonly remoteAddresses: string = ''
  readonly lsprocess: string = ''
  readonly lsvia: string = ''
  readonly lsremote: 'any' | 'local-net' | 'multicast' | 'broadcast' | 'bonjour' | 'dns-servers' | 'bpf' = 'any'
  readonly lsdirection: 'incoming' | 'outgoing' = 'outgoing'
  readonly lsdisabled: boolean = false
  readonly lsports: string = ''
  readonly lsprotocol: 'any' | 'icmp' | 'tcp' | 'udp' = 'any'

  defaultItem = makeNewConfigItemRaw({}, false)

  get toolStatus(): number {
    var result = 0

    for (let p in tools) {
      if (this[p] === true) result |= tools[p].mask
    }

    return result
  }

  get valResultForItem(): number {
    this.addedPropValDetails = []
    let valResult = 0
    // gather val results for props individually
    for (let p of this.addedProps) {
      const v = this.addedPropVals[p]
      if (v !== 0) {
        valResult |= v
        this.addedPropValDetails.push(p)
      }
    }
    // also gather results of cross-prop vals for active tools
    for (let t in tools) {
      let tool = tools[t]
      if (this[t]) {
        const vc = tool.valItemCrossProp(this)
        if (vc !== '') {
          this.addedPropValDetails.push(vc)
          valResult |= tool.mask
        }
        // OBSOLETE valResult |= tool.valItemCrossProp(this) ? 0 : tool.mask
      }
    }
    return valResult
  }

  get valStringForItem(): string {
    let valString = ''
    if (this.valResultForItem & 1) valString += 'tools '
    if (this.valResultForItem & 2) valString += 'hosts '
    for (let t in tools) {
      if (tools[t].mask & this.valResultForItem) valString += t.slice(5) + ' '
    }
    return valString
  }
  
  get tiInfo(): string { 
    let result = ''
    if (this.tempItem === true) result += 'TEMP '
    switch (this.highlightLevelMatching) {
      case 1: result += 'match but not applied'; break
      case 3: result += 'DECISIVE';              break
      default: break
    }

    return  result
            + ( this.modified ? 'modified ' : '' )
            + ((this.valStringForItem !== '') ? 'INVALID' : '')
  }


  constructor(parentTTable: TTableConfig) {
    super('configI', parentTTable)
    this.parentTTable = parentTTable
    makeObservable(this, {
      toolStatus: computed({keepAlive: true}),
      valResultForItem: computed({keepAlive: true}),
      valStringForItem: computed({keepAlive: true}),
      tiInfo: computed({keepAlive: true}),
      // don't need to make config item props observable here, will happen when populate called in next step
    })
 
  }


  populate(item: ConfigItemRaw) {
    super.populate(item)
    // build 'addedPropVals' and make them computed
    // and the getter depends on 'this', so it will recompute whenever anything changes in this ConfigI
    //   THESE ARE NEEDED SO THAT VAL STATE WILL RECOMPUTE FOR *ALL* ADDEDPROPS
    //   WHENEVER *ANY* PROP CHANGES - WHEN A PROP CHANGES, ITS OWN VAL WILL BE RECALCULATED AUTOMATICALLY
    //   BECAUSE THE PROP CELL WILL RE-RENDER, BUT WE ALSO NEED *OTHER* CELL VALS and ACTIVES TO BE UPDATED
    // see notes in TII and TIG re: how to programmatically create computeds
    const annotationMap: { [index: string]: Annotation } = { }
    for (let p in item) {
      Object.defineProperty(
        this.addedPropVals,
        p,
        {
          configurable: true,  // allows mobx to delete this prop, to replace it with computed 
          enumerable: true,
          get: ()=>{
            //cl(`computing val    for ${p} = ${mapPMViewerConfig[p].val(this, p)}`)
            return mapPMViewerConfig[p].val(this, p)}
        }
      )
      annotationMap[p] = computed({keepAlive: true})
    }
    // it seems we need to force the type of the options object in this case
    makeObservable(this.addedPropVals,    annotationMap as AnnotationsMap<ConfigI, never>)
  }

  // note - new ConfigI will have no parentTIG
  duplicate(): ConfigI {
    const newConfigI = new ConfigI(this.parentTTable as TTableConfig)
    // save the _id of the new ConfigI, since it will be over-written by .populate.export below
    const newId = newConfigI._id
    newConfigI.populate(this.export() as ConfigItemRaw)
    // restore the new _id value
    newConfigI._id = newId
    return newConfigI
  }


}


export class ConfigG extends TIG {
  [index: string]: any
  kind: ConfigKindsG = 'configG'

  children: ConfigI[] = []  // children can only be ConfigI, not another ConfigG - i.e., there can only be one level of children

  get tiInfo(): string { return  (this.highlightLevelMatching === 1) ? 'match but inactive' : (this.highlightLevelMatching === 2) ? 'match' : (this.highlightLevelMatching === 4) ? 'decisive' : 'other' }


  constructor(parentTTable: TTableConfig) {
    super('configG', parentTTable)
    makeObservable(this, {
      tiInfo: computed({keepAlive: true}),
    })
  }






}

