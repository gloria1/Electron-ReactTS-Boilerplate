

import { ConfigItemRaw, ConfigRulePihole, PHPropsToTestVsRulePihole, DecisionInfoPiholeQuery, DecisionTypePihole, Tool, DomainPatternSpecificityRanking, DomainPatternSpecificity } from "./configTypesTypes"
import { defaultActiveForTool, getCommaOrNewlineSeparatedList, isValidHostDomainPatternForPihole, makeRegexPatternFromHostDomainStringForPihole, regexPHPatternDomainExact, regexPHPatternDomainWithLeadingDot, regexPHPatternIncludesInvert, valItemAsAWhole } from "./configTypesUtility"


const cl = console.log
const ct = console.table


// RegExp's to use for parsing pihole.log lines
export const c = '^(.{15}) (dnsmasq\\[.*\\]:) '   // common leading information on every pihole.log line
// OBSOLETE export const s = '( (<decision from inforce>:) (.*) (allow|deny) (.*) (undefined|\\.\\*|exact|leadingdot|regex))?'   // info added by server based on getDecision vs. inforce config
const serverAddedDecisionJSON = '( (<decision from inforce: )(.*)>)?'

// ADD REGEX TO MATCH MATCHNINVERTED AND MATCHTYPE


// format for server added text:
// [pihole log line] <decision from inforce>: [config item id] [allow|deny] ruleDomainRegex: [regex pattern]
export const regexRestartReload                  = new RegExp(c + '(read|exiting|started,|compile|using)')
export const regexForwarded                      = new RegExp(c + '(forwarded) ([^ ]*) (to) ([0-9\\.]+|NODATA[^ ]*)')
export const regexResolution                     = new RegExp(c +                         '(config|.etc.hosts|reply|cached|regex blacklisted|gravity blocked|Apple iCloud Private Relay domain|special domain) ([^ ]*) (from|to|is) (<CNAME>|blocked during CNAME inspection|[0-9\\.]+|<HTTPS>|NODATA[^ ]*|NXDOMAIN|<SVCB>|::)' + serverAddedDecisionJSON)
export const regexForwardedResolution            = new RegExp(c +               '(forwarded|config|.etc.hosts|reply|cached|regex blacklisted|gravity blocked|Apple iCloud Private Relay domain|special domain) ([^ ]*) (from|to|is) (<CNAME>|blocked during CNAME inspection|[0-9\\.]+|<HTTPS>|NODATA[^ ]*|NXDOMAIN|<SVCB>|::)' + serverAddedDecisionJSON)
export const regexQueryForwardedResolution       = new RegExp(c + '(query\\[.*\\]|forwarded|config|.etc.hosts|reply|cached|regex blacklisted|gravity blocked|Apple iCloud Private Relay domain|special domain) ([^ ]*) (from|to|is) (<CNAME>|blocked during CNAME inspection|[0-9\\.]+|<HTTPS>|NODATA[^ ]*|NXDOMAIN|<SVCB>|::)' + serverAddedDecisionJSON)
export const regexResolutionWithIPOnly           = new RegExp(c + '(config|.etc.hosts|reply|cached) ([^ ]*) (is) ([0-9\\.]+|<HTTPS>|NODATA[^ ]*|NXDOMAIN|<SVCB>)' + serverAddedDecisionJSON)
export const regexResolutionWithIPOrBlockedCNAME = new RegExp(c + '(config|.etc.hosts|reply|cached) ([^ ]*) (is) (blocked during CNAME inspection|[0-9\\.]+|<HTTPS>|NODATA[^ ]*|NXDOMAIN|<SVCB>)' + serverAddedDecisionJSON)
export const regexPHLogTimestamp                 = new RegExp(/([\w ]{3}) ([\d ]{2}) ([\d ]{2}):(\d\d):(\d\d).*/)



// these match keywords in response lines in the log
export type PHI2Type = 'query' | 'res' | 'forwarded' | 'restart' | 'unparseable'
export type PHIOutcome = 'allowed' | 'blocked'
export type PHOutcomeTypeBlocked = 'gravity blocked' | 'regex blacklisted' | 'blocked during CNAME inspection' | 'Apple iCloud Private Relay domain' | 'special domain'
export type PHOutcomeTypeAllowed = 'reply' | 'cached' | 'config' | '/etc/hosts'
export type PHOutcomeType = PHOutcomeTypeAllowed | PHOutcomeTypeBlocked
export type PHAllowedResolutionType = 'cname' | 'ipset' | 'allowed but unresolved'   
// 'unresolved' means upstream returned NODATA[^ ]*, NXDOMAIN, <HTTPS>, <SVCB>, etc.


// flat version of all the PHI-specific props
// raw log line parsing function will return one of these
// TTablePH2.parseLVIRaw will take one of these and construct a PHI2 from it
// safari popup will use to populate its gui
// handling of 'decision' and 'outcome'
//  three levels of 'decision' and 'outcome'
//    ifDecision* - decision based on my inforce rules
//    phOutcome* - pihole's final outcome (whether pihole decided to block resolution, or allow attempt to resolve from upstream)
//    resType - type of result pihole received from upstream (if pihole allowed)
//    unresolvedResult - if resType is 'unresolved', the value pihole reported (NODATA, HTTPS, NXDOMAIN, etc)
// note that ifDecision props can only be populated if svr.ts has augmented the log line with <decision from inforce>... 
// so this is called in svr.ts when we only have the actual line from pihole, without the '<decision from inforce>...' added
//   and then recipient of line from server needs to call this again to populate the 'ifDecision*' props

interface PHIRawBase {
  readonly phiType: 'query' | 'forwarded' | 'restart' | 'unparseable' | 'res'
  readonly domain: string
  readonly phLogLine: string
  readonly phTimestamp: string
}

export interface PHIRawQuery extends PHIRawBase {
  readonly phiType: 'query'
  readonly queryType: string
  readonly fromIp: string
}
export interface PHIRawOther extends PHIRawBase {
  readonly phiType: 'forwarded' | 'restart' | 'unparseable'
}
export interface PHIRawRes extends PHIRawBase {
  readonly phiType: 'res'
  // OBSOLETE // info about decision based on my inforce rules - can only populate if server has augmented
  // OBSOLETE // optional, so we can also handle lines with not server added info
  // OBSOLETE // not readonly, so parsePHLogLineRaw can modify PHIRawRes after creating it
  // OBSOLETE ifDecisionConfigItemId?: string
  // OBSOLETE ifDecisionResult?: 'allow' | 'deny'
  // OBSOLETE ifDecisionMatchingRegexPattern?: string
  // OBSOLETE ifDecisionMatchType?: DomainPatternSpecificity
  ifDecision?: DecisionInfoPiholeQuery

  // info about pihole's decision outcome (whether based on inforce rules or other pihole behavior)
  readonly phOutcome: PHIOutcome
  readonly phOutcomeType: PHOutcomeType
  // info about resolution from upstream resolver (if phOutcomeBinary was not 'blocked')
  readonly allowedResType?: PHAllowedResolutionType  // see typing above - only populated if phOutcome is 'allowed' - will be 'cname', 'ipset' or 'unresolved'
  readonly ipset?: string
  readonly unresolvedResult?: string
}
export type PHIRawUnion = PHIRawQuery | PHIRawOther | PHIRawRes



export interface PHIRaw {
  readonly domain: string
  readonly phiType: 'query' | 'res' | 'forwarded' | 'restart' | 'UNPARSEABLE'
  readonly queryType?: string
  readonly fromIp?: string
  // info about decision based on my inforce rules - can only populate if server has augmented
  ifDecisionConfigItemId?: string
  ifDecisionResult?: 'allow' | 'deny'
  ifDecisionMatchingRegexPattern?: string
  ifDecisionMatchType?: DomainPatternSpecificity
  // info about pihole's decision outcome
  readonly phOutcome?: 'allowed' | 'blocked'  // in principle redundant - can be derived from phOutcomeType - but will populate for the benefit of downstream consumers
  readonly phOutcomeType?: PHOutcomeType
  // info about resolution from upstream resolver (if phOutcomeBinary was not 'blocked')
  readonly resType?: PHAllowedResolutionType  // see typing above - only populated if phOutcome is 'allowed' - will be 'cname', 'ipset' or 'unresolved'
  readonly ipset?: string
  readonly unresolvedResult?: string
  readonly logLine: string
}

export function parsePHLogLineRaw(line: string): PHIRawUnion {
  const initialParts = regexRestartReload.exec(line)
  if (initialParts !== null) return { domain: '', phiType: 'restart', phTimestamp: initialParts[1] + ' ' + initialParts[2], phLogLine: line.slice(initialParts[1].length+initialParts[2].length+2)}
  else {
    // will hold regex.exec result - see docs - will be null if no match
    const parts: RegExpExecArray | null = regexQueryForwardedResolution.exec(line)
    // if not a query, forwarded or resolution, return an 'unparseable' PHIRaw  (previouly threw error)
    if (parts === null) {
      return { domain: 'UNPARSEABLE', phiType: 'unparseable', phTimestamp: 'UNKNOWN', phLogLine: line }
      //throw new Error(`pihole log line did not match regex for query | forwarded | resolution:\n   ${line}`)
    }

    else {  
      // parts items (based on regex pattern)
      //  0 - entire match
      //  1 - pihole timestamp
      //  2 - dnsmasq...
      //  3 - keyword
      //  4 - domain
      //  5 - 'is'
      //  6 - ip, '<CNAME>', 'blocked during CNAME inspection, etc.
      //  7 - entire server-added section
      //  8 - '<decision from inforce: '
      //  9 - json of DecisionInfoPiholeQuery object
      // OBSOLETE //  7 - entire server added section
      // OBSOLETE //  8 - <decision from inforce>:
      // OBSOLETE //  9 - config item id (or undefined if none matched)
      // OBSOLETE //  10 - allow|block
      // OBSOLETE //  11 - rule regex pattern that matched (or undefined if none matched)
      // OBSOLETE //  12 - match type (is a PHPatternMatchType)

      const lineWithoutTimestampAndDnsmasq = 
        parts[3] + ' '
        + (parts[4] || '') + ' '
        + (parts[5] || '') + ' '
        + (parts[6] || '') + ' '
        + (parts[9] || '').slice(0, 100) + '...'
        // OBSOLETE   + (parts[8] || '').slice(0,5) + '... '
        // OBSOLETE   + (parts[9] || '').slice(0,4) + '... '
        // OBSOLETE   + (parts[10] || '') + ' '
        // OBSOLETE   + (parts[11] || '') + ' '
        // OBSOLETE   + (parts[12] || '') + ' '
      if (parts[3] === 'forwarded') return { domain: parts[4], phiType: 'forwarded', phTimestamp: parts[1], phLogLine: lineWithoutTimestampAndDnsmasq}  // do nothing with 'forwarded' lines
      else {  // this is a query or a new resolution - try to make a new PHIRaw

        if (parts[3].slice(0,5) === 'query')  {
          return { domain: parts[4], phiType: 'query', queryType: parts[3].slice(6, -1), fromIp: parts[6], phTimestamp: parts[1], phLogLine: lineWithoutTimestampAndDnsmasq }
        }

        else {  // some kind of resolution line
          var newPHIRaw: PHIRawRes | undefined = undefined   // newPHI will be set if we match any known patterns
          // if it remains undefined after passing through below code, will throw error

  // also handle case of blocked during cname inspection
  //    parts[3] will be reply|cached
  //    parts[6] will be 'blocked during cname inspection
  //    ==> want to consider this to be a 
  //          phOutcome = 'blocked'
  //          phOutcomeSource = 'blocked during cname inspection'
  // add case for allowed but no resolution
  // 
          switch (parts[3]) {
            case 'gravity blocked':
            case 'regex blacklisted':
            case 'Apple iCloud Private Relay domain':
            case 'special domain':
              newPHIRaw = { 
                domain: parts[4], 
                phiType: 'res', 
                phOutcome: 'blocked', 
                phOutcomeType: parts[3] as PHOutcomeTypeBlocked, 
                phTimestamp: parts[1], 
                phLogLine: lineWithoutTimestampAndDnsmasq
              }
              break
            case 'reply':
            case 'cached':
            case 'config':
            case '/etc/hosts':
              if (parts[6] === '<CNAME>') {
                newPHIRaw = { 
                  domain: parts[4], 
                  phiType: 'res', 
                  phOutcome: 'allowed', 
                  phOutcomeType: parts[3] as PHOutcomeTypeAllowed, 
                  allowedResType: 'cname', 
                  phTimestamp: parts[1], 
                  phLogLine: lineWithoutTimestampAndDnsmasq
                }
              }
              else if (parts[6] === 'blocked during CNAME inspection') {
                newPHIRaw = {
                  domain: parts[4],
                  phiType: 'res',
                  phOutcome: 'blocked',
                  phOutcomeType: 'blocked during CNAME inspection', 
                  phTimestamp: parts[1], 
                  phLogLine: lineWithoutTimestampAndDnsmasq
                }
              }
              else if (
                (parts[6].slice(0,6) === 'NODATA')
                || (parts[6] === 'NXDOMAIN')
                || (parts[6] === '<SVCB>')
                || (parts[6] === '::')
              ) {
                newPHIRaw = {
                  domain: parts[4],
                  phiType: 'res',
                  phOutcome: 'allowed',
                  phOutcomeType: parts[3],
                  allowedResType: 'allowed but unresolved',
                  unresolvedResult: parts[6], 
                  phTimestamp: parts[1], 
                  phLogLine: lineWithoutTimestampAndDnsmasq
                }
              }
              else {  // this is an IP reply
                newPHIRaw = { 
                  domain: parts[4], 
                  phiType: 'res', 
                  phOutcome: 'allowed', 
                  phOutcomeType: parts[3] as PHOutcomeTypeAllowed, 
                  allowedResType: 'ipset', 
                  ipset: parts[6], 
                  phTimestamp: parts[1], 
                  phLogLine: lineWithoutTimestampAndDnsmasq
                }
              }
              break
            default:   // if did not match any case above, leave newPHI undefined
              break
          }
        }
        // crash if line did not fit in any of the above patterns
        if (newPHIRaw === undefined) {
          throw new Error(`parsePHLogLineRaw does not recognize \n  ${line}`)
        }
        else {  // populate server-added info and return newPHI
          try {
            newPHIRaw.ifDecision = JSON.parse(parts[9])
          }
          catch {
            // do nothing - ifDecision will be left undefined
          }
          // OBSOLETE   newPHIRaw.ifDecisionConfigItemId = parts[9]
          // OBSOLETE   newPHIRaw.ifDecisionResult = parts[10] as 'allow' | 'deny'
          // OBSOLETE   newPHIRaw.ifDecisionMatchingRegexPattern = parts[11]
          // OBSOLETE   newPHIRaw.ifDecisionMatchType = parts[12] as DomainPatternSpecificity
          return newPHIRaw
        }
      }
    }
  }
}

// sorts list of ph rules for makeRules, and svr.ts also uses this
// USES Array.sort - SORTS LIST IN PLACE
// sort order:
//    all allows before denies
//    any .* rules after any non-.* rules
// (latter is not necessary for correct pihole operation, but i want getDecision to report matches to more-specific rules before a .* rule)
// SORTING .* TO BOTTOM OF LIST NOT REALLY NECESSARY 
// AFTER REVISION TO GETDECISION THAT RETURNS ALL RULES THAT APPLY IN SPECIFICITY ORDER
// BUT LEAVE IT IN FOR NOW, DOES NO HARM
export function sortPHRuleList(list: ConfigRulePihole[]) {
      list.sort((a,b)=>{  // return negative if a should be before b, ...
        if (a.requestAction !== b.requestAction) return (a.requestAction === 'allow') ? -1 : 1
        else if (a.domainRegexPattern === '.*') return 1
        else return 0
      })

}


export const tool_pihole: Tool<ConfigRulePihole, PHPropsToTestVsRulePihole, DecisionTypePihole, DecisionInfoPiholeQuery> = {
    mask: 16,
    props: {
      // general
      modified:                       { val: p => true, active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_pihole') },
      timestamp:                       { val: p => true, active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_pihole') },
      tempItem:                       { val: p => true, active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_pihole') },
      expirationTime:                 { val: p => true, active: ()=>false },
      _id:                            { val: p => (/^[A-Za-z0-9-_\.\* ]+$/.test(p)), active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_pihole') },  // may want to allow other characters, but DO NOT allow \n, because this prop will be used to populate the 'configItemsThatAffected...' prop in CR, which will be a groupedAsList... prop where \n delimits multiple values
      notes:                          { val: p => (/['`"]/.test(p) === false), active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_pihole') },
      priority:                       { val: p => p === '100', active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_pihole') },
      // actions - for actions that do not apply to this tool, can tolerate any value
      requestAction:                  { val: p => (p === 'allow' || p === 'deny' ), active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_pihole') },  // cannot be NA for pihole
      jsAction:                       { val: p => true, active: (item: ConfigItemRaw) => false },
      reqHdrAction:                   { val: p => true, active: (item: ConfigItemRaw) => false },
      resHdrAction:                   { val: p => true, active: (item: ConfigItemRaw) => false },
      reqHdrMods:                     { val: p => true, active: (item: ConfigItemRaw) => false },
      resHdrMods:                     { val: p => true, active: (item: ConfigItemRaw) => false },
      sslbumpAction:                  { val: p => true, active: (item: ConfigItemRaw) => false },
      // matching criteria - for criteria that do not apply to this tool, must be empty, or can allow a value that would ALWAYS make sense for this tool (e.g., lsdirection='outgoing' for browser)
      urlRegexPattern:                { val: p => p === '', active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_pihole') },  // must be empty for pihole (if we are using a url pattern rather than a host/domain pattern, we are matching on something more specific than just the hostname, and pihole cannot do that)
      hostDomainPatterns:             { val: p => ((p !== '') && (getCommaOrNewlineSeparatedList(p, isValidHostDomainPatternForPihole) !== undefined)), active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_pihole') },
      initiatorDomains:               { val: p => p === '', active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_pihole') },   // must be empty for pihole
      excludedInitiatorDomains:       { val: p => p === '', active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_pihole') },   // must be empty for pihole
      excludedRequestDomains:         { val: p => p === '', active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_pihole')},
      requestMethods:                 { val: p => p === '', active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_pihole')},
      excludedRequestMethods:         { val: p => p === '', active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_pihole')},
      // for resourceTypes, '<any>' is an acceptable value (but not for excludedResourceTypes)
      resourceTypes:                  { val: p => ((p === '') || (p === '<any>')), active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_pihole')},
      excludedResourceTypes:          { val: p => p === '', active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_pihole')},
      tabIds:                         { val: p => p === '', active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_pihole')},
      excludedTabIds:                 { val: p => p === '', active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_pihole')},
      remoteAddresses:                { val: p => p === '', active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_pihole') },
      lsprocess:                      { val: p => p === '', active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_pihole') },
      lsvia:                          { val: p => p === '', active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_pihole') },
      lsremote:                       { val: p => p === 'any', active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_pihole') },
      lsdirection:                    { val: p => p === 'outgoing', active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_pihole') },
      lsdisabled:                     { val: p => p === false, active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_pihole') },
      lsports:                        { val: p => p === '', active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_pihole') },
      lsprotocol:                     { val: p => p === 'any', active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_pihole') }
    },
    valItemCrossProp: (item: ConfigItemRaw) => {
      // if not active for this tool, just return true - we do not validate against inactive tools
      if (item['tool_pihole'] === false) return ''
      let result = ''
      return result
    },
    valItemAsAWhole: valItemAsAWhole,
    valAcrossItems: (items: ConfigItemRaw[]) => {
      // priorities must all be the same
      const priorities: Set<string> = new Set()
      for (let i of items) {
        if (i['tool_pihole']) priorities.add(i.priority)
      }
      return (priorities.size <= 1)
    },

    makeRulesFromConfigItem: (item: ConfigItemRaw, /* OBSOLETE host: string, */ decisionType: DecisionTypePihole) => {

      // generate one array containing both allow and deny rules (this will be split into separate white vs. black lists when svr.ts applies to actual pihole hosts)
      // ==> downstream logic (svr.ts where we apply to pihole) should remove inactive rules

      const result: ConfigRulePihole[] = []

      const hs = getCommaOrNewlineSeparatedList(item.hostDomainPatterns)
      if (hs === undefined) throw new Error(`hostDomainPatterns does not parse correctly, but should have failed validation before this`)
      for (let h of hs) {
        if (h !== '') {   // disregard any items that are '' - this can happen after split.map.trim above if there was extra whitespace
          // OBSOLETE const hosts: string[] = []
          // OBSOLETE for (let p of Object.getOwnPropertyNames(item)) if (p.slice(0, 5) === 'host_') if (item[p]) hosts.push(p)
          result.push({
            configItemId: item._id,
            tempRule: item.tempItem,
            configItemNotes: item.notes,
            hostnameScope: (h === '.*' ? 'anyhost' : 'specific'),
            priority: Number.parseInt(item.priority),
            requestAction: ((item.requestAction === undefined) || (item.requestAction === 'NA')) ? 'deny' : item.requestAction,
            domainRegexPattern: makeRegexPatternFromHostDomainStringForPihole(h),
            // OBSOLETE hosts: hosts
          })
        }
      }

      //cl(`pihole makeRules returning`)
      //ct(result)

      return result
    },
    makeRuleListFromConfigItems: (items: ConfigItemRaw[], /* OBSOLETE host: string, */ decisionType: DecisionTypePihole, tempNonTemp: 'temp' | 'nonTemp' | 'both') => {
      
      const result: ConfigRulePihole[] = []


      for (let i of items) {
        // skip if not doing this type of item (temp or nonTemp)
        if ((tempNonTemp === 'temp') && (i.tempItem === false)) continue
        if ((tempNonTemp === 'nonTemp') && (i.tempItem === true)) continue
        // skip if this tool is not selected for this rule
        if (i['tool_pihole'] === false) continue
        // skip if host is not 'all' or a selected host for this item
        // OBSOLETE if (host !== 'all') {
        // OBSOLETE   if (i[host] !== true) continue
        // OBSOLETE }
        // if item is invalid, either return an empty rule set, or just skip the item, depending on argument value
        if (tool_pihole.valItemAsAWhole(tool_pihole.props, tool_pihole.valItemCrossProp, i) === false) return undefined
        // if we got this far, make rules from this config item
        result.push(...(tool_pihole.makeRulesFromConfigItem(i, decisionType) as ConfigRulePihole[]))
      }
      // sort result by priority here (all allow rules before all block rules)
      // also sorts .* rules to bottom of allow and deny sections
      sortPHRuleList(result)


      return result
    },
    doesRuleApplyToTI: (crProps: PHPropsToTestVsRulePihole, rule: ConfigRulePihole) => {
      const invert = (/;invert/.test(rule.domainRegexPattern))
      const patternRegex = new RegExp(invert ? rule.domainRegexPattern.slice(0, -7) : rule.domainRegexPattern)
      if (invert === false) return patternRegex.test(crProps.domain)
      else return !patternRegex.test(crProps.domain)
    },
    getDecision: (crProps: PHPropsToTestVsRulePihole, ruleList: ConfigRulePihole[], decisionType: DecisionTypePihole, minPriorityToTest: number) => {
      // getDecision in general:
      //    rulesThatApplied should include all rules that could have applied (may be >1 if they are tied in priority)
      //    rulesThatApplied should be sorted in decreasing order of specificity
      //    there is no implication that most-specific rule is the one that actually decided
      //    this particular request
      //    rulesContradicted shoudl include any rules that would have applied and MADE A DIFFERENT DECISION, 
      //      but were overidden by a higher-priority rule
      // for pihole
      //      pihole allows by default if no rules match
      //      assume rule list is in decreasing priority order (all allows before blocks) by construction from rule list
      //      all rules have same priority (since pihole has no priority mechanism)
      const decision: DecisionInfoPiholeQuery = {
        type: decisionType,
        wasTested: true,
        result: 'allow',
        rulesThatApplied: [],
        rulesContradicted: [],
        minPriorityOfRuleThatWasTestedAndMatched: undefined,
      }

      var decisionMade: boolean = false
      //cl(`getDecision for ${JSON.stringify(crProps)}`)
      for (let r of ruleList) {
        if (r.priority < minPriorityToTest) break

        //cl(`  checking rule: ${JSON.stringify(r)}`)
        if (tool_pihole.doesRuleApplyToTI(crProps, r)) {
          //cl(`    rule applies to ti:`)
          decision.minPriorityOfRuleThatWasTestedAndMatched = r.priority
          if (decisionMade === false) {
            decision.result = r.requestAction
            decisionMade = true
          }

          // three cases:
          //    this rule is first that applies
          //    another rule already applied
          //      this rule is same action
          //      this rule is different action
          
          // determine which rule array to add this to:
          const a = ((decision.rulesThatApplied.length === 0) || (decision.rulesThatApplied[0].rule.requestAction === r.requestAction)) ? decision.rulesThatApplied : decision.rulesContradicted 

          var p = r.domainRegexPattern
          if (p === '.*') a.push( { specificity: '.*', rule: r } )
          else {
            if (regexPHPatternIncludesInvert.test(p)) p = p.slice(0, -7)
            if (regexPHPatternDomainExact.test(p)) a.push( { specificity: 'exact', rule: r } )
            else if (regexPHPatternDomainWithLeadingDot.test(p)) a.push( { specificity: 'leadingdot', rule: r } )
            else a.push( { specificity: 'regex', rule: r } )
          }
        }
      }

      // sort rulesThat* by decreasing specificity
      decision.rulesThatApplied.sort((a,b) => {
        if (DomainPatternSpecificityRanking[a.specificity] < DomainPatternSpecificityRanking[b.specificity]) return -1
        else return 1
      })
      decision.rulesContradicted.sort((a,b) => {
        if (DomainPatternSpecificityRanking[a.specificity] < DomainPatternSpecificityRanking[b.specificity]) return -1
        else return 1
      })



      return decision
    }


}




// takes a list of ConfigRulePihole and merges rules that would be considered duplicates by pihole
// pihole rejects rules where 'domain' + 'type' (i.e., requestAction) are the same, even if the comment fields are different
// if we find duplicates here, we replace them with a single rule, with the configId values .joined with ' AND '
// NOTE - WE DO NOT TEST FOR OR HANDLE RULES WITH SAME domain+requestAction BUT DIFFERENT tempItem - the merged rule will have the tempItem value of the first of the duplicate pair
export function dedupPHRuleList(ruleListIn: ConfigRulePihole[]): ConfigRulePihole[] {
    const ruleListOut: ConfigRulePihole[] = []

    for (let ri of ruleListIn) {
      //cl(`dedup - checking item id: ${ri.configItemId}, pattern: ${ri.domainRegexPattern}`)
      let i = ruleListOut.findIndex(ro => (ro.domainRegexPattern === ri.domainRegexPattern) && (ro.requestAction === ri.requestAction))
      if (i === -1) {
        //cl(`  found no duplicate`)
        ruleListOut.push(ri)
      }
      else {
        //cl(`  found duplicate - id: ${ruleListOut[i].configItemId}, pattern: ${ruleListOut[i].domainRegexPattern}`)
        ruleListOut[i] = new ConfigRulePihole(
          Object.assign(
            {}, 
            ri, 
            {
              configItemId: ruleListOut[i].configItemId + ' AND ' + ri.configItemId,
              configItemNotes: ruleListOut[i].configItemNotes + '\n' + ri.configItemNotes
            }
          )
        )
        // OBSOLETE ruleListOut[i].configItemId += ' AND ' + ri.configItemId
        // OBSOLETE ruleListOut[i].configItemNotes += '\n' + ri.configItemNotes
      }
    }
    //cl(`rule list in dedupPHRuleList before returning (after dedup):`)
    //ruleListOut.map(r => cl(r))


    return ruleListOut
  }
  
  