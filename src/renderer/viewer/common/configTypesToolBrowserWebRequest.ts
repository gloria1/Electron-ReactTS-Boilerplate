

/*******************************************************************
 * 
 * 
 * 
 * 
 * 
 * THIS IS THE LEGACY CODE FOR WEBREQUEST BASED BROWSER CONTROL
 * 
 * 
 * 
 * 
 * 
 * 
 *******************************************************************/










// OBSOLETE  
// OBSOLETE  
// OBSOLETE  
// OBSOLETE  
// OBSOLETE  
// OBSOLETE  
// OBSOLETE  
// OBSOLETE  
// OBSOLETE  
// OBSOLETE  import { ConfigItemRaw, ConfigRuleBrowserWebRequest, ConfigRuleBrowserWebRequestJS, ConfigRuleBrowserWebRequestReqHdrMod, ConfigRuleBrowserWebRequestRequest, ConfigRuleBrowserWebRequestResHdrMod, ConfigRuleBrowserWebRequestBase, CRPropsToTestVsRuleBrowser, DecisionInfoBrowserJSWebRequest, DecisionInfoBrowserReqHdrModWebRequest, DecisionInfoBrowserRequestWebRequest, DecisionInfoBrowserResHdrModWebRequest, DecisionTypeBrowserWebRequest, Tool } from "./configTypesTypes"
// OBSOLETE  import { defaultActiveForTool, getCommaOrNewlineSeparatedList, getNewlineSeparatedList, isDomain, isRegexPattern, isValidHostDomainPatternForBrowser, isValidHostDomainPatternForBrowserWebRequest, isValidRequestMethod, isValidResourceType, isValidTabId, makeRegexPatternFromHostDomainStringForBrowser, regexHdrAPP, regexHdrModOpAndName, regexHdrREM, regexHdrSET, valItemAsAWhole } from "./configTypesUtility"
// OBSOLETE  
// OBSOLETE  
// OBSOLETE  
// OBSOLETE  const cl = console.log
// OBSOLETE  const ct = console.table
// OBSOLETE  
// OBSOLETE  
// OBSOLETE  
// OBSOLETE  export const tool_browser_webRequest: Tool<ConfigRuleBrowserWebRequest, CRPropsToTestVsRuleBrowser, DecisionTypeBrowserWebRequest, DecisionInfoBrowserRequestWebRequest | DecisionInfoBrowserJSWebRequest | DecisionInfoBrowserReqHdrModWebRequest | DecisionInfoBrowserResHdrModWebRequest> = {
// OBSOLETE      mask: 64,
// OBSOLETE      props: {
// OBSOLETE        // general
// OBSOLETE        modified:                       { val: p => true, active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_browser_webRequest') },
// OBSOLETE        timestamp:                       { val: p => true, active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_browser_webRequest') },
// OBSOLETE        tempItem:                       { val: p => true, active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_browser_webRequest') },
// OBSOLETE        expirationTime:                 { val: p => true, active: ()=>false },
// OBSOLETE        _id:                            { val: p => (/^[A-Za-z0-9-_\.\* ]+$/.test(p)), active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_browser_webRequest') },  // may want to allow other characters, but DO NOT allow \n, because this prop will be used to populate the 'configItemsThatAffected...' prop in CR, which will be a groupedAsList... prop where \n delimits multiple values
// OBSOLETE        notes:                          { val: p => (/['`"]/.test(p) === false), active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_browser_webRequest') },
// OBSOLETE        priority:                       { val: p => (/^[0-9]+$/.test(p)), active: (item: ConfigItemRaw) => {
// OBSOLETE          if (item.tempItem === true) return false
// OBSOLETE          else return defaultActiveForTool(item, 'tool_browser_webRequest') 
// OBSOLETE        }},
// OBSOLETE        // actions - for actions that do not apply to this tool, can tolerate any value
// OBSOLETE        requestAction:                  { val: p => (p === 'allow' || p === 'deny' || p === 'NA' ), active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_browser_webRequest') },
// OBSOLETE        jsAction:                       { val: p => (p === 'deny' || p === 'NA'  ), active: (item: ConfigItemRaw) => (item['tool_browser_webRequest'] && (item.requestAction !== 'deny')) },
// OBSOLETE        reqHdrAction:                   { val: p => (p === 'modify' || p === 'NA'  ), active: (item: ConfigItemRaw) => (item['tool_browser_webRequest'] && (item.requestAction !== 'deny')) },
// OBSOLETE        resHdrAction:                   { val: p => (p === 'modify' || p === 'NA'  ), active: (item: ConfigItemRaw) => (item['tool_browser_webRequest'] && (item.requestAction !== 'deny')) },
// OBSOLETE        sslbumpAction:                  { val: p => true, active: (item: ConfigItemRaw) => false },
// OBSOLETE        // hdrMods fields
// OBSOLETE        // request hdrMods can only set or remove, not append (per https://source.chromium.org/chromium/chromium/src/+/main:extensions/browser/api/declarative_net_request/indexed_rule.cc;l=495-497;drc=15a616c8043551a7cb22c4f73a88e83afb94631c)
// OBSOLETE        reqHdrMods:                     { 
// OBSOLETE          val: p => getNewlineSeparatedList(p, p=>((regexHdrREM.test(p) || regexHdrSET.test(p)                       ))) !== undefined, 
// OBSOLETE          active: (item: ConfigItemRaw) => ((item['tool_browser_webRequest']) && (item.reqHdrAction === 'modify')) 
// OBSOLETE        },
// OBSOLETE        resHdrMods:                     { 
// OBSOLETE          val: p => getNewlineSeparatedList(p, p=>((regexHdrREM.test(p) || regexHdrSET.test(p) || regexHdrAPP.test(p)))) !== undefined, 
// OBSOLETE          active: (item: ConfigItemRaw) => ((item['tool_browser_webRequest']) && (item.resHdrAction === 'modify')) 
// OBSOLETE        },
// OBSOLETE        // matching criteria - for criteria that do not apply to this tool, must be empty, or can allow a value that would ALWAYS make sense for this tool (e.g., lsdirection='outgoing' for browser)
// OBSOLETE        urlRegexPattern:                { val: p => isRegexPattern(p) , active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_browser_webRequest')},
// OBSOLETE        hostDomainPatterns:             { val: p => (getCommaOrNewlineSeparatedList(p, isValidHostDomainPatternForBrowserWebRequest) !== undefined), active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_browser_webRequest') },
// OBSOLETE        initiatorDomains:               { val: p => (p === '') ? true : isRegexPattern(p), active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_browser_webRequest') },
// OBSOLETE        excludedInitiatorDomains:       { val: p => (p === ''), active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_browser_webRequest') },
// OBSOLETE        excludedRequestDomains:         { val: p => (getCommaOrNewlineSeparatedList(p, isDomain) !== undefined), active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_browser_webRequest') },
// OBSOLETE        requestMethods:                 { val: p => (getCommaOrNewlineSeparatedList(p, isValidRequestMethod) !== undefined), active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_browser_webRequest') },
// OBSOLETE        excludedRequestMethods:         { val: p => (getCommaOrNewlineSeparatedList(p, isValidRequestMethod) !== undefined), active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_browser_webRequest') },
// OBSOLETE        resourceTypes:                  { val: p => (getCommaOrNewlineSeparatedList(p, isValidResourceType) !== undefined), active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_browser_webRequest') },
// OBSOLETE        excludedResourceTypes:          { val: p => (getCommaOrNewlineSeparatedList(p, isValidResourceType) !== undefined), active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_browser_webRequest') },
// OBSOLETE        tabIds:                         { val: p => (getCommaOrNewlineSeparatedList(p, isValidTabId) !== undefined), active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_browser_webRequest') },
// OBSOLETE        excludedTabIds:                 { val: p => (getCommaOrNewlineSeparatedList(p, isValidTabId) !== undefined), active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_browser_webRequest') },
// OBSOLETE        remoteAddresses:                { val: p => ( p === ''), active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_browser_webRequest') },
// OBSOLETE        lsprocess:                      { val: p => (p === ''), active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_browser_webRequest') },
// OBSOLETE        lsvia:                          { val: p => (p === ''), active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_browser_webRequest') },
// OBSOLETE        lsremote:                       { val: p => (p === 'any'), active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_browser_webRequest') },
// OBSOLETE        lsdirection:                    { val: p => (p === 'outgoing'), active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_browser_webRequest') },
// OBSOLETE        lsdisabled:                     { val: p => (p === false), active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_browser_webRequest') },
// OBSOLETE        lsports:                        { val: p => (p === ''), active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_browser_webRequest') },
// OBSOLETE        lsprotocol:                     { val: p => (p === 'any'), active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_browser_webRequest') }
// OBSOLETE      },
// OBSOLETE      valItemCrossProp: (item: {[index: string]: any}) => {
// OBSOLETE        // if not active for this tool, just return true - we do not validate against inactive tools
// OBSOLETE        if (item['tool_browser'] === false) return ''
// OBSOLETE        // must have at least one criterion prop (not clear whether declarativeNetRequest actually requires this, but even if dNR does not require it, I will, since I don't want a newly-added ConfigItem to be a valid rule that matches everything - rather I need to make a conscious choice to enter .* for domain, or something else)
// OBSOLETE        if ((item.urlRegexPattern === '')
// OBSOLETE              && (item.hostDomainPatterns === '')
// OBSOLETE              && (item.initiatorDomains === '')
// OBSOLETE              && (item.excludedInitiatorDomains === '')
// OBSOLETE              && (item.excludedRequestDomains === '')
// OBSOLETE              && (item.requestMethods === '')
// OBSOLETE              && (item.excludedRequestMethods === '')
// OBSOLETE              && (item.resourceTypes === '')
// OBSOLETE              && (item.excludedResourceTypes === '')
// OBSOLETE              && (item.tabIds === '')
// OBSOLETE              && (item.excludedTabIds === '')
// OBSOLETE        ) return 'must have at least one criterion'
// OBSOLETE        // there must be some action designated
// OBSOLETE        if ((item.requestAction === 'NA') && (item.jsAction === 'NA') && (item.reqHdrAction === 'NA') && (item.resHdrAction === 'NA')) return 'must have an action active'
// OBSOLETE        // if requestAction is 'deny', jsAction must be 'NA' (i.e., if intent of this item is to deny requests, do not want to have misleading jsAction setting that might suggest the item should also affect js)
// OBSOLETE        if ((item.requestAction === 'deny') && (item.jsAction !== 'NA')) return 'cannot have requestAction deny and JS action not NA'
// OBSOLETE        // can only have one of resourceTypes or excludedResourceTypes
// OBSOLETE        if ( (item.resourceTypes !== '') && (item.excludedResourceTypes !== '')) return 'cannot have both resourceTypes and excludedResourceTypes'
// OBSOLETE        // can only have one of requestMethods or excludedRequestMethods
// OBSOLETE        if ( (item.requestMethods !== '') && (item.excludedRequestMethods !== '')) return 'cannot have both requestMethods and excludedRequestMethods'
// OBSOLETE        // based on the doc, is IS allowed to have both tabIds and excludedTabIds, so we don't invalidate that
// OBSOLETE  
// OBSOLETE        else return ''
// OBSOLETE      },
// OBSOLETE      valItemAsAWhole: valItemAsAWhole,
// OBSOLETE      valAcrossItems: (items: ConfigItemRaw[]) => {
// OBSOLETE        // DOING THIS IN TTABLECONFIG NOW - THIS IS NOT A TOOL-SPECIFIC CHECK // check if any non-unique values in _id prop
// OBSOLETE        // DOING THIS IN TTABLECONFIG NOW - THIS IS NOT A TOOL-SPECIFIC CHECK const idset = new Set<string>()
// OBSOLETE        // DOING THIS IN TTABLECONFIG NOW - THIS IS NOT A TOOL-SPECIFIC CHECK for (let i of items) {
// OBSOLETE        // DOING THIS IN TTABLECONFIG NOW - THIS IS NOT A TOOL-SPECIFIC CHECK   if (idset.has(i._id)) return false
// OBSOLETE        // DOING THIS IN TTABLECONFIG NOW - THIS IS NOT A TOOL-SPECIFIC CHECK   else idset.add(i._id)
// OBSOLETE        // DOING THIS IN TTABLECONFIG NOW - THIS IS NOT A TOOL-SPECIFIC CHECK }
// OBSOLETE        return true
// OBSOLETE      },
// OBSOLETE  
// OBSOLETE      makeRulesFromConfigItem: (item: ConfigItemRaw, decisionType: DecisionTypeBrowserWebRequest) => {
// OBSOLETE        // does not validate item passed in - assumes that it is valid (we do check validity in makeRuleListFromConfigItems)
// OBSOLETE        // if item passed in had action for decisionType set to 'NA', just returns []
// OBSOLETE        // will generate separate rule for each entry in url/hostDomains
// OBSOLETE  
// OBSOLETE  
// OBSOLETE  
// OBSOLETE  // notes regarding hdrMods rules
// OBSOLETE  //    for now, generate one rule per config item with header mods
// OBSOLETE  //    dNR allows multiple mods to be specified in a single rule
// OBSOLETE  //
// OBSOLETE  //    also for now, will not validate or otherwise protect against the user entering
// OBSOLETE  //    multiple rules that can conflict with each other
// OBSOLETE  //    NOT CLEAR FROM DNR DOC what happens if two different rules with the SAME priority
// OBSOLETE  //    specify conflicting header mods - will it return an error if we try to load them?
// OBSOLETE  //    or will it apply them one after another (in which order?)
// OBSOLETE  //
// OBSOLETE  //    once we start using dNR for real we can test its behavior, and modify our practices
// OBSOLETE  //    above to be consistent with how it actually works
// OBSOLETE  
// OBSOLETE  
// OBSOLETE  
// OBSOLETE        // first, generate rule with props that will be common across all url/hostDomain instances
// OBSOLETE        // if item.*Action is 'NA' for this decisionType, return empty list
// OBSOLETE        let result: ConfigRuleBrowserWebRequest[] = []
// OBSOLETE        let commonRule: ConfigRuleBrowserWebRequest
// OBSOLETE        switch (decisionType) {
// OBSOLETE          case 'browser_webReq_request':
// OBSOLETE            if (item.requestAction === 'NA') return []
// OBSOLETE            else commonRule = {
// OBSOLETE              configItemId: item._id,
// OBSOLETE              configItemNotes: item.notes,
// OBSOLETE              tempRule: item.tempItem,
// OBSOLETE              decisionType: decisionType,
// OBSOLETE              requestAction: item.requestAction,
// OBSOLETE              priority: Number.parseInt(item.priority),
// OBSOLETE              hostnameScope: 'anyhost',   // the default value for this prop - below, if urlRegexPattern or hostDomainPattern is not '.*', will set to 'specific'
// OBSOLETE            }
// OBSOLETE            break
// OBSOLETE          case 'browser_webReq_js':
// OBSOLETE            if (item.jsAction === 'NA') return []
// OBSOLETE            else commonRule = {
// OBSOLETE              configItemId: item._id,
// OBSOLETE              configItemNotes: item.notes,
// OBSOLETE              tempRule: item.tempItem,
// OBSOLETE              decisionType: decisionType,
// OBSOLETE              jsAction: item.jsAction,
// OBSOLETE              priority: Number.parseInt(item.priority),
// OBSOLETE              hostnameScope: 'anyhost',   // the default value for this prop - below, if urlRegexPattern or hostDomainPattern is not '.*', will set to 'specific'
// OBSOLETE            }
// OBSOLETE            break
// OBSOLETE          case 'browser_webReq_reqHdrMod':
// OBSOLETE            if (item.reqHdrAction === 'NA') return []
// OBSOLETE            else commonRule = {
// OBSOLETE              configItemId: item._id,
// OBSOLETE              configItemNotes: item.notes,
// OBSOLETE              tempRule: item.tempItem,
// OBSOLETE              decisionType: decisionType,
// OBSOLETE              reqHdrAction: item.reqHdrAction,
// OBSOLETE              reqHdrMods: item.reqHdrMods,
// OBSOLETE              priority: Number.parseInt(item.priority),
// OBSOLETE              hostnameScope: 'anyhost',   // the default value for this prop - below, if urlRegexPattern or hostDomainPattern is not '.*', will set to 'specific'
// OBSOLETE            }
// OBSOLETE            break
// OBSOLETE          case 'browser_webReq_resHdrMod':
// OBSOLETE            if (item.resHdrAction === 'NA') return []
// OBSOLETE            else commonRule = {
// OBSOLETE              configItemId: item._id,
// OBSOLETE              configItemNotes: item.notes,
// OBSOLETE              tempRule: item.tempItem,
// OBSOLETE              decisionType: decisionType,
// OBSOLETE              resHdrAction: item.resHdrAction,
// OBSOLETE              resHdrMods: item.resHdrMods,
// OBSOLETE              priority: Number.parseInt(item.priority),
// OBSOLETE              hostnameScope: 'anyhost',   // the default value for this prop - below, if urlRegexPattern or hostDomainPattern is not '.*', will set to 'specific'
// OBSOLETE            }
// OBSOLETE            break
// OBSOLETE        } 
// OBSOLETE  
// OBSOLETE        // populate matching criteria other than hostDomain and url
// OBSOLETE        // NOTE - USING OBJECT.ASSIGN TO GET AROUND CLASS PROPS BEING READONLY
// OBSOLETE        if (item.initiatorDomains !== '')  Object.assign(commonRule, { initiatorRegex: new RegExp(item.initiatorDomains)})
// OBSOLETE        if (item.requestMethods !== '')         Object.assign(commonRule, { requestMethods         : item.requestMethods } )
// OBSOLETE        if (item.resourceTypes !== '')          Object.assign(commonRule, { resourceTypes          : item.resourceTypes } )
// OBSOLETE        if (item.tabIds !== '')                 Object.assign(commonRule, { tabIds                 : item.tabIds } )
// OBSOLETE        if (item.excludedRequestDomains !== '')        Object.assign(commonRule, { excludedDomains        : item.excludedRequestDomains } )
// OBSOLETE        if (item.excludedRequestMethods !== '') Object.assign(commonRule, { excludedRequestMethods : item.excludedRequestMethods } )
// OBSOLETE        if (item.excludedResourceTypes !== '')  Object.assign(commonRule, { excludedResourceTypes  : item.excludedResourceTypes } )
// OBSOLETE        if (item.excludedTabIds !== '')         Object.assign(commonRule, { excludedTabIds         : item.excludedTabIds } )
// OBSOLETE  
// OBSOLETE        // for hostDomainPatterns, multiple entries must be expanded into separate rule instances
// OBSOLETE        // and if there is a urlRegexPattern, that becomes a separate instance as well
// OBSOLETE        var madeRuleUsingUrlOrHostPattern: boolean = false
// OBSOLETE        if (item.urlRegexPattern !== undefined) {
// OBSOLETE            if (item.urlRegexPattern === '.*') {
// OBSOLETE              result.push(Object.assign({}, commonRule, { hostScope: 'anyhost', urlRegex: new RegExp(item.urlRegexPattern) }))
// OBSOLETE              madeRuleUsingUrlOrHostPattern = true
// OBSOLETE            }
// OBSOLETE            else if (item.urlRegexPattern !== '') { 
// OBSOLETE              result.push(Object.assign({}, commonRule, { hostScope: 'specific', urlRegex: new RegExp(item.urlRegexPattern) }))
// OBSOLETE              madeRuleUsingUrlOrHostPattern = true
// OBSOLETE            }
// OBSOLETE        }
// OBSOLETE        if ((item.hostDomainPatterns !== undefined) && (item.hostDomainPatterns !== '')) {
// OBSOLETE          // split on ', ', trim any additional whitespace
// OBSOLETE          const hs = getCommaOrNewlineSeparatedList(item.hostDomainPatterns)
// OBSOLETE          if (hs === undefined) throw new Error(`hostDomainPatterns does not parse correctly, but should have failed validation before this`)
// OBSOLETE          for (let h of hs) { 
// OBSOLETE            if (h === '.*') { 
// OBSOLETE              result.push(Object.assign({}, commonRule, { hostScope: 'anyhost', hostnameRegex: new RegExp(makeRegexPatternFromHostDomainStringForBrowser(h)) } ))
// OBSOLETE              madeRuleUsingUrlOrHostPattern = true
// OBSOLETE            } 
// OBSOLETE            else if (h !== '') { // disregard any items that are '' - this can happen after split.map.trim above if there was extra whitespace
// OBSOLETE              result.push(Object.assign({}, commonRule, { hostScope: 'specific', hostnameRegex: new RegExp(makeRegexPatternFromHostDomainStringForBrowser(h)) } ))
// OBSOLETE              madeRuleUsingUrlOrHostPattern = true
// OBSOLETE            } 
// OBSOLETE          }
// OBSOLETE        }
// OBSOLETE        if (madeRuleUsingUrlOrHostPattern === false) result.push(commonRule)
// OBSOLETE        return result
// OBSOLETE  
// OBSOLETE      },
// OBSOLETE      makeRuleListFromConfigItems: (items: ConfigItemRaw[], /* OBSOLETE host: string, */ decisionType: DecisionTypeBrowserWebRequest, tempNonTemp: 'temp' | 'nonTemp' | 'both') => {
// OBSOLETE  /*
// OBSOLETE        checks each config item for validity - returns undefined if any config item not valid
// OBSOLETE  			takes a 'host' argument - can be one host, or 'all'
// OBSOLETE  			always ignores config items that are not active for the tool
// OBSOLETE  			always ignores config items with no hosts that have that tool
// OBSOLETE  */
// OBSOLETE        const result: ConfigRuleBrowserWebRequest[] = []
// OBSOLETE  
// OBSOLETE        for (let i of items) {
// OBSOLETE          // skip if item tempItem not consistent with tempNonTemp argument
// OBSOLETE          if ((tempNonTemp === 'temp') && (i.tempItem === false)) continue
// OBSOLETE          if ((tempNonTemp === 'nonTemp') && (i.tempItem === true)) continue
// OBSOLETE          // skip if inactive, i.e. this tool is not selected for this rule
// OBSOLETE          if (i['tool_browser_webRequest'] === false) continue
// OBSOLETE          // skip if host is not 'all' or a selected host for this item
// OBSOLETE          // OBSOLETE if (host !== 'all') {
// OBSOLETE          // OBSOLETE   if (i[host] !== true) continue
// OBSOLETE          // OBSOLETE }
// OBSOLETE          // if item is invalid, return undefined
// OBSOLETE          if (tool_browser_webRequest.valItemAsAWhole(tool_browser_webRequest.props, tool_browser_webRequest.valItemCrossProp, i) === false) return undefined
// OBSOLETE          // if we got this far, make rules from this config item
// OBSOLETE          result.push(...(tool_browser_webRequest.makeRulesFromConfigItem(i, decisionType) as ConfigRuleBrowserWebRequest[]))
// OBSOLETE        }
// OBSOLETE        // sort rules in descending priority, so getDecision can stop searching list once it has found a match and it gets to lower-priority rules
// OBSOLETE        switch (decisionType) {
// OBSOLETE          case 'browser_webReq_request':
// OBSOLETE            (result as ConfigRuleBrowserWebRequestRequest[]).sort((a ,b)=>{   // return negative if a should be before b....
// OBSOLETE              if (a.priority > b.priority) return -1
// OBSOLETE              else if (a.priority < b.priority) return 1
// OBSOLETE              else {
// OBSOLETE                // other sorting for prioritization, after priority value
// OBSOLETE                // for requestAction, allow before block (not yet supporting other action types for declarativeNetRequest, such as redirect or allowAllRequests)
// OBSOLETE                  if ((a.requestAction === 'allow') && (b.requestAction === 'deny')) return -1
// OBSOLETE                  else if ((a.requestAction === 'deny') && (b.requestAction === 'allow')) return 1
// OBSOLETE                  else return 0
// OBSOLETE              }
// OBSOLETE            })
// OBSOLETE            break
// OBSOLETE          default:  // for all other decisionTypes, only need to sort by priority - the only action in rules will be 'modify' (config items with 'NA' as the action will not have generated a rule)
// OBSOLETE            (result as ConfigRuleBrowserWebRequest[]).sort((a,b) => {
// OBSOLETE              if (a.priority > b.priority) return -1
// OBSOLETE              else if (a.priority < b.priority) return 1
// OBSOLETE              else return 0
// OBSOLETE            })
// OBSOLETE            break
// OBSOLETE        }
// OBSOLETE        return result
// OBSOLETE      }, 
// OBSOLETE  
// OBSOLETE      doesRuleApplyToTI: (crProps: CRPropsToTestVsRuleBrowser, rule: ConfigRuleBrowserWebRequestBase) => {
// OBSOLETE  
// OBSOLETE        if (crProps.url === undefined) throw new Error(`getDecision was passed crProps with no URL - this should never happen`)
// OBSOLETE        var url: URL
// OBSOLETE        try {
// OBSOLETE          url = new URL(crProps.url)
// OBSOLETE        }
// OBSOLETE        catch {
// OBSOLETE          throw new Error(`getDecision URL object constructor failed on a url of: \n${crProps.url}`)
// OBSOLETE        }
// OBSOLETE  
// OBSOLETE  
// OBSOLETE        // first check exclusion criteria - if CR matches any exclusion criterion, return false
// OBSOLETE        // for excludedDomains, url.hostname needs to match entire domain provided
// OBSOLETE        // (not clear from doc whether it should also match sub-domains - assume not for now)
// OBSOLETE        if (rule.excludedDomains        !== undefined) if ((url.hostname !== '')         && (rule.excludedDomains       .includes(url.hostname))) return false
// OBSOLETE        // need to compare case-insensitive - values in decNetReq are lower case, but values that come from webRequest are uppercase
// OBSOLETE        if (rule.excludedRequestMethods !== undefined) if ((crProps.method !== '')       && (rule.excludedRequestMethods.includes(crProps.method.toLowerCase()))) return false
// OBSOLETE        if (rule.excludedResourceTypes  !== undefined) if ((crProps.resourceType !== '') && (rule.excludedResourceTypes .includes(crProps.resourceType))) return false
// OBSOLETE        // NOTE - next line does toString because in background script, when event handlers are making decisions, the tabId value passed in to this will be a number (as received from browser)
// OBSOLETE        if (rule.excludedTabIds         !== undefined) if ((crProps.tabId.toString() !== '')        && (rule.excludedTabIds        .includes(crProps.tabId.toString()))) return false
// OBSOLETE  
// OBSOLETE        // if requestMethods was specified, do not match if scheme is not HTTP/HTTPS
// OBSOLETE        // (scheme is called 'protocol' in URL object, and includes the ':')
// OBSOLETE        if (rule.requestMethods !== undefined) if ((url.protocol !== 'http:') && (url.protocol !== 'https:')) return false
// OBSOLETE  
// OBSOLETE        // then check affirmative criteria - if CR does NOT match any of those, return false
// OBSOLETE        // IF THERE ARE NO AFFIRMATIVE CRITERIA, THEN RETURN TRUE AT THIS POINT (SEE NOTES IN ONENOTE ON TOOL RULES AND MATCHING)
// OBSOLETE        if ((rule.hostnameRegex === undefined) && (rule.urlRegex === undefined) && (rule.initiatorRegex === undefined)
// OBSOLETE            && (rule.requestMethods === undefined) && (rule.resourceTypes === undefined) && (rule.tabIds === undefined)) return true
// OBSOLETE        // now test non-empty ones, and fail if does not match
// OBSOLETE        if (rule.initiatorRegex !== undefined) {
// OBSOLETE          if (crProps.initiator === undefined) return false
// OBSOLETE          else if (rule.initiatorRegex.test(crProps.initiator) === false) return false
// OBSOLETE        }
// OBSOLETE        if ((rule.urlRegex       !== undefined) && (rule.urlRegex.test(crProps.url)       === false)) return false
// OBSOLETE        if ((rule.hostnameRegex  !== undefined) && (rule.hostnameRegex.test(url.hostname) === false)) return false
// OBSOLETE        // note - for tests based on 'String.includes', need to also test for crProps value being '' - that should fail the match if the rule value is !== '', but .includes would return true
// OBSOLETE        if (rule.requestMethods !== undefined) if ((crProps.method === '')       || (rule.requestMethods.includes(crProps.method.toLowerCase()) === false)) return false
// OBSOLETE        if (rule.resourceTypes  !== undefined) if ((crProps.resourceType === '') || (rule.resourceTypes .includes(crProps.resourceType) === false)) return false
// OBSOLETE        // NOTE - next line does toString because in background script, when event handlers are making decisions, the tabId value passed in to this will be a number (as received from browser)
// OBSOLETE        if (rule.tabIds         !== undefined) if ((crProps.tabId.toString() === '')        || (rule.tabIds        .includes(crProps.tabId.toString()) === false)) return false
// OBSOLETE        return true // if we fall through to this else clause, return true
// OBSOLETE          // because no affirmative criteria failed to match
// OBSOLETE      },
// OBSOLETE      
// OBSOLETE      getDecision: (crProps: CRPropsToTestVsRuleBrowser, ruleList: ConfigRuleBrowserWebRequest[], decisionType: DecisionTypeBrowserWebRequest, minPriorityToTest: number) => {
// OBSOLETE  
// OBSOLETE        // NOTE - WILL NEED TO RETHINK EVERYTHING IF/WHEN WE SUPPORT DECLARATIVENETREQUEST ACTIONS OTHER THAN
// OBSOLETE        //    BLOCK
// OBSOLETE        //    ALLOW
// OBSOLETE        //    MODIFYHEADERS APPENDING SCRIPT-SRC 'NONE'
// OBSOLETE        // e.g., not sure how 'allowAllRequests' works in dNR, or how it could be mimic'ed in this code
// OBSOLETE        // e.g., for headers we only use one, script-src 'none', and it blanket overrides any other CSP, so we only need to check 
// OBSOLETE        //    if ANY rule matches and says block JS
// OBSOLETE        // however, those three are all we need to worry about right now
// OBSOLETE        // precedence if multiple rules match
// OBSOLETE        //      for 'requestAction' - sort by priority first, and allow overrides block within the same priority
// OBSOLETE        //      for 'jsAction' (uses modifyHeaders in dNR), dNR wil apply ALL matching rules with priority >= the action rule tha applied
// OBSOLETE        //         HOWEVER, because of the nature of script-src 'none', we only need to check whether ANY js block rule matches
// OBSOLETE        //           and return block if so
// OBSOLETE  
// OBSOLETE  
// OBSOLETE  // browser_js case will probably go away in the future (as we fold that rule/decision type into resHdrMod)
// OBSOLETE        let decision: DecisionInfoBrowserRequestWebRequest | DecisionInfoBrowserJSWebRequest | DecisionInfoBrowserReqHdrModWebRequest | DecisionInfoBrowserResHdrModWebRequest
// OBSOLETE        // state for hdr mod operation - keyed by header name, value is priority of rule that modified
// OBSOLETE        const headersSetOrAppended: { [index: string]: number } = {}
// OBSOLETE        const headersRemoved: { [index: string]: number } = {}
// OBSOLETE  
// OBSOLETE        switch (decisionType) {
// OBSOLETE          case 'browser_webReq_request':
// OBSOLETE            // default decision object - assign value to return if not tested and default action for tool is to be taken
// OBSOLETE            decision = {
// OBSOLETE              type: 'browser_webReq_request',
// OBSOLETE              wasTested: true,   // if we reached this point in tool flow, we will say transaction was tested
// OBSOLETE              result: 'allow',   // default policy for browser request
// OBSOLETE              ruleHostScopesThatAffected: undefined,
// OBSOLETE              configItemsThatAffected: undefined,
// OBSOLETE              minPriorityOfRuleThatWasTestedAndMatched: undefined
// OBSOLETE            }
// OBSOLETE  
// OBSOLETE            for (let r of (ruleList as ConfigRuleBrowserWebRequestRequest[])) {
// OBSOLETE              // can assume rule list is in decreasing priority order (by construction from makeRuleListFromConfigItems)
// OBSOLETE              if (r.requestAction === undefined) throw new Error(`getDecision for decisionType ${decisionType} was passed a rule without an action for it`)
// OBSOLETE              // stop checking rules if priority is less than min priority to consider
// OBSOLETE              if (r.priority < minPriorityToTest) break
// OBSOLETE  
// OBSOLETE              // differences between decisionTypes
// OBSOLETE              //   request - break out on first match - rules will have been sorted in proper order (by priority, then with allows before denies)
// OBSOLETE              if (tool_browser_webRequest.doesRuleApplyToTI(crProps, r)) {
// OBSOLETE                decision.minPriorityOfRuleThatWasTestedAndMatched = r.priority
// OBSOLETE                decision.result = r.requestAction
// OBSOLETE                decision.ruleHostScopesThatAffected = r.hostnameScope
// OBSOLETE                decision.configItemsThatAffected = r.configItemId + '\n'  // '\n' will be stripped off below
// OBSOLETE                break   // break out of loop - first rule that matches makes the decision
// OBSOLETE              }
// OBSOLETE            }
// OBSOLETE            break
// OBSOLETE          case 'browser_webReq_js':
// OBSOLETE            // default decision object - assign value to return if not tested and default action for tool is to be taken
// OBSOLETE            decision = {
// OBSOLETE              type: 'browser_webReq_js',
// OBSOLETE              wasTested: true,   // if we reached this point in tool flow, we will say transaction was tested
// OBSOLETE              result: 'allow',   // default policy for browser js
// OBSOLETE              ruleHostScopesThatAffected: undefined,
// OBSOLETE              configItemsThatAffected: undefined,
// OBSOLETE              minPriorityOfRuleThatWasTestedAndMatched: undefined
// OBSOLETE            }
// OBSOLETE  
// OBSOLETE            for (let r of (ruleList as ConfigRuleBrowserWebRequestJS[])) {
// OBSOLETE              // can assume rule list is in decreasing priority order (by construction from makeRuleListFromConfigItems)
// OBSOLETE              if (r.jsAction === undefined) throw new Error(`getDecision for decisionType ${decisionType} was passed a rule without an action for it`)
// OBSOLETE              // stop checking rules if priority is less than min priority to consider
// OBSOLETE              if (r.priority < minPriorityToTest) break
// OBSOLETE  
// OBSOLETE              // differences between decisionTypes
// OBSOLETE              //   js - do not break out on first match, but if decision was already set to deny, do not replace it
// OBSOLETE              if (tool_browser_webRequest.doesRuleApplyToTI(crProps, r)) {
// OBSOLETE                decision.minPriorityOfRuleThatWasTestedAndMatched = r.priority
// OBSOLETE                // update decision.resultFromTesting, 
// OBSOLETE                // when match multiple jsAction rules, an 'allow' cannot override a 'deny'
// OBSOLETE                // update resultFromTesting if it is not already set to 'deny' - for jsAction we will keep testing rules, but an 'allow' cannot override a 'deny'
// OBSOLETE                if (decision.result !== 'deny') decision.result = r.jsAction
// OBSOLETE                // only add to configItemsThatAffected if rule action is deny - 'allow' has no effect on a CR
// OBSOLETE                if (r.jsAction === 'deny') {
// OBSOLETE                  if (decision.ruleHostScopesThatAffected === undefined) decision.ruleHostScopesThatAffected = r.hostnameScope
// OBSOLETE                  else if (decision.ruleHostScopesThatAffected !== r.hostnameScope) decision.ruleHostScopesThatAffected = 'both'
// OBSOLETE                  decision.configItemsThatAffected = ((decision.configItemsThatAffected === undefined) ? '' : decision.configItemsThatAffected) + r.configItemId + '\n'
// OBSOLETE                }
// OBSOLETE              }
// OBSOLETE            }
// OBSOLETE            break
// OBSOLETE          case 'browser_webReq_reqHdrMod':
// OBSOLETE            // default decision object - assign value to return if not tested and default action for tool is to be taken
// OBSOLETE            decision = {
// OBSOLETE              type: 'browser_webReq_reqHdrMod',
// OBSOLETE              wasTested: true,   // if we reached this point in tool flow, we will say transaction was tested
// OBSOLETE              result: 'none',   // default policy for browser hdr mods
// OBSOLETE              reqHdrMods: undefined,
// OBSOLETE              ruleHostScopesThatAffected: undefined,
// OBSOLETE              configItemsThatAffected: undefined,
// OBSOLETE              minPriorityOfRuleThatWasTestedAndMatched: undefined
// OBSOLETE            }
// OBSOLETE  
// OBSOLETE            for (let r of (ruleList as ConfigRuleBrowserWebRequestReqHdrMod[])) {
// OBSOLETE              // can assume rule list is in decreasing priority order (by construction from makeRuleListFromConfigItems)
// OBSOLETE              if (r.reqHdrAction === undefined) throw new Error(`getDecision for decisionType ${decisionType} was passed a rule without an action for it`)
// OBSOLETE              // stop checking rules if priority is less than min priority to consider
// OBSOLETE              if (r.priority < minPriorityToTest) break
// OBSOLETE              if (r.reqHdrAction !== 'modify') break
// OBSOLETE  
// OBSOLETE              // differences between decisionTypes
// OBSOLETE              //   hdrMod - do not break out on first match, if multiple rules match, concatenate hdr mods
// OBSOLETE              if (tool_browser_webRequest.doesRuleApplyToTI(crProps, r)) {
// OBSOLETE                // split rule hdrMods into individual entries and handle them one by one
// OBSOLETE                const mods = getNewlineSeparatedList(r.reqHdrMods)  // no validator - we assume prop value was already validated by makeRules
// OBSOLETE                if (mods === undefined) continue
// OBSOLETE                for (let mod of mods) {
// OBSOLETE                  // break mod into parts
// OBSOLETE                  const modParts = regexHdrModOpAndName.exec(mod)
// OBSOLETE                  if (modParts === null) continue  // can happen if there is a comment in the mods
// OBSOLETE                  const [all, op, name] = modParts
// OBSOLETE                  // skip if this mod is prevented by another mod already applied at a higher priority
// OBSOLETE                  // if already set or appended, lower priority rules cannot set or remove
// OBSOLETE                  // if already removed, lower priority rules cannot set, remove or append
// OBSOLETE                  switch (op) {
// OBSOLETE                    case 'REM':
// OBSOLETE                      if (headersRemoved[name] > r.priority) continue
// OBSOLETE                      if (headersSetOrAppended[name] > r.priority) continue
// OBSOLETE                      headersRemoved[name] = r.priority
// OBSOLETE                      break
// OBSOLETE                    case 'SET':
// OBSOLETE                      if (headersRemoved[name] > r.priority) continue
// OBSOLETE                      if (headersSetOrAppended[name] > r.priority) continue
// OBSOLETE                      headersSetOrAppended[name] = r.priority
// OBSOLETE                      break
// OBSOLETE                    case 'APP':
// OBSOLETE                      if (headersRemoved[name] > r.priority) continue
// OBSOLETE                      headersSetOrAppended[name] = r.priority
// OBSOLETE                      break
// OBSOLETE                    default:
// OBSOLETE                      continue
// OBSOLETE                  }
// OBSOLETE                  // update decision for this mod
// OBSOLETE                  decision.minPriorityOfRuleThatWasTestedAndMatched = r.priority
// OBSOLETE                  decision.result = r.reqHdrAction
// OBSOLETE                  decision.reqHdrMods = ((decision.reqHdrMods === undefined) ? '' : decision.reqHdrMods) + mod + '\n'
// OBSOLETE                  if (decision.ruleHostScopesThatAffected === undefined) decision.ruleHostScopesThatAffected = r.hostnameScope
// OBSOLETE                  else if (decision.ruleHostScopesThatAffected !== r.hostnameScope) decision.ruleHostScopesThatAffected = 'both'
// OBSOLETE                  decision.configItemsThatAffected = ((decision.configItemsThatAffected === undefined) ? '' : decision.configItemsThatAffected) + r.configItemId + '\n'
// OBSOLETE                }
// OBSOLETE              }
// OBSOLETE            }
// OBSOLETE            // remove trailing \n from reqHdrMods
// OBSOLETE            if (decision.reqHdrMods !== undefined) decision.reqHdrMods = decision.reqHdrMods.slice(0, -1)
// OBSOLETE            break
// OBSOLETE          case 'browser_webReq_resHdrMod':
// OBSOLETE            // default decision object - assign value to return if not tested and default action for tool is to be taken
// OBSOLETE            decision = {
// OBSOLETE              type: 'browser_webReq_resHdrMod',
// OBSOLETE              wasTested: true,   // if we reached this point in tool flow, we will say transaction was tested
// OBSOLETE              result: 'none',   // default policy for browser hdr mods
// OBSOLETE              resHdrMods: undefined,
// OBSOLETE              ruleHostScopesThatAffected: undefined,
// OBSOLETE              configItemsThatAffected: undefined,
// OBSOLETE              minPriorityOfRuleThatWasTestedAndMatched: undefined
// OBSOLETE            }
// OBSOLETE  
// OBSOLETE            for (let r of (ruleList as ConfigRuleBrowserWebRequestResHdrMod[])) {
// OBSOLETE              // can assume rule list is in decreasing priority order (by construction from makeRuleListFromConfigItems)
// OBSOLETE              if (r.resHdrAction === undefined) throw new Error(`getDecision for decisionType ${decisionType} was passed a rule without an action for it`)
// OBSOLETE              // stop checking rules if priority is less than min priority to consider
// OBSOLETE              if (r.priority < minPriorityToTest) break
// OBSOLETE              if (r.resHdrAction !== 'modify') break
// OBSOLETE  
// OBSOLETE              // differences between decisionTypes
// OBSOLETE              //   hdrMod - do not break out on first match, if multiple rules match, concatenate hdr mods
// OBSOLETE              if (tool_browser_webRequest.doesRuleApplyToTI(crProps, r)) {
// OBSOLETE                // split rule hdrMods into individual entries and handle them one by one
// OBSOLETE                const mods = getNewlineSeparatedList(r.resHdrMods)  // no validator - we assume prop value was already validated by makeRules
// OBSOLETE                if (mods === undefined) continue
// OBSOLETE                for (let mod of mods) {
// OBSOLETE                  // break mod into parts
// OBSOLETE                  const modParts = regexHdrModOpAndName.exec(mod)
// OBSOLETE                  if (modParts === null) continue  // can happen if there is a comment in the mods
// OBSOLETE                  const [all, op, name] = modParts
// OBSOLETE                  // skip if this mod is prevented by another mod already applied at a higher priority
// OBSOLETE                  // if already set or appended, lower priority rules cannot set or remove
// OBSOLETE                  // if already removed, lower priority rules cannot set, remove or append
// OBSOLETE                  switch (op) {
// OBSOLETE                    case 'REM':
// OBSOLETE                      if (headersRemoved[name] > r.priority) continue
// OBSOLETE                      if (headersSetOrAppended[name] > r.priority) continue
// OBSOLETE                      headersRemoved[name] = r.priority
// OBSOLETE                      break
// OBSOLETE                    case 'SET':
// OBSOLETE                      if (headersRemoved[name] > r.priority) continue
// OBSOLETE                      if (headersSetOrAppended[name] > r.priority) continue
// OBSOLETE                      headersSetOrAppended[name] = r.priority
// OBSOLETE                      break
// OBSOLETE                    case 'APP':
// OBSOLETE                      if (headersRemoved[name] > r.priority) continue
// OBSOLETE                      headersSetOrAppended[name] = r.priority
// OBSOLETE                      break
// OBSOLETE                    default:
// OBSOLETE                      continue
// OBSOLETE                  }
// OBSOLETE                  // update decision for this mod
// OBSOLETE                  decision.minPriorityOfRuleThatWasTestedAndMatched = r.priority
// OBSOLETE                  decision.result = r.resHdrAction
// OBSOLETE                  decision.resHdrMods = ((decision.resHdrMods === undefined) ? '' : decision.resHdrMods) + mod + '\n'
// OBSOLETE                  if (decision.ruleHostScopesThatAffected === undefined) decision.ruleHostScopesThatAffected = r.hostnameScope
// OBSOLETE                  else if (decision.ruleHostScopesThatAffected !== r.hostnameScope) decision.ruleHostScopesThatAffected = 'both'
// OBSOLETE                  decision.configItemsThatAffected = ((decision.configItemsThatAffected === undefined) ? '' : decision.configItemsThatAffected) + r.configItemId + '\n'
// OBSOLETE                }
// OBSOLETE              }
// OBSOLETE            }
// OBSOLETE            // remove trailing \n from resHdrMods
// OBSOLETE            if (decision.resHdrMods !== undefined) decision.resHdrMods = decision.resHdrMods.slice(0, -1)
// OBSOLETE            break
// OBSOLETE        }
// OBSOLETE        // ... else remove trailing '\n'
// OBSOLETE        if (decision.configItemsThatAffected !== undefined) decision.configItemsThatAffected = decision.configItemsThatAffected.slice(0, -1)
// OBSOLETE        return decision
// OBSOLETE      }
// OBSOLETE  }
// OBSOLETE  