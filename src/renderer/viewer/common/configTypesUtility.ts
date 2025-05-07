

import md5 from 'md5'
import { ConfigItemRaw } from './configTypesTypes'

const cl = console.log
const ct = console.table





// REVISED TO MATCH ITEMS BASED ONLY ON _id PROP  (on 2022-08-07)
//   ==> this means that items can have the same _id but different values for other props and still be considered 'the same' 
//       for purposes of this function
//       this was done so that temp items can have their expiration times updated without having to create a new item
//       with a new id, necessitating an update to the pihole so that the pihole comment has the new id
//   ==> we may want to make another version of this function where matching requires all props to match
//       if we need that behavior for some other purpose

// ALSO REVISED TO DO REMOVAL BEFORE CHECKING WHETHER ADDEDITEMS ALREADY EXIST
// THIS WAS DONE SO THAT WE CAN REMOVE AND ADD AN ITEM WITH THE SAME ID IN ONE OPERATION
// (WHICH HAPPENS WHEN TEMP CONFIG SET IS UPDATED - THE REACTION IN TTABLECONFIG DOES NOT CALCULATE THE DIFF IN THE TEMP CONFIG SET,
// IT ONLY SAYS "REMOVE ALL TEMP ITEMS FROM TABLE, THEN ADD ALL THE TEMP ITEMS IN THE NEW SERVER STATE")

// adds and/or removes config items from list
// if (a) an addedItem already exists or (b) a removedItem does NOT exist, do nothing and return error
// options:
//    dontAddItemsHere - if specified and true, skips the actual adding of the items
//    addPosition - if specified, added items will be inserted at that index (or 0 if < 0, or end if > length after removals)
export function addRemoveConfigItemRaw(items: ConfigItemRaw[], addedItems: ConfigItemRaw[], removedItemIds: string[], options?: { addPosition?: number, dontAddItemsHere?: boolean }): string | undefined  {
    // remove items in removedItems
    const indicesToRemove: number[] = []
    const removedItems: ConfigItemRaw[] = []

    for (let removedItemId of removedItemIds) {
      const i = items.findIndex(itemFromItems => {
        // loop over prop names in tool_browser.props, since *Items passed in may be ConfigIs, which have other props from the ConfigI class and maybe mobx stuff
        return (itemFromItems._id == removedItemId) 
      })
      // return with error message if did not find one
      if (i === -1) return 'tried to remove config item but item was not in existing list'
      else {
        indicesToRemove.push(i)
        removedItems.push(items[i])
      }
    }
    // now remove the items
    // removes in reverse order, so that remaining indices are valid after splice operation
    indicesToRemove.sort((a,b)=>(a-b)).reverse().forEach(i => {
      //cl(`removing item id ${items[i]._id}`)
      items.splice(i, 1)
    })
    // add items in addedItems
    for (let addedItem of addedItems) {
      const i = items.findIndex(itemFromItems => {
        if (itemFromItems._id !== addedItem._id) return false // OBSOLETE for (let p in tool_browser.props) if (itemFromItems[p] !== addedItem[p]) return false
        return true
      })
      // send error message if matching item already exists
      if (i !== -1) {
        // if the add operation cannot be completed, restore any removed items
        for (let ri = 0; ri < indicesToRemove.length; ri++) {
          items.splice(indicesToRemove[ri], 0, removedItems[ri])
        }
        return 'tried to add temp config item but item was already in list'
      }
    }
    // if we got this far, no errors, so modify items and return undefined
    // only add addedItems here if dontAddItemsHere argument is true
    // test is !== true because argument is optional, so it could be undefined
    if (options?.dontAddItemsHere !== true) {
      if (options?.addPosition === undefined) items.unshift(...addedItems)
      else {
        var addPosition = Math.max(0, options.addPosition)
        addPosition = Math.min(options.addPosition, items.length)
        items.splice(addPosition, 0, ...addedItems)
      }
      //cl(`added item ids: ${addedItems.map(i => i._id).join(', ')}`)
    }
    return undefined
  }

  

// OBSOLETE export function calcSetIdFromItems(items: ConfigItemRaw[]): string {
// OBSOLETE   let s = items.map(i => i._id).join()
// OBSOLETE   return md5(s)
// OBSOLETE }
// OBSOLETE 
// OBSOLETE export function updateSetMD(set: ConfigSet, newNotes?: string) {
// OBSOLETE   let s = set.items.map(i => i._id).join()
// OBSOLETE   set.md.id = calcSetIdFromItems(set.items)
// OBSOLETE   set.md.timestamp = Date.now()
// OBSOLETE   if (newNotes !== undefined) set.md.notes = newNotes
// OBSOLETE }



// update a ConfigItemRaw that had been saved under a prior version of this code
// this is factored out of the TTableConfig class because we also need to call it in the background script
// SO FAR AT LEAST, these updates consist only of renaming existing props, or creating new ones
// therefore the only test we need to do for whether an update is needed is the 
// non-existence of the newer prop name or the existence of a no-longer-legal prop value
// MAYBE IN THE FUTURE we will need to institute some version numbering system to help
// determine whether or how a certain update needs to be done
// NOTE - NOW NEED TO DO Object.assign TO MODIFY PROPS ON AN EXISTING CONFIGITEMRAW
// NEED TO BE CAREFUL THAT OLD AND NEW PROP NAMES ARE CORRECT
export function configItemUpdates(item: ConfigItemRaw) {
    // create 'notes' prop on the item, in case it was loaded from a file prior to having a notes prop
    if (item.notes === undefined) Object.assign(item, {notes: ''} )
    // because we have added new props in ConfigItemInMongo, prior save files may be missing them
    // so, if we find them undefined here, set them to a value of ''
    for (let p of ['excludedDomains', 'requestMethods', 'excludedRequestMethods', 'resourceTypes', 
                        'excludedResourceTypes', 'tabIds', 'excludedTabIds']) {
      if (item[p] === undefined) item[p] = ''
    }
    // because we changed 'remoteHostDomainRegexPatterns' to 'hostDomainPatterns', update name of this prop if we load a file from before that change
    if (item.remoteHostDomainRegexPatterns !== undefined) {
      Object.assign(item, {hostDomainPatterns: item.remoteHostDomainRegexPatterns })
      delete item.remoteHostDomainRegexPatterns
    }
    // because we changed 'urlRegexPatterns' to 'urlRegexPattern' (singular), update name of this prop if we load a file from before that change
    if (item.urlRegexPatterns !== undefined) {
      Object.assign(item, {urlRegexPattern: item.urlRegexPatterns})
      delete item.urlRegexPatterns
    }
    // because we changed 'action' to 'requestAction', update name of this prop if we load a file from before that change
    if (item.action !== undefined) {
      Object.assign(item, {requestAction: item.action})
      delete item.action
    }
    // OBSOLETE - NO MORE HOST_ PROPS // because we changed host 'mba21' to 'desktop'
    // OBSOLETE - NO MORE HOST_ PROPS if (item.host_mba21 !== undefined) {
    // OBSOLETE - NO MORE HOST_ PROPS   item.host_desktop = item.host_mba21
    // OBSOLETE - NO MORE HOST_ PROPS   delete item.host_mba21
    // OBSOLETE - NO MORE HOST_ PROPS }
    // because we eliminated the idea of a js 'allow' rule - if we find any jsAction==='allow', change it to 'NA'
    if ((item.jsAction as string) === 'allow') Object.assign(item, {jsAction: 'NA'})
    // because we added the 'tempItem' prop
    if (item.tempItem === undefined) Object.assign(item, {tempItem: false})
    // because we added req|req header mod props
    if (item.reqHdrAction === undefined) Object.assign(item, {reqHdrAction: 'NA'})
    if (item.resHdrAction === undefined) Object.assign(item, {resHdrAction: 'NA'})
    if (item.reqHdrMods === undefined) Object.assign(item, {reqHdrMods: ''})
    if (item.resHdrMods === undefined) Object.assign(item, {resHdrMods: ''})


    // because we renamed excludedDomains to excludedRequestDomains
    if (item.excludedDomains !== undefined) {
        Object.assign(item, { excludedRequestDomains: item.excludedDomains })
        delete item.excludedDomains
      }
  
    // because we renamed initiatorRegexPattern to initiatorDomains
    if (item.initiatorRegexPattern !== undefined) {
        Object.assign(item, { initiatorDomains: item.initiatorRegexPattern })
        delete item.initiatorRegexPattern
      }

    // because we added excludedInitiatorDomains
    Object.assign(item, { excludedInitiatorDomains: '' })

    // because we no longer have host_*  props in config items
    for (let p of Object.getOwnPropertyNames(item)) { 
      if (p.slice(0, 5) === 'host_') delete item[p]
    }

    // for older config items with no 'modified' or 'timestamp' prop
    if (item.modified === undefined) item.modified = false
    if (item.timestamp === undefined) item.timestamp = 0


}
  
export function configSetUpdates(set: {[index: string]: any}): void {
  if (typeof set.md === 'object') {
    // update older MD object type - did not have 'modified' prop previously
    set.md.modified = false
  }
  if (typeof set.md === 'string') {
    // parse the previous string-formatted md into a SetMDObj
    var firstSpace = set.md.indexOf(" ", 0)
    if (firstSpace === -1) return undefined
    var secondSpace = set.md.indexOf(" ", firstSpace+1)
    if (secondSpace === -1) return undefined
    var thirdSpace = set.md.indexOf(" ", secondSpace+1)
    if (thirdSpace === -1) thirdSpace = set.md.length  // if did not find second space, notes are empty
    set.md = {
      id: set.md.slice(0, firstSpace),
      timestamp: Number.parseInt(set.md.slice(firstSpace+1, secondSpace)),
      modified: set.md.slice(secondSpace+1, thirdSpace) === 'modified',
      notes: set.md.slice(thirdSpace+1)
    }
  }

}

// default 'active' test for an individual prop for a specific tool - true if this tool is active on the config item
// requires a 'toolname' argument because this is referenced below inside each
// tool's props object, where it needs to be made tool-specific
export const defaultActiveForTool: (item: ConfigItemRaw, toolname: string)=> boolean = (item: ConfigItemRaw, toolname: string) => {
  return item[toolname]
}
  
export function valItemAsAWhole(
    props: {[index: string]: { val: (propValue: any) => boolean } },
    valItemCrossProp: (item: ConfigItemRaw ) => string,
    item: ConfigItemRaw
): boolean {
    // return false if any item individually is invalid
    for (let p in props) if ( ! props[p].val(item[p]) ) return false
    // return false if any cross-prop problems
    if ( valItemCrossProp(item) !== '') return false
    // if we get this far, whole item is valid
    return true
}
  
  
// returns a regex pattern that will match if the hostname part of the URL matches the 'domain' argument
// note: need to 'double escape' the .'s and ?, so that they become \. and \? in the regexp itself, so as to match literal '.' or '?' in the target rather than being treated as a 'match any' token
const regexPatternDomainInUrl = (domain: string) => `\/\/([a-zA-Z0-9-\\.]*\\.)*${domain}(\/|:|\\?|$)`
// returns a regex pattern that will match if the ENTIRE hostname part of the URL matches the 'hostname' argument
const regexPatternHostnameInUrl = (hostname: string) => `\/\/${hostname}(\/|:|\\?|$)`
// regex that will match a url string that includes only the hostname and possibly the scheme and/or port
// (note the additional ( ) enclosing capturing groups for scheme, hostname and port parts, so that regex.exec will extract those parts for us)
// regex return result array items will be:
//    0 = entire matched string
//    1 = scheme part including the ://
//    2 = hostname part
//    3 = first part of hostname
//    4 = port part, including the :
//    5 = the :
//    6 = port part, excluding the :
const regexURLWithSchemeHostPortOnly = /^(https?:\/\/)?(((?!-)[A-Za-z0-9-]{1,63}(?!-)\.)*([A-Za-z]{2,6}|localhost|test|example|invalid))((:)([0-9]+))*$/

// regex that will match a url that consists only of hostname, and optionally scheme - i.e., no port, path, no query, no hash, no user:password
const regexSchemeHostnameOnly = /^(https?:\/\/)?((?!-)[A-Za-z0-9-]{1,63}(?!-)\.)*([A-Za-z]{2,6}|localhost|test|example|invalid)$/

// regex pattern that matches if full string is a valid domain
  // see onenote page for official doc of URL syntax (per RFCs)

// NOTE THAT THE NOTES AND ACTUAL REGEX BELOW ARE SLIGHTLY INCONSISTENT WITH MY READING OF THE RFC
// BUT THAT IS OK FOR NOW, THIS IS JUST RESTRICTING WHAT I CAN ENTER AS A PATTERN,
// SO IT IT IS TOO RESTRICTIVE, OR NOT RESTRICTIVE ENOUGH, IT ONLY PREVENTS ME FROM INPUTTING A VALID VALUE
// IF I OBSERVE AN ACTUAL DOMAIN NAME FROM TRAFFIC THAT DOES NOT MEET THESE RULES, I CAN ADJUST THE REGEX
  // regex patterns derived from https://www.geeksforgeeks.org/how-to-validate-a-domain-name-using-regular-expression/
  // BUT WITH CHANGES TO REGEX PATTERN THEY GAVE TO MAKE IT WORK HERE (NOT SURE IF THEIRS WAS INTENDED FOR JAVASCRIPT)
  // valid characters are a-z, A-Z, 0-9, '-' (hyphen) and '.' (literal dot)
  // domain name should be between 1 and 63 characters
  // previously had restricted TLD to 2-6 characters, per above references, however, have found longer TLDs in actual traffic, e.g. the '.training' TLD    the top-level domain must be 2-6 characters and no '-', 
  // each label (text between dots) cannot start or end with '-'
  // for purpose of this validation, we will
  //    NOT allow leading or trailing dot
  // also allow final segment to be localhost|test|example|invalid, per RFC 2606
export const regexDomain = /^((?!-)[A-Za-z0-9-]{1,63}(?!-)\.)*([A-Za-z]{2,6}|localhost|test|example|invalid)$/
export const regexPortNumber = /^\d*$/
export const regexIPv4Address = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/  //   each element must be 25[0-5] | 2[0-4][0-9] | [01]?[0-9][0-9]?

// validation regexes we need for new scheme
//     regexDomain - one ore more domain segments
//     regexDomainWithLeadingWildcard - regexDomain plus an optional leading '.*', which
//        for lsnitch will be elided and the rest of the pattern treated as a 'remote-domains' item
export const regexDomainWithEscapedDots = /^(\\\.)?((?!-)[A-Za-z0-9-]{1,63}(?!-)\.)*([A-Za-z]{2,}|localhost|test|example|invalid)$/

// for validating each kind of header mod entry
export const regexHdrREM            = /^(REM) ([!#$%&'\*+-\.\^_`\|~\w\d]+)$/
export const regexHdrSET            = /^(SET) ([!#$%&'\*+-\.\^_`\|~\w\d]+): ([ \t!-~]+)$/
export const regexHdrAPP            =       /^(APP) ([!#$%&'\*+-\.\^_`\|~\w\d]+): ([ \t!-~]+)$/
// for getting op and name from header mod entry
export const regexHdrModOpAndName = /^(REM|SET|APP) ([!#$%&'\*+-\.\^_`\|~\w\d]+)(: ([ \t!-~]+))?$/




// per declarativeNetRequest
// in dNR API, these are typescript enums
// but we will manage as simple strings in this app
//  ==> NEED TO ENSURE THE LIST HERE IS CHARACTER-FOR-CHARACTER IDENTICAL TO DNR ENUMS
export const dNRRequestMethodStrings: string[] = [
  'connect',
  'delete',
  'get',
  'head',
  'options',
  'patch',
  'post',
  'put'
]
export const dNRResourceTypeStrings = [
  'main_frame',
  'sub_frame',
  'stylesheet',
  'script',
  'image',
  'font',
  'object',
  'xmlhttprequest',
  'ping',
  'csp_report', 
  'media',
  'websocket',
  'webtransport',
  'other'
]

// valid 'resourceType' entries for browser (per declarativeNetRequest)
export function isValidResourceType(p: string): boolean {
    if (p === '<any>') return true   // this is valid in a ConfigItem - will be translated to array of all valid types for a rule
     return dNRResourceTypeStrings.includes(p)
  }
  
export function isValidRequestMethod(p: string): boolean {
  return dNRRequestMethodStrings.includes(p)
}
  
export function isValidTabId(p: string): boolean {
  return (/^-?[0-9]+$/.test(p))
}

export function isDomain(h: string): boolean {
  if (h === '') return true
  return regexDomain.test(h)
}

export function isDomainWithOptionalLeadingDot(h: string): boolean {
  if (h === '') return true
  if (h[0] === '.') return regexDomain.test(h.slice(1))
  return regexDomain.test(h)
}

export function isDomainWithRequiredLeadingDot(h: string): boolean {
  if (h === '') return true
  if (h[0] === '.') return regexDomain.test(h.slice(1))
  return false
}

export function isRegexPattern(p: string): boolean {
  try {
    const r = new RegExp(p)
    return true
  }
  catch {
    return false
  }
}


// checks that pattern is suitable as regex pattern with ;invert pattern for browser
//  (1) cannot contain ^ anchor
//  (2) cannot contain variable-length tokens:  *, ?, + or {.*,.*}
export function isValidInvertableRegexPatternForBrowser(h: string): boolean {
  if (/(\^|\*|\?|\+|{.*,.*})/.test(h)) return false
  if (h.slice(-1) !== '$') return false
  else return isRegexPattern(h)
}


// validation functions for hostDomainPattern items
// allowable forms:
//    browser | pihole | lsnitch  domain
//              pihole            domain;invert
//    browser | pihole | lsnitch  .domain
//              pihole            .domain;invert
//    browser | pihole            regex
//              pihole            regex;invert any pattern
//              pihole            regex;invert suitable for browser (no ^ or variable length quantifiers)
// variation for browser (dNR) [excluded]initiator/requestDomains props
//     only leading-dot domain patterns allowed (since dNR always matches subdomains for these criteria)


// val functions needed for dNR
//     isValidHostDomainPattern - domain, .domain, or regex (no inversion)
//     isValidPlainDomainPattern - .domain only


export function isValidHostDomainPatternForBrowser(h: string): boolean {
  // validates as allowable domain pattern for dNR
  //    do not allow invert patterns
  //    must have leading dot, since dNR domain patterns always match subdomains
  if (h.includes(';invert')) return false
  return (isDomainWithOptionalLeadingDot(h) || isRegexPattern(h))
}

export function isValidPlainDomainPatternForBrowser(h: string): boolean {
  return isDomainWithRequiredLeadingDot(h)
}


export function isValidHostDomainPatternForBrowserWebRequest(h: string): boolean {
  if (/;invert$/.test(h)) {
    const h2 = h.slice(0, -7)
    return (isDomainWithOptionalLeadingDot(h2) || isValidInvertableRegexPatternForBrowser(h2))
  }
  else return (isDomainWithOptionalLeadingDot(h) || isRegexPattern(h))
}

export function isValidHostDomainPatternForPihole(h: string): boolean {
  const h2 = (/;invert$/.test(h)) ? h.slice(0, -7) : h
  return (isDomainWithOptionalLeadingDot(h2) || isRegexPattern(h2))
}

export function isValidHostDomainPatternForLSnitch(h: string): boolean {
  return isDomainWithOptionalLeadingDot(h)  // regex forms not allowed, invert not allowed
}

export function isValidHostDomainPatternForSquid(h: string): boolean {
  return (isDomainWithOptionalLeadingDot(h) || isRegexPattern(h))   // invert not allowed
}




// generates regex pattern string for pihole from a string in hostDomainPatterns prop
// 1) if valid as full domain name, make regex pattern that will only match the full domain exactly   (replaces any . in argument with literal dot \.)
// 2) if valid as domain name, plus has a leading dot, make regex pattern that will also match sub-domains  (replaces any . in argument with literal dot \.)
// 3) else return argument as-is - it will be treated as a regex pattern
// 4) if ;invert present at end of argument, create pattern as above and append ;invert at the end
export function makeRegexPatternFromHostDomainStringForPihole(hostDomain: string): string {
  const inversion = /;invert$/.test(hostDomain)
  const patternFromRuleProp = inversion ? hostDomain.slice(0, -7) : hostDomain
  let resultRegexPatternString: string

// NOTE - IF WE CHANGE THIS LOGIC, NEED TO ALSO CHANGE configTypesPihole.parsePHLogLineRaw LOGIC FOR 
//   COMPUTING MATCH TYPES FROM DECISIONS

  // patternFromRuleProp will contain '.' between domain name parts
  // need to replace with \. for regex pattern, so we use '\\.' in string literals, which become \. in the actual string value
  if (isDomainWithOptionalLeadingDot(patternFromRuleProp)) {
    if (patternFromRuleProp.slice(0, 1) === '.') resultRegexPatternString = '(\\.|^)' + patternFromRuleProp.slice(1).replace(/\./g, '\\.') + '$'
    else                                         resultRegexPatternString =      '^'  + patternFromRuleProp         .replace(/\./g, '\\.') + '$'
  }

// NOTE - IF WE CHANGE THIS LOGIC, NEED TO ALSO CHANGE table items PH2 LOGIC FOR 
//   COMPUTING MATCH TYPES FROM DECISIONS

  // else just take h as the regex pattern directly
  else resultRegexPatternString = patternFromRuleProp
  return resultRegexPatternString + (inversion ? ';invert' : '')
}

// for testing a pihole pattern to determine which type it is
export const regexPHPatternIncludesInvert = /.*;invert$/
export const regexPHPatternDomainExact = /\^([a-zA-Z0-9-\\\.]+)\$/
export const regexPHPatternDomainWithLeadingDot = /\(\\\.\|\^\)([a-zA-Z0-9-\\\.]+)\$/

// testing code - can delete   const dp = '.meetcarrot.com'
// testing code - can delete   const drp = makeRegexPatternFromHostDomainStringForPihole(dp)
// testing code - can delete   cl(`dp: ${dp}`)
// testing code - can delete   cl(`drp: ${drp}`)
// testing code - can delete   cl(`regexPHPatternDomainExact:`)
// testing code - can delete   cl(regexPHPatternDomainExact)
// testing code - can delete   cl(`   matches drp: ${regexPHPatternDomainExact.test(drp)}`)
// testing code - can delete   cl(`regexPHPatternDomainWithLeadingDot:`)
// testing code - can delete   cl(regexPHPatternDomainWithLeadingDot)
// testing code - can delete   cl(`   matches drp: ${regexPHPatternDomainWithLeadingDot.test(drp)}`)

// MAYBE ALL OBSOLETE?  WE JUST EMBEDDED THIS LOGIC IN ...getDecision    // ASSUMES THAT 'pattern' passed in was craeted by makeRegexPattern...Pihole above
// MAYBE ALL OBSOLETE?  WE JUST EMBEDDED THIS LOGIC IN ...getDecision    // IGNORES ';invert' - STRIPS IT OFF pattern IF PRESENT
// MAYBE ALL OBSOLETE?  WE JUST EMBEDDED THIS LOGIC IN ...getDecision    // returns
// MAYBE ALL OBSOLETE?  WE JUST EMBEDDED THIS LOGIC IN ...getDecision    //    'none' if domain does not match pattern
// MAYBE ALL OBSOLETE?  WE JUST EMBEDDED THIS LOGIC IN ...getDecision    //    'exact' if matches and pattern is an exact domain 
// MAYBE ALL OBSOLETE?  WE JUST EMBEDDED THIS LOGIC IN ...getDecision    //    'other' otherwise (i.e., it did match, but pattern is not an exact domain)
// MAYBE ALL OBSOLETE?  WE JUST EMBEDDED THIS LOGIC IN ...getDecision    export function getPHPatternMatchType(domain: string, pattern: string): PHPatternMatchType {
// MAYBE ALL OBSOLETE?  WE JUST EMBEDDED THIS LOGIC IN ...getDecision    
// MAYBE ALL OBSOLETE?  WE JUST EMBEDDED THIS LOGIC IN ...getDecision    
// MAYBE ALL OBSOLETE?  WE JUST EMBEDDED THIS LOGIC IN ...getDecision    // just move this logic into getDecision, it should not be called from anywhere else
// MAYBE ALL OBSOLETE?  WE JUST EMBEDDED THIS LOGIC IN ...getDecision    // we want to be able to assume that pattern did apply to domain (based on doesRuleApplyToTI)
// MAYBE ALL OBSOLETE?  WE JUST EMBEDDED THIS LOGIC IN ...getDecision    
// MAYBE ALL OBSOLETE?  WE JUST EMBEDDED THIS LOGIC IN ...getDecision    // NEVER WANT TO RETURN 'none' - ('none' will be populated by getDecision if no rule matches)
// MAYBE ALL OBSOLETE?  WE JUST EMBEDDED THIS LOGIC IN ...getDecision    
// MAYBE ALL OBSOLETE?  WE JUST EMBEDDED THIS LOGIC IN ...getDecision    
// MAYBE ALL OBSOLETE?  WE JUST EMBEDDED THIS LOGIC IN ...getDecision      if (regexPHPatternIncludesInvert.test(pattern)) pattern = pattern.slice(0, pattern.length -7)
// MAYBE ALL OBSOLETE?  WE JUST EMBEDDED THIS LOGIC IN ...getDecision      //cl(`  getMatch... regexp from pattern: ${new RegExp(pattern)}`)
// MAYBE ALL OBSOLETE?  WE JUST EMBEDDED THIS LOGIC IN ...getDecision      if ((new RegExp(pattern)).test(domain) === false) return 'none'
// MAYBE ALL OBSOLETE?  WE JUST EMBEDDED THIS LOGIC IN ...getDecision      else if (regexPHPatternDomainExact.test(pattern)) return 'exact'
// MAYBE ALL OBSOLETE?  WE JUST EMBEDDED THIS LOGIC IN ...getDecision      else return 'other'
// MAYBE ALL OBSOLETE?  WE JUST EMBEDDED THIS LOGIC IN ...getDecision    }
// MAYBE ALL OBSOLETE?  WE JUST EMBEDDED THIS LOGIC IN ...getDecision    
// MAYBE ALL OBSOLETE?  WE JUST EMBEDDED THIS LOGIC IN ...getDecision    // TO TEST ABOVE WITH SOME TOP-LEVEL TEST LINES IN SCRIPT
// MAYBE ALL OBSOLETE?  WE JUST EMBEDDED THIS LOGIC IN ...getDecision    // var d = 'test.com'
// MAYBE ALL OBSOLETE?  WE JUST EMBEDDED THIS LOGIC IN ...getDecision    // var p: string | undefined = '(\\.|^)test\\.com$'
// MAYBE ALL OBSOLETE?  WE JUST EMBEDDED THIS LOGIC IN ...getDecision    // cl(`get match type for domain "${d}" vs pattern "${p}" - ${getPHPatternMatchType(d, p)}`)
// MAYBE ALL OBSOLETE?  WE JUST EMBEDDED THIS LOGIC IN ...getDecision    // d = 'test.com'
// MAYBE ALL OBSOLETE?  WE JUST EMBEDDED THIS LOGIC IN ...getDecision    // p = '^test\\.com$'
// MAYBE ALL OBSOLETE?  WE JUST EMBEDDED THIS LOGIC IN ...getDecision    // cl(`get match type for domain "${d}" vs pattern "${p}" - ${getPHPatternMatchType(d, p)}`)
// MAYBE ALL OBSOLETE?  WE JUST EMBEDDED THIS LOGIC IN ...getDecision    // d = 'test.com'
// MAYBE ALL OBSOLETE?  WE JUST EMBEDDED THIS LOGIC IN ...getDecision    // p = '(\\.|^)test\\.com$;invert'
// MAYBE ALL OBSOLETE?  WE JUST EMBEDDED THIS LOGIC IN ...getDecision    // cl(`get match type for domain "${d}" vs pattern "${p}" - ${getPHPatternMatchType(d, p)}`)
// MAYBE ALL OBSOLETE?  WE JUST EMBEDDED THIS LOGIC IN ...getDecision    // d = 'test.com'
// MAYBE ALL OBSOLETE?  WE JUST EMBEDDED THIS LOGIC IN ...getDecision    // p = '^test\\.com$;invert'
// MAYBE ALL OBSOLETE?  WE JUST EMBEDDED THIS LOGIC IN ...getDecision    // cl(`get match type for domain "${d}" vs pattern "${p}" - ${getPHPatternMatchType(d, p)}`)
// MAYBE ALL OBSOLETE?  WE JUST EMBEDDED THIS LOGIC IN ...getDecision    // d = 'test.com'
// MAYBE ALL OBSOLETE?  WE JUST EMBEDDED THIS LOGIC IN ...getDecision    // p = 'blah\\.*$%^'
// MAYBE ALL OBSOLETE?  WE JUST EMBEDDED THIS LOGIC IN ...getDecision    // cl(`get match type for domain "${d}" vs pattern "${p}" - ${getPHPatternMatchType(d, p)}`)



// generates regex pattern string for browser from a string in hostDomainPatterns prop
// 1) if valid as full domain name, make regex pattern that will only match the full domain exactly  (replaces any . in argument with literal dot \.)
// 2) if valid as domain name, plus has a leading dot, make regex pattern that will also match sub-domains  (replaces any . in argument with literal dot \.)
// 3) else return argument as-is - it will be treated as a regex pattern
// 4) if ;invert present at end of argument, create pattern as above and append ;invert at the end
export function makeRegexPatternFromHostDomainStringForBrowser(hostDomain: string): string {


/*
MAKE WEBREQUEST VERSION WITH LEGACY CODE 

DNR VERSION SHOULD 
    NOT DO INVERT 
    RETURN EITHER A REGEX PATTERN OR PLAIN STRING TO BE USED IN REQUESTDOMAINS 
    REGEX PATTERN SHOULD BE WRAPPED TO ONLY MATCH HOSTNAME PART OF URL  
    REGEX PATTERN SHOULD BE SET OT MATCH **WHOLE** HOSTNAME

*/

  const inversion = /;invert$/.test(hostDomain)
  const pattern = inversion ? hostDomain.slice(0, -7) : hostDomain
  let result: string
  if (inversion === false) {
    if (isDomainWithOptionalLeadingDot(pattern)) {
      if (pattern.slice(0, 1) === '.') result = '(\\.|^)' + pattern.slice(1).replace(/\./g, '\\.') + '$'
      else                             result =      '^'  + pattern         .replace(/\./g, '\\.') + '$'
    }
    else result = hostDomain
  }
  else {
    if (isDomainWithOptionalLeadingDot(pattern)) {
      if (pattern.slice(0, 1) !== '.') result = '^.*(?<!^' + pattern.replace(/\./g, '\\.') + ')$'
      else                             result =  '.*(?<!'  + pattern.replace(/\./g, '\\.') + ')$'
    }
    else {
                                      result =   '.*(?<!'  + pattern                        + ')$'
    }
  }
  return result
}


export function isPortNumber(i: string): boolean {
  if (i === '') return true
  return regexPortNumber.test(i)
}

export function isPortNumberRange(i: string): boolean {
  // returns true if
  //    i is port-port
  if (i === '') return true
  const parts = i.split('-')
  if ((parts.length !== 2) || (parts[0].length === 0) || (parts[1].length === 0)) return false
  if ( ! isPortNumber(parts[0])) return false
  if ( ! isPortNumber(parts[1])) return false
  // parts1 must be > parts0
  if (Number.parseInt(parts[0]) >= Number.parseInt(parts[1])) return false
  return true
}

export function isPortNumberOrRange(i: string): boolean {
  if (i === '') return true
  return isPortNumber(i) || isPortNumberRange(i)
}

export function isIPv4Address(i: string): boolean {
  // returns true if
  //   i is a single ipv4 address
  if (i === '') return true
  return regexIPv4Address.test(i)
}

export function isIPv4AddressCIDR(i: string): boolean {
  // returns true if
  //    i is a valid CIDR range = ipv4/number from 0-31
  if (i === '') return true
  const parts = i.split('/')
  if (parts.length !== 2) return false
  else if (isIPv4Address(parts[0]) === false) return false
  else return /^(3[0-2]|[0-2]?[0-9])$/.test(parts[1])
  
}

export function isIPv4AddressRange(i: string): boolean {
  // returns true if
  //    i is ipv4-ipv4
  if (i === '') return true
  const parts = i.split('-')
  if ((parts.length !== 2) || (parts[0].length === 0) || (parts[1].length === 0)) return false
  if ( ! isIPv4Address(parts[0])) return false
  if ( ! isIPv4Address(parts[1])) return false
  // parts1 needs to be > parts 0
  const parts0 = parts[0].split('.')
  const parts1 = parts[1].split('.')
  for (let i = 0; i < 4; i++) if (Number.parseInt(parts0[i]) > Number.parseInt(parts1[i])) return false
  return true
}

export function isIPv4AddressCIDROrRange(i: string): boolean {
  if (i === '') return true
  return isIPv4Address(i) || isIPv4AddressCIDR(i) || isIPv4AddressRange(i)
}

// splits on '\n', then on ',' within each line
// removes lines beginning with '#' (these are comments)
// trims whitespace (any one or multiple ' ' on ends of each item)
// if 'val' argument provided, tests each part using that validation function
// returns array of parts if valid
// returns undefined if not valid
export function getCommaOrNewlineSeparatedList(s:string, val?: (p: string)=>boolean): string[] | undefined {
  if (s === '') return []
  // NOTE .trim also removes \n's as part of whitespace on beginning/end of strings
  // the .filter removes any items that are empty or begin with # - latter are comments so ignore them

  // first split on \n, and remove any lines that start with #
  const parts = s.split('\n').filter(i => ((i.length >0) && (i[0] !== '#')))

  // now split each part on ','
  const parts2: string[] = []
  for (let p of parts) parts2.push(...p.split(','))
  // now trim each one and eliminate any empty values (if there is a ',' at the end of a line, it produces a '' in the last split result)
  const parts3 = parts2.map(p2 => p2.trim()).filter(i => (i.length > 0))

  for (let i of parts3) {
    if ( (val !== undefined) && (! val(i)) ) return undefined
    if (i.includes('\n')) return undefined
  }
  return parts3
}
// same as above, except \n is the only separator
export function getNewlineSeparatedList(s:string, val?: (p: string)=>boolean): string[] | undefined {
  if (s === '') return []
  // NOTE .trim also removes \n's as part of whitespace on beginning/end of strings
  // the .filter removes any items that are empty or begin with # - latter are comments so ignore them

  // first split on \n, and remove any lines that start with #
  const parts = s.split('\n').filter(i => ((i.length >0) && (i[0] !== '#')))

  // now trim each one and eliminate any empty values (if there is a ',' at the end of a line, it produces a '' in the last split result)
  const parts3 = parts.map(p => p.trim()).filter(i => (i.length > 0))

  for (let i of parts3) {
    if ( (val !== undefined) && (! val(i)) ) return undefined
    if (i.includes('\n')) return undefined
  }
  return parts3
}
  