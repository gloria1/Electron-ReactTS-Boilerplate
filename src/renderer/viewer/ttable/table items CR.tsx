
import { observable, computed, runInAction, makeObservable, action, override } from 'mobx'
import { Annotation, AnnotationsMap } from 'mobx/dist/internal'

import { CRKindsG, CRKindsI, ICRIFromMongo, initFlattenURLs, SourceCRTypes } from '../common/commonAll'
import { TII, TIInfo2 } from './table items base'
import { TIHI, TIHG } from './table items TIH'
import { mapPMViewerCR, crExceptionsString, crInfo2CompactResult, PropItems, PropItemsCRIItemHeader, PropItemsHeaders, PropItemsQueryParams } from '../common/propMethods'
import { HARInitiator, _initiatorCallFrame, _initiatorParent, Cookie, Header } from '../common/harFormatExtended'
import { TTableCR } from './TTableCR'
//import { getDecisionAndOutcomeSummary, getJSOutcome, getReqOutcome, getReqHdrModOutcome, getResHdrModOutcome } from '../common/configTypes'
import { crHierFlatFull, crHierFlatPopup } from '../common/commonApp'


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






// NOTE - THESE get...Outcome.... FUNCTIONS HAD BEEN FACTORED OUT TO configTypes.ts, 
// BUT I MOVED THEM BACK HERE BECAUSE configTypes NEEDS TO BE IMPORTED BY SVR.TS
// AND I DON'T WANT TO HAVE TO EFFECTIVELY IMPORT ALL OF VIEWER
// I DON'T REMEMBER WHY I HAD FACTORED THESE OUT TO CONFIGTYPES IN THE FIRST PLACE 

  // determining outcome for request
  // this is only determine-able for the webReq onCompleted or onErrorOccurred events, or for harI onRequestFinished
  // so return undefined for other events
  // every webRequest should have exactly one of onCompleted or onErrorOccurred
  // there are various error messages in this.error:
  //    net::ERR_BLOCKED_BY_CLIENT - if webRequest blocked it, or browser blocked it for some reason (tracker blocking?)
  //    net::ERR_CACHE_MISS  - browser will have retried and gotten a result in a different webRequest (or if not, then urlG will have exception for 'no outcomes')
  //    net::ERR_CONNECTION_REFUSED
  //    net::ERR_ABORTED - don't know yet what 'aborted' really means (why aborted? who aborted it?  browser?  server?)
  //          one reason for ABORTED - user clicked the X button to cancel a page load
  //    others I have not seen yet?

  // resStatusCode and error on succeeded and failed requests
  //    successful          har          webReq
  //      resStatusCode       'value'      'value'
  //      error               null         undefined
  //    failed              har          webReq
  //      resStatusCode       '0'          undefined
  //      error               'message'    'message'

  // 'error' in harI's
  //    comes from _error in the source harEntry.response
  //    apparently populated by browser with the same error message in webReq.onErrorOccurred.error

  // differences between webReq and harI:
  //   webReq returns different events for success vs. error
  //   harI - we determine error by checking value of this.error
  //   webReq will have 'configItemsThatAffected...' but har will not
  //     therefore, we can add an extra test in webReq for whether request or JS was denied by my rule or otherwise
  //     but for har we cannot -> so, we just return 'denied' for har, or for webReq where a rule applied, but also note 'but not by my rule' for webReq

export function getOutcomeSummary(cr: ICRIFromMongo | CRI): string | undefined {
  let result: string | undefined = undefined
  // format: <req> / <js>
  // <req> and <js>:
  //    <what happened> (<why>)
  // <what happened>:
  //    *Outcome === undefined  -> 'undefined'
  //    *Outcome === 'allowed'  -> 'all'
  //    *Outcome === 'blocked'  -> 'blk'
  //    *Outcome === 'failed*'  -> 'fail'
  //    *Outcome === something else -> 'OTHER'
  // <why>:
  //    wasTested === 'false'  -> 'nottested'
  //    rulesThatAffected === undefined  -> 'norule'
  //    rulesThatAffected === 'anyhost'|'specific'|'both'  -> that value
  if ((cr.event === 'wrOnCompleted') || (cr.event === 'wrOnErrorOccurred')) {
    switch (cr.reqOutcome) {
      case undefined: result = 'undefined'; break
      case 'allowed': result = 'allow'; break
      case 'blocked': result = 'block'; break
      default:  if (cr.reqOutcome.slice(0,6)==='failed') result = 'fail'; else result = 'OTHER'; break
    }
    // OBSOLETE - WE NOW ONLY SHOW OUTCOME result += ' ('
    // OBSOLETE - WE NOW ONLY SHOW OUTCOME if (cr.reqWasTested === 'false') result += 'nottested'
    // OBSOLETE - WE NOW ONLY SHOW OUTCOME else switch (cr.reqRuleTypesThatAffected) {
    // OBSOLETE - WE NOW ONLY SHOW OUTCOME   case undefined: result += 'norule'; break
    // OBSOLETE - WE NOW ONLY SHOW OUTCOME   case 'anyhost':
    // OBSOLETE - WE NOW ONLY SHOW OUTCOME   case 'specific':
    // OBSOLETE - WE NOW ONLY SHOW OUTCOME   case 'both':
    // OBSOLETE - WE NOW ONLY SHOW OUTCOME     result += cr.reqRuleTypesThatAffected; break
    // OBSOLETE - WE NOW ONLY SHOW OUTCOME   default: result+= 'OTHER'; break
    // OBSOLETE - WE NOW ONLY SHOW OUTCOME }
    // OBSOLETE - WE NOW ONLY SHOW OUTCOME result += ')'
    if (cr.jsOutcome !== undefined) {
      result += ' / '
      switch (cr.jsOutcome) {
        case undefined: result += 'undefined'; break
        case 'allowed': result += 'allow'; break
        case 'blocked': result += 'block'; break
        default:  result += 'OTHER'; break
      }
      // OBSOLETE - WE NOW ONLY SHOW OUTCOME result += ' ('
      // OBSOLETE - WE NOW ONLY SHOW OUTCOME if (cr.jsWasTested === 'false') result += 'nottested'
      // OBSOLETE - WE NOW ONLY SHOW OUTCOME else switch (cr.jsRuleTypesThatAffected) {
      // OBSOLETE - WE NOW ONLY SHOW OUTCOME   case undefined: result += 'norule'; break
      // OBSOLETE - WE NOW ONLY SHOW OUTCOME   case 'anyhost':
      // OBSOLETE - WE NOW ONLY SHOW OUTCOME   case 'specific':
      // OBSOLETE - WE NOW ONLY SHOW OUTCOME   case 'both':
      // OBSOLETE - WE NOW ONLY SHOW OUTCOME     result += cr.jsRuleTypesThatAffected; break
      // OBSOLETE - WE NOW ONLY SHOW OUTCOME   default: result+= 'OTHER'; break
      // OBSOLETE - WE NOW ONLY SHOW OUTCOME }
      // OBSOLETE - WE NOW ONLY SHOW OUTCOME result += ')'
    }
  }

  return result

}




export function getReqOutcome(cr: ICRIFromMongo | CRI): string | undefined {
  switch (cr.kind) {
    case 'webReqI':
      if (cr.event === 'wrOnErrorOccurred') {
        switch (cr.error) {
          case 'net::ERR_CACHE_MISS':  return 'failed cache miss'
          case 'net::ERR_BLOCKED_BY_CLIENT': return 'blocked'
          default: return `failed upstream (${cr.error})`
        }
      }
      else if ((cr.event === 'wrOnCompleted') || (cr.event === 'wrOnBeforeRedirect') || (cr.event === 'wrOnAuthRequired')) {
        if ((cr.resStatusCode === undefined) || (cr.resStatusCode === '0')) return 'INDETERMINATE - onCompleted but status code 0 or undefined'
        else return 'allowed'
      }
      else return undefined
      case 'harI':
        if (cr.error !== 'null') {  // in sourceCR, error will be a javascript null, but it gets toString'd in propMethods-server
          switch (cr.error) {
            case 'net::ERR_CACHE_MISS':  return 'failed cache miss'
            case 'net::ERR_BLOCKED_BY_CLIENT': 
            case '':
              return 'blocked'
            // what to do with harI's where error is not null, but its value is ''??
                // it appears these are happening where:
                  // a request is allowed but js is blocked
                  // ...AND the resource it returned has script tags
                // a har is generated even though a webRequest is not
                //  and in devtools/network, the har shows with status = 'blocked:csp'
                // ==> so, we will treat these as 'blocked', same as if we got error message net:ERR_BLOCKED_BY_CLIENT
            default: return `failed upstream (${cr.error})`
          }
        }
        else return 'allowed'
      default:
        return undefined 
  }
}

export function getJSOutcome(cr: ICRIFromMongo | CRI): string | undefined {
  const jsAllowed = (cr.resHeaders === undefined) ? undefined : !cr.resHeaders.toLowerCase().includes('script-src \'none\'')
  switch(cr.kind) {
    case 'webReqI':
      if (cr.event === 'wrOnErrorOccurred') return undefined
      else if (cr.event === 'wrOnCompleted') {
        if ((cr.resStatusCode === undefined) || (cr.resStatusCode === '0')) return 'INDETERMINATE - onCompleted but status code 0 or undefined'
        if (cr.resHeaders === undefined) return undefined
        if (cr.resHeaders.toLowerCase().includes('script-src \'none\'')) return 'blocked'
        else return 'allowed'
      }
      else return undefined
    case 'harI':
      if (cr.error !== 'null') return undefined  // in sourceCR, error will be a javascript null, but it gets toString'd in propMethods-server
      else return jsAllowed ? 'allowed': 'blocked'
    default:
      return undefined
  }
}



/*
  extending this to also compute hdr mod outcome
  make separate methods and TTableCR columns for *HdrModOutcome
  algorithm:
    check *HdrModDecisionResult - if 'modify'
      append 'Modifications:\n' to result
      find siblings with before/after header details
      if siblings for comparison available
        compute diff
          result should be \n separated list of 
            ADDED name: value
            REMOVED name: value
            CHANGED name: oldValue -> newValue
          build arrays of added, removed, changed : string[]
          loop over 'before' headers
            if find matching name AND value in 'after', remove from after (so loop over after will not test it)
            if find matching name but !== value, add to 'changed'
            else add to 'removed'
          loop over 'after' headers
            if no matching name in 'before', add to 'added'
        append diff info to result
      else append 'events not captured to compute diff'
      
*/



/*

NEED TO COMPUTE REQHDROUTCOME ON THE ONSENDHEADERS EVENT
REQ HEADERS ARE NOT PRESENT IN ONCOMPLETED

*/


export function getReqHdrModOutcome(cr: ICRIFromMongo | CRI): string | undefined {
  let result: string | undefined = undefined
  if ((cr.kind === 'webReqI') && (cr.event === 'wrOnSendHeaders')) {
    const before = cr.parentTIGdef.children.find((c: CRI) => (c.event === 'wrOnBeforeSendHeaders'))
    const after = cr.parentTIGdef.children.find((c: CRI) => (c.event === 'wrOnSendHeaders'))
    if ((before === undefined) || (after === undefined)) result = 'events needed to compute diff not captured'
    else result = computeHeaderDiffs(before.reqHeadersObject[0], after.reqHeadersObject[0])
  }

  return result
}
export function getResHdrModOutcome(cr: ICRIFromMongo | CRI): string | undefined {
  let result: string | undefined = undefined

  if ((cr.kind === 'webReqI') && (cr.event === 'wrOnCompleted')) {
    const before = cr.parentTIGdef.children.find((c: CRI) => (c.event === 'wrOnHeadersReceived'))
    const after = cr
    if ((before === undefined) || (after === undefined)) result = 'events needed to compute diff not captured'
    else result = computeHeaderDiffs(before.resHeadersObject[0], after.resHeadersObject[0])
  }

  return result
}



function computeHeaderDiffs(before: Header[], after: Header[]): string | undefined {

  let result: string = ''
  const beforeUnique: Header[] = []
  const afterUnique: Header[] = []
  
  // find diffs
  // don't know if we can assume headers will be in same order in 'before' and 'after'

  // note: cannot mutate before and after arrays passed in,
  // so we need to build up separate arrays of unique items from before, after

  for (let h of before) {
    if (after.findIndex(ah => ((ah.name === h.name) && (ah.value === h.value))) === -1) beforeUnique.push(h)
  }
  for (let h of after) {
    if (before.findIndex(bh => ((bh.name === h.name) && (bh.value === h.value))) === -1) afterUnique.push(h)
  }


  for (let h of beforeUnique) {
    const hai = afterUnique.findIndex(haitem => (h.name === haitem.name))
    if (hai === -1) result += `REMOVED: ${h.name}: ${h.value}\n`
    else {
      result += `CHANGED: ${h.name}: ${h.value}    -> ${afterUnique[hai].value}\n`
      // need to remove from afterUnique, so loop over afterUnique does not report this as 'added'
      afterUnique.splice(hai, 1)
    }
  }
  for (let h of afterUnique) {
    const hai = beforeUnique.findIndex(haitem => ((haitem.name === h.name) && (haitem.value === h.value)))
    if (hai === -1) result += `ADDED: ${h.name}: ${h.value}\n`
  }
  if (result === '') return undefined
  else return result.slice(0, -1)
}





















export type CR = CRI | CRG

export class CRI extends TIHI implements Omit<ICRIFromMongo, 'webReqBlockDecisionState' | '_id'> { 
                                    // implements rather than extends, because can only extend one thing
                                    // omit the def of webReqBlockDecisionState, because we need to override it here with the json-ified version (since webReqBlockDecisionState is a grouped prop)
                                    // omit the def of _id because it will not exist for CRI's loaded in extension (which get there before the CR has been stored in mongo)
  [index: string]: any
  // need to re-declare non-optional props of ICRIFromMongo here, because we implement it rather than extending (because can only extend one thing)
  // the initializers are required by typescript, but do not do anything because these props will all be over-written when the constructor does Object.assign from source CRI from mongo
  // EXCEPT the webReqBlockDecisionState declaration specifies the type as the json-ified values of the state (since that is a grouped prop)
  kind: CRKindsI = 'noneI'
  parentTTable: TTableCR

  constructor(parentTTable: TTableCR) {

    super('noneI', parentTTable, (parentTTable.isForPopup === true) ? crHierFlatPopup : crHierFlatFull)
    this.parentTTable = parentTTable
    makeObservable(this, {
      tiInfo: computed({keepAlive: true}),
      // OBSOLETE crInfo: computed({keepAlive: true}),
      crInfo2: computed({keepAlive: true}),
      crInfo2PropItems: computed({keepAlive: true}),
      queryParams: computed({keepAlive: true}),
      queryParamsPropItems: computed({keepAlive: true}),
      dNRRuleDisplay: computed({keepAlive: true}),
      dNRRuleDisplayPropItems: computed({keepAlive: true}),
      crExceptions: computed({keepAlive: true}),
      domain2: computed({keepAlive: true}),
      domain2PropItems: computed({keepAlive: true}),
      reqOutcome: computed({keepAlive: true}),
      reqOutcomePropItems: computed({keepAlive: true}),
      jsOutcome: computed({keepAlive: true}),
      jsOutcomePropItems: computed({keepAlive: true}),
      outcomeSummary: computed({keepAlive: true}),
      outcomeSummaryPropItems: computed({keepAlive: true}),
      harParserInitJSOutcome: computed({keepAlive: true}),
      harParserInitJSOutcomePropItems: computed({keepAlive: true}),
      reqCookiesSummary: computed({keepAlive: true}),
      reqCookiesSummaryPropItems: computed({keepAlive: true}),
      resCookiesSummary: computed({keepAlive: true}),
      resCookiesSummaryPropItems: computed({keepAlive: true}),
      // OBSOLETE OR WILL BE ADAPTED reqHeadersSummary: computed({keepAlive: true}),
      // OBSOLETE OR WILL BE ADAPTED reqHeadersSummaryPropItems: computed({keepAlive: true}),
      // OBSOLETE OR WILL BE ADAPTED resHeadersSummary: computed({keepAlive: true}),
      // OBSOLETE OR WILL BE ADAPTED initOrigins: computed({keepAlive: true}),
      // OBSOLETE OR WILL BE ADAPTED initURLs: computed({keepAlive: true}),
      // OBSOLETE OR WILL BE ADAPTED initOriginMostLocal: computed({keepAlive: true}),
      // OBSOLETE OR WILL BE ADAPTED initOriginMostGlobal: computed({keepAlive: true}),
      // OBSOLETE OR WILL BE ADAPTED initAnyNonURLs: computed({keepAlive: true}),
    })
  }

  get tiInfo(): string {
    let result: string = '' // = this.unsavedChanges ? '*' : ''
    // now we do this in CellContent if (this.level > 1) result += '   '.repeat(this.level-1) + '↳'
    result += this.kind
    return result
  }

  // OBSOLETE get crInfo(): string | number | undefined { return crInfoWebNavWebReqHarString(this) }

  get crInfo2(): string {
    return crInfo2CompactResult(this)
  }
  get crInfo2PropItems(): PropItems | undefined {  // need to also compute PropItems since the base prop is computed and hence not populated by convertOnLoad
    if (this.crInfo2 === undefined) return undefined
    else return {
      count: 1,
      uniqueCount: 1,
      criItems: [{
        color: 0,
        item: this.crInfo2
      }]
    }
  }


  get queryParams(): string {
    const u = new URL(this['url'])
    const q = Array.from(u.searchParams.entries())
    // array items are [string, string], where first item is name, second is value, already de-url-encoded

    const result: string = q.map(i => `${i[0]} = ${i[1]}`).join('\n')
    if (result.length > 0) result.slice(0, -1)

    return result
  }

  get queryParamsPropItems(): PropItemsQueryParams | undefined {

    const u = new URL(this['url'])
    const q = Array.from(u.searchParams.entries())
    // array items are [string, string], where first item is name, second is value, already de-url-encoded



    return {
      count: 1,
      uniqueCount: 1,
      criItems: [{
        color: 0,
        modifiedCount: 0,
        item: this.queryParams,
        object: q.map(i => {return { name: i[0], value: i[1]}})
      }]
    }
  }


  get dNRRuleDisplay(): string | undefined {
    if (this.dNRRule === undefined) return undefined

    let result: string = this.dNRRuleObject.a_type
    if (this.dNRRuleObject.a_requestHeaders !== undefined) {
      result += ' REQ HDR MODS: '
      result += this.dNRRuleObject.a_requestHeaders.map((h: chrome.declarativeNetRequest.ModifyHeaderInfo, i: number) =>
        `${(i>0)?', ':''} ${h.operation} ${h.header} ${(h.value !== undefined) ? h.value : ''}`
      )
    }
    if (this.dNRRuleObject.a_responseHeaders !== undefined) {
      result += ' RES HDR MODS: '
      result += this.dNRRuleObject.a_responseHeaders.map((h: chrome.declarativeNetRequest.ModifyHeaderInfo, i: number) =>
        `${(i>0)?', ':''} ${h.operation} ${h.header} ${(h.value !== undefined) ? h.value : ''}`
      )
    }

    return result

  }
  get dNRRuleDisplayPropItems(): PropItems | undefined {  // need to also compute PropItems since the base prop is computed and hence not populated by convertOnLoad
    if (this.dNRRuleDisplay === undefined) return undefined
    else return {
      count: 1,
      uniqueCount: 1,
      criItems: [{
        color: 0,
        item: this.dNRRuleDisplay
      }]
    }
  }


  get crExceptions(): string | undefined { return crExceptionsString(this) }

  get domain2(): string | undefined {
    if (this.hostname === undefined) return undefined
    else {
      const parts = this.hostname.split('.').reverse()
      var result: string = ''
      if (parts.length === 1) result = parts[0]
      else result = parts[1] + '.' + parts[0]
      return result
    }
  }
  get domain2PropItems(): PropItems | undefined {  // need to also compute PropItems since the base prop is computed and hence not populated by convertOnLoad
    if (this.domain2 === undefined) return undefined
    else return {
      count: 1,
      uniqueCount: 1,
      criItems: [{
        color: 0,
        item: this.domain2
      }]
    }
  }

/* OBSOLETE, OR WILL ADAPT
   CURRENT DIRECTION IS SINGLE REQHEADERS PROP, WITH DISPLAY RESPECTING HEADERSTOSHOW STATE

  // also generates reqHeadersSummaryPropItems
  get reqHeadersSummary(): string | undefined {
    if ((this.kind !== 'harI') && (this.kind !== 'webReqI')) return undefined
    if (this.reqHeaders === undefined) return undefined
    if (this.reqHeaders === '') return undefined
    let result: string = ''
    // doing this separatelylet resultPropItems: PropItemsHeaders = {  // initialize with dummy value - will be populated during header scan, or set to undefined at end
    // doing this separately  count: 1,
    // doing this separately  uniqueCount: 1,
    // doing this separately  items: [{
    // doing this separately    color: 0,
    // doing this separately    item: '',
    // doing this separately    object: []
    // doing this separately  }],
    // doing this separately}

    const hs: Header[] = this.reqHeadersPropItems.items[0].object
    for (let h of hs) {
      // only include in result if active in headersToShowInSummary
      if (
        ((this.parentTTable.headersToShowInSummary[h.name] === undefined) && (this.parentTTable.headersToShowInSummary['__other']))  // if it is a custom header name and 'other' is active
        || (this.parentTTable.headersToShowInSummary[h.name])                                                                        // or name is found in headersToShow
      ) {
        // convert header names to lower case - they are sometimes upper and sometimes lower as captured
        // but header names are not case sensitive per MDN (should probably confirm from other sources too)
        h.name = h.name.toLowerCase()
        result += h.name + ': ' + h.value + '\n'
        // doing this separately resultPropItems.items[0].object.push({
        // doing this separately   displayColor: 0,
        // doing this separately   name: h.name,
        // doing this separately   value: h.value
        // doing this separately })
      }
    }
    // also set this.reqHeadersSummaryPropItems
    if (result.length === 0) {
      // doing this seprately this.reqHeadersSummaryPropItems = undefined
      return undefined
    }
    else {
      // doing this seprately resultPropItems.items[0].item = result
      // doing this seprately this.reqHeadersSummaryPropItems = resultPropItems
      return result.slice(0, -1)
    }

    // OBSOLETE const headersArray: string[] = this.reqHeaders.split('\n')  // now using grouped as list no dups   JSON.parse(this.reqHeaders)[0].split('\n')
    // OBSOLETE for (let h of headersArray) {
    // OBSOLETE   // convert header names to lower case - they are sometimes upper and sometimes lower as captured
    // OBSOLETE   // but header names are not case sensitive per MDN (should probably confirm from other sources too)
    // OBSOLETE   if (h.slice(0, 1) === ':') continue  // skip over the entries added by Har for the items in first line of request/response
    // OBSOLETE   const hName = h.split(':')[0]
    // OBSOLETE   if (this.parentTTable.headersToShowInSummary[hName] === undefined) {  // if hName not found in headersToShowInSummary, it is some custom header name
    // OBSOLETE     if (this.parentTTable.headersToShowInSummary['__other']) {    // .. so visibility determined by '__other'
    // OBSOLETE       result += h + '\n'
    // OBSOLETE     }
    // OBSOLETE   }
    // OBSOLETE   else if (this.parentTTable.headersToShowInSummary[hName]) {
    // OBSOLETE     result += h + '\n'
    // OBSOLETE   }
    // OBSOLETE }
    // OBSOLETE return (result.length > 0) ? result.slice(0, -1) : undefined
  }
  get reqHeadersSummaryPropItems(): PropItemsHeaders | undefined {
    if (this.reqHeadersSummary === undefined) return undefined
    else return {
      count: 1,
      uniqueCount: 1,
      items: [{
        color: 0,
        item: this.reqHeadersSummary,
        object: this.reqHeadersSummary.split('\n').map(hs => { const delim = hs.indexOf(':'); return { displayColor: 0, name: hs.slice(0,delim), value: (hs.slice(delim+1)) } })
      }]
    }
  }

  get resHeadersSummary(): string | undefined {
    if ((this.kind !== 'harI') && (this.kind !== 'webReqI')) return undefined
    if (this.resHeaders === undefined) return undefined
    if (this.resHeaders === '[""]') return undefined
    let result: string = ''
    const headersArray: string[] =  JSON.parse(this.resHeaders)[0].split('\n')
    for (let h of headersArray) {
      // convert header names to lower case - they are sometimes upper and sometimes lower as captured
      // but header names are not case sensitive per MDN (should probably confirm from other sources too)
      if (h.slice(0, 1) === ':') continue  // skip over the entries added by Har for the items in first line of request/response
      const hName = h.split(':')[0]
      if (this.parentTTable.headersToShowInSummary[hName] === undefined) {  // if hName not found in headersToShowInSummary, it is some custom header name
        if (this.parentTTable.headersToShowInSummary['__other']) {    // .. so visibility determined by '__other'
          result += h + '\n'
        }
      }
      else if (this.parentTTable.headersToShowInSummary[hName]) {
        result += h + '\n'
      }
    }
    return (result.length > 0) ? result.slice(0, -1) : undefined
  }

  get reqHdrModOutcome(): string | undefined {
    return getReqHdrModOutcome(this)
  }
  get resHdrModOutcome(): string | undefined {
    return getResHdrModOutcome(this)
  }
*/





  get harParserInitJSOutcome(): string | undefined {
    // only compute if this is a harI....
    if (this.kind !== 'harI') return undefined
    else {
      // ... and it failed and 'error' is '' - which indicates that if failed due to being initiated by another request that completed with CSP = script-src 'none'
      if ((this.resStatusCode !== '0') || (this.error !== '')) return undefined

      // if we got this far, we want to populate something for this prop
      // either we find the initiating webReqG and it was request allowed + js blocked (which is the expected pattern)
      // or we don't find a webReqG that fits that pattern, in which case we will populate an error message
      const initType = this.initiatorObject[0].type
      // ... and it was initiated by parser
      if (initType !== 'parser') return undefined
      else {
        const initUrl = this.initiatorObject[0].url
        const initUrlG = this.parentTTable.harIsByurlWOFragDict[initUrl]
        if (initUrlG.length > 1) return 'FOUND MULTIPLE WEBREQG THAT COULD HAVE INITIATED'
        else initUrlG.splice(1)

        // need to chase down the webReqG within the urlG that initiated this har
        // criteria to check on initWebReqG:
        //   reqOutcome === 'allowed'
        //   jsOutcome === 'blocked'
        //   resourceType === 'main_frame' | 'sub_frame' (resource types for webReqs that returned html)
        // ... and there must be only one webReqG that has these criteria
        let initWebReqG: CRG | undefined = undefined
        for (let c of initUrlG[0].children) {
          if (c.kind !== 'webReqG') continue
          if (c.urlWOFrag !== initUrl) continue
          if (c.reqOutcome !== 'allowed') continue
          if (c.jsOutcome !== 'blocked') continue
          if ((c.resourceType !== 'main_frame') && (c.resourceType !== 'sub_frame')) continue
          // if we got this far, this webReqG appears to qualify, but if initWebReqG is not undefined
          // we already found another one that appears to qualify, so return error message instead
          if (initWebReqG !== undefined) return 'FOUND MULTIPLE WEBREQG THAT COULD HAVE INITIATED'
          // populate initWebReqG, but continue loop, in case there is another webReqG that also qualifies
          initWebReqG = c
        }
        if (initWebReqG === undefined) return 'COULD NOT FIND MATCHING WEBREQG'
        else return `parser initiated, init jsOutcome: ${initWebReqG.jsOutcome}`
      }
    }
  }
  get harParserInitJSOutcomePropItems(): PropItems | undefined {  // need to also compute PropItems since the base prop is computed and hence not populated by convertOnLoad
    if (this.harParserInitJSOutcome === undefined) return undefined
    else return {
      count: 1,
      uniqueCount: 1,
      criItems: [{
        color: 0,
        item: this.harParserInitJSOutcome
      }]
    }
  }


  get outcomeSummary(): string | undefined {
    return getOutcomeSummary(this)
  }
  get outcomeSummaryPropItems(): PropItems | undefined {  // need to also compute PropItems since the base prop is computed and hence not populated by convertOnLoad
    if (this.outcomeSummary === undefined) return undefined
    else return {
      count: 1,
      uniqueCount: 1,
      criItems: [{
        color: 0,
        item: this.outcomeSummary
      }]
    }
  }

  get reqOutcome(): string | undefined {
    return (getReqOutcome(this))
  }
  get reqOutcomePropItems(): PropItems | undefined {  // need to also compute PropItems since the base prop is computed and hence not populated by convertOnLoad
    if (this.reqOutcome === undefined) return undefined
    else return {
      count: 1,
      uniqueCount: 1,
      criItems: [{
        color: 0,
        item: this.reqOutcome
      }]
    }
  }
  get jsOutcome(): string | undefined {
    return getJSOutcome(this)
  }
  get jsOutcomePropItems(): PropItems | undefined {  // need to also compute PropItems since the base prop is computed and hence not populated by convertOnLoad
    if (this.jsOutcome === undefined) return undefined
    else return {
      count: 1,
      uniqueCount: 1,
      criItems: [{
        color: 0,
        item: this.jsOutcome
      }]
    }
  }

  get reqCookiesSummary(): string | undefined {
    if (this.kind !== 'harI') return undefined

    let result: string = ''
    if (this.reqCookiesObject.length > 1) {
      result = `REQCOOKIESOBJECT FOR CRI HAS MORE THAN ONE ITEM`
      return result
    }
    for (let c of this.reqCookiesObject[0]) {
      const cookie: Cookie = c
      result += cookie.domain + ' - ' + cookie.path + ' - ' + cookie.name + ': ' + cookie.value + '\n'
    }
    return (result.length > 0) ? result.slice(0, -1) : undefined
  }
  get reqCookiesSummaryPropItems(): PropItems | undefined {  // need to also compute PropItems since the base prop is computed and hence not populated by convertOnLoad
    if (this.reqCookiesSummary === undefined) return undefined
    else return {
      count: 1,
      uniqueCount: 1,
      criItems: [{
        color: 0,
        item: this.reqCookiesSummary
      }]
    }
  }

  get resCookiesSummary(): string | undefined {
    if (this.kind !== 'harI') return undefined

    let result: string = ''
    if (this.resCookiesObject.length > 1) {
      result = `RESCOOKIESOBJECT FOR CRI HAS MORE THAN ONE ITEM`
      return result
    }
    for (let c of this.resCookiesObject[0]) {
      const cookie: Cookie = c
      result += cookie.domain + ' - ' + cookie.path + ' - ' + cookie.name + ': ' + cookie.value + '\n'
    }
    return (result.length > 0) ? result.slice(0, -1) : undefined
  }
  get resCookiesSummaryPropItems(): PropItems | undefined {  // need to also compute PropItems since the base prop is computed and hence not populated by convertOnLoad
    if (this.resCookiesSummary === undefined) return undefined
    else return {
      count: 1,
      uniqueCount: 1,
      criItems: [{
        color: 0,
        item: this.resCookiesSummary
      }]
    }
  }


  get requestOriginHeader(): string | undefined {
    // search through 'reqHeadersObject' property
    // it is an array of { name: string, value: string }
    // if one of them has a name of "Origin" return the value
    if (this.reqHeadersObject === undefined) return undefined
    for (let h of this.reqHeadersObject[0]) {
      if (h.name === "Origin") return h.value
    }
    return undefined
  }



  // OBSOLETE OR WILL ADAPT  get initOrigins(): string | undefined {
  // OBSOLETE OR WILL ADAPT    switch (this.kind) {
  // OBSOLETE OR WILL ADAPT      case 'webReqI':
  // OBSOLETE OR WILL ADAPT        if (this.initiator !== undefined) {
  // OBSOLETE OR WILL ADAPT          try {
  // OBSOLETE OR WILL ADAPT            const url: URL = new URL(JSON.parse(this.initiator)[0]) 
  // OBSOLETE OR WILL ADAPT            return JSON.stringify([url.origin+' (from webReq)'])  
  // OBSOLETE OR WILL ADAPT          }
  // OBSOLETE OR WILL ADAPT          catch {
  // OBSOLETE OR WILL ADAPT            return JSON.stringify([`_A WEBREQ INITIATOR URL FAILS URL CONSTRUCTOR - ${this.initiator}`])
  // OBSOLETE OR WILL ADAPT          }
  // OBSOLETE OR WILL ADAPT        }
  // OBSOLETE OR WILL ADAPT        else return undefined
  // OBSOLETE OR WILL ADAPT      case 'harI':
  // OBSOLETE OR WILL ADAPT        const init: _initiator = this.initiatorObject[0]
  // OBSOLETE OR WILL ADAPT        const resultSet: Set<string> = new Set()
  // OBSOLETE OR WILL ADAPT        switch(init.type) {
  // OBSOLETE OR WILL ADAPT          case 'other':
  // OBSOLETE OR WILL ADAPT            break
  // OBSOLETE OR WILL ADAPT          case 'parser':
  // OBSOLETE OR WILL ADAPT            if (init.url === undefined) resultSet.add('_A HAR INITIATOR OF TYPE parser HAS NO URL')
  // OBSOLETE OR WILL ADAPT            else {
  // OBSOLETE OR WILL ADAPT              let uo: URL = new URL('https://dummy.com')
  // OBSOLETE OR WILL ADAPT              try { 
  // OBSOLETE OR WILL ADAPT                uo = new URL(init.url)
  // OBSOLETE OR WILL ADAPT                if (uo.origin === undefined) resultSet.add(`_A HAR INITIATOR URL HAS .origin undefined - ${init.url}`)
  // OBSOLETE OR WILL ADAPT                else if (uo.origin === 'null'     ) resultSet.add(`_A HAR INITIATOR URL .origin returns \'null\' - ${init.url}`)
  // OBSOLETE OR WILL ADAPT                else resultSet.add((new URL(init.url)).origin)
  // OBSOLETE OR WILL ADAPT              }
  // OBSOLETE OR WILL ADAPT              catch { 
  // OBSOLETE OR WILL ADAPT                resultSet.add(`_A HAR INITIATOR URL FAILS URL HANDLING - ${init.url}`) 
  // OBSOLETE OR WILL ADAPT              }
  // OBSOLETE OR WILL ADAPT            }
  // OBSOLETE OR WILL ADAPT          break
  // OBSOLETE OR WILL ADAPT          case 'script':
  // OBSOLETE OR WILL ADAPT            if (init.stack === undefined) resultSet.add('_A HAR INITIATOR OF TYPE script HAS NO stack')
  // OBSOLETE OR WILL ADAPT            else {
  // OBSOLETE OR WILL ADAPT              let urlArr = initFlattenURLs({callFrames: init.stack.callFrames, parent: init.stack.parent}, false)
  // OBSOLETE OR WILL ADAPT              for (let u of urlArr) {
  // OBSOLETE OR WILL ADAPT                let uo: URL = new URL('https://dummy.com')
  // OBSOLETE OR WILL ADAPT                try { 
  // OBSOLETE OR WILL ADAPT                  uo = new URL(u)
  // OBSOLETE OR WILL ADAPT                  if (uo.origin === undefined) resultSet.add(`_A HAR INITIATOR URL HAS .origin undefined - ${u}`)
  // OBSOLETE OR WILL ADAPT                  else if (uo.origin === 'null'     ) resultSet.add(`_A HAR INITIATOR URL .origin returns  \'null\' - ${u}`)
  // OBSOLETE OR WILL ADAPT                  else resultSet.add((new URL(u)).origin)
  // OBSOLETE OR WILL ADAPT                }
  // OBSOLETE OR WILL ADAPT                catch { 
  // OBSOLETE OR WILL ADAPT                  resultSet.add(`_A HAR INITIATOR URL FAILS URL CONSTRUCTOR - ${u}`) 
  // OBSOLETE OR WILL ADAPT                }
  // OBSOLETE OR WILL ADAPT              }
  // OBSOLETE OR WILL ADAPT            }
  // OBSOLETE OR WILL ADAPT            break
  // OBSOLETE OR WILL ADAPT          default:
  // OBSOLETE OR WILL ADAPT            resultSet.add('_A HAR HAS AN INITIATOR WITH TYPE NOT EQUAL TO other|parser|sript')
  // OBSOLETE OR WILL ADAPT        }
  // OBSOLETE OR WILL ADAPT        if (resultSet.size === 0) return undefined
  // OBSOLETE OR WILL ADAPT        else {
  // OBSOLETE OR WILL ADAPT          // OBSOLETE return JSON.stringify([...resultSet])
  // OBSOLETE OR WILL ADAPT          return Array.from(resultSet).join('\n')
  // OBSOLETE OR WILL ADAPT        }
  // OBSOLETE OR WILL ADAPT      default:
  // OBSOLETE OR WILL ADAPT        return undefined
  // OBSOLETE OR WILL ADAPT    }
  // OBSOLETE OR WILL ADAPT  }
  // OBSOLETE OR WILL ADAPT  get initURLs(): string | undefined {
  // OBSOLETE OR WILL ADAPT    switch (this.kind) {
  // OBSOLETE OR WILL ADAPT      case 'webReqI':
  // OBSOLETE OR WILL ADAPT        if (this.initiator !== undefined) return JSON.stringify([JSON.parse(this.initiator)[0]+' (from WebReq)'])
  // OBSOLETE OR WILL ADAPT        else return undefined
  // OBSOLETE OR WILL ADAPT      case 'harI':
  // OBSOLETE OR WILL ADAPT        const init: _initiator = this.initiatorObject[0]
  // OBSOLETE OR WILL ADAPT        const resultSet: Set<string> = new Set()
  // OBSOLETE OR WILL ADAPT        switch(init.type) {
  // OBSOLETE OR WILL ADAPT          case 'other':
  // OBSOLETE OR WILL ADAPT            break
  // OBSOLETE OR WILL ADAPT          case 'parser':
  // OBSOLETE OR WILL ADAPT            if (init.url === undefined) resultSet.add('_A HAR INITIATOR OF TYPE parser HAS NO URL')
  // OBSOLETE OR WILL ADAPT            else resultSet.add(init.url)
  // OBSOLETE OR WILL ADAPT            break
  // OBSOLETE OR WILL ADAPT          case 'script':
  // OBSOLETE OR WILL ADAPT            if (init.stack === undefined) resultSet.add('_A HAR INITIATOR OF TYPE script HAS NO stack')
  // OBSOLETE OR WILL ADAPT            else {
  // OBSOLETE OR WILL ADAPT              let urlArr = initFlattenURLs({callFrames: init.stack.callFrames, parent: init.stack.parent}, false)
  // OBSOLETE OR WILL ADAPT              for (let u of urlArr) resultSet.add(u)
  // OBSOLETE OR WILL ADAPT            }
  // OBSOLETE OR WILL ADAPT            break
  // OBSOLETE OR WILL ADAPT          default:
  // OBSOLETE OR WILL ADAPT            resultSet.add('_A HAR HAS AN INITIATOR WITH TYPE NOT EQUAL TO other|parser|sript')
  // OBSOLETE OR WILL ADAPT        }
  // OBSOLETE OR WILL ADAPT        if (resultSet.size === 0) return undefined
  // OBSOLETE OR WILL ADAPT        // OBSOLETE else return JSON.stringify([...resultSet])
  // OBSOLETE OR WILL ADAPT        else return Array.from(resultSet).join('\n')
  // OBSOLETE OR WILL ADAPT      default:
  // OBSOLETE OR WILL ADAPT        return undefined
  // OBSOLETE OR WILL ADAPT    }
  // OBSOLETE OR WILL ADAPT  }
  // OBSOLETE OR WILL ADAPT  get initOriginMostLocal(): string | undefined {
  // OBSOLETE OR WILL ADAPT    if (this.initOrigins === undefined) return undefined
  // OBSOLETE OR WILL ADAPT    // OBSOLETE else return JSON.stringify([(JSON.parse(this.initOrigins))[0]])
  // OBSOLETE OR WILL ADAPT    else return this.initOrigins.split('\n')[0]
  // OBSOLETE OR WILL ADAPT  }
  // OBSOLETE OR WILL ADAPT  get initOriginMostGlobal(): string | undefined {
  // OBSOLETE OR WILL ADAPT    if (this.initOrigins === undefined) return undefined
  // OBSOLETE OR WILL ADAPT    // OBSOLETE else {
  // OBSOLETE OR WILL ADAPT    // OBSOLETE   const o = JSON.parse(this.initOrigins)
  // OBSOLETE OR WILL ADAPT    // OBSOLETE   return JSON.stringify([o[o.length-1]])
  // OBSOLETE OR WILL ADAPT    // OBSOLETE }
  // OBSOLETE OR WILL ADAPT    else {
  // OBSOLETE OR WILL ADAPT      const os = this.initOrigins.split('\n')
  // OBSOLETE OR WILL ADAPT      return os[os.length - 1]
  // OBSOLETE OR WILL ADAPT    }
  // OBSOLETE OR WILL ADAPT  }
  // OBSOLETE OR WILL ADAPT  get initAnyNonURLs(): string | undefined {
  // OBSOLETE OR WILL ADAPT    let result = 'false'
  // OBSOLETE OR WILL ADAPT    let u: URL
  // OBSOLETE OR WILL ADAPT    if (this.initOrigins !== undefined) {
  // OBSOLETE OR WILL ADAPT      for (let o of this.initOrigins.split('\n')) {
  // OBSOLETE OR WILL ADAPT        try { u = new URL(o) }
  // OBSOLETE OR WILL ADAPT        catch { result = 'true'; break }
  // OBSOLETE OR WILL ADAPT      }
  // OBSOLETE OR WILL ADAPT    }
  // OBSOLETE OR WILL ADAPT    if ((result !== 'true') && (this.initURLs !== undefined)) {
  // OBSOLETE OR WILL ADAPT      for (let ui of this.initURLs.split('\n')) {
  // OBSOLETE OR WILL ADAPT        try { u = new URL(ui) }
  // OBSOLETE OR WILL ADAPT        catch { result = 'true'; break }
  // OBSOLETE OR WILL ADAPT      }
  // OBSOLETE OR WILL ADAPT    }
  // OBSOLETE OR WILL ADAPT    return result.toString()
  // OBSOLETE OR WILL ADAPT  }

  // mongoPropName is name string to set to mongo for projection of query result
  // getter is function that takes document returned from mongo and references out the 
  //   thing that should get stored in cr[crPropNameToSet]
  async loadPropFromMongo(mongoPropName: string, getter: (mongoCR: ICRIFromMongo)=>any, cr: CR, crPropNameToSet: string) {
    if (this.parentApp === undefined) return
    // async fetch data from server
    try {
      //cl(`fetching full postData for mongoId ${this._id}`)
      const response: Response = await fetch(
      `http://${this.parentTTable?.parentDnDApp.server.host}:${this.parentTTable.parentDnDApp.server.port}/`
        +`?lowerIdFromClient=${this._id}`
        +`&upperIdFromClient=${this._id}`
        +`&projectionItems={"${mongoPropName}":1}`
        , {
          method: 'GET',
          headers: {
              'Accept': 'application/json'
        },
      })
      if (response.status < 200 || response.status >= 300) {
        const error: Error = new Error(`HTTP Error ${response.statusText}`);
        console.log(error, response.statusText);
        throw error;
      }
      // need to await because json() returns a promise
      // guessing json() needs to be asynchronous because
      // response may be a stream that cannot be resolved
      // until the full stream is received
      // i am vague on how this works at the moment
      const responseObject: TII = await response.json()



      runInAction(() => {
        //cl(`runInAction from loadPropToMongo`)
        //cl(`crPropNameToSet: ${crPropNameToSet}`)
        //cl(`mongoPropName: ${mongoPropName}`)
        //cl(`this._id: ${cr._id}`)
        //cl(`responseObject properties:`)
        //cl(Object.getOwnPropertyNames(responseObject[0]))

        // note: responseObject is an array of mongo documents
        // because that is what svr responds with
        // NOTE: responseObject will be an array
        cr[crPropNameToSet] = getter(responseObject[0])
        //cl(`received response for ${mongoPropName}`)
      })
    }

    // else dispatch load failed
    catch(reason) {
      //cl(`loadPropFromMongo catching error: ${reason}`)
      runInAction(() => {

      })
    }
  }
}


export class CRG extends TIHG {
  [index: string]: any
  kind: CRKindsG
  parentTTable: TTableCR

  children: CR[] = []

  get tiInfo(): string {
    let result: string = '' // = this.unsavedChanges ? '*' : ''
    // now we do this in CellContent if (this.level > 1) result += '   '.repeat(this.level-1) + '↳'
    result += this.kind
    if (this.group === 'yes') result += ` (${this.children.length})`
    return result
  }


  constructor(kind: CRKindsG, parentTTable: TTableCR) {
    super(kind, parentTTable, (parentTTable.isForPopup === true) ? crHierFlatPopup : crHierFlatFull)
    this.kind = kind
    this.parentTTable = parentTTable

    // build 'annotations' object, to be passed to makeObservable
    // could not just declare type as AnnotationsMap<CRG, never>, 
    // because we also want it to be [index: string]...
    const annotationMap: { [index: string]: Annotation } = { 
      tiInfo: computed({keepAlive: true}),
      // COMMENTING OUT BUT KEEP IN CASE WE GO BACK TO THIS ONE harToWebReqGMap: computed({keepAlive: true}),
      addDirectChild: override
    }
    
    // for each prop in mapPM... ,
    // define the property as a getter that uses computeGroupProp
    // call makeObservable to make it computed
    for (let p in mapPMViewerCR) {
      // only do this if prop is not already defined (e.g., tiInfo)
      if (this[p] === undefined) {
        Object.defineProperty(
          this,
          p,
          {
            configurable: true,  // allows mobx to delete this prop, to replace it with computed 
            enumerable: true,
            get: ()=>{return mapPMViewerCR[p].computeGroupProp(this, this.children, p)}
          }
        )
        annotationMap[p] = computed({keepAlive: true})
      }
    }  
    // it seems we need to force the type of the options object in this case
    makeObservable(this, annotationMap as AnnotationsMap<CRG, never>)
  }

  addDirectChild(newchild: CR) {
    super.addDirectChild(newchild)
    // OBSOLETE if ((this.kind === 'tabG') || (this.kind === 'runG')) this.expanded = true
    if (this.kind === 'tabG') this.expanded = true
    //if ((this.kind === 'tabG') ) this.expanded = true
  }

}









/*















*/
