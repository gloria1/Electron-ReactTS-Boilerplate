

import { resolveObjectURL } from 'buffer'
import md5 from 'md5'
import { v4 as uuidv4 } from 'uuid'
import { tool_browser } from './configTypesToolBrowser'
import { tool_lsnitch } from './configTypesToolLSnitch'
import { tool_pihole } from './configTypesToolPihole'
import { tool_squid } from './configTypesToolSquid'

const cl = console.log
const ct = console.table





/*
  overall scheme





NOTE FOR FUTURE :
    CONSIDER MAKING SUBTYPES FOR CONFIGITEM AND CONFIG RULE, TEMP VS NONTEMP
    THEN USE APPROPRIATE SUBTYPES ON THE VAIROUS PATHWAYS THAT ARE ONLY FOR ONE TYPE OR THE OTHER
    BUT THEN WOULD NEED DISCRIM UNION ENUM IN SWIFT?
    or make them subclasses?
      MAKE A NEW BRANCH AND TRY IT....






  'ConfigItemRaw'
    this will be a flat object (i.e. no nested props), so that each prop can directly become a prop in a ConfigI without having to unpack it
    the interface definition is the union of all the settings and matching criteria for all the tools
    AND these items will also include props for tools
      boolean valued - these are switches for whether this config is to be used for the tool
      when an item is added to a TTable (having been fetched from mongo, or maybe from somewhere else),
        if it is missing any tool_ props (based on the global tools objects),
        those props will be added, with a value of false

  ConfigItems are designed so that the same item can contain multiple matching criteria (most commonly for 
    the domain), and apply to multiple tools, to avoid
     needing to have separate items that do the same basic thing in various tools, e.g., 'block facebook',
     and so that it is easy to change 'block facebook' to 'allow facebook' globally

  'Toggleable'
    to allow for easy toggling of block-by-default (or maybe other types) of rules
    toggle-ability is tied to a ConfigItem's notes property including the substring 'TOGGLEABLE-PIHOLE'
    the serviceOp for config push will have options for enabling and disabling toggleable items
    the effect will be to effectively commit a new ConfigSet to inforce,
      using the current inforce but setting the tool_pihole property to true or false for any toggleable items


  'ConfigRule'
    this is a single entry in the configuration of a single tool
    e.g.,
      for browser extensions, it will produce a single 'RuleCondition' in declarativeNetRequest
      for little snitch, it will produce a single 'rule' in the the rules array
      for pihole, it will be a single entry in the whitelist or blacklist regex list
    thus, a single ConfigItem may need to be expanded to multiple rules, depending on the tool and the 
      settings entered by the user

  'active' and 'valid'
    active is computed before validation - because validation is not computed on inactive items
    valid means a prop, config item or set of config items is valid to apply to any tool that is active
    i.e., valid means the prop/item/item list will produce a valid rule set if passed to any of the tool makeRules methods


  'temp' vs 'nonTemp'
    both ConfigItems and ConfigRules have a 'tempItem'/'tempRule' prop (boolean)
    nonTemp items are
      created/edited/deleted in TTableConfig
      stored to disk when do a 'save' or 'commit' operation
      maintained as peristent state in server (i.e., reloaded at restart of svr process) (not yet set up to persist on restarts of extension)
      put into effect with 'commit' operation (from TTableConfig gui and extApp gui)
    temp items are
      created by user action on popup (for browser extension) or TTableLVPH (for pihole rules)
      ephemeral - 
        they are automatically deleted when
          browser - when tab closes, or user changes temp rule setting via popup
          pihole - after a timer expires, or when user does 'commit'
        they are never saved to disk, and are not restored when server restarts
      shown in TTableConfig, but not editable
    TTableConfig will store and show both temp and nonTemp items in the same table
    ...but everywhere else they are stored and handled via separate pathways
    thus, code paths need to take total ConfigSet items array and filter it for (item.tempItem === true|false)
    this adds some overhead to the code, but the alternative would have been showing two TTableConfigs, or somehow otherwise 'gluing together' the temp and nonTemp items for display in TTableConfig

  'active'
    this term has multiple senses, depending on the context
      for a tool
        'active' means the tool_ prop is set to true
      for a ConfigItem as a whole,
        active means *any* tool is set to true
      for a prop in a ConfigItem
        matching criteria props
          all criteria props are active if *any* tool is active, even if that criterion is not used for the active tool(s)
          - for props not used on a tool, the tool validates that it's value is empty, or a value that would always be correct for that tool (e.g., lsdirection='outgoing' is always correct for a browser rule, since those only operate on outgoing connections)
        action props (requestAction, jsAction, etc)
          these can be inactive when the tool that uses them is active, if they are not operational based on 
            other props - e.g., jsAction is inactive if requestAction is 'deny'
    effects of 'active'
      inactive items are not validated - i.e., they will not produce validation errors even if their value is invalid
      inactive items will be grayed out and not interactive in the gui
      inactive items will be skipped in makeRules... methods

  validation of props
    each tool needs to validate all props, even those that do not relate to that tool
    validation of unrelated props needs to check that they are empty, or have a value that would always make sense for the tool
    (e.g., lsdirection='outgoing' would always make sense for tool_browser)


  validation of tool_ props
    tool_ has validation methods that check whether there is a relevant tool_ that is active

  validation of a ConfigItem as a whole
    need to validate for each tool *that is active*
    needs to check that props for a given tool are internally consistent
    this logic is different depending on whether the prop is a matching criterion or an action setting
      for matching criteria, if a prop is not directly applicable to a tool,
        it should either be empty,
        ...or have a value that would make sense for that tool, if the tool had such a criterion (in the example above, everything the browser extension sees is an 'outgoing' connection, so 'outgoing' is always valid for a browser rule)
      for action settings
        some actions may be not applicable for a specific tool
          e.g., jsAction is not applicable for pihole
          no need to validate such props for that tools where they don't apply
        validity for one action may depend on the value of another action
          specifically, if requestAction is 'deny', there will be no js action performed, because the request will never get that far

  validation method results
    for validation of props and items in a single tool, result is true|false
    for validation of an item across tools, and across items, result is a bitmask, with non-zero bits for invalid results
      // OBSOLETE bitmask 1 - tool settings valid/invalid based on hosts
      // OBSOLETE bitmask 2 - host settings valid/invalid based on tools
      bitmask 4 - invalid for browser
      bitmask 8 - invalid for lsnitch
      bitmask 16 - invalid for pihole
      bitmask 32 - invalid for squid

  validation flow
    TTable.valResultForTable
      or over 
        each child's valResultForItem
        each tools' valAcrossItems

          Tool.valAcrossItems
            returns false if there is something invalid about a combination of 2 or more config items (e.g., duplicate item _id props, or illegal range of priorities)

          ConfigI.valResultForItem
            or over
              each prop's addedPropVals[p]
              each *active* tool's valItemCrossProp

                  ConfigI.addedPropVals[p]
                    getter (mobx computed) equal to mapPMViewerConfig[p].val

                          mapPMViewerConfig[p].val
                            or over
                              each *active* tool's props[p].val method

                  Tool.valItemCrossProp
                    returns false if any cross-prop combinations invalid




  'tools'
     will be hard-coded const object, encoding characteristics of each tool
     key is tool name (prefixed by 'tool_' - this is relied upon by other code to identify which props in a ConfigItem are tool on/off switches
     props for each tool
        the name of the tool (prefixed by 'tool_') - this is the key to the object
        mask: a bitmask value, used to aggregate validation issues across multiple tools
        props - object keyed by config prop names that are relevant to this tool
          val - function that takes the prop value and returns a boolean for whether it is valid for this tool
    no need to allow for dynamically creating/modifying, since list of tools will change rarely
    and when it changes, we probably need changes to code anyway
  // OBSOLETE 'hosts'
  // OBSOLETE   will be manually created in mongo
  // OBSOLETE   will be treated as 'readonly' after loading from mongo
  // OBSOLETE   (later we may add editing in viewer, but host info should change infrequently and it is small, so manual editing in mongo is fine for now)
  // OBSOLETE   hosts will be loaded into a TTableConfig on load from mongo
  // OBSOLETE   when config items are loaded, we will assume that hosts is already populated for the TTable and will not change
  // OBSOLETE   hosts will be keyed by hostname prefixed by 'host_'
  // OBSOLETE     PROPNAMES NEEDS TO BE DEFINED ACCORDINGLY IN THE CONFIG STORED IN SERVER STATE
  // OBSOLETE     ALL OTHER CODE WILL ASSUME THAT ANY HOST NAME HAS THE PREFIX
  // OBSOLETE   'host' (without the prefix) will be the actual hostname (at least for now, may modify this later since we are also storing an IP for each host)
  // OBSOLETE   props for each host:
  // OBSOLETE     ip - string valued ipv4 address
  // OBSOLETE     tools - array of tool names that are available on this host


  SEE MORE NOTES IN ONENOTE ABOUT CONFIGITEM AND RULE PROPS, DECISION MAKING ETC



  'domains' and 'urlFilters' for declarativeNetRequest (browser)
    decNetReq provides matching criteria for
      'domains' - one or more per rule, tested against hostname, no wildcards, just a straight text match, not sure how it matches sub-domains
      'urlFilter' - one per rule, tested against full url, has wildcards and separators
      'regexFilter' - one per rule, tested against full url
    urlFilter syntax (see below) provides a subset of regex functionality,
    but does so in a cleaner, more readable form (e.g., ^ as a shortcut that matches all separators)
    NOT GOING TO USE DOMAINS AND URLFILTERS AS CONFIGITEM PROPS (at least for now)
    because,
      the most common (99% of the time) use case is that we want to specify either an exact domain match
        or a domain-and-any-subdomain match
      and we want that to be easy to enter and easy to read
      the (already developed) syntax of domain-with-optional-leading-dot works very well for this
        and is easy to translate into the form needed by each tool
      entering urlFilters directly would require me to type ||* before every domain name and ^ after it
      and, urlFilters does not give me any great additional capability i don't already have
        in the 1% of cases where domain-and-leading-dot is not enough, i can still go full regex

 
   
*/


export type ToolNames = 'tool_browser' | 'tool_browser_webRequest' | 'tool_lsnitch' | 'tool_pihole' | 'tool_squid'


/*

  note on JS 'allow'
    a config item can only be set with a JS action of 'deny' or 'NA'
    we do not provide a ConfigItem setting for 'allow' for js, because, 
    unlike request decisions, for JS the decision-making algorithm would not stop if it finds a matching 'allow' rule,
    but rather keep checking rules down to the priority level that made the request decision (see docs on dNR)
    so, if we want to 'not deny' JS for a given request, we need to construct our config items so that no JS deny rule matches it

  glossary
    transaction
      the "thing" the tool decides about
        browser - web request
        pihole - dns query
        etc.
    action - value in configItem (as input by user) indicating *intended* outcome if this rule applies
    default policy - what the tool will do if no rules apply to a transaction, of if the tool is disabled altogether
    decision - what the testing algorithm decides and why (including the getDecision method, and the event handlers etc that surround it)
        this is a function of (ruleset, transaction)
        e.g., browser extension may 'decide' to allow a request becuase the 'should test for request block' flag might be turned off, so it will always apply the 'default' policy
      result - the final effect decided - will always be populated, at least with the default policy if no tests are done or no rules affect 
      ...ThatAffected - things that had some effect on the decision result
    decision type
      request - whether to allow|block the request in browser, pihole, lsnitch, or bump|splice|terminate in squid
      jsBlock - whether to block JS (browser only)
      hdrMod - header modifications (browser only)
    DecisionInfo - name of object containing information about a decision
      wasTested - always populated
      result - always populated, with default policy if no further testing happens or no rules apply
      rulesThatApplied
        array of ALL rules in rule list that could have made the decision
        (maybe multiple rules could have matched and had sufficient priority,
          and the rule that the tool actually acted on in indeterminate
          so, there is no way to know for sure which single rule was 'decisive'
          any anyway, if one rule caused the tool to decide, but if we removed that rule, another would make the same decision, we want to know about it
        )
        does NOT include rules that match but were overridden by something at higher priority
        (can get those by doing doesRuleApplyToTI over all rules in list)
      // OBSOLETE ruleHostScopesThatAffected - can be undefined if no rules affected
      // OBSOLETE configItemsThatAffected - can be undefined if no rules affected
      hdrModsThatAffected - only for browser hdrMod decisions - copy of hdr mods per config items (concatenate if there are multiple rules that applied)
      minPriorityOfRuleThatWasTestedAndMatched - can be undefined if no rules affected
    outcome
      the observed outcome of the transaction, without regard to what the 'decision' was or should have been
      DO NOT use this term in decision logic - reserve the word 'outcome' for ex-post observed result of the transaction
      determined based on observed completion messages or error codes
      outcome for hdrMods - no way to determine in dNR - in webRequest, could compare headers in onBeforeSendHeaders/onHeadersReceived
        vs the headers in onCompleted, but this will not be available in dNR
      should not infer whether the outcome resulted from a tool's decision unless that can be definitively determined
      so, at a minimum, outcomes will be 'succeeded' or 'failed'
      for browser, can also have a 'blocked' outcome, because error messagse will deterministically indicate that reason for failure

  'DecisionInfo' states that can be achieved
    <undefined>  - the whole object may be undefined if the tool never executed for some reason
                 - e.g., if browser never reaches the point of making a JS decision because the request was blocked
    wasTested: false    result: <default policy>
    wasTested: true     result: <default policy>  ruleTypesThatAffected: undefined  configItemsThatAffected: undefined
    wasTested: true     result: rule action       ruleTypesThatAffected: 'anyhost' | 'specific' | 'both'    configItemsThatAffected:  \n-delimited list


    
*/





// Action* are types for possible input values in config items
export type ActionAllowDenyNA = 'allow' | 'deny' | 'NA'   // for browser request, pihole, lsnitch and squid allow/deny
export type ActionDenyNA      =           'deny' | 'NA'   // for js blocking
export type ActionModifyNA = 'modify' | 'NA'        // for general request header mods
export type ActionSquidSSL    = 'bump' | 'splice' | 'terminate'  // for squid SSL
// ADDITIONAL TYPES FOR DNR OPTIONS NOT SUPPORTED YET
export type ActionAllowAllReqsAllowDenyNA = 'allowAllReqs' | 'allow' | 'deny' | 'NA'
export type ActionRedirectNA = 'redirect' | 'NA'



// types to restriction DecisionInfo type values for specific tools
export type DecisionTypeBrowser = 'browser'
export type DecisionTypeBrowserWebRequest = 'browser_webReq_request' | 'browser_webReq_js' | 'browser_webReq_reqHdrMod' | 'browser_webReq_resHdrMod'
export type DecisionTypePihole = 'pihole_query'
export type DecisionTypeLsnitch = 'lsnitch_connection'
export type DecisionTypeSquid = 'squid_connection' | 'squid_ssl'
export type DecisionType = DecisionTypeBrowser | DecisionTypeBrowserWebRequest | DecisionTypePihole | DecisionTypeLsnitch | DecisionTypeSquid

// possible decision result values
export type DecisionResultsAllowDeny = 'allow' | 'deny'
export type DecisionResultsHdrMod = 'modify' | 'none'
export type DecisionResultsSquidSSL = 'bump' | 'splice' | 'terminate'
// ADDITIONAL TYPES FOR DNR OPTIONS NOT SUPPORTED YET
export type DecisionResultsAllowAllReqsAllowDenyRedirect = 'allowAllReqs' | 'allow' | 'deny' | 'redirect'
export type DecisionResultsAll = DecisionResultsAllowDeny | DecisionResultsHdrMod | DecisionResultsSquidSSL | DecisionResultsAllowAllReqsAllowDenyRedirect

export type DomainPatternSpecificity = 'undefined' | 'exact' | 'leadingdot' | 'regex' | '.*'
export const DomainPatternSpecificityRanking: {[index: string]: number} = {
  // lower values will be sorted higher in array of rulesThatApplied
  exact: 0,
  leadingdot: 1,
  regex: 2,
  '.*': 3
}

// OBSOLETE export type RuleHostScopes = 'anyhost' | 'specific' | 'both' | undefined

export interface DecisionInfoBase {
  wasTested: boolean
  // OBSOLETE ruleHostScopesThatAffected: RuleHostScopes
  // OBSOLETE - can derive from rulesThatapplied  configItemsThatAffected: string | undefined   // \n separated list of config ids
  // OBSOLETE                                           // with no trailing \n (so we can do .split)
  minPriorityOfRuleThatWasTestedAndMatched: number | undefined
}


// for now, will combine dNR request decision and header mod decision into one result 
export interface DecisionInfoBrowser extends DecisionInfoBase {
  type: 'browser'
  resultRequest: DecisionResultsAllowAllReqsAllowDenyRedirect
  resultJS: DecisionResultsAllowDeny
  resultHdrMod: DecisionResultsHdrMod
  rulesThatAppliedRequest: { specificity: DomainPatternSpecificity, rule: ConfigRuleBrowserDNR}[]
  rulesThatApplieJS: { specificity: DomainPatternSpecificity, rule: ConfigRuleBrowserDNR}[]
  rulesThatAppliedHdrMod: { specificity: DomainPatternSpecificity, rule: ConfigRuleBrowserDNR}[]

  // split into request, redirect, hdrmod types?
}

export interface DecisionInfoBrowserRequestWebRequest extends DecisionInfoBase {
  type: 'browser_webReq_request'
  result: DecisionResultsAllowDeny
}
export interface DecisionInfoBrowserJSWebRequest extends DecisionInfoBase {
  type: 'browser_webReq_js'
  result: DecisionResultsAllowDeny  // note that 'deny' is the only possible result from a js rule that matches
                            // however, 'allow' is the default policy
}
export interface DecisionInfoBrowserReqHdrModWebRequest extends DecisionInfoBase {
  type: 'browser_webReq_reqHdrMod',
  result: DecisionResultsHdrMod
  reqHdrMods: string | undefined // items from rule reqHdrMods that actually altered the request
                    // i.e., only for individual mods not prevented because a higher-priority rule
                    // did something else
}
export interface DecisionInfoBrowserResHdrModWebRequest extends DecisionInfoBase {
  type: 'browser_webReq_resHdrMod',
  result: DecisionResultsHdrMod
  resHdrMods: string | undefined   // items from rule resHdrMods that actually altered the request
                    // i.e., only for individual mods not prevented because a higher-priority rule
                    // did something else
}

// OBSOLETE - NOW USING 'SPECIFICITY'   // 'none' indicates that no rule matched
// OBSOLETE - NOW USING 'SPECIFICITY'   // '.*' means matched a '.*' regex pattern
// OBSOLETE - NOW USING 'SPECIFICITY'   // 'exact' means decision was based on a rule with an exact domain pattern (with or without ;invert)
// OBSOLETE - NOW USING 'SPECIFICITY'   // 'other' means decision was based on rule with some other kind of pattern
// OBSOLETE - NOW USING 'SPECIFICITY'   export type PHPatternMatchType = 'none' | DomainPatternSpecificity // OBSOLETE  '.*' | 'exact' | 'domain pattern'

export interface DecisionInfoPiholeQuery extends DecisionInfoBase {
  type: 'pihole_query'
  result: DecisionResultsAllowDeny
  rulesThatApplied: { specificity: DomainPatternSpecificity, rule: ConfigRulePihole }[]
  // contradicted - if >0 rules applied, other rules that match but would make different decision
  rulesContradicted: { specificity: DomainPatternSpecificity, rule: ConfigRulePihole }[]
  // OBSOLETE ruleDomainRegexPattern: string | undefined
  // OBSOLETE matchType: PHPatternMatchType
}
export interface DecisionInfoLsnitchConnection extends DecisionInfoBase {
  type: 'lsnitch_connection'
  result: DecisionResultsAllowDeny
  rulesThatApplied: { specificity: DomainPatternSpecificity, rule: ConfigRuleLSnitch}[]

}
export interface DecisionVSquidConnection extends DecisionInfoBase {
  type: 'squid_connection'
  result: DecisionResultsAllowDeny
  rulesThatApplied: { specificity: DomainPatternSpecificity, rule: ConfigRuleSquid}[]
}
export interface DecisionInfoSquidSSL extends DecisionInfoBase {
  type: 'squid_ssl'
  result: DecisionResultsSquidSSL
  rulesThatApplied: { specificity: DomainPatternSpecificity, rule: ConfigRuleSquid}[]
}
export type DecisionInfo = DecisionInfoBrowser | DecisionInfoBrowserRequestWebRequest | DecisionInfoBrowserJSWebRequest | DecisionInfoPiholeQuery | DecisionInfoLsnitchConnection | DecisionVSquidConnection | DecisionInfoSquidSSL



export interface ItemRaw { 
    // id = needs to be named '_id' to conform to TIBase (because ConfigItemRaws will be used to populate ConfigIs)
    //  see notes in table items base.ts
    _id: string  // initialized in constructor
    // whether modified since last save to a config file on server
    // set to true at construction
    // only set to false when successfully saved to disk
    // note: this is declared in TII and TIG as well, because the same concept applies more generally
    // to TTables and TTable items (although, at this writing, we only support saving for Config)
    modified: boolean
    timestamp: number // time of last modification

    // whether this is a temporary item
    // will be false for any item created in TTableConfig
    // will be true for any item created by popup, TTablePH action to create temp rule, etc.
    // cannot be changed once created
    readonly tempItem: boolean

}



export interface ConfigItemRaw extends ItemRaw {
    [index: string]: any

    tool_browser: boolean
    // OBSOLETE tool_browser_webRequest: boolean
    tool_pihole: boolean
    tool_lsnitch: boolean
    tool_squid: boolean


    // expiration time - only applicable for temp items
    // value is number of milliseconds since epoch, consistent with what Date.now() returns
    // a value of 0 means no expiration
    // THIS ONE IS NOT READONLY, SO THAT svr.ts CAN UPDATE IT
    // WHEN EXPIRATION TIME IS EXTENDED FOR AN EXISTING ITEM
    expirationTime: number



    // informational props
    readonly notes: string  // user defined notes
    

    // THERE WILL ALSO BE PROPS NAMED AFTER TOOLS
    // THEY WILL BE BOOLEAN-VALUED
    // if a config item has a tool prop that is not in tools (see constant above), it will be left alone
    // and if a config item is missing a prop for an entry in tools, it will be added on load into viewer


    // settings for what to do if match this item
      readonly priority: string // store as string, so that gui components can handle it like other properties that are all string-valued
      // positive integer, higher values override any lower-valued rules
      // XXX and XXX will be translated to 'regular' and 'high' for little snitch rules
      // validation will check for invalid values in a single rule, and across rules
      readonly requestAction: ActionAllowDenyNA  // whether to block or allow request
      readonly jsAction: ActionDenyNA  // whether to block javascript execution - note that 'allow' is not an option here
      // since extension can only block js, but it cannot force it to be allowed if 
      // something else sets a CSP header to block it
      readonly reqHdrAction: ActionModifyNA
      readonly resHdrAction: ActionModifyNA
      readonly sslbumpAction: ActionSquidSSL
      readonly reqHdrMods: string
      readonly resHdrMods: string

      // matching criteria
      readonly urlRegexPattern: string  // regex tested against full URL
                // only a single value allowed
                // only allowed for browser and squid (will be the 'regexFilter' prop in decNetReq), must be empty for other tools
      readonly hostDomainPatterns: string  // patterns tested against hostname part of URL
      // can be comma-space separated list (both comma and space, for readability)
      // NOTE: CAN ALSO INCLUDE \n BETWEEN ENTRIES - THESE WILL BE REMOVED AND IGNORED BEFORE OTHER PARSING
      // three possible forms:
      //  (1) if valid as a plain domain name, only matches if full URL hostname matches
      //  (2) if has a leading '.' plus a valid domain name, matches if hostname is that domain or a subdomain
      //  (3) otherwise, taken as a general regex pattern that will be tested against hostname
      // THESE WILL BE TRANSLATED INTO PATTERNS APPROPRIATE FOR USE IN EACH TOOL


      // browser only
      readonly initiatorDomains: string   
      readonly excludedInitiatorDomains: string

      // next several are for browser and maybe squid when we implement that
      readonly excludedRequestDomains: string    // for browser - zero, one or more domains - if request matches one, rule will NOT match -
      readonly requestMethods: string // can be one or more of RequestMethods
      readonly excludedRequestMethods: string 
      readonly resourceTypes: string // can be one or more of ResourceTypes
      readonly excludedResourceTypes: string
      readonly tabIds: string  // one or more tabIds
      readonly excludedTabIds: string

      // little snitch, and maybe squid or router if we implement in future
      readonly remoteAddresses: string

      // props below are only for little snitch, hence the 'ls' prefix
      readonly lsprocess: string 
      readonly lsvia: string
      readonly lsremote: 'any' | 'local-net' | 'multicast' | 'broadcast' | 'bonjour' | 'dns-servers' | 'bpf'
      readonly lsdirection: 'incoming' | 'outgoing'
      readonly lsdisabled: boolean
      readonly lsports: string 
      readonly lsprotocol: 'any' | 'icmp' | 'tcp' | 'udp'


}

// returns a new ConfigItemRaw, with props set to default values
// except argument with optional props equal to ConfigItemRaw props, replaces default value for any that are provided
// NOTE if item passed in already has tool_ props,
// they are populated in the new item
// tools arguments will ADD/MODIFY
// makingNonTempFromTemp and newNotes arguments are optional
//   they handle the special case of server creating a nonTemp item from an existing temp item
export function makeNewConfigItemRaw(
  props: Omit<Partial<ConfigItemRaw>, '_id'>,
  makingNonTempFromTemp?: boolean,
  newNotes?: string
): ConfigItemRaw {
  const result: ConfigItemRaw = {
    _id: uuidv4(),
    modified: true,
    timestamp: Date.now(),
    tempItem: false,

    tool_browser: false,
    // OBSOLETE tool_browser_webRequest: false,
    tool_lsnitch: false,
    tool_pihole: false,
    tool_squid: false,
    expirationTime: 0,
    notes: '',
    priority: '100',
    requestAction: 'deny',
    jsAction: 'NA',
    reqHdrAction: 'NA',
    resHdrAction: 'NA',
    sslbumpAction:'bump',
    reqHdrMods: '',
    resHdrMods: '',
    urlRegexPattern: '',
    hostDomainPatterns: '',
    initiatorDomains: '',
    excludedInitiatorDomains: '',
    excludedRequestDomains: '',
    requestMethods: '',
    excludedRequestMethods: '',
    resourceTypes: '',
    excludedResourceTypes: '',
    tabIds: '',
    excludedTabIds: '',
    remoteAddresses: '',
    lsprocess: '',
    lsvia: '',
    lsremote: 'any',
    lsdirection: 'outgoing',
    lsdisabled: false,
    lsports: '',
    lsprotocol:'any'
  }
  Object.assign(result, props)
  if (makingNonTempFromTemp) {
    Object.assign(result, { tempItem: false } )
    if (newNotes !== undefined) Object.assign(result, { notes: newNotes } )
  }
  return result
}


export interface SetMDRaw {
  id: string
  timestamp: number
  modified: boolean
  notes: string
  lastIdSaved: string  // md.id when last saved to disk
                // in SetMDClass to 'modified' is calculated as id !== lastIdSaved
                // rather than by checking the set's children modified props
                // (because if something modifies a set's children,
                // the calculated value for md.id will be updated to reflect that)
                // this is redundant state for cases where children have had props modified, because those
                // children will have their modified set to true,
                // but in the case where a child is removed, the remaining childrens' modified props will
                // not reflect that there has been a change to the set
}

export function makeNewSetMDRaw(props: Partial<SetMDClass>): SetMDRaw {
  const result: SetMDRaw = {
    id: '<from makeNewSetMDRaw>',
    timestamp: 0,
    modified: true,
    notes: '<from makeNewSetMDRaw',
    lastIdSaved: '<from makeNewSetMDRaw>'
  }
  // props may include other properties of SetMDClass, but only populate the explicit props of SetMDRaw
  if (props.id !== undefined) result.id = props.id
  if (props.timestamp !== undefined) result.timestamp = props.timestamp
  if (props.modified !== undefined) result.modified = props.modified
  if (props.notes !== undefined) result.notes = props.notes
  if (props.lastIdSaved !== undefined) result.lastIdSaved = props.lastIdSaved

  return result
}

export function makeMDDisplayStringFromMDRaw(md: SetMDRaw): string {
  return `${md.id.slice(0,3)}... ${new Date(md.timestamp).toISOString().slice(0,19)} - ${md.notes} ${md.modified ? '- MODIFIED' : ''}`
}

export function makeFilenameStringFromMD(md: SetMDRaw | SetMDClass): string {
  return `${new Date(md.timestamp).toISOString().slice(0,19) }${md.id.slice(0,3)}... - ${md.notes}`
}


export interface SetRaw {
  md: SetMDRaw
  children: ItemRaw[]
  timestampLastArrayMod: number
}

export interface ConfigSetRaw extends SetRaw {
  children: ConfigItemRaw[]
}


// if modifiedAtCreation argument is false,
// md.id will be set equal to what md5 returns for an empty set of items
// otherwise, force md.modified to true
export function makeNewSetRaw(notes: string, modifiedAtCreation: boolean): SetRaw {
  const result: SetRaw = {
    md: makeNewSetMDRaw({ notes: notes}),
    children: [],
    timestampLastArrayMod: 0
  }
  if (modifiedAtCreation === false) {
    result.md.id = md5('')
    result.md.modified = false
  }
  else result.md.modified = true
  return result
}


export function resetModifiedOnSetRaw(set: SetRaw) {
  set.md.modified = false
  set.md.lastIdSaved = set.md.id
  for (let c of set.children) c.modified = false
}


export class SetMDClass implements SetMDRaw {
  idAndTimestampOnlyForNonTemp: boolean
  parentSet: SetClass

  // computed values only consider nonTemp items unless idAndTimestampOnlyForNonTemp is false
  // also define setters that do nothing, so that we can assign MDRaw's to MDClasses when restoring a SetClass from a raw object
  get id(): string {
    return md5(this.parentSet.children.filter(i => ((this.idAndTimestampOnlyForNonTemp === false) || (i.tempItem === false))).map(i => i._id).join())
  }
  set id(newValue: string) {}  // do nothing, this is supposed to be read-only
  get timestamp(): number { 
    return Math.max(
        this.parentSet.children.filter(i => ((this.idAndTimestampOnlyForNonTemp === false) || (i.tempItem === false))).map(i => i.timestamp).reduce((prev, curr)=>Math.max(prev, curr), 0),
        this.parentSet.timestampLastArrayMod
    )
  }
  set timestamp(newValue: number) {}
  get modified(): boolean {
    // calculated based on lastIdSaved vs. id - see notes above in SetMDRaw definition
    return (this.lastIdSaved !== this.parentSet.md.id)
  }
  set modified(newValue: boolean) {}

  notes: string
  lastIdSaved: string = '<at SetMDClass construction>'

  constructor(parentSet: SetClass, notes: string, lastIdSaved: string, idAndTimestampOnlyForNonTemp: boolean) {
    this.idAndTimestampOnlyForNonTemp = idAndTimestampOnlyForNonTemp
    this.parentSet = parentSet
    this.notes = notes
    this.lastIdSaved = lastIdSaved
  }

  exportMDRaw(): SetMDRaw {
    return {
      id: this.id,
      timestamp: this.timestamp,
      modified: this.modified,
      notes: this.notes,
      lastIdSaved: this.lastIdSaved
    }
  }

  makeMDDisplayString(): string {
    const tnumber = this.timestamp
    const tString = new Date(this.timestamp).toISOString().slice(0,19)
    return `${this.id.slice(0,4)}... ${new Date(this.timestamp).toISOString().slice(0,19)} - ${this.notes} ${this.modified ? '- MODIFIED' : ''}`
  }
  

}


export class SetClass implements SetRaw {
  md: SetMDClass
  children: ItemRaw[]
  timestampLastArrayMod: number = 0

  constructor(setRaw: SetRaw, idAndTimestampOnlyForNonTemp: boolean) {
    this.md = new SetMDClass(this, setRaw.md.notes, setRaw.md.lastIdSaved, idAndTimestampOnlyForNonTemp)
    this.children = setRaw.children
  }

  // note: function is static so that subclass (TIG) can call it by same name
  // (since TIG only implements this class, not extends)
  static resetModified(set: SetClass) {
    // reset children .modified
    for (let c of set.children) c.modified = false
    // set lastIdSaved to current id value md.modified will be calculated
    set.md.lastIdSaved = set.md.id
  }

  // note: function is static so that subclass (TIG) can call it by same name
  // (since TIG only implements this class, not extends)
  static exportSetRaw(set: SetClass, tempNonTemp: 'temp' | 'nonTemp' | 'both', itemExporter: (i: ItemRaw)=>ItemRaw): SetRaw {
    var childrenToExport: ItemRaw[]
    switch (tempNonTemp) {
      case 'temp':
        childrenToExport = set.children.filter(i => (i.tempItem === true)).map(i => itemExporter(i))
        break
      case 'nonTemp':
        childrenToExport = set.children.filter(i => (i.tempItem === false)).map(i => itemExporter(i))
        break
      case 'both':
        childrenToExport = set.children.map(i => itemExporter(i))
        break
    }
  
    const result: SetRaw = {
      md: set.md.exportMDRaw(),
      children: childrenToExport,
      timestampLastArrayMod: set.timestampLastArrayMod
    }
    return result
  }
}


export class ConfigSetClass extends SetClass {
  children: ConfigItemRaw[] = []

  constructor(configSetRaw: ConfigSetRaw, idAndTimestampOnlyForNonTemp: boolean) {
    super(configSetRaw, idAndTimestampOnlyForNonTemp)
    // need to do this here even though parent constructor assigns children,
    // because the initializer in this class is applied after the super call
    this.children = configSetRaw.children
  }
}





export class ConfigRuleBase {
  configItemId: string = uuidv4()   // id of config item that produced this
  readonly configItemNotes: string = ''
  readonly tempRule: boolean = false   // whether created by a temp or nonTemp configItem
  readonly hostnameScope: 'anyhost' | 'specific' = 'anyhost'  // whether this rule matches any hostname in the request, or has criteria for which hostname to match

  constructor(props: Partial<ConfigRuleBase>) {
    Object.assign(this, props)
  }
}



export class ConfigRuleBrowserDNR extends ConfigRuleBase {

  readonly decisionType: DecisionTypeBrowser = 'browser'

  // props in chrome.declarativeNetRequest.Rule
  // flattened - a_ goes in action sub-object, c_ goes in condition sub_object
  readonly id: number = 0
  readonly priority: number = 5

  readonly a_type: chrome.declarativeNetRequest.RuleActionType = 'block' as chrome.declarativeNetRequest.RuleActionType
  readonly a_redirect?: chrome.declarativeNetRequest.Redirect
  readonly a_requestHeaders?: chrome.declarativeNetRequest.ModifyHeaderInfo[]
  readonly a_responseHeaders?: chrome.declarativeNetRequest.ModifyHeaderInfo[]

  // DO NOT DEFINE - CURRENTLY WE DON'T USE THIS    readonly c_domainType?  : chrome.declarativeNetRequest.DomainType

  readonly c_regexFilter?  : string
  // DO NOT DEFINE - CURRENTLY WE DON'T USE THIS    readonly c_urlFilter?  : string

  readonly c_initiatorDomains?  : string[]
  readonly c_excludedInitiatorDomains?  : string[]

  readonly c_requestDomains?  : string[]
  readonly c_excludedRequestDomains?  : string[]

  readonly c_requestMethods?  : chrome.declarativeNetRequest.RequestMethod[]
  readonly c_excludedRequestMethods?  : chrome.declarativeNetRequest.RequestMethod[]

  readonly c_resourceTypes?  : chrome.declarativeNetRequest.ResourceType[]
  readonly c_excludedResourceTypes?  : chrome.declarativeNetRequest.ResourceType[]

  readonly c_tabIds?  : number[]
  readonly c_excludedTabIds?  : number[]


  constructor(props: Partial<ConfigRuleBrowserDNR>) {
    super(props)
    Object.assign(this, props)
  }
}

// OBSOLETE   export class ConfigRuleBrowserWebRequestBase extends ConfigRuleBase {
// OBSOLETE     readonly priority: number = 5
// OBSOLETE   
// OBSOLETE     // matching criteria
// OBSOLETE     // note - these are all optional
// OBSOLETE     // if undefined (either because not created, or populated with value of undefined)
// OBSOLETE     // we will treat this as 'no criterion'
// OBSOLETE     // exclusionary criteria - rule does NOT apply if CR props match any of these
// OBSOLETE     readonly excludedDomains?: string
// OBSOLETE     readonly excludedRequestMethods?: string
// OBSOLETE     readonly excludedResourceTypes?: string
// OBSOLETE     readonly excludedTabIds?: string
// OBSOLETE     // affirmative criteria - rule applies ONLY IF CR props match all of these
// OBSOLETE     readonly urlRegex?: RegExp   //  browser will convert to RegExp and test against entire URL
// OBSOLETE     readonly hostnameRegex?: RegExp // browser will convert to RegExp and test against hostname part of URL
// OBSOLETE                                     // (so it is up to the makeRule method whether to generate this pattern 
// OBSOLETE                                     // so as to match the entire hostname or just part of it)
// OBSOLETE     readonly initiatorRegex?: RegExp  // browser will convert to RegExp and test against WebRequest initiator
// OBSOLETE     // here too, it is up to makeRule to construct the pattern accordingly
// OBSOLETE     readonly requestMethods?: string  
// OBSOLETE     readonly resourceTypes?: string
// OBSOLETE     readonly tabIds?: string
// OBSOLETE   
// OBSOLETE     constructor(props: Partial<ConfigRuleBrowserWebRequestBase>) {
// OBSOLETE       // base class constructor does Object.assign - will populate all props
// OBSOLETE       super(props)
// OBSOLETE       Object.assign(this, props)
// OBSOLETE     }
// OBSOLETE               
// OBSOLETE   }
// OBSOLETE   
// OBSOLETE   
// OBSOLETE   export class ConfigRuleBrowserWebRequestRequest extends ConfigRuleBrowserWebRequestBase {
// OBSOLETE     readonly decisionType: 'browser_webReq_request' = 'browser_webReq_request'
// OBSOLETE     readonly requestAction: DecisionResultsAllowDeny = 'deny'
// OBSOLETE     constructor(props: Partial<ConfigRuleBrowserWebRequestRequest>) {
// OBSOLETE       // base class constructor does Object.assign - will populate all props
// OBSOLETE       super(props)
// OBSOLETE       Object.assign(this, props)
// OBSOLETE     }
// OBSOLETE   
// OBSOLETE   }
// OBSOLETE   export class ConfigRuleBrowserWebRequestJS extends ConfigRuleBrowserWebRequestBase {
// OBSOLETE     readonly decisionType: 'browser_webReq_js' = 'browser_webReq_js'
// OBSOLETE     readonly jsAction: DecisionResultsAllowDeny = 'deny'
// OBSOLETE     constructor(props: Partial<ConfigRuleBrowserWebRequestJS>) {
// OBSOLETE       // base class constructor does Object.assign - will populate all props
// OBSOLETE       super(props)
// OBSOLETE       Object.assign(this, props)
// OBSOLETE     }
// OBSOLETE   }
// OBSOLETE   export class ConfigRuleBrowserWebRequestReqHdrMod extends ConfigRuleBrowserWebRequestBase {
// OBSOLETE     readonly decisionType: 'browser_webReq_reqHdrMod' = 'browser_webReq_reqHdrMod'
// OBSOLETE     readonly reqHdrAction: DecisionResultsHdrMod = 'none'
// OBSOLETE     readonly reqHdrMods: string = ''
// OBSOLETE     constructor(props: Partial<ConfigRuleBrowserWebRequestReqHdrMod>) {
// OBSOLETE       // base class constructor does Object.assign - will populate all props
// OBSOLETE       super(props)
// OBSOLETE       Object.assign(this, props)
// OBSOLETE     }
// OBSOLETE   }
// OBSOLETE   export class ConfigRuleBrowserWebRequestResHdrMod extends ConfigRuleBrowserWebRequestBase {
// OBSOLETE     readonly decisionType: 'browser_webReq_resHdrMod' = 'browser_webReq_resHdrMod'
// OBSOLETE     readonly resHdrAction: DecisionResultsHdrMod = 'none'
// OBSOLETE     readonly resHdrMods: string = ''
// OBSOLETE     constructor(props: Partial<ConfigRuleBrowserWebRequestResHdrMod>) {
// OBSOLETE       // base class constructor does Object.assign - will populate all props
// OBSOLETE       super(props)
// OBSOLETE       Object.assign(this, props)
// OBSOLETE     }
// OBSOLETE   }
// OBSOLETE   
// OBSOLETE   export type ConfigRuleBrowserWebRequest = ConfigRuleBrowserWebRequestRequest | ConfigRuleBrowserWebRequestJS | ConfigRuleBrowserWebRequestReqHdrMod | ConfigRuleBrowserWebRequestResHdrMod

export interface CRPropsToTestVsRuleBrowser {
  url: string
  initiator: string | undefined
  method: string      
  resourceType: string
  tabId: string       
}

export const configItemNotesPropPrefix = 'configItem_id '

export class ConfigRuleLSnitch extends ConfigRuleBase {
  // object corresponding to one rule for Little Snitch
  // property names match those found in little snitch's rule import/export json
  // so that these can be directly imported
  readonly requestAction      : DecisionResultsAllowDeny = 'deny'
  readonly 'remote-addresses'?: string
  readonly 'remote-hosts'    ?: string | string[]
  readonly 'remote-domains'  ?: string | string[]
  readonly process           ?: string                     // can be 'any'
  readonly via               ?: string             // optional
  readonly remote            ?: 'any' | 'local-net' | 'multicast' | 'broadcast' | 'bonjour' | 'dns-servers' | 'bpf'
  readonly direction         ?: 'incoming' | 'outgoing'
  readonly priority          ?: 'regular' | 'high'
  readonly disabled          ?: boolean
  readonly ports             ?: string
  readonly protocol          ?: 'any' | 'icmp' | 'tcp' | 'udp'   // other values also possible in little snitch - see /etc/protocols for names
  readonly creationDate      ?: number
  readonly modificationDate  ?: number
  readonly notes             ?: string
  readonly group             ?: string
  constructor(props: Partial<ConfigRuleLSnitch>) {
    // base class constructor does Object.assign - will populate all props
    super(props)
    Object.assign(this, props)
  }
}

export interface CRPropsToTestVsRuleLSnitch {
  // subset of ConfigRuleLSnitch - contains the props that should be pulled from a CR to check whether it matches a rule
  'remote-addresses'?: string
  'remote-hosts'    ?: string
  process           ?: string                     // can be 'any'
  via               ?: string             // optional
  remote            ?: 'any' | 'local-net' | 'multicast' | 'broadcast' | 'bonjour' | 'dns-servers' | 'bpf'
  direction         ?: 'incoming' | 'outgoing'
  ports             ?: string
  protocol          ?: 'any' | 'icmp' | 'tcp' | 'udp'   // other values also possible in little snitch - see /etc/protocols for names
}


// pihole is configured with two files, one for blacklist and one for whitelist
// each file is simply a list of regex patterns
// in this application, we will work with arrays of pihole rules that include both blacklist and whitelist items,
// so each item needs a prop to indicate black/white
// the array will be split into two separate files at the final step of applying them to the actual pihole server
export class ConfigRulePihole extends ConfigRuleBase {
  readonly configItemNotes: string = '' // notes prop of config item that produced this rule
  readonly priority: number = 100
  readonly domainRegexPattern: string = ''
  readonly requestAction:      DecisionResultsAllowDeny = 'deny'     // 'allow' rule will go in whitelist, 'deny' will go in blacklist
  // OBSOLETE readonly hosts: string[] = []  // array of hosts for which this rule is active
  constructor(props: Partial<ConfigRulePihole>) {
    super(props)
    Object.assign(this, props)
  }
}

export interface PHPropsToTestVsRulePihole {
  domain: string
}

export interface ConfigRuleSquid extends ConfigRuleBase {
  // object which can be loaded by squid.conf
  domainRegexPattern: string
  requestAction: DecisionResultsAllowDeny
}

export interface CRPropsToTestVsRuleSquid {
  url: string
}



export interface Tool<ConfigRuleType, CRPropType, DecisionTypeType, DecisionResultType> {
  mask: number    // bitmask to OR in validation result if invalid
  props: {        // object indexed by config item prop name, will have an entry for each prop in ConfigItemRaw
    // 1) each entry in props must be named for an item in ConfigItemRaw
    // 2) THERE MUST BE AN ENTRY FOR EVERY PROP IN CONFIGITEMRAW, EVEN IF IT IS ORTHOGONAL TO THIS TOOL (val and active can return true always, but it must exist)
    [index: string]: {
      val: (propValue: any) => boolean   // whether propValue is valid for this tool
      active: (item: ConfigItemRaw) => boolean  // whether prop is 'active' for this tool
    }
  }
  // takes an entire config item and validates for problems across props
  // returns '' if no problems, otherwise a string to populate addedPropValDetails
  // NOTE: this will NOT do the validation checks on individual props - those must be done separately
  valItemCrossProp: (item: ConfigItemRaw ) => string
  // validates individual props AND across props 
  valItemAsAWhole: (props: {[index: string]: { val: (propValue: any) => boolean } }, valItemCrossProp: (item: ConfigItemRaw ) => string, item: ConfigItemRaw ) =>  boolean
  valAcrossItems: (items: ConfigItemRaw[]) => boolean
  // takes one config item and produces an array of rules appropriate to apply to this tool
  makeRulesFromConfigItem: (item: ConfigItemRaw, decisionType: DecisionTypeType) => ConfigRuleType[]
  // takes an array of config items and produces an array of rules
  // returns undefined if an item passed in is invalid 
  //   in theory this should never happen bacause the user should be pevented from committing rules that are invalid,
  //   but this is a second line of defense
  // sorts them as needed, for application downstream
  // produces rules from only the temp items, only the nonTemp, or both, according to tempNonTemp argument
  //  e.g., for browser, sorts in order of decreasing priority, so that getDecision can skip checking lower priority rules once a higher priority rule has matched
  makeRuleListFromConfigItems: (items: ConfigItemRaw[], /* OBSOLETE host: string, */ decisionType: DecisionTypeType, tempNonTemp: 'temp' | 'nonTemp' | 'both') => ConfigRuleType[] | undefined
  // declaration to allow different arg types by tool type - this is ugly but don't know how to do it better...
  // specific tools will type this only for their type of crProps
  doesRuleApplyToTI: (crProps: CRPropType, rule: ConfigRuleType) => boolean
  getDecision: (crProps: CRPropType, ruleList: ConfigRuleType[], decisionType: DecisionTypeType, minPriorityToTest: number) => DecisionResultType
}






export const tools: {
  [index: string]: any
  tool_browser: Tool<ConfigRuleBrowserDNR, CRPropsToTestVsRuleBrowser, DecisionTypeBrowser, DecisionInfoBrowser>
  tool_lsnitch: Tool<ConfigRuleLSnitch, CRPropsToTestVsRuleLSnitch, DecisionTypeLsnitch, DecisionInfoLsnitchConnection>
  tool_pihole:  Tool<ConfigRulePihole, PHPropsToTestVsRulePihole, DecisionTypePihole, DecisionInfoPiholeQuery>
  tool_squid:   Tool<ConfigRuleSquid, CRPropsToTestVsRuleSquid, DecisionTypeSquid, DecisionVSquidConnection | DecisionInfoSquidSSL> 
} = {
  tool_browser: tool_browser,
  tool_lsnitch: tool_lsnitch,
  tool_pihole: tool_pihole,
  tool_squid: tool_squid,
}

