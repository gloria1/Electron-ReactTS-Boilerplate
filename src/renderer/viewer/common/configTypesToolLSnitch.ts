

import { configItemNotesPropPrefix, ConfigItemRaw, ConfigRuleLSnitch,  CRPropsToTestVsRuleLSnitch, DecisionInfoLsnitchConnection, DecisionType, DecisionTypeBrowserWebRequest, DecisionTypeLsnitch, Tool } from "./configTypesTypes"
import { defaultActiveForTool, getCommaOrNewlineSeparatedList, isIPv4AddressCIDROrRange, isPortNumberOrRange, isValidHostDomainPatternForLSnitch,  valItemAsAWhole } from "./configTypesUtility"


const cl = console.log
const ct = console.table



export const tool_lsnitch: Tool<ConfigRuleLSnitch, CRPropsToTestVsRuleLSnitch, DecisionTypeLsnitch, DecisionInfoLsnitchConnection> = {
    mask: 8,
    props: {
      // general
      modified:                       { val: p => true, active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_lsnitch') },
      timestamp:                       { val: p => true, active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_lsnitch') },
      tempItem:                       { val: p => true, active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_lsnitch') },
      expirationTime:                 { val: p => true, active: ()=>false },
      _id:                            { val: p => (/^[A-Za-z0-9-_\.\* ]+$/.test(p)), active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_lsnitch') },  // may want to allow other characters, but DO NOT allow \n, because this prop will be used to populate the 'configItemsThatAffected...' prop in CR, which will be a groupedAsList... prop where \n delimits multiple values
      notes:                          { val: p => (/['`"]/.test(p) === false), active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_lsnitch') },
      priority:                       { val: p => ((p === '100') || (p === '200')), active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_lsnitch')            },
      // actions - for actions that do not apply to this tool, can tolerate any value
      requestAction:                  { val: p => (p === 'allow' || p === 'deny' ), active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_lsnitch') },  // cannot be NA for lsnitch
      jsAction:                       { val: p => true, active: (item: ConfigItemRaw) => false },
      reqHdrAction:                   { val: p => true, active: (item: ConfigItemRaw) => false },
      resHdrAction:                   { val: p => true, active: (item: ConfigItemRaw) => false },
      reqHdrMods:                     { val: p => true, active: (item: ConfigItemRaw) => false },
      resHdrMods:                     { val: p => true, active: (item: ConfigItemRaw) => false },
      sslbumpAction:                  { val: p => true, active: (item: ConfigItemRaw) => false },
      // matching criteria - for criteria that do not apply to this tool, must be empty, or can allow a value that would ALWAYS make sense for this tool (e.g., lsdirection='outgoing' for browser)
      urlRegexPattern:                { val: p => p === '', active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_lsnitch') },
      hostDomainPatterns:             { val: p => (getCommaOrNewlineSeparatedList(p, isValidHostDomainPatternForLSnitch) !== undefined), active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_lsnitch') },
      initiatorDomains:               { val: p => p === '', active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_lsnitch') },   
      excludedInitiatorDomains:       { val: p => p === '', active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_lsnitch') },   
      excludedRequestDomains:         { val: p => p === '', active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_lsnitch')},
      requestMethods:                 { val: p => p === '', active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_lsnitch')},
      excludedRequestMethods:         { val: p => p === '', active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_lsnitch')},
      resourceTypes:                  { val: p => p === '', active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_lsnitch')},
      excludedResourceTypes:          { val: p => p === '', active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_lsnitch')},
      tabIds:                         { val: p => p === '', active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_lsnitch')},
      excludedTabIds:                 { val: p => p === '', active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_lsnitch')},
      remoteAddresses:                { val: p => (getCommaOrNewlineSeparatedList(p, isIPv4AddressCIDROrRange) !== undefined), active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_lsnitch') },
      lsprocess:                      { val: p => true, active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_lsnitch') },
      lsvia:                          { val: p => true, active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_lsnitch') },
      lsremote:                       { val: p => (p === 'any' || p === 'local-net' || p === 'multicast' || p === 'broadcast' || p === 'bonjour' || p === 'dns-servers' || p === 'bpf'), active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_lsnitch')},
      lsdirection:                    { val: p => (p === 'incoming' || p === 'outgoing'), active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_lsnitch')},
      lsdisabled:                     { val: p => true, active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_lsnitch') },
      lsports:                        { val: p => (getCommaOrNewlineSeparatedList(p, isPortNumberOrRange) !== undefined), active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_lsnitch') },
      lsprotocol:                     { val: p => (p === 'any' || p === 'icmp' || p === 'tcp' || p === 'udp'), active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_lsnitch')}
    },
    valItemCrossProp: (item: {[index: string]: any}) => {
      // if not active for this tool, just return true - we do not validate against inactive tools
      if (item['tool_lsnitch'] === false) return ''
      let result = ''



// TBD NEED TO ADD TESTS FOR INVALID COMBINATIONS OF PROPS


// little snitch does appear to allow rules with no criteria for hostDomain, process etc.


      return result
    },
    valItemAsAWhole: valItemAsAWhole,
    valAcrossItems: (items: ConfigItemRaw[]) => true, // priorities must all be 5 | 6, but in-prop validation checks this already

    makeRulesFromConfigItem: (item: ConfigItemRaw, decisionType: DecisionType | 'all') => {

      let result: ConfigRuleLSnitch[] = []
      const commonRule: ConfigRuleLSnitch = {
        configItemId: item._id,
        configItemNotes: item.notes,
        tempRule: item.tempItem,
        priority: (item.priority === '6') ? 'high' : 'regular',  // validation will have already made sure priority is either 5 or 6
        hostnameScope: 'anyhost',
        notes: configItemNotesPropPrefix + item._id,
        requestAction: ((item.requestAction === undefined) || (item.requestAction === 'NA')) ? 'deny' : item.requestAction,
        disabled: item.lsdisabled,
        process: item.lsprocess,
        via: item.lsvia,
        remote: item.lsremote,
        direction: item.lsdirection,
        ports: item.lsports,
        protocol: item.lsprotocol        
      }

      // expansion rules - ALL OF
      //    remoteHostDomainRegexPatterns if not empty - can just pass whole list as one rule
      //       items with leading '.' treated as remote-domains
      //       others treated as remote-hosts
      //    remoteAddresses - similarly



// 'default' rules for lsnitch are those with empty hostDomainPatterns      
// need to also create rules if hostDomainPatterns and remoteAddresses are empty


      var madeRuleUsingRemoteAddressesOrHostPattern: boolean = false
      if ((item.hostDomainPatterns !== undefined) && (item.hostDomainPatterns !== '')) {
        const domains: string[] = []
        const hosts: string[] = []
        const hs = getCommaOrNewlineSeparatedList(item.hostDomainPatterns)
        if (hs === undefined) throw new Error(`hostDomainPatterns does not parse correctly, but should have failed validation before this`)
        for (let h of hs) {
          if (h === '') continue  // skip any empty items - this can happen if there was extra whitespace
          if (h.slice(0, 1) === '.') domains.push(h.slice(1))
          else hosts.push(h)
        }
        if (hosts.length > 0)   {
          result.push(Object.assign( {}, commonRule, { type: 'specific', 'remote-hosts': hosts.join(', ') }))
          madeRuleUsingRemoteAddressesOrHostPattern = true
        }
        if (domains.length > 0) {
          result.push(Object.assign( {}, commonRule, { type: 'specific', 'remote-domains': domains.join(', ') }))
          madeRuleUsingRemoteAddressesOrHostPattern = true
        }
      }
      if ((item.remoteAddresses !== undefined) && (item.remoteAddresses !== '')) {
        result.push(Object.assign( {}, commonRule, { type: 'specific', 'remote-addresses': item.remoteAddresses }))
        madeRuleUsingRemoteAddressesOrHostPattern = true
      }
      if (madeRuleUsingRemoteAddressesOrHostPattern === false) result.push(commonRule)
      return result

    },
    makeRuleListFromConfigItems: (items: ConfigItemRaw[], /* OBSOLETE host: string, */  decisionType: DecisionType | 'all') => {

// finish building out
// REMINDER: sort rules by descending priority (so getDecision can stop searching once it has found a match at priority n)

      return []
    },
    doesRuleApplyToTI: (crProps: CRPropsToTestVsRuleLSnitch, rule: ConfigRuleLSnitch) => {
      let result = false

      // to be built out

      return result
    },
    getDecision: (crProps: CRPropsToTestVsRuleLSnitch, ruleList: ConfigRuleLSnitch[], decisionType: DecisionType, minPriorityToTest: number) => {

      // to be built out
      // OPEN QUESTION WHETHER DEFAULT DECISION IS REALLY 'ALLOW' IF NO RULES MATCH

      // default decision is 'allow' if no rules match
      const decision: DecisionInfoLsnitchConnection = {
        type: 'lsnitch_connection',
        wasTested: true,
        result: 'allow',
        rulesThatApplied: [],
        minPriorityOfRuleThatWasTestedAndMatched: undefined
      }
      // REMINDER - throw error if find any inactive rules - should never be inactive rules in a set passed to getDecision, 
      // REMINDER - CAN ASSUME RULE LIST IS IN DECREASING PRIORITY ORDER, BY CONSTRUCTION FROM MAKERULELIST

      return decision
    }

}