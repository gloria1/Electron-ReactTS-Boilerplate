import { setgroups } from "process"
import { ConfigItemRaw, ConfigRuleBrowserDNR, CRPropsToTestVsRuleBrowser, DecisionInfoBrowser, DecisionTypeBrowser, Tool } from "./configTypesTypes"
import { defaultActiveForTool, dNRResourceTypeStrings, getCommaOrNewlineSeparatedList, getNewlineSeparatedList, isDomain, isDomainWithRequiredLeadingDot, isRegexPattern, isValidHostDomainPatternForBrowser, isValidPlainDomainPatternForBrowser, isValidRequestMethod, isValidResourceType, isValidTabId, makeRegexPatternFromHostDomainStringForBrowser, regexHdrAPP, regexHdrModOpAndName, regexHdrREM, regexHdrSET, valItemAsAWhole } from "./configTypesUtility"



const cl = console.log
const ct = console.table



export const tool_browser: Tool<ConfigRuleBrowserDNR, CRPropsToTestVsRuleBrowser, DecisionTypeBrowser, DecisionInfoBrowser> = {
    mask: 4,
    props: {
      // general
      modified:                       { val: p => true, active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_browser') },
      timestamp:                       { val: p => true, active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_browser') },
      tempItem:                       { val: p => true, active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_browser') },
      expirationTime:                 { val: p => true, active: ()=>false },
      _id:                            { val: p => (/^[A-Za-z0-9-_\.\* ]+$/.test(p)), active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_browser') },  // may want to allow other characters, but DO NOT allow \n, because this prop will be used to populate the 'configItemsThatAffected...' prop in CR, which will be a groupedAsList... prop where \n delimits multiple values
      notes:                          { val: p => (/['`"]/.test(p) === false), active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_browser') },
      // priority in config item must be multiple of 10 - hdr mod dNR rules will get input priority + 1
      priority:                       { val: p => (/^[0-9]+0$/.test(p)), active: (item: ConfigItemRaw) => {
        if (item.tempItem === true) return false
        else return defaultActiveForTool(item, 'tool_browser') 
      }},
      // actions - for actions that do not apply to this tool, can tolerate any value
      requestAction:                  { val: p => (p === 'allow' || p === 'deny' || p === 'NA' ), active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_browser') },
      jsAction:                       { val: p => (p === 'deny' || p === 'NA'  ), active: (item: ConfigItemRaw) => (item['tool_browser'] && (item.requestAction !== 'deny')) },
      reqHdrAction:                   { val: p => (p === 'modify' || p === 'NA'  ), active: (item: ConfigItemRaw) => (item['tool_browser'] && (item.requestAction !== 'deny')) },
      resHdrAction:                   { val: p => (p === 'modify' || p === 'NA'  ), active: (item: ConfigItemRaw) => (item['tool_browser'] && (item.requestAction !== 'deny')) },
      sslbumpAction:                  { val: p => true, active: (item: ConfigItemRaw) => false },
      // hdrMods fields
      // request hdrMods can only set or remove, not append (per https://source.chromium.org/chromium/chromium/src/+/main:extensions/browser/api/declarative_net_request/indexed_rule.cc;l=495-497;drc=15a616c8043551a7cb22c4f73a88e83afb94631c)
      reqHdrMods:                     { 
        val: p => getNewlineSeparatedList(p, p=>((regexHdrREM.test(p) || regexHdrSET.test(p)                       ))) !== undefined, 
        active: (item: ConfigItemRaw) => ((item['tool_browser']) && (item.reqHdrAction === 'modify')) 
      },
      resHdrMods:                     { 
        val: p => getNewlineSeparatedList(p, p=>((regexHdrREM.test(p) || regexHdrSET.test(p) || regexHdrAPP.test(p)))) !== undefined, 
        active: (item: ConfigItemRaw) => ((item['tool_browser']) && (item.resHdrAction === 'modify')) 
      },
      // matching criteria - for criteria that do not apply to this tool, must be empty, or can allow a value that would ALWAYS make sense for this tool (e.g., lsdirection='outgoing' for browser)
      urlRegexPattern:                { val: p => isRegexPattern(p) , active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_browser')},
      hostDomainPatterns:             { val: p => (getCommaOrNewlineSeparatedList(p, isValidHostDomainPatternForBrowser) !== undefined), active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_browser') },
      initiatorDomains:               { val: p => (getCommaOrNewlineSeparatedList(p, isValidPlainDomainPatternForBrowser) !== undefined), active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_browser') },
      excludedInitiatorDomains:       { val: p => (getCommaOrNewlineSeparatedList(p, isValidPlainDomainPatternForBrowser) !== undefined), active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_browser') },
      excludedRequestDomains:         { val: p => (getCommaOrNewlineSeparatedList(p, isValidPlainDomainPatternForBrowser) !== undefined), active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_browser') },
      requestMethods:                 { val: p => (getCommaOrNewlineSeparatedList(p, isValidRequestMethod) !== undefined), active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_browser') },
      excludedRequestMethods:         { val: p => (getCommaOrNewlineSeparatedList(p, isValidRequestMethod) !== undefined), active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_browser') },
      // for resourceTypes, do not allow empty list (dNR allows it, but dNR's default behavior when no resourceType specified 
      // leads to behavior I don't fully understand or want, so I will require at least one explicit criterion here)
      resourceTypes:                  { val: p => ((p !== '') && (getCommaOrNewlineSeparatedList(p, isValidResourceType) !== undefined)), active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_browser') },
      excludedResourceTypes:          { val: p => (getCommaOrNewlineSeparatedList(p, isValidResourceType) !== undefined), active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_browser') },
      tabIds:                         { val: p => (getCommaOrNewlineSeparatedList(p, isValidTabId) !== undefined), active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_browser') },
      excludedTabIds:                 { val: p => (getCommaOrNewlineSeparatedList(p, isValidTabId) !== undefined), active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_browser') },
      remoteAddresses:                { val: p => ( p === ''), active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_browser') },
      lsprocess:                      { val: p => (p === ''), active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_browser') },
      lsvia:                          { val: p => (p === ''), active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_browser') },
      lsremote:                       { val: p => (p === 'any'), active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_browser') },
      lsdirection:                    { val: p => (p === 'outgoing'), active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_browser') },
      lsdisabled:                     { val: p => (p === false), active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_browser') },
      lsports:                        { val: p => (p === ''), active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_browser') },
      lsprotocol:                     { val: p => (p === 'any'), active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_browser') }
    },
    valItemCrossProp: (item: {[index: string]: any}) => {
      // if not active for this tool, just return true - we do not validate against inactive tools
      if (item['tool_browser'] === false) return ''
      // must have at least one criterion prop (not clear whether declarativeNetRequest actually requires this, but even if dNR does not require it, I will, since I don't want a newly-added ConfigItem to be a valid rule that matches everything - rather I need to make a conscious choice to enter .* for domain, or something else)
      if ((item.urlRegexPattern === '')
            && (item.hostDomainPatterns === '')
            && (item.initiatorDomains === '')
            && (item.excludedInitiatorDomains === '')
            && (item.excludedRequestDomains === '')
            && (item.requestMethods === '')
            && (item.excludedRequestMethods === '')
            && (item.resourceTypes === '')
            && (item.excludedResourceTypes === '')
            && (item.tabIds === '')
            && (item.excludedTabIds === '')
      ) return 'must have at least one criterion'

      // NOTE we do NOT require hostDomainPatterns or urlRegexPattern to be populated - if they are both empty, rule should match any domain (per dNR spec)

      // disallow having BOTH hostDomainPatterns and urlRegexPattern - dNR allows requestDomains and a [regex|url]Filter, but we will not support this (at least not yet)
      // ACTUALLY LET'S TRY ALLOWING IT - SEE WHAT HAPPENS    if ((item.hostDomainPatterns !== '') && (item.urlRegexPattern !== '')) return 'cannot have both hostDomainPatterns and urlRegexPattern'

      // there must be some action designated
      if ((item.requestAction === 'NA') && (item.jsAction === 'NA') && (item.reqHdrAction === 'NA') && (item.resHdrAction === 'NA')) return 'must have some action designated'
      // if requestAction is 'deny', jsAction must be 'NA' (i.e., if intent of this item is to deny requests, do not want to have misleading jsAction setting that might suggest the item should also affect js)
      if ((item.requestAction === 'deny') && (item.jsAction !== 'NA')) return 'if requestAction is deny, JS action must be NA'
      // 

      // can only have one of resourceTypes or excludedResourceTypes
      if ( (item.resourceTypes !== '') && (item.excludedResourceTypes !== '')) return 'can only have one of resourceTypes or excludedResourceTypes'
      // can only have one of requestMethods or excludedRequestMethods
      if ( (item.requestMethods !== '') && (item.excludedRequestMethods !== '')) return 'can only have one of requestMethods or excludedRequestMethods'
      // based on the doc, is IS allowed to have both tabIds and excludedTabIds, so we don't invalidate that

      else return ''
    },
    valItemAsAWhole: valItemAsAWhole,
    valAcrossItems: (items: ConfigItemRaw[]) => {
      // TTABLECONFIG ALREADY CHECKS FOR UNIQUE IDS - THIS IS NOT A TOOL-SPECIFIC CHECK
      return true
    },

    makeRulesFromConfigItem: (item: ConfigItemRaw, decisionType: DecisionTypeBrowser) => {
      // does not validate item passed in - assumes that it is valid (we do check validity in makeRuleListFromConfigItems)
      // if item passed in had action for decisionType set to 'NA', just returns []
      // will generate separate rule for each entry in url/hostDomains


// notes regarding hdrMods rules
//    for now, generate one rule per config item with header mods
//    dNR allows multiple mods to be specified in a single rule
//
//    also for now, will not validate or otherwise protect against the user entering
//    multiple rules that can conflict with each other
//    NOT CLEAR FROM DNR DOC what happens if two different rules with the SAME priority
//    specify conflicting header mods - will it return an error if we try to load them?
//    or will it apply them one after another (in which order?)
//
//    once we start using dNR for real we can test its behavior, and modify our practices
//    above to be consistent with how it actually works

// ALL CONFIGITEM PROPS WILL BE REPEATED IN EACH RULE
// EXCEPT THAT 
//   1) AFFIRMATIVE URL/DOMAIN PROPS WILL BE SPLIT INTO A SEPARATE RULE FOR EACH ONE
//      INCLUDING THAT IF HOSTDOMAINPATTERNS AND URLREGEXFILTER ARE BOTH PROVIDED, THEY
//      ARE SPLIT INTO DISTINCT RULES (dNR allows for requestDomains and regexFilter/urlFilter in same rule, but we are not going to support this (for now))
//   2) separate rules are generated for allow|block and header modification

      // first, generate a set of rule props that will be common across all url/hostDomain instances
      let result: ConfigRuleBrowserDNR[] = []

      let commonRuleProps: Partial<ConfigRuleBrowserDNR> = {
        // general rule props
        configItemId: item._id,
        configItemNotes: item.notes,
        tempRule: item.tempItem,
        hostnameScope: 'anyhost',   // the default value for this prop - below, if urlRegexPattern or hostDomainPattern is not '.*', will set to 'specific'

        // dNR props common to all rules that may be created from this ConfigItem
        id: -1,   // set to dummy value - the dNR id will be determined when the rule is commited to dNR
        priority: Number.parseInt(item.priority),

        // c_domainType  - not setting it here, if omitted rule matches both types

        // NOTE - for *Domains props, need to strip leading dot - validation requires that I input them with
        // leading dots (for clarity and consistency in my UI), but dNR wants them to not have a leading do
        // and dNR will still treat them as matching sub-domains
        c_initiatorDomains:       (item.initiatorDomains === '') ? undefined : getCommaOrNewlineSeparatedList(item.initiatorDomains)?.map(d => d.slice(1)),
        c_excludedInitiatorDomains:       (item.excludedInitiatorDomains === '') ? undefined : getCommaOrNewlineSeparatedList(item.excludedInitiatorDomains)?.map(d => d.slice(1)),
        c_excludedRequestDomains:       (item.excludedRequestDomains === '') ? undefined : getCommaOrNewlineSeparatedList(item.excludedRequestDomains)?.map(d => d.slice(1)),
        c_requestMethods:         (item.requestMethods === '') ? undefined : getCommaOrNewlineSeparatedList(item.requestMethods) as chrome.declarativeNetRequest.RequestMethod[],
        c_excludedRequestMethods: (item.excludedRequestMethods === '') ? undefined : getCommaOrNewlineSeparatedList(item.excludedRequestMethods) as chrome.declarativeNetRequest.RequestMethod[],
        // for [excluded]resourceTypes, replace <any> with full list of valid resource Types
        c_resourceTypes:          
            (item.resourceTypes === '<any>') ? dNRResourceTypeStrings as chrome.declarativeNetRequest.ResourceType[]
            : (
              (item.resourceTypes === '') ? undefined : getCommaOrNewlineSeparatedList(item.resourceTypes) as chrome.declarativeNetRequest.ResourceType[]
            ),
        c_excludedResourceTypes: 
            (item.excludedResourceTypes === '<any>') ? dNRResourceTypeStrings as chrome.declarativeNetRequest.ResourceType[]
            : (
              (item.excludedResourceTypes === '') ? undefined : getCommaOrNewlineSeparatedList(item.excludedResourceTypes) as chrome.declarativeNetRequest.ResourceType[]
            ),
        c_tabIds:                 (item.tabIds === '') ? undefined : getCommaOrNewlineSeparatedList(item.tabIds)?.map(t => Number.parseInt(t)),
        c_excludedTabIds:         (item.excludedTabIds === '') ? undefined : getCommaOrNewlineSeparatedList(item.excludedTabIds)?.map(t => Number.parseInt(t)),
      }

      const itemHasRequestAction = item.requestAction !== 'NA'
      const itemHasReqHdrModAction = (item.reqHdrAction !== 'NA')
      const itemHasResHdrModAction = (item.jsAction !== 'NA') || (item.resHdrAction !== 'NA')
      // make common props for request allow/block rules
      let commonRequestActionRuleProps: Partial<ConfigRuleBrowserDNR> = {
        a_type: itemHasRequestAction ? 
            ((item.requestAction === 'allow') ? 'allow' as chrome.declarativeNetRequest.RuleActionType
            : 'block' as chrome.declarativeNetRequest.RuleActionType
            )
            : undefined
      }
      // make common props for header modification rules
      let commonHdrModRuleProps: Partial<ConfigRuleBrowserDNR> = {
        // give the header mod rules item priority + 1, so they will not be hidden by matching request allow rules
        // this prop will replace the configItemId from commonRuleProps because it comes later in Object.assign argument list
        priority: Number.parseInt(item.priority) + 1,
        a_type: (itemHasReqHdrModAction || itemHasResHdrModAction) ? ('modifyHeaders' as chrome.declarativeNetRequest.RuleActionType) : undefined,
        a_requestHeaders:  itemHasReqHdrModAction ? [] : undefined,
        a_responseHeaders: itemHasResHdrModAction ? [] : undefined,
      }
      if (item.jsAction === 'deny') { commonHdrModRuleProps.a_responseHeaders?.push({
        header: 'content-security-policy',
        value: 'script-src \'none\'',
        operation: 'append' as chrome.declarativeNetRequest.HeaderOperation
      })}
      if (item.reqHdrAction === 'modify') {
        const mods = getNewlineSeparatedList(item.reqHdrMods)
        if (mods !== undefined) for (let mod of mods) {
            const [all, op, name, x, value] = (regexHdrModOpAndName.exec(mod)) as string[]
            commonHdrModRuleProps.a_requestHeaders?.push({
                header: name,
                value: value,
                operation: (op === 'REM') ? ('remove' as chrome.declarativeNetRequest.HeaderOperation) : ((op === 'APP') ? ('append' as chrome.declarativeNetRequest.HeaderOperation) : ('set' as chrome.declarativeNetRequest.HeaderOperation))
            })
        }
      }
      if (item.resHdrAction === 'modify') {
        const mods = getNewlineSeparatedList(item.resHdrMods)
        if (mods !== undefined) for (let mod of mods) {
            const [all, op, name, x, value] = (regexHdrModOpAndName.exec(mod)) as string[]
            commonHdrModRuleProps.a_responseHeaders?.push({
                header: name,
                value: value,
                operation: (op === 'REM') ? ('remove' as chrome.declarativeNetRequest.HeaderOperation) : ((op === 'APP') ? ('append' as chrome.declarativeNetRequest.HeaderOperation) : ('set' as chrome.declarativeNetRequest.HeaderOperation))
            })
        }
      }
    

      // now generate one rule for each hostDomainPattern/urlRegexPattern
      // and for each of requestAction and header mod actions
      if (item.urlRegexPattern !== '') {
        Object.assign(commonRuleProps, { hostnameScope: (item.urlRegexPattern === '.*') ? 'anyhost' : 'specific'})
        if (itemHasRequestAction) result.push(new ConfigRuleBrowserDNR(Object.assign({}, commonRuleProps, commonRequestActionRuleProps, { c_regexFilter: item.urlRegexPattern })))
        if (itemHasReqHdrModAction || itemHasResHdrModAction) result.push( new ConfigRuleBrowserDNR(Object.assign({}, commonRuleProps, commonHdrModRuleProps, { c_regexFilter: item.urlRegexPattern})))
      }
      if (item.hostDomainPatterns !== '') {
        const hs = getCommaOrNewlineSeparatedList(item.hostDomainPatterns)
        if (hs === undefined) throw new Error(`hostDomainPatterns does not parse correctly, but should have failed validation before this`)
        for (let h of hs) {
            Object.assign(commonRuleProps, { hostnameScope: (h === '.*') ? 'anyhost' : 'specific'})
            // if leading-dot domain name, can use requestDomains prop

            var domainCriterion
            // if leading dot domain, use requestDomains, which will also match subdomains
            if (isDomainWithRequiredLeadingDot(h)) {
              domainCriterion = { c_requestDomains: [h.slice(1)]}
              //cl(` ==> requestDomains: ${domainCriterion.c_requestDomains}`)
            }
            // else if domain without leading dot, use regexFilter constructed so pattern must match entire hostname
    
            else if (isDomain(h)) {
              domainCriterion = { c_regexFilter: `^\\w*://${h}($|[/?#:].*)`  }  // embed pattern in regex that forces it to match entire hostname
                          // note that dNR tests regexFilter against entire URL
                          // so embedding needs to constrain to only test against hostname part
                          // embedding matches
                          //    leading scheme://
                          //    after hostname, potentially
                          //      nothing
                          //      / for path, then rest
                          //      : for port, then rest
                          //      ? or # , then rest
                          //      (url spec seems to indicate that first char after hostname would always be /)
                          //      (observation seems to indicate there is always a / after hostname, even if no path)
                          //      (nonetheless, make the post-hostname part of regex optional)
            // else pattern is a regex, so use regexFilter constructed to allow it to match ANY PART OF hostname
            // need to replace .* in pattern with [\w-.]* to only match valid hostname characters
            //   so it will cannot get past the first /, :, ? or # and match pattern to something after that
              //cl(` ==> regexFilter from domain: ${domainCriterion.c_regexFilter}`)
            }
            else {
              const h2 = h.replaceAll('\.\*', '[\\w-.]*')
              domainCriterion = { c_regexFilter:  `^\\w*://${h2}($|[/?#:].*)`}   // embed pattern in regex that will only let it match ANY PART OF the hostname part of url
              //cl(` ==> regexFilter from regex pattern: ${domainCriterion.c_regexFilter}`)
            }
            if (itemHasRequestAction) {
              result.push( new ConfigRuleBrowserDNR(Object.assign({}, commonRuleProps, commonRequestActionRuleProps, domainCriterion)) )
            }
            if (itemHasReqHdrModAction || itemHasResHdrModAction) {
              result.push( new ConfigRuleBrowserDNR(Object.assign({}, commonRuleProps, commonHdrModRuleProps, domainCriterion)) )
            }
        }    
        

      }

      return result

    },

// !!!!!!!!!!!!!!!
// MAKE SURE THAT NON-LEADING-DOT DOMAIN PATTERNS AND REGEXES FOR HOSTDOMAINPATTERNS ARE
// CONVERTED INTO DNR REGEXFILTERS THAT WILL MATCH ONLY THE HOSTNAME PART OF URL
// !!!!!!!!!!!!!!!

// HANDLE COMBINATIONS OF 
//    JSACTION='DENY'
//    REQHDRMODS
//    RESHDRMODS
//   ==> DNR ALLOWS ALL TO BE COMBINED IN A SINGLE RULE

// be sure to update hostnameScope if host/url pattern is not .*


    makeRuleListFromConfigItems: (items: ConfigItemRaw[], /* OBSOLETE host: string, */ decisionType: DecisionTypeBrowser, tempNonTemp: 'temp' | 'nonTemp' | 'both') => {
/*
      checks each config item for validity - returns undefined if any config item not valid
			takes a 'host' argument - can be one host, or 'all'
			always ignores config items that are not active for the tool
			always ignores config items with no hosts that have that tool
*/


      const result: ConfigRuleBrowserDNR[] = []

      for (let i of items) {
        // skip if item tempItem not consistent with tempNonTemp argument
        if ((tempNonTemp === 'temp') && (i.tempItem === false)) continue
        if ((tempNonTemp === 'nonTemp') && (i.tempItem === true)) continue
        // skip if inactive, i.e. this tool is not selected for this rule
        if (i['tool_browser'] === false) continue
        // skip if host is not 'all' or a selected host for this item
        // OBSOLETE if (host !== 'all') {
        // OBSOLETE   if (i[host] !== true) continue
        // OBSOLETE }
        // if item is invalid, return undefined
        if (tool_browser.valItemAsAWhole(tool_browser.props, tool_browser.valItemCrossProp, i) === false) return undefined
        // if we got this far, make rules from this config item
        result.push(...(tool_browser.makeRulesFromConfigItem(i, decisionType) as ConfigRuleBrowserDNR[]))
      }

      // sort in descending order of priority and rule action type (consistent with dNR spec)
      const ruleActionPriorities: {[index: string]: number} = {
        'allow': 6,
        'allowAllRequests': 5,
        'block': 4,
        'upgradeScheme': 3,
        'redirect': 2,
        'modifyHeaders': 1,
      }
      result.sort((a, b)=>{
        if (a.priority > b.priority) return -1
        else if (a.priority < b.priority) return 1
        else if (ruleActionPriorities[a.a_type] > ruleActionPriorities[b.a_type]) return -1
        else if (ruleActionPriorities[a.a_type] < ruleActionPriorities[b.a_type]) return -1
        else return 0
      })

      return result
    }, 

    doesRuleApplyToTI: (crProps: CRPropsToTestVsRuleBrowser, rule: ConfigRuleBrowserDNR) => {

      // cannot use dNR 'doesRuleMatch' API because 
      //    a) that API is not available outside of extension
      //    b) will not match rules that are masked by higher priority in the ruleset

      // need to consider request props for which we allow matching criteria in our implementation:
      //    url / domain
      //       could be by requestDomain or regexFilter in dNR rule (not urlFilter, we don't use this criterion currently)
      //    tabId
      //    resourceType
      //    initiator
      //    method
      // do not need to handle other conditions that dNR supports but which we have not implemented (yet):
      //    domain type (first|third party)

      if (crProps.url === undefined) throw new Error(`getDecision was passed crProps with no URL - this should never happen`)
      var url: URL
      try {
        url = new URL(crProps.url)
      }
      catch {
        throw new Error(`doesRuleApplyToTI URL object constructor failed on a url of: \n${crProps.url}`)
      }
      var initiator: URL | undefined
      if ((crProps.initiator !== undefined) && (crProps.initiator !== '')) try {
        initiator = new URL(crProps.initiator)
      }
      catch {
        throw new Error(`doesRuleApplyToTI failed to make initiator URL from criProps.initiator: ${crProps.initiator}`)
      }

      // first check exclusion criteria - if CR matches any exclusion criterion, return false

      if (rule.c_excludedRequestDomains   !== undefined) if ((url.hostname !== '')              && (domainMatchesRequestDomains(url.hostname, rule.c_excludedRequestDomains))) return false
      // need to compare case-insensitive - values in decNetReq are lower case, but values that come from webRequest are uppercase
      if (rule.c_excludedRequestMethods   !== undefined) if ((crProps.method !== '')            && (rule.c_excludedRequestMethods.includes(crProps.method.toLowerCase() as chrome.declarativeNetRequest.RequestMethod))) return false
      if (rule.c_excludedResourceTypes    !== undefined) if ((crProps.resourceType !== '')      && (rule.c_excludedResourceTypes .includes(crProps.resourceType as chrome.declarativeNetRequest.ResourceType))) return false
      if (rule.c_excludedTabIds           !== undefined) if ((crProps.tabId.toString() !== '')  && (rule.c_excludedTabIds        .includes(Number.parseInt(crProps.tabId)))) return false
      if (rule.c_excludedInitiatorDomains !== undefined) if ((initiator !== undefined)          && (domainMatchesRequestDomains(initiator.hostname, rule.c_excludedInitiatorDomains))) return false

      // if requestMethods was specified, do not match if scheme is not HTTP/HTTPS
      // (scheme is called 'protocol' in URL object, and includes the ':')
      if (rule.c_requestMethods !== undefined) if ((url.protocol !== 'http:') && (url.protocol !== 'https:')) return false

      // then check affirmative criteria - CR must match all affirmative critera to return true

      // IF THERE ARE NO AFFIRMATIVE CRITERIA, THEN RETURN TRUE AT THIS POINT (SEE NOTES IN ONENOTE ON TOOL RULES AND MATCHING)
      if ((rule.c_regexFilter === undefined) && (rule.c_initiatorDomains === undefined) && (rule.c_requestDomains === undefined)
          && (rule.c_requestMethods === undefined) && (rule.c_resourceTypes === undefined) && (rule.c_tabIds === undefined)) return true

// handle requestDomains and regexFilter (we are not using urlFilter (yet))

// NOTE that if requestDomains and regexFilter are undefined, we match all requests

// handle requestDomains matching of subdomains
//    use utility fns for requestDomains

      // now test non-empty ones, and fail if does not match
      if (rule.c_initiatorDomains !== undefined) {
        if (initiator === undefined) return false
        else if (domainMatchesRequestDomains(initiator.hostname, rule.c_initiatorDomains) === false) return false
      }
      if (rule.c_requestDomains !== undefined) {
        if (url === undefined) return false
        else if (domainMatchesRequestDomains(url.hostname, rule.c_requestDomains) === false) return false
      }
      if ((rule.c_regexFilter    !== undefined) && ((new RegExp(rule.c_regexFilter)).test(crProps.url)       === false)) return false
      // note - for tests based on 'String.includes', need to also test for crProps value being '' - that should fail the match if the rule value is !== '', but .includes would return true
      if (rule.c_requestMethods !== undefined) if ((crProps.method === '')       || (rule.c_requestMethods.includes(crProps.method.toLowerCase() as chrome.declarativeNetRequest.RequestMethod) === false)) return false
      if (rule.c_resourceTypes  !== undefined) if ((crProps.resourceType === '') || (rule.c_resourceTypes .includes(crProps.resourceType as chrome.declarativeNetRequest.ResourceType) === false)) return false
      // NOTE - next line does toString because in background script, when event handlers are making decisions, the tabId value passed in to this will be a number (as received from browser)
      if (rule.c_tabIds         !== undefined) if ((crProps.tabId.toString() === '')        || (rule.c_tabIds        .includes(Number.parseInt(crProps.tabId)) === false)) return false
      return true // if we fall through to this else clause, return true
        // because no affirmative criteria failed to match

    },
    
    getDecision: (crProps: CRPropsToTestVsRuleBrowser, ruleList: ConfigRuleBrowserDNR[], decisionType: DecisionTypeBrowser, minPriorityToTest: number) => {

      // NOTE THIS FUNCTION ASSUMES ruleList HAS ALREADY BEEN SORTED IN THE PRIORITY ORDER THAT DNR USES
      // (I.E., DESCENDING ORDER OF PRIORITY PROP, THEN BY ACTION TYPE WITHIN THAT)


// NEED TO REFLECT PRIORITIES
//    FOR REQUEST ACTION RULES
//    FOR HEADER MOD RULES

// NEEDS TO REFLECT ACTUAL BEHAVIOR OF PRIORITIES, WHERE IT CONFLICTS WITH SPEC



        // default return value if no rules apply
        let decision: DecisionInfoBrowser = {
            type: 'browser',
            resultRequest: 'allow',
            resultJS: 'allow',
            resultHdrMod: 'none',
            wasTested: true,   // if we reached this point in tool flow, we will say transaction was tested
            rulesThatAppliedRequest: [],
            rulesThatApplieJS: [],
            rulesThatAppliedHdrMod: [],
            minPriorityOfRuleThatWasTestedAndMatched: undefined
          }

// re-write this usign new logic pattern - see pihole getDecision
// want all rules that could have applied, in decreasing order of specificity
// there is no implication that most-specific rule is the one that actually decided
// this particular request


// WILL REVISE OT PRODUCE NEW DECISIONINFO         var decisiveRulePriority: number = 0
// WILL REVISE OT PRODUCE NEW DECISIONINFO         // scan rules for matching request rules
// WILL REVISE OT PRODUCE NEW DECISIONINFO         for (let r of ruleList) {
// WILL REVISE OT PRODUCE NEW DECISIONINFO           if (r.priority < minPriorityToTest) continue
// WILL REVISE OT PRODUCE NEW DECISIONINFO
// WILL REVISE OT PRODUCE NEW DECISIONINFO           if ((r.a_type !== 'modifyHeaders') && tool_browser.doesRuleApplyToTI(crProps, r)) {
// WILL REVISE OT PRODUCE NEW DECISIONINFO             decisiveRulePriority = r.priority
// WILL REVISE OT PRODUCE NEW DECISIONINFO             decision.minPriorityOfRuleThatWasTestedAndMatched = r.priority
// WILL REVISE OT PRODUCE NEW DECISIONINFO             decision.configItemsThatAffected = ((decision.configItemsThatAffected === undefined) ? '' : decision.configItemsThatAffected) + r.configItemId + '\n'
// WILL REVISE OT PRODUCE NEW DECISIONINFO             if (decision.ruleHostScopesThatAffected === undefined) decision.ruleHostScopesThatAffected = r.hostnameScope
// WILL REVISE OT PRODUCE NEW DECISIONINFO             else if (decision.ruleHostScopesThatAffected !== r.hostnameScope) decision.ruleHostScopesThatAffected = 'both'
// WILL REVISE OT PRODUCE NEW DECISIONINFO             else decision.ruleHostScopesThatAffected = r.hostnameScope
// WILL REVISE OT PRODUCE NEW DECISIONINFO             switch (r.a_type) {
// WILL REVISE OT PRODUCE NEW DECISIONINFO               case 'allow':
// WILL REVISE OT PRODUCE NEW DECISIONINFO                 decision.resultRequest = 'allow'
// WILL REVISE OT PRODUCE NEW DECISIONINFO                 break
// WILL REVISE OT PRODUCE NEW DECISIONINFO               case 'block':
// WILL REVISE OT PRODUCE NEW DECISIONINFO                 decision.resultRequest = 'deny'
// WILL REVISE OT PRODUCE NEW DECISIONINFO                 break
// WILL REVISE OT PRODUCE NEW DECISIONINFO               case 'allowAllRequests':
// WILL REVISE OT PRODUCE NEW DECISIONINFO               case 'redirect':
// WILL REVISE OT PRODUCE NEW DECISIONINFO               // NOTE if multiple redirect rules at same priority, which one will be used by dNR is indeterminate (per spec) - getDecision needs to be able to return a result of 'indeterminate' in this case
// WILL REVISE OT PRODUCE NEW DECISIONINFO               case 'upgradeScheme':
// WILL REVISE OT PRODUCE NEW DECISIONINFO                 throw new Error(`browser getDecision does not handls ${r.a_type}`)
// WILL REVISE OT PRODUCE NEW DECISIONINFO             }
// WILL REVISE OT PRODUCE NEW DECISIONINFO             // break out of loop - first matching request rule is decisive
// WILL REVISE OT PRODUCE NEW DECISIONINFO             break
// WILL REVISE OT PRODUCE NEW DECISIONINFO           }
// WILL REVISE OT PRODUCE NEW DECISIONINFO         }
// WILL REVISE OT PRODUCE NEW DECISIONINFO
// WILL REVISE OT PRODUCE NEW DECISIONINFO         // now scan for header mod rules
// WILL REVISE OT PRODUCE NEW DECISIONINFO         // only scan for header mod rules if request was not blocked
// WILL REVISE OT PRODUCE NEW DECISIONINFO         if (decision.resultRequest !== 'deny') {
// WILL REVISE OT PRODUCE NEW DECISIONINFO           for (let r of ruleList) {
// WILL REVISE OT PRODUCE NEW DECISIONINFO             if (r.priority < minPriorityToTest) break
// WILL REVISE OT PRODUCE NEW DECISIONINFO             // NOTE WE STOP TESTING IF RULE PRIORITY <= (AS OPPOSED TO <) BECAUSE OBSERVED BEHAVIOR OF DNR IS THAT HEADER MOD RULES AT SAME PRIORITY AS REQUEST RULES
// WILL REVISE OT PRODUCE NEW DECISIONINFO             // ARE IGNORED, EVEN THOUGH SPEC SAYS THEY WILL BE MATCHED
// WILL REVISE OT PRODUCE NEW DECISIONINFO             if (r.priority <= decisiveRulePriority) break
// WILL REVISE OT PRODUCE NEW DECISIONINFO             if ((r.a_type === 'modifyHeaders') && tool_browser.doesRuleApplyToTI(crProps, r)) {
// WILL REVISE OT PRODUCE NEW DECISIONINFO               decision.configItemsThatAffected = (decision.configItemsThatAffected === undefined) ? '' : decision.configItemsThatAffected + r.configItemId + '\n'
// WILL REVISE OT PRODUCE NEW DECISIONINFO               if (decision.ruleHostScopesThatAffected === undefined) decision.ruleHostScopesThatAffected = r.hostnameScope
// WILL REVISE OT PRODUCE NEW DECISIONINFO               else if (decision.ruleHostScopesThatAffected !== r.hostnameScope) decision.ruleHostScopesThatAffected = 'both'
// WILL REVISE OT PRODUCE NEW DECISIONINFO               else decision.ruleHostScopesThatAffected = r.hostnameScope
// WILL REVISE OT PRODUCE NEW DECISIONINFO               
// WILL REVISE OT PRODUCE NEW DECISIONINFO               // distinguish rules that are js blockers vs. other
// WILL REVISE OT PRODUCE NEW DECISIONINFO               if ((r.a_responseHeaders !== undefined) && (r.a_responseHeaders.length === 1) && (r.a_responseHeaders[0].header === 'content-security-policy') && (r.a_responseHeaders[0].value === 'script-src \'none\'') && (r.a_responseHeaders[0].operation === 'append')) {
// WILL REVISE OT PRODUCE NEW DECISIONINFO                 decision.resultJS = 'deny'
// WILL REVISE OT PRODUCE NEW DECISIONINFO               }
// WILL REVISE OT PRODUCE NEW DECISIONINFO               else decision.resultHdrMod = 'modify'
// WILL REVISE OT PRODUCE NEW DECISIONINFO             }
// WILL REVISE OT PRODUCE NEW DECISIONINFO           }
// WILL REVISE OT PRODUCE NEW DECISIONINFO         }
// WILL REVISE OT PRODUCE NEW DECISIONINFO
// WILL REVISE OT PRODUCE NEW DECISIONINFO         // strip trailing \n from configItemsThatAffected
// WILL REVISE OT PRODUCE NEW DECISIONINFO         if (decision.configItemsThatAffected !== undefined) decision.configItemsThatAffected = decision.configItemsThatAffected.slice(0, -1)

      return decision
    }
}


// checks whether domain matches a 'requestDomain' dNR criterion - true of domain===requestDomain, or domain is a sub-domain
function domainMatchesRequestDomain(domain: string, dNRRequestDomain: string): boolean {
  // if exact match, return true
  if (domain === dNRRequestDomain) return true
  // else right-hand slice of domain needs to match
  // AND character before it needs to be '.'
  if (domain.length <= dNRRequestDomain.length) return false
  const domainIndex = domain.length - dNRRequestDomain.length  // we know it will be >= 1 due to previous test
  if (domain.slice(domainIndex-1, 1) !== '.') return false
  if (domain.slice(domainIndex) !== dNRRequestDomain) return false

  return true

}

function domainMatchesRequestDomains(domain: string, dNRRequestDomains: string[]): boolean {
  if (dNRRequestDomains.length === 0) throw new Error('domainMatchesRequestDomains cannot be called with empty array')
  for (let dd of dNRRequestDomains) if (domainMatchesRequestDomain(domain, dd)) return true
  return false
}

