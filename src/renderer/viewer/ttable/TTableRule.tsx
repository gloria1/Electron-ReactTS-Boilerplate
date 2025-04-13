import * as React from 'react'

import { observable, computed, action, reaction, toJS, IReactionDisposer, comparer, makeObservable, makeAutoObservable, IObjectDidChange, IArrayDidChange, runInAction } from 'mobx'
import { v4 as uuidv4 } from 'uuid'

import '../vwr-App.css'

import { TIPropFunctions, generic } from '../common/propMethods'

import { RU, RUG, RUI } from './table items Rule'
import { ColData, SortDirs, TTable, TTableBaseConstructorProps } from './TTable base Obj'
import { ConfigRuleBrowserDNR, ConfigRulePihole } from '../common/configTypesTypes'
import { CVMode } from '../common/commonApp'




var _ = require('lodash')

const cl = console.log
const ct = console.table




const mapPMRuleBrowser: {[index: string]: TIPropFunctions} = {
  tiInfo                 : generic,
  configItemID           : generic,
  priority               : generic,
  requestAction          : generic,
  jsAction               : generic,
  reqHdrAction          : generic,
  reqHdrMods            : generic,
  resHdrAction         : generic,
  resHdrMods           : generic,
  excludedDomains        : generic,
  excludedRequestMethods : generic,
  excludedResourceTypes  : generic,
  excludedTabIds         : generic,
  urlRegex               : generic,
  hostnameRegex          : generic,
  initiatorRegex         : generic,
  requestMethods         : generic,
  resourceTypes          : generic,
  tabIds                 : generic,
}

const TTableRuleInitialColDataBrowser = [
  // no need for this one until i populate it with something    ['1', 'tiInfo','Info', 'ttCellPreWrap','', '200', 'none' , 'none'],
  ['1', 'configItemID','Config ID', 'ttCellPreWrap','', '250', 'none' , 'none'],
  ['1', 'priority','Priority', 'ttCellPreWrap','', '100', 'none' , 'none'],
  ['1', 'requestAction','Req Action', 'ttCellPreWrap','', '100', 'none' , 'none'],
  ['1', 'jsAction','JS Action', 'ttCellPreWrap','', '100', 'none' , 'none'],
  ['1', 'reqHdrAction','Req Hdr Action', 'ttCellPreWrap','', '100', 'none' , 'none'],
  ['1', 'reqHdrMods','Req Hdr Mods', 'ttCellPreWrap','', '100', 'none' , 'none'],
  ['1', 'resHdrAction','Res Hdr Action', 'ttCellPreWrap','', '100', 'none' , 'none'],
  ['1', 'resHdrMods','Req Hdr Mods', 'ttCellPreWrap','', '100', 'none' , 'none'],
  ['1', 'hostnameRegex','Hostname Regex', 'ttCellPreWrap','', '200', 'none' , 'none'],
  ['1', 'urlRegex','URL Regex', 'ttCellPreWrap','', '200', 'none' , 'none'],
  ['1', 'initiatorRegex','Initiator Regex', 'ttCellPreWrap','', '100', 'none' , 'none'],
  ['1', 'requestMethods','Methods', 'ttCellPreWrap','', '100', 'none' , 'none'],
  ['1', 'resourceTypes','Res Types', 'ttCellPreWrap','', '100', 'none' , 'none'],
  ['1', 'tabIds','Tab IDs', 'ttCellPreWrap','', '100', 'none' , 'none'],
  ['1', 'excludedDomains','Excl Domains', 'ttCellPreWrap','', '100', 'none' , 'none'],
  ['1', 'excludedRequestMethods','Excl Methods', 'ttCellPreWrap','', '100', 'none' , 'none'],
  ['1', 'excludedResourceTypes','Excl Res Types', 'ttCellPreWrap','', '100', 'none' , 'none'],
  ['1', 'excludedTabIds','Excl Tab IDs', 'ttCellPreWrap','', '100', 'none' , 'none'],
].map((v: string[]) => {return new ColData(v[1], v[2], v[4], (v[6]==='asc') ? SortDirs.asc : SortDirs.none, 0, parseInt(v[5]), v[3], Number.parseInt(v[0]), v[6] as CVMode)})


const mapPMRulePihole: {[index: string]: TIPropFunctions} = {
  tiInfo                 : generic,
  configItemID           : generic,
  domainRegexPattern     : generic,
  requestAction          : generic,
}

const TTableRuleInitialColDataPihole = [
  // no need for this one until i populate it with something    ['1', 'tiInfo','Info', 'ttCellPreWrap','', '200', 'none' , 'none'],
  ['1', 'configItemID','Config ID', 'ttCellPreWrap','', '250', 'none' , 'none'],
  ['1', 'domainRegexPattern','Domain Regex Pattern', 'ttCellPreWrap','', '200', 'none' , 'none'],
  ['1', 'requestAction','Action', 'ttCellPreWrap','', '100', 'none' , 'none'],
].map((v: string[]) => {return new ColData(v[1], v[2], v[4], (v[6]==='asc') ? SortDirs.asc : SortDirs.none, 0, parseInt(v[5]), v[3], Number.parseInt(v[0]), v[7] as CVMode)})


export interface TTableRuleConstructorProps extends Omit<TTableBaseConstructorProps, 'tableType' | 'initialColData' | 'tiConstructor' | 'tiPropFunctions' | 'changeTrackingSetupEnabled' | 'changeTrackingActiveAtConstruction'> {
}

export class TTableRule extends TTable {


  constructor(props: TTableRuleConstructorProps, type: 'browser' | 'pihole') {
    const initialColData = (type === 'browser') ? TTableRuleInitialColDataBrowser : TTableRuleInitialColDataPihole
    super({
      parentDnDApp: props.parentDnDApp,
      tableType: (type === 'browser') ? 'RulesBrowser' : 'RulesPihole',
      tiConstructor: (parentTTable: TTable)=>{return new RUI(parentTTable as TTableRule)},
      tableName: (type === 'browser') ? 'rulesbrowser' : 'rulespihole',
      initialColData: initialColData,
      tiPropFunctions: (type === 'browser') ? mapPMRuleBrowser : mapPMRulePihole,
      // note: root.parentTTable will be set in TTable constructor
      columnVisibleLevel: 1,
      changeTrackingSetupEnabled: false,
      changeTrackingActiveAtConstruction: false,
      showUnsavedChanges: false,
    })
    // do this here, after calling super - the base class constructor will populate colData with values stored in browser storage, however those may be for another rule table type
    this.cols = initialColData
    this.root = new RUG('rootG', this)
    makeObservable(this, {
    })

    // need to bind sortComparer to this table instance, so that version here overrides base class implementation
    this.sortComparer = this.sortComparer.bind(this)


    this.root.expanded = true
  }

  populate(ruleList: ConfigRuleBrowserDNR[] | ConfigRulePihole[]) {
    for (let r of ruleList) {
      const newRUI = new RUI(this)
      newRUI.populate(r)
      this.root.addDirectChild(newRUI)
    }
  }


}


