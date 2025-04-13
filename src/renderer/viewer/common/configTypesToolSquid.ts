

import { ConfigItemRaw, ConfigRuleSquid, CRPropsToTestVsRuleSquid, DecisionInfoSquidSSL, DecisionType, DecisionTypeSquid, DecisionVSquidConnection, Tool } from "./configTypesTypes"
import { defaultActiveForTool, getCommaOrNewlineSeparatedList, isValidHostDomainPatternForSquid, valItemAsAWhole } from "./configTypesUtility"


const cl = console.log
const ct = console.table



export const tool_squid: Tool<ConfigRuleSquid, CRPropsToTestVsRuleSquid, DecisionTypeSquid, DecisionVSquidConnection | DecisionInfoSquidSSL> = {
    mask: 32,
    props: {
      // general
      modified:                       { val: p => true, active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_squid') },
      timestamp:                       { val: p => true, active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_squid') },
      tempItem:                       { val: p => true, active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_squid') },
      expirationTime:                 { val: p => true, active: ()=>false },
      _id:                            { val: p => (/^[A-Za-z0-9-_\.\* ]+$/.test(p)), active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_squid') },  // may want to allow other characters, but DO NOT allow \n, because this prop will be used to populate the 'configItemsThatAffected...' prop in CR, which will be a groupedAsList... prop where \n delimits multiple values
      notes:                          { val: p => (/['`"]/.test(p) === false), active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_squid') },
      priority:                       { val: p => (/^[0-9]+0$/.test(p)), active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_squid') },
      // actions - for actions that do not apply to this tool, can tolerate any value
      requestAction:                  { val: p => (p === 'allow' || p === 'deny' || p === 'NA' ), active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_squid') },  // NA is a meaningful option for squid, may want to have sslbump-only rules
      jsAction:                       { val: p => true, active: (item: ConfigItemRaw)=>false },
      reqHdrAction:                       { val: p => true, active: (item: ConfigItemRaw) => false },
      resHdrAction:                       { val: p => true, active: (item: ConfigItemRaw) => false },
      reqHdrMods:                       { val: p => true, active: (item: ConfigItemRaw) => false },
      resHdrMods:                       { val: p => true, active: (item: ConfigItemRaw) => false },
      sslbumpAction:                  { val: p => (p === 'bump' || p === 'splice' || p === 'terminate' ), active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_squid') },
      // matching criteria - for criteria that do not apply to this tool, must be empty, or can allow a value that would ALWAYS make sense for this tool (e.g., lsdirection='outgoing' for browser)
      urlRegexPattern:                { val: p => p === '' , active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_squid')},
      hostDomainPatterns:             { val: p => (getCommaOrNewlineSeparatedList(p, isValidHostDomainPatternForSquid) !== undefined), active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_squid') },
      initiatorDomains:               { val: p => p === '', active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_squid') },   
      excludedInitiatorDomains:       { val: p => p === '', active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_squid') },   
      excludedRequestDomains:         { val: p => p === '', active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_squid')},
      requestMethods:                 { val: p => p === '', active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_squid')},
      excludedRequestMethods:         { val: p => p === '', active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_squid')},
      resourceTypes:                  { val: p => p === '', active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_squid')},
      excludedResourceTypes:          { val: p => p === '', active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_squid')},
      tabIds:                         { val: p => p === '', active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_squid')},
      excludedTabIds:                 { val: p => p === '', active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_squid')},
      remoteAddresses:                { val: p => p === '', active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_squid') },
      lsprocess:                      { val: p => p === '', active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_squid') },
      lsvia:                          { val: p => p === '', active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_squid') },
      lsremote:                       { val: p => p === 'any', active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_squid') },
      lsdirection:                    { val: p => p === 'outgoing', active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_squid') },
      lsdisabled:                     { val: p => p === false, active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_squid') },
      lsports:                        { val: p => p === '', active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_squid') },
      lsprotocol:                     { val: p => p === 'any', active: (item: ConfigItemRaw) => defaultActiveForTool(item, 'tool_squid') }
    },
    valItemCrossProp: (item: {[index: string]: any}) => {
      // if not active for this tool, just return true - we do not validate against inactive tools
      if (item['tool_squid'] === false) return ''


      let result = ''


      return result
    },
    valItemAsAWhole: valItemAsAWhole,
    valAcrossItems: (items: ConfigItemRaw[]) => true,

    makeRulesFromConfigItem: (item: ConfigItemRaw, decisionType: DecisionType | 'all') => {

       const result: ConfigRuleSquid[] = []

      return result
    },
    makeRuleListFromConfigItems: (items: ConfigItemRaw[], decisionType: DecisionType | 'all') => {

// finish building out
// REMINDER - NEED TO SORT IN DECREASING PRIORITY ORDER FOR GETDECISION

      return []
    },
    doesRuleApplyToTI: (crProps: CRPropsToTestVsRuleSquid, rule: ConfigRuleSquid) => {
      let result = false


      return result
    },
    getDecision: (crProps: CRPropsToTestVsRuleSquid, ruleList: ConfigRuleSquid[], decisionType: DecisionTypeSquid, minPriorityToTest: number) => {
      const decision: DecisionVSquidConnection | DecisionInfoSquidSSL = 
        (decisionType === 'squid_connection')
          ? {
            type: decisionType,
            wasTested: true,
            result: 'allow',
            rulesThatApplied: [],
            minPriorityOfRuleThatWasTestedAndMatched: undefined
          }
          : {
            type: decisionType,
            wasTested: true,
            result: 'splice',
            rulesThatApplied: [],
            minPriorityOfRuleThatWasTestedAndMatched: undefined
          }

      // REMINDER - GETDECISION NOW ASSUMES THAT RULE LIST IS ALREADY SORTED BY PRIORITY

      return decision
    }

}
